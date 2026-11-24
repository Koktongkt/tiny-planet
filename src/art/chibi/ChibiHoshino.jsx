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

const EAR = { x: 0.064, y: -0.018, z: -0.002 }
function hoshinoHair() {
  const ball = new THREE.SphereGeometry(1, 16, 12), ballS = new THREE.SphereGeometry(1, 10, 8)
  // messy clumps, volume on top, side locks that hide the ears
  const parts = [
    part(ball, [0, 0.014, -0.012], [0.068, 0.056, 0.060]),
    part(ball, [0, -0.002, -0.036], [0.056, 0.044, 0.048]),
    // top volume — several tufts, not one helmet cap
    part(ballS, [0.018, 0.060, 0.010], [0.020, 0.016, 0.016], [0.35, 0.5, 0.15]),
    part(ballS, [-0.016, 0.062, 0.006], [0.018, 0.016, 0.015], [0.3, -0.45, -0.12]),
    part(ballS, [0.008, 0.058, -0.022], [0.018, 0.016, 0.016], [0.45, 0.15, 0]),
    part(ballS, [-0.010, 0.056, 0.018], [0.016, 0.016, 0.014], [0.4, -0.2, 0.12]),
    part(ballS, [0.034, 0.048, -0.010], [0.016, 0.016, 0.016], [0.25, 0.4, 0.1]),
    part(ballS, [-0.032, 0.046, -0.006], [0.016, 0.016, 0.015], [0.2, -0.35, -0.1]),
    part(ballS, [0.000, 0.064, -0.008], [0.024, 0.012, 0.018]),
    // fringe clumps
    part(ballS, [0, 0.032, 0.048], [0.026, 0.010, 0.012]),
    ...[-1, 1].map(d => part(ballS, [d * 0.028, 0.024, 0.044], [0.016, 0.012, 0.012], [0.1, d * 0.25, 0])),
    // side volume covering the ears (rounded, not pointed)
    ...[-1, 1].map(d => part(ballS, [d * 0.060, 0.000, 0.006], [0.018, 0.028, 0.020], [0.1, d * 0.35, d * 0.08])),
    ...[-1, 1].map(d => part(ballS, [d * 0.056, -0.016, 0.004], [0.016, 0.022, 0.016], [0.2, d * 0.3, d * 0.08])),
  ]
  tagAW(parts[0], () => [3, 0])
  tagAW(parts[1], () => [3, 0])
  for (const k of [2, 3, 4, 5, 6, 7, 8]) tagAW(parts[k], () => [2, 0.7])
  tagAW(parts[9], () => [3, 0.5])
  for (const k of [10, 11]) tagAW(parts[k], () => [3, 0.45])
  for (const k of [12, 13, 14, 15]) tagAW(parts[k], (x) => [x < 0 ? 0 : 1, 0.55])
  return mergeHair(parts)
}
function hoshinoGrey() {
  const ballS = new THREE.SphereGeometry(1, 10, 8)
  // soft blended streak on +X (viewer's right): thin overlapping locks, not a flat patch
  const parts = [
    part(ballS, [0.048, 0.028, 0.016], [0.010, 0.022, 0.012], [0.15, 0.3, 0.08]),
    part(ballS, [0.052, 0.008, 0.010], [0.009, 0.020, 0.012], [0.1, 0.35, 0.1]),
    part(ballS, [0.044, 0.046, 0.000], [0.010, 0.016, 0.010], [0.2, 0.4, 0.08]),
    part(ballS, [0.036, 0.016, 0.034], [0.008, 0.012, 0.008], [0.1, 0.2, 0]),
    part(ballS, [-0.050, 0.012, 0.006], [0.008, 0.014, 0.010], [0.1, -0.25, -0.08]),
  ]
  tagAW(parts[0], () => [1, 0.5])
  tagAW(parts[1], () => [1, 0.5])
  tagAW(parts[2], () => [2, 0.45])
  tagAW(parts[3], () => [3, 0.4])
  tagAW(parts[4], () => [0, 0.4])
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
  const parts = []
  for (const sd of [-1, 1]) {
    const g = new THREE.BoxGeometry(0.016, 0.012, 0.006)
    g.rotateZ(sd * -0.35)
    g.rotateX(-0.25)
    g.translate(sd * 0.012, 0.006, 0.002)
    parts.push(paint(g, SHIRT))
  }
  return mergeGeometries(parts)
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
  const chest = root.getObjectByName('chest'), foL = root.getObjectByName('foL'), foR = root.getObjectByName('foR')
  if (chest) {
    const chestZ = (S.chest?.[1]?.z ?? 0.05)
    const add = (geo, pos, mat = vestMat) => {
      const m = new THREE.Mesh(geo, mat)
      m.position.set(...pos)
      m.traverse(o => { o.layers.mask = root.layers.mask })
      chest.add(m); out.push(m)
    }
    add(vestGeo(), [0, -0.010, chestZ + 0.016])
    add(shirtCollarGeo(), [0, 0.030, chestZ * 0.55 + 0.008])
    add(lapelGeo(), [0, 0.012, chestZ + 0.020])
  }
  // open book on the chest (pages toward the camera) so forearm skinning cannot edge-on it
  if (chest) {
    const chestZ = (S.chest?.[1]?.z ?? 0.05)
    const book = new THREE.Mesh(g.book, g.m)
    book.rotation.set(Math.PI * 0.48, 0.04, 0.08)
    book.position.set(-0.002, -0.002, chestZ + 0.050)
    book.scale.setScalar(1.28)
    book.traverse(o => { o.layers.mask = root.layers.mask })
    chest.add(book); out.push(book)
  }
  if (foR) {
    const hand = new THREE.Group(); hand.position.copy(S.hdR.clone().sub(S.elR)); foR.add(hand); out.push(hand)
    const m = new THREE.Mesh(g.pencil, g.m)
    m.rotation.set(1.05, 0.2, 0.15)
    m.position.set(0.002, 0.010, 0.016)
    m.traverse(o => { o.layers.mask = root.layers.mask }); hand.add(m)
  }
  return () => out.forEach(h => h.removeFromParent())
}

