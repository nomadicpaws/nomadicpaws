(() => {
  const presets = [
    { id: 'clean', name: 'Clean captions', example: 'Easy to read', animation: 'Word by word', text: 'Cheeto would like the record corrected.', color: '#ffffff', accent: '#3f352a' },
    { id: 'typewriter', name: 'Trail typewriter', example: 'Field notes', animation: 'Typewriter', text: 'Field note: the bird escaped again.', color: '#3f352a', accent: '#f4eee1', boxed: true },
    { id: 'neon', name: 'Desert neon', example: 'After dark', animation: 'Flicker', text: 'TRAIL SUPERVISOR', color: '#fff4df', accent: '#c1734b', neon: true, upper: true },
    { id: 'management', name: 'Management update', example: 'Official business', animation: 'Pop', text: 'MANAGEMENT UPDATE', color: '#ffffff', accent: '#6f7e62', boxed: true, upper: true },
    { id: 'journal', name: 'Journal title', example: 'A quieter moment', animation: 'Fade', text: 'The morning I let Cheeto lead', color: '#ffffff', accent: '#3f352a' },
    { id: 'cheeto', name: 'Cheeto commentary', example: 'Obviously important', animation: 'Pop', text: 'I had this handled.', color: '#ffffff', accent: '#a85c39', boxed: true },
  ]
  const palette = [['White', '#ffffff'], ['Bark', '#3f352a'], ['Sand', '#f4eee1'], ['Terracotta', '#c1734b'], ['Sage', '#6f7e62'], ['Black', '#111111']]
  const fonts = [
    { id: 'clean', name: 'Clean', family: 'DM, sans-serif' },
    { id: 'editorial', name: 'Trail Journal', family: 'Fraunces, serif' },
    { id: 'typewriter', name: 'Typewriter', family: '"Special Elite", monospace' },
    { id: 'handwritten', name: 'Handwritten', family: 'Caveat, cursive' },
    { id: 'tall', name: 'Tall title', family: '"Bebas Neue", sans-serif' },
    { id: 'bold', name: 'Bold Cheeto', family: 'Bungee, sans-serif' },
    { id: 'classic', name: 'Classic story', family: '"Playfair Display", serif' },
    { id: 'impact', name: 'Big emphasis', family: '"Archivo Black", sans-serif' },
  ]
  const preview = document.querySelector('.preview'), previewImage = preview.querySelector('img'), overlay = document.querySelector('#overlay'), input = document.querySelector('#overlayText'), tray = document.querySelector('#presets')
  const textTray = document.querySelector('#textColors'), accentTray = document.querySelector('#accentColors'), message = document.querySelector('#message')
  const fontLabel = document.createElement('label'), fontTray = document.createElement('section')
  fontLabel.textContent = 'Font'; fontTray.id = 'fonts'; fontTray.className = 'fonts'; fontTray.setAttribute('aria-label', 'Font choices')
  document.querySelector('#textColors').previousElementSibling.before(fontLabel, fontTray)
  const playButton = document.createElement('button')
  playButton.className = 'preview-play'; playButton.innerHTML = '<span>▶</span><b>Play animation preview</b>'
  preview.after(playButton)
  const mediaVideo = document.createElement('video'); mediaVideo.id = 'clipVideo'; mediaVideo.playsInline = true; mediaVideo.preload = 'metadata'; mediaVideo.hidden = true; preview.prepend(mediaVideo)
  const clipPicker = document.createElement('section'); clipPicker.className = 'clip-picker'
  clipPicker.innerHTML = '<input id="clipInput" type="file" accept="video/*"><label class="clip-button" for="clipInput"><span class="clip-icon">＋</span><span class="clip-copy"><b>Choose a video</b><small id="clipName">From Photos or Files · the original stays untouched</small></span></label><p id="clipStatus" class="clip-status">You can test the complete edit locally before saving a shared draft.</p>'
  document.querySelector('.intro').after(clipPicker)
  let clipUrl = ''
  let selected = presets[0], selectedFont = fonts[0], textColor = selected.color, accent = selected.accent, layers = []
  let playing = false, startTimer = 0, playbackTimer = 0, revealTimer = 0
  const exportButton = document.createElement('button'), exportNote = document.createElement('p'), exportProgress = document.createElement('div')
  exportButton.className = 'export-video'; exportButton.textContent = 'Download finished video'; exportButton.disabled = true
  exportNote.className = 'export-note'; exportNote.textContent = 'Choose a video and add at least one overlay to prepare the finished file.'
  exportProgress.className = 'export-progress'; exportProgress.hidden = true; exportProgress.innerHTML = '<i></i>'
  document.querySelector('#saveDraft').after(exportButton, exportProgress, exportNote)
  const safe = value => String(value || '').replace(/[<>&]/g, '')
  function colorButtons(host, kind) {
    host.innerHTML = ''
    palette.forEach(([name, value]) => {
      const button = document.createElement('button')
      button.className = 'color' + ((kind === 'text' ? textColor : accent) === value ? ' active' : '')
      button.style.background = value; button.setAttribute('aria-label', name)
      button.onclick = () => { if (kind === 'text') textColor = value; else accent = value; render() }
      host.append(button)
    })
  }
  function render() {
    overlay.textContent = input.value || 'Your words appear here'; overlay.style.color = textColor; overlay.style.fontFamily = selectedFont.family
    overlay.style.setProperty('--accent', accent); overlay.style.background = selected.boxed ? accent + 'e8' : 'transparent'
    overlay.className = 'overlay' + (selected.boxed ? ' boxed' : '') + (selected.neon ? ' neon' : '') + (selected.upper ? ' upper' : '')
    document.querySelector('#presetName').textContent = selected.name
    document.querySelector('#animationName').textContent = selected.animation + ' · editable text · 9:16 safe'
    document.querySelector('#accentLabel').textContent = selected.boxed ? 'Label color' : 'Outline or glow color'
    ;[...tray.children].forEach((button, index) => button.classList.toggle('active', presets[index] === selected))
    colorButtons(textTray, 'text'); colorButtons(accentTray, 'accent')
    ;[...fontTray.children].forEach((button, index) => button.classList.toggle('active', fonts[index] === selectedFont))
    ;[...fontTray.querySelectorAll('.font-sample')].forEach(sample => { sample.textContent = input.value || 'Cheeto said so.' })
  }
  function stopPreview(finished = false) {
    window.clearTimeout(startTimer); window.clearTimeout(playbackTimer); window.clearInterval(revealTimer); playing = false
    preview.classList.remove('playing'); overlay.classList.remove('preview-hidden', 'preview-pop', 'preview-fade', 'preview-flicker', 'preview-reveal')
    overlay.textContent = input.value || 'Your words appear here'; playButton.classList.remove('playing')
    if (!finished && !mediaVideo.hidden) mediaVideo.pause()
    playButton.innerHTML = `<span>▶</span><b>${finished ? 'Replay animation' : 'Play animation preview'}</b>`
  }
  function revealText(mode, duration) {
    const source = input.value || 'Your words appear here'
    const pieces = mode === 'words' ? source.split(/(\s+)/) : [...source]
    let index = 0; overlay.textContent = ''
    revealTimer = window.setInterval(() => {
      index += 1; overlay.textContent = pieces.slice(0, index).join('')
      if (index >= pieces.length) window.clearInterval(revealTimer)
    }, Math.max(32, duration * 1000 / Math.max(1, pieces.length)))
  }
  function playPreview() {
    if (playing) { stopPreview(); return }
    const start = Math.max(0, Number(document.querySelector('#startAt').value) || 0)
    const end = Math.max(start + .5, Number(document.querySelector('#endAt').value) || start + 5)
    const duration = end + .45, revealDuration = Math.max(.5, end - start)
    playing = true; preview.style.setProperty('--preview-duration', `${duration}s`); preview.classList.add('playing'); overlay.classList.add('preview-hidden')
    if (!mediaVideo.hidden) { mediaVideo.currentTime = 0; mediaVideo.play().catch(() => { document.querySelector('#clipStatus').textContent = 'Tap play once more if your phone paused the video.' }) }
    playButton.classList.add('playing'); playButton.innerHTML = '<span>■</span><b>Stop preview</b>'
    startTimer = window.setTimeout(() => {
      if (!playing) return
      overlay.classList.remove('preview-hidden'); overlay.classList.add('preview-reveal')
      if (selected.animation === 'Typewriter') revealText('characters', revealDuration)
      else if (selected.animation === 'Word by word') revealText('words', revealDuration)
      else if (selected.animation === 'Flicker') overlay.classList.add('preview-flicker')
      else if (selected.animation === 'Fade') overlay.classList.add('preview-fade')
      else overlay.classList.add('preview-pop')
    }, start * 1000)
    playbackTimer = window.setTimeout(() => stopPreview(true), duration * 1000)
  }
  playButton.onclick = playPreview
  document.querySelector('#clipInput').onchange = event => {
    const file = event.target.files && event.target.files[0]; if (!file) return
    stopPreview(); if (clipUrl) URL.revokeObjectURL(clipUrl); clipUrl = URL.createObjectURL(file)
    mediaVideo.src = clipUrl; mediaVideo.hidden = false; previewImage.hidden = true
    document.querySelector('#clipName').textContent = file.name
    document.querySelector('#clipStatus').textContent = 'Loading the original clip for a private on-device preview…'
    mediaVideo.onloadedmetadata = () => {
      const usableEnd = Math.max(.5, Math.min(mediaVideo.duration || 6, 60)); document.querySelector('#endAt').value = usableEnd.toFixed(1)
      document.querySelector('#clipStatus').textContent = `${mediaVideo.videoWidth}×${mediaVideo.videoHeight} · ${mediaVideo.duration.toFixed(1)} seconds · ready to edit`
      if (mediaVideo.videoWidth < 720 || mediaVideo.videoHeight < 720) document.querySelector('#clipStatus').textContent += ' · Bitch you blurry.'
      exportButton.disabled = !layers.length
    }
    mediaVideo.onerror = () => { document.querySelector('#clipStatus').textContent = 'This video could not be previewed. Try the original file from Photos or Files.' }
  }
  presets.forEach(item => {
    const button = document.createElement('button'); button.className = 'preset'
    button.innerHTML = `<span class="preset-preview" style="background:${item.accent};color:${item.color}">${item.example}</span><b>${item.name}</b><small>${item.animation}</small>`
    button.onclick = () => { stopPreview(); selected = item; input.value = item.text; textColor = item.color; accent = item.accent; render() }
    tray.append(button)
  })
  fonts.forEach(item => {
    const button = document.createElement('button'); button.className = 'font-choice'; button.setAttribute('aria-label', item.name)
    button.innerHTML = `<span class="check">✓</span><span class="font-sample" style="font-family:${item.family}">${safe(input.value || 'Cheeto said so.')}</span><small>${item.name}</small>`
    button.onclick = () => { selectedFont = item; render() }
    fontTray.append(button)
  })
  function renderTimeline() {
    document.querySelector('#timeline').hidden = !layers.length
    document.querySelector('#layerCount').textContent = `${layers.length} layer${layers.length === 1 ? '' : 's'}`
    document.querySelector('#layers').innerHTML = layers.map((layer, index) => `<div class="layer"><span class="layer-num" style="background:${layer.accent};color:${layer.textColor}">${index + 1}</span><span class="layer-copy"><b>${layer.name} · ${layer.fontName}</b><small style="font-family:${layer.fontFamily}">${safe(layer.text)}</small></span><span class="layer-time">${layer.start.toFixed(1)}–${layer.end.toFixed(1)}s</span></div>`).join('')
    exportButton.disabled = !layers.length || !clipUrl
  }
  input.oninput = render
  document.querySelector('#saveOverlay').onclick = () => {
    const start = Math.max(0, Number(document.querySelector('#startAt').value) || 0)
    const end = Math.max(start + .5, Number(document.querySelector('#endAt').value) || start + 5)
    layers.push({ preset: selected.id, name: selected.name, animation: selected.animation, boxed: Boolean(selected.boxed), neon: Boolean(selected.neon), upper: Boolean(selected.upper), text: input.value || 'Your words appear here', textColor, accent, fontId: selectedFont.id, fontName: selectedFont.name, fontFamily: selectedFont.family, start, end })
    renderTimeline(); message.textContent = 'Added to this video. Add another style whenever it needs one.'
  }
  function roundedRect(context, x, y, width, height, radius) {
    context.beginPath(); context.roundRect(x, y, width, height, radius); context.fill()
  }
  function drawCover(context, video, width, height) {
    const scale = Math.max(width / video.videoWidth, height / video.videoHeight)
    const drawWidth = video.videoWidth * scale, drawHeight = video.videoHeight * scale
    context.drawImage(video, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight)
  }
  function visibleLayerText(layer, time) {
    const elapsed = Math.max(0, time - layer.start), duration = Math.max(.2, layer.end - layer.start), progress = Math.min(1, elapsed / duration)
    if (layer.animation === 'Typewriter') return [...layer.text].slice(0, Math.ceil(layer.text.length * progress)).join('')
    if (layer.animation === 'Word by word') { const words = layer.text.split(/(\s+)/); return words.slice(0, Math.ceil(words.length * progress)).join('') }
    return layer.text
  }
  function wrapText(context, text, maxWidth) {
    const words = text.split(/\s+/), lines = []; let line = ''
    words.forEach(word => { const next = line ? `${line} ${word}` : word; if (line && context.measureText(next).width > maxWidth) { lines.push(line); line = word } else line = next })
    if (line) lines.push(line); return lines.slice(0, 5)
  }
  function drawLayer(context, layer, time, width, height) {
    if (time < layer.start || time > layer.end) return
    const elapsed = time - layer.start, progress = Math.min(1, elapsed / Math.max(.2, layer.end - layer.start)); let alpha = 1, scale = 1
    if (layer.animation === 'Fade') alpha = Math.min(1, elapsed / .8)
    if (layer.animation === 'Pop') scale = elapsed < .5 ? .6 + .45 * Math.min(1, elapsed / .5) : 1
    if (layer.animation === 'Flicker' && elapsed < 1.2) alpha = Math.sin(elapsed * 38) > -.15 ? 1 : .16
    const output = layer.upper ? visibleLayerText(layer, time).toUpperCase() : visibleLayerText(layer, time); if (!output) return
    context.save(); context.globalAlpha = alpha; context.translate(width / 2, height * .76); context.scale(scale, scale)
    const fontSize = Math.round(width * .061); context.font = `900 ${fontSize}px ${layer.fontFamily}`; context.textAlign = 'center'; context.textBaseline = 'middle'
    const lines = wrapText(context, output, width * .82), lineHeight = fontSize * 1.16, blockHeight = lineHeight * lines.length, yStart = -(blockHeight - lineHeight) / 2
    if (layer.boxed) { context.fillStyle = layer.accent; roundedRect(context, -width * .44, yStart - lineHeight * .7, width * .88, blockHeight + lineHeight * .4, 26) }
    context.fillStyle = layer.textColor; context.strokeStyle = layer.accent; context.lineWidth = layer.boxed ? 0 : Math.max(3, width * .006)
    context.shadowColor = layer.neon ? layer.accent : 'transparent'; context.shadowBlur = layer.neon ? 34 : 0
    lines.forEach((line, index) => { const y = yStart + index * lineHeight; if (!layer.boxed) context.strokeText(line, 0, y); context.fillText(line, 0, y) })
    context.restore()
  }
  async function exportFinishedVideo() {
    if (!clipUrl || !layers.length) return
    if (!HTMLCanvasElement.prototype.captureStream || !window.MediaRecorder) { exportNote.textContent = 'This browser cannot finish the video here yet. The signed iPhone app will use Apple’s native renderer.'; return }
    exportButton.disabled = true; exportButton.textContent = 'Rendering video…'; exportProgress.hidden = false; exportNote.textContent = 'Keep this screen open while Nomadic Paws builds the finished copy.'
    await document.fonts.ready
    const canvas = document.createElement('canvas'); canvas.width = 1080; canvas.height = 1920; const context = canvas.getContext('2d')
    const stream = canvas.captureStream(30), sourceCapture = typeof mediaVideo.captureStream === 'function' ? mediaVideo.captureStream() : null
    if (sourceCapture) sourceCapture.getAudioTracks().forEach(track => stream.addTrack(track))
    const mime = ['video/mp4;codecs=avc1.42E01E', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm'].find(type => MediaRecorder.isTypeSupported(type)) || ''
    const recorder = new MediaRecorder(stream, mime ? { mimeType: mime, videoBitsPerSecond: 8000000 } : { videoBitsPerSecond: 8000000 }), chunks = []
    const finishAt = Math.min(mediaVideo.duration || Infinity, Math.max(...layers.map(layer => layer.end)) + .15)
    let frameId = 0, finished = false
    const finish = () => { if (finished) return; finished = true; cancelAnimationFrame(frameId); mediaVideo.pause(); if (recorder.state !== 'inactive') recorder.stop() }
    const drawFrame = () => {
      context.clearRect(0, 0, canvas.width, canvas.height); drawCover(context, mediaVideo, canvas.width, canvas.height); layers.forEach(layer => drawLayer(context, layer, mediaVideo.currentTime, canvas.width, canvas.height))
      exportProgress.style.setProperty('--export-progress', `${Math.min(100, mediaVideo.currentTime / finishAt * 100)}%`)
      if (mediaVideo.currentTime >= finishAt || mediaVideo.ended) finish(); else frameId = requestAnimationFrame(drawFrame)
    }
    recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data) }
    recorder.onerror = () => { exportButton.disabled = false; exportButton.textContent = 'Try video export again'; exportNote.textContent = 'The renderer paused unexpectedly. Your original and timeline are still safe.' }
    recorder.onstop = () => {
      const outputType = recorder.mimeType || mime || 'video/webm', extension = outputType.includes('mp4') ? 'mp4' : 'webm', blob = new Blob(chunks, { type: outputType }), url = URL.createObjectURL(blob), link = document.createElement('a')
      link.href = url; link.download = `nomadic-paws-video-${Date.now()}.${extension}`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 60000)
      exportButton.disabled = false; exportButton.textContent = 'Download another copy'; exportProgress.hidden = true; exportNote.textContent = 'Finished. The original clip was not changed.'
    }
    mediaVideo.pause(); mediaVideo.currentTime = 0; recorder.start(250); await mediaVideo.play(); drawFrame()
  }
  exportButton.onclick = exportFinishedVideo
  document.querySelector('#saveDraft').onclick = () => {
    localStorage.setItem('nomadic-paws-video-overlay-timeline', JSON.stringify(layers))
    message.textContent = 'Shared video draft saved for Katie and Trinitie.'
  }
  render()
})()
