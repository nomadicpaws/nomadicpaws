import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { Config } from '@netlify/functions'
import { brandedMediaUrl } from './lib/pinterest-content.mjs'

// Blog posts are authored in Decap CMS, which commits one Markdown file per
// post into the repo's `_posts/` folder. That folder is bundled with this
// function via `included_files` in netlify.toml, so we can read it at runtime.
const POSTS_DIR = join(process.cwd(), '_posts')
const PINTEREST_DIR = join(process.cwd(), '_pinterest')

type Frontmatter = Record<string, string>

function parseFrontmatter(raw: string): { data: Frontmatter; body: string } {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/)
  if (!match) return { data: {}, body: raw.trim() }

  const [, block, body] = match
  const data: Frontmatter = {}
  let currentField = ''
  for (const line of block.split(/\r?\n/)) {
    const field = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/)
    if (!field) {
      if (currentField && /^\s+/.test(line) && line.trim()) {
        data[currentField] = `${data[currentField]} ${line.trim()}`.trim()
      }
      continue
    }
    let value = field[2].trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    data[field[1]] = value
    currentField = field[1]
  }
  return { data, body: body.trim() }
}

// Strip Markdown down to plain text for a short card preview.
function excerpt(markdown: string, words = 32): string {
  const text = markdown
    .replace(/^#.*$/gm, '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[*_`>#]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  const parts = text.split(' ').filter(Boolean)
  return parts.length > words ? parts.slice(0, words).join(' ') + '…' : text
}

function readTime(markdown: string): number {
  const count = markdown.split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.round(count / 200))
}

export default async (request: Request) => {
  const requestUrl = new URL(request.url)
  const summariesOnly = requestUrl.searchParams.get('summary') === '1'
  const requestedLimit = Number.parseInt(requestUrl.searchParams.get('limit') || '', 10)
  const requestedOffset = Number.parseInt(requestUrl.searchParams.get('offset') || '0', 10)
  const limit = Number.isFinite(requestedLimit) && requestedLimit > 0
    ? Math.min(requestedLimit, 24)
    : undefined
  const offset = Number.isFinite(requestedOffset) && requestedOffset > 0 ? requestedOffset : 0
  let files: string[] = []
  try {
    files = (await readdir(POSTS_DIR)).filter((f) => f.endsWith('.md'))
  } catch {
    // No posts have been published yet — return an empty list, not an error.
    return Response.json([])
  }

  const pinterestByPost = new Map<string, Array<{ image: string; alt: string }>>()
  if (!summariesOnly) {
    const pinterestFiles = await readdir(PINTEREST_DIR).catch(() => [])
    await Promise.all(pinterestFiles.filter((file) => file.endsWith('.json')).map(async (file) => {
      try {
        const campaign = JSON.parse(await readFile(join(PINTEREST_DIR, file), 'utf8'))
        if (!campaign.post_slug || campaign.enabled === false) return
        const pins = [campaign.rss_pin, campaign.day_7_pin, campaign.day_14_pin, campaign.day_21_pin]
          .filter((pin) => pin?.image)
          .map((pin) => ({ image: brandedMediaUrl(pin), alt: pin.title || campaign.campaign_title || 'Nomadic Paws photo' }))
        if (pins.length) pinterestByPost.set(campaign.post_slug, pins)
      } catch {
        // A partially saved campaign should not prevent articles from loading.
      }
    }))
  }

  const posts = await Promise.all(
    files.map(async (file) => {
      const raw = await readFile(join(POSTS_DIR, file), 'utf8')
      const { data, body } = parseFrontmatter(raw)
      return {
        slug: file.replace(/\.md$/, ''),
        title: data.title || 'Untitled',
        category: data.category || '',
        description: data.description || excerpt(body),
        date: data.date || '',
        image: data.image || data.thumbnail || '',
        thumbnail: data.thumbnail || data.image || '',
        imageAspect: data.image_aspect || '16/9',
        imageAlt: data.image_alt || data.title || 'Trail Journal cover image',
        draft: data.draft === 'true',
        excerpt: excerpt(body),
        readTime: readTime(body),
        ...(!summariesOnly && { pinterestImages: pinterestByPost.get(file.replace(/\.md$/, '')) || [] }),
        ...(!summariesOnly && { body }),
      }
    }),
  )

  const now = Date.now()
  const publishedPosts = posts.filter((post) => {
    if (post.draft) return false
    if (!post.date) return true
    const publishTime = Date.parse(post.date)
    return Number.isNaN(publishTime) || publishTime <= now
  })

  // Newest first.
  publishedPosts.sort((a, b) => (a.date < b.date ? 1 : -1))

  const selectedPosts = limit
    ? publishedPosts.slice(offset, offset + limit)
    : publishedPosts.slice(offset)

  return Response.json(selectedPosts)
}

export const config: Config = {
  path: '/api/posts',
}
