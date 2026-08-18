import type { Config } from '@netlify/functions'
import { PEZZY_PRODUCTS, publicProductState } from './lib/pezzy-inventory.mjs'

const SNIPCART_PRODUCTS_URL = 'https://app.snipcart.com/api/products'

function json(body: unknown, status = 200): Response {
  return Response.json(body, {
    status,
    headers: { 'Cache-Control': 'public, max-age=0, s-maxage=60, stale-while-revalidate=300' },
  })
}

export default async () => {
  const secretKey = process.env.Snipcart
  if (!secretKey) return json({ error: 'Inventory service is not configured.' }, 503)

  const authorization = `Basic ${Buffer.from(`${secretKey}:`).toString('base64')}`

  try {
    const products = await Promise.all(
      PEZZY_PRODUCTS.map(async (product) => {
        try {
          const response = await fetch(`${SNIPCART_PRODUCTS_URL}/${encodeURIComponent(product.id)}`, {
            headers: { Accept: 'application/json', Authorization: authorization },
          })
          if (!response.ok) throw new Error(`Snipcart returned ${response.status} for ${product.id}`)
          return publicProductState(product, await response.json())
        } catch (error) {
          console.error(`Unable to read Snipcart inventory for ${product.id}.`, error)
          return { id: product.id, status: 'error', stock: null, affiliateUrl: product.affiliateUrl }
        }
      }),
    )
    return json({ products })
  } catch (error) {
    console.error('Unable to read Snipcart inventory.', error)
    return json({ error: 'Inventory could not be confirmed.' }, 502)
  }
}

export const config: Config = { path: '/api/product-inventory' }
