// DRAFT Professor Hoshino — not used in the game. Preview: ?view=charstudio&dev=chibi-drafts&char=hoshino
// A lazy chibi on the shared pipeline. Dark messy hair with a
// soft grey-streaked side, no beard, thick dark brows, round dark glasses, a
// khaki lapelled jacket open over a dark green waistcoat and white shirt collar,
// a knotted rust scarf, olive trousers, brown boots, and an open red notebook
// plus a dark pencil. Stocky, about Fuku's height. No cane.
import * as THREE from 'three'
import React, { useEffect, useRef } from 'react'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { Character, cel, spec } from '../../GhibliPerson.jsx'
import { HOSHINO_MOTION } from './motion.js'
import { makeLife, lifeStep, lifePost } from './life.js'
import { CHEEK, MIDFACE, MID_FADE, makeFace } from './castFace.jsx'
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
const VEST = '#4e5238'
const SHIRT = '#f4eee6'
const HOSHINO_HAIR_OFF = new Float32Array(12)
// thin gold wire specs, larger than the eyes (golden sheet); arms meet the low ears
const Face = makeFace({ kind: 'hoshino', glasses: GLASS, wire: { ear: [0.0555, -0.021, 0.004] }, defaultSquint: 0.06, blush: 0.55 })

// skull HR is ~[0.058, 0.050, 0.055]. Golden sheet: a full, rounded cloud of soft waves, about 1.3x the
// face width, covering the crown and the whole back down to the nape. Forehead open in a soft arch;
// the fringe rolls from his right to left. Ears sit low (eye-to-mouth line), tucked under the cloud.
const EAR = { x: 0.0565, y: -0.021, z: 0.002 }
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
function hoshinoHair() {
  const ball = new THREE.SphereGeometry(1, 18, 14), ballS = new THREE.SphereGeometry(1, 12, 9)
  const L = (az, el, push, sz, roll) => lock(ballS, az, el, push, sz, roll)
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
    L(-0.15, 0.80, 1.02, [0.026, 0.020, 0.012], 1.05),
    L(0.30, 0.74, 1.0, [0.022, 0.016, 0.010], 0.75),
    L(-0.45, 0.46, 1.0, [0.018, 0.014, 0.010], 0.25),
    L(0.62, 0.50, 1.0, [0.019, 0.014, 0.009], 0.40),
    L(-0.80, 0.18, 0.99, [0.017, 0.015, 0.009], 0.9),
    L(0.86, 0.16, 0.99, [0.017, 0.015, 0.009], 1.0),
    ...[-1, 1].map(d => part(ballS, [d * EAR.x, EAR.y, EAR.z], [0.0068, 0.0125, 0.0074], [0, d * 0.7, d * 0.08], 1)),
  ]
  const n = parts.length
  tagAW(parts[0], () => [3, 0])
  tagAW(parts[1], () => [3, 0])
  for (let k = 2; k < n - 2; k++) tagAW(parts[k], (x, y) => [2, 0.35 + 0.35 * sm(-0.01, 0.06, y)])
  for (const k of [n - 2, n - 1]) tagAW(parts[k], () => [3, 0])
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

const paint = (g, hex) => {
  const col = new THREE.Color(hex), src = g.index ? g.toNonIndexed() : g
  const a = new Float32Array(src.attributes.position.count * 3)
  for (let i = 0; i < a.length; i += 3) { a[i] = col.r; a[i + 1] = col.g; a[i + 2] = col.b }
  src.setAttribute('color', new THREE.BufferAttribute(a, 3)); return src
}

