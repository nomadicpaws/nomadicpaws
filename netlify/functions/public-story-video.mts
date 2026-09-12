import type { Config } from '@netlify/functions'
import { publicJournalVideoById } from './lib/journal-db.mjs'
import { signedR2Download } from './lib/r2-media.mjs'

export default async (request: Request) => {
  const match = new URL(request.url).pathname.match(/\/media\/story-video\/([0-9a-f-]+)$/i)
  if (request.method !== 'GET' || !match) return new Response('Not found.', { status: 404 })
  try {
    const video = await publicJournalVideoById(match[1])
    if (!video) return new Response('Not found.', { status: 404 })
    return Response.redirect(await signedR2Download(video.blob_key), 302)
  } catch {
    return new Response('This story video is temporarily unavailable.', {
      status: 503,
      headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
    })
  }
}

export const config: Config = { path: '/media/story-video/*' }
