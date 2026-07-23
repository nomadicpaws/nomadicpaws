import { readdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const SITE_URL = 'https://nomadicpaws.co'
const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const postsDirectory = join(root, '_posts')

const staticPages = [
  { path: '/', changefreq: 'weekly', priority: '1.0' },
  { path: '/trail-journal', changefreq: 'weekly', priority: '0.8' },
  { path: '/checklist/', changefreq: 'monthly', priority: '0.8' },
  { path: '/cheetos-store/', changefreq: 'weekly', priority: '0.8' },
]

function parseDate(markdown, filename) {
  const frontmatterDate = markdown.match(/^date:\s*["']?(\d{4}-\d{2}-\d{2})/m)?.[1]
  return frontmatterDate || filename.match(/^(\d{4}-\d{2}-\d{2})/)?.[1] || ''
}

function escapeXml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function urlEntry({ path, changefreq, priority, lastmod = '' }) {
  const lastmodLine = lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ''
  return `  <url>
    <loc>${escapeXml(`${SITE_URL}${path}`)}</loc>${lastmodLine}
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`
}

let postFiles = []
try {
  postFiles = (await readdir(postsDirectory))
    .filter((filename) => filename.endsWith('.md'))
    .sort()
} catch (error) {
  if (error.code !== 'ENOENT') throw error
}

const postPages = await Promise.all(
  postFiles.map(async (filename) => {
    const markdown = await readFile(join(postsDirectory, filename), 'utf8')
    return {
      path: `/trail-journal/${filename.replace(/\.md$/, '')}`,
      changefreq: 'monthly',
      priority: '0.6',
      lastmod: parseDate(markdown, filename),
    }
  }),
)

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[...staticPages, ...postPages].map(urlEntry).join('\n')}
</urlset>
`

await writeFile(join(root, 'sitemap.xml'), sitemap, 'utf8')
console.log(`Generated sitemap.xml with ${postPages.length} Trail Journal posts.`)
