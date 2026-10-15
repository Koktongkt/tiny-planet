// Refine round: merged, vertex-coloured scenery geometry (no textures, few draw calls).
// Houses: timber-and-plaster walls, gabled tiled roofs (overlapping slab rows), gutters + downpipe, porch, shutters,
// flower boxes, chimney, grime at the base. Trees: clustered foliage crowns with baked painterly light
// (shadowed underside, sunlit tops) + a warm rim in the shader. Edge vegetation: ferns, shrubs, tall grass. Mossy rocks.
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { wind } from './world.js'

const _c = new THREE.Color(), _c2 = new THREE.Color()
// bake one colour (optionally a vertical gradient / per-vertex function) into a geometry's color attribute
export function tint(g, c, f) {
  g = g.index ? g.toNonIndexed() : g; const p = g.attributes.position, a = new Float32Array(p.count * 3); _c.set(c)
  for (let i = 0; i < p.count; i++) { _c2.copy(_c); if (f) f(_c2, p.getX(i), p.getY(i), p.getZ(i), i); a[i * 3] = _c2.r; a[i * 3 + 1] = _c2.g; a[i * 3 + 2] = _c2.b }
  g.setAttribute('color', new THREE.BufferAttribute(a, 3)); if (g.attributes.uv) g.deleteAttribute('uv'); return g
}
const box = (w, h, d, x, y, z, c, f, rx = 0, ry = 0, rz = 0) => { const g = new THREE.BoxGeometry(w, h, d); if (rx || ry || rz) g.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(rx, ry, rz))); g.translate(x, y, z); return tint(g, c, f) }
const cyl = (r0, r1, h, seg, x, y, z, c, rx = 0, rz = 0) => { const g = new THREE.CylinderGeometry(r0, r1, h, seg); if (rx || rz) g.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(rx, 0, rz))); g.translate(x, y, z); return tint(g, c) }
const merge = (a) => { const m = mergeGeometries(a.filter(Boolean)); m.computeBoundingSphere(); return m }
const hash = (x, y, z) => { const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return s - Math.floor(s) }

