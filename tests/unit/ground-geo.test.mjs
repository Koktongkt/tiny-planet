// node --test tests/unit — the ground mesh: welded and smooth on grass, faceted on rock, warm palette, same drawn shape
import test from 'node:test'; import assert from 'node:assert/strict'
import * as THREE from 'three'
import { R } from '../../src/world.js'
import { visualGround } from '../../src/world/shore.js'
import { buildGround, grassColour } from '../../src/world/groundGeo.js'

const paint = (v, c) => grassColour(v, c)
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

test('same drawn shape (fine off)', () => {
  for (let s = 0; s < 500; s++) { const i = (s * 104729) % P.count, p = v(i), n = p.clone().normalize(); assert.ok(Math.abs(p.length() - (R + visualGround(n))) < 1e-4) }
})
