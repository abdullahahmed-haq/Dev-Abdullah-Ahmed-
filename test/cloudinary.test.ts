import assert from 'node:assert/strict'
import test from 'node:test'

import { cloudinarySignature, isOwnedCloudinaryAsset, isOwnedCloudinaryUrl } from '../lib/media/cloudinary'

test('Cloudinary signatures keep the API secret server-side and serialize fields canonically', async () => {
  assert.equal(await cloudinarySignature({ timestamp: 1315060510 }, 'abcd'), 'a21ad0f63beb4de2e5575204b79ab90bffb02c10')
})

test('only the configured Cloudinary portfolio folder can be registered', () => {
  assert.equal(isOwnedCloudinaryUrl('https://res.cloudinary.com/example/image/upload/v1/portfolio/hero.jpg', 'example'), true)
  assert.equal(isOwnedCloudinaryUrl('https://res.cloudinary.com/example/image/upload/v1/other/hero.jpg', 'example'), false)
  assert.equal(isOwnedCloudinaryUrl('https://example.com/portfolio/hero.jpg', 'example'), false)
})

test('registered Cloudinary metadata must match the signed asset identity and type', () => {
  const url = 'https://res.cloudinary.com/example/image/upload/c_fill,w_1200/v1/portfolio/case-studies/hero.jpg'
  assert.equal(isOwnedCloudinaryAsset(url, 'example', 'portfolio/case-studies/hero', 'image'), true)
  assert.equal(isOwnedCloudinaryAsset(url, 'example', 'portfolio/case-studies/other', 'image'), false)
  assert.equal(isOwnedCloudinaryAsset(url, 'example', 'portfolio/case-studies/hero', 'video'), false)
})
