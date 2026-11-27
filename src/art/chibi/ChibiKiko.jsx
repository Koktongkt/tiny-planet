// DRAFT Kiko, the baker. The same skinned body, painted face and cel/ink pipeline as her.
// ?view=charstudio&dev=chibi-drafts&char=kiko&still
import * as THREE from 'three'
import React, { useEffect, useRef } from 'react'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { Character, CEL_U, cel, mkOutline, spec, sdf } from '../../GhibliPerson.jsx'
import { makeFace, MIDFACE } from './castFace.jsx'
import { part, tagAW, mergeHair, makeHairMat, makeHairInk } from './castHair.js'
import { KIKO_MOTION } from './motion.js'
import { makeLife, lifeStep, lifePost } from './life.js'
import { q } from '../../common.jsx'

const SKIN = '#f5c49c', HAIR = '#483023', DRESS = '#bc8a6b', CREAM = '#fff1d9', SHOE = '#63452e'
const HEAD_S = [1.035, 1.015, 1.02]
const JAW = [0, -0.027, 0.012, 0.053, 0.031, 0.037, 0.020]
const Face = makeFace({ kind: 'kiko', shape: { headS: HEAD_S, cheek: JAW }, eyeS: 1.08, blush: 0.91, fy0: -0.052 })
const OFF = new Float32Array(12)
const STILL = q.has('still') && !q.has('life')
const lerp = THREE.MathUtils.lerp
const clamp = THREE.MathUtils.clamp

// Indexed, smooth parametric panel. u runs left-to-right (or around the head), v goes down.
function panel(nx, ny, point, color, wrap = false) {
  const pos = [], col = [], idx = [], count = wrap ? nx : nx + 1
  for (let j = 0; j <= ny; j++) for (let i = 0; i < count; i++) {
    const u = i / nx, v = j / ny
    pos.push(...point(u, v))
    const c = new THREE.Color(color(u, v)); col.push(c.r, c.g, c.b)
  }
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const a = j * count + i, b = j * count + (i + 1) % count, c = a + count, d = b + count
    idx.push(a, c, b, b, c, d)
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3))
  g.setIndex(idx); g.computeVertexNormals(); return g
}
function tint(g, hex) {
  const c = new THREE.Color(hex), a = new Float32Array(g.attributes.position.count * 3)
  for (let i = 0; i < a.length; i += 3) a.set([c.r, c.g, c.b], i)
  g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g
}
function merge(parts) {
  const g = mergeGeometries(parts.map(p => {
    const n = p.index ? p.toNonIndexed() : p
    n.deleteAttribute('uv'); return n
  })); g.computeBoundingSphere(); return g
}
const clothMat = cel('#ffffff').clone()
clothMat.uniforms = { ...clothMat.uniforms, ...CEL_U }
clothMat.vertexColors = true
const clothInk = mkOutline(false); clothInk.uniforms.uT.value = 0.0018

