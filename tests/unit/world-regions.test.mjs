// node --test tests/unit — region registry invariants (layout of the reworked planet).
import test from 'node:test'; import assert from 'node:assert/strict'
import { REGIONS, region, OPEN_PLOTS, SEA_LAT, DIG_SITES } from '../../src/world/regions.js'

const dirOf = (lat, lon) => [Math.cos(lat) * Math.sin(lon), Math.sin(lat), Math.cos(lat) * Math.cos(lon)]
const dist = (a, b) => { const p = dirOf(a.lat, a.lon), q = dirOf(b.lat, b.lon); return Math.acos(Math.min(1, Math.max(-1, p[0] * q[0] + p[1] * q[1] + p[2] * q[2]))) }
const by = Object.fromEntries(REGIONS.map(r => [r.id, r]))
const EXEMPT = new Set(['giant|forest', 'mills|meadow', 'lake|ruins'])

test('regions do not overlap', () => {
  for (let i = 0; i < REGIONS.length; i++) for (let j = i + 1; j < REGIONS.length; j++) {
    const a = REGIONS[i], b = REGIONS[j]
    if (EXEMPT.has(a.id + '|' + b.id) || EXEMPT.has(b.id + '|' + a.id)) continue
    assert.ok(dist(a, b) >= a.r + b.r, `${a.id} overlaps ${b.id}`)
  }
})
test('open plots are clear', () => {
  for (const p of OPEN_PLOTS) for (const r of REGIONS) assert.ok(dist(p, r) >= p.r + r.r + 0.03, `plot ${p.lat},${p.lon} too close to ${r.id}`)
})
test('water chain runs downhill in latitude', () => {
  const ch = ['peak', 'cliff', 'terraces', 'village', 'lake', 'harbour']
  for (let i = 1; i < ch.length; i++) assert.ok(by[ch[i - 1]].lat > by[ch[i]].lat, `${ch[i - 1]} above ${ch[i]}`)
})
test('land above the sea', () => {
  for (const r of REGIONS) if (r.id !== 'harbour') assert.ok(r.lat - r.r > SEA_LAT, r.id)
})
test('museum sits on the lake shore', () => {
  const d = dist(by.museum, by.lake)
  assert.ok(d >= by.lake.r && d <= by.lake.r + 0.1, String(d))
})
test('six dig sites, each inside its region (the drowned ruins and the lighthouse headland: at its edge)', () => {
  assert.equal(DIG_SITES.length, 6)
  DIG_SITES.forEach((s, i) => { assert.equal(s.i, i); assert.ok(dist(s, by[s.region]) < by[s.region].r + (i === 2 || i === 3 ? 0.05 : 0), `site ${i}`) })
})
test('region() returns the Z shape', () => {
  const z = region('lake')
  assert.deepEqual(Object.keys(z).sort(), ['lat', 'lon', 'r', 'x', 'y', 'z'])
  assert.ok(Math.abs(Math.hypot(z.x, z.y, z.z) - 1) < 1e-9)
})
