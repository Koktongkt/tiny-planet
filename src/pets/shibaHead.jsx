// Pip's head, Cozy Chibi pass (round 10), built the same way as her face: one smooth head mesh from a soft-blended
// shape (round skull + wide fluffy jowls + short muzzle), the orange / cream urajiro mask computed in the coat shader
// (crisp at any distance), and a painted canvas face decal projected onto the head from the front (eyes, brow dots,
// blush, 'w' smile, open mouth + tongue). A real 3D nose keeps the profile. Concept: docs/characters/ref/pets-chibi-concept.jpg.
// Everything is in head units: x right, y up, z forward, head half-width = 1. The rig scales it by cfg.head.
import * as THREE from 'three'
import React, { useMemo } from 'react'
import { fur, CEL_U } from '../GhibliPerson.jsx'
import { OUT, GEO } from '../home/kit.jsx'
import { ell, smin, sstep, gradOf, hitOf, starMesh } from './sdfKit.js'

// ---------- shape ----------
export const HEAD = { skull: [[0, 0.1, -0.06], [0.94, 0.72, 0.8]], jowl: [[0, -0.34, 0.08], [1.05, 0.56, 0.76]], cheek: [[0.62, -0.2, 0.08], [0.38, 0.3, 0.42]], muzzle: [[0, -0.19, 0.76], [0.34, 0.26, 0.36]], chin: [[0, -0.43, 0.64], [0.34, 0.26, 0.38]],
  kJ: 0.28, kC: 0.18, kM: 0.14, kCh: 0.22, kE: 0.1,
  // ears: a rounded cone (base radius r1, tip radius r2, height h) flattened front-to-back, tilted out and a little back
  ear: { base: [0.56, 0.5, -0.14], tilt: 0.3, back: 0.12, r1: 0.44, r2: 0.12, h: 0.64, flat: 0.38 } }
const E = HEAD.ear, EARM = [-1, 1].map(s => new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(-E.back, 0, -s * E.tilt)).setPosition(s * E.base[0], E.base[1], E.base[2]))
const EARI = EARM.map(m => m.clone().invert()), _e = new THREE.Vector3()
function roundCone(x, y, z) { // iq's round cone along +y, base at the origin
  const b = (E.r1 - E.r2) / E.h, a = Math.sqrt(1 - b * b), qx = Math.hypot(x, z), k = -b * qx + a * y
  if (k < 0) return Math.hypot(qx, y) - E.r1
  if (k > a * E.h) return Math.hypot(qx, y - E.h) - E.r2
  return a * qx + b * y - E.r1 }
const ear = (x, y, z, i) => { _e.set(x, y, z).applyMatrix4(EARI[i]); return roundCone(_e.x, _e.y, _e.z / E.flat) * E.flat }
const sdf = (x, y, z) => { let d = smin(ell(x, y, z, ...HEAD.skull), ell(x, y, z, ...HEAD.jowl), HEAD.kJ)
  const [c, r] = HEAD.cheek; d = smin(d, Math.min(ell(x, y, z, [-c[0], c[1], c[2]], r), ell(x, y, z, c, r)), HEAD.kC)
  d = smin(d, ell(x, y, z, ...HEAD.muzzle), HEAD.kM); d = smin(d, ell(x, y, z, ...HEAD.chin), HEAD.kCh)
  return smin(d, Math.min(ear(x, y, z, 0), ear(x, y, z, 1)), HEAD.kE) }
const grad = gradOf(sdf), hit = hitOf(sdf)
// rays heading for an ear start from inside that ear (blended in smoothly), so the ear tips get sampled head-on
const headGeo = (() => { const C = [0, -0.1, 0.12], V = (a) => new THREE.Vector3(...a)
  const EM = EARM.map(m => new THREE.Vector3(0, E.h * 0.3, 0).applyMatrix4(m)), EU = EARM.map(m => new THREE.Vector3(0, E.h, 0).applyMatrix4(m).sub(V(C)).normalize())
  const origin = (d) => { let o = C; for (let e = 0; e < 2; e++) { const w = sstep(0.8, 0.97, d[0] * EU[e].x + d[1] * EU[e].y + d[2] * EU[e].z); if (w > 0) o = [C[0] + (EM[e].x - C[0]) * w, C[1] + (EM[e].y - C[1]) * w, C[2] + (EM[e].z - C[2]) * w] } return o }
  return starMesh(sdf, { C, w: 96, h: 72, step: 0.01, far: 2.6, relax: 8, origin }) })()
