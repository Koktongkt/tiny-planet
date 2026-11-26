// DRAFT Grandpa Ishi — not used in the game. Preview: ?view=charstudio&dev=chibi-drafts&char=ishi&still
// A lazy chibi on the shared pipeline, built from docs/characters/ref/ishi-character-sheet.png. Bald with a small
// white top knot, big round ears, bushy white brows, a round nose and a broad white mustache (3D, merged with the
// knot and ears into one hair mesh + one ink hull), soft forehead lines. A navy haori open over a cream inner robe,
// a brown sash, dark brown trousers to mid-calf, bare feet in brown sandals. A gnarled cane in his right hand and
// a pipe in his left. Static still pose only for now (no animation pass yet).
import * as THREE from 'three'
import React, { useEffect, useRef } from 'react'
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { Character, cel, spec, sdf, mkOutline } from '../../GhibliPerson.jsx'
import { ISHI_MOTION } from './motion.js'
import { makeLife, lifeStep, lifePost } from './life.js'
import { MIDFACE, MID_FADE, makeFace } from './castFace.jsx'
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
const STRAP = '#563220'
const SOLE = '#3c2216'
const ISHI_HAIR_OFF = new Float32Array(12)
// his head, measured off the sheet's front and side views with the eye size as the scale: as tall as wide
// (skull half-width 0.054, top 0.049, chin -0.060 in the head frame), widest at the eyes, a broad round lower face
// (still ~0.89 W across at the mustache). Template: headS 1, CHEEK [0, -0.026, 0.012, 0.05, 0.0295, 0.035, 0.016]
const HEAD_S = [0.95, 0.98, 1.07]
// the jaw reaches forward and down (sheet side view: under the nose the face drops nearly straight to a full round chin)
const JAW = [0, -0.035, 0.014, 0.0520, 0.031, 0.041, 0.026] // wide and round, widest below the ears: full lower cheeks, the sides pulled in a little at the ears
// a broad round crown: the sheet's dome is still 0.7 W across 15% down from the top (a stretched skull came to a point)
const CRANIUM = [0.014, -0.004, 0.048, 0.038, 0.054, 0.012]
// a full round chin under the mustache: the front stays just behind the nose base and drops nearly straight down,
// then the underside curves back to the neck (sheet side view)
const CHIN = [-0.049, 0.026, 0.027, 0.015, 0.019, 0.012] // pass 8: pulled back a little (less full under the nose in profile)
// the lower back of the skull is full and round down to the neck (sheet side view), not flat above the nape
const OCCIPUT = [-0.018, -0.024, 0.042, 0.030, 0.039, 0.016]
const HEAD = { headS: HEAD_S, cranium: CRANIUM, chin: CHIN, lumps: [OCCIPUT], cheek: JAW }
const BODY = { H: 0.90, head: 1.46, leg: 0.90, torso: 1.12, arm: 0.02, girth: 1.26, shoulder: 1.10, chestW: 1.14, bellyZ: 1.0, shX: 1.20, armA: 0.50,
  armR: [0.35, 0.30, 0.25], legR: 1.30, legX: 1.08, foot: 1.20, bootW: 1.20, bootH: 1.00, bootL: 1.02, hand: 0.01,
  headS: HEAD_S, cranium: CRANIUM, chin: CHIN, lumps: [OCCIPUT], cheek: JAW, midface: MIDFACE, midfaceFade: MID_FADE, hunch: 0.12,
  anY: 0.040, footY: 0.020, soleY: 0.0068, bald: true, headUp: 0.012 }
const TOP = Math.max(0.0499 * HEAD_S[1], CRANIUM[0] + CRANIUM[3]) // skull top in the head frame
const Face = makeFace({ kind: 'ishi', defaultSquint: 0.04, blush: 0.62, shape: HEAD, fy1: 0.034, eyeS: 1.12 }) // the decal reaches up the forehead for the wrinkles

