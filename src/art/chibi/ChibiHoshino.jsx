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
const HAIR_GREY = '#88776a'
const HAIR_BAND = '#7a5a44'
const GLASS = '#2e2420'
const JACKET = '#c09a66'
const VEST = '#3d4630'
const SHIRT = '#f4eee6'
const TROUSER = '#66653f'
const HOSHINO_HAIR_OFF = new Float32Array(12)
// Thin black lower half-rims. The arms meet the upper edge of the ears.
const SPEC = { r: 0.0142, wire: '#5a4436', ink: '#382b24' } // wire glasses: lens radius, wire and rim-ink colours
const HOSHINO_HEAD_S = [0.92, 1.055, 1.015]
const HOSHINO_CHEEK = [0, -0.0255, 0.0125, 0.0435, 0.026, 0.031, 0.0185]
const HOSHINO_JAW = [...HOSHINO_CHEEK, 0.006] // a short straight section above the rounded jaw
// A shallow, wide chin keeps the lower contour full in front and brings it forward in profile.
const HOSHINO_CHIN = [-0.046, 0.024, 0.027, 0.013, 0.023, 0.010]
const HOSHINO_MIDFACE = [[-0.0278, 0.0434, 0.02, 0.0055, 0.013, 0.0026, 0.0017], [-0.0345, 0.0303, 0.03, 0.0162, 0.0243, 0.0055]]
const HOSHINO_MID_FADE = 0
const EAR = { x: 0.0625, y: -0.018, z: 0.002 }
const Face = makeFace({ kind: 'hoshino', glasses: GLASS, wire: { ...SPEC, ear: [EAR.x - 0.003, EAR.y, EAR.z + 0.002] }, defaultSquint: 0.12, blush: 0.36, shape: { headS: HOSHINO_HEAD_S, cheek: HOSHINO_JAW, midface: HOSHINO_MIDFACE, fade: HOSHINO_MID_FADE, chin: HOSHINO_CHIN }, eyeS: 0.87 })