const NOSE = (() => { const y = -0.05, t = hit([0, y, 2], [0, 0, -1], 0, 2.5); return [0, y, 2 - t] })()

// ---------- coat: orange with the cream urajiro mask (muzzle, cheeks, jowls, throat), arching up to the nose ----------
let headMatC = null
function headMat(main, cream, pink) {
  if (headMatC) return headMatC
  const m = fur(main).clone(); m.defines = { FUR: 1, SHIBA: 1 }
  m.uniforms = { ...m.uniforms, ...CEL_U, uColor: { value: new THREE.Color(main) }, uCream: { value: new THREE.Color(cream) }, uPink: { value: new THREE.Color(pink) }, uEarI: { value: EARI } }
  m.fragmentShader = m.fragmentShader.replace('vec3 base = uColor*vCol;', `vec3 base = uColor*vCol;
    #ifdef SHIBA
      { float ax = abs(vO.x);
        float b = -0.055 + 0.11*exp(-ax*ax*25.) - 0.035*exp(-(ax - .44)*(ax - .44)*30.) + 0.03*smoothstep(.6, .95, ax); // front edge: just under the eyes, up to the nose, up onto the cheeks
        b -= 0.45*(1. - smoothstep(-0.5, 0.15, vO.z));                                         // sweeps down the cheeks to the throat
        float dd = vO.y - b, w = fwidth(dd)*1.2 + 1e-4;
        base = mix(base, uCream, 1. - smoothstep(-w, w, dd));
        for (int i = 0; i < 2; i++) { // ear insides, in each ear's own frame: pink, cream fluff at the bottom
          vec3 e = (uEarI[i]*vec4(vO, 1.)).xyz; float t = e.y/${E.h.toFixed(3)};
          float hw = ${E.r1.toFixed(3)}*0.62*max(0., 1. - t/.9), dx = abs(e.x) - hw; // a tapering triangle up the ear
          float k = (1. - smoothstep(-w, w, dx))*smoothstep(.1, .16, t)*smoothstep(-.01, .02, e.z);
          vec3 inner = mix(uCream, uPink, smoothstep(.2, .45, t))*(1. - .08*smoothstep(.3, 1., abs(e.x)/max(hw, 1e-3)));
          base = mix(base, inner, k); } }
    #endif
    `).replace('uniform vec3 uColor;', 'uniform vec3 uColor; uniform vec3 uCream; uniform vec3 uPink; uniform mat4 uEarI[2];')
  if (!m.fragmentShader.includes('uniform vec3 uCream')) m.fragmentShader = 'uniform vec3 uCream; uniform vec3 uPink; uniform mat4 uEarI[2];\n' + m.fragmentShader
  headMatC = m; return m
}

