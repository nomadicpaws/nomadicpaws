(function () {
  'use strict';

  const allowedTags = new Set([
    'A', 'BLOCKQUOTE', 'BR', 'CODE', 'DEL', 'EM', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
    'HR', 'IMG', 'LI', 'OL', 'P', 'PRE', 'STRONG', 'TABLE', 'TBODY', 'TD', 'TH',
    'THEAD', 'TR', 'UL'
  ]);
  const dropWithContents = new Set([
    'BUTTON', 'EMBED', 'FORM', 'IFRAME', 'INPUT', 'MATH', 'OBJECT', 'SCRIPT', 'STYLE', 'SVG', 'TEMPLATE'
  ]);
  const allowedAttributes = {
    A: new Set(['href', 'title', 'target', 'rel']),
    CODE: new Set(['class']),
    IMG: new Set(['src', 'alt', 'title', 'width', 'height', 'loading', 'decoding']),
    PRE: new Set(['class']),
    TD: new Set(['colspan', 'rowspan']),
    TH: new Set(['colspan', 'rowspan', 'scope'])
  };

  function safeUrl(value, tagName) {
    const candidate = String(value || '').trim();
    if (!candidate) return '';
    if (candidate.startsWith('#') || candidate.startsWith('/') || candidate.startsWith('./') || candidate.startsWith('../')) {
      return candidate;
    }
    try {
      const parsed = new URL(candidate);
      const protocols = tagName === 'IMG' ? ['http:', 'https:'] : ['http:', 'https:', 'mailto:', 'tel:'];
      return protocols.includes(parsed.protocol) ? candidate : '';
    } catch {
      return '';
    }
  }

  function cleanElement(element) {
    const tagName = element.tagName;
    if (!allowedTags.has(tagName)) {
      if (dropWithContents.has(tagName)) element.remove();
      else element.replaceWith(...element.childNodes);
      return;
    }

    const allowed = allowedAttributes[tagName] || new Set();
    for (const attribute of [...element.attributes]) {
      if (!allowed.has(attribute.name.toLowerCase())) element.removeAttribute(attribute.name);
    }

    if (tagName === 'A') {
      const href = safeUrl(element.getAttribute('href'), tagName);
      if (href) element.setAttribute('href', href);
      else element.removeAttribute('href');
      if (element.getAttribute('target') === '_blank') element.setAttribute('rel', 'noopener noreferrer');
      else element.removeAttribute('target');
    }
    if (tagName === 'IMG') {
      const src = safeUrl(element.getAttribute('src'), tagName);
      if (src) element.setAttribute('src', src);
      else element.remove();
    }
  }

  function sanitizeHtml(html) {
    const template = document.createElement('template');
    template.innerHTML = String(html || '');
    const walker = document.createTreeWalker(template.content, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_COMMENT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const node of nodes.reverse()) {
      if (node.nodeType === Node.COMMENT_NODE) node.remove();
      else cleanElement(node);
    }
    return template.innerHTML;
  }

  window.NomadicPawsSanitizeHtml = sanitizeHtml;
})();
