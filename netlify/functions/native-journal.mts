import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { Config } from '@netlify/functions'
import { requireAppUser } from './lib/app-auth.mjs'
import { bearerToken, verifySellerToken } from './lib/event-auth.mjs'
import { addJournalReviewNote, allJournalWorkingDrafts, journalContributions, journalReviewNotes, journalWorkingDraft, journalWorkingVersions, renameJournalStory, saveJournalContribution, saveJournalWorkingDraft, updateJournalReviewNote } from './lib/journal-db.mjs'
import { REVIEW_STATUSES, validContribution, validReviewAnchor } from './lib/journal-collaboration.mjs'
import { journalSlug, journalStatus, journalVersion, parseJournalFile } from './lib/journal-content.mjs'
import { commitJournalDraft } from './lib/journal-github.mjs'

const POSTS_DIR = join(process.cwd(), '_posts')
const HEADERS = { 'Cache-Control': 'private, no-store, max-age=0', 'X-Content-Type-Options': 'nosniff' }

async function readStories() {
  const files = (await readdir(POSTS_DIR)).filter(file => file.endsWith('.md'))
  const sourceStories = await Promise.all(files.map(async file => {
    const raw = await readFile(join(POSTS_DIR, file), 'utf8')
    const { data, body } = parseJournalFile(raw)
    return {
      slug: file.replace(/\.md$/, ''), title: data.title || 'Untitled', description: data.description || '', category: data.category || '', image: data.image || '', imageAlt: data.image_alt || '',
      date: data.date || '', draft: data.draft === 'true', status: journalStatus(data), body, version: journalVersion(raw),
    }
  }))
  const sourceSlugs = new Set(sourceStories.map(story => story.slug))
  const newDrafts = (await allJournalWorkingDrafts()).filter(draft => !sourceSlugs.has(draft.story_slug))
  const dateString = (value: unknown) => value instanceof Date ? value.toISOString() : String(value || '')
  return [...sourceStories, ...newDrafts.map(draft => ({
    slug: draft.story_slug,
    title: draft.title || 'Untitled',
    description: draft.description || '',
    category: draft.category || 'Cheeto Diaries',
    image: draft.image || '',
    imageAlt: draft.image_alt || '',
    date: dateString(draft.publish_date || draft.updated_at),
    draft: draft.is_draft !== false,
    status: draft.is_draft === false ? 'Scheduled' : 'Draft',
    body: draft.body || '',
    version: `work-${draft.revision}`,
  }))]
}

async function nativeUser(request: Request) {
  try { return await requireAppUser(request) } catch (error) {
    const secret = process.env.EVENT_REGISTER_SESSION_SECRET || ''
    if (secret.length >= 32 && verifySellerToken(bearerToken(request.headers), secret)) return { role: 'katie' }
    throw error
  }
}

