import assert from 'node:assert/strict'
import test from 'node:test'
import { MAX_DIRECT_PHOTO_BYTES, validAdventure, validDirectPhoto, validMediaDetails } from '../netlify/functions/lib/media-settings.mjs'

test('adventures require a useful bounded title', () => {
  assert.equal(validAdventure({ title: 'Cheeto discovers a cactus shadow' }), true)
  assert.equal(validAdventure({ title: '' }), false)
  assert.equal(validAdventure({ title: 'x'.repeat(161) }), false)
})

test('shared media details accept only the small approved tag vocabulary', () => {
  const mediaId = '11111111-1111-4111-8111-111111111111'
  assert.equal(validMediaDetails({ mediaId, tags: ['Cheeto', 'Trail'], notes: 'Golden hour.' }), true)
  assert.equal(validMediaDetails({ mediaId, tags: ['Secret location'], notes: '' }), false)
  assert.equal(validMediaDetails({ mediaId, tags: [], notes: 'x'.repeat(501) }), false)
})

test('direct uploads preserve supported photos within the safe function limit', () => {
  assert.equal(validDirectPhoto({ type: 'image/heic', size: MAX_DIRECT_PHOTO_BYTES }), true)
  assert.equal(validDirectPhoto({ type: 'video/quicktime', size: 1000 }), false)
  assert.equal(validDirectPhoto({ type: 'image/jpeg', size: MAX_DIRECT_PHOTO_BYTES + 1 }), false)
})
