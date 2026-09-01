import assert from 'node:assert/strict'
import test from 'node:test'
import { validInstagramPost, validInstagramRhythm } from '../netlify/functions/lib/instagram-settings.mjs'

const rhythm = [
  ['Sunday', 'Sabbath Sunday'], ['Monday', 'Mood Monday'], ['Tuesday', 'Training Tuesday'],
  ['Wednesday', 'Whisker Wisdom Wednesday'], ['Thursday', 'Trail Thursday'],
  ['Friday', 'Adventures'], ['Saturday', 'Adventures'],
].map(([day, theme]) => ({ day, theme, enabled: true }))

test('Instagram rhythm preserves all seven editable themes in calendar order', () => {
  assert.equal(validInstagramRhythm(rhythm), true)
  assert.equal(validInstagramRhythm(rhythm.slice(0, 6)), false)
  assert.equal(validInstagramRhythm(rhythm.map((item, index) => index === 1 ? { ...item, theme: '' } : item)), false)
})

test('Instagram drafts support a target day without enabling automatic posting', () => {
  const post = { title: 'Sabbath window', caption: 'Quiet supervision.', mediaUrls: ['/cheeto.jpg'], targetDate: '2026-08-30', theme: 'Sabbath Sunday', status: 'Ready', assignedTo: 'Trinitie', handoffNote: '' }
  assert.equal(validInstagramPost(post), true)
  assert.equal(validInstagramPost({ ...post, targetDate: 'Sunday' }), false)
  assert.equal(validInstagramPost({ ...post, status: 'Scheduled' }), false)
  assert.equal(validInstagramPost({ ...post, assignedTo: 'Katie', handoffNote: 'Caption needs help' }), true)
  assert.equal(validInstagramPost({ ...post, sharedWithMom: true }), true)
  assert.equal(validInstagramPost({ ...post, sharedWithMom: 'yes' }), false)
})