// ---------- painted face: 2x2 atlas [eyes open | closed] x [mouth open | closed] ----------
const X0 = -1.05, X1 = 1.05, Y0 = -0.9, Y1 = 0.62, INK = '#3a2216'
export const EYE = { x: 0.44, y: 0.06, rx: 0.142, ry: 0.162 }
function paint(x, eyesOpen, mouthOpen) {
  const el = (cx, cy, rx, ry, rot = 0) => { x.beginPath(); x.ellipse(cx, cy, rx, ry, rot, 0, Math.PI * 2) }
  // brow dots
  for (const s of [-1, 1]) { el(s * 0.36, 0.43, 0.105, 0.07, -s * 0.18); x.fillStyle = '#fbe4c4'; x.fill() }
  // blush
  for (const s of [-1, 1]) { x.save(); x.translate(s * 0.6, -0.15); x.scale(1, 0.58); const g = x.createRadialGradient(0, 0, 0, 0, 0, 0.19)
    g.addColorStop(0, 'rgba(244,138,132,.62)'); g.addColorStop(0.6, 'rgba(244,138,132,.38)'); g.addColorStop(1, 'rgba(244,138,132,0)'); x.fillStyle = g; x.beginPath(); x.arc(0, 0, 0.19, 0, 7); x.fill(); x.restore() }
  // eyes
  for (const s of [-1, 1]) { const { y, rx, ry } = EYE, cx = s * EYE.x
    if (eyesOpen) {
      // ink rim, cream-white eye, brown iris narrower than the eye so white shows on both sides, one highlight
      el(cx, y, rx + 0.017, ry + 0.017); x.fillStyle = '#2a170e'; x.fill()
      el(cx, y, rx, ry); x.fillStyle = '#fffaf4'; x.fill()
      x.save(); el(cx, y, rx, ry); x.clip()
      const IX = rx * 0.78, IY = ry * 0.98, iy = y - ry * 0.02, ix = cx - s * rx * 0.24
      const g = x.createLinearGradient(0, iy + IY, 0, iy - IY); g.addColorStop(0, '#24130b'); g.addColorStop(0.45, '#40220f'); g.addColorStop(0.8, '#74431f'); g.addColorStop(1, '#93592c')
      el(ix, iy, IX + 0.008, IY + 0.008); x.fillStyle = '#24130b'; x.fill()
      el(ix, iy, IX, IY); x.fillStyle = g; x.fill()
      el(ix, iy + 0.012, IX * 0.62, IY * 0.6); x.fillStyle = 'rgba(22,11,6,.72)'; x.fill() // pupil
      el(ix, iy - IY * 0.72, IX * 0.62, IY * 0.3); x.fillStyle = 'rgba(196,128,72,.42)'; x.fill() // warm lower glow
      x.restore()
      x.beginPath(); x.ellipse(cx, y, rx + 0.01, ry + 0.01, 0, 0.1 * Math.PI, 0.9 * Math.PI); x.lineWidth = 0.034; x.strokeStyle = INK; x.lineCap = 'round'; x.stroke() // upper lid
      x.fillStyle = '#ffffff'; x.beginPath(); x.arc(ix + 0.03, iy + 0.06, 0.04, 0, 7); x.fill()
    } else {
      x.beginPath(); x.moveTo(cx - 0.14, y + 0.01); x.quadraticCurveTo(cx, y - 0.09, cx + 0.14, y + 0.01); x.lineWidth = 0.042; x.strokeStyle = INK; x.lineCap = 'round'; x.stroke()
    }
  }
  // mouth: open (dark mouth + tongue) under a 'w' smile
  if (mouthOpen) {
    x.beginPath(); x.moveTo(-0.115, -0.225); x.quadraticCurveTo(0, -0.25, 0.115, -0.225); x.bezierCurveTo(0.12, -0.33, 0.07, -0.41, 0, -0.41); x.bezierCurveTo(-0.07, -0.41, -0.12, -0.33, -0.115, -0.225); x.closePath()
    x.fillStyle = '#6a2820'; x.fill(); x.save(); x.clip()
    el(0, -0.39, 0.09, 0.11); x.fillStyle = '#ef8580'; x.fill()
    el(-0.022, -0.35, 0.03, 0.04); x.fillStyle = 'rgba(255,190,180,.55)'; x.fill()
    x.beginPath(); x.moveTo(0, -0.31); x.lineTo(0, -0.41); x.lineWidth = 0.014; x.strokeStyle = 'rgba(190,80,80,.7)'; x.stroke(); x.restore()
    x.beginPath(); x.moveTo(-0.115, -0.225); x.bezierCurveTo(-0.12, -0.33, -0.07, -0.41, 0, -0.41); x.bezierCurveTo(0.07, -0.41, 0.12, -0.33, 0.115, -0.225); x.lineWidth = 0.026; x.strokeStyle = INK; x.stroke()
  }
  x.beginPath(); x.moveTo(0, -0.12); x.lineTo(0, -0.175)
  for (const s of [-1, 1]) { x.moveTo(0, -0.175); x.quadraticCurveTo(s * 0.03, -0.245, s * 0.11, -0.24); x.quadraticCurveTo(s * 0.19, -0.235, s * 0.225, -0.17) }
  x.lineWidth = 0.03; x.strokeStyle = INK; x.lineCap = 'round'; x.lineJoin = 'round'; x.stroke()
}
let atlas = null
function faceAtlas(CW = 512) {
  if (atlas) return atlas
  const CH = Math.round(CW * (Y1 - Y0) / (X1 - X0)), c = document.createElement('canvas'); c.width = CW * 2; c.height = CH * 2; const x = c.getContext('2d')
  for (let i = 0; i < 4; i++) { const cx = i % 2, cy = i >> 1 // cell (col, row): col = mouth closed, row = eyes closed
    x.save(); x.beginPath(); x.rect(cx * CW, cy * CH, CW, CH); x.clip()
    x.setTransform(CW / (X1 - X0), 0, 0, -CH / (Y1 - Y0), cx * CW - X0 * CW / (X1 - X0), cy * CH + Y1 * CH / (Y1 - Y0))
    paint(x, cy === 0, cx === 0); x.restore() }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter
  if (typeof window !== 'undefined') window.__pipFace = c
  return (atlas = t)
}
const faceMat = () => new THREE.ShaderMaterial({ transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4,
  uniforms: { map: { value: faceAtlas(typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches ? 384 : 512) }, uCell: { value: 0 }, uLight: CEL_U.uLight, uAmb: CEL_U.uAmb },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
  fragmentShader: `uniform sampler2D map; uniform float uCell; uniform vec3 uLight, uAmb; varying vec2 vUv;
    void main(){ vec2 u = clamp(vUv, .004, .996), cell = vec2(mod(uCell, 2.), floor(uCell*.5));
      vec4 c = texture2D(map, vec2((cell.x + u.x)*.5, (1. - cell.y + u.y)*.5)); if (c.a < .01) discard;
      gl_FragColor = vec4(c.rgb*(uLight*.92 + uAmb), c.a);
      #include <colorspace_fragment>
    }` })
