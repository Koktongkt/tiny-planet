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

// Painted face decal (same technique as her face): a 2x2 canvas atlas [eyes open | shut] x [mouth open | shut] drawn
// by `paint(ctx, eyesOpen, mouthOpen)` in head units (y up), and a grid over the face region [X0..X1]x[Y0..Y1] shot
// onto the head from the front and lifted off it a hair. mat() makes one material per pet instance (its own uCell).
export function faceDecal(sdf, { X0, X1, Y0, Y1, paint, lift = 0.012, NX = 48, NY = 34 }) {
  const hit = hitOf(sdf), grad = gradOf(sdf)
  let atlas = null
  const tex = () => { if (atlas) return atlas
    const CW = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches ? 384 : 512
    const CH = Math.round(CW * (Y1 - Y0) / (X1 - X0)), c = document.createElement('canvas'); c.width = CW * 2; c.height = CH * 2; const x = c.getContext('2d')
    for (let i = 0; i < 4; i++) { const cx = i % 2, cy = i >> 1 // cell (col, row): col = mouth shut, row = eyes shut
      x.save(); x.beginPath(); x.rect(cx * CW, cy * CH, CW, CH); x.clip()
      x.setTransform(CW / (X1 - X0), 0, 0, -CH / (Y1 - Y0), cx * CW - X0 * CW / (X1 - X0), cy * CH + Y1 * CH / (Y1 - Y0))
      paint(x, cy === 0, cx === 0); x.restore() }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter
    return (atlas = t) }
  const mat = () => new THREE.ShaderMaterial({ transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4,
    uniforms: { map: { value: tex() }, uCell: { value: 0 }, uLight: CEL_U.uLight, uAmb: CEL_U.uAmb },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `uniform sampler2D map; uniform float uCell; uniform vec3 uLight, uAmb; varying vec2 vUv;
      void main(){ vec2 u = clamp(vUv, .004, .996), cell = vec2(mod(uCell, 2.), floor(uCell*.5));
        vec4 c = texture2D(map, vec2((cell.x + u.x)*.5, (1. - cell.y + u.y)*.5)); if (c.a < .01) discard;
        gl_FragColor = vec4(c.rgb*(uLight*.92 + uAmb), c.a);
        #include <colorspace_fragment>
      }` })
  const pos = [], uv = [], ok = [], idx = [], n = new THREE.Vector3()
  for (let j = 0; j <= NY; j++) for (let i = 0; i <= NX; i++) { const u = i / NX, v = j / NY, x = X0 + u * (X1 - X0), y = Y0 + v * (Y1 - Y0)
    const t = hit([x, y, 2], [0, 0, -1], 0, 2.6); let z = 0
    if (t !== null) { z = 2 - t; grad(x, y, z, n) }
    pos.push(x + n.x * lift, y + n.y * lift, z + n.z * lift); uv.push(u, v); ok.push(t !== null && n.z > 0.02) }
  for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) { const a = j * (NX + 1) + i, b = a + 1, c = a + NX + 1, d = c + 1
    if (ok[a] && ok[b] && ok[c] && ok[d]) idx.push(a, b, d, a, d, c) }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(idx); geo.computeBoundingSphere()
  return { geo, mat }
}
// a cream-white eye with a brown iris pushed toward the nose (white on the outer side only), ink rim, upper lid, one
// highlight; or a closed lash. s = -1 / +1 for the eye on the -x / +x side. Shared by Pip and Mochi.
export function paintEye(x, s, cx, y, rx, ry, open, ink = '#3a2216') {
  const el = (ex, ey, erx, ery) => { x.beginPath(); x.ellipse(ex, ey, erx, ery, 0, 0, Math.PI * 2) }
  if (!open) { x.beginPath(); x.moveTo(cx - rx * 0.98, y + 0.01); x.quadraticCurveTo(cx, y - ry * 0.55, cx + rx * 0.98, y + 0.01); x.lineWidth = 0.042; x.strokeStyle = ink; x.lineCap = 'round'; x.stroke(); return }
  el(cx, y, rx + 0.017, ry + 0.017); x.fillStyle = '#2a170e'; x.fill()
  el(cx, y, rx, ry); x.fillStyle = '#fffaf4'; x.fill()
  x.save(); el(cx, y, rx, ry); x.clip()
  const IX = rx * 0.78, IY = ry * 0.98, iy = y - ry * 0.02, ix = cx - s * rx * 0.24
  const g = x.createLinearGradient(0, iy + IY, 0, iy - IY); g.addColorStop(0, '#24130b'); g.addColorStop(0.45, '#40220f'); g.addColorStop(0.8, '#74431f'); g.addColorStop(1, '#93592c')
  el(ix, iy, IX + 0.008, IY + 0.008); x.fillStyle = '#24130b'; x.fill()
  el(ix, iy, IX, IY); x.fillStyle = g; x.fill()
  el(ix, iy + 0.012, IX * 0.62, IY * 0.6); x.fillStyle = 'rgba(22,11,6,.72)'; x.fill() // pupil
  el(ix, iy - IY * 0.72, IX * 0.62, IY * 0.3); x.fillStyle = 'rgba(196,128,72,.42)'; x.fill() // warm lower glow
  x.restore()
  x.beginPath(); x.ellipse(cx, y, rx + 0.01, ry + 0.01, 0, 0.1 * Math.PI, 0.9 * Math.PI); x.lineWidth = 0.034; x.strokeStyle = ink; x.lineCap = 'round'; x.stroke() // upper lid
  x.fillStyle = '#ffffff'; x.beginPath(); x.arc(ix + rx * 0.21, iy + ry * 0.37, rx * 0.28, 0, 7); x.fill()
}
