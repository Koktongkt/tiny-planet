// Professor Hoshino: a lazy chibi on the shared pipeline. Dark messy hair with a
// soft grey-streaked side, no beard, thick dark brows, round dark glasses, a
// khaki lapelled jacket open over a dark green waistcoat and white shirt collar,
// a knotted rust scarf, olive trousers, brown boots, and an open red notebook
// plus a dark pencil. Stocky, about Fuku's height. No cane.
import * as THREE from 'three'
import React, { useEffect, useRef } from 'react'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { Character, cel, spec } from '../../GhibliPerson.jsx'
import { kit, combine } from '../train/kit.js'
import { HOSHINO_MOTION } from './motion.js'
import { makeLife, lifeStep, lifePost } from './life.js'
import { CHEEK, MIDFACE, MID_FADE, makeFace } from './castFace.jsx'
import { part, tagAW, sm, mergeHair, makeHairMat, makeHairInk } from './castHair.js'
import { q, toon } from '../../common.jsx'

const TOUCH = typeof window !== 'undefined' && matchMedia('(pointer: coarse)').matches
const LIFE_OFF = q.has('still') && !q.has('life')
const SKIN = '#f0c7a4'
const HAIR_C = '#3f3732'
const HAIR_GREY = '#7a736c'
const HAIR_BAND = '#5c564f'
const GLASS = '#2e2420'
const JACKET = '#c09a66'
const VEST = '#4e5238'
const SHIRT = '#f4eee6'
const HOSHINO_HAIR_OFF = new Float32Array(12)
const Face = makeFace({ kind: 'hoshino', glasses: GLASS, defaultSquint: 0.06, blush: 0.55 })

// skull HR is ~[0.058, 0.050, 0.055]; short cap ~10–15% wider than the face, ears out
const EAR = { x: 0.061, y: -0.012, z: 0.006 }
function hoshinoHair() {
  const ball = new THREE.SphereGeometry(1, 16, 12), ballS = new THREE.SphereGeometry(1, 10, 8)
  // short dark cap hugging the skull, a few soft swept clumps on top and right, ears visible
  const parts = [
    part(ball, [0, 0.008, -0.008], [0.062, 0.050, 0.056]),
    part(ball, [0, -0.006, -0.028], [0.050, 0.032, 0.038]), // tight nape
    // a few soft swept clumps on top and the right (viewer's right / +X)
    part(ballS, [0.018, 0.052, 0.008], [0.017, 0.013, 0.014], [0.42, 0.50, 0.12]),
    part(ballS, [-0.010, 0.048, 0.002], [0.013, 0.010, 0.011], [0.28, -0.22, -0.08]),
    part(ballS, [0.032, 0.044, -0.002], [0.015, 0.012, 0.013], [0.30, 0.60, 0.10]),
    part(ballS, [0.008, 0.046, -0.018], [0.013, 0.010, 0.012], [0.32, 0.10, 0]),
    // short fringe, not a heavy brow cloud
    part(ballS, [0, 0.026, 0.046], [0.020, 0.008, 0.009]),
    ...[-1, 1].map(d => part(ballS, [d * 0.022, 0.022, 0.042], [0.012, 0.008, 0.008], [0.12, d * 0.22, 0])),
    // ears stick out past the tight cap
    ...[-1, 1].map(d => part(ballS, [d * EAR.x, EAR.y, EAR.z], [0.0062, 0.0115, 0.0070], [0, d * 0.7, d * 0.08], 1)),
  ]
  tagAW(parts[0], () => [3, 0])
  tagAW(parts[1], () => [3, 0])
  for (const k of [2, 3, 4, 5]) tagAW(parts[k], () => [2, 0.55])
  tagAW(parts[6], () => [3, 0.4])
  for (const k of [7, 8]) tagAW(parts[k], () => [3, 0.35])
  for (const k of [9, 10]) tagAW(parts[k], () => [3, 0])
  return mergeHair(parts)
}
function hoshinoGrey() {
  const ballS = new THREE.SphereGeometry(1, 10, 8)
  // soft blended grey patch at the temple on +X (viewer's right), hugging the cap
  const parts = [
    part(ballS, [0.046, 0.018, 0.018], [0.010, 0.016, 0.010], [0.12, 0.28, 0.06]),
    part(ballS, [0.048, 0.006, 0.008], [0.009, 0.014, 0.009], [0.08, 0.30, 0.08]),
    part(ballS, [0.040, 0.032, 0.004], [0.009, 0.012, 0.008], [0.15, 0.35, 0.06]),
  ]
  tagAW(parts[0], () => [1, 0.45])
  tagAW(parts[1], () => [1, 0.4])
  tagAW(parts[2], () => [2, 0.4])
  return mergeHair(parts)
}
const HAIR_GEO = hoshinoHair()
const GREY_GEO = hoshinoGrey()
const hairMat = makeHairMat(SKIN, HAIR_C, HAIR_BAND, HOSHINO_HAIR_OFF)
const greyMat = makeHairMat(SKIN, HAIR_GREY, '#9a948c', HOSHINO_HAIR_OFF)
const hairInk = makeHairInk(HOSHINO_HAIR_OFF)
function HoshinoHair({ set }) {
  return <group ref={set('hair')}>
    <mesh geometry={HAIR_GEO} material={hairMat} /><mesh geometry={HAIR_GEO} material={hairInk} />
    <mesh geometry={GREY_GEO} material={greyMat} /><mesh geometry={GREY_GEO} material={hairInk} />
  </group>
}

