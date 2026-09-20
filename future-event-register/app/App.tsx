import React, { useEffect, useMemo, useState } from 'react'
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
  createSale,
  createSellerSession,
  createTerminalToken,
  EventProduct,
  EventStaff,
  loadCalendar,
  loadEventStaff,
  loadProducts,
  loadSaleStatus,
  saveCalendar,
  setEventStaffActive,
  SignedInStaff,
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
    <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <SafeAreaView style={styles.loginPage}>
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
      </SafeAreaView>
    </KeyboardAvoidingView>
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
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)

  async function refresh() {
    setLoading(true)
    setMessage('')
    try { setEvents((await loadCalendar(token)).events) }
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
      const saved = await saveCalendar(token, { id: editing?.id, title, eventDate, location, notes, status })
      setEvents((current) => [saved, ...current.filter((item) => item.id !== saved.id)].sort((a, b) => a.event_date.localeCompare(b.event_date)))
      setEditing(saved)
      setMessage('Saved to the same calendar used by Studio.')
    } catch (reason) { setMessage(reason instanceof Error ? reason.message : 'That event could not be saved.') }
    finally { setSaving(false) }
  }
  return (
    <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
      <Text style={styles.eyebrow}>SHARED EVENT CALENDAR</Text>
      <Text style={styles.pageTitle}>Plan once. See it everywhere.</Text>
      <Text style={styles.copy}>Events saved here appear on the same calendar used by the Creative Studio.</Text>
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
          {message ? <Text style={message.startsWith('Saved') ? styles.success : styles.error}>{message}</Text> : null}
          <Pressable disabled={saving} onPress={save} style={[styles.primary, saving && styles.disabled]}><Text style={styles.primaryText}>{saving ? 'Saving…' : editing ? 'Update shared event' : 'Save shared event'}</Text></Pressable>
        </View>
      ) : null}
      <View style={styles.sectionHeading}><Text style={styles.sectionTitle}>Upcoming</Text><Pressable onPress={refresh}><Text style={styles.link}>Refresh</Text></Pressable></View>
      {loading ? <ActivityIndicator color={colors.terracotta} /> : events.length ? events.map((event) => (
        <Pressable key={event.id} onPress={() => edit(event)} style={styles.eventCard}>
          <View style={styles.eventDate}><Text style={styles.eventDateText}>{event.event_date.match(/-(\d{2})$/)?.[1]}</Text></View>
          <View style={styles.grow}><View style={styles.row}><Text style={styles.cardTitle}>{event.title}</Text><Text style={styles.pill}>{event.status}</Text></View><Text style={styles.meta}>{displayDate(event.event_date)}{event.location ? ` · ${event.location}` : ''}</Text>{event.notes ? <Text numberOfLines={2} style={styles.cardCopy}>{event.notes}</Text> : null}</View>
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
  useEffect(() => {
    refresh().catch(() => {})
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
      const result = await discoverReaders({ discoveryMethod: 'bluetoothScan', simulated: true, timeout: 12 })
      if (result.error) throw result.error
      setMessage('Opening Stripe’s simulated reader…')
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'The test reader could not start.') }
    finally { setReaderBusy(false) }
  }
  async function connect(reader: Reader.Type) {
    setReaderBusy(true); setError('')
    try {
      await cancelDiscovering().catch(() => {})
      const result = await connectReader({ discoveryMethod: 'bluetoothScan', reader, locationId: reader.locationId || reader.location?.id || locationId, autoReconnectOnUnexpectedDisconnect: true })
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
    if (!connectedReader || !cartItems.length) return
    setCheckoutBusy(true); setError(''); setMessage('Creating a protected Stripe test sale…')
    try {
      const sale = await createSale(token, cartItems, Crypto.randomUUID())
      await setReaderDisplay({ currency: 'usd', tax: sale.taxCents, total: sale.totalCents, lineItems: cartItems.map((item) => { const product = products.find((entry) => entry.sku === item.sku)!; return { displayName: product.name, quantity: item.quantity, amount: product.unitPriceCents * item.quantity } }) }).catch(() => ({ error: undefined }))
      const retrieved = await retrievePaymentIntent(sale.clientSecret)
      if (retrieved.error || !retrieved.paymentIntent) throw retrieved.error || new Error('Stripe could not open the test payment.')
      setMessage('Present the Stripe test card to the simulated reader.')
      const processed = await processPaymentIntent({ paymentIntent: retrieved.paymentIntent })
      if (processed.error) throw processed.error
      setMessage('Test payment approved. Synchronizing inventory…')
      const paid = await waitForPaid(sale.saleId)
      setCart({}); await refresh()
      setMessage(paid ? `Test sale complete · ${money(sale.totalCents)}.` : 'Stripe approved the test payment; inventory is finishing in the background.')
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'The test sale could not finish.') }
    finally { setCheckoutBusy(false) }
  }
  return (
    <ScrollView contentContainerStyle={styles.page}>
      <View style={styles.row}><View style={styles.grow}><Text style={styles.eyebrow}>EVENT REGISTER</Text><Text style={styles.pageTitle}>A calm little checkout.</Text></View><Text style={styles.testPill}>TEST MODE</Text></View>
      <Text style={styles.copy}>Real product setup and protected test inventory. Live charges stay impossible until the final launch review.</Text>
      <View style={styles.readerCard}><Text style={styles.cardTitle}>Stripe reader</Text><Text style={styles.cardCopy}>{connectedReader ? 'Connected to Stripe’s simulated reader. No live card can be charged.' : 'Connect the simulated reader for an end-to-end protected test sale.'}</Text>{!connectedReader ? <><Pressable disabled={readerBusy} onPress={findReader} style={[styles.secondary, readerBusy && styles.disabled]}><Text style={styles.secondaryText}>{readerBusy ? 'Preparing…' : 'Find simulated reader'}</Text></Pressable>{readers.map((reader) => <Pressable key={reader.id || reader.serialNumber} onPress={() => connect(reader)} style={styles.readerChoice}><Text style={styles.cardTitle}>Stripe simulated reader</Text><Text style={styles.link}>Connect ›</Text></Pressable>)}</> : <Pressable onPress={() => disconnectReader()} style={styles.secondary}><Text style={styles.secondaryText}>Disconnect reader</Text></Pressable>}</View>
      {message ? <Text style={styles.success}>{message}</Text> : null}
      <View style={styles.sectionHeading}><Text style={styles.sectionTitle}>Products</Text><Pressable onPress={refresh}><Text style={styles.link}>Refresh stock</Text></Pressable></View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {loading ? <ActivityIndicator color={colors.terracotta} /> : products.map((product) => {
        const quantity = cart[product.sku] || 0
        return <View key={product.sku} style={styles.productCard}><Image source={{ uri: `${API_URL}${product.image}` }} style={styles.productImage} /><View style={styles.grow}><Text style={styles.cardTitle}>{product.name}</Text><Text style={styles.meta}>{money(product.unitPriceCents)} · {product.stock} available</Text></View><View style={styles.quantity}><Pressable onPress={() => change(product, -1)} style={styles.quantityButton}><Text style={styles.quantityText}>−</Text></Pressable><Text style={styles.quantityValue}>{quantity}</Text><Pressable onPress={() => change(product, 1)} style={styles.quantityButton}><Text style={styles.quantityText}>＋</Text></Pressable></View></View>
      })}
      <View style={styles.cartCard}><Text style={styles.eyebrow}>CURRENT TEST SALE</Text><View style={styles.row}><Text style={styles.cartLabel}>Subtotal before server tax</Text><Text style={styles.cartTotal}>{money(subtotal)}</Text></View><Pressable disabled={checkoutBusy || !connectedReader || !cartItems.length} onPress={checkout} style={[styles.primary, (checkoutBusy || !connectedReader || !cartItems.length) && styles.disabled]}><Text style={styles.primaryText}>{checkoutBusy ? 'Completing test sale…' : 'Take test payment'}</Text></Pressable></View>
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
      Alert.alert('Private access code created', `${result.staff.display_name}: ${result.accessCode}\n\nThis is shown only now. Send it privately.`)
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
        {newCode ? <View style={styles.codeCard}><Text style={styles.eyebrow}>SHOW ONCE</Text><Text selectable style={styles.codeText}>{newCode}</Text><Text style={styles.cardCopy}>Send this privately. The app stores only a protected hash, so the code cannot be looked up later.</Text></View> : null}
        {message ? <Text style={styles.error}>{message}</Text> : null}
      </View>
      <View style={styles.sectionHeading}><Text style={styles.sectionTitle}>People with access</Text><Pressable onPress={refresh}><Text style={styles.link}>Refresh</Text></Pressable></View>
      {staff.map((item) => <View key={item.id} style={styles.eventCard}><View style={styles.grow}><Text style={styles.cardTitle}>{item.display_name}</Text><Text style={styles.meta}>{item.role === 'manager' ? 'Manager' : 'Event helper'} · {item.active ? 'Active' : 'Paused'}</Text>{item.last_signed_in_at ? <Text style={styles.cardCopy}>Last used {new Date(item.last_signed_in_at).toLocaleDateString()}</Text> : null}</View><Pressable disabled={busy} onPress={() => toggle(item)} style={styles.staffToggle}><Text style={styles.link}>{item.active ? 'Pause' : 'Restore'}</Text></Pressable></View>)}
    </ScrollView>
  )
}

export default function App() {
  const [session, setSession] = useState<StoredSession>()
  const [restoring, setRestoring] = useState(true)
  const [tab, setTab] = useState<Tab>('Calendar')
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
      <View style={styles.body}>{tab === 'Calendar' ? <Calendar token={session.token} /> : tab === 'Staff' ? <StaffAccess token={session.token} /> : <StripeTerminalProvider tokenProvider={() => createTerminalToken(session.token)}><Register token={session.token} /></StripeTerminalProvider>}</View>
      <View style={styles.tabs}>{(['Calendar', 'Register', ...(session.staff.permission === 'owner' ? ['Staff' as const] : [])] as Tab[]).map((item) => <Pressable key={item} onPress={() => setTab(item)} style={styles.tab}><Text style={[styles.tabText, tab === item && styles.tabTextActive]}>{item}</Text></Pressable>)}</View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.cream }, center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cream }, body: { flex: 1 }, grow: { flex: 1 }, row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  loginPage: { flex: 1, justifyContent: 'center', padding: 28, backgroundColor: colors.cream }, loginCard: { marginTop: 26, padding: 20, borderRadius: 24, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.sandDeep },
  page: { padding: 24, paddingBottom: 50 }, eyebrow: { fontSize: 12, fontWeight: '900', letterSpacing: 2, color: colors.sageDeep }, heroTitle: { marginTop: 10, fontSize: 42, lineHeight: 46, fontWeight: '900', color: colors.bark }, pageTitle: { marginTop: 7, fontSize: 31, lineHeight: 35, fontWeight: '900', color: colors.bark }, copy: { marginTop: 12, fontSize: 16, lineHeight: 24, color: colors.barkSoft },
  label: { marginTop: 13, marginBottom: 7, fontSize: 13, fontWeight: '900', color: colors.bark }, input: { minHeight: 52, paddingHorizontal: 15, borderRadius: 15, borderWidth: 1, borderColor: colors.sandDeep, backgroundColor: colors.white, fontSize: 16, color: colors.bark }, notes: { minHeight: 100, paddingTop: 14, textAlignVertical: 'top' },
  primary: { marginTop: 16, minHeight: 54, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.terracotta }, primaryText: { fontSize: 16, fontWeight: '900', color: colors.white }, disabled: { opacity: 0.45 }, secondary: { marginTop: 18, minHeight: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.sandDeep, backgroundColor: colors.white }, secondaryText: { fontWeight: '900', color: colors.terracottaDeep }, error: { marginTop: 12, color: colors.red, fontWeight: '700' }, success: { marginTop: 12, color: colors.sageDeep, fontWeight: '800' },
  header: { minHeight: 84, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.sandDeep, backgroundColor: colors.white }, logoMark: { width: 44, height: 44, marginRight: 12, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.sand }, logoText: { fontWeight: '900', color: colors.sageDeep }, headerTitle: { fontSize: 20, fontWeight: '900', color: colors.bark }, headerSubtitle: { fontSize: 13, color: colors.barkSoft }, signOut: { marginLeft: 'auto', paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, borderWidth: 1, borderColor: colors.sandDeep }, signOutText: { fontWeight: '900', color: colors.terracottaDeep },
  formCard: { marginTop: 14, padding: 17, borderRadius: 22, backgroundColor: colors.sand, borderWidth: 1, borderColor: colors.sandDeep }, choices: { marginTop: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, choice: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 999, borderWidth: 1, borderColor: colors.sandDeep, backgroundColor: colors.white }, choiceActive: { backgroundColor: colors.bark }, choiceText: { fontWeight: '800', color: colors.barkSoft }, choiceTextActive: { color: colors.white }, sectionHeading: { marginTop: 26, marginBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, sectionTitle: { fontSize: 22, fontWeight: '900', color: colors.bark }, link: { fontWeight: '900', color: colors.terracottaDeep },
  eventCard: { marginBottom: 10, padding: 15, flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 20, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.sandDeep }, eventDate: { width: 44, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.sand }, eventDateText: { fontSize: 20, fontWeight: '900', color: colors.terracottaDeep }, cardTitle: { flexShrink: 1, fontSize: 16, fontWeight: '900', color: colors.bark }, meta: { marginTop: 4, fontSize: 12, color: colors.sageDeep, fontWeight: '700' }, cardCopy: { marginTop: 5, fontSize: 13, lineHeight: 18, color: colors.barkSoft }, pill: { marginLeft: 'auto', fontSize: 10, fontWeight: '900', color: colors.sageDeep }, arrow: { fontSize: 26, color: colors.terracottaDeep }, empty: { padding: 18, borderRadius: 20, backgroundColor: colors.sand },
  readerCard: { marginTop: 20, padding: 18, borderRadius: 22, backgroundColor: colors.sand }, testPill: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999, overflow: 'hidden', backgroundColor: colors.sageDeep, color: colors.white, fontSize: 10, fontWeight: '900' }, productCard: { marginBottom: 10, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 20, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.sandDeep }, productImage: { width: 58, height: 58, borderRadius: 14, backgroundColor: colors.sand }, quantity: { flexDirection: 'row', alignItems: 'center', gap: 7 }, quantityButton: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.sand }, quantityText: { fontSize: 18, fontWeight: '900', color: colors.bark }, quantityValue: { minWidth: 18, textAlign: 'center', fontWeight: '900', color: colors.bark }, cartCard: { marginTop: 20, padding: 18, borderRadius: 22, backgroundColor: colors.bark }, cartLabel: { marginTop: 12, flex: 1, color: colors.sand }, cartTotal: { marginTop: 12, fontSize: 22, fontWeight: '900', color: colors.white },
  readerChoice: { marginTop: 10, padding: 13, borderRadius: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.white },
  codeCard: { marginTop: 16, padding: 16, borderRadius: 18, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.sandDeep }, codeText: { marginTop: 8, fontSize: 28, letterSpacing: 4, fontWeight: '900', color: colors.bark }, staffToggle: { paddingHorizontal: 12, paddingVertical: 10 },
  tabs: { minHeight: 68, flexDirection: 'row', borderTopWidth: 1, borderTopColor: colors.sandDeep, backgroundColor: colors.white }, tab: { flex: 1, alignItems: 'center', justifyContent: 'center' }, tabText: { fontWeight: '900', color: colors.barkSoft }, tabTextActive: { color: colors.terracottaDeep },
})
