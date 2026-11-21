// Round8: her house, inside, rebuilt after the cutaway concept (a warm rounded room seen from above its low front rim):
// wood stove + firewood back-left, kitchen counter under the arched window with the fridge and jar shelf, a desk and
// pegboard on the left wall, the pet corner front-left, a round table on a round rug in the middle, the bath nook behind
// an arch back-right, wardrobe + bed + nightstand on the right, and the front door in the rim with lanterns either side.
// Everything is in room units (she is ~0.41 tall), y up, floor at 0, camera looking toward -z. Static props go
// through <Merge> (one draw call per material).
import * as THREE from 'three'
import React, { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { HOME, ROOM, DOOR, wallH, wallAt } from './state.js'
import { O, GEO, tm, OUT, canvasTex } from './kit.jsx'
import { T, CC } from '../common.jsx'
import { toonRamp } from '../world.js'

export const W = { wall: '#f8dcc4', wallOut: '#c98552', cap: '#b06c3c', wain: '#d9a06a', wood: '#c98a55', dark: '#8a5634', light: '#e6b884', quilt: '#f2c45a', sheet: '#fff6ea', pot: '#f6f1e8', leaf: '#6fae4f', leaf2: '#93c95a', rug: '#f4e4cf', rug2: '#e6c9a8', iron: '#4d4852', orange: '#f08a3a', stone: '#efe2d0', cream: '#fbf1e0' }
export function Box({ p, s, c, paint = 0, out = OUT.room, rot, geo = GEO.box }) { return <O geo={geo} mat={tm(c, paint)} position={p} scale={s} rotation={rot} out={out} /> }
export const GLOW = new THREE.MeshBasicMaterial({ color: '#ffd58a', toneMapped: false })
const FIRE = new THREE.MeshBasicMaterial({ color: '#ff9a4a', toneMapped: false })

// ---------- the oval: boundary samples, openings ----------
const N = 480, T_ = 0.075 // wall thickness
const ring = (() => { const a = []; for (let i = 0; i < N; i++) { const t = i / N * Math.PI * 2; a.push(wallAt(Math.cos(t), Math.sin(t), {})) } return a })()
// side of the oval a point is on, and its coordinate along that side
// the wall's inner face: z on the back/front wall at a given x, x on the side walls at a given z
export const backZ = (x) => -ROOM.B * Math.pow(Math.max(0, 1 - Math.pow(Math.abs(x) / ROOM.A, ROOM.n)), 1 / ROOM.n)
export const sideX = (z) => ROOM.A * Math.pow(Math.max(0, 1 - Math.pow(Math.abs(z) / ROOM.B, ROOM.n)), 1 / ROOM.n)
const sideOf = (x, z) => Math.abs(x) / ROOM.A > Math.abs(z) / ROOM.B ? (x < 0 ? 'L' : 'R') : (z < 0 ? 'B' : 'F')
export const OPEN = [
  { side: 'L', c: 0.2, w: 0.34, y0: 0.4, ys: 0.64, arch: true }, // left window (sunbeam)
  { side: 'B', c: -0.12, w: 0.4, y0: 0.4, ys: 0.66, arch: true }, // kitchen window
  { side: 'B', c: 1.18, w: 0.15, y0: 0.55, ys: 0.69, round: true }, // bath porthole
  { side: 'F', c: 0, w: 0.34, y0: 0, ys: 9 }, // the doorway (the door has its own arched wall)
]
function holeAt(x, z, clampTo) {
  const sd = sideOf(x, z), u = sd === 'L' || sd === 'R' ? z : x
  for (const o of OPEN) { if (o.side !== sd) continue; let d = u - o.c; const r = o.w / 2
    if (Math.abs(d) >= r) { if (clampTo !== o) continue; d = Math.sign(d) * r * 0.999 }
    if (o.round) { const cy = (o.y0 + o.ys) / 2, rr = (o.ys - o.y0) / 2, k = Math.sqrt(Math.max(0, 1 - (d / r) ** 2)) * rr; return { o, y0: cy - k, y1: cy + k } }
    return { o, y0: o.y0, y1: o.arch ? o.ys + Math.sqrt(Math.max(0, r * r - d * d)) : o.ys } }
  return null
}
// wall faces: inner (plaster), outer + jambs + top (timber brown), built as one BufferGeometry each
function wallGeos() {
  const inner = [], outer = [], ni = [], no = []
  const v = new THREE.Vector3(), e1 = new THREE.Vector3(), e2 = new THREE.Vector3()
  const tri = (arr, nrm, a, b, c, n) => { e1.subVectors(b, a); e2.subVectors(c, a); v.crossVectors(e1, e2); if (v.dot(n) < 0) [b, c] = [c, b]; for (const p of [a, b, c]) { arr.push(p.x, p.y, p.z); nrm.push(n.x, n.y, n.z) } }
  const quad = (arr, nrm, a, b, c, d, n) => { tri(arr, nrm, a, b, c, n); tri(arr, nrm, a, c, d, n) }
  const P = (x, y, z) => new THREE.Vector3(x, y, z)
  for (let i = 0; i < N; i++) {
    const A = ring[i], B = ring[(i + 1) % N], mx = (A.x + B.x) / 2, mz = (A.z + B.z) / 2
    const oA = { x: A.x - A.nx * T_, z: A.z - A.nz * T_ }, oB = { x: B.x - B.nx * T_, z: B.z - B.nz * T_ }
    const hA = wallH(A.z), hB = wallH(B.z), nI = P((A.nx + B.nx) / 2, 0, (A.nz + B.nz) / 2).normalize(), nO = nI.clone().negate()
    const hole = holeAt(mx, mz)
    const spans = []
    if (hole) { const ha = holeAt(A.x, A.z, hole.o), hb = holeAt(B.x, B.z, hole.o); if (ha.y0 > 0) spans.push([0, 0, ha.y0, hb.y0]); if (ha.y1 < hA) spans.push([ha.y1, hb.y1, hA, hB])
      if (ha.y0 > 0) quad(outer, no, P(A.x, ha.y0, A.z), P(B.x, hb.y0, B.z), P(oB.x, hb.y0, oB.z), P(oA.x, ha.y0, oA.z), P(0, 1, 0)) // sill
      if (ha.y1 < hA) quad(outer, no, P(A.x, ha.y1, A.z), P(B.x, hb.y1, B.z), P(oB.x, hb.y1, oB.z), P(oA.x, ha.y1, oA.z), P(0, -1, 0)) // lintel / arch soffit
      const pm = ring[(i + N - 1) % N], nx = ring[(i + 2) % N] // jambs at the ends of the opening
      if (!holeAt((pm.x + A.x) / 2, (pm.z + A.z) / 2)) { const t = P(B.x - A.x, 0, B.z - A.z).normalize(); quad(outer, no, P(A.x, ha.y0, A.z), P(A.x, Math.min(ha.y1, hA), A.z), P(oA.x, Math.min(ha.y1, hA), oA.z), P(oA.x, ha.y0, oA.z), t) }
      if (!holeAt((nx.x + B.x) / 2, (nx.z + B.z) / 2)) { const t = P(A.x - B.x, 0, A.z - B.z).normalize(); quad(outer, no, P(B.x, hb.y0, B.z), P(B.x, Math.min(hb.y1, hB), B.z), P(oB.x, Math.min(hb.y1, hB), oB.z), P(oB.x, hb.y0, oB.z), t) }
    } else spans.push([0, 0, hA, hB])
    for (const [a0, b0, a1, b1] of spans) {
      quad(inner, ni, P(A.x, a0, A.z), P(B.x, b0, B.z), P(B.x, b1, B.z), P(A.x, a1, A.z), nI)
      quad(outer, no, P(oA.x, a0 - 0.14, oA.z), P(oB.x, b0 - 0.14, oB.z), P(oB.x, b1, oB.z), P(oA.x, a1, oA.z), nO)
    }
    if (!(hole && hole.o.side === 'F')) quad(outer, no, P(A.x, hA, A.z), P(B.x, hB, B.z), P(oB.x, hB, oB.z), P(oA.x, hA, oA.z), P(0, 1, 0)) // top
  }
  const mk = (p, n) => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(n, 3)); return g }
  return [mk(inner, ni), mk(outer, no)]
}
// chunky timber cap along the top of the wall, with a squat post every few blocks (the concept's rim)
function capBlocks() {
  const out = []; let acc = 0, last = ring[0], k = 0
  for (let i = 1; i <= N; i++) { const p = ring[i % N]; acc += Math.hypot(p.x - ring[(i - 1) % N].x, p.z - ring[(i - 1) % N].z)
    if (acc < 0.2 && i < N) continue
    const ax = last.x - last.nx * T_ / 2, az = last.z - last.nz * T_ / 2, bx = p.x - p.nx * T_ / 2, bz = p.z - p.nz * T_ / 2, mx = (ax + bx) / 2, mz = (az + bz) / 2
    if (!(mz > 0.5 && Math.abs(mx) < 0.34)) { // gap for the door
      const L = Math.hypot(bx - ax, bz - az), ha = wallH(last.z), hb = wallH(p.z)
      out.push({ p: [mx, (ha + hb) / 2 + 0.025, mz], s: [L + 0.012, 0.055, T_ + 0.045], rot: [0, Math.atan2(-(bz - az), bx - ax), Math.atan2(hb - ha, L)], post: k % 4 === 0 })
    }
    last = p; acc = 0; k++ }
  return out
}

