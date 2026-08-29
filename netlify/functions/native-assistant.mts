import type { Config } from '@netlify/functions'
import { createHash } from 'node:crypto'
import { requireAppUser } from './lib/app-auth.mjs'

const HEADERS = { 'Cache-Control': 'private, no-store, max-age=0', 'X-Content-Type-Options': 'nosniff' }

export default async (request: Request) => {
  try {
    const user = await requireAppUser(request, ['katie', 'trinitie'])
    if (request.method !== 'POST') return Response.json({ error: 'Method not allowed.' }, { status: 405, headers: { ...HEADERS, Allow: 'POST' } })
    const key = process.env.OPENAI_API_KEY || ''
    if (!key) return Response.json({ error: 'The optional Cheeto Assistant key still needs to be connected in Netlify.' }, { status: 503, headers: HEADERS })
    const payload = await request.json().catch(() => ({})) as Record<string, unknown>
    const title = String(payload.title || '').slice(0, 180), theme = String(payload.theme || '').slice(0, 80), notes = String(payload.notes || '').slice(0, 4000)
    if (!title && !notes) return Response.json({ error: 'Give the assistant a title, note, or caption fragment first.' }, { status: 400, headers: HEADERS })
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: process.env.OPENAI_ASSISTANT_MODEL || 'gpt-5.4-mini',
        store: false,
        max_output_tokens: 900,
        safety_identifier: createHash('sha256').update(user.id).digest('hex').slice(0, 32),
        instructions: `You are the optional Nomadic Paws Cheeto Assistant. Write Instagram copy in Cheeto's established first-person voice: observant, dry, warm, mildly managerial, affectionate toward Katie, and never generic influencer language. Preserve supplied facts; never invent safety claims, locations, products, or events. Return exactly five genuinely relevant hashtags and a short plain-language reason for each. Suggestions are editable and never publish automatically.`,
        input: `Theme: ${theme || 'Cheeto adventure'}\nWorking title: ${title}\nNotes or existing caption: ${notes}`,
        text: {
          format: {
            type: 'json_schema',
            name: 'cheeto_instagram_suggestion',
            strict: true,
            schema: {
              type: 'object',
              additionalProperties: false,
              required: ['caption', 'hashtags'],
              properties: {
                caption: { type: 'string' },
                hashtags: {
                  type: 'array', minItems: 5, maxItems: 5,
                  items: { type: 'object', additionalProperties: false, required: ['tag', 'reason'], properties: { tag: { type: 'string' }, reason: { type: 'string' } } },
                },
              },
            },
          },
        },
      }),
    })
    const data = await response.json().catch(() => ({})) as any
    if (!response.ok) return Response.json({ error: data?.error?.message || 'The Cheeto Assistant is resting right now.' }, { status: response.status, headers: HEADERS })
    const text = data.output?.flatMap((item: any) => item.content || []).find((item: any) => item.type === 'output_text')?.text
    if (!text) throw new Error('The Cheeto Assistant returned an empty suggestion.')
    return Response.json({ suggestion: JSON.parse(text) }, { headers: HEADERS })
  } catch (error: any) {
    console.error('Cheeto Assistant failed', error)
    return Response.json({ error: error?.message || 'The Cheeto Assistant is resting right now.' }, { status: Number(error?.status) || 500, headers: HEADERS })
  }
}

export const config: Config = { path: '/api/app/assistant' }