const paint = (g, hex) => {
  const col = new THREE.Color(hex), src = g.index ? g.toNonIndexed() : g
  const a = new Float32Array(src.attributes.position.count * 3)
  for (let i = 0; i < a.length; i += 3) { a[i] = col.r; a[i + 1] = col.g; a[i + 2] = col.b }
  src.setAttribute('color', new THREE.BufferAttribute(a, 3)); return src
}

// open red field notebook: two covers, cream pages facing the camera. Not a closed white slab.
let NB = null
function notebookGeo() {
  if (NB) return NB
  const K = kit({ ink: 0.0014 })
  const open = 0.42
  // covers (red) open like a V toward +Z
  K.box(0.028, 0.0036, 0.040, [-0.015, 0, 0], '#8a2e28', { rot: [0, open, 0] })
  K.box(0.028, 0.0036, 0.040, [0.015, 0, 0], '#8a2e28', { rot: [0, -open, 0] })
  // cream pages, slightly inset
  K.box(0.025, 0.0022, 0.036, [-0.014, 0.0030, 0.001], '#f7f1e4', { rot: [0, open, 0], hull: false })
  K.box(0.025, 0.0022, 0.036, [0.014, 0.0030, 0.001], '#f7f1e4', { rot: [0, -open, 0], hull: false })
  // spine
  K.box(0.006, 0.0044, 0.040, [0, 0.000, -0.002], '#6e241e', { hull: false })
  // a couple of ruled lines on the right page
  K.box(0.016, 0.0006, 0.0007, [0.014, 0.0044, 0.006], '#c8b09a', { rot: [0, -open, 0], hull: false })
  K.box(0.016, 0.0006, 0.0007, [0.014, 0.0044, -0.004], '#c8b09a', { rot: [0, -open, 0], hull: false })
  const P = kit({ ink: 0.0008 })
  // dark pencil, wood tip
  P.cyl(0.0022, 0.052, [0, 0, 0], '#2a241c', { seg: 6 })
  P.cyl(0.0022, 0.008, [0, 0.030, 0], '#d2b48a', { seg: 6, r2: 0.0004, hull: false })
  const m = toon('#ffffff', { vertexColors: true })
  NB = { book: combine(K.build()), pencil: combine(P.build()), m }; return NB
}

function vestGeo() {
  const shape = new THREE.Shape()
  shape.moveTo(-0.016, 0.028)
  shape.lineTo(-0.030, -0.042)
  shape.lineTo(0.030, -0.042)
  shape.lineTo(0.016, 0.028)
  shape.closePath()
  const body = new THREE.ExtrudeGeometry(shape, { depth: 0.010, bevelEnabled: false, steps: 1 })
  const parts = [paint(body, VEST)]
  const btn = new THREE.SphereGeometry(0.0028, 7, 6)
  for (const y of [0.010, -0.008, -0.026]) {
    const g = btn.clone(); g.translate(0, y, 0.011); parts.push(paint(g, '#d9b06a'))
  }
  const g = mergeGeometries(parts); g.computeVertexNormals(); return g
}

