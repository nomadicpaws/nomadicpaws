import type { Config } from '@netlify/functions'
import { approveTeamMember, appUserFromRequest, claimKatie, createAppSession, findOrCreateAppleUser, hasKatie, pendingTeam, requireAppUser, revokeCurrentSession, verifyAppleIdentity } from './lib/app-auth.mjs'
import { secureEqual } from './lib/event-auth.mjs'

const HEADERS = { 'Cache-Control': 'private, no-store, max-age=0', 'X-Content-Type-Options': 'nosniff' }
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: HEADERS })

export default async (request: Request) => {
  try {
    const url = new URL(request.url)
    if (request.method === 'GET') {
      const user = await requireAppUser(request)
      if (url.searchParams.get('view') === 'team') {
        if (user.role !== 'katie') return json({ error: 'Only Katie can manage team access.' }, 403)
        return json({ user, pending: await pendingTeam() })
      }
      return json({ user })
    }
    if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405)
    const body = await request.json().catch(() => ({})) as Record<string, unknown>
    if (body.action === 'apple') {
      const identity = await verifyAppleIdentity(String(body.identityToken || ''), String(body.nonce || ''))
      const user = await findOrCreateAppleUser(identity, { email: body.email, name: body.name })
      if (user.status === 'active') return json({ token: await createAppSession(user.id), user: { id: user.id, email: user.email || '', name: user.display_name || '', role: user.role, status: user.status } })
      return json({ setupRequired: !(await hasKatie()), pending: await hasKatie(), user: { id: user.id, email: user.email || '', name: user.display_name || '', role: user.role, status: user.status } }, 202)
    }
    if (body.action === 'claim-katie') {
      const identity = await verifyAppleIdentity(String(body.identityToken || ''), String(body.nonce || ''))
      const user = await findOrCreateAppleUser(identity, { email: body.email, name: body.name })
      const configuredCode = process.env.EVENT_REGISTER_ACCESS_CODE || ''
      if (configuredCode.length < 8 || !secureEqual(String(body.accessCode || ''), configuredCode)) return json({ error: 'That one-time setup code is incorrect.' }, 401)
      const claimed = await claimKatie(user.id)
      return json({ token: await createAppSession(claimed.id), user: { id: claimed.id, email: claimed.email || '', name: claimed.display_name || '', role: claimed.role, status: claimed.status } })
    }
    if (body.action === 'approve') {
      await requireAppUser(request, ['katie'])
      return json({ user: await approveTeamMember(String(body.userId || ''), String(body.role || '')) })
    }
    if (body.action === 'signout') {
      await revokeCurrentSession(request)
      return json({ signedOut: true })
    }
    return json({ error: 'Unknown authentication action.' }, 400)
  } catch (error) {
    const status = Number((error as { status?: number })?.status || 500)
    if (status >= 500) console.error('Native authentication failed', error)
    return json({ error: status >= 500 ? 'Nomadic Paws could not complete sign-in right now.' : String((error as Error)?.message || error) }, status)
  }
}

export const config: Config = { path: '/api/app/auth' }

