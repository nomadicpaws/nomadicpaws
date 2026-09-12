import assert from 'node:assert/strict'
import test from 'node:test'
import { normalizeR2Endpoint } from '../netlify/functions/lib/r2-media.mjs'

test('R2 endpoint accepts the account URL with or without its bucket path', () => {
  const account = 'https://484cac67d94c04b2a4dcf7aa9e505203.us.r2.cloudflarestorage.com'
  assert.equal(normalizeR2Endpoint(account, 'nomadic-paws-media'), account)
  assert.equal(normalizeR2Endpoint(`${account}/nomadic-paws-media`, 'nomadic-paws-media'), account)
  assert.equal(normalizeR2Endpoint(`${account}/nomadic-paws-media/`, 'nomadic-paws-media'), account)
})
