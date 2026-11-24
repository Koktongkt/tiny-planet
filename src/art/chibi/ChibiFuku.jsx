// Grandma Fuku: a lazy chibi on the shared pipeline (~2.5 heads). Open round eyes
// behind wire glasses, grey brows and smile lines, grey top bun, a darker purple
// wrap cardigan with a cream inner collar over a separate lilac skirt, a cream
// scalloped apron, a pincushion, and a teacup held in both hands at the chest.
import * as THREE from 'three'
import React, { useEffect, useRef } from 'react'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { Character, cel, spec } from '../../GhibliPerson.jsx'
import { FUKU_MOTION } from './motion.js'
import { makeLife, lifeStep, lifePost } from './life.js'
import { CHEEK, MIDFACE, MID_FADE, makeFace } from './castFace.jsx'
import { part, tagAW, sm, mergeHair, makeHairMat, makeHairInk } from './castHair.js'
import { q } from '../../common.jsx'

const TOUCH = typeof window !== 'undefined' && matchMedia('(pointer: coarse)').matches
const LIFE_OFF = q.has('still') && !q.has('life')
const SKIN = '#f6cdb0'
const HAIR_C = '#d2ccc4'
const HAIR_BAND = '#efe6dc'
const GLASS = '#a88858'
const CARDIGAN = '#9a7290'
const SKIRT = '#c4a0b4'
const CREAM = '#f3ead8'
const COLLAR = '#efe6d6'
const FUKU_HAIR_OFF = new Float32Array(12)
const Face = makeFace({ kind: 'fuku', glasses: GLASS, defaultSquint: 0.1, blush: 0.72 })

