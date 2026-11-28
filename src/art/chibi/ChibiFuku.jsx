// DRAFT Grandma Fuku — not used in the game. Preview: ?view=charstudio&dev=chibi-drafts&char=fuku
// A lazy chibi on the shared pipeline (~2.5 heads), matched to the turnaround sheet
// (docs/characters/ref/fuku-pass8-compare.jpg). Open round eyes behind wire glasses, a big grey dome with a top bun,
// a purple wrap cardigan with a cream V collar and a hem flap over a deeper purple A-line skirt to the ankle,
// a cream scalloped apron, a pincushion, and hands clasped at the waist.
import * as THREE from 'three'
import React, { useEffect, useRef } from 'react'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { Character, cel, spec, mkOutline, coreSDF } from '../../GhibliPerson.jsx'
import { FUKU_MOTION } from './motion.js'
import { makeLife, lifeStep, lifePost } from './life.js'
import { HR, MIDFACE, MID_FADE, EYE, headSDF, makeFace } from './castFace.jsx'
import { part, tagAW, sm, mergeHair, makeHairMat, makeHairInk } from './castHair.js'
import { q } from '../../common.jsx'

const TOUCH = typeof window !== 'undefined' && matchMedia('(pointer: coarse)').matches
const LIFE_OFF = q.has('still') && !q.has('life')
const SKIN = '#f6cdb0'
const HAIR_C = '#d2ccc4'
const HAIR_BAND = '#efe6dc'
const GLASS = '#5a3a24'
const CARDIGAN = '#9a73a0'
const CARDIGAN_HEM = '#8c6592'
const SKIRT = '#88618f'
const CREAM = '#f4ead6'
const COLLAR = '#efe6d6'
const FUKU_HAIR_OFF = new Float32Array(12)
// her own jaw: wider, fuller and a touch lower than the shared CHEEK, so the lower face is broad and round and the
// cheeks sit down toward the chin (same chin bottom). Used by the body bake (body.cheek) and the face decal.
const FUKU_CHEEK = [0, -0.0390, 0.0120, 0.0535, 0.0165, 0.0420, 0.0180, 0.0100]
// pass 13, traced from the sheet's front face (A = face half-width): straight sides from the temples down to just
// below the eyes, then a half-ellipse bottom 0.5A tall (no flat part, no corners), chin 0.84A below the eye line.
// The jaw is an ellipsoid stretched up by h (8th value), so it has straight sides above its centre.
const EYE_DX = 0.0030 // eyes and brows this much further apart (each side), glasses follow
const FEAT_DY = -0.0033 // brows, eyes, nose, mouth, blush and glasses sit this much lower on the face
const HEAD_W = 0.95, FUKU_HR = [HR[0] * HEAD_W, HR[1], HR[2]]


// her own glasses: round, heavier dark rims, a low curved bridge and arms that run back to the ears
function fukuGlasses() {
  const EX = EYE.x + EYE_DX, R = 0.0160, T = 0.0017, Z = 0.0552, EY = EYE.y - FEAT_DY - 0.0026, parts = [] // sits a little low: space between the eye and the bottom rim
  // half-rim: the frame runs only along the bottom half of each lens
  for (const sd of [-1, 1]) { const g = new THREE.TorusGeometry(R, T, 8, 16, Math.PI); g.rotateZ(Math.PI); g.rotateY(sd * 0.2); g.translate(sd * EX, EY + 0.0006, Z); parts.push(g) }
  const inner = EX - R * Math.cos(0.2), br = new THREE.TorusGeometry(inner, 0.0013, 6, 14, Math.PI)
  br.scale(1, 0.42, 1); br.translate(0, EY + 0.0006, Z + 0.0024); parts.push(br)
  for (const sd of [-1, 1]) {
    const a = new THREE.Vector3(sd * (EX + R * 0.98), EY + 0.0006, Z - 0.0032), b = new THREE.Vector3(sd * 0.0640, EY + 0.0010, 0.008)
    const len = a.distanceTo(b), t = new THREE.CylinderGeometry(0.0010, 0.0010, len, 6)
    t.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize()))
    t.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2); parts.push(t)
  }
  const g = mergeGeometries(parts.map(p => { p = p.index ? p.toNonIndexed() : p; p.deleteAttribute('uv'); return p })); g.computeVertexNormals(); return g
}
const Face = makeFace({ kind: 'fuku', glasses: GLASS, defaultSquint: 0.1, blush: 0.72, cheek: FUKU_CHEEK, hr: FUKU_HR, blushAt: { dx: 0.0012, dy: -0.0012, dr: 0.98 }, featDy: FEAT_DY, featOff: { mouth: 0.0045, nose: 0.0020, eyeScale: 1.14, eyeDx: EYE_DX, brow: { color: '#c9c2ba', edge: '#9d948c', width: 0.0056 } }, glassesGeo: fukuGlasses })

