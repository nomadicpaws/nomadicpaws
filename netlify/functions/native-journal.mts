import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { Config } from '@netlify/functions'
import { bearerToken, verifySellerToken } from './lib/event-auth.mjs'
import { addJournalReviewNote, journalReviewNotes } from './lib/journal-db.mjs'
import { journalStatus, journalVersion, parseJournalFile } from './lib/journal-content.mjs'

const POSTS_DIR = join(process.cwd(), '_posts')
const HEADERS = { 'Cache-Control': 'private, no-store, max-age=0', 'X-Content-Type-Options': 'nosniff' }

async function readStories() {
  const files = (await readdir(POSTS_DIR)).filter(file => file.endsWith('.md'))
  return Promise.all(files.map(async file => {
    const raw = await readFile(join(POSTS_DIR, file), 'utf8')
    const { data, body } = parseJournalFile(raw)
    return {
      slug: file.replace(/\.md$/, ''), title: data.title || 'Untitled', description: data.description || '', category: data.category || '',
      date: data.date || '', draft: data.draft === 'true', status: journalStatus(data), body, version: journalVersion(raw),
    }
  }))
}

function authenticated(request: Request) {
  const secret = process.env.EVENT_REGISTER_SESSION_SECRET || ''
  return secret.length >= 32 && Boolean(verifySellerToken(bearerToken(request.headers), secret))
}

export default async (request: Request) => {
  if (!authenticated(request)) return Response.json({ error: 'Your session expired.' }, { status: 401, headers: HEADERS })
  try {
    if (request.method === 'GET') {
      const requestedSlug = new URL(request.url).searchParams.get('slug')
      const stories = await readStories()
      if (requestedSlug) {
        const story = stories.find(item => item.slug === requestedSlug)
        if (!story) return Response.json({ error: 'Trail Journal story not found.' }, { status: 404, headers: HEADERS })
        const notes = await journalReviewNotes(story.slug)
        return Response.json({ story, notes }, { headers: HEADERS })
      }
      const summaries = stories.map(({ body: _body, ...story }) => story).sort((a, b) => b.date.localeCompare(a.date))
      return Response.json({ stories: summaries }, { headers: HEADERS })
    }
    if (request.method === 'POST') {
      const payload = await request.json().catch(() => ({})) as Record<string, unknown>
      if (payload.action !== 'add-review-note') return Response.json({ error: 'Unknown Journal action.' }, { status: 400, headers: HEADERS })
      const slug = String(payload.slug || ''), reviewer = String(payload.reviewer || ''), note = String(payload.note || '').trim(), suppliedVersion = String(payload.version || '')
      if (!['Trinitie', 'Mom'].includes(reviewer)) return Response.json({ error: 'Choose a Journal reviewer.' }, { status: 400, headers: HEADERS })
      if (!note || note.length > 3000) return Response.json({ error: 'Review notes must be between 1 and 3,000 characters.' }, { status: 400, headers: HEADERS })
      const story = (await readStories()).find(item => item.slug === slug)
      if (!story) return Response.json({ error: 'Trail Journal story not found.' }, { status: 404, headers: HEADERS })
      if (story.version !== suppliedVersion) return Response.json({ error: 'Katie updated this draft. Refresh it before leaving a note.' }, { status: 409, headers: HEADERS })
      const saved = await addJournalReviewNote({ slug, version: story.version, reviewer, note })
      return Response.json({ note: saved }, { status: 201, headers: HEADERS })
    }
    return Response.json({ error: 'Method not allowed.' }, { status: 405, headers: { ...HEADERS, Allow: 'GET, POST' } })
  } catch (error) {
    console.error('Native Journal failed', error)
    return Response.json({ error: 'Nomadic Paws could not open the Trail Journal right now.' }, { status: 500, headers: HEADERS })
  }
}

export const config: Config = { path: '/api/app/journal' }
