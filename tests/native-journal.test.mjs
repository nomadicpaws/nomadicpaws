import assert from 'node:assert/strict'
import test from 'node:test'
import { journalStatus, journalVersion, parseJournalFile } from '../netlify/functions/lib/journal-content.mjs'

test('native Journal details preserve CMS body and safe metadata', () => {
  const raw = `---\ntitle: "Cheeto Leads"\ndraft: true\ndate: 2026-09-01T10:00:00-07:00\n---\nA real story.`
  const parsed = parseJournalFile(raw)
  assert.equal(parsed.data.title, 'Cheeto Leads')
  assert.equal(parsed.body, 'A real story.')
  assert.equal(journalStatus(parsed.data), 'Draft')
})

test('review-note versions change whenever the draft changes', () => {
  const original = journalVersion('first draft')
  assert.equal(original, journalVersion('first draft'))
  assert.notEqual(original, journalVersion('second draft'))
  assert.match(original, /^[a-f0-9]{12}$/)
})