// small hardback notebook, about head-width, shallow V, red covers outside, cream pages
let NB = null
function notebookGeo() {
  if (NB) return NB
  const open = 0.48
  const coverW = 0.060, coverH = 0.064, coverT = 0.012
  const pageW = 0.050, pageH = 0.054, pageT = 0.007
  const parts = []
  const COVER = '#7a3224'
  for (const sd of [-1, 1]) {
    const yaw = sd * -open // outer edges toward +Z (camera)
    const cover = new THREE.BoxGeometry(coverW, coverH, coverT)
    cover.translate(sd * coverW * 0.5, 0, -coverT * 0.5)
    cover.rotateY(yaw)
    parts.push(paint(cover, COVER))
    const page = new THREE.BoxGeometry(pageW, pageH, pageT)
    page.translate(sd * (pageW * 0.5 + 0.0015), 0, pageT * 0.5 + 0.0008)
    page.rotateY(yaw)
    parts.push(paint(page, '#f7f1e4'))
  }
  const spine = new THREE.BoxGeometry(0.012, coverH, 0.014)
  spine.translate(0, 0, -0.004)
  parts.push(paint(spine, '#5c241c'))
  for (const y of [0.010, -0.006]) {
    const line = new THREE.BoxGeometry(0.032, 0.0007, 0.0005)
    line.translate(pageW * 0.5 + 0.002, y, pageT + 0.0014)
    line.rotateY(-open)
    parts.push(paint(line, '#c8b09a'))
  }
  const book = mergeGeometries(parts); book.computeVertexNormals()
  const shaft = new THREE.CylinderGeometry(0.0024, 0.0024, 0.068, 8)
  const tip = new THREE.CylinderGeometry(0.0004, 0.0024, 0.010, 8)
  tip.translate(0, 0.039, 0)
  const pencil = mergeGeometries([paint(shaft, '#2a241c'), paint(tip, '#d2b48a')])
  pencil.computeVertexNormals()
  NB = { book, pencil }; return NB
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
    const g = new THREE.BoxGeometry(0.016, 0.016, 0.006)
    g.rotateZ(sd * -0.32)
    g.rotateX(-0.36)
    g.translate(sd * 0.014, 0.022, 0.016)
    parts.push(paint(g, SHIRT))
  }
  return mergeGeometries(parts)
}

function mittenGeo() {
  const g = new THREE.SphereGeometry(0.0125, 10, 8)
  g.scale(1.12, 0.92, 0.88)
  return paint(g, SKIN)
}


function scarfGeo() {
  // one knotted rust scarf at the neck; two tails hang down the centre over the waistcoat
  const rust = '#c05438', rustD = '#9a3c28'
  const parts = []
  const ring = new THREE.TorusGeometry(0.028, 0.0075, 10, 24)
  ring.rotateX(Math.PI / 2)
  ring.scale(1.10, 0.72, 1.02)
  ring.translate(0, 0.006, 0.004)
  parts.push(paint(ring, rust))
  const knot1 = new THREE.SphereGeometry(0.011, 10, 8)
  knot1.scale(1.35, 0.80, 1.10)
  knot1.translate(0.000, -0.006, 0.028)
  parts.push(paint(knot1, rustD))
  const knot2 = new THREE.SphereGeometry(0.008, 8, 7)
  knot2.scale(1.25, 0.70, 0.95)
  knot2.translate(-0.005, -0.012, 0.030)
  parts.push(paint(knot2, rust))
  const endL = new THREE.BoxGeometry(0.015, 0.072, 0.008)
  endL.rotateZ(0.06)
  endL.translate(-0.009, -0.046, 0.032)
  parts.push(paint(endL, rust))
  const endR = new THREE.BoxGeometry(0.014, 0.064, 0.008)
  endR.rotateZ(-0.08)
  endR.translate(0.009, -0.042, 0.034)
  parts.push(paint(endR, rustD))
  const g = mergeGeometries(parts); g.computeVertexNormals(); return g
}

function lapelGeo() {
  const parts = []
  const shade = '#a88252' // slightly darker tan than the jacket, never red
  for (const sd of [-1, 1]) {
    const shape = new THREE.Shape()
    shape.moveTo(sd * 0.006, 0.036)
    shape.lineTo(sd * 0.028, 0.016)
    shape.lineTo(sd * 0.022, -0.004)
    shape.lineTo(sd * 0.008, 0.010)
    shape.closePath()
    const g = new THREE.ExtrudeGeometry(shape, { depth: 0.007, bevelEnabled: false, steps: 1 })
    g.translate(sd * 0.020, 0.016, 0)
    parts.push(paint(g, shade))
  }
  const g = mergeGeometries(parts); g.computeVertexNormals(); return g
}

