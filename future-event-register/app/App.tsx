import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import * as SecureStore from 'expo-secure-store'
import * as Crypto from 'expo-crypto'
import * as DeviceCalendar from 'expo-calendar/legacy'
import { StatusBar as ExpoStatusBar } from 'expo-status-bar'
import { Reader, StripeTerminalProvider, useStripeTerminal } from '@stripe/stripe-terminal-react-native'
import {
  API_URL,
  commerceRequest,
  CalendarEvent,
  createEventStaff,
  createSellerSession,
  deleteChecklistItem,
  EventProduct,
  EventSaleHistory,
  EventStaff,
  loadCalendar,
  loadEventStaff,
  rotateEventStaffCode,
  saveCalendar,
  saveChecklistItem,
  setEventStaffActive,
  SignedInStaff,
  toggleChecklistItem as toggleCalendarChecklistItem,
  viewEventStaffCode,
} from './src/api'

const SESSION_KEY = 'nomadic-paws-event-session'
const DEVICE_CALENDAR_KEY = 'nomadic-paws-device-calendar-connected'
const DEVICE_CALENDAR_ID_KEY = 'nomadic-paws-device-calendar-id'
const DEVICE_EVENT_PREFIX = 'nomadic-paws-device-event-'
const colors = {
  cream: '#fdfaf5', sand: '#f4eee1', sandDeep: '#e9dfc8', bark: '#3f352a',
  barkSoft: '#6b5d4c', sage: '#8b9a7c', sageDeep: '#6f7e62',
  terracotta: '#c1734b', terracottaDeep: '#a85c39', white: '#ffffff', red: '#a2473d',
}

type StoredSession = { token: string; expiresAt: number; staff: SignedInStaff }
type Tab = 'Calendar' | 'Register' | 'Staff'

function dateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function displayDate(value: string) {
  const key = value.match(/^\d{4}-\d{2}-\d{2}/)?.[0]
  if (!key) return 'Date not set'
  return new Date(`${key}T12:00:00`).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  })
}

type PlanningStage = 'two-weeks' | 'day-before' | 'event-day' | 'after-event'

const planningStages: Array<{ key: PlanningStage; title: string; symbol: string; offset: number }> = [
  { key: 'two-weeks', title: 'Two weeks before', symbol: '◇', offset: -14 },
  { key: 'day-before', title: 'Day before', symbol: '▣', offset: -1 },
  { key: 'event-day', title: 'Event day', symbol: '●', offset: 0 },
  { key: 'after-event', title: 'After the event', symbol: '✓', offset: 1 },
]

function shiftedDateKey(value: string, offset: number) {
  const key = value.match(/^\d{4}-\d{2}-\d{2}/)?.[0]
  if (!key) return ''
  const date = new Date(`${key}T12:00:00`)
  date.setDate(date.getDate() + offset)
  return dateKey(date)
}

function checklistStage(label: string): PlanningStage {
  const value = label.toLowerCase()
  if (value.includes('after the event') || value.includes('restock or damaged')) return 'after-event'
  if (value.includes('venue') || value.includes('reservation') || value.includes('assign setup') || value.includes('checkout, prices')) return 'two-weeks'
  if (value.includes('event-day') || value.includes('starting quantity') || value.includes('water and personal')) return 'event-day'
  return 'day-before'
}

function money(cents: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100)
}

function paymentLabel(status: EventSaleHistory['status']) {
  if (status === 'paid') return { title: 'Payment successful', detail: 'Paid and recorded', tone: 'success' as const }
  if (status === 'payment_pending') return { title: 'Payment processing', detail: 'Waiting for Stripe confirmation', tone: 'pending' as const }
  if (status === 'refunded') return { title: 'Payment refunded', detail: 'Refund recorded', tone: 'pending' as const }
  if (status === 'cancelled') return { title: 'Payment canceled', detail: 'No completed payment', tone: 'error' as const }
  return { title: 'Payment unsuccessful', detail: 'Not charged—safe to retry', tone: 'error' as const }
}

function paymentDate(value: string) {
  return new Date(value).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

function saleRequestId() {
  const bytes = Crypto.getRandomBytes(16)
  bytes[6] = (bytes[6]! & 0x0f) | 0x40
  bytes[8] = (bytes[8]! & 0x3f) | 0x80
  const hex = Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

function monthCells(monthOffset: number) {
  const today = new Date()
  const first = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1)
  const cells: Array<{ key: string; day?: number }> = Array.from({ length: first.getDay() }, (_, index) => ({ key: `blank-${index}` }))
  const days = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate()
  for (let day = 1; day <= days; day += 1) cells.push({ key: dateKey(new Date(first.getFullYear(), first.getMonth(), day)), day })
  return { label: first.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }), cells }
}

function Login({ onSignedIn }: { onSignedIn: (session: StoredSession) => void }) {
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function signIn() {
    setBusy(true)
    setError('')
    try {
      const data = await createSellerSession(code.trim())
      const session = { token: data.token, expiresAt: Date.now() + data.expiresInSeconds * 1000, staff: data.staff }
      await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session))
      onSignedIn(session)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The register could not sign in.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <SafeAreaView style={styles.fill}>
      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.loginPage} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive">
          <View style={styles.loginInner}>
            <Text style={styles.eyebrow}>NOMADIC PAWS EVENTS</Text>
            <Text style={styles.heroTitle}>Ready when the table is.</Text>
            <Text style={styles.copy}>Use your own private event code. The app remembers you for the shift, and no live card can be charged in this version.</Text>
            <View style={styles.loginCard}>
              <Text style={styles.label}>Seller access code</Text>
              <TextInput value={code} onChangeText={setCode} secureTextEntry autoCapitalize="none" returnKeyType="go" onSubmitEditing={signIn} placeholder="Enter the private code" placeholderTextColor="#8b8075" style={styles.input} />
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <Pressable disabled={busy || code.trim().length < 8} onPress={signIn} style={[styles.primary, (busy || code.trim().length < 8) && styles.disabled]}>
                <Text style={styles.primaryText}>{busy ? 'Opening…' : 'Open event workspace'}</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

