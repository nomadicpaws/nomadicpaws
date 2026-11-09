import { commerceError } from './commerce-catalog.mjs';

export function commerceConfig(env = process.env, { allowDisabled = false } = {}) {
  if (!allowDisabled && env.COMMERCE_ENABLED !== 'true') throw commerceError('Checkout is being prepared. Please check back soon.', 503);
  const mode = env.COMMERCE_MODE;
  if (!['test', 'live'].includes(mode)) throw commerceError('Payment environment is not configured.', 503);
  if (mode === 'live' && env.COMMERCE_LIVE_APPROVED !== 'true') throw commerceError('Live checkout has not been enabled.', 503);
  const key = env.STRIPE_SECRET_KEY || '';
  if (!key.startsWith(mode === 'test' ? 'sk_test_' : 'sk_live_')) throw commerceError('Payment credentials do not match the environment.', 503);
  const origin = new URL(env.COMMERCE_SITE_URL || env.DEPLOY_PRIME_URL || 'https://nomadicpaws.co');
  if (origin.protocol !== 'https:' && !(mode === 'test' && origin.hostname === 'localhost')) throw commerceError('A secure checkout site URL is required.', 503);
  if ((env.COMMERCE_STATUS_SECRET || '').length < 32) throw commerceError('Order verification has not been configured.', 503);
  return { mode, key, origin: origin.origin };
}

/** @param {string} path @param {{method?: string, values?: Record<string,string>, idempotencyKey?: string}} options */
export async function commerceStripe(path, { method = 'POST', values, idempotencyKey } = {}, fetchImpl = fetch, env = process.env) {
  const { key } = commerceConfig(env, {allowDisabled:true});
  const response = await fetchImpl(`https://api.stripe.com/v1${path}`, {
    method,
    headers: { Authorization: `Bearer ${key}`, 'Stripe-Version': '2024-06-20', ...(values ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}), ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}) },
    ...(values ? { body: new URLSearchParams(values) } : {}),
    signal: AbortSignal.timeout(15000),
  });
  const data = await response.json();
  if (!response.ok) throw commerceError('The payment provider could not complete this request. Retry the same order.', 502);
  return data;
}

export function checkoutParameters(order, priced, env = process.env) {
  const { origin } = commerceConfig(env);
  const values = {
    mode: 'payment', client_reference_id: order.id, 'metadata[commerce_order_id]': order.id,
    'payment_intent_data[metadata][commerce_order_id]': order.id,
    success_url: `${origin}/checkout/?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/checkout/?cancelled=1`,
    'payment_method_types[0]': 'card',
  };
  if (env.COMMERCE_CASH_APP_PAY === 'true') values['payment_method_types[1]'] = 'cashapp';
  priced.items.forEach((item, i) => {
    values[`line_items[${i}][price_data][currency]`] = 'usd';
    values[`line_items[${i}][price_data][unit_amount]`] = String(item.unitPriceCents);
    values[`line_items[${i}][price_data][product_data][name]`] = item.name;
    values[`line_items[${i}][price_data][tax_behavior]`] = 'exclusive';
    values[`line_items[${i}][quantity]`] = String(item.quantity);
  });
  if (priced.taxMode === 'stripe') values['automatic_tax[enabled]'] = 'true';
  else if (priced.taxCents) {
    // Explicit tax line is only for approved fixed-rate jurisdictions.
    const i = priced.items.length;
    values[`line_items[${i}][price_data][currency]`] = 'usd';
    values[`line_items[${i}][price_data][unit_amount]`] = String(priced.taxCents);
    values[`line_items[${i}][price_data][product_data][name]`] = 'Sales tax';
    values[`line_items[${i}][quantity]`] = '1';
  }
  if (order.channel === 'web') {
    const countries = (env.COMMERCE_SHIPPING_COUNTRIES || '').split(',').map(c => c.trim()).filter(Boolean);
    if (!countries.length || countries.some(c => !/^[A-Z]{2}$/.test(c))) throw commerceError('Shipping destinations have not been confirmed.', 503);
    countries.forEach((c, i) => { values[`shipping_address_collection[allowed_countries][${i}]`] = c; });
    values['shipping_options[0][shipping_rate_data][type]'] = 'fixed_amount';
    values['shipping_options[0][shipping_rate_data][fixed_amount][amount]'] = String(priced.shippingCents);
    values['shipping_options[0][shipping_rate_data][fixed_amount][currency]'] = 'usd';
    values['shipping_options[0][shipping_rate_data][display_name]'] = 'Standard shipping';
  }
  return values;
}
