// "Cozy Chibi" her (concept B, approved by KT): the same soft-body rig as every villager (GhibliPerson Character,
// same bones, poses, props, bike IK), re-proportioned to ~2.5 heads, with a painted face decal (4 expressions in one
// canvas atlas, 1 draw) and sculpted hair clumps merged to one cel mesh + one ink hull (2 draws).
// Lazy chunk: nothing here ships in the startup bundle. Head frame used below: the head group in Character
// (origin = head centre, scale 1.17 * head), where the head ellipsoid has radii HR.
import * as THREE from 'three'
import React, { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Character, TRAVELLER, CEL_U, hairMat, M, Merge } from '../../GhibliPerson.jsx'
import { T, q } from '../../common.jsx'

const HR = [0.068 / 1.17, 0.0584 / 1.17, 0.0648 / 1.17]
const TOUCH = typeof window !== 'undefined' && matchMedia('(pointer: coarse)').matches

// ---------- face atlas (canvas, drawn once at load: no image file) ----------
// region of the face the decal covers, in head-frame units (planar front projection)
const FX = 0.047, FY0 = -0.044, FY1 = 0.012
export const FACES = ['happy', 'blink', 'sleepy', 'excited']
function drawFaces(W) {
  const H = Math.round(W * (FY1 - FY0) / (2 * FX)), c = document.createElement('canvas'); c.width = W; c.height = H * 4
  const g = c.getContext('2d'), px = (x) => (x / FX * 0.5 + 0.5) * W, py = (y, k) => k * H + (1 - (y - FY0) / (FY1 - FY0)) * H, s = W / (2 * FX)
  const INK = '#2a1a14', HAIR = '#3b2a22'
  FACES.forEach((name, k) => {
    g.save(); g.beginPath(); g.rect(0, k * H, W, H); g.clip()
    g.lineCap = g.lineJoin = 'round'
    // blush: soft round pink
    for (const sd of [-1, 1]) { const x = px(sd * 0.031), y = py(-0.024, k), r = 0.0105 * s, gr = g.createRadialGradient(x, y, 0, x, y, r)
      gr.addColorStop(0, 'rgba(247,140,140,.62)'); gr.addColorStop(0.55, 'rgba(247,140,140,.42)'); gr.addColorStop(1, 'rgba(247,140,140,0)'); g.fillStyle = gr; g.beginPath(); g.ellipse(x, y, r, r * 0.8, 0, 0, Math.PI * 2); g.fill() }
    // brows: short soft arches (raised when excited, relaxed when sleepy)
    const by = name === 'excited' ? 0.0035 : name === 'sleepy' ? -0.001 : 0.0012
    g.strokeStyle = HAIR; g.lineWidth = 0.0024 * s
    for (const sd of [-1, 1]) { g.beginPath(); g.moveTo(px(sd * 0.0125), py(by - 0.0012, k)); g.quadraticCurveTo(px(sd * 0.0185), py(by + 0.0022, k), px(sd * 0.0255), py(by - 0.0008, k)); g.stroke() }
    // eyes
    const ex = 0.0185, ey = -0.0115
    for (const sd of [-1, 1]) {
      const x = px(sd * ex), y = py(ey, k), rx = 0.0068 * s * (name === 'excited' ? 1.06 : 1), ry = 0.0088 * s * (name === 'excited' ? 1.06 : 1)
      if (name === 'blink') { g.strokeStyle = INK; g.lineWidth = 0.0022 * s; g.beginPath(); g.moveTo(x - rx * 1.05, y - ry * 0.05); g.quadraticCurveTo(x, y + ry * 0.75, x + rx * 1.05, y - ry * 0.05); g.stroke()
        g.lineWidth = 0.0013 * s; g.beginPath(); g.moveTo(x + sd * rx * 0.95, y); g.lineTo(x + sd * rx * 1.35, y - ry * 0.3); g.stroke(); continue }
      g.save()
      if (name === 'sleepy') { g.beginPath(); g.rect(x - rx * 2, y - ry * 0.05, rx * 4, ry * 2); g.clip() } // heavy lids: lower half only
      // eye: dark brown, warm lighter iris at the bottom, glossy
      const gr = g.createLinearGradient(0, y - ry, 0, y + ry); gr.addColorStop(0, '#24140f'); gr.addColorStop(0.5, '#3d2418'); gr.addColorStop(0.85, '#8a5634'); gr.addColorStop(1, '#a8703f')
      g.fillStyle = gr; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); g.fill()
      g.fillStyle = 'rgba(20,10,8,.55)'; g.beginPath(); g.ellipse(x, y - ry * 0.05, rx * 0.5, ry * 0.55, 0, 0, Math.PI * 2); g.fill() // pupil
      g.strokeStyle = INK; g.lineWidth = 0.0011 * s; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); g.stroke()
      // highlights: one big upper, one small lower (sparkle when excited)
      g.fillStyle = '#fff'; g.beginPath(); g.ellipse(x + rx * 0.3, y - ry * 0.42, rx * 0.36, ry * 0.3, 0, 0, Math.PI * 2); g.fill()
      g.beginPath(); g.arc(x - rx * 0.38, y + ry * 0.4, rx * 0.16, 0, Math.PI * 2); g.fill()
      if (name === 'excited') { g.beginPath(); g.arc(x - rx * 0.1, y - ry * 0.05, rx * 0.12, 0, Math.PI * 2); g.fill() }
      g.restore()
      // upper lash line (thicker, flicks out at the outer corner)
      g.strokeStyle = INK; g.lineWidth = 0.0021 * s
      if (name === 'sleepy') { g.beginPath(); g.moveTo(x - rx * 1.08, y - ry * 0.02); g.quadraticCurveTo(x, y + ry * 0.12, x + rx * 1.08, y - ry * 0.02); g.stroke() }
      else { g.beginPath(); g.ellipse(x, y, rx * 1.02, ry * 1.02, 0, Math.PI * 1.08, Math.PI * 1.92); g.stroke()
        g.lineWidth = 0.0013 * s; g.beginPath(); g.moveTo(x + sd * rx * 0.92, y - ry * 0.45); g.lineTo(x + sd * rx * 1.3, y - ry * 0.72); g.stroke() }
    }
    // nose: a tiny warm dot
    g.fillStyle = 'rgba(222,140,120,.75)'; g.beginPath(); g.ellipse(px(0), py(-0.0215, k), 0.0011 * s, 0.0008 * s, 0, 0, Math.PI * 2); g.fill()
    // mouth
    const my = -0.0285; g.strokeStyle = '#7a2f28'; g.lineWidth = 0.0016 * s
    if (name === 'excited') { g.fillStyle = '#8a3530'; g.beginPath(); g.moveTo(px(-0.0055), py(my + 0.0012, k)); g.quadraticCurveTo(px(0), py(my + 0.0022, k), px(0.0055), py(my + 0.0012, k)); g.quadraticCurveTo(px(0.0045), py(my - 0.0072, k), px(0), py(my - 0.0075, k)); g.quadraticCurveTo(px(-0.0045), py(my - 0.0072, k), px(-0.0055), py(my + 0.0012, k)); g.fill()
      g.fillStyle = '#ef8a86'; g.beginPath(); g.ellipse(px(0), py(my - 0.0052, k), 0.0028 * s, 0.0018 * s, 0, 0, Math.PI * 2); g.fill() }
    else if (name === 'sleepy') { g.beginPath(); g.moveTo(px(-0.003), py(my, k)); g.quadraticCurveTo(px(0), py(my - 0.0012, k), px(0.003), py(my, k)); g.stroke() }
    else { g.beginPath(); g.moveTo(px(-0.0045), py(my + 0.0008, k)); g.quadraticCurveTo(px(0), py(my - 0.0034, k), px(0.0045), py(my + 0.0008, k)); g.stroke() }
    g.restore()
  })
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t
}
let atlas = null
const faceMat = () => new THREE.ShaderMaterial({ transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4,
  uniforms: { map: { value: atlas || (atlas = drawFaces(TOUCH ? 512 : 1024)) }, uCell: { value: 0 }, uLight: CEL_U.uLight, uAmb: CEL_U.uAmb },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
  fragmentShader: `uniform sampler2D map; uniform float uCell; uniform vec3 uLight, uAmb; varying vec2 vUv;
    void main(){ if (vUv.x < 0. || vUv.x > 1. || vUv.y < 0. || vUv.y > 1.) discard;
      vec4 c = texture2D(map, vec2(vUv.x, (3. - uCell + vUv.y) / 4.)); if (c.a < .01) discard;
      gl_FragColor = vec4(c.rgb*(uLight*.92 + uAmb), c.a);
      #include <colorspace_fragment>
    }` })