// ---------- houses ----------
// local frame: x along the front, y up, +z out of the front door. Walls w x tall x D. Returns shell (outlined:
// plaster walls, gables, roof tile rows, chimney), detail (timber, gutters, porch, shutters, door; no outline) and glass.
export function houseGeos({ w, tall, roof, wall, curtain, seed = 0, porch = true }) {
  const D = 0.5, ov = 0.08, eave = tall - 0.015, ridge = tall + 0.31, half = D / 2 + 0.085, shell = [], det = [], glass = []
  const grime = (c, x, y) => { const k = Math.min(1, y / 0.09); c.multiplyScalar(0.8 + 0.2 * k); c.lerp(_c.set('#9a8a6a'), (1 - k) * 0.25) }
  shell.push(box(w + 0.03, 0.1, D + 0.03, 0, -0.03, 0, '#b9b0a2', (c, x, y, z) => c.multiplyScalar(0.85 + 0.2 * hash(Math.round(x * 22), Math.round(y * 30), Math.round(z * 22))))) // stone plinth (hides slope gaps)
  shell.push(box(w, tall, D, 0, tall / 2, 0, wall, (c, x, y, z) => { grime(c, x, y); c.multiplyScalar(0.97 + 0.06 * hash(Math.round(x * 9), Math.round(y * 9), seed)) }))
  // gable ends (plaster triangles) as a thin extruded triangle along x
  const tri = new THREE.Shape(); tri.moveTo(-D / 2, 0); tri.lineTo(D / 2, 0); tri.lineTo(0, ridge - tall - 0.02); tri.closePath()
  const gab = new THREE.ExtrudeGeometry(tri, { depth: w - 0.004, bevelEnabled: false }); gab.rotateY(Math.PI / 2); gab.translate(-(w - 0.004) / 2, tall, 0); shell.push(tint(gab, wall))
  // roof: 4 overlapping tile rows per side, each row a slab slightly proud of the one above (reads as tile courses)
  const ang = Math.atan2(ridge - eave, half), L = Math.hypot(ridge - eave, half), rows = 4, rc = new THREE.Color(roof)
  for (const sd of [-1, 1]) for (let r = 0; r < rows; r++) {
    const u0 = r / rows, u1 = (r + 1) / rows + 0.06, um = (u0 + u1) / 2, len = (u1 - u0) * L
    const y = ridge - (ridge - eave) * um + 0.012 + r * 0.004, z = sd * half * um
    const shade = 0.9 + 0.1 * (r / rows) + (sd > 0 ? 0.03 : -0.02)
    shell.push(box(w + ov * 2, 0.026, len, 0, y, z, rc.clone().multiplyScalar(shade), (c, x) => { c.multiplyScalar(0.94 + 0.12 * hash(Math.floor((x + 1) * 14), r, sd + seed)) }, sd * ang))
  }
  shell.push(box(w + ov * 2 + 0.01, 0.034, 0.05, 0, ridge + 0.012, 0, rc.clone().multiplyScalar(0.75))) // ridge cap
  // chimney (back slope) + cap
  const chx = w * 0.28, chz = -0.1
  shell.push(box(0.09, 0.36, 0.09, chx, tall + 0.3, chz, '#cfc3b0', (c, x, y) => c.multiplyScalar(0.88 + 0.16 * hash(Math.round(x * 30), Math.round(y * 25), 3))))
  det.push(box(0.11, 0.022, 0.11, chx, tall + 0.48, chz, '#9b8f80'))
  // timber frame (front/back/sides): corner posts, sill + mid + top rails, side braces
  const T = '#6e4a33', t = 0.022, fz = D / 2 + 0.004
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) det.push(box(t, tall, t, sx * (w / 2 - t / 2 + 0.004), tall / 2, sz * (D / 2 - t / 2 + 0.004), T))
  for (const sz of [-1, 1]) for (const y of [0.03, tall * 0.5, tall - 0.012]) det.push(box(w + 0.01, t * (y < 0.05 ? 1.6 : 0.9), 0.012, 0, y, sz * fz, y < 0.05 ? '#5d3f2c' : T))
  for (const sx of [-1, 1]) { const x = sx * (w / 2 + 0.004); for (const y of [0.03, tall * 0.5, tall - 0.012]) det.push(box(0.012, t * 0.9, D, x, y, 0, T))
    for (const s2 of [-1, 1]) det.push(box(0.012, Math.hypot(D / 2 - 0.03, tall * 0.5) * 0.92, t * 0.8, x, tall * 0.25, s2 * D / 4, T, null, s2 * Math.atan2(D / 2 - 0.03, tall * 0.5))) // braces
    det.push(box(0.012, ridge - tall - 0.04, t * 0.8, x * 1.002, tall + (ridge - tall) / 2 - 0.03, 0, T)) } // king post in the gable
  // front: door + frame, windows with frames, sills, shutters, flower boxes; side windows
  det.push(box(0.13, 0.23, 0.012, 0, 0.12, fz + 0.002, '#8a5a3c', (c, x, y) => c.multiplyScalar(0.9 + 0.12 * Math.sin(x * 160)))) // planked door
  det.push(box(0.16, 0.018, 0.02, 0, 0.245, fz + 0.004, T)); for (const sx of [-1, 1]) det.push(box(0.016, 0.24, 0.02, sx * 0.073, 0.12, fz + 0.004, T))
  det.push(box(0.014, 0.014, 0.012, 0.042, 0.12, fz + 0.012, '#e8c46a'))
  for (const sx of [-1, 1]) { const x = sx * w * 0.27, y = tall * 0.56
    glass.push(box(0.1, 0.12, 0.004, x, y, fz + 0.001, '#ffffff'))
    det.push(box(0.118, 0.014, 0.016, x, y + 0.066, fz + 0.006, T), box(0.13, 0.014, 0.03, x, y - 0.066, fz + 0.012, T), box(0.008, 0.12, 0.008, x, y, fz + 0.006, T), box(0.1, 0.008, 0.008, x, y, fz + 0.006, T))
    for (const c of [-1, 1]) det.push(box(0.04, 0.125, 0.008, x + c * 0.074, y, fz + 0.006, rc.clone().lerp(_c.set('#4a6a50'), 0.35), (cc, xx, yy) => cc.multiplyScalar(0.9 + 0.1 * Math.sin(yy * 220)))) // louvred shutters
    det.push(box(0.12, 0.03, 0.035, x, y - 0.09, fz + 0.02, '#8a5a3c'))
    for (let k = 0; k < 4; k++) det.push(box(0.03, 0.022, 0.025, x - 0.045 + k * 0.03, y - 0.066, fz + 0.022, k % 2 ? curtain : '#7fae5f'))
    det.push(box(0.03, 0.12, 0.004, x - 0.03, y, fz + 0.003, curtain), box(0.03, 0.12, 0.004, x + 0.03, y, fz + 0.003, curtain)) }
  for (const sx of [-1, 1]) for (const s2 of [-1, 1]) { glass.push(box(0.004, 0.11, 0.09, sx * (w / 2 + 0.003), tall * 0.56, s2 * 0.12, '#ffffff')); det.push(box(0.012, 0.012, 0.11, sx * (w / 2 + 0.008), tall * 0.56 - 0.062, s2 * 0.12, T)) }
  // gutters along both eaves + one downpipe
  for (const sz of [-1, 1]) det.push(cyl(0.013, 0.013, w + ov * 2, 6, 0, eave - 0.012, sz * (half + 0.018), '#8f8a84', 0, Math.PI / 2))
  det.push(cyl(0.009, 0.009, eave - 0.02, 5, w / 2 + ov - 0.01, (eave - 0.02) / 2, half + 0.018, '#8f8a84'))
  if (porch) { // porch: two posts, a little shed roof over the door, a stone step
    for (const sx of [-1, 1]) det.push(box(0.022, 0.29, 0.022, sx * 0.13, 0.145, fz + 0.15, T))
    shell.push(box(0.34, 0.02, 0.2, 0, 0.305, fz + 0.09, rc.clone().multiplyScalar(0.85), null, 0.32))
    det.push(box(0.3, 0.016, 0.016, 0, 0.285, fz + 0.15, T))
    det.push(box(0.22, 0.07, 0.12, 0, 0.02, fz + 0.06, '#c9c0b2', (c, x, y, z) => c.multiplyScalar(0.9 + 0.15 * hash(Math.round(x * 40), 1, Math.round(z * 40)))))
  }
  return { shell: merge(shell), detail: merge(det), glass: merge(glass), chimney: new THREE.Vector3(chx, tall + 0.49, chz) }
}

