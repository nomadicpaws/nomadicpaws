import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { Config } from '@netlify/functions'
import sharp from 'sharp'

const SITE_ORIGIN = 'https://nomadicpaws.co'
const TEMPLATES = new Set(['bark', 'sage', 'sand', 'terracotta'])

export default async (request: Request) => {
  const url = new URL(request.url)
  const template = url.searchParams.get('template') || 'bark'
  const imageValue = url.searchParams.get('image') || ''

  if (!TEMPLATES.has(template)) return new Response('Unknown logo template', { status: 400 })

  let imageUrl: URL
  try {
    imageUrl = new URL(imageValue, SITE_ORIGIN)
  } catch {
    return new Response('Invalid image', { status: 400 })
  }

  // CMS uploads live on the Nomadic Paws site. Keeping this same-origin avoids
  // turning the public image endpoint into an unrestricted URL fetcher.
  if (imageUrl.origin !== SITE_ORIGIN) return new Response('Image must be hosted by Nomadic Paws', { status: 400 })

  const sourceResponse = await fetch(imageUrl)
  if (!sourceResponse.ok) return new Response('Image unavailable', { status: 404 })
  const contentType = sourceResponse.headers.get('content-type') || ''
  if (!contentType.startsWith('image/')) return new Response('Unsupported image', { status: 415 })

  const source = Buffer.from(await sourceResponse.arrayBuffer())
  const overlay = await readFile(join(process.cwd(), 'images', 'pinterest-templates', `pin-${template}.png`))
  const finished = await sharp(source)
    .rotate()
    .resize(1000, 1500, { fit: 'cover', position: 'attention' })
    .composite([{ input: overlay, top: 0, left: 0 }])
    .jpeg({ quality: 88, progressive: true })
    .toBuffer()

  return new Response(finished, {
    headers: {
      'Content-Type': 'image/jpeg',
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}

export const config: Config = {
  path: '/pinterest-image.jpg',
}
