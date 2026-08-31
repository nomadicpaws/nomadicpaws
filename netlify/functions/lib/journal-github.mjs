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

export async function commitJournalDraft(draft, targetSlug = draft.story_slug) {
  const token = process.env.GITHUB_CONTENT_TOKEN || ''
  if (!token) {
    const error = new Error('The private GitHub publishing key still needs to be connected in Netlify.')
    error.status = 503
    throw error
  }
  const repository = process.env.GITHUB_CONTENT_REPOSITORY || 'nomadicpaws/nomadicpaws'
  const branch = process.env.GITHUB_CONTENT_BRANCH || 'main'
  const oldFilePath = `_posts/${draft.story_slug}.md`
  const filePath = `_posts/${targetSlug}.md`
  const encodedPath = filePath.split('/').map(encodeURIComponent).join('/')
  const oldEncodedPath = oldFilePath.split('/').map(encodeURIComponent).join('/')
  let existing = null
  let oldExisting = null
  if (oldFilePath !== filePath) {
    try {
      oldExisting = await github(`/repos/${repository}/contents/${oldEncodedPath}?ref=${encodeURIComponent(branch)}`, token)
    } catch (error) {
      if (error?.status !== 404) throw error
    }
    try {
      existing = await github(`/repos/${repository}/contents/${encodedPath}?ref=${encodeURIComponent(branch)}`, token)
      const collision = new Error('Another Journal file already uses that title and date.')
      collision.status = 409
      throw collision
    } catch (error) {
      if (error?.status !== 404) throw error
    }
  } else {
    try {
      existing = await github(`/repos/${repository}/contents/${encodedPath}?ref=${encodeURIComponent(branch)}`, token)
    } catch (error) {
      if (error?.status !== 404) throw error
    }
  }
  const sourceFile = oldExisting || existing
  const source = sourceFile
    ? Buffer.from(sourceFile.content, 'base64').toString('utf8')
    : '---\nlayout: post\n---\n\n'
  const content = buildMarkdown(source, draft)
  const payload = {
    message: `${draft.is_draft ? 'Update' : 'Publish'} Trail Journal: ${draft.title}`,
    content: Buffer.from(content, 'utf8').toString('base64'),
    branch,
    ...(existing?.sha ? { sha: existing.sha } : {}),
  }
  const saved = await github(`/repos/${repository}/contents/${encodedPath}`, token, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
  if (oldExisting && oldFilePath !== filePath) {
    try {
      await github(`/repos/${repository}/contents/${oldEncodedPath}`, token, {
        method: 'DELETE',
        body: JSON.stringify({ message: `Rename Trail Journal: ${draft.title}`, sha: oldExisting.sha, branch }),
      })
    } catch (error) {
      if (saved.content?.sha) {
        await github(`/repos/${repository}/contents/${encodedPath}`, token, {
          method: 'DELETE',
          body: JSON.stringify({ message: `Undo incomplete Journal rename: ${draft.title}`, sha: saved.content.sha, branch }),
        }).catch(() => {})
      }
      throw error
    }
  }
  return { commitSha: saved.commit?.sha || '', filePath, branch }
}

export { buildMarkdown }
