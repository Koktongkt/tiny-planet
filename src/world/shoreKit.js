// The shore kit (look A): along every shoreline a rounded grass lip, puffy foam beads at the waterline and a thin ink
// waterline; with the carved banks off (?shore=coarse), a soil ribbon from the lip down into the water instead.
// Built from SHORE_RUNS; kept clear of bridge decks, piers, the lake dock and jump stones; no lip or soil in the coves.
// chunkKit() merges everything into vertex-coloured sector chunks (one body + one outline each) so off-screen sectors
// are culled. Pure (node-testable). Spec: docs/superpowers/specs/2026-11-25-ground-water-look-design.md
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { R, ZONES, zv, around, onBridgeDeck, JUMPS } from '../world.js'
import { PIERS, LAKE_DOCK_B } from './zoneLayout.js'
import { SHORE_RUNS, inCove, visualGround, WATER_DROP } from './shore.js'
import { bankOffset, grassColour } from './groundGeo.js'

const COL = { lip: new THREE.Color('#9fd457'), soil: new THREE.Color('#c88650'), bead: new THREE.Color('#fffaf0'), ink: new THREE.Color('#5a3626') }

// structures the kit keeps clear of: [a, b, radius] segments (a point is a zero-length segment)
export const KEEP_CLEAR = (() => {
  const lake = zv(ZONES.lake), dock = around(lake, ZONES.lake.r * 1.06, LAKE_DOCK_B), dockTip = around(lake, ZONES.lake.r * 1.06 - 1.3 / R, LAKE_DOCK_B)
  return [...PIERS.map(p => [p.root, p.tip, 0.2]), [dock, dockTip, 0.2], ...JUMPS.map(j => [j.c, j.c, 0.3])]
})()
const _s = new THREE.Vector3()
const clear = (n) => !onBridgeDeck(n, 0.12) && KEEP_CLEAR.every(([a, b, r]) => { for (let t = 0; t <= 1; t += 0.1) if (_s.copy(a).lerp(b, t).normalize().angleTo(n) * R < r) return false; return true })

