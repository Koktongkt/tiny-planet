// DRAFT Grandpa Ishi — not used in the game. Preview: ?view=charstudio&dev=chibi-drafts&char=ishi&still
// A lazy chibi on the shared pipeline, built from docs/characters/ref/ishi-character-sheet.png. Bald with a small
// white top knot, big round ears, bushy white brows, a round nose and a broad white mustache (3D, merged with the
// knot and ears into one hair mesh + one ink hull), soft forehead lines. A navy haori open over a cream inner robe,
// a brown sash, dark brown trousers to mid-calf, bare feet in brown sandals. A gnarled cane in his right hand and
// a pipe in his left. Static still pose only for now (no animation pass yet).
import * as THREE from 'three'
import React, { useEffect, useRef } from 'react'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { Character, cel, spec } from '../../GhibliPerson.jsx'
import { ISHI_MOTION } from './motion.js'
import { makeLife, lifeStep, lifePost } from './life.js'
import { MIDFACE, MID_FADE, makeHeadSDF, makeFace } from './castFace.jsx'
import { part, tagAW, mergeHair, makeHairMat, makeHairInk } from './castHair.js'
import { q } from '../../common.jsx'

const TOUCH = typeof window !== 'undefined' && matchMedia('(pointer: coarse)').matches
const LIFE_OFF = q.has('still') && !q.has('life')
const SKIN = '#f2c29c'
const HAIR_C = '#e4e0da'
const HAIR_BAND = '#fbf8f4'
const HAORI = '#2d3548'
const HAORI_D = '#232a3a'
const ROBE = '#efe2c8'
const ROBE_D = '#d9c7a6'
const SASH = '#6e4830'
const SASH_D = '#553522'
const TROUSER = '#4a3e34'
const WOOD = '#7a4a2a'
const WOOD_D = '#5c3520'
const STRAP = '#7a4a2c'
const SOLE = '#5a3622'
const ISHI_HAIR_OFF = new Float32Array(12)
// his head, measured off the sheet's front and side views with the eye size as the scale: as tall as wide
// (skull half-width 0.054, top 0.049, chin -0.060 in the head frame), widest at the eyes, a broad round lower face
// (still ~0.89 W across at the mustache). Template: headS 1, CHEEK [0, -0.026, 0.012, 0.05, 0.0295, 0.035, 0.016]
const HEAD_S = [0.965, 0.98, 1.07]
const JAW = [0, -0.029, 0.010, 0.046, 0.032, 0.034, 0.022]
// a broad round crown: the sheet's dome is still 0.7 W across 15% down from the top (a stretched skull came to a point)
const CRANIUM = [0.014, -0.004, 0.048, 0.038, 0.054, 0.012]
const HEAD = { headS: HEAD_S, cranium: CRANIUM, cheek: JAW }
const headSDF = makeHeadSDF(HEAD)
const TOP = Math.max(0.0499 * HEAD_S[1], CRANIUM[0] + CRANIUM[3]) // skull top in the head frame
const Face = makeFace({ kind: 'ishi', defaultSquint: 0.04, blush: 0.62, shape: HEAD })

// front surface of the head (head frame) at (x, y): the face SDF, marched from the front
function surfZ(x, y) {
  let z = 0.09; for (; z > -0.02; z -= 0.0005) if (headSDF(x, y, z) < 0) break
  let a = z, b = z + 0.0005; for (let n = 0; n < 14; n++) { const m = (a + b) / 2; if (headSDF(x, y, m) < 0) a = m; else b = m }
  return b
}
// a lump that sits on the face at (x, y), pushed out by `out` along +z, turned with the head's curve
const onFace = (geo, x, y, out, r, rot = [0, 0, 0], skin = 0) => part(geo, [x, y, surfZ(x, y) + out], r, [rot[0], rot[1] + Math.asin(Math.max(-0.9, Math.min(0.9, x / 0.058))), rot[2]], skin)

