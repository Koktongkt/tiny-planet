// Grandma Fuku: a lazy chibi on the shared pipeline (~2.5 heads). Kind crinkled eyes, grey bun,
// lilac dress + cream apron, wire glasses, teacup. Life layer is calmer and slower than hers.
import * as THREE from 'three'
import React, { useEffect, useRef } from 'react'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { Character, cel, spec } from '../../GhibliPerson.jsx'
import { FUKU_MOTION } from './motion.js'
import { makeLife, lifeStep, lifePost } from './life.js'
import { CHEEK, MIDFACE, MID_FADE, makeFace } from './castFace.js'
import { part, tagAW, sm, mergeHair, makeHairMat, makeHairInk } from './castHair.js'
import { q } from '../../common.jsx'

const TOUCH = typeof window !== 'undefined' && matchMedia('(pointer: coarse)').matches
const LIFE_OFF = q.has('still') && !q.has('life')
const SKIN = '#f7d3b8'
const HAIR_C = '#d4cfc8'
const HAIR_BAND = '#ece8e2'
const GLASS = '#9a7a55'
const FUKU_HAIR_OFF = new Float32Array(12)
const Face = makeFace({ kind: 'fuku', glasses: GLASS, defaultSquint: 0.2, blush: 0.72 })

const EAR = { x: 0.068, y: -0.0165, z: 0.0025 }
function fukuHair() {
  const ball = new THREE.SphereGeometry(1, 16, 12), ballS = new THREE.SphereGeometry(1, 12, 9), ring = new THREE.TorusGeometry(1, 0.28, 6, 16)
  // soft rounded helmet, a little shorter at the nape than hers; a high round bun; soft side locks and fringe tips
  const parts = [
    part(ball, [0, 0.006, -0.006], [0.072, 0.070, 0.068]), // helmet
    part(ball, [0, -0.012, -0.028], [0.062, 0.048, 0.052]), // nape
    part(ball, [0, 0.078, -0.004], [0.026, 0.026, 0.025]), // high bun (the silhouette)
    part(ring, [0, 0.066, -0.004], [0.020, 0.020, 0.016], [Math.PI / 2 - 0.12, 0, 0]), // wrap
    part(ballS, [0, 0.028, 0.052], [0.036, 0.016, 0.016]), // soft centre fringe
    ...[-1, 1].map(d => part(ballS, [d * 0.028, 0.016, 0.048], [0.018, 0.016, 0.014], [0, d * 0.2, d * 0.15])), // side fringe
    ...[-1, 1].map(d => part(ballS, [d * 0.058, -0.022, 0.018], [0.014, 0.028, 0.016], [0.15, d * 0.35, d * 0.2])), // side locks
    ...[-1, 1].map(d => part(ballS, [d * EAR.x, EAR.y, EAR.z], [0.0042, 0.0122, 0.0076], [0, d * 0.75, d * 0.1], 1)),
  ]
  tagAW(parts[0], (x, y, z) => [3, sm(0.02, -0.03, y) * sm(-0.01, 0.04, z) * 0.55])
  tagAW(parts[1], () => [3, 0])
  tagAW(parts[2], (x, y) => [2, sm(0.06, 0.10, y)])
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

// teacup (cream bowl, brown tea, simple handle) + a tomato pincushion: both stay in this lazy chunk
let CUP = null
function cupGeo() {
  if (CUP) return CUP
  const bowl = new THREE.SphereGeometry(0.011, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.6); bowl.scale(1, 0.7, 1); bowl.translate(0, 0.002, 0)
  const tea = new THREE.CircleGeometry(0.0082, 12); tea.rotateX(-Math.PI / 2); tea.translate(0, 0.0074, 0)
  const handle = new THREE.TorusGeometry(0.0055, 0.00115, 6, 10, Math.PI * 1.15); handle.rotateY(Math.PI / 2); handle.translate(0.011, 0.003, 0)
  const saucer = new THREE.CylinderGeometry(0.013, 0.011, 0.0016, 12); saucer.translate(0, -0.005, 0)
  const cBowl = bowl.index ? bowl.toNonIndexed() : bowl, cHan = handle.index ? handle.toNonIndexed() : handle, cSau = saucer.index ? saucer.toNonIndexed() : saucer, cTea = tea.index ? tea.toNonIndexed() : tea
  const paint = (g, hex) => { const col = new THREE.Color(hex), a = new Float32Array(g.attributes.position.count * 3); for (let i = 0; i < a.length; i += 3) { a[i] = col.r; a[i + 1] = col.g; a[i + 2] = col.b } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g }
  paint(cBowl, '#f2ebe0'); paint(cHan, '#f2ebe0'); paint(cSau, '#e8e0d2'); paint(cTea, '#7a4a28')
  const celG = mergeGeometries([cBowl, cHan, cSau, cTea]); celG.computeVertexNormals()
  CUP = celG; return CUP
}
const cupMat = (() => { const m = cel('#ffffff').clone(); m.vertexColors = true; m.defines = { KIND: 1 }; return m })()
function HandR() { return <mesh geometry={cupGeo()} material={cupMat} position={[0.002, -0.006, 0.01]} rotation={[0.4, 0.2, 0.15]} scale={1.05} /> }

function attachPincushion(root) {
  const chest = root.getObjectByName('chest'); if (!chest) return () => {}
  const S = spec(FUKU.body)
  const ball = new THREE.SphereGeometry(0.007, 10, 8)
  const pin = new THREE.SphereGeometry(0.0016, 6, 5)
  const parts = [ball]
  for (const [x, y, z] of [[0.002, 0.006, 0.002], [-0.003, 0.005, -0.001], [0.001, 0.007, -0.003]]) { const g = pin.clone(); g.translate(x, y, z); parts.push(g) }
  const paint = (g, hex) => { const col = new THREE.Color(hex), a = new Float32Array(g.attributes.position.count * 3); for (let i = 0; i < a.length; i += 3) { a[i] = col.r; a[i + 1] = col.g; a[i + 2] = col.b } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g.toNonIndexed ? (g.index ? g.toNonIndexed() : g) : g }
  const body = paint(ball, '#c45a5a'), heads = parts.slice(1).map(g => paint(g, '#e8dcc0'))
  const geo = mergeGeometries([body, ...heads]); const mat = cel('#ffffff').clone(); mat.vertexColors = true; mat.defines = { KIND: 1 }
  const m = new THREE.Mesh(geo, mat)
  m.position.set(0.016, 0.01, (S.chest?.[1]?.z ?? 0.04) * 0.9 + 0.012)
  chest.add(m)
  return () => { chest.remove(m); geo.dispose() }
}

function seatedHold(B, st, e) {
  // soft default: both hands around the cup in front, so she isn't sitting with arms hanging
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
  outfit: { type: 'apron', skin: SKIN, top: '#8a6a9c', acc2: '#f4ecd8', shoe: '#4a3a35', long: true, sleeve: 'puff', skirt: true },
  hold: {},
  seatDrop: 0.055,
  walk: { rate: 7, stride: 0.42, knee: 0.55, bounce: 0.007, smooth: true, land: 0.25, arm: 0.4, lean: 0.1, twist: 0.08, sway: 0.06, idle: 'sway' },
  ext: {
    life: (B, st, dt, t, R_, mem, state) => { const L = mem.life || (mem.life = makeLife(Math.random, FUKU_MOTION)); st.life = L; L.B = B; L.R = R_; L.hairOff = FUKU_HAIR_OFF
      if (!LIFE_OFF) lifeStep(L, B, st, dt, t, R_, state.camera)
      if (!LIFE_OFF) seatedHold(B, st, 0.85) },
    post: (R_, st, dt, t) => { if (!LIFE_OFF) lifePost(st.life, R_, st, dt, t) },
    Face, Hair: FukuHair, HandR,
  },
}

export function ChibiFuku({ st, scale = 0.8, res }) {
  const g = useRef()
  const r = res ?? (TOUCH ? 40 : 52)
  useEffect(() => { let off = null, n = 0
    const iv = setInterval(() => { const root = g.current; if (root && root.getObjectByName('chest')) { off = attachPincushion(root); clearInterval(iv) } else if (++n > 50) clearInterval(iv) }, 80)
    return () => { clearInterval(iv); off && off() } }, [])
  return <group ref={g}><Character cfg={FUKU} st={st} res={r} scale={scale} /></group>
}
export default ChibiFuku
