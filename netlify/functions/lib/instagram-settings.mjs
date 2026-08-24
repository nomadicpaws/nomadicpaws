export const INSTAGRAM_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export function validInstagramRhythm(value) {
  if (!Array.isArray(value) || value.length !== 7) return false
  return value.every((item, index) => item && typeof item === 'object' && item.day === INSTAGRAM_DAYS[index] && typeof item.theme === 'string' && item.theme.trim().length >= 1 && item.theme.length <= 80 && typeof item.enabled === 'boolean')
}
