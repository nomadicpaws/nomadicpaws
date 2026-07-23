import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { Config } from '@netlify/functions'

// Blog posts are authored in Decap CMS, which commits one Markdown file per
// post into the repo's `_posts/` folder. That folder is bundled with this
// function via `included_files` in netlify.toml, so we can read it at runtime.
const POSTS_DIR = join(process.cwd(), '_posts')

type Frontmatter = Record<string, string>

function parseFrontmatter(raw: string): { data: Frontmatter; body: string } {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/)
  if (!match) return { data: {}, body: raw.trim() }

  const [, block, body] = match
  const data: Frontmatter = {}
  for (const line of block.split(/\r?\n/)) {
    const field = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/)
    if (!field) continue
    let value = field[2].trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    data[field[1]] = value
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

export default async () => {
  let files: string[] = []
  try {
    files = (await readdir(POSTS_DIR)).filter((f) => f.endsWith('.md'))
  } catch {
    // No posts have been published yet — return an empty list, not an error.
    return Response.json([])
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
        excerpt: excerpt(body),
        readTime: readTime(body),
        body,
      }
    }),
  )

  // Newest first.
  posts.sort((a, b) => (a.date < b.date ? 1 : -1))

  return Response.json(posts)
}

export const config: Config = {
  path: '/api/posts',
}
