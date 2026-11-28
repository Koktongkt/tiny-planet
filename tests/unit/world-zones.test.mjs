// node --test tests/unit — the zone props on the reworked planet (world/zoneLayout.js, drawn by zones.jsx): the drowned
// ruins in the Lake, the Harbour round its bay, the Lake dock, the waterfall on the river, and scatter kept out of water.
import test from 'node:test'; import assert from 'node:assert/strict'
import * as THREE from 'three'
import { R, around, zv, dir, height, waterAt, seaDepth, underWater, streamNear, distToCurve, pathDir, ZONES, LAKE_W, SEA_LAT, randDir } from '../../src/world.js'
import { region } from '../../src/world/regions.js'
import { riverNear } from '../../src/world/river.js'
import { railOff, railLat } from '../../src/world/railway.js'
import { RUIN_COLS, RUIN_ARCH, RUIN_SLABS, HARBOUR_HOUSES, LIGHTHOUSE, PIERS, BOATS, CRATES, LAKE_DOCK_B, WATERFALL, HARBOUR_FOLK, TERRACE_FOLK, spinToward } from '../../src/world/zoneLayout.js'
globalThis.window ??= {}
const { HOUSES, TRAIN_STOPS } = await import('../../src/world/village.js')

const dry = (n) => !waterAt(n, 0) && seaDepth(n) === 0
const ring = (c, d, k = 12) => Array.from({ length: k }, (_, i) => around(c, d, i / k * Math.PI * 2))
const lake = zv(region('lake')), lr = region('lake').r, ruins = zv(region('ruins')), harb = zv(region('harbour')), hr = region('harbour').r
const lonOf = (n) => Math.atan2(n.x, n.z), latOf = (n) => Math.asin(n.y)
const inLake = (n) => n.angleTo(lake) < lr && height(n) < LAKE_W - 0.05

