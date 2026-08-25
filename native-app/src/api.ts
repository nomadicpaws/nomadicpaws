import type { InstagramDay, InstagramPostDraft, InstagramTemplate } from './content'

export const API_URL = 'https://nomadicpaws.co'

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

export async function signIn(accessCode: string) {
  return request<{ token: string }>('/api/event/auth/session', '', {
    method: 'POST',
    body: JSON.stringify({ accessCode }),
  })
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
  const data = await request<{ rhythm: InstagramDay[] | null; templates: Array<{ id: string; name: string; kind: InstagramTemplate['kind']; aspect_ratio: string; source_url: string; favorite: boolean }>; posts: Array<{ id: string; title: string; caption: string; media_urls: string[]; target_date: string | null; theme: string; status: InstagramPostDraft['status']; updated_at: string }> }>('/api/app/instagram', token)
  return { rhythm: data.rhythm, templates: data.templates.map(template => ({ id: template.id, name: template.name, kind: template.kind, aspectRatio: template.aspect_ratio, previewUrl: template.source_url, favorite: template.favorite })), posts: data.posts.map(post => ({ id: post.id, title: post.title, caption: post.caption, mediaUrls: post.media_urls, targetDate: post.target_date, theme: post.theme, status: post.status, updatedAt: post.updated_at })) }
}

export async function saveInstagramRhythm(token: string, rhythm: InstagramDay[]) {
  return request<{ weekly_rhythm: InstagramDay[]; updated_at: string }>('/api/app/instagram', token, {
    method: 'PUT', body: JSON.stringify({ rhythm }),
  })
}

export async function saveInstagramPost(token: string, post: Omit<InstagramPostDraft, 'updatedAt'>) {
  const data = await request<{ post: { id: string; title: string; caption: string; media_urls: string[]; target_date: string | null; theme: string; status: InstagramPostDraft['status']; updated_at: string } }>('/api/app/instagram', token, {
    method: 'POST', body: JSON.stringify({ action: 'save-post', ...post }),
  })
  return { id: data.post.id, title: data.post.title, caption: data.post.caption, mediaUrls: data.post.media_urls, targetDate: data.post.target_date, theme: data.post.theme, status: data.post.status, updatedAt: data.post.updated_at }
}

export async function saveJournalWorkingDraft(token: string, input: { slug: string; title: string; description: string; category: string; image: string; imageAlt: string; body: string; isDraft: boolean; publishDate: string; expectedRevision: number }) {
  return request<{ workingDraft: JournalWorkingDraft }>('/api/app/journal', token, {
    method: 'POST', body: JSON.stringify({ action: 'save-working-draft', ...input }),
  })
}
