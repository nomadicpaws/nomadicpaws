const statuses = ['Planned', 'Confirmed', 'Done', 'Canceled']

export function validCalendarEvent(input = {}) {
  return (!input.id || (typeof input.id === 'string' && /^[0-9a-f-]{36}$/i.test(input.id)))
    && typeof input.title === 'string' && input.title.trim().length > 0 && input.title.trim().length <= 160
    && typeof input.eventDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(input.eventDate)
    && typeof (input.location || '') === 'string' && String(input.location || '').length <= 240
    && typeof (input.notes || '') === 'string' && String(input.notes || '').length <= 2000
    && statuses.includes(input.status)
}
