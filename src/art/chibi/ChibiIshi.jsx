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
import { envelope, triggerBlink } from './lifeCore.js'
import { TALK } from '../../talk/state.js'
import { T } from '../../common.jsx'
import { ishiGesture } from './ishiTalk.js'
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
const BODY = { H: 0.90, head: 1.46, leg: 0.90, torso: 1.12, arm: 0.92, girth: 1.26, shoulder: 1.10, chestW: 1.14, bellyZ: 1.0, shX: 1.20, armA: 0.50,
  armR: [0.8, 0.75, 0.7], legR: 1.30, legX: 1.08, foot: 1.20, bootW: 1.20, bootH: 1.00, bootL: 1.02, hand: 1.15,
  headS: HEAD_S, cranium: CRANIUM, chin: CHIN, lumps: [OCCIPUT], cheek: JAW, midface: MIDFACE, midfaceFade: MID_FADE, hunch: 0.12,
  anY: 0.040, footY: 0.020, soleY: 0.0068, bald: true, headUp: 0.012, armStrict: true }
const TOP = Math.max(0.0499 * HEAD_S[1], CRANIUM[0] + CRANIUM[3]) // skull top in the head frame
const Face = makeFace({ kind: 'ishi', defaultSquint: 0.04, blush: 0.62, shape: HEAD, fy1: 0.034, fy0: -0.060, eyeS: 1.12 }) // the decal reaches up the forehead for the wrinkles

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
// pass 9 (KT: bigger, wider, covering more of the mouth): the same shape scaled out from under the nose
  .map(([x, y]) => [x * 1.22, y > -0.0336 ? y : -0.0336 + (y + 0.0336) * 1.32])