// skull HR is ~[0.058, 0.050, 0.055]; the sheet cap sits ~10–15% wider than the face, ears out
const EAR = { x: 0.0670, y: -0.0225, z: 0.006 }
// pass 20 (KT: start simple): one ball wrapping the head, its front edge the hairline across the forehead, and one
// bun ball slightly behind the top of the head. No locks or painted lines yet.
const BUN_C = [0, 0.068, -0.050], BUN_R = 0.026, BUN_S = [1.22, 1, 1.08] // bun a little wider than tall
const H_CAP = [[0, 0.010, -0.019], [0.0735, 0.0640, 0.0690]]
// pass 22: the forehead hairline traced from the sheet: a rounded block (superellipse, power 4) with a flat top, straight
// sides down the temples and rounded corners, plus a small dip at the parting. Head-frame units.
const HL = { a: 0.0535, top: 0.040, bot: -0.072, p: 4, dip: 0.0035, dipW: 0.0075, low: -0.008 }
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t) }
// distance from the skull centre to the skin along a direction
function skinR(dx, dy, dz) { let lo = 0, hi = 0.12
  for (let n = 0; n < 26; n++) { const m = (lo + hi) / 2; if (headSDF(dx * m, dy * m, dz * m, FUKU_CHEEK, FUKU_HR) < 0) lo = m; else hi = m }
  return lo }
