// Round9: her house, inside, as a round room built from the chibi prop kit (src/props). Seen from above its low
// front rim like the concept cutaway: kitchen counter under the window at the back with the fridge and jar shelf,
// wood stove + firewood back-left, the desk corner on the left, the sunny window and the pet corner front-left,
// round table + poufs on a round rug in the middle, the bath nook behind an arch back-right, wardrobe, nightstand and
// bed on the right, and the front door in the rim with a lantern post either side.
// Room units (she is ~0.39 tall), y up, floor at 0, camera looking toward -z. Angles (phi) go round the wall:
// 0 = back (-z), 90 = right (+x), 180 = front door (+z), -90 = left.
import * as THREE from 'three'
import React, { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { HOME, ROOM, DOOR, BLOCKS, wallH, wallAt } from './state.js'
import { O, GEO, tm, OUT } from './kit.jsx'
import { T, CC } from '../common.jsx'
import { toonRamp } from '../world.js'
import { Prop } from '../props/Prop.jsx'
import { PATTERNS, CATALOG } from '../props/index.js'

export const W = { wall: '#f8dcc4', wallOut: '#c98552', cap: '#b06c3c', wain: '#d9a06a', wood: '#c98a55', dark: '#8a5634', light: '#e6b884', quilt: '#f2c45a', sheet: '#fff6ea', pot: '#f6f1e8', leaf: '#6fae4f', leaf2: '#93c95a', rug: '#f4e4cf', rug2: '#e6c9a8', iron: '#4d4852', orange: '#f08a3a', stone: '#efe2d0', cream: '#fbf1e0' }
export function Box({ p, s, c, paint = 0, out = OUT.room, rot, geo = GEO.box }) { return <O geo={geo} mat={tm(c, paint)} position={p} scale={s} rotation={rot} out={out} /> }

// ---------- placing things round the wall ----------
const R = ROOM.A, D2R = Math.PI / 180
export const polar = (phi, r) => [Math.sin(phi * D2R) * r, -Math.cos(phi * D2R) * r]
// an item of width w and depth d with its back flat against the round wall at angle phi, facing the centre
export function against(phi, w, d, gap = 0.012) { const r = Math.sqrt(R * R - (w / 2) ** 2) - d / 2 - gap, [x, z] = polar(phi, r); return { x, z, yaw: -phi * D2R } }
// a wall-mounted item: its back on the wall's inner face at angle phi (and height y), facing the centre
export function onWall(phi, y, w = 0, gap = 0.004) { const r = Math.sqrt(R * R - (w / 2) ** 2) - gap, [x, z] = polar(phi, r); return { x, y, z, yaw: -phi * D2R } }
// local (lx, lz) of a placed item -> room x/z
export const local = (pl, lx, lz) => { const c = Math.cos(pl.yaw), s = Math.sin(pl.yaw); return [pl.x + lx * c + lz * s, pl.z - lx * s + lz * c] }

// ---------- the layout ----------
const P = {}
P.counter = against(-8, 0.9, 0.27)
P.fridge = against(23, 0.28, 0.22)
P.stove = against(-50, 0.42, 0.42)
P.firewood = (() => { const [x, z] = local(P.stove, 0.31, -0.06); return { x, z, yaw: P.stove.yaw } })() // tucked right beside the stove
export const FLUE = 0.39 // stove pipe: back through the wall to a chimney outside
P.desk = against(-82, 0.56, 0.32)
P.bigPlant = against(-131, 0.34, 0.34)
P.petBowls = against(-158, 0.36, 0.14)
P.coatStand = against(158, 0.26, 0.12)
P.wardrobe = against(90, 0.38, 0.24)
P.nightstand = against(112, 0.19, 0.18)
P.bed = against(130, 0.5, 0.72)
// the bed alcove: a half-wall with a quarter-round top, from the round wall toward the middle (like the concept)
export const ALCOVE = { phi: 103, len: 0.5 }
P.flowerPot = against(147, 0.17, 0.17)
const pol = (phi, r, yaw = 0) => { const [x, z] = polar(phi, r); return { x, z, yaw } }
P.petBed = pol(-147, 0.98, 0.4)
P.table = { x: 0, z: 0.06, yaw: 0 }
P.poufL = { x: -0.37, z: 0.1, yaw: 0.2 }; P.poufR = { x: 0.38, z: 0.12, yaw: -0.3 }
P.stool = (() => { const [x, z] = local(P.desk, -0.02, 0.3); return { x, z, yaw: P.desk.yaw } })()
P.rug = { x: 0.0, z: 0.1, yaw: 0 }
P.runner = (() => { const [x, z] = local(P.bed, -0.42, 0.08); return { x, z, yaw: P.bed.yaw } })()
// bath nook: back-right, behind a partition wall with an arch
export const NOOK = { x0: 0.76, z1: -0.3 }
P.tub = { x: 1.0, z: -0.86, yaw: -0.6 }
P.toilet = against(63, 0.16, 0.22)
// walls: windows, shelves, pictures
const KW = -13, LW = -112, PORT = 47
P.kitchenWindow = onWall(KW, 0.4); P.leftWindow = onWall(LW, 0.4)
P.jarShelf = onWall(10, 0.62, 0.5); P.bookShelf = onWall(-37, 0.6, 0.44); P.pegboard = onWall(-82, 0.36, 0.42)
 P.towelRail = { x: NOOK.x0 + 0.03, y: 0.32, z: -0.72, yaw: Math.PI / 2 }
P.kitchenMat = (() => { const [x, z] = local(P.counter, -0.06, 0.35); return { x, z, yaw: P.counter.yaw } })()
P.deskMat = (() => { const [x, z] = local(P.desk, -0.02, 0.36); return { x, z, yaw: P.desk.yaw } })()
P.shelfPlant = (() => { const [x, z] = local(P.jarShelf, 0.215, 0.06); return { x, y: P.jarShelf.y + 0.012, z, yaw: P.jarShelf.yaw } })()
export const LAYOUT = P

// openings in the round wall (arc width w in room units around phi)
export const OPEN = [
  { phi: LW, w: 0.34, y0: 0.4, ys: 0.62, arch: true }, // sunny window, left
  { phi: KW, w: 0.36, y0: 0.42, ys: 0.64, arch: true }, // kitchen window
  { phi: PORT, w: 0.15, y0: 0.56, ys: 0.7, round: true }, // bath porthole
  { phi: 180, w: 0.42, y0: 0, ys: 9 }, // the doorway (the door has its own arched frame)
]
// spots other modules use (activities, the cat): all in room x/z
const cook = local(P.counter, 0.19, 0), sink = local(P.counter, -0.12, 0), cookStand = local(P.counter, 0.19, 0.36)
export const SPOTS = {
  cook: { x: cook[0], z: cook[1], y: 0.238, stand: cookStand, yaw: P.counter.yaw + Math.PI },
  sink: { x: sink[0], z: sink[1] },
  bath: { stand: [NOOK.x0 + (1.6 - NOOK.x0) / 2 - 0.05, NOOK.z1 - 0.15] },
  table: { x: P.table.x, z: P.table.z, h: 0.158 },
  stool: { x: P.stool.x, z: P.stool.z, h: 0.142, face: P.desk.yaw + Math.PI },
  bed: { ...P.bed, top: 0.16, head: [Math.sin(-P.bed.yaw), -Math.cos(-P.bed.yaw)] }, // head points at the wall
  cat: (() => { const h = [Math.sin(-P.bed.yaw), -Math.cos(-P.bed.yaw)]; let px = -h[1], pz = h[0]; if (px * -P.bed.x + pz * -P.bed.z < 0) { px = -px; pz = -pz }
    const on = (along, side) => [P.bed.x + h[0] * along + px * side, P.bed.z + h[1] * along + pz * side], f = (along) => { const [x, z] = on(along, 0.42); return { x, z } }
    const [bx, bz] = on(0.02, 0.05), [kx, kz] = on(-0.12, 0.08); return { bed: { x: bx, z: bz, from: f(0.02) }, knead: { x: kx, z: kz, from: f(-0.12) } } })(),
  tub: { x: P.tub.x, z: P.tub.z, r: 0.155, h: 0.21 },
  bowl: (() => { const [x, z] = local(P.petBowls, -0.1, 0); return { x, z } })(),
  petBed: { x: P.petBed.x, z: P.petBed.z, r: 0.15 },
  window: (() => { const [x, z] = polar(LW, R - 0.07), [fx, fz] = polar(LW, R - 0.36); return { x, z, y: 0.395, from: { x: fx, z: fz }, face: -LW * D2R + Math.PI } })(),
  shelf: (() => { const [x, z] = local(P.bookShelf, 0.14, 0.06), [fx, fz] = local(P.bookShelf, 0.14, 0.42); return { x, z, y: 0.6, from: { x: fx, z: fz } } })(),
  plants: { big: P.bigPlant, counter: (() => { const [x, z] = local(P.counter, -0.37, -0.02); return { x, z, y: 0.227, yaw: P.counter.yaw } })(), door: P.flowerPot },
}

// furniture footprints for collision (rotated boxes -> their x/z bounds, trimmed a little so round walls don't over-block)
const fp = (id, pl, k = 0.88) => { const [w, , d] = CATALOG[id].size, c = Math.abs(Math.cos(pl.yaw)), s = Math.abs(Math.sin(pl.yaw)), hw = (w * c + d * s) / 2 * k, hd = (w * s + d * c) / 2 * k; return { id, x0: pl.x - hw, x1: pl.x + hw, z0: pl.z - hd, z1: pl.z + hd } }
export const BLOCK_LIST = () => [
  fp('counter', P.counter), fp('fridge', P.fridge), fp('firewood', P.firewood), { ...fp('woodStove', P.stove, 0.7), id: 'stove' }, fp('desk', P.desk), fp('stool', P.stool, 0.8),
  fp('bigPlant', P.bigPlant, 0.75), fp('petBowls', P.petBowls, 0.7), { ...fp('petBed', P.petBed, 0.85), id: 'petbed', round: true }, fp('coatStand', P.coatStand, 0.7),
  fp('wardrobe', P.wardrobe), { ...fp('nightstand', P.nightstand), id: 'night' }, fp('bed', P.bed, 0.95), fp('flowerPot', P.flowerPot, 0.8),
  { ...fp('roundTable', P.table, 0.95), id: 'table', round: true }, { ...fp('pouf', P.poufL, 0.85), id: 'poufL', round: true }, { ...fp('pouf', P.poufR, 0.85), id: 'poufR', round: true },
  { id: 'bathSide', x0: NOOK.x0 - 0.04, x1: NOOK.x0 + 0.04, z0: -1.6, z1: NOOK.z1 + 0.03 },
  { id: 'bathFront1', x0: NOOK.x0 - 0.04, x1: 0.95, z0: NOOK.z1 - 0.04, z1: NOOK.z1 + 0.04 }, { id: 'bathFront2', x0: 1.31, x1: 1.6, z0: NOOK.z1 - 0.04, z1: NOOK.z1 + 0.04 },
  (() => { const [ax, az] = polar(ALCOVE.phi, R), [bx, bz] = polar(ALCOVE.phi, R - ALCOVE.len); return { id: 'alcove', x0: Math.min(ax, bx) - 0.05, x1: Math.max(ax, bx) + 0.05, z0: Math.min(az, bz) - 0.05, z1: Math.max(az, bz) + 0.05 } })(),
  { id: 'tub', x0: P.tub.x - 0.16, x1: P.tub.x + 0.16, z0: P.tub.z - 0.16, z1: P.tub.z + 0.16, round: true }, fp('toilet', P.toilet, 0.85),
]

BLOCKS.splice(0, BLOCKS.length, ...BLOCK_LIST())

// ---------- the round wall ----------
const N = 480, T_ = 0.075 // wall thickness
const ring = (() => { const a = []; for (let i = 0; i < N; i++) { const t = i / N * Math.PI * 2; a.push(wallAt(Math.cos(t), Math.sin(t), {})) } return a })()
const phiOf = (x, z) => Math.atan2(x, -z) / D2R
function holeAt(x, z, clampTo) {
  const ph = phiOf(x, z)
  for (const o of OPEN) { const dp = ((ph - o.phi + 540) % 360) - 180; let d = dp * D2R * R; const r = o.w / 2
    if (Math.abs(d) >= r) { if (clampTo !== o) continue; d = Math.sign(d) * r * 0.999 }
    if (o.round) { const cy = (o.y0 + o.ys) / 2, rr = (o.ys - o.y0) / 2, k = Math.sqrt(Math.max(0, 1 - (d / r) ** 2)) * rr; return { o, y0: cy - k, y1: cy + k } }
    return { o, y0: o.y0, y1: o.arch ? o.ys + Math.sqrt(Math.max(0, r * r - d * d)) : o.ys } }
  return null
}
function wallGeos() {
  const inner = [], outer = [], ni = [], no = []
  const v = new THREE.Vector3(), e1 = new THREE.Vector3(), e2 = new THREE.Vector3()
  const tri = (arr, nrm, a, b, c, n) => { e1.subVectors(b, a); e2.subVectors(c, a); v.crossVectors(e1, e2); if (v.dot(n) < 0) [b, c] = [c, b]; for (const p of [a, b, c]) { arr.push(p.x, p.y, p.z); nrm.push(n.x, n.y, n.z) } }
  const quad = (arr, nrm, a, b, c, d, n) => { tri(arr, nrm, a, b, c, n); tri(arr, nrm, a, c, d, n) }
  const Pv = (x, y, z) => new THREE.Vector3(x, y, z)
  for (let i = 0; i < N; i++) {
    const A = ring[i], B = ring[(i + 1) % N], mx = (A.x + B.x) / 2, mz = (A.z + B.z) / 2
    const oA = { x: A.x - A.nx * T_, z: A.z - A.nz * T_ }, oB = { x: B.x - B.nx * T_, z: B.z - B.nz * T_ }
    const hA = wallH(A.z), hB = wallH(B.z), nI = Pv((A.nx + B.nx) / 2, 0, (A.nz + B.nz) / 2).normalize(), nO = nI.clone().negate()
    const hole = holeAt(mx, mz), spans = []
    if (hole) { const ha = holeAt(A.x, A.z, hole.o), hb = holeAt(B.x, B.z, hole.o); if (ha.y0 > 0) spans.push([0, 0, ha.y0, hb.y0]); if (ha.y1 < hA) spans.push([ha.y1, hb.y1, hA, hB])
      if (ha.y0 > 0) quad(outer, no, Pv(A.x, ha.y0, A.z), Pv(B.x, hb.y0, B.z), Pv(oB.x, hb.y0, oB.z), Pv(oA.x, ha.y0, oA.z), Pv(0, 1, 0))
      if (ha.y1 < hA) quad(outer, no, Pv(A.x, ha.y1, A.z), Pv(B.x, hb.y1, B.z), Pv(oB.x, hb.y1, oB.z), Pv(oA.x, ha.y1, oA.z), Pv(0, -1, 0))
      const pm = ring[(i + N - 1) % N], nx = ring[(i + 2) % N]
      if (!holeAt((pm.x + A.x) / 2, (pm.z + A.z) / 2)) { const t = Pv(B.x - A.x, 0, B.z - A.z).normalize(); quad(outer, no, Pv(A.x, ha.y0, A.z), Pv(A.x, Math.min(ha.y1, hA), A.z), Pv(oA.x, Math.min(ha.y1, hA), oA.z), Pv(oA.x, ha.y0, oA.z), t) }
      if (!holeAt((nx.x + B.x) / 2, (nx.z + B.z) / 2)) { const t = Pv(A.x - B.x, 0, A.z - B.z).normalize(); quad(outer, no, Pv(B.x, hb.y0, B.z), Pv(B.x, Math.min(hb.y1, hB), B.z), Pv(oB.x, Math.min(hb.y1, hB), oB.z), Pv(oB.x, hb.y0, oB.z), t) }
    } else spans.push([0, 0, hA, hB])
    for (const [a0, b0, a1, b1] of spans) { quad(inner, ni, Pv(A.x, a0, A.z), Pv(B.x, b0, B.z), Pv(B.x, b1, B.z), Pv(A.x, a1, A.z), nI); quad(outer, no, Pv(oA.x, a0 - 0.16, oA.z), Pv(oB.x, b0 - 0.16, oB.z), Pv(oB.x, b1, oB.z), Pv(oA.x, a1, oA.z), nO) }
    if (!(hole && hole.o.phi === 180)) quad(outer, no, Pv(A.x, hA, A.z), Pv(B.x, hB, B.z), Pv(oB.x, hB, oB.z), Pv(oA.x, hA, oA.z), Pv(0, 1, 0))
  }
  const mk = (p, n) => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(n, 3)); return g }
  const gi = mk(inner, ni), lo = new THREE.Color('#efc3a6'), hi = new THREE.Color('#fde8da'), c = new THREE.Color(), cols = new Float32Array(inner.length) // warm peach, lighter up high (the concept's glow)
  for (let i = 0; i < inner.length; i += 3) { c.copy(lo).lerp(hi, Math.min(1, Math.max(0, inner[i + 1] / ROOM.h)) ** 0.8); c.toArray(cols, i) } gi.setAttribute('color', new THREE.BufferAttribute(cols, 3))
  return [gi, mk(outer, no)]
}
// chunky timber cap along the top of the wall, with a squat post every few blocks (the concept's rim)
function capBlocks() {
  const out = []; let acc = 0, last = ring[0], k = 0
  for (let i = 1; i <= N; i++) { const p = ring[i % N]; acc += Math.hypot(p.x - ring[(i - 1) % N].x, p.z - ring[(i - 1) % N].z)
    if (acc < 0.2 && i < N) continue
    const ax = last.x - last.nx * T_ / 2, az = last.z - last.nz * T_ / 2, bx = p.x - p.nx * T_ / 2, bz = p.z - p.nz * T_ / 2, mx = (ax + bx) / 2, mz = (az + bz) / 2
    if (!(mz > 0.5 && Math.abs(mx) < 0.23)) { const L = Math.hypot(bx - ax, bz - az), ha = wallH(last.z), hb = wallH(p.z)
      out.push({ p: [mx, (ha + hb) / 2 + 0.025, mz], s: [L + 0.012, 0.055, T_ + 0.045], rot: [0, Math.atan2(-(bz - az), bx - ax), Math.atan2(hb - ha, L)], post: k % 4 === 0 && !(mz > 0.5 && Math.abs(mx) < 0.6) /* no posts crowding the door */ }) }
    last = p; acc = 0; k++ }
  return out
}
const WALL_IN = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: toonRamp })
function Walls() {
  const [gi, go] = useMemo(wallGeos, []), caps = useMemo(capBlocks, [])
  return <group>
    <mesh geometry={gi} material={WALL_IN} />
    <mesh geometry={go} material={tm(W.wallOut, 0.1)} />
    {caps.map((c, i) => <group key={i} position={c.p} rotation={[...c.rot, 'YZX']}>
      <O geo={GEO.box} mat={tm(W.cap)} scale={c.s} out={OUT.room} />
      {c.post && <O geo={GEO.box} mat={tm(W.dark)} position={[0, 0.02, 0]} scale={[0.09, 0.1, T_ + 0.07]} out={OUT.room} />}
    </group>)}
  </group>
}