// the baked surface in the head frame (origin S.headC, scale 1.17 * head): the whole body SDF, so the chin's blend
// into the neck counts (the head-only SDF sits behind the real lower face, and pieces placed on it were buried)
let HS = null
const _p = new THREE.Vector3()
const bodyAt = (x, y, z) => { const S = HS || (HS = spec(BODY)), k = 1.17 * (BODY.head ?? 1); return sdf(S, _p.set(S.headC.x + x * k, S.headC.y + y * k, S.headC.z + z * k)) / k }
// front surface of the face at (x, y), marched from the front
function surfZ(x, y) {
  let z = 0.09; for (; z > -0.02; z -= 0.0005) if (bodyAt(x, y, z) < 0) break
  let a = z, b = z + 0.0005; for (let n = 0; n < 14; n++) { const m = (a + b) / 2; if (bodyAt(x, y, m) < 0) a = m; else b = m }
  return b
}
// a lump that sits on the face at (x, y), pushed out by `out` along +z, turned with the head's curve
const onFace = (geo, x, y, out, r, rot = [0, 0, 0], skin = 0) => part(geo, [x, y, surfZ(x, y) + out], r, [rot[0], rot[1] + Math.asin(Math.max(-0.9, Math.min(0.9, x / 0.058))), rot[2]], skin)

const EAR = { y: -0.025, z: -0.008 }

// mustache traced off the sheet's portrait (head frame; nose centre (0, -0.0284)): one solid bell-shaped piece, the top
// edge hugging the sides of the nose and sloping down to pointed outer tips, a feathery underside of strand points
// and a V notch in the middle. Built as a rounded slab (extrude + bevel) bent onto the face, thickest under the nose.
// pass 8 (KT: cuter): smaller and rounder, a soft round tip and two gentle scallops underneath instead of strand points
const MUS_R = [[0, -0.0350], [0.0060, -0.0333], [0.0100, -0.0300], [0.0140, -0.0294], [0.0185, -0.0314], [0.0225, -0.0350],
  [0.0252, -0.0395], [0.0262, -0.0430], [0.0252, -0.0452], [0.0230, -0.0460], [0.0206, -0.0450], [0.0186, -0.0466],
  [0.0160, -0.0473], [0.0134, -0.0462], [0.0112, -0.0469], [0.0085, -0.0459], [0.0055, -0.0434], [0.0025, -0.0414], [0, -0.0405]]
function mustacheGeo() {
  // each half is a closed puff: rings shrink from the outline to a centre point; the front rings dome out from the face
  // (thickest under the nose, thinner toward the tip), the back rings sit just inside the head. Dense, so it follows
  // the curve of the face everywhere (a flat extrude let the cheeks poke through).
  const halves = []
  for (const sd of [1, -1]) {
    const poly = [...MUS_R, [-0.0012, -0.0414], [-0.0012, -0.0352]].map(([x, y]) => [sd * x, y]), ring = []
    for (let i = 0; i < poly.length; i++) { const [ax, ay] = poly[i], [bx, by] = poly[(i + 1) % poly.length], n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / 0.0012))
      for (let k = 0; k < n; k++) ring.push([ax + (bx - ax) * k / n, ay + (by - ay) * k / n]) }
    const C = [sd * 0.0125, -0.0405], K = 7, M = ring.length, pos = [], idx = []
    const at = (j, s, front) => { const [px, py] = ring[j], x = C[0] + (px - C[0]) * s, y = C[1] + (py - C[1]) * s
      const H = 0.0078 - 0.0046 * Math.min(1, Math.abs(x) / 0.027) - 0.0012 * Math.max(0, Math.min(1, (-0.043 - y) / 0.008))
      const z = front ? surfZ(x, y) - 0.0006 + H * Math.sqrt(Math.max(0, 1 - s * s)) : surfZ(x, y) - 0.0028 + 0.0022 * (1 - Math.sqrt(Math.max(0, 1 - s * s)))
      pos.push(x, y, z) }
    // rings 0..K front (s = 1 - k/K), then back; the outline ring (s = 1) is shared
    for (let k = 0; k < K; k++) for (let j = 0; j < M; j++) at(j, 1 - k / K, true)
    const fc = pos.length / 3; at(0, 0, true)
    for (let k = 1; k < K; k++) for (let j = 0; j < M; j++) at(j, 1 - k / K, false)
    const bc = pos.length / 3; at(0, 0, false)
    const F = (k, j) => k * M + (j % M), Bk = (k, j) => k === 0 ? j % M : fc + 1 + (k - 1) * M + (j % M)
    for (let k = 0; k < K - 1; k++) for (let j = 0; j < M; j++) { idx.push(F(k, j), F(k, j + 1), F(k + 1, j + 1), F(k, j), F(k + 1, j + 1), F(k + 1, j))
      idx.push(Bk(k, j), Bk(k + 1, j + 1), Bk(k, j + 1), Bk(k, j), Bk(k + 1, j), Bk(k + 1, j + 1)) }
    for (let j = 0; j < M; j++) { idx.push(F(K - 1, j), F(K - 1, j + 1), fc); idx.push(Bk(K - 1, j), bc, Bk(K - 1, j + 1)) }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals()
    // the outline direction differs per half: make the front face point out of the face
    const N = g.attributes.normal; if (N.getZ(fc) < 0) { const I = g.index.array; for (let i = 0; i < I.length; i += 3) { const t = I[i + 1]; I[i + 1] = I[i + 2]; I[i + 2] = t } g.computeVertexNormals() }
    halves.push(g) }
  const g = mergeGeometries(halves); g.computeVertexNormals()
  g.setAttribute('aSkin', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count), 1))
  return g
}

