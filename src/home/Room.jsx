// Her house, inside: a cozy single room (bed, kitchen + stove, table, bookshelf, plants, warm window light), the
// door transition, the interior camera, her interior movement, and crafted decor placed indoors.
// The room is built in planet-local space at the planet's centre. While she is inside, the camera only renders
// layer 5 (room + her + lights), so the outside world costs nothing and can never show through.
import * as THREE from 'three'
import { actLocked, startAct } from '../act.js'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { HOME, ROOM, DOOR, BLOCKS, resolve, freeAt, roomToWorld } from './state.js'
import { O, Merge, GEO, tm, OUT, canvasTex } from './kit.jsx'
import { toon, T, C, CC, q, VIEW } from '../common.jsx'
import { toonRamp, R, height } from '../world.js'
import { PAD, CAM } from '../touch.jsx'
import { G, emit, toast } from '../game/store.js'
import { CAT } from '../pets/catState.js'
const Cat = React.lazy(() => import('../pets/Cat.jsx').then(m => ({ default: m.Cat })))
// round7: home activities (sleep, cook, bath, tea, read, water plants, feed the pets) + the refined interior clutter: own chunk
const Activities = React.lazy(() => import('./Activities.jsx'))
const PETCAM = q.get('petcam') // debug: close camera on the cat (?petcam=1, or an angle in radians)

const UP = new THREE.Vector3(0, 1, 0), _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3()
const LAYER = 5
export const W = { wall: '#f6e7cc', wain: '#b98a5a', wood: '#a8744c', dark: '#7a5236', light: '#d9b07a', quilt: '#e8846a', sheet: '#fbf3e4', pot: '#d9825a', leaf: '#6fae5f', leaf2: '#8fcf6a', rug: '#c96a5a', rug2: '#f2c46a', iron: '#4a4048' }

// ---------- transitions ----------
let snapFrames = 0
function fadeTo(v, ms) { return new Promise(res => { const v0 = HOME.fade, t0 = performance.now(); const f = () => { const k = Math.min(1, (performance.now() - t0) / ms); HOME.fade = v0 + (v - v0) * (k * k * (3 - 2 * k)); if (k < 1) requestAnimationFrame(f); else res() }; f() }) }
HOME.enter = async () => {
  if (HOME.busy || HOME.inside) return; HOME.busy = true; startAct('door'); await new Promise(r => setTimeout(r, 300)); HOME.doorOpen = 1
  await fadeTo(1, 380)
  HOME.inside = true; Object.assign(HOME.hp, { x: DOOR.x, z: DOOR.z + 0.28, yaw: Math.PI * 0.92, target: null }); snapFrames = 3
  HOME.onEnter && HOME.onEnter()
  setTimeout(() => { HOME.doorOpen = 0 }, 350)
  await fadeTo(0, 520); HOME.busy = false
}
HOME.exit = async () => {
  if (HOME.busy || !HOME.inside) return; HOME.needDog && HOME.needDog(); HOME.busy = true; startAct('door'); await new Promise(r => setTimeout(r, 300)); HOME.doorOpen = 1
  await fadeTo(1, 380)
  const P = HOME.P; HOME.inside = false
  if (P && HOME.outN) { P.n.copy(HOME.outN); const f = HOME.outN.clone().sub(HOME.homeN); P.fwd.copy(f.addScaledVector(P.n, -f.dot(P.n)).normalize()).applyAxisAngle(P.n, 1.25); /* step out along the porch so the follow camera clears the house */ P.target = null; P.h = 0; P.vy = 0 }
  HOME.snapOut = 6; HOME.snap0 = window.__snap
  HOME.onExit && HOME.onExit()
  setTimeout(() => { HOME.doorOpen = 0 }, 300)
  await fadeTo(0, 520); HOME.busy = false
}
// ---------- her movement inside (keyboard is tank-style like outdoors; the touch stick is camera-relative) ----------
HOME.stepInside = (dt, KEYS, P, obj) => {
  HOME.P = P; HOME.playerObj = obj; const hp = HOME.hp
  let f = (KEYS.w || KEYS.arrowup ? 1 : 0) - (KEYS.s || KEYS.arrowdown ? 1 : 0), turn = (KEYS.a || KEYS.arrowleft ? 1 : 0) - (KEYS.d || KEYS.arrowright ? 1 : 0)
  if (CAM.yaw) { hp.yaw -= CAM.yaw; CAM.yaw = 0 }
  if (PAD.active && PAD.mag > 0.12 && !f && !turn) { const want = HOME.camYaw - Math.atan2(PAD.x, PAD.y); /* camera-relative: up = away from the camera, right = screen right (the old +PI mirrored both axes) */ let d = want - hp.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); hp.yaw += d * Math.min(1, dt * 9); f = Math.min(1, (PAD.mag - 0.12) / 0.6) * (Math.abs(d) < 1.6 ? 1 : 0.3) }
  if (f || turn) hp.target = null
  if (hp.target) { const dx = hp.target.x - hp.x, dz = hp.target.z - hp.z, d = Math.hypot(dx, dz); if (d < 0.05) hp.target = null; else { let dd = Math.atan2(dx, dz) - hp.yaw; dd = Math.atan2(Math.sin(dd), Math.cos(dd)); hp.yaw += dd * Math.min(1, dt * 10); f = Math.abs(dd) < 1.2 ? 1 : 0.2 } }
  if (HOME.busy || (G.ui.panel) || actLocked()) f = turn = 0
  const run = KEYS.shift || (PAD.active && PAD.run)
  hp.yaw += turn * 2.0 * dt // polish: softer indoor turn
  const sp = f * (run ? 0.81 : 0.52) / ROOM.S * 1.15 * dt; hp.x += Math.sin(hp.yaw) * sp; hp.z += Math.cos(hp.yaw) * sp; resolve(hp, 0.09) // polish: ~22% slower indoors
  P.move += ((f ? Math.max(0.35, Math.abs(f)) : 0) - P.move) * Math.min(1, dt * 8); P.phase += dt * (run ? 11 : 8.2) * P.move; P.h = 0; P.vy = 0
  obj.position.set(hp.x * ROOM.S, ROOM.y, hp.z * ROOM.S); obj.quaternion.setFromAxisAngle(UP, hp.yaw)
  const ps = HOME.pose; if (ps && ps.k > 0.001) { // round7: home activities place her (bed / tub / chair), eased by ps.k
    _a.set(ps.x * ROOM.S, ROOM.y + ps.y * ROOM.S, ps.z * ROOM.S); obj.position.lerp(_a, ps.k); _q.setFromAxisAngle(UP, ps.yaw); if (ps.tilt) _q.multiply(_q2.setFromAxisAngle(_X, ps.tilt)); obj.quaternion.slerp(_q, ps.k) }
}
const _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _X = new THREE.Vector3(1, 0, 0)
// interior camera: stays inside the walls (never clips), eases after her, slightly wider lens
const camL = new THREE.Vector3(), lookL = new THREE.Vector3(), _goal = new THREE.Vector3(), _look = new THREE.Vector3()
let fov0 = null
HOME.camera = (camera, g, dt) => {
  if (!HOME.inside && HOME.snapOut > 0) { window.__snap = true; if (--HOME.snapOut === 0) setTimeout(() => { window.__snap = HOME.snap0 }, 0) } // land the follow camera behind her at once
  if (!HOME.inside) { if (fov0 != null) { camera.fov = fov0; fov0 = null; camera.updateProjectionMatrix(); camera.layers.set(0) } return HOME.camOverride ? HOME.camOverride(camera, g) : false }
  if (VIEW.mode !== 'follow') VIEW.mode = 'follow'
  if (fov0 == null) { fov0 = camera.fov; camera.fov = 56; camera.updateProjectionMatrix(); camera.layers.set(LAYER) }
  const hp = HOME.hp, z = Math.min(1, Math.max(0.6, CAM.zoom))
  // frame her, and lean toward the cat when he's close by
  const dc = Math.hypot(CAT.x - hp.x, CAT.z - hp.z), w = dc < 0.9 ? 0.45 * (1 - dc / 0.9) : 0, fx = hp.x + (CAT.x - hp.x) * w, fz = hp.z + (CAT.z - hp.z) * w
  _goal.set(Math.max(-0.8, Math.min(0.8, fx * 0.5)), 0.68 + 0.36 * z + 0.12 * CAM.pitch, ROOM.z1 - 0.08)
  _look.set(fx * 0.85, 0.22 + CAT.y * w, Math.min(fz - 0.12, 0.5))
  if (PETCAM) { const a = window.__camA ?? (+PETCAM || 0.5), dd = window.__camD ?? 0.55; _goal.set(CAT.x + Math.sin(a) * dd, CAT.y + (window.__camH ?? 0.32 * dd / 0.55 * 0.8 + 0.06), CAT.z + Math.cos(a) * dd); _look.set(CAT.x, CAT.y + 0.07, CAT.z) }
  const ps = HOME.pose; if (ps && !PETCAM && ps.cam !== false) { const pk = Math.min(1, ps.k), cz = Math.min(ROOM.z1 - 0.08, ps.z + 0.62) // round7: activities frame the bed / tub / chair
    const nearF = ps.z > 0.35; _goal.lerp(_a.set(nearF ? ps.x + 0.6 : Math.max(-0.9, Math.min(0.9, ps.x * 0.75)), nearF ? 1.0 : 0.82, cz), pk); _look.lerp(_b.set(ps.x, 0.24 + (ps.y || 0), ps.z - 0.05), pk) }
  const k = snapFrames > 0 ? 1 : 1 - Math.exp(-dt * 2.0); snapFrames-- // polish: softer interior cam
  camL.lerp(_goal, k); lookL.lerp(_look, k); HOME.camYaw = Math.atan2(lookL.x - camL.x, lookL.z - camL.z); /* yaw the interior camera faces (≈π) */ if (k === 1) { camL.copy(_goal); lookL.copy(_look) }
  camera.position.copy(roomToWorld(camL.x, camL.y, camL.z, _a)); camera.up.copy(_b.copy(UP).transformDirection(HOME.roomObj.matrixWorld)); camera.lookAt(roomToWorld(lookL.x, lookL.y, lookL.z, _c))
  return true
}
// the sun while inside: low, through the window on the left wall
HOME.sun = () => { if (HOME.roomObj) T.sun.copy(_a.set(-0.8, 0.55 - 0.85 * T.night, 0.35).normalize().transformDirection(HOME.roomObj.matrixWorld)) }