// the decal: a grid over the face region, each vertex shot onto the head from the front and lifted off it a hair
const faceGeo = (() => { const NX = 48, NY = 34, pos = [], uv = [], ok = [], idx = [], n = new THREE.Vector3()
  for (let j = 0; j <= NY; j++) for (let i = 0; i <= NX; i++) { const u = i / NX, v = j / NY, x = X0 + u * (X1 - X0), y = Y0 + v * (Y1 - Y0)
    const t = hit([x, y, 2], [0, 0, -1], 0, 2.6); let z = 0
    if (t !== null) { z = 2 - t; grad(x, y, z, n) }
    pos.push(x + n.x * 0.012, y + n.y * 0.012, z + n.z * 0.012); uv.push(u, v); ok.push(t !== null && n.z > 0.02) }
  for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) { const a = j * (NX + 1) + i, b = a + 1, c = a + NX + 1, d = c + 1
    if (ok[a] && ok[b] && ok[c] && ok[d]) idx.push(a, b, d, a, d, c) }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeBoundingSphere(); return g })()

function Part({ geo = GEO.sph, mat, out = OUT.pet, pos, scl, rot }) {
  return <group position={pos} rotation={rot}><group scale={scl}><mesh geometry={geo} material={mat} />{out && <mesh geometry={geo} material={out} />}</group></group>
}
export function ShibaHead({ c, M, set }) {
  const hr = c.head, fm = useMemo(faceMat, []), hm = headMat(c.col.main, c.col.cream, c.col.innerEar)
  return <group scale={hr}>
    <Part geo={headGeo} mat={hm} />
    <mesh ref={set('face')} geometry={faceGeo} material={fm} renderOrder={2} />
    <group position={NOSE}><mesh geometry={GEO.sph} material={M.nose} scale={[0.135, 0.085, 0.085]} />
      <mesh geometry={GEO.sph} material={M.shine} position={[-0.04, 0.035, 0.065]} scale={[0.035, 0.02, 0.012]} /></group>
  </group>
}
