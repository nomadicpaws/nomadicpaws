import type { Config } from '@netlify/functions';
import { quote, commerceError } from './lib/commerce-catalog.mjs';
import { commerceConfig, commerceStripe, checkoutParameters } from './lib/commerce-stripe.mjs';
import { products, getOrder, requestHash, reserveOrder, attachSession, applySessionEvent, recordRefund, statusToken, validStatusToken, recentOrders, adjustInventory, pendingStripeOrders, limitCheckout, refundCash } from './lib/commerce-db.mjs';
import { requireEventOperator } from './lib/event-http.mjs';
import { verifyStripeSignature } from './lib/stripe-signature.mjs';
import QRCode from 'qrcode';

const json = (value: unknown, status = 200) => Response.json(value, { status, headers: { 'Cache-Control': 'no-store' } });
const uuid = (id: unknown) => { if (typeof id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) throw commerceError('A UUID request ID is required.'); return id; };

export default async (request: Request) => {
  try {
    const url = new URL(request.url); const path = url.pathname;
    // Disabling new checkout must not block already-paid orders or recovery.
    const { mode } = commerceConfig(process.env, {allowDisabled:['/api/commerce/webhook','/api/commerce/status','/api/commerce/orders','/api/commerce/cancel','/api/commerce/reconcile','/api/commerce/cash-refund'].includes(path)});
    if (path === '/api/commerce/webhook' && request.method === 'POST') {
      const raw = await request.text();
      if (!verifyStripeSignature(raw, request.headers.get('stripe-signature'), process.env.COMMERCE_STRIPE_WEBHOOK_SECRET || '')) return json({ error: 'Invalid signature.' }, 400);
      const event = JSON.parse(raw);
      if (event.livemode !== (mode === 'live')) throw commerceError('Wrong payment environment.');
      if (['checkout.session.completed', 'checkout.session.async_payment_succeeded', 'checkout.session.expired', 'checkout.session.async_payment_failed'].includes(event.type)) {
        const supplied = event.data.object;
        if (!supplied.metadata?.commerce_order_id) return json({ ignored: true });
        // Retrieve canonical provider state rather than relying on event delivery ordering.
        const session = await commerceStripe(`/checkout/sessions/${encodeURIComponent(supplied.id)}`, { method: 'GET' });
        return json(await applySessionEvent(event, session, mode));
      }
      if (event.type === 'charge.refunded') {
        const charge=event.data.object;
        if (!charge.payment_intent) return json({ignored:true});
        const intent=await commerceStripe(`/payment_intents/${encodeURIComponent(charge.payment_intent)}`,{method:'GET'});
        const orderId=intent.metadata?.commerce_order_id;
        if (!orderId) return json({ignored:true});
        const order=await getOrder(uuid(orderId));
        if (!order?.stripe_session_id) throw commerceError('The refunded checkout requires reconciliation.',409);
        const session=await commerceStripe(`/checkout/sessions/${encodeURIComponent(order.stripe_session_id)}`,{method:'GET'});
        // A refund can arrive before the Checkout success event.
        await applySessionEvent({id:`refund-reconcile-${event.id}`},session,mode);
        return json(await recordRefund(event,charge,mode));
      }
      return json({ ignored: true });
    }
    if (request.method === 'GET' && path === '/api/commerce/products') return json({ products: await products(), mode });
    if (request.method === 'GET' && path === '/api/commerce/status') {
      const id = uuid(url.searchParams.get('id'));
      const order = await getOrder(id);
      if (!order || !validStatusToken(id, url.searchParams.get('token'))) throw commerceError('Order not found.', 404);
      return json({ id: order.id, status: order.status, totalCents: order.total_cents, refundedCents: order.refunded_cents, mode: order.mode });
    }
    if (request.method === 'GET' && path === '/api/commerce/orders') { await requireEventOperator(request); return json({ orders: await recentOrders() }); }
    if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);
    if (Number(request.headers.get('content-length')) > 12000) throw commerceError('Request too large.', 413);
    const raw = await request.text(); if (raw.length > 12000) throw commerceError('Request too large.', 413);
    let body; try { body = JSON.parse(raw); } catch { throw commerceError('Invalid JSON.'); }
    if (path === '/api/commerce/cash-refund') {await requireEventOperator(request); return json(await refundCash(uuid(body.requestId),uuid(body.orderId),body.amountCents,mode));}
    if (path === '/api/commerce/reconcile') {
      await requireEventOperator(request);
      const results = [];
      for (const order of await pendingStripeOrders()) {
        if (!order.stripe_session_id) { results.push({id:order.id,status:'Check saved checkout request; provider creation may need recovery.'}); continue; }
        const session = await commerceStripe(`/checkout/sessions/${encodeURIComponent(order.stripe_session_id)}`, {method:'GET'});
        results.push({id:order.id,...await applySessionEvent({id:`reconcile-${session.id}-${session.status}-${session.payment_status}`},session,mode)});
      }
      return json({results});
    }
    if (path === '/api/commerce/cancel') {
      const id = uuid(body.id);
      if (!validStatusToken(id, body.statusToken)) throw commerceError('Order not found.', 404);
      const order = await getOrder(id);
      if (!order || order.method !== 'stripe' || !order.stripe_session_id) throw commerceError('Checkout not found.', 404);
      let session = await commerceStripe(`/checkout/sessions/${encodeURIComponent(order.stripe_session_id)}`, { method: 'GET' });
      if (session.status === 'open') session = await commerceStripe(`/checkout/sessions/${encodeURIComponent(order.stripe_session_id)}/expire`, { idempotencyKey: `expire-${id}` });
      await applySessionEvent({ id: `reconcile-${session.id}-${session.status}-${session.payment_status}` }, session, mode);
      return json({ status: (await getOrder(id)).status });
    }
    if (path === '/api/commerce/inventory') { await requireEventOperator(request); return json(await adjustInventory(uuid(body.requestId), body.sku, body.delta, body.reason)); }
    if (!['/api/commerce/checkout','/api/commerce/cash','/api/commerce/quote'].includes(path)) return json({ error: 'Not found.' }, 404);
    const channel = body.channel === 'pos' ? 'pos' : 'web';
    if (channel === 'pos' || path === '/api/commerce/cash') await requireEventOperator(request);
    if (path === '/api/commerce/cash' && channel !== 'pos') throw commerceError('Cash requires the register.');
    if (channel === 'web') {
      const origin = request.headers.get('origin');
      if (!origin || origin !== commerceConfig().origin) throw commerceError('Invalid checkout origin.', 403);
    }
    const priced = quote(body.items, channel, process.env, body.perkCode || '');
    if (path === '/api/commerce/quote') return json({ subtotalCents: priced.subtotalCents, shippingCents: priced.shippingCents, taxCents: priced.taxCents, totalCents: priced.totalCents, automaticTax: priced.taxMode === 'stripe' });
    const id = uuid(body.requestId); const method = path.endsWith('/cash') ? 'cash' : 'stripe';
    if (channel === 'web' && !(await getOrder(id))) await limitCheckout(requestHash([request.headers.get('x-nf-client-connection-ip') || 'unknown',process.env.COMMERCE_STATUS_SECRET]));
    if (method === 'cash' && (!Number.isSafeInteger(body.tenderedCents) || body.tenderedCents < priced.totalCents)) throw commerceError('Cash tendered must cover the order total.');
    const hash = requestHash({ items: priced.items, channel, method, total: priced.totalCents, taxMode: priced.taxMode, perkCode: body.perkCode || '', ...(method === 'cash' ? { tenderedCents: body.tenderedCents } : {}) });
    // Validate configuration before reserving inventory.
    const parameters = method === 'stripe' ? checkoutParameters({ id, channel }, priced) : null;
    const order = await reserveOrder(id, priced, method, mode, hash, undefined, method === 'cash' ? body.tenderedCents : null);
    if (method === 'cash') return json({ id, status: order.status, totalCents: order.total_cents, changeCents: body.tenderedCents - order.total_cents, statusToken: statusToken(id), mode });
    if (order.status !== 'pending') throw commerceError('This order is already completed or closed.', 409);
    let checkoutUrl = order.stripe_url;
    if (!checkoutUrl) {
      if (Date.now() - Date.parse(order.created_at) > 29 * 60 * 1000) throw commerceError('This pending order requires operator reconciliation before retrying.', 409);
      const session = await commerceStripe('/checkout/sessions', { values: {...parameters!, expires_at:String(Math.floor(Date.parse(order.created_at)/1000)+60*60)}, idempotencyKey: `commerce-${id}` });
      await attachSession(id, session); checkoutUrl = session.url;
    }
    return json({ id, checkoutUrl, qrDataUrl: channel === 'pos' ? await QRCode.toDataURL(checkoutUrl, { width: 700, margin: 4, errorCorrectionLevel: 'M' }) : undefined, statusToken: statusToken(id), mode });
  } catch (error: any) {
    const status = Number(error?.status) || 500;
    if (status >= 500) console.error('Commerce request failed:', error?.message);
    return json({ error: status === 500 ? 'The order could not be completed. Retry the same order.' : error.message, code: error.code }, status);
  }
};

export const config: Config = { path: ['/api/commerce/products', '/api/commerce/checkout', '/api/commerce/quote', '/api/commerce/cash', '/api/commerce/status', '/api/commerce/orders', '/api/commerce/inventory', '/api/commerce/webhook', '/api/commerce/cancel', '/api/commerce/reconcile', '/api/commerce/cash-refund'] };