// ---------- textures ----------
const planks = () => canvasTex(512, 512, (x) => { x.fillStyle = '#c99566'; x.fillRect(0, 0, 512, 512); for (let r = 0; r < 8; r++) { let px = -(r * 97) % 200; while (px < 512) { const w = 160 + ((r * 31 + px) % 7) * 18; const l = 0.9 + ((r * 13 + px * 7) % 5) * 0.03; x.fillStyle = `rgb(${201 * l | 0},${149 * l | 0},${102 * l | 0})`; x.fillRect(px + 2, r * 64 + 2, w - 4, 60); x.strokeStyle = 'rgba(110,70,40,.25)'; x.lineWidth = 2; for (let k = 0; k < 3; k++) { x.beginPath(); x.moveTo(px + 8, r * 64 + 14 + k * 16); x.bezierCurveTo(px + w * 0.3, r * 64 + 10 + k * 16, px + w * 0.6, r * 64 + 20 + k * 16, px + w - 8, r * 64 + 14 + k * 16); x.stroke() } px += w } x.fillStyle = '#7a5236'; x.fillRect(0, r * 64, 512, 3) } })
const view = () => canvasTex(512, 384, (x, w, h) => { const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#8fc3e8'); g.addColorStop(0.6, '#fdf1d4'); x.fillStyle = g; x.fillRect(0, 0, w, h)
  x.fillStyle = 'rgba(255,255,255,.9)'; for (const [cx, cy, s] of [[120, 70, 1], [380, 110, 0.8]]) for (let k = 0; k < 4; k++) { x.beginPath(); x.arc(cx + k * 26 * s, cy - (k % 2) * 12 * s, 26 * s, 0, 7); x.fill() }
  x.fillStyle = '#a9d68a'; x.beginPath(); x.moveTo(0, 250); x.bezierCurveTo(120, 190, 260, 240, 512, 200); x.lineTo(512, h); x.lineTo(0, h); x.fill()
  x.fillStyle = '#7fbf6a'; x.beginPath(); x.moveTo(0, 300); x.bezierCurveTo(160, 250, 330, 320, 512, 270); x.lineTo(512, h); x.lineTo(0, h); x.fill()
  for (const [tx, ty, s] of [[90, 250, 1.2], [140, 262, 0.9], [420, 230, 1.1], [460, 240, 0.8]]) { x.fillStyle = '#8a5a3c'; x.fillRect(tx - 4 * s, ty - 10 * s, 8 * s, 30 * s); x.fillStyle = '#4f9a5e'; x.beginPath(); x.arc(tx, ty - 26 * s, 26 * s, 0, 7); x.fill() }
  x.fillStyle = '#fff4f0'; for (let k = 0; k < 40; k++) { x.beginPath(); x.arc((k * 97) % w, 300 + (k * 53) % 80, 3, 0, 7); x.fill() } })

