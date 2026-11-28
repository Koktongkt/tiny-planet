// node --test tests/unit — the ground mesh: welded and smooth on grass, faceted on rock, warm palette, same drawn shape
import test from 'node:test'; import assert from 'node:assert/strict'
import { budget } from './timing.mjs'
import * as THREE from 'three'
import { R } from '../../src/world.js'
import { visualGround } from '../../src/world/shore.js'
import { buildGround, grassColour } from '../../src/world/groundGeo.js'

const paint = (v, c, h) => grassColour(v, c, h)
const noRock = () => false
const G = buildGround({ fine: false, paint, isRock: noRock })
const P = G.attributes.position, N = G.attributes.normal, I = G.index
const v = (i) => new THREE.Vector3().fromBufferAttribute(P, i)

test('welded', () => {
  assert.ok(I, 'indexed'); const seen = new Set()
  for (let i = 0; i < P.count; i++) { const k = [P.getX(i), P.getY(i), P.getZ(i)].map(x => Math.round(x * 1e5)).join(); assert.ok(!seen.has(k), 'duplicate vertex'); seen.add(k) }
})

test('smooth on grass', () => {
  const acc = Array.from({ length: P.count }, () => new THREE.Vector3()), a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3()
  for (let t = 0; t < I.count; t += 3) { const [i, j, k] = [I.getX(t), I.getX(t + 1), I.getX(t + 2)]; a.fromBufferAttribute(P, i); b.fromBufferAttribute(P, j); c.fromBufferAttribute(P, k)
    const f = b.clone().sub(a).cross(c.clone().sub(a)); acc[i].add(f); acc[j].add(f); acc[k].add(f) }
  for (let s = 0; s < 500; s++) { const i = (s * 7919) % P.count, n = new THREE.Vector3().fromBufferAttribute(N, i); assert.ok(n.angleTo(acc[i].normalize()) < 0.05, `vertex ${i} not smooth`) }
})

test('rock stays faceted', () => {
  const g = buildGround({ fine: false, paint, isRock: () => true }), p = g.attributes.position, n = g.attributes.normal, ix = g.index
  for (let t = 0; t < Math.min(ix.count, 3000); t += 3) {
    const [i, j, k] = [ix.getX(t), ix.getX(t + 1), ix.getX(t + 2)], a = new THREE.Vector3().fromBufferAttribute(p, i), b = new THREE.Vector3().fromBufferAttribute(p, j), c = new THREE.Vector3().fromBufferAttribute(p, k)
    const f = b.sub(a).cross(c.sub(a)).normalize(); for (const q of [i, j, k]) assert.ok(new THREE.Vector3().fromBufferAttribute(n, q).angleTo(f) < 1e-3, 'rock vertex normal is not its face normal')
  }
})

test('palette: sunny tops, cool hollows', () => {
  const sunny = new THREE.Color('#b8dc62'), shade = new THREE.Color('#5aa26a'), d = (x, y) => Math.hypot(x.r - y.r, x.g - y.g, x.b - y.b)
  let hi = null, lo = null
  for (let i = 0; i < P.count; i += 3) { const n = v(i).normalize(), h = visualGround(n); if (h < -0.15) continue; if (!hi || h > hi.h) hi = { n, h }; if (!lo || h < lo.h) lo = { n, h } }
  const ch = grassColour(hi.n, new THREE.Color()), cl = grassColour(lo.n, new THREE.Color())
  assert.ok(d(ch, sunny) < d(ch, shade), 'top not sunny'); assert.ok(d(cl, shade) < d(cl, sunny), 'hollow not cool')
})

test('same drawn shape plus the bank (fine off)', () => {
  for (let s = 0; s < 500; s++) { const i = (s * 104729) % P.count, p = v(i), n = p.clone().normalize(), w = shoreDist(n); assert.ok(Math.abs(p.length() - (R + visualGround(n) + bankOffset(w, w < 0.7 && inCove(n)))) < 1e-4) }
})

