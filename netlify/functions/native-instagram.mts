import type { Config } from '@netlify/functions'
import { getStore } from '@netlify/blobs'
import { requireAppUser } from './lib/app-auth.mjs'
import { bearerToken, verifySellerToken } from './lib/event-auth.mjs'
import { getInstagramStudio, instagramTemplateById, saveInstagramPost, saveInstagramRhythm, saveInstagramTemplate } from './lib/instagram-db.mjs'
import { validInstagramPost, validInstagramRhythm } from './lib/instagram-settings.mjs'

const HEADERS = { 'Cache-Control': 'private, no-store, max-age=0', 'X-Content-Type-Options': 'nosniff' }
const templates = () => getStore('nomadic-paws-instagram-templates')

async function authorized(request: Request) {
  try { await requireAppUser(request, ['katie', 'trinitie']); return } catch (error) {
    const secret = process.env.EVENT_REGISTER_SESSION_SECRET || ''
    if (secret.length >= 32 && verifySellerToken(bearerToken(request.headers), secret)) return
    throw error
  }
}

export default async (request: Request) => {
  try {
    await authorized(request)
    const url = new URL(request.url)
    const templateMatch = url.pathname.match(/\/template\/([0-9a-f-]+)$/i)
    if (request.method === 'GET' && templateMatch) {
      const template = await instagramTemplateById(templateMatch[1])
      if (!template) return new Response('Template not found.', { status: 404, headers: HEADERS })
      const blob = await templates().getWithMetadata(`templates/${template.id}`, { type: 'stream', consistency: 'strong' })
      return blob ? new Response(blob.data, { headers: { ...HEADERS, 'Content-Type': String(blob.metadata?.contentType || 'image/png') } }) : new Response('Template not found.', { status: 404, headers: HEADERS })
    }
    if (request.method === 'GET') return Response.json(await getInstagramStudio(), { headers: HEADERS })
    if (request.method === 'PUT') {
      const payload = await request.json().catch(() => ({})) as Record<string, unknown>
      if (!validInstagramRhythm(payload.rhythm)) return Response.json({ error: 'Instagram rhythm must include one valid theme for each day.' }, { status: 400, headers: HEADERS })
      return Response.json(await saveInstagramRhythm(payload.rhythm), { headers: HEADERS })
    }
    if (request.method === 'POST') {
      if ((request.headers.get('content-type') || '').includes('multipart/form-data')) {
        const form = await request.formData(), file = form.get('file')
        if (!(file instanceof File) || !['image/png', 'image/jpeg'].includes(file.type) || file.size > 10 * 1024 * 1024) return Response.json({ error: 'Choose a PNG or JPG template no larger than 10 MB.' }, { status: 400, headers: HEADERS })
        const width = Number.parseInt(String(form.get('width') || '0'), 10) || 0
        const height = Number.parseInt(String(form.get('height') || '0'), 10) || 0
        const template = await saveInstagramTemplate({ name: file.name || 'Instagram template', kind: String(form.get('kind') || 'Post overlay'), aspectRatio: width && height ? `${width}:${height}` : '4:5', hasTransparency: file.type === 'image/png' })
        await templates().set(template.blobKey, file, { metadata: { templateId: template.id, originalName: file.name, contentType: file.type }, onlyIfNew: true })
        const { blobKey, ...publicTemplate } = template
        return Response.json({ template: publicTemplate }, { status: 201, headers: HEADERS })
      }
      const payload = await request.json().catch(() => ({})) as Record<string, unknown>
      if (payload.action !== 'save-post' || !validInstagramPost(payload)) return Response.json({ error: 'This Instagram draft is incomplete or invalid.' }, { status: 400, headers: HEADERS })
      return Response.json({ post: await saveInstagramPost(payload) }, { headers: HEADERS })
    }
    return Response.json({ error: 'Method not allowed.' }, { status: 405, headers: { ...HEADERS, Allow: 'GET, PUT, POST' } })
  } catch (error: any) {
    console.error('Instagram Studio failed', error)
    return Response.json({ error: error?.message || 'Nomadic Paws could not open Instagram Studio right now.' }, { status: Number(error?.status) || 500, headers: HEADERS })
  }
}

export const config: Config = { path: ['/api/app/instagram', '/api/app/instagram/template/*'] }
