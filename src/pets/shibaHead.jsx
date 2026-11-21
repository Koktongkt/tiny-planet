// Pip's head, Cozy Chibi pass (round 10), built the same way as her face: one smooth head mesh from a soft-blended
// shape (round skull + wide fluffy jowls + short muzzle), the orange / cream urajiro mask computed in the coat shader
// (crisp at any distance), and a painted canvas face decal projected onto the head from the front (eyes, brow dots,
// blush, 'w' smile, open mouth + tongue). A real 3D nose keeps the profile. Concept: docs/characters/ref/pets-chibi-concept.jpg.
// Everything is in head units: x right, y up, z forward, head half-width = 1. The rig scales it by cfg.head.
import * as THREE from 'three'
import React, { useMemo } from 'react'
import { fur, CEL_U } from '../GhibliPerson.jsx'
import { OUT, GEO, cel } from '../home/kit.jsx'

// ---------- shape ----------
const ell = (x, y, z, c, r) => { const a = (x - c[0]) / r[0], b = (y - c[1]) / r[1], d = (z - c[2]) / r[2]; return (Math.sqrt(a * a + b * b + d * d) - 1) * Math.min(r[0], r[1], r[2]) }
const smin = (a, b, k) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25 }
export const HEAD = { skull: [[0, 0.1, -0.06], [0.96, 0.72, 0.8]], jowl: [[0, -0.24, 0.02], [1.0, 0.5, 0.74]], muzzle: [[0, -0.16, 0.68], [0.33, 0.23, 0.44]], kJ: 0.3, kM: 0.1 }
const sdf = (x, y, z) => smin(smin(ell(x, y, z, ...HEAD.skull), ell(x, y, z, ...HEAD.jowl), HEAD.kJ), ell(x, y, z, ...HEAD.muzzle), HEAD.kM)
const grad = (x, y, z, out) => { const e = 1e-3; out.set(sdf(x + e, y, z) - sdf(x - e, y, z), sdf(x, y + e, z) - sdf(x, y - e, z), sdf(x, y, z + e) - sdf(x, y, z - e)).normalize(); return out }
// first surface hit along a ray (o + t d), or null
function hit(o, d, t0, t1, step = 0.01) {
  let prev = t0, sp = sdf(o[0] + d[0] * t0, o[1] + d[1] * t0, o[2] + d[2] * t0)
  for (let t = t0 + step; t <= t1; t += step) { const s = sdf(o[0] + d[0] * t, o[1] + d[1] * t, o[2] + d[2] * t)
    if (Math.sign(s) !== Math.sign(sp)) { let a = prev, b = t; for (let n = 0; n < 20; n++) { const m = (a + b) / 2, sm = sdf(o[0] + d[0] * m, o[1] + d[1] * m, o[2] + d[2] * m); if (Math.sign(sm) === Math.sign(sp)) a = m; else b = m } return (a + b) / 2 }
    prev = t; sp = s }
  return null
}
const headGeo = (() => { // star-shaped from an inside point: shoot each sphere vertex direction out to the surface
  const g = new THREE.SphereGeometry(1, 72, 54), p = g.attributes.position, nr = g.attributes.normal, C = [0, -0.1, 0.12], n = new THREE.Vector3()
  for (let i = 0; i < p.count; i++) { const d = [p.getX(i), p.getY(i), p.getZ(i)], t = hit(C, d, 0, 2.5, 0.02) ?? 1
    const x = C[0] + d[0] * t, y = C[1] + d[1] * t, z = C[2] + d[2] * t; p.setXYZ(i, x, y, z); grad(x, y, z, n); nr.setXYZ(i, n.x, n.y, n.z) }
  g.deleteAttribute('uv'); g.computeBoundingSphere(); return g
})()
const EAR = (() => { // a gumdrop: a sphere tapered toward the top, base at y = 0, rounded tip at y = 1
  const g = new THREE.SphereGeometry(1, 24, 18), p = g.attributes.position
  for (let i = 0; i < p.count; i++) { const t = (p.getY(i) + 1) / 2, k = 1 - 0.84 * Math.pow(t, 0.85); p.setXYZ(i, p.getX(i) * k, t, p.getZ(i) * k) }
  g.computeVertexNormals(); return g })()
const NOSE = (() => { const y = -0.05, t = hit([0, y, 2], [0, 0, -1], 0, 2.5); return [0, y, 2 - t] })()

