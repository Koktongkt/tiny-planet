// Grandma Fuku: a lazy chibi on the shared pipeline (~2.5 heads). Open round eyes
// behind wire glasses, grey brows and smile lines, grey top bun, a lilac wrap
// cardigan with a cream inner collar, a cream scalloped apron over a lilac skirt,
// a pincushion, and a teacup held in both hands at the chest.
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
const HAIR_C = '#e4d6c6'
const HAIR_BAND = '#ece6dc'
const GLASS = '#a88858'
const LILAC = '#b38aa2'
const CREAM = '#f0e2cc'
const COLLAR = '#e8dcc8'
const FUKU_HAIR_OFF = new Float32Array(12)
const Face = makeFace({ kind: 'fuku', glasses: GLASS, defaultSquint: 0.1, blush: 0.72 })

const EAR = { x: 0.068, y: -0.0165, z: 0.0025 }
function fukuHair() {
  const ball = new THREE.SphereGeometry(1, 16, 12), ballS = new THREE.SphereGeometry(1, 12, 9), ring = new THREE.TorusGeometry(1, 0.28, 6, 16)
  // fuller helmet so the bun sits in the crown (sheet: a scoop, not a floating orb)
  const parts = [
    part(ball, [0, 0.012, -0.014], [0.067, 0.056, 0.060]),
    part(ball, [0, -0.004, -0.034], [0.056, 0.040, 0.046]), // nape
    part(ball, [0, 0.066, -0.006], [0.024, 0.022, 0.023]), // bun seated in the crown
    part(ring, [0, 0.054, -0.006], [0.017, 0.017, 0.012], [Math.PI / 2 - 0.08, 0, 0]),
    part(ballS, [0, 0.034, 0.046], [0.030, 0.008, 0.010]), // short fringe, leaves the brows clear
    ...[-1, 1].map(d => part(ballS, [d * 0.028, 0.030, 0.042], [0.015, 0.008, 0.009], [0, d * 0.2, d * 0.12])),
    ...[-1, 1].map(d => part(ballS, [d * 0.058, -0.016, 0.012], [0.016, 0.030, 0.016], [0.15, d * 0.35, d * 0.12])),
    ...[-1, 1].map(d => part(ballS, [d * EAR.x, EAR.y, EAR.z], [0.0038, 0.0110, 0.0068], [0, d * 0.75, d * 0.1], 1)),
  ]
  tagAW(parts[0], (x, y, z) => [3, sm(0.02, -0.03, y) * sm(-0.01, 0.04, z) * 0.55])
  tagAW(parts[1], () => [3, 0])
  tagAW(parts[2], (x, y) => [2, sm(0.06, 0.12, y)])
  tagAW(parts[3], () => [2, 0.4])
  tagAW(parts[4], () => [3, 0.7])
  for (const k of [5, 6]) tagAW(parts[k], () => [3, 0.65])
  for (const k of [7, 8]) tagAW(parts[k], (x) => [x < 0 ? 0 : 1, 0.7])
  for (const k of [9, 10]) tagAW(parts[k], () => [3, 0])
  return mergeHair(parts)
}
const HAIR_GEO = fukuHair()
const hairMat = makeHairMat(SKIN, HAIR_C, HAIR_BAND, FUKU_HAIR_OFF)
const hairInk = makeHairInk(FUKU_HAIR_OFF)
function FukuHair({ set }) {
  return <group ref={set('hair')}><mesh geometry={HAIR_GEO} material={hairMat} /><mesh geometry={HAIR_GEO} material={hairInk} /></group>
}

// teacup (cream mug, brown tea, simple handle) — held in both hands at the chest in stills
let CUP = null
function cupGeo() {
  if (CUP) return CUP
  const bowl = new THREE.SphereGeometry(0.012, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.62); bowl.scale(1, 0.78, 1); bowl.translate(0, 0.003, 0)
  const tea = new THREE.CircleGeometry(0.0090, 12); tea.rotateX(-Math.PI / 2); tea.translate(0, 0.0088, 0)
  const handle = new THREE.TorusGeometry(0.0060, 0.0012, 6, 10, Math.PI * 1.15); handle.rotateY(Math.PI / 2); handle.translate(0.012, 0.004, 0)
  const cBowl = bowl.index ? bowl.toNonIndexed() : bowl, cHan = handle.index ? handle.toNonIndexed() : handle, cTea = tea.index ? tea.toNonIndexed() : tea
  const paint = (g, hex) => { const col = new THREE.Color(hex), a = new Float32Array(g.attributes.position.count * 3); for (let i = 0; i < a.length; i += 3) { a[i] = col.r; a[i + 1] = col.g; a[i + 2] = col.b } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g }
  paint(cBowl, '#f4eee4'); paint(cHan, '#f4eee4'); paint(cTea, '#7a4a28')
  const celG = mergeGeometries([cBowl, cHan, cTea]); celG.computeVertexNormals()
  CUP = celG; return CUP
}
const cupMat = (() => { const m = cel('#ffffff').clone(); m.vertexColors = true; m.defines = { KIND: 1 }; return m })()
const paint = (g, hex) => {
  const col = new THREE.Color(hex), src = g.index ? g.toNonIndexed() : g
  const a = new Float32Array(src.attributes.position.count * 3)
  for (let i = 0; i < a.length; i += 3) { a[i] = col.r; a[i + 1] = col.g; a[i + 2] = col.b }
  src.setAttribute('color', new THREE.BufferAttribute(a, 3)); return src
}

