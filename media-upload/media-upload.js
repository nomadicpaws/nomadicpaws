(() => {
  const API = '/api/web-media-upload'
  const PHOTO = new Set(['jpg', 'jpeg', 'png', 'heic', 'heif', 'webp'])
  const VIDEO = new Set(['mov', 'mp4', 'm4v'])
  const MIME = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', heic: 'image/heic', heif: 'image/heif', webp: 'image/webp', mov: 'video/quicktime', mp4: 'video/mp4', m4v: 'video/x-m4v' }
  const $ = (id) => document.getElementById(id)
  let token = sessionStorage.getItem('np-media-upload-token') || ''
  let sources = []
  let running = false

  async function api(body, authenticated = true) {
    const response = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(authenticated ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(body),
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(data.error || 'The private uploader could not continue.')
    return data
  }

  function showUploader() {
    $('signin').hidden = true
    $('uploader').hidden = false
  }

  $('signinButton').addEventListener('click', async () => {
    $('signinButton').disabled = true
    try {
      const data = await api({ action: 'sign-in', accessCode: $('code').value }, false)
      token = data.token
      sessionStorage.setItem('np-media-upload-token', token)
      await api({ action: 'prepare' })
      showUploader()
    } catch (error) {
      alert(error.message)
    } finally {
      $('signinButton').disabled = false
    }
  })

  async function zipSources(file) {
    if (!window.zip) throw new Error('The ZIP reader did not load. Refresh and try again.')
    const reader = new zip.ZipReader(new zip.BlobReader(file))
    const entries = await reader.getEntries()
    const usable = entries.filter((entry) => !entry.directory && supported(entry.filename))
    return usable.map((entry) => ({
      name: entry.filename.split('/').pop(),
      size: entry.uncompressedSize,
      kind: kindFor(entry.filename),
      blob: () => entry.getData(new zip.BlobWriter(mimeFor(entry.filename))),
      close: () => reader.close(),
    }))
  }

  function extension(name) { return String(name).split('.').pop().toLowerCase() }
  function supported(name) { const ext = extension(name); return PHOTO.has(ext) || VIDEO.has(ext) }
  function kindFor(name) { return VIDEO.has(extension(name)) ? 'video' : 'photo' }
  function mimeFor(name) { return MIME[extension(name)] || 'application/octet-stream' }
  function fingerprint(source) { return `${source.name.toLowerCase()}:${source.size}:${source.kind}` }

  $('archive').addEventListener('change', async (event) => {
    sources = []
    $('failures').innerHTML = ''
    const files = [...event.target.files]
    try {
      for (const file of files) {
        if (extension(file.name) === 'zip') sources.push(...await zipSources(file))
        else if (supported(file.name)) sources.push({ name: file.name, size: file.size, kind: kindFor(file.name), blob: async () => file })
      }
      const photos = sources.filter((item) => item.kind === 'photo').length
      const videos = sources.length - photos
      $('summary').textContent = `${sources.length} files ready · ${photos} photos · ${videos} video files`
      $('summary').hidden = false
      $('uploadButton').disabled = !sources.length
      $('status').textContent = sources.length ? 'Ready. Originals will upload one at a time.' : 'No supported photos or videos were found.'
    } catch (error) {
      $('status').textContent = error.message
    }
  })

  async function uploadOne(source) {
    const started = await api({
      action: 'create-upload', originalName: source.name,
      displayName: source.name.replace(/\.[^.]+$/, ''), contentType: mimeFor(source.name),
      byteSize: source.size, kind: source.kind,
    })
    if (started.mode === 'duplicate') return 'duplicate'
    const blob = await source.blob()
    const uploaded = await fetch(started.uploadUrl, { method: 'PUT', headers: { 'Content-Type': mimeFor(source.name) }, body: blob })
    if (!uploaded.ok) throw new Error(`Cloud storage refused ${source.name}.`)
    await api({ action: 'finish-upload', uploadId: started.uploadId })
    return 'uploaded'
  }

  async function run() {
    if (running || !sources.length) return
    running = true
    $('uploadButton').disabled = true
    $('retryButton').hidden = true
    $('failures').innerHTML = ''
    const failures = []
    let completed = 0
    let duplicates = 0
    for (let index = 0; index < sources.length; index += 1) {
      const source = sources[index]
      $('status').textContent = `Uploading ${index + 1} of ${sources.length}: ${source.name}`
      try {
        const result = await uploadOne(source)
        if (result === 'duplicate') duplicates += 1
        completed += 1
      } catch (error) {
        failures.push({ source, message: error.message })
        const item = document.createElement('li')
        item.textContent = `${source.name}: ${error.message}`
        $('failures').appendChild(item)
      }
      $('progress').style.width = `${Math.round(((index + 1) / sources.length) * 100)}%`
    }
    running = false
    sources = failures.map((item) => item.source)
    if (failures.length) {
      $('status').textContent = `${completed} saved or already present; ${failures.length} need another try.`
      $('retryButton').hidden = false
    } else {
      $('status').textContent = `Finished: ${completed} files are in Media${duplicates ? ` (${duplicates} duplicates safely skipped)` : ''}. You may delete the ZIP.`
    }
  }

  $('uploadButton').addEventListener('click', run)
  $('retryButton').addEventListener('click', run)
  if (token) api({ action: 'prepare' }).then(showUploader).catch(() => sessionStorage.removeItem('np-media-upload-token'))
})()