// side of the head (head frame) at (y, z), marched in from outside along +x
function surfX(y, z) {
  let x = 0.1; for (; x > 0; x -= 0.0005) if (bodyAt(x, y, z) < 0) break
  let a = x, b = x + 0.0005; for (let n = 0; n < 14; n++) { const m = (a + b) / 2; if (bodyAt(m, y, z) < 0) a = m; else b = m }
  return b
}
// ear (sheet): a flat C lying against the side of the head at nose height, set well back; a thick outer rim curls
// round the back and top with its opening toward the face, a small inner curl; turned forward so the bowl shows
// from the front. Built in a local frame (+x out of the head, y up, -z toward the back of the head), then turned.
const EAR_TILT = 0.62
function earParts(sd) {
  const ry = 0.0172, rz = 0.0138
  const disc = new THREE.SphereGeometry(1, 16, 12); disc.scale(0.0044, ry, rz)
  // the C: an arc of tube round the back of the disc, from the lower front round to the upper front
  const arc = (r0y, r0z, tube, from, span, seg = 20) => { const g = new THREE.TorusGeometry(1, tube, 6, seg, span); g.rotateZ(from)
    const P = g.attributes.position; for (let i = 0; i < P.count; i++) { const u = P.getX(i), v = P.getY(i), w = P.getZ(i); P.setXYZ(i, w * 0.0026 / tube + 0.0026, v * r0y, -u * r0z) } return g }
  const rim = arc(ry * 0.80, rz * 0.80, 0.16, -2.2, 4.1), curl = arc(ry * 0.40, rz * 0.40, 0.20, -1.4, 2.4, 14)
  curl.translate(0.0012, -0.0030, 0.0020)
  // the bowl inside the rim, a darker warm skin (aSkin 0.75 in the hair shader)
  const bowl = new THREE.SphereGeometry(1, 16, 12); bowl.scale(0.0016, ry * 0.62, rz * 0.54); bowl.translate(0.0034, -0.0008, 0.0016)
  const pos = [sd * (surfX(EAR.y, EAR.z) + 0.0068), EAR.y, EAR.z]
  const out = []
  for (const [g, w, sk] of [[disc, 0.7, 1], [bowl, 0.0, 0.75], [rim, 0.42, 1], [curl, 0.32, 1]]) {
    // egg-shaped, broad end up (sheet): wider at the top, narrowing to the lobe, centre of mass raised
    const P = g.attributes.position
    for (let i = 0; i < P.count; i++) { const y = P.getY(i), u = Math.max(-1, Math.min(1, y / ry)); P.setZ(i, P.getZ(i) * (1 + 0.24 * u)); P.setY(i, y + 0.0012 * (1 - u * u)) }
    g.rotateZ(-0.27) // the top flares out from the head, the lobe tucks in (the sheet's ears stand up, they don't droop)
    if (sd < 0) { g.scale(-1, 1, 1); const I = g.index.array; for (let i = 0; i < I.length; i += 3) { const t = I[i + 1]; I[i + 1] = I[i + 2]; I[i + 2] = t } } // left ear: mirrored
    g.rotateX(-0.10) // stands nearly upright, the top a touch back (sheet side view)
    g.rotateY(-sd * EAR_TILT)
    g.translate(...pos); g.deleteAttribute('uv'); g.computeVertexNormals()
    g.setAttribute('aSkin', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count).fill(sk), 1))
    out.push([g, w]) }
  return out
}

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
  // pass 8 (KT: shorter, cuter): a short plump arch over the eye, round at both ends, no long droop
  for (const sd of [-1, 1]) for (let i = 0; i < 6; i++) { const t = i / 5
    const x = 0.0175 + 0.0185 * t, y = 0.0064 + 0.0048 * Math.sin(Math.PI * t) - 0.0010 * t
    const r = 0.0052 + 0.0012 * Math.sin(Math.PI * t), slope = Math.cos(Math.PI * t) * 0.6
    parts.push(onFace(ballS, sd * x, y, -0.0004 - 0.0004 * t, [r * 1.5, r, r * 0.95], [0, 0, sd * slope])) }
  const ink = parts.map((_, k) => (k < nKnot ? 1 : 0.38)) // ink weight per piece: face pieces take a fine line
  const add = (g, w) => { parts.push(g); ink.push(w) }
  add(mustacheGeo(), 0.32)
  // round nose (skin)
  add(onFace(ball, 0, -0.0284, 0.0042, [0.0114, 0.0080, 0.0094], [0, 0, 0], 1), 0.55)
  for (const sd of [-1, 1]) for (const [g, w] of earParts(sd)) add(g, w)
  for (let k = 0; k < parts.length; k++) {
    tagAW(parts[k], () => (k < nKnot ? [2, 0.3] : [3, 0]))
    parts[k].setAttribute('aInk', new THREE.Float32BufferAttribute(new Float32Array(parts[k].attributes.position.count).fill(ink[k]), 1))
  }
  return mergeHair(parts)
}
const HAIR_GEO = ishiHair()
const hairMat = makeHairMat(SKIN, HAIR_C, HAIR_BAND, ISHI_HAIR_OFF, [0.80, 0.80, 0.85]) // white hair: a light cool-grey shadow (the sheet), not the warm brown meant for dark hair
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
  const sh = new THREE.Shape(), n = Math.max(18, Math.round(t * 12))
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
    tubeBetween(sh, elbow, 0.0215, 0.0215, HAORI),
    ballAt(elbow, 0.0216, HAORI),
    tubeBetween(elbow, wrist, 0.0222, 0.0300, HAORI, 10),
  ]
  // sleeve mouth: a dark rim so the opening reads, and the hanging bag of the sleeve under the forearm
  const W = new THREE.Vector3(...wrist), E = new THREE.Vector3(...elbow), d = W.clone().sub(E).normalize()
  const rim = new THREE.TorusGeometry(0.0287, 0.0026, 6, 16)
  rim.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), d)); rim.translate(...wrist)
  parts.push(paint(rim, HAORI_D))
  const inner = new THREE.CircleGeometry(0.0283, 14)
  inner.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), d)); inner.translate(W.x - d.x * 0.001, W.y - d.y * 0.001, W.z - d.z * 0.001)
  parts.push(paint(inner, '#171c28'))
  const bag = E.clone().lerp(W, 0.62); bag.y -= 0.012
  parts.push(ballAt(bag.toArray(), 0.023, HAORI, [0.9, 1.3, 1.05]))
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
  const sole = new THREE.CylinderGeometry(1, 1, 0.0072, 20); sole.scale(fr.x * 1.14, 1, fr.z * 1.12); sole.translate(0, soleTop - 0.0036, fz + 0.001)
  parts.push(paint(sole, SOLE))
  for (const [dz, w] of [[0.011, 0.0115], [-0.007, 0.0100]]) { // two wide chunky bands (sheet), w = band width
    // the foot's cross-section at this point: the strap arches from the sole up over the top of the foot
    const q = Math.sqrt(Math.max(0.15, 1 - (dz / fr.z) ** 2)), rx = fr.x * q * 1.08, ry = (fy - soleTop + fr.y * q) * 1.05
    const s = new THREE.TorusGeometry(1, 0.26, 8, 18, Math.PI); s.scale(rx, ry, w / 0.52); s.translate(0, soleTop - 0.001, fz + dz)
    parts.push(paint(s, STRAP))
  }
  return merged(parts)
}


