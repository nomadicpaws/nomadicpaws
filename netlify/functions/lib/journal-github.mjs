const API = 'https://api.github.com'

function replaceField(frontmatter, key, value) {
  const line = `${key}: ${JSON.stringify(value)}`
  const pattern = new RegExp(`^${key}:.*$`, 'm')
  return pattern.test(frontmatter) ? frontmatter.replace(pattern, line) : `${frontmatter.trimEnd()}\n${line}\n`
}

function buildMarkdown(source, draft) {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/)
  let frontmatter = match?.[1] || ''
  frontmatter = replaceField(frontmatter, 'title', draft.title)
  frontmatter = replaceField(frontmatter, 'description', draft.description)
  frontmatter = replaceField(frontmatter, 'category', draft.category)
  frontmatter = replaceField(frontmatter, 'image', draft.image)
  frontmatter = replaceField(frontmatter, 'image_alt', draft.image_alt)
  frontmatter = replaceField(frontmatter, 'date', draft.publish_date)
  frontmatter = replaceField(frontmatter, 'draft', Boolean(draft.is_draft))
  return `---\n${frontmatter.trim()}\n---\n\n${draft.body.trim()}\n`
}

async function github(path, token, init = {}) {
  const response = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'Nomadic-Paws-Studio',
      ...(init.headers || {}),
    },
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(data.message || 'GitHub did not accept this Journal update.')
    error.status = response.status
    throw error
  }
  return data
}

export async function commitJournalDraft(draft) {
  const token = process.env.GITHUB_CONTENT_TOKEN || ''
  if (!token) {
    const error = new Error('The private GitHub publishing key still needs to be connected in Netlify.')
    error.status = 503
    throw error
  }
  const repository = process.env.GITHUB_CONTENT_REPOSITORY || 'nomadicpaws/nomadicpaws'
  const branch = process.env.GITHUB_CONTENT_BRANCH || 'main'
  const filePath = `_posts/${draft.story_slug}.md`
  const encodedPath = filePath.split('/').map(encodeURIComponent).join('/')
  const existing = await github(`/repos/${repository}/contents/${encodedPath}?ref=${encodeURIComponent(branch)}`, token)
  const source = Buffer.from(existing.content, 'base64').toString('utf8')
  const content = buildMarkdown(source, draft)
  const saved = await github(`/repos/${repository}/contents/${encodedPath}`, token, {
    method: 'PUT',
    body: JSON.stringify({
      message: `${draft.is_draft ? 'Update' : 'Publish'} Trail Journal: ${draft.title}`,
      content: Buffer.from(content, 'utf8').toString('base64'),
      sha: existing.sha,
      branch,
    }),
  })
  return { commitSha: saved.commit?.sha || '', filePath, branch }
}

export { buildMarkdown }
