import test from 'node:test'
import { validPinterestCampaign } from '../netlify/functions/lib/pinterest-settings.mjs'
import assert from 'node:assert/strict'
import { brandedMediaUrl, buildCsv, buildRss } from '../netlify/functions/lib/pinterest-content.mjs'

const campaign = {
  post_slug: '2026-09-01-cheeto-test',
  campaign_title: 'Cheeto Test',
  board: 'Nomadic Paws Trail Journal',
  keywords: 'adventure cat, cat hiking',
  enabled: true,
  rss_pin: { image: '/images/pin-1.jpg', title: 'First & best', description: 'RSS description' },
  day_7_pin: { image: '/images/pin-2.jpg', title: 'Day 7', description: 'Second pin' },
  day_14_pin: { image: '/images/pin-3.jpg', title: 'Day 14', description: 'Third pin' },
  day_21_pin: { image: '/images/pin-4.jpg', title: 'Day 21', description: 'Fourth pin' },
}

const posts = new Map([[campaign.post_slug, { date: '2026-09-01T09:00:00-07:00' }]])

test('branded media URLs preserve the upload and selected logo treatment', () => {
  const url = brandedMediaUrl({ image: '/images/uploads/cheeto.jpg', template: 'sage', logo_size: 'medium', logo_placement: 'right' })
  assert.match(url, /\/pinterest-image\.jpg\?/)
  assert.match(url, /template=sage/)
  assert.match(url, /size=medium/)
  assert.match(url, /placement=right/)
  assert.match(decodeURIComponent(url), /https:\/\/nomadicpaws\.co\/images\/uploads\/cheeto\.jpg/)
})

test('already-rendered working images do not receive a second watermark', () => {
  const image = '/media/working/11111111-1111-4111-8111-111111111111.jpg'
  assert.equal(
    brandedMediaUrl({ image, template: 'terracotta', logo_size: 'medium', logo_placement: 'right' }),
    `https://nomadicpaws.co${image}`,
  )
})

test('existing campaigns retain small left logo defaults', () => {
  const url = brandedMediaUrl({ image: '/images/uploads/cheeto.jpg', template: 'bark' })
  assert.match(url, /size=small/)
  assert.match(url, /placement=left/)
})

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

test('native Pinterest campaigns require four complete branded images', () => {
  const pin = { image: '/media/working/123.jpg', title: 'Cheeto on the trail', description: 'A desert field note.', template: 'bark', logo_size: 'small', logo_placement: 'left' }
  const campaign = { post_slug: 'cheeto-on-the-trail', campaign_title: 'Cheeto on the trail', board: 'Trail Life with Cheeto', keywords: 'hiking with cats', retroactive: false, enabled: true, rss_pin: pin, day_7_pin: { ...pin, template: 'sage' }, day_14_pin: { ...pin, template: 'sand' }, day_21_pin: { ...pin, template: 'terracotta' } }
  assert.equal(validPinterestCampaign(campaign), true)
  assert.equal(validPinterestCampaign({ ...campaign, day_14_pin: { ...pin, title: '' } }), false)
  assert.equal(validPinterestCampaign({ ...campaign, rss_pin: { ...pin, template: 'cream' } }), false)
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

test('CSV follow-up slots support video with a required thumbnail', () => {
  const videoPin = {
    image: '/media/story-video/11111111-1111-4111-8111-111111111111',
    thumbnail: '/media/working/video-cover.jpg',
    media_type: 'video',
    title: 'Cheeto explains the night shift',
    description: 'A short Cheeto video.',
    template: 'bark',
    logo_size: 'small',
    logo_placement: 'left',
  }
  const imagePin = { image: '/media/working/photo.jpg', title: 'Cheeto photo', description: 'A Cheeto photo.', template: 'sage', logo_size: 'small', logo_placement: 'left' }
  const videoCampaign = { ...campaign, retroactive: false, rss_pin: { ...imagePin, template: 'bark' }, day_7_pin: videoPin, day_14_pin: imagePin, day_21_pin: { ...imagePin, template: 'terracotta' } }
  const csv = buildCsv([videoCampaign], posts, new Date('2026-08-23T12:00:00Z'))
  assert.match(csv, /\/media\/story-video\/11111111-1111-4111-8111-111111111111/)
  assert.match(csv, /\/media\/working\/video-cover\.jpg/)
  assert.equal(validPinterestCampaign(videoCampaign), true)
  assert.equal(validPinterestCampaign({ ...videoCampaign, day_7_pin: { ...videoPin, thumbnail: '' } }), false)
  assert.equal(validPinterestCampaign({ ...videoCampaign, rss_pin: videoPin }), false)
})
