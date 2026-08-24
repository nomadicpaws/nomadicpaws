export const INSTAGRAM_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export function validInstagramRhythm(value) {
  if (!Array.isArray(value) || value.length !== 7) return false
  return value.every((item, index) => item && typeof item === 'object' && item.day === INSTAGRAM_DAYS[index] && typeof item.theme === 'string' && item.theme.trim().length >= 1 && item.theme.length <= 80 && typeof item.enabled === 'boolean')
}

export function validInstagramPost(value) {
  if (!value || typeof value !== 'object') return false
  if (typeof value.title !== 'string' || value.title.trim().length < 1 || value.title.length > 120) return false
  if (typeof value.caption !== 'string' || value.caption.length > 2200) return false
  if (typeof value.theme !== 'string' || value.theme.trim().length < 1 || value.theme.length > 80) return false
  if (!['Draft', 'Ready', 'Posted'].includes(value.status)) return false
  if (value.targetDate !== null && value.targetDate !== '' && (typeof value.targetDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value.targetDate))) return false
  return Array.isArray(value.mediaUrls) && value.mediaUrls.length <= 20 && value.mediaUrls.every(url => typeof url === 'string' && url.length <= 1000)
}
