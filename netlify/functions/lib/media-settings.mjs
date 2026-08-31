export const MAX_DIRECT_PHOTO_BYTES = 5 * 1024 * 1024
export const MAX_ADVENTURE_VIDEO_BYTES = 250 * 1024 * 1024
export const MAX_ADVENTURE_VIDEO_SECONDS = 35
export const VIDEO_CHUNK_BYTES = 2 * 1024 * 1024
export const MEDIA_TAGS = ['Cheeto', 'Trail', 'Wildlife', 'Product', 'Behind the Scenes']
export const PHOTO_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'])
export const VIDEO_TYPES = new Set(['video/mp4', 'video/quicktime', 'video/x-m4v'])

export function validAdventure(value = {}) {
  return typeof value.title === 'string' && value.title.trim().length > 0 && value.title.trim().length <= 160 &&
    typeof (value.notes || '') === 'string' && String(value.notes || '').length <= 10000 &&
    typeof (value.privateLocation || '') === 'string' && String(value.privateLocation || '').length <= 500
}

export function validDirectPhoto(file) {
  return Boolean(file && PHOTO_TYPES.has(String(file.type || '').toLowerCase()) && Number(file.size) > 0 && Number(file.size) <= MAX_DIRECT_PHOTO_BYTES)
}

export function validVideoUpload(value = {}) {
  const durationSeconds = Number(value.durationSeconds)
  return typeof value.adventureId === 'string' && /^[0-9a-f-]{36}$/i.test(value.adventureId)
    && typeof value.originalName === 'string' && value.originalName.trim().length > 0 && value.originalName.length <= 255
    && VIDEO_TYPES.has(String(value.contentType || '').toLowerCase())
    && Number.isInteger(Number(value.byteSize)) && Number(value.byteSize) > 0 && Number(value.byteSize) <= MAX_ADVENTURE_VIDEO_BYTES
    && Number.isFinite(durationSeconds) && durationSeconds > 0 && durationSeconds <= MAX_ADVENTURE_VIDEO_SECONDS
}

export function validMediaDetails(input) {
  return typeof input?.mediaId === 'string' && /^[0-9a-f-]{36}$/i.test(input.mediaId)
    && Array.isArray(input.tags) && input.tags.length <= MEDIA_TAGS.length
    && input.tags.every(tag => MEDIA_TAGS.includes(tag))
    && typeof input.notes === 'string' && input.notes.length <= 500
}

const destinations = ['trail-hero', 'trail-article', 'pinterest', 'instagram']
const logoColors = ['none', 'bark', 'sage', 'sand', 'terracotta']
export function validWorkingVersion(input) {
  return typeof input?.mediaId === 'string' && /^[0-9a-f-]{36}$/i.test(input.mediaId)
    && destinations.includes(input.destination)
    && logoColors.includes(input?.treatment?.logoColor)
    && ['small', 'medium'].includes(input?.treatment?.logoSize)
    && ['left', 'right'].includes(input?.treatment?.logoSide)
    && ['top', 'center', 'bottom'].includes(input?.treatment?.focus)
}
