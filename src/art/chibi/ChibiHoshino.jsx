// DRAFT Professor Hoshino — not used in the game. Preview: ?view=charstudio&dev=chibi-drafts&char=hoshino
// A lazy chibi on the shared pipeline, matched to the golden turnaround (docs/characters/ref/hoshino-golden-turnaround.jpg):
// a rounded cloud of dark wavy hair with grey temples, thick brows, thin gold wire glasses, a khaki notch-lapel
// jacket open over a dark green five-button vest and white shirt collar, white shirt cuffs, olive trousers with
// turn-ups and brown shoes. Arms hang at his sides. Stocky, about Fuku's height. No scarf, book or cane.
import * as THREE from 'three'
import React from 'react'
import { Character } from '../../GhibliPerson.jsx'
import { HOSHINO_MOTION } from './motion.js'
import { makeLife, lifeStep, lifePost } from './life.js'
import { makeFace } from './castFace.jsx'
import { part, tagAW, sm, mergeHair, makeHairMat, makeHairInk } from './castHair.js'
import { q } from '../../common.jsx'

const TOUCH = typeof window !== 'undefined' && matchMedia('(pointer: coarse)').matches
const LIFE_OFF = q.has('still') && !q.has('life')
const SKIN = '#f0c7a4'
const HAIR_C = '#4e3a2c'
const HAIR_GREY = '#8c8379'
const HAIR_BAND = '#7a5a44'
const GLASS = '#2e2420'
const JACKET = '#c09a66'
const VEST = '#3d4630'
const SHIRT = '#f4eee6'
const TROUSER = '#66653f'
const HOSHINO_HAIR_OFF = new Float32Array(12)
// thin gold wire specs, larger than the eyes (golden sheet); arms meet the low ears
const SPEC = { r: 0.0152, wire: "#000000", ink: "#000000" } // wire glasses: lens radius, wire and rim-ink colours
const HOSHINO_HEAD_S = [0.90, 1.07, 1.05]
const HOSHINO_CHEEK = [0, -0.032, 0.0125, 0.053, 0.023, 0.0295, 0.0125]
const HOSHINO_MIDFACE = [[-0.0278, 0.0434, 0.02, 0.0055, 0.013, 0.0026, 0.0017], [-0.0345, 0.0303, 0.03, 0.0162, 0.0243, 0.0055]]
const HOSHINO_MID_FADE = 0
// Carry cheek width below the temples before rounding the jaw into the chin.
const HOSHINO_JAW = [...HOSHINO_CHEEK, 0.020]
const Face = makeFace({ kind: 'hoshino', glasses: GLASS, wire: { ...SPEC, ear: [0.0575, -0.021, 0.004] }, defaultSquint: 0.12, blush: 0.55, shape: { headS: HOSHINO_HEAD_S, cheek: HOSHINO_JAW, midface: HOSHINO_MIDFACE, fade: HOSHINO_MID_FADE }, eyeS: 1.08 })

