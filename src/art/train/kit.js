// Tiny merge kit for Stage C train art (art-c): primitives -> ONE vertex-coloured toon geometry + ONE baked ink-hull
// geometry (each part grown by an absolute `ink` margin about its own centre, rendered BackSide). Pure three, no React.
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new THREE.Vector3(), _p = new THREE.Vector3(), _c = new THREE.Color()
const flat = (g) => { const n = g.index ? g.toNonIndexed() : g; n.deleteAttribute('uv'); return n }
function paint(g, color) { const n = g.attributes.position.count, a = new Float32Array(n * 3); _c.set(color); for (let i = 0; i < n; i++) { a[i * 3] = _c.r; a[i * 3 + 1] = _c.g; a[i * 3 + 2] = _c.b } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g }
export function kit({ ink = 0.006, inkOn = true } = {}) {
  const body = [], hull = [], glow = []
  const put = (g, pos, rot, scl) => { _e.set(rot[0], rot[1], rot[2]); _q.setFromEuler(_e); _m.compose(_p.set(...pos), _q, _s.set(...scl)); g.applyMatrix4(_m); return g }
  const K = {
    /** box w×h×d (local axes) at pos, rot (euler xyz), colour; hull: false to skip its ink; glow: true -> glow list */
    box(w, h, d, pos, color, { rot = [0, 0, 0], hull: hl = true, glow: gl = false } = {}) {
      const g = put(paint(flat(new THREE.BoxGeometry(w, h, d)), color), pos, rot, [1, 1, 1])
      ;(gl ? glow : body).push(g)
      if (inkOn && hl && !gl) hull.push(put(paint(flat(new THREE.BoxGeometry(w + ink * 2, h + ink * 2, d + ink * 2)), '#000'), pos, rot, [1, 1, 1]))
      return K
    },
    /** cylinder radius r, length l along local Y (rotate to lay it down), seg radial segments, theta for half-cylinders */
    cyl(r, l, pos, color, { rot = [0, 0, 0], seg = 8, scale = [1, 1, 1], theta = Math.PI * 2, hull: hl = true, glow: gl = false, r2 } = {}) {
      const mk = (rr, rr2, ll) => paint(flat(new THREE.CylinderGeometry(rr2 ?? rr, rr, ll, seg, 1, theta < Math.PI * 2 ? false : false, 0, theta)), color)
      ;(gl ? glow : body).push(put(mk(r, r2, l), pos, rot, scale))
      if (inkOn && hl && !gl) hull.push(put(mk(r + ink / Math.max(0.3, Math.min(...scale)), r2 != null ? r2 + ink : undefined, l + ink * 2), pos, rot, scale))
      return K
    },
    sphere(r, pos, color, { seg = 8, glow: gl = false, hull: hl = true, scale = [1, 1, 1] } = {}) {
      const g = put(paint(flat(new THREE.SphereGeometry(r, seg, Math.max(4, seg * 0.6 | 0))), color), pos, [0, 0, 0], scale)
      ;(gl ? glow : body).push(g)
      if (inkOn && hl && !gl) hull.push(put(paint(flat(new THREE.SphereGeometry(r + ink, seg, Math.max(4, seg * 0.6 | 0))), '#000'), pos, [0, 0, 0], scale))
      return K
    },
    build() {
      const b = body.length ? mergeGeometries(body) : null, h = hull.length ? mergeGeometries(hull) : null, w = glow.length ? mergeGeometries(glow) : null
      for (const g of [b, h, w]) if (g) { g.computeBoundingSphere(); g.computeBoundingBox() }
      if (h) h.deleteAttribute('color')
      return { body: b, hull: h, glow: w, tris: (g) => g ? g.attributes.position.count / 3 : 0 }
    },
  }
  return K
}
export const tris = (g) => (g ? (g.index ? g.index.count : g.attributes.position.count) / 3 : 0)
