import type { Config } from '@netlify/functions'
import { createEventStaff, getEventStaffCode, listEventStaff, rotateEventStaffCode, setEventStaffActive } from './lib/event-staff-db.mjs'
import { errorResponse, json, readJson, requireEventOwner, requireTestMode } from './lib/event-http.mjs'

export default async (request: Request) => {
  try {
    requireTestMode()
    await requireEventOwner(request)
    if (request.method === 'GET') return json({ staff: await listEventStaff() })
    if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405, { Allow: 'GET, POST' })
    const input = await readJson(request)
    if (input.action === 'create') {
      const name = String(input.name || '').trim()
      const role = input.role === 'manager' ? 'manager' : 'helper'
      if (!name || name.length > 100) return json({ error: 'Give this helper a short recognizable name.' }, 400)
      return json(await createEventStaff({ name, role }), 201)
    }
    if (input.action === 'set-active' && /^[0-9a-f-]{36}$/i.test(String(input.id || '')) && typeof input.active === 'boolean') {
      return json({ staff: await setEventStaffActive(input.id, input.active) })
    }
    if (input.action === 'rotate-code' && /^[0-9a-f-]{36}$/i.test(String(input.id || ''))) {
      return json(await rotateEventStaffCode(input.id))
    }
    if (input.action === 'view-code' && /^[0-9a-f-]{36}$/i.test(String(input.id || ''))) {
      return json(await getEventStaffCode(input.id))
    }
    return json({ error: 'That staff update is incomplete.' }, 400)
  } catch (error) {
    return errorResponse(error)
  }
}

export const config: Config = { path: '/api/event/staff' }
