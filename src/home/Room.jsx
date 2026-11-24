// Her house, inside: the door transition, the interior camera (an elevated look into the cut-away room, like a
// diorama), her interior movement, the lights, and crafted decor placed indoors. The furniture lives in interior.jsx.
// The room is built in planet-local space at the planet's centre. While she is inside, the camera only renders
// layer 5 (room + her + lights), so the outside world costs nothing and can never show through.
import * as THREE from 'three'
import { actLocked, startAct } from '../act.js'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { HOME, ROOM, DOOR, resolve, freeAt, roomToWorld } from './state.js'
import { atRoom, atPlanet } from '../game/prompt/anchors.js'
import { O, Merge, GEO, tm, OUT, canvasTex } from './kit.jsx'
import { T, q, VIEW, setViewMode } from '../common.jsx'
import { R, height } from '../world.js'
import { W, Box, Shell, Floor, Backdrop, Windows, Sunbeam, WindowLight, DoorWay, Smoke, BathWalls, LAMP, LAYOUT } from './interior.jsx'
import { Prop } from '../props/Prop.jsx'
import { PAD, CAM, onTap } from '../touch.jsx'
import { moveIntent, screenYaw, turnStep, walkFactor, clampInYaw, ZMIN } from '../camInput.js'
import { G, emit, toast } from '../game/store.js'
import { CAT } from '../pets/catState.js'
const Cat = React.lazy(() => import('../pets/Cat.jsx').then(m => ({ default: m.Cat })))
// round7: home activities (sleep, cook, bath, tea, read, water plants, feed the pets) + the refined interior clutter: own chunk
const Activities = React.lazy(() => import('./Activities.jsx'))
const PETCAM = q.get('petcam') // debug: close camera on the cat (?petcam=1, or an angle in radians)

const UP = new THREE.Vector3(0, 1, 0), _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3()
const LAYER = 5
export { W, Box }

