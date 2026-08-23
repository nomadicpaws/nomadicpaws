import test from 'node:test'
import assert from 'node:assert/strict'
import { buildCsv, buildRss } from '../netlify/functions/lib/pinterest-content.mjs'

const campaign = {
  post_slug: '2026-09-01-cheeto-test',
  campaign_title: 'Cheeto Test',
  board: "Cheeto's Trail Journal",
  keywords: 'adventure cat, cat hiking',
  enabled: true,
  rss_pin: { image: '/images/pin-1.jpg', title: 'First & best', description: 'RSS description' },
  day_7_pin: { image: '/images/pin-2.jpg', title: 'Day 7', description: 'Second pin' },
  day_14_pin: { image: '/images/pin-3.jpg', title: 'Day 14', description: 'Third pin' },
  day_21_pin: { image: '/images/pin-4.jpg', title: 'Day 21', description: 'Fourth pin' },
}

const posts = new Map([[campaign.post_slug, { date: '2026-09-01T09:00:00-07:00' }]])

test('RSS releases the first image when the article publishes', () => {
  const early = buildRss([campaign], posts, new Date('2026-09-01T12:00:00Z'))
  assert.doesNotMatch(early, /pin-1\.jpg/)

  const ready = buildRss([campaign], posts, new Date('2026-09-01T18:00:00Z'))
  assert.match(ready, /pin-1\.jpg/)
  assert.doesNotMatch(ready, /pin-2\.jpg/)
  assert.match(ready, /First &amp; best/)
})

test('CSV schedules the remaining images at 7, 14, and 21 days', () => {
  const csv = buildCsv([campaign], posts, new Date('2026-08-23T12:00:00Z'))
  assert.match(csv, /2026-09-08/)
  assert.match(csv, /2026-09-15/)
  assert.match(csv, /2026-09-22/)
  assert.doesNotMatch(csv, /pin-1\.jpg/)
  assert.match(csv, /pin-4\.jpg/)
})

test('retroactive campaigns put all four images into open CSV dates', () => {
  const retroactive = { ...campaign, retroactive: true }
  const csv = buildCsv([retroactive], posts, new Date('2026-09-30T12:00:00Z'))
  assert.match(csv, /pin-1\.jpg/)
  assert.match(csv, /2026-10-01/)
  assert.match(csv, /2026-10-02/)
  assert.match(csv, /2026-10-03/)
  assert.match(csv, /2026-10-04/)
})

test('retroactive dates skip the regular RSS window and weekly follow-ups', () => {
  const current = { ...campaign }
  const old = { ...campaign, post_slug: '2026-08-01-old', retroactive: true }
  const combinedPosts = new Map([
    ...posts,
    [old.post_slug, { date: '2026-08-01T09:00:00-07:00' }],
  ])
  const csv = buildCsv([current, old], combinedPosts, new Date('2026-08-31T12:00:00Z'))
  assert.doesNotMatch(csv, /2026-09-01,adventure cat/)
  assert.doesNotMatch(csv, /2026-09-02,adventure cat/)
  assert.match(csv, /2026-09-03/)
})