// skull HR is ~[0.058, 0.050, 0.055]. Golden sheet: a full, rounded cloud of soft waves, about 1.3x the
// face width, covering the crown and the whole back down to the nape. Forehead open in a soft arch;
// the fringe rolls from his right to left. Ears sit low (eye-to-mouth line), tucked under the cloud.
const DOME = { c: [0, 0.009, -0.011], r: [0.0605, 0.0505, 0.0605] }
const _m = new THREE.Matrix4(), _n = new THREE.Vector3(), _t = new THREE.Vector3(), _b = new THREE.Vector3()
// one wave lock on the dome: az 0 = front (+z), +pi/2 = +x; el up from the equator. len along the
// wave direction, wid across it, thk out from the head; roll turns the wave toward the crown.
function lock(geo, az, el, push, [len, wid, thk], roll = 0, skin = 0) {
  const [cx, cy, cz] = DOME.c, [rx, ry, rz] = DOME.r
  const dx = Math.sin(az) * Math.cos(el), dy = Math.sin(el), dz = Math.cos(az) * Math.cos(el)
  const pos = [cx + dx * rx * push, cy + dy * ry * push, cz + dz * rz * push]
  _n.set(dx / rx, dy / ry, dz / rz).normalize()
  _t.set(Math.cos(az), 0, -Math.sin(az)); _t.addScaledVector(_n, -_n.dot(_t)).normalize()
  _b.crossVectors(_t, _n).normalize() // right-handed [t, n, b] keeps the winding
  const t = _t.clone().multiplyScalar(Math.cos(roll)).addScaledVector(_b, Math.sin(roll))
  const b = _b.clone().multiplyScalar(Math.cos(roll)).addScaledVector(_t, -Math.sin(roll))
  const g = part(geo, [0, 0, 0], [1, 1, 1], [0, 0, 0], skin)
  _m.makeBasis(t.multiplyScalar(len), _n.clone().multiplyScalar(thk), b.multiplyScalar(wid)).setPosition(...pos)
  g.applyMatrix4(_m); return g
}
// A changing elliptical cross section gives each wave a lifted root and a fine swept tip.
function sweptWave(points, width, depth) {
  const path = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)))
  const section = new THREE.SphereGeometry(1, 26, 18)
  const positions = section.attributes.position
  for (let i = 0; i < positions.count; i++) {
    const t = (1 - positions.getY(i)) / 2
    const center = path.getPoint(t)
    const tangent = path.getTangent(t)
    const radial = center.clone().sub(new THREE.Vector3(...DOME.c)).normalize()
    const across = new THREE.Vector3().crossVectors(tangent, radial).normalize()
    const normal = new THREE.Vector3().crossVectors(across, tangent).normalize()
    center.addScaledVector(across, positions.getX(i) * width * (1.3 - t))
    center.addScaledVector(normal, positions.getZ(i) * depth)
    positions.setXYZ(i, center.x, center.y, center.z)
  }
  // Sphere latitude runs from root to tip (opposite its local Y axis).
  const indices = section.index.array
  for (let i = 0; i < indices.length; i += 3) [indices[i], indices[i+1]] = [indices[i+1], indices[i]]
  return part(section, [0,0,0], [1,1,1])
}
function hoshinoHair() {
  const ball = new THREE.SphereGeometry(1, 18, 14), ballS = new THREE.SphereGeometry(1, 12, 9)
  const L = (az, el, push, sz, roll) => lock(ballS, az, el, push, sz, roll)
  const curl = new THREE.TorusGeometry(0.0062, 0.00075, 5, 16, Math.PI * 1.15); curl.rotateZ(Math.PI * 0.45); curl.scale(0.85, 1.25, 1)
  const parts = [
    // the cloud body: crown, sides and the whole back of the head
    part(ball, DOME.c, DOME.r),
    // nape fill so no scalp shows from behind (ends above the collar)
    part(ball, [0, -0.014, -0.028], [0.048, 0.028, 0.032]),
    // crown waves (rolling toward his left, +x), hugging the dome
    ...[-0.30, 0.60, 1.55, 2.60, 3.70, 4.85].map((az, k) => L(az, 0.98 + 0.06 * (k % 2), 0.97, [0.022, 0.017, 0.009], 0.5)),
    // silhouette ring: side and back waves give the scalloped cloud outline
    ...[1.00, 1.55, 2.10, 2.65, 3.20, 3.75, 4.30, 4.85, 5.30].map((az, k) =>
      L(az, 0.40 + 0.06 * Math.sin(k * 2.1), 0.985, [0.022, 0.018, 0.010], 0.65)),
    // lower ring: side puffs over the ear tops, then the back down to the nape
    // (over the ears they ride higher so the whole ear shows below, as on the sheet)
    ...[[1.22, 0.10], [1.66, 0.02], [2.15, -0.10], [2.70, -0.14], [3.25, -0.10], [3.80, -0.14], [4.35, -0.08], [4.65, 0.02], [5.06, 0.10]].map(([az, el]) =>
      L(az, el, 0.97, [0.020, 0.016, 0.009], 0.75)),
    L(2.55, -0.50, 0.93, [0.022, 0.014, 0.009], 0.3), L(3.15, -0.55, 0.93, [0.022, 0.014, 0.009], 0.2), L(3.75, -0.50, 0.93, [0.022, 0.014, 0.009], -0.3),
    // fringe: one big wave rising off the forehead and sweeping back toward his left (open forehead),
    // with a smaller curl dipping on his right (viewer's left)
    sweptWave([[0.010,0.043,0.034],[-0.003,0.057,0.028],[-0.031,0.050,0.032],[-0.049,0.028,0.030],[-0.061,0.032,0.012]],0.022,0.012),
    sweptWave([[0.013,0.044,0.035],[0.029,0.046,0.032],[0.046,0.031,0.027],[0.057,0.021,0.012],[0.063,0.025,0.002]],0.018,0.010),
    sweptWave([[0.014,0.045,0.025],[0.007,0.059,0.016],[-0.016,0.064,0.004],[-0.039,0.055,-0.011],[-0.047,0.059,-0.014]],0.018,0.009),
    ...[-1, 1].map(d => part(ballS, [d * EAR.x, EAR.y, EAR.z], [0.0085, 0.0132, 0.0100], [0, d * 0.55, d * 0.08], 1)),
    // inner ear curl: a C of ink on the outer face (aSkin 0.47 draws as ink in the hair shader)
    ...[-1, 1].map(d => part(curl, [d * (EAR.x + 0.007), EAR.y + 0.0004, EAR.z + 0.0006], [1, 1, 1], [0, d * (Math.PI / 2 + 0.55), 0], 0.47)),
  ]
  const n = parts.length
  tagAW(parts[0], () => [3, 0])
  tagAW(parts[1], () => [3, 0])
  for (let k = 2; k < n - 4; k++) tagAW(parts[k], (x, y) => [2, 0.35 + 0.35 * sm(-0.01, 0.06, y)])
  for (const k of [n - 4, n - 3, n - 2, n - 1]) tagAW(parts[k], () => [3, 0])
  return mergeHair(parts)
}
function hoshinoGrey() {
  const ballS = new THREE.SphereGeometry(1, 12, 9)
  // soft grey at both temples and over the ears (lower front of the side cloud), blended, not a patch
  const parts = []
  for (const d of [-1, 1]) {
    parts.push(lock(ballS, d * 1.02, -0.26, 1.0, [0.013, 0.012, 0.008], d * 1.2))
    parts.push(lock(ballS, d * 1.20, -0.08, 1.01, [0.015, 0.012, 0.008], d * 0.9))
  }
  for (const g of parts) tagAW(g, () => [2, 0.4])
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

export const HOSHINO = {
  name: 'scholar', age: 'elder', motion: HOSHINO_MOTION,
  body: { H: 0.90, head: 1.46, leg: 1.14, torso: 0.95, arm: 1.08, girth: 1.05, shoulder: 1.00, chestW: 0.85, bellyZ: 0.96, shX: 0.90, armA: 0.38, shDrop: 0.012, armK: [0.016, 0.003], armOcc: false, handL: 1.18,
    armR: [1.25, 1.30, 1.40], legR: 1.24, legRs: [1, 1, 1.30], legX: 1.06, foot: 1.20, bootW: 1.55, bootH: 1.30, bootL: 1.30, hand: 0.86,
    headS: HOSHINO_HEAD_S, cheek: HOSHINO_JAW, midface: HOSHINO_MIDFACE, midfaceFade: HOSHINO_MID_FADE, chin: HOSHINO_CHIN, hunch: 0.16, skirt: 'jacket', jacket: [0.013, 0.98],
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
