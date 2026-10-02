import { randomUUID } from 'node:crypto'
import { getStore } from '@netlify/blobs'
import type { Config } from '@netlify/functions'
import { activeKatieUser } from './lib/app-auth.mjs'
import { createSellerToken, verifySellerToken, bearerToken, secureEqual, authRateLimitKey } from './lib/event-auth.mjs'
import { clearAuthFailures, getAuthThrottle, recordAuthFailure } from './lib/event-db.mjs'
import { addMediaAsset, ensureMediaLibraryCollection, mediaByBlobKey, mediaByImportFingerprint, mediaById } from './lib/media-db.mjs'
import { PHOTO_TYPES, VIDEO_TYPES, normalizeMediaContentType } from './lib/media-settings.mjs'
import { inspectR2Object, r2Configured, signedR2Upload } from './lib/r2-media.mjs'

const HEADERS = { 'Cache-Control': 'private, no-store, max-age=0', 'X-Content-Type-Options': 'nosniff' }
const MAX_PHOTO_BYTES = 50 * 1024 * 1024
const MAX_ARCHIVE_VIDEO_BYTES = 500 * 1024 * 1024
const store = () => getStore('nomadic-paws-original-media')
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: HEADERS })

function uploadUser(request: Request) {
  const secret = process.env.EVENT_REGISTER_SESSION_SECRET || ''
  const claims = verifySellerToken(bearerToken(request.headers), secret)
  if (!claims || claims.permission !== 'media-upload' || !claims.staffId) {
    throw Object.assign(new Error('Your private upload session expired.'), { status: 401 })
  }
  return { id: String(claims.staffId) }
}

export default async (request: Request) => {
  try {
    if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405)
    const body = await request.json().catch(() => ({})) as Record<string, unknown>
    if (body.action === 'sign-in') {
      const configured = process.env.MEDIA_UPLOAD_ACCESS_CODE || process.env.EVENT_REGISTER_ACCESS_CODE || ''
      const secret = process.env.EVENT_REGISTER_SESSION_SECRET || ''
      if (configured.length < 8 || secret.length < 32) return json({ error: 'Private uploads are not configured.' }, 503)
      const clientKey = authRateLimitKey(request, secret)
      const throttle = await getAuthThrottle(clientKey)
      if (Number(throttle.retry_after) > 0) return json({ error: 'Too many attempts. Try again in about 15 minutes.' }, 429)
      if (!secureEqual(String(body.accessCode || ''), configured)) {
        await recordAuthFailure(clientKey)
        return json({ error: 'That private upload code is incorrect.' }, 401)
      }
      await clearAuthFailures(clientKey)
      const katie = await activeKatieUser()
      if (!katie) return json({ error: 'Katie’s Studio account is not ready.' }, 409)
      const token = createSellerToken(secret, { ttlSeconds: 2 * 60 * 60, staffId: katie.id, name: 'Katie', permission: 'media-upload' })
      return json({ token, expiresInSeconds: 7200 })
    }

    const user = uploadUser(request)
    if (body.action === 'prepare') {
      if (!r2Configured()) return json({ error: 'Private cloud storage is not configured.' }, 503)
      const adventure = await ensureMediaLibraryCollection(user.id)
      return json({ adventureId: adventure.id })
    }

    if (body.action === 'create-upload') {
      if (!r2Configured()) return json({ error: 'Private cloud storage is not configured.' }, 503)
      const originalName = String(body.originalName || '').trim()
      const displayName = String(body.displayName || '').trim()
      const contentType = normalizeMediaContentType(String(body.contentType || ''))
      const byteSize = Number(body.byteSize)
      const kind = String(body.kind) === 'video' ? 'video' : 'photo'
      const allowedType = kind === 'video' ? VIDEO_TYPES.has(contentType) : PHOTO_TYPES.has(contentType)
      const maxBytes = kind === 'video' ? MAX_ARCHIVE_VIDEO_BYTES : MAX_PHOTO_BYTES
      if (!originalName || originalName.length > 255 || displayName.length > 160 || !allowedType || !Number.isInteger(byteSize) || byteSize <= 0 || byteSize > maxBytes) {
        return json({ error: `That ${kind} is not a supported archive item.` }, 400)
      }
      const duplicate = await mediaByImportFingerprint(user.id, originalName, byteSize, kind)
      if (duplicate) return json({ mode: 'duplicate', media: duplicate })
      const adventure = await ensureMediaLibraryCollection(user.id)
      const uploadId = randomUUID()
      const objectKey = `r2/originals/${adventure.id}/${uploadId}`
      const session = { owner: user.id, objectKey, adventureId: adventure.id, displayName, originalName, contentType, byteSize, width: 0, height: 0, durationSeconds: 0, kind }
      await store().setJSON(`web-r2-uploads/${user.id}/${uploadId}`, session, { onlyIfNew: true })
      return json({ mode: 'r2', uploadId, uploadUrl: await signedR2Upload(objectKey, contentType) }, 201)
    }

    if (body.action === 'finish-upload') {
      const uploadId = String(body.uploadId || '')
      if (!/^[0-9a-f-]{36}$/i.test(uploadId)) return json({ error: 'That upload is not valid.' }, 400)
      const receiptKey = `web-r2-receipts/${user.id}/${uploadId}`
      const receipt = await store().get(receiptKey, { type: 'json', consistency: 'strong' }) as null | { mediaId?: string }
      if (receipt?.mediaId) {
        const completed = await mediaById(receipt.mediaId)
        if (completed) return json({ media: completed })
      }
      const sessionKey = `web-r2-uploads/${user.id}/${uploadId}`
      const session = await store().get(sessionKey, { type: 'json', consistency: 'strong' }) as null | Record<string, unknown>
      if (!session || session.owner !== user.id) return json({ error: 'That upload expired. Retry this item.' }, 404)
      const uploaded = await inspectR2Object(String(session.objectKey))
      if (Number(uploaded.ContentLength || 0) !== Number(session.byteSize)) return json({ error: 'The cloud copy did not match the original size.' }, 409)
      const existing = await mediaByBlobKey(String(session.objectKey))
      const asset = existing || await addMediaAsset({
        adventureId: String(session.adventureId), blobKey: String(session.objectKey), displayName: String(session.displayName),
        originalName: String(session.originalName), contentType: String(session.contentType), byteSize: Number(session.byteSize),
        width: 0, height: 0, durationSeconds: 0, kind: String(session.kind),
      }, user.id)
      await store().setJSON(receiptKey, { mediaId: asset.id, completedAt: new Date().toISOString() })
      await store().delete(sessionKey)
      return json({ media: asset }, 201)
    }
    return json({ error: 'Unknown upload action.' }, 400)
  } catch (error) {
    const status = Number((error as { status?: number })?.status || 500)
    if (status >= 500) console.error('Web media upload failed', error)
    return json({ error: status >= 500 ? 'The private uploader could not continue right now.' : String((error as Error)?.message || error) }, status)
  }
}

export const config: Config = { path: '/api/web-media-upload' }
