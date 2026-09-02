import assert from 'node:assert/strict'
import test from 'node:test'
import { MAX_ADVENTURE_PHOTO_BYTES, MAX_ADVENTURE_VIDEO_BYTES, MAX_DIRECT_PHOTO_BYTES, validAdventure, validDirectPhoto, validDirectPhotoUpload, validMediaDetails, validVideoUpload, validWorkingVersion } from '../netlify/functions/lib/media-settings.mjs'

test('adventures require a useful bounded title', () => {
  assert.equal(validAdventure({ title: 'Cheeto discovers a cactus shadow' }), true)
  assert.equal(validAdventure({ title: '' }), false)
  assert.equal(validAdventure({ title: 'x'.repeat(161) }), false)
})

test('shared media details accept only the small approved tag vocabulary', () => {
  const mediaId = '11111111-1111-4111-8111-111111111111'
  assert.equal(validMediaDetails({ mediaId, displayName: 'Cheeto at golden hour', tags: ['Cheeto', 'Trail'], notes: 'Golden hour.' }), true)
  assert.equal(validMediaDetails({ mediaId, displayName: 'x'.repeat(161), tags: [], notes: '' }), false)
  assert.equal(validMediaDetails({ mediaId, tags: ['Secret location'], notes: '' }), false)
  assert.equal(validMediaDetails({ mediaId, tags: [], notes: 'x'.repeat(501) }), false)
})

test('working versions keep destination and treatment choices bounded', () => {
  const mediaId = '11111111-1111-4111-8111-111111111111'
  const treatment = { logoColor: 'sand', logoSize: 'medium', logoSide: 'right', focus: 'center' }
  assert.equal(validWorkingVersion({ mediaId, destination: 'pinterest', treatment }), true)
  assert.equal(validWorkingVersion({ mediaId, destination: 'somewhere-else', treatment }), false)
  assert.equal(validWorkingVersion({ mediaId, destination: 'instagram', treatment: { ...treatment, logoColor: 'purple' } }), false)
  assert.equal(validWorkingVersion({ mediaId, destination: 'trail-article', treatment: { ...treatment, logoColor: 'none' } }), true)
})

test('direct uploads preserve supported photos within the safe function limit', () => {
  assert.equal(validDirectPhoto({ type: 'image/heic', size: MAX_DIRECT_PHOTO_BYTES }), true)
  assert.equal(validDirectPhoto({ type: 'video/quicktime', size: 1000 }), false)
  assert.equal(validDirectPhoto({ type: 'image/jpeg', size: MAX_DIRECT_PHOTO_BYTES + 1 }), false)
})

test('full-resolution adventure photos can upload directly to private cloud storage', () => {
  const input = {
    adventureId: '11111111-1111-4111-8111-111111111111',
    originalName: 'IMG_2977.HEIC',
    displayName: 'Cheeto watching the sunrise',
    contentType: 'image/heic',
    byteSize: MAX_ADVENTURE_PHOTO_BYTES,
  }
  assert.equal(validDirectPhotoUpload(input), true)
  assert.equal(validDirectPhotoUpload({ ...input, byteSize: MAX_ADVENTURE_PHOTO_BYTES + 1 }), false)
  assert.equal(validDirectPhotoUpload({ ...input, displayName: 'x'.repeat(161) }), false)
})

test('chunked adventure uploads accept a real 30-second iPhone video safely', () => {
  const input = {
    adventureId: '11111111-1111-4111-8111-111111111111',
    originalName: 'Cheeto-trail.mov',
    displayName: 'Cheeto explores the wash',
    contentType: 'video/quicktime',
    byteSize: MAX_ADVENTURE_VIDEO_BYTES,
    durationSeconds: 30,
  }
  assert.equal(validVideoUpload(input), true)
  assert.equal(validVideoUpload({ ...input, durationSeconds: 36 }), false)
  assert.equal(validVideoUpload({ ...input, contentType: 'application/pdf' }), false)
  assert.equal(validVideoUpload({ ...input, byteSize: MAX_ADVENTURE_VIDEO_BYTES + 1 }), false)
})
