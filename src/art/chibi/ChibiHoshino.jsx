// Professor Hoshino: a lazy chibi on the shared pipeline. Dark messy hair with a
// grey-streaked side, no beard, thick dark brows, round dark glasses, a khaki
// jacket over a green waistcoat, rust scarf, dark olive trousers, brown boots,
// and an open red notebook + pencil. Stocky, about Fuku's height. No cane.
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
const HAIR_C = '#453c36'
const HAIR_GREY = '#8a8278'
const HAIR_BAND = '#6a625a'
const GLASS = '#2e2420'
const JACKET = '#c09a66'
const VEST = '#585a40'
const HOSHINO_HAIR_OFF = new Float32Array(12)
const Face = makeFace({ kind: 'hoshino', glasses: GLASS, defaultSquint: 0.06, blush: 0.55 })

const EAR = { x: 0.068, y: -0.0165, z: 0.0025 }
function hoshinoHair() {
  const ball = new THREE.SphereGeometry(1, 16, 12), ballS = new THREE.SphereGeometry(1, 10, 8)
  // fuller, messier helmet; tufts on top; side volume covers the ears
  const parts = [
    part(ball, [0, 0.016, -0.014], [0.070, 0.060, 0.062]),
    part(ball, [0, 0.000, -0.036], [0.058, 0.042, 0.048]),
    part(ballS, [0.0, 0.074, -0.002], [0.022, 0.020, 0.018]),
    part(ballS, [0.024, 0.068, 0.006], [0.016, 0.016, 0.014], [0.35, 0.55, 0.25]),
    part(ballS, [-0.022, 0.066, 0.002], [0.015, 0.016, 0.014], [0.3, -0.5, -0.2]),
    part(ballS, [0.012, 0.072, -0.018], [0.014, 0.014, 0.013], [0.45, 0.25, 0]),
    part(ballS, [-0.008, 0.070, 0.012], [0.012, 0.014, 0.012], [0.4, -0.2, 0.15]),
    part(ballS, [0, 0.034, 0.046], [0.028, 0.008, 0.009]),
    ...[-1, 1].map(d => part(ballS, [d * 0.032, 0.026, 0.040], [0.013, 0.009, 0.010], [0, d * 0.15, 0])),
    ...[-1, 1].map(d => part(ballS, [d * 0.058, -0.004, 0.006], [0.016, 0.028, 0.018], [0.1, d * 0.4, d * 0.1])),
    ...[-1, 1].map(d => part(ballS, [d * EAR.x, EAR.y, EAR.z], [0.0028, 0.0080, 0.0048], [0, d * 0.75, d * 0.1], 1)),
  ]
  tagAW(parts[0], () => [3, 0])
  tagAW(parts[1], () => [3, 0])
  tagAW(parts[2], (x, y) => [2, sm(0.05, 0.08, y)])
  tagAW(parts[3], () => [2, 0.7])
  tagAW(parts[4], () => [2, 0.7])
  tagAW(parts[5], () => [2, 0.65])
  tagAW(parts[6], () => [2, 0.65])
  tagAW(parts[7], () => [3, 0.5])
  for (const k of [8, 9]) tagAW(parts[k], () => [3, 0.45])
  for (const k of [10, 11]) tagAW(parts[k], (x) => [x < 0 ? 0 : 1, 0.55])
  for (const k of [12, 13]) tagAW(parts[k], () => [3, 0])
  return mergeHair(parts)
}
function hoshinoGrey() {
  const ballS = new THREE.SphereGeometry(1, 10, 8)
  // grey streak is strongest on +X (viewer's right / his left), with a quieter temple on the other side
  const parts = [
    part(ballS, [0.050, 0.022, 0.008], [0.018, 0.030, 0.022], [0.12, 0.35, 0.1]),
    part(ballS, [0.042, 0.044, -0.002], [0.016, 0.020, 0.016], [0.2, 0.4, 0.1]),
    part(ballS, [0.030, 0.014, 0.036], [0.013, 0.014, 0.012], [0.1, 0.2, 0]),
    part(ballS, [-0.048, 0.018, 0.006], [0.014, 0.022, 0.016], [0.1, -0.3, -0.1]),
  ]
  tagAW(parts[0], (x) => [1, 0.55])
  tagAW(parts[1], () => [2, 0.5])
  tagAW(parts[2], () => [3, 0.4])
  tagAW(parts[3], () => [0, 0.5])
  return mergeHair(parts)
}
const HAIR_GEO = hoshinoHair()
const GREY_GEO = hoshinoGrey()
const hairMat = makeHairMat(SKIN, HAIR_C, HAIR_BAND, HOSHINO_HAIR_OFF)
const greyMat = makeHairMat(SKIN, HAIR_GREY, '#a8a096', HOSHINO_HAIR_OFF)
const hairInk = makeHairInk(HOSHINO_HAIR_OFF)
function HoshinoHair({ set }) {
  return <group ref={set('hair')}>
    <mesh geometry={HAIR_GEO} material={hairMat} /><mesh geometry={HAIR_GEO} material={hairInk} />
    <mesh geometry={GREY_GEO} material={greyMat} /><mesh geometry={GREY_GEO} material={hairInk} />
  </group>
}

