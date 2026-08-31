import assert from 'node:assert/strict'
import test from 'node:test'
import { validVideoProject } from '../netlify/functions/lib/video-settings.mjs'

const project = {
  action: 'save-project',
  title: 'Cheeto discovers the dramatic pause',
  mediaId: '11111111-1111-4111-8111-111111111111',
  sourceStorySlug: 'cheeto-dramatic-pause',
  platforms: ['Instagram Reels', 'TikTok'],
  overlays: [{
    id: 'opening-line',
    presetId: 'typewriter',
    name: 'Typewriter',
    fontId: 'courier',
    fontName: 'Courier',
    fontFamily: 'Courier',
    text: 'I meant to do that.',
    textColor: '#ffffff',
    accentColor: '#111111',
    startAt: 1,
    endAt: 6,
    animation: 'Typewriter',
    boxed: false,
    uppercase: false,
  }],
  currentOverlay: {
    presetId: 'typewriter',
    fontId: 'courier',
    text: 'I meant to do that.',
    textColor: '#ffffff',
    accentColor: '#111111',
    startAt: '1',
    endAt: '6',
    animation: 'Typewriter',
  },
  status: 'Ready',
  assignedTo: 'Trinitie',
}

test('shared Video Studio projects accept editable overlays and multiple destinations', () => {
  assert.equal(validVideoProject(project), true)
})

test('shared Video Studio projects reject invalid timing and unknown destinations', () => {
  assert.equal(validVideoProject({ ...project, overlays: [{ ...project.overlays[0], endAt: 0.5 }] }), false)
  assert.equal(validVideoProject({ ...project, platforms: ['Facebook'] }), false)
})

test('shared Video Studio stages and next person stay within the private team', () => {
  assert.equal(validVideoProject({ ...project, status: 'Overdue' }), false)
  assert.equal(validVideoProject({ ...project, assignedTo: 'Someone else' }), false)
})
