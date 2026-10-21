// node --test tests/unit — Stage C systems: save v4, seasons + weather, fish rolls + reel minigame, train schedule,
// journal + museum, tutorial, photo album
import test from 'node:test'; import assert from 'node:assert/strict'
import { migrate, fresh, SAVE_VERSION, TAU, START_PHASE } from '../../src/save/schema.js'
import { seasonOf, seasonWeights, isRainDay, weatherAt, dayPos, applyTo, rainWindow, SEASON_DAYS } from '../../src/systems/weather.js'
import { FISH, FISH_IDS, rollFish, candidates, recordCatch, newReel, fishStep, RARE_ITEMS, habitatOf } from '../../src/systems/fish.js'
import { buildSchedule, trainState, fare, DWELL } from '../../src/systems/train.js'
import { note, donate, canDonate, entries, dig, digFind, RELICS, DONATABLE, progress } from '../../src/systems/collection.js'
import { mark, visible, allDone, STEP_IDS, freshTutorial, steps } from '../../src/systems/tutorial.js'
import { addPhoto, removePhoto, reconcile, MAX, thumbSize } from '../../src/systems/photo.js'

const seq = (xs) => { let i = 0; return () => xs[i++ % xs.length] }
// ---- save v4 ----
test('save is v4; a v3 save migrates and keeps Stage B state', () => {
  assert.equal(SAVE_VERSION, 4)
  const v3 = { v: 3, day: 4, inv: { fish: 2 }, seen: {}, tools: { rod: true }, garden: { day: 4, plots: [{ id: 'plot-0', cropId: 'turnip', stage: 'young', watered: true, plantedDay: 2 }] }, friends: { day: 4, list: { baker: { npcId: 'baker', hearts: 2 } } }, errands: { day: 4, list: [] }, buffs: [], settings: { volume: 0.5 }, clock: { a: START_PHASE + 4 * TAU } }
  const s = migrate(v3)
  assert.equal(s.v, 4); assert.equal(s.inv.fish, 2); assert.equal(s.garden.plots[0].stage, 'young'); assert.equal(s.friends.list.baker.hearts, 2); assert.equal(s.settings.volume, 0.5)
  assert.deepEqual(s.fish, {}); assert.deepEqual(s.museum.donated, {}); assert.deepEqual(s.photos.list, []); assert.equal(s.train.rides, 0)
  assert.equal(s.tutorial.dismissed, true, 'a save past day 0 skips the first-day note')
  assert.deepEqual(s.journal, { forage: {}, relics: {} }); assert.deepEqual(s.dig.taken, {})
})
test('fresh v4 save shows the tutorial; broken Stage C parts fall back', () => {
  assert.equal(fresh().tutorial.dismissed, false)
  const s = migrate({ v: 4, day: 1, fish: 'x', museum: { donated: 3 }, photos: { list: {} }, train: {}, tutorial: { dismissed: true }, journal: { forage: [] } })
  assert.deepEqual(s.fish, {}); assert.deepEqual(s.museum.donated, {}); assert.deepEqual(s.photos.list, []); assert.equal(s.train.rides, 0)
  assert.deepEqual(s.tutorial.done, {}); assert.equal(s.tutorial.dismissed, true); assert.deepEqual(s.journal.forage, {}); assert.deepEqual(s.journal.relics, {}); assert.equal(s.tutorial.open, null)
  assert.equal(migrate({ ...fresh(), tutorial: { done: {}, dismissed: false, open: false } }).tutorial.open, false, 'folded note stays folded')
  const again = migrate(JSON.parse(JSON.stringify(s))); assert.deepEqual(again, s)
})
test('v1 save goes all the way to v4', () => { const s = migrate({ day: 2, inv: { wood: 3 } }); assert.equal(s.v, 4); assert.equal(s.inv.wood, 3); assert.ok(s.fish && s.garden) })
// ---- seasons + weather ----
test('seasons change every 7 days, day 0 = spring, wrap after winter', () => {
  assert.equal(SEASON_DAYS, 7)
  assert.deepEqual([0, 6, 7, 13, 14, 21, 28].map(seasonOf), ['spring', 'spring', 'summer', 'summer', 'autumn', 'winter', 'spring'])
})
test('season weights sum to 1 and cross-fade only over the last day', () => {
  for (const [d, u] of [[0, 0.5], [3, 0.9], [6, 0], [6, 0.5], [6, 0.99], [27, 0.5]]) { const w = seasonWeights(d, u); assert.ok(Math.abs(w.reduce((a, b) => a + b) - 1) < 1e-9) }
  assert.deepEqual(seasonWeights(3, 0.9), [1, 0, 0, 0]); const w = seasonWeights(6, 0.5); assert.ok(w[0] > 0.4 && w[1] > 0.4)
  assert.deepEqual(seasonWeights(27, 0.999).map(x => Math.round(x)), [1, 0, 0, 0]) // winter -> spring
})
test('rain: exactly one day per 7-day block, never day 0 or 1, deterministic', () => {
  assert.equal(isRainDay(0), false); assert.equal(isRainDay(1), false)
  for (let b = 0; b < 40; b++) { let n = 0; for (let d = b * 7; d < b * 7 + 7; d++) if (isRainDay(d)) n++; assert.equal(n, 1, 'block ' + b) }
  const a = Array.from({ length: 60 }, (_, d) => isRainDay(d)), b = Array.from({ length: 60 }, (_, d) => isRainDay(d)); assert.deepEqual(a, b)
})
test('rain ramps in and out; wet lags and dries; clear days are dry', () => {
  const d = Array.from({ length: 30 }, (_, i) => i).find(isRainDay), [s, e] = rainWindow(d)
  assert.ok(s >= 1 && e <= 14 && e - s >= 4)
  const at = (h) => ({ ...weatherAt(d, h / 24) })
  assert.equal(at(s - 0.5).rain, 0); assert.equal(at(s - 0.5).kind, 'clear')
  assert.ok(at(s + 0.5).rain > 0.4 && at(s + 0.5).rain < 0.6); assert.equal(at(s + 2).rain, 1); assert.equal(at(s + 2).kind, 'rain')
  assert.ok(at(s + 0.5).wet < at(s + 2).wet); assert.ok(at(e + 1).wet > 0 && at(e + 1).rain === 0); assert.equal(at(e + 3.5).wet, 0)
  const c = Array.from({ length: 30 }, (_, i) => i).find(x => !isRainDay(x) && x > 2); assert.deepEqual({ ...weatherAt(c, 0.3) }, { kind: 'clear', rain: 0, wet: 0 })
})
test('applyTo fills the __T hooks from the clock phase without allocating new arrays', () => {
  const T = {}; applyTo(T, START_PHASE); assert.equal(T.season, 'spring'); assert.equal(T.kind, 'clear'); assert.equal(T.rain, 0)
  const w = T.seasonW; applyTo(T, START_PHASE + 8 * TAU); assert.equal(T.season, 'summer'); assert.equal(T.seasonW, w)
  const p = dayPos(-Math.PI / 2 + 3 * TAU + TAU / 4); assert.equal(p.day, 3); assert.ok(Math.abs(p.u - 0.25) < 1e-9)
})
// ---- fish ----
test('fish table: Studio draft, 12 species, 3 habitats, sane sizes, rare items listed', () => {
  assert.equal(FISH_IDS.length, 12)
  for (const id of FISH_IDS) { const f = FISH[id]; assert.ok(f.spots.every(h => ['lake', 'river', 'harbour'].includes(h))); assert.ok(f.size[0] < f.size[1]); assert.ok(f.w > 0) }
  assert.deepEqual(RARE_ITEMS, ['koi', 'sea_bream', 'lake_lord']); assert.equal(habitatOf('harbour'), 'harbour'); assert.equal(habitatOf('lake'), 'lake')
})
test('balance: every habitat has a common fish at every season, time and weather', () => {
  for (const h of ['lake', 'river', 'harbour']) for (const season of ['spring', 'summer', 'autumn', 'winter']) for (const period of ['morning', 'day', 'evening', 'night']) for (const kind of ['clear', 'rain']) {
    const c = candidates(h, { season, period, kind }); assert.ok(c.some(([id]) => FISH[id].rarity === 'common'), `${h} ${season} ${period} ${kind}`) }
})
test('catch rolls respect habitat, season, time and weather', () => {
  const ctx = { season: 'winter', period: 'day', kind: 'clear' }
  const c = candidates('lake', ctx).map(x => x[0]); assert.ok(c.includes('minnow')); assert.ok(!c.includes('koi') && !c.includes('lake_lord') && !c.includes('catfish'))
  assert.ok(candidates('lake', { season: 'autumn', period: 'night', kind: 'rain' }).some(x => x[0] === 'lake_lord'))
  assert.ok(!candidates('lake', { season: 'autumn', period: 'night', kind: 'clear' }).some(x => x[0] === 'lake_lord'))
  assert.ok(!candidates('lake', { season: 'spring', period: 'day', kind: 'rain' }).some(x => x[0] === 'koi'), 'koi is a clear-day fish')
  for (let i = 0; i < 200; i++) { const r = rollFish('harbour', { season: 'spring', period: 'morning', kind: 'clear' }); assert.ok(FISH[r.fishId].spots.includes('harbour')); assert.ok(r.size >= FISH[r.fishId].size[0] && r.size <= FISH[r.fishId].size[1]) }
  assert.equal(rollFish('lake', ctx, seq([0, 0.5, 0.5])).fishId, 'minnow')
})
test('lucky raises rare odds; rain doubles rain fish', () => {
  const w = (ctx, id) => candidates('lake', ctx).find(x => x[0] === id)[1]
  assert.equal(w({ season: 'spring', period: 'day', kind: 'clear', lucky: true }, 'koi'), FISH.koi.w * 1.5)
  assert.equal(w({ season: 'winter', period: 'night', kind: 'rain' }, 'lake_lord'), FISH.lake_lord.w * 2)
})
test('catch log tracks count, best size and new/record flags', () => {
  const log = {}
  assert.deepEqual(recordCatch(log, 'koi', 40, 3), { isNew: true, isRecord: true })
  assert.deepEqual(recordCatch(log, 'koi', 38, 4), { isNew: false, isRecord: false })
  assert.deepEqual(recordCatch(log, 'koi', 52.5, 5), { isNew: false, isRecord: true }); assert.deepEqual(log.koi, { count: 3, best: 52.5, firstDay: 3 })
})
const run = (st, secs, hold) => { for (let t = 0; t < secs; t += 1 / 60) fishStep(st, 1 / 60, typeof hold === 'function' ? hold(st) : hold); return st }
test('reel: cast -> wait -> bite -> reel in order', () => {
  const st = newReel('minnow', 0); assert.equal(st.state, 'cast')
  run(st, 0.7, false); assert.equal(st.state, 'wait'); run(st, 1.6, false); assert.equal(st.state, 'bite'); fishStep(st, 1 / 60, true); assert.equal(st.state, 'reel')
})
test('reel: tracking the fish lands it; doing nothing slips away slowly, never instantly', () => {
  const a = newReel('mackerel', 7); run(a, 3, false); run(a, 20, (s) => s.bar < s.fx); assert.equal(a.state, 'caught')
  const b = newReel('mackerel', 7); run(b, 3, false); fishStep(b, 1 / 60, true); run(b, 3, false); assert.equal(b.state, 'reel', 'still on after 3 s of nothing')
  run(b, 12, false); assert.ok(['slipped', 'caught'].includes(b.state))
  const c = newReel('lake_lord', 3); run(c, 3, false); run(c, 40, (s) => s.bar < s.fx); assert.equal(c.state, 'caught', 'even the legend is catchable by following it')
})
// ---- train ----
const STOPS = [{ id: 'village', lon: 0.75 }, { id: 'forest', lon: 3.7 }]
test('train dwells at each stop, then moves monotonically to the next', () => {
  const sch = buildSchedule(STOPS); assert.equal(sch.legs.length, 2)
  const s0 = trainState(sch, 0); assert.equal(s0.stop, 'village'); assert.equal(s0.lon, 0.75); assert.equal(s0.speed, 0)
  const s1 = trainState(sch, DWELL - 0.1); assert.equal(s1.stop, 'village')
  let last = -1; for (let t = DWELL; t < sch.legs[1].t0; t += 0.5) { const s = trainState(sch, t); assert.equal(s.stop, null); assert.ok(s.lon >= last - 1e-9); last = s.lon }
  const s2 = trainState(sch, sch.legs[1].t0 + 1); assert.equal(s2.stop, 'forest'); assert.ok(Math.abs(s2.lon - 3.7) < 1e-9)
  const s3 = trainState(sch, sch.legs[1].t0 - 0.01); assert.ok(Math.abs(s3.lon - 3.7) < 1e-3, 'arrives exactly at the stop'); assert.ok(s3.speed < 0.05)
  assert.equal(trainState(sch, sch.period + 1).stop, 'village')
})
test('train speed is continuous and capped at cruise', () => {
  const sch = buildSchedule(STOPS); let prev = trainState(sch, 0).lon
  for (let t = 0.05; t < sch.period; t += 0.05) { const l = trainState(sch, t).lon; let d = l - prev; if (d < -3) d += Math.PI * 2; assert.ok(d >= -1e-9 && d <= 0.05 * 0.05 + 1e-6, 't=' + t); prev = l }
})
test('fares: first ride free, then 1 coin', () => {
  assert.deepEqual(fare(0, 0), { ok: true, cost: 0 }); assert.deepEqual(fare(1, 0), { ok: false, cost: 1 }); assert.deepEqual(fare(3, 2), { ok: true, cost: 1 })
})
// ---- journal + museum ----
test('journal notes relics and seasonal forage', () => {
  const j = { forage: {}, relics: {} }
  assert.equal(note(j, 'relic_bell', 2), true); assert.equal(note(j, 'relic_bell', 3), false); assert.equal(j.relics.relic_bell.count, 2)
  assert.equal(note(j, 'sakura', 0), true); assert.equal(note(j, 'wood', 0), false)
})
test('museum: donate once per item, takes it from the bag', () => {
  const m = { donated: {} }, inv = { koi: 1, shard: 2, wood: 4 }
  assert.ok(!canDonate(m, 'wood', inv)); assert.ok(donate(m, 'shard', inv, 5)); assert.equal(inv.shard, 1); assert.equal(m.donated.shard, 5)
  assert.ok(!donate(m, 'shard', inv, 6), 'once only'); assert.ok(donate(m, 'koi', inv, 6)); assert.equal(inv.koi, undefined)
  assert.ok(DONATABLE.includes('lake_lord')); assert.equal(RELICS.length, 8)
})
test('journal entries for every tab', () => {
  const s = fresh(); s.fish.koi = { count: 1, best: 40, firstDay: 1 }; s.museum.donated.koi = 2; s.journal.relics.shard = { count: 1, firstDay: 0 }
  const f = entries('fish', s); assert.equal(f.length, 12); const k = f.find(e => e.id === 'koi'); assert.ok(k.seen && k.donated && k.best === 40)
  assert.ok(entries('relics', s).find(e => e.id === 'shard').seen); assert.equal(entries('forage', s).length, 9)
  assert.deepEqual(progress(s), { fish: 1, fishOf: 12, donated: 1, donatedOf: 11 })
})
test('ruins dig spots: once per day each, deterministic finds, some new relics', () => {
  const d = { taken: {} }; const a = dig(d, 0, 3); assert.ok(a); assert.equal(dig(d, 0, 3), null); assert.equal(dig(d, 0, 4), digFind(4, 0))
  let relic = 0; for (let day = 0; day < 60; day++) for (let sp = 0; sp < 5; sp++) if (digFind(day, sp).startsWith('relic_')) relic++
  assert.ok(relic > 20 && relic < 110, 'relics ~18% of digs: ' + relic)
})
// ---- tutorial ----
test('tutorial: day-0 note, steps tick once, reopen from settings', () => {
  const t = freshTutorial(); assert.ok(visible(t, 0)); assert.ok(!visible(t, 1)); assert.ok(visible(t, 3, true))
  assert.ok(mark(t, 'move')); assert.ok(!mark(t, 'move')); assert.ok(!mark(t, 'nope'))
  for (const id of STEP_IDS) mark(t, id); assert.ok(allDone(t)); assert.ok(!visible(t, 0)); assert.equal(steps(t).filter(s => s.done).length, 7)
  const u = freshTutorial(); u.dismissed = true; assert.ok(!visible(u, 0))
})
// ---- photos ----
test('photo album keeps at most 12, drops the oldest, stays consistent', () => {
  const list = [], store = {}
  for (let i = 0; i < 14; i++) addPhoto(list, store, { id: 'p' + i, day: 0 }, 'data:' + i)
  assert.equal(list.length, MAX); assert.equal(list[0].id, 'p2'); assert.equal(Object.keys(store).length, MAX); assert.equal(store.p0, undefined)
  assert.ok(removePhoto(list, store, 'p5')); assert.equal(list.length, 11)
  delete store.p7; store.ghost = 'x'; reconcile(list, store); assert.equal(list.length, 10); assert.equal(store.ghost, undefined)
  assert.deepEqual(thumbSize(1280, 800), [320, 200]); assert.deepEqual(thumbSize(200, 100), [200, 100])
})
