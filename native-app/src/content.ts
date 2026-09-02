export type Person = 'Katie' | 'Trinitie' | 'Mom'
export type ContentStatus = 'Idea' | 'Draft' | 'Ready' | 'Handed Off' | 'Posted'
export type Platform = 'Trail Journal' | 'Instagram' | 'Pinterest' | 'TikTok' | 'YouTube Shorts'
export type PreviewReaction = 'Love it' | 'Tiny change' | 'Left a note'
export type InstagramDay = { day: string; theme: string; enabled: boolean }
export type InstagramTemplateKind = 'Post overlay' | 'Carousel frame' | 'Story' | 'Reel cover' | 'Background' | 'Video end card'
export type InstagramTemplate = { id: string; name: string; kind: InstagramTemplateKind; aspectRatio: string; favorite: boolean; previewUrl?: string }
export type InstagramPostDraft = { id: string; title: string; caption: string; mediaUrls: string[]; targetDate: string | null; theme: string; status: 'Draft' | 'Ready' | 'Handed Off' | 'Posted'; assignedTo: 'Katie' | 'Trinitie'; handoffNote: string; sharedWithMom: boolean; altText: string; instagramUrl: string; pinterestReusable: boolean; postedAt: string | null; updatedAt: string }
export type VideoOverlayAnimation = 'Typewriter' | 'Fade' | 'Pop' | 'Flicker' | 'Word by word'
export type VideoOverlayPreset = {
  id: string
  name: string
  example: string
  animation: VideoOverlayAnimation
  defaultText: string
  defaultColor: string
  defaultAccent: string
  uppercase?: boolean
  boxed?: boolean
}

export type SharedPreview = {
  id: string
  title: string
  platform: Platform
  creator: Person
  sharedWith: Person[]
  version: number
  updatedAt: string
  imageUrl: string
  caption: string
  details: string[]
}

export type ContentSeed = {
  id: string
  title: string
  note: string
  capturedAt: string
  assignedTo: Person
  status: ContentStatus
  platforms: Platform[]
  mediaCount: number
  privateLocation?: string
  publicLocation?: string
}

export const starterSeeds: ContentSeed[] = [
  {
    id: 'morning-lead',
    title: 'The morning I let Cheeto lead',
    note: 'Desert sunrise, slow trail, and a very confident orange project manager.',
    capturedAt: 'Aug 24, 2026',
    assignedTo: 'Katie',
    status: 'Draft',
    platforms: ['Trail Journal', 'Pinterest'],
    mediaCount: 7,
    publicLocation: 'Tucson desert',
  },
  {
    id: 'window-supervisor',
    title: 'Window supervisor on duty',
    note: 'A quiet Cheeto moment ready for an Instagram caption.',
    capturedAt: 'Aug 23, 2026',
    assignedTo: 'Trinitie',
    status: 'Ready',
    platforms: ['Instagram'],
    mediaCount: 3,
  },
  {
    id: 'pezzy-field-notes',
    title: 'Pezzy trail-treat field notes',
    note: 'Product photos, honest reactions, and treat-bag closeups.',
    capturedAt: 'Aug 21, 2026',
    assignedTo: 'Katie',
    status: 'Idea',
    platforms: ['Instagram', 'TikTok', 'YouTube Shorts'],
    mediaCount: 11,
  },
]

export const instagramHashtagLimit = 5
export const initialSchedule = {
  socialDay: 'Friday',
  journalDay: 'Sunday',
}

export const initialInstagramRhythm: InstagramDay[] = [
  { day: 'Sunday', theme: 'Sabbath Sunday', enabled: true },
  { day: 'Monday', theme: 'Mood Monday', enabled: true },
  { day: 'Tuesday', theme: 'Training Tuesday', enabled: true },
  { day: 'Wednesday', theme: 'Whisker Wisdom Wednesday', enabled: true },
  { day: 'Thursday', theme: 'Trail Thursday', enabled: true },
  { day: 'Friday', theme: 'Adventures', enabled: true },
  { day: 'Saturday', theme: 'Adventures', enabled: true },
]

export const starterInstagramTemplates: InstagramTemplate[] = []

export const videoOverlayPresets: VideoOverlayPreset[] = [
  { id: 'clean-caption', name: 'Clean captions', example: 'Easy to read', animation: 'Word by word', defaultText: 'Cheeto would like the record corrected.', defaultColor: '#ffffff', defaultAccent: '#3f352a' },
  { id: 'typewriter', name: 'Trail typewriter', example: 'Field notes', animation: 'Typewriter', defaultText: 'Field note: the bird escaped again.', defaultColor: '#3f352a', defaultAccent: '#f4eee1', boxed: true },
  { id: 'neon', name: 'Desert neon', example: 'After dark', animation: 'Flicker', defaultText: 'TRAIL SUPERVISOR', defaultColor: '#fff4df', defaultAccent: '#c1734b', uppercase: true },
  { id: 'management', name: 'Management update', example: 'Official business', animation: 'Pop', defaultText: 'MANAGEMENT UPDATE', defaultColor: '#ffffff', defaultAccent: '#6f7e62', uppercase: true, boxed: true },
  { id: 'journal', name: 'Journal title', example: 'A quieter moment', animation: 'Fade', defaultText: 'The morning I let Cheeto lead', defaultColor: '#ffffff', defaultAccent: '#3f352a' },
  { id: 'cheeto', name: 'Cheeto commentary', example: 'Obviously important', animation: 'Pop', defaultText: 'I had this handled.', defaultColor: '#ffffff', defaultAccent: '#a85c39', boxed: true },
]

export const starterPreviews: SharedPreview[] = [
  {
    id: 'window-instagram-v2', title: 'Window supervisor on duty', platform: 'Instagram', creator: 'Trinitie', sharedWith: ['Katie', 'Mom'], version: 2, updatedAt: 'Today · 9:42 AM',
    imageUrl: 'https://nomadicpaws.co/images/products/scratcher/window-cheeto-clean-1200.jpg',
    caption: 'Management would like everyone to know the sunset passed inspection. Barely.',
    details: ['Carousel · 3 photos', '5 relevant hashtags', 'Friday target'],
  },
  {
    id: 'pezzy-short-v1', title: 'Cheeto conducts a treat inspection', platform: 'YouTube Shorts', creator: 'Katie', sharedWith: ['Trinitie'], version: 1, updatedAt: 'Yesterday · 4:18 PM',
    imageUrl: 'https://nomadicpaws.co/images/hero/cheeto-desert-sunset-mobile-720.jpg',
    caption: 'A searchable little field test featuring one extremely motivated orange reviewer.',
    details: ['Vertical video · 0:28', 'Cover selected', 'Audio note attached'],
  },
  {
    id: 'morning-journal-v3', title: 'The morning I let Cheeto lead', platform: 'Trail Journal', creator: 'Katie', sharedWith: ['Trinitie', 'Mom'], version: 3, updatedAt: 'Sunday · 7:05 PM',
    imageUrl: 'https://nomadicpaws.co/images/hero/cheeto-desert-sunset-mobile-720.jpg',
    caption: 'A Trail Journal draft about what changed when I stopped choosing every turn.',
    details: ['1,240 words', '7 photographs', 'Sunday target'],
  },
]
