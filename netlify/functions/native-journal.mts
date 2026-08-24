import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { Config } from '@netlify/functions'
import { bearerToken, verifySellerToken } from './lib/event-auth.mjs'

const POSTS_DIR = join(process.cwd(), '_posts')

function field(raw: string, name: string) {
  const match = raw.match(new RegExp(`^${name}:\\s*(.+)$`, 'm'))
  return (match?.[1] || '').trim().replace(/^['"]|['"]$/g, '')
}

export default async (request: Request) => {
  if (request.method !== 'GET') return Response.json({ error: 'Method not allowed.' }, { status: 405 })
  const secret = process.env.EVENT_REGISTER_SESSION_SECRET || ''
  if (secret.length < 32) return Response.json({ error: 'Native admin access is not configured.' }, { status: 503 })
  if (!verifySellerToken(bearerToken(request.headers), secret)) return Response.json({ error: 'Your session expired.' }, { status: 401 })
  const files = (await readdir(POSTS_DIR)).filter(file => file.endsWith('.md'))
  const now = Date.now()
  const stories = await Promise.all(files.map(async file => {
    const raw = await readFile(join(POSTS_DIR, file), 'utf8')
    const date = field(raw, 'date')
    const draft = field(raw, 'draft') === 'true'
    const scheduled = !draft && Boolean(date) && Date.parse(date) > now
    return { slug: file.replace(/\.md$/, ''), title: field(raw, 'title') || 'Untitled', date, draft, status: draft ? 'Draft' : scheduled ? 'Scheduled' : 'Published' }
  }))
  stories.sort((a, b) => b.date.localeCompare(a.date))
  return Response.json({ stories }, { headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } })
}

export const config: Config = { path: '/api/app/journal' }