// the decal: the front of the head ellipsoid, lifted 1.5%, uv = planar front projection of the face region
const faceGeo = (() => { const g = new THREE.SphereGeometry(1, 24, 16, Math.PI * 0.18, Math.PI * 0.64, Math.PI * 0.36, Math.PI * 0.46)
  const p = g.attributes.position, uv = g.attributes.uv
  for (let i = 0; i < p.count; i++) { const x = p.getX(i) * HR[0] * 1.015, y = p.getY(i) * HR[1] * 1.015, z = p.getZ(i) * HR[2] * 1.015
    p.setXYZ(i, x, y, z); uv.setXY(i, x / FX * 0.5 + 0.5, (y - FY0) / (FY1 - FY0)) }
  g.computeVertexNormals(); return g })()

const EXCITED = new Set(['wave', 'play', 'reel', 'pick', 'pet', 'photo_wave', 'photo_peace', 'photo_hold_fish', 'photo_twirl', 'photo_kneel'])
function ChibiFace({ st, lod }) {
  const mat = useMemo(faceMat, []), s = useRef({ blinkT: 2, idle: 0 })
  useFrame((_, dt) => { dt = Math.min(dt, 0.05); const o = s.current
    o.idle = st.move > 0.05 || st.act ? 0 : o.idle + dt
    o.blinkT -= dt; if (o.blinkT < 0) o.blinkT = 2.4 + Math.random() * 2.6
    const forced = (typeof window !== 'undefined' && window.__chibiFace) || q.get('face')
    let e = st.act === 'nap' || (T.night > 0.7 && o.idle > 4) || o.idle > 25 ? 'sleepy' : st.act && EXCITED.has(st.act) && (st.actW ?? 1) > 0.3 ? 'excited' : 'happy'
    if (o.blinkT < 0.12 && e !== 'sleepy') e = 'blink'
    if (forced && FACES.includes(forced)) e = forced
    mat.uniforms.uCell.value = FACES.indexOf(e) })
  return <group ref={lod(2)}><mesh geometry={faceGeo} material={mat} renderOrder={2} /></group>
}