const EAR = { x: 0.0570, y: -0.025, z: -0.006 }
function ishiHair() {
  const ball = new THREE.SphereGeometry(1, 16, 12), ballS = new THREE.SphereGeometry(1, 12, 9), ring = new THREE.TorusGeometry(1, 0.3, 6, 18)
  const parts = [
    // top knot: a round white bun a little behind the crown, a soft second lobe and a wrap ring at its base
    part(ball, [0, TOP + 0.0080, -0.016], [0.0205, 0.0165, 0.0195]),
    part(ballS, [0.003, TOP + 0.0195, -0.018], [0.0125, 0.0080, 0.0120], [0.1, 0, 0.12]),
    part(ring, [0, TOP - 0.0030, -0.014], [0.0150, 0.0150, 0.0110], [Math.PI / 2 - 0.14, 0, 0]),
  ]
  const nKnot = parts.length
  // brows: thick smooth white arches set high and wide, a chain of overlapping lumps along an arc so the outline is
  // one smooth crescent (sheet: inner end over the eye's inner edge, rising, then drooping past the outer corner)
  for (const sd of [-1, 1]) for (let i = 0; i < 7; i++) { const t = i / 6
    const x = 0.0175 + 0.0265 * t, y = 0.0062 + 0.0060 * Math.sin(Math.PI * Math.min(1, t * 1.15)) - 0.0042 * t * t
    const r = 0.0048 + 0.0016 * Math.sin(Math.PI * (0.25 + 0.6 * t)), slope = Math.cos(Math.PI * Math.min(1, t * 1.15)) * 0.7 - 0.5 * t
    parts.push(onFace(ballS, sd * x, y, -0.0004 - 0.0004 * t, [r * 1.5, r, r * 0.95], [0, 0, sd * slope])) }
  const nBrow = parts.length
  // mustache: two full lobes from under the nose, out and down to small tips that flick out (sheet: 0.75..0.92 H),
  // a chain along each lobe so the top edge is smooth; the lower edge keeps a soft scallop
  for (const sd of [-1, 1]) for (let i = 0; i < 11; i++) { const t = i / 10
    const x = 0.0030 + 0.0270 * t, y = -0.0365 - 0.0095 * Math.sin(Math.PI * 0.5 * Math.min(1, t * 1.25)) + 0.0020 * Math.max(0, t - 0.8) / 0.2
    const r = 0.0078 - 0.0034 * t * t, out = 0.0030 - 0.0026 * t
    parts.push(onFace(ball, sd * x, y, out, [r * 1.12, r, r], [0, 0, -sd * (0.1 + 0.45 * t)])) }
  const nMus = parts.length
  // round nose (skin) and big ears (skin)
  parts.push(onFace(ball, 0, -0.0284, 0.0042, [0.0114, 0.0080, 0.0094], [0, 0, 0], 1))
  // big ears with an inner fold: a smaller lump set into the front face of each ear, whose fine ink reads as the C
  for (const sd of [-1, 1]) {
    parts.push(part(ball, [sd * EAR.x, EAR.y, EAR.z], [0.0072, 0.0196, 0.0148], [0, -sd * 0.40, sd * 0.14], 1))
    const a = -sd * 0.40, nx = Math.cos(a) * sd, nz = -Math.sin(a) * sd // the ear's outward normal (local +x turned by a)
    parts.push(part(ballS, [sd * EAR.x + nx * 0.0042, EAR.y - 0.001, EAR.z + nz * 0.0042 + 0.0012], [0.0034, 0.0118, 0.0082], [0, a, sd * 0.14], 1))
  }
  for (let k = 0; k < parts.length; k++) {
    tagAW(parts[k], () => (k < nKnot ? [2, 0.3] : [3, 0]))
    // ink weight per piece: the brows, mustache and nose sit on the face and take a fine line (the sheet's thin outline)
    const w = k < nKnot ? 1 : k < nMus ? 0.38 : k === nMus ? 0.55 : (k - nMus) % 2 === 0 ? 0.35 : 0.7
    parts[k].setAttribute('aInk', new THREE.Float32BufferAttribute(new Float32Array(parts[k].attributes.position.count).fill(w), 1))
  }
  return mergeHair(parts)
}
const HAIR_GEO = ishiHair()
const hairMat = makeHairMat(SKIN, HAIR_C, HAIR_BAND, ISHI_HAIR_OFF)
const hairInk = (() => { const m = makeHairInk(ISHI_HAIR_OFF)
  m.vertexShader = 'attribute float aInk;\n' + m.vertexShader.replace('n*uT*sil*under', 'n*uT*aInk*sil*mix(1., under, aInk)'); return m })()
