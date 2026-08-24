import React, { useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { API_URL, JournalStory, loadStories, signIn } from './src/api'
import { ContentSeed, initialSchedule, Person, starterSeeds } from './src/content'

type Tab = 'Today' | 'Studio' | 'Journal' | 'Pinterest' | 'Register'
type LogoColor = 'bark' | 'sage' | 'sand' | 'terracotta'
type LogoSize = 'small' | 'medium'
type LogoSide = 'left' | 'right'

const colors = {
  cream: '#fdfaf5', sand: '#f4eee1', sandDeep: '#e9dfc8', bark: '#3f352a', barkSoft: '#6b5d4c',
  sage: '#8b9a7c', sageDeep: '#6f7e62', terracotta: '#c1734b', terracottaDeep: '#a85c39', white: '#ffffff',
}

const logoChoices: Array<{ label: string; value: LogoColor }> = [
  { label: 'Bark', value: 'bark' }, { label: 'Sage', value: 'sage' },
  { label: 'Cream', value: 'sand' }, { label: 'Terracotta', value: 'terracotta' },
]

function Choice<T extends string>({ value, current, label, onPress }: { value: T; current: T; label: string; onPress: (value: T) => void }) {
  const selected = value === current
  return <Pressable onPress={() => onPress(value)} style={[styles.choice, selected && styles.choiceSelected]} accessibilityRole="radio" accessibilityState={{ checked: selected }}>
    <Text style={[styles.choiceText, selected && styles.choiceTextSelected]}>{label}</Text>
  </Pressable>
}

function Login({ onSignedIn }: { onSignedIn: (token: string) => void }) {
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function submit() {
    setBusy(true); setError('')
    try { onSignedIn((await signIn(code)).token) } catch (reason) { setError(reason instanceof Error ? reason.message : 'Sign-in failed.') }
    finally { setBusy(false) }
  }
  return <SafeAreaView style={styles.login}><Image source={require('./assets/icon.png')} style={styles.loginLogo} />
    <Text style={styles.eyebrow}>PRIVATE NOMADIC PAWS WORKSPACE</Text><Text style={styles.heroTitle}>Ready when you are.</Text>
    <Text style={styles.copy}>Use the same secure access code as the event register.</Text>
    <TextInput value={code} onChangeText={setCode} secureTextEntry placeholder="Access code" placeholderTextColor="#8b8075" style={styles.input} />
    {error ? <Text style={styles.error}>{error}</Text> : null}
    <Pressable style={styles.primary} onPress={submit} disabled={busy || code.length < 8}><Text style={styles.primaryText}>{busy ? 'Opening…' : 'Open Nomadic Paws'}</Text></Pressable>
  </SafeAreaView>
}

function StoryPicker({ stories, selected, onSelect }: { stories: JournalStory[]; selected?: JournalStory; onSelect: (story: JournalStory) => void }) {
  const [open, setOpen] = useState(!selected)
  return <View style={styles.section}>
    <Text style={styles.sectionLabel}>TRAIL JOURNAL STORY</Text>
    {selected && !open ? <Pressable onPress={() => setOpen(true)} style={styles.selectedStory}><View style={{ flex: 1 }}><Text style={styles.storyTitle}>{selected.title}</Text><Text style={styles.storyMeta}>{selected.status} · {new Date(selected.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</Text></View><Text style={styles.change}>Change</Text></Pressable> : null}
    {open ? <View style={styles.storyList}>{stories.map(story => <Pressable key={story.slug} onPress={() => { onSelect(story); setOpen(false) }} style={[styles.storyRow, selected?.slug === story.slug && styles.storyRowSelected]}>
      <Text style={styles.storyTitle}>{story.title}</Text><Text style={styles.storyMeta}>{story.status} · {new Date(story.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</Text>
    </Pressable>)}</View> : null}
  </View>
}

function PinCard({ number, defaultColor }: { number: number; defaultColor: LogoColor }) {
  const [photo, setPhoto] = useState('')
  const [logo, setLogo] = useState<LogoColor>(defaultColor)
  const [size, setSize] = useState<LogoSize>('small')
  const [side, setSide] = useState<LogoSide>('left')
  return <View style={styles.pinCard}><View style={styles.pinHeading}><Text style={styles.pinTitle}>Pin {number}</Text><Text style={styles.pinTiming}>{number === 1 ? 'RSS · within 24 hours' : `CSV · day ${(number - 1) * 7}`}</Text></View>
    <View style={styles.preview}>
      {photo ? <Image source={{ uri: photo }} style={styles.previewPhoto} /> : <View style={styles.emptyPreview}><Text style={styles.emptyIcon}>＋</Text><Text style={styles.emptyText}>Add a vertical photo</Text></View>}
      <Image source={{ uri: `${API_URL}/images/pinterest-logos/logo-${logo}.png` }} style={[styles.previewLogo, size === 'medium' ? styles.logoMedium : styles.logoSmall, side === 'right' ? styles.logoRight : styles.logoLeft]} resizeMode="contain" />
    </View>
    <TextInput value={photo} onChangeText={setPhoto} autoCapitalize="none" placeholder="Paste an image URL for preview" placeholderTextColor="#8b8075" style={styles.input} />
    <Text style={styles.controlLabel}>Logo color</Text><View style={styles.choiceRow}>{logoChoices.map(item => <Choice key={item.value} {...item} current={logo} onPress={setLogo} />)}</View>
    <Text style={styles.controlLabel}>Logo size</Text><View style={styles.choiceRow}><Choice value="small" label="Small" current={size} onPress={setSize} /><Choice value="medium" label="Medium" current={size} onPress={setSize} /></View>
    <Text style={styles.controlLabel}>Logo placement</Text><View style={styles.choiceRow}><Choice value="left" label="Left" current={side} onPress={setSide} /><Choice value="right" label="Right" current={side} onPress={setSide} /></View>
  </View>
}

const statusTone: Record<ContentSeed['status'], { backgroundColor: string; color: string }> = {
  Idea: { backgroundColor: '#efe9de', color: colors.barkSoft },
  Draft: { backgroundColor: '#f7e6dc', color: colors.terracottaDeep },
  Ready: { backgroundColor: '#e6eee0', color: colors.sageDeep },
  'Handed Off': { backgroundColor: '#e7edf1', color: '#526b78' },
  Posted: { backgroundColor: '#eee8f3', color: '#685675' },
}

function SeedCard({ seed }: { seed: ContentSeed }) {
  const tone = statusTone[seed.status]
  return <Pressable style={styles.seedCard} accessibilityLabel={`${seed.title}, ${seed.status}, assigned to ${seed.assignedTo}`}>
    <View style={styles.seedTop}><View style={[styles.seedStatus, { backgroundColor: tone.backgroundColor }]}><Text style={[styles.seedStatusText, { color: tone.color }]}>{seed.status}</Text></View><Text style={styles.seedOwner}>{seed.assignedTo}</Text></View>
    <Text style={styles.seedTitle}>{seed.title}</Text><Text style={styles.seedNote}>{seed.note}</Text>
    <View style={styles.seedMeta}><Text style={styles.seedMetaText}>{seed.mediaCount} media</Text><Text style={styles.seedMetaText}>{seed.capturedAt}</Text></View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.platforms}>{seed.platforms.map(platform => <View key={platform} style={styles.platformPill}><Text style={styles.platformText}>{platform}</Text></View>)}</ScrollView>
  </Pressable>
}

function RoleSwitch({ person, onChange }: { person: Person; onChange: (person: Person) => void }) {
  return <View style={styles.roleSwitch} accessibilityRole="tablist">{(['Katie', 'Trinitie', 'Mom'] as Person[]).map(name => <Pressable key={name} onPress={() => onChange(name)} style={[styles.roleButton, person === name && styles.roleButtonActive]}><Text style={[styles.roleText, person === name && styles.roleTextActive]}>{name}</Text></Pressable>)}</View>
}

function Today({ person, onPersonChange, seeds, onNewAdventure }: { person: Person; onPersonChange: (person: Person) => void; seeds: ContentSeed[]; onNewAdventure: () => void }) {
  const mine = person === 'Mom' ? seeds.filter(seed => seed.platforms.includes('Trail Journal') && seed.status !== 'Posted') : seeds.filter(seed => seed.assignedTo === person)
  const readyInstagram = seeds.filter(seed => seed.platforms.includes('Instagram') && ['Ready', 'Handed Off'].includes(seed.status)).length
  return <ScrollView contentContainerStyle={styles.page}>
    <View style={styles.todayHeader}><View style={{ flex: 1 }}><Text style={styles.eyebrow}>MONDAY · AUGUST 24</Text><Text style={styles.pageTitle}>Good morning, {person}.</Text></View><RoleSwitch person={person} onChange={onPersonChange} /></View>
    <Text style={styles.copy}>{person === 'Trinitie' ? 'Your Instagram desk is calm and ready when inspiration arrives.' : person === 'Mom' ? 'A quiet place to read Katie’s Trail Journal drafts and leave review notes.' : 'Your stories, campaigns, and Cheeto adventures are gathered in one place.'}</Text>
    {person === 'Katie' ? <><Pressable style={styles.adventureButton} onPress={onNewAdventure}><View><Text style={styles.adventureEyebrow}>ADVENTURE INBOX</Text><Text style={styles.adventureTitle}>Start a new adventure</Text><Text style={styles.adventureCopy}>Add selected photos, videos, notes, and a private location.</Text></View><Text style={styles.adventurePlus}>＋</Text></Pressable><View style={styles.uploadReminder}><View style={{ flex: 1 }}><Text style={styles.uploadReminderTitle}>Yesterday’s adventure may have media to add.</Text><Text style={styles.uploadReminderCopy}>Add it when you have a quiet minute.</Text></View><Pressable onPress={onNewAdventure} style={styles.uploadReminderAction}><Text style={styles.uploadReminderActionText}>Add now</Text></Pressable></View></> : <View style={styles.trinitieFocus}><Text style={styles.trinitieFocusTitle}>{person === 'Mom' ? 'Trail Journal review only.' : 'Your source media comes from Katie.'}</Text><Text style={styles.trinitieFocusCopy}>{person === 'Mom' ? 'Read drafts, leave notes, and mark your review complete without entering the publishing workflow.' : 'Your workspace begins with Instagram-ready seeds, so capturing and uploading adventures never becomes another task for you.'}</Text></View>}
    <View style={styles.readinessRow}><View style={styles.readinessCard}><Text style={styles.readinessNumber}>{person === 'Trinitie' ? readyInstagram : mine.length}</Text><Text style={styles.readinessLabel}>{person === 'Trinitie' ? 'Instagram ready' : person === 'Mom' ? 'Ready to review' : 'Assigned to you'}</Text></View><View style={styles.readinessCard}><Text style={styles.readinessNumber}>{initialSchedule.socialDay.slice(0, 3)}</Text><Text style={styles.readinessLabel}>Social target</Text></View><View style={styles.readinessCard}><Text style={styles.readinessNumber}>{initialSchedule.journalDay.slice(0, 3)}</Text><Text style={styles.readinessLabel}>Journal target</Text></View></View>
    <View style={styles.listHeading}><Text style={styles.listTitle}>{person === 'Trinitie' ? 'Your studio' : person === 'Mom' ? 'Ready to review' : 'In your hands'}</Text><Text style={styles.listCount}>{mine.length} items</Text></View>
    {mine.map(seed => <SeedCard key={seed.id} seed={seed} />)}
    <Text style={styles.gentleNote}>{person === 'Trinitie' ? 'Nothing here requires Katie’s approval. Assignment shows responsibility, not ownership.' : person === 'Mom' ? 'Your notes support the story without changing Katie’s ownership or publishing schedule.' : 'No overdue alarms. If a queue is empty, the app will simply show where help may be useful.'}</Text>
  </ScrollView>
}

function NewAdventure({ onSave, onCancel }: { onSave: (seed: ContentSeed) => void; onCancel: () => void }) {
  const [title, setTitle] = useState(''), [note, setNote] = useState(''), [location, setLocation] = useState('')
  return <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled"><Text style={styles.eyebrow}>ADVENTURE INBOX</Text><Text style={styles.pageTitle}>Capture it while it’s fresh.</Text><Text style={styles.copy}>Start with the moment. Photos, videos, voice notes, and platform adaptations can be added without overwriting the originals.</Text>
    <Text style={styles.controlLabel}>Adventure name</Text><TextInput value={title} onChangeText={setTitle} placeholder="Desert sunrise with Cheeto" placeholderTextColor="#8b8075" style={styles.input} />
    <Text style={styles.controlLabel}>Quick notes</Text><TextInput value={note} onChangeText={setNote} placeholder="What happened? What did Cheeto do?" placeholderTextColor="#8b8075" style={[styles.input, styles.notesInput]} multiline />
    <Text style={styles.controlLabel}>Exact location · private</Text><TextInput value={location} onChangeText={setLocation} placeholder="Never published unless you choose" placeholderTextColor="#8b8075" style={styles.input} />
    <View style={styles.uploadWell}><Text style={styles.uploadIcon}>▧</Text><Text style={styles.uploadTitle}>Add selected media</Text><Text style={styles.uploadCopy}>Original-quality, resumable uploads will connect here. Nothing from your camera roll uploads automatically.</Text></View>
    <Pressable disabled={!title.trim()} onPress={() => onSave({ id: `${Date.now()}`, title: title.trim(), note: note.trim() || 'A new Nomadic Paws adventure.', capturedAt: 'Aug 24, 2026', assignedTo: 'Katie', status: 'Idea', platforms: [], mediaCount: 0, privateLocation: location.trim() || undefined })} style={[styles.primary, !title.trim() && styles.primaryDisabled]}><Text style={styles.primaryText}>Save adventure seed</Text></Pressable>
    <Pressable onPress={onCancel} style={styles.secondary}><Text style={styles.secondaryText}>Cancel</Text></Pressable>
  </ScrollView>
}

function Studio({ seeds }: { seeds: ContentSeed[] }) {
  return <ScrollView contentContainerStyle={styles.page}><Text style={styles.eyebrow}>CONTENT STUDIO</Text><Text style={styles.pageTitle}>One adventure. Its own voice everywhere.</Text><Text style={styles.copy}>Adapt a seed for Instagram, TikTok, YouTube Shorts, Pinterest, or the Trail Journal without changing the original.</Text>
    <View style={styles.studioBanner}><Text style={styles.studioBannerTitle}>Cheeto Assistant</Text><Text style={styles.studioBannerCopy}>Available when requested for captions, hooks, five relevant Instagram hashtags, alt text, and gentle rewrites.</Text><Pressable style={styles.assistantButton}><Text style={styles.assistantButtonText}>Ask the assistant</Text></Pressable></View>
    <View style={styles.listHeading}><Text style={styles.listTitle}>Content seeds</Text><Text style={styles.listCount}>{seeds.length} available</Text></View>{seeds.map(seed => <SeedCard key={seed.id} seed={seed} />)}
  </ScrollView>
}

function Pinterest({ token }: { token: string }) {
  const [stories, setStories] = useState<JournalStory[]>([]), [selected, setSelected] = useState<JournalStory>(), [loading, setLoading] = useState(true), [error, setError] = useState('')
  useEffect(() => { loadStories(token).then(data => setStories(data.stories)).catch(reason => setError(reason.message)).finally(() => setLoading(false)) }, [token])
  return <ScrollView contentContainerStyle={styles.page}><Text style={styles.eyebrow}>PINTEREST WORKSPACE</Text><Text style={styles.pageTitle}>Build a beautiful campaign.</Text><Text style={styles.copy}>Choose the story once, then prepare all four Pins without opening the article editor.</Text>
    {loading ? <ActivityIndicator color={colors.terracotta} /> : error ? <Text style={styles.error}>{error}</Text> : <StoryPicker stories={stories} selected={selected} onSelect={setSelected} />}
    {selected ? <><PinCard number={1} defaultColor="bark" /><PinCard number={2} defaultColor="sage" /><PinCard number={3} defaultColor="sand" /><PinCard number={4} defaultColor="terracotta" /><Pressable style={styles.primary}><Text style={styles.primaryText}>Save Pinterest campaign</Text></Pressable><Text style={styles.helper}>Campaign saving will connect to the existing GitHub publishing workflow in the next milestone.</Text></> : null}
  </ScrollView>
}

function Placeholder({ title, text }: { title: string; text: string }) { return <ScrollView contentContainerStyle={styles.page}><Text style={styles.eyebrow}>NOMADIC PAWS ADMIN</Text><Text style={styles.pageTitle}>{title}</Text><Text style={styles.copy}>{text}</Text></ScrollView> }

export default function App() {
  const [token, setToken] = useState(''), [tab, setTab] = useState<Tab>('Today'), [person, setPerson] = useState<Person>('Katie'), [seeds, setSeeds] = useState(starterSeeds), [creatingAdventure, setCreatingAdventure] = useState(false)
  const content = useMemo(() => creatingAdventure ? <NewAdventure onCancel={() => setCreatingAdventure(false)} onSave={seed => { setSeeds(current => [seed, ...current]); setCreatingAdventure(false) }} /> : tab === 'Today' ? <Today person={person} onPersonChange={setPerson} seeds={seeds} onNewAdventure={() => setCreatingAdventure(true)} /> : tab === 'Studio' ? <Studio seeds={person === 'Trinitie' ? seeds.filter(seed => seed.platforms.includes('Instagram')) : seeds} /> : tab === 'Pinterest' ? <Pinterest token={token} /> : tab === 'Register' ? <Placeholder title="Event Register" text="The existing test register and Stripe Terminal connection will move into this native workspace after device signing is available." /> : <Placeholder title={person === 'Katie' ? 'Trail Journal' : 'Trail Journal review'} text={person === 'Katie' ? 'Draft, schedule, and publish stories from a calm native editor. Existing drafts remain available for Sunday scheduling.' : person === 'Trinitie' ? 'Read Katie’s drafts, leave review notes, and return to your Instagram Studio without inheriting publishing work.' : 'Read Katie’s drafts, leave comments, and mark your review complete. Publishing controls remain out of the way.'} />, [creatingAdventure, person, seeds, tab, token])
  if (!token) return <Login onSignedIn={setToken} />
  const tabs: Tab[] = person === 'Trinitie' ? ['Today', 'Studio', 'Journal'] : person === 'Mom' ? ['Today', 'Journal'] : ['Today', 'Studio', 'Journal', 'Pinterest', 'Register']
  return <SafeAreaView style={styles.shell}><StatusBar barStyle="dark-content" /><View style={styles.appHeader}><Image source={require('./assets/icon.png')} style={styles.headerLogo} /><View><Text style={styles.appName}>Nomadic Paws</Text><Text style={styles.appSubtitle}>{person === 'Trinitie' ? 'Instagram Studio' : person === 'Mom' ? 'Trail Journal Review' : 'Creative & Publishing'}</Text></View></View>{content}<View style={styles.tabs}>{tabs.map(item => <Pressable key={item} onPress={() => { setCreatingAdventure(false); setTab(item) }} style={styles.tab}><Text style={[styles.tabText, tab === item && styles.tabTextActive]}>{item}</Text></Pressable>)}</View></SafeAreaView>
}

const styles = StyleSheet.create({
  shell:{flex:1,backgroundColor:colors.cream},login:{flex:1,backgroundColor:colors.cream,padding:28,justifyContent:'center'},loginLogo:{width:92,height:92,borderRadius:28,marginBottom:24},eyebrow:{color:colors.sageDeep,fontWeight:'800',fontSize:12,letterSpacing:1.5,marginBottom:8},heroTitle:{fontSize:38,lineHeight:44,fontWeight:'800',color:colors.bark,marginBottom:12},pageTitle:{fontSize:32,lineHeight:38,fontWeight:'800',color:colors.bark,marginBottom:10},copy:{fontSize:16,lineHeight:24,color:colors.barkSoft,marginBottom:22},input:{backgroundColor:colors.white,borderWidth:1,borderColor:colors.sandDeep,borderRadius:12,minHeight:52,paddingHorizontal:14,fontSize:16,color:colors.bark,marginBottom:12},primary:{backgroundColor:colors.terracotta,borderRadius:16,minHeight:56,alignItems:'center',justifyContent:'center',paddingHorizontal:20,marginTop:8},primaryText:{color:colors.white,fontSize:17,fontWeight:'800'},error:{color:'#a13d3d',lineHeight:22,marginBottom:12},appHeader:{height:64,paddingHorizontal:18,flexDirection:'row',alignItems:'center',borderBottomWidth:1,borderBottomColor:colors.sandDeep,backgroundColor:colors.white},headerLogo:{width:40,height:40,borderRadius:12,marginRight:11},appName:{fontSize:17,fontWeight:'800',color:colors.bark},appSubtitle:{fontSize:12,color:colors.barkSoft},page:{padding:20,paddingBottom:120},section:{marginVertical:8},sectionLabel:{fontSize:12,fontWeight:'800',letterSpacing:1.2,color:colors.sageDeep,marginBottom:8},selectedStory:{backgroundColor:colors.white,borderRadius:14,borderWidth:1,borderColor:colors.sandDeep,padding:16,flexDirection:'row',alignItems:'center'},change:{color:colors.terracottaDeep,fontWeight:'800',marginLeft:12},storyList:{gap:10},storyRow:{backgroundColor:colors.white,borderRadius:14,borderWidth:1,borderColor:colors.sandDeep,padding:16,minHeight:72,justifyContent:'center'},storyRowSelected:{borderColor:colors.terracotta,backgroundColor:'#fff8f3'},storyTitle:{fontSize:17,lineHeight:23,fontWeight:'700',color:colors.bark},storyMeta:{fontSize:13,color:colors.barkSoft,marginTop:5},pinCard:{backgroundColor:colors.white,borderRadius:18,borderWidth:1,borderColor:colors.sandDeep,padding:14,marginTop:18},pinHeading:{flexDirection:'row',justifyContent:'space-between',alignItems:'baseline',marginBottom:10},pinTitle:{fontSize:21,fontWeight:'800',color:colors.bark},pinTiming:{fontSize:12,color:colors.barkSoft},preview:{aspectRatio:2/3,borderRadius:14,overflow:'hidden',backgroundColor:colors.sand,position:'relative',marginBottom:12},previewPhoto:{...StyleSheet.absoluteFillObject,width:'100%',height:'100%'},emptyPreview:{flex:1,alignItems:'center',justifyContent:'center'},emptyIcon:{fontSize:34,color:colors.terracotta},emptyText:{fontSize:15,fontWeight:'700',color:colors.barkSoft,marginTop:5},previewLogo:{position:'absolute',bottom:'4%',height:80},logoSmall:{width:'23%'},logoMedium:{width:'31%'},logoLeft:{left:'6%'},logoRight:{right:'6%'},controlLabel:{fontSize:13,fontWeight:'800',color:colors.bark,marginTop:8,marginBottom:7},choiceRow:{flexDirection:'row',flexWrap:'wrap',gap:8,marginBottom:6},choice:{borderWidth:1,borderColor:colors.sandDeep,borderRadius:999,paddingHorizontal:13,paddingVertical:9,backgroundColor:colors.white},choiceSelected:{backgroundColor:colors.sageDeep,borderColor:colors.sageDeep},choiceText:{color:colors.bark,fontWeight:'700',fontSize:13},choiceTextSelected:{color:colors.white},helper:{fontSize:13,lineHeight:19,color:colors.barkSoft,textAlign:'center',marginTop:10},tabs:{position:'absolute',bottom:0,left:0,right:0,height:70,backgroundColor:colors.white,borderTopWidth:1,borderTopColor:colors.sandDeep,flexDirection:'row',paddingBottom:8},tab:{flex:1,alignItems:'center',justifyContent:'center'},tabText:{fontSize:11,fontWeight:'700',color:colors.barkSoft},tabTextActive:{color:colors.terracottaDeep},
  todayHeader:{flexDirection:'row',alignItems:'flex-start',gap:12},roleSwitch:{flexDirection:'row',backgroundColor:colors.sand,borderRadius:999,padding:3},roleButton:{paddingHorizontal:10,paddingVertical:7,borderRadius:999},roleButtonActive:{backgroundColor:colors.bark},roleText:{fontSize:12,fontWeight:'800',color:colors.barkSoft},roleTextActive:{color:colors.white},
  adventureButton:{backgroundColor:colors.bark,borderRadius:22,padding:20,marginBottom:18,flexDirection:'row',alignItems:'center',minHeight:132},adventureEyebrow:{fontSize:11,fontWeight:'900',letterSpacing:1.3,color:'#d9c9ae',marginBottom:7},adventureTitle:{fontSize:23,fontWeight:'800',color:colors.white,marginBottom:6},adventureCopy:{fontSize:14,lineHeight:20,color:'#e9dfd1',maxWidth:260},adventurePlus:{fontSize:38,color:colors.white,marginLeft:'auto'},
  readinessRow:{flexDirection:'row',gap:9,marginBottom:26},readinessCard:{flex:1,backgroundColor:colors.white,borderWidth:1,borderColor:colors.sandDeep,borderRadius:16,padding:13,minHeight:86,justifyContent:'center'},readinessNumber:{fontSize:23,fontWeight:'900',color:colors.terracottaDeep},readinessLabel:{fontSize:11,lineHeight:15,fontWeight:'700',color:colors.barkSoft,marginTop:4},listHeading:{flexDirection:'row',justifyContent:'space-between',alignItems:'baseline',marginBottom:10},listTitle:{fontSize:22,fontWeight:'800',color:colors.bark},listCount:{fontSize:12,fontWeight:'700',color:colors.barkSoft},
  seedCard:{backgroundColor:colors.white,borderWidth:1,borderColor:colors.sandDeep,borderRadius:19,padding:16,marginBottom:12},seedTop:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:11},seedStatus:{borderRadius:999,paddingHorizontal:9,paddingVertical:5},seedStatusText:{fontSize:10,fontWeight:'900',letterSpacing:.8,textTransform:'uppercase'},seedOwner:{fontSize:12,fontWeight:'800',color:colors.barkSoft},seedTitle:{fontSize:20,lineHeight:26,fontWeight:'800',color:colors.bark},seedNote:{fontSize:14,lineHeight:21,color:colors.barkSoft,marginTop:6},seedMeta:{flexDirection:'row',gap:14,marginTop:12},seedMetaText:{fontSize:12,fontWeight:'700',color:colors.sageDeep},platforms:{gap:6,paddingTop:12},platformPill:{backgroundColor:colors.sand,borderRadius:999,paddingHorizontal:9,paddingVertical:6},platformText:{fontSize:10,fontWeight:'800',color:colors.barkSoft},gentleNote:{fontSize:13,lineHeight:20,color:colors.barkSoft,textAlign:'center',paddingHorizontal:18,marginTop:8},
  notesInput:{minHeight:118,paddingTop:14,textAlignVertical:'top'},uploadWell:{borderWidth:1,borderStyle:'dashed',borderColor:colors.sage,borderRadius:18,backgroundColor:'#f7f8f3',padding:22,alignItems:'center',marginVertical:8},uploadIcon:{fontSize:31,color:colors.sageDeep},uploadTitle:{fontSize:17,fontWeight:'800',color:colors.bark,marginTop:7},uploadCopy:{fontSize:13,lineHeight:19,color:colors.barkSoft,textAlign:'center',marginTop:5},primaryDisabled:{opacity:.45},secondary:{minHeight:50,alignItems:'center',justifyContent:'center',marginTop:8},secondaryText:{fontSize:15,fontWeight:'800',color:colors.barkSoft},
  studioBanner:{backgroundColor:'#e8eee2',borderRadius:20,padding:18,marginBottom:24},studioBannerTitle:{fontSize:21,fontWeight:'900',color:colors.bark},studioBannerCopy:{fontSize:14,lineHeight:21,color:colors.barkSoft,marginTop:6},assistantButton:{alignSelf:'flex-start',backgroundColor:colors.sageDeep,borderRadius:999,paddingHorizontal:15,paddingVertical:10,marginTop:13},assistantButtonText:{fontSize:13,fontWeight:'800',color:colors.white},
  uploadReminder:{backgroundColor:'#f7f1e8',borderRadius:16,borderWidth:1,borderColor:colors.sandDeep,padding:14,marginTop:-6,marginBottom:18,flexDirection:'row',alignItems:'center',gap:12},uploadReminderTitle:{fontSize:14,fontWeight:'800',color:colors.bark},uploadReminderCopy:{fontSize:12,color:colors.barkSoft,marginTop:3},uploadReminderAction:{borderRadius:999,backgroundColor:colors.white,borderWidth:1,borderColor:colors.sandDeep,paddingHorizontal:12,paddingVertical:9},uploadReminderActionText:{fontSize:12,fontWeight:'800',color:colors.terracottaDeep},trinitieFocus:{backgroundColor:'#f0f3ec',borderRadius:18,padding:17,marginBottom:18},trinitieFocusTitle:{fontSize:16,fontWeight:'800',color:colors.bark},trinitieFocusCopy:{fontSize:13,lineHeight:19,color:colors.barkSoft,marginTop:5},
})