// ---------- furniture ----------
export function Box({ p, s, c, paint = 0, out = OUT.room, rot, geo = GEO.box }) { return <O geo={geo} mat={tm(c, paint)} position={p} scale={s} rotation={rot} out={out} /> }
function Walls() {
  const { x0, x1, z0, z1, h } = ROOM, t = 0.06, wall = W.wall
  const dl = DOOR.x - DOOR.w / 2, dr = DOOR.x + DOOR.w / 2, wz0 = -0.1, wz1 = 0.4, wy0 = 0.42, wy1 = 0.86
  return <group>
    {/* back wall with the door opening */}
    <Box p={[(x0 + dl) / 2, h / 2, z0 - t / 2]} s={[dl - x0, h, t]} c={wall} paint={0.08} out={null} />
    <Box p={[(dr + x1) / 2, h / 2, z0 - t / 2]} s={[x1 - dr, h, t]} c={wall} paint={0.08} out={null} />
    <Box p={[DOOR.x, (DOOR.h + h) / 2, z0 - t / 2]} s={[DOOR.w, h - DOOR.h, t]} c={wall} paint={0.08} out={null} />
    {/* left wall with the window */}
    <Box p={[x0 - t / 2, h / 2, (z0 + wz0) / 2]} s={[t, h, wz0 - z0]} c={wall} paint={0.08} out={null} />
    <Box p={[x0 - t / 2, h / 2, (wz1 + z1) / 2]} s={[t, h, z1 - wz1]} c={wall} paint={0.08} out={null} />
    <Box p={[x0 - t / 2, wy0 / 2, (wz0 + wz1) / 2]} s={[t, wy0, wz1 - wz0]} c={wall} paint={0.08} out={null} />
    <Box p={[x0 - t / 2, (wy1 + h) / 2, (wz0 + wz1) / 2]} s={[t, h - wy1, wz1 - wz0]} c={wall} paint={0.08} out={null} />
    <Box p={[x1 + t / 2, h / 2, 0]} s={[t, h, z1 - z0 + 0.1]} c={'#f2dfc0'} paint={0.08} out={null} />
    <Box p={[0, h / 2, z1 + t / 2]} s={[x1 - x0 + 0.1, h, t]} c={wall} out={null} />
    <Box p={[0, h + 0.03, 0]} s={[x1 - x0 + 0.1, 0.06, z1 - z0 + 0.1]} c={'#e8d2ac'} out={null} />
    {/* wainscot + skirting */}
    {[[0, z0 + 0.012, x1 - x0, 'z'], [0, z1 - 0.012, x1 - x0, 'z']].map(([x, z, L], i) => <group key={i}>{i === 0 ? <><Box p={[(x0 + dl) / 2, 0.16, z]} s={[dl - x0, 0.32, 0.024]} c={W.wain} paint={0.15} /><Box p={[(dr + x1) / 2, 0.16, z]} s={[x1 - dr, 0.32, 0.024]} c={W.wain} paint={0.15} /></> : <Box p={[x, 0.16, z]} s={[L, 0.32, 0.024]} c={W.wain} paint={0.15} />}</group>)}
    <Box p={[x0 + 0.012, 0.16, 0]} s={[0.024, 0.32, z1 - z0]} c={W.wain} paint={0.15} />
    <Box p={[x1 - 0.012, 0.16, 0]} s={[0.024, 0.32, z1 - z0]} c={W.wain} paint={0.15} />
    {[z0 + 0.03, z1 - 0.03].map(z => <Box key={z} p={[0, 0.335, z]} s={[x1 - x0, 0.025, 0.05]} c={W.dark} />)}
    {/* ceiling beams */}
    {[-0.75, 0, 0.75].map(z => <Box key={z} p={[0, h - 0.05, z * 0.9]} s={[x1 - x0, 0.09, 0.09]} c={W.dark} paint={0.15} />)}
    {[x0 + 0.05, x1 - 0.05].map(x => <Box key={x} p={[x, h / 2, z0 + 0.05]} s={[0.08, h, 0.08]} c={W.dark} />)}
  </group>
}
function Floor({ onDown }) {
  const mat = useMemo(() => { const t = planks(); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2.2, 1.8); return new THREE.MeshToonMaterial({ map: t, gradientMap: toonRamp }) }, [])
  return <mesh position={[0, -0.02, 0]} material={mat} onPointerDown={onDown}><boxGeometry args={[ROOM.x1 - ROOM.x0, 0.04, ROOM.z1 - ROOM.z0]} /></mesh>
}
function Window() {
  const vm = useMemo(() => new THREE.MeshBasicMaterial({ map: view(), toneMapped: false }), []), wz = 0.15, x = ROOM.x0
  const curtain = useRef()
  useFrame(() => { vm.color.setRGB(1, 1, 1).lerp(CC('#ffc49a'), T.dusk * 0.6).lerp(CC('#2a3366'), T.night * 0.85); const t = performance.now() / 1000; if (curtain.current) curtain.current.children.forEach((c, i) => { c.rotation.y = (i ? -1 : 1) * (0.12 + Math.sin(t * 0.9 + i) * 0.05) }) })
  return <group>
    <mesh position={[x - 0.35, 0.66, wz]} rotation={[0, Math.PI / 2, 0]} material={vm}><planeGeometry args={[1.4, 1.05]} /></mesh>
    {[[0.42, 'y'], [0.86, 'y']].map(([y], i) => <Box key={i} p={[x + 0.01, y, wz]} s={[0.1, 0.035, 0.56]} c={W.light} />)}
    {[-0.1, 0.4].map(z => <Box key={z} p={[x + 0.01, 0.64, z]} s={[0.1, 0.48, 0.035]} c={W.light} />)}
    <Box p={[x, 0.64, wz]} s={[0.025, 0.44, 0.018]} c={W.light} /><Box p={[x, 0.64, wz]} s={[0.025, 0.018, 0.5]} c={W.light} />
    <Box p={[x + 0.09, 0.425, wz]} s={[0.2, 0.028, 0.62]} c={W.wood} paint={0.15} />
    <group ref={curtain}>{[-1, 1].map(s => <group key={s} position={[x + 0.06, 0.9, wz + s * 0.29]}><O geo={GEO.pillow} mat={tm('#f59ab0')} position={[0, -0.2, -s * 0.03]} scale={[0.02, 0.42, 0.11]} out={OUT.fine} /></group>)}</group>
    <Box p={[x + 0.07, 0.93, wz]} s={[0.02, 0.02, 0.8]} c={W.dark} />
    {/* little pot of herbs on the sill */}
    <group position={[x + 0.1, 0.44, wz + 0.22]}><Box geo={GEO.cyl} p={[0, 0.03, 0]} s={[0.035, 0.06, 0.035]} c={W.pot} />{[0, 1, 2, 3, 4].map(i => <O key={i} geo={GEO.sph} mat={tm(W.leaf2)} position={[Math.cos(i * 1.3) * 0.015, 0.08 + (i % 2) * 0.015, Math.sin(i * 1.3) * 0.015]} scale={[0.014, 0.03, 0.02]} rotation={[0.3 * Math.sin(i), i, 0]} out={OUT.fine} />)}</group>
  </group>
}
function Sunbeam() {
  const m = useMemo(() => new THREE.MeshBasicMaterial({ color: '#fff0b8', transparent: true, opacity: 0.16, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false }), [])
  const fl = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ffe7a0', transparent: true, opacity: 0.3, depthWrite: false, toneMapped: false }), [])
  const geo = useMemo(() => { const g = new THREE.BufferGeometry(); const wx = ROOM.x0, a = [[wx, 0.86, -0.1], [wx, 0.86, 0.4], [wx, 0.42, 0.4], [wx, 0.42, -0.1]], b = [[-0.42, 0.003, 0.0], [-0.42, 0.003, 0.5], [-0.82, 0.003, 0.5], [-0.82, 0.003, 0.0]]; const v = []; for (let i = 0; i < 4; i++) { const j = (i + 1) % 4; v.push(...a[i], ...a[j], ...b[j], ...a[i], ...b[j], ...b[i]) } g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3)); return g }, [])
  const motes = useMemo(() => { const p = []; for (let i = 0; i < 40; i++) { const u = Math.random(); p.push(ROOM.x0 + (-0.62 - ROOM.x0) * u + Math.random() * 0.15, 0.64 * (1 - u) + 0.05 + Math.random() * 0.25, 0.25 * 1 + (Math.random() - 0.5) * 0.45) } const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); return g }, [])
  const mm = useMemo(() => new THREE.PointsMaterial({ color: '#fff6d0', size: 0.012, transparent: true, opacity: 0.8, depthWrite: false, toneMapped: false }), [])
  const mref = useRef()
  useFrame(() => { const d = Math.max(0, T.day - T.night); m.opacity = 0.16 * d + 0.03 * T.dusk; fl.opacity = 0.3 * d; mm.opacity = 0.8 * d; if (mref.current) mref.current.rotation.y = Math.sin(performance.now() / 4000) * 0.02 })
  return <group><mesh geometry={geo} material={m} renderOrder={3} /><mesh position={[-0.62, 0.004, 0.25]} rotation={[-Math.PI / 2, 0, 0]} material={fl} renderOrder={2}><planeGeometry args={[0.4, 0.5]} /></mesh><points ref={mref} geometry={motes} material={mm} /></group>
}
function Bed() {
  return <group position={[-0.96, 0, -0.6]}>
    <Box p={[0, 0.09, 0]} s={[0.66, 0.16, 0.8]} c={W.wood} paint={0.15} />
    <Box p={[0, 0.3, -0.38]} s={[0.68, 0.42, 0.05]} c={W.dark} paint={0.15} />
    <O geo={GEO.sph} mat={tm(W.dark)} position={[0, 0.5, -0.38]} scale={[0.34, 0.08, 0.025]} />
    <O geo={GEO.pillow} mat={tm(W.sheet)} position={[0, 0.21, 0]} scale={[0.62, 0.1, 0.76]} />
    <O geo={GEO.pillow} mat={tm(W.quilt, 0.12)} position={[0, 0.26, 0.1]} scale={[0.66, 0.05, 0.58]} />
    {[[-0.2, 0.1], [0.05, 0.25], [0.2, -0.05], [-0.1, 0.33]].map(([x, z], i) => <mesh key={i} geometry={GEO.box} material={tm(['#f2c46a', '#8fc3e8', '#fbf3e4', '#b8e0a8'][i])} position={[x, 0.287, z]} scale={[0.12, 0.004, 0.12]} rotation={[0, 0.1 * i, 0]} />)}
    <O geo={GEO.pillow} mat={tm('#fffaf0')} position={[0, 0.29, -0.26]} scale={[0.4, 0.08, 0.17]} />
    {/* bedside crate + candle */}
    <group position={[0.42, 0, -0.3]}><Box p={[0, 0.11, 0]} s={[0.16, 0.22, 0.16]} c={W.light} paint={0.15} /><Box geo={GEO.cyl} p={[0, 0.25, 0]} s={[0.018, 0.05, 0.018]} c={'#fffaf0'} /><mesh position={[0, 0.285, 0]} material={FLAME}><sphereGeometry args={[0.009, 8, 6]} /></mesh>
      <Box p={[0.03, 0.235, 0.04]} s={[0.07, 0.025, 0.05]} c={'#5f8fc4'} rot={[0, 0.4, 0]} /></group>
  </group>
}
const FLAME = new THREE.MeshBasicMaterial({ color: '#ffd27a', toneMapped: false })
const BOOKC = ['#d9655b', '#5f8fc4', '#e8a24a', '#8cc084', '#c97b9a', '#f6ead2', '#7a5236', '#4f9a5e']
function Shelf() {
  const books = useMemo(() => { const a = []; let s = 11; const r = () => (s = (s * 16807) % 2147483647) / 2147483647; for (let row = 0; row < 3; row++) { let x = -0.24; while (x < 0.22) { const w = 0.025 + r() * 0.02, h = 0.12 + r() * 0.06; if (r() < 0.12) { x += 0.05; continue } a.push({ x: x + w / 2, y: 0.08 + row * 0.25 + h / 2, w, h, c: BOOKC[Math.floor(r() * 8)], tilt: r() < 0.1 ? 0.2 : 0 }); x += w + 0.003 } } return a }, [])
  return <group position={[-0.1, 0, -0.91]}>
    <Box p={[0, 0.43, -0.06]} s={[0.56, 0.86, 0.02]} c={W.dark} />
    {[-0.27, 0.27].map(x => <Box key={x} p={[x, 0.43, 0]} s={[0.03, 0.86, 0.16]} c={W.wood} paint={0.15} />)}
    {[0.065, 0.315, 0.565, 0.85].map(y => <Box key={y} p={[0, y, 0]} s={[0.56, 0.025, 0.16]} c={W.wood} paint={0.15} />)}
    {books.map((b, i) => <O key={i} geo={GEO.box} mat={tm(b.c)} position={[b.x, b.y, 0.0]} scale={[b.w, b.h, 0.12]} rotation={[0, 0, b.tilt]} out={OUT.fine} />)}
    <group position={[0.13, 0.87, 0]}><Box geo={GEO.cyl} p={[0, 0.04, 0]} s={[0.04, 0.07, 0.04]} c={W.pot} />{[0, 1, 2, 3, 4, 5].map(i => <O key={i} geo={GEO.sph} mat={tm(i % 2 ? W.leaf : W.leaf2)} position={[Math.cos(i) * 0.04, 0.06 - i * 0.012, Math.sin(i) * 0.03 + 0.02]} scale={[0.03, 0.012, 0.05]} rotation={[0.6, i * 1.1, 0]} out={OUT.fine} />)}</group>
    <group position={[-0.15, 0.87, 0.01]}><Box geo={GEO.cyl} p={[0, 0.035, 0]} s={[0.03, 0.07, 0.03]} c={'#e8f6f0'} /><Box geo={GEO.sph} p={[0.06, 0.03, 0]} s={0.03} c={'#c8bca8'} /></group>
  </group>
}
function Kitchen() {
  const x = 1.15
  return <group>
    <Box p={[x, 0.2, 0.2]} s={[0.3, 0.4, 1.1]} c={W.wood} paint={0.15} />
    {[-0.15, 0.2, 0.55].map(z => <group key={z}><Box p={[x - 0.152, 0.2, z]} s={[0.01, 0.3, 0.3]} c={W.light} /><Box geo={GEO.sph} p={[x - 0.162, 0.3, z + 0.1]} s={0.012} c={'#e8b84a'} /></group>)}
    <Box p={[x - 0.01, 0.415, 0.2]} s={[0.34, 0.03, 1.14]} c={'#e9d4b0'} paint={0.1} />
    <Box p={[x, 0.42, 0.42]} s={[0.2, 0.03, 0.26]} c={'#9fb8c4'} />
    <Box geo={GEO.cyl} p={[x + 0.1, 0.5, 0.42]} s={[0.012, 0.14, 0.012]} c={'#b8b0a4'} /><Box p={[x + 0.05, 0.57, 0.42]} s={[0.1, 0.012, 0.012]} c={'#b8b0a4'} />
    <Box p={[x - 0.03, 0.44, 0.05]} s={[0.18, 0.015, 0.12]} c={W.light} rot={[0, 0.2, 0]} />
    {[[0.05, '#d9564a'], [-0.03, '#ffd36e'], [0.0, '#8fcf6a']].map(([dz, c], i) => <Box key={i} geo={GEO.sph} p={[x - 0.02 + dz, 0.465, 0.02 + i * 0.04]} s={[0.022, 0.018, 0.022]} c={c} />)}
    {/* shelf with jars + plates */}
    <Box p={[x + 0.05, 0.82, 0.2]} s={[0.2, 0.025, 0.9]} c={W.wood} paint={0.15} />
    {[-0.15, 0.0, 0.12, 0.3, 0.48].map((z, i) => <group key={z} position={[x + 0.06, 0.84, z]}><Box geo={GEO.cyl} p={[0, 0.045, 0]} s={[0.035, 0.09 - (i % 2) * 0.02, 0.035]} c={['#e8f6f0', '#f6c8b0', '#e8f6f0', '#ffe2a0', '#cfe6c8'][i]} /><Box geo={GEO.cyl} p={[0, 0.09 - (i % 2) * 0.02, 0]} s={[0.038, 0.015, 0.038]} c={W.dark} /></group>)}
    {[0.6, 0.68].map(z => <Box key={z} geo={GEO.cyl} p={[x + 0.1, 0.9, z]} s={[0.07, 0.008, 0.07]} c={'#fffaf0'} rot={[0, 0, Math.PI / 2 - 0.25]} />)}
    {/* hanging pans */}
    <Box p={[x + 0.1, 1.0, 0.2]} s={[0.015, 0.015, 0.7]} c={W.dark} />
    {[0.0, 0.2, 0.4].map((z, i) => <group key={z} position={[x + 0.08, 0.95, z]} rotation={[0, 0, 0.1]}><Box p={[0, 0, 0]} s={[0.006, 0.08, 0.006]} c={W.iron} /><Box geo={GEO.cyl} p={[0, -0.07 - i * 0.01, 0]} s={[0.012, 0.06 + i * 0.015, 0.06 + i * 0.015]} c={i === 1 ? '#c98a4a' : W.iron} rot={[0, 0, Math.PI / 2]} /></group>)}
    {/* garlic + herbs bundle */}
    {[0.75, 0.85].map((z, i) => <group key={z} position={[x + 0.1, 0.98, z]}><Box p={[0, -0.04, 0]} s={[0.004, 0.08, 0.004]} c={W.dark} out={null} /><Box geo={GEO.sph} p={[0, -0.1, 0]} s={[0.025, 0.035, 0.025]} c={i ? '#fbf3e4' : W.leaf} /></group>)}
  </group>
}
function Stove() {
  const glowM = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ff9a4a', toneMapped: false }), [])
  const steam = useRef()
  useFrame(() => { const t = performance.now() / 1000; glowM.color.setRGB(1, 0.55 + Math.sin(t * 7) * 0.05 + Math.sin(t * 13) * 0.04, 0.25); if (steam.current) steam.current.children.forEach((c, i) => { const u = (t * 0.35 + i / 4) % 1; c.position.set(Math.sin(t + i) * 0.02 + u * 0.03, u * 0.25, 0); c.scale.setScalar(0.015 + u * 0.03); c.material.opacity = 0.6 * (1 - u) }) })
  return <group position={[1.12, 0, -0.78]}>
    <Box p={[0, 0.03, 0]} s={[0.36, 0.06, 0.4]} c={'#cfc3b0'} paint={0.15} />
    <Box geo={GEO.cyl} p={[0, 0.24, 0]} s={[0.13, 0.36, 0.13]} c={W.iron} />
    <Box geo={GEO.cyl} p={[0, 0.43, 0]} s={[0.15, 0.03, 0.15]} c={'#3a3238'} />
    <mesh position={[-0.128, 0.2, 0]} rotation={[0, -Math.PI / 2, 0]} material={glowM}><circleGeometry args={[0.05, 16]} /></mesh>
    <Box geo={GEO.cyl} p={[0.04, 0.82, 0.02]} s={[0.03, 0.78, 0.03]} c={W.iron} />
    {/* kettle */}
    <group position={[-0.02, 0.46, 0.02]}><Box geo={GEO.sph} p={[0, 0.05, 0]} s={[0.07, 0.055, 0.07]} c={'#5f8fc4'} /><Box geo={GEO.tor} p={[0, 0.11, 0]} s={[0.04, 0.04, 0.04]} c={W.dark} rot={[0, Math.PI / 2, 0]} /><Box geo={GEO.cone} p={[-0.07, 0.07, 0]} s={[0.015, 0.06, 0.015]} c={'#5f8fc4'} rot={[0, 0, 1.0]} />
      <group ref={steam} position={[-0.1, 0.1, 0]}>{[0, 1, 2, 3].map(i => <mesh key={i} geometry={GEO.sphL}><meshBasicMaterial color="#ffffff" transparent depthWrite={false} /></mesh>)}</group></group>
    <Box p={[-0.05, 0.03, 0.3]} s={[0.14, 0.05, 0.08]} c={'#a8744c'} />{[0, 1, 2].map(i => <Box key={i} geo={GEO.cyl} p={[-0.1 + i * 0.05, 0.08, 0.3]} s={[0.018, 0.12, 0.018]} c={'#c8a070'} rot={[0, 0, Math.PI / 2]} />)}
  </group>
}
function Table() {
  return <group position={[0.2, 0, 0.18]}>
    <mesh position={[0, 0.003, 0]} rotation={[-Math.PI / 2, 0, 0]} material={tm(W.rug2)} scale={[0.5, 0.38, 1]}><circleGeometry args={[1, 40]} /></mesh>
    <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]} material={tm(W.rug)} scale={[0.45, 0.33, 1]}><circleGeometry args={[1, 40]} /></mesh>
    <mesh position={[0, 0.007, 0]} rotation={[-Math.PI / 2, 0, 0]} material={tm('#f6ead2')} scale={[0.3, 0.2, 1]}><ringGeometry args={[0.9, 1, 40]} /></mesh>
    <Box geo={GEO.cyl} p={[0, 0.3, 0]} s={[0.22, 0.03, 0.22]} c={W.wood} paint={0.15} />
    <Box geo={GEO.cyl} p={[0, 0.15, 0]} s={[0.03, 0.28, 0.03]} c={W.dark} />
    <Box geo={GEO.cyl} p={[0, 0.015, 0]} s={[0.1, 0.02, 0.1]} c={W.dark} />
    <mesh position={[0, 0.317, 0]} rotation={[-Math.PI / 2, 0, 0.3]} material={tm('#fffaf0')}><planeGeometry args={[0.18, 0.18]} /></mesh>
    {/* teapot, cups, flowers */}
    {/* round7: the teapot + her cup are animated in Activities.jsx (make tea) */}
    <Box geo={GEO.cyl} p={[0.07, 0.335, 0.09]} s={[0.018, 0.035, 0.018]} c={'#fffaf0'} />
    <group position={[-0.08, 0.315, -0.1]}><Box geo={GEO.cyl} p={[0, 0.035, 0]} s={[0.018, 0.07, 0.018]} c={'#8fc3e8'} />{[0, 1, 2, 3].map(i => <group key={i} position={[Math.cos(i * 1.6) * 0.012, 0.1 + i * 0.008, Math.sin(i * 1.6) * 0.012]}><Box geo={GEO.sph} p={[0, 0, 0]} s={0.013} c={['#f59ab0', '#ffd36e', '#fffaf0', '#c9b3ff'][i]} out={OUT.fine} /></group>)}</group>
    {/* stools */}
    {[[-0.34, 0.08], [0.2, -0.28], [0.32, 0.26]].map(([x, z], i) => <group key={i} position={[x, 0, z]}><Box geo={GEO.cyl} p={[0, 0.18, 0]} s={[0.075, 0.025, 0.075]} c={W.light} paint={0.15} />{[0, 1, 2].map(k => <Box key={k} geo={GEO.cyl} p={[Math.cos(k * 2.1) * 0.05, 0.085, Math.sin(k * 2.1) * 0.05]} s={[0.01, 0.17, 0.01]} c={W.dark} rot={[Math.sin(k * 2.1) * 0.12, 0, -Math.cos(k * 2.1) * 0.12]} />)}<O geo={GEO.pillow} mat={tm(['#f59ab0', '#8fc3e8', '#f2c46a'][i])} position={[0, 0.2, 0]} scale={[0.12, 0.022, 0.12]} out={OUT.fine} /></group>)}
  </group>
}
export function Plant({ p, s = 1, big, gref }) { // round7: the indoor plants live in Activities.jsx (they perk up when watered)
  return <group ref={gref} position={p} scale={s}>
    <Box geo={GEO.cyl} p={[0, 0.07, 0]} s={[0.08, 0.14, 0.08]} c={W.pot} paint={0.12} /><Box geo={GEO.cyl} p={[0, 0.145, 0]} s={[0.088, 0.02, 0.088]} c={'#c46f4a'} />
    {(big ? [0, 1, 2, 3, 4, 5, 6] : [0, 1, 2, 3, 4]).map(i => { const a = i * 2.4, tilt = 0.5 + (i % 3) * 0.2; return <group key={i} position={[0, 0.15, 0]} rotation={[Math.cos(a) * tilt, 0, Math.sin(a) * tilt]}><Box geo={GEO.cyl} p={[0, 0.1 + (i % 2) * 0.04, 0]} s={[0.005, 0.2 + (i % 2) * 0.08, 0.005]} c={'#5a8a44'} out={null} /><O geo={GEO.sph} mat={tm(i % 2 ? W.leaf : W.leaf2)} position={[0, 0.22 + (i % 2) * 0.08, 0]} scale={[0.075, 0.018, 0.05]} rotation={[0.3, a, 0]} out={OUT.fine} /></group> })}
  </group>
}
function Door() {
  const leaf = useRef()
  useFrame((_, dt) => { if (leaf.current) leaf.current.rotation.y += ((HOME.doorOpen ? 1.25 : 0) - leaf.current.rotation.y) * Math.min(1, dt * 6) })
  const z = ROOM.z0, { x, w, h } = DOOR
  const winM = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ffe7a0', toneMapped: false }), [])
  return <group>
    <mesh position={[x, h / 2, z - 0.08]} material={winM}><planeGeometry args={[w, h]} /></mesh>
    {[-1, 1].map(s => <Box key={s} p={[x + s * (w / 2 + 0.02), h / 2, z + 0.005]} s={[0.045, h + 0.04, 0.06]} c={W.dark} paint={0.12} />)}
    <Box p={[x, h + 0.02, z + 0.005]} s={[w + 0.09, 0.05, 0.07]} c={W.dark} />
    <group ref={leaf} position={[x - w / 2, 0, z + 0.01]}><group position={[w / 2, h / 2, 0]}>
      <Box p={[0, 0, 0]} s={[w - 0.01, h - 0.01, 0.03]} c={'#5f8fc4'} paint={0.15} />
      {[-0.07, 0.07].map(dx => <Box key={dx} p={[dx, -0.12, 0.018]} s={[0.1, 0.2, 0.01]} c={'#4f7fb4'} out={OUT.fine} />)}
      <mesh position={[0, 0.15, 0.017]} material={winM}><circleGeometry args={[0.055, 20]} /></mesh>
      <Box geo={GEO.tor} p={[0, 0.15, 0.018]} s={[0.058, 0.058, 0.06]} c={W.dark} />
      <Box geo={GEO.sph} p={[0.11, 0, 0.03]} s={0.015} c={'#e8b84a'} />
    </group></group>
    <mesh position={[x, 0.004, z + 0.2]} rotation={[-Math.PI / 2, 0, 0]} material={tm('#c8a070')} scale={[0.2, 0.12, 1]}><planeGeometry args={[1, 1]} /></mesh>
    {/* boots + coat hook by the door */}
    {[-1, 1].map(s => <Box key={s} geo={GEO.pillow} p={[x + 0.26 + s * 0.035, 0.03, z + 0.1]} s={[0.05, 0.06, 0.09]} c={'#7a4630'} />)}
    <Box p={[x - 0.3, 0.72, z + 0.02]} s={[0.22, 0.03, 0.02]} c={W.wood} />
    <group position={[x - 0.36, 0.69, z + 0.05]}><O geo={GEO.pillow} mat={tm('#e0614f')} position={[0, -0.1, 0]} scale={[0.07, 0.2, 0.03]} out={OUT.fine} /></group>
    <group position={[x - 0.22, 0.7, z + 0.05]}><Box geo={GEO.cyl} p={[0, -0.02, 0]} s={[0.09, 0.012, 0.09]} c={'#e9c46a'} rot={[1.2, 0, 0]} /><Box geo={GEO.half} p={[0, -0.02, 0.01]} s={[0.05, 0.04, 0.05]} c={'#e9c46a'} rot={[1.2, 0, 0]} /></group>
  </group>
}
function Pictures() {
  const tex = useMemo(() => canvasTex(256, 200, (x, w, h) => { x.fillStyle = '#cfe6ff'; x.fillRect(0, 0, w, h); x.fillStyle = '#9fd17a'; x.beginPath(); x.arc(w / 2, h * 0.62, 70, 0, 7); x.fill(); x.strokeStyle = '#4a3a35'; x.lineWidth = 5; x.stroke(); x.fillStyle = '#d9655b'; x.beginPath(); x.moveTo(110, 82); x.lineTo(128, 62); x.lineTo(146, 82); x.fill(); x.fillStyle = '#fbf3e4'; x.fillRect(114, 82, 28, 20); x.fillStyle = '#4f9a5e'; for (const [a, b] of [[80, 110], [170, 100], [150, 150]]) { x.beginPath(); x.arc(a, b, 12, 0, 7); x.fill() } x.fillStyle = '#ffd36e'; x.beginPath(); x.arc(40, 40, 18, 0, 7); x.fill() }), [])
  return <group>
    <group position={[-0.96, 0.78, ROOM.z0 + 0.02]}><Box p={[0, 0, 0]} s={[0.3, 0.24, 0.02]} c={W.dark} /><mesh position={[0, 0, 0.012]}><planeGeometry args={[0.26, 0.2]} /><meshBasicMaterial map={tex} /></mesh></group>
    <group position={[ROOM.x1 - 0.02, 0.72, -0.3]} rotation={[0, -Math.PI / 2, 0]}>{/* calendar + garland */}
      <Box p={[0, 0, 0]} s={[0.14, 0.18, 0.01]} c={'#fffaf0'} /><Box p={[0, 0.07, 0.006]} s={[0.14, 0.04, 0.004]} c={'#d9655b'} out={null} /></group>
    {[...Array(9)].map((_, i) => { const x = -0.95 + i * 0.1; return <O key={i} geo={GEO.cone} mat={tm(['#f59ab0', '#ffd36e', '#8fc3e8'][i % 3])} position={[x, 1.02 - Math.sin(i / 8 * Math.PI) * 0.06, ROOM.z0 + 0.03]} rotation={[0, 0, Math.PI]} scale={[0.025, 0.05, 0.006]} out={OUT.fine} /> })}
  </group>
}
function Lamp() {
  const shade = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ffd9a0', toneMapped: false }), []), light = useRef(), sway = useRef()
  useFrame(() => { const t = performance.now() / 1000; if (light.current) light.current.intensity = HOME.inside ? (0.9 + 1.6 * T.night + 0.6 * T.dusk) * (1 + Math.sin(t * 9) * 0.01) : 0; if (sway.current) sway.current.rotation.z = Math.sin(t * 0.7) * 0.03 })
  return <group ref={sway} position={[-0.25, ROOM.h, -0.35]}>
    <Box p={[0, -0.14, 0]} s={[0.004, 0.28, 0.004]} c={W.iron} out={null} />
    <O geo={GEO.cone} mat={tm('#e8a24a')} position={[0, -0.33, 0]} scale={[0.12, 0.11, 0.12]} out={OUT.fine} />
    <mesh position={[0, -0.39, 0]} material={shade}><sphereGeometry args={[0.03, 10, 8]} /></mesh>
    <pointLight ref={light} position={[0, -0.42, 0]} color="#ffc98a" distance={3.2} decay={1.6} intensity={0} />
  </group>
}
function Hanging() { // a trailing plant from the ceiling near the window
  return <group position={[-0.95, ROOM.h, 0.62]}>
    {[-1, 0, 1].map(k => <Box key={k} p={[k * 0.03, -0.12, 0]} s={[0.003, 0.24, 0.003]} c={'#e2c78e'} out={null} rot={[0, 0, k * 0.12]} />)}
    <Box geo={GEO.half} p={[0, -0.26, 0]} s={[0.07, -0.06, 0.07]} c={W.pot} />
    {[...Array(9)].map((_, i) => { const a = i * 0.7; return <O key={i} geo={GEO.sph} mat={tm(i % 2 ? W.leaf : W.leaf2)} position={[Math.cos(a) * 0.065, -0.27 - (i % 4) * 0.05, Math.sin(a) * 0.065]} scale={[0.022, 0.014, 0.03]} rotation={[0.4, a, 0]} out={OUT.fine} /> })}
  </group>
}
// crafted decor placed inside (persisted in the same save as outdoor decor, with an `in: [x, z]` room position)
function InsideDecor() {
  const [D, setD] = useState(null), [, force] = React.useReducer(x => x + 1, 0)
  useEffect(() => { let on = true; import('../game/World.jsx').then(m => { if (on) setD(() => m.Decor) }); const u = () => force(); const subs = (window.__gameSub = window.__gameSub || []); subs.push(u); return () => { on = false; const k = subs.indexOf(u); if (k >= 0) subs.splice(k, 1) } }, [])
  if (!D) return null
  return G.s.placed.filter(p => p.in).map(p => <group key={p.uid} position={[p.in[0], 0, p.in[1]]} rotation={[0, p.rot, 0]} scale={0.92}><D item={p.item} /></group>)
}
// placement ghost inside: just ahead of her, valid on free floor
HOME.ghost = (gh, pl, GHOST) => { gh.traverse(o => o.layers.enable(LAYER)); const hp = HOME.hp, x = hp.x + Math.sin(hp.yaw) * 0.26, z = hp.z + Math.cos(hp.yaw) * 0.26; gh.position.set(x * ROOM.S, 0, z * ROOM.S); gh.quaternion.setFromAxisAngle(UP, pl.rot); gh.scale.setScalar(1.15); pl.in = [x, z]; pl.n = HOME.homeN ? HOME.homeN.toArray() : [0, 1, 0]; pl.ok = freeAt(x, z, 0.08); GHOST.color.set(pl.ok ? '#bff0c8' : '#ffb8a8') }

