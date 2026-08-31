import type { Config } from '@netlify/functions'
import { requireAppUser } from './lib/app-auth.mjs'
import { listVideoProjects, saveVideoProject } from './lib/video-db.mjs'
import { validVideoProject } from './lib/video-settings.mjs'

const HEADERS = { 'Cache-Control': 'private, no-store, max-age=0', 'X-Content-Type-Options': 'nosniff' }

export default async (request: Request) => {
  try {
    const user = await requireAppUser(request, ['katie', 'trinitie'])
    if (request.method === 'GET') return Response.json({ projects: await listVideoProjects() }, { headers: HEADERS })
    if (request.method !== 'POST') return Response.json({ error: 'Method not allowed.' }, { status: 405, headers: HEADERS })
    const input = await request.json().catch(() => ({})) as Record<string, unknown>
    if (input.action !== 'save-project' || !validVideoProject(input)) return Response.json({ error: 'Give this video project a title and check its overlay timing.' }, { status: 400, headers: HEADERS })
    return Response.json({ project: await saveVideoProject(input, user) }, { headers: HEADERS })
  } catch (error: any) {
    const status = Number(error?.status || 500)
    if (status >= 500) console.error('Video Studio failed', error)
    return Response.json({ error: status >= 500 ? 'The shared Video Studio could not complete that request.' : String(error?.message || error) }, { status, headers: HEADERS })
  }
}

export const config: Config = { path: '/api/app/video' }