// ---------- hair: sculpted clumps ----------
// a clump: a sphere tapered to a soft point at -y, curled toward -z at the tip, flattened in z
function clumpGeo(taper = 0.62, curl = 0.35, flat = 0.6) {
  const g = new THREE.SphereGeometry(1, 10, 9), p = g.attributes.position
  for (let i = 0; i < p.count; i++) { let x = p.getX(i), y = p.getY(i), z = p.getZ(i); const t = (y + 1) / 2, w = 1 - taper * Math.pow(1 - t, 1.6)
    x *= w; z *= w * flat; z -= curl * Math.pow(1 - t, 2); p.setXYZ(i, x, y, z) }
  g.computeVertexNormals(); return g
}
const HG = (() => {
  const cap = new THREE.SphereGeometry(1, 28, 14, 0, Math.PI * 2, 0, Math.PI * 0.6)
  return { cap, clump: clumpGeo(0.82, -0.12, 0.62), lock: clumpGeo(0.75, 0.3, 0.55), ball: new THREE.SphereGeometry(1, 16, 11), ring: new THREE.TorusGeometry(1, 0.32, 6, 14) }
})()
// bangs: [angle around the head (rad, 0 = front), bottom y (tip), length, width, roll]
const BANGS = [[-1.04, -0.026, 0.056, 0.015, 0.25], [-0.72, 0.001, 0.04, 0.018, 0.22], [-0.42, 0.0025, 0.043, 0.019, 0.1], [-0.13, 0.0035, 0.045, 0.02, 0.03], [0.16, 0.0035, 0.045, 0.02, -0.04], [0.45, 0.002, 0.043, 0.019, -0.1], [0.74, 0.0, 0.04, 0.018, -0.22], [1.04, -0.026, 0.056, 0.015, -0.25]]
function ChibiHair({ h, set }) {
  const m = hairMat(h.c)
  return <group ref={set('hair')}><Merge><group userData={{ hair: 1 }}>
    {/* skull cap + back volume (the round bob), close to the head so the face stays big */}
    <M geo={HG.cap} mat={m} position={[0, 0.002, -0.004]} rotation={[-0.95, 0, 0]} scale={[0.0625, 0.058, 0.0615]} />
    <M geo={HG.ball} mat={m} position={[0, -0.002, -0.021]} scale={[0.0615, 0.0545, 0.05]} />
    {/* heavy bangs: rounded clumps with soft points, following the forehead */}
    {BANGS.map(([a, y0, l, w, rz], i) => { const side = Math.abs(a) > 0.9, r = side ? 0.056 : 0.0548 + Math.abs(a) * 0.002, cy = y0 + l * 0.5
      return <M key={i} geo={side ? HG.lock : HG.clump} mat={m} position={[Math.sin(a) * r, cy, Math.cos(a) * r - 0.004]} rotation={[side ? 0.12 : 0.5 - Math.abs(a) * 0.12, a, rz]} scale={[w, l * 0.5, 0.017]} /> })}
    {/* side puffs (round bunches below the ears) and the top bun */}
    {[-1, 1].map(x => <M key={x} geo={HG.ball} mat={m} position={[x * 0.056, -0.028, -0.015]} scale={[0.0205, 0.0225, 0.021]} />)}
    <M geo={HG.ball} mat={m} position={[0, 0.0635, -0.02]} scale={[0.019, 0.0175, 0.018]} />
    <M geo={HG.ring} mat={m} position={[0, 0.052, -0.016]} rotation={[Math.PI / 2 - 0.3, 0, 0]} scale={[0.0115, 0.0115, 0.01]} />
  </group></Merge></group>
}

export const CHIBI = { ...TRAVELLER, name: 'chibi-her', age: 'toddler',
  body: { head: 1.5, leg: 0.68, torso: 0.82, arm: 0.86, girth: 1.12, shoulder: 0.92, foot: 1.18, hand: 1.3 },
  hair: { style: 'chibi', c: '#3b2a22' },
  outfit: { ...TRAVELLER.outfit, top: '#fbf6ec', bottom: '#4f7cc4', shoe: '#7a4a2e', cuffs: '#6f98d4' },
  walk: { rate: 11, stride: 0.55, knee: 0.8, bounce: 0.02, arm: 0.6, lean: 0.05, twist: 0.1, sway: 0.06, idle: 'contra' },
  ext: { Face: ChibiFace, Hair: ChibiHair, knot: [0, -0.004, 0.006, 1.35], bag: [0.016, -0.01, -0.006, 1.15] } }
export function ChibiHer({ st }) { return <Character cfg={CHIBI} st={st} res={80} /> }
