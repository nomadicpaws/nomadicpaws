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

type Tab = 'Home' | 'Journal' | 'Pinterest' | 'Register'
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
  const [token, setToken] = useState(''), [tab, setTab] = useState<Tab>('Pinterest')
  const content = useMemo(() => tab === 'Pinterest' ? <Pinterest token={token} /> : tab === 'Register' ? <Placeholder title="Event Register" text="The existing test register and Stripe Terminal connection will move into this native workspace after device signing is available." /> : tab === 'Journal' ? <Placeholder title="Trail Journal" text="Draft, schedule, and publish stories from a calm native editor." /> : <Placeholder title="Good morning." text="Your Trail Journal, Pinterest campaigns, and event register will live together here." />, [tab, token])
  if (!token) return <Login onSignedIn={setToken} />
  return <SafeAreaView style={styles.shell}><StatusBar barStyle="dark-content" /><View style={styles.appHeader}><Image source={require('./assets/icon.png')} style={styles.headerLogo} /><View><Text style={styles.appName}>Nomadic Paws</Text><Text style={styles.appSubtitle}>Admin</Text></View></View>{content}<View style={styles.tabs}>{(['Home', 'Journal', 'Pinterest', 'Register'] as Tab[]).map(item => <Pressable key={item} onPress={() => setTab(item)} style={styles.tab}><Text style={[styles.tabText, tab === item && styles.tabTextActive]}>{item}</Text></Pressable>)}</View></SafeAreaView>
}

const styles = StyleSheet.create({
  shell:{flex:1,backgroundColor:colors.cream},login:{flex:1,backgroundColor:colors.cream,padding:28,justifyContent:'center'},loginLogo:{width:92,height:92,borderRadius:28,marginBottom:24},eyebrow:{color:colors.sageDeep,fontWeight:'800',fontSize:12,letterSpacing:1.5,marginBottom:8},heroTitle:{fontSize:38,lineHeight:44,fontWeight:'800',color:colors.bark,marginBottom:12},pageTitle:{fontSize:32,lineHeight:38,fontWeight:'800',color:colors.bark,marginBottom:10},copy:{fontSize:16,lineHeight:24,color:colors.barkSoft,marginBottom:22},input:{backgroundColor:colors.white,borderWidth:1,borderColor:colors.sandDeep,borderRadius:12,minHeight:52,paddingHorizontal:14,fontSize:16,color:colors.bark,marginBottom:12},primary:{backgroundColor:colors.terracotta,borderRadius:16,minHeight:56,alignItems:'center',justifyContent:'center',paddingHorizontal:20,marginTop:8},primaryText:{color:colors.white,fontSize:17,fontWeight:'800'},error:{color:'#a13d3d',lineHeight:22,marginBottom:12},appHeader:{height:64,paddingHorizontal:18,flexDirection:'row',alignItems:'center',borderBottomWidth:1,borderBottomColor:colors.sandDeep,backgroundColor:colors.white},headerLogo:{width:40,height:40,borderRadius:12,marginRight:11},appName:{fontSize:17,fontWeight:'800',color:colors.bark},appSubtitle:{fontSize:12,color:colors.barkSoft},page:{padding:20,paddingBottom:120},section:{marginVertical:8},sectionLabel:{fontSize:12,fontWeight:'800',letterSpacing:1.2,color:colors.sageDeep,marginBottom:8},selectedStory:{backgroundColor:colors.white,borderRadius:14,borderWidth:1,borderColor:colors.sandDeep,padding:16,flexDirection:'row',alignItems:'center'},change:{color:colors.terracottaDeep,fontWeight:'800',marginLeft:12},storyList:{gap:10},storyRow:{backgroundColor:colors.white,borderRadius:14,borderWidth:1,borderColor:colors.sandDeep,padding:16,minHeight:72,justifyContent:'center'},storyRowSelected:{borderColor:colors.terracotta,backgroundColor:'#fff8f3'},storyTitle:{fontSize:17,lineHeight:23,fontWeight:'700',color:colors.bark},storyMeta:{fontSize:13,color:colors.barkSoft,marginTop:5},pinCard:{backgroundColor:colors.white,borderRadius:18,borderWidth:1,borderColor:colors.sandDeep,padding:14,marginTop:18},pinHeading:{flexDirection:'row',justifyContent:'space-between',alignItems:'baseline',marginBottom:10},pinTitle:{fontSize:21,fontWeight:'800',color:colors.bark},pinTiming:{fontSize:12,color:colors.barkSoft},preview:{aspectRatio:2/3,borderRadius:14,overflow:'hidden',backgroundColor:colors.sand,position:'relative',marginBottom:12},previewPhoto:{...StyleSheet.absoluteFillObject,width:'100%',height:'100%'},emptyPreview:{flex:1,alignItems:'center',justifyContent:'center'},emptyIcon:{fontSize:34,color:colors.terracotta},emptyText:{fontSize:15,fontWeight:'700',color:colors.barkSoft,marginTop:5},previewLogo:{position:'absolute',bottom:'4%',height:80},logoSmall:{width:'23%'},logoMedium:{width:'31%'},logoLeft:{left:'6%'},logoRight:{right:'6%'},controlLabel:{fontSize:13,fontWeight:'800',color:colors.bark,marginTop:8,marginBottom:7},choiceRow:{flexDirection:'row',flexWrap:'wrap',gap:8,marginBottom:6},choice:{borderWidth:1,borderColor:colors.sandDeep,borderRadius:999,paddingHorizontal:13,paddingVertical:9,backgroundColor:colors.white},choiceSelected:{backgroundColor:colors.sageDeep,borderColor:colors.sageDeep},choiceText:{color:colors.bark,fontWeight:'700',fontSize:13},choiceTextSelected:{color:colors.white},helper:{fontSize:13,lineHeight:19,color:colors.barkSoft,textAlign:'center',marginTop:10},tabs:{position:'absolute',bottom:0,left:0,right:0,height:70,backgroundColor:colors.white,borderTopWidth:1,borderTopColor:colors.sandDeep,flexDirection:'row',paddingBottom:8},tab:{flex:1,alignItems:'center',justifyContent:'center'},tabText:{fontSize:11,fontWeight:'700',color:colors.barkSoft},tabTextActive:{color:colors.terracottaDeep},
})