function pocketGeo() {
  const shade = '#a88252', bag = '#b08a58', slit = '#8a6a40'
  const parts = []
  for (const sd of [-1, 1]) {
    const pouch = new THREE.BoxGeometry(0.030, 0.024, 0.009)
    pouch.translate(sd * 0.048, -0.008, 0.004)
    parts.push(paint(pouch, bag))
    const flap = new THREE.BoxGeometry(0.032, 0.011, 0.010)
    flap.translate(sd * 0.048, 0.007, 0.007)
    parts.push(paint(flap, shade))
    const line = new THREE.BoxGeometry(0.026, 0.0020, 0.002)
    line.translate(sd * 0.048, 0.003, 0.010)
    parts.push(paint(line, slit))
  }
  const g = mergeGeometries(parts); g.computeVertexNormals(); return g
}


function tubeBetween(a, b, r0, r1, hex) {
  const A = new THREE.Vector3(...a), Bv = new THREE.Vector3(...b)
  const len = Math.max(A.distanceTo(Bv), 0.001)
  const g = new THREE.CylinderGeometry(r1, r0, len, 12)
  const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), Bv.clone().sub(A).normalize())
  g.applyQuaternion(quat)
  const mid = A.clone().add(Bv).multiplyScalar(0.5)
  g.translate(mid.x, mid.y, mid.z)
  return paint(g, hex)
}

// still-pose arm: hanging sleeve, bent forearm, ends at the prop mitten (chest-local)
function stillArmGeo(sd, sh, hand, hex, cuff) {
  const elbow = [
    sh[0] * 0.70 + hand[0] * 0.30 + sd * 0.016,
    Math.min(sh[1], hand[1]) - 0.028,
    Math.max(sh[2], hand[2]) * 0.45 + 0.016,
  ]
  // pad sits on the real shoulder (covers the skin nub) and is flattened so 3/4 has no back ball
  const capPos = [sh[0], sh[1], sh[2]]
  const cap = new THREE.SphereGeometry(0.017, 10, 8)
  cap.scale(1.10, 0.95, 0.86)
  cap.translate(...capPos)
  const yoke = new THREE.SphereGeometry(0.022, 10, 8)
  yoke.scale(0.90, 1.15, 1.25)
  yoke.translate(sh[0] - sd * 0.004, sh[1] - 0.014, sh[2] - 0.022)
  const joint = new THREE.SphereGeometry(0.0098, 8, 7); joint.translate(...elbow)
  const parts = [
    paint(yoke, hex),
    paint(cap, hex),
    tubeBetween(capPos, elbow, 0.0125, 0.0100, hex),
    paint(joint, hex),
    tubeBetween(elbow, hand, 0.0100, 0.0082, hex),
  ]
  if (cuff) {
    const t0 = 0.72, t1 = 0.92
    const c0 = [elbow[0] + (hand[0] - elbow[0]) * t0, elbow[1] + (hand[1] - elbow[1]) * t0, elbow[2] + (hand[2] - elbow[2]) * t0]
    const c1 = [elbow[0] + (hand[0] - elbow[0]) * t1, elbow[1] + (hand[1] - elbow[1]) * t1, elbow[2] + (hand[2] - elbow[2]) * t1]
    parts.push(tubeBetween(c0, c1, 0.0094, 0.0092, cuff))
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
    add(lapelGeo(), [0, 0.012, chestZ + 0.018])
    add(pocketGeo(), [0, -0.064, chestZ + 0.024])
    add(scarfGeo(), [0, S.neckY - ((S.bellyY + S.chestY) / 2) - 0.002, chestZ * 0.55])
    // white collar points peek above the scarf
    add(shirtCollarGeo(), [0, S.neckY - ((S.bellyY + S.chestY) / 2) + 0.016, chestZ * 0.62])
    const bookY = -0.040, bookZ = chestZ + 0.052
    const bookRX = -0.55
    const book = add(g.book, [0, bookY, bookZ], vestMat, [bookRX, 0.02, 0])
    const toChest = (lx, ly, lz) => {
      const cy = ly * Math.cos(bookRX) - lz * Math.sin(bookRX)
      const cz = ly * Math.sin(bookRX) + lz * Math.cos(bookRX)
      return [lx, bookY + cy, bookZ + cz]
    }
    if (LIFE_OFF) {
      const chestY = (S.bellyY + S.chestY) / 2
      const addOnBook = (geo, pos, rot, scl) => {
        const m = new THREE.Mesh(geo, vestMat)
        m.position.set(...pos)
        if (rot) m.rotation.set(...rot)
        if (scl) m.scale.setScalar(scl)
        m.traverse(o => { o.layers.mask = root.layers.mask })
        book.add(m); out.push(m)
        return m
      }
      // left mitten supports from below (book -X / viewer's right); right holds a long pencil at the top-left
      const locL = [-0.022, -0.030, 0.004], locR = [0.018, 0.022, 0.016]
      addOnBook(mittenGeo(), locL, [0.55, 0.25, 0.30], 1)
      addOnBook(g.pencil, [0.010, 0.018, 0.018], [Math.PI * 0.50 - 0.28, 0.12, 0.08], 1)
      addOnBook(mittenGeo(), locR, [0.15, -0.20, -0.10], 1)
      const handL = toChest(...locL), handR = toChest(...locR)
      const shL = [-(Math.abs(S.shL.x)), S.shY - chestY - 0.002, S.shL.z + 0.006]
      const shR = [ (Math.abs(S.shR.x)), S.shY - chestY - 0.002, S.shR.z + 0.006]
      add(stillArmGeo(-1, shL, handL, JACKET, SHIRT), [0, 0, 0])
      add(stillArmGeo( 1, shR, handR, JACKET, SHIRT), [0, 0, 0])
    }
  }
  return () => out.forEach(h => h.removeFromParent())
}

