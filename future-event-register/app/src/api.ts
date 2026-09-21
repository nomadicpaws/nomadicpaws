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
  cheeto_attending: boolean
  checklist: Array<{ id: string; label: string; completed: boolean; assignedTo: string; cheetoOnly: boolean }>
}

export async function saveChecklistItem(token: string, eventId: string, input: { id?: string; label: string; completed: boolean; assignedTo?: string; cheetoOnly?: boolean }) {
  const data = await request<{ item: { id: string; event_id: string; label: string; completed: boolean; assignedTo: string; cheetoOnly: boolean } }>('/api/app/calendar', token, {
    method: 'POST', body: JSON.stringify({ action: 'save-checklist-item', eventId, ...input }),
  })
  return data.item
}

export async function toggleChecklistItem(token: string, eventId: string, id: string, completed: boolean) {
  const data = await request<{ item: CalendarEvent['checklist'][number] }>('/api/app/calendar', token, {
    method: 'POST', body: JSON.stringify({ action: 'toggle-checklist-item', eventId, id, completed }),
  })
  return data.item
}

export async function deleteChecklistItem(token: string, eventId: string, id: string) {
  return request<{ deleted: true }>('/api/app/calendar', token, {
    method: 'POST', body: JSON.stringify({ action: 'delete-checklist-item', eventId, id }),
  })
}

export type EventSale = {
  saleId: string
  clientSecret: string
  subtotalCents: number
  taxCents: number
  totalCents: number
}

export type EventSaleHistory = {
  id: string
  status: 'payment_pending' | 'paid' | 'payment_failed' | 'refunded' | 'cancelled'
  mode: 'test' | 'live'
  currency: string
  subtotal_cents: number
  tax_cents: number
  total_cents: number
  stripe_payment_intent_id?: string | null
  payment_method: 'stripe_terminal' | 'cash'
  cash_tendered_cents?: number | null
  change_due_cents?: number | null
  created_at: string
  updated_at: string
  items: Array<{ sku: string; name: string; quantity: number; unitPriceCents: number }>
}

export type EventStaff = {
  id: string
  display_name: string
  role: 'manager' | 'helper'
  active: boolean
  last_signed_in_at?: string | null
  has_saved_code?: boolean
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

export async function rotateEventStaffCode(token: string, id: string) {
  return request<{ staff: EventStaff; accessCode: string }>('/api/event/staff', token, {
    method: 'POST', body: JSON.stringify({ action: 'rotate-code', id }),
  })
}

export async function viewEventStaffCode(token: string, id: string) {
  return request<{ displayName: string; accessCode: string }>('/api/event/staff', token, {
    method: 'POST', body: JSON.stringify({ action: 'view-code', id }),
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

export async function createCashSale(token: string, items: Array<{ sku: string; quantity: number }>, requestId: string, cashTendered: string) {
  return request<{ sale: EventSaleHistory; changeDueCents: number }>('/api/event/sales/cash', token, {
    method: 'POST', body: JSON.stringify({ items, requestId, cashTendered }),
  })
}

export async function loadSaleStatus(token: string, saleId: string) {
  return request<{ sale: { status: string } }>(`/api/event/sales/status?id=${encodeURIComponent(saleId)}`, token)
}

export async function loadSaleHistory(token: string, limit = 25) {
  return request<{ sales: EventSaleHistory[]; mode: 'test' | 'live' }>(`/api/event/sales/history?limit=${limit}`, token)
}

export async function loadCalendar(token: string) {
  return request<{ events: CalendarEvent[]; assignees: string[] }>('/api/app/calendar', token)
}

export async function saveCalendar(token: string, input: {
  id?: string
  title: string
  eventDate: string
  location: string
  notes: string
  status: CalendarEvent['status']
  cheetoAttending: boolean
}) {
  const data = await request<{ event: CalendarEvent }>('/api/app/calendar', token, {
    method: 'POST',
    body: JSON.stringify({ action: 'save-event', ...input }),
  })
  return data.event
}

export { API_URL }