function shirtCollarGeo() {
  // small points at the sides of the neck, tucked under the scarf — not a white blob under the chin
  const parts = []
  for (const sd of [-1, 1]) {
    const g = new THREE.BoxGeometry(0.012, 0.007, 0.004)
    g.rotateZ(sd * -0.45)
    g.rotateX(-0.15)
    g.translate(sd * 0.014, 0.008, 0.000)
    parts.push(paint(g, SHIRT))
  }
  return mergeGeometries(parts)
}

function mittenGeo() {
  const g = new THREE.SphereGeometry(0.0180, 12, 10)
  g.scale(1.15, 0.95, 0.90)
  return paint(g, SKIN)
}

function scarfGeo() {
  // knotted rust scarf with two hanging ends over the chest (custom mesh in the lazy chunk)
  const rust = '#c05438', rustD = '#9a3c28'
  const parts = []
  const ring = new THREE.TorusGeometry(0.032, 0.0065, 10, 24)
  ring.rotateX(Math.PI / 2)
  ring.scale(1.16, 0.68, 1.06)
  ring.translate(0, 0.002, 0.006)
  parts.push(paint(ring, rust))
  const knot1 = new THREE.SphereGeometry(0.010, 10, 8)
  knot1.scale(1.45, 0.72, 1.05)
  knot1.translate(0.000, -0.008, 0.030)
  parts.push(paint(knot1, rustD))
  const knot2 = new THREE.SphereGeometry(0.008, 8, 7)
  knot2.scale(1.35, 0.65, 0.95)
  knot2.translate(-0.006, -0.014, 0.032)
  parts.push(paint(knot2, rust))
  // two flat hanging ends, clearly separated over the chest
  const endL = new THREE.BoxGeometry(0.024, 0.058, 0.007)
  endL.rotateZ(0.42)
  endL.translate(-0.022, -0.048, 0.030)
  parts.push(paint(endL, rust))
  const endR = new THREE.BoxGeometry(0.022, 0.046, 0.007)
  endR.rotateZ(-0.52)
  endR.translate(0.024, -0.040, 0.030)
  parts.push(paint(endR, rustD))
  const g = mergeGeometries(parts); g.computeVertexNormals(); return g
}

function lapelGeo() {
  const parts = []
  for (const sd of [-1, 1]) {
    const shape = new THREE.Shape()
    shape.moveTo(0, 0.030)
    shape.lineTo(sd * 0.018, 0.008)
    shape.lineTo(sd * 0.010, -0.006)
    shape.lineTo(0, 0.008)
    shape.closePath()
    const g = new THREE.ExtrudeGeometry(shape, { depth: 0.004, bevelEnabled: false, steps: 1 })
    g.translate(sd * 0.014, 0.004, 0)
    parts.push(paint(g, JACKET))
  }
  const g = mergeGeometries(parts); g.computeVertexNormals(); return g
}

const vestMat = (() => { const m = cel('#ffffff').clone(); m.vertexColors = true; m.defines = { KIND: 1 }; m.polygonOffset = true; m.polygonOffsetFactor = -2; m.polygonOffsetUnits = -2; return m })()

function attachLook(root) {
  const S = spec(HOSHINO.body), g = notebookGeo(), out = []
  const chest = root.getObjectByName('chest')
  if (chest) {
    const chestZ = (S.chest?.[1]?.z ?? 0.05)
    const add = (geo, pos, mat = vestMat, rot) => {
      const m = new THREE.Mesh(geo, mat)
      m.position.set(...pos)
      if (rot) m.rotation.set(...rot)
      m.traverse(o => { o.layers.mask = root.layers.mask })
      chest.add(m); out.push(m)
      return m
    }
    add(vestGeo(), [0, -0.012, chestZ + 0.014])
    add(shirtCollarGeo(), [0, S.neckY - ((S.bellyY + S.chestY) / 2) - 0.010, chestZ * 0.40])
    add(lapelGeo(), [0, 0.010, chestZ + 0.018])
    add(scarfGeo(), [0, S.neckY - ((S.bellyY + S.chestY) / 2) - 0.004, chestZ * 0.55])
    // open book at chest height, pages toward the camera
    const book = add(g.book, [-0.002, 0.016, chestZ + 0.050], g.m, [Math.PI * 0.50, 0.02, 0.04])
    book.scale.setScalar(1.55)
    if (LIFE_OFF) {
      // left mitten under the book, right mitten and pencil on the page (parented so they stay put)
      const mitL = add(mittenGeo(), [-0.032, 0.006, chestZ + 0.046])
      mitL.rotation.set(0.25, 0.45, 0.35)
      mitL.scale.setScalar(1.12)
      const pencil = add(g.pencil, [0.016, 0.028, chestZ + 0.062], g.m, [1.20, 0.40, 0.60])
      const mitR = add(mittenGeo(), [0.034, 0.016, chestZ + 0.050])
      mitR.rotation.set(0.20, -0.35, -0.25)
      mitR.scale.setScalar(1.08)
    }
  }
  return () => out.forEach(h => h.removeFromParent())
}