const ball = new THREE.SphereGeometry(1, 18, 12)
const ellipsoid = (at, radii, color, rot = 0) => {
  const g = ball.clone(); g.scale(...radii); g.rotateZ(rot); g.translate(...at); return tint(g, color)
}
// A single swept cap with a soft off-centre part, long side locks, and low curled pigtails.
function hairGeo() {
  const cap = panel(72, 18, (u, v) => {
    const a = u * Math.PI * 2, t = Math.atan2(Math.sin(a), Math.cos(a)), d = Math.abs(t)
    const base = lerp(1.04, 2.04, clamp((d - 0.15) / 1.48, 0, 1))
    const fringe = d < 1.23 ? 0.11 * Math.sin(t * 8 + 0.4) + 0.12 * Math.sin(t * 3.3) - 0.13 * Math.exp(-(((t - 0.32) / 0.20) ** 2)) : 0
    const phi = Math.max(0.001, (base + fringe) * v)
    return [0.066 * Math.sin(phi) * Math.sin(a), 0.006 + 0.058 * Math.cos(phi), -0.003 + 0.064 * Math.sin(phi) * Math.cos(a)]
  }, () => HAIR, true)
  cap.deleteAttribute('color')
  cap.setAttribute('aSkin', new THREE.Float32BufferAttribute(new Float32Array(cap.attributes.position.count), 1))
  const parts = [tagAW(cap, () => [3, 0]), tagAW(part(ball, [0, -0.041, -0.040], [0.048, 0.025, 0.028]), () => [3, 0])]
  for (const d of [-1, 1]) {
    const shapes = [
      [[d * 0.056, -0.030, -0.020], [0.026, 0.029, 0.027], 0],
      [[d * 0.067, -0.036, -0.027], [0.022, 0.024, 0.025], 0],
      [[d * 0.050, -0.044, -0.035], [0.025, 0.020, 0.026], 0],
      [[d * 0.058, -0.024, 0.015], [0.008, 0.0125, 0.010], 1],
      [[d * 0.063, -0.024, 0.019], [0.004, 0.007, 0.005], 0.75],
    ]
    for (const [at, scale, skin] of shapes) parts.push(tagAW(part(ball, at, scale, [0, d * 0.48, 0], skin), () => [d < 0 ? 0 : 1, skin ? 0 : 0.17]))
  }
  return mergeHair(parts)
}
const HAIR_GEO = hairGeo(), HAIR_MAT = makeHairMat(SKIN, HAIR, '#76523a', OFF), HAIR_INK = makeHairInk(OFF)
HAIR_INK.uniforms.uT.value = 0.0028

// Kerchief covers the crown and nape, with pointed side corners, gathering folds and a tied knot.
function kerchief() {
  const scarf = panel(72, 20, (u, v) => {
    const a = u * Math.PI * 2, d = Math.abs(Math.atan2(Math.sin(a), Math.cos(a)))
    const edge = 0.87 + 1.38 * (1 - Math.cos(d)) / 2 + 0.20 * Math.sin(d) ** 2
    const phi = Math.max(0.001, v * edge), s = Math.sin(phi)
    const point = 1 + 0.12 * Math.exp(-(((d - 1.48) / 0.37) ** 2)) * v ** 5
    const fold = 1 + 0.022 * Math.sin(a * 6) * v ** 3 * clamp(d - 0.7, 0, 1)
    return [0.075 * s * Math.sin(a) * point * fold, 0.010 + 0.066 * Math.cos(phi), -0.006 + 0.075 * s * Math.cos(a) * fold]
  }, (u, v) => v > 0.96 ? '#e3d1b5' : CREAM, true)
  const parts = [scarf, ellipsoid([0, -0.037, -0.066], [0.009, 0.010, 0.008], CREAM)]
  for (const d of [-1, 1]) {
    parts.push(ellipsoid([d * 0.016, -0.049, -0.064], [0.009, 0.020, 0.0055], CREAM, d * 0.72))
  }
  return merge(parts)
}
const SCARF = kerchief()
function KikoHair({ set }) {
  return <group ref={set('hair')}>
    <mesh geometry={HAIR_GEO} material={HAIR_MAT} /><mesh geometry={HAIR_GEO} material={HAIR_INK} />
    <mesh geometry={SCARF} material={clothMat} /><mesh geometry={SCARF} material={clothInk} />
  </group>
}