// ---------- coat: orange with the cream urajiro mask (muzzle, cheeks, jowls, throat), arching up to the nose ----------
let headMatC = null
function headMat(main, cream) {
  if (headMatC) return headMatC
  const m = fur(main).clone(); m.defines = { FUR: 1, SHIBA: 1 }
  m.uniforms = { ...m.uniforms, ...CEL_U, uColor: { value: new THREE.Color(main) }, uCream: { value: new THREE.Color(cream) } }
  m.fragmentShader = m.fragmentShader.replace('vec3 base = uColor*vCol;', `vec3 base = uColor*vCol;
    #ifdef SHIBA
      { float ax = abs(vO.x);
        float b = -0.075 + 0.13*exp(-ax*ax*25.) - 0.03*exp(-(ax - .45)*(ax - .45)*25.); // front edge: just under the eyes, up to the nose
        b -= 0.22*smoothstep(.55, 1., ax) + 0.5*(1. - smoothstep(-0.4, 0.35, vO.z));                                         // sweeps down the cheeks to the throat
        float dd = vO.y - b, w = fwidth(dd)*1.2 + 1e-4;
        base = mix(base, uCream, 1. - smoothstep(-w, w, dd)); }
    #endif
    `).replace('uniform vec3 uColor;', 'uniform vec3 uColor; uniform vec3 uCream;')
  if (!m.fragmentShader.includes('uniform vec3 uCream')) m.fragmentShader = 'uniform vec3 uCream;\n' + m.fragmentShader
  headMatC = m; return m
}

// ---------- painted face: 2x2 atlas [eyes open | closed] x [mouth open | closed] ----------
const X0 = -1.05, X1 = 1.05, Y0 = -0.8, Y1 = 0.62, INK = '#3a2216'
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
      el(cx, y, rx + 0.018, ry + 0.018); x.fillStyle = '#2a170e'; x.fill()
      const g = x.createLinearGradient(0, y + ry, 0, y - ry); g.addColorStop(0, '#24130b'); g.addColorStop(0.42, '#3f2213'); g.addColorStop(0.78, '#71421f'); g.addColorStop(1, '#93592c')
      el(cx, y, rx, ry); x.fillStyle = g; x.fill()
      el(cx, y + 0.015, rx * 0.6, ry * 0.62); x.fillStyle = 'rgba(22,11,6,.72)'; x.fill() // pupil
      x.save(); el(cx, y, rx, ry); x.clip(); el(cx + s * 0.01, y - ry * 0.78, rx * 0.62, ry * 0.32); x.fillStyle = 'rgba(196,128,72,.45)'; x.fill(); x.restore() // warm lower glow
      // upper lid: a heavier ink arc over the top
      x.beginPath(); x.ellipse(cx, y, rx + 0.012, ry + 0.012, 0, 0.12 * Math.PI, 0.88 * Math.PI); x.lineWidth = 0.034; x.strokeStyle = INK; x.lineCap = 'round'; x.stroke()
      x.fillStyle = '#ffffff'; x.beginPath(); x.arc(cx - 0.045, y + 0.07, 0.054, 0, 7); x.fill()
      x.beginPath(); x.arc(cx + 0.06, y - 0.075, 0.022, 0, 7); x.fill()
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
  const hr = c.head, fm = useMemo(faceMat, []), hm = headMat(c.col.main, c.col.cream)
  return <group scale={hr}>
    <Part geo={headGeo} mat={hm} />
    <mesh ref={set('face')} geometry={faceGeo} material={fm} renderOrder={2} />
    <group position={NOSE}><mesh geometry={GEO.sph} material={M.nose} scale={[0.135, 0.085, 0.085]} /><mesh geometry={GEO.sph} material={OUT.pet} scale={[0.135, 0.085, 0.085]} />
      <mesh geometry={GEO.sph} material={M.shine} position={[-0.04, 0.035, 0.065]} scale={[0.035, 0.02, 0.012]} /></group>
    {[-1, 1].map(s => <group key={'e' + s} ref={set(s > 0 ? 'earL' : 'earR')} position={[s * 0.6, 0.52, -0.14]}><group rotation={[0, 0, -s * 0.36]}>
      <Part geo={EAR} mat={M.main} pos={[0, -0.04, 0]} rot={[-0.1, 0, 0]} scl={[0.58, 0.92 * c.ear, 0.18]} />
      <mesh geometry={EAR} material={M.innerEar} position={[s * -0.02, 0.04, 0.11]} rotation={[-0.1, 0, 0]} scale={[0.4, 0.72 * c.ear, 0.07]} />
      <mesh geometry={EAR} material={M.cream} position={[s * -0.07, 0.02, 0.15]} rotation={[-0.1, 0, s * 0.3]} scale={[0.15, 0.4 * c.ear, 0.04]} />
    </group></group>)}
  </group>
}
