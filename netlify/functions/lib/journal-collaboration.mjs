export const REVIEW_ANCHORS = new Set(['general', 'paragraph', 'selection'])
export const REVIEW_STATUSES = new Set(['open', 'resolved', 'needs_work'])
export const CONTRIBUTION_STATUSES = new Set(['draft', 'submitted'])

export function validReviewAnchor(value = {}) {
  const type = String(value.anchorType || 'general')
  const id = String(value.anchorId || '')
  const quote = String(value.quotedText || '')
  if (!REVIEW_ANCHORS.has(type) || id.length > 180 || quote.length > 2000) return false
  if (type !== 'general' && !id.trim()) return false
  return true
}

export function validContribution(value = {}) {
  const title = String(value.title || ''), body = String(value.body || ''), clue = String(value.memoryClue || ''), status = String(value.status || '')
  return CONTRIBUTION_STATUSES.has(status) && title.length <= 180 && body.length <= 100000 && clue.length <= 1000 && (status === 'draft' || body.trim().length > 0)
}
