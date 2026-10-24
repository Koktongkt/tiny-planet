// node --test tests/unit — Stage E: save v5 energy, eat restore, activity drain, bike craft + mount gate
import test from 'node:test'
import assert from 'node:assert/strict'
import { migrate, fresh, SAVE_VERSION, START_PHASE, TAU } from '../../src/save/schema.js'
import { FOOD } from '../../src/systems/buffs.js'
import { RECIPES } from '../../src/game/recipes.js'
import {
  COST, RESTORE, LOW, AWAKE_PER_HOUR, EMPTY_SPEED, LOW_SPEED,
  speedMul, spend, restoreFor, eatRestore, awakeDrain, applyActivity, clamp,
} from '../../src/systems/energy.js'
import {
  RECIPE, BIKE_SPEED, canCraftBike, craftBike, tryToggle, keepMounted, rideScale,
} from '../../src/systems/bike.js'
import { createBike } from '../../src/art/bike/mesh.js'

test('save is v6; a v4 save gains full energy and keeps Stage C progress', () => {
  assert.equal(SAVE_VERSION, 6)
  assert.equal(fresh().energy, 100)
  const v4 = {
    v: 4, day: 2, inv: { wood: 3, fish: 1 }, tools: { rod: true }, crafted: 2,
    clock: { a: START_PHASE + 2 * TAU },
    fish: { minnow: { count: 1, best: 8, day: 1 } },
    journal: { forage: { mushroom: { n: 1 } }, relics: {} },
    museum: { donated: { relic_bowl: 1 } }, photos: { list: [{ id: 'ph1' }] },
    train: { rides: 1 }, tutorial: { done: { move: true }, dismissed: true, open: false },
    dig: { taken: { a: 1 } }, garden: { day: 2, plots: [] }, friends: { day: 2, list: {} },
    errands: { day: 2, list: [] }, buffs: [], settings: { volume: 0.4 },
  }
  const s = migrate(v4)
  assert.equal(s.v, 6)
  assert.equal(s.energy, 100)
  assert.equal(s.settings.autoCook, false)
  assert.equal(s.inv.wood, 3)
  assert.equal(s.tools.rod, true)
  assert.equal(s.fish.minnow.best, 8)
  assert.equal(s.museum.donated.relic_bowl, 1)
  assert.equal(s.photos.list[0].id, 'ph1')
  assert.equal(s.train.rides, 1)
  assert.equal(s.tutorial.done.move, true)
  assert.equal(s.dig.taken.a, 1)
  assert.equal(migrate(JSON.parse(JSON.stringify(s))).energy, 100)
})

test('v5 energy is clamped; a carried value survives migration; garbage falls back to full', () => {
  assert.equal(migrate({ v: 5, day: 1, energy: 37, clock: { a: START_PHASE + TAU } }).energy, 37)
  assert.equal(migrate({ v: 5, energy: 140 }).energy, 100)
  assert.equal(migrate({ v: 5, energy: -8 }).energy, 0)
  assert.equal(migrate({ v: 5, energy: 'tired' }).energy, 100)
  assert.equal(migrate({ v: 4, energy: 12, day: 0, clock: { a: START_PHASE } }).energy, 12)
  const v1 = migrate({ day: 3, inv: { wood: 1 } })
  assert.equal(v1.v, 6)
  assert.equal(v1.energy, 100)
  assert.equal(v1.inv.wood, 1)
})

test('eating food restores energy; cooked meals restore more than raw', () => {
  assert.equal(restoreFor('skyberry'), RESTORE.skyberry)
  assert.ok(RESTORE.skyberry > 0)
  for (const id of Object.keys(FOOD)) assert.ok(restoreFor(id) > 0, id + ' is food and should restore')
  for (const id of ['onigiri', 'soup', 'jam', 'grilledfish', 'teacup', 'acorn_cookie', 'pine_tea']) {
    assert.ok(eatRestore(10, id) - 10 > eatRestore(10, 'skyberry') - 10, id)
  }
  assert.equal(eatRestore(90, 'soup'), 100)
  assert.equal(eatRestore(40, 'wood'), 40)
  assert.equal(eatRestore(40, 'berries'), 40) // meadow ingredient, not a Food-category item
  assert.equal(eatRestore(40, 'fish'), 40)
})

test('activity hooks drain small chunks, walking is free, and energy never goes below 0', () => {
  assert.equal(COST.gather, 2)
  assert.equal(COST.forage, 2)
  assert.equal(COST.craft, 3)
  assert.ok(COST.craft > COST.gather)
  for (const a of ['fish', 'dig', 'garden', 'cook']) {
    assert.ok(COST[a] >= 3 && COST[a] <= 4, a)
    assert.ok(COST[a] > COST.gather, a)
  }
  assert.equal(applyActivity(100, 'walk').cost, 0)
  assert.equal(applyActivity(100, 'sleep').energy, 100)
  assert.equal(applyActivity(100, 'gather').energy, 98)
  assert.equal(applyActivity(100, 'forage').activity, 'gather')
  assert.equal(applyActivity(100, 'craft').energy, 97)
  assert.equal(applyActivity(100, 'fish').energy, 100 - COST.fish)
  assert.equal(applyActivity(100, 'cast').activity, 'fish')
  assert.equal(applyActivity(100, 'dig').activity, 'dig')
  assert.equal(applyActivity(100, 'plant').activity, 'garden')
  assert.equal(applyActivity(100, 'water').activity, 'garden')
  assert.equal(applyActivity(100, 'harvest').activity, 'garden')
  assert.equal(applyActivity(100, 'cook').activity, 'cook')
  assert.equal(applyActivity(2, 'cook').energy, 0)
  assert.equal(spend(0, 'gather'), 0)
})