function IshiHair({ set }) {
  return <group ref={set('hair')}><mesh geometry={HAIR_GEO} material={hairMat} /><mesh geometry={HAIR_GEO} material={hairInk} /></group>
}

const paint = (g, hex) => {
  const col = new THREE.Color(hex), src = g.index ? g.toNonIndexed() : g
  const a = new Float32Array(src.attributes.position.count * 3)
  for (let i = 0; i < a.length; i += 3) { a[i] = col.r; a[i + 1] = col.g; a[i + 2] = col.b }
  src.setAttribute('color', new THREE.BufferAttribute(a, 3)); return src
}
const merged = (parts) => { const g = mergeGeometries(parts.map(p => p.attributes.normal ? p : (p.computeVertexNormals(), p))); g.computeVertexNormals(); return g }

function tubeBetween(a, b, r0, r1, hex, seg = 12) {
  const A = new THREE.Vector3(...a), Bv = new THREE.Vector3(...b)
  const len = Math.max(A.distanceTo(Bv), 0.001)
  const g = new THREE.CylinderGeometry(r1, r0, len, seg)
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), Bv.clone().sub(A).normalize()))
  const mid = A.clone().add(Bv).multiplyScalar(0.5); g.translate(mid.x, mid.y, mid.z)
  return paint(g, hex)
}
const ballAt = (p, r, hex, s = [1, 1, 1]) => { const g = new THREE.SphereGeometry(r, 10, 8); g.scale(...s); g.translate(...p); return paint(g, hex) }

// an arc strip round the front of the body (y up, centre cz, ellipse radii a x b), from angle -t..t (0 = straight ahead)
function frontBand(a, b, cz, t, h, th, hex) {
  const sh = new THREE.Shape(), n = 18
  for (let i = 0; i <= n; i++) { const u = -t + 2 * t * i / n; sh[i ? 'lineTo' : 'moveTo']((a + th) * Math.sin(u), cz + (b + th) * Math.cos(u)) }
  for (let i = n; i >= 0; i--) { const u = -t + 2 * t * i / n; sh.lineTo(a * Math.sin(u), cz + b * Math.cos(u)) }
  const g = new THREE.ExtrudeGeometry(sh, { depth: h, bevelEnabled: false, curveSegments: 1 })
  g.rotateX(Math.PI / 2); g.translate(0, h / 2, 0)
  return paint(g, hex)
}

// cream inner robe: crossed kimono collar (left over right) with a darker collar band
function robeCollarGeo() {
  const parts = []
  for (const sd of [-1, 1]) {
    const band = new THREE.Shape()
    band.moveTo(sd * 0.022, 0.026); band.lineTo(sd * 0.012, 0.028); band.lineTo(-sd * 0.010, -0.024); band.lineTo(-sd * 0.002, -0.028)
    band.closePath()
    const g = new THREE.ExtrudeGeometry(band, { depth: 0.004, bevelEnabled: false })
    g.translate(0, 0, sd < 0 ? 0.0045 : 0)
    parts.push(paint(g, sd < 0 ? ROBE : ROBE_D))
  }
  return merged(parts)
}

// wide haori sleeve: shoulder pad, upper arm, elbow, and a forearm that opens into a broad square-ish sleeve mouth
function haoriArmGeo(sd, sh, elbow, wrist) {
  const cap = ballAt([sh[0], sh[1] - 0.004, sh[2]], 0.0175, HAORI, [1.1, 0.95, 0.9])
  const yoke = ballAt([sh[0] - sd * 0.004, sh[1] - 0.014, sh[2] - 0.020], 0.022, HAORI, [0.9, 1.15, 1.25])
  const parts = [yoke, cap,
    tubeBetween(sh, elbow, 0.0150, 0.0140, HAORI),
    ballAt(elbow, 0.0142, HAORI),
    tubeBetween(elbow, wrist, 0.0150, 0.0215, HAORI, 10),
  ]
  // sleeve mouth: a dark rim so the opening reads, and the hanging bag of the sleeve under the forearm
  const W = new THREE.Vector3(...wrist), E = new THREE.Vector3(...elbow), d = W.clone().sub(E).normalize()
  const rim = new THREE.TorusGeometry(0.0202, 0.0022, 6, 16)
  rim.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), d)); rim.translate(...wrist)
  parts.push(paint(rim, HAORI_D))
  const inner = new THREE.CircleGeometry(0.0198, 14)
  inner.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), d)); inner.translate(W.x - d.x * 0.001, W.y - d.y * 0.001, W.z - d.z * 0.001)
  parts.push(paint(inner, '#171c28'))
  const bag = E.clone().lerp(W, 0.62); bag.y -= 0.012
  parts.push(ballAt(bag.toArray(), 0.016, HAORI, [0.9, 1.25, 1.05]))
  return merged(parts)
}

