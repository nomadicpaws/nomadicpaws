import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

test('database migrations use unique sequence numbers', () => {
  const migrations = readdirSync(join(root, 'netlify', 'database', 'migrations'))
    .filter((name) => name.endsWith('.sql'))
  const sequences = migrations.map((name) => name.match(/^(\d{12})_/)?.[1]).filter(Boolean)
  assert.equal(new Set(sequences).size, sequences.length, 'Netlify rejects duplicate database migration sequence numbers')
})

test('Studio and Events agree on the calendar deep-link scheme', () => {
  const eventsConfig = JSON.parse(readFileSync(join(root, 'future-event-register', 'app', 'app.json'), 'utf8'))
  const studioSource = readFileSync(join(root, 'native-app', 'App.tsx'), 'utf8')
  assert.equal(eventsConfig.expo.scheme, 'nomadicpawsevents')
  assert.match(studioSource, /nomadicpawsevents:\/\/calendar\?eventId=/)
})

test('Meet Cheeto page includes the production social images it references', () => {
  const page = readFileSync(join(root, 'cheeto', 'index.html'), 'utf8')
  const dynamicSitemap = readFileSync(join(root, 'netlify', 'functions', 'sitemap.mts'), 'utf8')
  assert.match(dynamicSitemap, /urlEntry\('\/cheeto\/'/)
  for (const filename of [
    'cheeto-desert-sunset-1440.jpg',
    'cheeto-desert-sunset-mobile-720.jpg',
    'cheeto-desert-sunset-share-1200x630.jpg',
  ]) {
    assert.match(page, new RegExp(filename.replaceAll('.', '\\.'), 'i'))
    assert.equal(existsSync(join(root, 'images', 'hero', filename)), true, `${filename} must be deployed with the profile page`)
  }
})