// ---------- textures ----------
const planks = () => canvasTex(512, 512, (x) => { x.fillStyle = '#e9b88e'; x.fillRect(0, 0, 512, 512); for (let r = 0; r < 6; r++) { let px = -(r * 131) % 230; const H = 512 / 6; while (px < 512) { const w = 200 + ((r * 31 + px) % 7) * 22; const l = 0.94 + ((r * 13 + px * 7) % 5) * 0.025; x.fillStyle = `rgb(${236 * l | 0},${186 * l | 0},${142 * l | 0})`; x.fillRect(px + 2, r * H + 2, w - 4, H - 4); x.strokeStyle = 'rgba(170,110,70,.16)'; x.lineWidth = 2; for (let k = 0; k < 3; k++) { x.beginPath(); x.moveTo(px + 10, r * H + 18 + k * 22); x.bezierCurveTo(px + w * 0.3, r * H + 12 + k * 22, px + w * 0.6, r * H + 24 + k * 22, px + w - 10, r * H + 18 + k * 22); x.stroke() } x.fillStyle = 'rgba(160,100,62,.55)'; x.fillRect(px, r * H, 3, H); px += w } x.fillStyle = '#b77d55'; x.fillRect(0, r * H, 512, 3) } })
const view = (night) => canvasTex(256, 256, (x, w, h) => { const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#9fd0ee'); g.addColorStop(0.65, '#e9f6f0'); x.fillStyle = g; x.fillRect(0, 0, w, h)
  x.fillStyle = 'rgba(255,255,255,.95)'; for (const [cx, cy] of [[70, 60], [190, 90]]) for (let k = 0; k < 4; k++) { x.beginPath(); x.arc(cx + k * 16, cy - (k % 2) * 8, 16, 0, 7); x.fill() }
  x.fillStyle = '#8cc76a'; for (let k = 0; k < 9; k++) { x.beginPath(); x.arc(k * 34, 190 + (k % 3) * 10, 40, 0, 7); x.fill() }
  x.fillStyle = '#6fae55'; for (let k = 0; k < 8; k++) { x.beginPath(); x.arc(15 + k * 36, 232 + (k % 2) * 8, 34, 0, 7); x.fill() } void night })
const plaid = () => canvasTex(256, 256, (x) => { x.fillStyle = '#f7d06a'; x.fillRect(0, 0, 256, 256); x.fillStyle = 'rgba(232,164,52,.55)'; for (let i = 0; i < 8; i++) { x.fillRect(i * 32 + 4, 0, 12, 256); x.fillRect(0, i * 32 + 4, 256, 12) } x.fillStyle = 'rgba(255,250,235,.6)'; for (let i = 0; i < 8; i++) { x.fillRect(i * 32 + 22, 0, 3, 256); x.fillRect(0, i * 32 + 22, 256, 3) } })
const tiles = () => canvasTex(128, 128, (x) => { for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { x.fillStyle = (i + j) % 2 ? '#c4e0c0' : '#a9cfa6'; x.fillRect(i * 32, j * 32, 32, 32); x.strokeStyle = '#f6f2e8'; x.lineWidth = 3; x.strokeRect(i * 32, j * 32, 32, 32) } })
const gridMat = () => canvasTex(128, 96, (x, w, h) => { x.fillStyle = '#5f9f7a'; x.fillRect(0, 0, w, h); x.strokeStyle = 'rgba(230,250,235,.6)'; x.lineWidth = 2; for (let i = 8; i < w; i += 16) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, h); x.stroke() } for (let i = 8; i < h; i += 16) { x.beginPath(); x.moveTo(0, i); x.lineTo(w, i); x.stroke() } })
export const pictureTex = () => canvasTex(256, 200, (x, w, h) => { x.fillStyle = '#cfe6ff'; x.fillRect(0, 0, w, h); x.fillStyle = '#9fd17a'; x.beginPath(); x.arc(w / 2, h * 0.95, 120, 0, 7); x.fill(); x.fillStyle = '#d9655b'; x.beginPath(); x.moveTo(110, 92); x.lineTo(128, 70); x.lineTo(146, 92); x.fill(); x.fillStyle = '#fbf3e4'; x.fillRect(114, 92, 28, 22); x.fillStyle = '#4f9a5e'; for (const [a, b] of [[70, 120], [190, 110], [160, 150]]) { x.beginPath(); x.arc(a, b, 14, 0, 7); x.fill() } x.fillStyle = '#ffd36e'; x.beginPath(); x.arc(40, 40, 18, 0, 7); x.fill() })
const texMat = (t, rep) => { if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep, rep) } return new THREE.MeshToonMaterial({ map: t, gradientMap: toonRamp }) }

// ---------- arches ----------
// an arch (rectangle hr high, then a half circle of radius w/2) as a Shape or a hole Path
function arch(w, hr, y0 = 0, path) { const s = path ? new THREE.Path() : new THREE.Shape(), r = w / 2; s.moveTo(-r, y0); s.lineTo(r, y0); s.lineTo(r, y0 + hr); s.absarc(0, y0 + hr, r, 0, Math.PI, false); s.lineTo(-r, y0); return s }
const ext = (shape, d, bevel = 0) => { const g = new THREE.ExtrudeGeometry(shape, { depth: d, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 18 }); g.computeVertexNormals(); return g }
// arched frame (ring) for windows and doorways: inner opening w x (hr + w/2), frame f wide, d deep, centred on its back face
function archFrame(w, hr, f, d) { const s = arch(w + 2 * f, hr, -f); s.holes.push(arch(w, hr, 0, true)); return ext(s, d) }