// ---------- transitions ----------
let snapFrames = 0
// rAF paints the iris; the timer finishes it on wall-clock time so a stalled frame cannot hold the door lock.
function fadeTo(v, ms) { return new Promise(res => { const v0 = HOME.fade, t0 = performance.now(); let done = false; const step = () => { if (done) return; const k = Math.min(1, (performance.now() - t0) / ms); if (k < 1) { HOME.fade = v0 + (v - v0) * (k * k * (3 - 2 * k)); requestAnimationFrame(step); return } done = true; HOME.fade = v; res() }; setTimeout(step, ms); step() }) }
const fading = () => HOME.fade > 0.02
HOME.enter = async () => {
  if (HOME.busy || HOME.inside || fading()) return; HOME.busy = true; startAct('door'); await new Promise(r => setTimeout(r, 300)); HOME.doorOpen = 1
  await fadeTo(1, 380)
  HOME.inside = true; Object.assign(HOME.hp, { x: DOOR.x, z: DOOR.z - 0.3, yaw: Math.PI, target: null }); snapFrames = 3; HOME.inYaw = 0 // the indoor orbit starts at the front
  HOME.onEnter && HOME.onEnter()
  setTimeout(() => { HOME.doorOpen = 0 }, 350)
  HOME.busy = false // lock ends with the cut; the iris reopening must not wait on the next stalled frame
  await fadeTo(0, 520)
}
HOME.exit = async () => {
  if (HOME.busy || !HOME.inside || fading()) return; if (HOME.cancelIdle) HOME.cancelIdle(); HOME.needDog && HOME.needDog(); HOME.busy = true; startAct('door'); await new Promise(r => setTimeout(r, 300)); HOME.doorOpen = 1
  await fadeTo(1, 380)
  const P = HOME.P; HOME.inside = false
  if (P && HOME.outN) { P.n.copy(HOME.outN); const f = HOME.outN.clone().sub(HOME.homeN); P.fwd.copy(f.addScaledVector(P.n, -f.dot(P.n)).normalize()).applyAxisAngle(P.n, 1.25); /* step out along the porch so the follow camera clears the house */ P.target = null; P.h = 0; P.vy = 0; if (HOME.camFront) HOME.camFront() /* the camera lands in front of her, looking at her */ }
  HOME.snapOut = 6; HOME.snap0 = window.__snap
  HOME.onExit && HOME.onExit()
  setTimeout(() => { HOME.doorOpen = 0 }, 300)
  HOME.busy = false
  await fadeTo(0, 520)
}
// ---------- her movement inside: camera-relative (keyboard and stick), like outdoors; the drag orbits the camera ----------
HOME.inYaw = 0
HOME.stepInside = (dt, KEYS, P, obj) => {
  HOME.P = P; HOME.playerObj = obj; const hp = HOME.hp
  let f = 0, turn = 0
  if (CAM.yaw) { HOME.inYaw = clampInYaw(HOME.inYaw - CAM.yaw); CAM.yaw = 0 }
  const mi = moveIntent(KEYS, PAD)
  if (mi.mag > 0) { hp.target = null; if (HOME.cancelIdle) HOME.cancelIdle() } // part A: any input ends an idle walk / idle pose at once
  if (mi.mag > 0 && !HOME.busy && !actLocked()) { const t = turnStep(hp.yaw, screenYaw(HOME.camYaw, mi.x, mi.y), dt, 10); hp.yaw = t.yaw; f = mi.mag * walkFactor(t.gap); turn = 1 }
  if (hp.target) { const dx = hp.target.x - hp.x, dz = hp.target.z - hp.z, d = Math.hypot(dx, dz); if (d < 0.05) hp.target = null; else { let dd = Math.atan2(dx, dz) - hp.yaw; dd = Math.atan2(Math.sin(dd), Math.cos(dd)); hp.yaw += dd * Math.min(1, dt * 10); f = Math.abs(dd) < 1.2 ? 1 : 0.2 } }
  if (HOME.busy || (G.ui.panel) || actLocked()) f = turn = 0
  const run = KEYS.shift || (PAD.active && PAD.run)
  const eMul = window.__energyMul ? window.__energyMul() : 1 // Stage E: low energy slows her indoors too; the bicycle cannot be ridden inside
  const sp = f * (run ? 0.81 : 0.52) / ROOM.S * 1.15 * dt * eMul; hp.x += Math.sin(hp.yaw) * sp; hp.z += Math.cos(hp.yaw) * sp; resolve(hp, 0.09) // polish: ~22% slower indoors
  P.move += ((f ? Math.max(0.35, Math.abs(f)) : 0) - P.move) * Math.min(1, dt * 8); P.phase += dt * (run ? 11 : 8.2) * P.move; P.h = 0; P.vy = 0
  obj.position.set(hp.x * ROOM.S, ROOM.y, hp.z * ROOM.S); obj.quaternion.setFromAxisAngle(UP, hp.yaw)
  const ps = HOME.pose; if (ps && ps.k > 0.001) { // round7: home activities place her (bed / tub / chair), eased by ps.k
    _a.set(ps.x * ROOM.S, ROOM.y + ps.y * ROOM.S, ps.z * ROOM.S); obj.position.lerp(_a, ps.k); _q.setFromAxisAngle(UP, ps.yaw); if (ps.tilt) _q.multiply(_q2.setFromAxisAngle(_X, ps.tilt)); obj.quaternion.slerp(_q, ps.k) }
}
const _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _X = new THREE.Vector3(1, 0, 0)
// interior camera: high above the cut-away front rim looking down into the room (there is no ceiling, so it can never
// clip a wall), easing after her and leaning toward the cat when he's close. Zoom / pitch from the touch + wheel controls.
const camL = new THREE.Vector3(), lookL = new THREE.Vector3(), _goal = new THREE.Vector3(), _look = new THREE.Vector3()
const WIDE = q.get('homecam') === 'wide' // debug: the whole room, concept-style
const FREECAM = /,/.test(q.get('homecam') || '') ? q.get('homecam').split(',').map(Number) : null // debug: ?homecam=x,y,z,lookX,lookY,lookZ (room units)
let fov0 = null
HOME.camera = (camera, g, dt) => {
  HOME.cam = camera // debug + screenshot tooling: project room points to the screen
  if (!HOME.inside && HOME.snapOut > 0) { window.__snap = true; if (--HOME.snapOut === 0) setTimeout(() => { window.__snap = HOME.snap0 }, 0) } // land the follow camera behind her at once
  if (!HOME.inside) { if (fov0 != null) { camera.fov = fov0; fov0 = null; camera.updateProjectionMatrix(); camera.layers.set(0) } return HOME.camOverride ? HOME.camOverride(camera, g) : false }
  if (VIEW.mode !== 'follow') setViewMode('follow')
  if (fov0 == null) { fov0 = camera.fov; camera.fov = 46; camera.updateProjectionMatrix(); camera.layers.set(LAYER) }
  const hp = HOME.hp, z = Math.max(ZMIN, CAM.zoom), wide = Math.min(1, Math.max(0, (z - 1.6) / 0.8)) // wide: centre on the whole room
  const dc = Math.hypot(CAT.x - hp.x, CAT.z - hp.z), w = dc < 0.9 ? 0.4 * (1 - dc / 0.9) : 0, fx = hp.x + (CAT.x - hp.x) * w, fz = hp.z + (CAT.z - hp.z) * w
  const nearDoor = Math.min(1, Math.max(0, (hp.z - 0.55) / 0.65)) // by the front rim the door wall would hide her: look down more steeply
  const el = 0.66 + 0.3 * CAM.pitch + 0.55 * nearDoor * (1 - wide), D = (2.25 + 1.1 * (z - ZMIN)) * (camera.aspect < 1 ? 1.3 : 1) // elevation (rad) + distance, room units (zoom 0.55 close .. 2.4 the whole room; further back on a tall phone screen)
  _look.set(Math.max(-1.2, Math.min(1.2, fx)) * 0.8, 0.14 + CAT.y * w * 0.5, Math.max(-1.0, Math.min(1.3, fz)) * 0.85 - 0.04)
  _look.lerp(_b.set(0, 0.12, -0.1), wide)
  { const a = HOME.inYaw || 0, hd = Math.cos(el) * D; _goal.set(_look.x * 0.7 * (1 - wide) + Math.sin(a) * hd, _look.y + Math.sin(el) * D, _look.z + Math.cos(a) * hd) } // orbit round the front (±0.7 rad)
  if (WIDE) { _look.set(0, 0.12, -0.15); _goal.set(0, 2.75, 4.45) }
  if (FREECAM) { _goal.set(FREECAM[0], FREECAM[1], FREECAM[2]); _look.set(FREECAM[3], FREECAM[4], FREECAM[5]) }
  if (PETCAM) { const a = window.__camA ?? (+PETCAM || 0.5), dd = window.__camD ?? 0.55; _goal.set(CAT.x + Math.sin(a) * dd, CAT.y + (window.__camH ?? 0.32 * dd / 0.55 * 0.8 + 0.06), CAT.z + Math.cos(a) * dd); _look.set(CAT.x, CAT.y + 0.07, CAT.z) }
  const ps = HOME.pose; if (ps && !PETCAM && !WIDE && !FREECAM && ps.cam !== false) { const pk = Math.min(1, ps.k) // activities frame the bed / tub / desk ...
    if (ps.cam && ps.cam.p) { _goal.lerp(_a.fromArray(ps.cam.p), pk); _look.lerp(_b.fromArray(ps.cam.l), pk) }
    else { _b.set(ps.x * 0.85, 0.16 + (ps.y || 0), ps.z - 0.04); _look.lerp(_b, pk); _goal.lerp(_a.set(_b.x * 0.8, _b.y + 1.25, _b.z + 1.1), pk) } }
  const k = snapFrames > 0 ? 1 : 1 - Math.exp(-dt * 2.0); snapFrames-- // polish: softer interior cam
  camL.lerp(_goal, k); lookL.lerp(_look, k); HOME.camYaw = Math.atan2(lookL.x - camL.x, lookL.z - camL.z); /* yaw the interior camera faces (≈π) */ if (k === 1) { camL.copy(_goal); lookL.copy(_look) }
  camera.position.copy(roomToWorld(camL.x, camL.y, camL.z, _a)); camera.up.copy(_b.copy(UP).transformDirection(HOME.roomObj.matrixWorld)); camera.lookAt(roomToWorld(lookL.x, lookL.y, lookL.z, _c))
  return true
}
// the sun while inside: low, through the window on the left wall
HOME.sun = () => { if (HOME.roomObj) T.sun.copy(_a.set(-0.8, 0.55 - 0.85 * T.night, 0.35).normalize().transformDirection(HOME.roomObj.matrixWorld)) }