function readHold(B, st) {
  // still pose: custom chest-parented sleeves (stillArmGeo) hang and bend in to the book.
  // the skinned rig is shortened (body.arm / hand) so it does not draw extra shoulder stubs.
  // window.__poseH = [upLX, upLY, upLZ, foLX, foLY, foLZ, upRX, upRY, upRZ, foRX, foRY, foRZ]
  const d = (typeof window !== 'undefined' && window.__poseH) || [0.20, 0.10, -0.40, -0.80, 0.0, 0.0, 0.20, -0.10, 0.40, -0.80, 0.0, 0.0]
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
  // still pose draws custom sleeves; body.arm / hand stay tiny so the skinned rig is hidden.
  body: { H: 0.90, head: 1.46, leg: 0.92, torso: 1.14, arm: 0.02, girth: 1.20, shoulder: 1.08, chestW: 1.12, bellyZ: 0.96, shX: 1.18, armA: 0.50,
    armR: [0.35, 0.30, 0.25], legR: 1.24, legX: 1.06, foot: 1.20, bootW: 1.22, bootH: 1.16, bootL: 1.00, hand: 0.01,
    cheek: CHEEK, midface: MIDFACE, midfaceFade: MID_FADE, hunch: 0.16,
    anY: 0.038, footY: 0.015, soleY: 0.0012 },
  hair: { style: 'chibi', c: HAIR_C },
  face: { glasses: GLASS },
  // openJacket painter: acc = khaki jacket to mid-thigh, top = vest shown in the opening,
  // bottom = olive trousers. Custom knotted scarf, small shirt collar, and lapels are chest meshes.
  outfit: { type: 'openJacket', hemY: 'thigh', skin: SKIN, top: VEST, acc: JACKET, acc2: JACKET, bottom: '#4e4f38', shoe: '#4e321c', shoeY: 0.044, long: true, sleeve: 'none', seams: true },
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
