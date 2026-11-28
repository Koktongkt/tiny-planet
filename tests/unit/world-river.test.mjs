// node --test tests/unit — the reworked planet's river: one open curve, downhill from the Peak spring to the sea
import test from 'node:test'; import assert from 'node:assert/strict'
import { height, dir, R, SEA_LAT, SEA_W, LAKE_W, HARB_W, streamDir, streamNear, streamSides, waterAt, JUMPS, BRIDGES, ZONES } from '../../src/world.js'
import { HOME_DIR } from '../../src/world/regions.js'
import { region } from '../../src/world/regions.js'
import { RIVER_PTS, riverDir, riverNear, riverHalf, RIVER_HALF } from '../../src/world/river.js'

const unit = (z) => dir(z.lat, z.lon)
const angle = (a, b) => Math.acos(Math.min(1, Math.max(-1, a.clone().normalize().dot(b.clone().normalize()))))
const latOf = (n) => Math.asin(n.clone().normalize().y)

test('river starts at the spring and ends in the sea', () => {
  const peak = region('peak')
  assert.ok(RIVER_PTS.length >= 6 && RIVER_PTS.every(p => Number.isFinite(p.lat) && Number.isFinite(p.lon)))
  assert.ok(angle(riverDir(0), unit(peak)) <= peak.r + 0.04, 'spring on the Peak')
  assert.ok(latOf(riverDir(1)) < SEA_LAT, 'ends in the sea')
})

test('river flows downhill', () => {
  // the lake and the harbour / sea have a flat water level: under it, compare the surface (max of ground and level)
  const lake = unit(region('lake')), harb = unit(region('harbour')), lr = region('lake').r, hr = region('harbour').r
  const surface = (p) => { const h = height(p)
    if (angle(p, lake) < lr * 1.3) return Math.max(h, LAKE_W)
    if (angle(p, harb) < hr * 1.3 || latOf(p) < SEA_LAT) return Math.max(h, Math.max(HARB_W, SEA_W))
    return h }
  // cumulative: the water never sits more than 0.03 above any point upstream of it (big drops are fine)
  let low = surface(riverDir(0))
  for (let i = 1; i < 400; i++) { const u = i / 399, h = surface(riverDir(u)); assert.ok(h - low <= 0.03, `${(h - low).toFixed(3)} above the water upstream at u=${u.toFixed(3)}`); low = Math.min(low, h) }
  // and it really falls: the spring is well above the cliff foot, which is above the sea
  assert.ok(height(riverDir(0)) > 2, 'spring high on the Peak')
})

test('river visits the chain', () => {
  const pts = []; for (let i = 0; i <= 2000; i++) pts.push(riverDir(i / 2000))
  const closest = (id) => { const c = unit(region(id)); return Math.min(...pts.map(p => angle(p, c))) }
  for (const id of ['cliff', 'terraces', 'lake', 'harbour']) assert.ok(closest(id) < region(id).r, `misses ${id} (${closest(id).toFixed(3)})`)
  assert.ok(closest('village') < 0.12, `misses the village (${closest('village').toFixed(3)})`)
  // in that order, downstream
  const at = (id) => { const c = unit(region(id)); let bi = 0; pts.forEach((p, i) => { if (angle(p, c) < angle(pts[bi], c)) bi = i }); return bi }
  const order = ['cliff', 'terraces', 'village', 'lake', 'harbour'].map(at)
  assert.deepEqual([...order].sort((a, b) => a - b), order, 'chain order')
})

test('near is exact on the curve', () => {
  for (let k = 0; k < 50; k++) { const u = (k + 0.5) / 50, r = riverNear(riverDir(u)); assert.ok(r.d < 0.01, `d ${r.d} at u=${u}`); assert.ok(Math.abs(r.u - u) < 0.01, `u ${r.u} vs ${u}`) }
})

test('near matches a brute-force search near the river', () => {
  const dense = []; for (let i = 0; i <= 6000; i++) dense.push(riverDir(i / 6000))
  let seed = 4242; const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647
  for (let k = 0; k < 300; k++) {
    const c = riverDir(rand()), off = (rand() - 0.5) * 0.5, e = new c.constructor(rand() - 0.5, rand() - 0.5, rand() - 0.5).cross(c).normalize()
    const p = c.clone().addScaledVector(e, off).normalize(), r = riverNear(p), want = Math.min(...dense.map(q => q.distanceTo(p))) * R
    if (want < 2.5) assert.ok(Math.abs(r.d - want) < 0.02, `d ${r.d.toFixed(3)} vs ${want.toFixed(3)}`)
    else assert.ok(r.d >= want - 0.02 && r.d < want + 1.2, `far d ${r.d.toFixed(3)} vs ${want.toFixed(3)}`)
  }
  // side: the two banks across the flow report opposite sides
  for (let k = 0; k < 20; k++) { const u = 0.05 + k * 0.045, c = riverDir(u), t = riverDir(u + 0.002).sub(c), left = c.clone().cross(t).normalize()
    assert.equal(riverNear(c.clone().addScaledVector(left, 0.03).normalize()).side, 1); assert.equal(riverNear(c.clone().addScaledVector(left, -0.03).normalize()).side, -1) }
})

