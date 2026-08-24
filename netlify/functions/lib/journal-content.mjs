import { createHash } from 'node:crypto'

export function parseJournalFile(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/)
  if (!match) return { data: {}, body: raw.trim() }
  const data = {}
  for (const line of match[1].split(/\r?\n/)) {
    const field = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/)
    if (!field) continue
    let value = field[2].trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1)
    data[field[1]] = value
  }
  return { data, body: match[2].trim() }
}

export function journalStatus(data, now = Date.now()) {
  if (data.draft === 'true') return 'Draft'
  const time = Date.parse(data.date || '')
  return !Number.isNaN(time) && time > now ? 'Scheduled' : 'Published'
}

export function journalVersion(raw) {
  return createHash('sha256').update(raw).digest('hex').slice(0, 12)
}