function mustacheGeo() {
  // one closed puff over the whole outline (both halves): the outline is triangulated, subdivided until fine, and each
  // point is raised off the face by its distance from the edge (a rounded rim and a soft dome, thickest under the nose).
  // The back is the same mesh just inside the face; a wall joins them at the outline. It follows the curve of the face
  // everywhere, and there is no centre point for the shape to fold round (the old ring build folded once the outline
  // got scalloped and showed dark lines).
  const outline = [...MUS_R, ...MUS_R.slice(1, -1).reverse().map(([x, y]) => [-x, y])]
  const pts = outline.map(([x, y]) => new THREE.Vector2(x, y))
  let tris = THREE.ShapeUtils.triangulateShape(pts, []).map(t => t.slice())
  let V = pts.map(p => [p.x, p.y])
  const mid = new Map(), midOf = (a, b) => { const k = a < b ? a + ',' + b : b + ',' + a; if (!mid.has(k)) { mid.set(k, V.length); V.push([(V[a][0] + V[b][0]) / 2, (V[a][1] + V[b][1]) / 2]) } return mid.get(k) }
  for (let it = 0; it < 4; it++) { const nt = []; mid.clear()
    for (const [a, b, c] of tris) { const ab = midOf(a, b), bc = midOf(b, c), ca = midOf(c, a); nt.push([a, ab, ca], [ab, b, bc], [ca, bc, c], [ab, bc, ca]) }
    tris = nt }
  const segs = outline.map((p, i) => [p, outline[(i + 1) % outline.length]])
  const dEdge = (x, y) => { let d = 1; for (const [[ax, ay], [bx, by]] of segs) { const dx = bx - ax, dy = by - ay, t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy))); d = Math.min(d, Math.hypot(x - ax - dx * t, y - ay - dy * t)) } return d }
  const N = V.length, pos = [], idx = [], grey = []
  for (const front of [true, false]) for (let i = 0; i < N; i++) { const [x, y] = V[i], d = dEdge(x, y), rim = d < 1e-5 ? 0 : 1 - (1 - Math.min(1, d / 0.0045)) ** 2
    const H = 0.0082 - 0.0048 * Math.min(1, Math.abs(x) / 0.033) - 0.0010 * Math.max(0, Math.min(1, (-0.045 - y) / 0.008))
    pos.push(x, y, front ? surfZ(x, y) - 0.0006 + H * rim : surfZ(x, y) - 0.0028 + 0.0020 * (1 - rim))
    grey.push(0.36 * (1 - Math.min(1, d / 0.0016)) ** 1.5) } // a soft grey edge (hair shader: aSkin 0.1..0.38 darkens), the sheet's outline
  for (const [a, b, c] of tris) { idx.push(a, b, c); idx.push(N + a, N + c, N + b) }
  // the wall round the outline: walk the boundary edges of the subdivided mesh (edges used by one triangle)
  const use = new Map(); for (const [a, b, c] of tris) for (const [u, v] of [[a, b], [b, c], [c, a]]) { const k = u < v ? u + ',' + v : v + ',' + u; use.set(k, (use.get(k) || 0) + 1) }
  for (const [a, b, c] of tris) for (const [u, v] of [[a, b], [b, c], [c, a]]) { const k = u < v ? u + ',' + v : v + ',' + u; if (use.get(k) === 1) idx.push(u, N + u, v, v, N + u, N + v) }
  let g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals()
  // the triangulation's winding depends on the outline's direction: make the front face point out of the face
  { let nz = 0; const P = g.attributes.position; for (let i = 0; i < 6 * tris.length; i += 6) { const [a, b, c] = [idx[i], idx[i + 1], idx[i + 2]] // front triangles only (front and back alternate)
      nz += (P.getX(b) - P.getX(a)) * (P.getY(c) - P.getY(a)) - (P.getY(b) - P.getY(a)) * (P.getX(c) - P.getX(a)) }
    if (nz < 0) { const I = g.index.array; for (let i = 0; i < I.length; i += 3) { const t = I[i + 1]; I[i + 1] = I[i + 2]; I[i + 2] = t } g.computeVertexNormals() } }
  g.setAttribute('aSkin', new THREE.Float32BufferAttribute(grey, 1))
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
  const nBrow = parts.length
  const ink = parts.map((_, k) => (k < nKnot ? 1 : 0.38)) // ink weight per piece: face pieces take a fine line
  const add = (g, w) => { parts.push(g); ink.push(w) }
  add(mustacheGeo(), 0.3) // a fine hull for the silhouette; the soft grey rim carries the outline on the face
  // round nose (skin)
  add(onFace(ball, 0, -0.0284, 0.0042, [0.0114, 0.0080, 0.0094], [0, 0, 0], 1), 0.55)
  for (const sd of [-1, 1]) for (const [g, w] of earParts(sd)) add(g, w)
  for (let k = 0; k < parts.length; k++) {
    tagAW(parts[k], () => (k < nKnot ? [2, 0.3] : k < nBrow ? [3, 1] : k === nBrow ? [0, 1] : [3, 0])) // brows: group 3, mustache: group 0 (both posed by his life layer)
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
// wide trouser legs in two pieces per leg, in bone space: hip -> knee on the thigh bone, knee -> the hem (mid-calf, a
// darker cuff) on the shin bone, overlapping at the knee so the bend never opens a gap
function trouserLegGeos(S, k) {
  const sd = k === 'L' ? -1 : 1, hp = S['hp' + k], kn = S['kn' + k], an = S['an' + k], hem = S.anY + (S.knY - S.anY) * 0.35, ox = sd * 0.003
  const r0 = S.lr[0] * 1.32, rk = S.lr[1] * 1.45, r1 = S.lr[1] * 1.55
  const thigh = merged([tubeBetween([ox, S.hipY + 0.006 - hp.y, 0.002], [kn.x - hp.x + ox, kn.y - hp.y - 0.004, kn.z - hp.z + 0.002], r0, rk, TROUSER, 18), ballAt([kn.x - hp.x + ox, kn.y - hp.y, kn.z - hp.z + 0.002], rk * 0.98, TROUSER)])
  const at = (y) => { const t = (kn.y - y) / (kn.y - an.y); return [(an.x - kn.x) * t + ox, y - kn.y, (an.z - kn.z) * t + 0.002] }
  const cuff = new THREE.CylinderGeometry(r1 * 1.03, r1 * 1.05, 0.006, 18); cuff.translate(...at(hem + 0.003))
  const shin = merged([tubeBetween(at(kn.y + 0.004), at(hem), rk, r1, TROUSER, 18), paint(cuff, '#3b3129')])
  return [thigh, shin]
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
  // (the trouser legs themselves ride the thigh and shin bones: trouserLegGeos, so they bend when he sits)
  const g = mergeGeometries(parts.map(p => p.index ? p.toNonIndexed() : p).map(p => { for (const k of Object.keys(p.attributes)) if (!['position', 'normal', 'color'].includes(k)) p.deleteAttribute(k); return p }))
  g.translate(0, -hipsY, 0); return g
}

// ---- arms on the rig: his rest pose, the sleeves, smoke ----
// rest pose (bone eulers): his right (L bones) hangs a little forward with the fist on the cane; his left (R) is bent up,
// the pipe in his fist in front of the belly. Blended in under any game action, and the life layer adds on top.
// his rest pose (bone eulers [upper arm], [forearm]); the arms hang from the rig's shoulders, down and a little out
const REST = { L: [[-0.22, 0, 0.02], [-0.42, 0, 0]], R: [[-0.22, 0, 0.10], [-0.92, -0.62, 0]] }
function restArms(B, st, w) {
  for (const k of ['L', 'R']) { const [u, f] = REST[k], up = B['up' + k], fo = B['fo' + k]
    up.rotation.x += (u[0] - up.rotation.x) * w; up.rotation.y += (u[1] - up.rotation.y) * w; up.rotation.z += (u[2] - up.rotation.z) * w
    fo.rotation.x += (f[0] - fo.rotation.x) * w; fo.rotation.y += (f[1] - fo.rotation.y) * w; fo.rotation.z += (f[2] - fo.rotation.z) * w }
  const m = st.move || 0; B.upL.rotation.x += Math.sin(st.phase || 0) * 0.16 * m * w; B.foL.rotation.x -= 0.1 * m * w // the cane arm steps along with him
}
// the arm in its rest pose, unparented (the body's bones are unrotated at rest): to place props and sleeves in bone space
function restRigAt(S, k, r) { const up = new THREE.Object3D(), fo = new THREE.Object3D(); up.position.copy(S['sh' + k]); fo.position.copy(S['el' + k]).sub(S['sh' + k]); up.add(fo)
  up.rotation.set(...r[0]); fo.rotation.set(...r[1]); up.updateMatrixWorld(true); return fo }
const restRig = (S, k) => restRigAt(S, k, REST[k])
// the pipe in the right fist (bone frame of the forearm at rest): where its stem tip ends up, and the arm angles that put
// that tip at his mouth (solved once, by a small search, in the body's rest frame)
const PIPE_S = 1.45, PIPE_TIP = [-0.032, 0.012, 0.004]
let DRAW = null
function pipeAt(S) { const fo = restRig(S, 'R'), hand = fo.localToWorld(S.hdR.clone().sub(S.elR)); return { fo, at: hand.add(new THREE.Vector3(-0.003, 0.007, 0.006)) } }
function solveDraw(S) {
  // his arms are short (a chibi): he meets the pipe halfway, nodding a little while the fist tips the stem up to his lips.
  // Unknowns: upper arm (x, z), forearm (x <= 0: the elbow bends forward only, y), head nod hp, pipe tip in the fist pr.
  const { fo, at } = pipeAt(S), atFo = fo.worldToLocal(at.clone()), tipFo = fo.worldToLocal(at.clone().add(new THREE.Vector3(...PIPE_TIP).multiplyScalar(PIPE_S)))
  const kk = 1.17 * (S.b.head ?? 1), my = -0.050, mouth0 = S.headC.clone().add(new THREE.Vector3(0.004, my * kk, (surfZ(0, my) + 0.004) * kk))
  const pivot = new THREE.Vector3(0, S.shY + 0.045, S.neck[1].z * 0.7), X = new THREE.Vector3(1, 0, 0)
  const lim = [[-2.6, 0.4], [-1.4, 0.5], [-2.5, 0], [-1.3, 1.3], [0, 0.32], [-1.4, 1.4]], pose = (q) => [[q[0], 0, q[1]], [q[2], q[3], 0]]
  const err = (q) => { const tip = tipFo.clone().sub(atFo).applyAxisAngle(X, q[5]).add(atFo), w = restRigAt(S, 'R', pose(q)).localToWorld(tip)
    const mouth = mouth0.clone().sub(pivot).applyAxisAngle(X, q[4]).add(pivot); return w.distanceTo(mouth) + 0.004 * q[4] }
  const q = [-1.2, -0.3, -1.2, -0.4, 0.1, 0.4]; let e = err(q)
  for (let st = 0.5; st > 0.002; st *= 0.6) for (let it = 0; it < 8; it++) for (let i = 0; i < 6; i++) for (const sg of [1, -1]) { const t = q.slice(); t[i] = Math.min(lim[i][1], Math.max(lim[i][0], t[i] + sg * st)); const e2 = err(t); if (e2 < e) { e = e2; q[i] = t[i] } }
  DRAW = pose(q); DRAW.nod = q[4]; DRAW.tip = q[5]; DRAW.err = e - 0.004 * q[4]
}
// a wide haori sleeve in two pieces: the upper arm (on the upper-arm bone) and the forearm opening to a broad mouth
// (on the forearm bone), with a dark rim and the sleeve's hanging bag. The rig's own slim arm and mitten sit inside.
function sleeveGeos(S, k) {
  const e = S['el' + k].clone().sub(S['sh' + k]), w = S['wr' + k].clone().sub(S['el' + k]).multiplyScalar(0.86), d = w.clone().normalize()
  const upper = merged([ballAt([0, 0, 0], 0.0235, HAORI, [1.05, 0.95, 1.0]), tubeBetween([0, 0, 0], e.toArray(), 0.0232, 0.0236, HAORI)])
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), d)
  const rim = new THREE.TorusGeometry(0.0300, 0.0026, 6, 16); rim.applyQuaternion(q); rim.translate(w.x, w.y, w.z)
  const inner = new THREE.CircleGeometry(0.0296, 14); inner.applyQuaternion(q); inner.translate(w.x - d.x * 0.001, w.y - d.y * 0.001, w.z - d.z * 0.001)
  const down = new THREE.Vector3(0, -1, 0).applyQuaternion(restRig(S, k).getWorldQuaternion(new THREE.Quaternion()).invert()) // world down, in the forearm's frame at rest
  const bag = w.clone().multiplyScalar(0.6).addScaledVector(down, 0.009)
  const fore = merged([ballAt([0, 0, 0], 0.0236, HAORI), tubeBetween([0, 0, 0], w.toArray(), 0.0236, 0.0310, HAORI, 12), paint(rim, HAORI_D), paint(inner, '#171c28'), ballAt(bag.toArray(), 0.021, HAORI, [0.9, 1.3, 1.05])])
  return [upper, fore]
}
// smoke puffs: soft pale balls that drift up, swell and fade (one draw while any are alive)
function makeSmoke() {
  const N = 22, mesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshBasicMaterial({ color: '#efebe5', transparent: true, opacity: 0.88, depthWrite: false }), N)
  mesh.frustumCulled = false; mesh.visible = false; mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); mesh.renderOrder = 3
  const P = Array.from({ length: N }, () => ({ p: new THREE.Vector3(), v: new THREE.Vector3(), t: 9, life: 1, s: 0, ph: 0 })), M = new THREE.Matrix4()
  let head = 0
  return { mesh,
    emit(pos, vel, size, life) { const o = P[head]; head = (head + 1) % N; o.p.copy(pos); o.v.copy(vel); o.t = 0; o.life = life * (0.85 + Math.random() * 0.3); o.s = size * (0.8 + Math.random() * 0.4); o.ph = Math.random() * 6.3 },
    step(dt, up, side) { let alive = 0
      for (const o of P) { let r = 0
        if (o.t < o.life) { o.t += dt; const k = Math.min(1, o.t / o.life)
          o.v.multiplyScalar(Math.exp(-1.2 * dt)); o.p.addScaledVector(o.v, dt).addScaledVector(up, o.s * 3.2 * dt).addScaledVector(side, Math.sin(o.t * 2.4 + o.ph) * o.s * 1.6 * dt)
          r = o.s * (0.55 + 1.5 * k) * Math.sin(Math.min(1, k * 1.15) * Math.PI) ** 0.6; if (r > 0) alive++ }
        M.makeScale(r, r, r).setPosition(o.p); mesh.setMatrixAt(P.indexOf(o), M) }
      mesh.instanceMatrix.needsUpdate = true; mesh.visible = alive > 0 } }
}
const sst = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t) }
// ---- his own idle actions on top of the shared life layer (which times them: L.fid, L.fu) ----
// smoke: raise the pipe, a slow draw with the eyes closed, lower it, tip the head back a touch and let the smoke out
// laugh: a big, loud "ho ho ho": leans way back, belly bouncing, his free hand on his belly, eyes squeezed into ^ ^,
// the mustache lifting off a wide open mouth
function ishiActs(L, B, st, dt) {
  L.arc = 0; L.smoke = 0; L.exhale = 0; L.draw = 0; L.pipeTip = 0
  let lift = 0, brow = 0
  const FID = L.P.fidgets, idleOk = (st.move || 0) < 0.2
  if (L.fid === 'smoke' && idleOk) { const d = FID.smoke, k = L.fu / d, e = envelope(L.fu, d, 0.6)
    const up = sst(0.03, 0.2, k) * (1 - sst(0.5, 0.64, k)), draw = sst(0.22, 0.28, k) * (1 - sst(0.46, 0.52, k)), ex = sst(0.6, 0.66, k) * (1 - sst(0.88, 0.98, k))
    if (DRAW) { const [u, f] = DRAW, a = up * e // the pipe up to his mouth (solved pose), and back down
      B.upR.rotation.x += (u[0] - B.upR.rotation.x) * a; B.upR.rotation.z += (u[2] - B.upR.rotation.z) * a; B.foR.rotation.x += (f[0] - B.foR.rotation.x) * a; B.foR.rotation.y += (f[1] - B.foR.rotation.y) * a
      B.head.rotation.x += DRAW.nod * a; L.pipeTip = DRAW.tip * a }
    B.head.rotation.x -= 0.16 * ex; B.chest.rotation.x -= 0.04 * ex
    B.chest.scale.y *= 1 + 0.035 * draw - 0.025 * ex; B.chest.scale.x *= 1 + 0.015 * draw
    L.open = Math.min(L.open, 1 - 0.92 * draw); L.squint = Math.max(L.squint, 0.55 * ex + 0.25 * e); brow = 0.0008 * ex
    L.smoke = e; L.draw = draw; L.exhale = ex }
  if (L.fid === 'laugh' && idleOk) { const d = FID.laugh, k = L.fu / d, e = envelope(L.fu, d, 0.32)
    const ho = Math.abs(Math.sin(L.fu * 9)) * sst(0.1, 0.22, k) * (1 - sst(0.78, 0.92, k)) * e
    B.root.rotation.x -= 0.09 * e; B.chest.rotation.x -= 0.26 * e; B.head.rotation.x -= 0.2 * e + 0.05 * ho
    B.chest.scale.y *= 1 + 0.04 * ho; B.chest.scale.x *= 1 + 0.015 * ho; B.root.position.y += 0.004 * ho
    B.upR.rotation.x -= 0.1 * e; B.upR.rotation.z -= 0.3 * e; B.foR.rotation.x -= 0.25 * e + 0.2 * ho // the free hand on his belly
    B.upL.rotation.z += 0.04 * e; B.foL.rotation.x -= 0.06 * e
    L.arc = sst(0.05, 0.4, e); L.mood = 'laugh'; L.blush = Math.max(L.blush, e); lift = 0.0010 * e + 0.0014 * ho; brow = 0.0024 * e }
  // nod: a slow "mm-hm", two or three soft nods with the eyes half closed, a little lean in
  if (L.fid === 'nod' && idleOk) { const d = FID.nod, k = L.fu / d, e = envelope(L.fu, d, 0.35), n = Math.sin(k * Math.PI * 3) ** 2 * e
    B.head.rotation.x += 0.05 * e + 0.13 * n; B.chest.rotation.x += 0.03 * e; B.root.position.y -= 0.0015 * n
    L.squint = Math.max(L.squint, 0.5 * e); L.open = Math.min(L.open, 1 - 0.35 * e); brow = 0.0006 * e }
  // ponder: "hmm...", strokes his mustache with the pipe hand (the pipe pose, short of the mouth), eyes up, head tilted
  if (L.fid === 'ponder' && idleOk) { const d = FID.ponder, k = L.fu / d, e = envelope(L.fu, d, 0.5), a = sst(0.05, 0.25, k) * (1 - sst(0.78, 0.95, k)) * e
    if (DRAW) { const [u, f] = DRAW, w = 0.82 * a; B.upR.rotation.x += (u[0] - B.upR.rotation.x) * w; B.upR.rotation.z += (u[2] - B.upR.rotation.z) * w; B.foR.rotation.x += (f[0] - B.foR.rotation.x) * w; B.foR.rotation.y += (f[1] - B.foR.rotation.y) * w }
    B.foR.rotation.z += Math.sin(L.fu * 4.2) * 0.16 * a; B.head.rotation.x -= 0.1 * e; B.head.rotation.z += 0.1 * e; B.chest.rotation.x -= 0.03 * e
    L.gy = 0.75 * e + L.gy * (1 - e); L.gx = 0.35 * e + L.gx * (1 - e); L.squint = Math.max(L.squint, 0.2 * e); brow = 0.0016 * e; lift = 0.0004 * Math.sin(L.fu * 4.2) * a
    if (L.fu - dt < d * 0.5 && L.fu >= d * 0.5) triggerBlink(L.blink) }
  // point: telling the story, he jabs the pipe toward you to make his point, leaning in, brows down
  if (L.fid === 'point' && idleOk) { const d = FID.point, k = L.fu / d, e = envelope(L.fu, d, 0.35), jab = Math.abs(Math.sin(L.fu * 6.5)) * sst(0.25, 0.35, k) * (1 - sst(0.75, 0.85, k)) * e
    // the arm reaches out in front (upper arm forward, the elbow opening), the stem aimed at you, jabbing on each beat
    B.upR.rotation.x -= 1.15 * e + 0.12 * jab; B.upR.rotation.z -= 0.25 * e; B.foR.rotation.x += 0.55 * e - 0.15 * jab; B.foR.rotation.y += 0.45 * e
    B.chest.rotation.y -= 0.2 * e; B.chest.rotation.x += 0.08 * e + 0.03 * jab; B.head.rotation.x += 0.06 * e + 0.05 * jab; B.head.rotation.y -= 0.08 * e; B.root.rotation.x += 0.03 * e
    L.pipeTip = -1.1 * e; L.squint = Math.max(L.squint, 0.35 * e); brow = -0.0012 * e }
  // thump: "Hmph!" lifts the cane and thumps it down twice, a little jolt each time, chin up, eyes shut
  // chuckle: a gift he loves: pats his belly with the pipe fist, shoulders shaking, eyes ^ ^, cheeks pink
  if (L.fid === 'chuckle' && idleOk) { const d = FID.chuckle, k = L.fu / d, e = envelope(L.fu, d, 0.3), pat = Math.max(0, Math.sin(L.fu * 11)) * sst(0.15, 0.25, k) * (1 - sst(0.8, 0.9, k)) * e, sh = Math.sin(L.fu * 15) * e
    B.upR.rotation.x += (-0.05 - B.upR.rotation.x) * e; B.upR.rotation.z += (0.05 - B.upR.rotation.z) * e; B.foR.rotation.x += (-1.35 - 0.2 * pat - B.foR.rotation.x) * e; B.foR.rotation.y += (-0.55 - B.foR.rotation.y) * e
    B.chest.rotation.x -= 0.08 * e; B.chest.scale.y *= 1 + 0.02 * Math.abs(sh); B.head.rotation.x -= 0.08 * e; B.head.rotation.z += 0.1 * e + 0.015 * sh; B.root.position.y += 0.0015 * Math.abs(sh)
    L.arc = sst(0.05, 0.35, e); L.mood = 'laugh'; L.blush = Math.max(L.blush, e); lift = 0.0008 * Math.abs(sh); brow = 0.0018 * e }
  if (L.fid === 'thump' && idleOk) { const d = FID.thump, k = L.fu / d, e = envelope(L.fu, d, 0.25), ph = Math.min(1, Math.max(0, (k - 0.15) / 0.6)) * 2
    const up = Math.sin(Math.PI * (ph % 1)) ** 2 * (ph < 2 ? 1 : 0) * e, since = ph >= 2 ? (k - 0.75) * 3 : ph % 1, hit = ph >= 1 ? Math.exp(-9 * since) * e : 0 // contacts at ph = 1 and 2
    B.upL.rotation.x -= 0.28 * up; B.foL.rotation.x -= 0.22 * up; B.chest.rotation.z -= 0.04 * up
    B.root.position.y -= 0.003 * hit; B.head.rotation.x -= 0.1 * e - 0.05 * hit; B.head.rotation.y += 0.15 * e; B.chest.rotation.x -= 0.03 * e
    L.open = Math.min(L.open, 1 - 0.9 * e); brow = -0.0016 * e }
  // ---- dozing: roll once per idle spell; standing he leans on his cane and nods off, seated his head sinks to his chest.
  // A slow deep breath, a droop that now and then catches itself. Talking to him snaps him awake with a start.
  const seated = st.act === 'sit' && (st.actW ?? 1) > 0.5, talking = !!(TALK.open && TALK.open.key === 'grandpa')
  L.dozeT = talking ? 0 : L.idle // idle time (fidgets do not reset it)
  if (L.dozeT < 1) L.dozeRoll = -1
  if (L.dozeT > L.P.dozeAfter && L.dozeRoll < 0) { const night = T.night > 0.6, pz = L.P.doze, p = seated ? (night ? pz.sitNight : pz.sitDay) : night ? pz.standNight : 0
    L.dozeRoll = (typeof window !== 'undefined' && window.__ishiDoze) || L.rnd() < p ? 1 : 0 }
  const was = L.doze || 0, dozeWant = L.dozeRoll === 1 && L.dozeT > L.P.dozeAfter && !talking
  L.doze = was + ((dozeWant ? 1 : 0) - was) * Math.min(1, dt * (dozeWant ? 0.5 : 6))
  if (was > 0.5 && !dozeWant && talking) { L.wakeU = 0; L.dozeRoll = 0 } // talked to: a start
  if (L.doze > 0.01) { const z = L.doze * L.doze * (3 - 2 * L.doze), tt = L.dozeT, cyc = (tt % 6.5) / 6.5, sink = sst(0, 0.85, cyc), cat = sst(0.85, 0.9, cyc) * (1 - sst(0.9, 1, cyc)), br = Math.sin(tt * 1.3)
    if (L.fid) { L.fid = null } L.fidN = 3
    B.head.rotation.x += (0.22 + 0.12 * sink - 0.18 * cat) * z; B.head.rotation.z += 0.06 * z; B.chest.rotation.x += (seated ? 0.12 : 0.07) * z; B.chest.scale.y *= 1 + 0.02 * br * z
    if (!seated) { B.root.rotation.x += 0.04 * z; B.upL.rotation.x -= 0.12 * z; B.foL.rotation.x -= 0.1 * z } // leans on the cane
    B.foR.rotation.x += 0.35 * z; B.upR.rotation.x += 0.08 * z // the pipe hand drops into his lap
    L.open = Math.min(L.open, 1 - z); L.mood = 'sleepy'; brow = -0.0006 * z; lift = 0.0005 * br * z }
  L.wakeU = (L.wakeU ?? 9) + dt; const wk = L.wakeU < 1.1 ? envelope(L.wakeU, 1.1, 0.06) : 0
  if (wk > 0) { const j = Math.exp(-L.wakeU * 6); B.head.rotation.x -= 0.14 * wk + 0.1 * j; B.chest.rotation.x -= 0.05 * wk; B.root.position.y += 0.004 * j; B.upR.rotation.z -= 0.15 * j
    L.mood = 'excited'; L.squint = 0; brow = 0.003 * wk; L.blush = Math.max(L.blush, 0.6 * wk) }
  // hair groups: 0 = the mustache (lifts when he laughs), 3 = the brows (raise); the knot (2) keeps the life layer's spring
  const OFF = L.hairOff; OFF[0] = 0; OFF[1] = lift; OFF[2] = lift * 0.35; OFF[9] = 0; OFF[10] = brow; OFF[11] = 0
}
// talking to him: each dialogue page he says starts the gesture that fits the line (ishiTalk.js). Studio: window.__ishiSay(line)
function startGesture(L, g) { L.fid = g; L.fu = 0; L.fidPrev = g; L.fidN = L.P.fidgetEvery[0] + 2; L.lastG = g }
function talkGestures(L, st) {
  const o = TALK.open, mine = o && o.key === 'grandpa' && TALK.lines && (!st.npcKey || st.npcKey === o.key)
  if (mine) { const line = TALK.lines.pages[TALK.page] || '', key = TALK.page + '|' + line
    if (key !== L.talkKey) { L.talkKey = key; startGesture(L, ishiGesture(line, L.lastG)) } }
  else L.talkKey = null
  if (typeof window !== 'undefined' && !window.__ishiSay && q.get('char') === 'ishi') window.__ishiSay = (line) => startGesture(L, ishiGesture(line, L.lastG))
}
const _w = new THREE.Vector3(), _u = new THREE.Vector3(), _sd = new THREE.Vector3(), _hq = new THREE.Quaternion(), _sc = new THREE.Vector3()
function smokeStep(L, st, dt) {
  const K = st.ishi; if (!K || !K.smoke || !L) return
  if (K.pipe) K.pipe.rotation.x = L.pipeTip || 0
  const sm = K.smoke; K.head?.getWorldQuaternion(_hq); _u.set(0, 1, 0); _sd.set(1, 0, 0)
  if (K.head) { K.head.parent.getWorldQuaternion(_hq); _u.set(0, 1, 0).applyQuaternion(_hq); _sd.set(1, 0, 0).applyQuaternion(_hq) }
  const ws = K.fo ? K.fo.getWorldScale(_sc).x : 1
  // the bowl smoulders: a thin wisp now and then, more while he draws on it
  if (K.fo && K.bowl) { K.wisp = (K.wisp ?? 0) - dt * (1 + 4 * (L.draw || 0))
    if (K.wisp <= 0) { K.wisp = 0.55; K.fo.localToWorld(_w.copy(K.bowl)); sm.emit(_w, _u.clone().multiplyScalar(0.03 * ws), 0.0075 * ws, 2.0) } }
  // the exhale: a soft stream from under the mustache, out and up
  if (K.head && L.exhale > 0.25) { K.ex = (K.ex ?? 0) - dt
    if (K.ex <= 0) { K.ex = 0.07; K.head.localToWorld(_w.copy(K.mouth)); K.head.getWorldQuaternion(_hq); const fwd = new THREE.Vector3(0, -0.2, 1).applyQuaternion(_hq)
      sm.emit(_w, fwd.multiplyScalar(0.09 * ws).addScaledVector(_u, 0.03 * ws), 0.013 * ws * (0.6 + 0.6 * L.exhale), 2.0) } }
  sm.step(dt, _u, _sd)
}

