// node --test tests/unit — the village, her home and the hand-placed spots on the reworked planet
import test from 'node:test'; import assert from 'node:assert/strict'
import { R, K, dir, around, zv, waterAt, seaDepth, onBridge, distToCurve, pathDir, DIG_SITE_POS, height } from '../../src/world.js'
import { region, TRAIN_LAT, TRAIN_STOP_LONS } from '../../src/world/regions.js'
import { riverNear } from '../../src/world/river.js'
import { YARD } from '../../src/home/yard.js'
import { HOUSES, VILLAGE, MILLS, SPOTS, SPAWN, LAMPS, TRAIN_STOPS, STAIR, onHouse, gardenBedNs } from '../../src/world/village.js'

const dry = (n) => !waterAt(n) && seaDepth(n) === 0
const ring = (c, d, k = 12) => Array.from({ length: k }, (_, i) => around(c, d, i / k * Math.PI * 2))
const cliff = zv(region('cliff')), cr = region('cliff').r
// game/World.jsx's toward(): a step of `a` rad from c toward t (negative: away)
const toward = (c, t, a) => { c = c.clone().normalize(); const d = t.clone().addScaledVector(c, -c.dot(t)).normalize(); return c.multiplyScalar(Math.cos(a)).addScaledVector(d, Math.sin(a)).normalize() }

test('houses on dry land and apart', () => {
  assert.equal(HOUSES.length, 11)
  HOUSES.forEach((h, i) => {
    for (const p of [h, ...ring(h, 0.35 / R)]) assert.ok(dry(p), `house ${i} in water`)
    assert.ok(distToCurve(h, pathDir, 600) * R > 0.45, `house ${i} on the path`)
    assert.ok(!onBridge(h) && !onBridge(around(h, 0.5 / R, 0)), `house ${i} on a bridge`)
    assert.ok(h.angleTo(cliff) > cr + 0.04, `house ${i} on the cliff mesa`)
  })
  for (let i = 0; i < HOUSES.length; i++) for (let j = i + 1; j < HOUSES.length; j++) assert.ok(HOUSES[i].angleTo(HOUSES[j]) >= 0.14 * K, `houses ${i} and ${j} too close`)
  for (const i of [1, 2, 3, 4]) assert.ok(HOUSES[i].angleTo(VILLAGE) < region('village').r * 2.2, `house ${i} not round the square`)
  for (const i of [5, 6]) assert.ok(HOUSES[i].angleTo(zv(region('terraces'))) < region('terraces').r + 0.08, `farmhouse ${i} not by the terraces`)
  for (const i of [7, 8]) assert.ok(HOUSES[i].angleTo(zv(region('harbour'))) < region('harbour').r * 1.12 + 0.06, `fisher's house ${i} not by the bay`)
  for (const i of [7, 8]) assert.ok(Math.abs(Math.asin(HOUSES[i].y) - TRAIN_LAT) > 0.05, `fisher's house ${i} on the coast railway`)
  for (const i of [9, 10]) assert.ok(HOUSES[i].angleTo(zv(region('forest'))) < region('forest').r + 0.05, `house ${i} not by the forest`)
  for (const m of MILLS) assert.ok(m.angleTo(zv(region('mills'))) < region('mills').r && dry(m), 'mill inside the mills')
})
test('home by the river', () => {
  const home = HOUSES[0], d = riverNear(home).d
  assert.ok(d >= 1.5 && d <= 4, `home ${d.toFixed(2)} from the river`)
  for (let r = 0; r <= 2.6; r += 0.65) for (const p of r ? ring(home, r / R, 16) : [home]) assert.ok(dry(p), `wet ${r} from home`)
  for (const b of gardenBedNs(home, height)) assert.ok(dry(b), 'garden bed in water')
  for (let i = 1; i < HOUSES.length; i++) assert.ok(HOUSES[i].angleTo(home) * R > 2.6, `house ${i} inside her yard`)
})
test('arrivals are dry', () => {
  const pts = { spawn: SPAWN }
  // ?at= targets (game/World.jsx teleport, App.jsx): home by her bench, the village square, the forest showcase
  pts.home = toward(onHouse(0, YARD.bench[0], YARD.bench[1]), HOUSES[0], -0.06)
  pts.village = around(VILLAGE, 0.62 / R, 2.75)
  const forest = zv(region('forest')), fc = toward(forest, SPAWN, region('forest').r * 1.2)
  pts.forest = toward(fc, forest, -0.05).applyAxisAngle(fc, 0.35).normalize()
  // train stop platforms (systems/liveC.js platformN) on the registry's coast railway, which the train moves to in Task 8
  for (const s of TRAIN_STOPS) { assert.equal(s.lon, TRAIN_STOP_LONS[s.id]); pts['platform ' + s.id] = dir(TRAIN_LAT + 0.3 / R, s.lon) }
  pts.museum = zv(region('museum')) // the museum door point (the museum moves onto its region in Task 8)
  for (const [k, n] of Object.entries(pts)) assert.ok(dry(n), `${k} arrives in water`)
  assert.ok(SPAWN.angleTo(HOUSES[0]) * R < 2, 'spawn by her home')
})
test('spots, lamps and the Peak stair', () => {
  for (const k of ['cat', 'laundryA', 'laundryB', 'view1', 'view2', 'bus']) assert.ok(dry(SPOTS[k]) && !onBridge(SPOTS[k]), `${k} in water`)
  for (const k of ['cat', 'laundryA', 'laundryB', 'view1', 'view2']) assert.ok(SPOTS[k].angleTo(DIG_SITE_POS(4)) * R >= 0.6, `${k} on the footings dig site`)
  LAMPS.forEach((l, i) => assert.ok(l.angleTo(DIG_SITE_POS(4)) * R >= 0.6, `lamp ${i} on the footings dig site`))
  assert.ok(SPOTS.bus.angleTo(VILLAGE) * R < 1.5, 'bus stop by the square')
  assert.ok(SPOTS.shrine.angleTo(zv(region('peak'))) < 1e-6, 'shrine on the Peak top')
  for (const l of LAMPS) assert.ok(dry(l) && !onBridge(l) && HOUSES.slice(1).every(h => h.angleTo(l) * R > 0.5), 'lamp placement')
  assert.ok(STAIR && STAIR.steps.length >= 10, 'stair steps')
  const peak = zv(region('peak'))
  assert.ok(STAIR.foot.angleTo(peak) > region('peak').r * 1.4, 'stair starts at the Peak foot')
  assert.ok(STAIR.end.angleTo(peak) * R < 0.6, 'stair reaches the shrine')
  for (const s of STAIR.steps) { assert.ok(dry(s.n), 'stair step in water'); assert.ok(s.n.angleTo(cliff) > cr + 0.08, 'stair over the cliff') }
  for (let i = 1; i < STAIR.steps.length; i++) assert.ok(height(STAIR.steps[i].n) - height(STAIR.steps[i - 1].n) < 0.22, `step ${i} too tall`)
  // on the village side: a straight walk from her gate to the stair foot stays dry (no river to cross) and clear of the mesa
  const a = SPAWN, b = STAIR.foot, L = a.angleTo(b) * R
  for (let i = 0; i <= L / 0.1; i++) { const p = a.clone().lerp(b, i * 0.1 / L).normalize(); assert.ok(dry(p) && p.angleTo(cliff) > cr + 0.04, 'walk to the stair foot') }
})