// ---------- floor, plinth, backdrop ----------
const planks = () => { const c = document.createElement('canvas'); c.width = c.height = 512; const x = c.getContext('2d'); x.fillStyle = '#e9b88e'; x.fillRect(0, 0, 512, 512)
  for (let r = 0; r < 6; r++) { let px = -(r * 131) % 230; const H = 512 / 6; while (px < 512) { const w = 200 + ((r * 31 + px) % 7) * 22, l = 0.94 + ((r * 13 + px * 7) % 5) * 0.025; x.fillStyle = `rgb(${236 * l | 0},${186 * l | 0},${142 * l | 0})`; x.fillRect(px + 2, r * H + 2, w - 4, H - 4)
    x.strokeStyle = 'rgba(170,110,70,.16)'; x.lineWidth = 2; for (let k = 0; k < 3; k++) { x.beginPath(); x.moveTo(px + 10, r * H + 18 + k * 22); x.bezierCurveTo(px + w * 0.3, r * H + 12 + k * 22, px + w * 0.6, r * H + 24 + k * 22, px + w - 10, r * H + 18 + k * 22); x.stroke() }
    x.fillStyle = 'rgba(160,100,62,.55)'; x.fillRect(px, r * H, 3, H); px += w } x.fillStyle = '#b77d55'; x.fillRect(0, r * H, 512, 3) }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1.9, 1.9); t.anisotropy = 4; return t }
