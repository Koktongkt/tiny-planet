// Tiny low-poly mesh kit for art-b: unit primitives + a part list -> one merged, vertex-coloured BufferGeometry.
import * as THREE from 'three'
// unit primitives (non-indexed, position+normal only; cloned per use)
const BASE = {}
export function prim(k) {
  if (BASE[k]) return BASE[k]
  let g
  switch (k) {
    case 'oct': g = new THREE.OctahedronGeometry(1, 0); break
    case 'ico': g = new THREE.IcosahedronGeometry(1, 0); break
    case 'ball': g = new THREE.SphereGeometry(1, 6, 4); break
    case 'ballLo': g = new THREE.SphereGeometry(1, 5, 3); break
    case 'dome': g = new THREE.SphereGeometry(1, 6, 2, 0, Math.PI * 2, 0, Math.PI / 2); break
    case 'cap': g = new THREE.SphereGeometry(1, 6, 2, 0, Math.PI * 2, 0, Math.PI * 0.32); break
    case 'cyl': g = new THREE.CylinderGeometry(1, 1, 1, 4, 1, true); g.translate(0, 0.5, 0); break
    case 'cone': g = new THREE.ConeGeometry(1, 1, 5, 1, false); g.translate(0, 0.5, 0); break
    case 'box': g = new THREE.BoxGeometry(1, 1, 1); break
  }
  g.deleteAttribute('uv'); if (g.index) g = g.toNonIndexed(); g.computeVertexNormals(); BASE[k] = g; return g
}
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new THREE.Vector3(), _p = new THREE.Vector3()
// part: { k, c, p:[x,y,z], r:[x,y,z] euler, s:[x,y,z], w? (sway multiplier, default by height) }
export const P = (k, c, p, s, r = [0, 0, 0], w) => ({ k, c, p, s, r, w })
// write parts into flat arrays, transformed by `mat` (plant -> mesh); base = plant base in mesh space; hgt for sway weight
const _m3 = new THREE.Matrix4(), _c = new THREE.Color(), _v = new THREE.Vector3(), _n = new THREE.Vector3(), _nm = new THREE.Matrix3()
export function emitParts(parts, mat, base, out, swayH = 0.1) {
  for (const pt of parts) {
    const src = prim(pt.k), pa = src.attributes.position, na = src.attributes.normal
    _e.set(pt.r[0], pt.r[1], pt.r[2], pt.order || 'XYZ'); _q.setFromEuler(_e); _s.set(...pt.s); _p.set(...pt.p)
    _m3.compose(_p, _q, _s); _m.multiplyMatrices(mat, _m3); _nm.getNormalMatrix(_m)
    _c.set(pt.c); const ink = pt.ink ?? (pt.k !== 'cyl' && Math.max(...pt.s.map(Math.abs)) > 0.006) ? 1 : 0
    for (let i = 0; i < pa.count; i++) {
      _v.fromBufferAttribute(pa, i).applyMatrix4(_m3); const ly = _v.y // plant-local height -> sway weight
      _v.applyMatrix4(mat); _n.fromBufferAttribute(na, i).applyMatrix3(_nm).normalize()
      out.pos.push(_v.x, _v.y, _v.z); out.nor.push(_n.x, _n.y, _n.z); out.col.push(_c.r, _c.g, _c.b)
      out.base.push(base.x, base.y, base.z); out.ink && out.ink.push(ink); out.w.push(pt.w === 0 ? 0 : Math.max(0, Math.min(1.4, ly / swayH)) * (pt.w ?? 1))
    }
  }
}
export function buildGeometry(out) {
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(out.pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(out.nor, 3))
  g.setAttribute('color', new THREE.Float32BufferAttribute(out.col, 3)); g.setAttribute('aBase', new THREE.Float32BufferAttribute(out.base, 3)); g.setAttribute('aW', new THREE.Float32BufferAttribute(out.w, 1)); if (out.ink) g.userData.ink = out.ink
  g.computeBoundingSphere(); if (g.boundingSphere) g.boundingSphere.radius += 0.03; return g
}