const collarInk = (() => { const m = mkOutline(false); m.uniforms.uT.value = 0.0026; return m })()
const propMat = (() => { const m = cel('#ffffff').clone(); m.vertexColors = true; m.defines = { KIND: 1 }; m.polygonOffset = true; m.polygonOffsetFactor = -1; m.polygonOffsetUnits = -2; return m })()
const plainMat = (() => { const m = cel('#ffffff').clone(); m.vertexColors = true; m.defines = { KIND: 1 }; return m })()

function attachLook(root, st) {
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
  // the clothes are measured against the body without its arms (the arms hang at his sides and would swell the haori)
  const SM = spec({ ...ISHI.body, arm: 0.02, hand: 0.01 })
  const collars = collarsGeo(SM, chestY); add(chest, collars); add(chest, collars, [0, 0, 0], collarInk)
  // sash round the belly, across the opening
  const clothes = clothesGeo(SM, hipsY); add(hips, clothes, [0, 0, 0], plainMat); add(hips, clothes, [0, 0, 0], collarInk)
  // trouser legs on the leg bones
  for (const k2 of ['L', 'R']) { const th = root.getObjectByName('th' + k2), sn = root.getObjectByName('sh' + k2 + 'n'); if (!th || !sn) continue
    const [gt, gs] = trouserLegGeos(S, k2); add(th, gt, [0, 0, 0], plainMat); add(th, gt, [0, 0, 0], collarInk); add(sn, gs, [0, 0, 0], plainMat); add(sn, gs, [0, 0, 0], collarInk) }
  // sandals on the bare feet
  for (const k2 of ['L', 'R']) { const ft = root.getObjectByName('ft' + k2); if (ft) add(ft, sandalGeo(S, k2), [0, 0, 0], plainMat) }
  // arms (pass 11): the wide haori sleeves, the cane and the pipe ride the arm bones, so every pose moves them
  const kit = { sleeves: [] }
  for (const k of ['L', 'R']) { const up = root.getObjectByName('up' + k), fo = root.getObjectByName('fo' + k); if (!up || !fo) continue
    const [gu, gf] = sleeveGeos(S, k); add(up, gu); add(fo, gf)
    const rig = restRig(S, k), inv = rig.matrixWorld.clone().invert(), hand = rig.localToWorld(S['hd' + k].clone().sub(S['el' + k]))
    if (k === 'L') { // the cane stands by his foot, his fist round the top
      const g = caneGeo([hand.x - 0.002, 0.004, hand.z + 0.004], [hand.x, hand.y + 0.010, hand.z]); g.applyMatrix4(inv); add(fo, g) }
    else { // the pipe sits upright in his fist, the stem toward his middle; its bowl top is where the smoke rises
      const at = hand.clone().add(new THREE.Vector3(-0.003, 0.007, 0.006)), rot = new THREE.Matrix4().extractRotation(inv), g = pipeGeo(-1); g.scale(PIPE_S, PIPE_S, PIPE_S); g.applyMatrix4(rot)
      kit.pipe = add(fo, g, at.clone().applyMatrix4(inv).toArray()) // pivots in the fist (tipped toward his mouth when he draws)
      kit.fo = kit.pipe; kit.bowl = new THREE.Vector3(0, 0.0175 * PIPE_S, 0).applyMatrix4(rot) } }
  // smoke: one InstancedMesh in world space (the scene), and the mouth point in the head bone's frame
  const head = root.getObjectByName('head')
  if (head && head.userData.rest) { const r = head.userData.rest, kk = 1.17 * (ISHI.body.head ?? 1), my = -0.047
    kit.head = head; kit.mouth = new THREE.Vector3(0, S.headC.y - r.y + my * kk, S.headC.z - r.z + (surfZ(0, my) + 0.008) * kk) }
  let scene = root; while (scene.parent) scene = scene.parent
  kit.smoke = makeSmoke(); scene.add(kit.smoke.mesh); kit.smoke.mesh.layers.mask = root.layers.mask
  st.ishi = kit
  if (typeof window !== 'undefined' && q.get('char') === 'ishi') window.__ishiRoot = root // studio probes
  out.push(kit.smoke.mesh)
  return () => out.forEach(m => m.removeFromParent())
}


