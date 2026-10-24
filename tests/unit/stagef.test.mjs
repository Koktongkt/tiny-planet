// node --test — Stage F: cook steps, perfect energy, recipe mapping, skip / auto, save v5 → v6
import test from 'node:test'
import assert from 'node:assert/strict'
import { migrate, fresh, SAVE_VERSION, START_PHASE, TAU } from '../../src/save/schema.js'
import { RECIPES } from '../../src/game/recipes.js'
import { eat, FOOD } from '../../src/systems/buffs.js'
import { RESTORE, COST, restoreFor, eatRestore, perfectRestore } from '../../src/systems/energy.js'
import {
  stepFor, stepDur, scoreStir, scoreFlip, scorePress, scorePour, resolveCook, perfectId,
  createStep, tickStep, STIR_RATE, FLIP_GOLD, POUR,
} from '../../src/game/cook/logic.js'
import { renderCook, COOK_SFX } from '../../src/game/cook/sfx.js'

const FOOD_COOK = {
  onigiri: 'press', soup: 'stir', jam: 'stir', grilledfish: 'flip', teacup: 'pour',
  acorn_cookie: 'press', pine_tea: 'pour', jam_sky: 'stir', soup_veg: 'stir',
}

test('every Food recipe names a step; a future Food recipe stirs', () => {
  const food = RECIPES.filter(r => r.cat === 'Food')
  assert.ok(food.length >= 9)
  for (const r of food) {
    assert.equal(r.cook, FOOD_COOK[r.id], r.id)
    assert.equal(stepFor(r), FOOD_COOK[r.id])
  }
  assert.equal(stepFor({ cat: 'Food', makes: 'future' }), 'stir')
  assert.equal(stepFor({ cat: 'Food', cook: 'pour', makes: 'x' }), 'pour')
  assert.equal(stepFor({ cat: 'Food', cook: 'bake' }), 'stir')
  assert.equal(stepFor({ cat: 'Decor', makes: 'wreath' }), 'stir')
})

test('stir scoring: calm fill is perfect; too fast, too slow, or unfilled is still a dish', () => {
  assert.equal(scoreStir({ fill: 1, rate: 0.32, bubbled: false }).perfect, true)
  assert.equal(scoreStir({ fill: 1, rate: STIR_RATE[0], bubbled: false }).perfect, true)
  assert.equal(scoreStir({ fill: 1, rate: STIR_RATE[1], bubbled: false }).perfect, true)
  assert.equal(scoreStir({ fill: 1, rate: 0.9, bubbled: false }).perfect, false)
  assert.equal(scoreStir({ fill: 1, rate: 0.1, bubbled: false }).perfect, false)
  assert.equal(scoreStir({ fill: 0.4, rate: 0.32, bubbled: true }).perfect, false)
  assert.equal(scoreStir({ fill: 0.4, rate: 0.1, bubbled: true }).ok, true)
  const held = createStep('stir', false)
  while (!held.done) tickStep(held, 0.05, { space: true, dRevs: 0 })
  assert.equal(held.score.perfect, true)
  assert.equal(held.score.ok, true)
  assert.ok(held.fill >= 1)
  const fast = createStep('stir', false)
  tickStep(fast, 0.3, { dRevs: 3, space: false })
  assert.equal(fast.done, true)
  assert.equal(fast.score.perfect, false)
  assert.equal(fast.score.ok, true)
  const idle = createStep('stir', false)
  while (!idle.done) tickStep(idle, 0.05, { space: false, dRevs: 0 })
  assert.equal(idle.score.perfect, false)
  assert.ok(idle.fill < 1)
})

