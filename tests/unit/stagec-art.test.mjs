// node --test tests/unit — Stage C art: fish table + text, fish triangle budget, photo filters, poses, tutorial steps
import test from 'node:test'; import assert from 'node:assert/strict'
import fs from 'node:fs'
import { FISH, FISH_IDS, FISH_BY_ID, RARE_FISH_ITEMS, SEASONS, RARITY, fishFor, rollFish, weatherKind } from '../../src/game/fishTable.js'
import { FISH_TEXT, ITEM_LABELS_C, fishName } from '../../src/game/itemsC.js'
import { buildFishGeometry } from '../../src/art/fish/geometry.js'
import { FILTER_IDS, FILTERS, filterMatrix, filterCss } from '../../src/ui/photo/filters.js'
import { PET_POSES, PAIR_POSES, PAIR_POSE_IDS, applyPetPose } from '../../src/art/poses/petPoses.js'
import { HER_POSE_IDS, HER_POSES } from '../../src/art/poses/herPoses.js'
import { POSES } from '../../src/act.js'
import { TUTORIAL_STEPS, TUTORIAL_SIGNER, withProgress } from '../../src/ui/tutorial/steps.js'

const seeded = (s = 7) => () => ((s = (s * 16807) % 2147483647) / 2147483647)

test('12 fish species, unique ids, sane availability', () => {
  assert.equal(FISH.length, 12); assert.equal(new Set(FISH_IDS).size, 12)
  for (const f of FISH) {
    assert.ok(FISH_BY_ID[f.id] === f); assert.ok(f.id in RARITY || f.rarity in RARITY, f.id)
    assert.ok(f.spots.length && f.spots.every(s => ['lake', 'river', 'harbour'].includes(s)), f.id)
    assert.ok(f.size[0] < f.size[1], f.id)
    assert.ok(['any', 'clear', 'rain'].includes(f.weather), f.id)
  }
  assert.deepEqual(SEASONS, ['spring', 'summer', 'autumn', 'winter'])
  assert.ok(RARE_FISH_ITEMS.every(id => FISH_BY_ID[id]))
})
test('every spot has a bite in every season/period/weather', () => {
  for (const spot of ['lake', 'river', 'harbour']) for (const season of SEASONS) for (const period of ['morning', 'day', 'evening', 'night']) for (const weather of ['clear', 'rain'])
    assert.ok(fishFor({ spot, season, period, weather }).length > 0, `${spot}/${season}/${period}/${weather}`)
})
test('rollFish is deterministic with a seeded rnd and stays inside size range', () => {
  const ctx = { spot: 'lake', season: 'summer', period: 'evening', weather: 'rain' }
  const a = rollFish(ctx, seeded(3)), b = rollFish(ctx, seeded(3)); assert.deepEqual(a, b)
  const rnd = seeded(11)
  for (let i = 0; i < 500; i++) { const r = rollFish(ctx, rnd); const f = FISH_BY_ID[r.fishId]; assert.ok(fishFor(ctx).includes(f)); assert.ok(r.size >= f.size[0] && r.size <= f.size[1]) }
  assert.equal(weatherKind('drizzle'), 'rain'); assert.equal(weatherKind('clear'), 'clear'); assert.equal(weatherKind('breezy'), 'clear')
})
test('every species has cozy text; the rare ones are items', () => {
  for (const id of FISH_IDS) { assert.ok(FISH_TEXT[id]?.name && FISH_TEXT[id]?.desc, id); assert.equal(fishName(id), FISH_TEXT[id].name) }
  assert.deepEqual(Object.keys(ITEM_LABELS_C).sort(), [...RARE_FISH_ITEMS].sort())
})
test('fish meshes stay within 300 triangles (hi) and lo LOD is lighter', () => {
  for (const id of FISH_IDS) {
    const hi = buildFishGeometry(id, 'hi'), lo = buildFishGeometry(id, 'lo')
    const th = hi.attributes.position.count / 3, tl = lo.attributes.position.count / 3
    assert.ok(th <= 300, `${id} hi ${th}`); assert.ok(tl < th, `${id} lo ${tl}`)
    for (const a of ['color', 'aBelly', 'aC2', 'aFP', 'aPat']) assert.ok(hi.attributes[a], `${id} missing ${a}`)
  }
})
test('7 photo filters; none is the identity', () => {
  assert.equal(FILTER_IDS.length, 7); assert.equal(FILTER_IDS[0], 'none')
  for (const id of FILTER_IDS) { assert.ok(FILTERS[id].label); assert.equal(typeof filterCss(id), 'string'); assert.equal(filterMatrix(id).length, 12) }
  assert.deepEqual(Array.from(filterMatrix('none')), [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0])
})
test('her photo poses register into act.js POSES', () => {
  assert.equal(HER_POSE_IDS.length, 8)
  for (const id of HER_POSE_IDS) { assert.equal(typeof HER_POSES[id], 'function'); assert.equal(typeof POSES['photo_' + id], 'function') }
})
test('pet poses only use Quadruped POSE0 keys; pair poses reference real poses', () => {
  const src = fs.readFileSync(new URL('../../src/pets/Quadruped.jsx', import.meta.url), 'utf8')
  const keys = new Set([...src.match(/export const POSE0 = \{([^}]*)\}/)[1].matchAll(/(\w+):/g)].map(m => m[1]))
  for (const pet of ['pip', 'mochi']) for (const [id, p] of Object.entries(PET_POSES[pet])) for (const k of Object.keys(p)) assert.ok(keys.has(k), `${pet}.${id}.${k}`)
  for (const id of PAIR_POSE_IDS) {
    const P = PAIR_POSES[id]; assert.ok(HER_POSE_IDS.includes(P.her), id)
    for (const pet of ['pip', 'mochi']) { assert.ok(PET_POSES[pet][P[pet].pose], `${id}.${pet}`); assert.equal(P[pet].at.length, 2) }
  }
  const st = { goal: { sit: 0, tailWag: 9 }, speed: 3 }; applyPetPose(st, 'mochi', 'loaf', { sit: 0, tailWag: 0.2 })
  assert.equal(st.speed, 0); assert.equal(st.goal.tailWag, PET_POSES.mochi.loaf.tailWag ?? 0.2)
})
test('tutorial steps cover the contract and track progress', () => {
  assert.deepEqual(TUTORIAL_STEPS.map(s => s.id), ['move', 'look', 'gather', 'craft', 'talk', 'garden', 'sleep'])
  assert.equal(TUTORIAL_SIGNER.npcId, 'grandma')
  const w = withProgress({ move: true, talk: true }); assert.deepEqual(w.filter(s => s.done).map(s => s.id), ['move', 'talk'])
  for (const id of ['move', 'look', 'gather', 'craft']) assert.ok(TUTORIAL_STEPS.find(s => s.id === id).textTouch, id)
})
