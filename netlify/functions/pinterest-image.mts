import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { Config } from '@netlify/functions'
import sharp from 'sharp'

const SITE_ORIGIN = 'https://nomadicpaws.co'
const TEMPLATES = new Set(['bark', 'sage', 'sand', 'terracotta'])
const SIZES = new Set(['small', 'medium'])
const PLACEMENTS = new Set(['left', 'right'])

export default async (request: Request) => {
  const url = new URL(request.url)
  const template = url.searchParams.get('template') || 'bark'
  const imageValue = url.searchParams.get('image') || ''
  const size = url.searchParams.get('size') || 'small'
  const placement = url.searchParams.get('placement') || 'left'

  if (!TEMPLATES.has(template)) return new Response('Unknown logo template', { status: 400 })
  if (!SIZES.has(size)) return new Response('Unknown logo size', { status: 400 })
  if (!PLACEMENTS.has(placement)) return new Response('Unknown logo placement', { status: 400 })

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
  const logoSource = await readFile(join(process.cwd(), 'images', 'pinterest-logos', `logo-${template}.png`))
  const logoWidth = size === 'medium' ? 310 : 230
  const logo = await sharp(logoSource).resize({ width: logoWidth }).png().toBuffer()
  const logoMetadata = await sharp(logo).metadata()
  const logoHeight = logoMetadata.height || Math.round(logoWidth * 0.5)
  const margin = 60
  const left = placement === 'right' ? 1000 - logoWidth - margin : margin
  const finished = await sharp(source)
    .rotate()
    .resize(1000, 1500, { fit: 'cover', position: 'centre' })
    .composite([{ input: logo, top: 1500 - logoHeight - margin, left }])
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
