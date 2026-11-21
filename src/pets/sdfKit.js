// Small kit for the chibi pets' smooth parts (round 10): soft-blended shapes described as signed distance functions,
// turned into one smooth mesh each, and the pets' fur shader with a coat pattern spliced in. Used by Pip's head and body.
import * as THREE from 'three'
import { fur, CEL_U } from '../GhibliPerson.jsx'

export const ell = (x, y, z, c, r) => { const a = (x - c[0]) / r[0], b = (y - c[1]) / r[1], d = (z - c[2]) / r[2]; return (Math.sqrt(a * a + b * b + d * d) - 1) * Math.min(r[0], r[1], r[2]) }
export const smin = (a, b, k) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25 }
export const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t) }
export const gradOf = (sdf) => (x, y, z, out) => { const e = 1e-3; return out.set(sdf(x + e, y, z) - sdf(x - e, y, z), sdf(x, y + e, z) - sdf(x, y - e, z), sdf(x, y, z + e) - sdf(x, y, z - e)).normalize() }
// first surface crossing along a ray (o + t d), or null
export const hitOf = (sdf) => (o, d, t0, t1, step = 0.01) => {
  const at = (t) => sdf(o[0] + d[0] * t, o[1] + d[1] * t, o[2] + d[2] * t)
  let prev = t0, sp = at(t0)
  for (let t = t0 + step; t <= t1; t += step) { const s = at(t)
    if (Math.sign(s) !== Math.sign(sp)) { let a = prev, b = t; for (let n = 0; n < 20; n++) { const m = (a + b) / 2; if (Math.sign(at(m)) === Math.sign(sp)) a = m; else b = m } return (a + b) / 2 }
    prev = t; sp = s }
  return null
}
// Mesh a (roughly star-shaped) SDF: shoot each sphere-vertex direction from an inside point out to the surface
// (origin(d) may move the start point for awkward lobes like ears), weld, then relax: move each vertex toward its
// neighbours' average and project it back onto the surface, which evens out the spacing. Normals from the gradient.
export function starMesh(sdf, { C = [0, 0, 0], w = 64, h = 48, step = 0.01, far = 3, relax = 6, origin = null }) {
  const hit = hitOf(sdf), grad = gradOf(sdf), g = new THREE.SphereGeometry(1, w, h), p = g.attributes.position, nr = g.attributes.normal, n = new THREE.Vector3()
  // weld the sphere's seam and poles by direction first (|| 0 folds -0 into 0, else the seam's keys differ), so both sides of the seam get the exact same surface point
  const r4 = (v) => Math.round(v * 1e4) || 0, key = (i) => `${r4(p.getX(i))},${r4(p.getY(i))},${r4(p.getZ(i))}`, first = new Map(), canon = new Int32Array(p.count)
  for (let i = 0; i < p.count; i++) { const k = key(i); if (!first.has(k)) first.set(k, i); canon[i] = first.get(k) }
  for (let i = 0; i < p.count; i++) { if (canon[i] !== i) continue; const d = [p.getX(i), p.getY(i), p.getZ(i)], o = origin ? origin(d) : C, t = hit(o, d, 0, far, step) ?? 1
    p.setXYZ(i, o[0] + d[0] * t, o[1] + d[1] * t, o[2] + d[2] * t) }
  const nb = new Map(), ix = g.index.array, link = (a, b) => { a = canon[a]; b = canon[b]; if (a === b) return; if (!nb.has(a)) nb.set(a, new Set()); nb.get(a).add(b) }
  for (let f = 0; f < ix.length; f += 3) { const a = ix[f], b = ix[f + 1], c = ix[f + 2]; link(a, b); link(b, a); link(b, c); link(c, b); link(a, c); link(c, a) }
  const P = new Float32Array(p.array)
  for (let it = 0; it < relax; it++) { const Q = new Float32Array(P)
    for (const [v, ns] of nb) { let ax = 0, ay = 0, az = 0; for (const u of ns) { ax += P[u * 3]; ay += P[u * 3 + 1]; az += P[u * 3 + 2] } const m = ns.size
      let x = (P[v * 3] + ax / m) * 0.5, y = (P[v * 3 + 1] + ay / m) * 0.5, z = (P[v * 3 + 2] + az / m) * 0.5
      for (let k = 0; k < 4; k++) { const dd = sdf(x, y, z); grad(x, y, z, n); x -= n.x * dd; y -= n.y * dd; z -= n.z * dd }
      Q[v * 3] = x; Q[v * 3 + 1] = y; Q[v * 3 + 2] = z }
    P.set(Q) }
  for (let i = 0; i < p.count; i++) { const c = canon[i], x = P[c * 3], y = P[c * 3 + 1], z = P[c * 3 + 2]; p.setXYZ(i, x, y, z); grad(x, y, z, n); nr.setXYZ(i, n.x, n.y, n.z) }
  g.deleteAttribute('uv'); g.computeBoundingSphere(); return g
}
// The pets' fur shader with a coat pattern: `glsl` runs right after the base colour is set and may rewrite `base`
// using vO (object-space position). `decl` declares any extra uniforms; `uniforms` supplies them.
const patched = new Map()
export function patchFur(key, hex, { glsl = '', decl = '', uniforms = {}, vertexColors = false }) {
  if (patched.has(key)) return patched.get(key)
  const m = fur(hex).clone(); m.defines = { FUR: 1 }; m.vertexColors = vertexColors
  m.uniforms = { ...m.uniforms, ...CEL_U, uColor: { value: new THREE.Color(hex) }, ...uniforms }
  // the original line carries more statements after this one, so the splice must end on a fresh line
  m.fragmentShader = decl + '\n' + m.fragmentShader.replace('vec3 base = uColor*vCol;', `vec3 base = uColor*vCol;\n{ ${glsl} }\n`)
  patched.set(key, m); return m
}
