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
const HAIR_C = '#e6d6c6'
const HAIR_BAND = '#efe6dc'
const GLASS = '#a88858'
const CARDIGAN = '#9a7290'
const SKIRT = '#c4a0b4'
const CREAM = '#f3ead8'
const COLLAR = '#efe6d6'
const FUKU_HAIR_OFF = new Float32Array(12)
const Face = makeFace({ kind: 'fuku', glasses: GLASS, defaultSquint: 0.1, blush: 0.72 })

const EAR = { x: 0.066, y: -0.0165, z: 0.0020 }
function fukuHair() {
  const ball = new THREE.SphereGeometry(1, 16, 12), ballS = new THREE.SphereGeometry(1, 12, 9), ring = new THREE.TorusGeometry(1, 0.26, 6, 16)
  // softer, fuller hair with a centre parting, side clumps, and a round bun clearly above the crown
  const parts = [
    part(ball, [0, 0.014, -0.012], [0.070, 0.058, 0.062]),
    part(ball, [0, -0.002, -0.036], [0.060, 0.044, 0.050]), // nape
    // bun sits on the crown and reads clearly above the head
    part(ball, [0, 0.078, -0.006], [0.024, 0.022, 0.023]),
    part(ring, [0, 0.062, -0.006], [0.016, 0.016, 0.012], [Math.PI / 2 - 0.08, 0, 0]),
    // centre parting: two fringe lobes with a gap on the brow
    ...[-1, 1].map(d => part(ballS, [d * 0.018, 0.032, 0.050], [0.022, 0.016, 0.016], [0.15, d * 0.35, d * 0.08])),
    ...[-1, 1].map(d => part(ballS, [d * 0.038, 0.018, 0.044], [0.016, 0.018, 0.014], [0.2, d * 0.45, d * 0.12])),
    // side clumps (softer than a helmet)
    ...[-1, 1].map(d => part(ballS, [d * 0.062, 0.008, 0.008], [0.018, 0.028, 0.022], [0.1, d * 0.35, d * 0.08])),
    ...[-1, 1].map(d => part(ballS, [d * 0.054, -0.018, 0.010], [0.016, 0.026, 0.018], [0.2, d * 0.4, d * 0.1])),
    ...[-1, 1].map(d => part(ballS, [d * EAR.x, EAR.y, EAR.z], [0.0034, 0.0100, 0.0062], [0, d * 0.75, d * 0.1], 1)),
  ]
  tagAW(parts[0], (x, y, z) => [3, sm(0.02, -0.03, y) * sm(-0.01, 0.04, z) * 0.55])
  tagAW(parts[1], () => [3, 0])
  tagAW(parts[2], (x, y) => [2, sm(0.06, 0.12, y)])
  tagAW(parts[3], () => [2, 0.4])
  for (const k of [4, 5, 6, 7]) tagAW(parts[k], () => [3, 0.65])
  for (const k of [8, 9, 10, 11]) tagAW(parts[k], (x) => [x < 0 ? 0 : 1, 0.7])
  for (const k of [12, 13]) tagAW(parts[k], () => [3, 0])
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
  // soft cream wrap-collar bands along the V, slightly thicker at the neck
  const parts = []
  for (const sd of [-1, 1]) {
    const g = new THREE.CylinderGeometry(0.0042, 0.0030, 0.048, 8)
    g.rotateZ(sd * -0.62)
    g.translate(sd * 0.015, 0.006, 0.002)
    parts.push(paint(g, COLLAR))
  }
  return mergeGeometries(parts)
}

function wrapFlapGeo(S) {
  // sit outside the belly ellipsoid (x radius ~0.08 at Fuku's girth) so the hem is visible
  const rx = (S.belly?.[1]?.x ?? 0.064) + 0.010
  const pts = [
    new THREE.Vector2(rx * 0.96, 0.054),
    new THREE.Vector2(rx * 1.00, 0.024),
    new THREE.Vector2(rx * 1.04, -0.004),
    new THREE.Vector2(rx * 1.06, -0.030),
  ]
  // open at the front so the cream V and apron stay visible
  const g = new THREE.LatheGeometry(pts, 28, Math.PI * 0.22, Math.PI * 1.56)
  g.rotateY(-Math.PI * 0.22)
  const p = g.attributes.position
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i)
    if (x < 0 && z > 0) p.setZ(i, z + 0.008)
  }
  g.computeVertexNormals()
  return paint(g, CARDIGAN)
}

function skirtGeo() {
  // separate lilac skirt, hip to ankle, slight flare — not a painted sack dress
  const pts = [
    new THREE.Vector2(0.000, 0.042),
    new THREE.Vector2(0.054, 0.042),
    new THREE.Vector2(0.058, 0.018),
    new THREE.Vector2(0.064, -0.016),
    new THREE.Vector2(0.072, -0.055),
    new THREE.Vector2(0.078, -0.092),
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
  add(chest, collarGeo(), [0, S.neckY - chestY - 0.028, chestZ * 0.62 + 0.006])
  // skirt + lower wrap flaps + apron on the hips so they sit with her
  add(hips, skirtGeo(), [0, 0.000, 0], skirtMat)
  add(hips, wrapFlapGeo(S), [0, 0.012, 0])
  add(hips, apronGeo(), [0, 0.008, bellyZ + 0.002])
  add(hips, pincushionGeo(), [0.038, -0.048, bellyZ + 0.020])
  const cup = new THREE.Mesh(cupGeo(), cupMat)
  cup.position.set(0, 0.016, chestZ + 0.058)
  cup.rotation.set(0.32, -0.18, 0)
  cup.scale.setScalar(1.12)
  cup.traverse(o => { o.layers.mask = root.layers.mask })
  chest.add(cup); out.push(cup)
  return () => { out.forEach(m => m.removeFromParent()) }
}

function chestHold(B, st) {
  // still pose: elbows out, forearms in, mittens meeting around the cup
  B.upL.rotation.set(-0.68, 0.20, 0.40)
  B.upR.rotation.set(-0.68, -0.20, -0.40)
  B.foL.rotation.set(-1.58, 0.58, 0.38)
  B.foR.rotation.set(-1.58, -0.58, -0.38)
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
  outfit: { type: 'cardigan', skin: SKIN, top: COLLAR, acc: CARDIGAN, acc2: CARDIGAN, bottom: SKIRT, legs: SKIRT, shoe: '#3a241e', long: true, sleeve: 'puff', skirt: true },
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