// reshape the cap ball: (1) behind, pull the dome in and let its mass sit lower, so the back of the head rounds down
// to the nape instead of bulging high; (2) in front, lay the hair just over the skin down to the temples, cut the
// forehead opening out of the mesh along the traced line, snap the cut edge exactly onto that line and roll it down
// onto the skin, so the hairline is clean and the ink hull draws it as a line
function shapeCap(g) {
  const P = g.attributes.position, [cc] = H_CAP, v = new THREE.Vector3(), n = P.count
  const se = new Float32Array(n), fr = new Float32Array(n)
  const winAt = (x) => { const top = HL.top - HL.dip * Math.exp(-((x / HL.dipW) ** 2)); return [(top + HL.bot) / 2, (top - HL.bot) / 2] }
  const seOf = (x, y) => { const [cy, hb] = winAt(x); return Math.abs(x / HL.a) ** HL.p + Math.abs((y - cy) / hb) ** HL.p }
  const onSkin = (x, y, z, off) => { v.set(x, y, z); v.normalize(); const r = skinR(v.x, v.y, v.z) + off; return [v.x * r, v.y * r, v.z * r] }
  for (let i = 0; i < n; i++) {
    let x = P.getX(i), y = P.getY(i), z = P.getZ(i)
    if (z < cc[2]) { const k = Math.min(1, (cc[2] - z) / 0.066); z = cc[2] + (z - cc[2]) * 0.80; y -= 0.007 * k * k * (y < cc[1] + 0.03 ? 1 : 0.5) }
    fr[i] = smooth(-0.005, 0.02, z); se[i] = seOf(x, y)
    if (fr[i] > 0) {
      v.set(x, y, z); const r = v.length(), cover = smooth(HL.low - 0.006, HL.low + 0.004, y)
      const lip = smooth(1.45, 1.0, se[i]) ** 1.6 * cover // roll the hair down onto the skin as it nears the hairline
      const [sx, sy, sz] = onSkin(x, y, z, 0), sr = Math.hypot(sx, sy, sz)
      const out = r + (Math.max(r, sr + 0.0100) - r) * cover, nr = r + ((out + (sr + 0.0035 - out) * lip) - r) * fr[i]
      v.normalize(); x = v.x * nr; y = v.y * nr; z = v.z * nr
    }
    P.setXYZ(i, x, y, z)
  }
  // cut the opening: drop every front triangle with a corner inside the hairline; the corners those triangles share
  // with kept ones form the rim
  const I = g.index.array, keep = [], cut = new Uint8Array(n), used = new Uint8Array(n), edge = new Uint8Array(n)
  for (let t = 0; t < I.length; t += 3) {
    const tri = [I[t], I[t + 1], I[t + 2]]
    if (tri.some(k => fr[k] > 0.5 && seOf(P.getX(k), P.getY(k)) < 1)) { tri.forEach(k => { cut[k] = 1 }); continue }
    keep.push(...tri); tri.forEach(k => { used[k] = 1 })
  }
  for (let i = 0; i < n; i++) if (cut[i] && used[i] && P.getY(i) > HL.low) edge[i] = 1
  // snap the rim onto the line (scale out from the window centre to se = 1) and seat it on the skin
  for (let i = 0; i < n; i++) if (edge[i]) {
    const x = P.getX(i), y = P.getY(i), [cy] = winAt(x), s0 = seOf(x, y), l = Math.pow(s0, -1 / HL.p)
    const [px, py, pz] = onSkin(x * l, cy + (y - cy) * l, P.getZ(i), 0.0025); P.setXYZ(i, px, py, pz)
  }
  g.setIndex(keep); g.computeVertexNormals(); return g
}
// the sheet draws the hairline as a line: a thin tube along the traced line, seated on the skin
function hairlineInk() {
  const pts = [], winAt = (x) => { const top = HL.top - HL.dip * Math.exp(-((x / HL.dipW) ** 2)); return [(top + HL.bot) / 2, (top - HL.bot) / 2] }
  for (let i = 0; i <= 80; i++) {
    const th = Math.PI * (-0.5 + i / 80) // from the left side round the top to the right side, as a superellipse
    const c = Math.cos(th), sn = Math.sin(th)
    let x = -Math.sign(sn) * HL.a * Math.abs(sn) ** (2 / HL.p); if (Math.abs(sn) < 1e-6) x = 0
    const [cy, hb] = winAt(x); x *= 0.972; const y = cy + hb * 0.975 * Math.abs(c) ** (2 / HL.p) // just inside the hair edge
    if (y < HL.low) continue
    // find the skin along a ray from the centre through (x, y) on the front
    let lo = 0, hi = 0.12; for (let k = 0; k < 26; k++) { const m = (lo + hi) / 2; if (headSDF(x, y, m, FUKU_CHEEK, FUKU_HR) < 0) lo = m; else hi = m }
    pts.push(new THREE.Vector3(x, y, lo + 0.0042))
  }
  const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 120, 0.0012, 6, false)
  g.setAttribute('aSkin', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count).fill(0.48), 1))
  g.deleteAttribute('uv'); return g
}
let CAP_GEO = null
function fukuHair() {
  const ball = new THREE.SphereGeometry(1, 72, 54), ballS = new THREE.SphereGeometry(1, 14, 10)
  const parts = [
    (CAP_GEO = shapeCap(part(ball, ...H_CAP))),
    hairlineInk(),
    part(ball, BUN_C, BUN_S.map(k => BUN_R * k)),
    // ears as on the sheet: a big C, widest at the top and tucked in toward the jaw at the bottom (top tilted out),
    // with a darker hollow on the front face
    ...[-1, 1].map(d => part(ballS, [d * EAR.x, EAR.y, EAR.z], [0.0074, 0.0130, 0.0102], [0, d * 0.7, -d * 0.26], 1)),
    ...[-1, 1].map(d => part(ballS, [d * (EAR.x + 0.0036), EAR.y + 0.0010, EAR.z + 0.0030], [0.0032, 0.0086, 0.0058], [0, d * 0.7, -d * 0.26], 2)),
  ]
  tagAW(parts[0], () => [3, 0.1])
  tagAW(parts[1], () => [3, 0.1])
  tagAW(parts[2], (x, y) => [2, sm(0.04, 0.09, y)])
  for (let k = 3; k < parts.length; k++) tagAW(parts[k], () => [3, 0])
  return mergeHair(parts)
}
const HAIR_GEO = fukuHair()
const hairMat = makeHairMat(SKIN, HAIR_C, HAIR_BAND, FUKU_HAIR_OFF)
// a small depth bias so the hair's own smooth edge wins where it meets the faceted skin at the hairline (no ragged cut)
hairMat.polygonOffset = true; hairMat.polygonOffsetFactor = -1; hairMat.polygonOffsetUnits = -2
const hairInk = makeHairInk(FUKU_HAIR_OFF)

