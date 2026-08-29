import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { getDatabase } from '@netlify/database'
import { createRemoteJWKSet, jwtVerify } from 'jose'
import { bearerToken, secureEqual } from './event-auth.mjs'

const APPLE_KEYS = createRemoteJWKSet(new URL('https://appleid.apple.com/auth/keys'))
const APPLE_ISSUER = 'https://appleid.apple.com'
const APPLE_AUDIENCE = 'co.nomadicpaws.admin'
const SESSION_DAYS = 30

function db() { return getDatabase() }
function tokenHash(token) { return createHash('sha256').update(token).digest('hex') }
function publicUser(row) {
  return { id: row.id, email: row.email || '', name: row.display_name || '', role: row.role, status: row.status }
}

export async function verifyAppleIdentity(identityToken, expectedNonce) {
  if (!identityToken || !expectedNonce) throw Object.assign(new Error('Apple sign-in information is incomplete.'), { status: 400 })
  const { payload } = await jwtVerify(identityToken, APPLE_KEYS, { issuer: APPLE_ISSUER, audience: APPLE_AUDIENCE })
  if (!payload.sub || !payload.nonce || !secureEqual(payload.nonce, expectedNonce)) throw Object.assign(new Error('Apple could not verify this sign-in.'), { status: 401 })
  return { subject: payload.sub, email: typeof payload.email === 'string' ? payload.email : '' }
}

export async function findOrCreateAppleUser(identity, profile = {}) {
  const id = randomUUID()
  const result = await db().pool.query(
    `INSERT INTO app_users (id, apple_subject, email, display_name)
     VALUES ($1, $2, NULLIF($3, ''), NULLIF($4, ''))
     ON CONFLICT (apple_subject) DO UPDATE SET
       email = COALESCE(app_users.email, NULLIF(EXCLUDED.email, '')),
       display_name = COALESCE(app_users.display_name, NULLIF(EXCLUDED.display_name, '')),
       updated_at = NOW()
     RETURNING *`,
    [id, identity.subject, identity.email || String(profile.email || '').trim().toLowerCase(), String(profile.name || '').trim()],
  )
  return result.rows[0]
}

export async function hasKatie() {
  const result = await db().pool.query(`SELECT 1 FROM app_users WHERE role = 'katie' AND status = 'active' LIMIT 1`)
  return Boolean(result.rowCount)
}

export async function claimKatie(userId) {
  const client = await db().pool.connect()
  try {
    await client.query('BEGIN')
    await client.query(`SELECT pg_advisory_xact_lock(hashtext('nomadic-paws-katie-owner'))`)
    const existing = await client.query(`SELECT 1 FROM app_users WHERE role = 'katie' AND status = 'active' LIMIT 1`)
    if (existing.rowCount) throw Object.assign(new Error('Katie’s account is already configured.'), { status: 409 })
    const result = await client.query(`UPDATE app_users SET role = 'katie', status = 'active', updated_at = NOW() WHERE id = $1 RETURNING *`, [userId])
    await client.query('COMMIT')
    return result.rows[0]
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally { client.release() }
}

export async function createAppSession(userId) {
  const token = randomBytes(32).toString('base64url')
  await db().pool.query(
    `INSERT INTO app_sessions (id, user_id, token_hash, expires_at)
     VALUES ($1, $2, $3, NOW() + ($4 || ' days')::interval)`,
    [randomUUID(), userId, tokenHash(token), String(SESSION_DAYS)],
  )
  return token
}

export async function appUserFromRequest(request) {
  const token = bearerToken(request.headers)
  if (!token) return null
  const result = await db().pool.query(
    `SELECT u.* FROM app_sessions s JOIN app_users u ON u.id = s.user_id
     WHERE s.token_hash = $1 AND s.expires_at > NOW() AND u.status = 'active' LIMIT 1`,
    [tokenHash(token)],
  )
  if (!result.rowCount) return null
  await db().pool.query(`UPDATE app_sessions SET last_seen_at = NOW(), expires_at = GREATEST(expires_at, NOW() + INTERVAL '30 days') WHERE token_hash = $1`, [tokenHash(token)]).catch(() => {})
  return publicUser(result.rows[0])
}

export async function requireAppUser(request, roles = []) {
  const user = await appUserFromRequest(request)
  if (!user) throw Object.assign(new Error('Your private session expired.'), { status: 401 })
  if (roles.length && !roles.includes(user.role)) throw Object.assign(new Error('This workspace is not part of your account.'), { status: 403 })
  return user
}

export async function pendingTeam() {
  const result = await db().pool.query(`SELECT * FROM app_users WHERE status = 'pending' ORDER BY created_at ASC`)
  return result.rows.map(publicUser)
}

export async function approveTeamMember(id, role) {
  if (!['trinitie', 'mom'].includes(role)) throw Object.assign(new Error('Choose Trinitie or CatNana access.'), { status: 400 })
  const result = await db().pool.query(`UPDATE app_users SET role = $2, status = 'active', updated_at = NOW() WHERE id = $1 AND status = 'pending' RETURNING *`, [id, role])
  if (!result.rowCount) throw Object.assign(new Error('That account is no longer waiting for approval.'), { status: 404 })
  return publicUser(result.rows[0])
}

export async function revokeCurrentSession(request) {
  const token = bearerToken(request.headers)
  if (token) await db().pool.query(`DELETE FROM app_sessions WHERE token_hash = $1`, [tokenHash(token)])
}
