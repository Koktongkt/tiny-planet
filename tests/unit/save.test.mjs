// node --test tests/unit  — save format migrations (no browser)
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'
import { migrate, fresh, SAVE_VERSION, dayFromPhase, TAU, START_PHASE } from '../../src/save/schema.js'
const v1 = JSON.parse(fs.readFileSync(new URL('./fixtures/save-v1.json', import.meta.url)))

test('v1 save migrates to the current version and keeps progress', () => {
  const s = migrate(v1)
  assert.equal(s.v, SAVE_VERSION)
  assert.deepEqual(s.inv, v1.inv); assert.deepEqual(s.tools, v1.tools); assert.deepEqual(s.taken, v1.taken)
  assert.deepEqual(s.placed, v1.placed); assert.equal(s.crafted, v1.crafted); assert.equal(s.unlocked.bridge, true)
  assert.deepEqual(s.watered, v1.watered) // unknown/extra fields survive
  assert.equal(s.day, 3)
})
test('v1 clock resumes on the saved day, not day 0', () => {
  const s = migrate(v1)
  assert.equal(dayFromPhase(s.clock.a), 3)
  assert.ok(Math.abs(s.clock.a - (START_PHASE + 3 * TAU)) < 1e-9)
})
test('current-version save round-trips unchanged', () => {
  const s = migrate(v1), again = migrate(JSON.parse(JSON.stringify(s)))
  assert.deepEqual(again, s)
})
test('a clock behind the day counter is moved forward whole days', () => {
  const s = migrate({ v: 2, day: 5, clock: { a: 1.0 } })
  assert.equal(dayFromPhase(s.clock.a), 5); assert.ok(Math.abs(((s.clock.a % TAU) + TAU) % TAU - 1.0) < 1e-9)
})
test('garbage and empty input give a fresh save', () => {
  for (const x of [null, 42, 'x', [], {}]) { const s = migrate(x); assert.equal(s.v, SAVE_VERSION); assert.equal(s.day, 0); assert.deepEqual(s.inv, {}) }
  const bad = migrate({ inv: 'oops', day: -4, placed: {}, clock: { a: 'n' } })
  assert.deepEqual(bad.inv, {}); assert.equal(bad.day, 0); assert.deepEqual(bad.placed, []); assert.equal(bad.clock.a, START_PHASE)
})
test('a save from a newer build still loads', () => {
  const s = migrate({ v: SAVE_VERSION + 3, day: 2, inv: { wood: 1 }, clock: { a: 2 * TAU + 0.5 } })
  assert.equal(s.v, SAVE_VERSION); assert.equal(s.inv.wood, 1); assert.equal(s.day, 2)
})
test('fresh() is a valid current save', () => { assert.deepEqual(migrate(fresh()), fresh()) })
