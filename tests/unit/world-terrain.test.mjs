// node --test tests/unit — the reworked planet's terrain: one slope, Keepers' Peak at the north pole, sea at the south cap.
import test from 'node:test'; import assert from 'node:assert/strict'
import { height, dir, R, SEA_LAT, SEA_W, LAKE_W, streamNear } from '../../src/world.js'
import { region, OPEN_PLOTS, HOME_DIR } from '../../src/world/regions.js'

let seed = 12345
const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647
const randDir = () => { const u = rand() * 2 - 1, t = rand() * Math.PI * 2, r = Math.sqrt(1 - u * u); return { x: r * Math.cos(t), y: u, z: r * Math.sin(t) } }
const unit = (z) => dir(z.lat, z.lon)
const angle = (a, b) => Math.acos(Math.min(1, Math.max(-1, a.dot(b))))
const slerp = (a, b, t) => { const om = angle(a, b); return a.clone().multiplyScalar(Math.sin((1 - t) * om) / Math.sin(om)).addScaledVector(b, Math.sin(t * om) / Math.sin(om)).normalize() }
// points within angular radius r of c (rings of 16)
const disc = (c, r) => { const e1 = dir(0, 0).cross(c).normalize(), e2 = c.clone().cross(e1), out = [c]
  for (let i = 1; i <= 6; i++) for (let k = 0; k < 16; k++) { const d = r * i / 6, b = k / 16 * Math.PI * 2; out.push(c.clone().multiplyScalar(Math.cos(d)).addScaledVector(e1, Math.sin(d) * Math.cos(b)).addScaledVector(e2, Math.sin(d) * Math.sin(b)).normalize()) }
  return out }
const range = (pts) => { const hs = pts.map(height); return Math.max(...hs) - Math.min(...hs) }
// steepest rise over run walking a path of directions, sampled every 0.1 world units; skip(p) exempts a sample
function steepest(path, skip = () => false) { let m = 0, at = null
  for (let i = 0; i + 1 < path.length; i++) { const p = path[i], q = path[i + 1]; if (skip(p) || skip(q)) continue
    const s = Math.abs(height(q) - height(p)) / (angle(p, q) * R); if (s > m) { m = s; at = p } }
  return { m, at } }
const walk = (a, b) => { const L = angle(a, b) * R, k = Math.ceil(L / 0.1), out = []; for (let i = 0; i <= k; i++) out.push(slerp(a, b, i / k)); return out }

test('peak is the highest point', () => {
  const top = height(unit(region('peak')))
  for (let i = 0; i < 4000; i++) { const n = randDir(), c = unit(region('peak')); const near = n.x * c.x + n.y * c.y + n.z * c.z > Math.cos(0.06); assert.ok(near ? height(n) <= top : height(n) < top - 0.05, `not clearly below the Peak at ${JSON.stringify(n)}`) }
  const cliff = height(unit(region('cliff'))); assert.ok(top - cliff >= 0.8, `Peak only ${(top - cliff).toFixed(2)} above the cliff top`)
})
test('sea floor below the surface', () => {
  for (let i = 0; i < 4000; i++) { const n = randDir(); if (Math.asin(n.y) < SEA_LAT - 0.08) assert.ok(height(n) < SEA_W - 0.12, `shallow at ${JSON.stringify(n)}`) }
  for (let lon = 0; lon < Math.PI * 2; lon += 0.05) assert.ok(height(dir(SEA_LAT - 0.081, lon)) < SEA_W - 0.12, `shallow at lon ${lon}`)
})
test('shallows exist', () => {
  let ok = 0, all = 0
  for (let lon = 0; lon < Math.PI * 2; lon += Math.PI / 180) { all++
    let shallow = true; for (let lat = SEA_LAT; lat >= SEA_LAT - 0.04; lat -= 0.004) if (SEA_W - height(dir(lat, lon)) >= 0.12) shallow = false
    if (shallow) ok++ }
  assert.ok(ok / all >= 0.6, `shallow along ${(ok / all * 100).toFixed(0)}% of longitudes`)
})
test('peak slope walkable', () => {
  const peak = unit(region('peak')), village = unit(region('village')), cliff = unit(region('cliff')), pr = region('peak').r, cr = region('cliff').r
  // stair corridor: the Peak's first 0.04 rad toward the village (a stair goes here in Task 7)
  const stair = (p) => { const a = angle(p, peak); return a >= pr && a <= pr + 0.04 }
  // the direct great circle crosses the Waterfall Cliff mesa (a deliberate wall: the waterfall drops off it); the mesa and
  // its rim are exempt here, and a walk that passes beside the cliff must be climbable everywhere instead
  const mesa = (p) => angle(p, cliff) <= cr + 0.04
  const direct = steepest(walk(village, peak), (p) => stair(p) || mesa(p))
  assert.ok(direct.m <= 1.1, `direct climb rise/run ${direct.m.toFixed(2)}`)
  const beside = slerp(village, peak, 0.62); const side = beside.clone().cross(peak).normalize() // west of the cliff
  const via = beside.clone().addScaledVector(side, -Math.tan(cr + 0.12)).normalize()
  assert.ok(angle(via, cliff) > cr + 0.06, 'detour clears the cliff')
  const around = steepest([...walk(village, via), ...walk(via, peak)], stair)
  assert.ok(around.m <= 1.1, `climb beside the cliff rise/run ${around.m.toFixed(2)}`)
})
test('open plots flat', () => {
  for (const p of OPEN_PLOTS) assert.ok(range(disc(dir(p.lat, p.lon), p.r)) < 0.15, `plot ${p.lat},${p.lon}`)
})
test('village square and home yard are gentle', () => {
  assert.ok(range(disc(unit(region('village')), region('village').r)) < 0.15, 'village square')
  assert.ok(range(disc(dir(HOME_DIR.lat, HOME_DIR.lon), 2.6 / R)) < 0.15, 'home yard')
})
test('water runs downhill along the chain', () => {
  const h = (id) => height(unit(region(id)))
  assert.ok(h('peak') > h('cliff') && h('cliff') > h('village') && h('village') > LAKE_W && LAKE_W > SEA_W - 0.01)
  assert.ok(height(unit(region('harbour'))) < SEA_W - 0.12, 'harbour bay is open water')
})
test('lake: shore above the water, basin and drowned ruins below it', () => {
  const lake = unit(region('lake')), lr = region('lake').r
  assert.ok(height(lake) < LAKE_W - 0.2, 'lake deep in the middle')
  assert.ok(height(unit(region('ruins'))) < LAKE_W, 'ruins centre under water')
  const e1 = dir(0, 0).cross(lake).normalize(), e2 = lake.clone().cross(e1)
  for (let k = 0; k < 48; k++) { const b = k / 48 * Math.PI * 2, d = lr * 1.3
    const p = lake.clone().multiplyScalar(Math.cos(d)).addScaledVector(e1, Math.sin(d) * Math.cos(b)).addScaledVector(e2, Math.sin(d) * Math.sin(b)).normalize()
    if (streamNear(p).d < streamNear(p).half + 0.8) continue // the river's outlet valley (Task 4) leaves the lake here
    assert.ok(height(p) > LAKE_W + 0.02, `shore dips into the lake at bearing ${k}`) }
})
