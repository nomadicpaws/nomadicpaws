import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'

const SITE_URL = 'https://nomadicpaws.co'
const POSTS_DIR = join(process.cwd(), '_posts')

type Frontmatter = Record<string, string>

function parseFrontmatter(raw: string): Frontmatter {
  const block = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] || ''
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

  return data
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function urlEntry(
  path: string,
  changefreq: string,
  priority: string,
  lastmod = '',
): string {
  const lastmodLine = lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ''
  return `  <url>
    <loc>${escapeXml(`${SITE_URL}${path}`)}</loc>${lastmodLine}
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`
}

export default async () => {
  const entries = [
    urlEntry('/', 'weekly', '1.0'),
    urlEntry('/trail-journal', 'weekly', '0.8'),
    urlEntry('/checklist/', 'monthly', '0.8'),
    urlEntry('/cheetos-store/', 'weekly', '0.8'),
  ]

  let files: string[] = []
  try {
    files = (await readdir(POSTS_DIR)).filter((file) => file.endsWith('.md')).sort()
  } catch {
    files = []
  }

  const now = Date.now()
  for (const file of files) {
    const raw = await readFile(join(POSTS_DIR, file), 'utf8')
    const data = parseFrontmatter(raw)
    if (data.draft === 'true') continue

    const publishTime = data.date ? Date.parse(data.date) : Number.NaN
    if (!Number.isNaN(publishTime) && publishTime > now) continue

    const slug = file.replace(/\.md$/, '')
    const lastmod =
      data.date?.match(/^\d{4}-\d{2}-\d{2}/)?.[0] ||
      file.match(/^\d{4}-\d{2}-\d{2}/)?.[0] ||
      ''
    entries.push(
      urlEntry(`/trail-journal/${slug}`, 'monthly', '0.6', lastmod),
    )
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join('\n')}
</urlset>
`

  return new Response(xml, {
    headers: {
      'content-type': 'application/xml; charset=utf-8',
      'cache-control': 'public, max-age=300',
    },
  })
}
