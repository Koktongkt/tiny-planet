// node --test tests/unit — the reworked planet's sandy path: one closed loop linking the regions, bridged where it
// crosses the open river
import test from 'node:test'; import assert from 'node:assert/strict'
import { dir, R, height, pathDir, BRIDGES, waterAt, SEA_LAT, SEA_W, DIG_SITE_POS } from '../../src/world.js'
import { region, HOME_DIR, OPEN_PLOTS } from '../../src/world/regions.js'
import { riverNear, riverHalf } from '../../src/world/river.js'

const TAU = Math.PI * 2
const unit = (z) => dir(z.lat, z.lon)
const angle = (a, b) => a.clone().normalize().angleTo(b.clone().normalize())
const latOf = (n) => Math.asin(n.clone().normalize().y)
const N = 1000, SAMPLES = Array.from({ length: N }, (_, i) => pathDir(i / N * TAU).normalize())
const nearest = (z) => Math.min(...SAMPLES.map(p => angle(p, unit(z))))
const onSomeBridge = (p) => BRIDGES.some(b => angle(p, b.c) * R < b.L)

test('at least two bridges', () => {
  assert.ok(BRIDGES.length >= 2, `${BRIDGES.length} bridges`)
  for (const b of BRIDGES) {
    assert.ok(b.L >= 0.8 && b.L < 3, `span ${b.L}`)
    assert.ok(b.t >= 0 && b.t < TAU, 'path parameter')
    assert.ok(angle(pathDir(b.t), b.c) * R < b.L / 2 + 0.05, 'b.t is where the path meets the bridge')
    assert.ok(Math.abs(b.tan.dot(b.c)) < 1e-9 && Math.abs(b.side.dot(b.c)) < 1e-9 && Math.abs(b.side.dot(b.tan)) < 1e-9, 'tangent frame')
    const along = pathDir(b.t + 0.002).sub(pathDir(b.t - 0.002)).normalize(); assert.ok(Math.abs(along.dot(b.tan)) > 0.95, 'deck runs along the path')
  }
})

test('every bridge sits on the river', () => {
  for (const b of BRIDGES) { const q = riverNear(b.c); assert.ok(q.d < riverHalf(q.u), `bridge ${q.d.toFixed(2)} from the river centre`) }
})

test('path is dry except on bridges', () => {
  for (const p of SAMPLES) if (!onSomeBridge(p)) assert.equal(waterAt(p), false, `wet path at lat ${latOf(p).toFixed(3)} lon ${Math.atan2(p.x, p.z).toFixed(3)}`)
})

test('path never enters the sea', () => {
  // (the outlet valley's floor near the lake-to-harbour bridges is at sea level, but it is the river's valley, not the sea)
  for (const p of SAMPLES) { assert.ok(latOf(p) > SEA_LAT + 0.1, 'south of the shore'); if (latOf(p) < SEA_LAT + 0.3) assert.ok(height(p) > SEA_W - 0.05, 'below sea level by the coast') }
})

test('a smooth closed loop', () => {
  assert.ok(pathDir(0).distanceTo(pathDir(TAU)) < 1e-9 && pathDir(1).distanceTo(pathDir(1 + TAU)) < 1e-9 && pathDir(1).distanceTo(pathDir(1 - TAU)) < 1e-9, 'periodic')
  const step = SAMPLES.map((p, i) => angle(p, SAMPLES[(i + 1) % N]) * R), mean = step.reduce((a, b) => a + b) / N
  assert.ok(Math.max(...step) < mean * 1.15 && Math.min(...step) > mean * 0.85, 'even pace in t')
  for (let i = 0; i < N; i++) { const a = SAMPLES[i], b = SAMPLES[(i + 1) % N], c = SAMPLES[(i + 2) % N]
    assert.ok(b.clone().sub(a).normalize().angleTo(c.clone().sub(b).normalize()) < 0.12, `kink at ${i}`) }
})

test('path links the regions', () => {
  const r = (id) => region(id)
  assert.ok(nearest(r('village')) < r('village').r * 0.5, 'through the village square')
  const terr = nearest(r('terraces')); assert.ok(terr > r('terraces').r && terr < r('terraces').r + 0.08, 'the foot of the terraces')
  assert.ok(nearest(r('museum')) < r('museum').r + 0.06, 'by the museum')
  const lake = nearest(r('lake')); assert.ok(lake < r('lake').r + 0.2, 'along the lake shore')
  const forest = nearest(r('forest')); assert.ok(Math.abs(forest - r('forest').r) < 0.06, 'the forest edge')
  assert.ok(nearest(r('giant')) < r('giant').r + 0.1, 'by the giant')
  assert.ok(Math.abs(nearest(OPEN_PLOTS[0]) - OPEN_PLOTS[0].r) < 0.03, 'the open plot A edge (not through it)')
  assert.ok(nearest(r('meadow')) < r('meadow').r * 0.6 && nearest(r('mills')) < r('mills').r + 0.08, 'the meadow by the mills')
  const home = nearest(HOME_DIR) * R; assert.ok(home > 2.6 + 0.2 && home < 4, `home ${home.toFixed(2)} away (yard clear)`)
})

test('path stays walkable and off the cliff and the open water', () => {
  const cliff = r => angle(r, unit(region('cliff')))
  for (let i = 0; i < N; i++) { const p = SAMPLES[i], q = SAMPLES[(i + 1) % N]
    assert.ok(cliff(p) > region('cliff').r + 0.05, 'off the cliff mesa and the waterfall')
    for (const id of ['lake', 'harbour']) assert.ok(angle(p, unit(region(id))) > region(id).r, `out of the ${id}`)
    if (onSomeBridge(p)) continue
    const s = Math.abs(height(q) - height(p)) / (angle(p, q) * R); assert.ok(s < 1.1, `rise/run ${s.toFixed(2)} at ${i}`) }
})

test('BRIDGES[0] is the village crossing, and the bridge-footings dig site is beside it', () => {
  const v = unit(region('village'))
  assert.ok(angle(BRIDGES[0].c, v) < region('village').r + 0.05, 'first bridge by the village')
  for (const b of BRIDGES) assert.ok(angle(b.c, v) >= angle(BRIDGES[0].c, v), 'sorted by distance to the village')
  const f = DIG_SITE_POS(4)
  assert.ok(angle(f, v) < region('village').r + 0.08, 'footings at the village (its far bank: the near bank is the square)')
  assert.ok(angle(f, BRIDGES[0].c) * R < BRIDGES[0].L / 2 + 0.8, 'next to the first bridge')
  assert.equal(waterAt(f, -0.2), false, 'on dry ground')
  assert.ok(angle(DIG_SITE_POS(2), dir(0, 0)) >= 0, 'other sites resolve')
})
