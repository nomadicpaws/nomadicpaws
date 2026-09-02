import { randomUUID } from 'node:crypto'
import { getStore } from '@netlify/blobs'
import type { Config } from '@netlify/functions'
import { requireAppUser } from './lib/app-auth.mjs'
import { addMediaAsset, adventureExists, adventuresWithMedia, createAdventure, mediaById, saveWorkingVersion, updateMediaDetails, workingVersionById } from './lib/media-db.mjs'
import { MAX_ADVENTURE_VIDEO_BYTES, MAX_ADVENTURE_VIDEO_SECONDS, MAX_DIRECT_PHOTO_BYTES, VIDEO_CHUNK_BYTES, validAdventure, validDirectPhoto, validMediaDetails, validVideoUpload, validWorkingVersion } from './lib/media-settings.mjs'
import { renderWorkingImage, workingFilename } from './lib/media-render.mjs'
import { inspectR2Object, r2Configured, signedR2Download, signedR2Upload } from './lib/r2-media.mjs'

const HEADERS = { 'Cache-Control': 'private, no-store, max-age=0', 'X-Content-Type-Options': 'nosniff' }
const store = () => getStore('nomadic-paws-original-media')

export default async (request: Request) => {
  try {
    const user = await requireAppUser(request, ['katie', 'trinitie'])
    const url = new URL(request.url)
    const workingMatch = url.pathname.match(/\/working\/([0-9a-f-]+)$/i)
    if (request.method === 'GET' && workingMatch) {
      const version = await workingVersionById(workingMatch[1])
      if (!version) return new Response('Working version not found.', { status: 404, headers: HEADERS })
      const cacheKey = `working/${version.id}.jpg`
      let finished = await store().get(cacheKey, { type: 'arrayBuffer', consistency: 'strong' })
      if (!finished) {
        const original = await store().get(version.blob_key, { type: 'arrayBuffer', consistency: 'strong' })
        if (!original) return new Response('Original is temporarily unavailable.', { status: 404, headers: HEADERS })
        const rendered = await renderWorkingImage(Buffer.from(original), version)
        await store().set(cacheKey, rendered, { metadata: { workingVersionId: version.id, mediaId: version.media_id }, onlyIfNew: true })
        finished = rendered.buffer.slice(rendered.byteOffset, rendered.byteOffset + rendered.byteLength)
      }
      return new Response(finished, { headers: { ...HEADERS, 'Content-Type': 'image/jpeg', 'Content-Disposition': `attachment; filename="${workingFilename(version)}"` } })
    }
    const fileMatch = url.pathname.match(/\/file\/([0-9a-f-]+)$/i)
    if (request.method === 'GET' && fileMatch) {
      const asset = await mediaById(fileMatch[1])
      if (!asset) return new Response('Media not found.', { status: 404, headers: HEADERS })
      if (String(asset.blob_key).startsWith('r2/')) {
        return Response.redirect(await signedR2Download(String(asset.blob_key)), 302)
      }
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
      const requestedName = String(form.get('originalName') || '').trim()
      const displayName = String(form.get('displayName') || '').trim()
      const width = Math.max(0, Math.min(50000, Number.parseInt(String(form.get('width') || '0'), 10) || 0))
      const height = Math.max(0, Math.min(50000, Number.parseInt(String(form.get('height') || '0'), 10) || 0))
      if (!(file instanceof File) || !validDirectPhoto(file)) return Response.json({ error: `Choose a JPG, PNG, WebP, HEIC, or HEIF photo no larger than ${Math.floor(MAX_DIRECT_PHOTO_BYTES / 1024 / 1024)} MB.` }, { status: 400, headers: HEADERS })
      if (displayName.length > 160) return Response.json({ error: 'Keep the searchable media name under 160 characters.' }, { status: 400, headers: HEADERS })
      if (!/^[0-9a-f-]{36}$/i.test(adventureId) || !(await adventureExists(adventureId))) return Response.json({ error: 'Choose a saved adventure before adding photos.' }, { status: 400, headers: HEADERS })
      const blobKey = `originals/${adventureId}/${randomUUID()}`
      await store().set(blobKey, file, { metadata: { originalName: file.name, contentType: file.type, owner: user.id }, onlyIfNew: true })
      const originalName = requestedName && requestedName.length <= 255 ? requestedName : (file.name || 'Nomadic Paws photo')
      const asset = await addMediaAsset({ adventureId, blobKey, displayName, originalName, contentType: file.type, byteSize: file.size, width, height }, user.id)
      return Response.json({ media: asset }, { status: 201, headers: HEADERS })
    }
    const body = await request.json().catch(() => ({})) as Record<string, unknown>
    if (body.action === 'create-direct-video-upload') {
      if (user.role !== 'katie') return Response.json({ error: 'Adventure uploads belong to Katie’s workspace.' }, { status: 403, headers: HEADERS })
      if (!validVideoUpload(body)) return Response.json({ error: `Choose a video up to ${MAX_ADVENTURE_VIDEO_SECONDS} seconds and ${Math.floor(MAX_ADVENTURE_VIDEO_BYTES / 1024 / 1024)} MB.` }, { status: 400, headers: HEADERS })
      if (!(await adventureExists(String(body.adventureId)))) return Response.json({ error: 'Choose a saved adventure before adding videos.' }, { status: 400, headers: HEADERS })
      if (!r2Configured()) return Response.json({ mode: 'chunked' }, { headers: HEADERS })
      const uploadId = randomUUID(), objectKey = `r2/originals/${String(body.adventureId)}/${uploadId}`
      const session = {
        owner: user.id, objectKey, adventureId: String(body.adventureId), displayName: String(body.displayName || '').trim(), originalName: String(body.originalName),
        contentType: String(body.contentType).toLowerCase(), byteSize: Number(body.byteSize),
        width: Number(body.width) || 0, height: Number(body.height) || 0, durationSeconds: Number(body.durationSeconds),
      }
      await store().setJSON(`r2-uploads/${user.id}/${uploadId}`, session, { onlyIfNew: true })
      return Response.json({ mode: 'r2', uploadId, uploadUrl: await signedR2Upload(objectKey, session.contentType) }, { status: 201, headers: HEADERS })
    }
    if (body.action === 'finish-direct-video-upload' && r2Configured()) {
      const uploadId = String(body.uploadId || '')
      if (!/^[0-9a-f-]{36}$/i.test(uploadId)) return Response.json({ error: 'That video upload is not valid.' }, { status: 400, headers: HEADERS })
      const sessionKey = `r2-uploads/${user.id}/${uploadId}`
      const session = await store().get(sessionKey, { type: 'json', consistency: 'strong' }) as null | {
        owner: string; objectKey: string; adventureId: string; displayName: string; originalName: string; contentType: string;
        byteSize: number; width: number; height: number; durationSeconds: number
      }
      if (!session || session.owner !== user.id) return Response.json({ error: 'That video upload has expired.' }, { status: 404, headers: HEADERS })
      const uploaded = await inspectR2Object(session.objectKey)
      if (Number(uploaded.ContentLength || 0) !== session.byteSize) return Response.json({ error: 'The uploaded video did not match the original size.' }, { status: 409, headers: HEADERS })
      const asset = await addMediaAsset({ ...session, blobKey: session.objectKey, kind: 'video' }, user.id)
      await store().delete(sessionKey)
      return Response.json({ media: asset }, { status: 201, headers: HEADERS })
    }
    if (body.action === 'start-video-upload') {
      if (user.role !== 'katie') return Response.json({ error: 'Adventure uploads belong to Katie’s workspace.' }, { status: 403, headers: HEADERS })
      if (!validVideoUpload(body)) return Response.json({ error: `Choose a video up to ${MAX_ADVENTURE_VIDEO_SECONDS} seconds and ${Math.floor(MAX_ADVENTURE_VIDEO_BYTES / 1024 / 1024)} MB.` }, { status: 400, headers: HEADERS })
      if (!(await adventureExists(String(body.adventureId)))) return Response.json({ error: 'Choose a saved adventure before adding videos.' }, { status: 400, headers: HEADERS })
      const uploadId = randomUUID()
      const session = {
        uploadId,
        owner: user.id,
        adventureId: String(body.adventureId),
        originalName: String(body.originalName),
        displayName: String(body.displayName || '').trim(),
        contentType: String(body.contentType).toLowerCase(),
        byteSize: Number(body.byteSize),
        width: Math.max(0, Math.min(50000, Number(body.width) || 0)),
        height: Math.max(0, Math.min(50000, Number(body.height) || 0)),
        durationSeconds: Number(body.durationSeconds),
        chunkCount: Math.ceil(Number(body.byteSize) / VIDEO_CHUNK_BYTES),
      }
      await store().setJSON(`uploads/${user.id}/${uploadId}/session`, session, { onlyIfNew: true })
      return Response.json({ uploadId, chunkBytes: VIDEO_CHUNK_BYTES, chunkCount: session.chunkCount }, { status: 201, headers: HEADERS })
    }
    if (body.action === 'upload-video-chunk' || body.action === 'finish-video-upload') {
      const uploadId = String(body.uploadId || '')
      if (!/^[0-9a-f-]{36}$/i.test(uploadId)) return Response.json({ error: 'That video upload is not valid.' }, { status: 400, headers: HEADERS })
      const sessionKey = `uploads/${user.id}/${uploadId}/session`
      const session = await store().get(sessionKey, { type: 'json', consistency: 'strong' }) as null | {
        owner: string; adventureId: string; displayName: string; originalName: string; contentType: string; byteSize: number;
        width: number; height: number; durationSeconds: number; chunkCount: number
      }
      if (!session || session.owner !== user.id) return Response.json({ error: 'That video upload has expired.' }, { status: 404, headers: HEADERS })
      if (body.action === 'upload-video-chunk') {
        const index = Number(body.index), encoded = String(body.data || '')
        if (!Number.isInteger(index) || index < 0 || index >= session.chunkCount || !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) return Response.json({ error: 'That video piece is not valid.' }, { status: 400, headers: HEADERS })
        const chunk = Buffer.from(encoded, 'base64')
        if (!chunk.length || chunk.length > VIDEO_CHUNK_BYTES) return Response.json({ error: 'That video piece is too large.' }, { status: 400, headers: HEADERS })
        await store().set(`uploads/${user.id}/${uploadId}/chunk-${index}`, chunk, { onlyIfNew: true })
        return Response.json({ received: index }, { headers: HEADERS })
      }
      const pieces: Buffer[] = []
      for (let index = 0; index < session.chunkCount; index += 1) {
        const piece = await store().get(`uploads/${user.id}/${uploadId}/chunk-${index}`, { type: 'arrayBuffer', consistency: 'strong' })
        if (!piece) return Response.json({ error: `Video upload is missing piece ${index + 1}. Please retry.` }, { status: 409, headers: HEADERS })
        pieces.push(Buffer.from(piece))
      }
      const video = Buffer.concat(pieces)
      if (video.byteLength !== session.byteSize) return Response.json({ error: 'The completed video size did not match the original.' }, { status: 409, headers: HEADERS })
      const blobKey = `originals/${session.adventureId}/${randomUUID()}`
      await store().set(blobKey, video, { metadata: { originalName: session.originalName, contentType: session.contentType, owner: user.id }, onlyIfNew: true })
      const asset = await addMediaAsset({ ...session, blobKey, kind: 'video' }, user.id)
      await Promise.all([
        store().delete(sessionKey),
        ...Array.from({ length: session.chunkCount }, (_, index) => store().delete(`uploads/${user.id}/${uploadId}/chunk-${index}`)),
      ])
      return Response.json({ media: asset }, { status: 201, headers: HEADERS })
    }
    if (body.action === 'update-media') {
      if (!validMediaDetails(body)) return Response.json({ error: 'Those photo details could not be saved.' }, { status: 400, headers: HEADERS })
      const media = await updateMediaDetails(String(body.mediaId), String(body.displayName || ''), body.tags as string[], String(body.notes))
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

export const config: Config = { path: ['/api/app/media', '/api/app/media/file/*', '/api/app/media/working/*'] }
