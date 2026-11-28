import test from 'node:test'
import assert from 'node:assert/strict'
import { ishiGesture, ISHI_GESTURES } from '../../src/art/chibi/ishiTalk.js'

test('Ishi picks a gesture that fits the line', () => {
  assert.equal(ishiGesture('My pipe is decorative. Fuku\'s orders.'), 'smoke')
  assert.equal(ishiGesture('Hmph. The young walk everywhere so fast.'), 'thump')
  assert.equal(ishiGesture('Did I tell you about the spirit in the giant camphor? No? Sit.'), 'point')
  assert.equal(ishiGesture('This planet is small, but it never ends. Funny, that.'), 'laugh')
  assert.equal(ishiGesture('Good evening.'), 'nod')
})
test('Ishi does not repeat the same gesture twice in a row unless only one fits', () => {
  assert.equal(ishiGesture('Good evening.', 'nod'), 'ponder')
  assert.equal(ishiGesture('My pipe is decorative. Fuku\'s orders.', 'smoke'), 'laugh')
  assert.equal(ishiGesture('Pipe.', 'smoke'), 'smoke')
  for (const l of ['a', 'Hmph', 'story?', 'ha']) assert.ok(ISHI_GESTURES.includes(ishiGesture(l)))
})
