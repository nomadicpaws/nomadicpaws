import { randomUUID } from 'node:crypto'
import { getDatabase } from '@netlify/database'

export async function listVideoProjects() {
  const result = await getDatabase().pool.query(
    `SELECT id, title, media_id, source_story_slug, platforms, overlays, current_overlay, status,
      assigned_to, last_edited_by, created_at, updated_at
     FROM video_studio_projects ORDER BY updated_at DESC`,
  )
  return result.rows
}

export async function saveVideoProject(input, user) {
  const id = input.id || randomUUID()
  const editor = user.role === 'trinitie' ? 'Trinitie' : 'Katie'
  const result = await getDatabase().pool.query(
    `INSERT INTO video_studio_projects
      (id, title, media_id, source_story_slug, platforms, overlays, current_overlay, status, assigned_to, last_edited_by, created_by, created_at, updated_at)
     VALUES ($1, $2, NULLIF($3::text, '')::uuid, $4, $5::jsonb, $6::jsonb, $7::jsonb, $8, $9, $10, $11, NOW(), NOW())
     ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, media_id = EXCLUDED.media_id,
       source_story_slug = EXCLUDED.source_story_slug, platforms = EXCLUDED.platforms,
       overlays = EXCLUDED.overlays, current_overlay = EXCLUDED.current_overlay, status = EXCLUDED.status,
       assigned_to = EXCLUDED.assigned_to, last_edited_by = EXCLUDED.last_edited_by, updated_at = NOW()
     RETURNING id, title, media_id, source_story_slug, platforms, overlays, current_overlay, status,
       assigned_to, last_edited_by, created_at, updated_at`,
    [id, input.title.trim(), input.mediaId || '', input.sourceStorySlug || '', JSON.stringify(input.platforms),
      JSON.stringify(input.overlays), JSON.stringify(input.currentOverlay), input.status, input.assignedTo, editor, user.id],
  )
  return result.rows[0]
}
