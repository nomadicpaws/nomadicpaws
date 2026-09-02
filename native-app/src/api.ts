import type { InstagramDay, InstagramPostDraft, InstagramTemplate } from './content'
import * as FileSystem from 'expo-file-system/legacy'

export const API_URL = 'https://nomadicpaws.co'

export type AppRole = 'pending' | 'katie' | 'trinitie' | 'mom'
export type AppUser = { id: string; email: string; name: string; role: AppRole; status: 'pending' | 'active' | 'revoked' }
export type AppleSignInPayload = { identityToken: string; nonce: string; email?: string; name?: string }
export type SharedAdventure = { id: string; title: string; notes: string; private_location: string; public_location: string; captured_at: string; assigned_to: 'Katie' | 'Trinitie'; status: 'Idea' | 'Draft' | 'Ready' | 'Handed Off' | 'Posted'; platforms: string[]; media_count: number; created_at: string; updated_at: string }
export type SharedMediaAsset = { id: string; adventure_id: string | null; original_name: string; content_type: string; byte_size: number; width: number | null; height: number | null; kind: 'photo' | 'video'; tags: string[]; notes: string; usage_count: number; created_at: string }
export type WorkingVersion = { id: string; media_id: string; destination_type: string; destination_id: string; treatment: { logoColor: string; logoSize: string; logoSide: string; focus: string }; created_at: string }
export type PinterestPin = { image: string; title: string; description: string; template: 'bark' | 'sage' | 'sand' | 'terracotta'; logo_size: 'small' | 'medium'; logo_placement: 'left' | 'right' }
export type PinterestCampaign = { post_slug: string; campaign_title: string; board: string; keywords: string; retroactive: boolean; enabled: boolean; rss_pin: PinterestPin; day_7_pin: PinterestPin; day_14_pin: PinterestPin; day_21_pin: PinterestPin; updated_at?: string }
export type EventProduct = { sku: string; snipcartId: string; name: string; image: string; unitPriceCents: number; stock: number; active: boolean }
export type EventSale = { saleId: string; paymentIntentId: string; clientSecret: string; subtotalCents: number; taxCents: number; totalCents: number; currency: 'usd'; mode: 'test' }
export type EventSaleStatus = { id: string; status: string; mode: 'test'; currency: 'usd'; subtotal_cents: number; tax_cents: number; total_cents: number; stripe_payment_intent_id: string; created_at: string; updated_at: string }
export type VideoOverlayDraft = { id: string; presetId: string; name: string; fontId: string; fontName: string; fontFamily: string; text: string; textColor: string; accentColor: string; startAt: number; endAt: number; animation: string; boxed: boolean; uppercase: boolean }
export type VideoProject = {
  id: string; title: string; mediaId: string | null; sourceStorySlug: string; platforms: Array<'Instagram Reels' | 'TikTok' | 'YouTube Shorts'>;
  overlays: VideoOverlayDraft[]; currentOverlay: { presetId: string; fontId: string; text: string; textColor: string; accentColor: string; startAt: string; endAt: string; animation: string };
  status: 'Draft' | 'Ready' | 'Handed Off' | 'Posted'; assignedTo: 'Katie' | 'Trinitie'; lastEditedBy: 'Katie' | 'Trinitie'; createdAt: string; updatedAt: string
}

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
  reviewStatus?: 'draft' | 'ready_for_mom' | 'back_with_katie'
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
  review_status?: 'draft' | 'ready_for_mom' | 'back_with_katie'
  review_requested_at?: string | null
  review_completed_at?: string | null
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

function privateCachePath(key: string) {
  const safeKey = key.replace(/[^a-z0-9-]/gi, '-')
  return `${FileSystem.documentDirectory || FileSystem.cacheDirectory}private-${safeKey}.json`
}

