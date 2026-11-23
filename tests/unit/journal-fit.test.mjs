// Journal book fit: the painted book (1448x1086) scales to the screen; below half size the old notebook is used.
import test from 'node:test'
import assert from 'node:assert/strict'
import { bookScale, MIN_SCALE } from '../../src/ui/journal/book/fit.js'

test('the book scales to fit the screen with an 8px margin, never above 1', () => {
  assert.equal(bookScale(1280, 800), Math.min((1280 - 16) / 1448, (800 - 16) / 1086))
  assert.equal(bookScale(4000, 3000), 1)
})
test('a laptop fits the book; a portrait phone does not', () => {
  assert.ok(bookScale(1280, 720) >= MIN_SCALE)
  assert.ok(bookScale(390, 844) < MIN_SCALE)
})
test('one art file per screen: the sharp one on high-density screens, so the preload and the book use the same image', async () => {
  const { artFor } = await import('../../src/ui/journal/book/fit.js')
  assert.equal(artFor(1, 'a.webp', 'a@2x.webp'), 'a.webp'); assert.equal(artFor(1.25, 'a.webp', 'a@2x.webp'), 'a.webp')
  assert.equal(artFor(1.5, 'a.webp', 'a@2x.webp'), 'a@2x.webp'); assert.equal(artFor(3, 'a.webp', 'a@2x.webp'), 'a@2x.webp')
  assert.equal(artFor(undefined, 'a.webp', 'a@2x.webp'), 'a.webp')
})
