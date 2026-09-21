import { getDatabase } from '@netlify/database'
import { randomUUID } from 'node:crypto'

const EVENT_CHECKLIST_TEMPLATE = [
  'Confirm venue rules, booth dimensions, setup window, electricity, and contacts',
  'Test checkout, prices, QR destinations, internet or hotspot, and backup battery',
  'Record starting quantity for every sellable item',
  'Update Snipcart quantities before departure',
  'Pack phone or tablet stand, Stripe reader, chargers, and battery banks',
  'Pack cash box and starting change if accepting cash',
  'Pack extension cord, power strip, gaffer tape, zip ties, scissors, and toolkit',
  'Pack cleaning cloths, lint roller, paper towels, trash bags, and sanitizer',
  'Pack water and personal event-day supplies',
  'Download reservation details and setup instructions for offline access',
  'Assign setup, sales, breaks, and teardown responsibilities',
  'Confirm inventory and note restock or damaged items after the event',
]

const CHEETO_CHECKLIST_TEMPLATE = [
  'Confirm the venue permits Cheeto and identify a quiet break space',
  'Pack Cheeto’s harness, leash, collar, identification, and backpack',
  'Pack water, bowl, food or treats, litter supplies, and cleanup bags',
  'Pack Cheeto’s tent, bed or blanket, and familiar comfort items',
  'Confirm weather, temperature, travel timing, and Cheeto’s exit plan',
  'Charge tracking devices and bring a current photo and emergency contacts',
]

export async function listCalendarEvents() {
  const result = await getDatabase().pool.query(
    `SELECT e.id, e.title, e.event_date, e.location, e.notes, e.status, e.created_by, e.cheeto_attending, e.created_at, e.updated_at,
            COALESCE((SELECT json_agg(json_build_object('id', c.id, 'label', c.label, 'completed', c.completed, 'assignedTo', c.assigned_to, 'cheetoOnly', c.cheeto_only) ORDER BY c.created_at)
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
    `INSERT INTO shared_event_checklist_items (id, event_id, label, completed, assigned_to, cheeto_only, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
     ON CONFLICT (id) DO UPDATE SET label = EXCLUDED.label, completed = EXCLUDED.completed,
       assigned_to = EXCLUDED.assigned_to, cheeto_only = EXCLUDED.cheeto_only, updated_at = NOW()
     RETURNING id, event_id, label, completed, assigned_to AS "assignedTo", cheeto_only AS "cheetoOnly"`,
    [id, input.eventId, input.label.trim(), Boolean(input.completed), String(input.assignedTo || '').trim(), Boolean(input.cheetoOnly)],
  )
  return result.rows[0]
}

export async function toggleEventChecklistItem(id, eventId, completed) {
  const result = await getDatabase().pool.query(
    `UPDATE shared_event_checklist_items SET completed = $3, updated_at = NOW()
     WHERE id = $1 AND event_id = $2
     RETURNING id, event_id, label, completed, assigned_to AS "assignedTo", cheeto_only AS "cheetoOnly"`,
    [id, eventId, Boolean(completed)],
  )
  if (!result.rows[0]) throw Object.assign(new Error('That checklist item is no longer available.'), { status: 404 })
  return result.rows[0]
}

export async function listEventAssignees() {
  const result = await getDatabase().pool.query(
    `SELECT display_name FROM event_staff WHERE active = TRUE ORDER BY display_name ASC`,
  )
  return ['Katie', ...result.rows.map((row) => row.display_name).filter((name) => name !== 'Katie')]
}

export async function deleteEventChecklistItem(id, eventId) {
  await getDatabase().pool.query(`DELETE FROM shared_event_checklist_items WHERE id = $1 AND event_id = $2`, [id, eventId])
}

export async function saveCalendarEvent(input, user) {
  const id = input.id || randomUUID()
  const isNew = !input.id
  const previous = isNew ? null : (await getDatabase().pool.query(`SELECT cheeto_attending FROM shared_calendar_events WHERE id = $1`, [id])).rows[0]
  const createdBy = user.role === 'trinitie' ? 'Trinitie' : 'Katie'
  const result = await getDatabase().pool.query(
    `INSERT INTO shared_calendar_events
       (id, title, event_date, location, notes, status, created_by, cheeto_attending, created_at, updated_at)
     VALUES ($1, $2, $3::date, $4, $5, $6, $7, $8, NOW(), NOW())
     ON CONFLICT (id) DO UPDATE SET
       title = EXCLUDED.title, event_date = EXCLUDED.event_date,
       location = EXCLUDED.location, notes = EXCLUDED.notes,
       status = EXCLUDED.status, cheeto_attending = EXCLUDED.cheeto_attending, updated_at = NOW()
     RETURNING id, title, event_date, location, notes, status, created_by, cheeto_attending, created_at, updated_at`,
    [id, input.title.trim(), input.eventDate, String(input.location || '').trim(), String(input.notes || '').trim(), input.status, createdBy, Boolean(input.cheetoAttending)],
  )
  if (isNew) {
    const tasks = [...EVENT_CHECKLIST_TEMPLATE.map((label) => ({ label, cheetoOnly: false })), ...(input.cheetoAttending ? CHEETO_CHECKLIST_TEMPLATE.map((label) => ({ label, cheetoOnly: true })) : [])]
    for (const task of tasks) {
      await getDatabase().pool.query(
        `INSERT INTO shared_event_checklist_items (id, event_id, label, completed, assigned_to, cheeto_only)
         VALUES ($1, $2, $3, FALSE, '', $4)`,
        [randomUUID(), id, task.label, task.cheetoOnly],
      )
    }
  } else if (input.cheetoAttending && !previous?.cheeto_attending) {
    for (const label of CHEETO_CHECKLIST_TEMPLATE) {
      await getDatabase().pool.query(
        `INSERT INTO shared_event_checklist_items (id, event_id, label, completed, assigned_to, cheeto_only)
         VALUES ($1, $2, $3, FALSE, '', TRUE)`,
        [randomUUID(), id, label],
      )
    }
  } else if (!input.cheetoAttending) {
    await getDatabase().pool.query(`DELETE FROM shared_event_checklist_items WHERE event_id = $1 AND cheeto_only = TRUE`, [id])
  }
  return result.rows[0]
}