// ---- collars (sheet): the haori's wide collar band (eri) runs up one front edge, stands round the back of the neck
// and runs down the other edge; inside it the cream robe's collar crosses left over right into a V under the chin.
// Swept bands laid on the baked body surface (unit space, found with the body SDF), merged into one mesh + one ink hull.
const _q = new THREE.Vector3(), _g = new THREE.Vector3()
function rayToBody(S, from, dir) { // march from outside along dir to the surface; returns [point, outward normal]
  const p = from.clone(); for (let i = 0; i < 400 && sdf(S, p) > 0; i++) p.addScaledVector(dir, 0.0006)
  const e = 0.0006, n = new THREE.Vector3(sdf(S, _q.copy(p).setX(p.x + e)) - sdf(S, _q.copy(p).setX(p.x - e)), sdf(S, _q.copy(p).setY(p.y + e)) - sdf(S, _q.copy(p).setY(p.y - e)), sdf(S, _q.copy(p).setZ(p.z + e)) - sdf(S, _q.copy(p).setZ(p.z - e))).normalize()
  return [p, n]
}
// a band of width w (across the path, in the surface) and thickness th (off the surface), lifted `lift` off it
function sweepBand(path, w, th, lift, hex, stand = null) { // w: a width, or one per point
  const pos = [], idx = [], n = path.length
  for (let i = 0; i < n; i++) {
    const [p, N] = path[i], T = path[Math.min(n - 1, i + 1)][0].clone().sub(path[Math.max(0, i - 1)][0]).normalize()
    let W = new THREE.Vector3().crossVectors(T, N).normalize(); if (stand && stand[i]) W.lerp(new THREE.Vector3(0, 1, 0), stand[i]).normalize()
    const N2 = new THREE.Vector3().crossVectors(W, T).normalize(), c = p.clone().addScaledVector(N2, lift + th / 2)
    const wi = Array.isArray(w) ? w[i] : w
    for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) pos.push(...c.clone().addScaledVector(W, a * wi / 2).addScaledVector(N2, b * th / 2).toArray())
  }
  for (let i = 0; i < n - 1; i++) for (let k = 0; k < 4; k++) { const a = i * 4 + k, b = i * 4 + (k + 1) % 4, c = a + 4, d = b + 4; idx.push(a, c, b, b, c, d) }
  for (const [o, f] of [[0, false], [(n - 1) * 4, true]]) f ? idx.push(o, o + 1, o + 2, o, o + 2, o + 3) : idx.push(o, o + 2, o + 1, o, o + 3, o + 2)
  let g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals()
  return paint(g, hex)
}
function collarsGeo(S, chestY) {
  const nY = S.neckY, nc = S.neck[0], rn = S.neck[2], hemY = (S.hipY + S.knY) * 0.5, parts = []
  const front = (x, y) => rayToBody(S, new THREE.Vector3(x, y, 0.2), new THREE.Vector3(0, 0, -1))
  const round = (a, y, r) => { const d = new THREE.Vector3(Math.sin(a), 0, Math.cos(a)); return rayToBody(S, new THREE.Vector3(nc.x, y, nc.z).addScaledVector(d, 0.12), d.clone().negate()) }
  const edge = (y) => 0.014 + (nY - y) * 0.18 // the painter's haori opening edge
  // haori eri: right front edge (hem -> neck), round the back of the neck, left front edge (neck -> hem)
  const eri = [], stand = [], ew = []
  const sh = haoriShell(S)
  const edgeAt = (sd, y) => { // along the shell's opening edge, just inside it
    const r = sh.at(y), a = sd * (r.a + 0.05); return [new THREE.Vector3(Math.sin(a) * r.rx, y, r.zc + Math.cos(a) * r.rz), new THREE.Vector3(Math.sin(a) / r.rx, 0, Math.cos(a) / r.rz).normalize()] } // on the flared shell, along its edge
  for (let i = 0; i <= 16; i++) { const y = hemY + (nY - 0.010 - hemY) * i / 16; eri.push(edgeAt(1, y)); stand.push(0); ew.push(0.0105) }
  const A0 = 0.62
  for (let i = 0; i <= 18; i++) { const a = A0 + (2 * Math.PI - 2 * A0) * i / 18, up = 0.5 - 0.5 * Math.cos(a); { const [p, N] = round(a, nY - 0.002 + 0.012 * up, rn); eri.push([p.clone().addScaledVector(N, 0.010), N]) } stand.push(0.85); ew.push(0.0105 + 0.0075 * up) } // stands taller round the back
  for (let i = 16; i >= 0; i--) { const y = hemY + (nY - 0.010 - hemY) * i / 16; eri.push(edgeAt(-1, y)); stand.push(0); ew.push(0.0105) }
  parts.push(sweepBand(eri, ew, 0.0030, 0.0004, HAORI_D, stand))
  // robe collar: from the side of the neck round to the front, then down to cross into a V (left over right)
  for (const sd of [1, -1]) {
    const path = [], st = []
    for (let i = 0; i <= 8; i++) { const a = sd * (1.7 - 1.25 * i / 8); path.push(round(a, nY + 0.002 - 0.004 * i / 8, rn)); st.push(0.7 * (1 - i / 8)) }
    const [p0] = path[path.length - 1]
    for (let i = 1; i <= 8; i++) { const t = i / 8, x = p0.x + (-sd * 0.008 - p0.x) * t, y = p0.y + (nY - 0.036 - p0.y) * t; path.push(front(x, y)); st.push(0) }
    parts.push(sweepBand(path, 0.0085, 0.0022, sd > 0 ? 0.0012 : 0.0026, sd > 0 ? ROBE_D : ROBE))
  }
  const g = mergeGeometries(parts); g.translate(0, -chestY, 0); g.computeVertexNormals(); return g
}


