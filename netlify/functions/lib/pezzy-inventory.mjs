export const PEZZY_PRODUCTS = [
  { id: 'pezzy-trail-pack-bundle', affiliateUrl: null },
  {
    id: 'pezzy-lionfish-sticks',
    affiliateUrl: 'https://pezzypets.com/products/lionfish-sticks?sca_ref=11859855.fBiDjsDHsK',
  },
  {
    id: 'pezzy-nilgai-antelope-heart',
    affiliateUrl: 'https://pezzypets.com/products/nilgai-antelope-heart-single-ingredient?sca_ref=11859855.fBiDjsDHsK',
  },
  {
    id: 'pezzy-silver-carp-chips',
    affiliateUrl: 'https://pezzypets.com/products/single-ingredient-silver-carp-chips?sca_ref=11859855.fBiDjsDHsK',
  },
  {
    id: 'pezzy-devil-fish-strips-preorder',
    affiliateUrl: 'https://pezzypets.com/products/pezzy-single-ingredient-treats-fish-strips?sca_ref=11859855.fBiDjsDHsK',
  },
]

export function publicProductState(product, snipcartProduct) {
  const inventoryMethod = snipcartProduct?.inventoryManagementMethod
  const reportedStock = Number.isFinite(snipcartProduct?.totalStock)
    ? snipcartProduct.totalStock
    : snipcartProduct?.stock
  const stock = Number.isFinite(reportedStock) ? Math.max(0, Math.floor(reportedStock)) : null

  if (inventoryMethod === 'Disabled' || stock === null) {
    return { id: product.id, status: 'unavailable', stock: null, affiliateUrl: product.affiliateUrl }
  }

  return {
    id: product.id,
    status: stock > 0 ? 'in_stock' : product.affiliateUrl ? 'affiliate' : 'unavailable',
    stock,
    affiliateUrl: product.affiliateUrl,
  }
}
