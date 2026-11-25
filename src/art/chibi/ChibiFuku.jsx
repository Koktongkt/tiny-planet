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
import { CHEEK, MIDFACE, MID_FADE, EYE, headSDF, makeFace } from './castFace.jsx'
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
const FUKU_CHEEK = [0, -0.0290, 0.0100, 0.0570, 0.0270, 0.0370, 0.0180]


// her own glasses: round, heavier dark rims, a low curved bridge and arms that run back to the ears
function fukuGlasses() {
  const R = 0.0140, T = 0.0017, Z = 0.0552, parts = []
  for (const sd of [-1, 1]) { const g = new THREE.TorusGeometry(R, T, 8, 28); g.rotateY(sd * 0.2); g.translate(sd * EYE.x, EYE.y + 0.0006, Z); parts.push(g) }
  const inner = EYE.x - R * Math.cos(0.2), br = new THREE.TorusGeometry(inner, 0.0013, 6, 14, Math.PI)
  br.scale(1, 0.42, 1); br.translate(0, EYE.y + 0.0012, Z + 0.0024); parts.push(br)
  for (const sd of [-1, 1]) {
    const a = new THREE.Vector3(sd * (EYE.x + R * 0.96), EYE.y + 0.0022, Z - 0.0040), b = new THREE.Vector3(sd * 0.0575, EYE.y + 0.0030, 0.010)
    const len = a.distanceTo(b), t = new THREE.CylinderGeometry(0.0010, 0.0010, len, 6)
    t.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize()))
    t.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2); parts.push(t)
  }
  const g = mergeGeometries(parts.map(p => { p = p.index ? p.toNonIndexed() : p; p.deleteAttribute('uv'); return p })); g.computeVertexNormals(); return g
}
const Face = makeFace({ kind: 'fuku', glasses: GLASS, defaultSquint: 0.1, blush: 0.72, cheek: FUKU_CHEEK, blushAt: { dx: 0.0016, dy: -0.0030, dr: 1.12 }, glassesGeo: fukuGlasses })

