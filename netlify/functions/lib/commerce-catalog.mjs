// Prices are carried over from the existing storefront and register.
export const CATALOG = Object.freeze([
  { sku: 'NP-PEZ-BUNDLE3', id: 'pezzy-trail-pack-bundle', name: 'Nomadic Paws Trail Pack (3-Flavor Bundle)', taxCode: 'txcd_36010004', unitPriceCents: 5000, image: '/images/products/pezzy-trail-pack-bundle.jpg', active: true, components: { 'NP-PEZ-LION': 1, 'NP-PEZ-NILGAI': 1, 'NP-PEZ-CARP': 1 } },
  { sku: 'NP-PEZ-LION', id: 'pezzy-lionfish-sticks', name: 'Pezzy Lionfish Sticks', taxCode: 'txcd_36010004', unitPriceCents: 2100, image: '/images/products/pezzy-lionfish-sticks.png', active: true, affiliateUrl: 'https://pezzypets.com/products/lionfish-sticks?sca_ref=11859855.fBiDjsDHsK' },
  { sku: 'NP-PEZ-NILGAI', id: 'pezzy-nilgai-antelope-heart', name: 'Pezzy Nilgai Antelope Heart', taxCode: 'txcd_36010004', unitPriceCents: 1800, image: '/images/products/pezzy-nilgai-heart.png', active: true, affiliateUrl: 'https://pezzypets.com/products/nilgai-antelope-heart-single-ingredient?sca_ref=11859855.fBiDjsDHsK' },
  { sku: 'NP-PEZ-CARP', id: 'pezzy-silver-carp-chips', name: 'Pezzy Silver Carp Chips', taxCode: 'txcd_36010004', unitPriceCents: 1700, image: '/images/products/pezzy-silver-carp-chips.png', active: true, affiliateUrl: 'https://pezzypets.com/products/single-ingredient-silver-carp-chips?sca_ref=11859855.fBiDjsDHsK' },
  { sku: 'NP-PEZ-DEVIL', id: 'pezzy-devil-fish-strips-preorder', name: 'Pezzy Devil Fish Strips', taxCode: 'txcd_36010004', unitPriceCents: 1700, image: '/images/products/pezzy-devil-fish-strips.png', active: true, affiliateUrl: 'https://pezzypets.com/products/pezzy-single-ingredient-treats-fish-strips?sca_ref=11859855.fBiDjsDHsK' },
]);

export function commerceError(message, status = 400) { return Object.assign(new Error(message), { status }); }
export function normalizeItems(items) {
  if (!Array.isArray(items) || !items.length || items.length > 20) throw commerceError('Choose between 1 and 20 product lines.');
  const quantities = new Map();
  for (const item of items) {
    const product = CATALOG.find(p => p.sku === item?.sku || p.id === item?.sku);
    if (!product?.active) throw commerceError('This product is not available.');
    if (!Number.isSafeInteger(item.quantity) || item.quantity < 1 || item.quantity > 99) throw commerceError('Choose a whole quantity from 1 to 99.');
    const quantity = (quantities.get(product.sku) || 0) + item.quantity;
    if (quantity > 99) throw commerceError('The maximum quantity per product is 99.');
    quantities.set(product.sku, quantity);
  }
  return [...quantities].sort(([a], [b]) => a.localeCompare(b)).map(([sku, quantity]) => ({ ...CATALOG.find(p => p.sku === sku), quantity }));
}

// Bundles are assembled from the three physical component SKUs. No second stock pool.
export function stockEffects(items) {
  const effects = new Map();
  for (const item of normalizeItems(items)) {
    for (const [sku, count] of Object.entries(item.components || { [item.sku]: 1 })) effects.set(sku, (effects.get(sku) || 0) + count * item.quantity);
  }
  return [...effects].sort(([a], [b]) => a.localeCompare(b)).map(([sku, quantity]) => ({ sku, quantity }));
}

export function availableStock(product, rows) {
  const available = sku => { const row = rows.find(r => r.sku === sku); return Math.max(0, Number(row?.on_hand || 0) - Number(row?.reserved || 0)); };
  return product.components ? Math.min(...Object.entries(product.components).map(([sku, count]) => Math.floor(available(sku) / count))) : available(product.sku);
}

export function memberShipping(code, env = process.env, now = Date.now()) {
  if (!code) return false;
  if (typeof code !== 'string' || code.length > 64) throw commerceError('That Pack Perk code is not valid.');
  let perks;
  try { perks = JSON.parse(env.COMMERCE_SHIPPING_PERKS || '[]'); } catch { throw commerceError('Pack Perks are not configured correctly.', 503); }
  if (!Array.isArray(perks)) throw commerceError('Pack Perks are not configured correctly.', 503);
  const perk = perks.find(p => typeof p.code === 'string' && p.code.toUpperCase() === code.trim().toUpperCase());
  if (!perk || !Number.isFinite(Date.parse(perk.startsAt)) || !Number.isFinite(Date.parse(perk.expiresAt)) || now < Date.parse(perk.startsAt) || now >= Date.parse(perk.expiresAt)) throw commerceError('That Pack Perk code is invalid or expired.');
  return true;
}

export function quote(items, channel, env = process.env, perkCode = '') {
  const normalized = normalizeItems(items);
  const subtotalCents = normalized.reduce((sum, p) => sum + p.quantity * p.unitPriceCents, 0);
  if (!['web', 'pos'].includes(channel)) throw commerceError('Invalid sales channel.');
  const taxMode = channel === 'pos' ? 'manual' : env.COMMERCE_WEB_TAX_MODE;
  const rateText = channel === 'pos' ? env.EVENT_TAX_RATE_BPS : env.COMMERCE_WEB_TAX_RATE_BPS;
  if (!['manual', 'stripe'].includes(taxMode)) throw commerceError('Sales tax has not been configured.', 503);
  const rate = Number(rateText);
  if (taxMode === 'manual' && (!/^\d+$/.test(rateText || '') || !Number.isInteger(rate) || rate > 10000)) throw commerceError('A confirmed tax rate is required.', 503);
  const shippingText = channel === 'web' ? env.COMMERCE_SHIPPING_CENTS : '0';
  if (!/^\d+$/.test(shippingText || '') || Number(shippingText) > 100000) throw commerceError('Shipping has not been configured.', 503);
  const shippingCents = channel === 'web' && memberShipping(perkCode, env) ? 0 : Number(shippingText);
  const taxCents = taxMode === 'manual' ? Math.round(subtotalCents * rate / 10000) : 0;
  return { items: normalized, channel, subtotalCents, shippingCents, taxCents, taxMode, totalCents: subtotalCents + shippingCents + taxCents, effects: stockEffects(items) };
}