// ---------- pieces ----------
function Walls() {
  const [gi, go] = useMemo(wallGeos, []), caps = useMemo(capBlocks, [])
  return <group>
    <mesh geometry={gi} material={tm(W.wall, 0.05)} />
    <mesh geometry={go} material={tm(W.wallOut, 0.1)} />
    {caps.map((c, i) => <group key={i} position={c.p} rotation={[...c.rot, 'YZX']}>
      <O geo={GEO.box} mat={tm(W.cap)} scale={c.s} out={OUT.room} />
      {c.post && <O geo={GEO.box} mat={tm(W.dark)} position={[0, 0.02, 0]} scale={[0.09, 0.1, T_ + 0.07]} out={OUT.room} />}
    </group>)}
  </group>
}
// the floor (a tap target for walking) and the plinth the room sits on
const shapeOf = (grow = 0) => { const s = new THREE.Shape(); ring.forEach((p, i) => { const x = p.x - p.nx * grow, z = p.z - p.nz * grow; if (i) s.lineTo(x, -z); else s.moveTo(x, -z) }); return s }
export function Floor({ onDown }) {
  const [geo, mat, base] = useMemo(() => { const g = new THREE.ShapeGeometry(shapeOf(0.01), 1); g.rotateX(-Math.PI / 2); const b = ext(shapeOf(0.2), 0.16); b.rotateX(-Math.PI / 2); b.translate(0, -0.166, 0); return [g, texMat(planks(), 1.9), b] }, [])
  return <group>
    <mesh geometry={geo} material={mat} onPointerDown={onDown} />
    <O geo={base} mat={tm('#e2c3a0')} out={OUT.room} />
  </group>
}
// a soft gradient void around the cutaway (lavender to peach by day, deep plum at night), plus a contact shadow
export function Backdrop() {
  const m = useMemo(() => new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, toneMapped: false, uniforms: { uTop: { value: new THREE.Color() }, uBot: { value: new THREE.Color() } },
    vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: 'uniform vec3 uTop; uniform vec3 uBot; varying vec3 vP; void main(){ float k = smoothstep(-.35,.6,normalize(vP).y); gl_FragColor = vec4(mix(uBot,uTop,k),1.);\n#include <colorspace_fragment>\n}' }), [])
  const sh = useMemo(() => new THREE.MeshBasicMaterial({ color: '#6a4a5a', transparent: true, opacity: 0.18, depthWrite: false }), [])
  const a = useMemo(() => new THREE.Color(), []), b = useMemo(() => new THREE.Color(), [])
  useFrame(() => { a.set('#efe3f6').lerp(CC('#f8d2bc'), T.dusk * 0.7).lerp(CC('#2e2c52'), T.night * 0.9); b.set('#f6d6e2').lerp(CC('#f0b89a'), T.dusk * 0.6).lerp(CC('#4a3658'), T.night * 0.9); m.uniforms.uTop.value.copy(a); m.uniforms.uBot.value.copy(b) })
  return <group>
    <mesh material={m} renderOrder={-10}><sphereGeometry args={[7, 24, 16]} /></mesh>
    <mesh material={sh} position={[0, -0.17, 0.05]} rotation={[-Math.PI / 2, 0, 0]} scale={[ROOM.A + 0.45, ROOM.B + 0.45, 1]}><circleGeometry args={[1, 40]} /></mesh>
  </group>
}
// windows: arched frames, sills, the outside view behind each, curtains on the kitchen window
export function Windows() {
  const vm = useMemo(() => new THREE.MeshBasicMaterial({ map: view(), toneMapped: false }), [])
  const frames = useMemo(() => OPEN.filter(o => o.arch).map(o => archFrame(o.w, o.ys - o.y0, 0.035, 0.03)), [])
  const curtain = useRef()
  useFrame(() => { vm.color.setRGB(1, 1, 1).lerp(CC('#ffc49a'), T.dusk * 0.6).lerp(CC('#2a3366'), T.night * 0.85); const t = performance.now() / 1000; if (curtain.current) curtain.current.children.forEach((c, i) => { c.rotation.z = (i ? -1 : 1) * Math.sin(t * 0.8 + i) * 0.03 }) })
  const L = OPEN[0], K = OPEN[1], P = OPEN[2], lx = -ROOM.A, kz = -ROOM.B
  return <group>
    {/* left window: faces +x */}
    <group position={[lx + 0.005, L.y0, L.c]} rotation={[0, Math.PI / 2, 0]}>
      <O geo={frames[0]} mat={tm(W.light)} out={OUT.fine} />
      <mesh material={vm} position={[0, 0.25, -0.12]}><planeGeometry args={[0.6, 0.7]} /></mesh>
      <Box p={[0, 0.17, 0.015]} s={[0.02, 0.34, 0.015]} c={W.light} out={null} /><Box p={[0, 0.2, 0.015]} s={[0.3, 0.018, 0.015]} c={W.light} out={null} />
      <Box p={[0, -0.012, 0.05]} s={[0.44, 0.025, 0.1]} c={W.wood} />
    </group>
    {/* kitchen window over the sink: faces +z */}
    <group position={[K.c, K.y0, kz + 0.005]}>
      <O geo={frames[1]} mat={tm(W.light)} out={OUT.fine} />
      <mesh material={vm} position={[0, 0.27, -0.12]}><planeGeometry args={[0.7, 0.7]} /></mesh>
      <Box p={[0, 0.19, 0.015]} s={[0.02, 0.38, 0.015]} c={W.light} out={null} /><Box p={[0, 0.22, 0.015]} s={[0.38, 0.018, 0.015]} c={W.light} out={null} />
      <Box p={[0, -0.012, 0.045]} s={[0.5, 0.022, 0.09]} c={W.wood} />
      <Box geo={GEO.cyl} p={[0, 0.55, 0.06]} s={[0.008, 0.72, 0.008]} rot={[0, 0, Math.PI / 2]} c={W.dark} out={null} />
      {[-1, 1].map(s => <Box key={s} geo={GEO.sph} p={[s * 0.36, 0.55, 0.06]} s={0.018} c={W.dark} out={null} />)}
      {[...Array(6)].map((_, i) => <Box key={i} geo={GEO.tor} p={[(i < 3 ? -0.3 : 0.2) + (i % 3) * 0.05, 0.55, 0.06]} s={[0.012, 0.012, 0.012]} c={W.cream} out={null} />)}
      <group ref={curtain}>{[-1, 1].map(s => <group key={s} position={[s * 0.27, 0.55, 0.075]}>
        <O geo={GEO.pillow} mat={tm(W.cream)} position={[0, -0.22, 0]} scale={[0.11, 0.44, 0.03]} out={OUT.fine} />
        <Box geo={GEO.tor} p={[s * -0.005, -0.25, 0.012]} s={[0.04, 0.02, 0.03]} c={'#f2b04a'} out={null} />
      </group>)}</group>
    </group>
    {/* bath porthole */}
    <group position={[P.c, (P.y0 + P.ys) / 2, backZ(P.c) + 0.005]}>
      <O geo={GEO.tor} mat={tm(W.light)} scale={[0.082, 0.082, 0.06]} out={OUT.fine} />
      <mesh material={vm} position={[0, 0, -0.1]}><planeGeometry args={[0.3, 0.3]} /></mesh>
    </group>
  </group>
}
// the low sun through the left window: a soft beam, a bright patch on the floor, dust motes (daytime only)
export const SUN_DIR = new THREE.Vector3(0.8, -0.55, -0.35) // light travel direction inside the room (HOME.sun points the other way)
export const beamAt = (y, z) => { const t = y / -SUN_DIR.y; return [-ROOM.A + SUN_DIR.x * t, z + SUN_DIR.z * t] }
export function Sunbeam() {
  const L = OPEN[0], wx = -ROOM.A, za = L.c - L.w / 2 + 0.02, zb = L.c + L.w / 2 - 0.02, ya = L.y0 + 0.01, yb = L.ys + 0.12
  const m = useMemo(() => new THREE.MeshBasicMaterial({ color: '#fff0b8', transparent: true, opacity: 0.16, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false }), [])
  const fl = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ffe7a0', transparent: true, opacity: 0.3, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }), [])
  const [geo, floor] = useMemo(() => { const a = [[wx, yb, za], [wx, yb, zb], [wx, ya, zb], [wx, ya, za]], b = a.map(([, y, z]) => { const [x, zz] = beamAt(y, z); return [x, 0.004, zz] }); const v = []; for (let i = 0; i < 4; i++) { const j = (i + 1) % 4; v.push(...a[i], ...a[j], ...b[j], ...a[i], ...b[j], ...b[i]) } const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3))
    const f = new THREE.BufferGeometry(); f.setAttribute('position', new THREE.Float32BufferAttribute([...b[0], ...b[1], ...b[2], ...b[0], ...b[2], ...b[3]], 3)); return [g, f] }, [])
  const motes = useMemo(() => { const p = []; for (let i = 0; i < 40; i++) { const y = ya + Math.random() * (yb - ya), z = za + Math.random() * (zb - za), u = Math.random(), [x1, z1] = beamAt(y, z); p.push(wx + (x1 - wx) * u, y * (1 - u), z + (z1 - z) * u) } const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); return g }, [])
  const mm = useMemo(() => new THREE.PointsMaterial({ color: '#fff6d0', size: 0.012, transparent: true, opacity: 0.8, depthWrite: false, toneMapped: false }), [])
  const mref = useRef()
  useFrame(() => { const d = Math.max(0, T.day - T.night); m.opacity = 0.09 * d + 0.03 * T.dusk; fl.opacity = 0.2 * d; mm.opacity = 0.8 * d; if (mref.current) mref.current.position.y = Math.sin(performance.now() / 3000) * 0.01 })
  return <group><mesh geometry={geo} material={m} renderOrder={3} /><mesh geometry={floor} material={fl} renderOrder={2} /><points ref={mref} geometry={motes} material={mm} /></group>
}

