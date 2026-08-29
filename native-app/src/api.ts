import type { InstagramDay, InstagramPostDraft, InstagramTemplate } from './content'

export const API_URL = 'https://nomadicpaws.co'

export type AppRole = 'pending' | 'katie' | 'trinitie' | 'mom'
export type AppUser = { id: string; email: string; name: string; role: AppRole; status: 'pending' | 'active' | 'revoked' }
export type AppleSignInPayload = { identityToken: string; nonce: string; email?: string; name?: string }
export type SharedAdventure = { id: string; title: string; notes: string; private_location: string; public_location: string; captured_at: string; assigned_to: 'Katie' | 'Trinitie'; status: 'Idea' | 'Draft' | 'Ready' | 'Handed Off' | 'Posted'; platforms: string[]; media_count: number; created_at: string; updated_at: string }
export type SharedMediaAsset = { id: string; adventure_id: string | null; original_name: string; content_type: string; byte_size: number; width: number | null; height: number | null; kind: 'photo' | 'video'; tags: string[]; notes: string; usage_count: number; created_at: string }
export type WorkingVersion = { id: string; media_id: string; destination_type: string; destination_id: string; treatment: { logoColor: string; logoSize: string; logoSide: string; focus: string }; created_at: string }
export type PinterestPin = { image: string; title: string; description: string; template: 'bark' | 'sage' | 'sand' | 'terracotta'; logo_size: 'small' | 'medium'; logo_placement: 'left' | 'right' }
export type PinterestCampaign = { post_slug: string; campaign_title: string; board: string; keywords: string; retroactive: boolean; enabled: boolean; rss_pin: PinterestPin; day_7_pin: PinterestPin; day_14_pin: PinterestPin; day_21_pin: PinterestPin; updated_at?: string }

export type JournalStory = {
  slug: string
  title: string
  description: string
  category: string
  image: string
  imageAlt: string
  date: string
  draft: boolean
  status: 'Draft' | 'Scheduled' | 'Published'
  version: string
}

export type JournalStoryDetail = JournalStory & { body: string }
export type JournalReviewNote = {
  id: string
  story_slug: string
  story_version: string
  reviewer: 'Trinitie' | 'Mom'
  note: string
  anchor_type: 'general' | 'paragraph' | 'selection'
  anchor_id: string | null
  quoted_text: string | null
  status: 'open' | 'resolved' | 'needs_work'
  revised_text: string | null
  created_at: string
}
export type JournalWorkingDraft = {
  story_slug: string
  base_version: string
  title: string
  description: string
  category: string
  image: string
  image_alt: string
  body: string
  is_draft: boolean
  publish_date: string
  revision: number
  updated_at: string
}
export type JournalWorkingVersion = { id: string; revision: number; snapshot: JournalWorkingDraft; created_at: string }

async function request<T>(path: string, token: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || 'Nomadic Paws could not complete that request.')
  return data as T
}

export async function signInWithApple(payload: AppleSignInPayload) {
  return request<{ token?: string; user: AppUser; setupRequired?: boolean; pending?: boolean }>('/api/app/auth', '', {
    method: 'POST',
    body: JSON.stringify({ action: 'apple', ...payload }),
  })
}

export async function claimKatieAccount(payload: AppleSignInPayload & { accessCode: string }) {
  return request<{ token: string; user: AppUser }>('/api/app/auth', '', { method: 'POST', body: JSON.stringify({ action: 'claim-katie', ...payload }) })
}

export async function restoreAppSession(token: string) {
  return request<{ user: AppUser }>('/api/app/auth', token)
}

export async function loadTeamAccess(token: string) {
  return request<{ user: AppUser; pending: AppUser[] }>('/api/app/auth?view=team', token)
}

export async function approveTeamAccess(token: string, userId: string, role: 'trinitie' | 'mom') {
  return request<{ user: AppUser }>('/api/app/auth', token, { method: 'POST', body: JSON.stringify({ action: 'approve', userId, role }) })
}

export async function signOutApp(token: string) {
  return request<{ signedOut: boolean }>('/api/app/auth', token, { method: 'POST', body: JSON.stringify({ action: 'signout' }) })
}

export async function loadSharedMedia(token: string) {
  return request<{ adventures: SharedAdventure[]; media: SharedMediaAsset[]; workingVersions: WorkingVersion[] }>('/api/app/media', token)
}

export async function createSharedAdventure(token: string, input: { title: string; notes: string; privateLocation: string; capturedAt?: string }) {
  const data = await request<{ adventure: SharedAdventure }>('/api/app/media', token, { method: 'POST', body: JSON.stringify({ action: 'create-adventure', ...input }) })
  return data.adventure
}

export async function uploadAdventurePhoto(token: string, adventureId: string, file: { uri: string; name: string; mimeType?: string | null }) {
  const form = new FormData()
  form.append('adventureId', adventureId)
  form.append('file', { uri: file.uri, name: file.name, type: file.mimeType || 'image/jpeg' } as any)
  const response = await fetch(`${API_URL}/api/app/media`, { method: 'POST', headers: { Accept: 'application/json', Authorization: `Bearer ${token}` }, body: form })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || 'That photo could not be added to the shared library.')
  return data.media as SharedMediaAsset
}

export function privateMediaUrl(id: string) { return `${API_URL}/api/app/media/file/${encodeURIComponent(id)}` }
export function workingImageUrl(id: string) { return `${API_URL}/api/app/media/working/${encodeURIComponent(id)}` }
export function publicWorkingImagePath(id: string) { return `/media/working/${encodeURIComponent(id)}.jpg` }