// ---- the loose clothes (sheet): a boxy haori that flares from under the arms to mid-thigh, open at the front; a tall
// wrapped sash with a knot; wide trousers to mid-calf. Built in unit space against the measured body, one mesh + ink.
function bodyRing(S, y) { // the body's cross-section at height y: half-width rx, front/back -> centre zc and half-depth rz
  const [px] = rayToBody(S, new THREE.Vector3(0.25, y, S.belly[0].z), new THREE.Vector3(-1, 0, 0))
  const [pf] = rayToBody(S, new THREE.Vector3(0, y, 0.25), new THREE.Vector3(0, 0, -1)), [pb] = rayToBody(S, new THREE.Vector3(0, y, -0.25), new THREE.Vector3(0, 0, 1))
  return { rx: px.x, zc: (pf.z + pb.z) / 2, rz: (pf.z - pb.z) / 2 }
}
let SHELL = null
const haoriEdge = (S, y) => 0.014 + (S.neckY - y) * 0.18 + 0.0045 // the opening edge (the painter's lapel line), where the eri runs
function haoriShell(S) { // an oversized haori: from the neck over the shoulders, standing well off the body, flaring to mid-thigh
  if (SHELL) return SHELL
  const nY = S.neckY, rn = S.neck[2], nz = S.neck[0].z, yTop = nY - 0.006, yS = S.shY, y1 = (S.hipY + S.knY) * 0.5, rows = []
  const ring = (y, t) => { const b = bodyRing(S, y), off = 0.012 + 0.024 * t ** 1.3; return { y, rx: b.rx + off, rz: b.rz + off * 0.85, zc: b.zc } }
  const sh = ring(yS - 0.004, 0)
  // over the shoulders: from a collar round the neck out to the shoulder line, a soft round slope
  for (let i = 0; i <= 5; i++) { const u = i / 5, e = Math.sin(u * Math.PI / 2), y = yTop + (yS - 0.004 - yTop) * u
    rows.push({ y, rx: rn + 0.013 + (sh.rx - rn - 0.013) * e, rz: rn + 0.011 + (sh.rz - rn - 0.011) * e, zc: nz + (sh.zc - nz) * e }) }
  let prev = sh
  for (let i = 1; i <= 14; i++) { const t = i / 14, y = yS - 0.004 + (y1 - yS + 0.004) * t, r = ring(y, t)
    r.rx = Math.max(r.rx, prev.rx); r.rz = Math.max(r.rz, prev.rz * 0.985); prev = r; rows.push(r) }
  for (const r of rows) r.a = Math.asin(Math.min(0.92, haoriEdge(S, r.y) / r.rx)) // the opening follows the lapel line
  const n = rows.length - 1
  const at = (y) => { let i = 0; while (i < n - 1 && rows[i + 1].y > y) i++; const a = rows[i], b = rows[i + 1], u = Math.max(0, Math.min(1, (y - a.y) / (b.y - a.y)))
    return { rx: a.rx + (b.rx - a.rx) * u, rz: a.rz + (b.rz - a.rz) * u, zc: a.zc + (b.zc - a.zc) * u, a: a.a + (b.a - a.a) * u } }
  SHELL = { y0: yTop, y1, rows, at }; return SHELL
}
// a thick open shell from angle a0 to a1 (0 = straight ahead) over the given rows: outer, inner, top, hem and the two edges
function shellGeo(rows, th, hex, hexIn) { // each row opens from its own angle r.a round the back to -r.a
  const NA = 40, pos = [], col = [], idx = [], C = new THREE.Color(hex), Ci = new THREE.Color(hexIn)
  const v = (r, a, inset) => [Math.sin(a) * (r.rx - inset), r.y, r.zc + Math.cos(a) * (r.rz - inset)]
  const grid = (inset, c) => { const o = pos.length / 3; for (const r of rows) for (let j = 0; j <= NA; j++) { pos.push(...v(r, r.a + (2 * Math.PI - 2 * r.a) * j / NA, inset)); col.push(c.r, c.g, c.b) } return o }
  const O = grid(0, C), I = grid(th, Ci), W = NA + 1, R = rows.length
  for (let i = 0; i < R - 1; i++) for (let j = 0; j < NA; j++) { const a = i * W + j, b = a + 1, c = a + W, d = c + 1
    idx.push(O + a, O + c, O + b, O + b, O + c, O + d); idx.push(I + a, I + b, I + c, I + b, I + d, I + c) }
  for (let j = 0; j < NA; j++) { const t = j, b = (R - 1) * W + j
    idx.push(O + t, O + t + 1, I + t, O + t + 1, I + t + 1, I + t); idx.push(O + b, I + b, O + b + 1, O + b + 1, I + b, I + b + 1) }
  for (let i = 0; i < R - 1; i++) { const e0 = i * W, e1 = i * W + NA
    idx.push(O + e0, I + e0, O + e0 + W, O + e0 + W, I + e0, I + e0 + W); idx.push(O + e1, O + e1 + W, I + e1, O + e1 + W, I + e1 + W, I + e1) }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx)
  g.computeVertexNormals(); return g.toNonIndexed()
}
function clothesGeo(S, hipsY) {
  const parts = [], sh = haoriShell(S)
  // haori: the flared lower body, open at the front (the eri runs down its edges), a darker lining inside
  parts.push(shellGeo(sh.rows, 0.0030, HAORI, '#1c2230'))
  // sash: a tall band all the way round at the waist (under the haori, showing in the opening), two dark stripes, a knot
  const H = 0.040, sy = S.hipY + 0.004 + H / 2, b = bodyRing(S, sy) // tall, sitting right on the trousers
  const band = (dy, h, out, hex) => { const g = frontBand(b.rx + out, b.rz + out, b.zc, Math.PI, h, 0.0028, hex); g.translate(0, sy + dy, 0); return g }
  parts.push(band(0, H, 0.0018, SASH), band(H * 0.18, 0.0024, 0.0044, SASH_D), band(-H * 0.24, 0.0024, 0.0044, SASH_D))
  const z = b.zc + b.rz + 0.006
  // a soft wrapped knot: a flat rounded middle with a loop each side, one short end hanging (sheet)
  parts.push(ballAt([0, sy + 0.002, z - 0.001], 0.0072, SASH, [1.05, 1.0, 0.5]))
  for (const sd of [-1, 1]) parts.push(ballAt([sd * 0.0095, sy + 0.003, z - 0.0025], 0.0062, SASH, [1.35, 0.75, 0.42]))
  const tail = new THREE.BoxGeometry(0.0095, 0.016, 0.0035); tail.translate(0.001, sy - 0.0105, z - 0.003); parts.push(paint(tail, SASH))
  // wide trousers from the hip to mid-calf, a darker hem band
  const hem = S.anY + (S.knY - S.anY) * 0.35
  // the seat: joins the two legs over the hips and crotch, so no body shows between them under the sash
  { const r = bodyRing(S, S.hipY); parts.push(ballAt([0, S.hipY - 0.004, r.zc], 1, TROUSER, [r.rx + 0.006, 0.034, r.rz + 0.005])) }
  for (const sd of [-1, 1]) { const hp = sd < 0 ? S.hpL : S.hpR, an = sd < 0 ? S.anL : S.anR, top = S.hipY + 0.006, len = top - hem
    const leg = new THREE.CylinderGeometry(S.lr[0] * 1.32, S.lr[1] * 1.55, len, 18); leg.translate((hp.x + an.x) / 2 + sd * 0.003, hem + len / 2, (hp.z + an.z) / 2 + 0.002); parts.push(paint(leg, TROUSER))
    const cuff = new THREE.CylinderGeometry(S.lr[1] * 1.6, S.lr[1] * 1.62, 0.006, 18); cuff.translate((hp.x + an.x) / 2 + sd * 0.003, hem + 0.003, (hp.z + an.z) / 2 + 0.002); parts.push(paint(cuff, '#3b3129')) }
  const g = mergeGeometries(parts.map(p => p.index ? p.toNonIndexed() : p).map(p => { for (const k of Object.keys(p.attributes)) if (!['position', 'normal', 'color'].includes(k)) p.deleteAttribute(k); return p }))
  g.translate(0, -hipsY, 0); return g
}