// proximity: door (both sides) + indoor decor pick-up
const _door = new THREE.Vector3()
HOME.near.push((consider, pp) => {
  if (HOME.busy) return
  const hp = HOME.hp
  if (HOME.inside) {
    consider({ kind: 'ext', inside: true, id: 'door-out', icon: 'leaf', verb: 'Step', name: 'outside', act: HOME.exit }, Math.hypot(hp.x - DOOR.x, hp.z - (DOOR.z + 0.12)), 0.32)
    if (!G.ui.place) for (const p of G.s.placed) if (p.in) consider({ kind: 'decor', inside: true, id: 'decor' + p.uid, uid: p.uid, item: p.item }, Math.hypot(hp.x - p.in[0], hp.z - p.in[1]), 0.26)
  } else if (HOME.doorN) {
    _door.copy(HOME.doorN).multiplyScalar(R + height(HOME.doorN))
    consider({ kind: 'ext', id: 'door-in', icon: 'leaf', verb: 'Go', name: 'inside', act: HOME.enter }, pp.distanceTo(_door), 0.5)
  }
})

export function Room() {
  const ref = useRef(), scene = useThree(s => s.scene), camera = useThree(s => s.camera), n = useRef(0)
  window.__cam3 = camera
  useEffect(() => { HOME.roomObj = ref.current }, [])
  useFrame(() => {
    const g = ref.current; g.visible = HOME.inside
    if (!HOME.inside) { n.current = 0; return } // outdoors: nothing to tag (this used to walk the whole scene graph every second)
    if (n.current++ % 90 === 0) { // layer 5 = what the interior camera renders: the room, her, and the lights
      g.traverse(o => o.layers.enable(LAYER)); scene.traverse(o => { if (o.isLight) o.layers.enable(LAYER) })
      if (HOME.playerObj) HOME.playerObj.traverse(o => o.layers.enable(LAYER))
    }
  })
  const onDown = (e) => { if (!HOME.inside) return; e.stopPropagation(); const l = ref.current.worldToLocal(e.point.clone()); HOME.hp.target = { x: l.x, z: l.z } }
  return <group ref={ref} visible={HOME.inside} scale={ROOM.S}>
    <Floor onDown={onDown} /><Window /><Sunbeam /><Stove /><Door /><Lamp />
    <Merge><Hanging /><Walls /><Bed /><Shelf /><Kitchen /><Table /><Pictures /></Merge>
    <React.Suspense fallback={null}><Activities /></React.Suspense>
    <InsideDecor />
    <React.Suspense fallback={null}><Cat /></React.Suspense>
  </group>
}