// pass 30: hair detail as drawn lines a little darker than the hair (hair shader aSkin ~0.34 = ~27% darker), laid on
// the cap and the bun. A separate mesh with the hair material and no ink hull, so the lines stay soft grey, not black.
// Lines are curves in (azimuth, elevation) round the cap centre, projected onto the shaped cap by ray casting.
const LINE_SHADE = 0.37
function hairLinesGeo() {
  const cc = new THREE.Vector3(...H_CAP[0]), cap = new THREE.Mesh(CAP_GEO, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }))
  CAP_GEO.computeBoundingSphere(); cap.updateMatrixWorld()
  const ray = new THREE.Raycaster(), dir = new THREE.Vector3()
  const onCap = (az, el) => { dir.set(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el))
    ray.set(cc.clone().addScaledVector(dir, 0.2), dir.clone().negate()); const h = ray.intersectObject(cap)[0]
    if (!h || h.point.distanceTo(cc) < 0.045) return null
    return h.point.addScaledVector(dir, 0.0002) }
  const tubes = []
  const tube = (pts, r) => { if (pts.length < 4) return
    const curve = new THREE.CatmullRomCurve3(pts), N = Math.max(12, pts.length * 3), R = 6, g = new THREE.TubeGeometry(curve, N, r, R, false)
    const P = g.attributes.position // taper both ends to a point
    for (let i = 0; i <= N; i++) { const t = i / N, k = Math.min(1, Math.min(t, 1 - t) / 0.18) ** 0.7, c = curve.getPointAt(t)
      for (let j = 0; j <= R; j++) { const v = i * (R + 1) + j; P.setXYZ(v, c.x + (P.getX(v) - c.x) * k, c.y + (P.getY(v) - c.y) * k, c.z + (P.getZ(v) - c.z) * k) } }
    g.deleteAttribute('uv'); g.deleteAttribute('normal'); g.computeVertexNormals(); tubes.push(g) }
  // a lock line: runs round the head at about its starting height first, then rises into the bun at the back
  const sweep = (az0, el0, az1, el1, rise = 2.2, sag = 0) => { const pts = []
    for (let i = 0; i <= 32; i++) { const t = i / 32, a = az0 + (az1 - az0) * t, e = el0 + (el1 - el0) * Math.pow(t, rise) - sag * Math.sin(Math.PI * t)
      const p = onCap(a, e); if (p) pts.push(p) }
    tube(pts, 0.0008) }
  const BUN_EL = 0.98
  // centre parting (pass 33, traced from KT's drawing): seen from the front, a U-bottomed V. From the dip in the
  // hairline each line rises diagonally outward, then curves round to run straight up toward the top of the head.
  // Points are front-view (x, y) in the head frame, projected straight back onto the cap.
  const PART = [[0.0015, 0.0368], [0.008, 0.0412], [0.0155, 0.0470], [0.0215, 0.0530], [0.0252, 0.0590], [0.0268, 0.0650], [0.0272, 0.0705]]
  const fromFront = (x, y) => { ray.set(new THREE.Vector3(x, y, 0.3), new THREE.Vector3(0, 0, -1)); const h = ray.intersectObject(cap)[0]
    return h && h.point.z > 0 ? h.point.add(new THREE.Vector3(0, 0, 0.0002)) : null }
  const along = (ctrl, d, n = 40) => { const c = new THREE.CatmullRomCurve3(ctrl.map(([x, y]) => new THREE.Vector3(d * x, y, 0)), false, 'centripetal'), pts = []
    for (let i = 0; i <= n; i++) { const q = c.getPoint(i / n), p = fromFront(q.x, q.y); if (p) pts.push(p) } return pts }
  // more lock lines of the same shape, nested outward down both sides: each starts further along the hairline and
  // curves up the same way (a little larger each time)
  const hlY = (x) => { const top = HL.top - HL.dip * Math.exp(-((x / HL.dipW) ** 2)), cy = (top + HL.bot) / 2, hb = (top - HL.bot) / 2
    return cy + hb * Math.max(0, 1 - Math.abs(x / HL.a) ** HL.p) ** (1 / HL.p) }
  const NEST = [[0.0135, 1.08], [0.0255, 1.16], [0.0365, 1.24]]
  const nested = NEST.map(([x0, k]) => PART.map(([x, y]) => [x0 + (x - PART[0][0]) * k, hlY(x0) + 0.0012 + (y - PART[0][1]) * k]))
  for (const d of [-1, 1]) {
    tube(along(PART, d), 0.0008)
    for (const c of nested) tube(along(c, d), 0.0008)
    // sides: locks from above the ears sweeping back and up into the bun
    sweep(d * 0.95, 0.18, d * 2.95, BUN_EL - 0.12, 2.0)
    sweep(d * 1.45, -0.02, d * 3.02, BUN_EL - 0.18, 1.8)
    // back: scallops curving up from the nape into the bun
    sweep(d * 2.05, -0.28, d * 3.08, BUN_EL - 0.26, 1.4)
  }
  // bun: a swirl facing up and back (as the sheet draws it), winding in from the rim to the centre
  { const A = new THREE.Vector3(0, 0.62, -0.78).normalize(), U = new THREE.Vector3(1, 0, 0), V = new THREE.Vector3().crossVectors(A, U)
    const pts = []
    for (let i = 0; i <= 70; i++) { const t = i / 70, u = 0.3 + t * Math.PI * 3.2, ph = 1.35 * (1 - t) + 0.12
      const d = A.clone().multiplyScalar(Math.cos(ph)).addScaledVector(U, Math.sin(ph) * Math.cos(u)).addScaledVector(V, Math.sin(ph) * Math.sin(u))
      const r = BUN_R * 1.012; pts.push(new THREE.Vector3(BUN_C[0] + d.x * r * BUN_S[0], BUN_C[1] + d.y * r * BUN_S[1], BUN_C[2] + d.z * r * BUN_S[2])) }
    tube(pts, 0.0008) }
  const g = mergeGeometries(tubes); const n = g.attributes.position.count
  g.setAttribute('aSkin', new THREE.BufferAttribute(new Float32Array(n).fill(LINE_SHADE), 1))
  tagAW(g, (x, y) => [3, 0.1]); return g
}
const LINES_GEO = hairLinesGeo()
const linesMat = makeHairMat(SKIN, HAIR_C, HAIR_BAND, FUKU_HAIR_OFF)
linesMat.polygonOffset = true; linesMat.polygonOffsetFactor = -2; linesMat.polygonOffsetUnits = -4
function FukuHair({ set }) {
  return <group ref={set('hair')}><mesh geometry={HAIR_GEO} material={hairMat} /><mesh geometry={HAIR_GEO} material={hairInk} /><mesh geometry={LINES_GEO} material={linesMat} /></group>
}

