// Professor Hoshino: a lazy chibi on the shared pipeline. Game colours (khaki jacket, rust scarf,
// green waistcoat, red notebook), round glasses, short messy dark-with-grey hair. No heavy beard
// (the concept sheet doesn't have one — asked as a design question).
import * as THREE from 'three'
import React, { useEffect, useRef } from 'react'
import { Character, spec } from '../../GhibliPerson.jsx'
import { kit, combine } from '../train/kit.js'
import { HOSHINO_MOTION } from './motion.js'
import { makeLife, lifeStep, lifePost } from './life.js'
import { CHEEK, MIDFACE, MID_FADE, makeFace } from './castFace.jsx'
import { part, tagAW, sm, mergeHair, makeHairMat, makeHairInk } from './castHair.js'
import { q, toon } from '../../common.jsx'

const TOUCH = typeof window !== 'undefined' && matchMedia('(pointer: coarse)').matches
const LIFE_OFF = q.has('still') && !q.has('life')
const SKIN = '#f0c7a4'
const HAIR_C = '#4a4540'
const HAIR_BAND = '#7a746e'
const GLASS = '#2e2420'
const HOSHINO_HAIR_OFF = new Float32Array(12)
const Face = makeFace({ kind: 'hoshino', glasses: GLASS, defaultSquint: 0.08, blush: 0.45 })

const EAR = { x: 0.068, y: -0.0165, z: 0.0025 }
function hoshinoHair() {
  const ball = new THREE.SphereGeometry(1, 16, 12), ballS = new THREE.SphereGeometry(1, 10, 8)
  // short, slightly messy helmet; a few tufts on top (dark with grey); no bun
  const parts = [
    part(ball, [0, 0.014, -0.016], [0.066, 0.058, 0.060]), // short helmet, back and up, face clear
    part(ball, [0, 0.000, -0.036], [0.054, 0.038, 0.044]),
    part(ballS, [0.0, 0.062, -0.004], [0.020, 0.015, 0.018]), // messy top tufts
    part(ballS, [0.016, 0.056, 0.006], [0.015, 0.011, 0.013], [0.2, 0.4, 0.15]),
    part(ballS, [-0.014, 0.054, 0.002], [0.013, 0.011, 0.012], [0.15, -0.3, -0.1]),
    part(ballS, [0, 0.028, 0.048], [0.028, 0.010, 0.010]), // short fringe above the glasses
    ...[-1, 1].map(d => part(ballS, [d * 0.030, 0.020, 0.044], [0.013, 0.010, 0.010], [0, d * 0.15, 0])),
    ...[-1, 1].map(d => part(ballS, [d * EAR.x, EAR.y, EAR.z], [0.0034, 0.0095, 0.0058], [0, d * 0.75, d * 0.1], 1)),
  ]
  tagAW(parts[0], () => [3, 0])
  tagAW(parts[1], () => [3, 0])
  tagAW(parts[2], (x, y) => [2, sm(0.05, 0.08, y)])
  tagAW(parts[3], () => [2, 0.7])
  tagAW(parts[4], () => [2, 0.7])
  tagAW(parts[5], () => [3, 0.5])
  for (const k of [6, 7]) tagAW(parts[k], () => [3, 0.45])
  for (const k of [8, 9]) tagAW(parts[k], () => [3, 0])
  return mergeHair(parts)
}
const HAIR_GEO = hoshinoHair()
const hairMat = makeHairMat(SKIN, HAIR_C, HAIR_BAND, HOSHINO_HAIR_OFF)
const hairInk = makeHairInk(HOSHINO_HAIR_OFF)
function HoshinoHair({ set }) {
  return <group ref={set('hair')}><mesh geometry={HAIR_GEO} material={hairMat} /><mesh geometry={HAIR_GEO} material={hairInk} /></group>
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
  for (const k of ['L', 'R']) { const fo = root.getObjectByName('fo' + k); if (!fo) continue
    const hand = new THREE.Group(); hand.position.copy(S['hd' + k].clone().sub(S['el' + k])); fo.add(hand); out.push(hand)
    const m = new THREE.Mesh(k === 'L' ? g.book : g.pencil, g.m)
    if (k === 'L') { m.rotation.set(0.35, 0.9, 0.1); m.position.set(0.012, 0.0, 0.03) }
    else { m.rotation.set(1.1, 0, 0.5); m.position.set(0, 0.004, 0.008) }
    m.traverse(o => { o.layers.mask = root.layers.mask }); hand.add(m) }
  return () => out.forEach(h => h.removeFromParent())
}

export const HOSHINO = {
  name: 'scholar', age: 'elder', motion: HOSHINO_MOTION,
  body: { H: 0.96, head: 1.42, leg: 1.00, torso: 1.10, arm: 0.94, girth: 1.06, shoulder: 0.98, chestW: 1.06, bellyZ: 0.86, shX: 1.14, armA: 0.48,
    armR: [1.08, 1.28, 1.40], legR: 1.18, legX: 1.04, foot: 1.2, bootW: 1.2, bootH: 1.1, bootL: 0.98, hand: 1.18,
    cheek: CHEEK, midface: MIDFACE, midfaceFade: MID_FADE, hunch: 0.28,
    anY: 0.038, footY: 0.015, soleY: 0.0012 },
  hair: { style: 'chibi', c: HAIR_C },
  scarf: '#b5524a',
  face: { glasses: GLASS },
  // khaki jacket over the green waistcoat (cardigan open-front), gold buttons, dark trousers
  outfit: { type: 'cardigan', skin: SKIN, top: '#5a6f58', acc: '#a89a78', acc2: '#d9b06a', bottom: '#4f4a46', shoe: '#2e2a28', long: true, sleeve: 'puff' },
  hold: {},
  walk: { rate: 8, stride: 0.48, knee: 0.6, bounce: 0.008, smooth: true, land: 0.28, arm: 0.45, lean: 0.12, twist: 0.1, sway: 0.07, idle: 'look' },
  ext: {
    life: (B, st, dt, t, R_, mem, state) => { const L = mem.life || (mem.life = makeLife(Math.random, HOSHINO_MOTION)); st.life = L; L.B = B; L.R = R_; L.hairOff = HOSHINO_HAIR_OFF
      if (!LIFE_OFF) lifeStep(L, B, st, dt, t, R_, state.camera) },
    post: (R_, st, dt, t) => { if (!LIFE_OFF) lifePost(st.life, R_, st, dt, t) },
    Face, Hair: HoshinoHair,
    // scarf knot a little higher on the slimmer neck
    tails: [-0.35, 0.3], tailX: 0.22, knot: [0, -0.018, 0.01, 1.25], ring: [1.15, 1.12, 1.12],
  },
}

export function ChibiHoshino({ st, scale = 0.8, res }) {
  const g = useRef()
  const r = res ?? (TOUCH ? 40 : 52)
  useEffect(() => { let off = null, n = 0
    const iv = setInterval(() => { const root = g.current; if (root && root.getObjectByName('foL')) { off = attachNotebook(root); clearInterval(iv) } else if (++n > 50) clearInterval(iv) }, 80)
    return () => { clearInterval(iv); off && off() } }, [])
  return <group ref={g}><Character cfg={HOSHINO} st={st} res={r} scale={scale} /></group>
}
export default ChibiHoshino