// skull HR is ~[0.058, 0.050, 0.055]; the sheet cap sits ~10–15% wider than the face, ears out
const EAR = { x: 0.061, y: -0.012, z: 0.006 }
function fukuHair() {
  const ball = new THREE.SphereGeometry(1, 16, 12), ballS = new THREE.SphereGeometry(1, 12, 9), ring = new THREE.TorusGeometry(1, 0.26, 6, 16)
  // smooth grey cap hugging the skull, swept back, a subtle centre part, bun on top, ears visible
  const parts = [
    part(ball, [0, 0.010, -0.010], [0.063, 0.052, 0.057]),
    part(ball, [0, 0.016, 0.030], [0.048, 0.036, 0.028]), // smooth front cap, no split lobes
    part(ball, [0, -0.004, -0.030], [0.052, 0.036, 0.040]), // nape, tight
    // bun sits on the crown
    part(ball, [0, 0.066, -0.006], [0.0165, 0.0145, 0.0155]),
    part(ring, [0, 0.054, -0.006], [0.012, 0.012, 0.009], [Math.PI / 2 - 0.08, 0, 0]),
    // a shallow centre part (thin gap, not two bulky lobes)
    ...[-1, 1].map(d => part(ballS, [d * 0.010, 0.028, 0.046], [0.010, 0.007, 0.008], [0.12, d * 0.15, 0])),
    // a few soft swept-back strand lines on the cap (thin, not volume)
    ...[-1, 1].map(d => part(ballS, [d * 0.024, 0.032, 0.024], [0.0040, 0.0026, 0.024], [0.40, d * 0.55, d * 0.06])),
    ...[-1, 1].map(d => part(ballS, [d * 0.036, 0.020, 0.004], [0.0036, 0.0024, 0.022], [0.28, d * 0.75, d * 0.08])),
    // ears stick out past the tight cap
    ...[-1, 1].map(d => part(ballS, [d * EAR.x, EAR.y, EAR.z], [0.0062, 0.0115, 0.0070], [0, d * 0.7, d * 0.08], 1)),
  ]
  tagAW(parts[0], (x, y, z) => [3, sm(0.02, -0.03, y) * sm(-0.01, 0.04, z) * 0.45])
  tagAW(parts[1], () => [3, 0.2])
  tagAW(parts[2], () => [3, 0])
  tagAW(parts[3], (x, y) => [2, sm(0.05, 0.10, y)])
  tagAW(parts[4], () => [2, 0.4])
  for (const k of [5, 6]) tagAW(parts[k], () => [3, 0.4])
  for (const k of [7, 8, 9, 10]) tagAW(parts[k], () => [3, 0.3])
  for (const k of [11, 12]) tagAW(parts[k], () => [3, 0])
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

// white cylinder mug, open rim, dark tea, side handle — no saucer, no spherical bowl
let CUP = null
function cupGeo() {
  if (CUP) return CUP
  const body = new THREE.CylinderGeometry(0.0165, 0.0156, 0.0200, 18, 1, true)
  body.translate(0, 0.0100, 0)
  const bottom = new THREE.CircleGeometry(0.0156, 18)
  bottom.rotateX(Math.PI / 2)
  bottom.translate(0, 0.0000, 0)
  const rim = new THREE.TorusGeometry(0.0165, 0.00125, 8, 18)
  rim.rotateX(Math.PI / 2)
  rim.translate(0, 0.0200, 0)
  const tea = new THREE.CircleGeometry(0.0148, 18)
  tea.rotateX(-Math.PI / 2)
  tea.translate(0, 0.0184, 0)
  const handle = new THREE.TorusGeometry(0.0068, 0.0015, 8, 14, Math.PI * 1.25)
  handle.rotateY(Math.PI / 2)
  handle.rotateZ(-0.15)
  handle.translate(0.0168, 0.0105, 0)
  const parts = [
    paint(body, '#f7f3ec'),
    paint(bottom, '#f7f3ec'),
    paint(rim, '#ffffff'),
    paint(tea, '#4a2a18'),
    paint(handle, '#f7f3ec'),
  ]
  const g = mergeGeometries(parts); g.computeVertexNormals(); CUP = g; return CUP
}
const cupMat = (() => { const m = cel('#ffffff').clone(); m.vertexColors = true; m.defines = { KIND: 1 }; return m })()

function collarGeo() {
  // cream wrap collar: short panels at the neck V, not hanging down the apron
  const parts = []
  for (const sd of [-1, 1]) {
    const shape = new THREE.Shape()
    shape.moveTo(sd * 0.002, 0.016)
    shape.lineTo(sd * 0.018, 0.014)
    shape.lineTo(sd * 0.016, -0.002)
    shape.lineTo(sd * 0.004, 0.000)
    shape.closePath()
    const g = new THREE.ExtrudeGeometry(shape, { depth: 0.006, bevelEnabled: false, steps: 1 })
    g.translate(0, 0, -0.001)
    parts.push(paint(g, COLLAR))
  }
  const g = mergeGeometries(parts); g.computeVertexNormals(); return g
}

function mittenGeo() {
  const g = new THREE.SphereGeometry(0.0185, 12, 10)
  g.scale(1.15, 0.95, 0.90)
  return paint(g, SKIN)
}


function skirtGeo() {
  // separate lilac skirt, hip to ankle, slight flare — not a painted sack dress
  const pts = [
    new THREE.Vector2(0.000, 0.006),
    new THREE.Vector2(0.054, 0.006),
    new THREE.Vector2(0.058, -0.012),
    new THREE.Vector2(0.064, -0.032),
    new THREE.Vector2(0.072, -0.062),
    new THREE.Vector2(0.078, -0.094),
    new THREE.Vector2(0.079, -0.102),
    new THREE.Vector2(0.000, -0.102),
  ]
  const g = new THREE.LatheGeometry(pts, 24)
  return paint(g, SKIRT)
}

function apronGeo() {
  // hangs below the hands, wraps the belly, scalloped hem — not a flat chest rectangle
  const w0 = 0.036, w1 = 0.052, top = 0.012, bot = -0.072, nx = 22, ny = 16, nSc = 5, amp = 0.010
  const pos = [], idx = []
  for (let j = 0; j <= ny; j++) {
    for (let i = 0; i <= nx; i++) {
      const u = i / nx, v = j / ny
      const w = w0 + (w1 - w0) * v
      const x = -w + 2 * w * u
      const scall = v > 0.82 ? Math.abs(Math.sin(u * nSc * Math.PI)) * amp * ((v - 0.82) / 0.18) : 0
      const y = top + (bot - scall - top) * v
      const wrap = 0.018 * (1 - (x * x) / (w * w))
      pos.push(x, y, wrap)
    }
  }
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const a = j * (nx + 1) + i, b = a + 1, c = a + nx + 1, d = c + 1
    idx.push(a, c, b, b, c, d)
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setIndex(idx)
  g.computeVertexNormals()
  return paint(g, CREAM)
}

function pincushionGeo() {
  const ball = new THREE.SphereGeometry(0.016, 12, 10)
  const bowl = new THREE.SphereGeometry(0.018, 12, 8, 0, Math.PI * 2, Math.PI * 0.48, Math.PI * 0.52)
  bowl.scale(1, 0.70, 1); bowl.translate(0, -0.005, 0)
  const parts = [paint(ball, '#cbb192'), paint(bowl, '#6e4c32')]
  const pins = [
    [0.004, 0.016, 0.004, 0.010, '#e8dcc0'],
    [-0.006, 0.015, -0.002, 0.011, '#d4c4b0'],
    [0.001, 0.017, -0.006, 0.012, '#c45a48'],
    [0.007, 0.014, -0.003, 0.009, '#e8dcc0'],
    [-0.003, 0.016, 0.006, 0.010, '#c45a48'],
  ]
  for (const [x, y, z, h, hex] of pins) {
    const stem = new THREE.CylinderGeometry(0.00055, 0.00055, h, 5)
    stem.translate(x, y - h * 0.15, z)
    const head = new THREE.SphereGeometry(0.0022, 6, 5)
    head.translate(x, y + h * 0.35, z)
    parts.push(paint(stem, '#c8c0b4'), paint(head, hex))
  }
  const g = mergeGeometries(parts); g.computeVertexNormals(); return g
}

const propMat = (() => { const m = cel('#ffffff').clone(); m.vertexColors = true; m.defines = { KIND: 1 }; m.polygonOffset = true; m.polygonOffsetFactor = -1; m.polygonOffsetUnits = -2; return m })()
const skirtMat = (() => { const m = cel('#ffffff').clone(); m.vertexColors = true; m.defines = { KIND: 1 }; return m })()

function attachLook(root) {
  const chest = root.getObjectByName('chest'), hips = root.getObjectByName('hips')
  if (!chest || !hips) return () => {}
  const S = spec(FUKU.body)
  const chestY = (S.bellyY + S.chestY) / 2
  const out = []
  const add = (parent, geo, pos, mat = propMat, rot) => {
    const m = new THREE.Mesh(geo, mat)
    m.position.set(...pos)
    if (rot) m.rotation.set(...rot)
    m.traverse(o => { o.layers.mask = root.layers.mask })
    parent.add(m); out.push(m)
  }
  const chestZ = (S.chest?.[1]?.z ?? 0.05)
  const bellyZ = (S.belly?.[1]?.z ?? 0.055)
  add(chest, collarGeo(), [0, S.neckY - chestY - 0.026, chestZ * 0.58 + 0.004])
  // skirt + apron on the hips; the painted cardigan hem (hemY: 'hip') is the wrap hem — no 3D peplum
  add(hips, skirtGeo(), [0, 0.000, 0], skirtMat)
  add(hips, apronGeo(), [0, 0.008, bellyZ + 0.002])
  add(hips, pincushionGeo(), [0.038, -0.048, bellyZ + 0.020])
  const cup = new THREE.Mesh(cupGeo(), cupMat)
  cup.position.set(0, 0.018, chestZ + 0.050)
  cup.rotation.set(0.16, -0.10, 0)
  cup.scale.setScalar(1.12)
  cup.traverse(o => { o.layers.mask = root.layers.mask })
  chest.add(cup); out.push(cup)
  if (LIFE_OFF) {
    for (const sd of [-1, 1]) {
      const mit = new THREE.Mesh(mittenGeo(), propMat)
      mit.position.set(sd * 0.020, 0.008, 0.006)
      mit.rotation.set(0.20, sd * -0.45, sd * 0.35)
      mit.scale.set(1.15, 1.0, 0.95)
      mit.traverse(o => { o.layers.mask = root.layers.mask })
      cup.add(mit)
    }
  }
  return () => { out.forEach(m => m.removeFromParent()) }
}

function chestHold(B, st) {
  // still pose: long sleeves reach the cup; mittens parented to the cup cover the skinned hands.
  // window.__pose = [upX, upY, upZ, foX, foY, foZ] lets a capture script try values without a rebuild.
  const p = (typeof window !== 'undefined' && window.__pose) || [-0.75, 0.42, 0.10, -1.62, 0.22, 0.12]
  B.upL.rotation.set(p[0], p[1], p[2])
  B.upR.rotation.set(p[0], -p[1], -p[2])
  B.foL.rotation.set(p[3], p[4], p[5])
  B.foR.rotation.set(p[3], -p[4], -p[5])
  B.foL.scale.setScalar(1)
  B.foR.scale.setScalar(1)
}

function seatedHold(B, st, e) {
  if (!(st.act === 'sit' || st.act === 'chat')) return
  const k = e * Math.min(1, st.actW ?? 1)
  B.upL.rotation.x -= 0.62 * k; B.upR.rotation.x -= 0.62 * k
  B.foL.rotation.x -= 0.8 * k; B.foR.rotation.x -= 0.8 * k
  B.upL.rotation.z += 0.32 * k; B.upR.rotation.z -= 0.32 * k
}

export const FUKU = {
  name: 'grandma', age: 'elder', motion: FUKU_MOTION,
  // no SDF long-skirt: a painted sack buries the arms so the hands cannot wrap the cup.
  // plump barrel torso; a 3D lilac skirt and cardigan flaps carry the silhouette instead.
  body: { H: 0.88, head: 1.48, leg: 0.90, torso: 1.14, arm: 0.92, girth: 1.26, shoulder: 1.08, chestW: 1.14, bellyZ: 0.96, shX: 1.22, armA: 0.52,
    armR: [1.12, 1.32, 1.42], legR: 1.24, legX: 1.06, foot: 1.18, bootW: 1.20, bootH: 1.05, bootL: 0.92, hand: 1.32,
    cheek: CHEEK, midface: MIDFACE, midfaceFade: MID_FADE, hunch: 0.20,
    anY: 0.036, footY: 0.014, soleY: 0.0012 },
  hair: { style: 'chibi', c: HAIR_C },
  face: { glasses: GLASS },
  // cardigan painter: acc = wrap, top = cream shown in the V, legs = lilac skirt colour.
  // acc2 matches the wrap so the painter's cardigan buttons stay hidden (the sheet has none).
  outfit: { type: 'cardigan', hemY: 'hip', buttons: false, skin: SKIN, top: COLLAR, acc: CARDIGAN, acc2: CARDIGAN, bottom: SKIRT, legs: SKIRT, shoe: '#3a241e', long: true, sleeve: 'puff', skirt: true },
  hold: {},
  seatDrop: 0.055,
  walk: { rate: 7, stride: 0.42, knee: 0.55, bounce: 0.007, smooth: true, land: 0.25, arm: 0.4, lean: 0.1, twist: 0.08, sway: 0.06, idle: 'sway' },
  ext: {
    life: (B, st, dt, t, R_, mem, state) => { const L = mem.life || (mem.life = makeLife(Math.random, FUKU_MOTION)); st.life = L; L.B = B; L.R = R_; L.hairOff = FUKU_HAIR_OFF
      if (!LIFE_OFF) { lifeStep(L, B, st, dt, t, R_, state.camera); seatedHold(B, st, 0.85) } else chestHold(B, st) },
    post: (R_, st, dt, t) => { if (!LIFE_OFF) lifePost(st.life, R_, st, dt, t) },
    Face, Hair: FukuHair,
  },
}

export function ChibiFuku({ st, scale = 0.8, res }) {
  const g = useRef()
  const r = res ?? (TOUCH ? 40 : 52)
  useEffect(() => { let off = null, n = 0
    const iv = setInterval(() => { const root = g.current; if (root && root.getObjectByName('chest') && root.getObjectByName('hips')) { off = attachLook(root); clearInterval(iv) } else if (++n > 50) clearInterval(iv) }, 80)
    return () => { clearInterval(iv); off && off() } }, [])
  return <group ref={g}><Character cfg={FUKU} st={st} res={r} scale={scale} /></group>
}
export default ChibiFuku