// skull HR is ~[0.058, 0.050, 0.055]; the sheet cap sits ~10–15% wider than the face, ears out
const EAR = { x: 0.061, y: -0.012, z: 0.006 }
// main hair shapes: [centre, radii, rotation]
const H_CAP = [[0, 0.012, -0.008], [0.066, 0.057, 0.062]]
const H_FRONT = [[0, 0.028, 0.027], [0.049, 0.027, 0.029]]
const H_LOBE = (d) => [[d * 0.019, 0.036, 0.038], [0.023, 0.014, 0.017], [0.30, d * 0.36, d * 0.18]]
const H_TEMPLE = (d) => [[d * 0.050, 0.010, 0.010], [0.019, 0.025, 0.030], [0.05, d * 0.30, d * 0.10]]
function fukuHair() {
  const ball = new THREE.SphereGeometry(1, 20, 14), ballS = new THREE.SphereGeometry(1, 14, 10), ring = new THREE.TorusGeometry(1, 0.30, 8, 20)
  // sheet: a big soft grey dome (wider than the face), a centre parting with two broad waves swept back, sides down
  // to the top of the ears, full cover behind down to the nape, and a big round top bun wrapped at its base.
  // H_FRONT stands a little proud of the forehead so the hairline is a clean edge, not a grazing cut through the skin
  const P = (geo, [c, r, rot]) => part(geo, c, r, rot)
  const parts = [
    P(ball, H_CAP),
    P(ball, H_FRONT),
    part(ball, [0, -0.014, -0.024], [0.058, 0.042, 0.044]),
    part(ball, [0, 0.071, -0.013], [0.0285, 0.0240, 0.0275]),
    part(ring, [0, 0.055, -0.010], [0.0195, 0.0195, 0.0150], [Math.PI / 2 - 0.10, 0, 0]),
    ...[-1, 1].map(d => P(ballS, H_LOBE(d))),
    ...[-1, 1].map(d => P(ballS, H_TEMPLE(d))),
    // soft swept-back ridges: low and long, read as the sheet's wave lines rather than curls
    ...[-1, 1].map(d => part(ballS, [d * 0.030, 0.040, 0.008], [0.0065, 0.0040, 0.034], [0.55, d * 0.42, d * 0.10])),
    ...[-1, 1].map(d => part(ballS, [d * 0.047, 0.024, -0.004], [0.0060, 0.0040, 0.034], [0.35, d * 0.62, d * 0.10])),
    ...[-1, 1].map(d => part(ballS, [d * 0.040, -0.008, -0.040], [0.0060, 0.0040, 0.026], [-0.20, d * 0.95, d * 0.10])),
    ...[-1, 1].map(d => part(ballS, [d * EAR.x, EAR.y, EAR.z], [0.0062, 0.0115, 0.0070], [0, d * 0.7, d * 0.08], 1)),
  ]
  tagAW(parts[0], (x, y, z) => [3, sm(0.02, -0.03, y) * sm(-0.01, 0.04, z) * 0.45])
  tagAW(parts[1], () => [3, 0.2])
  tagAW(parts[2], () => [3, 0])
  tagAW(parts[3], (x, y) => [2, sm(0.05, 0.10, y)])
  tagAW(parts[4], () => [2, 0.4])
  for (const k of [5, 6]) tagAW(parts[k], () => [3, 0.45])
  for (const k of [7, 8]) tagAW(parts[k], (x) => [x < 0 ? 0 : 1, 0.5])
  for (const k of [9, 10, 11, 12, 13, 14]) tagAW(parts[k], () => [3, 0.3])
  for (const k of [15, 16]) tagAW(parts[k], () => [3, 0])
  return mergeHair(parts)
}
const HAIR_GEO = fukuHair()
const hairMat = makeHairMat(SKIN, HAIR_C, HAIR_BAND, FUKU_HAIR_OFF)
const hairInk = makeHairInk(FUKU_HAIR_OFF)
function FukuHair({ set }) {
  return <group ref={set('hair')}><mesh geometry={HAIR_GEO} material={hairMat} /><mesh geometry={HAIR_GEO} material={hairInk} /></group>
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
const ball = (c, r, sc, hex) => { const g = new THREE.SphereGeometry(r, 12, 10); g.scale(...sc); g.translate(...c); return paint(g, hex) }

// clasped hands at the waist: round shoulder, sleeve down the side, elbow at the waist, forearm forward to the middle,
// wide cuff, two mitten hands with the right resting over the left (chest-local)
function armsParts(S, cy) {
  const front = S.belly[0].z + S.belly[1].z, hy = S.bellyY + 0.012 - cy, parts = []
  for (const sd of [-1, 1]) {
    const sh = [sd * Math.abs(S.shL.x) * 0.92, S.shY - cy - 0.008, S.shL.z]
    const el = [sd * (Math.abs(S.shL.x) + 0.014), hy + 0.000, front * 0.30]
    const wr = [sd * 0.030, hy + 0.001, front + 0.008]
    // smooth sloped shoulder: a tapering tube from the neck base out to the shoulder joint, no puff on top
    const nb = [sd * 0.024, S.neckY - cy - 0.010, S.shL.z - 0.002]
    parts.push(tubeBetween(nb, sh, 0.0120, 0.0205, CARDIGAN), ball(sh, 0.0205, [1, 0.94, 1], CARDIGAN))
    parts.push(tubeBetween(sh, el, 0.0210, 0.0200, CARDIGAN), ball(el, 0.0200, [1, 1, 1], CARDIGAN))
    parts.push(tubeBetween(el, wr, 0.0200, 0.0212, CARDIGAN))
    // cuff: a short wider band at the wrist
    const dir = new THREE.Vector3(...wr).sub(new THREE.Vector3(...el)).normalize()
    const cuffA = new THREE.Vector3(...wr).addScaledVector(dir, -0.007).toArray()
    parts.push(tubeBetween(cuffA, wr, 0.0222, 0.0226, CARDIGAN_HEM))
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
  body: { skirt: 'long', skirtFlare: 1.34, skirtTop: 0.86, H: 0.88, head: 1.48, leg: 0.90, torso: 1.14, arm: 0.02, girth: 1.26, shoulder: 1.08, chestW: 1.14, bellyZ: 0.96, shX: 1.22, armA: 0.52,
    armR: [0.35, 0.30, 0.25], legR: 1.24, legX: 1.06, foot: 1.18, bootW: 1.20, bootH: 1.05, bootL: 0.92, hand: 0.01,
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
