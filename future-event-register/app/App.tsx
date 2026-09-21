import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
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
import { StatusBar as ExpoStatusBar } from 'expo-status-bar'
import { Reader, StripeTerminalProvider, useStripeTerminal } from '@stripe/stripe-terminal-react-native'
import {
  API_URL,
  CalendarEvent,
  createEventStaff,
  createCashSale,
  createSale,
  createSellerSession,
  createTerminalToken,
  deleteChecklistItem,
  EventProduct,
  EventSaleHistory,
  EventStaff,
  loadCalendar,
  loadEventStaff,
  loadProducts,
  loadSaleHistory,
  loadSaleStatus,
  rotateEventStaffCode,
  saveCalendar,
  saveChecklistItem,
  setEventStaffActive,
  SignedInStaff,
  viewEventStaffCode,
} from './src/api'

const SESSION_KEY = 'nomadic-paws-event-session'
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

function Calendar({ token }: { token: string }) {
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

  async function refresh() {
    setLoading(true)
    setMessage('')
    try { const result = await loadCalendar(token); setEvents(result.events); setAssignees(result.assignees) }
    catch (reason) { setMessage(reason instanceof Error ? reason.message : 'The calendar could not load.') }
    finally { setLoading(false) }
  }
  useEffect(() => { refresh().catch(() => {}) }, [token])
  function edit(event?: CalendarEvent) {
    setEditing(event)
    setTitle(event?.title || '')
    setEventDate(event?.event_date.match(/^\d{4}-\d{2}-\d{2}/)?.[0] || dateKey())
    setLocation(event?.location || '')
    setNotes(event?.notes || '')
    setStatus(event?.status || 'Planned')
    setCheetoAttending(Boolean(event?.cheeto_attending))
    setChecklist(event?.checklist || [])
    setNewChecklistItem('')
    setNewAssignee('')
    setMessage('')
    setOpen(true)
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
      setMessage('Saved to the same calendar used by Studio.')
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
    const updated = await saveChecklistItem(token, editing.id, { ...item, completed: !item.completed })
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
      {(() => { const month = monthCells(monthOffset); return <View style={styles.monthCard}><View style={styles.monthHeader}><Pressable onPress={() => setMonthOffset((value) => value - 1)}><Text style={styles.monthArrow}>‹</Text></Pressable><Text style={styles.monthTitle}>{month.label}</Text><Pressable onPress={() => setMonthOffset((value) => value + 1)}><Text style={styles.monthArrow}>›</Text></Pressable></View><View style={styles.weekRow}>{['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => <Text key={`${day}-${index}`} style={styles.weekDay}>{day}</Text>)}</View><View style={styles.monthGrid}>{month.cells.map((cell) => { const dayEvents = cell.day ? events.filter((event) => event.event_date.match(/^\d{4}-\d{2}-\d{2}/)?.[0] === cell.key) : []; return <View key={cell.key} style={styles.dayCell}>{cell.day ? <><Text style={styles.dayNumber}>{cell.day}</Text><Text numberOfLines={1} style={styles.dayMarks}>{dayEvents.some((event) => event.cheeto_attending) ? '🐱' : dayEvents.length ? '•' : ''}</Text></> : null}</View> })}</View><Text style={styles.calendarLegend}>🐱 Cheeto is attending · • Nomadic Paws event</Text></View> })()}
      <Pressable onPress={() => open ? setOpen(false) : edit()} style={styles.secondary}><Text style={styles.secondaryText}>{open ? 'Close planner' : '+ Plan an event'}</Text></Pressable>
      {open ? (
        <View style={styles.formCard}>
          <Text style={styles.label}>Event name</Text>
          <TextInput value={title} onChangeText={setTitle} placeholder="Market, pop-up, trail day…" placeholderTextColor="#8b8075" style={styles.input} />
          <Text style={styles.label}>Date</Text>
          <TextInput value={eventDate} onChangeText={setEventDate} placeholder="YYYY-MM-DD" placeholderTextColor="#8b8075" keyboardType="numbers-and-punctuation" style={styles.input} />
          <Text style={styles.label}>Location</Text>
          <TextInput value={location} onChangeText={setLocation} placeholder="Optional location" placeholderTextColor="#8b8075" style={styles.input} />
          <Text style={styles.label}>Planning notes</Text>
          <TextInput value={notes} onChangeText={setNotes} placeholder="What to bring or remember" placeholderTextColor="#8b8075" multiline style={[styles.input, styles.notes]} />
          <View style={styles.choices}>{(['Planned', 'Confirmed', 'Done', 'Canceled'] as const).map((item) => <Pressable key={item} onPress={() => setStatus(item)} style={[styles.choice, status === item && styles.choiceActive]}><Text style={[styles.choiceText, status === item && styles.choiceTextActive]}>{item}</Text></Pressable>)}</View>
          <Pressable onPress={() => setCheetoAttending((value) => !value)} style={styles.cheetoToggle}><View style={[styles.checkBox, cheetoAttending && styles.checkBoxDone]}><Text style={styles.checkMark}>{cheetoAttending ? '✓' : ''}</Text></View><View style={styles.grow}><Text style={styles.cardTitle}>Cheeto is attending 🐱</Text><Text style={styles.cardCopy}>{cheetoAttending ? 'His event checklist will be included.' : 'His checklist stays out of this event.'}</Text></View></Pressable>
          {message ? <Text style={message.startsWith('Saved') ? styles.success : styles.error}>{message}</Text> : null}
          <Pressable disabled={saving} onPress={save} style={[styles.primary, saving && styles.disabled]}><Text style={styles.primaryText}>{saving ? 'Saving…' : editing ? 'Update shared event' : 'Save shared event'}</Text></Pressable>
          {editing?.id ? <View style={styles.checklistSection}><Text style={styles.cardTitle}>Event checklist</Text><Text style={styles.cardCopy}>Shared with Katie, CatNana, and event helpers.</Text>{checklist.map((item) => <View key={item.id} style={styles.checklistRow}><Pressable onPress={() => toggleChecklistItem(item)} style={[styles.checkBox, item.completed && styles.checkBoxDone]}><Text style={styles.checkMark}>{item.completed ? '✓' : ''}</Text></Pressable><View style={styles.grow}><Text style={[styles.checklistLabel, item.completed && styles.checklistLabelDone]}>{item.label}</Text>{item.assignedTo ? <Text style={styles.assignment}>Assigned to {item.assignedTo}</Text> : <Text style={styles.assignment}>Anyone can take this</Text>}</View><Pressable onPress={() => removeChecklistItem(item)}><Text style={styles.removeText}>Remove</Text></Pressable></View>)}<Text style={styles.label}>Assign new task to</Text><View style={styles.choices}><Pressable onPress={() => setNewAssignee('')} style={[styles.choice, !newAssignee && styles.choiceActive]}><Text style={[styles.choiceText, !newAssignee && styles.choiceTextActive]}>Anyone</Text></Pressable>{assignees.map((name) => <Pressable key={name} onPress={() => setNewAssignee(name)} style={[styles.choice, newAssignee === name && styles.choiceActive]}><Text style={[styles.choiceText, newAssignee === name && styles.choiceTextActive]}>{name}</Text></Pressable>)}</View><View style={styles.checklistAdd}><TextInput value={newChecklistItem} onChangeText={setNewChecklistItem} onSubmitEditing={addChecklistItem} placeholder="Tablecloth, reader, cash box…" placeholderTextColor="#8b8075" style={[styles.input, styles.grow]} /><Pressable disabled={saving || !newChecklistItem.trim()} onPress={addChecklistItem} style={[styles.addButton, (saving || !newChecklistItem.trim()) && styles.disabled]}><Text style={styles.primaryText}>Add</Text></Pressable></View></View> : <Text style={styles.cardCopy}>Save the event first, then its shared checklist will appear here.</Text>}
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

function Register({ token }: { token: string }) {
  const [products, setProducts] = useState<EventProduct[]>([])
  const [cart, setCart] = useState<Record<string, number>>({})
  const [readers, setReaders] = useState<Reader.Type[]>([])
  const [locationId, setLocationId] = useState('')
  const [loading, setLoading] = useState(true)
  const [readerBusy, setReaderBusy] = useState(false)
  const [checkoutBusy, setCheckoutBusy] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'cash'>('card')
  const [cashTendered, setCashTendered] = useState('')
  const [sales, setSales] = useState<EventSaleHistory[]>([])
  const [lastResult, setLastResult] = useState<{ status: 'success' | 'pending' | 'error'; title: string; detail: string }>()
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const {
    initialize, discoverReaders, cancelDiscovering, connectReader,
    disconnectReader, connectedReader, retrievePaymentIntent,
    processPaymentIntent, setReaderDisplay, getLocations,
  } = useStripeTerminal({
    onUpdateDiscoveredReaders: (next) => {
      setReaders(next)
      setMessage(next.length ? `${next.length} test reader${next.length === 1 ? '' : 's'} found.` : 'Still looking for the test reader…')
    },
  })
  async function refresh() {
    setLoading(true); setError(''); setMessage('')
    try { setProducts((await loadProducts(token)).products) }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Test inventory could not load.') }
    finally { setLoading(false) }
  }
  async function refreshSales(silent = false) {
    if (!silent) setError('')
    try { setSales((await loadSaleHistory(token)).sales) }
    catch (reason) { if (!silent) setError(reason instanceof Error ? reason.message : 'Payment history could not load.') }
  }
  useEffect(() => {
    refresh().catch(() => {})
    refreshSales(true).catch(() => {})
    initialize().then((result) => {
      if (result.error) setError(result.error.message)
      else setMessage('Stripe Terminal is ready for a simulated reader.')
    })
    return () => { cancelDiscovering().catch(() => {}) }
  }, [token])
  function change(product: EventProduct, amount: number) {
    setCart((current) => ({ ...current, [product.sku]: Math.max(0, Math.min(product.stock, (current[product.sku] || 0) + amount)) }))
  }
  const subtotal = useMemo(() => products.reduce((sum, item) => sum + item.unitPriceCents * (cart[item.sku] || 0), 0), [cart, products])
  const cartItems = products.filter((item) => (cart[item.sku] || 0) > 0).map((item) => ({ sku: item.sku, quantity: cart[item.sku] || 0 }))
  async function findReader() {
    setReaderBusy(true); setError(''); setReaders([])
    try {
      let nextLocation = locationId
      if (!nextLocation) {
        const result = await getLocations({ limit: 10 })
        if (result.error) throw result.error
        nextLocation = result.locations?.[0]?.id || ''
        setLocationId(nextLocation)
      }
      if (!nextLocation) throw new Error('Create a Stripe Terminal location before connecting a test reader.')
      // The event app's test reader is a Stripe-hosted simulated reader. Using
      // internet discovery keeps testing independent of iPhone Bluetooth and
      // avoids opening the native Bluetooth scan path when no physical reader
      // is present.
      const result = await discoverReaders({
        discoveryMethod: 'internet',
        simulated: true,
        locationId: nextLocation,
        timeout: 12,
      })
      if (result.error) throw result.error
      setMessage('Opening Stripe’s simulated reader…')
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'The test reader could not start.') }
    finally { setReaderBusy(false) }
  }
  async function connect(reader: Reader.Type) {
    setReaderBusy(true); setError('')
    try {
      await cancelDiscovering().catch(() => {})
      const result = await connectReader({
        discoveryMethod: 'internet',
        reader,
        failIfInUse: true,
      })
      if (result.error) throw result.error
      setMessage('Simulated Stripe reader connected. Test cards only.')
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'The test reader could not connect.') }
    finally { setReaderBusy(false) }
  }
  async function waitForPaid(saleId: string) {
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const result = await loadSaleStatus(token, saleId)
      if (result.sale.status === 'paid') return true
      await new Promise((resolve) => setTimeout(resolve, 1250))
    }
    return false
  }
  async function checkout() {
    if ((paymentMethod === 'card' && !connectedReader) || !cartItems.length) return
    setCheckoutBusy(true); setError(''); setLastResult(undefined); setMessage('Creating a protected Stripe test sale…')
    try {
      if (paymentMethod === 'cash') {
        setMessage('Recording cash and updating stock…')
        const result = await createCashSale(token, cartItems, Crypto.randomUUID(), cashTendered)
        setCart({}); setCashTendered(''); await Promise.all([refresh(), refreshSales(true)])
        setMessage('')
        setLastResult({ status: 'success', title: 'Cash sale complete', detail: `${money(result.sale.total_cents)} paid in cash · ${money(result.changeDueCents)} change due. Inventory has been updated.` })
        return
      }
      const sale = await createSale(token, cartItems, Crypto.randomUUID())
      await setReaderDisplay({ currency: 'usd', tax: sale.taxCents, total: sale.totalCents, lineItems: cartItems.map((item) => { const product = products.find((entry) => entry.sku === item.sku)!; return { displayName: product.name, quantity: item.quantity, amount: product.unitPriceCents * item.quantity } }) }).catch(() => ({ error: undefined }))
      const retrieved = await retrievePaymentIntent(sale.clientSecret)
      if (retrieved.error || !retrieved.paymentIntent) throw retrieved.error || new Error('Stripe could not open the test payment.')
      setMessage('Present the Stripe test card to the simulated reader.')
      const processed = await processPaymentIntent({ paymentIntent: retrieved.paymentIntent })
      if (processed.error) throw processed.error
      setMessage('Test payment approved. Synchronizing inventory…')
      const paid = await waitForPaid(sale.saleId)
      setCart({}); await Promise.all([refresh(), refreshSales(true)])
      setMessage('')
      setLastResult(paid
        ? { status: 'success', title: 'Payment successful', detail: `${money(sale.totalCents)} paid and recorded. Inventory has been updated.` }
        : { status: 'pending', title: 'Payment approved', detail: `${money(sale.totalCents)} was approved by Stripe. Inventory confirmation is still syncing.` })
    } catch (reason) {
      const detail = reason instanceof Error ? reason.message : 'The test sale could not finish.'
      setError(detail)
      setLastResult({ status: 'error', title: 'Payment unsuccessful', detail: `${detail} Check the card or connection, then try again.` })
      await refreshSales(true).catch(() => {})
    }
    finally { setCheckoutBusy(false) }
  }
  return (
    <ScrollView contentContainerStyle={styles.page}>
      <View style={styles.row}><View style={styles.grow}><Text style={styles.eyebrow}>EVENT REGISTER</Text><Text style={styles.pageTitle}>A calm little checkout.</Text></View><Text style={styles.testPill}>TEST MODE</Text></View>
      <Text style={styles.copy}>Real product setup and protected test inventory. Live charges stay impossible until the final launch review.</Text>
      {paymentMethod === 'card' ? <View style={styles.readerCard}><Text style={styles.cardTitle}>Stripe reader</Text><Text style={styles.cardCopy}>{connectedReader ? 'Connected to Stripe’s simulated reader. No live card can be charged.' : 'Connect the simulated reader for an end-to-end protected test sale.'}</Text>{!connectedReader ? <><Pressable disabled={readerBusy} onPress={findReader} style={[styles.secondary, readerBusy && styles.disabled]}><Text style={styles.secondaryText}>{readerBusy ? 'Preparing…' : 'Find simulated reader'}</Text></Pressable>{readers.map((reader) => <Pressable key={reader.id || reader.serialNumber} onPress={() => connect(reader)} style={styles.readerChoice}><Text style={styles.cardTitle}>Stripe simulated reader</Text><Text style={styles.link}>Connect ›</Text></Pressable>)}</> : <Pressable onPress={() => disconnectReader()} style={styles.secondary}><Text style={styles.secondaryText}>Disconnect reader</Text></Pressable>}</View> : null}
      {message ? <Text style={styles.success}>{message}</Text> : null}
      {lastResult ? <View style={[styles.paymentResult, lastResult.status === 'success' ? styles.paymentResultSuccess : lastResult.status === 'pending' ? styles.paymentResultPending : styles.paymentResultError]}><Text style={styles.paymentResultIcon}>{lastResult.status === 'success' ? '✓' : lastResult.status === 'pending' ? '…' : '!'}</Text><View style={styles.grow}><Text style={styles.cardTitle}>{lastResult.title}</Text><Text style={styles.cardCopy}>{lastResult.detail}</Text></View></View> : null}
      <View style={styles.sectionHeading}><Text style={styles.sectionTitle}>Products</Text><Pressable onPress={refresh}><Text style={styles.link}>Refresh stock</Text></Pressable></View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {loading ? <ActivityIndicator color={colors.terracotta} /> : products.map((product) => {
        const quantity = cart[product.sku] || 0
        return <View key={product.sku} style={styles.productCard}><Image source={{ uri: `${API_URL}${product.image}` }} style={styles.productImage} /><View style={styles.grow}><Text style={styles.cardTitle}>{product.name}</Text><Text style={styles.meta}>{money(product.unitPriceCents)} · {product.stock} available</Text></View><View style={styles.quantity}><Pressable onPress={() => change(product, -1)} style={styles.quantityButton}><Text style={styles.quantityText}>−</Text></Pressable><Text style={styles.quantityValue}>{quantity}</Text><Pressable onPress={() => change(product, 1)} style={styles.quantityButton}><Text style={styles.quantityText}>＋</Text></Pressable></View></View>
      })}
      <View style={styles.cartCard}><Text style={styles.eyebrow}>CURRENT TEST SALE</Text><View style={styles.row}><Text style={styles.cartLabel}>Subtotal before server tax</Text><Text style={styles.cartTotal}>{money(subtotal)}</Text></View><Text style={styles.cartMethodLabel}>Payment method</Text><View style={styles.cartChoices}>{(['card', 'cash'] as const).map((method) => <Pressable key={method} onPress={() => { setPaymentMethod(method); setError(''); setLastResult(undefined) }} style={[styles.cartChoice, paymentMethod === method && styles.cartChoiceActive]}><Text style={[styles.cartChoiceText, paymentMethod === method && styles.cartChoiceTextActive]}>{method === 'card' ? 'Card reader' : 'Cash'}</Text></Pressable>)}</View>{paymentMethod === 'cash' ? <><Text style={styles.cartMethodLabel}>Cash received</Text><TextInput value={cashTendered} onChangeText={setCashTendered} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor="#9f9488" style={styles.cashInput} /><Text style={styles.cartHint}>The server confirms tax, total, change, and stock before saving the receipt.</Text></> : null}<Pressable disabled={checkoutBusy || (paymentMethod === 'card' && !connectedReader) || !cartItems.length || (paymentMethod === 'cash' && !cashTendered.trim())} onPress={checkout} style={[styles.primary, (checkoutBusy || (paymentMethod === 'card' && !connectedReader) || !cartItems.length || (paymentMethod === 'cash' && !cashTendered.trim())) && styles.disabled]}><Text style={styles.primaryText}>{checkoutBusy ? 'Completing test sale…' : paymentMethod === 'cash' ? 'Complete cash sale' : 'Take test card payment'}</Text></Pressable></View>
      <View style={styles.sectionHeading}><Text style={styles.sectionTitle}>Recent payments</Text><Pressable onPress={() => refreshSales()}><Text style={styles.link}>Refresh</Text></Pressable></View>
      <Text style={styles.historyHelp}>Test receipts are saved here for Katie and event helpers. Full card numbers are never stored.</Text>
      {sales.length ? sales.map((sale) => {
        const state = paymentLabel(sale.status)
        const itemCount = sale.items.reduce((sum, item) => sum + item.quantity, 0)
        return <View key={sale.id} style={styles.paymentCard}><View style={[styles.paymentStatusDot, state.tone === 'success' ? styles.dotSuccess : state.tone === 'pending' ? styles.dotPending : styles.dotError]} /><View style={styles.grow}><View style={styles.row}><Text style={styles.cardTitle}>{state.title}</Text><Text style={styles.paymentAmount}>{money(sale.total_cents)}</Text></View><Text style={styles.meta}>{paymentDate(sale.created_at)} · {itemCount} item{itemCount === 1 ? '' : 's'} · {sale.payment_method === 'cash' ? 'Cash' : 'Card'} · {sale.mode === 'test' ? 'Test' : 'Live'}</Text><Text style={styles.cardCopy}>{state.detail}{sale.payment_method === 'cash' && sale.change_due_cents != null ? ` · ${money(sale.change_due_cents)} change` : ''}</Text><Text numberOfLines={2} style={styles.receiptItems}>{sale.items.map((item) => `${item.quantity}× ${item.name}`).join(' · ')}</Text></View></View>
      }) : <View style={styles.empty}><Text style={styles.cardTitle}>No payments yet.</Text><Text style={styles.cardCopy}>Completed and attempted sales will appear here.</Text></View>}
    </ScrollView>
  )
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
  const terminalTokenProvider = useCallback(async () => {
    if (!session?.token) throw new Error('Sign in again before opening the event register.')
    try {
      return await createTerminalToken(session.token)
    } catch (reason) {
      const detail = reason instanceof Error ? reason.message : 'The Stripe test connection is unavailable.'
      throw new Error(`Stripe test connection could not start. ${detail}`)
    }
  }, [session?.token])
  useEffect(() => {
    SecureStore.getItemAsync(SESSION_KEY).then((raw) => {
      if (!raw) return
      const saved = JSON.parse(raw) as StoredSession
      if (saved.expiresAt > Date.now() && saved.staff) setSession(saved)
      else SecureStore.deleteItemAsync(SESSION_KEY).catch(() => {})
    }).catch(() => {}).finally(() => setRestoring(false))
  }, [])
  if (restoring) return <View style={styles.center}><ActivityIndicator color={colors.terracotta} /></View>
  if (!session) return <Login onSignedIn={setSession} />
  return (
    <SafeAreaView style={styles.fill}>
      <StatusBar barStyle="dark-content" />
      <ExpoStatusBar style="dark" />
      <View style={styles.header}><View style={styles.logoMark}><Text style={styles.logoText}>NP</Text></View><View><Text style={styles.headerTitle}>Nomadic Paws</Text><Text style={styles.headerSubtitle}>{session.staff.name} · Events & Mobile Store</Text></View><Pressable onPress={async () => { await SecureStore.deleteItemAsync(SESSION_KEY); setSession(undefined) }} style={styles.signOut}><Text style={styles.signOutText}>Lock</Text></Pressable></View>
      <View style={styles.body}>{tab === 'Calendar' ? <Calendar token={session.token} /> : tab === 'Staff' ? <StaffAccess token={session.token} /> : <StripeTerminalProvider tokenProvider={terminalTokenProvider}><Register token={session.token} /></StripeTerminalProvider>}</View>
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
  monthCard: { marginTop: 18, padding: 14, borderRadius: 22, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.sandDeep }, monthHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, monthTitle: { fontSize: 17, fontWeight: '900', color: colors.bark }, monthArrow: { paddingHorizontal: 12, fontSize: 28, color: colors.terracottaDeep }, weekRow: { marginTop: 10, flexDirection: 'row' }, weekDay: { width: '14.285%', textAlign: 'center', color: colors.sageDeep, fontSize: 11, fontWeight: '900' }, monthGrid: { flexDirection: 'row', flexWrap: 'wrap' }, dayCell: { width: '14.285%', height: 45, paddingTop: 6, alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.sand }, dayNumber: { color: colors.bark, fontSize: 12, fontWeight: '800' }, dayMarks: { minHeight: 18, fontSize: 13, color: colors.terracottaDeep }, calendarLegend: { marginTop: 10, color: colors.barkSoft, fontSize: 11, textAlign: 'center' }, cheetoToggle: { marginTop: 16, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 16, backgroundColor: colors.white },
  checklistSection: { marginTop: 22, paddingTop: 18, borderTopWidth: 1, borderTopColor: colors.sandDeep }, checklistRow: { minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 1, borderBottomColor: colors.sandDeep }, checkBox: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.sageDeep, backgroundColor: colors.white }, checkBoxDone: { backgroundColor: colors.sageDeep }, checkMark: { color: colors.white, fontWeight: '900' }, checklistLabel: { color: colors.bark, fontWeight: '700' }, checklistLabelDone: { color: colors.barkSoft, textDecorationLine: 'line-through' }, assignment: { marginTop: 2, color: colors.sageDeep, fontSize: 11, fontWeight: '800' }, removeText: { color: colors.terracottaDeep, fontSize: 12, fontWeight: '800' }, checklistAdd: { marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }, addButton: { minHeight: 52, paddingHorizontal: 18, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.terracotta },
  eventCard: { marginBottom: 10, padding: 15, flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 20, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.sandDeep }, eventDate: { width: 44, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.sand }, eventDateText: { fontSize: 20, fontWeight: '900', color: colors.terracottaDeep }, cardTitle: { flexShrink: 1, fontSize: 16, fontWeight: '900', color: colors.bark }, meta: { marginTop: 4, fontSize: 12, color: colors.sageDeep, fontWeight: '700' }, cardCopy: { marginTop: 5, fontSize: 13, lineHeight: 18, color: colors.barkSoft }, pill: { marginLeft: 'auto', fontSize: 10, fontWeight: '900', color: colors.sageDeep }, arrow: { fontSize: 26, color: colors.terracottaDeep }, empty: { padding: 18, borderRadius: 20, backgroundColor: colors.sand },
  readerCard: { marginTop: 20, padding: 18, borderRadius: 22, backgroundColor: colors.sand }, testPill: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999, overflow: 'hidden', backgroundColor: colors.sageDeep, color: colors.white, fontSize: 10, fontWeight: '900' }, productCard: { marginBottom: 10, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 20, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.sandDeep }, productImage: { width: 58, height: 58, borderRadius: 14, backgroundColor: colors.sand }, quantity: { flexDirection: 'row', alignItems: 'center', gap: 7 }, quantityButton: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.sand }, quantityText: { fontSize: 18, fontWeight: '900', color: colors.bark }, quantityValue: { minWidth: 18, textAlign: 'center', fontWeight: '900', color: colors.bark }, cartCard: { marginTop: 20, padding: 18, borderRadius: 22, backgroundColor: colors.bark }, cartLabel: { marginTop: 12, flex: 1, color: colors.sand }, cartTotal: { marginTop: 12, fontSize: 22, fontWeight: '900', color: colors.white },
  readerChoice: { marginTop: 10, padding: 13, borderRadius: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.white },
  cartMethodLabel: { marginTop: 16, marginBottom: 7, color: colors.sand, fontSize: 13, fontWeight: '900' }, cartChoices: { flexDirection: 'row', gap: 8 }, cartChoice: { flex: 1, paddingVertical: 11, alignItems: 'center', borderRadius: 14, borderWidth: 1, borderColor: colors.barkSoft }, cartChoiceActive: { backgroundColor: colors.white, borderColor: colors.white }, cartChoiceText: { color: colors.sand, fontWeight: '900' }, cartChoiceTextActive: { color: colors.bark }, cashInput: { minHeight: 50, paddingHorizontal: 15, borderRadius: 14, backgroundColor: colors.white, color: colors.bark, fontSize: 20, fontWeight: '900' }, cartHint: { marginTop: 7, color: colors.sandDeep, fontSize: 12, lineHeight: 17 },
  paymentResult: { marginTop: 14, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 20, borderWidth: 1 }, paymentResultSuccess: { backgroundColor: '#eef3e9', borderColor: colors.sage }, paymentResultPending: { backgroundColor: colors.sand, borderColor: colors.sandDeep }, paymentResultError: { backgroundColor: '#faeeeb', borderColor: '#d9a49c' }, paymentResultIcon: { width: 32, height: 32, borderRadius: 16, overflow: 'hidden', textAlign: 'center', textAlignVertical: 'center', backgroundColor: colors.white, color: colors.bark, fontSize: 19, fontWeight: '900' },
  historyHelp: { marginTop: -4, marginBottom: 12, color: colors.barkSoft, fontSize: 13, lineHeight: 18 }, paymentCard: { marginBottom: 10, padding: 15, flexDirection: 'row', alignItems: 'flex-start', gap: 12, borderRadius: 20, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.sandDeep }, paymentStatusDot: { width: 11, height: 11, marginTop: 5, borderRadius: 6 }, dotSuccess: { backgroundColor: colors.sageDeep }, dotPending: { backgroundColor: '#c69b46' }, dotError: { backgroundColor: colors.red }, paymentAmount: { marginLeft: 'auto', fontWeight: '900', color: colors.bark }, receiptItems: { marginTop: 7, color: colors.barkSoft, fontSize: 12, fontWeight: '700' },
  codeCard: { marginTop: 16, padding: 16, borderRadius: 18, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.sandDeep }, codeText: { marginTop: 8, fontSize: 28, letterSpacing: 4, fontWeight: '900', color: colors.bark }, staffToggle: { paddingHorizontal: 12, paddingVertical: 10 }, staffHint: { marginTop: 6, color: colors.terracottaDeep, fontSize: 11, fontWeight: '800' },
  tabs: { minHeight: 68, flexDirection: 'row', borderTopWidth: 1, borderTopColor: colors.sandDeep, backgroundColor: colors.white }, tab: { flex: 1, alignItems: 'center', justifyContent: 'center' }, tabText: { fontWeight: '900', color: colors.barkSoft }, tabTextActive: { color: colors.terracottaDeep },
})