// ---- Task 3: the finer band along every shore, and the carved banks ----
import { SHORE_RUNS, shoreDist, inCove, WATER_DROP } from '../../src/world/shore.js'
import { bankOffset, bankIsSoil } from '../../src/world/groundGeo.js'
const F = buildGround({ fine: true, paint, isRock: noRock })
const FP = F.attributes.position, FI = F.index.array
const fv = (i) => new THREE.Vector3().fromBufferAttribute(FP, i)

test('no cracks: every edge shared by exactly two triangles', () => {
  const use = new Map()
  for (let t = 0; t < FI.length; t += 3) for (let k = 0; k < 3; k++) { const a = FI[t + k], b = FI[t + (k + 1) % 3], key = a < b ? a * 4194304 + b : b * 4194304 + a; use.set(key, (use.get(key) || 0) + 1) }
  let bad = 0; for (const c of use.values()) if (c !== 2) bad++
  assert.equal(bad, 0, `${bad} edges not shared by two triangles`)
})

test('fine near water', () => {
  const sd = new Float32Array(FP.count); for (let i = 0; i < FP.count; i++) sd[i] = shoreDist(fv(i).normalize())
  let bad = 0
  for (let t = 0; t < FI.length; t += 3) {
    const [a, b, c] = [FI[t], FI[t + 1], FI[t + 2]]; if (Math.min(Math.abs(sd[a]), Math.abs(sd[b]), Math.abs(sd[c])) >= 0.3) continue
    for (const [x, y] of [[a, b], [b, c], [c, a]]) if (fv(x).normalize().angleTo(fv(y).normalize()) * R > 0.06) { bad++; break }
  }
  assert.equal(bad, 0, `${bad} coarse triangles near water`)
})

test('coarse away: the band adds at most 250k triangles', () => {
  assert.ok(FI.length / 3 - I.count / 3 <= 250000, `${FI.length / 3 - I.count / 3} extra triangles`)
})

test('rim on the waterline', () => {
  let bad = 0, cnt = 0
  for (const r of SHORE_RUNS) for (let k = 0; k < r.pts.length; k += 11) { const p = r.pts[k]; cnt++
    // walk along out from 0.08 into the water to 0.08 onto land; the drawn surface must cross the water level in that span
    let crossed = false, prev = null
    for (let s = -0.08; s <= 0.0801; s += 0.01) { const n = p.n.clone().addScaledVector(p.out, s / R).normalize(), y = visualGround(n) + bankOffset(shoreDist(n), inCove(n)) - p.level
      if (prev !== null && Math.sign(prev) !== Math.sign(y)) crossed = true; prev = y }
    if (!crossed) bad++ }
  assert.ok(bad <= cnt * 0.02, `${bad} of ${cnt} shore points with no rim crossing within 0.08`)
})

test('a soil band shows above the drawn water, none in coves', () => {
  assert.ok(WATER_DROP >= 0.04, 'water drawn lower so the bank stands proud')
  const lip = Math.max(...Array.from({ length: 21 }, (_, i) => bankOffset(i * 0.01, false)))
  assert.ok(lip >= 0.02 && lip <= 0.04, `lip ${lip}`)
  assert.ok(bankOffset(-0.04, false) <= -(WATER_DROP + 0.03), 'the wall goes below the drawn water')
  assert.ok(bankIsSoil(0.0, false) && bankIsSoil(0.02, false) && !bankIsSoil(0.15, false)); assert.ok(!bankIsSoil(0.0, true), 'no soil in coves')
  assert.ok(bankOffset(-0.04, true) > -(WATER_DROP + 0.03), 'coves slope gently')
})

test('build time (coarse at startup, fine in an idle slot)', () => {
  const med = (fine) => { const t = []; for (let k = 0; k < 3; k++) { const t0 = performance.now(); buildGround({ fine, paint, isRock: noRock }); t.push(performance.now() - t0) } return t.sort((a, b) => a - b)[1] }
  const c = med(false), f = med(true); assert.ok(c < budget(600), `coarse median ${c.toFixed(0)} ms`); assert.ok(f < budget(1000), `fine median ${f.toFixed(0)} ms`)
})