// ---------- trees ----------
// a crown made of overlapping lumpy blobs; colour baked as light from above-front (painterly: cool shadowed underside,
// warm-lit tops, darker core) — the instance colour multiplies on top so each tree keeps its own hue
function lump(r, det, x, y, z, sx = 1, sy = 1, sz = 1, seed = 0) {
  const g = new THREE.IcosahedronGeometry(r, det), p = g.attributes.position
  for (let i = 0; i < p.count; i++) { const vx = p.getX(i), vy = p.getY(i), vz = p.getZ(i), k = 1 + 0.13 * Math.sin(vx * 17 + seed) * Math.sin(vy * 15 + seed * 2) * Math.sin(vz * 13); p.setXYZ(i, vx * k * sx + x, vy * k * sy + y, vz * k * sz + z) }
  g.computeVertexNormals(); return g
}
const foliageLight = (cy, top) => (c, x, y, z) => { const up = (y - cy) / top, s = Math.max(0, Math.min(1, 0.5 + up * 0.75 + x * 0.25 + z * 0.35)); c.setRGB(0.62 + 0.5 * s, 0.68 + 0.42 * s, 0.6 + 0.3 * s); c.lerp(_c.set('#b9c8ff'), (1 - s) * 0.12) }
export function crownGeos() {
  const lumps = [[0.3, 0, 0.78, 0, 1, 1.05, 1], [0.24, 0.2, 0.95, 0.08], [0.23, -0.19, 0.92, -0.06], [0.22, 0.04, 1.05, -0.17], [0.21, -0.02, 1.17, 0.12], [0.19, 0.14, 0.72, 0.18]]
  const hi = merge(lumps.map(([r, x, y, z, ...s], k) => tint(lump(r, 1, x, y, z, s[0] || 1, s[1] || 1, s[2] || 1, k), '#ffffff', foliageLight(0.9, 0.4))))
  const lo = merge([tint(lump(0.4, 1, 0, 0.92, 0, 1, 1.12, 1, 2), '#ffffff', foliageLight(0.9, 0.42))])
  const lo2 = merge([tint(new THREE.IcosahedronGeometry(0.41, 0).scale(1, 1.12, 1).translate(0, 0.92, 0), '#ffffff', foliageLight(0.9, 0.42))])
  return { hi, lo, lo2 }
}
// layered fir: three stacked skirts, each darker underneath
export function firGeos() {
  const tier = (r, h, y, seg) => { const g = new THREE.ConeGeometry(r, h, seg, 1, true); g.translate(0, y, 0); return tint(g, '#ffffff', (c, x, yy) => { const s = Math.max(0, Math.min(1, (yy - (y - h / 2)) / h)); c.setRGB(0.66 + 0.4 * s, 0.7 + 0.36 * s, 0.68 + 0.26 * s) }) }
  const cap = (r, y) => { const g = new THREE.CircleGeometry(r, 9); g.rotateX(Math.PI / 2); g.translate(0, y, 0); return tint(g, '#7e8a80') }
  const hi = merge([tier(0.34, 0.55, 0.62, 9), cap(0.34, 0.345), tier(0.27, 0.5, 0.92, 9), cap(0.27, 0.67), tier(0.19, 0.45, 1.2, 8), cap(0.19, 0.975)])
  const lo = merge([tint(new THREE.ConeGeometry(0.32, 1.25, 7).translate(0, 0.9, 0), '#ffffff', (c, x, y) => { const s = (y - 0.28) / 1.25; c.setRGB(0.7 + 0.36 * s, 0.74 + 0.3 * s, 0.7 + 0.22 * s) })])
  return { hi, lo }
}
// foliage material tweak: warm sun-side rim + cool sky-side rim (subsurface-ish), on top of the windify sway
export function foliage(mat, amp = 0.08, base = 0.4) {
  const prevKey = mat.customProgramCacheKey
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = wind.time
    sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      vec4 wp = instanceMatrix * vec4(0.,0.,0.,1.);
      float w = max(position.y - ${base.toFixed(2)}, 0.);
      float g = sin(uTime*1.6 + wp.x*0.9 + wp.z*0.7) * 0.6 + sin(uTime*3.1 + wp.y*1.7)*0.4;
      transformed.x += w*w*${amp.toFixed(3)}*g; transformed.z += w*w*${amp.toFixed(3)}*0.6*cos(uTime*1.3+wp.x);`)
    sh.fragmentShader = sh.fragmentShader.replace('#include <dithering_fragment>', `#include <dithering_fragment>
      { float ndv = abs(dot(normalize(vNormal), normalize(vViewPosition))); float rim = pow(1. - ndv, 3.);
        gl_FragColor.rgb += rim * (vec3(1.,.86,.55) * .22 * clamp(dot(normalize(vNormal), vec3(0.,1.,0.)) + .4, 0., 1.) + vec3(.12,.16,.22) * .35); }`)
  }
  mat.customProgramCacheKey = () => 'foliage' + amp + '_' + base
  return mat
}

// ---------- edge vegetation ----------
export function fernGeo(fronds = 6) { // arching fronds: each a tapered bent strip (few tris)
  const parts = []
  for (let k = 0; k < fronds; k++) { const a = (k / fronds) * Math.PI * 2 + (k % 2) * 0.3, pos = [], idx = [], N = 4, len = 0.15 + (k % 3) * 0.025
    for (let i = 0; i <= N; i++) { const u = i / N, r = u * len, y = Math.sin(u * 2.3) * len * 0.55 - u * u * 0.02, wdt = 0.028 * Math.sin(Math.PI * Math.min(1, u * 1.15 + 0.08))
      const cx = Math.cos(a) * r, cz = Math.sin(a) * r, px = -Math.sin(a) * wdt, pz = Math.cos(a) * wdt
      pos.push(cx - px, y, cz - pz, cx + px, y + 0.004, cz + pz); if (i < N) { const j = i * 2; idx.push(j, j + 1, j + 2, j + 1, j + 3, j + 2) } }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals()
    parts.push(tint(g, '#ffffff', (c, x, y) => c.setRGB(0.7 + y * 3, 0.78 + y * 2.6, 0.62 + y * 1.4))) }
  return merge(parts)
}
export function tallGrassGeo(blades = 7) {
  const parts = []
  for (let k = 0; k < blades; k++) { const a = k * 2.4, r = 0.012 + (k % 3) * 0.012, h = 0.13 + (k % 4) * 0.035, lean = 0.25 + (k % 3) * 0.12
    const g = new THREE.BufferGeometry(), bx = Math.cos(a) * r, bz = Math.sin(a) * r, tx = bx + Math.cos(a) * lean * h, tz = bz + Math.sin(a) * lean * h, w = 0.011, sx = -Math.sin(a) * w, sz = Math.cos(a) * w
    g.setAttribute('position', new THREE.Float32BufferAttribute([bx - sx, 0, bz - sz, bx + sx, 0, bz + sz, (bx + tx) / 2 - sx * 0.6, h * 0.55, (bz + tz) / 2 - sz * 0.6, (bx + tx) / 2 + sx * 0.6, h * 0.55, (bz + tz) / 2 + sz * 0.6, tx, h, tz], 3)); g.setIndex([0, 1, 2, 1, 3, 2, 2, 3, 4]); g.computeVertexNormals()
    parts.push(tint(g, '#ffffff', (c, x, y) => { const s = y / h; c.setRGB(0.66 + 0.45 * s, 0.74 + 0.36 * s, 0.56 + 0.2 * s) })) }
  return merge(parts)
}
export function shrubGeo() { return merge([[0.11, 0, 0.07, 0], [0.085, 0.09, 0.06, 0.03], [0.08, -0.08, 0.055, -0.03], [0.07, 0.02, 0.12, 0.05]].map(([r, x, y, z], k) => tint(lump(r, 1, x, y, z, 1, 0.8, 1, k + 5), '#ffffff', foliageLight(0.08, 0.12)))) }
export function shrubLo() { return merge([tint(lump(0.13, 0, 0, 0.07, 0, 1.1, 0.75, 1.05, 9), '#ffffff', foliageLight(0.07, 0.1))]) }
// rock with a moss cap: verts facing up turn mossy green, the rest stays stone (one geometry, vertex colours)
export function rockGeo(det = 1, seed = 1) {
  const g = new THREE.IcosahedronGeometry(0.1, det), p = g.attributes.position
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), k = 1 + 0.22 * Math.sin(x * 31 + seed) * Math.sin(z * 27 + y * 13); p.setXYZ(i, x * k * 1.25, Math.max(y * k * 0.62, -0.02) + 0.02, z * k) }
  const ng = g; ng.computeVertexNormals(); const nr = ng.attributes.normal
  return tint(ng, '#c4bcae', (c, x, y, z, i) => { const up = nr.getY(i), m = Math.max(0, Math.min(1, (up - 0.55) * 3.2 + 0.4 * Math.sin(x * 50 + z * 40))); c.multiplyScalar(0.86 + 0.18 * hash(Math.round(x * 60), Math.round(y * 60), seed)); c.lerp(_c.set(m > 0.6 ? '#7fae5f' : '#94b86a'), m) })
}
