import { getDatabase } from '@netlify/database'
import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto'

function hashCode(code, salt) {
  return scryptSync(String(code), salt, 32).toString('hex')
}

function safeHashEqual(left, right) {
  const a = Buffer.from(String(left || ''), 'hex')
  const b = Buffer.from(String(right || ''), 'hex')
  return a.length === b.length && timingSafeEqual(a, b)
}

export function generateStaffCode() {
  return randomBytes(6).toString('base64url').replace(/[-_]/g, '7').slice(0, 8).toUpperCase()
}

function codeEncryptionKey() {
  const secret = process.env.EVENT_STAFF_CODE_ENCRYPTION_KEY || process.env.EVENT_REGISTER_SESSION_SECRET || ''
  if (secret.length < 16) throw new Error('Staff code storage is not configured.')
  return createHash('sha256').update(secret).digest()
}

function protectCode(code) {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', codeEncryptionKey(), iv)
  const encrypted = Buffer.concat([cipher.update(code, 'utf8'), cipher.final()])
  return `${iv.toString('base64url')}.${cipher.getAuthTag().toString('base64url')}.${encrypted.toString('base64url')}`
}

function revealCode(value) {
  const [iv, tag, encrypted] = String(value || '').split('.')
  if (!iv || !tag || !encrypted) return null
  const decipher = createDecipheriv('aes-256-gcm', codeEncryptionKey(), Buffer.from(iv, 'base64url'))
  decipher.setAuthTag(Buffer.from(tag, 'base64url'))
  return Buffer.concat([decipher.update(Buffer.from(encrypted, 'base64url')), decipher.final()]).toString('utf8')
}

export async function authenticateEventStaff(accessCode) {
  const result = await getDatabase().pool.query(
    `SELECT id, display_name, role, code_salt, code_hash FROM event_staff WHERE active = TRUE ORDER BY created_at`,
  )
  for (const row of result.rows) {
    if (!safeHashEqual(hashCode(accessCode, row.code_salt), row.code_hash)) continue
    await getDatabase().pool.query(`UPDATE event_staff SET last_signed_in_at = NOW() WHERE id = $1`, [row.id])
    return { id: row.id, name: row.display_name, permission: row.role }
  }
  return null
}

export async function listEventStaff() {
  const result = await getDatabase().pool.query(
    `SELECT id, display_name, role, active, created_at, updated_at, last_signed_in_at,
            (code_encrypted IS NOT NULL) AS has_saved_code
     FROM event_staff ORDER BY active DESC, display_name`,
  )
  return result.rows
}

export async function createEventStaff({ name, role }) {
  const code = generateStaffCode()
  const salt = randomBytes(16).toString('hex')
  const result = await getDatabase().pool.query(
    `INSERT INTO event_staff (id, display_name, role, code_salt, code_hash, code_encrypted)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, display_name, role, active, created_at, updated_at, last_signed_in_at, TRUE AS has_saved_code`,
    [randomUUID(), name.trim(), role, salt, hashCode(code, salt), protectCode(code)],
  )
  return { staff: result.rows[0], accessCode: code }
}

export async function setEventStaffActive(id, active) {
  const result = await getDatabase().pool.query(
    `UPDATE event_staff SET active = $2, updated_at = NOW() WHERE id = $1
     RETURNING id, display_name, role, active, created_at, updated_at, last_signed_in_at`,
    [id, active],
  )
  if (!result.rowCount) throw Object.assign(new Error('That helper no longer exists.'), { status: 404 })
  return result.rows[0]
}

export async function rotateEventStaffCode(id) {
  const code = generateStaffCode()
  const salt = randomBytes(16).toString('hex')
  const result = await getDatabase().pool.query(
    `UPDATE event_staff SET code_salt = $2, code_hash = $3, code_encrypted = $4, active = TRUE, updated_at = NOW()
     WHERE id = $1
     RETURNING id, display_name, role, active, created_at, updated_at, last_signed_in_at, TRUE AS has_saved_code`,
    [id, salt, hashCode(code, salt), protectCode(code)],
  )
  if (!result.rowCount) throw Object.assign(new Error('That helper no longer exists.'), { status: 404 })
  return { staff: result.rows[0], accessCode: code }
}

export async function getEventStaffCode(id) {
  const result = await getDatabase().pool.query(
    `SELECT display_name, code_encrypted FROM event_staff WHERE id = $1`,
    [id],
  )
  if (!result.rowCount) throw Object.assign(new Error('That helper no longer exists.'), { status: 404 })
  if (!result.rows[0].code_encrypted) {
    throw Object.assign(new Error('This older code was stored as a fingerprint only. Reset it once to make it viewable here from now on.'), { status: 409 })
  }
  return { displayName: result.rows[0].display_name, accessCode: revealCode(result.rows[0].code_encrypted) }
}
