(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.NPReview = api;
})(typeof self !== 'undefined' ? self : this, function () {
  function imageToken(index, alt) {
    return `[IMAGE ${index + 1}: ${alt || 'Photo — caption needed'}]`;
  }

  function prepareBody(markdown) {
    const images = [];
    const text = String(markdown || '').replace(/!\[([^\]]*)\]\(([^)]+)\)/g, function (source, alt, url) {
      images.push({ source, alt, url });
      return imageToken(images.length - 1, alt);
    });
    return { text, images };
  }

  function restoreImages(text, images) {
    let output = String(text || '');
    const missing = [];
    images.forEach(function (image, index) {
      const token = imageToken(index, image.alt);
      if (!output.includes(token)) missing.push(token);
      else output = output.replace(token, image.source);
    });
    return { text: output, missing };
  }

  function warnings(data) {
    const list = [];
    if (!String(data.title || '').trim()) list.push('Title is missing');
    if (!String(data.description || '').trim()) list.push('Subtitle / meta description is missing');
    if (!String(data.image || '').trim()) list.push('Featured image is missing');
    if (data.image && !String(data.imageAlt || '').trim()) list.push('Featured image description is missing');
    if (!String(data.body || '').trim()) list.push('Article body is empty');
    return list;
  }

  function reviewCopy(data, articleOnly) {
    const prepared = prepareBody(data.body);
    const article = ['# ' + (data.title || 'Untitled'), data.description || '', prepared.text].filter(Boolean).join('\n\n');
    if (articleOnly) return article;
    const notes = warnings(data);
    return [
      '# Trail Journal draft for review',
      '## Article',
      article,
      '## Publishing details',
      '- Status: ' + (data.status || 'Draft'),
      '- Publish date: ' + (data.date || 'Not set'),
      '- SEO title: ' + (data.seoTitle || data.title || 'Missing'),
      '- Meta description: ' + (data.description || 'Missing'),
      '- Featured image: ' + (data.image || 'Missing'),
      '## Review notes',
      notes.length ? notes.map(function (note) { return '- ⚠ ' + note; }).join('\n') : '- No recommended fields are missing.',
      'Keep every [IMAGE …] placeholder in its current position when revising.'
    ].join('\n\n');
  }

  return { prepareBody, restoreImages, reviewCopy, warnings };
});
