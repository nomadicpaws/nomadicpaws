import { getDatabase } from '@netlify/database'

export async function getPinterestCampaigns() {
  const result = await getDatabase().pool.query(
    `SELECT campaign, updated_at FROM pinterest_app_campaigns ORDER BY updated_at DESC`,
  )
  return result.rows.map((row) => ({ ...row.campaign, updated_at: row.updated_at }))
}

export async function savePinterestCampaign(campaign, userId) {
  const result = await getDatabase().pool.query(
    `INSERT INTO pinterest_app_campaigns (post_slug, campaign, updated_by, created_at, updated_at)
     VALUES ($1, $2::jsonb, $3, NOW(), NOW())
     ON CONFLICT (post_slug) DO UPDATE SET campaign = EXCLUDED.campaign, updated_by = EXCLUDED.updated_by, updated_at = NOW()
     RETURNING campaign, updated_at`,
    [campaign.post_slug, JSON.stringify(campaign), userId],
  )
  return { ...result.rows[0].campaign, updated_at: result.rows[0].updated_at }
}

