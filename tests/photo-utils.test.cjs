const assert = require('node:assert/strict');
const photos = require('../admin/photo-utils.js');

assert.equal(photos.isHeic({ name: 'IMG_1234.HEIC', type: '' }), true);
assert.equal(photos.isHeic({ name: 'photo.jpg', type: 'image/jpeg' }), false);
assert.deepEqual(photos.outputSize(4032, 3024), { width: 2400, height: 1800 });
assert.deepEqual(photos.outputSize(1200, 800), { width: 1200, height: 800 });
assert.equal(photos.needsPreparation({ name: 'small.jpg', type: 'image/jpeg', size: 1000 }), false);
assert.equal(photos.needsPreparation({ name: 'large.jpg', type: 'image/jpeg', size: 2000000 }), true);
assert.equal(photos.jpegName('My iCloud Photo.HEIC'), 'My-iCloud-Photo.jpg');

console.log('photo-utils tests passed');
