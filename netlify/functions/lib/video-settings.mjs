const statuses = ['Draft', 'Ready', 'Handed Off', 'Posted']
const people = ['Katie', 'Trinitie']
const platforms = ['Instagram Reels', 'TikTok', 'YouTube Shorts']
const animations = ['Typewriter', 'Word by word', 'Flicker', 'Fade', 'Pop']

function validOverlay(item = {}) {
  return typeof item.id === 'string' && item.id.length <= 100
    && typeof item.presetId === 'string' && item.presetId.length <= 100
    && typeof item.name === 'string' && item.name.length <= 100
    && typeof item.fontId === 'string' && item.fontId.length <= 100
    && typeof item.fontName === 'string' && item.fontName.length <= 100
    && typeof item.fontFamily === 'string' && item.fontFamily.length <= 100
    && typeof item.text === 'string' && item.text.length <= 500
    && /^#[0-9a-f]{6}$/i.test(String(item.textColor || ''))
    && /^#[0-9a-f]{6}$/i.test(String(item.accentColor || ''))
    && Number.isFinite(Number(item.startAt)) && Number(item.startAt) >= 0 && Number(item.startAt) <= 300
    && Number.isFinite(Number(item.endAt)) && Number(item.endAt) > Number(item.startAt) && Number(item.endAt) <= 300
    && animations.includes(item.animation)
    && typeof item.boxed === 'boolean'
    && typeof item.uppercase === 'boolean'
}

export function validVideoProject(input = {}) {
  return (!input.id || (typeof input.id === 'string' && /^[0-9a-f-]{36}$/i.test(input.id)))
    && typeof input.title === 'string' && input.title.trim().length > 0 && input.title.trim().length <= 160
    && (!input.mediaId || (typeof input.mediaId === 'string' && /^[0-9a-f-]{36}$/i.test(input.mediaId)))
    && typeof (input.sourceStorySlug || '') === 'string' && String(input.sourceStorySlug || '').length <= 180
    && Array.isArray(input.platforms) && input.platforms.length <= platforms.length && input.platforms.every(item => platforms.includes(item))
    && Array.isArray(input.overlays) && input.overlays.length <= 30 && input.overlays.every(validOverlay)
    && input.currentOverlay && typeof input.currentOverlay === 'object'
    && typeof input.currentOverlay.text === 'string' && input.currentOverlay.text.length <= 500
    && animations.includes(input.currentOverlay.animation)
    && statuses.includes(input.status)
    && people.includes(input.assignedTo)
}
