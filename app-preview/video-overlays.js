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
  const preview = document.querySelector('.preview'), overlay = document.querySelector('#overlay'), input = document.querySelector('#overlayText'), tray = document.querySelector('#presets')
  const textTray = document.querySelector('#textColors'), accentTray = document.querySelector('#accentColors'), message = document.querySelector('#message')
  const fontLabel = document.createElement('label'), fontTray = document.createElement('section')
  fontLabel.textContent = 'Font'; fontTray.id = 'fonts'; fontTray.className = 'fonts'; fontTray.setAttribute('aria-label', 'Font choices')
  document.querySelector('#textColors').previousElementSibling.before(fontLabel, fontTray)
  const playButton = document.createElement('button')
  playButton.className = 'preview-play'; playButton.innerHTML = '<span>▶</span><b>Play animation preview</b>'
  preview.after(playButton)
  let selected = presets[0], selectedFont = fonts[0], textColor = selected.color, accent = selected.accent, layers = []
  let playing = false, startTimer = 0, playbackTimer = 0, revealTimer = 0
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
  }
  input.oninput = render
  document.querySelector('#saveOverlay').onclick = () => {
    const start = Math.max(0, Number(document.querySelector('#startAt').value) || 0)
    const end = Math.max(start + .5, Number(document.querySelector('#endAt').value) || start + 5)
    layers.push({ preset: selected.id, name: selected.name, text: input.value || 'Your words appear here', textColor, accent, fontId: selectedFont.id, fontName: selectedFont.name, fontFamily: selectedFont.family, start, end })
    renderTimeline(); message.textContent = 'Added to this video. Add another style whenever it needs one.'
  }
  document.querySelector('#saveDraft').onclick = () => {
    localStorage.setItem('nomadic-paws-video-overlay-timeline', JSON.stringify(layers))
    message.textContent = 'Shared video draft saved for Katie and Trinitie.'
  }
  render()
})()
