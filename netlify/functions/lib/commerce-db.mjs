import { getDatabase } from '@netlify/database';
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { CATALOG, availableStock, commerceError } from './commerce-catalog.mjs';

export function statusToken(id, secret = process.env.COMMERCE_STATUS_SECRET || '') {
  if (secret.length < 32) throw commerceError('Order verification is not configured.', 503);
  return createHmac('sha256', secret).update(id).digest('hex');
}
export function validStatusToken(id, token, secret) {
  const expected = Buffer.from(statusToken(id, secret)); const actual = Buffer.from(String(token || ''));
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
export function requestHash(value) { return createHash('sha256').update(JSON.stringify(value)).digest('hex'); }
export async function transaction(run, pool = getDatabase().pool) {
  const client = await pool.connect();
  try { await client.query('BEGIN'); const value = await run(client); await client.query('COMMIT'); return value; }
  catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}
export async function products() {
  const result = await getDatabase().pool.query('SELECT * FROM commerce_inventory');
  return CATALOG.map(product => ({ ...product, stock: product.active ? availableStock(product, result.rows) : 0 }));
}
export async function getOrder(id) {
  return (await getDatabase().pool.query('SELECT * FROM commerce_orders WHERE id=$1', [id])).rows[0] || null;
}
export async function reserveOrder(id, priced, method, mode, hash, pool, tenderedCents = null) {
  return transaction(async client => {
    // Same request ID serializes before inventory locks, including cash retries.
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [id]);
    const existing = (await client.query('SELECT * FROM commerce_orders WHERE id=$1', [id])).rows[0];
    if (existing) {
      if (existing.request_hash !== hash) throw commerceError('This request ID belongs to a different order.', 409);
      return existing;
    }
    for (const effect of priced.effects) {
      const row = (await client.query('SELECT * FROM commerce_inventory WHERE sku=$1 FOR UPDATE', [effect.sku])).rows[0];
      if (!row || row.on_hand - row.reserved < effect.quantity) throw Object.assign(commerceError('One or more items no longer have enough stock.', 409), {code:'out_of_stock'});
    }
    const paid = method === 'cash';
    const inserted = await client.query(`INSERT INTO commerce_orders
      (id,request_hash,mode,channel,method,status,items,effects,subtotal_cents,shipping_cents,tax_cents,total_cents)
      VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb,$9,$10,$11,$12) RETURNING *`,
      [id, hash, mode, priced.channel, method, paid ? 'paid' : 'pending', JSON.stringify(priced.items), JSON.stringify(priced.effects), priced.subtotalCents, priced.shippingCents, priced.taxCents, priced.totalCents]);
    for (const effect of priced.effects) {
      if (paid) {
        await client.query('UPDATE commerce_inventory SET on_hand=on_hand-$2 WHERE sku=$1', [effect.sku, effect.quantity]);
        await client.query(`INSERT INTO commerce_stock_movements(request_id,sku,quantity_delta,reason,order_id) VALUES ($1,$2,$3,'cash sale',$1)`, [id, effect.sku, -effect.quantity]);
      } else await client.query('UPDATE commerce_inventory SET reserved=reserved+$2 WHERE sku=$1', [effect.sku, effect.quantity]);
    }
    if (paid && tenderedCents !== null) await client.query('UPDATE commerce_orders SET cash_tendered_cents=$2,cash_change_cents=$3 WHERE id=$1', [id,tenderedCents,tenderedCents-priced.totalCents]);
    return inserted.rows[0];
  }, pool);
}
export async function attachSession(id, session, pool = getDatabase().pool) {
  if (!/^cs_(test|live)_[a-zA-Z0-9]+$/.test(session.id || '') || !String(session.url || '').startsWith('https://checkout.stripe.com/')) throw commerceError('Unexpected checkout response.', 502);
  await pool.query('UPDATE commerce_orders SET stripe_session_id=$2,stripe_url=$3,updated_at=NOW() WHERE id=$1 AND (stripe_session_id IS NULL OR stripe_session_id=$2)', [id, session.id, session.url]);
}