test('awake time drains a little per hour; low energy slows movement but never stops it', () => {
  assert.ok(AWAKE_PER_HOUR >= 1 && AWAKE_PER_HOUR <= 2)
  assert.equal(awakeDrain(100, 0), 100)
  assert.equal(awakeDrain(100, 2), clamp(100 - 2 * AWAKE_PER_HOUR))
  assert.equal(awakeDrain(1, 10), 0)
  assert.equal(LOW, 25)
  assert.equal(speedMul(100), 1)
  assert.equal(speedMul(26), 1)
  assert.equal(speedMul(25), LOW_SPEED)
  assert.equal(LOW_SPEED, 0.75)
  assert.equal(speedMul(1), LOW_SPEED)
  assert.equal(speedMul(0), EMPTY_SPEED)
  assert.ok(EMPTY_SPEED > 0 && EMPTY_SPEED < LOW_SPEED)
})

test('the bicycle is one craft: wood, stone and a shard, and it stays owned', () => {
  const r = RECIPES.find(x => x.id === 'bike')
  assert.ok(r)
  assert.equal(r, RECIPE)
  assert.equal(r.cat, 'Tools')
  assert.equal(r.makes, 'bike')
  assert.deepEqual(r.needs, [['wood', 4], ['stone', 2], ['shard', 1]])
  const short = { inv: { wood: 4, stone: 2, coin: 2 }, tools: {}, crafted: 0, seen: {} }
  assert.equal(canCraftBike(short), false) // coin is not a stand-in: any-needs can't express 2 coins vs 1 shard
  const s = { inv: { wood: 5, stone: 2, shard: 1, coin: 9 }, tools: {}, crafted: 0, seen: {} }
  assert.equal(craftBike(s), true)
  assert.equal(s.tools.bike, true)
  assert.equal(s.inv.wood, 1)
  assert.equal(s.inv.stone, undefined)
  assert.equal(s.inv.shard, undefined)
  assert.equal(s.inv.coin, 9)
  assert.equal(s.crafted, 1)
  assert.equal(s.seen.bike, true)
  assert.equal(craftBike(s), false)
  assert.equal(canCraftBike(s), false)
})

test('mount needs the bicycle and is blocked in exclusive modes; dismount always works', () => {
  const tools = { bike: true }
  assert.deepEqual(tryToggle(false, { tools: {} }), { mounted: false, ok: false, reason: 'own' })
  assert.deepEqual(tryToggle(false, { tools }), { mounted: true, ok: true, reason: 'mount' })
  for (const [extra, reason] of [
    [{ inside: true }, 'inside'],
    [{ museum: true }, 'museum'],
    [{ lock: 'ride' }, 'ride'],
    [{ riding: true }, 'ride'],
    [{ lock: 'photo' }, 'photo'],
    [{ photo: true }, 'photo'],
    [{ fish: true }, 'fish'],
    [{ place: true }, 'place'],
    [{ panel: true }, 'panel'],
  ]) {
    const r = tryToggle(false, { tools, ...extra })
    assert.equal(r.ok, false, reason)
    assert.equal(r.mounted, false, reason)
    assert.equal(r.reason, reason)
  }
  assert.deepEqual(tryToggle(true, { tools, inside: true }), { mounted: false, ok: true, reason: 'dismount' })
  assert.equal(keepMounted(true, { tools }), true)
  assert.equal(keepMounted(true, { tools, inside: true }), false)
  assert.equal(keepMounted(true, { tools, museum: true }), false)
  assert.equal(keepMounted(true, { tools, lock: 'ride' }), false)
  assert.equal(keepMounted(true, { tools, lock: 'photo' }), false)
  assert.equal(keepMounted(true, { tools, fish: true }), false)
  assert.equal(keepMounted(false, { tools }), false)
  assert.equal(keepMounted(true, { tools: {} }), false)
  // bag / placement block a new mount but do not kick you off
  assert.equal(keepMounted(true, { tools, panel: true }), true)
  assert.equal(keepMounted(true, { tools, place: true }), true)
  const fast = rideScale(100, { swift: 1, mounted: true })
  assert.equal(fast, BIKE_SPEED)
  assert.ok(BIKE_SPEED > 1.4)
  assert.ok(rideScale(0, { swift: 1, mounted: true }) > 0)
  assert.ok(rideScale(0, { swift: 1, mounted: false }) > 0)
  assert.ok(rideScale(10, { swift: 1.15, mounted: true }) > rideScale(10, { swift: 1, mounted: false }))
})

test('the bicycle mesh is a placeholder of at most 3 draw calls', () => {
  const b = createBike()
  const meshes = [b.frame, ...b.wheels]
  assert.ok(meshes.length >= 2 && meshes.length <= 3)
  assert.equal(b.calls, meshes.length)
  assert.equal(new Set(meshes.map(m => m.material)).size, 1)
  for (const m of meshes) {
    assert.equal(m.isMesh, true)
    assert.ok(m.geometry.attributes.position.count > 0)
  }
  b.wheels[0].geometry.dispose()
  b.frame.geometry.dispose()
  b.frame.material.dispose()
})