test('flip scoring: a tap in the golden band is perfect; waiting it out is a normal dish', () => {
  assert.equal(scoreFlip(0.5).perfect, true)
  assert.equal(scoreFlip(FLIP_GOLD[0]).perfect, true)
  assert.equal(scoreFlip(FLIP_GOLD[1]).perfect, true)
  assert.equal(scoreFlip(0.2).perfect, false)
  assert.equal(scoreFlip(1).perfect, false)
  assert.equal(scoreFlip(1).ok, true)
  const gold = createStep('flip', false)
  while (!gold.gold && !gold.done) tickStep(gold, 0.02, { tap: false })
  assert.equal(gold.gold, true)
  tickStep(gold, 0.02, { tap: true })
  assert.equal(gold.score.perfect, true)
  const late = createStep('flip', false)
  while (!late.done) tickStep(late, 0.05, { tap: false })
  assert.equal(late.score.perfect, false)
  assert.equal(late.score.ok, true)
  assert.equal(late.score.progress, 1)
})

test('press scoring: all three pulses is perfect; misses still cook', () => {
  assert.equal(scorePress([true, true, true]).perfect, true)
  assert.equal(scorePress([true, true, true]).landed, 3)
  assert.equal(scorePress([true, false, true]).perfect, false)
  assert.equal(scorePress([true, false, true]).landed, 2)
  assert.equal(scorePress([false, false, false]).ok, true)
  const hit = createStep('press', false)
  while (!hit.done) tickStep(hit, 0.01, { tap: hit.hot })
  assert.equal(hit.score.perfect, true)
  assert.equal(hit.score.landed, 3)
  const two = createStep('press', false)
  let taps = 0
  while (!two.done) {
    const tap = two.hot && taps < 2
    if (tap) taps++
    tickStep(two, 0.01, { tap })
  }
  assert.equal(two.score.perfect, false)
  assert.equal(two.score.landed, 2)
  assert.equal(two.score.ok, true)
  const miss = createStep('press', false)
  while (!miss.done) tickStep(miss, 0.05, { tap: false })
  assert.equal(miss.score.perfect, false)
  assert.equal(miss.score.ok, true)
  assert.equal(miss.score.landed, 0)
})

test('pour scoring: releasing on the line is perfect; anywhere else is still a cup', () => {
  assert.equal(scorePour(POUR.line).perfect, true)
  assert.equal(scorePour(POUR.line - POUR.band).perfect, true)
  assert.equal(scorePour(POUR.line + POUR.band).perfect, true)
  assert.equal(scorePour(0.2).perfect, false)
  assert.equal(scorePour(1).perfect, false)
  assert.equal(scorePour(0.2).ok, true)
  const cup = createStep('pour', false)
  while (!cup.done && cup.level < POUR.line) tickStep(cup, 0.05, { hold: true, release: false })
  assert.equal(cup.band, true)
  tickStep(cup, 0.016, { hold: false, release: true })
  assert.equal(cup.score.perfect, true)
  assert.equal(cup.score.ok, true)
  const dry = createStep('pour', false)
  while (!dry.done) tickStep(dry, 0.05, { hold: false, release: false })
  assert.equal(dry.score.perfect, false)
  assert.equal(dry.score.ok, true)
})

test('reduced motion stretches a step and does not change the pour line', () => {
  assert.ok(stepDur('stir', true) / stepDur('stir', false) >= 1.4)
  assert.equal(stepDur('flip', true), Math.round(3.4 * 1.6 * 100) / 100)
  const calm = createStep('pour', true)
  const plain = createStep('pour', false)
  assert.ok(calm.dur > plain.dur)
  assert.ok(calm.rate < plain.rate)
  assert.ok(Math.abs(calm.rate * calm.dur - plain.rate * plain.dur) < 0.05)
})

test('skip and auto-cook are ordinary dishes; only a played perfect is the perfect id', () => {
  const soup = RECIPES.find(r => r.id === 'soup')
  const sky = RECIPES.find(r => r.id === 'jam_sky')
  assert.deepEqual(resolveCook(soup, { perfect: true, via: 'skip' }), { item: 'soup', perfect: false, via: 'skip' })
  assert.deepEqual(resolveCook(soup, { perfect: true, via: 'auto' }), { item: 'soup', perfect: false, via: 'auto' })
  assert.deepEqual(resolveCook(soup, { perfect: false, via: 'play' }), { item: 'soup', perfect: false, via: 'play' })
  assert.deepEqual(resolveCook(soup, { perfect: true, via: 'play' }), { item: 'soup_perfect', perfect: true, via: 'play' })
  assert.equal(resolveCook(sky, { perfect: true, via: 'play' }).item, 'jam_perfect')
  assert.equal(perfectId('onigiri'), 'onigiri_perfect')
  assert.equal(COST.cook, 4)
})

