import { getDatabase } from '@netlify/database'
import { randomUUID } from 'node:crypto'

export async function listCalendarEvents() {
  const result = await getDatabase().pool.query(
    `SELECT e.id, e.title, e.event_date, e.location, e.notes, e.status, e.created_by, e.created_at, e.updated_at,
            COALESCE((SELECT json_agg(json_build_object('id', c.id, 'label', c.label, 'completed', c.completed) ORDER BY c.created_at)
              FROM shared_event_checklist_items c WHERE c.event_id = e.id), '[]'::json) AS checklist
     FROM shared_calendar_events e
     WHERE event_date >= CURRENT_DATE - INTERVAL '30 days'
     ORDER BY event_date ASC, updated_at DESC`,
  )
  return result.rows
}

export async function saveEventChecklistItem(input) {
  const id = input.id || randomUUID()
  const result = await getDatabase().pool.query(
    `INSERT INTO shared_event_checklist_items (id, event_id, label, completed, created_at, updated_at)
     VALUES ($1, $2, $3, $4, NOW(), NOW())
     ON CONFLICT (id) DO UPDATE SET label = EXCLUDED.label, completed = EXCLUDED.completed, updated_at = NOW()
     RETURNING id, event_id, label, completed`,
    [id, input.eventId, input.label.trim(), Boolean(input.completed)],
  )
  return result.rows[0]
}

export async function deleteEventChecklistItem(id, eventId) {
  await getDatabase().pool.query(`DELETE FROM shared_event_checklist_items WHERE id = $1 AND event_id = $2`, [id, eventId])
}

export async function saveCalendarEvent(input, user) {
  const id = input.id || randomUUID()
  const createdBy = user.role === 'trinitie' ? 'Trinitie' : 'Katie'
  const result = await getDatabase().pool.query(
    `INSERT INTO shared_calendar_events
       (id, title, event_date, location, notes, status, created_by, created_at, updated_at)
     VALUES ($1, $2, $3::date, $4, $5, $6, $7, NOW(), NOW())
     ON CONFLICT (id) DO UPDATE SET
       title = EXCLUDED.title, event_date = EXCLUDED.event_date,
       location = EXCLUDED.location, notes = EXCLUDED.notes,
       status = EXCLUDED.status, updated_at = NOW()
     RETURNING id, title, event_date, location, notes, status, created_by, created_at, updated_at`,
    [id, input.title.trim(), input.eventDate, String(input.location || '').trim(), String(input.notes || '').trim(), input.status, createdBy],
  )
  return result.rows[0]
}
