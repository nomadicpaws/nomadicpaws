import assert from 'node:assert/strict'
import test from 'node:test'
import { validContribution, validReviewAnchor } from '../netlify/functions/lib/journal-collaboration.mjs'

test('anchored review notes require a stable passage id', () => {
  assert.equal(validReviewAnchor({ anchorType: 'paragraph', anchorId: 'paragraph-3', quotedText: 'Cheeto paused.' }), true)
  assert.equal(validReviewAnchor({ anchorType: 'selection', anchorId: '', quotedText: 'Cheeto paused.' }), false)
  assert.equal(validReviewAnchor({ anchorType: 'general' }), true)
})

test('Cat Nana may save an empty draft but cannot submit an empty contribution', () => {
  assert.equal(validContribution({ title: '', body: '', memoryClue: '', status: 'draft' }), true)
  assert.equal(validContribution({ title: '', body: '', memoryClue: '', status: 'submitted' }), false)
  assert.equal(validContribution({ title: 'A memory', body: 'Cheeto knew.', memoryClue: 'That winter', status: 'submitted' }), true)
})
