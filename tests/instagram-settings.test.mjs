import assert from 'node:assert/strict'
import test from 'node:test'
import { validInstagramRhythm } from '../netlify/functions/lib/instagram-settings.mjs'

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
