import { randomUUID } from 'node:crypto'
import { getDatabase } from '@netlify/database'

function db() { return getDatabase() }

export async function adventuresWithMedia() {
  const [adventures, media, workingVersions] = await Promise.all([
    db().pool.query(`SELECT a.*, COUNT(m.id)::int AS media_count FROM adventures a LEFT JOIN media_assets m ON m.adventure_id = a.id AND m.status = 'ready' GROUP BY a.id ORDER BY a.captured_at DESC, a.created_at DESC`),
    db().pool.query(`SELECT m.*, COUNT(u.id)::int AS usage_count
      FROM media_assets m
      LEFT JOIN media_usage u ON u.media_id = m.id
      WHERE m.status = 'ready'
      GROUP BY m.id
      ORDER BY m.created_at DESC`),
    db().pool.query(`SELECT * FROM media_usage ORDER BY created_at DESC`),
  ])
  return { adventures: adventures.rows, media: media.rows, workingVersions: workingVersions.rows }
}

export async function createAdventure(input, userId) {
  const id = randomUUID()
  const result = await db().pool.query(
    `INSERT INTO adventures (id, title, notes, private_location, captured_at, assigned_to, status, platforms, created_by)
     VALUES ($1, $2, $3, $4, COALESCE(NULLIF($5, '')::date, CURRENT_DATE), 'Katie', 'Idea', '["Instagram"]'::jsonb, $6) RETURNING *`,
    [id, input.title.trim(), String(input.notes || '').trim(), String(input.privateLocation || '').trim(), String(input.capturedAt || ''), userId],
  )
  return result.rows[0]
}

export async function addMediaAsset(input, userId) {
  const id = randomUUID()
  const result = await db().pool.query(
    `INSERT INTO media_assets (id, adventure_id, blob_key, original_name, content_type, byte_size, width, height, duration_seconds, kind, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, NULLIF($7, 0), NULLIF($8, 0), NULLIF($9, 0), $10, $11) RETURNING *`,
    [id, input.adventureId, input.blobKey, input.originalName, input.contentType, input.byteSize, input.width || 0, input.height || 0, input.durationSeconds || 0, input.kind || 'photo', userId],
  )
  return result.rows[0]
}

export async function adventureExists(id) {
  const result = await db().pool.query(`SELECT EXISTS (SELECT 1 FROM adventures WHERE id = $1) AS found`, [id])
  return Boolean(result.rows[0]?.found)
}

export async function mediaById(id) {
  const result = await db().pool.query(`SELECT * FROM media_assets WHERE id = $1 AND status = 'ready' LIMIT 1`, [id])
  return result.rows[0] || null
}

export async function updateMediaDetails(id, tags, notes) {
  const result = await db().pool.query(
    `UPDATE media_assets SET tags = $2::jsonb, notes = $3, updated_at = NOW()
     WHERE id = $1 AND status = 'ready' RETURNING *`,
    [id, JSON.stringify(tags), notes.trim()],
  )
  return result.rows[0] || null
}

export async function saveWorkingVersion(mediaId, destination, treatment) {
  const id = randomUUID()
  const result = await db().pool.query(
    `INSERT INTO media_usage (id, media_id, destination_type, destination_id, treatment)
     VALUES ($1, $2, $3, $4, $5::jsonb) RETURNING *`,
    [id, mediaId, destination, `${destination}-${id}`, JSON.stringify(treatment)],
  )
  return result.rows[0]
}

export async function workingVersionById(id) {
  const result = await db().pool.query(
    `SELECT u.*, m.blob_key, m.content_type, m.original_name
     FROM media_usage u JOIN media_assets m ON m.id = u.media_id
     WHERE u.id = $1 AND m.status = 'ready' LIMIT 1`,
    [id],
  )
  return result.rows[0] || null
}
