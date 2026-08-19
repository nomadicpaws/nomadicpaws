export const EVENT_PRODUCTS = Object.freeze([
  {
    sku: "NP-PEZ-BUNDLE3",
    snipcartId: "pezzy-trail-pack-bundle",
    name: "Pezzy Trail Pack Bundle",
    image: "/images/pezzy-logo.png",
    unitPriceCents: 5000,
    active: true,
    components: {
      "NP-PEZ-LION": 1,
      "NP-PEZ-NILGAI": 1,
      "NP-PEZ-CARP": 1,
    },
  },
  {
    sku: "NP-PEZ-LION",
    snipcartId: "pezzy-lionfish-sticks",
    name: "Pezzy Lionfish Sticks",
    image: "/images/products/pezzy-lionfish-sticks.png",
    unitPriceCents: 2100,
    active: true,
  },
  {
    sku: "NP-PEZ-NILGAI",
    snipcartId: "pezzy-nilgai-antelope-heart",
    name: "Pezzy Nilgai Antelope Heart",
    image: "/images/products/pezzy-nilgai-heart.png",
    unitPriceCents: 1800,
    active: true,
  },
  {
    sku: "NP-PEZ-CARP",
    snipcartId: "pezzy-silver-carp-chips",
    name: "Pezzy Silver Carp Chips",
    image: "/images/products/pezzy-silver-carp-chips.png",
    unitPriceCents: 1700,
    active: true,
  },
  {
    sku: "NP-PEZ-DEVIL",
    snipcartId: "pezzy-devil-fish-strips-preorder",
    name: "Pezzy Devil Fish Strips",
    image: "/images/products/pezzy-devil-fish-strips.png",
    unitPriceCents: 1700,
    active: false,
  },
  {
    sku: "NP-SCR-001",
    snipcartId: null,
    name: "Future Nomadic Paws Product",
    unitPriceCents: null,
    active: false,
  },
]);

const BY_SKU = new Map(EVENT_PRODUCTS.map((product) => [product.sku, product]));

export function getEventProduct(sku) {
  return BY_SKU.get(String(sku || "").trim()) || null;
}

export function validateCart(items) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("The cart must contain at least one item.");
  }

  const quantities = new Map();
  for (const item of items) {
    const product = getEventProduct(item?.sku);
    const quantity = Number(item?.quantity);
    if (!product || !product.active || !product.snipcartId) {
      throw new Error(`Product ${item?.sku || "(missing SKU)"} is not available for event sales.`);
    }
    if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 99) {
      throw new Error(`Quantity for ${product.sku} must be a whole number from 1 to 99.`);
    }
    quantities.set(product.sku, (quantities.get(product.sku) || 0) + quantity);
  }

  return [...quantities].map(([sku, quantity]) => ({ product: getEventProduct(sku), quantity }));
}

export function priceCart(items, taxRateBps) {
  const normalized = validateCart(items);
  const rate = Number(taxRateBps);
  if (!Number.isSafeInteger(rate) || rate < 0 || rate > 10000) {
    throw new Error("EVENT_TAX_RATE_BPS must be a whole number from 0 to 10000.");
  }

  const subtotalCents = normalized.reduce(
    (total, item) => total + item.product.unitPriceCents * item.quantity,
    0,
  );
  const taxCents = Math.round((subtotalCents * rate) / 10000);
  return { normalized, subtotalCents, taxCents, totalCents: subtotalCents + taxCents };
}

export function inventoryEffects(items) {
  const normalized = validateCart(items);
  const effects = new Map();
  const add = (sku, quantity) => effects.set(sku, (effects.get(sku) || 0) + quantity);

  for (const { product, quantity } of normalized) {
    add(product.sku, quantity);
    for (const [componentSku, componentQuantity] of Object.entries(product.components || {})) {
      add(componentSku, quantity * componentQuantity);
    }
  }

  return [...effects].map(([sku, quantity]) => {
    const product = getEventProduct(sku);
    return { sku, snipcartId: product.snipcartId, quantity };
  });
}