const shapeOf = (grow = 0) => { const s = new THREE.Shape(); ring.forEach((p, i) => { const x = p.x - p.nx * grow, z = p.z - p.nz * grow; if (i) s.lineTo(x, -z); else s.moveTo(x, -z) }); return s }
export function Floor({ onDown }) {
  const [geo, mat, base] = useMemo(() => { const g = new THREE.ShapeGeometry(shapeOf(0.01), 1); g.rotateX(-Math.PI / 2)
    const b = new THREE.ExtrudeGeometry(shapeOf(0.3), { depth: 0.16, bevelEnabled: false, curveSegments: 4 }); b.rotateX(-Math.PI / 2); b.translate(0, -0.166, 0); b.computeVertexNormals()
    return [g, new THREE.MeshToonMaterial({ map: planks(), gradientMap: toonRamp }), b] }, [])
  return <group><mesh geometry={geo} material={mat} onPointerDown={onDown} /><O geo={base} mat={tm('#e2c3a0')} out={OUT.room} /></group>
}
export function Backdrop() {
  const m = useMemo(() => new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, toneMapped: false, uniforms: { uTop: { value: new THREE.Color() }, uBot: { value: new THREE.Color() } },
    vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: 'uniform vec3 uTop; uniform vec3 uBot; varying vec3 vP; void main(){ float k = smoothstep(-.35,.6,normalize(vP).y); gl_FragColor = vec4(mix(uBot,uTop,k),1.);\n#include <colorspace_fragment>\n}' }), [])
  const sh = useMemo(() => new THREE.MeshBasicMaterial({ color: '#6a4a5a', transparent: true, opacity: 0.18, depthWrite: false }), [])
  const a = useMemo(() => new THREE.Color(), []), b = useMemo(() => new THREE.Color(), [])
  useFrame(() => { a.set('#efe3f6').lerp(CC('#f8d2bc'), T.dusk * 0.7).lerp(CC('#2e2c52'), T.night * 0.9); b.set('#f6d6e2').lerp(CC('#f0b89a'), T.dusk * 0.6).lerp(CC('#4a3658'), T.night * 0.9); m.uniforms.uTop.value.copy(a); m.uniforms.uBot.value.copy(b) })
  return <group>
    <mesh material={m} renderOrder={-10}><sphereGeometry args={[7, 24, 16]} /></mesh>
    <mesh material={sh} position={[0, -0.17, 0.05]} rotation={[-Math.PI / 2, 0, 0]} scale={[R + 0.5, R + 0.5, 1]}><circleGeometry args={[1, 48]} /></mesh>
  </group>
}

