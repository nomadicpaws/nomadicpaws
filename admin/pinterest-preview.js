(function (global) {
  'use strict';

  const COLORS = ['bark', 'sage', 'sand', 'terracotta'];
  const SIZES = ['small', 'medium'];
  const PLACEMENTS = ['left', 'right'];
  let updateTimer;
  const liveSelections = new WeakMap();

  function labelsWithin(root) {
    return Array.from(root.querySelectorAll('label'));
  }

  function matchingLabel(root, text) {
    return labelsWithin(root).find(label => label.textContent.trim().toLowerCase().startsWith(text.toLowerCase()));
  }

  function fieldRoot(group, labelText) {
    const label = matchingLabel(group, labelText);
    if (!label) return null;
    let node = label.parentElement;
    while (node && node.parentElement && node.parentElement !== group) {
      const parentLabels = labelsWithin(node.parentElement);
      if (parentLabels.length > 1) break;
      node = node.parentElement;
    }
    return node;
  }

  function selectedChoice(group, labelText, allowed, fallback) {
    const root = fieldRoot(group, labelText);
    if (!root) return fallback;
    const live = liveSelections.get(group)?.[labelText];
    if (allowed.includes(live)) return live;
    const label = matchingLabel(group, labelText);
    const linked = label?.htmlFor ? document.getElementById(label.htmlFor) : null;
    const controls = [linked, ...Array.from(root.querySelectorAll('select, input'))].filter(Boolean);
    const selected = controls.find(control => control instanceof HTMLSelectElement)?.selectedOptions?.[0];
    const values = [selected?.value, selected?.textContent, ...controls.map(control => control.value)]
      .filter(Boolean)
      .join(' ');
    const renderedSelection = root.querySelector('[class*="singleValue"], [class*="SingleValue"], [aria-live="polite"]');
    const haystack = `${values} ${renderedSelection?.textContent || ''} ${root.textContent}`.toLowerCase().replace(/\bcream\b/g, 'sand');
    return allowed.find(value => new RegExp(`(^|\\s)${value}(\\s|$)`, 'i').test(haystack)) || fallback;
  }

  function choiceFromControl(control, allowed) {
    if (control instanceof HTMLSelectElement) {
      const option = control.selectedOptions[0];
      const value = `${option?.value || ''} ${option?.textContent || ''}`.toLowerCase().replace(/\bcream\b/g, 'sand');
      return allowed.find(item => new RegExp(`(^|\\s)${item}(\\s|$)`, 'i').test(value));
    }
    const value = `${control.value || ''} ${control.textContent || ''}`.toLowerCase().replace(/\bcream\b/g, 'sand');
    return allowed.find(item => new RegExp(`(^|\\s)${item}(\\s|$)`, 'i').test(value));
  }

  function rememberLiveChoice(target) {
    for (const group of pinGroups()) {
      const fields = [
        ['Nomadic Paws logo color', COLORS],
        ['Logo size', SIZES],
        ['Logo placement', PLACEMENTS],
      ];
      for (const [labelText, allowed] of fields) {
        const root = fieldRoot(group, labelText);
        if (!root || !root.contains(target)) continue;
        const choice = choiceFromControl(target, allowed);
        if (!choice) continue;
        const state = liveSelections.get(group) || {};
        state[labelText] = choice;
        liveSelections.set(group, state);
        updatePreview(group);
        return;
      }
    }
  }

  function normalizeImageSource(value) {
    if (!value) return '';
    if (/^(blob:|data:|https?:)/i.test(value)) return value;
    if (value.startsWith('/')) return value;
    return `/${value.replace(/^\.\//, '')}`;
  }

  function imageSource(group) {
    const root = fieldRoot(group, 'Pinterest image');
    if (!root) return '';
    const inputValue = Array.from(root.querySelectorAll('input'))
      .map(input => input.value.trim())
      .find(value => /^(blob:|data:|https?:|\/?images\/)/i.test(value));
    if (inputValue) return normalizeImageSource(inputValue);
    const image = Array.from(root.querySelectorAll('img')).find(item => !item.closest('.np-pin-preview'));
    if (image) return image.currentSrc || image.src;
    const backgroundNode = Array.from(root.querySelectorAll('*')).find(node => /url\(["']?.+?["']?\)/.test(node.style.backgroundImage || ''));
    const match = backgroundNode && backgroundNode.style.backgroundImage.match(/url\(["']?(.+?)["']?\)/);
    return normalizeImageSource(match ? match[1] : '');
  }

  function defaultColor(group) {
    const heading = group.querySelector('label')?.textContent || '';
    if (/Pin 2/.test(heading)) return 'sage';
    if (/Pin 3/.test(heading)) return 'sand';
    if (/Pin 4/.test(heading)) return 'terracotta';
    return 'bark';
  }

  function showState(preview, state, message) {
    preview.dataset.state = state;
    const status = preview.querySelector('.np-pin-preview-status');
    status.textContent = message || '';
  }

  function updatePreview(group) {
    const preview = group.querySelector(':scope > .np-pin-preview');
    if (!preview) return;
    const source = imageSource(group);
    const color = selectedChoice(group, 'Nomadic Paws logo color', COLORS, defaultColor(group));
    const size = selectedChoice(group, 'Logo size', SIZES, 'small');
    const placement = selectedChoice(group, 'Logo placement', PLACEMENTS, 'left');
    const photo = preview.querySelector('.np-pin-preview-photo');
    const logo = preview.querySelector('.np-pin-preview-logo');
    const oldSource = photo.getAttribute('src') || '';

    preview.dataset.size = size;
    preview.dataset.placement = placement;
    logo.src = `/images/pinterest-logos/logo-${color}.png`;
    if (!source) {
      photo.removeAttribute('src');
      showState(preview, 'empty', 'Choose a Pinterest image to see the finished branded preview.');
      return;
    }
    if (oldSource !== source) {
      showState(preview, 'loading', 'Preparing preview…');
      photo.src = source;
    }
  }

  function createPreview(group) {
    if (group.querySelector(':scope > .np-pin-preview')) return;
    const preview = document.createElement('section');
    preview.className = 'np-pin-preview';
    preview.setAttribute('aria-label', 'Finished Pinterest image preview');
    preview.innerHTML = '<div class="np-pin-preview-heading"><strong>Finished Pinterest image</strong><span>2:3 preview</span></div><div class="np-pin-preview-canvas"><img class="np-pin-preview-photo" alt="Selected Pinterest photo preview"><img class="np-pin-preview-logo" alt="Selected Nomadic Paws logo treatment"><div class="np-pin-preview-message"><span class="np-pin-preview-status"></span><button type="button">Retry preview</button></div></div>';
    const photo = preview.querySelector('.np-pin-preview-photo');
    photo.addEventListener('load', () => showState(preview, 'ready', ''));
    photo.addEventListener('error', () => showState(preview, 'error', 'This image could not be loaded. Check the image or URL, then try again.'));
    preview.querySelector('button').addEventListener('click', () => {
      const source = imageSource(group);
      photo.removeAttribute('src');
      if (source) window.setTimeout(() => { photo.src = source; showState(preview, 'loading', 'Retrying preview…'); }, 20);
      else showState(preview, 'empty', 'Choose a Pinterest image to see the finished branded preview.');
    });
    group.appendChild(preview);
    updatePreview(group);
  }

  function pinGroups() {
    return labelsWithin(document).filter(label => /^Pin [1-4]\b/.test(label.textContent.trim())).map(label => {
      let node = label.parentElement;
      while (node && node !== document.body) {
        const text = labelsWithin(node).map(item => item.textContent.trim()).join('|');
        if (/Pinterest image/.test(text) && /Nomadic Paws logo color/.test(text) && /Pin title/.test(text)) return node;
        node = node.parentElement;
      }
      return null;
    }).filter((group, index, groups) => group && groups.indexOf(group) === index);
  }

  function enhance() {
    if (!/#\/(collections\/pinterest|edit\/pinterest)/.test(location.hash)) return;
    enhanceStorySelector();
    pinGroups().forEach(group => {
      createPreview(group);
      updatePreview(group);
    });
  }

  function cleanStoryTitle(label) {
    return String(label || '')
      .replace(/\s*[—–-]?\s*\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?.*$/i, '')
      .trim();
  }

  function syncStorySelector(select, wrapper) {
    const list = wrapper.querySelector('[role="listbox"]');
    const trigger = wrapper.querySelector('.np-story-trigger');
    const options = Array.from(select.options).filter(option => option.value);
    const selected = options.find(option => option.value === select.value) || options[0];
    trigger.textContent = selected ? cleanStoryTitle(selected.textContent) : 'Choose a Trail Journal story';
    const signature = options.map(option => `${option.value}:${option.textContent}`).join('|');
    if (list.dataset.options === signature) {
      Array.from(list.children).forEach(button => {
        const active = button.dataset.value === select.value;
        button.setAttribute('aria-selected', String(active));
        button.classList.toggle('np-selected', active);
      });
      return;
    }
    list.dataset.options = signature;
    list.replaceChildren(...options.map(option => {
      const button = document.createElement('button');
      button.type = 'button';
      button.role = 'option';
      button.dataset.value = option.value;
      button.textContent = cleanStoryTitle(option.textContent);
      const active = option.value === select.value;
      button.setAttribute('aria-selected', String(active));
      button.classList.toggle('np-selected', active);
      button.addEventListener('click', () => {
        const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')?.set;
        if (setter) setter.call(select, option.value); else select.value = option.value;
        select.dispatchEvent(new Event('input', { bubbles: true }));
        select.dispatchEvent(new Event('change', { bubbles: true }));
        syncStorySelector(select, wrapper);
        wrapper.dataset.open = 'false';
        trigger.setAttribute('aria-expanded', 'false');
        trigger.focus();
      });
      return button;
    }));
  }

  function enhanceStorySelector() {
    if (!window.matchMedia('(max-width: 767px)').matches) return;
    const label = labelsWithin(document).find(item => item.textContent.trim().startsWith('Trail Journal story'));
    if (!label) return;
    let root = label.parentElement;
    while (root && !root.querySelector('select') && root !== document.body) root = root.parentElement;
    const select = root?.querySelector('select');
    if (!select) return;
    let wrapper = root.querySelector(':scope > .np-story-selector');
    if (!wrapper) {
      wrapper = document.createElement('div');
      wrapper.className = 'np-story-selector';
      wrapper.dataset.open = 'false';
      wrapper.innerHTML = '<button class="np-story-trigger" type="button" aria-haspopup="listbox" aria-expanded="false"></button><div class="np-story-list" role="listbox" aria-label="Trail Journal stories"></div>';
      wrapper.querySelector('.np-story-trigger').addEventListener('click', event => {
        const open = wrapper.dataset.open !== 'true';
        wrapper.dataset.open = String(open);
        event.currentTarget.setAttribute('aria-expanded', String(open));
      });
      select.classList.add('np-native-story-select');
      select.setAttribute('aria-hidden', 'true');
      select.tabIndex = -1;
      root.appendChild(wrapper);
    }
    syncStorySelector(select, wrapper);
  }

  function schedule() {
    clearTimeout(updateTimer);
    updateTimer = window.setTimeout(enhance, 80);
  }

  function init() {
    document.addEventListener('input', event => { rememberLiveChoice(event.target); schedule(); }, true);
    document.addEventListener('change', event => { rememberLiveChoice(event.target); schedule(); }, true);
    document.addEventListener('click', schedule, true);
    window.addEventListener('hashchange', schedule);
    new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
    schedule();
  }

  global.NPPinterestPreview = { init, enhance, updatePreview };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})(window);