const S0 = spec(BODY)
solveDraw(S0)
if (typeof window !== 'undefined') window.__ishiDraw = DRAW
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
  // a slow, chill walk: short unhurried steps, a low bob, an easy side-to-side sway, a little stoop
  walk: { rate: 5.8, stride: 0.36, knee: 0.48, bounce: 0.005, smooth: true, land: 0.2, arm: 0.2, lean: 0.14, twist: 0.06, sway: 0.09, idle: 'look' },
  ext: {
    life: (B, st, dt, t, R_, mem, state) => { const L = mem.life || (mem.life = makeLife(Math.random, ISHI_MOTION)); st.life = L; L.B = B; L.R = R_; L.hairOff = ISHI_HAIR_OFF
      if (typeof window !== 'undefined' && q.get('char') === 'ishi') window.__herLife = L // studio captures (tools/chibi-clip.mjs) drive the life layer through this
      st.seatDrop = 0.035 // in the game he is drawn at 0.995 (her height): this puts his seat on the bench where the old grandpa sat
      const aw = st.act ? Math.min(1, st.actW ?? 1) : 0; restArms(B, st, 1 - aw)
      talkGestures(L, st)
      if (!LIFE_OFF) { lifeStep(L, B, st, dt, t, R_, state.camera); ishiActs(L, B, st, dt) } },
    post: (R_, st, dt, t) => { if (!LIFE_OFF) { lifePost(st.life, R_, st, dt, t); smokeStep(st.life, st, dt) } },
    Face, Hair: IshiHair,
  },
}

export function ChibiIshi({ st, scale = 0.8, res }) {
  const g = useRef()
  const r = res ?? (TOUCH ? 40 : 52)
  useEffect(() => { let off = null, n = 0
    const iv = setInterval(() => { const root = g.current; if (root && root.getObjectByName('chest') && root.getObjectByName('hips')) { off = attachLook(root, st); clearInterval(iv) } else if (++n > 50) clearInterval(iv) }, 80)
    return () => { clearInterval(iv); off && off() } }, [])
  return <group ref={g}><Character cfg={ISHI} st={st} res={r} scale={scale} /></group>
}
export default ChibiIshi
