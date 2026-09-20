const API_URL = 'https://nomadicpaws.co'

export type EventProduct = {
  sku: string
  name: string
  image: string
  unitPriceCents: number
  stock: number
  active: boolean
}

export type CalendarEvent = {
  id: string
  title: string
  event_date: string
  location: string
  notes: string
  status: 'Planned' | 'Confirmed' | 'Done' | 'Canceled'
  created_by: 'Katie' | 'Trinitie'
}

async function request<T>(path: string, token = '', options: RequestInit = {}) {
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
  if (!response.ok) throw new Error(data.error || 'Nomadic Paws Events could not complete that request.')
  return data as T
}

export async function createSellerSession(accessCode: string) {
  return request<{ token: string; expiresInSeconds: number; mode: 'test' }>('/api/event/auth/session', '', {
    method: 'POST',
    body: JSON.stringify({ accessCode }),
  })
}

export async function loadProducts(token: string) {
  return request<{ products: EventProduct[]; mode: 'test' }>('/api/event/products', token)
}

export async function loadCalendar(token: string) {
  return request<{ events: CalendarEvent[] }>('/api/app/calendar', token)
}

export async function saveCalendar(token: string, input: {
  id?: string
  title: string
  eventDate: string
  location: string
  notes: string
  status: CalendarEvent['status']
}) {
  const data = await request<{ event: CalendarEvent }>('/api/app/calendar', token, {
    method: 'POST',
    body: JSON.stringify({ action: 'save-event', ...input }),
  })
  return data.event
}

export { API_URL }
