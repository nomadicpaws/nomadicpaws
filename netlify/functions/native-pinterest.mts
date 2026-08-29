import type { Config } from '@netlify/functions'
import { requireAppUser } from './lib/app-auth.mjs'
import { getPinterestCampaigns, savePinterestCampaign } from './lib/pinterest-db.mjs'
import { validPinterestCampaign } from './lib/pinterest-settings.mjs'

const HEADERS = { 'Cache-Control': 'private, no-store, max-age=0', 'X-Content-Type-Options': 'nosniff' }

export default async (request: Request) => {
  try {
    const user = await requireAppUser(request, ['katie'])
    if (request.method === 'GET') return Response.json({ campaigns: await getPinterestCampaigns() }, { headers: HEADERS })
    if (request.method === 'POST') {
      const campaign = await request.json().catch(() => ({}))
      if (!validPinterestCampaign(campaign)) return Response.json({ error: 'Finish all four Pin titles, images, and campaign details before saving.' }, { status: 400, headers: HEADERS })
      return Response.json({ campaign: await savePinterestCampaign(campaign, user.id) }, { headers: HEADERS })
    }
    return Response.json({ error: 'Method not allowed.' }, { status: 405, headers: { ...HEADERS, Allow: 'GET, POST' } })
  } catch (error: any) {
    console.error('Pinterest workspace failed', error)
    return Response.json({ error: error?.message || 'Pinterest workspace could not synchronize.' }, { status: Number(error?.status) || 500, headers: HEADERS })
  }
}

export const config: Config = { path: '/api/app/pinterest' }