const mittenGeo = (s = 1) => { const g = new THREE.SphereGeometry(0.0128 * s, 12, 9); g.scale(1.1, 1.0, 0.95); return paint(g, SKIN) }

// gnarled walking stick from the ground up to a rounded knob, with a few knots
function caneGeo(bottom, top) {
  const B = new THREE.Vector3(...bottom), T = new THREE.Vector3(...top), parts = [], N = 6
  const jit = [[0, 0], [0.0016, -0.001], [-0.0012, 0.0012], [0.0014, 0.0006], [-0.0010, -0.0010], [0.0006, 0.0010], [0, 0]]
  const pts = []
  for (let i = 0; i <= N; i++) { const p = B.clone().lerp(T, i / N); p.x += jit[i][0]; p.z += jit[i][1]; pts.push(p) }
  for (let i = 0; i < N; i++) parts.push(tubeBetween(pts[i].toArray(), pts[i + 1].toArray(), 0.0050 + 0.0014 * i / N, 0.0050 + 0.0014 * (i + 1) / N, WOOD, 9))
  for (const [i, r] of [[2, 0.0058], [4, 0.0062]]) parts.push(ballAt(pts[i].toArray(), r, WOOD_D, [1, 0.8, 1]))
  // the handle: the stick swells and bends forward into a round knob
  const k1 = T.clone().add(new THREE.Vector3(0, 0.010, 0.004)), k2 = k1.clone().add(new THREE.Vector3(0.001, 0.008, 0.007))
  parts.push(tubeBetween(T.toArray(), k1.toArray(), 0.0054, 0.0068, WOOD, 9))
  parts.push(ballAt(k1.toArray(), 0.0070, WOOD))
  parts.push(tubeBetween(k1.toArray(), k2.toArray(), 0.0068, 0.0070, WOOD, 9))
  parts.push(ballAt(k2.toArray(), 0.0082, WOOD, [1, 0.9, 1.05]))
  parts.push(ballAt(pts[0].clone().add(new THREE.Vector3(0, 0.002, 0)).toArray(), 0.0044, WOOD_D))
  return merged(parts)
}

// briar pipe: an upright bowl with a dark opening, and a curved stem out to the side
function pipeGeo(sd) {
  const parts = []
  const bowl = new THREE.CylinderGeometry(0.0080, 0.0068, 0.0170, 14); bowl.translate(0, 0.0085, 0)
  parts.push(paint(bowl, '#8c5632'))
  const foot = new THREE.SphereGeometry(0.0070, 12, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2); foot.scale(1, 0.6, 1)
  parts.push(paint(foot, '#8c5632'))
  const rim = new THREE.TorusGeometry(0.0074, 0.0012, 6, 16); rim.rotateX(Math.PI / 2); rim.translate(0, 0.0170, 0)
  parts.push(paint(rim, '#6a3e22'))
  const hole = new THREE.CircleGeometry(0.0064, 14); hole.rotateX(-Math.PI / 2); hole.translate(0, 0.0164, 0)
  parts.push(paint(hole, '#2a1810'))
  const a = [sd * 0.006, 0.0040, 0], b = [sd * 0.020, 0.0060, 0.002], c = [sd * 0.032, 0.0120, 0.004]
  parts.push(tubeBetween(a, b, 0.0030, 0.0026, '#7a4a2a', 8), ballAt(b, 0.0026, '#7a4a2a'), tubeBetween(b, c, 0.0026, 0.0022, '#4a2c1a', 8), ballAt(c, 0.0022, '#4a2c1a'))
  return merged(parts)
}