// Fitted sleeve over the upper arm with a broad turned-up cuff, leaving the forearm and mitt visible.
const SLEEVE = new THREE.LatheGeometry([[0, -0.047], [0.021, -0.047], [0.024, -0.046], [0.025, -0.043], [0.025, -0.034], [0.023, -0.032], [0.022, -0.012], [0.023, 0], [0.017, 0.009], [0, 0.013]].map(p => new THREE.Vector2(...p)), 24)
const sleeveColor = new Float32Array(SLEEVE.attributes.position.count * 3)
for (let i = 0; i < SLEEVE.attributes.position.count; i++) {
  const c = new THREE.Color(SLEEVE.attributes.position.getY(i) < -0.034 ? '#d2a080' : DRESS)
  sleeveColor.set([c.r, c.g, c.b], i * 3)
}
SLEEVE.setAttribute('color', new THREE.BufferAttribute(sleeveColor, 3))
function KikoSleeve() {
  return <><mesh geometry={SLEEVE} material={clothMat} /><mesh geometry={SLEEVE} material={clothInk} /></>
}
export const KIKO = {
  name: 'baker', age: 'adult', motion: KIKO_MOTION,
  body: { H: 0.89, head: 1.39, ink: 0.0024, headS: HEAD_S, cheek: JAW, midface: MIDFACE, headUp: -0.003,
    torso: 1.12, leg: 0.83, girth: 1.34, chestW: 1.12, bellyZ: 0.94,
    arm: 0.90, armR: [1.06, 1.23, 1.45], armA: 0.44, shX: 1.35, hand: 1.02,
    legR: 1.16, legX: 0.90, foot: 1.30, bootW: 1.27, bootH: 1.35, bootL: 1.02,
    anY: 0.039, footY: 0.016, soleY: 0.0012, bootShaft: [0.022, 0.016, 0.022, -0.006] },
  hair: { style: 'chibi', c: HAIR },
  outfit: { type: 'shirt', skin: SKIN, top: DRESS, bottom: SHOE, shoe: SHOE, shoeY: 0.052, hemY: 0.035, sleeve: 'short', seams: true },
  walk: { rate: 9.5, stride: 0.38, knee: 0.57, bounce: 0.008, smooth: true, land: 0.30, arm: 0.48, lean: 0.05, twist: 0.08, sway: 0.06, idle: 'sway' },
  ext: {
    Face, Hair: KikoHair, Sleeve: KikoSleeve,
    life(B, st, dt, t, R, mem, state) {
      const L = mem.life || (mem.life = makeLife(Math.random, KIKO_MOTION))
      st.life = L; L.B = B; L.R = R; L.hairOff = OFF
      if (!STILL) lifeStep(L, B, st, dt, t, R, state.camera)
    },
    post(R, st, dt, t) { if (!STILL) lifePost(st.life, R, st, dt, t) },
  },
}

