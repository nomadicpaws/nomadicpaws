import type { Config } from '@netlify/functions'
import { requireAppUser } from './lib/app-auth.mjs'
import { bearerToken, verifySellerToken } from './lib/event-auth.mjs'
import { getInstagramStudio, saveInstagramPost, saveInstagramRhythm } from './lib/instagram-db.mjs'
import { validInstagramPost, validInstagramRhythm } from './lib/instagram-settings.mjs'

const HEADERS = { 'Cache-Control': 'private, no-store, max-age=0', 'X-Content-Type-Options': 'nosniff' }

async function authorized(request: Request) {
  try { await requireAppUser(request, ['katie', 'trinitie']); return } catch (error) {
    const secret = process.env.EVENT_REGISTER_SESSION_SECRET || ''
    if (secret.length >= 32 && verifySellerToken(bearerToken(request.headers), secret)) return
    throw error
  }
}

export default async (request: Request) => {
  try {
    await authorized(request)
    if (request.method === 'GET') return Response.json(await getInstagramStudio(), { headers: HEADERS })
    if (request.method === 'PUT') {
      const payload = await request.json().catch(() => ({})) as Record<string, unknown>
      if (!validInstagramRhythm(payload.rhythm)) return Response.json({ error: 'Instagram rhythm must include one valid theme for each day.' }, { status: 400, headers: HEADERS })
      return Response.json(await saveInstagramRhythm(payload.rhythm), { headers: HEADERS })
    }
    if (request.method === 'POST') {
      const payload = await request.json().catch(() => ({})) as Record<string, unknown>
      if (payload.action !== 'save-post' || !validInstagramPost(payload)) return Response.json({ error: 'This Instagram draft is incomplete or invalid.' }, { status: 400, headers: HEADERS })
      return Response.json({ post: await saveInstagramPost(payload) }, { headers: HEADERS })
    }
    return Response.json({ error: 'Method not allowed.' }, { status: 405, headers: { ...HEADERS, Allow: 'GET, PUT, POST' } })
  } catch (error: any) {
    console.error('Instagram Studio failed', error)
    return Response.json({ error: error?.message || 'Nomadic Paws could not open Instagram Studio right now.' }, { status: Number(error?.status) || 500, headers: HEADERS })
  }
}

export const config: Config = { path: '/api/app/instagram' }