// red field notebook + pencil, copied from the museum figure so the villager chunk does not import museum art
let NB = null
function notebookGeo() {
  if (NB) return NB
  const K = kit({ ink: 0.0015 })
  K.box(0.05, 0.008, 0.068, [0, 0, 0], '#8a3a32'); K.box(0.046, 0.004, 0.064, [0, 0.006, 0.001], '#fbf3e2', { hull: false })
  K.box(0.002, 0.002, 0.05, [-0.008, 0.0085, 0], '#7a6a5a', { hull: false }); K.box(0.002, 0.002, 0.04, [0.01, 0.0085, -0.004], '#7a6a5a', { hull: false })
  K.box(0.004, 0.004, 0.068, [0.024, 0.006, 0], '#d9a54a', { hull: false })
  const P = kit({ ink: 0.001 }); P.cyl(0.0025, 0.055, [0, 0, 0], '#e8b84a', { seg: 6 }); P.cyl(0.0025, 0.008, [0, 0.031, 0], '#3b2f22', { seg: 6, r2: 0.0003, hull: false })
  const m = toon('#ffffff', { vertexColors: true })
  NB = { book: combine(K.build()), pencil: combine(P.build()), m }; return NB
}
function attachNotebook(root) {
  const S = spec(HOSHINO.body), g = notebookGeo(), out = []
  const chest = root.getObjectByName('chest'), foR = root.getObjectByName('foR')
  if (chest) {
    const book = new THREE.Mesh(g.book, g.m)
    // pages face the camera: +Y (page face) -> +Z in chest space
    book.rotation.set(Math.PI * 0.42, 0.08, 0.06)
    book.position.set(-0.006, -0.016, (S.chest?.[1]?.z ?? 0.05) + 0.034)
    book.scale.setScalar(1.15)
    book.traverse(o => { o.layers.mask = root.layers.mask })
    chest.add(book); out.push(book)
  }
  if (foR) {
    const hand = new THREE.Group(); hand.position.copy(S.hdR.clone().sub(S.elR)); foR.add(hand); out.push(hand)
    const m = new THREE.Mesh(g.pencil, g.m)
    m.rotation.set(0.9, 0.15, 0.25); m.position.set(0.002, 0.008, 0.014)
    m.traverse(o => { o.layers.mask = root.layers.mask }); hand.add(m)
  }
  return () => out.forEach(h => h.removeFromParent())
}