function collarGeo() {
  const parts = []
  // two soft wrap-collar bands forming a cream V at the neck, not a sailor bib
  for (const sd of [-1, 1]) {
    const g = new THREE.BoxGeometry(0.010, 0.038, 0.005)
    g.rotateZ(sd * -0.55)
    g.translate(sd * 0.013, 0.008, 0.054)
    parts.push(paint(g, COLLAR))
  }
  const g = mergeGeometries(parts); g.computeVertexNormals(); return g
}

function apronGeo() {
  const w = 0.050, top = 0.090, bot = -0.046, nx = 20, ny = 14, nSc = 5, amp = 0.009
  const pos = [], idx = []
  for (let j = 0; j <= ny; j++) {
    for (let i = 0; i <= nx; i++) {
      const u = i / nx, v = j / ny
      const x = -w + 2 * w * u
      const scall = Math.abs(Math.sin(u * nSc * Math.PI)) * amp
      const y = top + (bot - scall - top) * v
      const z = 0.012 - 0.010 * (x * x) / (w * w)
      pos.push(x, y, z)
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
  const ball = new THREE.SphereGeometry(0.012, 10, 8)
  const bowl = new THREE.SphereGeometry(0.014, 10, 6, 0, Math.PI * 2, Math.PI * 0.45, Math.PI * 0.55)
  bowl.scale(1, 0.72, 1); bowl.translate(0, -0.004, 0)
  const pin = new THREE.SphereGeometry(0.0020, 6, 5)
  const parts = [paint(ball, '#c4a882'), paint(bowl, '#7a5a3c')]
  const heads = [[0.003, 0.011, 0.003, '#e8dcc0'], [-0.004, 0.010, -0.002, '#d8c8b0'], [0.001, 0.012, -0.004, '#c45a48']]
  for (const [x, y, z, hex] of heads) { const g = pin.clone(); g.translate(x, y, z); parts.push(paint(g, hex)) }
  const g = mergeGeometries(parts); g.computeVertexNormals(); return g
}

const propMat = (() => { const m = cel('#ffffff').clone(); m.vertexColors = true; m.defines = { KIND: 1 }; m.polygonOffset = true; m.polygonOffsetFactor = -1; m.polygonOffsetUnits = -2; return m })()

function attachLook(root) {
  const chest = root.getObjectByName('chest'), hips = root.getObjectByName('hips')
  if (!chest || !hips) return () => {}
  const S = spec(FUKU.body)
  const hipsY = (S.hipY + S.bellyY) / 2, chestY = (S.bellyY + S.chestY) / 2
  const out = []
  const add = (parent, geo, pos) => {
    const m = new THREE.Mesh(geo, propMat)
    m.position.set(...pos)
    m.traverse(o => { o.layers.mask = root.layers.mask })
    parent.add(m); out.push(m)
  }
  add(chest, collarGeo(), [0, S.neckY - chestY - 0.038, (S.chest?.[1]?.z ?? 0.05) * 0.55 + 0.010])
  // apron hangs from the hips so it stays with the skirt when she sits; sit it clearly in front of the belly
  const az = (S.belly?.[1]?.z ?? 0.055) + 0.016
  add(hips, apronGeo(), [0, 0.016, az])
  add(hips, pincushionGeo(), [0.032, -0.022, az + 0.016])
  const cup = new THREE.Mesh(cupGeo(), cupMat)
  cup.position.set(0, 0.012, (S.chest?.[1]?.z ?? 0.05) + 0.038)
  cup.rotation.set(0.15, 0, 0)
  cup.scale.setScalar(2.15)
  cup.traverse(o => { o.layers.mask = root.layers.mask })
  chest.add(cup); out.push(cup)
  return () => { out.forEach(m => m.removeFromParent()) }
}

function chestHold(B, st) {
  // still pose only (LIFE_OFF). Apply absolutely so an idle like 'sway' cannot skip it.
  B.upL.rotation.set(-1.22, 0, 1.12)
  B.upR.rotation.set(-1.22, 0, -1.12)
  B.foL.rotation.set(-1.28, 0, 0)
  B.foR.rotation.set(-1.28, 0, 0)
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
  body: { H: 0.88, head: 1.48, leg: 0.90, torso: 1.16, arm: 0.88, girth: 1.34, shoulder: 1.04, chestW: 1.16, bellyZ: 0.94, shX: 1.18, armA: 0.55,
    armR: [1.16, 1.40, 1.50], legR: 1.30, legX: 1.08, foot: 1.18, bootW: 1.22, bootH: 1.05, bootL: 0.92, hand: 1.22,
    cheek: CHEEK, midface: MIDFACE, midfaceFade: MID_FADE, hunch: 0.22, skirt: 'long',
    anY: 0.036, footY: 0.014, soleY: 0.0012 },
  hair: { style: 'chibi', c: HAIR_C },
  face: { glasses: GLASS },
  outfit: { type: 'dress', skin: SKIN, top: LILAC, shoe: '#3a241e', long: true, sleeve: 'puff', skirt: true },
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
