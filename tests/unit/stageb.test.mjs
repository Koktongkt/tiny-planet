// node --test tests/unit — Stage B systems: garden growth, friendship hearts, errand reset, buffs
import test from 'node:test'; import assert from 'node:assert/strict'
import { emptyPlot, plant, water, harvest, growDay, advanceTo, stageFor, CROP, WITHER_DAYS, packCrop } from '../../src/systems/garden.js'
import { give, resetDay, reactionTo, friendOf, MAX_HEARTS, RETURN_GIFTS } from '../../src/systems/friendship.js'
import { errandsFor, rollDay, accept, deliver, canDeliver } from '../../src/systems/errands.js'
import { eat, active, has, gameMinutes, prune } from '../../src/systems/buffs.js'

test('a watered crop grows one step per morning and ripens on time', () => {
  const p = emptyPlot('p0'); assert.ok(plant(p, 'turnip', 0)); assert.equal(p.stage, 'seed')
  const seen = []
  for (let d = 0; d < CROP.turnip.days; d++) { assert.ok(water(p)); growDay(p); seen.push(p.stage) }
  assert.deepEqual(seen, ['sprout', 'young', 'ripe'])
  assert.equal(water(p), false) // ripe: nothing to water
  const y = harvest(p); assert.deepEqual(y, [['turnip', 2]]); assert.equal(p.cropId, null)
})
test('dry days pause growth; ripe crops wither if left', () => {
  const p = emptyPlot('p1'); plant(p, 'herb', 0)
  growDay(p); assert.equal(p.stage, 'seed') // not watered: no growth
  water(p); growDay(p); water(p); growDay(p); assert.equal(p.stage, 'ripe')
  for (let i = 0; i < WITHER_DAYS; i++) growDay(p)
  assert.equal(p.stage, 'withered'); assert.equal(harvest(p), null)
})
test('stages cover the contract enum in order', () => {
  const st = [0, 1, 2, 3, 4, 5].map(g => stageFor('skyseed', g))
  assert.deepEqual(st, ['seed', 'sprout', 'young', 'young', 'mature', 'ripe'])
  const p = emptyPlot('s'); plant(p, 'skyseed', 0); p.grown = CROP.skyseed.days; p.stage = 'ripe'
  assert.deepEqual(harvest(p), [['skyberry', 3], ['skyseed', 1]])
})
test('advanceTo catches up several days at once and never goes back', () => {
  const g = { day: 0, plots: [emptyPlot('a')] }; plant(g.plots[0], 'carrot', 0); water(g.plots[0])
  assert.equal(advanceTo(g, 3), 3); assert.equal(g.day, 3); assert.equal(g.plots[0].grown, 1) // watered once only
  assert.equal(advanceTo(g, 2), 0); assert.equal(g.day, 3)
  assert.ok(['turnip', 'carrot', 'herb'].includes(packCrop(4, 7)))
})
test('gifts move hearts by reaction, once per day, clamped to 0..5', () => {
  const F = { day: 0, list: {} }
  assert.equal(reactionTo('scholar', 'shard'), 'love'); assert.equal(reactionTo('scholar', 'fish'), 'dislike'); assert.equal(reactionTo('scholar', 'jam'), 'like'); assert.equal(reactionTo('scholar', 'wood'), 'neutral')
  const r = give(F, 'scholar', 'shard'); assert.equal(r.kind, 'love'); assert.equal(friendOf(F, 'scholar').hearts, 1)
  assert.equal(give(F, 'scholar', 'shard'), null) // giftedToday
  assert.ok(resetDay(F, 1)); assert.equal(F.list.scholar.giftedToday, false); assert.equal(resetDay(F, 1), false)
  give(F, 'scholar', 'fish'); assert.equal(F.list.scholar.hearts, 0.75); assert.equal(F.list.scholar.lastGiftReaction, 'dislike')
  const g = { day: 0, list: {} }; give(g, 'cook', 'flower'); assert.equal(g.list.cook.hearts, 0) // never below 0
  let returns = []
  for (let d = 0; d < 9; d++) { resetDay(g, d + 1); returns = returns.concat(give(g, 'cook', 'soup').returns) }
  assert.equal(g.list.cook.hearts, MAX_HEARTS)
  assert.deepEqual(returns, [RETURN_GIFTS[3], RETURN_GIFTS[5]]) // each return gift once
  const c = { day: 0, list: {} }; give(c, 'baker', 'jam', 1.5); assert.equal(c.list.baker.hearts, 0.75) // cozy buff
})
test('errands are deterministic per day and reset each new day', () => {
  assert.deepEqual(errandsFor(4), errandsFor(4)); assert.equal(errandsFor(0).length, 1); assert.equal(errandsFor(5).length, 2)
  const E = { day: -1, list: [] }; assert.ok(rollDay(E, 3)); const ids = E.list.map(e => e.id)
  assert.ok(E.list.every(e => e.day === 3 && !e.accepted && !e.done && e.wants.length && e.npcId))
  assert.equal(new Set(E.list.map(e => e.npcId)).size, E.list.length) // one note per villager
  const e = E.list[0], inv = {}; for (const w of e.wants) inv[w.itemId] = w.count + 1
  assert.equal(canDeliver(e, inv), false) // must take it first
  assert.ok(accept(E, e.id)); assert.ok(deliver(E, e.id, inv)); assert.ok(e.done); for (const w of e.wants) assert.equal(inv[w.itemId], 1)
  assert.equal(deliver(E, e.id, inv), null)
  assert.equal(rollDay(E, 3), false); assert.deepEqual(E.list.map(x => x.id), ids) // same day: unchanged
  assert.ok(rollDay(E, 4)); assert.ok(E.list.every(x => x.day === 4 && !x.done && !x.accepted))
})
test('food buffs are timed and refresh instead of stacking', () => {
  const B = [], t = gameMinutes(0.4)
  assert.equal(eat(B, 'acorn_cookie', t), 'swift'); assert.equal(eat(B, 'wood', t), null)
  assert.ok(has(B, 'swift', t + 100)); assert.equal(has(B, 'swift', t + 181), false)
  eat(B, 'onigiri', t + 100); assert.equal(B.length, 1); assert.equal(B[0].endsAt, t + 220)
  eat(B, 'pine_tea', t); eat(B, 'jam', t); assert.deepEqual(active(B, t + 1).map(b => b.id).sort(), ['cozy', 'lucky', 'swift'])
  prune(B, t + 200); assert.deepEqual(B.map(b => b.id), ['swift'])
  assert.ok(Math.abs(gameMinutes(0.4 + Math.PI * 2) - t - 1440) < 1e-9) // one turn of the clock = one day
})