// ---------- windows: the outside view behind each opening (props draw the frames) ----------
const viewTex = () => { const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d'), g = x.createLinearGradient(0, 0, 0, 256); g.addColorStop(0, '#9fd0ee'); g.addColorStop(0.65, '#e9f6f0'); x.fillStyle = g; x.fillRect(0, 0, 256, 256)
  x.fillStyle = 'rgba(255,255,255,.95)'; for (const [cx, cy] of [[70, 60], [190, 90]]) for (let k = 0; k < 4; k++) { x.beginPath(); x.arc(cx + k * 16, cy - (k % 2) * 8, 16, 0, 7); x.fill() }
  x.fillStyle = '#8cc76a'; for (let k = 0; k < 9; k++) { x.beginPath(); x.arc(k * 34, 190 + (k % 3) * 10, 40, 0, 7); x.fill() } x.fillStyle = '#6fae55'; for (let k = 0; k < 8; k++) { x.beginPath(); x.arc(15 + k * 36, 232 + (k % 2) * 8, 34, 0, 7); x.fill() }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t }
export function Windows() {
  const vm = useMemo(() => new THREE.MeshBasicMaterial({ map: viewTex(), toneMapped: false }), [])
  useFrame(() => { vm.color.setRGB(1, 1, 1).lerp(CC('#ffc49a'), T.dusk * 0.6).lerp(CC('#2a3366'), T.night * 0.85) })
  return <group>{OPEN.filter(o => o.phi !== 180).map((o, i) => { const pl = onWall(o.phi, 0); return <group key={i} position={[pl.x, (o.y0 + o.ys) / 2 + 0.05, pl.z]} rotation={[0, pl.yaw, 0]}>
    <mesh material={vm} position={[0, 0, -0.09]}><planeGeometry args={[o.w + 0.1, o.ys - o.y0 + o.w / 2 + 0.12]} /></mesh></group> })}</group>
}
// the low sun through the left window: a soft beam, a bright patch on the floor, dust motes (daytime only)
export const SUN_DIR = new THREE.Vector3(0.8, -0.55, -0.35) // light travel direction inside the room (HOME.sun points the other way)
export function Sunbeam() {
  const L = OPEN[0], tx = Math.cos(L.phi * D2R), tz = Math.sin(L.phi * D2R), [cx, cz] = polar(L.phi, R)
  const corner = (u, y) => [cx + tx * u, y, cz + tz * u], floorOf = ([x, y, z]) => { const t = y / -SUN_DIR.y; return [x + SUN_DIR.x * t, 0.004, z + SUN_DIR.z * t] }
  const m = useMemo(() => new THREE.MeshBasicMaterial({ color: '#fff0b8', transparent: true, opacity: 0.16, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false }), [])
  const fl = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ffe7a0', transparent: true, opacity: 0.3, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }), [])
  const [geo, floor, motes] = useMemo(() => { const w = L.w / 2 - 0.02, a = [corner(-w, L.ys + 0.1), corner(w, L.ys + 0.1), corner(w, L.y0 + 0.01), corner(-w, L.y0 + 0.01)], b = a.map(floorOf); const v = []
    for (let i = 0; i < 4; i++) { const j = (i + 1) % 4; v.push(...a[i], ...a[j], ...b[j], ...a[i], ...b[j], ...b[i]) } const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3))
    const f = new THREE.BufferGeometry(); f.setAttribute('position', new THREE.Float32BufferAttribute([...b[0], ...b[1], ...b[2], ...b[0], ...b[2], ...b[3]], 3))
    const p = []; for (let i = 0; i < 40; i++) { const s = corner((Math.random() - 0.5) * L.w, L.y0 + Math.random() * (L.ys - L.y0)), e = floorOf(s), u = Math.random(); p.push(s[0] + (e[0] - s[0]) * u, s[1] * (1 - u), s[2] + (e[2] - s[2]) * u) }
    const mg = new THREE.BufferGeometry(); mg.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); return [g, f, mg] }, [])
  const mm = useMemo(() => new THREE.PointsMaterial({ color: '#fff6d0', size: 0.012, transparent: true, opacity: 0.8, depthWrite: false, toneMapped: false }), [])
  const mref = useRef()
  useFrame(() => { const d = Math.max(0, T.day - T.night); m.opacity = 0.09 * d + 0.03 * T.dusk; fl.opacity = 0.2 * d; mm.opacity = 0.8 * d; if (mref.current) mref.current.position.y = Math.sin(performance.now() / 3000) * 0.01 })
  return <group><mesh geometry={geo} material={m} renderOrder={3} /><mesh geometry={floor} material={fl} renderOrder={2} /><points ref={mref} geometry={motes} material={mm} /></group>
}
export const BEAM_SPOT = (() => { const L = OPEN[0], [cx, cz] = polar(L.phi, R - 0.02), t = ((L.y0 + L.ys) / 2) / -SUN_DIR.y; return { x: cx + SUN_DIR.x * t, z: cz + SUN_DIR.z * t } })()