const surf = (n, w) => R + visualGround(n) + bankOffset(w, false)
const step = (p, w) => p.n.clone().addScaledVector(p.out, w / R).normalize()
// per-vertex colour from f(direction, colour)
const tint = (g, f) => { const p = g.attributes.position, a = new Float32Array(p.count * 3), n = new THREE.Vector3(), c = new THREE.Color(); for (let i = 0; i < p.count; i++) { f(n.fromBufferAttribute(p, i).normalize(), c); a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g }
const paint = (g, c) => { const a = new Float32Array(g.attributes.position.count * 3); for (let i = 0; i < a.length; i += 3) { a[i] = c.r; a[i + 1] = c.g; a[i + 2] = c.b } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g }

// contiguous stretches of a run where `ok(point)` holds
function stretches(run, ok) { const out = []; let cur = []; for (const p of run.pts) { if (ok(p)) cur.push(p); else { if (cur.length > 1) out.push(cur); cur = [] } } if (cur.length > 1) out.push(cur); return out }

// a half-tube (upper semicircle, `seg` segments) along points `c[i]` with radius r, up = the sphere normal
function halfTube(centres, r, seg = 4) {
  const pos = [], idx = [], ring = seg + 1
  for (let i = 0; i < centres.length; i++) {
    const c = centres[i], up = c.clone().normalize(), a = centres[Math.max(0, i - 1)], b = centres[Math.min(centres.length - 1, i + 1)]
    const tan = b.clone().sub(a).addScaledVector(up, -b.clone().sub(a).dot(up)).normalize(), side = new THREE.Vector3().crossVectors(tan, up).normalize()
    for (let k = 0; k <= seg; k++) { const t = Math.PI * k / seg, q = c.clone().addScaledVector(side, Math.cos(t) * r).addScaledVector(up, Math.sin(t) * r); pos.push(q.x, q.y, q.z) }
    if (i > 0) for (let k = 0; k < seg; k++) { const p0 = (i - 1) * ring + k, p1 = i * ring + k; idx.push(p0, p1, p0 + 1, p0 + 1, p1, p1 + 1) }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g
}
// a ribbon between two point lists (same length)
function band(A, B) {
  const pos = [], idx = []
  for (let i = 0; i < A.length; i++) { pos.push(A[i].x, A[i].y, A[i].z, B[i].x, B[i].y, B[i].z); if (i > 0) { const k = (i - 1) * 2; idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3) } }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g
}

export function buildShoreKit({ fine = true } = {}) {
  const lips = [], soils = [], inks = [], beads = []
  const LIP_W = fine ? 0.06 : 0.035
  for (const run of SHORE_RUNS) {
    const water = (p) => p.level - WATER_DROP
    // lip (and soil, coarse) — not in coves, not on structures, not along the harbour quays
    for (const s of stretches(run, p => !inCove(p.n) && !p.harbour && clear(step(p, LIP_W)))) {
      const g = halfTube(s.map(p => { const n = step(p, LIP_W); return n.multiplyScalar(surf(n, LIP_W) - 0.018) }), 0.03) // sunk: reads as the ground's rounded edge
      lips.push(tint(g, (n, c) => grassColour(n, c).lerp(COL.lip, 0.3)))
      if (!fine) soils.push(band(s.map(p => { const n = step(p, 0.03); return n.multiplyScalar(surf(n, 0.03)) }), s.map(p => { const n = step(p, -0.01); return n.multiplyScalar(R + water(p) - 0.03) })))
    }
    // ink waterline — everywhere the water meets land
    for (const s of stretches(run, p => clear(p.n))) inks.push(band(s.map(p => step(p, 0.012).multiplyScalar(R + water(p) + 0.004)), s.map(p => step(p, -0.006).multiplyScalar(R + water(p) + 0.004))))
    // foam beads: one every ~0.09 along the waterline, seeded sizes, flattened
    let acc = 0, k = 0
    for (let i = 0; i < run.pts.length; i++) {
      const p = run.pts[i]; if (i) acc += p.n.angleTo(run.pts[i - 1].n) * R
      if (acc < 0.09) continue; acc = 0
      const n = step(p, -0.02); if (!clear(n)) continue
      const r = 0.036 + 0.02 * (0.5 + 0.5 * Math.sin(k++ * 2.39 + i)), g = BEAD.clone()
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), n)
      g.applyMatrix4(new THREE.Matrix4().compose(n.clone().multiplyScalar(R + water(p) + r * 0.15), q, new THREE.Vector3(r, r * 0.6, r))); beads.push(g)
    }
  }
  const merge = (a, c) => a.length ? paint(mergeGeometries(a), COL[c]) : null
  return { lip: lips.length ? mergeGeometries(lips) : null, soil: fine ? null : merge(soils, 'soil'), beads: merge(beads, 'bead'), ink: merge(inks, 'ink') }
}
const BEAD = (() => { const g = new THREE.SphereGeometry(1, 6, 4); g.deleteAttribute('uv'); return g })()

// merge the parts into sector chunks: body = every part (vertex colours), hull = lip + beads + soil (ink outline)
export function chunkKit(kit, cell = 4.5) {
  const buckets = new Map(), put = (g, hull) => {
    const p = g.attributes.position, idx = g.index ? g.index.array : null, n = idx ? idx.length : p.count
    const per = new Map(), v = new THREE.Vector3()
    for (let t = 0; t < n; t += 3) {
      const ia = idx ? idx[t] : t; v.fromBufferAttribute(p, ia)
      const key = `${Math.floor(v.x / cell)},${Math.floor(v.y / cell)},${Math.floor(v.z / cell)}`; if (!per.has(key)) per.set(key, []); per.get(key).push(t)
    }
    for (const [key, list] of per) {
      const sub = new THREE.BufferGeometry(), map = new Map(), P = [], N = [], C = [], I = []
      for (const t of list) for (let k = 0; k < 3; k++) { const i = idx ? idx[t + k] : t + k; if (!map.has(i)) { map.set(i, P.length / 3); P.push(p.getX(i), p.getY(i), p.getZ(i)); N.push(g.attributes.normal.getX(i), g.attributes.normal.getY(i), g.attributes.normal.getZ(i)); C.push(g.attributes.color.getX(i), g.attributes.color.getY(i), g.attributes.color.getZ(i)) } I.push(map.get(i)) }
      sub.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); sub.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3)); sub.setAttribute('color', new THREE.Float32BufferAttribute(C, 3)); sub.setIndex(I)
      if (!buckets.has(key)) buckets.set(key, { body: [], hull: [] }); const b = buckets.get(key); b.body.push(sub); if (hull) b.hull.push(sub)
    }
  }
  for (const [k, g] of Object.entries(kit)) if (g) put(g, k !== 'ink')
  return [...buckets.values()].map(b => ({ body: mergeGeometries(b.body), hull: b.hull.length ? mergeGeometries(b.hull) : new THREE.BufferGeometry() }))
}