test('the ruins stand in the lake\'s west half, half-drowned', () => {
  for (const c of [...RUIN_COLS, RUIN_ARCH]) {
    assert.ok(inLake(c.n) && lonOf(c.n) < lonOf(lake), 'in the lake, west of its centre')
    assert.ok(c.n.angleTo(ruins) < region('ruins').r, 'inside the ruins region')
    assert.ok(c.base < LAKE_W - 0.15 && Math.abs(c.base - height(c.n)) < 1e-9, 'rises from the lakebed')
  }
  for (const c of RUIN_COLS) assert.ok(c.base + c.h - LAKE_W >= 0.15, 'column top above the water')
  assert.ok(RUIN_ARCH.depth > 0.15, 'arch legs reach the lakebed')
  assert.ok(RUIN_SLABS.length >= 10); for (const s of RUIN_SLABS) assert.ok(inLake(s.n) && s.top > LAKE_W && s.top < LAKE_W + 0.05, 'slabs awash')
})
test('the lake dock: from the dry east shore into the water, clear of the ruins', () => {
  const root = around(lake, lr * 1.06, LAKE_DOCK_B), f = lake.clone().addScaledVector(root, -root.dot(lake)).normalize(), tip = root.clone().addScaledVector(f, 1.3 / R).normalize()
  assert.ok(dry(root) && waterAt(tip, 0), 'root dry, tip in the lake')
  assert.ok(lonOf(root) > lonOf(lake), 'east shore')
  for (const c of RUIN_COLS) assert.ok(c.n.angleTo(tip) * R > 1.0, 'dock clear of the ruins')
  assert.ok(distToCurve(root, pathDir, 600) * R > 0.3, 'dock root off the path')
})
test('the harbour faces its bay and the sea; nothing stands in the open sea', () => {
  const others = [...HOUSES.map(n => ({ n })), ...HARBOUR_HOUSES]
  for (const h of HARBOUR_HOUSES) {
    for (const p of [h.n, ...ring(h.n, 0.35 / R)]) assert.ok(dry(p), 'harbour house in water')
    assert.ok(Math.abs(railOff(h.n)) * R > 0.6, 'harbour house on the railway'); assert.ok(distToCurve(h.n, pathDir, 600) * R > 0.5, 'harbour house on the path')
    assert.ok(h.n.angleTo(harb) < hr * 1.6, 'harbour house by the bay')
    for (const o of others) if (o !== h) assert.ok(o.n.angleTo(h.n) * R > 0.65, 'houses apart')
    // the door (+z of the Surface frame at spin) looks toward the bay's water
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), h.n).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), h.spin))
    const door = new THREE.Vector3(0, 0, 1).applyQuaternion(q), toBay = harb.clone().addScaledVector(h.n, -h.n.dot(harb)).normalize()
    assert.ok(door.dot(toBay) > 0.99, 'house faces the bay')
    assert.ok(Math.abs(spinToward(h.n, harb) - h.spin) < 1e-12)
  }
  for (const p of [LIGHTHOUSE, ...ring(LIGHTHOUSE, 0.2 / R)]) assert.ok(dry(p), 'lighthouse in water')
  assert.ok(latOf(LIGHTHOUSE) < SEA_LAT + 0.02 && LIGHTHOUSE.angleTo(harb) < hr * 1.3, 'lighthouse at the bay mouth')
  for (const p of PIERS) { assert.ok(dry(p.root) && waterAt(p.tip, 0), 'pier from the shore into the water'); assert.ok(p.tip.angleTo(harb) < hr, 'pier in the bay') }
  for (const b of BOATS) assert.ok(waterAt(b.n, 0) && b.n.angleTo(harb) < hr && Math.abs(railOff(b.n)) * R > 1, 'boat in the bay')
  for (const c of CRATES) { assert.ok(dry(c) && Math.abs(railOff(c)) * R > 0.6, 'crate on the quay'); for (const o of others) assert.ok(o.n.angleTo(c) * R > 0.4, 'crate by a house wall') }
  for (const n of [...HARBOUR_HOUSES.map(h => h.n), LIGHTHOUSE, ...PIERS.flatMap(p => [p.root, p.tip]), ...BOATS.map(b => b.n), ...CRATES]) assert.ok(seaDepth(n) <= 0.12 || n.angleTo(harb) < hr, 'in the open sea')
  for (const i of [7, 8]) assert.ok(Math.abs(railOff(HOUSES[i])) * R > 0.6, `fisher's house ${i} on the railway`)
})
test('harbour folk (npc/routines.js) stand and pace on the dry quays, off the railway and its platforms', () => {
  const F = HARBOUR_FOLK, plats = TRAIN_STOPS.map(s => dir(railLat(s.lon) + 0.3 / R, s.lon)), houses = [...HOUSES, ...HARBOUR_HOUSES.map(h => h.n)]
  const spots = [F.pierEnd, F.pierSeat]; for (const k of ['quay', 'west', 'east']) for (const s of [-1, 0, 1]) spots.push(F[k].n.clone().addScaledVector(F[k].tan, s * F[k].range / R).normalize())
  for (const n of spots) {
    assert.ok(dry(n), 'harbour folk in water'); assert.ok(Math.abs(railOff(n)) * R > 0.6, 'on the railway')
    for (const p of plats) assert.ok(p.angleTo(n) * R > 1.5, 'on a station platform'); for (const h of houses) assert.ok(h.angleTo(n) * R > 0.4, 'inside a house')
  }
  assert.ok(waterAt(F.sea, 0) && F.sea.angleTo(harb) < hr, 'the angler looks out over the bay')
})
test('terraces folk pace on dry ground, clear of the river', () => {
  for (const [k, f] of Object.entries(TERRACE_FOLK)) for (let s = -1; s <= 1.0001; s += 0.125) {
    const n = f.n.clone().addScaledVector(f.tan, s * f.range / R).normalize()
    for (const p of [n, ...Array.from({ length: 8 }, (_, i) => around(n, 0.1 / R, i * Math.PI / 4))]) assert.ok(!waterAt(p) && seaDepth(p) === 0, `${k} paces into water (s ${s.toFixed(2)})`)
  }
})
test('the waterfall falls where the river drops off the cliff', () => {
  const W = WATERFALL, cliff = zv(region('cliff')), cr = region('cliff').r
  assert.ok(riverNear(W.lip).d < 0.02 && riverNear(W.foot).d < 0.02, 'on the river')
  assert.ok(W.lip.angleTo(cliff) > cr && W.lip.angleTo(cliff) < cr + 0.03, 'lip just past the mesa rim')
  assert.ok(W.topR - R - height(W.foot) > 0.9, 'a tall drop'); assert.ok(W.uFoot > W.uLip)
  const flow = riverNear(W.foot).u > riverNear(W.lip).u; assert.ok(flow, 'falls downstream')
  assert.ok(W.width > 0.5 && W.width < 2 * riverNear(W.lip).half, 'as wide as the river there')
})
test('scatter keeps out of water: underWater covers waterAt and the sea', () => {
  let wet = 0
  for (let i = 0; i < 20000; i++) { const n = randDir(); if (waterAt(n, 0) || seaDepth(n) > 0) { wet++; assert.ok(underWater(n), 'waterAt / seaDepth point not underWater') } }
  assert.ok(wet > 1000, 'the sample reaches the sea')
  assert.ok(!underWater(zv(region('village'))) && !underWater(HOUSES[0]), 'dry land is not under water')
  const s = streamNear(dir(-0.15, 0.6)); assert.ok(s.d > 0) // (warm the river grid)
})