// skull HR is ~[0.058, 0.050, 0.055]. Golden sheet: a full, rounded cloud of soft waves, about 1.3x the
// face width, covering the crown and the whole back down to the nape. Forehead open in a soft arch;
// the fringe rolls from his right to left. Ears sit low (eye-to-mouth line), tucked under the cloud.
const EAR = { x: 0.0625, y: -0.018, z: 0.002 }
const DOME = { c: [0, 0.011, -0.011], r: [0.049, 0.054, 0.0605] }
// Each lock follows the skull in azimuth and elevation. Its elliptical cross-section
// narrows into the tip, while a shallow longitudinal ridge catches the studio light.
function wave(points, width, depth, lift = 0.003) {
  const center = new THREE.Vector3(...DOME.c)
  const path = new THREE.CatmullRomCurve3(points.map(([az, el, offset = 0]) => {
    const direction = new THREE.Vector3(Math.sin(az)*Math.cos(el), Math.sin(el), Math.cos(az)*Math.cos(el))
    return direction.clone().multiply(new THREE.Vector3(...DOME.r)).add(center).addScaledVector(direction, lift + offset)
  }))
  const geo = new THREE.SphereGeometry(1, 18, 24)
  const pos = geo.attributes.position
  for (let i = 0; i < pos.count; i++) {
    const t = (1 - pos.getY(i)) / 2
    const point = path.getPoint(t), tangent = path.getTangent(t)
    const normal = point.clone().sub(center).normalize()
    const across = new THREE.Vector3().crossVectors(normal, tangent).normalize()
    normal.crossVectors(tangent, across).normalize()
    const taper = 1.30 - 0.68*t
    point.addScaledVector(across, pos.getX(i)*width*taper)
    point.addScaledVector(normal, pos.getZ(i)*depth*(1 - 0.32*Math.abs(pos.getX(i))))
    pos.setXYZ(i, point.x, point.y, point.z)
  }
  return part(geo, [0,0,0], [1,1,1])
}
function hoshinoHair() {
  const ball = new THREE.SphereGeometry(1, 18, 14), ballS = new THREE.SphereGeometry(1, 12, 9)
  const curl = new THREE.TorusGeometry(0.0062, 0.00075, 5, 16, Math.PI * 1.15); curl.rotateZ(Math.PI * 0.45); curl.scale(0.85, 1.25, 1)
  const parts = [
    // the cloud body: crown, sides and the whole back of the head
    part(ball, DOME.c, DOME.r),
    // nape fill so no scalp shows from behind (ends above the collar)
    part(ball, [0, -0.014, -0.028], [0.048, 0.028, 0.032]),
    // The large forelock rises beside the part and rolls down over the left temple.
    wave([[0.24,0.67],[0.04,0.89],[-0.40,0.79],[-0.74,0.47],[-1.12,0.30],[-1.42,0.37]],0.017,0.008),
    wave([[0.30,0.71],[0.22,1.04],[-0.33,1.22],[-1.14,0.98],[-1.65,0.91]],0.015,0.008),
    wave([[0.34,0.66],[0.57,0.76],[0.84,0.57],[1.12,0.31],[1.52,0.21],[1.77,0.30]],0.015,0.008),
    // Overlapping arcs wrap the occiput and turn down into the nape.
    ...[-1,1].flatMap(side => [0,1,2].map(row => wave(
      [[0.64,1.16-row*0.37],[1.44,1.08-row*0.37],[2.14,0.77-row*0.37],
       [2.77,0.59-row*0.37],[3.24,0.68-row*0.37]].map(([az,el]) => [side*az,el]),
      0.016,0.007,0.003))),
    ...[-1,1].map(side => wave([[side*1.25,0.30],[side*1.50,0.06,0.003],
      [side*1.73,-0.24,0.003],[side*2.05,-0.53],[side*2.51,-0.62]],0.013,0.007)),
    ...[-1, 1].map(d => part(ballS, [d * EAR.x, EAR.y, EAR.z], [0.0060, 0.0128, 0.0080], [0, d * 0.55, d * 0.08], 1)),
    // inner ear curl: a C of ink on the outer face (aSkin 0.47 draws as ink in the hair shader)
    ...[-1, 1].map(d => part(curl, [d * (EAR.x + 0.0042), EAR.y + 0.0004, EAR.z + 0.0006], [1, 1, 1], [0, d * (Math.PI / 2 + 0.55), 0], 0.47)),
  ]
  const n = parts.length
  tagAW(parts[0], () => [3, 0])
  tagAW(parts[1], () => [3, 0])
  for (let k = 2; k < n - 4; k++) tagAW(parts[k], (x, y) => [2, 0.35 + 0.35 * sm(-0.01, 0.06, y)])
  for (const k of [n - 4, n - 3, n - 2, n - 1]) tagAW(parts[k], () => [3, 0])
  return mergeHair(parts)
}
function hoshinoGrey() {
  const parts = [-1,1].flatMap(side => [0,1,2].map(row => wave(
    [[side*(0.84+row*0.13),0.32-row*0.08],[side*(0.99+row*0.15),0.06-row*0.07,0.003],
     [side*(1.18+row*0.16),-0.12-row*0.07,0.006],[side*(1.32+row*0.17),-0.36-row*0.05,0.009]],
    0.0075,0.0045,0.0035)))
  for (const g of parts) tagAW(g, () => [2, 0.4])
  return mergeHair(parts)
}
// Raised, narrow ridges trace the same sweep as the underlying waves.
function highlightRidges() {
  const ridges = [
    wave([[0.19,0.76],[-0.02,0.91],[-0.39,0.80],[-0.68,0.53],[-0.92,0.35]],0.0026,0.0014,0.014),
    wave([[0.43,0.89],[0.75,0.82],[1.02,0.62],[1.36,0.51]],0.0021,0.001,0.013),
    ...[-1,1].flatMap(side => [0,1].map(row => wave(
      [[side*1.62,0.90-row*0.36],[side*1.97,0.82-row*0.36],[side*2.30,0.69-row*0.36],[side*2.71,0.62-row*0.36]],
      0.0024,0.0011,0.0105))),
  ]
  for (const g of ridges) tagAW(g, () => [2,0.55])
  return mergeHair(ridges)
}
const RIDGE_GEO = highlightRidges()
const ridgeMat = makeHairMat(SKIN, '#695040', HAIR_BAND, HOSHINO_HAIR_OFF)
const HAIR_GEO = hoshinoHair()
const GREY_GEO = hoshinoGrey()
const hairMat = makeHairMat(SKIN, HAIR_C, HAIR_BAND, HOSHINO_HAIR_OFF)
const greyMat = makeHairMat(SKIN, HAIR_GREY, '#9a948c', HOSHINO_HAIR_OFF)
const hairInk = makeHairInk(HOSHINO_HAIR_OFF)
function HoshinoHair({ set }) {
  return <group ref={set('hair')}>
    <mesh geometry={HAIR_GEO} material={hairMat} /><mesh geometry={HAIR_GEO} material={hairInk} />
    <mesh geometry={RIDGE_GEO} material={ridgeMat} />
    <mesh geometry={GREY_GEO} material={greyMat} /><mesh geometry={GREY_GEO} material={hairInk} />
  </group>
}