export default async (request: Request) => {
  try {
    const user = await nativeUser(request)
    if (request.method === 'GET') {
      const url = new URL(request.url)
      if (url.searchParams.get('view') === 'contributions') {
        if (!['katie', 'mom'].includes(user.role)) return Response.json({ error: 'This workspace is not part of your account.' }, { status: 403, headers: HEADERS })
        return Response.json({ contributions: await journalContributions() }, { headers: HEADERS })
      }
      const requestedSlug = url.searchParams.get('slug')
      const stories = await readStories()
      if (requestedSlug) {
        const story = stories.find(item => item.slug === requestedSlug)
        if (!story) return Response.json({ error: 'Trail Journal story not found.' }, { status: 404, headers: HEADERS })
        const [notes, workingDraft, versions] = await Promise.all([journalReviewNotes(story.slug), journalWorkingDraft(story.slug), journalWorkingVersions(story.slug)])
        return Response.json({ story, notes, workingDraft, versions }, { headers: HEADERS })
      }
      const summaries = stories.map(({ body: _body, ...story }) => story).sort((a, b) => b.date.localeCompare(a.date))
      return Response.json({ stories: summaries }, { headers: HEADERS })
    }
    if (request.method === 'POST') {
      const payload = await request.json().catch(() => ({})) as Record<string, unknown>
      if (payload.action === 'create-working-draft') {
        if (user.role !== 'katie') return Response.json({ error: 'Only Katie can begin Trail Journal stories.' }, { status: 403, headers: HEADERS })
        const title = String(payload.title || '').trim(), category = String(payload.category || 'Cheeto Diaries'), publishDate = String(payload.publishDate || '')
        if (!title || title.length > 180) return Response.json({ error: 'Add a title under 180 characters.' }, { status: 400, headers: HEADERS })
        if (!['Trail Reports', 'Cheeto Diaries', 'Gear', 'Tips'].includes(category)) return Response.json({ error: 'Choose a valid Trail Journal category.' }, { status: 400, headers: HEADERS })
        if (!/^\d{4}-\d{2}-\d{2}$/.test(publishDate) || Number.isNaN(Date.parse(`${publishDate}T12:00:00Z`))) return Response.json({ error: 'Choose a real target date in YYYY-MM-DD format.' }, { status: 400, headers: HEADERS })
        const slug = journalSlug(title, publishDate)
        if ((await readStories()).some(story => story.slug === slug)) return Response.json({ error: 'A Journal story with this title and date already exists.' }, { status: 409, headers: HEADERS })
        const workingDraft = await saveJournalWorkingDraft({ slug, baseVersion: 'new', title, description: '', category, image: '', imageAlt: '', body: '', isDraft: true, publishDate, expectedRevision: 0 })
        const story = { slug, title, description: '', category, image: '', imageAlt: '', date: publishDate || workingDraft.updated_at, draft: true, status: 'Draft', body: '', version: `work-${workingDraft.revision}` }
        return Response.json({ story, workingDraft, notes: [], versions: await journalWorkingVersions(slug) }, { status: 201, headers: HEADERS })
      }
      if (payload.action === 'save-contribution') {
        if (user.role !== 'mom') return Response.json({ error: 'CatNana contributions belong to CatNana’s workspace.' }, { status: 403, headers: HEADERS })
        if (!validContribution(payload)) return Response.json({ error: 'Keep the contribution within the available fields and add a thought before sending it.' }, { status: 400, headers: HEADERS })
        const contribution = await saveJournalContribution({ id: String(payload.id || ''), title: String(payload.title || ''), body: String(payload.body || ''), memoryClue: String(payload.memoryClue || ''), status: String(payload.status || 'draft') })
        return Response.json({ contribution }, { status: 201, headers: HEADERS })
      }
      if (payload.action === 'update-review-note') {
        if (!['katie', 'mom'].includes(user.role)) return Response.json({ error: 'This review action is not part of your account.' }, { status: 403, headers: HEADERS })
        const id = String(payload.id || ''), status = String(payload.status || ''), revisedText = String(payload.revisedText || '')
        if (!id || !REVIEW_STATUSES.has(status) || revisedText.length > 10000) return Response.json({ error: 'Choose a valid review resolution.' }, { status: 400, headers: HEADERS })
        const note = await updateJournalReviewNote({ id, status, revisedText })
        return note ? Response.json({ note }, { headers: HEADERS }) : Response.json({ error: 'Review note not found.' }, { status: 404, headers: HEADERS })
      }
      if (payload.action === 'save-working-draft') {
        if (user.role !== 'katie') return Response.json({ error: 'Only Katie can change Trail Journal drafts.' }, { status: 403, headers: HEADERS })
        const slug = String(payload.slug || ''), story = (await readStories()).find(item => item.slug === slug)
        if (!story) return Response.json({ error: 'Trail Journal story not found.' }, { status: 404, headers: HEADERS })
        const body = String(payload.body || ''), title = String(payload.title || '').trim(), description = String(payload.description || ''), category = String(payload.category || 'Cheeto Diaries')
        if (!title || title.length > 180) return Response.json({ error: 'Add a title under 180 characters.' }, { status: 400, headers: HEADERS })
        if (body.length > 250000 || description.length > 500) return Response.json({ error: 'This draft is too large to synchronize safely.' }, { status: 400, headers: HEADERS })
        if (!['Trail Reports', 'Cheeto Diaries', 'Gear', 'Tips'].includes(category)) return Response.json({ error: 'Choose a valid Trail Journal category.' }, { status: 400, headers: HEADERS })
        const saved = await saveJournalWorkingDraft({ slug, baseVersion: story.version, title, description, category, image: String(payload.image || ''), imageAlt: String(payload.imageAlt || ''), body, isDraft: payload.isDraft !== false, publishDate: String(payload.publishDate || ''), expectedRevision: Number(payload.expectedRevision || 0) })
        return Response.json({ workingDraft: saved }, { headers: HEADERS })
      }
      if (payload.action === 'publish-working-draft') {
        if (user.role !== 'katie') return Response.json({ error: 'Only Katie can publish Trail Journal stories.' }, { status: 403, headers: HEADERS })
        const slug = String(payload.slug || ''), draft = await journalWorkingDraft(slug)
        if (!draft) return Response.json({ error: 'Synchronize this draft before publishing.' }, { status: 400, headers: HEADERS })
        if (!draft.title.trim() || !draft.description.trim() || !draft.image || !draft.image_alt || draft.body.trim().length < 100) return Response.json({ error: 'Finish the title, excerpt, hero image, alt text, and story before publishing.' }, { status: 400, headers: HEADERS })
        const nextSlug = journalSlug(draft.title, draft.publish_date)
        const result = await commitJournalDraft(draft, nextSlug)
        if (nextSlug !== slug) await renameJournalStory(slug, nextSlug)
        return Response.json({ ...result, slug: nextSlug, state: 'committed' }, { headers: HEADERS })
      }
      if (payload.action !== 'add-review-note') return Response.json({ error: 'Unknown Journal action.' }, { status: 400, headers: HEADERS })
      const slug = String(payload.slug || ''), reviewer = String(payload.reviewer || ''), note = String(payload.note || '').trim(), suppliedVersion = String(payload.version || '')
      if (!['Trinitie', 'Mom'].includes(reviewer)) return Response.json({ error: 'Choose a Journal reviewer.' }, { status: 400, headers: HEADERS })
      const expectedReviewer = user.role === 'trinitie' ? 'Trinitie' : user.role === 'mom' ? 'Mom' : ''
      if (!expectedReviewer || reviewer !== expectedReviewer) return Response.json({ error: 'Review notes must use your own identity.' }, { status: 403, headers: HEADERS })
      if (!note || note.length > 3000) return Response.json({ error: 'Review notes must be between 1 and 3,000 characters.' }, { status: 400, headers: HEADERS })
      if (!validReviewAnchor(payload)) return Response.json({ error: 'Attach this note to a valid passage or selected text.' }, { status: 400, headers: HEADERS })
      const story = (await readStories()).find(item => item.slug === slug)
      if (!story) return Response.json({ error: 'Trail Journal story not found.' }, { status: 404, headers: HEADERS })
      const working = await journalWorkingDraft(slug)
      const currentVersion = working ? `work-${working.revision}` : story.version
      if (currentVersion !== suppliedVersion) return Response.json({ error: 'Katie updated this draft. Refresh it before leaving a note.' }, { status: 409, headers: HEADERS })
      const saved = await addJournalReviewNote({ slug, version: currentVersion, reviewer, note, anchorType: String(payload.anchorType || 'general'), anchorId: String(payload.anchorId || ''), quotedText: String(payload.quotedText || '') })
      return Response.json({ note: saved }, { status: 201, headers: HEADERS })
    }
    return Response.json({ error: 'Method not allowed.' }, { status: 405, headers: { ...HEADERS, Allow: 'GET, POST' } })
  } catch (error: any) {
    console.error('Native Journal failed', error)
    return Response.json({ error: error?.message || 'Nomadic Paws could not open the Trail Journal right now.' }, { status: Number(error?.status) || 500, headers: HEADERS })
  }
}

export const config: Config = { path: '/api/app/journal' }
