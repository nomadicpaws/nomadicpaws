import React, { useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
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
import { StatusBar as ExpoStatusBar } from 'expo-status-bar'
import {
  API_URL,
  CalendarEvent,
  createSellerSession,
  EventProduct,
  loadCalendar,
  loadProducts,
  saveCalendar,
} from './src/api'

const SESSION_KEY = 'nomadic-paws-event-session'
const colors = {
  cream: '#fdfaf5', sand: '#f4eee1', sandDeep: '#e9dfc8', bark: '#3f352a',
  barkSoft: '#6b5d4c', sage: '#8b9a7c', sageDeep: '#6f7e62',
  terracotta: '#c1734b', terracottaDeep: '#a85c39', white: '#ffffff', red: '#a2473d',
}

type StoredSession = { token: string; expiresAt: number }
type Tab = 'Calendar' | 'Register'

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
      const session = { token: data.token, expiresAt: Date.now() + data.expiresInSeconds * 1000 }
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
        <Text style={styles.copy}>Katie-only event planning and protected test checkout. No live card can be charged in this version.</Text>
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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  async function refresh() {
    setLoading(true); setError('')
    try { setProducts((await loadProducts(token)).products) }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Test inventory could not load.') }
    finally { setLoading(false) }
  }
  useEffect(() => { refresh().catch(() => {}) }, [token])
  function change(product: EventProduct, amount: number) {
    setCart((current) => ({ ...current, [product.sku]: Math.max(0, Math.min(product.stock, (current[product.sku] || 0) + amount)) }))
  }
  const subtotal = useMemo(() => products.reduce((sum, item) => sum + item.unitPriceCents * (cart[item.sku] || 0), 0), [cart, products])
  return (
    <ScrollView contentContainerStyle={styles.page}>
      <View style={styles.row}><View style={styles.grow}><Text style={styles.eyebrow}>EVENT REGISTER</Text><Text style={styles.pageTitle}>A calm little checkout.</Text></View><Text style={styles.testPill}>TEST MODE</Text></View>
      <Text style={styles.copy}>Real product setup and protected test inventory. Live charges stay impossible until the final launch review.</Text>
      <View style={styles.readerCard}><Text style={styles.cardTitle}>Stripe reader</Text><Text style={styles.cardCopy}>Native reader connection is the next build step. Until then, use this screen to verify products, stock, quantities, and totals.</Text></View>
      <View style={styles.sectionHeading}><Text style={styles.sectionTitle}>Products</Text><Pressable onPress={refresh}><Text style={styles.link}>Refresh stock</Text></Pressable></View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {loading ? <ActivityIndicator color={colors.terracotta} /> : products.map((product) => {
        const quantity = cart[product.sku] || 0
        return <View key={product.sku} style={styles.productCard}><Image source={{ uri: `${API_URL}${product.image}` }} style={styles.productImage} /><View style={styles.grow}><Text style={styles.cardTitle}>{product.name}</Text><Text style={styles.meta}>{money(product.unitPriceCents)} · {product.stock} available</Text></View><View style={styles.quantity}><Pressable onPress={() => change(product, -1)} style={styles.quantityButton}><Text style={styles.quantityText}>−</Text></Pressable><Text style={styles.quantityValue}>{quantity}</Text><Pressable onPress={() => change(product, 1)} style={styles.quantityButton}><Text style={styles.quantityText}>＋</Text></Pressable></View></View>
      })}
      <View style={styles.cartCard}><Text style={styles.eyebrow}>CURRENT SALE</Text><View style={styles.row}><Text style={styles.cartLabel}>Subtotal before server tax</Text><Text style={styles.cartTotal}>{money(subtotal)}</Text></View><Pressable disabled style={[styles.primary, styles.disabled]}><Text style={styles.primaryText}>Reader checkout coming next</Text></Pressable></View>
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
      if (saved.expiresAt > Date.now()) setSession(saved)
      else SecureStore.deleteItemAsync(SESSION_KEY).catch(() => {})
    }).catch(() => {}).finally(() => setRestoring(false))
  }, [])
  if (restoring) return <View style={styles.center}><ActivityIndicator color={colors.terracotta} /></View>
  if (!session) return <Login onSignedIn={setSession} />
  return (
    <SafeAreaView style={styles.fill}>
      <StatusBar barStyle="dark-content" />
      <ExpoStatusBar style="dark" />
      <View style={styles.header}><View style={styles.logoMark}><Text style={styles.logoText}>NP</Text></View><View><Text style={styles.headerTitle}>Nomadic Paws</Text><Text style={styles.headerSubtitle}>Events & Mobile Store</Text></View><Pressable onPress={async () => { await SecureStore.deleteItemAsync(SESSION_KEY); setSession(undefined) }} style={styles.signOut}><Text style={styles.signOutText}>Lock</Text></Pressable></View>
      <View style={styles.body}>{tab === 'Calendar' ? <Calendar token={session.token} /> : <Register token={session.token} />}</View>
      <View style={styles.tabs}>{(['Calendar', 'Register'] as Tab[]).map((item) => <Pressable key={item} onPress={() => setTab(item)} style={styles.tab}><Text style={[styles.tabText, tab === item && styles.tabTextActive]}>{item}</Text></Pressable>)}</View>
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
  tabs: { minHeight: 68, flexDirection: 'row', borderTopWidth: 1, borderTopColor: colors.sandDeep, backgroundColor: colors.white }, tab: { flex: 1, alignItems: 'center', justifyContent: 'center' }, tabText: { fontWeight: '900', color: colors.barkSoft }, tabTextActive: { color: colors.terracottaDeep },
})
