import type { Config } from '@netlify/functions'
import { requireAppUser } from './lib/app-auth.mjs'
import { deleteEventChecklistItem, listCalendarEvents, listEventAssignees, saveCalendarEvent, saveEventChecklistItem, toggleEventChecklistItem } from './lib/calendar-db.mjs'
import { validCalendarEvent } from './lib/calendar-settings.mjs'
import { bearerToken, verifySellerToken } from './lib/event-auth.mjs'

const HEADERS = { 'Cache-Control': 'private, no-store, max-age=0', 'X-Content-Type-Options': 'nosniff' }

async function authorized(request: Request) {
  try {
    return await requireAppUser(request, request.method === 'GET' ? ['katie', 'trinitie', 'mom'] : ['katie', 'trinitie'])
  } catch (error) {
    const secret = process.env.EVENT_REGISTER_SESSION_SECRET || ''
    const seller = secret.length >= 32 ? verifySellerToken(bearerToken(request.headers), secret) : null
    if (seller) return seller
    throw error
  }
}

export default async (request: Request) => {
  try {
    const user = await authorized(request)
    if (request.method === 'GET') return Response.json({ events: await listCalendarEvents(), assignees: await listEventAssignees() }, { headers: HEADERS })
    if (request.method !== 'POST') return Response.json({ error: 'Method not allowed.' }, { status: 405, headers: HEADERS })
    const input = await request.json().catch(() => ({})) as Record<string, unknown>
    const canManage = ['katie', 'trinitie'].includes(String(user.role || '')) || ['owner', 'manager'].includes(String(user.permission || ''))
    if (input.action === 'toggle-checklist-item') {
      if (!/^[0-9a-f-]{36}$/i.test(String(input.eventId || '')) || !/^[0-9a-f-]{36}$/i.test(String(input.id || '')) || typeof input.completed !== 'boolean') {
        return Response.json({ error: 'Choose a valid checklist item.' }, { status: 400, headers: HEADERS })
      }
      return Response.json({ item: await toggleEventChecklistItem(input.id, input.eventId, input.completed) }, { headers: HEADERS })
    }
    if (!canManage) return Response.json({ error: 'Only Katie or a manager can change event plans.' }, { status: 403, headers: HEADERS })
    if (input.action === 'save-checklist-item') {
      if (!/^[0-9a-f-]{36}$/i.test(String(input.eventId || '')) || (input.id && !/^[0-9a-f-]{36}$/i.test(String(input.id))) || typeof input.label !== 'string' || !input.label.trim() || input.label.trim().length > 240 || typeof (input.assignedTo || '') !== 'string' || String(input.assignedTo || '').length > 100 || typeof (input.cheetoOnly ?? false) !== 'boolean') {
        return Response.json({ error: 'Add a short checklist item to a valid event.' }, { status: 400, headers: HEADERS })
      }
      return Response.json({ item: await saveEventChecklistItem(input) }, { headers: HEADERS })
    }
    if (input.action === 'delete-checklist-item') {
      if (!/^[0-9a-f-]{36}$/i.test(String(input.eventId || '')) || !/^[0-9a-f-]{36}$/i.test(String(input.id || ''))) {
        return Response.json({ error: 'Choose a valid checklist item.' }, { status: 400, headers: HEADERS })
      }
      await deleteEventChecklistItem(input.id, input.eventId)
      return Response.json({ deleted: true }, { headers: HEADERS })
    }
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