const paint = (g, hex) => {
  const col = new THREE.Color(hex), src = g.index ? g.toNonIndexed() : g
  const a = new Float32Array(src.attributes.position.count * 3)
  for (let i = 0; i < a.length; i += 3) { a[i] = col.r; a[i + 1] = col.g; a[i + 2] = col.b }
  src.setAttribute('color', new THREE.BufferAttribute(a, 3)); return src
}

const vcMat = (() => { const m = cel('#ffffff').clone(); m.vertexColors = true; m.defines = { KIND: 1 }; m.polygonOffset = true; m.polygonOffsetFactor = -1; m.polygonOffsetUnits = -2; return m })()
// parts keep their own smooth normals (computed before merging) so the ink hull has no cracks along seams
const merged = (parts) => mergeGeometries(parts.map(p => { p = p.index ? p.toNonIndexed() : p; if (p.attributes.uv) p.deleteAttribute('uv'); return p }))
const inkMat = mkOutline(false)

// --- body helpers in world (spec) units; every piece is converted to its bone's local frame ---
// skirt surface radius at height y (matches the SDF long skirt in GhibliPerson core()); z is squashed by 0.86
function surfZ(S, x, y) {
  let lo = 0, hi = 0.2; for (let n = 0; n < 22; n++) { const m = (lo + hi) / 2; if (coreSDF(S, x, y, m) < 0) lo = m; else hi = m }
  return lo
}

// cream kimono V collar at the neck
function collarGeo(S, chestY) {
  const parts = []
  for (const sd of [-1, 1]) {
    const shape = new THREE.Shape()
    shape.moveTo(sd * 0.002, 0.026); shape.lineTo(sd * 0.024, 0.021); shape.lineTo(sd * 0.008, -0.022); shape.lineTo(0, -0.014); shape.closePath()
    const g = new THREE.ExtrudeGeometry(shape, { depth: 0.006, bevelEnabled: false, steps: 1 })
    g.translate(0, S.neckY - chestY - 0.020, S.chest[1].z * 0.62 + S.chest[0].z + 0.004)
    parts.push(paint(g, COLLAR))
  }
  return parts
}

// apron: waist to just above the skirt hem, wraps the skirt cone, five scallops, no bib
function apronParts(S, hy) {
  const top = S.bellyY + 0.004, bot = S.anY + 0.045, nx = 30, ny = 22, nSc = 5, amp = 0.010
  const pos = [], idx = []
  for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) {
    const u = i / nx, v = j / ny, y0 = top + (bot - top) * v
    const [y1, r0, , ] = S.skirt, rr = r0 + (S.skirt[3] - r0) * Math.min(1, Math.max(0, (y0 - y1) / (S.skirt[2] - y1)))
    const w = rr * (0.80 + 0.08 * v), x = -w + 2 * w * u
    const sc = v > 0.86 ? Math.pow(Math.abs(Math.sin(u * nSc * Math.PI)), 0.6) * amp * ((v - 0.86) / 0.14) : 0
    const y = y0 - sc
    pos.push(x, y - hy, surfZ(S, x, y) + 0.004 + 0.003 * (1 - v))
  }
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const a = j * (nx + 1) + i, b = a + 1, c = a + nx + 1, d = c + 1; idx.push(a, c, b, b, c, d) }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals()
  return [paint(g, CREAM)]
}

