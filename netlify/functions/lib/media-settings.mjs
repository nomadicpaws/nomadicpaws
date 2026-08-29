export const MAX_DIRECT_PHOTO_BYTES = 5 * 1024 * 1024
export const PHOTO_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'])

export function validAdventure(value = {}) {
  return typeof value.title === 'string' && value.title.trim().length > 0 && value.title.trim().length <= 160 &&
    typeof (value.notes || '') === 'string' && String(value.notes || '').length <= 10000 &&
    typeof (value.privateLocation || '') === 'string' && String(value.privateLocation || '').length <= 500
}

export function validDirectPhoto(file) {
  return Boolean(file && PHOTO_TYPES.has(String(file.type || '').toLowerCase()) && Number(file.size) > 0 && Number(file.size) <= MAX_DIRECT_PHOTO_BYTES)
}