// sash: two stacked brown bands across the robe opening, a flat knot and a short hanging end
function sashGeo(a, b, cz, t) {
  const parts = [frontBand(a, b, cz, t, 0.025, 0.003, SASH), frontBand(a + 0.0026, b + 0.0026, cz, t * 0.97, 0.0022, 0.0010, SASH_D)]
  parts[1].translate(0, 0.0005, 0)
  const z = cz + b + 0.0035
  const knot = new THREE.BoxGeometry(0.014, 0.012, 0.005); knot.translate(0, -0.001, z); parts.push(paint(knot, SASH_D))
  const tie = new THREE.BoxGeometry(0.017, 0.0045, 0.004); tie.translate(0, -0.001, z + 0.0028); parts.push(paint(tie, SASH))
  const end = new THREE.BoxGeometry(0.012, 0.020, 0.004); end.rotateZ(0.08); end.translate(0.002, -0.018, z - 0.001); parts.push(paint(end, SASH))
  const end2 = new THREE.BoxGeometry(0.014, 0.0016, 0.0056); end2.rotateZ(0.08); end2.translate(0.001, -0.010, z + 0.0015); parts.push(paint(end2, SASH_D))
  return merged(parts)
}

// sandal: a flat sole under the bare foot and two wide straps over it (foot-bone local, built from the spec)
function sandalGeo(S, k) {
  const an = S['an' + k], ft = S['ft' + k], fr = S.fr, parts = []
  const fz = ft.z - an.z, fy = ft.y - an.y, soleTop = fy - fr.y * 0.78
  const sole = new THREE.CylinderGeometry(1, 1, 0.0062, 20); sole.scale(fr.x * 1.12, 1, fr.z * 1.10); sole.translate(0, soleTop - 0.0031, fz + 0.001)
  parts.push(paint(sole, SOLE))
  for (const [dz, w, rr] of [[0.012, 0.0072, 0.96], [-0.006, 0.0062, 1.0]]) {
    const s = new THREE.TorusGeometry(1, 0.08, 6, 18, Math.PI); s.scale(fr.x * rr * 1.04, fr.y * 1.1, w * 6); s.translate(0, soleTop + 0.001, fz + dz)
    parts.push(paint(s, STRAP))
  }
  return merged(parts)
}

const propMat = (() => { const m = cel('#ffffff').clone(); m.vertexColors = true; m.defines = { KIND: 1 }; m.polygonOffset = true; m.polygonOffsetFactor = -1; m.polygonOffsetUnits = -2; return m })()
const plainMat = (() => { const m = cel('#ffffff').clone(); m.vertexColors = true; m.defines = { KIND: 1 }; return m })()

function attachLook(root) {
  const chest = root.getObjectByName('chest'), hips = root.getObjectByName('hips')
  if (!chest || !hips) return () => {}
  const S = spec(ISHI.body), out = []
  const chestY = (S.bellyY + S.chestY) / 2, hipsY = (S.hipY + S.bellyY) / 2
  const add = (parent, geo, pos = [0, 0, 0], mat = propMat, rot) => {
    const m = new THREE.Mesh(geo, mat); m.position.set(...pos); if (rot) m.rotation.set(...rot)
    m.traverse(o => { o.layers.mask = root.layers.mask }); parent.add(m); out.push(m); return m
  }
  const chestZ = S.chest[1].z + S.chest[0].z
  // inner robe collar in the haori opening, and the haori's collar band down the front edges
  add(chest, robeCollarGeo(), [0, S.neckY - chestY - 0.030, chestZ - 0.004])
  // sash round the belly, across the opening
  const sy = S.bellyY - 0.014, [bc, br] = S.belly, k = Math.sqrt(Math.max(0.2, 1 - ((sy - bc.y) / br.y) ** 2))
  add(hips, sashGeo(br.x * k + 0.002, br.z * k + 0.002, bc.z, 0.62), [0, sy - hipsY, 0])
  // sandals on the bare feet
  for (const k2 of ['L', 'R']) { const ft = root.getObjectByName('ft' + k2); if (ft) add(ft, sandalGeo(S, k2), [0, 0, 0], plainMat) }
  if (LIFE_OFF) {
    // his right (viewer's left): arm hangs a little forward, hand grips the cane at hip height; cane stands by the foot
    // his left (viewer's right): forearm bent up, hand holds the pipe in front of the belly
    const shY = S.shY - chestY - 0.004
    for (const sd of [-1, 1]) {
      const sh = [sd * Math.abs(S.shL.x), shY, S.shL.z + 0.004]
      const cane = sd < 0
      const hand = cane ? [-0.086, -0.050, 0.040] : [0.056, -0.014, chestZ + 0.026]
      const elbow = cane ? [-0.084, -0.010, 0.006] : [0.086, -0.026, 0.014]
      const wrist = new THREE.Vector3(...elbow).lerp(new THREE.Vector3(...hand), 0.72).toArray()
      add(chest, haoriArmGeo(sd, sh, elbow, wrist))
      add(chest, mittenGeo(cane ? 1.05 : 1), hand, propMat, [0.2, sd * -0.3, sd * 0.2])
      if (cane) add(chest, caneGeo([hand[0] - 0.004, -chestY + 0.004, hand[2] + 0.004], [hand[0], hand[1] + 0.012, hand[2]]))
      else add(chest, pipeGeo(-1), [hand[0] - 0.002, hand[1] + 0.006, hand[2] + 0.004], propMat, [0.15, 0.25, 0]).scale.setScalar(1.45)
    }
  }
  return () => out.forEach(m => m.removeFromParent())
}

