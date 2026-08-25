import { randomUUID } from 'node:crypto'
import { getDatabase } from '@netlify/database'

export async function journalReviewNotes(slug) {
  const result = await getDatabase().pool.query(
    `SELECT id, story_slug, story_version, reviewer, note, anchor_type, anchor_id,
            quoted_text, status, revised_text, resolved_at, created_at
       FROM journal_review_notes
      WHERE story_slug = $1
      ORDER BY created_at DESC`,
    [slug],
  )
  return result.rows
}

export async function addJournalReviewNote({ slug, version, reviewer, note, anchorType = 'general', anchorId = '', quotedText = '' }) {
  const id = randomUUID()
  const result = await getDatabase().pool.query(
    `INSERT INTO journal_review_notes (id, story_slug, story_version, reviewer, note, anchor_type, anchor_id, quoted_text)
     VALUES ($1, $2, $3, $4, $5, $6, NULLIF($7, ''), NULLIF($8, ''))
     RETURNING id, story_slug, story_version, reviewer, note, anchor_type, anchor_id,
               quoted_text, status, revised_text, resolved_at, created_at`,
    [id, slug, version, reviewer, note, anchorType, anchorId, quotedText],
  )
  return result.rows[0]
}

export async function updateJournalReviewNote({ id, status, revisedText = '' }) {
  const result = await getDatabase().pool.query(
    `UPDATE journal_review_notes SET status = $2, revised_text = NULLIF($3, ''),
       resolved_at = CASE WHEN $2 = 'resolved' THEN NOW() ELSE NULL END
     WHERE id = $1
     RETURNING id, story_slug, story_version, reviewer, note, anchor_type, anchor_id,
               quoted_text, status, revised_text, resolved_at, created_at`,
    [id, status, revisedText],
  )
  return result.rows[0] || null
}

export async function journalContributions() {
  const result = await getDatabase().pool.query(
    `SELECT id, contributor, title, body, memory_clue, status, needs_adventure_match,
            needs_photo_selection, created_at, updated_at, submitted_at
       FROM journal_contributions ORDER BY updated_at DESC`,
  )
  return result.rows
}

export async function saveJournalContribution({ id, title, body, memoryClue, status }) {
  const contributionId = id || randomUUID()
  const result = await getDatabase().pool.query(
    `INSERT INTO journal_contributions (id, contributor, title, body, memory_clue, status, submitted_at)
     VALUES ($1, 'Mom', $2, $3, $4, $5, CASE WHEN $5 = 'submitted' THEN NOW() ELSE NULL END)
     ON CONFLICT (id) DO UPDATE SET title=EXCLUDED.title, body=EXCLUDED.body,
       memory_clue=EXCLUDED.memory_clue, status=EXCLUDED.status, updated_at=NOW(),
       submitted_at=CASE WHEN EXCLUDED.status='submitted' THEN COALESCE(journal_contributions.submitted_at,NOW()) ELSE NULL END
     WHERE journal_contributions.contributor='Mom'
     RETURNING id, contributor, title, body, memory_clue, status, needs_adventure_match,
               needs_photo_selection, created_at, updated_at, submitted_at`,
    [contributionId, title, body, memoryClue, status],
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
