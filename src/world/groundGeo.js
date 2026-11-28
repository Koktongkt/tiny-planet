// The planet's ground mesh (look A, "clay diorama"): one welded icosphere so light rolls smoothly over the hills, painted
// in her yard's warm greens; rock (the cliff faces) keeps flat facets. Pure: App.jsx passes the colour rules it owns.
// Spec: docs/superpowers/specs/2026-11-25-ground-water-look-design.md
import * as THREE from 'three'
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { R } from '../world.js'
import { visualGround, shoreDist, inCove, WATER_DROP } from './shore.js'

const ss = (a, b, t) => { t = Math.min(1, Math.max(0, (t - a) / (b - a))); return t * t * (3 - 2 * t) }
const SUN = new THREE.Color('#b8dc62'), GRASS = new THREE.Color('#82c34a'), SHADE = new THREE.Color('#5aa26a')
// slow painted patches (two octaves of sin noise on the unit sphere)
const patch = (v) => Math.sin(v.x * 7.1 + Math.sin(v.z * 5.3) * 1.4) * Math.cos(v.z * 6.7 - v.x * 2.1) * 0.6 + Math.sin(v.y * 13 + v.x * 9) * Math.sin(v.z * 11) * 0.4

// warm grass: sunny yellow-green on tops, cool blue-green in hollows, soft patches between
export function grassColour(v, out, h = visualGround(v)) {
  const p = patch(v)
  return out.copy(SHADE).lerp(GRASS, ss(-0.12, 0.25, h + 0.14 * p)).lerp(SUN, ss(0.3, 1.1, h + 0.18 * p))
}

const SOIL = new THREE.Color('#d08f55'), SOIL_LO = new THREE.Color('#a8673a'), SAND = new THREE.Color('#e9d9b0')
// the drawn bank, as an offset from the drawn ground at signed shore distance w (world units, + on land): a rounded lip
// (~0.03) just inland, then a steep rounded wall down past the drawn water; coves slope gently instead. Fades out by
// w = -0.6 (under water) so the band's edge never shows.
export function bankOffset(w, cove) {
  if (w > 0.6 || w < -0.6) return 0
  const fade = ss(-0.6, -0.45, w)
  if (cove) return -(WATER_DROP + 0.03) * ss(0.2, -0.2, w) * fade
  return 0.03 * Math.exp(-(((w - 0.06) / 0.03) ** 2)) - (WATER_DROP + 0.09) * ss(0.035, -0.02, w) * fade
}
export const bankIsSoil = (w, cove) => !cove && w < 0.035 && w > -0.05

// two-pass refinement near water: an edge splits when its midpoint is within 0.6 of a shoreline and it is longer than
// 0.05 world units. The decision is per edge (shared by both its triangles), so the result has no T-junctions.
// sd: signed shore distance per vertex, carried through the passes (computed once per vertex)
function refine([g, sd]) {
  const p = g.attributes.position, idx = g.index.array, P = Array.from(p.array), mids = new Map(), a = new THREE.Vector3(), b = new THREE.Vector3(), SD = Array.from(sd)
  const mid = (i, j) => {
    const key = i < j ? i * 4194304 + j : j * 4194304 + i; if (mids.has(key)) return mids.get(key)
    let m = -1
    a.fromBufferAttribute(p, i); b.fromBufferAttribute(p, j)
    if (Math.min(Math.abs(SD[i]), Math.abs(SD[j])) < 0.9 && a.angleTo(b) * R > 0.05) { const c = a.clone().add(b).normalize(), d = shoreDist(c); if (Math.abs(d) < 0.6) { m = P.length / 3; P.push(c.x, c.y, c.z); SD.push(d) } }
    mids.set(key, m); return m
  }
  const out = []
  for (let t = 0; t < idx.length; t += 3) {
    const v = [idx[t], idx[t + 1], idx[t + 2]], m = [mid(v[0], v[1]), mid(v[1], v[2]), mid(v[2], v[0])], k = m.filter(x => x >= 0).length
    if (k === 0) { out.push(...v); continue }
    if (k === 3) { out.push(v[0], m[0], m[2], m[0], v[1], m[1], m[2], m[1], v[2], m[0], m[1], m[2]); continue }
    // rotate so the split edges come first
    let r = 0; while (!(m[r] >= 0 && (k === 1 || m[(r + 1) % 3] >= 0))) r++
    const A = v[r], B = v[(r + 1) % 3], Cc = v[(r + 2) % 3], m0 = m[r], m1 = m[(r + 1) % 3]
    if (k === 1) out.push(A, m0, Cc, m0, B, Cc)
    else out.push(A, m0, Cc, m0, B, m1, m0, m1, Cc)
  }
  const o = new THREE.BufferGeometry(); o.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); o.setIndex(out); return [o, SD]
}

