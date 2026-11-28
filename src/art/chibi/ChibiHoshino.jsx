// Professor Hoshino (the ruins scholar). In the game App.jsx draws him for the 'scholar' walker at 1.1 (taller than her).
// Studio: ?view=charstudio&dev=chibi-drafts&char=hoshino (window.__hoshinoGreet() plays the greeting)
// A lazy chibi on the shared pipeline, matched to the golden turnaround (docs/characters/ref/hoshino-golden-turnaround.jpg):
// a rounded cloud of dark wavy hair with grey temples, thick brows, thin gold wire glasses, a khaki notch-lapel
// jacket open over a dark green five-button vest and white shirt collar, white shirt cuffs, olive trousers with
// turn-ups and brown shoes. Arms hang at his sides. Stocky, about Fuku's height. No scarf, book or cane.
import * as THREE from 'three'
import React, { useEffect, useRef } from 'react'
import { Character, cel, spec } from '../../GhibliPerson.jsx'
import { hoshinoActs } from './hoshinoActs.js'
import { HOSHINO_MOTION } from './motion.js'
import { makeLife, lifeStep, lifePost } from './life.js'
import { makeFace } from './castFace.jsx'
import { part, tagAW, sm, mergeHair, makeHairMat, makeHairInk } from './castHair.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { q } from '../../common.jsx'

const TOUCH = typeof window !== 'undefined' && matchMedia('(pointer: coarse)').matches
const LIFE_OFF = q.has('still') && !q.has('life')
const SKIN = '#f0c7a4'
const HAIR_C = '#493B31'
const HAIR_GREY = '#978E84'
const HAIR_BAND = '#6B5848'
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
const HOSHINO_MIDFACE = [[-0.0278, 0.044, 0.0095, 0.0022, 0.009, 0.0036, 0.0054], [-0.0345, 0.0303, 0.03, 0.0162, 0.0243, 0.0055]]
const HOSHINO_MID_FADE = 0
// Carry cheek width below the temples before rounding the jaw into the chin.
const HOSHINO_JAW = [...HOSHINO_CHEEK, 0.020]
const Face = makeFace({ kind: 'hoshino', glasses: GLASS, wire: { ...SPEC, halfRim: true, rim: [0.00095, 0.0006], ear: [0.0575, -0.021, 0.004] }, featOff: { mouth: 0.0065, mouthW: 1.45 }, defaultSquint: 0.12, blush: 0.55, shape: { headS: HOSHINO_HEAD_S, cheek: HOSHINO_JAW, midface: HOSHINO_MIDFACE, fade: HOSHINO_MID_FADE }, eyeS: 1.08 })

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
  const positions = [], indices = [], pigment = []
  const rings = 28, sides = 24
  for (let ring = 0; ring <= rings; ring++) {
    const t = ring / rings
    const point = path.getPoint(t), tangent = path.getTangent(t)
    const radial = point.clone().sub(center).normalize()
    const across = new THREE.Vector3().crossVectors(radial, tangent).normalize()
    const normal = new THREE.Vector3().crossVectors(tangent, across).normalize()
    const envelope = Math.max(0.008, Math.pow(Math.sin(Math.PI*t), 0.56)) * (1.19 - 0.37*t)
    for (let j = 0; j < sides; j++) {
      const angle = 2*Math.PI*j/sides
      const lateral = Math.cos(angle), surface = Math.sin(angle)
      const groove = Math.exp(-Math.pow((lateral - 0.23)/0.16, 2))
      const ridge = Math.exp(-Math.pow((lateral + 0.19)/0.32, 2))
      const vertex = point.clone().addScaledVector(across, width*envelope*lateral)
      vertex.addScaledVector(normal, depth*envelope*surface*(1 + 0.12*ridge - 0.18*groove))
      positions.push(vertex.x, vertex.y, vertex.z)
      pigment.push(-Math.max(0,surface)*envelope*(0.13 + 0.70*ridge))
      if (ring < rings) {
        const a = ring*sides+j, b = ring*sides+(j+1)%sides
        indices.push(a,b,a+sides,b,b+sides,a+sides)
      }
    }
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3))
  geo.setAttribute('aSkin',new THREE.Float32BufferAttribute(pigment,1))
  geo.setIndex(indices)
  geo.computeVertexNormals()
  return geo
}