function readHold(B, st) {
  // still pose: long sleeves reach the book; mittens parented to the book cover the skinned hands.
  // window.__poseH = [upLX, upLY, upLZ, foLX, foLY, foLZ, upRX, upRY, upRZ, foRX, foRY, foRZ]
  const d = (typeof window !== 'undefined' && window.__poseH) || [-0.65, 0.45, 0.12, -1.75, 0.22, 0.12, -0.85, -0.38, -0.12, -1.70, -0.20, -0.10]
  B.upL.rotation.set(d[0], d[1], d[2])
  B.foL.rotation.set(d[3], d[4], d[5])
  B.upR.rotation.set(d[6], d[7], d[8])
  B.foR.rotation.set(d[9], d[10], d[11])
  B.foL.scale.setScalar(1)
  B.foR.scale.setScalar(1)
  B.head.rotation.x = 0.10
}


export const HOSHINO = {
  name: 'scholar', age: 'elder', motion: HOSHINO_MOTION,
  body: { H: 0.90, head: 1.46, leg: 0.92, torso: 1.14, arm: 0.92, girth: 1.20, shoulder: 1.08, chestW: 1.12, bellyZ: 0.96, shX: 1.18, armA: 0.50,
    armR: [1.12, 1.30, 1.38], legR: 1.24, legX: 1.06, foot: 1.20, bootW: 1.22, bootH: 1.16, bootL: 1.00, hand: 1.28,
    cheek: CHEEK, midface: MIDFACE, midfaceFade: MID_FADE, hunch: 0.16,
    anY: 0.038, footY: 0.015, soleY: 0.0012 },
  hair: { style: 'chibi', c: HAIR_C },
  face: { glasses: GLASS },
  // openJacket painter: acc = khaki jacket to mid-thigh, top = vest shown in the opening,
  // bottom = olive trousers. Custom knotted scarf, small shirt collar, and lapels are chest meshes.
  outfit: { type: 'openJacket', hemY: 'thigh', skin: SKIN, top: VEST, acc: JACKET, acc2: JACKET, bottom: '#4e4f38', shoe: '#4e321c', shoeY: 0.044, long: true, sleeve: 'puff', seams: true },
  hold: {},
  walk: { rate: 8, stride: 0.48, knee: 0.6, bounce: 0.008, smooth: true, land: 0.28, arm: 0.45, lean: 0.12, twist: 0.1, sway: 0.07, idle: 'look' },
  ext: {
    life: (B, st, dt, t, R_, mem, state) => { const L = mem.life || (mem.life = makeLife(Math.random, HOSHINO_MOTION)); st.life = L; L.B = B; L.R = R_; L.hairOff = HOSHINO_HAIR_OFF
      if (!LIFE_OFF) lifeStep(L, B, st, dt, t, R_, state.camera); else readHold(B, st) },
    post: (R_, st, dt, t) => { if (!LIFE_OFF) lifePost(st.life, R_, st, dt, t) },
    Face, Hair: HoshinoHair,
  },
}

export function ChibiHoshino({ st, scale = 0.8, res }) {
  const g = useRef()
  const r = res ?? (TOUCH ? 40 : 52)
  useEffect(() => { let off = null, n = 0
    const iv = setInterval(() => { const root = g.current; if (root && root.getObjectByName('chest')) { off = attachLook(root); clearInterval(iv) } else if (++n > 50) clearInterval(iv) }, 80)
    return () => { clearInterval(iv); off && off() } }, [])
  return <group ref={g}><Character cfg={HOSHINO} st={st} res={r} scale={scale} /></group>
}
export default ChibiHoshino
