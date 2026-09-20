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

export type EventSale = {
  saleId: string
  clientSecret: string
  subtotalCents: number
  taxCents: number
  totalCents: number
}

export type EventStaff = {
  id: string
  display_name: string
  role: 'manager' | 'helper'
  active: boolean
  last_signed_in_at?: string | null
}

export type SignedInStaff = { id: string; name: string; permission: 'owner' | 'manager' | 'helper' }

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
  return request<{ token: string; expiresInSeconds: number; mode: 'test'; staff: SignedInStaff }>('/api/event/auth/session', '', {
    method: 'POST',
    body: JSON.stringify({ accessCode }),
  })
}

export async function loadEventStaff(token: string) {
  return request<{ staff: EventStaff[] }>('/api/event/staff', token)
}

export async function createEventStaff(token: string, name: string, role: EventStaff['role']) {
  return request<{ staff: EventStaff; accessCode: string }>('/api/event/staff', token, {
    method: 'POST', body: JSON.stringify({ action: 'create', name, role }),
  })
}

export async function setEventStaffActive(token: string, id: string, active: boolean) {
  return request<{ staff: EventStaff }>('/api/event/staff', token, {
    method: 'POST', body: JSON.stringify({ action: 'set-active', id, active }),
  })
}

export async function loadProducts(token: string) {
  return request<{ products: EventProduct[]; mode: 'test' }>('/api/event/products', token)
}

export async function createTerminalToken(token: string) {
  const data = await request<{ secret: string }>('/api/event/stripe/connection-token', token, { method: 'POST' })
  return data.secret
}

export async function createSale(token: string, items: Array<{ sku: string; quantity: number }>, requestId: string) {
  return request<EventSale>('/api/event/sales', token, {
    method: 'POST',
    body: JSON.stringify({ items, requestId }),
  })
}

export async function loadSaleStatus(token: string, saleId: string) {
  return request<{ sale: { status: string } }>(`/api/event/sales/status?id=${encodeURIComponent(saleId)}`, token)
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
