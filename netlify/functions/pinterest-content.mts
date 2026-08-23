import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { Config } from '@netlify/functions'
import { buildCsv, buildRss } from './lib/pinterest-content.mjs'

const POSTS_DIR = join(process.cwd(), '_posts')
const PINTEREST_DIR = join(process.cwd(), '_pinterest')

function readPostDate(raw: string): string {
  const match = raw.match(/^---\r?\n[\s\S]*?^date:\s*["']?([^\r\n"']+)/m)
  return match?.[1]?.trim() || ''
}

async function loadPosts() {
  const posts = new Map<string, { date: string }>()
  const files = await readdir(POSTS_DIR).catch(() => [])
  await Promise.all(files.filter((file) => file.endsWith('.md')).map(async (file) => {
    const raw = await readFile(join(POSTS_DIR, file), 'utf8')
    posts.set(file.replace(/\.md$/, ''), { date: readPostDate(raw) })
  }))
  return posts
}

async function loadCampaigns() {
  const files = await readdir(PINTEREST_DIR).catch(() => [])
  const campaigns = await Promise.all(files.filter((file) => file.endsWith('.json')).map(async (file) => {
    try {
      return JSON.parse(await readFile(join(PINTEREST_DIR, file), 'utf8'))
    } catch {
      return null
    }
  }))
  return campaigns.filter(Boolean)
}

export default async (request: Request) => {
  const { pathname } = new URL(request.url)
  const [campaigns, posts] = await Promise.all([loadCampaigns(), loadPosts()])

  if (pathname.endsWith('.csv')) {
    return new Response(buildCsv(campaigns, posts), {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="nomadic-paws-pinterest-schedule.csv"',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  }

  return new Response(buildRss(campaigns, posts), {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=900',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}

export const config: Config = {
  path: ['/pinterest-rss.xml', '/pinterest.csv'],
}
