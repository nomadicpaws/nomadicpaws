import { getStore } from '@netlify/blobs'
import type { Config } from '@netlify/functions'
import { workingVersionById } from './lib/media-db.mjs'
import { renderWorkingImage } from './lib/media-render.mjs'

const store = () => getStore('nomadic-paws-original-media')
const PUBLIC_DESTINATIONS = new Set(['trail-hero', 'trail-article', 'pinterest'])

export default async (request: Request) => {
  const match = new URL(request.url).pathname.match(/\/media\/working\/([0-9a-f-]+)\.jpg$/i)
  if (request.method !== 'GET' || !match) return new Response('Not found.', { status: 404 })
  const version = await workingVersionById(match[1])
  if (!version || !PUBLIC_DESTINATIONS.has(version.destination_type)) return new Response('Not found.', { status: 404 })
  const cacheKey = `working/${version.id}.jpg`
  let finished = await store().get(cacheKey, { type: 'arrayBuffer', consistency: 'strong' })
  if (!finished) {
    const original = await store().get(version.blob_key, { type: 'arrayBuffer', consistency: 'strong' })
    if (!original) return new Response('Not found.', { status: 404 })
    const rendered = await renderWorkingImage(Buffer.from(original), version)
    await store().set(cacheKey, rendered, { metadata: { workingVersionId: version.id, mediaId: version.media_id }, onlyIfNew: true })
    finished = rendered.buffer.slice(rendered.byteOffset, rendered.byteOffset + rendered.byteLength)
  }
  return new Response(finished, { headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'public, max-age=31536000, immutable', 'X-Content-Type-Options': 'nosniff' } })
}

export const config: Config = { path: '/media/working/*' }