async function cachedRequest<T>(key: string, load: () => Promise<T>): Promise<T> {
  try {
    const data = await load()
    await FileSystem.writeAsStringAsync(privateCachePath(key), JSON.stringify(data)).catch(() => {})
    return data
  } catch (networkError) {
    try {
      return JSON.parse(await FileSystem.readAsStringAsync(privateCachePath(key))) as T
    } catch {
      throw networkError
    }
  }
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

export async function uploadAdventurePhoto(token: string, adventureId: string, file: { uri: string; name: string; mimeType?: string | null; width?: number; height?: number }) {
  // React Native's WHATWG FormData implementation does not accept the
  // `{ uri, name, type }` file-shaped object reliably on iOS. Let Expo's
  // native uploader read the Photos/iCloud file URI and construct the
  // multipart request instead.
  const result = await FileSystem.uploadAsync(`${API_URL}/api/app/media`, file.uri, {
    httpMethod: 'POST',
    uploadType: FileSystem.FileSystemUploadType.MULTIPART,
    fieldName: 'file',
    mimeType: file.mimeType || 'image/jpeg',
    parameters: {
      adventureId,
      originalName: file.name,
      width: String(file.width || 0),
      height: String(file.height || 0),
    },
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
  })
  let data: { media?: SharedMediaAsset; error?: string } = {}
  try { data = JSON.parse(result.body || '{}') as typeof data } catch { /* use the friendly fallback below */ }
  if (result.status < 200 || result.status >= 300 || !data.media) {
    throw new Error(data.error || 'That photo could not be added to the shared library.')
  }
  return data.media as SharedMediaAsset
}

export async function uploadAdventureVideo(token: string, adventureId: string, file: { uri: string; name: string; mimeType?: string | null; byteSize: number; width?: number; height?: number; durationSeconds: number }, onProgress?: (current: number, total: number) => void) {
  const direct = await request<{ mode: 'r2'; uploadId: string; uploadUrl: string } | { mode: 'chunked' }>('/api/app/media', token, {
    method: 'POST',
    body: JSON.stringify({
      action: 'create-direct-video-upload', adventureId, originalName: file.name,
      contentType: file.mimeType || 'video/quicktime', byteSize: file.byteSize,
      width: file.width || 0, height: file.height || 0, durationSeconds: file.durationSeconds,
    }),
  })
  if (direct.mode === 'r2') {
    const task = FileSystem.createUploadTask(
      direct.uploadUrl,
      file.uri,
      {
        httpMethod: 'PUT',
        uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
        headers: { 'Content-Type': file.mimeType || 'video/quicktime' },
      },
      ({ totalBytesSent, totalBytesExpectedToSend }) =>
        onProgress?.(totalBytesSent, totalBytesExpectedToSend || file.byteSize),
    )
    const result = await task.uploadAsync()
    if (!result || result.status < 200 || result.status >= 300) throw new Error('Cloud storage did not accept that video. Please retry.')
    const finished = await request<{ media: SharedMediaAsset }>('/api/app/media', token, {
      method: 'POST',
      body: JSON.stringify({ action: 'finish-direct-video-upload', uploadId: direct.uploadId }),
    })
    return finished.media
  }
  const started = await request<{ uploadId: string; chunkBytes: number; chunkCount: number }>('/api/app/media', token, {
    method: 'POST',
    body: JSON.stringify({
      action: 'start-video-upload', adventureId, originalName: file.name,
      contentType: file.mimeType || 'video/quicktime', byteSize: file.byteSize,
      width: file.width || 0, height: file.height || 0, durationSeconds: file.durationSeconds,
    }),
  })
  for (let index = 0; index < started.chunkCount; index += 1) {
    const position = index * started.chunkBytes
    const length = Math.min(started.chunkBytes, file.byteSize - position)
    const data = await FileSystem.readAsStringAsync(file.uri, {
      encoding: FileSystem.EncodingType.Base64,
      position,
      length,
    })
    await request<{ received: number }>('/api/app/media', token, {
      method: 'POST',
      body: JSON.stringify({ action: 'upload-video-chunk', uploadId: started.uploadId, index, data }),
    })
    onProgress?.(index + 1, started.chunkCount)
  }
  const finished = await request<{ media: SharedMediaAsset }>('/api/app/media', token, {
    method: 'POST',
    body: JSON.stringify({ action: 'finish-video-upload', uploadId: started.uploadId }),
  })
  return finished.media
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
  return cachedRequest('journal-stories', () =>
    request<{ stories: JournalStory[] }>('/api/app/journal', token),
  )
}

export async function loadStory(token: string, slug: string) {
  return cachedRequest(`journal-story-${slug}`, () =>
    request<{ story: JournalStoryDetail; notes: JournalReviewNote[]; workingDraft: JournalWorkingDraft | null; versions: JournalWorkingVersion[] }>(`/api/app/journal?slug=${encodeURIComponent(slug)}`, token),
  )
}

export async function createJournalStory(token: string, input: { title: string; category: string; publishDate: string }) {
  return request<{ story: JournalStoryDetail; notes: JournalReviewNote[]; workingDraft: JournalWorkingDraft; versions: JournalWorkingVersion[] }>('/api/app/journal', token, {
    method: 'POST',
    body: JSON.stringify({ action: 'create-working-draft', ...input }),
  })
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

export async function requestMomReview(token: string, slug: string) {
  return request<{ workingDraft: JournalWorkingDraft }>('/api/app/journal', token, { method: 'POST', body: JSON.stringify({ action: 'request-mom-review', slug }) })
}

export async function completeMomReview(token: string, slug: string) {
  return request<{ workingDraft: JournalWorkingDraft }>('/api/app/journal', token, { method: 'POST', body: JSON.stringify({ action: 'complete-mom-review', slug }) })
}

export async function loadInstagramStudio(token: string) {
  const data = await cachedRequest('instagram-studio', () =>
    request<{ rhythm: InstagramDay[] | null; templates: Array<{ id: string; name: string; kind: InstagramTemplate['kind']; aspect_ratio: string; source_url: string; favorite: boolean }>; posts: Array<{ id: string; title: string; caption: string; media_urls: string[]; target_date: string | null; theme: string; status: InstagramPostDraft['status']; assigned_to: InstagramPostDraft['assignedTo']; handoff_note: string; shared_with_mom: boolean; updated_at: string }> }>('/api/app/instagram', token),
  )
  return { rhythm: data.rhythm, templates: data.templates.map(template => ({ id: template.id, name: template.name, kind: template.kind, aspectRatio: template.aspect_ratio, previewUrl: template.source_url, favorite: template.favorite })), posts: data.posts.map(post => ({ id: post.id, title: post.title, caption: post.caption, mediaUrls: post.media_urls, targetDate: post.target_date, theme: post.theme, status: post.status, assignedTo: post.assigned_to, handoffNote: post.handoff_note, sharedWithMom: post.shared_with_mom, updatedAt: post.updated_at })) }
}

export async function saveInstagramRhythm(token: string, rhythm: InstagramDay[]) {
  return request<{ weekly_rhythm: InstagramDay[]; updated_at: string }>('/api/app/instagram', token, {
    method: 'PUT', body: JSON.stringify({ rhythm }),
  })
}

export async function saveInstagramPost(token: string, post: Omit<InstagramPostDraft, 'updatedAt'>) {
  const data = await request<{ post: { id: string; title: string; caption: string; media_urls: string[]; target_date: string | null; theme: string; status: InstagramPostDraft['status']; assigned_to: InstagramPostDraft['assignedTo']; handoff_note: string; shared_with_mom: boolean; updated_at: string } }>('/api/app/instagram', token, {
    method: 'POST', body: JSON.stringify({ action: 'save-post', ...post }),
  })
  return { id: data.post.id, title: data.post.title, caption: data.post.caption, mediaUrls: data.post.media_urls, targetDate: data.post.target_date, theme: data.post.theme, status: data.post.status, assignedTo: data.post.assigned_to, handoffNote: data.post.handoff_note, sharedWithMom: data.post.shared_with_mom, updatedAt: data.post.updated_at }
}

export async function uploadInstagramTemplate(token: string, file: { uri: string; name: string; mimeType?: string | null; width?: number; height?: number; kind?: InstagramTemplate['kind'] }) {
  const form = new FormData()
  form.append('file', { uri: file.uri, name: file.name, type: file.mimeType || 'image/png' } as any)
  form.append('kind', file.kind || 'Post overlay')
  if (file.width) form.append('width', String(file.width))
  if (file.height) form.append('height', String(file.height))
  const response = await fetch(`${API_URL}/api/app/instagram`, { method: 'POST', headers: { Accept: 'application/json', Authorization: `Bearer ${token}` }, body: form })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || 'That template could not be saved.')
  const template = data.template
  return { id: template.id, name: template.name, kind: template.kind, aspectRatio: template.aspect_ratio, previewUrl: template.source_url, favorite: template.favorite } as InstagramTemplate
}

export type CheetoSuggestion = { caption: string; hashtags: Array<{ tag: string; reason: string }> }
export async function askCheetoAssistant(token: string, input: { title: string; theme: string; notes: string }) {
  return request<{ suggestion: CheetoSuggestion }>('/api/app/assistant', token, { method: 'POST', body: JSON.stringify(input) })
}

function normalizeVideoProject(item: any): VideoProject {
  return {
    id: item.id, title: item.title, mediaId: item.media_id || null, sourceStorySlug: item.source_story_slug || '',
    platforms: item.platforms || [], overlays: item.overlays || [], currentOverlay: item.current_overlay || {},
    status: item.status, assignedTo: item.assigned_to, lastEditedBy: item.last_edited_by,
    createdAt: item.created_at, updatedAt: item.updated_at,
  }
}

export async function loadVideoProjects(token: string) {
  const data = await cachedRequest('video-projects', () => request<{ projects: any[] }>('/api/app/video', token))
  return { projects: data.projects.map(normalizeVideoProject) }
}

export async function saveVideoProject(token: string, project: Omit<VideoProject, 'id' | 'lastEditedBy' | 'createdAt' | 'updatedAt'> & { id?: string }) {
  const data = await request<{ project: any }>('/api/app/video', token, {
    method: 'POST',
    body: JSON.stringify({ action: 'save-project', ...project }),
  })
  return normalizeVideoProject(data.project)
}

export async function loadPinterestCampaigns(token: string) {
  return cachedRequest('pinterest-campaigns', () =>
    request<{ campaigns: PinterestCampaign[] }>('/api/app/pinterest', token),
  )
}

export async function savePinterestCampaign(token: string, campaign: PinterestCampaign) {
  return request<{ campaign: PinterestCampaign }>('/api/app/pinterest', token, { method: 'POST', body: JSON.stringify(campaign) })
}

export async function saveJournalWorkingDraft(token: string, input: { slug: string; title: string; description: string; category: string; image: string; imageAlt: string; body: string; isDraft: boolean; publishDate: string; expectedRevision: number }) {
  return request<{ workingDraft: JournalWorkingDraft }>('/api/app/journal', token, {
    method: 'POST', body: JSON.stringify({ action: 'save-working-draft', ...input }),
  })
}

export async function loadEventProducts(token: string) {
  return request<{ products: EventProduct[]; simulatedReader: boolean; mode: 'test' }>('/api/event/products', token)
}

export async function createTerminalConnectionToken(token: string) {
  const data = await request<{ secret: string }>('/api/event/stripe/connection-token', token, { method: 'POST' })
  return data.secret
}

export async function createEventSale(token: string, items: Array<{ sku: string; quantity: number }>, requestId: string) {
  return request<EventSale>('/api/event/sales', token, {
    method: 'POST', body: JSON.stringify({ items, requestId }),
  })
}

export async function loadEventSaleStatus(token: string, saleId: string) {
  return request<{ sale: EventSaleStatus }>(`/api/event/sales/status?id=${encodeURIComponent(saleId)}`, token)
}

export async function publishJournalWorkingDraft(token: string, slug: string) {
  return request<{ commitSha: string; filePath: string; branch: string; slug: string; state: 'committed' }>('/api/app/journal', token, {
    method: 'POST', body: JSON.stringify({ action: 'publish-working-draft', slug }),
  })
}