test('a perfect dish restores about +25% and keeps the food buff', () => {
  for (const [id, n] of Object.entries(RESTORE)) {
    if (id === 'skyberry') continue
    assert.equal(perfectRestore(n), Math.round(n * 1.25))
    assert.equal(restoreFor(id + '_perfect'), Math.round(n * 1.25))
    assert.equal(restoreFor(id), n)
    assert.equal(eatRestore(0, id + '_perfect'), Math.min(100, Math.round(n * 1.25)))
  }
  assert.equal(eatRestore(90, 'soup_perfect'), 100)
  assert.equal(eatRestore(80, 'soup'), 100)
  assert.equal(restoreFor('skyberry'), 14)
  const buffs = []
  assert.equal(eat(buffs, 'onigiri_perfect', 0), 'swift')
  assert.equal(eat(buffs, 'grilledfish_perfect', 0), 'swift')
  assert.equal(eat(buffs, 'acorn_cookie_perfect', 0), 'swift')
  assert.equal(eat([], 'pine_tea_perfect', 0), 'cozy')
  assert.equal(eat([], 'teacup_perfect', 0), 'cozy')
  assert.equal(eat([], 'soup_perfect', 0), 'cozy')
  assert.equal(eat([], 'jam_perfect', 0), 'lucky')
  assert.equal(FOOD.onigiri[0], 'swift')
})

test('v5 saves become v6 with auto-cook off and no lost progress', () => {
  assert.equal(SAVE_VERSION, 6)
  assert.equal(fresh().v, 6)
  assert.equal(fresh().settings.autoCook, false)
  assert.equal(fresh().energy, 100)
  const v5 = {
    v: 5, day: 1, energy: 41, inv: { soup: 2, soup_perfect: 1, wood: 4 }, seen: { soup: true },
    tools: { rod: true }, crafted: 3, clock: { a: START_PHASE + TAU },
    settings: { volume: 0.4, muted: true },
  }
  const s = migrate(v5)
  assert.equal(s.v, 6)
  assert.equal(s.energy, 41)
  assert.equal(s.inv.soup, 2)
  assert.equal(s.inv.soup_perfect, 1)
  assert.equal(s.inv.wood, 4)
  assert.equal(s.tools.rod, true)
  assert.equal(s.settings.volume, 0.4)
  assert.equal(s.settings.muted, true)
  assert.equal(s.settings.autoCook, false)
  assert.equal(s.settings.music, 0.7)
  const kept = migrate({ v: 5, energy: 37, settings: { autoCook: true, volume: 0.2 }, inv: { jam: 1 } })
  assert.equal(kept.settings.autoCook, true)
  assert.equal(kept.settings.volume, 0.2)
  assert.equal(kept.energy, 37)
  assert.equal(kept.inv.jam, 1)
  const v1 = migrate({ day: 3, inv: { wood: 1 } })
  assert.equal(v1.v, 6)
  assert.equal(v1.energy, 100)
  assert.equal(v1.inv.wood, 1)
  assert.equal(v1.settings.autoCook, false)
})

test('cook sound buffers are short and named', () => {
  for (const name of ['cook_stir', 'cook_sizzle', 'cook_pour', 'cook_perfect']) {
    assert.ok(COOK_SFX[name])
    const x = renderCook(name, 2)
    assert.ok(x instanceof Float32Array)
    assert.ok(x.length > 100)
    assert.ok(x.length < 24000)
  }
  assert.equal(renderCook('cook_nope'), null)
})