export async function updateSharedMedia(token: string, mediaId: string, tags: string[], notes: string) {
  const data = await request<{ media: SharedMediaAsset }>('/api/app/media', token, { method: 'POST', body: JSON.stringify({ action: 'update-media', mediaId, tags, notes }) })
  return data.media
}

export async function saveWorkingVersion(token: string, mediaId: string, destination: string, treatment: WorkingVersion['treatment']) {
  const data = await request<{ workingVersion: WorkingVersion }>('/api/app/media', token, { method: 'POST', body: JSON.stringify({ action: 'save-working-version', mediaId, destination, treatment }) })
  return data.workingVersion
}

export async function loadStories(token: string) {
  return request<{ stories: JournalStory[] }>('/api/app/journal', token)
}

export async function loadStory(token: string, slug: string) {
  return request<{ story: JournalStoryDetail; notes: JournalReviewNote[]; workingDraft: JournalWorkingDraft | null; versions: JournalWorkingVersion[] }>(`/api/app/journal?slug=${encodeURIComponent(slug)}`, token)
}

export async function addReviewNote(token: string, input: { slug: string; version: string; reviewer: 'Trinitie' | 'Mom'; note: string; anchorType?: 'general' | 'paragraph' | 'selection'; anchorId?: string; quotedText?: string }) {
  return request<{ note: JournalReviewNote }>('/api/app/journal', token, {
    method: 'POST',
    body: JSON.stringify({ action: 'add-review-note', ...input }),
  })
}

export type JournalContribution = { id: string; contributor: 'Mom'; title: string; body: string; memory_clue: string; status: 'draft' | 'submitted' | 'editing' | 'archived'; needs_adventure_match: boolean; needs_photo_selection: boolean; updated_at: string }

export async function loadJournalContributions(token: string) {
  return request<{ contributions: JournalContribution[] }>('/api/app/journal?view=contributions', token)
}

export async function saveJournalContribution(token: string, input: { id?: string; title: string; body: string; memoryClue: string; status: 'draft' | 'submitted' }) {
  return request<{ contribution: JournalContribution }>('/api/app/journal', token, { method: 'POST', body: JSON.stringify({ action: 'save-contribution', ...input }) })
}

export async function updateReviewNote(token: string, input: { id: string; status: 'open' | 'resolved' | 'needs_work'; revisedText?: string }) {
  return request<{ note: JournalReviewNote }>('/api/app/journal', token, { method: 'POST', body: JSON.stringify({ action: 'update-review-note', ...input }) })
}

export async function loadInstagramStudio(token: string) {
  const data = await request<{ rhythm: InstagramDay[] | null; templates: Array<{ id: string; name: string; kind: InstagramTemplate['kind']; aspect_ratio: string; source_url: string; favorite: boolean }>; posts: Array<{ id: string; title: string; caption: string; media_urls: string[]; target_date: string | null; theme: string; status: InstagramPostDraft['status']; assigned_to: InstagramPostDraft['assignedTo']; handoff_note: string; updated_at: string }> }>('/api/app/instagram', token)
  return { rhythm: data.rhythm, templates: data.templates.map(template => ({ id: template.id, name: template.name, kind: template.kind, aspectRatio: template.aspect_ratio, previewUrl: template.source_url, favorite: template.favorite })), posts: data.posts.map(post => ({ id: post.id, title: post.title, caption: post.caption, mediaUrls: post.media_urls, targetDate: post.target_date, theme: post.theme, status: post.status, assignedTo: post.assigned_to, handoffNote: post.handoff_note, updatedAt: post.updated_at })) }
}

export async function saveInstagramRhythm(token: string, rhythm: InstagramDay[]) {
  return request<{ weekly_rhythm: InstagramDay[]; updated_at: string }>('/api/app/instagram', token, {
    method: 'PUT', body: JSON.stringify({ rhythm }),
  })
}

export async function saveInstagramPost(token: string, post: Omit<InstagramPostDraft, 'updatedAt'>) {
  const data = await request<{ post: { id: string; title: string; caption: string; media_urls: string[]; target_date: string | null; theme: string; status: InstagramPostDraft['status']; assigned_to: InstagramPostDraft['assignedTo']; handoff_note: string; updated_at: string } }>('/api/app/instagram', token, {
    method: 'POST', body: JSON.stringify({ action: 'save-post', ...post }),
  })
  return { id: data.post.id, title: data.post.title, caption: data.post.caption, mediaUrls: data.post.media_urls, targetDate: data.post.target_date, theme: data.post.theme, status: data.post.status, assignedTo: data.post.assigned_to, handoffNote: data.post.handoff_note, updatedAt: data.post.updated_at }
}

export async function loadPinterestCampaigns(token: string) {
  return request<{ campaigns: PinterestCampaign[] }>('/api/app/pinterest', token)
}

export async function savePinterestCampaign(token: string, campaign: PinterestCampaign) {
  return request<{ campaign: PinterestCampaign }>('/api/app/pinterest', token, { method: 'POST', body: JSON.stringify(campaign) })
}

export async function saveJournalWorkingDraft(token: string, input: { slug: string; title: string; description: string; category: string; image: string; imageAlt: string; body: string; isDraft: boolean; publishDate: string; expectedRevision: number }) {
  return request<{ workingDraft: JournalWorkingDraft }>('/api/app/journal', token, {
    method: 'POST', body: JSON.stringify({ action: 'save-working-draft', ...input }),
  })
}
