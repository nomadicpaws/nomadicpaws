import { getDatabase } from '@netlify/database'
import { randomUUID } from 'node:crypto'

export async function getInstagramStudio() {
  const [settings, templates, posts] = await Promise.all([
    getDatabase().pool.query(`SELECT weekly_rhythm, updated_at FROM instagram_studio_settings WHERE profile_name = 'Trinitie'`),
    getDatabase().pool.query(`SELECT id, name, kind, aspect_ratio, source_url, has_transparency, favorite, created_at, updated_at FROM instagram_templates WHERE owner_name = 'Trinitie' ORDER BY favorite DESC, created_at DESC`),
    getDatabase().pool.query(`SELECT id, title, caption, media_urls, target_date, theme, status, assigned_to, handoff_note, created_at, updated_at FROM instagram_post_drafts WHERE owner_name = 'Trinitie' ORDER BY target_date NULLS LAST, updated_at DESC`),
  ])
  return { rhythm: settings.rows[0]?.weekly_rhythm || null, templates: templates.rows, posts: posts.rows }
}

export async function saveInstagramRhythm(rhythm) {
  const result = await getDatabase().pool.query(
    `INSERT INTO instagram_studio_settings (profile_name, weekly_rhythm, updated_at)
     VALUES ('Trinitie', $1::jsonb, NOW())
     ON CONFLICT (profile_name) DO UPDATE SET weekly_rhythm = EXCLUDED.weekly_rhythm, updated_at = NOW()
     RETURNING weekly_rhythm, updated_at`,
    [JSON.stringify(rhythm)],
  )
  return result.rows[0]
}

export async function saveInstagramPost(input) {
  const id = input.id || crypto.randomUUID()
  const result = await getDatabase().pool.query(
    `INSERT INTO instagram_post_drafts (id, owner_name, title, caption, media_urls, target_date, theme, status, assigned_to, handoff_note, created_at, updated_at)
     VALUES ($1, 'Trinitie', $2, $3, $4::jsonb, NULLIF($5::text, '')::date, $6, $7, $8, $9, NOW(), NOW())
     ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, caption = EXCLUDED.caption, media_urls = EXCLUDED.media_urls,
       target_date = EXCLUDED.target_date, theme = EXCLUDED.theme, status = EXCLUDED.status, assigned_to = EXCLUDED.assigned_to,
       handoff_note = EXCLUDED.handoff_note, updated_at = NOW()
     WHERE instagram_post_drafts.owner_name = 'Trinitie'
     RETURNING id, title, caption, media_urls, target_date, theme, status, assigned_to, handoff_note, created_at, updated_at`,
    [id, input.title.trim(), input.caption, JSON.stringify(input.mediaUrls), input.targetDate || '', input.theme.trim(), input.status, input.assignedTo, input.handoffNote],
  )
  return result.rows[0]
}

export async function saveInstagramTemplate(input) {
  const id = randomUUID()
  const result = await getDatabase().pool.query(
    `INSERT INTO instagram_templates (id, owner_name, name, kind, aspect_ratio, source_url, has_transparency, favorite, created_at, updated_at)
     VALUES ($1, 'Trinitie', $2, $3, $4, $5, $6, TRUE, NOW(), NOW())
     RETURNING id, name, kind, aspect_ratio, source_url, has_transparency, favorite, created_at, updated_at`,
    [id, input.name, input.kind, input.aspectRatio, `/api/app/instagram/template/${id}`, input.hasTransparency],
  )
  return { ...result.rows[0], blobKey: `templates/${id}` }
}

export async function instagramTemplateById(id) {
  const result = await getDatabase().pool.query(
    `SELECT id, source_url FROM instagram_templates WHERE id = $1 AND owner_name = 'Trinitie' LIMIT 1`,
    [id],
  )
  return result.rows[0] || null
}
