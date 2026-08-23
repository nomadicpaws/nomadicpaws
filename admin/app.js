(function () {
  'use strict';
  const RECOVERY_PREFIX = 'np-cms-recovery:';
  let dirty = false;
  let saveTimer = null;
  let lastSaved = null;
  let lastEditorFocus = null;

  const $all = selector => Array.from(document.querySelectorAll(selector));
  const text = element => (element && element.textContent || '').trim();
  const isEditor = () => /#\/(collections\/blog\/(new|entries\/)|edit\/blog\/)/.test(location.hash);

  function field(labelPattern) {
    const label = $all('label').find(item => labelPattern.test(text(item)));
    if (!label) return null;
    const target = label.htmlFor && document.getElementById(label.htmlFor);
    return target || label.parentElement.querySelector('input, textarea, [contenteditable="true"]') ||
      label.parentElement.parentElement.querySelector('input, textarea, [contenteditable="true"]');
  }

  function valueOf(control) {
    if (!control) return '';
    if (control.type === 'checkbox') return control.checked;
    return control.value !== undefined ? control.value : control.innerText;
  }

  function setValue(control, value) {
    if (!control) return;
    if (control.type === 'checkbox') {
      if (control.checked !== Boolean(value)) control.click();
      return;
    }
    const proto = control.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, 'value') && Object.getOwnPropertyDescriptor(proto, 'value').set;
    if (setter && control.value !== undefined) setter.call(control, value);
    else control.innerText = value;
    control.dispatchEvent(new Event('input', { bubbles: true }));
    control.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function controls() {
    return {
      title: field(/^Title$/i), description: field(/^(Subtitle|Search description)/i),
      date: field(/^Publish date/i), image: field(/^Cover image$/i),
      imageAlt: field(/^Cover image description$/i), draft: field(/Keep as draft/i),
      body: field(/^(Article body|Body)$/i)
    };
  }

  function statusFor(c) {
    if (!c.draft || valueOf(c.draft)) return 'Draft';
    const date = Date.parse(valueOf(c.date));
    return Number.isFinite(date) && date > Date.now() ? 'Scheduled' : 'Published';
  }

  function data() {
    const c = controls();
    return {
      title: valueOf(c.title), description: valueOf(c.description), date: valueOf(c.date),
      image: valueOf(c.image), imageAlt: valueOf(c.imageAlt), body: valueOf(c.body),
      status: statusFor(c), seoTitle: valueOf(c.title)
    };
  }

  function recoveryKey() { return RECOVERY_PREFIX + location.hash.replace(/\?.*$/, ''); }

  function snapshot() {
    if (!isEditor()) return;
    const c = controls();
    if (!c.body || (c.draft && !valueOf(c.draft))) return;
    localStorage.setItem(recoveryKey(), JSON.stringify({ savedAt: Date.now(), data: data() }));
  }

  function saveButton() {
    return $all('button').find(button => /^(save|save draft)$/i.test(text(button)) && !button.disabled && !button.closest('#np-action-dock'));
  }

  function persistEntry() {
    const save = saveButton();
    if (save) { save.click(); return true; }
    return false;
  }

  function markSaved() {
    dirty = false;
    lastSaved = new Date();
    localStorage.removeItem(recoveryKey());
    renderStatus();
  }

  function autosave() {
    if (!dirty || !isEditor() || !navigator.onLine) return;
    const c = controls();
    if (c.draft && !valueOf(c.draft)) return;
    const started = persistEntry();
    if (!started) return;
    setSaveLabel('Saving…');
  }

  function setSaveLabel(label) {
    const element = document.getElementById('np-save-state');
    if (element) element.textContent = label;
  }

  async function copy(articleOnly) {
    await navigator.clipboard.writeText(NPReview.reviewCopy(data(), articleOnly));
    toast(articleOnly ? 'Article text copied' : 'Draft copied for review');
  }

  function pasteRevision() {
    const c = controls();
    if (!c.body) return;
    const original = NPReview.prepareBody(valueOf(c.body));
    const revised = window.prompt('Paste the revised article body here. Keep every [IMAGE …] placeholder in place.');
    if (revised === null) return;
    const restored = NPReview.restoreImages(revised, original.images);
    if (restored.missing.length) {
      alert('Nothing was changed. The revision is missing: ' + restored.missing.join(', '));
      return;
    }
    setValue(c.body, restored.text.replace(/^# .+\n+/, ''));
    toast('Revision applied; images kept in place');
  }

  function confirmPublishing() {
    const d = data();
    const missing = NPReview.warnings(d);
    return confirm([
      d.status.toUpperCase(), d.title || 'Untitled', d.date || 'No publish date',
      'Featured image: ' + (d.image || 'Missing'), 'Excerpt: ' + (d.description || 'Missing'),
      'SEO title: ' + (d.seoTitle || 'Missing'), 'Meta description: ' + (d.description || 'Missing'),
      missing.length ? 'Recommended fields: ' + missing.join('; ') : 'All recommended fields are present.',
      '', 'Continue with this publishing status?'
    ].join('\n'));
  }

  function changeStatus(kind) {
    const c = controls();
    if (!c.draft) return;
    if (kind === 'draft') setValue(c.draft, true);
    else {
      if (!confirmPublishing()) return;
      if (kind === 'publish' && c.date && Date.parse(valueOf(c.date)) > Date.now()) setValue(c.date, new Date().toISOString());
      if (kind === 'schedule' && (!c.date || Date.parse(valueOf(c.date)) <= Date.now())) {
        alert('Choose a future publish date and time first.'); return;
      }
      setValue(c.draft, false);
    }
    renderStatus();
  }

  function toast(message) {
    const item = document.createElement('div'); item.className = 'np-toast'; item.textContent = message;
    document.body.appendChild(item); window.setTimeout(() => item.remove(), 2500);
  }

  async function decodeImage(file) {
    if ('createImageBitmap' in window) {
      try { return await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch (_) { /* use image fallback */ }
    }
    return new Promise(function (resolve, reject) {
      const image = new Image();
      const url = URL.createObjectURL(file);
      image.onload = function () { URL.revokeObjectURL(url); resolve(image); };
      image.onerror = function () { URL.revokeObjectURL(url); reject(new Error('This photo format cannot be prepared by this browser.')); };
      image.src = url;
    });
  }

  async function preparePhoto(file) {
    if (!NPPhotos.needsPreparation(file)) return file;
    const source = await decodeImage(file);
    const sourceWidth = source.width || source.naturalWidth;
    const sourceHeight = source.height || source.naturalHeight;
    const size = NPPhotos.outputSize(sourceWidth, sourceHeight);
    const canvas = document.createElement('canvas'); canvas.width = size.width; canvas.height = size.height;
    const context = canvas.getContext('2d', { alpha: false });
    context.fillStyle = '#fff'; context.fillRect(0, 0, size.width, size.height);
    context.drawImage(source, 0, 0, size.width, size.height);
    if (source.close) source.close();
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.82));
    if (!blob) throw new Error('The optimized photo could not be created.');
    return new File([blob], NPPhotos.jpegName(file.name), { type: 'image/jpeg', lastModified: Date.now() });
  }

  async function preparePhotoSelection(input) {
    const selected = Array.from(input.files || []);
    if (!selected.length || !selected.some(NPPhotos.needsPreparation)) return false;
    toast(`Preparing ${selected.length === 1 ? 'photo' : selected.length + ' photos'}…`);
    const prepared = [];
    for (const file of selected) prepared.push(await preparePhoto(file));
    const transfer = new DataTransfer(); prepared.forEach(file => transfer.items.add(file));
    input.files = transfer.files;
    const before = selected.reduce((sum, file) => sum + file.size, 0);
    const after = prepared.reduce((sum, file) => sum + file.size, 0);
    toast(`Photo ready — ${Math.max(0, Math.round((1 - after / before) * 100))}% smaller`);
    return true;
  }

  function renderStatus() {
    if (!isEditor()) return;
    const mobile = window.matchMedia('(max-width: 767px)').matches;
    const dock = document.getElementById('np-action-dock');
    const desiredParent = mobile && dock ? dock.querySelector('.np-footer-info') : document.body;
    let panel = document.getElementById('np-status-panel');
    if (panel && panel.parentElement !== desiredParent) { panel.remove(); panel = null; }
    if (!panel) {
      panel = document.createElement(mobile ? 'strong' : 'section'); panel.id = 'np-status-panel';
      if (mobile) desiredParent.prepend(panel); else desiredParent.appendChild(panel);
    }
    const status = statusFor(controls());
    panel.className = 'np-status np-' + status.toLowerCase();
    if (mobile) panel.textContent = status;
    else panel.innerHTML = `<strong>${status}</strong><span>${status === 'Draft' ? 'This entry is currently a draft and will not publish.' : status === 'Scheduled' ? 'This entry will publish at the selected date and time.' : 'This entry is live on the Trail Journal.'}</span>`;
    const savedAt = lastSaved ? ' · Last saved ' + lastSaved.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '';
    setSaveLabel(dirty ? 'Unsaved changes' + savedAt : lastSaved ? 'Autosave on' + savedAt : 'Autosave ready');
  }

  function renderDock() {
    const old = document.getElementById('np-action-dock');
    renderDashboard();
    if (!isEditor()) {
      if (old) old.remove();
      const status = document.getElementById('np-status-panel'); if (status) status.remove();
      const recovery = document.getElementById('np-recovery'); if (recovery) recovery.remove();
      return;
    }
    if (old) return;
    const dock = document.createElement('nav'); dock.id = 'np-action-dock'; dock.setAttribute('aria-label', 'Journal entry actions');
    const mobile = window.matchMedia('(max-width: 767px)').matches;
    dock.innerHTML = mobile
      ? '<div class="np-footer-info"><span id="np-save-state">Autosave ready</span></div><button data-action="save">Save</button><button data-action="copy" aria-label="Copy Draft for Review">Copy for Review</button>'
      : '<span id="np-save-state">Autosave ready</span><button data-action="save">Save</button><button data-action="copy" aria-label="Copy Draft for Review">Copy for Review</button>';
    dock.addEventListener('click', event => {
      const action = event.target.dataset.action; if (!action) return;
      if (action === 'save') { const started = persistEntry(); if (started) setSaveLabel('Saving…'); else setSaveLabel('Use Save Draft above'); }
      else if (action === 'copy') copy(false).catch(() => toast('Clipboard permission was denied'));
    });
    document.body.appendChild(dock); renderStatus(); showRecovery(); syncMobileLayout();
  }

  function renderDashboard() {
    const hasAuthenticatedCollection = $all('a').some(link => /#\/collections\/blog\/new/.test(link.getAttribute('href') || '') && !link.closest('#np-mobile-dashboard'));
    const onCollection = location.hash === '#/collections/blog' && hasAuthenticatedCollection;
    let dashboard = document.getElementById('np-mobile-dashboard');
    if (!onCollection) {
      document.body.classList.remove('np-browse-open');
      if (dashboard) dashboard.remove();
      removeBrowseControls();
      return;
    }
    if (dashboard) return;
    dashboard = document.createElement('section'); dashboard.id = 'np-mobile-dashboard';
    dashboard.innerHTML = '<p class="np-eyebrow">Nomadic Paws</p><h1>Trail Journal</h1><p>What would you like to do?</p><div><a class="np-primary" href="#/collections/blog/new">＋ New Journal Entry</a><a href="#/collections/blog?filter=draft__true">Continue Draft</a><a href="#/collections/blog?filter=draft__false">Manage Scheduled Posts</a><a href="#/collections/pinterest">Pinterest Queue</a><a href="/pinterest.csv" target="_blank" rel="noopener">Download Pinterest CSV</a><a href="/trail-journal" target="_blank" rel="noopener">View Published Posts</a></div>';
    const browse = document.createElement('button');
    browse.id = 'np-browse-toggle'; browse.type = 'button'; browse.textContent = 'Menu & Search'; browse.setAttribute('aria-expanded', 'false'); browse.onclick = toggleBrowse;
    dashboard.insertBefore(browse, dashboard.children[2]);
    document.body.appendChild(dashboard); ensureBrowseControls(); syncMobileLayout();
  }

  function toggleBrowse() {
    const open = document.body.classList.toggle('np-browse-open');
    const toggle = document.getElementById('np-browse-toggle');
    if (toggle) toggle.setAttribute('aria-expanded', String(open));
    if (open) {
      ensureBrowseControls();
      const search = document.querySelector('aside input[placeholder*="Search"]');
      if (search) window.setTimeout(() => search.focus(), 50);
    }
  }

  function ensureBrowseControls() {
    if (!document.getElementById('np-mobile-dashboard')) return;
    const aside = document.querySelector('#nc-root aside');
    if (!aside || aside.querySelector('#np-browse-close')) return;
    const close = document.createElement('button');
    close.id = 'np-browse-close'; close.type = 'button'; close.textContent = 'Close menu'; close.onclick = toggleBrowse;
    aside.prepend(close);
  }

  function removeBrowseControls() {
    const close = document.getElementById('np-browse-close'); if (close) close.remove();
  }

  function syncMobileLayout() {
    const header = document.querySelector('#nc-root header');
    const dock = document.getElementById('np-action-dock');
    const more = dock && dock.classList.contains('np-expanded') ? dock.querySelector('.np-more-actions') : null;
    document.documentElement.style.setProperty('--np-cms-header-height', (header ? Math.ceil(header.getBoundingClientRect().height) : 0) + 'px');
    document.documentElement.style.setProperty('--np-action-dock-height', (dock ? Math.ceil(dock.getBoundingClientRect().height) : 0) + 'px');
    document.documentElement.style.setProperty('--np-more-panel-height', (more ? Math.ceil(more.getBoundingClientRect().height) : 0) + 'px');
  }

  function showRecovery() {
    const raw = localStorage.getItem(recoveryKey()); if (!raw || document.getElementById('np-recovery')) return;
    let saved; try { saved = JSON.parse(raw); } catch (_) { return; }
    const bar = document.createElement('div'); bar.id = 'np-recovery';
    bar.innerHTML = `<span>An unfinished local copy from ${new Date(saved.savedAt).toLocaleString()} is available.</span><button>Recover it</button><button>Dismiss</button>`;
    bar.children[1].onclick = () => { const c = controls(); Object.keys(c).forEach(key => { if (saved.data[key] !== undefined) setValue(c[key], saved.data[key]); }); bar.remove(); toast('Local draft recovered'); };
    bar.children[2].onclick = () => { localStorage.removeItem(recoveryKey()); bar.remove(); };
    document.body.appendChild(bar);
  }

  document.addEventListener('input', event => {
    if (!isEditor() || event.target.closest('#np-action-dock')) return;
    dirty = true; setSaveLabel('Unsaved changes'); clearTimeout(saveTimer); saveTimer = setTimeout(autosave, 4000); snapshot(); renderStatus();
  }, true);
  document.addEventListener('focusin', event => {
    if (isEditor() && !event.target.closest('#np-action-dock')) lastEditorFocus = event.target;
  }, true);
  document.addEventListener('change', event => { if (isEditor() && !event.target.closest('#np-action-dock')) { dirty = true; snapshot(); renderStatus(); } }, true);
  document.addEventListener('change', function (event) {
    const input = event.target;
    if (!(input instanceof HTMLInputElement) || input.type !== 'file' || !event.isTrusted || !input.files.length) return;
    if (!Array.from(input.files).every(file => /^image\//.test(file.type) || NPPhotos.isHeic(file))) return;
    if (!Array.from(input.files).some(NPPhotos.needsPreparation)) return;
    event.preventDefault(); event.stopImmediatePropagation();
    preparePhotoSelection(input).then(function () {
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }).catch(function (error) {
      toast(error.message + ' Uploading the original instead.');
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
  }, true);
  window.addEventListener('beforeunload', event => { if (dirty) { snapshot(); event.preventDefault(); event.returnValue = ''; } });
  window.addEventListener('online', () => { toast('Back online'); autosave(); });
  window.addEventListener('offline', () => { snapshot(); toast('Offline — this draft is stored on this device'); });
  window.addEventListener('hashchange', () => setTimeout(renderDock, 500));
  window.addEventListener('resize', syncMobileLayout);
  if (window.visualViewport) window.visualViewport.addEventListener('resize', syncMobileLayout);
  new MutationObserver(function () {
    renderDock();
    ensureBrowseControls();
    syncMobileLayout();
    $all('input[type="file"]').forEach(input => input.setAttribute('accept', 'image/*,.heic,.heif'));
  }).observe(document.body, { childList: true, subtree: true });
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('/admin/service-worker.js');
  if (window.CMS && CMS.registerEventListener) CMS.registerEventListener({ name: 'postSave', handler: markSaved });
  renderDock();
})();
