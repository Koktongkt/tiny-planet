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
// ---- v3 (Stage B) ----
test('v2 save migrates through v3 (to the current version): progress kept, Stage B state added on the saved day', () => {
  const v2 = { v: 2, inv: { wood: 2 }, seen: { wood: true }, tools: { can: true }, placed: [], unlocked: {}, taken: { 'wood-forest-0': 4 }, day: 4, chest: false, crafted: 1, clock: { a: START_PHASE + 4 * TAU } }
  const s = migrate(v2)
  assert.equal(s.v, SAVE_VERSION); assert.deepEqual(s.inv, v2.inv); assert.deepEqual(s.tools, v2.tools); assert.equal(s.day, 4); assert.equal(s.clock.a, v2.clock.a)
  assert.deepEqual(s.garden, { day: 4, plots: [] }); assert.deepEqual(s.friends, { day: 4, list: {} })
  assert.deepEqual(s.errands, { day: -1, list: [] }) // today's notes roll when the systems load
  assert.deepEqual(s.buffs, []); assert.deepEqual(s.settings, { volume: 0.8, music: 0.7, sfx: 0.8, muted: false, textScale: 1 })
})
test('v1 save goes through every step', () => {
  const s = migrate(v1); assert.equal(s.v, SAVE_VERSION); assert.equal(s.garden.day, 3); assert.equal(dayFromPhase(s.clock.a), 3)
})
test('v3 Stage B state round-trips; broken parts fall back to defaults', () => {
  const s = migrate({ v: 3, day: 2, clock: { a: START_PHASE + 2 * TAU }, garden: { day: 2, plots: [{ id: 'plot-0', pos: [0, 1, 0], cropId: 'turnip', stage: 'young', watered: true, plantedDay: 1, grown: 2 }] },
    friends: { day: 2, list: { baker: { npcId: 'baker', hearts: 2.5, giftedToday: true, lastGiftReaction: 'like' } } }, errands: { day: 2, list: [{ id: 'e2-0', npcId: 'cook', wants: [{ itemId: 'mushroom', count: 3 }], reward: { coins: 2 }, day: 2, accepted: true, done: false }] },
    buffs: [{ id: 'swift', endsAt: 5000 }], settings: { volume: 0.3, muted: true, textScale: 1.15 } })
  assert.deepEqual(migrate(JSON.parse(JSON.stringify(s))), s)
  assert.equal(s.garden.plots[0].stage, 'young'); assert.equal(s.friends.list.baker.hearts, 2.5); assert.equal(s.errands.list[0].accepted, true)
  assert.deepEqual(s.settings, { volume: 0.3, music: 0.7, sfx: 0.8, muted: true, textScale: 1.15 }) // missing key filled
  const bad = migrate({ v: 3, day: 1, garden: 'x', friends: { day: 1, list: [] }, errands: { list: {} }, buffs: {}, settings: 7 })
  assert.deepEqual(bad.garden, { day: 1, plots: [] }); assert.deepEqual(bad.friends, { day: 1, list: {} }); assert.deepEqual(bad.errands, { day: -1, list: [] }); assert.deepEqual(bad.buffs, []); assert.equal(bad.settings.volume, 0.8)
})
