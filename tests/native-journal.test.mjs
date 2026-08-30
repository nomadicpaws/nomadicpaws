import assert from 'node:assert/strict'
import test from 'node:test'
import { journalStatus, journalVersion, parseJournalFile } from '../netlify/functions/lib/journal-content.mjs'
import { buildMarkdown } from '../netlify/functions/lib/journal-github.mjs'

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

test('GitHub publishing preserves unrelated frontmatter while applying the synchronized draft', () => {
  const source = `---\ntitle: "Old"\nlayout: post\ndraft: true\n---\n\nOld body\n`
  const output = buildMarkdown(source, { title: 'Cheeto Leads', description: 'A field note', category: 'Cheeto Diaries', image: '/hero.jpg', image_alt: 'Cheeto on a trail', publish_date: '2026-08-30', is_draft: false, body: 'New story body that is ready for the trail.' })
  assert.match(output, /layout: post/)
  assert.match(output, /title: "Cheeto Leads"/)
  assert.match(output, /draft: false/)
  assert.match(output, /New story body/)
  assert.doesNotMatch(output, /Old body/)
})

test('a brand-new synchronized Journal draft can become its first GitHub file', () => {
  const source = `---\nlayout: post\n---\n\n`
  const output = buildMarkdown(source, { title: 'A New Cheeto Story', description: 'Fresh from the trail', category: 'Cheeto Diaries', image: '/hero.jpg', image_alt: 'Cheeto watching the desert', publish_date: '2026-09-13', is_draft: true, body: 'The first recoverable version of a brand-new story.' })
  assert.match(output, /layout: post/)
  assert.match(output, /title: "A New Cheeto Story"/)
  assert.match(output, /draft: true/)
  assert.match(output, /first recoverable version/)
})