// distance from the axis to the body surface (skirt cone or belly) along azimuth a at height y
function surfR(S, a, y) {
  let lo = 0, hi = 0.2; for (let n = 0; n < 22; n++) { const m = (lo + hi) / 2; if (coreSDF(S, Math.sin(a) * m, y, Math.cos(a) * m) < 0) lo = m; else hi = m }
  return lo
}

// cardigan hem: a thin flared skirt-shell from just above the hem down to it, open at the front (under the apron)
function hemParts(S, hy, hemY) {
  const pos = [], idx = [], na = 48, nv = 4, y0 = hemY + 0.018, open = 1.12
  for (let j = 0; j <= nv; j++) for (let i = 0; i <= na; i++) {
    const a = open + (2 * Math.PI - 2 * open) * i / na, y = y0 + (hemY - y0) * j / nv
    const r = surfR(S, a, y) + 0.002 + 0.006 * j / nv
    pos.push(Math.sin(a) * r, y - hy, Math.cos(a) * r)
  }
  for (let j = 0; j < nv; j++) for (let i = 0; i < na; i++) { const a = j * (na + 1) + i, b = a + 1, c = a + na + 1, d = c + 1; idx.push(a, c, b, b, c, d) }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals()
  // thin darker lip along the bottom edge reads as the sheet's hem line
  const lp = [], li = []
  for (let j = 0; j <= 1; j++) for (let i = 0; i <= na; i++) {
    const a = open + (2 * Math.PI - 2 * open) * i / na, y = hemY - 0.0022 * j, r = surfR(S, a, hemY) + 0.0085
    lp.push(Math.sin(a) * r, y - hy, Math.cos(a) * r)
  }
  for (let i = 0; i < na; i++) { const a = i, b = a + 1, c = a + na + 1, d = c + 1; li.push(a, c, b, b, c, d) }
  const l = new THREE.BufferGeometry(); l.setAttribute('position', new THREE.Float32BufferAttribute(lp, 3)); l.setIndex(li); l.computeVertexNormals()
  return [paint(g, CARDIGAN), paint(l, '#5e3f66')]
}

function pincushionParts(at, s) {
  const ball = new THREE.SphereGeometry(0.016, 12, 10)
  const bowl = new THREE.SphereGeometry(0.018, 12, 8, 0, Math.PI * 2, Math.PI * 0.48, Math.PI * 0.52)
  bowl.scale(1, 0.80, 1); bowl.translate(0, -0.004, 0)
  const parts = [paint(ball, '#c4a685'), paint(bowl, '#6e4a30')]
  for (const [x, z] of [[-0.007, 0.002], [0, -0.002], [0.007, 0.002]]) { // three stubby pins on top, as on the sheet
    const stem = new THREE.CylinderGeometry(0.0012, 0.0012, 0.008, 6); stem.translate(x, 0.018, z)
    const head = new THREE.SphereGeometry(0.0022, 6, 5); head.translate(x, 0.0225, z)
    parts.push(paint(stem, '#8a6a4c'), paint(head, '#8a6a4c'))
  }
  return parts.map(g => { g.scale(s, s, s); g.translate(...at); return g })
}

function tubeBetween(a, b, r0, r1, hex) {
  const A = new THREE.Vector3(...a), Bv = new THREE.Vector3(...b)
  const len = Math.max(A.distanceTo(Bv), 0.001)
  const g = new THREE.CylinderGeometry(r1, r0, len, 14)
  const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), Bv.clone().sub(A).normalize())
  g.applyQuaternion(quat)
  const mid = A.clone().add(Bv).multiplyScalar(0.5)
  g.translate(mid.x, mid.y, mid.z)
  return paint(g, hex)
}
// tube with an oval cross-section: k times wider along `wide` (made perpendicular to the axis)
// puff: the middle bulges out by this fraction (a soft sleeve), ends unchanged
function ovalTube(a, b, r0, r1, wide, k, hex, puff = 0) {
  const A = new THREE.Vector3(...a), Bv = new THREE.Vector3(...b), Y = Bv.clone().sub(A), len = Math.max(Y.length(), 0.001); Y.normalize()
  const Z = new THREE.Vector3(...wide); Z.addScaledVector(Y, -Z.dot(Y)).normalize(); const X = new THREE.Vector3().crossVectors(Y, Z)
  const g = new THREE.CylinderGeometry(r1, r0, len, 16, 8); g.scale(1, 1, k)
  if (puff) { const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const t = p.getY(i) / len + 0.5, f = 1 + puff * Math.max(0, Math.sin(Math.PI * t)) ** 0.8; p.setX(i, p.getX(i) * f); p.setZ(i, p.getZ(i) * f) } g.computeVertexNormals() }
  g.applyMatrix4(new THREE.Matrix4().makeBasis(X, Y, Z)); g.translate((A.x + Bv.x) / 2, (A.y + Bv.y) / 2, (A.z + Bv.z) / 2)
  return paint(g, hex)
}
const ball = (c, r, sc, hex) => { const g = new THREE.SphereGeometry(r, 12, 10); g.scale(...sc); g.translate(...c); return paint(g, hex) }

