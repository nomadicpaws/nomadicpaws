import test from 'node:test'
import assert from 'node:assert/strict'
import { CHEETO_VOICE_GUIDE, biblicalDirectionFor } from '../netlify/functions/lib/cheeto-voice.mjs'

test('Cheeto voice preserves the real Instagram relationship and comic vocabulary', () => {
  assert.match(CHEETO_VOICE_GUIDE, /Meowmmy/)
  assert.match(CHEETO_VOICE_GUIDE, /management, supervision, inspection/)
  assert.match(CHEETO_VOICE_GUIDE, /trusts and loves her/)
  assert.match(CHEETO_VOICE_GUIDE, /palette, not a checklist/)
})

test('weekly themes receive varied biblical directions', () => {
  assert.match(biblicalDirectionFor('Sabbath Sunday'), /rest/)
  assert.match(biblicalDirectionFor('Training Tuesday'), /perseverance/)
  assert.match(biblicalDirectionFor('Trail Thursday'), /wilderness/)
  assert.notEqual(biblicalDirectionFor('Sabbath Sunday'), biblicalDirectionFor('Mood Monday'))
})
