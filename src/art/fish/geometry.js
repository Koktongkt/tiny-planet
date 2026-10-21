// buildFishGeometry(id, lod) — low-poly toon fish (art-c). One non-indexed BufferGeometry per species + LOD, cached.
// Attributes: position, normal, color (back/fin colour), aBelly (vec3), aC2 (pattern colour), aFP (u nose→tail 0..1,
// v height -1..1, s side -1..1, mask 1 = patterned body), aPat (type, scale, seed, amount). geometry.userData.ink = per-vertex
// 1/0 (eyes and whiskers skip the ink hull). Budget: hi ≤ 300 triangles, lo ≤ 130. Nose +X, up +Y, length 1.
import * as THREE from 'three'
import { FISH_ART } from './art.js'
const C = (h) => new THREE.Color(h)
const RINGS = { hi: [0.035, 0.1, 0.2, 0.32, 0.46, 0.6, 0.74, 0.87, 1], lo: [0.08, 0.3, 0.55, 0.8, 1] }
const SIDES = { hi: 8, lo: 6 }
const cache = new Map()
export function buildFishGeometry(id, lod = 'hi') {
  const key = id + ':' + lod; if (cache.has(key)) return cache.get(key)
  const A = FISH_ART[id] || FISH_ART.minnow, seed = [...id].reduce((a, c) => a + c.charCodeAt(0), 0) % 97 / 97
  const P = [], N = [], Cc = [], B = [], C2 = [], FP = [], PT = [], INK = []
  const back = C(A.back), belly = C(A.belly), fin = C(A.fin), pat = C(A.pat), eye = C('#231a15'), white = C('#fffaf0')
  const pt = [A.pattern || 0, A.patScale || 1, seed, A.patAmt ?? 1]
  const L = 1, flat = !!A.flat
  // profile: half-height / half-width at u (0 nose .. 1 tail root)
  const prof = (u) => { const p = A.hump, tr = A.tail
    const f = u < p ? Math.sqrt(Math.max(0, 1 - ((p - u) / p) ** 2)) : tr + (1 - tr) * Math.pow(0.5 + 0.5 * Math.cos(Math.PI * (u - p) / (1 - p)), 0.85)
    return f }
  const hh = (u) => prof(u) * A.depth * 0.5, hw = (u) => prof(u) * A.width * 0.5 * (A.flatHead && u < 0.3 ? 1 + (0.3 - u) * 1.2 : 1)
  const X = (u) => (0.5 - u) * L
  const push = (p, n, col, mask, ink = 1, c2 = pat) => { P.push(p.x, p.y, p.z); N.push(n.x, n.y, n.z); Cc.push(col.r, col.g, col.b); B.push(belly.r, belly.g, belly.b); C2.push(c2.r, c2.g, c2.b); FP.push(mask.u, mask.v, mask.s, mask.m); PT.push(...pt); INK.push(ink) }
  const _e1 = new THREE.Vector3(), _e2 = new THREE.Vector3(), _nn = new THREE.Vector3()
  const tri = (a, b, c) => { // wind every triangle to face its supplied normals (front faces only, no DoubleSide needed)
    _e1.subVectors(b.p, a.p); _e2.subVectors(c.p, a.p); _nn.copy(a.n).add(b.n).add(c.n)
    if (_e1.cross(_e2).dot(_nn) < 0) { const t = b; b = c; c = t }
    for (const v of [a, b, c]) push(v.p, v.n, v.c, v.f, v.ink ?? 1, v.c2) }
  // ---- body: elliptical rings, smooth analytic normals ----
  const S = SIDES[lod], rings = RINGS[lod].map(u => {
    const yh = hh(u), zw = hw(u), cy = (A.belly ?? 1) === 1 ? 0 : 0, vs = []
    for (let k = 0; k < S; k++) { const a = (k / S) * Math.PI * 2 + Math.PI / 2, ca = Math.cos(a), sa = Math.sin(a) // k=0 top
      const y = sa * (flat ? zw : yh), z = ca * (flat ? yh : zw)
      const pos = flat ? new THREE.Vector3(X(u), z * 0.9, y) : new THREE.Vector3(X(u), y + cy, z)
      const nrm = flat ? new THREE.Vector3(0.15, ca / Math.max(yh, 1e-3), sa / Math.max(zw, 1e-3)).normalize() : new THREE.Vector3(0.15 * (u < A.hump ? 1 : -0.4), sa / Math.max(yh, 1e-3), ca / Math.max(zw, 1e-3)).normalize()
      const v = flat ? ca : sa, s = flat ? sa : ca
      vs.push({ p: pos, n: nrm, c: back, f: { u, v, s, m: 1 } }) }
    return vs })
  const nose = { p: new THREE.Vector3(X(0), flat ? 0 : hh(A.hump) * -0.05, 0), n: new THREE.Vector3(1, 0, 0), c: back, f: { u: 0, v: 0, s: 0, m: 1 } }
  for (let k = 0; k < S; k++) tri(nose, rings[0][(k + 1) % S], rings[0][k])
  for (let r = 0; r < rings.length - 1; r++) for (let k = 0; k < S; k++) { const a = rings[r][k], b = rings[r][(k + 1) % S], c = rings[r + 1][k], d = rings[r + 1][(k + 1) % S]; tri(a, b, d); tri(a, d, c) }
  const last = rings[rings.length - 1], tc = { p: new THREE.Vector3(X(1), 0, 0), n: new THREE.Vector3(-1, 0, 0), c: back, f: { u: 1, v: 0, s: 0, m: 1 } }
  for (let k = 0; k < S; k++) tri(tc, last[k], last[(k + 1) % S])
  // ---- fins: thin extruded polygons (flat normals) ----
  const fv = (x, y, z, u, v) => ({ x, y, z, u, v })
  function slab(poly, plane = 'xy', th = 0.012, col = fin, mask = 0) {
    // poly: [[a,b],...] in the plane; extrude ±th/2 along the plane normal
    const n = poly.length, mk = (a, b, o) => plane === 'xy' ? new THREE.Vector3(a, b, o) : new THREE.Vector3(a, o, b)
    const nrm = plane === 'xy' ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(0, 1, 0)
    const vt = (a, b, o, nn) => { const p = mk(a, b, o); const u = 0.5 - p.x / L; return { p, n: nn, c: col, f: { u: Math.min(1.2, Math.max(0, u)), v: plane === 'xy' ? Math.max(-1, Math.min(1, p.y / Math.max(0.01, A.depth * 0.5))) : 0, s: 0, m: mask } } }
    for (const sd of [1, -1]) { const nn = nrm.clone().multiplyScalar(sd); for (let i = 1; i < n - 1; i++) { const a = vt(...poly[0], sd * th / 2, nn), b = vt(...poly[i], sd * th / 2, nn), c = vt(...poly[i + 1], sd * th / 2, nn); sd > 0 ? tri(a, b, c) : tri(a, c, b) } }
    for (let i = 0; i < n; i++) { const [a0, b0] = poly[i], [a1, b1] = poly[(i + 1) % n], e = new THREE.Vector2(a1 - a0, b1 - b0).normalize(), en = plane === 'xy' ? new THREE.Vector3(e.y, -e.x, 0) : new THREE.Vector3(e.y, 0, -e.x)
      const p = vt(a0, b0, th / 2, en), q = vt(a1, b1, th / 2, en), r = vt(a1, b1, -th / 2, en), s = vt(a0, b0, -th / 2, en); tri(p, s, r); tri(p, r, q) }
  }
  const tx = X(1) + 0.01, tH = Math.max(hh(1), 0.02), D = A.depth, TL = 0.2 + 0.25 * D
  const tailPoly = { fork: [[tx, tH * 0.9], [tx - TL, D * 0.62], [tx - TL * 0.55, 0], [tx - TL, -D * 0.62], [tx, -tH * 0.9]],
    moon: [[tx, tH], [tx - TL * 1.1, D * 0.75], [tx - TL * 0.6, D * 0.15], [tx - TL * 0.6, -D * 0.15], [tx - TL * 1.1, -D * 0.75], [tx, -tH]],
    round: [[tx, tH], [tx - TL * 0.7, D * 0.5], [tx - TL * 1.0, D * 0.15], [tx - TL * 1.0, -D * 0.15], [tx - TL * 0.7, -D * 0.5], [tx, -tH]],
    fan: [[tx, tH], [tx - TL * 1.1, D * 0.85], [tx - TL * 1.45, D * 0.3], [tx - TL * 1.05, 0], [tx - TL * 1.45, -D * 0.3], [tx - TL * 1.1, -D * 0.85], [tx, -tH]] }[A.tailFin] || []
  if (flat) slab(tailPoly.map(([a, b]) => [a, b * (A.width / D) * 0.42]), 'xz', 0.012); else slab(tailPoly, 'xy', 0.014)
  if (!flat && A.dorsal !== 'none') { const u0 = A.dorsal === 'long' ? 0.3 : 0.36, u1 = A.dorsal === 'long' ? 0.78 : 0.62, top = (u) => hh(u) * 0.96
    const ht = { low: 0.09, tall: 0.15, spiny: 0.13, long: 0.1 }[A.dorsal] * (0.6 + D)
    const poly = A.dorsal === 'spiny' ? [[X(u0), top(u0)], [X(u0 + 0.04), top(u0) + ht], [X(u0 + 0.1), top(u0 + 0.1) + ht * 0.7], [X(u0 + 0.17), top(u0 + 0.17) + ht * 0.9], [X(u1 - 0.04), top(u1) + ht * 0.55], [X(u1), top(u1)]]
      : A.dorsal === 'tall' ? [[X(u0), top(u0)], [X(u0 + 0.05), top(u0) + ht], [X(u1 - 0.06), top(u1) + ht * 0.55], [X(u1), top(u1)]]
        : [[X(u0), top(u0)], [X(u0 + 0.08), top(u0) + ht], [X(u1 - 0.04), top(u1) + ht * 0.5], [X(u1), top(u1)]]
    slab(poly, 'xy', 0.012)
    // anal fin
    const a0 = 0.66, a1 = 0.82; slab([[X(a0), -hh(a0) * 0.9], [X(a1), -hh(a1) * 0.9], [X(a1 - 0.02), -hh(a1) - ht * 0.5], [X(a0 + 0.05), -hh(a0) - ht * 0.45]], 'xy', 0.01) }
  if (flat) { // fringe fins all round the oval (flounder), in the body plane
    for (const sd of [1, -1]) { const pts = []; for (let i = 0; i <= 5; i++) { const u = 0.18 + i * 0.13; pts.push([X(u), sd * hw(u) * 0.98]) } for (let i = 5; i >= 0; i--) { const u = 0.18 + i * 0.13; pts.push([X(u) - 0.01, sd * (hw(u) + 0.045)]) }
      // the strip is concave-safe as two quads per step
      for (let i = 0; i < 5; i++) slab([pts[i], pts[i + 1], pts[10 - i], pts[11 - i]], 'xz', 0.01) } }
  if (lod === 'hi' && !flat) for (const sd of [1, -1]) { const u = 0.27, z = hw(u) * 0.85 * sd, y = -hh(u) * 0.35, l = 0.13 * (0.6 + D)
    // pectoral fin: a small swept triangle angled back and down
    const pts = [new THREE.Vector3(X(u), y, z), new THREE.Vector3(X(u) - l, y - l * 0.35, z + sd * l * 0.55), new THREE.Vector3(X(u) - l * 0.45, y - l * 0.6, z + sd * l * 0.2)]
    const nn = new THREE.Vector3().crossVectors(pts[1].clone().sub(pts[0]), pts[2].clone().sub(pts[0])).normalize()
    const v = (p, n) => ({ p, n, c: fin, f: { u: 0.3, v: 0, s: sd, m: 0 } }); tri(v(pts[0], nn), v(pts[1], nn), v(pts[2], nn)); const nb = nn.clone().negate(); tri(v(pts[0], nb), v(pts[2], nb), v(pts[1], nb)) }
  // ---- eyes: tiny octahedra (no ink), on the top for the flounder ----
  const eu = flat ? 0.2 : 0.12, er = Math.max(0.018, Math.min(0.035, A.depth * 0.09)) * (id === 'pufferfish' ? 1.3 : 1)
  for (const sd of [1, -1]) {
    const c = flat ? new THREE.Vector3(X(eu + (sd > 0 ? 0 : 0.07)), hh(eu) * 0.9 + 0.012, sd * hw(eu) * 0.25) : new THREE.Vector3(X(eu), hh(eu) * 0.32, sd * hw(eu) * 0.86)
    const o = new THREE.OctahedronGeometry(1, lod === 'hi' ? 1 : 0).toNonIndexed(), pa = o.attributes.position
    for (let i = 0; i < pa.count; i += 3) { const vs = [0, 1, 2].map(j => { const n = new THREE.Vector3().fromBufferAttribute(pa, i + j); const p = n.clone().multiplyScalar(er).add(c); const hl = n.x > 0.45 && n.y > 0.45 && Math.abs(n.z) < 0.6
      return { p, n: n.clone(), c: hl ? white : eye, f: { u: eu, v: 0.3, s: sd, m: 0 }, ink: 0 } }); tri(...vs) }
  }
  // ---- extras ----
  if (A.whiskers) { const wl = 0.12 * A.whiskers; for (const sd of [1, -1]) { const r = 0.006, b0 = new THREE.Vector3(X(0.04), -hh(0.04) * 0.4, sd * hw(0.04) * 0.6), tip = b0.clone().add(new THREE.Vector3(-wl * 0.35, -wl * 0.45, sd * wl * 0.8))
    const ax = tip.clone().sub(b0).normalize(), pp = new THREE.Vector3(0, 1, 0).cross(ax).normalize(), qq = ax.clone().cross(pp)
    for (let k = 0; k < 3; k++) { const a0 = k / 3 * Math.PI * 2, a1 = (k + 1) / 3 * Math.PI * 2, d0 = pp.clone().multiplyScalar(Math.cos(a0)).addScaledVector(qq, Math.sin(a0)), d1 = pp.clone().multiplyScalar(Math.cos(a1)).addScaledVector(qq, Math.sin(a1))
      const v = (p, n) => ({ p, n, c: fin, f: { u: 0, v: 0, s: sd, m: 0 }, ink: 0 }); tri(v(b0.clone().addScaledVector(d0, r), d0), v(b0.clone().addScaledVector(d1, r), d1), v(tip, d0.clone().add(d1).normalize())) } } }
  if (A.spikes && lod === 'hi') { for (let i = 0; i < 10; i++) { const u = 0.25 + (i % 5) * 0.13, a = (i < 5 ? 1 : -1) * (0.55 + 0.25 * ((i * 7) % 3) / 2) + Math.PI / 2, ca = Math.cos(a), sa = Math.sin(a)
      const base = new THREE.Vector3(X(u), sa * hh(u), ca * hw(u)), n = new THREE.Vector3(0, sa / hh(u), ca / hw(u)).normalize(), tip = base.clone().addScaledVector(n, 0.05), side = new THREE.Vector3(1, 0, 0), up = n.clone().cross(side).normalize()
      const b1 = base.clone().addScaledVector(side, 0.014), b2 = base.clone().addScaledVector(side, -0.008).addScaledVector(up, 0.012), b3 = base.clone().addScaledVector(side, -0.008).addScaledVector(up, -0.012)
      const v = (p) => ({ p, n, c: fin, f: { u, v: sa, s: ca, m: 0 } }); tri(v(b1), v(b2), v(tip)); tri(v(b2), v(b3), v(tip)); tri(v(b3), v(b1), v(tip)) } }
  const g = new THREE.BufferGeometry(), F = (a, n) => new THREE.Float32BufferAttribute(a, n)
  g.setAttribute('position', F(P, 3)); g.setAttribute('normal', F(N, 3)); g.setAttribute('color', F(Cc, 3)); g.setAttribute('aBelly', F(B, 3)); g.setAttribute('aC2', F(C2, 3)); g.setAttribute('aFP', F(FP, 4)); g.setAttribute('aPat', F(PT, 4))
  g.userData.ink = INK; g.userData.id = id; g.userData.lod = lod; g.userData.tris = P.length / 9
  g.computeBoundingSphere(); cache.set(key, g); return g
}