// back-left: cast-iron wood stove on a stone hearth, chimney into the wall, firewood, a shelf of books
export function Stove() {
  const fire = useRef()
  useFrame(() => { const t = performance.now() / 1000; FIRE.color.setRGB(1, 0.58 + Math.sin(t * 7) * 0.05 + Math.sin(t * 13) * 0.04, 0.25); if (fire.current) fire.current.scale.setScalar(1 + Math.sin(t * 9) * 0.06) })
  const x = -1.06, z = -0.84
  return <group>
    <group position={[x, 0, z]}>
      <Box geo={GEO.cyl} p={[0, 0.012, 0.02]} s={[0.24, 0.024, 0.22]} c={W.stone} />
      {[-1, 1].flatMap(sx => [-1, 1].map(sz => <Box key={sx + ',' + sz} geo={GEO.cyl} p={[sx * 0.08, 0.04, sz * 0.06]} s={[0.014, 0.04, 0.014]} c={W.iron} out={null} />))}
      <Box geo={GEO.pillow} p={[0, 0.15, 0]} s={[0.23, 0.2, 0.19]} c={W.iron} />
      <Box p={[0, 0.258, 0]} s={[0.25, 0.022, 0.21]} c={'#3d3940'} />
      <group position={[0, 0.14, 0.097]}>
        <mesh material={FIRE} ref={fire}><circleGeometry args={[0.055, 18]} /></mesh>
        <Box geo={GEO.tor} p={[0, 0, 0.004]} s={[0.06, 0.06, 0.05]} c={'#2e2a30'} out={null} />
        {[0, 1, 2].map(i => <mesh key={i} material={GLOW} position={[(i - 1) * 0.022, -0.02 + (i % 2) * 0.012, 0.003]}><circleGeometry args={[0.014, 10]} /></mesh>)}
      </group>
      <Box geo={GEO.cyl} p={[0, 0.58, -0.02]} s={[0.04, 0.62, 0.04]} c={W.iron} />
      <Box geo={GEO.sph} p={[0, 0.89, -0.02]} s={0.045} c={W.iron} out={null} />
      <Box geo={GEO.cyl} p={[0, 0.89, -0.13]} s={[0.04, 0.22, 0.04]} rot={[Math.PI / 2, 0, 0]} c={W.iron} />
      <Box geo={GEO.cyl} p={[0, 0.89, -0.2]} s={[0.055, 0.03, 0.055]} rot={[Math.PI / 2, 0, 0]} c={'#3d3940'} out={null} />
    </group>
    <group position={[-0.72, 0, -0.97]}>{[[0, 0], [1, 0], [2, 0], [0.5, 1], [1.5, 1], [1, 2]].map(([i, r], k) => <group key={k} position={[-0.07 + i * 0.07, 0.034 + r * 0.06, 0]}>
      <Box geo={GEO.cyl} p={[0, 0, 0]} s={[0.034, 0.2, 0.034]} rot={[Math.PI / 2, 0, 0]} c={k % 2 ? '#b0703f' : '#9a5e36'} out={OUT.fine} />
      <mesh material={tm('#f0c890')} position={[0, 0, 0.101]}><circleGeometry args={[0.027, 12]} /></mesh></group>)}</group>
  </group>
}
const BOOKC = ['#d9655b', '#5f8fc4', '#e8a24a', '#8cc084', '#c97b9a', '#f6ead2', '#7a5236', '#4f9a5e']
function BookShelf() {
  const books = useMemo(() => { const a = []; let s = 7; const r = () => (s = (s * 16807) % 2147483647) / 2147483647; let x = -0.18; while (x < 0.03) { const w = 0.022 + r() * 0.016, h = 0.08 + r() * 0.05; a.push({ x: x + w / 2, h, w, c: BOOKC[Math.floor(r() * 8)] }); x += w + 0.003 } return a }, [])
  return <group position={[-0.68, 0.62, -1.03]}>
    <Box p={[0, 0, 0]} s={[0.42, 0.022, 0.13]} c={W.wood} />
    {[-0.15, 0.15].map(x => <Box key={x} p={[x, -0.05, -0.03]} s={[0.02, 0.08, 0.06]} c={W.dark} out={null} />)}
    {books.map((b, i) => <O key={i} geo={GEO.box} mat={tm(b.c)} position={[b.x, 0.011 + b.h / 2, 0]} scale={[b.w, b.h, 0.09]} rotation={[0, 0, i === books.length - 1 ? -0.25 : 0]} out={OUT.fine} />)}
    {[0, 1, 2].map(i => <Box key={i} p={[0.1, 0.022 + i * 0.024, 0]} s={[0.1 - i * 0.008, 0.022, 0.08]} rot={[0, i * 0.3, 0]} c={['#8cc084', '#f6ead2', '#d9655b'][i]} out={OUT.fine} />)}
  </group>
}

// back wall: counter with drawers, sink, cooktop (the pot is in Activities), fridge, jar shelf, hanging lantern
export function Kitchen() {
  const cx = -0.06, z = -0.96
  return <group>
    <Box p={[cx, 0.1, z]} s={[0.86, 0.2, 0.25]} c={W.wood} paint={0.1} />
    <Box p={[cx, 0.212, z + 0.005]} s={[0.9, 0.025, 0.27]} c={'#f0d4ac'} />
    {[-0.39, -0.17, 0.05, 0.27].map((x, i) => <group key={x}>
      <Box p={[x, i === 1 ? 0.095 : 0.14, z + 0.128]} s={[0.19, i === 1 ? 0.16 : 0.07, 0.012]} c={W.light} out={OUT.fine} />
      {i !== 1 && <Box p={[x, 0.06, z + 0.128]} s={[0.19, 0.07, 0.012]} c={W.light} out={OUT.fine} />}
      <Box geo={GEO.sph} p={[x, i === 1 ? 0.15 : 0.14, z + 0.14]} s={0.011} c={'#8a5634'} out={null} />
      {i !== 1 && <Box geo={GEO.sph} p={[x, 0.06, z + 0.14]} s={0.011} c={'#8a5634'} out={null} />}
    </group>)}
    {/* sink + tap */}
    <Box p={[-0.12, 0.222, z]} s={[0.22, 0.012, 0.16]} c={'#fbf8f2'} />
    <Box p={[-0.12, 0.226, z]} s={[0.17, 0.006, 0.11]} c={'#b9d3dc'} out={null} />
    <Box geo={GEO.cyl} p={[-0.12, 0.27, z - 0.075]} s={[0.009, 0.1, 0.009]} c={'#cfc8bd'} out={OUT.fine} />
    <Box p={[-0.12, 0.315, z - 0.045]} s={[0.014, 0.014, 0.065]} c={'#cfc8bd'} out={OUT.fine} />
    {[-1, 1].map(s => <Box key={s} geo={GEO.cyl} p={[-0.12 + s * 0.035, 0.24, z - 0.075]} s={[0.012, 0.02, 0.012]} c={'#cfc8bd'} out={null} />)}
    {/* cooktop */}
    <Box p={[0.18, 0.228, z]} s={[0.2, 0.012, 0.16]} c={'#3a3438'} />
    <Box geo={GEO.tor} p={[0.18, 0.236, z]} s={[0.05, 0.05, 0.02]} rot={[Math.PI / 2, 0, 0]} c={'#58505a'} out={null} />
    {[0, 1].map(i => <Box key={i} geo={GEO.cyl} p={[0.12 + i * 0.12, 0.2, z + 0.128]} s={[0.012, 0.01, 0.012]} rot={[Math.PI / 2, 0, 0]} c={'#3a3438'} out={null} />)}
    {/* bottles + a sponge */}
    {[[-0.3, '#cfe6c8', 0.07], [-0.26, '#f6c8b0', 0.055]].map(([x, c, h]) => <group key={x} position={[x, 0.224, z - 0.06]}><Box geo={GEO.cyl} p={[0, h / 2, 0]} s={[0.016, h, 0.016]} c={c} out={OUT.fine} /><Box geo={GEO.cyl} p={[0, h + 0.008, 0]} s={[0.008, 0.016, 0.008]} c={W.dark} out={null} /></group>)}
    <Box geo={GEO.pillow} p={[0.02, 0.232, z + 0.02]} s={[0.05, 0.02, 0.035]} c={'#f2c46a'} out={OUT.fine} />
    {/* fridge */}
    <group position={[0.56, 0, -0.97]}>
      <Box geo={GEO.pillow} p={[0, 0.235, 0]} s={[0.26, 0.47, 0.21]} c={'#fbf3e4'} />
      <Box p={[0, 0.3, 0.104]} s={[0.24, 0.006, 0.006]} c={'#d8cbb6'} out={null} />
      {[0.38, 0.18].map(y => <Box key={y} p={[-0.1, y, 0.11]} s={[0.012, 0.08, 0.014]} c={'#cbbba2'} out={OUT.fine} />)}
      <group position={[0.04, 0.38, 0.108]}><mesh material={tm('#ffffff')}><circleGeometry args={[0.022, 14]} /></mesh>{[-1, 1].map(s => <mesh key={s} material={tm('#ffffff')} position={[s * 0.013, 0.02, 0]} rotation={[0, 0, s * -0.3]}><circleGeometry args={[0.009, 3]} /></mesh>)}{[-1, 1].map(s => <mesh key={'e' + s} material={tm('#3a2a22')} position={[s * 0.008, 0.002, 0.001]}><circleGeometry args={[0.003, 6]} /></mesh>)}</group>
    </group>
    {/* jar shelf with hooks */}
    <group position={[0.4, 0.68, -1.04]}>
      <Box p={[0, 0, 0]} s={[0.5, 0.02, 0.11]} c={W.wood} />
      {[-0.2, 0.2].map(x => <Box key={x} p={[x, -0.04, -0.02]} s={[0.02, 0.07, 0.06]} c={W.dark} out={null} />)}
      {[-0.17, -0.06, 0.05, 0.16].map((x, i) => <group key={x} position={[x, 0.01, 0]}>
        <Box geo={GEO.cyl} p={[0, 0.045, 0]} s={[0.035, 0.08, 0.035]} c={'#f6f0e2'} out={OUT.fine} />
        <Box geo={GEO.cyl} p={[0, 0.03, 0]} s={[0.03, 0.05, 0.03]} c={['#f2c46a', '#e8a24a', '#c98a55', '#f6c8b0'][i]} out={null} />
        <Box geo={GEO.cyl} p={[0, 0.092, 0]} s={[0.037, 0.014, 0.037]} c={W.wood} out={null} />
      </group>)}
      {[-0.15, -0.05, 0.05].map((x, i) => <group key={x} position={[x, -0.03, 0.04]}><Box p={[0, 0, 0]} s={[0.004, 0.03, 0.004]} c={W.dark} out={null} />
        {i === 1 ? <Box geo={GEO.cyl} p={[0, -0.05, 0]} s={[0.006, 0.08, 0.006]} c={W.wood} out={null} /> : <Box geo={GEO.cyl} p={[0, -0.035, 0]} s={[0.02, 0.03, 0.02]} c={i ? '#8fc3e8' : '#f6f0e2'} out={OUT.fine} />}</group>)}
    </group>
    <BookShelf />
  </group>
}
// a lantern (stone or wooden base given by the caller): glowing core inside a little dark cage with a roof
export function Lantern({ p, s = 1, hang }) {
  return <group position={p} scale={s}>
    {hang && <Box p={[0, 0.13, 0]} s={[0.004, 0.1, 0.004]} c={W.iron} out={null} />}
    <Box geo={GEO.cyl} p={[0, 0.006, 0]} s={[0.035, 0.012, 0.035]} c={W.dark} out={OUT.fine} />
    <mesh material={GLOW} position={[0, 0.04, 0]} scale={[0.026, 0.034, 0.026]} geometry={GEO.sphL} />
    {[0, 1, 2, 3].map(i => <Box key={i} p={[Math.cos(i * Math.PI / 2 + 0.785) * 0.03, 0.04, Math.sin(i * Math.PI / 2 + 0.785) * 0.03]} s={[0.006, 0.07, 0.006]} c={W.dark} out={null} />)}
    <Box geo={GEO.cone4} p={[0, 0.088, 0]} s={[0.047, 0.035, 0.047]} rot={[0, 0.785, 0]} c={W.dark} out={OUT.fine} />
    <Box geo={GEO.tor} p={[0, 0.112, 0]} s={[0.01, 0.01, 0.01]} c={W.dark} out={null} />
  </group>
}

