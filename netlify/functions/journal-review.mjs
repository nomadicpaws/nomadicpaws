import { timingSafeEqual } from 'node:crypto'
import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'

const POSTS_DIR = join(process.cwd(), '_posts')

const SECURITY_HEADERS = {
  'cache-control': 'private, no-store, max-age=0',
  'content-security-policy': "default-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
  'content-type': 'text/html; charset=utf-8',
  'referrer-policy': 'no-referrer',
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
  'x-robots-tag': 'noindex, nofollow, noarchive, nosnippet',
}

function secureMatch(provided, expected) {
  if (!provided || !expected) return false
  const providedBytes = Buffer.from(provided)
  const expectedBytes = Buffer.from(expected)
  return providedBytes.length === expectedBytes.length && timingSafeEqual(providedBytes, expectedBytes)
}

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function parseFrontmatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/)
  if (!match) return { data: {}, body: raw.trim() }

  const data = {}
  let currentField = ''
  for (const line of match[1].split(/\r?\n/)) {
    const field = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/)
    if (!field) {
      if (currentField && /^\s+/.test(line) && line.trim()) {
        data[currentField] = `${data[currentField]} ${line.trim()}`.trim()
      }
      continue
    }
    let value = field[2].trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    data[field[1]] = value
    currentField = field[1]
  }
  return { data, body: match[2].trim() }
}

function publicationStatus(data, now = Date.now()) {
  if (data.draft === 'true') return 'Draft'
  const publishTime = Date.parse(data.date || '')
  return !Number.isNaN(publishTime) && publishTime > now ? 'Scheduled' : 'Published'
}

export function renderReviewFeed(posts, generatedAt = new Date()) {
  const entries = posts.map((post) => `
    <article>
      <h2>${escapeHtml(post.title)}</h2>
      <dl>
        <dt>Status</dt><dd>${escapeHtml(post.status)}</dd>
        <dt>Publish date</dt><dd>${escapeHtml(post.date || 'Not set')}</dd>
        <dt>Slug</dt><dd>${escapeHtml(post.slug)}</dd>
      </dl>
      <h3>Draft text</h3>
      <pre>${escapeHtml(post.body)}</pre>
    </article>`).join('\n')

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="robots" content="noindex,nofollow,noarchive,nosnippet"><title>Trail Journal review feed</title></head>
<body><main><h1>Trail Journal drafts for review</h1><p>Read-only feed generated ${escapeHtml(generatedAt.toISOString())}. ${posts.length} unpublished entr${posts.length === 1 ? 'y' : 'ies'}.</p>${entries || '<p>No drafts or scheduled entries.</p>'}</main></body></html>`
}

export default async (request) => {
  const suppliedToken = new URL(request.url).searchParams.get('key') || ''
  const expectedToken = process.env.TRAIL_JOURNAL_REVIEW_TOKEN || ''

  // Return the same response for a missing endpoint configuration and a bad key.
  if (!secureMatch(suppliedToken, expectedToken)) {
    return new Response('Not found', { status: 404, headers: SECURITY_HEADERS })
  }

  let files
  try {
    files = (await readdir(POSTS_DIR)).filter((file) => file.endsWith('.md'))
  } catch {
    return new Response('Unable to read journal entries', { status: 500, headers: SECURITY_HEADERS })
  }

  const now = Date.now()
  const posts = (await Promise.all(files.map(async (file) => {
    const raw = await readFile(join(POSTS_DIR, file), 'utf8')
    const { data, body } = parseFrontmatter(raw)
    return {
      title: data.title || 'Untitled',
      status: publicationStatus(data, now),
      date: data.date || '',
      slug: file.replace(/\.md$/, ''),
      body,
    }
  })))
    .filter((post) => post.status !== 'Published')
    .sort((a, b) => a.date.localeCompare(b.date))

  return new Response(renderReviewFeed(posts), { status: 200, headers: SECURITY_HEADERS })
}

export const config = { path: '/api/trail-journal-review' }

