import assert from 'node:assert/strict'
import test from 'node:test'

import reviewHandler, { renderReviewFeed } from '../netlify/functions/journal-review.mjs'

test('review feed escapes CMS content and labels itself read-only', () => {
  const html = renderReviewFeed([{
    title: '<script>alert(1)</script>',
    status: 'Draft',
    date: '2026-09-06T08:00:00.000-07:00',
    slug: 'draft-slug',
    body: '# Draft\n<script>bad()</script>',
  }], new Date('2026-08-19T00:00:00Z'))

  assert.match(html, /Read-only feed/)
  assert.doesNotMatch(html, /<script>/)
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/)
  assert.match(html, /Status<\/dt><dd>Draft/)
})

test('review endpoint conceals itself when the access key is missing or wrong', async () => {
  const previous = process.env.TRAIL_JOURNAL_REVIEW_TOKEN
  process.env.TRAIL_JOURNAL_REVIEW_TOKEN = 'a-secure-test-token'
  try {
    const response = await reviewHandler(new Request('https://example.com/api/trail-journal-review?key=wrong'))
    assert.equal(response.status, 404)
    assert.equal(response.headers.get('cache-control'), 'private, no-store, max-age=0')
    assert.match(response.headers.get('x-robots-tag'), /noindex/)
  } finally {
    if (previous === undefined) delete process.env.TRAIL_JOURNAL_REVIEW_TOKEN
    else process.env.TRAIL_JOURNAL_REVIEW_TOKEN = previous
  }
})
