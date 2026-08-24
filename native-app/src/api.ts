export const API_URL = 'https://nomadicpaws.co'

export type JournalStory = {
  slug: string
  title: string
  date: string
  draft: boolean
  status: 'Draft' | 'Scheduled' | 'Published'
}

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