export const HOSHINO = {
  name: 'scholar', age: 'elder', motion: HOSHINO_MOTION,
  body: { H: 0.90, head: 1.46, leg: 1.14, torso: 0.95, arm: 1.08, girth: 1.05, shoulder: 1.00, chestW: 0.85, bellyZ: 0.96, shX: 0.90, armA: 0.38, shDrop: 0.012, armK: [0.016, 0.003], armOcc: false, handL: 1.18,
    armR: [1.25, 1.30, 1.40], legR: 1.24, legRs: [1, 1, 1.30], legX: 1.06, foot: 1.20, bootW: 1.55, bootH: 1.30, bootL: 1.30, hand: 0.86,
    headS: HOSHINO_HEAD_S, cheek: HOSHINO_JAW, midface: HOSHINO_MIDFACE, midfaceFade: HOSHINO_MID_FADE, hunch: 0.16, skirt: 'jacket', jacket: [0.013, 0.98],
    anY: 0.038, footY: 0.015, soleY: 0.0012 },
  hair: { style: 'chibi', c: HAIR_C },
  face: { glasses: GLASS },
  // openJacket painter (all painted, nothing floats): acc = khaki jacket to mid-thigh with notch lapels, flap
  // pockets and two buttons; top = dark green vest with five gold buttons; acc2 = white shirt collar and cuffs;
  // bottom = olive trousers with painted turn-ups.
  outfit: { type: 'openJacket', hemY: 'skirt', skin: SKIN, top: VEST, acc: JACKET, acc2: SHIRT, bottom: TROUSER, shoe: '#7a4a26', shoeY: 0.027, long: true, sleeve: 'none', seams: true },
  hold: {},
  walk: { fore: -0.06, rate: 8, stride: 0.48, knee: 0.6, bounce: 0.008, smooth: true, land: 0.28, arm: 0.45, lean: 0.12, twist: 0.1, sway: 0.07, idle: 'look' },
  ext: {
    life: (B, st, dt, t, R_, mem, state) => { const L = mem.life || (mem.life = makeLife(Math.random, HOSHINO_MOTION)); st.life = L; L.B = B; L.R = R_; L.hairOff = HOSHINO_HAIR_OFF
      if (!LIFE_OFF) lifeStep(L, B, st, dt, t, R_, state.camera) },
    post: (R_, st, dt, t) => { if (!LIFE_OFF) lifePost(st.life, R_, st, dt, t) },
    Face, Hair: HoshinoHair,
  },
}

export function ChibiHoshino({ st, scale = 0.8, res }) {
  const r = res ?? (TOUCH ? 40 : 52)
  return <Character cfg={HOSHINO} st={st} res={r} scale={scale} />
}
export default ChibiHoshino