const collarInk = (() => { const m = mkOutline(false); m.uniforms.uT.value = 0.0026; return m })()
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
  const collars = collarsGeo(S, chestY); add(chest, collars); add(chest, collars, [0, 0, 0], collarInk)
  // sash round the belly, across the opening
  const clothes = clothesGeo(S, hipsY); add(hips, clothes, [0, 0, 0], plainMat); add(hips, clothes, [0, 0, 0], collarInk)
  // sandals on the bare feet
  for (const k2 of ['L', 'R']) { const ft = root.getObjectByName('ft' + k2); if (ft) add(ft, sandalGeo(S, k2), [0, 0, 0], plainMat) }
  if (LIFE_OFF) {
    // his right (viewer's left): arm hangs a little forward, hand grips the cane at hip height; cane stands by the foot
    // his left (viewer's right): forearm bent up, hand holds the pipe in front of the belly
    const shY = S.shY - chestY - 0.004
    for (const sd of [-1, 1]) {
      const sh = [sd * (Math.abs(S.shL.x) + 0.010), shY + 0.002, S.shL.z + 0.004] // out on the oversized shoulders
      const cane = sd < 0
      const hand = cane ? [-0.096, -0.050, 0.042] : [0.056, -0.014, chestZ + 0.026]
      const elbow = cane ? [-0.098, -0.010, 0.006] : [0.100, -0.026, 0.014]
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

const S0 = spec(BODY)
// the jaw (and chin) dips below the neck line: keep it skin, not haori or robe (the painter's skinEll, a little inflated)
const JAW_ELL = (() => { const c = S0.ck[0], r = S0.ck[2]; return [0, c.y - r.y * 0.1, c.z, r.x * 1.0, r.y * 1.2, r.z * 1.1] })()

export const ISHI = {
  name: 'grandpa', age: 'elder', motion: ISHI_MOTION,
  body: BODY,
  hair: { style: 'chibi', c: HAIR_C },
  face: {},
  // openJacket painter: acc = navy haori to the upper thigh, top = cream robe in the opening, bottom = brown trousers
  // to mid-calf (bare: skin below legHem), shoe = skin (bare feet; 3D sandals sit under them)
  outfit: { type: 'openJacket', hemY: 'thigh', skin: SKIN, top: ROBE, acc: HAORI, acc2: HAORI, bottom: TROUSER, shoe: SKIN, shoeY: 0.0,
    skinEll: JAW_ELL, bare: true, legHem: S0.anY + (S0.knY - S0.anY) * 0.35, long: true, sleeve: 'none' },
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