test('width: a creek at the spring, wider at the mouth', () => {
  assert.ok(Math.abs(riverHalf(0) - 0.6 * RIVER_HALF) < 1e-9)
  assert.ok(Math.abs(riverHalf(0.5) - RIVER_HALF) < 1e-9)
  let mouth = 1; for (let i = 0; i <= 1000; i++) if (latOf(riverDir(i / 1000)) < SEA_LAT) { mouth = i / 1000; break }
  assert.ok(Math.abs(riverHalf(mouth) - 1.4 * RIVER_HALF) < 0.01)
})

test('water rules', () => {
  assert.equal(waterAt(unit(region('lake'))), true, 'lake centre')
  assert.equal(waterAt(dir(SEA_LAT - 0.2, 3.0)), true, 'open sea')
  const shallow = dir(SEA_LAT - 0.02, 3.0); assert.ok(SEA_W - height(shallow) > 0 && SEA_W - height(shallow) < 0.12, 'test point is wadeable')
  assert.equal(waterAt(shallow), false, 'shoreline shallows')
  assert.equal(waterAt(unit(region('village'))), false, 'village centre')
  assert.equal(waterAt(riverDir(0.3)), true, 'mid-river')
})

test('jumps and bridges on the open river', () => {
  // up to 4; the path's three bridges (world-path.test.mjs) and the lake / harbour exclusions leave room for 2 today
  assert.ok(JUMPS.length >= 2 && JUMPS.length <= 4, `${JUMPS.length} jumps`)
  const cliff = unit(region('cliff'))
  for (const j of JUMPS) {
    assert.ok(angle(j.c, cliff) > region('cliff').r + 0.05, 'not on the waterfall')
    for (const [id, k] of [['lake', 1.6], ['harbour', 1.6], ['forest', 0.8]]) assert.ok(angle(j.c, unit(ZONES[id])) >= ZONES[id].r * k, `jump near ${id}`)
    assert.ok(riverNear(j.c).d < 0.05)
  }
  assert.ok(BRIDGES.length >= 1)
  for (const b of BRIDGES) assert.ok(streamNear(b.c).d < 0.6, 'bridge on the river')
})

test('compat', () => {
  assert.ok(streamDir(0).distanceTo(riverDir(0)) < 1e-12)
  assert.ok(streamDir(Math.PI).distanceTo(riverDir(0.5)) < 1e-12)
  for (const p of [unit(region('village')), unit(region('lake')), dir(0, 3), dir(-1, 1), dir(1.4, 2)]) { const s = streamNear(p); assert.ok(s.t >= 0 && s.t <= Math.PI * 2, `t ${s.t}`); assert.ok(Number.isFinite(s.d) && Number.isFinite(s.half)) }
})

test('the village, her home and the railway stop have dry room', () => {
  const v = unit(region('village')), vr = region('village').r
  for (let i = 0; i <= 2000; i++) assert.ok(angle(riverDir(i / 2000), v) > vr, 'river centre outside the village square')
  const home = dir(HOME_DIR.lat, HOME_DIR.lon), h = streamNear(home)
  assert.ok(h.d >= 1.5 && h.d <= 4, `home ${h.d.toFixed(2)} from the river`); assert.ok(h.d - h.half > 2.6, 'yard dry')
  // the coast railway's village stop (lat -0.62, lon 1.25): its 1.3 x 0.34 platform sits 0.3 north of the rails
  const la = -0.62 + 0.3 / R; let gap = 9
  for (const dz of [-0.17, 0, 0.17]) for (let dx = -0.65; dx <= 0.651; dx += 0.13) { const q = streamNear(dir(la + dz / R, 1.25 + dx / (R * Math.cos(la)))); gap = Math.min(gap, q.d - q.half) }
  assert.ok(gap >= 1.0, `platform ${gap.toFixed(2)} from the water`)
})

test('river sides: only the water divides the land', () => {
  // walking latitude circles, the side may only change where the step actually meets the river
  for (const lat of [0, 0.3, 0.5, -0.4, 0.9, -0.6]) for (let k = 0; k < 126; k++) {
    const a = dir(lat, k * 0.05), b = dir(lat, (k + 1) * 0.05), s = streamSides(a, b)
    if (s.same) continue
    let wet = false; for (let i = 0; i <= 20; i++) { const q = streamNear(a.clone().lerp(b, i / 20).normalize()); if (q.d < q.half + 0.3) wet = true }
    assert.ok(wet, `phantom side change at lat ${lat}, lon ${(k * 0.05).toFixed(2)}`)
  }
  // far apart but on dry land the same side of nothing: the meadow and open plot A
  assert.equal(streamSides(dir(0.3, 4.6), dir(0.0, 3.6)).same, true)
  // across the river: opposite sides, labelled like streamNear reports them locally
  for (const u of [0.25, 0.32, 0.45, 0.72]) { const c = riverDir(u), t = riverDir(u + 0.002).sub(c), left = c.clone().cross(t).normalize()
    const a = c.clone().addScaledVector(left, 1.2 / R).normalize(), b = c.clone().addScaledVector(left, -1.2 / R).normalize(), s = streamSides(a, b)
    assert.equal(s.same, false, `crossing at u=${u}`); assert.equal(s.a, 1); assert.equal(s.b, -1)
    assert.equal(streamSides(a, a.clone().addScaledVector(t.normalize(), 1 / R).normalize()).same, true, 'along one bank') }
})
