// node --test tests/unit — the reworked planet's river: one open curve, downhill from the Peak spring to the sea
import test from 'node:test'; import assert from 'node:assert/strict'
import { height, dir, R, SEA_LAT, SEA_W, LAKE_W, HARB_W, streamDir, streamNear, waterAt, JUMPS, BRIDGES, ZONES } from '../../src/world.js'
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
  let prev = surface(riverDir(0))
  for (let i = 1; i < 400; i++) { const u = i / 399, h = surface(riverDir(u)); assert.ok(h - prev <= 0.03, `rises ${(h - prev).toFixed(3)} at u=${u.toFixed(3)}`); prev = h }
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
  assert.equal(JUMPS.length, 4)
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