// Spiral around an off-centre axis pointing through the back of the crown.
function whorl(start, reach, turn, width, depth) {
  const axis = new THREE.Vector3(0.14,0.28,-1).normalize()
  const right = new THREE.Vector3(1,0,0).projectOnPlane(axis).normalize()
  const up = new THREE.Vector3().crossVectors(right,axis)
  const points = Array.from({length:8}, (_,i) => {
    const t = i/7, radius = 0.11 + reach*t, angle = start + turn*t
    const d = axis.clone().multiplyScalar(Math.cos(radius))
      .addScaledVector(right,Math.sin(radius)*Math.cos(angle))
      .addScaledVector(up,Math.sin(radius)*Math.sin(angle))
    return [Math.atan2(d.x,d.z), Math.asin(d.y), 0.005*Math.sin(Math.PI*t)]
  })
  return wave(points,width,depth,0.003)
}
function hoshinoHair() {
  const ball = new THREE.SphereGeometry(1, 18, 14), ballS = new THREE.SphereGeometry(1, 12, 9)
  const curl = new THREE.TorusGeometry(0.0062, 0.00075, 5, 16, Math.PI * 1.15); curl.rotateZ(Math.PI * 0.45); curl.scale(0.85, 1.25, 1)
  const parts = [
    // the cloud body: crown, sides and the whole back of the head
    part(ball, DOME.c, DOME.r),
    // nape fill so no scalp shows from behind (ends above the collar)
    part(ball, [0, -0.014, -0.033], [0.0525, 0.036, 0.043]),
    // Nest the roots at the part; the broad left crest falls and turns up above the temple.
    wave([[0.25,0.59,-0.008],[0.12,0.85,0.006],[-0.28,0.89,0.010],[-0.64,0.57,0.008],[-0.94,0.30,0.010],[-1.15,0.27,0.015],[-1.30,0.39,0.022]],0.020,0.010),
    wave([[0.29,0.65,-0.005],[0.29,1.03,0.008],[-0.23,1.31,0.009],[-1.06,1.20,0.008],[-1.51,0.90,0.007],[-1.78,0.98,0.004]],0.020,0.0085),
    wave([[0.32,0.55],[0.57,0.75,0.004],[0.81,0.65,0.008],[1.10,0.31,0.011],[1.36,0.17,0.014],[1.64,0.34,0.016]],0.016,0.008),
    wave([[0.46,0.85],[0.87,0.92,0.004],[1.31,0.67,0.006],[1.67,0.43,0.006],[1.93,0.51]],0.015,0.007),
    whorl(0.1,1.68,1.64,0.019,0.009),
    whorl(1.23,1.42,1.49,0.018,0.008),
    whorl(2.39,1.52,1.68,0.014,0.006),
    whorl(3.56,1.56,1.72,0.014,0.0065),
    whorl(4.76,1.69,1.43,0.019,0.008),
    ...[-1,1].map(side => wave([[side*0.91,0.40],[side*1.23,0.19,0.007],
      [side*1.70,0.03,0.009],[side*2.02,-0.25,0.007],[side*2.49,-0.49]],0.014,0.007)),
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
  // Golden sheet: silver at the temples only, in front of and over the ear, tucked under the dark side waves.
  // Four staggered strands per side sweep back and down; the darker band colour picks out the grooves between them.
  const parts = [-1,1].flatMap(side => [0,1,2,3].map(row => wave(
    [[side*(0.90+row*0.03),0.30-row*0.11],[side*(1.12+row*0.02),0.16-row*0.11,0.004],
     [side*1.42,0.02-row*0.10,0.007],[side*(1.76+row*0.05),-0.12-row*0.09,0.005]],
    0.0070-row*0.0004,0.0062-row*0.0004,0.0035)))
  for (const g of parts) tagAW(g, () => [2, 0.4])
  return mergeHair(parts)
}
const HAIR_GEO = hoshinoHair()
const GREY_GEO = hoshinoGrey()
const hairMat = makeHairMat(SKIN, HAIR_C, HAIR_BAND, HOSHINO_HAIR_OFF, undefined, true)
const greyMat = makeHairMat(SKIN, HAIR_GREY, '#6f675e', HOSHINO_HAIR_OFF, undefined, true)
const hairInk = makeHairInk(HOSHINO_HAIR_OFF)
function HoshinoHair({ set }) {
  return <group ref={set('hair')}>
    <mesh geometry={HAIR_GEO} material={hairMat} /><mesh geometry={HAIR_GEO} material={hairInk} />
    <mesh geometry={GREY_GEO} material={greyMat} /><mesh geometry={GREY_GEO} material={hairInk} />
  </group>
}

export const HOSHINO = {
  name: 'scholar', age: 'elder', motion: HOSHINO_MOTION,
  body: { H: 0.90, head: 1.46, leg: 1.14, torso: 0.95, arm: 1.08, girth: 1.05, shoulder: 1.00, chestW: 0.85, bellyZ: 0.96, shX: 0.90, armA: 0.38, shDrop: 0.012, armK: [0.016, 0.003], armOcc: false, armAO: 0.85, headStrict: true, handL: 1.18,
    armR: [1.25, 1.30, 1.40], legR: 1.24, legRs: [1, 1, 1.30], legX: 1.06, foot: 1.20, bootW: 1.55, bootH: 1.30, bootL: 1.30, hand: 0.86,
    headS: HOSHINO_HEAD_S, cheek: HOSHINO_JAW, midface: HOSHINO_MIDFACE, midfaceFade: HOSHINO_MID_FADE, hunch: 0.16, headUp: -0.011, skirt: 'jacket', jacket: [0.013, 0.98],
    anY: 0.038, footY: 0.015, soleY: 0.0012 },
  hair: { style: 'chibi', c: HAIR_C },
  face: { glasses: GLASS },
  // openJacket painter (all painted, nothing floats): acc = khaki jacket to mid-thigh with notch lapels, flap
  // pockets and two buttons; top = dark green vest with five gold buttons; acc2 = white shirt collar and cuffs;
  // bottom = olive trousers with painted turn-ups.
  outfit: { type: 'openJacket', hemY: 'skirt', skin: SKIN, top: VEST, acc: JACKET, acc2: SHIRT, bottom: TROUSER, shoe: '#7a4a26', shoeY: 0.027, long: true, sleeve: 'none', seams: true },
  hold: {},
  // brisk, short steps leaning a little forward, as if always off to something interesting; the arms swing less
  walk: { fore: -0.06, rate: 9.4, stride: 0.38, knee: 0.55, bounce: 0.007, smooth: true, land: 0.24, arm: 0.3, lean: 0.17, twist: 0.08, sway: 0.05, idle: 'look' },
  ext: {
    life: (B, st, dt, t, R_, mem, state) => { const L = mem.life || (mem.life = makeLife(Math.random, HOSHINO_MOTION)); st.life = L; L.B = B; L.R = R_; L.hairOff = HOSHINO_HAIR_OFF
      if (typeof window !== 'undefined' && q.get('char') === 'hoshino') { window.__herLife = L; window.__hoshinoGreet = () => { st.greetN = (st.greetN || 0) + 1 } } // studio captures
      if (!LIFE_OFF) { lifeStep(L, B, st, dt, t, R_, state.camera); hoshinoActs(L, B, st, dt) }
      if (st.hk) st.hk.book(L.book || 0) },
    post: (R_, st, dt, t) => { if (!LIFE_OFF) lifePost(st.life, R_, st, dt, t) },
    Face, Hair: HoshinoHair,
  },
}

// his pocket notebook (left hand) and pencil (right hand): one small vertex-coloured mesh on each forearm bone, scaled
// from nothing while he takes it out of his jacket (L.book). Drawn only while it is out.
const tinted = (g, hex) => { const c = new THREE.Color(hex), n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g.index ? g.toNonIndexed() : g }
const box = (w, h, d, x, y, z, hex) => { const g = new THREE.BoxGeometry(w, h, d); g.translate(x, y, z); return tinted(g, hex) }
function bookGeo() {
  const parts = [box(0.030, 0.0035, 0.040, 0, 0, 0, '#7d3b2e'), box(0.027, 0.0018, 0.037, 0, 0.0025, 0, '#f6efdf'),
    box(0.020, 0.0006, 0.0012, -0.002, 0.0035, -0.008, '#8a7a68'), box(0.016, 0.0006, 0.0012, -0.004, 0.0035, -0.002, '#8a7a68'), box(0.018, 0.0006, 0.0012, -0.003, 0.0035, 0.004, '#8a7a68'),
    box(0.0025, 0.0010, 0.040, 0.0158, 0.0022, 0, '#c99a3e')]
  return mergeGeometries(parts.map(g => { g.deleteAttribute('uv'); return g }))
}
function pencilGeo() {
  const body = new THREE.CylinderGeometry(0.0017, 0.0017, 0.030, 6); const tip = new THREE.ConeGeometry(0.0017, 0.005, 6); tip.translate(0, 0.0175, 0)
  return mergeGeometries([tinted(body, '#e2b13f'), tinted(tip, '#3b2f22')].map(g => { g.deleteAttribute('uv'); return g }))
}
const propMat = (() => { const m = cel('#ffffff').clone(); m.vertexColors = true; m.defines = { KIND: 1 }; return m })()
function attachProps(root, st) {
  const S = spec(HOSHINO.body), out = []
  for (const k of ['L', 'R']) { const fo = root.getObjectByName('fo' + k); if (!fo) continue
    const hand = new THREE.Group(); hand.position.copy(S['hd' + k].clone().sub(S['el' + k])); fo.add(hand)
    const m = new THREE.Mesh(k === 'L' ? bookGeo() : pencilGeo(), propMat)
    if (k === 'L') { m.rotation.set(1.0, 0.6, -0.1); m.position.set(0.008, 0.006, 0.012) } else { m.rotation.set(1.05, 0, 0.45); m.position.set(0, 0.002, 0.006) }
    m.visible = false; m.traverse(o => { o.layers.mask = root.layers.mask }); hand.add(m); out.push(hand, m) }
  const [, book, , pencil] = out
  st.hk = { book: (v) => { for (const m of [book, pencil]) { if (!m) continue; m.visible = v > 0.01; m.scale.setScalar(Math.max(0.001, v)) } } }
  return () => { st.hk = null; for (let i = 0; i < out.length; i += 2) out[i].removeFromParent() }
}

export function ChibiHoshino({ st, scale = 0.8, res }) {
  const g = useRef(), r = res ?? (TOUCH ? 40 : 52)
  useEffect(() => { let off = null, n = 0
    const iv = setInterval(() => { const root = g.current; if (root && root.getObjectByName('foL') && root.getObjectByName('foR')) { off = attachProps(root, st); clearInterval(iv) } else if (++n > 50) clearInterval(iv) }, 80)
    return () => { clearInterval(iv); off && off() } }, [])
  return <group ref={g}><Character cfg={HOSHINO} st={st} res={r} scale={scale} /></group>
}
export default ChibiHoshino
