import { randomUUID } from 'node:crypto'
import { getDatabase } from '@netlify/database'

export async function journalReviewNotes(slug) {
  const result = await getDatabase().pool.query(
    `SELECT id, story_slug, story_version, reviewer, note, created_at
       FROM journal_review_notes
      WHERE story_slug = $1
      ORDER BY created_at DESC`,
    [slug],
  )
  return result.rows
}

export async function addJournalReviewNote({ slug, version, reviewer, note }) {
  const id = randomUUID()
  const result = await getDatabase().pool.query(
    `INSERT INTO journal_review_notes (id, story_slug, story_version, reviewer, note)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, story_slug, story_version, reviewer, note, created_at`,
    [id, slug, version, reviewer, note],
  )
  return result.rows[0]
}

export async function journalWorkingDraft(slug) {
  const result = await getDatabase().pool.query(
    `SELECT story_slug, base_version, title, description, category, image, image_alt, body,
            is_draft, publish_date, revision, updated_at
       FROM journal_working_drafts WHERE story_slug = $1`,
    [slug],
  )
  return result.rows[0] || null
}

export async function saveJournalWorkingDraft(input) {
  const client = await getDatabase().pool.connect()
  try {
    await client.query('BEGIN')
    const current = await client.query(`SELECT revision FROM journal_working_drafts WHERE story_slug = $1 FOR UPDATE`, [input.slug])
    const currentRevision = current.rows[0]?.revision || 0
    if (currentRevision !== input.expectedRevision) {
      const error = new Error('This draft changed in another session. Refresh before continuing.')
      error.status = 409
      error.currentRevision = currentRevision
      throw error
    }
    const nextRevision = currentRevision + 1
    const saved = await client.query(
      `INSERT INTO journal_working_drafts
        (story_slug, base_version, title, description, category, image, image_alt, body, is_draft, publish_date, revision, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW())
       ON CONFLICT (story_slug) DO UPDATE SET
         title=EXCLUDED.title, description=EXCLUDED.description, category=EXCLUDED.category,
         image=EXCLUDED.image, image_alt=EXCLUDED.image_alt, body=EXCLUDED.body,
         is_draft=EXCLUDED.is_draft, publish_date=EXCLUDED.publish_date,
         revision=EXCLUDED.revision, updated_at=NOW()
       RETURNING story_slug, base_version, title, description, category, image, image_alt, body,
                 is_draft, publish_date, revision, updated_at`,
      [input.slug,input.baseVersion,input.title,input.description,input.category,input.image,input.imageAlt,input.body,input.isDraft,input.publishDate || null,nextRevision],
    )
    await client.query(
      `INSERT INTO journal_working_versions (id, story_slug, revision, snapshot)
       VALUES ($1,$2,$3,$4::jsonb)`,
      [randomUUID(), input.slug, nextRevision, JSON.stringify(saved.rows[0])],
    )
    await client.query('COMMIT')
    return saved.rows[0]
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export async function journalWorkingVersions(slug) {
  const result = await getDatabase().pool.query(
    `SELECT id, revision, snapshot, created_at FROM journal_working_versions
      WHERE story_slug = $1 ORDER BY revision DESC LIMIT 30`,
    [slug],
  )
  return result.rows
}