// ---------- the bath nook floor: tiles clipped to the round wall ----------
function NookTiles() {
  const geo = useMemo(() => { const z1 = NOOK.z1, x0 = NOOK.x0, zx0 = -Math.sqrt(R * R - x0 * x0), xz1 = Math.sqrt(R * R - z1 * z1), pts = [[x0, z1], [x0, zx0]]
    const a0 = Math.atan2(zx0, x0), a1 = Math.atan2(z1, xz1); for (let i = 1; i <= 24; i++) { const a = a0 + (a1 - a0) * i / 24; pts.push([Math.cos(a) * R, Math.sin(a) * R]) }
    const g = new THREE.ShapeGeometry(new THREE.Shape(pts.map(([x, z]) => new THREE.Vector2(x, -z)))); g.rotateX(-Math.PI / 2)
    const uv = g.attributes.uv, p = g.attributes.position; for (let i = 0; i < uv.count; i++) uv.setXY(i, p.getX(i) * 6, p.getZ(i) * 6)
    const c = new Float32Array(p.count * 3), col = new THREE.Color('#c9e3c2'); for (let i = 0; i < p.count; i++) col.toArray(c, i * 3); g.setAttribute('color', new THREE.BufferAttribute(c, 3)); return g }, [])
  return <mesh geometry={geo} material={PATTERNS.tiles} position={[0, 0.003, 0]} />
}