// paint(v, colour, drawnHeight): the per-point colour rules (v is the unit direction). isRock(v, faceNormal): rock triangles stay
// faceted. rockPaint(v, faceNormal, colour), optional: recolours rock vertices with the face normal.
export function buildGround({ fine = false, paint, isRock, rockPaint } = {}) {
  let g = new THREE.IcosahedronGeometry(1, 64); g.deleteAttribute('normal'); g.deleteAttribute('uv'); g = mergeVertices(g, 1e-6)
  let sd = new Float32Array(g.attributes.position.count); { const v = new THREE.Vector3(); for (let i = 0; i < sd.length; i++) sd[i] = shoreDist(v.fromBufferAttribute(g.attributes.position, i)) }
  if (fine) [g, sd] = refine(refine([g, sd]))
  const p = g.attributes.position, n = new THREE.Vector3(), col = new Float32Array(p.count * 3), c = new THREE.Color()
  for (let i = 0; i < p.count; i++) {
    n.fromBufferAttribute(p, i).normalize(); const vg = visualGround(n); paint(n, c, vg)
    const w = sd[i], cove = w < 0.7 && inCove(n), off = bankOffset(w, cove)
    if (bankIsSoil(w, cove)) c.copy(SOIL_LO).lerp(SOIL, ss(-0.03, 0.03, w))
    else if (!cove && w > 0.03 && w < 0.1) c.lerp(SUN, 0.25 * (1 - Math.abs(w - 0.06) / 0.04)) // the lip catches the light
    else if (cove && w < 0.25 && w > -0.3) c.lerp(SAND, ss(0.25, 0.05, w) * 0.9)
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b
    n.multiplyScalar(R + vg + off); p.setXYZ(i, n.x, n.y, n.z)
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals()
  return facetRock(g, isRock, rockPaint)
}

// rock triangles get their own vertices with the face normal (flat facets), everything else stays shared and smooth
function facetRock(g, isRock, rockPaint) {
  const p = g.attributes.position, nr = g.attributes.normal, cl = g.attributes.color, idx = g.index.array
  const a = new THREE.Vector3(), b = new THREE.Vector3(), cc = new THREE.Vector3(), f = new THREE.Vector3(), mid = new THREE.Vector3(), col = new THREE.Color()
  const P = Array.from(p.array), N = Array.from(nr.array), C = Array.from(cl.array), out = new Uint32Array(idx.length)
  let next = p.count
  for (let t = 0; t < idx.length; t += 3) {
    a.fromBufferAttribute(p, idx[t]); b.fromBufferAttribute(p, idx[t + 1]); cc.fromBufferAttribute(p, idx[t + 2])
    mid.copy(a).add(b).add(cc).normalize(); f.copy(b).sub(a).cross(cc.clone().sub(a)).normalize()
    if (!isRock(mid, f)) { out[t] = idx[t]; out[t + 1] = idx[t + 1]; out[t + 2] = idx[t + 2]; continue }
    for (let k = 0; k < 3; k++) {
      const i = idx[t + k]; P.push(p.getX(i), p.getY(i), p.getZ(i)); N.push(f.x, f.y, f.z)
      col.fromBufferAttribute(cl, i); if (rockPaint) rockPaint(a.fromBufferAttribute(p, i).normalize(), f, col); C.push(col.r, col.g, col.b)
      out[t + k] = next++
    }
  }
  const o = new THREE.BufferGeometry()
  o.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); o.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3)); o.setAttribute('color', new THREE.Float32BufferAttribute(C, 3))
  o.setIndex(new THREE.BufferAttribute(out, 1)); return o
}
