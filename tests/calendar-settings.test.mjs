import test from 'node:test'
import assert from 'node:assert/strict'
import { validCalendarEvent } from '../netlify/functions/lib/calendar-settings.mjs'

test('shared calendar accepts a bounded planning event', () => {
  assert.equal(validCalendarEvent({
    action: 'save-event',
    title: 'Downtown market',
    eventDate: '2026-10-03',
    location: 'Prescott',
    notes: 'Bring the treat display.',
    status: 'Planned',
  }), true)
})

test('shared calendar rejects missing dates and unknown statuses', () => {
  assert.equal(validCalendarEvent({ title: 'Market', eventDate: '', status: 'Planned' }), false)
  assert.equal(validCalendarEvent({ title: 'Market', eventDate: '2026-10-03', status: 'Maybe' }), false)
})
