import { getDatabase } from '@netlify/database'
import { randomUUID } from 'node:crypto'

export async function listCalendarEvents() {
  const result = await getDatabase().pool.query(
    `SELECT id, title, event_date, location, notes, status, created_by, created_at, updated_at
     FROM shared_calendar_events
     WHERE event_date >= CURRENT_DATE - INTERVAL '30 days'
     ORDER BY event_date ASC, updated_at DESC`,
  )
  return result.rows
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
