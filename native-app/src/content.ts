export type Person = 'Katie' | 'Trinitie' | 'Mom'
export type ContentStatus = 'Idea' | 'Draft' | 'Ready' | 'Handed Off' | 'Posted'
export type Platform = 'Trail Journal' | 'Instagram' | 'Pinterest' | 'TikTok' | 'YouTube Shorts'

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
