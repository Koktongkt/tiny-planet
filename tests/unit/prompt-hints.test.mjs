// Light-weight pickup chip: shows while learning, when the player hesitates, and after a day away.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { chipShows, notePickup, HINT } from '../../src/game/prompt/hints.js'
import { migrate, SAVE_VERSION } from '../../src/save/schema.js'

test('reminder numbers', () => assert.deepEqual(HINT, { firstN: 3, idleMs: 1500, staleDays: 1 }))
test('shows for the first 3 pickups, then hides', () => {
  const h = {}
  assert.equal(chipShows(h, 'berries', 0, 0), true)
  for (let i = 0; i < 3; i++) notePickup(h, 'berries', 0)
  assert.deepEqual(h.berries, { n: 3, day: 0 })
  assert.equal(chipShows(h, 'berries', 0, 0), false)
  assert.equal(chipShows(h, 'mushroom', 0, 0), true) // per item type
})
test('comes back when the player hesitates 1.5 s', () => {
  const h = { berries: { n: 9, day: 0 } }
  assert.equal(chipShows(h, 'berries', 0, 1499), false)
  assert.equal(chipShows(h, 'berries', 0, 1500), true)
})
test('comes back after a day away from that item', () => {
  const h = { berries: { n: 9, day: 2 } }
  assert.equal(chipShows(h, 'berries', 2, 0), false)
  assert.equal(chipShows(h, 'berries', 3, 0), true)
})
test('save v7 carries hints', () => {
  assert.equal(SAVE_VERSION, 8)
  const s = migrate({ v: 6, day: 1, inv: {}, clock: { a: 7 } })
  assert.equal(s.v, 8); assert.deepEqual(s.hints, {})
  assert.deepEqual(migrate({ v: 7, hints: 5 }).hints, {})
  assert.deepEqual(migrate({ v: 7, hints: { berries: { n: 2, day: 0 } } }).hints, { berries: { n: 2, day: 0 } })
})