function stillHold(B) {
  // still pose: the chest-parented haori sleeves above are the arms; the skinned rig's are tiny (body.arm / hand)
  B.upL.rotation.set(0.2, 0.1, -0.4); B.upR.rotation.set(0.2, -0.1, 0.4)
  B.foL.rotation.set(-0.8, 0, 0); B.foR.rotation.set(-0.8, 0, 0)
}

const BODY = { H: 0.90, head: 1.46, leg: 0.90, torso: 1.12, arm: 0.02, girth: 1.26, shoulder: 1.10, chestW: 1.14, bellyZ: 1.0, shX: 1.20, armA: 0.50,
  armR: [0.35, 0.30, 0.25], legR: 1.30, legX: 1.08, foot: 1.20, bootW: 1.20, bootH: 1.00, bootL: 1.02, hand: 0.01,
  headS: HEAD_S, cranium: CRANIUM, cheek: JAW, midface: MIDFACE, midfaceFade: MID_FADE, hunch: 0.12,
  anY: 0.040, footY: 0.020, soleY: 0.0068, bald: true }
const S0 = spec(BODY)

export const ISHI = {
  name: 'grandpa', age: 'elder', motion: ISHI_MOTION,
  body: BODY,
  hair: { style: 'chibi', c: HAIR_C },
  face: {},
  // openJacket painter: acc = navy haori to the upper thigh, top = cream robe in the opening, bottom = brown trousers
  // to mid-calf (bare: skin below legHem), shoe = skin (bare feet; 3D sandals sit under them)
  outfit: { type: 'openJacket', hemY: 'thigh', skin: SKIN, top: ROBE, acc: HAORI, acc2: HAORI, bottom: TROUSER, shoe: SKIN, shoeY: 0.0,
    bare: true, legHem: S0.anY + (S0.knY - S0.anY) * 0.2, long: true, sleeve: 'none' },
  hold: {},
  walk: { rate: 7, stride: 0.42, knee: 0.55, bounce: 0.006, smooth: true, land: 0.25, arm: 0.35, lean: 0.12, twist: 0.08, sway: 0.06, idle: 'look' },
  ext: {
    life: (B, st, dt, t, R_, mem, state) => { const L = mem.life || (mem.life = makeLife(Math.random, ISHI_MOTION)); st.life = L; L.B = B; L.R = R_; L.hairOff = ISHI_HAIR_OFF
      if (!LIFE_OFF) lifeStep(L, B, st, dt, t, R_, state.camera); else stillHold(B) },
    post: (R_, st, dt, t) => { if (!LIFE_OFF) lifePost(st.life, R_, st, dt, t) },
    Face, Hair: IshiHair,
  },
}

export function ChibiIshi({ st, scale = 0.8, res }) {
  const g = useRef()
  const r = res ?? (TOUCH ? 40 : 52)
  useEffect(() => { let off = null, n = 0
    const iv = setInterval(() => { const root = g.current; if (root && root.getObjectByName('chest') && root.getObjectByName('hips')) { off = attachLook(root); clearInterval(iv) } else if (++n > 50) clearInterval(iv) }, 80)
    return () => { clearInterval(iv); off && off() } }, [])
  return <group ref={g}><Character cfg={ISHI} st={st} res={r} scale={scale} /></group>
}
export default ChibiIshi