// left wall: desk with a cutting mat, pencil cup, box and lamp; pegboard of tools; a stool
export const STOOL = { x: -1.05, z: -0.45, h: 0.13 }
export function Desk() {
  const gm = useMemo(() => texMat(gridMat()), [])
  return <group>
    <group position={[-1.38, 0, -0.45]}>
      <Box p={[0, 0.235, 0]} s={[0.32, 0.024, 0.56]} c={W.light} paint={0.1} />
      <Box p={[-0.01, 0.112, -0.17]} s={[0.28, 0.22, 0.18]} c={W.wood} />
      {[0.06, 0.15].map(y => <group key={y}><Box p={[0.131, y, -0.17]} s={[0.012, 0.075, 0.16]} c={W.light} out={OUT.fine} /><Box geo={GEO.sph} p={[0.14, y, -0.17]} s={0.01} c={W.dark} out={null} /></group>)}
      {[-1, 1].map(s => <Box key={s} p={[s * 0.13, 0.112, 0.24]} s={[0.03, 0.224, 0.03]} c={W.wood} />)}
      <mesh material={gm} position={[0.02, 0.248, 0.06]} rotation={[-Math.PI / 2, 0, 0.1]}><planeGeometry args={[0.2, 0.15]} /></mesh>
      <Box geo={GEO.pillow} p={[-0.03, 0.276, -0.17]} s={[0.12, 0.06, 0.1]} c={'#f2e2c4'} out={OUT.fine} />
      <Box p={[-0.03, 0.3, -0.17]} s={[0.125, 0.012, 0.105]} c={'#e2cda8'} out={null} />
      <group position={[-0.08, 0.247, 0.21]}><Box geo={GEO.cyl} p={[0, 0.03, 0]} s={[0.022, 0.06, 0.022]} c={'#e8a24a'} out={OUT.fine} />{[0, 1, 2].map(i => <Box key={i} geo={GEO.cyl} p={[Math.cos(i * 2) * 0.008, 0.075, Math.sin(i * 2) * 0.008]} s={[0.004, 0.06, 0.004]} rot={[Math.sin(i * 2) * 0.2, 0, Math.cos(i * 2) * 0.2]} c={['#d9655b', '#5f8fc4', '#ffd36e'][i]} out={null} />)}</group>
      {/* brass desk lamp */}
      <group position={[-0.09, 0.247, 0.13]}>
        <Box geo={GEO.cyl} p={[0, 0.006, 0]} s={[0.04, 0.012, 0.04]} c={'#d4a24a'} out={OUT.fine} />
        <Box geo={GEO.cyl} p={[0.015, 0.06, 0]} s={[0.006, 0.11, 0.006]} rot={[0, 0, -0.3]} c={'#d4a24a'} out={null} />
        <Box geo={GEO.cyl} p={[0.06, 0.12, 0]} s={[0.006, 0.09, 0.006]} rot={[0, 0, 1.1]} c={'#d4a24a'} out={null} />
        <Box geo={GEO.half} p={[0.1, 0.12, 0]} s={[0.035, 0.03, 0.035]} rot={[0, 0, Math.PI * 0.85]} c={'#d4a24a'} out={OUT.fine} />
        <mesh material={GLOW} position={[0.104, 0.112, 0]} geometry={GEO.sphL} scale={0.016} />
      </group>
    </group>
    {/* pegboard */}
    <group position={[-ROOM.A + 0.012, 0.52, -0.45]} rotation={[0, Math.PI / 2, 0]}>
      <Box p={[0, 0, 0]} s={[0.42, 0.26, 0.016]} c={'#e2b07a'} />
      {[-1, 1].map(s => <Box key={s} p={[s * 0.21, 0, 0.004]} s={[0.022, 0.28, 0.024]} c={W.dark} out={null} />)}
      {[-1, 1].map(s => <Box key={'h' + s} p={[0, s * 0.13, 0.004]} s={[0.44, 0.022, 0.024]} c={W.dark} out={null} />)}
      {[-0.15, -0.075, 0, 0.075, 0.15].map((x, i) => <group key={x} position={[x, 0.07, 0.014]}>
        <Box geo={GEO.sph} p={[0, 0.02, 0]} s={0.006} c={W.dark} out={null} />
        <Box p={[0, -0.04, 0]} s={[0.012, 0.11, 0.008]} c={i % 2 ? '#7a6a64' : '#5d5560'} out={OUT.fine} />
        {i % 2 ? <Box geo={GEO.tor} p={[0, -0.105, 0]} s={[0.018, 0.018, 0.02]} c={'#7a6a64'} out={null} /> : <Box geo={GEO.cyl} p={[0, 0.0, 0]} s={[0.012, 0.045, 0.012]} c={['#d9655b', '#e8a24a', '#5f8fc4'][i / 2]} out={null} />}
      </group>)}
    </group>
    <group position={[STOOL.x, 0, STOOL.z]}>
      <Box geo={GEO.cyl} p={[0, STOOL.h - 0.012, 0]} s={[0.07, 0.024, 0.07]} c={W.light} paint={0.12} />
      {[0, 1, 2].map(k => <Box key={k} geo={GEO.cyl} p={[Math.cos(k * 2.1) * 0.045, STOOL.h / 2 - 0.01, Math.sin(k * 2.1) * 0.045]} s={[0.01, STOOL.h - 0.01, 0.01]} c={W.wood} rot={[Math.sin(k * 2.1) * 0.15, 0, -Math.cos(k * 2.1) * 0.15]} />)}
    </group>
  </group>
}

