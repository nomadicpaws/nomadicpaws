const assert = require('node:assert/strict');
const review = require('../admin/review-utils.js');

const body = 'Intro\n\n![Cheeto on trail](/images/cheeto.jpg)\n\n## Next stop';
const prepared = review.prepareBody(body);
assert.equal(prepared.images.length, 1);
assert.match(prepared.text, /\[IMAGE 1: Cheeto on trail\]/);

const revised = prepared.text.replace('Intro', 'A better intro');
assert.equal(review.restoreImages(revised, prepared.images).text, body.replace('Intro', 'A better intro'));
assert.equal(review.restoreImages('No image token', prepared.images).missing.length, 1);

const copy = review.reviewCopy({ title: 'Test', body, status: 'Draft' }, false);
assert.match(copy, /SEO title: Test/);
assert.match(copy, /Subtitle \/ meta description is missing/);
assert.match(copy, /Keep every \[IMAGE …\] placeholder/);

console.log('review-utils tests passed');