// ---------- the front door: arched wall in the rim + a swinging leaf ----------
export function DoorWay() {
  const leaf = useRef()
  useFrame((_, dt) => { if (leaf.current) leaf.current.rotation.y += ((HOME.doorOpen ? 1.25 : 0) - leaf.current.rotation.y) * Math.min(1, dt * 6) })
  const { x, z, w, h } = DOOR, zc = z + 0.035 // centred in the wall's thickness
  return <group>
    <Prop id="doorFrame" opts={{ w, h, f: 0.045, d: 0.055 }} position={[x, 0, zc]} />
    <group ref={leaf} position={[x - w / 2, 0, zc]}><Prop id="doorLeaf" opts={{ w, h }} position={[w / 2, 0, 0]} /></group>
  </group>
}
// wood smoke curling out of the chimney outside
const smokeTex = (() => { let t; return () => { if (t) return t; const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 2, 32, 32, 30); g.addColorStop(0, 'rgba(255,255,255,.95)'); g.addColorStop(0.6, 'rgba(255,255,255,.5)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); t = new THREE.CanvasTexture(c); return t } })()
export function Smoke() {
  const ref = useRef(), [cx, cz] = local(P.stove, 0, -0.02 - FLUE), y0 = 1.37
  const puffs = useMemo(() => [...Array(7)].map((_, i) => ({ m: new THREE.SpriteMaterial({ map: smokeTex(), color: '#a89aa2', transparent: true, depthWrite: false, opacity: 0 }), o: i / 7 })), [])
  useFrame(() => { const t = performance.now() / 1000, g = ref.current; if (!g) return
    g.children.forEach((sp, i) => { const p = puffs[i], u = (t * 0.22 + p.o) % 1; sp.position.set(Math.sin(u * 4 + i) * 0.04 + u * 0.12, u * 0.55, Math.cos(u * 3 + i) * 0.03 - u * 0.05); sp.scale.setScalar(0.06 + u * 0.16); p.m.opacity = Math.min(1, u * 6) * (1 - u) * 0.85 * (1 - 0.4 * T.night) }) })
  return <group ref={ref} position={[cx, y0, cz]}>{puffs.map((p, i) => <sprite key={i} material={p.m} />)}</group>
}

// the bed alcove half-wall, with a little shelf, a picture and a plant on the bed side
function Alcove() {
  const [x, z] = polar(ALCOVE.phi, R + 0.02), dx = -Math.sin(ALCOVE.phi * D2R), dz = Math.cos(ALCOVE.phi * D2R), rot = Math.atan2(-dz, dx) // local +x runs in toward the middle
  return <group position={[x, 0, z]} rotation-y={rot}>
    <Prop id="alcoveWall" opts={{ len: ALCOVE.len + 0.02, h: 0.85, low: 0.3, d: 0.07, shadow: false }} />
    <group position={[0.2, 0.3, -0.04]} rotation-y={Math.PI}><Prop id="bookShelf" opts={{}} scale={[0.55, 1, 0.7]} /></group>
    <group position={[0.17, 0.52, -0.045]} rotation-y={Math.PI}><Prop id="picture" /></group>
    <group position={[0.4, 0.3, -0.05]} rotation-y={Math.PI} scale={0.6}><Prop id="flowerPot" opts={{ shadow: false }} /></group>
  </group>
}
// sunlight through the kitchen window: a soft four-pane patch on the floor in front of the counter (daytime)
const paneTex = () => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); x.filter = 'blur(4px)'; x.fillStyle = '#fff'
  for (const [px, py] of [[18, 18], [68, 18], [18, 68], [68, 68]]) { x.beginPath(); x.roundRect(px, py, 42, 42, 8); x.fill() } const t = new THREE.CanvasTexture(c); return t }
export function WindowLight() {
  const m = useMemo(() => new THREE.MeshBasicMaterial({ map: paneTex(), color: '#ffe6a8', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }), [])
  useFrame(() => { m.opacity = 0.55 * Math.max(0, T.day - T.night) })
  const [x, z] = local(P.counter, -0.14, 0.5)
  return <mesh position={[x, 0.009, z]} rotation={[-Math.PI / 2, 0, P.counter.yaw + 0.25]} material={m} renderOrder={2}><planeGeometry args={[0.42, 0.34]} /></mesh>
}

// ---------- everything static, placed ----------
const at = (pl, y = 0) => ({ position: [pl.x, pl.y ?? y, pl.z], 'rotation-y': pl.yaw })
export function Shell() {
  const nookFront = 1.6 - NOOK.x0
  return <>
    <Walls /><NookTiles />
    <Prop id="counter" {...at(P.counter)} />
    <Prop id="fridge" {...at(P.fridge)} /><Prop id="firewood" {...at(P.firewood)} /><Prop id="woodStove" {...at(P.stove)} opts={{ flue: FLUE }} />
    <Prop id="jarShelf" {...at(P.jarShelf)} /><Prop id="bookShelf" {...at(P.bookShelf)} />
    <Prop id="archWindow" {...at(P.kitchenWindow)} opts={{ w: 0.36, h: 0.4, curtains: true, sillPlant: true }} /><Prop id="archWindow" {...at(P.leftWindow)} opts={{ w: 0.34, h: 0.39, sillPlant: true }} />
    <Prop id="mat" {...at(P.kitchenMat)} opts={{ w: 0.42, d: 0.2, shadow: false }} /><Prop id="mat" {...at(P.deskMat)} opts={{ w: 0.36, d: 0.26, shadow: false }} />
    <group position={[P.shelfPlant.x, P.shelfPlant.y, P.shelfPlant.z]} rotation-y={P.shelfPlant.yaw} scale={0.75}><Prop id="plant" opts={{ shadow: false }} /></group>
    {[-64, -100, 34, 72].map(ph => { const pl = onWall(ph, 0), z = polar(ph, R)[1]; return <Prop key={ph} id="timber" opts={{ h: wallH(z) - 0.02 }} {...at(pl)} /> })}
    <Alcove />
    <Prop id="desk" {...at(P.desk)} /><Prop id="pegboard" {...at(P.pegboard)} /><Prop id="stool" {...at(P.stool)} />
    <Prop id="petBed" {...at(P.petBed)} /><Prop id="petBowls" {...at(P.petBowls)} />
    <Prop id="roundRug" {...at(P.rug)} opts={{ rx: 0.55, rz: 0.46, shadow: false }} pal={{ rug: '#f2dcc0', ring: '#e2b98e' }} />
    <Prop id="roundTable" {...at(P.table)} opts={{ lantern: true }} /><Prop id="pouf" {...at(P.poufL)} /><Prop id="pouf" {...at(P.poufR)} />
    <Prop id="wardrobe" {...at(P.wardrobe)} /><Prop id="nightstand" {...at(P.nightstand)} /><Prop id="bed" {...at(P.bed)} /><Prop id="runner" {...at(P.runner)} />
    <Prop id="coatStand" {...at(P.coatStand)} />
    {/* bath nook: partition (plain side wall + arched front), tub, loo, towel, porthole frame */}
    <Prop id="wallPanel" opts={{ w: 0.97, h: 0.8, d: 0.06 }} position={[NOOK.x0, 0, NOOK.z1 - 0.485]} rotation-y={Math.PI / 2} />
    <Prop id="archWall" opts={{ w: nookFront, h: 0.8, d: 0.06, openW: 0.36, openH: 0.42 }} pal={{ wall: '#f8dcc4' }} position={[NOOK.x0 + nookFront / 2 - 0.03, 0, NOOK.z1]} />
    <Prop id="tub" {...at(P.tub)} /><Prop id="toilet" {...at(P.toilet)} /><Prop id="towelRail" {...at(P.towelRail)} />
    {(() => { const pl = onWall(PORT, 0); return <group position={[pl.x, (OPEN[2].y0 + OPEN[2].ys) / 2, pl.z]} rotation-y={pl.yaw}><O geo={GEO.tor} mat={tm(W.light)} scale={[0.082, 0.082, 0.06]} out={OUT.fine} /></group> })()}
    {/* front entrance, as in the concept: lantern posts hugging the door frame, stone steps with a mat, daisy pots, bushes */}
    {[-1, 1].map(s => { const [x, z] = polar(180 + s * 10.4, R + 0.085); return <Prop key={s} id="lanternPost" position={[x, 0, z]} rotation-y={-s * 10.4 * D2R} /> })}
    <Prop id="steps" opts={{ w: 0.44, mat: true }} position={[0, 0, R + 0.075]} />
    {[-1, 1].map(s => { const [x, z] = polar(180 + s * 19, R + 0.15); return <Prop key={'f' + s} id="flowerPot" position={[x, 0, z]} rotation-y={s} /> })}
    {[[-154, 0.2, 1], [154, 0.2, 1], [-125, 0.2, 0.9], [125, 0.2, 0.9], [-203, 0.24, 0.8], [203, 0.24, 0.8]].map(([a, d, k], i) => { const [x, z] = polar(a, R + d); return <Prop key={'b' + i} id="bush" position={[x, -0.02, z]} rotation-y={i} scale={k} /> })}
  </>
}
// the hanging lantern: a bracket out of the back wall, the lantern sways from its tip (Room.jsx)
export const LAMP = (() => { const pl = onWall(2, 1.02); const [x, z] = local(pl, 0, 0.16); return { ...pl, lx: x, lz: z } })()
