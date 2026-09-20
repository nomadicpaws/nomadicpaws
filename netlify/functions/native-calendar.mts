import type { Config } from '@netlify/functions'
import { requireAppUser } from './lib/app-auth.mjs'
import { listCalendarEvents, saveCalendarEvent } from './lib/calendar-db.mjs'
import { validCalendarEvent } from './lib/calendar-settings.mjs'

const HEADERS = { 'Cache-Control': 'private, no-store, max-age=0', 'X-Content-Type-Options': 'nosniff' }

export default async (request: Request) => {
  try {
    const user = await requireAppUser(request, request.method === 'GET' ? ['katie', 'trinitie', 'mom'] : ['katie', 'trinitie'])
    if (request.method === 'GET') return Response.json({ events: await listCalendarEvents() }, { headers: HEADERS })
    if (request.method !== 'POST') return Response.json({ error: 'Method not allowed.' }, { status: 405, headers: HEADERS })
    const input = await request.json().catch(() => ({})) as Record<string, unknown>
    if (input.action !== 'save-event' || !validCalendarEvent(input)) {
      return Response.json({ error: 'Give this event a title, date, and valid planning status.' }, { status: 400, headers: HEADERS })
    }
    return Response.json({ event: await saveCalendarEvent(input, user) }, { headers: HEADERS })
  } catch (error: any) {
    const status = Number(error?.status || 500)
    if (status >= 500) console.error('Shared calendar failed', error)
    return Response.json({ error: status >= 500 ? 'The shared calendar could not complete that request.' : String(error?.message || error) }, { status, headers: HEADERS })
  }
}

export const config: Config = { path: '/api/app/calendar' }