const paint = (g, hex) => {
  const col = new THREE.Color(hex), src = g.index ? g.toNonIndexed() : g
  const a = new Float32Array(src.attributes.position.count * 3)
  for (let i = 0; i < a.length; i += 3) { a[i] = col.r; a[i + 1] = col.g; a[i + 2] = col.b }
  src.setAttribute('color', new THREE.BufferAttribute(a, 3)); return src
}
function vestGeo() {
  const shape = new THREE.Shape()
  // CCW trapezoid: wider at the bottom, sits clearly below the scarf
  shape.moveTo(-0.014, 0.008)
  shape.lineTo(-0.028, -0.038)
  shape.lineTo(0.028, -0.038)
  shape.lineTo(0.014, 0.008)
  shape.closePath()
  const body = new THREE.ExtrudeGeometry(shape, { depth: 0.008, bevelEnabled: false, steps: 1 })
  const parts = [paint(body, VEST)]
  const btn = new THREE.SphereGeometry(0.0024, 6, 5)
  for (const y of [0.000, -0.016]) { const g = btn.clone(); g.translate(0, y, 0.009); parts.push(paint(g, '#d9b06a')) }
  const g = mergeGeometries(parts); g.computeVertexNormals(); return g
}
const vestMat = (() => { const m = cel('#ffffff').clone(); m.vertexColors = true; m.defines = { KIND: 1 }; m.polygonOffset = true; m.polygonOffsetFactor = -1; m.polygonOffsetUnits = -2; return m })()
function attachVest(root) {
  const chest = root.getObjectByName('chest'); if (!chest) return () => {}
  const S = spec(HOSHINO.body)
  const m = new THREE.Mesh(vestGeo(), vestMat)
  m.position.set(0, -0.016, (S.chest?.[1]?.z ?? 0.05) + 0.028)
  m.traverse(o => { o.layers.mask = root.layers.mask })
  chest.add(m)
  return () => m.removeFromParent()
}

function readHold(B, st) {
  // still pose only (LIFE_OFF). Apply absolutely so a non-look idle cannot skip it.
  B.upL.rotation.set(-0.95, 0, 0.42)
  B.foL.rotation.set(-1.10, 0, 0)
  B.upR.rotation.set(-0.98, 0, -0.36)
  B.foR.rotation.set(-1.12, 0, 0)
  B.head.rotation.x = 0.04
}

export const HOSHINO = {
  name: 'scholar', age: 'elder', motion: HOSHINO_MOTION,
  body: { H: 0.90, head: 1.46, leg: 0.92, torso: 1.14, arm: 0.90, girth: 1.22, shoulder: 1.06, chestW: 1.12, bellyZ: 0.98, shX: 1.16, armA: 0.52,
    armR: [1.14, 1.36, 1.46], legR: 1.26, legX: 1.06, foot: 1.22, bootW: 1.24, bootH: 1.18, bootL: 1.02, hand: 1.20,
    cheek: CHEEK, midface: MIDFACE, midfaceFade: MID_FADE, hunch: 0.18,
    anY: 0.038, footY: 0.015, soleY: 0.0012 },
  hair: { style: 'chibi', c: HAIR_C },
  scarf: '#b84830',
  face: { glasses: GLASS },
  // jacket (not cardigan) so the khaki closes at the waist — no black midriff block. Vest is a chest mesh.
  outfit: { type: 'jacket', skin: SKIN, top: JACKET, bottom: '#4e4f38', shoe: '#4e321c', shoeY: 0.044, long: true, sleeve: 'puff', seams: true },
  hold: {},
  walk: { rate: 8, stride: 0.48, knee: 0.6, bounce: 0.008, smooth: true, land: 0.28, arm: 0.45, lean: 0.12, twist: 0.1, sway: 0.07, idle: 'look' },
  ext: {
    life: (B, st, dt, t, R_, mem, state) => { const L = mem.life || (mem.life = makeLife(Math.random, HOSHINO_MOTION)); st.life = L; L.B = B; L.R = R_; L.hairOff = HOSHINO_HAIR_OFF
      if (!LIFE_OFF) lifeStep(L, B, st, dt, t, R_, state.camera); else readHold(B, st) },
    post: (R_, st, dt, t) => { if (!LIFE_OFF) lifePost(st.life, R_, st, dt, t) },
    Face, Hair: HoshinoHair,
    tails: [-0.35, 0.3], tailX: 0.22, knot: [0, -0.012, 0.008, 1.15], ring: [1.18, 1.14, 1.14],
  },
}

export function ChibiHoshino({ st, scale = 0.8, res }) {
  const g = useRef()
  const r = res ?? (TOUCH ? 40 : 52)
  useEffect(() => { let offN = null, offV = null, n = 0
    const iv = setInterval(() => { const root = g.current; if (root && root.getObjectByName('foL') && root.getObjectByName('chest')) { offN = attachNotebook(root); offV = attachVest(root); clearInterval(iv) } else if (++n > 50) clearInterval(iv) }, 80)
    return () => { clearInterval(iv); offN && offN(); offV && offV() } }, [])
  return <group ref={g}><Character cfg={HOSHINO} st={st} res={r} scale={scale} /></group>
}
export default ChibiHoshino
