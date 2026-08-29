export const MAX_DIRECT_PHOTO_BYTES = 5 * 1024 * 1024
export const MEDIA_TAGS = ['Cheeto', 'Trail', 'Wildlife', 'Product', 'Behind the Scenes']
export const PHOTO_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'])

export function validAdventure(value = {}) {
  return typeof value.title === 'string' && value.title.trim().length > 0 && value.title.trim().length <= 160 &&
    typeof (value.notes || '') === 'string' && String(value.notes || '').length <= 10000 &&
    typeof (value.privateLocation || '') === 'string' && String(value.privateLocation || '').length <= 500
}

export function validDirectPhoto(file) {
  return Boolean(file && PHOTO_TYPES.has(String(file.type || '').toLowerCase()) && Number(file.size) > 0 && Number(file.size) <= MAX_DIRECT_PHOTO_BYTES)
}

export function validMediaDetails(input) {
  return typeof input?.mediaId === 'string' && /^[0-9a-f-]{36}$/i.test(input.mediaId)
    && Array.isArray(input.tags) && input.tags.length <= MEDIA_TAGS.length
    && input.tags.every(tag => MEDIA_TAGS.includes(tag))
    && typeof input.notes === 'string' && input.notes.length <= 500
}

const destinations = ['trail-hero', 'trail-article', 'pinterest', 'instagram']
const logoColors = ['bark', 'sage', 'sand', 'terracotta']
export function validWorkingVersion(input) {
  return typeof input?.mediaId === 'string' && /^[0-9a-f-]{36}$/i.test(input.mediaId)
    && destinations.includes(input.destination)
    && logoColors.includes(input?.treatment?.logoColor)
    && ['small', 'medium'].includes(input?.treatment?.logoSize)
    && ['left', 'right'].includes(input?.treatment?.logoSide)
    && ['top', 'center', 'bottom'].includes(input?.treatment?.focus)
}
