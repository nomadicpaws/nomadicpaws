import assert from 'node:assert/strict'
import test from 'node:test'
import sharp from 'sharp'
import { renderWorkingImage } from '../netlify/functions/lib/media-render.mjs'

const original = Buffer.from(`<svg width="1200" height="800" xmlns="http://www.w3.org/2000/svg"><rect width="1200" height="800" fill="#c1734b"/><circle cx="600" cy="400" r="220" fill="#f4eee1"/></svg>`)

test('working image renderer creates exact platform dimensions', async () => {
  const version = { destination_type: 'pinterest', treatment: { logoColor: 'sand', logoSize: 'small', logoSide: 'right', focus: 'center' } }
  const finished = await renderWorkingImage(original, version)
  const metadata = await sharp(finished).metadata()
  assert.equal(metadata.width, 1000)
  assert.equal(metadata.height, 1500)
  assert.equal(metadata.format, 'jpeg')
})