// front-left: Mochi's round bed with a bone and a paw print
export const PETBED = { x: -0.95, z: 0.55, r: 0.15 }
export function PetCorner() {
  return <group position={[PETBED.x, 0, PETBED.z]}>
    <Box geo={GEO.cyl} p={[0, 0.03, 0]} s={[PETBED.r + 0.02, 0.06, PETBED.r + 0.02]} c={'#c98552'} />
    <O geo={GEO.tor} mat={tm('#e0a066')} position={[0, 0.07, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[PETBED.r - 0.005, PETBED.r - 0.005, 0.07]} out={OUT.room} />
    <Box geo={GEO.cyl} p={[0, 0.055, 0]} s={[PETBED.r - 0.03, 0.03, PETBED.r - 0.03]} c={'#fbf1e0'} out={null} />
    <group position={[0.06, 0.075, -0.03]} rotation={[0, 0.5, 0]}><Box geo={GEO.cyl} p={[0, 0, 0]} s={[0.008, 0.06, 0.008]} rot={[0, 0, Math.PI / 2]} c={'#fbf6ee'} out={OUT.fine} />{[-1, 1].flatMap(s => [-1, 1].map(t => <Box key={s + ',' + t} geo={GEO.sph} p={[s * 0.03, 0, t * 0.008]} s={0.011} c={'#fbf6ee'} out={null} />))}</group>
    <group position={[0, 0.055, PETBED.r + 0.021]}><mesh material={tm('#f6e2c8')} scale={0.022}><circleGeometry args={[1, 14]} /></mesh>{[-1.4, -0.5, 0.5, 1.4].map(a => <mesh key={a} material={tm('#f6e2c8')} position={[Math.sin(a * 0.5) * 0.03, 0.022 + Math.cos(a) * 0.004, 0]} scale={0.009}><circleGeometry args={[1, 10]} /></mesh>)}</group>
  </group>
}

// centre: round rug, a round three-legged table with a runner, flowers and a lantern, two poufs
export const TABLE = { x: 0.05, z: 0.1, r: 0.2, h: 0.17 }
export function Table() {
  return <group>
    <group position={[TABLE.x, 0, TABLE.z + 0.02]}>
      <mesh position={[0, 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]} material={tm(W.rug2)} scale={[0.66, 0.52, 1]}><circleGeometry args={[1, 48]} /></mesh>
      <mesh position={[0, 0.004, 0]} rotation={[-Math.PI / 2, 0, 0]} material={tm(W.rug)} scale={[0.62, 0.48, 1]}><circleGeometry args={[1, 48]} /></mesh>
      <mesh position={[0, 0.006, 0]} rotation={[-Math.PI / 2, 0, 0]} material={tm(W.rug2)} scale={[0.5, 0.38, 1]}><ringGeometry args={[0.95, 1, 48]} /></mesh>
    </group>
    <group position={[TABLE.x, 0, TABLE.z]}>
      <Box geo={GEO.cyl} p={[0, TABLE.h - 0.016, 0]} s={[TABLE.r, 0.032, TABLE.r]} c={W.wood} paint={0.12} />
      <Box geo={GEO.cyl} p={[0, TABLE.h - 0.04, 0]} s={[TABLE.r - 0.03, 0.02, TABLE.r - 0.03]} c={W.dark} out={null} />
      {[0, 1, 2].map(k => <Box key={k} geo={GEO.cyl} p={[Math.cos(k * 2.1 + 0.5) * 0.11, (TABLE.h - 0.04) / 2, Math.sin(k * 2.1 + 0.5) * 0.11]} s={[0.022, TABLE.h - 0.04, 0.022]} rot={[Math.sin(k * 2.1 + 0.5) * 0.16, 0, -Math.cos(k * 2.1 + 0.5) * 0.16]} c={W.wood} />)}
      <Box p={[0, TABLE.h + 0.002, 0]} s={[0.28, 0.004, 0.12]} c={W.cream} out={OUT.fine} rot={[0, 0.25, 0]} />
      {/* vase of white daisies */}
      <group position={[0.01, TABLE.h, -0.06]}>
        <Box geo={GEO.sph} p={[0, 0.032, 0]} s={[0.03, 0.035, 0.03]} c={'#fbf8f2'} out={OUT.fine} />
        <Box geo={GEO.cyl} p={[0, 0.07, 0]} s={[0.014, 0.02, 0.014]} c={'#fbf8f2'} out={null} />
        {[...Array(7)].map((_, i) => { const a = i * 0.9, r = i ? 0.035 : 0; return <group key={i} position={[Math.cos(a) * r, 0.1 + (i % 3) * 0.012, Math.sin(a) * r]}>
          <Box geo={GEO.sph} p={[0, 0, 0]} s={[0.022, 0.009, 0.022]} c={'#ffffff'} out={OUT.fine} /><Box geo={GEO.sph} p={[0, 0.006, 0]} s={0.008} c={'#ffd36e'} out={null} /></group> })}
        {[0, 1, 2, 3].map(i => <O key={'l' + i} geo={GEO.sph} mat={tm(W.leaf)} position={[Math.cos(i * 1.6) * 0.03, 0.085, Math.sin(i * 1.6) * 0.03]} scale={[0.018, 0.007, 0.03]} rotation={[0.5, i * 1.6, 0]} out={null} />)}
      </group>
      <Lantern p={[0.12, TABLE.h, -0.02]} s={0.75} />
    </group>
    {[[-0.32, 0.12], [0.42, 0.12]].map(([x, z]) => <group key={x} position={[x, 0, z]}>
      <Box geo={GEO.cyl} p={[0, 0.045, 0]} s={[0.088, 0.085, 0.088]} c={'#eea04a'} />
      <Box geo={GEO.pillow} p={[0, 0.088, 0]} s={[0.17, 0.016, 0.17]} c={'#f6b862'} out={null} />
    </group>)}
  </group>
}

// back-right: the bath nook behind an arched partition (tile floor, tub + shower, loo, basin, towel)
export const TUB = { x: 1.1, z: -0.78, r: 0.15, h: 0.2 }
export function BathNook() {
  const [arc, trim, tile] = useMemo(() => { const s = new THREE.Shape(); s.moveTo(0.78, 0); s.lineTo(1.6, 0); s.lineTo(1.6, 0.8); s.lineTo(0.78, 0.8); s.lineTo(0.78, 0); const h = new THREE.Path(); h.moveTo(0.95, 0); h.lineTo(1.35, 0); h.lineTo(1.35, 0.45); h.absarc(1.15, 0.45, 0.2, 0, Math.PI, false); h.lineTo(0.95, 0); s.holes.push(h)
    const tr = archFrame(0.4, 0.45, 0.03, 0.075); tr.translate(1.15, 0, 0)
    return [ext(s, 0.06), tr, texMat(tiles(), 3)] }, [])
  return <group>
    <mesh material={tile} position={[1.17, 0.003, -0.73]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[0.72, 0.66]} /></mesh>
    {/* partition: front wall with the arch, side wall, timber caps */}
    <group position={[0, 0, -0.43]}><O geo={arc} mat={tm(W.wall)} out={OUT.room} /><O geo={trim} mat={tm(W.wood)} position={[0, 0, -0.0075]} out={OUT.fine} /></group>
    <Box p={[0.81, 0.4, -0.75]} s={[0.06, 0.8, 0.66]} c={W.wain} paint={0.1} />
    <Box p={[1.19, 0.825, -0.4]} s={[0.84, 0.05, 0.1]} c={W.cap} />
    <Box p={[0.81, 0.825, -0.74]} s={[0.1, 0.05, 0.7]} c={W.cap} />
    <Box p={[0.81, 0.86, -0.4]} s={[0.1, 0.06, 0.1]} c={W.dark} />
    {/* tub, shower */}
    <group position={[TUB.x, 0, TUB.z]}>
      <Box geo={GEO.cyl} p={[0, TUB.h / 2, 0]} s={[TUB.r, TUB.h, TUB.r]} c={'#fbf8f2'} />
      <O geo={GEO.tor} mat={tm('#fbf8f2')} position={[0, TUB.h, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[TUB.r - 0.006, TUB.r - 0.006, 0.05]} out={OUT.fine} />
      <Box geo={GEO.cyl} p={[0, TUB.h * 0.35, 0]} s={[TUB.r + 0.004, 0.02, TUB.r + 0.004]} c={'#8fc3e8'} out={null} />
    </group>
    <group position={[TUB.x - 0.08, 0, backZ(TUB.x - 0.08) + 0.025]}>
      <Box geo={GEO.cyl} p={[0, 0.47, 0]} s={[0.009, 0.6, 0.009]} c={'#cfc8bd'} out={OUT.fine} />
      <Box geo={GEO.cyl} p={[0, 0.77, 0.04]} s={[0.009, 0.08, 0.009]} rot={[Math.PI / 2, 0, 0]} c={'#cfc8bd'} out={null} />
      <Box geo={GEO.cyl} p={[0, 0.755, 0.085]} s={[0.035, 0.012, 0.035]} c={'#cfc8bd'} out={OUT.fine} />
      <Box geo={GEO.cyl} p={[0.03, 0.35, 0.012]} s={[0.012, 0.012, 0.012]} rot={[Math.PI / 2, 0, 0]} c={'#d9655b'} out={null} />
    </group>
    {/* loo against the right wall */}
    <group position={[1.42, 0, -0.62]} rotation={[0, -Math.PI / 2, 0]}>
      <Box geo={GEO.pillow} p={[0, 0.2, -0.08]} s={[0.14, 0.13, 0.06]} c={'#fbf8f2'} />
      <Box geo={GEO.cyl} p={[0, 0.045, 0.01]} s={[0.04, 0.09, 0.04]} c={'#fbf8f2'} />
      <Box geo={GEO.pillow} p={[0, 0.1, 0.02]} s={[0.11, 0.035, 0.13]} c={'#fbf8f2'} />
      <Box p={[0.04, 0.24, -0.06]} s={[0.025, 0.01, 0.01]} c={'#cfc8bd'} out={null} />
    </group>
    {/* basin + mirror on the right wall, towel on the partition, round bath mat, a little plant */}
    <group position={[sideX(-0.88), 0, -0.88]} rotation={[0, -Math.PI / 2, 0]}>
      <Box geo={GEO.pillow} p={[0, 0.25, 0.06]} s={[0.15, 0.05, 0.1]} c={'#fbf8f2'} />
      <Box geo={GEO.cyl} p={[0, 0.13, 0.03]} s={[0.02, 0.2, 0.02]} c={'#fbf8f2'} />
      <Box geo={GEO.cyl} p={[0, 0.3, 0.02]} s={[0.006, 0.04, 0.006]} c={'#cfc8bd'} out={null} />
      <Box geo={GEO.cyl} p={[0, 0.46, 0.008]} s={[0.065, 0.012, 0.065]} rot={[Math.PI / 2, 0, 0]} c={W.wood} />
      <mesh material={tm('#d8eef4')} position={[0, 0.46, 0.016]}><circleGeometry args={[0.055, 20]} /></mesh>
    </group>
    <group position={[0.845, 0.5, -0.7]} rotation={[0, Math.PI / 2, 0]}>
      <Box p={[0, 0, 0.015]} s={[0.2, 0.012, 0.012]} c={W.dark} out={null} />
      <O geo={GEO.pillow} mat={tm('#8fc3e8')} position={[0, -0.07, 0.02]} scale={[0.15, 0.14, 0.016]} out={OUT.fine} />
      <Box p={[0, -0.12, 0.03]} s={[0.15, 0.015, 0.004]} c={'#fbf3e4'} out={null} />
    </group>
    <mesh material={tm(W.cream)} position={[1.15, 0.006, -0.5]} rotation={[-Math.PI / 2, 0, 0]} scale={[0.11, 0.07, 1]}><circleGeometry args={[1, 24]} /></mesh>
  </group>
}

// right: wardrobe, nightstand with the mushroom lamp, the bed under a yellow plaid quilt, a picture shelf, a rug
export const BED = { x: 1.18, z: 0.48, top: 0.16 }
export function Bedroom() {
  const pm = useMemo(() => texMat(plaid()), []), pic = useMemo(() => new THREE.MeshBasicMaterial({ map: pictureTex() }), [])
  const rx = sideX
  return <group>
    {/* wardrobe */}
    <group position={[rx(-0.2) - 0.11, 0, -0.2]}>
      <Box geo={GEO.pillow} p={[0, 0.29, 0]} s={[0.21, 0.56, 0.32]} c={W.wood} />
      <Box p={[0.004, 0.585, 0]} s={[0.23, 0.03, 0.34]} c={W.dark} />
      {[-1, 1].map(s => <group key={s}><Box p={[-0.105, 0.3, s * 0.077]} s={[0.01, 0.46, 0.14]} c={W.light} out={OUT.fine} /><Box p={[-0.116, 0.32, s * 0.018]} s={[0.01, 0.05, 0.012]} c={'#e6c88a'} out={null} /></group>)}
      <Box p={[0, 0.03, 0]} s={[0.215, 0.05, 0.325]} c={W.dark} out={null} />
      <Box geo={GEO.pillow} p={[0, 0.65, 0.04]} s={[0.15, 0.1, 0.15]} c={'#e0b878'} out={OUT.fine} />
      <Box p={[0, 0.7, 0.04]} s={[0.155, 0.012, 0.155]} c={'#cfa060'} out={null} />
    </group>
    {/* nightstand + mushroom lamp */}
    <group position={[rx(0.08) - 0.1, 0, 0.08]}>
      <Box geo={GEO.pillow} p={[0, 0.085, 0]} s={[0.17, 0.17, 0.17]} c={W.wood} />
      <Box p={[-0.085, 0.11, 0]} s={[0.01, 0.06, 0.13]} c={W.light} out={OUT.fine} /><Box geo={GEO.sph} p={[-0.092, 0.11, 0]} s={0.01} c={W.dark} out={null} />
      <Box geo={GEO.cyl} p={[0, 0.2, 0.02]} s={[0.014, 0.06, 0.014]} c={W.cream} out={OUT.fine} />
      <mesh material={GLOW} geometry={GEO.half} position={[0, 0.228, 0.02]} scale={[0.05, 0.04, 0.05]} />
      <O geo={GEO.half} mat={tm('#ffe4a8')} position={[0, 0.227, 0.02]} scale={[0.052, 0.042, 0.052]} out={OUT.fine} />
      <Box geo={GEO.pillow} p={[0.02, 0.18, -0.05]} s={[0.06, 0.02, 0.045]} c={'#8cc084'} out={OUT.fine} />
    </group>
    {/* bed: head against the right wall */}
    <group position={[BED.x, 0, BED.z]}>
      <Box p={[0, 0.065, 0]} s={[0.64, 0.07, 0.46]} c={W.wood} paint={0.1} />
      {[-1, 1].flatMap(s => [-1, 1].map(t => <Box key={s + ',' + t} p={[s * 0.3, 0.03, t * 0.21]} s={[0.04, 0.06, 0.04]} c={W.dark} out={null} />))}
      <Box p={[0.32, 0.17, 0]} s={[0.045, 0.28, 0.48]} c={W.wood} />
      <Box geo={GEO.cyl} p={[0.32, 0.31, 0]} s={[0.24, 0.045, 0.24]} rot={[0, 0, Math.PI / 2]} c={W.wood} />
      {[-1, 1].map(t => <Box key={t} geo={GEO.cyl} p={[0.32, 0.17, t * 0.24]} s={[0.03, 0.34, 0.03]} c={W.dark} />)}
      <Box p={[-0.32, 0.1, 0]} s={[0.04, 0.16, 0.48]} c={W.wood} />
      {[-1, 1].map(t => <Box key={'f' + t} geo={GEO.cyl} p={[-0.32, 0.11, t * 0.24]} s={[0.026, 0.22, 0.026]} c={W.dark} />)}
      <O geo={GEO.pillow} mat={tm(W.sheet)} position={[0.01, 0.125, 0]} scale={[0.6, 0.07, 0.43]} />
      <O geo={GEO.pillow} mat={pm} position={[-0.09, 0.163, 0]} scale={[0.42, 0.02, 0.47]} out={OUT.fine} />
      <O geo={GEO.pillow} mat={pm} position={[-0.09, 0.11, 0.233]} scale={[0.42, 0.1, 0.012]} out={null} />
      <O geo={GEO.pillow} mat={tm('#fffaf0')} position={[0.22, 0.185, -0.07]} scale={[0.12, 0.05, 0.24]} rotation={[0, 0, 0.15]} />
      <group position={[0.2, 0.21, 0.11]} rotation={[0.2, 0, 0.6]}>{[0, 1, 2, 3, 4].map(i => <Box key={i} geo={GEO.sph} p={[Math.cos(i * 1.257) * 0.035, 0, Math.sin(i * 1.257) * 0.035]} s={[0.03, 0.014, 0.03]} c={'#f6bb4a'} out={OUT.fine} />)}<Box geo={GEO.sph} p={[0, 0.006, 0]} s={[0.024, 0.014, 0.024]} c={'#ffe6a0'} out={null} /></group>
    </group>
    {/* picture shelf over the nightstand */}
    <group position={[rx(0.1) - 0.01, 0.55, 0.1]} rotation={[0, -Math.PI / 2, 0]}>
      <Box p={[0, -0.09, 0.04]} s={[0.3, 0.018, 0.08]} c={W.wood} />
      <Box p={[0, 0.01, 0.012]} s={[0.2, 0.16, 0.02]} c={W.dark} />
      <mesh position={[0, 0.01, 0.023]} material={pic}><planeGeometry args={[0.17, 0.13]} /></mesh>
      <group position={[0.11, -0.081, 0.05]}><Box geo={GEO.cyl} p={[0, 0.02, 0]} s={[0.02, 0.04, 0.02]} c={W.pot} out={OUT.fine} />{[0, 1, 2, 3].map(i => <O key={i} geo={GEO.sph} mat={tm(W.leaf2)} position={[Math.cos(i * 1.6) * 0.012, 0.05 - (i % 2) * 0.03, Math.sin(i * 1.6) * 0.012 + 0.01]} scale={[0.014, 0.01, 0.02]} rotation={[0.4, i, 0]} out={null} />)}</group>
    </group>
    {/* bedside rug */}
    <mesh material={tm(W.rug2)} position={[0.62, 0.003, 0.5]} rotation={[-Math.PI / 2, 0, 0]} scale={[0.2, 0.36, 1]}><planeGeometry args={[1, 1]} /></mesh>
    <mesh material={tm(W.rug)} position={[0.62, 0.005, 0.5]} rotation={[-Math.PI / 2, 0, 0]} scale={[0.17, 0.33, 1]}><planeGeometry args={[1, 1]} /></mesh>
  </group>
}

// front: the arched door wall in the rim, coat stand, lanterns on stone posts, steps, flower pots and bushes outside
export function DoorWay() {
  const leaf = useRef()
  useFrame((_, dt) => { if (leaf.current) leaf.current.rotation.y += ((HOME.doorOpen ? 1.25 : 0) - leaf.current.rotation.y) * Math.min(1, dt * 6) })
  const { x, z, w } = DOOR, hr = DOOR.h - w / 2
  const [wallG, frameG, leafG] = useMemo(() => { const s = arch(w + 0.26, hr + 0.04, 0); s.holes.push(arch(w, hr, 0, true)); return [ext(s, 0.1), archFrame(w, hr, 0.03, 0.115), ext(arch(w - 0.012, hr, 0), 0.03)] }, [])
  const pane = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ffe2a6', toneMapped: false }), [])
  return <group>
    <group position={[x, 0, z - 0.06]}>
      <O geo={wallG} mat={tm(W.wallOut, 0.1)} out={OUT.room} />
      <O geo={frameG} mat={tm(W.dark)} position={[0, 0, -0.0075]} out={OUT.fine} />
    </group>
    <group ref={leaf} position={[x - w / 2 + 0.006, 0, z - 0.035]}><group position={[w / 2 - 0.006, 0, 0]}>
      <O geo={leafG} mat={tm('#b0703f', 0.12)} out={OUT.fine} />
      {[-0.07, 0, 0.07].map(dx => <Box key={dx} p={[dx, 0.2, 0.031]} s={[0.006, 0.4, 0.004]} c={'#8a5634'} out={null} />)}
      <mesh material={pane} position={[0, 0.43, 0.031]} scale={[0.15, 0.13, 1]}><planeGeometry args={[1, 1]} /></mesh>
      <Box p={[0, 0.43, 0.035]} s={[0.012, 0.14, 0.008]} c={'#8a5634'} out={null} /><Box p={[0, 0.43, 0.035]} s={[0.16, 0.012, 0.008]} c={'#8a5634'} out={null} />
      <Box p={[0, 0.43, 0.034]} s={[0.17, 0.15, 0.004]} c={'#8a5634'} out={null} />
      <Box geo={GEO.tor} p={[0.09, 0.24, 0.045]} s={[0.022, 0.022, 0.02]} c={W.iron} out={null} />
      <Box geo={GEO.sph} p={[0.09, 0.262, 0.04]} s={0.01} c={W.iron} out={null} />
      {[0.08, 0.36].map(y => <Box key={y} p={[-0.13, y, 0.033]} s={[0.05, 0.016, 0.006]} c={W.iron} out={null} />)}
    </group></group>
    {/* mat inside, steps outside */}
    <mesh material={tm(W.cream)} position={[x, 0.004, z - 0.2]} rotation={[-Math.PI / 2, 0, 0]} scale={[0.26, 0.12, 1]}><planeGeometry args={[1, 1]} /></mesh>
    <Box p={[x, -0.03, z + 0.2]} s={[0.46, 0.06, 0.16]} c={W.stone} />
    <Box p={[x, -0.085, z + 0.3]} s={[0.56, 0.06, 0.14]} c={'#e2d2be'} />
    {/* lanterns on stone posts */}
    {[-1, 1].map(s => <group key={s} position={[x + s * 0.32, 0, z + 0.04]}>
      <Box p={[0, 0.07, 0]} s={[0.11, 0.14, 0.11]} c={W.stone} />
      <Box p={[0, 0.145, 0]} s={[0.13, 0.018, 0.13]} c={'#e2d2be'} />
      <Lantern p={[0, 0.154, 0]} s={1.25} />
    </group>)}
    {/* flower pots + bushes outside the rim */}
    {[-1, 1].map(s => <group key={'p' + s} position={[x + s * 0.6, 0, z + 0.14]}>
      <Box geo={GEO.cyl} p={[0, 0.05, 0]} s={[0.065, 0.1, 0.065]} c={W.pot} />
      <Box geo={GEO.cyl} p={[0, 0.1, 0]} s={[0.072, 0.016, 0.072]} c={'#e8e0d2'} out={null} />
      {[...Array(9)].map((_, i) => { const a = i * 2.4, r = 0.03 + (i % 3) * 0.015; return <group key={i} position={[Math.cos(a) * r, 0.13 + (i % 2) * 0.02, Math.sin(a) * r]}>
        {i % 3 ? <O geo={GEO.sph} mat={tm(W.leaf)} scale={[0.035, 0.02, 0.03]} rotation={[0.3, a, 0]} out={OUT.fine} /> : <><Box geo={GEO.sph} p={[0, 0.02, 0]} s={[0.026, 0.01, 0.026]} c={'#ffffff'} out={OUT.fine} /><Box geo={GEO.sph} p={[0, 0.026, 0]} s={0.009} c={'#ffd36e'} out={null} /></>}</group> })}
    </group>)}
    {[[-1.0, 1.25, 1.0, -0.02], [1.0, 1.25, 1.0, -0.02], [-0.46, 1.36, 0.75, -0.09], [0.48, 1.36, 0.75, -0.09], [-1.74, 0.5, 0.9, -0.02], [1.74, 0.45, 0.9, -0.02]].map(([bx, bz, s, by], i) => <group key={'b' + i} position={[bx, by, bz]} scale={s}>
      {[[0, 0.05, 0, 0.08], [0.07, 0.035, 0.02, 0.06], [-0.07, 0.035, 0.02, 0.06], [0.02, 0.09, -0.02, 0.055]].map(([a, b, c, r], k) => <O key={k} geo={GEO.sph} mat={tm(k % 2 ? '#93b44a' : '#7fa03e')} position={[a, b, c]} scale={r} out={OUT.room} />)}
    </group>)}
    {/* coat stand by the door: tote bag + her straw hat */}
    <group position={[0.5, 0, 0.99]}>
      <Box p={[0, 0.3, 0]} s={[0.035, 0.6, 0.035]} c={W.wood} />
      <Box p={[0, 0.02, 0]} s={[0.14, 0.04, 0.1]} c={W.dark} />
      <Box p={[0, 0.56, 0.0]} s={[0.24, 0.03, 0.03]} c={W.wood} />
      {[-0.08, 0.08].map(dx => <Box key={dx} geo={GEO.cyl} p={[dx, 0.54, 0.02]} s={[0.008, 0.04, 0.008]} rot={[Math.PI / 2, 0, 0]} c={W.dark} out={null} />)}
      <group position={[-0.08, 0.53, 0.04]}><Box geo={GEO.tor} p={[0, -0.03, 0]} s={[0.03, 0.04, 0.02]} c={'#efe2c8'} out={null} /><O geo={GEO.pillow} mat={tm('#f6ecd8')} position={[0, -0.12, 0]} scale={[0.1, 0.12, 0.03]} out={OUT.fine} /><Box p={[0.01, -0.12, 0.016]} s={[0.04, 0.03, 0.004]} c={'#8cc084'} out={null} /></group>
      <group position={[0.08, 0.5, 0.05]} rotation={[1.3, 0, 0]}><Box geo={GEO.cyl} p={[0, 0, 0]} s={[0.09, 0.008, 0.09]} c={'#e9c46a'} out={OUT.fine} /><Box geo={GEO.half} p={[0, 0.004, 0]} s={[0.05, 0.045, 0.05]} c={'#e9c46a'} out={OUT.fine} /><Box geo={GEO.cyl} p={[0, 0.012, 0]} s={[0.052, 0.012, 0.052]} c={'#d9655b'} out={null} /></group>
    </group>
  </group>
}

// ---------- the whole static set (Room.jsx adds the door logic, camera, cat, activities) ----------
export function Shell() { return <><Walls /><Kitchen /><Desk /><PetCorner /><Table /><BathNook /><Bedroom /></> }
export { Walls }
