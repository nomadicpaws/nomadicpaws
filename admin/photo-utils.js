(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.NPPhotos = api;
})(typeof self !== 'undefined' ? self : this, function () {
  const MAX_EDGE = 2400;
  const LARGE_FILE = 1.5 * 1024 * 1024;

  function isHeic(file) {
    return /image\/hei[cf]/i.test(file.type || '') || /\.hei[cf]$/i.test(file.name || '');
  }

  function outputSize(width, height, maxEdge) {
    const limit = maxEdge || MAX_EDGE;
    const scale = Math.min(1, limit / Math.max(width, height));
    return { width: Math.round(width * scale), height: Math.round(height * scale) };
  }

  function needsPreparation(file) {
    const isJpeg = /image\/jpeg/i.test(file.type || '') || /\.jpe?g$/i.test(file.name || '');
    return isHeic(file) || (isJpeg && Number(file.size || 0) > LARGE_FILE);
  }

  function jpegName(name) {
    return String(name || 'iphone-photo').replace(/\.[^.]+$/, '').replace(/[^a-z0-9_-]+/gi, '-').replace(/^-|-$/g, '') + '.jpg';
  }

  return { MAX_EDGE, isHeic, outputSize, needsPreparation, jpegName };
});
