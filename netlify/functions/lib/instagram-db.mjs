import { getDatabase } from '@netlify/database'

export async function getInstagramStudio() {
  const [settings, templates] = await Promise.all([
    getDatabase().pool.query(`SELECT weekly_rhythm, updated_at FROM instagram_studio_settings WHERE profile_name = 'Trinitie'`),
    getDatabase().pool.query(`SELECT id, name, kind, aspect_ratio, source_url, has_transparency, favorite, created_at, updated_at FROM instagram_templates WHERE owner_name = 'Trinitie' ORDER BY favorite DESC, created_at DESC`),
  ])
  return { rhythm: settings.rows[0]?.weekly_rhythm || null, templates: templates.rows }
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