function readHold(B, st) {
  // left hand supports the open book at the chest; right hand writes with the pencil
  B.upL.rotation.set(-0.92, 0.12, 0.38)
  B.foL.rotation.set(-1.15, 0.20, 0.12)
  B.upR.rotation.set(-1.00, -0.10, -0.32)
  B.foR.rotation.set(-1.20, -0.15, -0.08)
  B.head.rotation.x = 0.08
}

// slightly longer hanging scarf ends
const tailGeo = (() => {
  const g = new THREE.ConeGeometry(0.018, 0.082, 6)
  g.translate(0, -0.040, 0)
  g.scale(1.15, 1, 0.42)
  return g
})()

export const HOSHINO = {
  name: 'scholar', age: 'elder', motion: HOSHINO_MOTION,
  body: { H: 0.90, head: 1.46, leg: 0.92, torso: 1.14, arm: 0.92, girth: 1.20, shoulder: 1.08, chestW: 1.12, bellyZ: 0.96, shX: 1.18, armA: 0.50,
    armR: [1.12, 1.30, 1.38], legR: 1.24, legX: 1.06, foot: 1.20, bootW: 1.22, bootH: 1.16, bootL: 1.00, hand: 1.28,
    cheek: CHEEK, midface: MIDFACE, midfaceFade: MID_FADE, hunch: 0.16,
    anY: 0.038, footY: 0.015, soleY: 0.0012 },
  hair: { style: 'chibi', c: HAIR_C },
  scarf: '#b84830',
  face: { glasses: GLASS },
  // cardigan painter: acc = khaki jacket, top = white shirt shown in the open front,
  // bottom = olive trousers. Vest, collar and lapels are chest meshes. acc2 matches
  // the jacket so the painter's own buttons stay hidden.
  outfit: { type: 'cardigan', skin: SKIN, top: SHIRT, acc: JACKET, acc2: JACKET, bottom: '#4e4f38', shoe: '#4e321c', shoeY: 0.044, long: true, sleeve: 'puff', seams: true },
  hold: {},
  walk: { rate: 8, stride: 0.48, knee: 0.6, bounce: 0.008, smooth: true, land: 0.28, arm: 0.45, lean: 0.12, twist: 0.1, sway: 0.07, idle: 'look' },
  ext: {
    life: (B, st, dt, t, R_, mem, state) => { const L = mem.life || (mem.life = makeLife(Math.random, HOSHINO_MOTION)); st.life = L; L.B = B; L.R = R_; L.hairOff = HOSHINO_HAIR_OFF
      if (!LIFE_OFF) lifeStep(L, B, st, dt, t, R_, state.camera); else readHold(B, st) },
    post: (R_, st, dt, t) => { if (!LIFE_OFF) lifePost(st.life, R_, st, dt, t) },
    Face, Hair: HoshinoHair,
    tails: [-0.22, 0.20], tailX: 1.05, knot: [0, -0.014, 0.012, 1.2], ring: [1.20, 1.14, 1.14],
    tailGeo,
  },
}

export function ChibiHoshino({ st, scale = 0.8, res }) {
  const g = useRef()
  const r = res ?? (TOUCH ? 40 : 52)
  useEffect(() => { let off = null, n = 0
    const iv = setInterval(() => { const root = g.current; if (root && root.getObjectByName('foL') && root.getObjectByName('chest')) { off = attachLook(root); clearInterval(iv) } else if (++n > 50) clearInterval(iv) }, 80)
    return () => { clearInterval(iv); off && off() } }, [])
  return <group ref={g}><Character cfg={HOSHINO} st={st} res={r} scale={scale} /></group>
}
export default ChibiHoshino