export async function applySessionEvent(event, session, mode, pool) {
  return transaction(async client => {
    const order = (await client.query('SELECT * FROM commerce_orders WHERE id=$1 FOR UPDATE', [session.metadata?.commerce_order_id])).rows[0];
    if (!order || order.method !== 'stripe' || order.mode !== mode || session.livemode !== (mode === 'live') || session.client_reference_id !== order.id || order.stripe_session_id !== session.id) throw commerceError('Payment does not match the order.', 409);
    const inserted = await client.query('INSERT INTO commerce_events(id,order_id) VALUES ($1,$2) ON CONFLICT DO NOTHING RETURNING id', [event.id, order.id]);
    if (!inserted.rowCount) return { duplicate: true };
    if (['paid','partially_refunded','refunded','review'].includes(order.status)) return { duplicate: true };
    const paid = session.payment_status === 'paid';
    const expired = session.status === 'expired';
    if (!paid && !expired) return { pending: true };
    // Do not decrement a previously released reservation on a late success.
    if (order.status === 'cancelled' && paid) {
      await client.query("UPDATE commerce_orders SET status='review', payment_details=$2::jsonb, updated_at=NOW() WHERE id=$1", [order.id, JSON.stringify(session)]);
      return { review: true };
    }
    if (order.status !== 'pending') return { duplicate: true };
    if (paid && (session.currency !== 'usd' || session.amount_subtotal !== order.subtotal_cents + order.tax_cents || !Number.isSafeInteger(session.amount_total) || session.amount_total !== order.subtotal_cents + order.shipping_cents + order.tax_cents + (session.total_details?.amount_tax || 0) || (session.shipping_cost?.amount_subtotal || 0) !== order.shipping_cents)) throw commerceError('Payment totals do not match.', 409);
    for (const effect of order.effects) {
      const result = await client.query(`UPDATE commerce_inventory SET reserved=reserved-$2, on_hand=on_hand-$3 WHERE sku=$1 AND reserved >= $2 RETURNING sku`, [effect.sku, effect.quantity, paid ? effect.quantity : 0]);
      if (!result.rowCount) throw new Error('Inventory reservation is inconsistent.');
      if (paid) await client.query(`INSERT INTO commerce_stock_movements(request_id,sku,quantity_delta,reason,order_id) VALUES ($1,$2,$3,'Stripe sale',$1) ON CONFLICT DO NOTHING`, [order.id, effect.sku, -effect.quantity]);
    }
    await client.query(`UPDATE commerce_orders SET status=$2,total_cents=$3,tax_cents=$4,stripe_payment_intent_id=$5,payment_details=$6::jsonb,updated_at=NOW() WHERE id=$1`,
      [order.id, paid ? 'paid' : 'cancelled', paid ? session.amount_total : order.total_cents, paid ? order.tax_cents + (session.total_details?.amount_tax || 0) : order.tax_cents, typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id || null, JSON.stringify(session)]);
    return { paid, expired };
  }, pool);
}