// clasped hands at the waist: round shoulder, sleeve down the side, elbow at the waist, forearm forward to the middle,
// wide cuff, two mitten hands with the right resting over the left (chest-local)
// sleeve shoulder x (the rig's own shoulder, body.shX, is pulled in so its hidden stub stays inside the torso)
const SH_X = 0.060
function armsParts(S, cy) {
  const front = S.belly[0].z + S.belly[1].z, hy = S.bellyY + 0.012 - cy, parts = []
  for (const sd of [-1, 1]) {
    const sh = [sd * SH_X, S.shY - cy - 0.024, S.shL.z]
    const el = [sd * (SH_X + 0.014), hy + 0.000, front * 0.26]
    const wr = [sd * 0.030, hy + 0.001, front + 0.010]
    // clear slope: a long tapering tube from high at the neck base down and out to the (lowered) shoulder joint
    const nb = [sd * 0.018, S.neckY - cy - 0.002, S.shL.z - 0.004]
    parts.push(ovalTube(nb, sh, 0.0130, 0.0225, [0, 0, 1], 1.15, CARDIGAN), ball(sh, 0.0225, [1, 1, 1.22], CARDIGAN))
    // yoke: fills the gap between the slope and the torso, where the body's own skin paint would peek through
    parts.push(ball([sd * 0.045, S.shY - cy - 0.012, S.chest[0].z + 0.002], 0.020, [0.85, 1.3, 2.05], CARDIGAN))
    // puffy oval sleeves: deep front-to-back above the elbow, tall below it, bulging between the joints
    parts.push(ovalTube(sh, el, 0.0225, 0.0215, [0, 0, 1], 1.22, CARDIGAN, 0.22), ball(el, 0.0215, [1, 1.12, 1.18], CARDIGAN))
    parts.push(ovalTube(el, wr, 0.0215, 0.0200, [0, 1, 0], 1.18, CARDIGAN, 0.24))
    // cuff: a short wider band at the wrist
    const dir = new THREE.Vector3(...wr).sub(new THREE.Vector3(...el)).normalize()
    const cuffA = new THREE.Vector3(...wr).addScaledVector(dir, -0.007).toArray()
    parts.push(ovalTube(cuffA, wr, 0.0228, 0.0232, [0, 1, 0], 1.14, CARDIGAN_HEM))
    const hand = [sd * 0.013, hy + (sd > 0 ? 0.004 : -0.003), front + 0.016 + (sd > 0 ? 0.005 : 0)]
    parts.push(ball(hand, 0.0150, [1.22, 0.92, 0.92], SKIN))
  }
  return parts
}

function attachLook(root) {
  const chest = root.getObjectByName('chest'), hips = root.getObjectByName('hips')
  if (!chest || !hips) return () => {}
  const S = spec(FUKU.body)
  const cy = (S.bellyY + S.chestY) / 2, hy = (S.hipY + S.bellyY) / 2
  const out = []
  const add = (parent, geo, mat = vcMat) => {
    const m = new THREE.Mesh(geo, mat)
    m.traverse(o => { o.layers.mask = root.layers.mask })
    parent.add(m); out.push(m)
  }
  const front = S.belly[0].z + S.belly[1].z
  // one merged mesh per bone: hips (apron, cardigan hem, pincushion), chest (collar, sleeves, hands)
  // one cel mesh + one ink hull per bone: hips (apron, cardigan hem, pincushion), chest (collar, sleeves, hands).
  // only the closed volumes get ink (a hull on an open sheet would paint its whole back).
  const pin = pincushionParts([0.044, S.bellyY - 0.034 - hy, front + 0.008], 1.42), arms = armsParts(S, cy)
  add(hips, merged([...apronParts(S, hy), ...hemParts(S, hy, HEM_Y(S)), ...pin]))
  add(hips, merged(pin.slice(0, 2).map(g => g.clone())), inkMat)
  add(chest, merged([...collarGeo(S, cy), ...arms]))
  add(chest, merged(arms.map(g => g.clone())), inkMat)
  return () => { out.forEach(m => m.removeFromParent()) }
}
const HEM_Y = (S) => S.knY + 0.004