function Calendar({ token, permission, request, onRequestHandled }: { token: string; permission: SignedInStaff['permission']; request?: { eventId?: string; date?: string; nonce: number }; onRequestHandled: () => void }) {
  const canManage = permission === 'owner' || permission === 'manager'
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<CalendarEvent>()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [eventDate, setEventDate] = useState(dateKey())
  const [location, setLocation] = useState('')
  const [notes, setNotes] = useState('')
  const [status, setStatus] = useState<CalendarEvent['status']>('Planned')
  const [cheetoAttending, setCheetoAttending] = useState(false)
  const [monthOffset, setMonthOffset] = useState(0)
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const [checklist, setChecklist] = useState<CalendarEvent['checklist']>([])
  const [newChecklistItem, setNewChecklistItem] = useState('')
  const [assignees, setAssignees] = useState<string[]>(['Katie'])
  const [newAssignee, setNewAssignee] = useState('')
  const [deviceCalendarConnected, setDeviceCalendarConnected] = useState(false)
  const [deviceEvents, setDeviceEvents] = useState<DeviceCalendar.Event[]>([])
  const [deviceBusy, setDeviceBusy] = useState(false)
  const [deviceCalendars, setDeviceCalendars] = useState<DeviceCalendar.Calendar[]>([])
  const [deviceCalendarId, setDeviceCalendarId] = useState('')
  const [importedDeviceEventId, setImportedDeviceEventId] = useState('')

  async function refresh() {
    setLoading(true)
    setMessage('')
    try { const result = await loadCalendar(token); setEvents(result.events); setAssignees(result.assignees) }
    catch (reason) { setMessage(reason instanceof Error ? reason.message : 'The calendar could not load.') }
    finally { setLoading(false) }
  }
  useEffect(() => {
    refresh().catch(() => {})
    Promise.all([SecureStore.getItemAsync(DEVICE_CALENDAR_KEY), SecureStore.getItemAsync(DEVICE_CALENDAR_ID_KEY)]).then(([connected, savedId]) => {
      if (connected === 'yes') {
        setDeviceCalendarConnected(true)
        loadDeviceCalendars(savedId || '').catch(() => {})
      }
    })
  }, [token])
  useEffect(() => {
    if (!request || loading) return
    const requestedEvent = request.eventId ? events.find((event) => event.id === request.eventId) : undefined
    if (requestedEvent) edit(requestedEvent)
    else edit(undefined, request.date)
    onRequestHandled()
  }, [events, loading, request])
  async function loadDeviceCalendars(preferredId = '') {
    const permission = await DeviceCalendar.getCalendarPermissionsAsync()
    if (!permission.granted) return
    const available = (await DeviceCalendar.getCalendarsAsync(DeviceCalendar.EntityTypes.EVENT)).filter((calendar) => calendar.allowsModifications !== false)
    const defaultCalendar = await DeviceCalendar.getDefaultCalendarAsync()
    const selected = available.find((calendar) => calendar.id === preferredId) || available.find((calendar) => calendar.id === defaultCalendar.id) || available[0]
    setDeviceCalendars(available)
    if (selected) {
      setDeviceCalendarId(selected.id)
      await SecureStore.setItemAsync(DEVICE_CALENDAR_ID_KEY, selected.id)
      await refreshDeviceCalendar(selected.id)
    }
  }
  async function refreshDeviceCalendar(calendarId = deviceCalendarId) {
    const permission = await DeviceCalendar.getCalendarPermissionsAsync()
    if (!permission.granted) return
    const selectedId = calendarId || (await DeviceCalendar.getDefaultCalendarAsync()).id
    const start = new Date()
    start.setDate(start.getDate() - 1)
    const end = new Date()
    end.setMonth(end.getMonth() + 6)
    const entries = await DeviceCalendar.getEventsAsync([selectedId], start, end)
    setDeviceEvents(entries.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()).slice(0, 8))
  }
  async function chooseDeviceCalendar(calendarId: string) {
    setDeviceCalendarId(calendarId)
    await SecureStore.setItemAsync(DEVICE_CALENDAR_ID_KEY, calendarId)
    await refreshDeviceCalendar(calendarId)
  }
  async function connectDeviceCalendar() {
    setDeviceBusy(true)
    setMessage('')
    try {
      const calendarPermission = await DeviceCalendar.requestCalendarPermissionsAsync()
      if (!calendarPermission.granted) throw new Error('Calendar access was not enabled. You can turn it on later in iPhone Settings.')
      await SecureStore.setItemAsync(DEVICE_CALENDAR_KEY, 'yes')
      setDeviceCalendarConnected(true)
      await loadDeviceCalendars()
      setMessage('Your selected device calendar and event reminders are connected.')
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : 'The device calendar could not connect.')
    } finally {
      setDeviceBusy(false)
    }
  }
  function importDeviceEvent(event: DeviceCalendar.Event) {
    const start = new Date(event.startDate)
    setEditing(undefined)
    setTitle(event.title || '')
    setEventDate(dateKey(start))
    setLocation(event.location || '')
    setNotes(event.notes || '')
    setStatus('Planned')
    setCheetoAttending(false)
    setChecklist([])
    setImportedDeviceEventId(event.id)
    setMessage('Review this calendar event, then save it to share with the team.')
    setOpen(true)
  }
  async function syncDeviceEvent(event: CalendarEvent) {
    if (!deviceCalendarConnected) return
    const permission = await DeviceCalendar.getCalendarPermissionsAsync()
    if (!permission.granted) return
    const calendarId = deviceCalendarId || (await DeviceCalendar.getDefaultCalendarAsync()).id
    const startDate = new Date(`${event.event_date.match(/^\d{4}-\d{2}-\d{2}/)?.[0]}T09:00:00`)
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000)
    const details = {
      title: event.title,
      startDate,
      endDate,
      location: event.location || undefined,
      notes: event.notes || undefined,
      alarms: [
        { relativeOffset: -14 * 24 * 60 },
        { relativeOffset: -24 * 60 },
        { relativeOffset: 0 },
        { relativeOffset: 24 * 60 },
      ],
    }
    const savedDeviceId = await SecureStore.getItemAsync(`${DEVICE_EVENT_PREFIX}${event.id}`)
    let deviceId = savedDeviceId
    if (savedDeviceId) {
      try { await DeviceCalendar.updateEventAsync(savedDeviceId, details) }
      catch { deviceId = await DeviceCalendar.createEventAsync(calendarId, details) }
    } else {
      deviceId = await DeviceCalendar.createEventAsync(calendarId, details)
    }
    if (deviceId) await SecureStore.setItemAsync(`${DEVICE_EVENT_PREFIX}${event.id}`, deviceId)
    await refreshDeviceCalendar()
  }
  function edit(event?: CalendarEvent, requestedDate?: string) {
    setEditing(event)
    setTitle(event?.title || '')
    setEventDate(event?.event_date.match(/^\d{4}-\d{2}-\d{2}/)?.[0] || requestedDate || dateKey())
    setLocation(event?.location || '')
    setNotes(event?.notes || '')
    setStatus(event?.status || 'Planned')
    setCheetoAttending(Boolean(event?.cheeto_attending))
    setChecklist(event?.checklist || [])
    setNewChecklistItem('')
    setNewAssignee('')
    setImportedDeviceEventId('')
    setMessage('')
    setOpen(true)
  }
  function chooseCalendarDate(value: string, dayEvents: CalendarEvent[]) {
    if (open && canManage) {
      setEventDate(value)
      setMessage('')
      return
    }
    if (dayEvents.length) {
      Alert.alert(
        'Events on this date',
        'Open an event to edit it, or add another one.',
        [
          ...dayEvents.slice(0, 2).map((event) => ({ text: `${canManage ? 'Edit' : 'Open'} ${event.title}`, onPress: () => edit(event) })),
          ...(canManage ? [{ text: 'Add another event', onPress: () => edit(undefined, value) }] : []),
          { text: 'Cancel', style: 'cancel' as const },
        ],
      )
      return
    }
    if (canManage) edit(undefined, value)
  }
  function planningEventsOn(value: string) {
    return events.flatMap((event) =>
      planningStages
        .filter((stage) => stage.offset !== 0 && shiftedDateKey(event.event_date, stage.offset) === value)
        .map((stage) => ({ event, stage })),
    )
  }
  function chooseCalendarCell(value: string, dayEvents: CalendarEvent[]) {
    if (open || dayEvents.length) {
      chooseCalendarDate(value, dayEvents)
      return
    }
    const reminders = planningEventsOn(value)
    if (!reminders.length) {
      chooseCalendarDate(value, dayEvents)
      return
    }
    Alert.alert(
      'Event planning day',
      reminders.map(({ event, stage }) => `${stage.symbol} ${stage.title}: ${event.title}`).join('\n'),
      [
        ...reminders.slice(0, 2).map(({ event }) => ({ text: `Open ${event.title}`, onPress: () => edit(event) })),
        ...(canManage ? [{ text: 'Add an event here', onPress: () => edit(undefined, value) }] : []),
        { text: 'Cancel', style: 'cancel' as const },
      ],
    )
  }
  async function searchLocation() {
    const query = location.trim()
    if (!query) {
      setMessage('Enter a venue or address first, then tap Search location.')
      return
    }
    try {
      await Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`)
    } catch {
      setMessage('Maps could not open. Check the address and try again.')
    }
  }
  async function save() {
    if (!title.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(eventDate)) {
      setMessage('Add an event name and a date like 2026-10-03.')
      return
    }
    setSaving(true)
    try {
      const saved = await saveCalendar(token, { id: editing?.id, title, eventDate, location, notes, status, cheetoAttending })
      const result = await loadCalendar(token)
      setEvents(result.events); setAssignees(result.assignees)
      const refreshed = result.events.find((item) => item.id === saved.id) || { ...saved, checklist: [] }
      setEditing(refreshed); setChecklist(refreshed.checklist || [])
      if (importedDeviceEventId) {
        await SecureStore.setItemAsync(`${DEVICE_EVENT_PREFIX}${refreshed.id}`, importedDeviceEventId)
        setImportedDeviceEventId('')
      }
      await syncDeviceEvent(refreshed)
      setMessage(deviceCalendarConnected ? 'Saved for the team, your selected calendar, and event reminders.' : 'Saved to the same calendar used by Studio.')
    } catch (reason) { setMessage(reason instanceof Error ? reason.message : 'That event could not be saved.') }
    finally { setSaving(false) }
  }
  async function addChecklistItem() {
    if (!editing?.id || !newChecklistItem.trim()) return
    setSaving(true)
    try {
      const item = await saveChecklistItem(token, editing.id, { label: newChecklistItem, completed: false, assignedTo: newAssignee })
      setChecklist((current) => [...current, item])
      setEvents((current) => current.map((event) => event.id === editing.id ? { ...event, checklist: [...(event.checklist || []), item] } : event))
      setNewChecklistItem('')
    } catch (reason) { setMessage(reason instanceof Error ? reason.message : 'That checklist item could not be saved.') }
    finally { setSaving(false) }
  }
  async function toggleChecklistItem(item: CalendarEvent['checklist'][number]) {
    if (!editing?.id) return
    const updated = await toggleCalendarChecklistItem(token, editing.id, item.id, !item.completed)
    setChecklist((current) => current.map((entry) => entry.id === item.id ? updated : entry))
    setEvents((current) => current.map((event) => event.id === editing.id ? { ...event, checklist: (event.checklist || []).map((entry) => entry.id === item.id ? updated : entry) } : event))
  }
  async function removeChecklistItem(item: CalendarEvent['checklist'][number]) {
    if (!editing?.id) return
    await deleteChecklistItem(token, editing.id, item.id)
    setChecklist((current) => current.filter((entry) => entry.id !== item.id))
    setEvents((current) => current.map((event) => event.id === editing.id ? { ...event, checklist: (event.checklist || []).filter((entry) => entry.id !== item.id) } : event))
  }
  return (
    <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
      <Text style={styles.eyebrow}>SHARED EVENT CALENDAR</Text>
      <Text style={styles.pageTitle}>Plan once. See it everywhere.</Text>
      <Text style={styles.copy}>Events saved here appear on the same calendar used by the Creative Studio.</Text>
      {canManage ? <>
      <View style={styles.deviceCalendarCard}>
        <View style={styles.grow}>
          <Text style={styles.cardTitle}>{deviceCalendarConnected ? 'Phone calendar connected ✓' : 'Connect iCloud or Google Calendar'}</Text>
          <Text style={styles.cardCopy}>{deviceCalendarConnected ? 'Shared events use the calendar selected below and local planning reminders are scheduled.' : 'Choose any writable iCloud or Google calendar already connected to this phone.'}</Text>
        </View>
        <Pressable disabled={deviceBusy} onPress={() => deviceCalendarConnected ? refreshDeviceCalendar() : connectDeviceCalendar()} style={styles.deviceCalendarButton}><Text style={styles.deviceCalendarButtonText}>{deviceBusy ? 'Connecting…' : deviceCalendarConnected ? 'Refresh' : 'Connect'}</Text></Pressable>
      </View>
      {deviceCalendarConnected && deviceCalendars.length ? (
        <View style={styles.deviceCalendarChoices}>
          <Text style={styles.label}>Calendar to use</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.choices}>
            {deviceCalendars.map((calendar) => (
              <Pressable key={calendar.id} onPress={() => chooseDeviceCalendar(calendar.id)} style={[styles.choice, deviceCalendarId === calendar.id && styles.choiceActive]}>
                <Text style={[styles.choiceText, deviceCalendarId === calendar.id && styles.choiceTextActive]}>{calendar.title}{calendar.source?.name ? ` · ${calendar.source.name}` : ''}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ) : null}
      {deviceCalendarConnected && deviceEvents.length ? (
        <View style={styles.deviceEvents}>
          <Text style={styles.label}>Upcoming on this device · tap to share with the team</Text>
          {deviceEvents.slice(0, 4).map((event) => (
            <Pressable key={event.id} onPress={() => importDeviceEvent(event)} style={styles.deviceEventRow}>
              <View style={styles.grow}><Text style={styles.checklistLabel}>{event.title || 'Untitled event'}</Text><Text style={styles.assignment}>{displayDate(dateKey(new Date(event.startDate)))}{event.location ? ` · ${event.location}` : ''}</Text></View><Text style={styles.arrow}>›</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      </> : null}
      {(() => { const month = monthCells(monthOffset); return <View style={styles.monthCard}><View style={styles.monthHeader}><Pressable onPress={() => setMonthOffset((value) => value - 1)}><Text style={styles.monthArrow}>‹</Text></Pressable><Text style={styles.monthTitle}>{month.label}</Text><Pressable onPress={() => setMonthOffset((value) => value + 1)}><Text style={styles.monthArrow}>›</Text></Pressable></View><View style={styles.weekRow}>{['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => <Text key={`${day}-${index}`} style={styles.weekDay}>{day}</Text>)}</View><View style={styles.monthGrid}>{month.cells.map((cell) => { const dayEvents = cell.day ? events.filter((event) => event.event_date.match(/^\d{4}-\d{2}-\d{2}/)?.[0] === cell.key) : []; const reminders = cell.day ? planningEventsOn(cell.key) : []; const selected = open && cell.key === eventDate; const marks = dayEvents.some((event) => event.cheeto_attending) ? '🐱' : dayEvents.length ? '•' : reminders.length ? [...new Set(reminders.map(({ stage }) => stage.symbol))].join('') : '+'; return cell.day ? <Pressable accessibilityRole="button" accessibilityLabel={`${open ? 'Select' : dayEvents.length ? 'Open events on' : reminders.length ? 'Open planning for' : 'Add event on'} ${cell.key}`} key={cell.key} onPress={() => chooseCalendarCell(cell.key, dayEvents)} style={({ pressed }) => [styles.dayCell, selected && styles.dayCellSelected, pressed && styles.dayCellPressed]}><Text style={[styles.dayNumber, selected && styles.dayNumberSelected]}>{cell.day}</Text><Text numberOfLines={1} style={[styles.dayMarks, selected && styles.dayNumberSelected]}>{marks}</Text></Pressable> : <View key={cell.key} style={styles.dayCell} /> })}</View><Text style={styles.calendarLegend}>{open ? 'Tap a date to change this event’s date' : 'Tap a date to add or edit events'} · 🐱 Cheeto · • Event · ◇ 2 weeks · ▣ Day before · ✓ Follow-up</Text></View> })()}
      {open || canManage ? <Pressable accessibilityRole="button" accessibilityLabel={open ? 'Back' : 'Plan an event'} onPress={() => open ? setOpen(false) : edit()} style={styles.secondary}><Text style={styles.secondaryText}>{open ? '‹ Back' : '+ Plan an event'}</Text></Pressable> : null}
      {open ? (
        <View style={styles.formCard}>
          <Text style={styles.label}>Event name</Text>
          <TextInput editable={canManage} value={title} onChangeText={setTitle} placeholder="Market, pop-up, trail day…" placeholderTextColor="#8b8075" style={styles.input} />
          <Text style={styles.label}>Date</Text>
          <TextInput editable={canManage} value={eventDate} onChangeText={setEventDate} placeholder="YYYY-MM-DD" placeholderTextColor="#8b8075" keyboardType="numbers-and-punctuation" style={styles.input} />
          <Text style={styles.label}>Location</Text>
          <TextInput editable={canManage} value={location} onChangeText={setLocation} placeholder="Venue name or street address" placeholderTextColor="#8b8075" style={styles.input} />
          <Pressable onPress={searchLocation} style={styles.locationButton}><Text style={styles.locationButtonText}>Search location in Maps ↗</Text></Pressable>
          <Text style={styles.label}>Who to meet · event contact</Text>
          <TextInput editable={canManage} value={notes} onChangeText={setNotes} placeholder="Contact name, phone number, booth instructions, or arrival details" placeholderTextColor="#8b8075" multiline style={[styles.input, styles.notes]} />
          <View style={styles.choices}>{(['Planned', 'Confirmed', 'Done', 'Canceled'] as const).map((item) => <Pressable disabled={!canManage} key={item} onPress={() => setStatus(item)} style={[styles.choice, status === item && styles.choiceActive]}><Text style={[styles.choiceText, status === item && styles.choiceTextActive]}>{item}</Text></Pressable>)}</View>
          <Pressable disabled={!canManage} onPress={() => setCheetoAttending((value) => !value)} style={styles.cheetoToggle}><View style={[styles.checkBox, cheetoAttending && styles.checkBoxDone]}><Text style={styles.checkMark}>{cheetoAttending ? '✓' : ''}</Text></View><View style={styles.grow}><Text style={styles.cardTitle}>Cheeto is attending 🐱</Text><Text style={styles.cardCopy}>{cheetoAttending ? 'His event checklist is included.' : 'His checklist stays out of this event.'}</Text></View></Pressable>
          {message ? <Text style={message.startsWith('Saved') ? styles.success : styles.error}>{message}</Text> : null}
          {canManage ? <Pressable disabled={saving} onPress={save} style={[styles.primary, saving && styles.disabled]}><Text style={styles.primaryText}>{saving ? 'Saving…' : editing ? 'Update shared event' : 'Save shared event'}</Text></Pressable> : <Text style={styles.cardCopy}>Event details are read-only for helpers. You can still complete checklist items below.</Text>}
          {editing?.id ? (
            <View style={styles.checklistSection}>
              <Text style={styles.cardTitle}>Event checklist</Text>
              <Text style={styles.cardCopy}>Tasks are grouped by when they need attention. Their symbols also appear on the calendar.</Text>
              {planningStages.map((stage) => {
                const items = checklist.filter((item) => checklistStage(item.label) === stage.key)
                if (!items.length) return null
                return (
                  <View key={stage.key} style={styles.stageCard}>
                    <View style={styles.stageHeading}>
                      <Text style={styles.stageSymbol}>{stage.symbol}</Text>
                      <View style={styles.grow}>
                        <Text style={styles.stageTitle}>{stage.title}</Text>
                        <Text style={styles.stageDate}>{displayDate(shiftedDateKey(eventDate, stage.offset))} · {items.filter((item) => item.completed).length}/{items.length} done</Text>
                      </View>
                    </View>
                    {items.map((item) => (
                      <View key={item.id} style={styles.checklistRow}>
                        <Pressable onPress={() => toggleChecklistItem(item)} style={[styles.checkBox, item.completed && styles.checkBoxDone]}><Text style={styles.checkMark}>{item.completed ? '✓' : ''}</Text></Pressable>
                        <View style={styles.grow}><Text style={[styles.checklistLabel, item.completed && styles.checklistLabelDone]}>{item.label}</Text>{item.assignedTo ? <Text style={styles.assignment}>Assigned to {item.assignedTo}</Text> : <Text style={styles.assignment}>Anyone can take this</Text>}</View>
                        {canManage ? <Pressable onPress={() => removeChecklistItem(item)}><Text style={styles.removeText}>Remove</Text></Pressable> : null}
                      </View>
                    ))}
                  </View>
                )
              })}
              {canManage ? <>
                <Text style={styles.label}>Assign new day-before task to</Text>
                <View style={styles.choices}><Pressable onPress={() => setNewAssignee('')} style={[styles.choice, !newAssignee && styles.choiceActive]}><Text style={[styles.choiceText, !newAssignee && styles.choiceTextActive]}>Anyone</Text></Pressable>{assignees.map((name) => <Pressable key={name} onPress={() => setNewAssignee(name)} style={[styles.choice, newAssignee === name && styles.choiceActive]}><Text style={[styles.choiceText, newAssignee === name && styles.choiceTextActive]}>{name}</Text></Pressable>)}</View>
                <View style={styles.checklistAdd}><TextInput value={newChecklistItem} onChangeText={setNewChecklistItem} onSubmitEditing={addChecklistItem} placeholder="Tablecloth, reader, cash box…" placeholderTextColor="#8b8075" style={[styles.input, styles.grow]} /><Pressable disabled={saving || !newChecklistItem.trim()} onPress={addChecklistItem} style={[styles.addButton, (saving || !newChecklistItem.trim()) && styles.disabled]}><Text style={styles.primaryText}>Add</Text></Pressable></View>
              </> : null}
            </View>
          ) : <Text style={styles.cardCopy}>Save the event first, then its shared checklist will appear here.</Text>}
        </View>
      ) : null}
      <View style={styles.sectionHeading}><Text style={styles.sectionTitle}>Upcoming</Text><Pressable onPress={refresh}><Text style={styles.link}>Refresh</Text></Pressable></View>
      {loading ? <ActivityIndicator color={colors.terracotta} /> : events.length ? events.map((event) => (
        <Pressable key={event.id} onPress={() => edit(event)} style={styles.eventCard}>
          <View style={styles.eventDate}><Text style={styles.eventDateText}>{event.event_date.match(/-(\d{2})$/)?.[1]}</Text></View>
          <View style={styles.grow}><View style={styles.row}><Text style={styles.cardTitle}>{event.cheeto_attending ? '🐱 ' : ''}{event.title}</Text><Text style={styles.pill}>{event.status}</Text></View><Text style={styles.meta}>{displayDate(event.event_date)}{event.location ? ` · ${event.location}` : ''}</Text>{event.notes ? <Text numberOfLines={2} style={styles.cardCopy}>{event.notes}</Text> : null}{event.checklist?.length ? <Text style={styles.cardCopy}>{event.checklist.filter((item) => item.completed).length}/{event.checklist.length} checklist items finished</Text> : null}</View>
          <Text style={styles.arrow}>›</Text>
        </Pressable>
      )) : <View style={styles.empty}><Text style={styles.cardTitle}>The trail ahead is open.</Text><Text style={styles.cardCopy}>Plan the first market or pop-up when you are ready.</Text></View>}
    </ScrollView>
  )
}

function eventMoney(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

function Register({ token }: { token: string }) {
  const [products, setProducts] = useState<EventProduct[]>([]);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [tendered, setTendered] = useState('');
  const [pending, setPending] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [mode, setMode] = useState('');
  const [quote, setQuote] = useState<any>(null);
  const [adjustSku, setAdjustSku] = useState('');
  const [adjustDelta, setAdjustDelta] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const inFlight = useRef(false);
  const savedKey = 'np-commerce-pending';
  const items = products.filter(p => (cart[p.sku] || 0) > 0).map(p => ({ sku: p.sku, quantity: cart[p.sku] || 0 }));
  const subtotal = items.reduce((sum, item) => sum + (products.find(p => p.sku === item.sku)?.unitPriceCents || 0)*item.quantity, 0);
  async function refresh() {
    const [catalog, history] = await Promise.all([commerceRequest('/products', token), commerceRequest('/orders', token)]);
    setProducts(catalog.products.filter((p: any) => p.active)); setMode(catalog.mode); setOrders(history.orders);
  }
  useEffect(() => { refresh().catch(e => setError(e.message)); SecureStore.getItemAsync(savedKey).then(value => { if(value) setPending(JSON.parse(value)); }).catch(() => setError('A saved sale could not be recovered. Check order history before charging again.')); }, []);
  async function savePending(value: any) { await SecureStore.setItemAsync(savedKey, JSON.stringify(value)); setPending(value); }
  async function finish(message: string) { await SecureStore.deleteItemAsync(savedKey); setPending(null); setCart({}); setTendered(''); setQuote(null); setMessage(message); await refresh(); }
  async function checkPayment() {
    if(!pending?.result) return;
    setBusy(true); setError('');
    try { const result = await commerceRequest(`/status?id=${encodeURIComponent(pending.result.id)}&token=${encodeURIComponent(pending.result.statusToken)}`, token);
      if(result.status === 'paid') await finish('Payment confirmed. Sale recorded.');
      else if(result.status === 'cancelled') await finish('Checkout expired. No sale recorded.');
      else setMessage(`Order status: ${result.status}. Do not charge again while payment is pending.`);
    } catch(e: any) { setError(e.message); } finally { setBusy(false); }
  }
  async function takePayment(method: 'cash' | 'stripe') {
    if(inFlight.current) return; inFlight.current=true; setBusy(true); setError('');
    try {
      let sale = pending;
      if(!sale) {
        sale = { method, body: { requestId: Crypto.randomUUID(), channel: 'pos', items, ...(method === 'cash' ? { tenderedCents: Math.round(Number(tendered)*100) } : {}) } };
        await savePending(sale);
      }
      const result = await commerceRequest(sale.method === 'cash' ? '/cash' : '/checkout', token, sale.body);
      if(sale.method === 'cash') await finish(`Cash sale recorded. Change: ${eventMoney(result.changeCents)}.`);
      else { await savePending({ ...sale, result }); setMessage('Customer scans the QR code. Check payment status before handing over the products.'); }
    } catch(e: any) {
      if ([400,401,403].includes(e.status) || e.code === 'out_of_stock') { await SecureStore.deleteItemAsync(savedKey); setPending(null); setError(e.message); }
      else setError(`${e.message} Retry the saved sale; do not create a second charge.`);
    }
    finally { inFlight.current=false; setBusy(false); }
  }
  async function getQuote() { setBusy(true); setError(''); try { setQuote(await commerceRequest('/quote', token, { items, channel: 'pos' })); } catch(e: any) { setError(e.message); } finally { setBusy(false); } }
  async function adjustStock() {
    if(inFlight.current) return; inFlight.current=true; setBusy(true); setError('');
    try {
      const requestKey = 'np-stock-adjustment';
      const previous = await SecureStore.getItemAsync(requestKey);
      const adjustment = previous ? JSON.parse(previous) : { requestId: Crypto.randomUUID(), sku: adjustSku.trim(), delta: Number(adjustDelta), reason: adjustReason.trim() };
      await SecureStore.setItemAsync(requestKey, JSON.stringify(adjustment));
      await commerceRequest('/inventory', token, adjustment);
      await SecureStore.deleteItemAsync(requestKey); setMessage('Inventory adjustment recorded.'); setAdjustDelta(''); setAdjustReason(''); await refresh();
    } catch(e: any) { if(e.status === 400) await SecureStore.deleteItemAsync('np-stock-adjustment'); setError(e.message); } finally { inFlight.current=false; setBusy(false); }
  }
  async function cashRefund(order: any) {
    if(inFlight.current) return; inFlight.current=true; setBusy(true); setError('');
    try {
      const saved = await SecureStore.getItemAsync('np-cash-refund');
      const body = saved ? JSON.parse(saved) : {requestId:Crypto.randomUUID(),orderId:order.id,amountCents:order.total_cents-order.refunded_cents};
      await SecureStore.setItemAsync('np-cash-refund',JSON.stringify(body));
      await commerceRequest('/cash-refund',token,body); await SecureStore.deleteItemAsync('np-cash-refund');
      setMessage('Cash refund recorded. Returned items are restocked separately after inspection.'); await refresh();
    }catch(e:any){if(e.status===400) await SecureStore.deleteItemAsync('np-cash-refund');setError(e.message);}finally{inFlight.current=false;setBusy(false);}
  }
  return <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
    <View style={styles.sectionHeading}><Text style={styles.eyebrow}>EVENT REGISTER</Text><Text style={styles.pageTitle}>A calm little checkout.</Text><Text style={styles.copy}>Shared stock and prices · {mode === 'test' ? 'Test payments only' : mode === 'live' ? 'Live payments' : 'Connecting…'}</Text></View>
    {error ? <Text accessibilityRole="alert" style={{color: colors.terracottaDeep}}>{error}</Text> : null}
    {message ? <Text style={styles.copy}>{message}</Text> : null}
    {products.map(product => <View key={product.sku} style={styles.productCard}>
      <Image source={{uri: `${API_URL}${product.image}`}} style={styles.productImage}/>
      <View style={{flex:1}}><Text style={styles.cardTitle}>{product.name}</Text><Text style={styles.meta}>{eventMoney(product.unitPriceCents)} · {product.stock} available</Text></View>
      <Pressable disabled={busy || !!pending} onPress={() => {setCart(c => ({...c, [product.sku]: Math.max(0, (c[product.sku] || 0)-1)})); setQuote(null);}}><Text style={{padding:12}}>−</Text></Pressable>
      <Text>{cart[product.sku] || 0}</Text>
      <Pressable disabled={busy || !!pending || (cart[product.sku] || 0) >= product.stock} onPress={() => {setCart(c => ({...c, [product.sku]: Math.min(product.stock, (c[product.sku] || 0)+1)})); setQuote(null);}}><Text style={{padding:12}}>+</Text></Pressable>
    </View>)}
    <View style={styles.formCard}><Text style={styles.cardTitle}>Products: {eventMoney(subtotal)}</Text>
      {quote ? <Text>Tax: {eventMoney(quote.taxCents)} · Total: {eventMoney(quote.totalCents)}</Text> : null}
      <Pressable disabled={busy || !items.length || !!pending} onPress={getQuote}><Text style={{padding:12}}>Calculate total</Text></Pressable>
      <TextInput accessibilityLabel="Cash tendered in dollars" placeholder="Cash tendered ($)" keyboardType="decimal-pad" value={tendered} editable={!busy && !pending} onChangeText={setTendered} style={{padding:12, backgroundColor: colors.white}}/>
      <Pressable disabled={busy || !!pending || !items.length || !quote || !Number.isFinite(Number(tendered)) || Number(tendered)*100 < quote.totalCents} onPress={() => takePayment('cash')} style={styles.primary}><Text style={styles.primaryText}>Confirm cash received</Text></Pressable>
      <Pressable disabled={busy || !!pending || !items.length} onPress={() => takePayment('stripe')} style={styles.primary}><Text style={styles.primaryText}>Create payment QR</Text></Pressable>
      {pending?.result?.qrDataUrl ? <Image source={{uri: pending.result.qrDataUrl}} style={{width:280,height:280,alignSelf:'center'}}/> : null}
      {pending?.result ? <Pressable disabled={busy} onPress={checkPayment}><Text style={{padding:12}}>Check payment status</Text></Pressable> : null}
      {pending && !pending.result ? <Pressable disabled={busy} onPress={() => takePayment(pending.method)}><Text style={{padding:12}}>Retry saved sale</Text></Pressable> : null}
      {pending?.result ? <Pressable disabled={busy} onPress={async () => {setBusy(true); try {const result = await commerceRequest('/cancel', token, {id:pending.result.id, statusToken:pending.result.statusToken}); if(result.status === 'cancelled') await finish('Checkout cancelled.'); else setMessage(`Order status: ${result.status}. Check payment before proceeding.`);} catch(e:any) {setError(e.message);} finally {setBusy(false);}}}><Text style={{padding:12}}>Cancel unpaid checkout</Text></Pressable> : null}
    </View>
    <Text style={styles.cardTitle}>Recent orders</Text>
    <Pressable disabled={busy} onPress={() => refresh().catch(e => setError(e.message))}><Text style={{padding:12}}>Refresh orders and stock</Text></Pressable>
    <Pressable disabled={busy} onPress={async () => {setBusy(true); try {await commerceRequest('/reconcile',token,{}); await refresh(); setMessage('Pending Stripe orders checked against the payment provider.');}catch(e:any){setError(e.message);}finally{setBusy(false);}}}><Text style={{padding:12}}>Reconcile pending payments</Text></Pressable>
    {orders.map(order => <View key={order.id} style={{paddingVertical:10}}><Text>{order.id.slice(0,8)} · {order.method} · {order.status}</Text><Text>{eventMoney(order.total_cents)}{order.refunded_cents ? ` · refunded ${eventMoney(order.refunded_cents)}` : ''}</Text>
      {order.items?.map((item:any)=><Text key={item.sku} style={styles.meta}>{item.quantity} × {item.name}</Text>)}
      {order.shipping_details ? <Text style={styles.meta}>{order.shipping_details.name}{'\n'}{Object.values(order.shipping_details.address || {}).filter(Boolean).join(', ')}</Text> : null}
      {order.method === 'cash' && order.refunded_cents < order.total_cents && ['paid','partially_refunded'].includes(order.status) ? <Pressable disabled={busy} onPress={()=>Alert.alert('Record cash refund?',`Confirm you are returning ${eventMoney(order.total_cents-order.refunded_cents)} in cash. Inventory is adjusted separately.`,[{text:'Cancel',style:'cancel'},{text:'Confirm cash returned',onPress:()=>cashRefund(order)}])}><Text style={{paddingVertical:10}}>Record remaining cash refund</Text></Pressable> : null}
    </View>)}
    <Text style={styles.cardTitle}>Inventory adjustment</Text>
    <Text style={styles.copy}>Use component SKUs for stock counts. Bundles share their component inventory.</Text>
    <TextInput accessibilityLabel="Inventory SKU" placeholder="SKU (for example NP-PEZ-LION)" value={adjustSku} onChangeText={setAdjustSku}/>
    <TextInput accessibilityLabel="Inventory quantity change" placeholder="Quantity change (+ or −)" value={adjustDelta} onChangeText={setAdjustDelta} keyboardType="numbers-and-punctuation"/>
    <TextInput accessibilityLabel="Inventory reason" placeholder="Reason (opening count, return, damage…)" value={adjustReason} onChangeText={setAdjustReason}/>
    <Pressable disabled={busy || !!pending} onPress={adjustStock}><Text style={{padding:12}}>Record stock change</Text></Pressable>
    <Text style={styles.copy}>Payments require an internet connection. A pending order is not a confirmed sale.</Text>
  </ScrollView>;
}

function StaffAccess({ token }: { token: string }) {
  const [staff, setStaff] = useState<EventStaff[]>([])
  const [name, setName] = useState('')
  const [role, setRole] = useState<EventStaff['role']>('helper')
  const [newCode, setNewCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  async function refresh() {
    setBusy(true); setMessage('')
    try { setStaff((await loadEventStaff(token)).staff) }
    catch (reason) { setMessage(reason instanceof Error ? reason.message : 'Staff access could not load.') }
    finally { setBusy(false) }
  }
  useEffect(() => { refresh().catch(() => {}) }, [token])
  async function add() {
    if (!name.trim()) { setMessage('Add the helper’s name first.'); return }
    setBusy(true); setMessage(''); setNewCode('')
    try {
      const result = await createEventStaff(token, name, role)
      setStaff((current) => [result.staff, ...current])
      setNewCode(result.accessCode)
      setName('')
      Alert.alert('Private access code created', `${result.staff.display_name}: ${result.accessCode}\n\nYou can tap their name to view this same code again.`)
    } catch (reason) { setMessage(reason instanceof Error ? reason.message : 'That helper could not be added.') }
    finally { setBusy(false) }
  }
  async function toggle(item: EventStaff) {
    setBusy(true); setMessage('')
    try {
      const result = await setEventStaffActive(token, item.id, !item.active)
      setStaff((current) => current.map((entry) => entry.id === item.id ? result.staff : entry))
    } catch (reason) { setMessage(reason instanceof Error ? reason.message : 'That access could not be changed.') }
    finally { setBusy(false) }
  }
  function resetCode(item: EventStaff) {
    Alert.alert(
      `Create a new code for ${item.display_name}?`,
      'Only use this if their current code is lost or compromised. Their current code will stop working immediately.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Create new code', style: 'destructive', onPress: async () => {
          setBusy(true); setMessage(''); setNewCode('')
          try {
            const result = await rotateEventStaffCode(token, item.id)
            setStaff((current) => current.map((entry) => entry.id === item.id ? result.staff : entry))
            setNewCode(result.accessCode)
            Alert.alert('New private access code', `${result.staff.display_name}: ${result.accessCode}\n\nThe previous code no longer works. This new code will remain viewable from their name.`)
          } catch (reason) { setMessage(reason instanceof Error ? reason.message : 'A replacement code could not be created.') }
          finally { setBusy(false) }
        } },
      ],
    )
  }
  async function viewCode(item: EventStaff) {
    if (!item.has_saved_code) {
      Alert.alert(
        `${item.display_name} has an older code`,
        'That code was created before reusable viewing was added. Reset it once, and the new code will remain available here afterward.',
        [{ text: 'Cancel', style: 'cancel' }, { text: 'Reset code once', onPress: () => resetCode(item) }],
      )
      return
    }
    setBusy(true); setMessage('')
    try {
      const result = await viewEventStaffCode(token, item.id)
      Alert.alert(`${result.displayName}’s access code`, result.accessCode, [
        { text: 'Done' },
        { text: 'Reset code', style: 'destructive', onPress: () => resetCode(item) },
      ])
    } catch (reason) { setMessage(reason instanceof Error ? reason.message : 'That code could not be displayed.') }
    finally { setBusy(false) }
  }
  return (
    <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
      <Text style={styles.eyebrow}>EVENT HELP</Text>
      <Text style={styles.pageTitle}>Everyone gets her own key.</Text>
      <Text style={styles.copy}>Create one private code for CatNana or each hired helper. Pause access after an event without disrupting anyone else.</Text>
      <View style={styles.formCard}>
        <Text style={styles.label}>Name</Text>
        <TextInput value={name} onChangeText={setName} placeholder="CatNana or helper name" placeholderTextColor="#8b8075" style={styles.input} />
        <Text style={styles.label}>Access level</Text>
        <View style={styles.choices}>{(['helper', 'manager'] as const).map((item) => <Pressable key={item} onPress={() => setRole(item)} style={[styles.choice, role === item && styles.choiceActive]}><Text style={[styles.choiceText, role === item && styles.choiceTextActive]}>{item === 'manager' ? 'Manager' : 'Event helper'}</Text></Pressable>)}</View>
        <Text style={styles.cardCopy}>{role === 'manager' ? 'Managers can run the register and calendar.' : 'Helpers can run the register and use the calendar. Only Katie manages staff.'}</Text>
        <Pressable disabled={busy} onPress={add} style={[styles.primary, busy && styles.disabled]}><Text style={styles.primaryText}>{busy ? 'Saving…' : 'Create private access code'}</Text></Pressable>
        {newCode ? <View style={styles.codeCard}><Text style={styles.eyebrow}>ACCESS CODE</Text><Text selectable style={styles.codeText}>{newCode}</Text><Text style={styles.cardCopy}>This stays the same. Tap the person below whenever you need to see it again.</Text></View> : null}
        {message ? <Text style={styles.error}>{message}</Text> : null}
      </View>
      <View style={styles.sectionHeading}><Text style={styles.sectionTitle}>People with access</Text><Pressable onPress={refresh}><Text style={styles.link}>Refresh</Text></Pressable></View>
      {staff.map((item) => <View key={item.id} style={styles.eventCard}><Pressable disabled={busy} onPress={() => viewCode(item)} style={styles.grow}><Text style={styles.cardTitle}>{item.display_name}</Text><Text style={styles.meta}>{item.role === 'manager' ? 'Manager' : 'Event helper'} · {item.active ? 'Active' : 'Paused'}</Text>{item.last_signed_in_at ? <Text style={styles.cardCopy}>Last used {new Date(item.last_signed_in_at).toLocaleDateString()}</Text> : null}<Text style={styles.staffHint}>Tap to view access code</Text></Pressable><Pressable disabled={busy} onPress={() => toggle(item)} style={styles.staffToggle}><Text style={styles.link}>{item.active ? 'Pause' : 'Restore'}</Text></Pressable></View>)}
    </ScrollView>
  )
}

export default function App() {
  const [session, setSession] = useState<StoredSession>()
  const [restoring, setRestoring] = useState(true)
  const [tab, setTab] = useState<Tab>('Calendar')
  const [calendarRequest, setCalendarRequest] = useState<{ eventId?: string; date?: string; nonce: number }>()
  const handleAppLink = useCallback((url: string | null) => {
    if (!url || !url.startsWith('nomadicpawsevents://calendar')) return
    try {
      const parsed = new URL(url)
      const eventId = parsed.searchParams.get('eventId') || undefined
      const date = parsed.searchParams.get('date') || undefined
      setCalendarRequest({ eventId, date, nonce: Date.now() })
      setTab('Calendar')
    } catch {}
  }, [])
  useEffect(() => {
    Linking.getInitialURL().then(handleAppLink).catch(() => {})
    const linkSubscription = Linking.addEventListener('url', ({ url }) => handleAppLink(url))
    SecureStore.getItemAsync(SESSION_KEY).then((raw) => {
      if (!raw) return
      const saved = JSON.parse(raw) as StoredSession
      if (saved.expiresAt > Date.now() && saved.staff) setSession(saved)
      else SecureStore.deleteItemAsync(SESSION_KEY).catch(() => {})
    }).catch(() => {}).finally(() => setRestoring(false))
    return () => linkSubscription.remove()
  }, [])
  if (restoring) return <View style={styles.center}><ActivityIndicator color={colors.terracotta} /></View>
  if (!session) return <Login onSignedIn={setSession} />
  return (
    <SafeAreaView style={styles.fill}>
      <StatusBar barStyle="dark-content" />
      <ExpoStatusBar style="dark" />
      <View style={styles.header}><View style={styles.logoMark}><Text style={styles.logoText}>NP</Text></View><View><Text style={styles.headerTitle}>Nomadic Paws</Text><Text style={styles.headerSubtitle}>{session.staff.name} · Events & Mobile Store</Text></View><Pressable onPress={async () => { await SecureStore.deleteItemAsync(SESSION_KEY); setSession(undefined) }} style={styles.signOut}><Text style={styles.signOutText}>Lock</Text></Pressable></View>
      <View style={styles.body}>{tab === 'Calendar' ? <Calendar token={session.token} permission={session.staff.permission} request={calendarRequest} onRequestHandled={() => setCalendarRequest(undefined)} /> : tab === 'Staff' ? <StaffAccess token={session.token} /> : <Register token={session.token} />}</View>
      <View style={styles.tabs}>{(['Calendar', 'Register', ...(session.staff.permission === 'owner' ? ['Staff' as const] : [])] as Tab[]).map((item) => <Pressable key={item} onPress={() => setTab(item)} style={styles.tab}><Text style={[styles.tabText, tab === item && styles.tabTextActive]}>{item}</Text></Pressable>)}</View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.cream }, center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cream }, body: { flex: 1 }, grow: { flex: 1 }, row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  loginPage: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 22, paddingVertical: 28, backgroundColor: colors.cream }, loginInner: { width: '100%', maxWidth: 520, alignSelf: 'center' }, loginCard: { marginTop: 22, padding: 20, borderRadius: 24, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.sandDeep },
  page: { padding: 24, paddingBottom: 50 }, eyebrow: { fontSize: 12, fontWeight: '900', letterSpacing: 2, color: colors.sageDeep }, heroTitle: { marginTop: 10, fontSize: 42, lineHeight: 46, fontWeight: '900', color: colors.bark }, pageTitle: { marginTop: 7, fontSize: 31, lineHeight: 35, fontWeight: '900', color: colors.bark }, copy: { marginTop: 12, fontSize: 16, lineHeight: 24, color: colors.barkSoft },
  label: { marginTop: 13, marginBottom: 7, fontSize: 13, fontWeight: '900', color: colors.bark }, input: { minHeight: 52, paddingHorizontal: 15, borderRadius: 15, borderWidth: 1, borderColor: colors.sandDeep, backgroundColor: colors.white, fontSize: 16, color: colors.bark }, notes: { minHeight: 100, paddingTop: 14, textAlignVertical: 'top' },
  primary: { marginTop: 16, minHeight: 54, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.terracotta }, primaryText: { fontSize: 16, fontWeight: '900', color: colors.white }, disabled: { opacity: 0.45 }, secondary: { marginTop: 18, minHeight: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.sandDeep, backgroundColor: colors.white }, secondaryText: { fontWeight: '900', color: colors.terracottaDeep }, error: { marginTop: 12, color: colors.red, fontWeight: '700' }, success: { marginTop: 12, color: colors.sageDeep, fontWeight: '800' },
  header: { minHeight: 84, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.sandDeep, backgroundColor: colors.white }, logoMark: { width: 44, height: 44, marginRight: 12, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.sand }, logoText: { fontWeight: '900', color: colors.sageDeep }, headerTitle: { fontSize: 20, fontWeight: '900', color: colors.bark }, headerSubtitle: { fontSize: 13, color: colors.barkSoft }, signOut: { marginLeft: 'auto', paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, borderWidth: 1, borderColor: colors.sandDeep }, signOutText: { fontWeight: '900', color: colors.terracottaDeep },
  formCard: { marginTop: 14, padding: 17, borderRadius: 22, backgroundColor: colors.sand, borderWidth: 1, borderColor: colors.sandDeep }, choices: { marginTop: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, choice: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 999, borderWidth: 1, borderColor: colors.sandDeep, backgroundColor: colors.white }, choiceActive: { backgroundColor: colors.bark }, choiceText: { fontWeight: '800', color: colors.barkSoft }, choiceTextActive: { color: colors.white }, sectionHeading: { marginTop: 26, marginBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, sectionTitle: { fontSize: 22, fontWeight: '900', color: colors.bark }, link: { fontWeight: '900', color: colors.terracottaDeep },
  monthCard: { marginTop: 18, padding: 14, borderRadius: 22, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.sandDeep }, monthHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, monthTitle: { fontSize: 17, fontWeight: '900', color: colors.bark }, monthArrow: { paddingHorizontal: 12, fontSize: 28, color: colors.terracottaDeep }, weekRow: { marginTop: 10, flexDirection: 'row' }, weekDay: { width: '14.285%', textAlign: 'center', color: colors.sageDeep, fontSize: 11, fontWeight: '900' }, monthGrid: { flexDirection: 'row', flexWrap: 'wrap' }, dayCell: { width: '14.285%', height: 45, paddingTop: 6, alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.sand }, dayCellPressed: { backgroundColor: colors.sand }, dayCellSelected: { backgroundColor: colors.terracotta, borderRadius: 10 }, dayNumber: { color: colors.bark, fontSize: 12, fontWeight: '800' }, dayNumberSelected: { color: colors.white }, dayMarks: { minHeight: 18, fontSize: 13, color: colors.terracottaDeep }, calendarLegend: { marginTop: 10, color: colors.barkSoft, fontSize: 11, textAlign: 'center' }, cheetoToggle: { marginTop: 16, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 16, backgroundColor: colors.white },
  deviceCalendarCard: { marginTop: 16, padding: 15, borderRadius: 18, borderWidth: 1, borderColor: colors.sandDeep, backgroundColor: colors.sand, flexDirection: 'row', alignItems: 'center', gap: 12 }, deviceCalendarButton: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.sandDeep }, deviceCalendarButtonText: { color: colors.terracottaDeep, fontWeight: '900' }, deviceCalendarChoices: { marginTop: 10 }, deviceEvents: { marginTop: 12, padding: 13, borderRadius: 16, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.sandDeep }, deviceEventRow: { minHeight: 50, flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.sandDeep },
  checklistSection: { marginTop: 22, paddingTop: 18, borderTopWidth: 1, borderTopColor: colors.sandDeep }, stageCard: { marginTop: 14, padding: 13, borderRadius: 16, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.sandDeep }, stageHeading: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingBottom: 7 }, stageSymbol: { width: 30, textAlign: 'center', color: colors.terracottaDeep, fontSize: 22, fontWeight: '900' }, stageTitle: { color: colors.bark, fontSize: 16, fontWeight: '900' }, stageDate: { marginTop: 2, color: colors.sageDeep, fontSize: 11, fontWeight: '800' }, checklistRow: { minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: 10, borderTopWidth: 1, borderTopColor: colors.sandDeep }, checkBox: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.sageDeep, backgroundColor: colors.white }, checkBoxDone: { backgroundColor: colors.sageDeep }, checkMark: { color: colors.white, fontWeight: '900' }, checklistLabel: { color: colors.bark, fontWeight: '700' }, checklistLabelDone: { color: colors.barkSoft, textDecorationLine: 'line-through' }, assignment: { marginTop: 2, color: colors.sageDeep, fontSize: 11, fontWeight: '800' }, removeText: { color: colors.terracottaDeep, fontSize: 12, fontWeight: '800' }, checklistAdd: { marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }, addButton: { minHeight: 52, paddingHorizontal: 18, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.terracotta }, locationButton: { alignSelf: 'flex-start', marginTop: 8, paddingVertical: 8, paddingHorizontal: 4 }, locationButtonText: { color: colors.terracottaDeep, fontWeight: '900' },
  eventCard: { marginBottom: 10, padding: 15, flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 20, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.sandDeep }, eventDate: { width: 44, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.sand }, eventDateText: { fontSize: 20, fontWeight: '900', color: colors.terracottaDeep }, cardTitle: { flexShrink: 1, fontSize: 16, fontWeight: '900', color: colors.bark }, meta: { marginTop: 4, fontSize: 12, color: colors.sageDeep, fontWeight: '700' }, cardCopy: { marginTop: 5, fontSize: 13, lineHeight: 18, color: colors.barkSoft }, pill: { marginLeft: 'auto', fontSize: 10, fontWeight: '900', color: colors.sageDeep }, arrow: { fontSize: 26, color: colors.terracottaDeep }, empty: { padding: 18, borderRadius: 20, backgroundColor: colors.sand },
  readerCard: { marginTop: 20, padding: 18, borderRadius: 22, backgroundColor: colors.sand }, testPill: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999, overflow: 'hidden', backgroundColor: colors.sageDeep, color: colors.white, fontSize: 10, fontWeight: '900' }, productCard: { marginBottom: 10, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 20, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.sandDeep }, productImage: { width: 58, height: 58, borderRadius: 14, backgroundColor: colors.sand }, quantity: { flexDirection: 'row', alignItems: 'center', gap: 7 }, quantityButton: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.sand }, quantityText: { fontSize: 18, fontWeight: '900', color: colors.bark }, quantityValue: { minWidth: 18, textAlign: 'center', fontWeight: '900', color: colors.bark }, cartCard: { marginTop: 20, padding: 18, borderRadius: 22, backgroundColor: colors.bark }, cartLabel: { marginTop: 12, flex: 1, color: colors.sand }, cartTotal: { marginTop: 12, fontSize: 22, fontWeight: '900', color: colors.white },
  readerChoice: { marginTop: 10, padding: 13, borderRadius: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.white },
  cartMethodLabel: { marginTop: 16, marginBottom: 7, color: colors.sand, fontSize: 13, fontWeight: '900' }, cartChoices: { flexDirection: 'row', gap: 8 }, cartChoice: { flex: 1, paddingVertical: 11, alignItems: 'center', borderRadius: 14, borderWidth: 1, borderColor: colors.barkSoft }, cartChoiceActive: { backgroundColor: colors.white, borderColor: colors.white }, cartChoiceText: { color: colors.sand, fontWeight: '900' }, cartChoiceTextActive: { color: colors.bark }, cashInput: { minHeight: 50, paddingHorizontal: 15, borderRadius: 14, backgroundColor: colors.white, color: colors.bark, fontSize: 20, fontWeight: '900' }, cartHint: { marginTop: 7, color: colors.sandDeep, fontSize: 12, lineHeight: 17 },
  paymentResult: { marginTop: 14, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 20, borderWidth: 1 }, paymentResultSuccess: { backgroundColor: '#eef3e9', borderColor: colors.sage }, paymentResultPending: { backgroundColor: colors.sand, borderColor: colors.sandDeep }, paymentResultError: { backgroundColor: '#faeeeb', borderColor: '#d9a49c' }, paymentResultIcon: { width: 32, height: 32, borderRadius: 16, overflow: 'hidden', textAlign: 'center', textAlignVertical: 'center', backgroundColor: colors.white, color: colors.bark, fontSize: 19, fontWeight: '900' },
  historyHelp: { marginTop: -4, marginBottom: 12, color: colors.barkSoft, fontSize: 13, lineHeight: 18 }, paymentCard: { marginBottom: 10, padding: 15, flexDirection: 'row', alignItems: 'flex-start', gap: 12, borderRadius: 20, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.sandDeep }, paymentStatusDot: { width: 11, height: 11, marginTop: 5, borderRadius: 6 }, dotSuccess: { backgroundColor: colors.sageDeep }, dotPending: { backgroundColor: '#c69b46' }, dotError: { backgroundColor: colors.red }, paymentAmount: { marginLeft: 'auto', fontWeight: '900', color: colors.bark }, receiptItems: { marginTop: 7, color: colors.barkSoft, fontSize: 12, fontWeight: '700' },
  codeCard: { marginTop: 16, padding: 16, borderRadius: 18, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.sandDeep }, codeText: { marginTop: 8, fontSize: 28, letterSpacing: 4, fontWeight: '900', color: colors.bark }, staffToggle: { paddingHorizontal: 12, paddingVertical: 10 }, staffHint: { marginTop: 6, color: colors.terracottaDeep, fontSize: 11, fontWeight: '800' },
  tabs: { minHeight: 68, flexDirection: 'row', borderTopWidth: 1, borderTopColor: colors.sandDeep, backgroundColor: colors.white }, tab: { flex: 1, alignItems: 'center', justifyContent: 'center' }, tabText: { fontWeight: '900', color: colors.barkSoft }, tabTextActive: { color: colors.terracottaDeep },
})
