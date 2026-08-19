import { createHash, randomUUID } from "node:crypto";
import { getDatabase } from "@netlify/database";

function db() {
  return getDatabase();
}

export async function createSaleRecord(sale, items) {
  const client = await db().pool.connect();
  try {
    await client.query("BEGIN");
    const inserted = await client.query(
      `INSERT INTO event_sales (id, status, mode, subtotal_cents, tax_cents, total_cents)
       VALUES ($1, 'payment_pending', 'test', $2, $3, $4)
       ON CONFLICT (id) DO NOTHING RETURNING id`,
      [sale.id, sale.subtotalCents, sale.taxCents, sale.totalCents],
    );
    if (!inserted.rowCount) {
      const error = new Error("This sale request was already received. Check its status instead of charging again.");
      error.status = 409;
      throw error;
    }
    for (const { product, quantity } of items) {
      await client.query(
        `INSERT INTO event_sale_items
          (sale_id, sku, snipcart_product_id, name, quantity, unit_price_cents)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [sale.id, product.sku, product.snipcartId, product.name, quantity, product.unitPriceCents],
      );
    }
    await client.query(
      `INSERT INTO event_audit_log (correlation_id, sale_id, action, status, detail)
       VALUES ($1, $2, 'sale.created', 'ok', $3::jsonb)`,
      [sale.id, sale.id, JSON.stringify({ totalCents: sale.totalCents })],
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function attachPaymentIntent(saleId, paymentIntentId) {
  await db().pool.query(
    `UPDATE event_sales SET stripe_payment_intent_id = $2, updated_at = NOW() WHERE id = $1`,
    [saleId, paymentIntentId],
  );
}

export async function markSalePaymentFailed(saleId, message) {
  await db().pool.query(
    `UPDATE event_sales SET status = 'payment_failed', updated_at = NOW() WHERE id = $1`,
    [saleId],
  );
  await db().pool.query(
    `INSERT INTO event_audit_log (correlation_id, sale_id, action, status, detail)
     VALUES ($1, $1, 'payment_intent.create', 'failed', $2::jsonb)`,
    [saleId, JSON.stringify({ message: String(message).slice(0, 500) })],
  );
}

export async function getSale(saleId) {
  const result = await db().pool.query(
    `SELECT id, status, mode, currency, subtotal_cents, tax_cents, total_cents,
            stripe_payment_intent_id, created_at, updated_at
       FROM event_sales WHERE id = $1`,
    [saleId],
  );
  return result.rows[0] || null;
}

export async function recordSuccessfulPayment(event, rawBody, effects) {
  const client = await db().pool.connect();
  try {
    await client.query("BEGIN");
    const inserted = await client.query(
      `INSERT INTO stripe_webhook_events (stripe_event_id, event_type, payload_sha256, status)
       VALUES ($1, $2, $3, 'processing') ON CONFLICT DO NOTHING RETURNING stripe_event_id`,
      [event.id, event.type, createHash("sha256").update(rawBody).digest("hex")],
    );
    if (!inserted.rowCount) {
      await client.query("ROLLBACK");
      return { duplicate: true };
    }
    const saleId = event.data.object.metadata?.event_sale_id;
    const sale = await client.query(
      `UPDATE event_sales SET status = 'paid', updated_at = NOW()
       WHERE id = $1 AND stripe_payment_intent_id = $2
       RETURNING id`,
      [saleId, event.data.object.id],
    );
    if (!sale.rowCount) throw new Error("Stripe payment did not match an event sale.");
    for (const effect of effects) {
      await client.query(
        `INSERT INTO event_inventory_adjustments
          (id, sale_id, stripe_event_id, sku, snipcart_product_id, quantity_delta, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'pending') ON CONFLICT (sale_id, sku) DO NOTHING`,
        [randomUUID(), saleId, event.id, effect.sku, effect.snipcartId, -effect.quantity],
      );
    }
    await client.query(
      `UPDATE stripe_webhook_events SET status = 'processed', processed_at = NOW() WHERE stripe_event_id = $1`,
      [event.id],
    );
    await client.query("COMMIT");
    return { duplicate: false, saleId };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function getSaleItems(saleId) {
  const result = await db().pool.query(`SELECT sku, quantity FROM event_sale_items WHERE sale_id = $1`, [saleId]);
  return result.rows;
}

export async function pendingAdjustments(limit = 20) {
  const result = await db().pool.query(
    `SELECT * FROM event_inventory_adjustments
     WHERE status IN ('pending', 'failed') AND attempts < 10
     ORDER BY created_at ASC LIMIT $1`,
    [limit],
  );
  return result.rows;
}

export async function updateAdjustment(id, values) {
  await db().pool.query(
    `UPDATE event_inventory_adjustments
     SET status = $2, stock_before = $3, stock_after = $4, attempts = attempts + 1,
         error_message = $5, updated_at = NOW() WHERE id = $1`,
    [id, values.status, values.stockBefore ?? null, values.stockAfter ?? null, values.errorMessage ?? null],
  );
}

export async function applyAdjustmentWithLock(adjustment, apply) {
  const client = await db().pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [adjustment.snipcart_product_id]);
    const claimed = await client.query(
      `UPDATE event_inventory_adjustments SET status = 'processing', attempts = attempts + 1, updated_at = NOW()
       WHERE id = $1 AND status IN ('pending', 'failed') AND attempts < 10 RETURNING *`,
      [adjustment.id],
    );
    if (!claimed.rowCount) {
      await client.query("ROLLBACK");
      return { skipped: true };
    }
    const result = await apply(claimed.rows[0]);
    await client.query(
      `UPDATE event_inventory_adjustments SET status = 'applied', stock_before = $2,
       stock_after = $3, error_message = NULL, updated_at = NOW() WHERE id = $1`,
      [adjustment.id, result.stockBefore, result.stockAfter],
    );
    await client.query("COMMIT");
    return { skipped: false, ...result };
  } catch (error) {
    await client.query("ROLLBACK");
    await db().pool.query(
      `UPDATE event_inventory_adjustments SET status = 'failed', error_message = $2,
       updated_at = NOW() WHERE id = $1`,
      [adjustment.id, String(error?.message || error).slice(0, 500)],
    );
    throw error;
  } finally {
    client.release();
  }
}

export async function getAuthThrottle(clientKey) {
  const result = await db().pool.query(
    `SELECT attempt_count,
            CASE WHEN blocked_until > NOW() THEN CEIL(EXTRACT(EPOCH FROM (blocked_until - NOW())))::integer ELSE 0 END AS retry_after
       FROM event_auth_attempts WHERE client_key = $1`,
    [clientKey],
  );
  return result.rows[0] || { attempt_count: 0, retry_after: 0 };
}

export async function recordAuthFailure(clientKey) {
  const result = await db().pool.query(
    `INSERT INTO event_auth_attempts (client_key, attempt_count, window_started_at, blocked_until, updated_at)
     VALUES ($1, 1, NOW(), NULL, NOW())
     ON CONFLICT (client_key) DO UPDATE SET
       attempt_count = CASE
         WHEN event_auth_attempts.window_started_at < NOW() - INTERVAL '15 minutes' THEN 1
         ELSE event_auth_attempts.attempt_count + 1
       END,
       window_started_at = CASE
         WHEN event_auth_attempts.window_started_at < NOW() - INTERVAL '15 minutes' THEN NOW()
         ELSE event_auth_attempts.window_started_at
       END,
       blocked_until = CASE
         WHEN event_auth_attempts.window_started_at < NOW() - INTERVAL '15 minutes' THEN NULL
         WHEN event_auth_attempts.attempt_count + 1 >= 5 THEN NOW() + INTERVAL '15 minutes'
         ELSE event_auth_attempts.blocked_until
       END,
       updated_at = NOW()
     RETURNING attempt_count,
       CASE WHEN blocked_until > NOW() THEN CEIL(EXTRACT(EPOCH FROM (blocked_until - NOW())))::integer ELSE 0 END AS retry_after`,
    [clientKey],
  );
  return result.rows[0];
}

export async function clearAuthFailures(clientKey) {
  await db().pool.query(`DELETE FROM event_auth_attempts WHERE client_key = $1`, [clientKey]);
}
