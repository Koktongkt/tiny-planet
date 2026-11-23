// In-world prompt logic: weight, facing + sticky target pick, bubble placement (pure).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { promptWeight, pickTarget, placeBubble } from '../../src/game/prompt/logic.js'

test('weights: quick pickups are light, everything else full', () => {
  assert.equal(promptWeight({ kind: 'spot', spot: { item: 'berries' } }), 'light')
  assert.equal(promptWeight({ kind: 'spot', spot: { item: 'firefly' } }), 'light')
  assert.equal(promptWeight({ kind: 'spot', spot: { item: 'wool' } }), 'full')
  assert.equal(promptWeight({ kind: 'spot', spot: { item: 'fish', water: true } }), 'full')
  assert.equal(promptWeight({ kind: 'spot', spot: { item: 'water', water: true } }), 'full')
  assert.equal(promptWeight({ kind: 'decor' }), 'light')
  assert.equal(promptWeight({ kind: 'ext', id: 'dug3' }), 'light')
  assert.equal(promptWeight({ kind: 'ext', id: 'dog' }), 'full')
  assert.equal(promptWeight({ kind: 'ext', id: 'dogbowl' }), 'full')
  assert.equal(promptWeight({ kind: 'bench' }), 'full')
  assert.equal(promptWeight(null), 'full')
})
test('facing beats a slightly closer thing behind', () => {
  const a = { o: { id: 'a' }, d: 0.30, lim: 0.5, cos: -1 }, b = { o: { id: 'b' }, d: 0.34, lim: 0.5, cos: 1 }
  assert.equal(pickTarget([a, b], null).o.id, 'b')
})
test('no anchor: plain distance', () => {
  const a = { o: { id: 'a' }, d: 0.30, lim: 0.5, cos: null }, b = { o: { id: 'b' }, d: 0.34, lim: 0.5, cos: null }
  assert.equal(pickTarget([b, a], null).o.id, 'a')
})
test('out of range never wins', () => {
  assert.equal(pickTarget([{ o: { id: 'a' }, d: 0.6, lim: 0.5, cos: 1 }], null), null)
  assert.equal(pickTarget([], 'a'), null)
})
test('sticky: keeps prev unless clearly better', () => {
  const a = { o: { id: 'a' }, d: 0.30, lim: 0.5, cos: null }, b = { o: { id: 'b' }, d: 0.28, lim: 0.5, cos: null }
  assert.equal(pickTarget([a, b], 'a').o.id, 'a')
  assert.equal(pickTarget([a, { ...b, d: 0.2 }], 'a').o.id, 'b')
})
test('sticky prev out of range is dropped', () => {
  const a = { o: { id: 'a' }, d: 0.6, lim: 0.5, cos: null }, b = { o: { id: 'b' }, d: 0.4, lim: 0.5, cos: null }
  assert.equal(pickTarget([a, b], 'a').o.id, 'b')
})
test('placement: centred above the point, tail on it', () => {
  assert.deepEqual(placeBubble({ x: 195, y: 400, behind: false }, { w: 390, h: 844 }, { bw: 220, bh: 50 }), { left: 85, top: 350, tail: 110 })
})
test('placement: clamped at the right edge, tail still points at the target', () => {
  const r = placeBubble({ x: 385, y: 400, behind: false }, { w: 390, h: 844 }, { bw: 220, bh: 50 })
  assert.equal(r.left, 390 - 8 - 220); assert.equal(r.tail, 220 - 14)
  const l = placeBubble({ x: 30, y: 400, behind: false }, { w: 390, h: 844 }, { bw: 220, bh: 50 })
  assert.equal(l.left, 8); assert.equal(l.tail, 22)
})
test('placement: clamped at the top', () => {
  assert.equal(placeBubble({ x: 195, y: 20, behind: false }, { w: 390, h: 844 }, { bw: 220, bh: 50 }).top, 8)
})
test('placement: behind the camera sits at the bottom edge, mirrored', () => {
  const k = placeBubble({ x: 200, y: 300, behind: true }, { w: 390, h: 844 }, { bw: 220, bh: 50 })
  assert.equal(k.top, 844 - 8 - 50); assert.equal(k.left, 390 - 200 - 110)
})
