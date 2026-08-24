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