function chestHold(B, st) {
  // still pose: custom chest-parented sleeves (stillArmGeo) hang and bend in to the cup.
  // the skinned rig is shortened (body.arm / hand) so it does not draw extra shoulder stubs.
  // window.__pose = [upX, upY, upZ, foX, foY, foZ] lets a capture script try values without a rebuild.
  const p = (typeof window !== 'undefined' && window.__pose) || [0.20, 0.10, -0.40, -0.80, 0.0, 0.0]
  B.upL.rotation.set(p[0], p[1], p[2])
  B.upR.rotation.set(p[0], -p[1], -p[2])
  B.foL.rotation.set(p[3], p[4], p[5])
  B.foR.rotation.set(p[3], -p[4], -p[5])
}
// the skinned forearms and mitten hands are not drawn (the sleeves are chest-parented meshes): collapse them so the
// tiny stub hands never peek out as skin under the arms
function hideRigHands(B) { for (const k of ['upL', 'upR', 'foL', 'foR']) B[k].scale.setScalar(0.001) }

function seatedHold(B, st, e) {
  if (!(st.act === 'sit' || st.act === 'chat')) return
  const k = e * Math.min(1, st.actW ?? 1)
  B.upL.rotation.x -= 0.62 * k; B.upR.rotation.x -= 0.62 * k
  B.foL.rotation.x -= 0.8 * k; B.foR.rotation.x -= 0.8 * k
  B.upL.rotation.z += 0.32 * k; B.upR.rotation.z -= 0.32 * k
}

export const FUKU = {
  name: 'grandma', age: 'elder', motion: FUKU_MOTION,
  // SDF long A-line skirt (the sheet's one solid purple skirt to the ankle). The arms are custom chest-parented
  // sleeves with clasped hands (attachLook); body.arm / hand stay tiny so the skinned rig stays hidden.
  body: { skirt: 'long', skirtFlare: 1.34, skirtTop: 0.86, headW: HEAD_W, H: 0.88, head: 1.48, leg: 0.90, torso: 1.14, arm: 0.02, girth: 1.26, shoulder: 0.90, chestW: 1.04, bellyZ: 0.96, shX: 0.90, armA: 0.52,
    armR: [0.06, 0.06, 0.06], legR: 1.24, legX: 1.06, foot: 1.18, bootW: 1.20, bootH: 1.05, bootL: 0.92, hand: 0.002,
    cheek: FUKU_CHEEK, midface: MIDFACE, midfaceFade: MID_FADE, hunch: 0.20,
    anY: 0.036, footY: 0.014, soleY: 0.0012 },
  hair: { style: 'chibi', c: HAIR_C },
  face: { glasses: GLASS },
  // cardigan painter: acc = wrap; top (copied into the skirt by outfit.skirt) = the deeper skirt purple, also shown in the
  // narrow wrap opening; the cream V is the collar mesh. acc2 = wrap so the painter's buttons stay hidden (none on the sheet).
  outfit: { type: 'cardigan', hemY: 0, buttons: false, skin: SKIN, top: SKIRT, acc: CARDIGAN, acc2: CARDIGAN, bottom: SKIRT, legs: SKIRT, shoe: '#5e3a22', long: true, sleeve: 'none', skirt: true },
  hold: {},
  seatDrop: 0.055,
  walk: { rate: 7, stride: 0.42, knee: 0.55, bounce: 0.007, smooth: true, land: 0.25, arm: 0.4, lean: 0.1, twist: 0.08, sway: 0.06, idle: 'sway' },
  ext: {
    life: (B, st, dt, t, R_, mem, state) => { const L = mem.life || (mem.life = makeLife(Math.random, FUKU_MOTION)); st.life = L; L.B = B; L.R = R_; L.hairOff = FUKU_HAIR_OFF
      if (!LIFE_OFF) { lifeStep(L, B, st, dt, t, R_, state.camera); seatedHold(B, st, 0.85) } else chestHold(B, st); hideRigHands(B) },
    post: (R_, st, dt, t) => { if (!LIFE_OFF) lifePost(st.life, R_, st, dt, t) },
    Face, Hair: FukuHair,
  },
}

FUKU.outfit.hemY = HEM_Y(spec(FUKU.body)) + 0.009 // painted cardigan/skirt line, hidden under the 3D hem flap

export function ChibiFuku({ st, scale = 0.8, res }) {
  const g = useRef()
  const r = res ?? (TOUCH ? 40 : 52)
  useEffect(() => { let off = null, n = 0
    const iv = setInterval(() => { const root = g.current; if (root && root.getObjectByName('chest') && root.getObjectByName('hips')) { off = attachLook(root); clearInterval(iv) } else if (++n > 50) clearInterval(iv) }, 80)
    return () => { clearInterval(iv); off && off() } }, [])
  return <group ref={g}><Character cfg={FUKU} st={st} res={r} scale={scale} /></group>
}
export default ChibiFuku
