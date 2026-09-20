import { getDatabase } from '@netlify/database'
import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto'

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
    `SELECT id, display_name, role, active, created_at, updated_at, last_signed_in_at
     FROM event_staff ORDER BY active DESC, display_name`,
  )
  return result.rows
}

export async function createEventStaff({ name, role }) {
  const code = generateStaffCode()
  const salt = randomBytes(16).toString('hex')
  const result = await getDatabase().pool.query(
    `INSERT INTO event_staff (id, display_name, role, code_salt, code_hash)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, display_name, role, active, created_at, updated_at, last_signed_in_at`,
    [randomUUID(), name.trim(), role, salt, hashCode(code, salt)],
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
