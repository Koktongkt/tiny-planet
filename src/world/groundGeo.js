// The planet's ground mesh (look A, "clay diorama"): one welded icosphere so light rolls smoothly over the hills, painted
// in her yard's warm greens; rock (the cliff faces) keeps flat facets. Pure: App.jsx passes the colour rules it owns.
// Spec: docs/superpowers/specs/2026-11-25-ground-water-look-design.md
import * as THREE from 'three'
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { R } from '../world.js'
import { visualGround } from './shore.js'

const ss = (a, b, t) => { t = Math.min(1, Math.max(0, (t - a) / (b - a))); return t * t * (3 - 2 * t) }
const SUN = new THREE.Color('#b8dc62'), GRASS = new THREE.Color('#82c34a'), SHADE = new THREE.Color('#5aa26a')
// slow painted patches (two octaves of sin noise on the unit sphere)
const patch = (v) => Math.sin(v.x * 7.1 + Math.sin(v.z * 5.3) * 1.4) * Math.cos(v.z * 6.7 - v.x * 2.1) * 0.6 + Math.sin(v.y * 13 + v.x * 9) * Math.sin(v.z * 11) * 0.4

// warm grass: sunny yellow-green on tops, cool blue-green in hollows, soft patches between
export function grassColour(v, out) {
  const h = visualGround(v), p = patch(v)
  return out.copy(SHADE).lerp(GRASS, ss(-0.12, 0.25, h + 0.14 * p)).lerp(SUN, ss(0.3, 1.1, h + 0.18 * p))
}

// paint(v, colour): the per-point colour rules (v is the unit direction). isRock(v, faceNormal): rock triangles stay
// faceted. rockPaint(v, faceNormal, colour), optional: recolours rock vertices with the face normal.
export function buildGround({ fine = false, paint, isRock, rockPaint } = {}) {
  void fine // the finer bank band arrives in the next step of the plan
  let g = new THREE.IcosahedronGeometry(1, 64); g.deleteAttribute('normal'); g.deleteAttribute('uv'); g = mergeVertices(g, 1e-6)
  const p = g.attributes.position, n = new THREE.Vector3(), col = new Float32Array(p.count * 3), c = new THREE.Color()
  for (let i = 0; i < p.count; i++) {
    n.fromBufferAttribute(p, i).normalize(); paint(n, c); col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b
    n.multiplyScalar(R + visualGround(n)); p.setXYZ(i, n.x, n.y, n.z)
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
