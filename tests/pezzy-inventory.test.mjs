import assert from 'node:assert/strict'
import { publicProductState } from '../netlify/functions/lib/pezzy-inventory.mjs'

const withAffiliate = { id: 'treat', affiliateUrl: 'https://example.com/affiliate' }
const withoutAffiliate = { id: 'bundle', affiliateUrl: null }

assert.deepEqual(
  publicProductState(withAffiliate, { inventoryManagementMethod: 'Single', stock: 4, totalStock: 4 }),
  { id: 'treat', status: 'in_stock', stock: 4, affiliateUrl: withAffiliate.affiliateUrl },
)
assert.deepEqual(
  publicProductState(withAffiliate, { inventoryManagementMethod: 'Single', stock: 0, totalStock: 0 }),
  { id: 'treat', status: 'affiliate', stock: 0, affiliateUrl: withAffiliate.affiliateUrl },
)
assert.deepEqual(
  publicProductState(withoutAffiliate, { inventoryManagementMethod: 'Single', stock: 0, totalStock: 0 }),
  { id: 'bundle', status: 'unavailable', stock: 0, affiliateUrl: null },
)
assert.deepEqual(
  publicProductState(withAffiliate, { inventoryManagementMethod: 'Disabled' }),
  { id: 'treat', status: 'unavailable', stock: null, affiliateUrl: withAffiliate.affiliateUrl },
)

console.log('pezzy inventory tests passed')