export async function recordRefund(event, charge, mode, pool) {
  return transaction(async client => {
    const order = (await client.query('SELECT * FROM commerce_orders WHERE stripe_payment_intent_id=$1 FOR UPDATE', [charge.payment_intent])).rows[0];
    if (!order) return { ignored: true };
    if (order.mode !== mode || charge.livemode !== (mode === 'live') || charge.currency !== 'usd' || !Number.isSafeInteger(charge.amount_refunded) || charge.amount_refunded > order.total_cents) throw commerceError('Refund does not match order.', 409);
    await client.query('INSERT INTO commerce_events(id,order_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [event.id, order.id]);
    const amount = Math.max(order.refunded_cents, charge.amount_refunded);
    await client.query('UPDATE commerce_orders SET refunded_cents=$2,status=$3,updated_at=NOW() WHERE id=$1', [order.id, amount, amount >= order.total_cents ? 'refunded' : 'partially_refunded']);
    // Physical restocking is a separate operator action; refunds never assume a sellable return.
    return { refundedCents: amount };
  }, pool);
}

export async function recentOrders() {
  return (await getDatabase().pool.query("SELECT id,channel,method,status,items,total_cents,refunded_cents,created_at,payment_details->'shipping_details' AS shipping_details,payment_details->'customer_details' AS customer_details FROM commerce_orders ORDER BY created_at DESC LIMIT 100")).rows;
}
export async function refundCash(id, orderId, amountCents, mode, pool) {
  if (!Number.isSafeInteger(amountCents) || amountCents < 1) throw commerceError('Enter a positive refund amount.');
  return transaction(async client => {
    const order = (await client.query('SELECT * FROM commerce_orders WHERE id=$1 FOR UPDATE', [orderId])).rows[0];
    if (!order || order.method !== 'cash' || order.mode !== mode) throw commerceError('Cash order not found.',404);
    const previous = (await client.query('SELECT * FROM commerce_cash_refunds WHERE request_id=$1', [id])).rows[0];
    if (previous) {if (previous.order_id !== orderId || previous.amount_cents !== amountCents) throw commerceError('Refund request ID is already used.',409); return {duplicate:true};}
    if (!['paid','partially_refunded'].includes(order.status) || order.refunded_cents + amountCents > order.total_cents) throw commerceError('Refund exceeds the remaining paid amount.');
    await client.query('INSERT INTO commerce_cash_refunds(request_id,order_id,amount_cents) VALUES ($1,$2,$3)', [id,orderId,amountCents]);
    const refunded = order.refunded_cents + amountCents;
    await client.query('UPDATE commerce_orders SET refunded_cents=$2,status=$3,updated_at=NOW() WHERE id=$1', [orderId,refunded,refunded === order.total_cents ? 'refunded':'partially_refunded']);
    return {refundedCents:refunded};
  },pool);
}
export async function pendingStripeOrders() {
  return (await getDatabase().pool.query("SELECT id,stripe_session_id FROM commerce_orders WHERE status='pending' AND method='stripe' ORDER BY created_at LIMIT 20")).rows;
}
export async function limitCheckout(clientKey) {
  const result = await getDatabase().pool.query(`INSERT INTO commerce_checkout_limits(client_key) VALUES ($1)
    ON CONFLICT (client_key) DO UPDATE SET
      attempts=CASE WHEN commerce_checkout_limits.window_start < NOW()-INTERVAL '15 minutes' THEN 1 ELSE commerce_checkout_limits.attempts+1 END,
      window_start=CASE WHEN commerce_checkout_limits.window_start < NOW()-INTERVAL '15 minutes' THEN NOW() ELSE commerce_checkout_limits.window_start END
    RETURNING attempts`, [clientKey]);
  if (result.rows[0].attempts > 10) throw commerceError('Too many new checkout attempts. Please wait 15 minutes.', 429);
}
export async function adjustInventory(id, sku, delta, reason, pool) {
  if (!CATALOG.some(p => p.sku === sku && !p.components) || !Number.isSafeInteger(delta) || delta === 0 || Math.abs(delta) > 10000 || typeof reason !== 'string' || reason.trim().length < 3 || reason.length > 200) throw commerceError('A valid SKU, quantity change and reason are required.');
  return transaction(async client => {
    await client.query('SELECT * FROM commerce_inventory WHERE sku=$1 FOR UPDATE', [sku]);
    const old = (await client.query('SELECT * FROM commerce_stock_movements WHERE request_id=$1 AND sku=$2', [id, sku])).rows[0];
    if (old) { if (old.quantity_delta !== delta || old.reason !== reason) throw commerceError('This adjustment ID is already used.', 409); return { duplicate: true }; }
    const updated = await client.query('UPDATE commerce_inventory SET on_hand=on_hand+$2 WHERE sku=$1 AND on_hand+$2 >= reserved RETURNING *', [sku, delta]);
    if (!updated.rowCount) throw commerceError('Stock cannot be less than reserved inventory.', 409);
    await client.query('INSERT INTO commerce_stock_movements(request_id,sku,quantity_delta,reason) VALUES ($1,$2,$3,$4)', [id, sku, delta, reason]);
    return updated.rows[0];
  }, pool);
}
