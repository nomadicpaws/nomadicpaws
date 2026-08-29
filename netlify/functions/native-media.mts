import { randomUUID } from 'node:crypto'
import { getStore } from '@netlify/blobs'
import type { Config } from '@netlify/functions'
import { requireAppUser } from './lib/app-auth.mjs'
import { addMediaAsset, adventureExists, adventuresWithMedia, createAdventure, mediaById, saveWorkingVersion, updateMediaDetails } from './lib/media-db.mjs'
import { MAX_DIRECT_PHOTO_BYTES, validAdventure, validDirectPhoto, validMediaDetails, validWorkingVersion } from './lib/media-settings.mjs'

const HEADERS = { 'Cache-Control': 'private, no-store, max-age=0', 'X-Content-Type-Options': 'nosniff' }
const store = () => getStore('nomadic-paws-original-media')

export default async (request: Request) => {
  try {
    const user = await requireAppUser(request, ['katie', 'trinitie'])
    const url = new URL(request.url)
    const fileMatch = url.pathname.match(/\/file\/([0-9a-f-]+)$/i)
    if (request.method === 'GET' && fileMatch) {
      const asset = await mediaById(fileMatch[1])
      if (!asset) return new Response('Media not found.', { status: 404, headers: HEADERS })
      const blob = await store().getWithMetadata(asset.blob_key, { type: 'stream', consistency: 'strong' })
      if (!blob) return new Response('Original is temporarily unavailable.', { status: 404, headers: HEADERS })
      return new Response(blob.data, { headers: { ...HEADERS, 'Content-Type': asset.content_type, 'Content-Length': String(asset.byte_size), ETag: blob.etag || '' } })
    }
    if (request.method === 'GET') return Response.json(await adventuresWithMedia(), { headers: HEADERS })
    if (request.method !== 'POST') return Response.json({ error: 'Method not allowed.' }, { status: 405, headers: HEADERS })
    const contentType = request.headers.get('content-type') || ''
    if (contentType.includes('multipart/form-data')) {
      if (user.role !== 'katie') return Response.json({ error: 'Adventure uploads belong to Katie’s workspace.' }, { status: 403, headers: HEADERS })
      const form = await request.formData(), file = form.get('file'), adventureId = String(form.get('adventureId') || '')
      if (!(file instanceof File) || !validDirectPhoto(file)) return Response.json({ error: `Choose a JPG, PNG, WebP, HEIC, or HEIF photo no larger than ${Math.floor(MAX_DIRECT_PHOTO_BYTES / 1024 / 1024)} MB.` }, { status: 400, headers: HEADERS })
      if (!/^[0-9a-f-]{36}$/i.test(adventureId) || !(await adventureExists(adventureId))) return Response.json({ error: 'Choose a saved adventure before adding photos.' }, { status: 400, headers: HEADERS })
      const blobKey = `originals/${adventureId}/${randomUUID()}`
      await store().set(blobKey, file, { metadata: { originalName: file.name, contentType: file.type, owner: user.id }, onlyIfNew: true })
      const asset = await addMediaAsset({ adventureId, blobKey, originalName: file.name || 'Nomadic Paws photo', contentType: file.type, byteSize: file.size }, user.id)
      return Response.json({ media: asset }, { status: 201, headers: HEADERS })
    }
    const body = await request.json().catch(() => ({})) as Record<string, unknown>
    if (body.action === 'update-media') {
      if (!validMediaDetails(body)) return Response.json({ error: 'Those photo details could not be saved.' }, { status: 400, headers: HEADERS })
      const media = await updateMediaDetails(String(body.mediaId), body.tags as string[], String(body.notes))
      return media ? Response.json({ media }, { headers: HEADERS }) : Response.json({ error: 'That photo is no longer available.' }, { status: 404, headers: HEADERS })
    }
    if (body.action === 'save-working-version') {
      if (!validWorkingVersion(body) || !(await mediaById(String(body.mediaId)))) return Response.json({ error: 'That working version could not be saved.' }, { status: 400, headers: HEADERS })
      return Response.json({ workingVersion: await saveWorkingVersion(String(body.mediaId), String(body.destination), body.treatment) }, { status: 201, headers: HEADERS })
    }
    if (user.role !== 'katie') return Response.json({ error: 'Adventure creation belongs to Katie’s workspace.' }, { status: 403, headers: HEADERS })
    if (body.action !== 'create-adventure' || !validAdventure(body)) return Response.json({ error: 'Give this adventure a short name before saving it.' }, { status: 400, headers: HEADERS })
    return Response.json({ adventure: await createAdventure(body, user.id) }, { status: 201, headers: HEADERS })
  } catch (error) {
    const status = Number((error as { status?: number })?.status || 500)
    if (status >= 500) console.error('Native media library failed', error)
    return Response.json({ error: status >= 500 ? 'The shared Media Library could not complete that request.' : String((error as Error)?.message || error) }, { status, headers: HEADERS })
  }
}

export const config: Config = { path: ['/api/app/media', '/api/app/media/file/*'] }