// Real flared skirt and wrapped apron, not a flat sheet. Two merged cloth groups follow the
// shared chest and hips bones separately; folds stay modest and the hem clears the boots.
function outfitGeo() {
  const S = spec(KIKO.body), waist = S.bellyY + 0.013, hem = S.anY + 0.018
  const hipY = (S.hipY + S.bellyY) / 2, chestY = (S.bellyY + S.chestY) / 2
  const radius = v => [lerp(0.089, 0.111, v), lerp(0.068, 0.080, v)]
  const skirtPoint = (a, v, extra = 0) => {
    const [rx, rz] = radius(v), fold = 0.002 * Math.cos(a * 8) * v
    return [(rx + fold + extra) * Math.sin(a), lerp(waist, hem, v) - 0.003 * v * Math.cos(a * 2) - hipY, (rz + fold + extra) * Math.cos(a) + 0.007]
  }
  const skirt = panel(56, 20, (u, v) => skirtPoint(u * Math.PI * 2, v), (_, v) => v > 0.97 ? '#a8755a' : DRESS, true)
  const apron = panel(32, 24, (u, v) => {
    const a = (u - 0.5) * lerp(1.80, 2.03, v)
    return skirtPoint(a, v * 0.88, 0.004 + 0.002 * Math.cos(u * Math.PI * 8) * (1 - v))
  }, (u, v) => u < 0.035 || u > 0.965 || v > 0.96 ? '#e7d4b8' : CREAM)
  const sash = panel(56, 8, (u, v) => {
    const a = u * Math.PI * 2
    return [0.091 * Math.sin(a), waist + 0.009 - v * 0.015 - hipY, 0.072 * Math.cos(a) + 0.007]
  }, (_, v) => v < 0.12 || v > 0.88 ? '#e2cfb5' : CREAM, true)
  const bowY = waist + 0.001 - hipY, bowZ = -0.072
  const hips = [skirt, apron, sash, ellipsoid([0, bowY, bowZ], [0.008, 0.008, 0.005], CREAM)]
  for (const d of [-1, 1]) {
    hips.push(ellipsoid([d * 0.017, bowY + 0.002, bowZ], [0.018, 0.011, 0.006], CREAM, d * 0.23))
    const sh = new THREE.Shape()
    sh.moveTo(-0.006, 0); sh.lineTo(0.006, 0); sh.quadraticCurveTo(0.008, -0.024, 0.009, -0.045)
    sh.quadraticCurveTo(0, -0.048, -0.009, -0.045); sh.quadraticCurveTo(-0.007, -0.022, -0.006, 0)
    const tail = new THREE.ExtrudeGeometry(sh, { depth: 0.002, bevelEnabled: true, bevelThickness: 0.0008, bevelSize: 0.001, bevelSegments: 2, curveSegments: 6 })
    tail.rotateX(0.12); tail.rotateZ(d * 0.29); tail.translate(d * 0.007, bowY - 0.004, bowZ - 0.008)
    hips.push(tint(tail, CREAM))
  }
  // Find the skin/clothing surface for the bib and its shoulder straps (same SDF as the body).
  const p = new THREE.Vector3()
  const surf = (x, y, d = 1) => {
    let z = 0.14
    for (; z > 0; z -= 0.001) if (sdf(S, p.set(x, y, d * z)) < 0) break
    return d * (z + 0.009)
  }
  const bibTop = S.chestY + 0.006
  const bib = panel(32, 20, (u, v) => {
    const x = (u - 0.5) * lerp(0.108, 0.132, v), y = lerp(bibTop, waist - 0.002, v)
    return [x, y - chestY, surf(x, y)]
  }, (u, v) => {
    const pocket = u > 0.15 && u < 0.85 && v > 0.38 && v < 0.94
    const seam = pocket && (u < 0.19 || u > 0.81 || v < 0.43)
    return seam || u < 0.025 || u > 0.975 || v < 0.045 ? '#e4d1b7' : CREAM
  })
  const chest = [bib]
  for (const d of [-1, 1]) {
    chest.push(panel(8, 20, (u, v) => {
      const x = d * lerp(0.050, 0.038, v) - (u - 0.5) * 0.016, y = lerp(bibTop - 0.004, S.shY + 0.015, v)
      return [x, y - chestY, surf(x, y)]
    }, () => CREAM))
    // short straps fold over the shoulders; the back dress is otherwise plain, as on the sheet
    const back = panel(8, 24, (u, v) => {
      const x = d * lerp(0.038, 0.044, v) - (u - 0.5) * 0.015, y = lerp(S.shY + 0.015, S.chestY + 0.014, v)
      return [x, y - chestY, surf(x, y, -1)]
    }, () => CREAM)
    chest.push(back)
  }
  return { hips: merge(hips), chest: merge(chest) }
}
const CLOTH = outfitGeo()
function attachClothes(root) {
  const pieces = Object.entries(CLOTH).flatMap(([name, geometry]) => {
    const bone = root.getObjectByName(name)
    return [clothMat, clothInk].map(material => {
      const m = new THREE.Mesh(geometry, material); m.layers.mask = root.layers.mask; bone.add(m); return m
    })
  })
  return () => pieces.forEach(m => m.removeFromParent())
}

export function ChibiKiko({ st, scale = 0.8, res }) {
  const root = useRef()
  useEffect(() => {
    if (root.current?.getObjectByName('hips') && root.current?.getObjectByName('chest')) return attachClothes(root.current)
  }, [])
  return <group ref={root}><Character cfg={KIKO} st={st} scale={scale} res={res ?? (matchMedia('(pointer: coarse)').matches ? 40 : 52)} /></group>
}
export default ChibiKiko