// night: warm pools of light on the floor under the lamp and in front of the stove (additive decals, no extra
// lights: a new light would recompile every material in the world). The cool fill is dimmed in Lights() while inside.
const glowTex = () => canvasTex(128, 128, (x, w, h) => { const g = x.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.45, 'rgba(255,255,255,.45)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, w, h) })
function NightGlow() {
  // part C: the desk and bedside patches follow her lamp switches (HOME.lampK, eased 0..1), the stove patch the log flare (HOME.fire)
  const [lamp, stove, desk, night] = useMemo(() => { const t = glowTex(); const mk = (c) => new THREE.MeshBasicMaterial({ map: t, color: c, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }); return [mk('#ffb860'), mk('#ff8a3a'), mk('#ffb860'), mk('#ffb860')] }, [])
  useFrame(() => { const t = performance.now() / 1000, k = HOME.inside ? Math.min(1, 0.22 + T.night + 0.4 * T.dusk) : 0, lk = HOME.lampK || { desk: 1, night: 1 }, fl = HOME.fire || 0
    lamp.opacity = 0.42 * k; desk.opacity = 0.62 * k * lk.desk; night.opacity = 0.62 * k * lk.night // a lamp's own pool reads stronger, so switching it off shows
    stove.opacity = k * (0.5 + 0.45 * fl + Math.sin(t * 7) * (0.05 + 0.05 * fl) + Math.sin(t * 13) * 0.04) })
  return <group>
    <mesh position={[0, 0.007, 0.1]} rotation={[-Math.PI / 2, 0, 0]} material={lamp} renderOrder={2}><planeGeometry args={[1.6, 1.3]} /></mesh>
    <mesh position={[LAMP.lx, 0.008, LAMP.lz + 0.3]} rotation={[-Math.PI / 2, 0, 0]} material={lamp} renderOrder={2}><planeGeometry args={[1.0, 0.7]} /></mesh>
    <mesh position={[LAYOUT.nightstand.x - 0.12, 0.008, LAYOUT.nightstand.z]} rotation={[-Math.PI / 2, 0, 0]} material={night} renderOrder={2}><planeGeometry args={[0.8, 0.8]} /></mesh>
    <mesh position={[LAYOUT.desk.x + 0.18, 0.008, LAYOUT.desk.z]} rotation={[-Math.PI / 2, 0, 0]} material={desk} renderOrder={2}><planeGeometry args={[0.8, 0.8]} /></mesh>
    <mesh position={[LAYOUT.stove.x + 0.12, 0.009, LAYOUT.stove.z + 0.15]} rotation={[-Math.PI / 2, 0, 0]} material={stove} renderOrder={2}><planeGeometry args={[0.8, 0.7]} /></mesh>
    {[-1, 1].map(s => <mesh key={s} position={[DOOR.x + s * 0.38, 0.009, DOOR.z - 0.2]} rotation={[-Math.PI / 2, 0, 0]} material={lamp} renderOrder={2}><planeGeometry args={[0.5, 0.45]} /></mesh>)}
  </group>
}
// the hanging lantern in front of the kitchen wall + the room's one warm point light (no new lights: a new light would
// recompile every material in the world)
function Lamp() {
  const light = useRef(), sway = useRef()
  useFrame(() => { const t = performance.now() / 1000; if (light.current) light.current.intensity = HOME.inside ? (0.9 + 2.4 * T.night + 0.7 * T.dusk) * (1 + Math.sin(t * 9) * 0.01) : 0; if (sway.current) sway.current.rotation.z = Math.sin(t * 0.7) * 0.04 })
  return <group>
    <group position={[LAMP.x, LAMP.y, LAMP.z]} rotation-y={LAMP.yaw}><Box p={[0, 0.015, 0.09]} s={[0.035, 0.035, 0.2]} c={W.dark} /></group>
    <group ref={sway} position={[LAMP.lx, LAMP.y, LAMP.lz]}><Prop id="lantern" opts={{ hang: true }} position={[0, -0.27, 0]} scale={1.3} /></group>
    <pointLight ref={light} position={[0.05, 0.85, -0.05]} color="#ffc98a" distance={3.8} decay={1.4} intensity={0} />
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
const _door = new THREE.Vector3(), _doorL = new THREE.Vector3()
const atDoor = (out) => HOME.doorN ? atPlanet(_doorL.copy(HOME.doorN).multiplyScalar(R + height(HOME.doorN)), 0.75)(out) : out
HOME.near.push((consider, pp) => {
  if (HOME.busy) return
  const hp = HOME.hp
  if (HOME.inside) {
    consider({ kind: 'ext', inside: true, id: 'door-out', at: atRoom(DOOR.x, DOOR.z, 0.75), icon: 'leaf', verb: 'Step', name: 'outside', act: HOME.exit }, Math.hypot(hp.x - DOOR.x, hp.z - (DOOR.z - 0.14)), 0.3)
    if (!G.ui.place) for (const p of G.s.placed) if (p.in) consider({ kind: 'decor', inside: true, id: 'decor' + p.uid, uid: p.uid, item: p.item, at: atRoom(p.in[0], p.in[1], 0.3) }, Math.hypot(hp.x - p.in[0], hp.z - p.in[1]), 0.26)
  } else if (HOME.doorN) {
    _door.copy(HOME.doorN).multiplyScalar(R + height(HOME.doorN))
    consider({ kind: 'ext', id: 'door-in', at: atDoor, icon: 'leaf', verb: 'Go', name: 'inside', act: HOME.enter }, pp.distanceTo(_door), 0.5)
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
  const onDown = (e) => { if (!HOME.inside) return; e.stopPropagation(); const l = ref.current.worldToLocal(e.point.clone()); onTap(e.nativeEvent || e, () => { if (HOME.cancelIdle) HOME.cancelIdle(); HOME.hp.target = { x: l.x, z: l.z } }) } // a clean click / tap walks; a drag orbits
  return <group ref={ref} visible={HOME.inside} scale={ROOM.S}>
    <Backdrop /><Floor onDown={onDown} /><Windows /><Sunbeam /><DoorWay /><Smoke /><WindowLight /><Lamp /><NightGlow />
    <Merge><Shell /></Merge><BathWalls />
    <React.Suspense fallback={null}><Activities /></React.Suspense>
    <InsideDecor />
    <React.Suspense fallback={null}><Cat /></React.Suspense>
  </group>
}
