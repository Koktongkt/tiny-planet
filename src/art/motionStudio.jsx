// Motion Studio (dev page, not a build input of the game): Pip and Mochi on open ground with a simple stand-in for her,
// so the new locomotion (motor.js + gait.js + follow.js + the rig's st.loco path) can be judged against the current
// movement (motionStudioOld.js) before any of it goes into the game. Side by side = two views, Before | After, driven
// by the same path for her. /motionstudio.html
import * as THREE from 'three'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Canvas, useFrame, useThree, advance } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { Quadruped, newPet, POSE0 } from '../pets/Quadruped.jsx'
import { DOG_CFG } from '../pets/Dog.jsx'
import { CAT_CFG, CAT_SCALE } from '../pets/Cat.jsx'
import { MOTOR_DOG, MOTOR_CAT, newMotor, stepMotor, steerClear, toLocal } from '../pets/motor.js'
import { newFollow, stepFollow } from '../pets/follow.js'
import { oldDog, oldCat } from './motionStudioOld.js'

const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a)), clamp = (x, a, b) => Math.max(a, Math.min(b, x))
const yawTo = (a, b) => Math.atan2(b.x - a.x, b.z - a.z)

// ---------------- shared settings (UI writes, both views read) ----------------
const SIM = { scenario: 'stroll', version: 'side', pets: 'both', ts: 1, prints: true, follow: true, run: false, click: null, reset: 0, focus: null }
// review/capture params: ?sc=figure8&show=new&pets=pip&run=1&focus=dog&cam=x,y,z&cap=1 (cap: frames are stepped by window.__adv(seconds))
const Q = new URLSearchParams(location.search), CAP = Q.has('cap'), CAM = (Q.get('cam') || '0.9,0.95,2.1').split(',').map(Number)
if (Q.get('sc')) SIM.scenario = Q.get('sc'); if (Q.get('show')) SIM.version = Q.get('show'); if (Q.get('pets')) SIM.pets = Q.get('pets')
if (Q.has('run')) SIM.run = true; if (Q.get('focus')) SIM.focus = Q.get('focus'); if (Q.get('ts')) SIM.ts = +Q.get('ts')
if (CAP) { let t = 0; window.__adv = (sec) => { t += sec; advance(t) } }
const SCENARIOS = [
  ['stroll', 'Stroll with stops'], ['catchup', 'Catch up'], ['figure8', 'Figure 8'], ['zigzag', 'Zig-zag'], ['spin', 'Walk around them'], ['wander', 'Mochi wanders'], ['free', 'Free (tap the ground)'],
]
const BOXES = [[-0.42, 0.28, 0.13, 0.1], [0.5, -0.3, 0.1, 0.14], [0.05, -0.95, 0.16, 0.09]] // [x, z, half w, half d]
const free = (x, z, r = 0.04) => { for (const [bx, bz, hw, hd] of BOXES) if (Math.abs(x - bx) < hw + r && Math.abs(z - bz) < hd + r) return false; return true }
function pushOut(p, r) { for (const [bx, bz, hw, hd] of BOXES) { const dx = p.x - bx, dz = p.z - bz, ox = hw + r - Math.abs(dx), oz = hd + r - Math.abs(dz)
  if (ox > 0 && oz > 0) { if (ox < oz) p.x += Math.sign(dx || 1) * ox; else p.z += Math.sign(dz || 1) * oz } } }

// ---------------- her: a simple walker driven by the scenario ----------------
const ROUTE = { stroll: [[0, 1.0], [0.95, 0.25], [0.35, -0.6], [-0.9, -0.2]], zigzag: [[-1, -1], [-0.3, -0.45], [-1, 0.1], [-0.3, 0.65], [-1, 1.1], [0.9, 1.1], [0.3, 0.55], [1, 0], [0.3, -0.5], [1, -1]],
  spin: [...Array(8)].map((_, i) => [Math.sin(i * Math.PI / 4) * 0.6, Math.cos(i * Math.PI / 4) * 0.6]) }
const WAIT = { stroll: 2.6, zigzag: 0, spin: 1.6, catchup: 0 }
function newHer() { return { x: 0, z: 0.5, yaw: Math.PI, speed: 0, move: 0, wp: 0, wait: 0, a: 0, target: null, phase: 0, t: 0 } }
function stepHer(h, sc, dt) {
  h.t += dt
  let tx = null, tz = null
  if (sc === 'figure8') { h.a += dt * (SIM.run ? 1.51 : 0.88) / 1.6; tx = Math.sin(h.a) * 1.1; tz = Math.sin(2 * h.a) * 0.55 + 0.2; const lead = 0.12; tx = Math.sin(h.a + lead) * 1.1; tz = Math.sin(2 * (h.a + lead)) * 0.55 + 0.2 }
  else if (sc === 'free') { if (SIM.click) { h.target = SIM.click; SIM.clickUsed = true } if (h.target) { tx = h.target.x; tz = h.target.z } }
  else if (sc === 'wander') { tx = 0; tz = -0.4 }
  else { const R = ROUTE[sc === 'catchup' ? 'stroll' : sc]; const [wx, wz] = R[h.wp % R.length]; tx = wx; tz = wz }
  let go = 0
  if (tx !== null) { const d = Math.hypot(tx - h.x, tz - h.z)
    if (d > 0.05) { if (h.wait <= 0) { let want = Math.atan2(tx - h.x, tz - h.z); want = steerClear(want, (a) => free(h.x + Math.sin(a) * 0.16, h.z + Math.cos(a) * 0.16, 0.06)); h.yaw += wrap(want - h.yaw) * Math.min(1, dt * 8); go = 1 } }
    else if (sc !== 'free' && sc !== 'wander' && sc !== 'figure8') { if (h.wait <= 0 && !h.arrived) { h.wait = WAIT[sc] ?? 0; h.arrived = true } h.wait -= dt; if (h.wait <= 0) { h.wp++; h.arrived = false } }
    else if (sc === 'free') h.target = null }
  h.move += ((go ? 1 : 0) - h.move) * Math.min(1, dt * 8)
  h.speed = h.move * (SIM.run ? 1.51 : 0.88)
  h.x += Math.sin(h.yaw) * h.speed * dt; h.z += Math.cos(h.yaw) * h.speed * dt; pushOut(h, 0.06)
  h.phase += dt * (SIM.run ? 10 : 7.4) * h.move
}

// ---------------- pets ----------------
function makePet(kind, ver, side) {
  const st = newPet(); st.loco = ver === 'new'
  return { kind, ver, st, x: side * 0.25, z: 0.05, yaw: Math.PI, m: newMotor(), F: Object.assign(newFollow(), { side, sideK: side }), W: { mode: 'pause', t: 0, dur: 1 }, ex: 0, prints: [] }
}
const MOOD = 0.7
function stepPet(p, her, sc, dt) {
  const st = p.st, g = st.goal, dog = p.kind === 'dog', scale = dog ? DOG_CFG.s : CAT_SCALE
  Object.assign(g, POSE0)
  if (dog) { g.tailUp = 0.6 + 0.6 * MOOD; g.tailWag = 0.25 + 0.75 * MOOD; g.tailSpeed = 8 + 8 * MOOD } else { g.tailUp = 0.45; g.tailWag = 0.12; g.tailSpeed = 2.2 }
  const catWander = !dog && sc === 'wander'
  if (p.ver === 'old') {
    const r = dog ? oldDog(p, her, dt, free) : oldCat(p, her, dt, free, catWander ? 'wander' : 'follow')
    pushOut(p, 0.05)
    g.sit = r.sit || 0; g.lie = r.lie || 0; g.crouch = r.crouch || 0
    if (dog) { st.speed = r.speed / DOG_CFG.s; st.run = r.speed > 1.9 ? 1 : 0; st.phase += dt * r.speed / (DOG_CFG.stride * DOG_CFG.s) * (st.run ? 1.1 : 1.5) }
    else { st.speed += (r.speed - st.speed) * Math.min(1, dt * 8); st.run = r.speed > 0.4 ? 1 : 0; st.phase += dt * st.speed / (CAT_CFG.stride * CAT_SCALE) * 1.6; if (r.speed > 0.1) g.tailUp = 1 }
    p.v = r.speed
  } else {
    const M = dog ? MOTOR_DOG : MOTOR_CAT
    let out
    if (catWander) out = catBrain(p, dt)
    else { out = stepFollow(p.F, her, p, dt); if (!dog) out.speed = Math.min(out.speed, 1.0) }
    let dx = out.x - p.x, dz = out.z - p.z; const d = Math.hypot(dx, dz)
    if (d > 0.12) { const want = Math.atan2(dx, dz), a = steerClear(want, (q) => free(p.x + Math.sin(q) * 0.14, p.z + Math.cos(q) * 0.14, 0.05)); if (a !== want) { const k = Math.min(d, 0.3); dx = Math.sin(a) * k; dz = Math.cos(a) * k } }
    const l = toLocal(dx, dz, p.yaw)
    const r = stepMotor(p.m, M, { x: l.x, z: l.z, speed: out.speed, track: out.track, face: out.face != null ? wrap(out.face - p.yaw) : undefined }, dt)
    p.yaw += r.dYaw; p.x += Math.sin(p.yaw) * p.m.v * dt; p.z += Math.cos(p.yaw) * p.m.v * dt; pushOut(p, 0.05)
    st.speed = p.m.v / scale; st.w = p.m.w; st.a = p.m.a
    st.look = clamp(out.look != null ? wrap(out.look - p.yaw) : p.m.look, -1.1, 1.1)
    g.sit = out.pose.sit; g.lie = out.pose.lie; g.sniff = out.pose.sniff; if (out.pose.crouch) g.crouch = out.pose.crouch
    if (!dog) g.tailUp = 0.45 + 0.55 * Math.min(1, p.m.v / 0.15) * (1 - g.sit) // a walking cat carries its tail up
    p.v = p.m.v
  }
  if (dog) { p.ex = Math.max(0, p.ex + (p.v > 1.8 ? dt : -dt * 0.25)); g.tongue = p.v > 1 || p.ex > 1.2 ? 1 : 0.4 * MOOD; g.mouth = g.tongue * 0.25; if (p.ex > 1.2 && p.v < 0.6) { g.pant = Math.min(1, p.ex / 3); g.mouth = 0.55 } }
  st.ts = SIM.ts
}
// Mochi on his own: potter to a spot, pause (sit or stand, looking about), now and then a burst of zoomies
function catBrain(p, dt) {
  const W = p.W, pose = { sit: 0, lie: 0, sniff: 0 }
  W.t += dt
  const pick = (far) => { for (let i = 0; i < 30; i++) { const x = -1.1 + Math.random() * 2.2, z = -1.1 + Math.random() * 2.2; if (free(x, z, 0.1) && (!far || Math.hypot(x - p.x, z - p.z) > 0.7)) return { x, z } } return { x: 0, z: 0 } }
  if (W.mode === 'pause') { pose.sit = W.sitting ? 1 : 0
    if (W.t > W.glanceT) { W.glanceT = W.t + 0.7 + Math.random() * 1.2; W.glance = (Math.random() * 2 - 1) * 1.1 }
    if (W.t > W.dur) { if (Math.random() < 0.18) Object.assign(W, { mode: 'zoom', t: 0, legs: 3, target: pick(true) }); else Object.assign(W, { mode: 'go', t: 0, target: pick(false) }) }
    return { x: p.x, z: p.z, speed: 0, face: null, pose, look: p.yaw + (W.glance || 0) } }
  const arrived = Math.hypot(W.target.x - p.x, W.target.z - p.z) < 0.09 && p.m.v < 0.05
  if (arrived || W.t > 12) {
    if (W.mode === 'zoom' && --W.legs > 0) { W.target = pick(true); W.t = 0 }
    else Object.assign(W, { mode: 'pause', t: 0, dur: 1.5 + Math.random() * 3, sitting: Math.random() < 0.5, glanceT: 0 }) }
  return { x: W.target.x, z: W.target.z, speed: W.mode === 'zoom' ? 1.0 : 0.27, face: null, pose: { ...pose, crouch: W.mode === 'zoom' && W.t < 0.3 ? 0.8 : 0 }, look: null }
}
const gaitName = (p) => { const f = p.st.feet; if (p.ver === 'old') return p.v > 0.02 ? (p.st.run ? 'run cycle' : 'walk cycle') : 'still'
  if (!f || !f.mix) return 'still'; if (p.v < 0.02) return Math.abs(p.st.w || 0) > 0.15 ? 'stepping round' : 'standing'
  return f.mix.k2 > 0.5 ? (p.kind === 'dog' ? 'gallop' : 'bound') : f.mix.k1 > 0.5 ? 'trot' : 'walk' }

// ---------------- 3D bits ----------------
function groundTex() {
  const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d')
  x.fillStyle = '#cfdfab'; x.fillRect(0, 0, 256, 256)
  for (let i = 0; i < 900; i++) { x.fillStyle = Math.random() < 0.5 ? 'rgba(120,150,80,0.10)' : 'rgba(255,255,230,0.12)'; x.fillRect(Math.random() * 256, Math.random() * 256, 2, 2) }
  x.strokeStyle = 'rgba(90,110,60,0.22)'; x.lineWidth = 2; x.strokeRect(0, 0, 256, 256)
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(40, 40); t.colorSpace = THREE.SRGBColorSpace; return t // one tile = 0.25 units
}
function Ground() {
  const tex = useMemo(groundTex, [])
  return <mesh rotation={[-Math.PI / 2, 0, 0]} onPointerDown={(e) => { if (e.button === 0 && !e.altKey) { e.stopPropagation(); SIM.click = { x: e.point.x, z: e.point.z }; window.__setScenario?.('free') } }}>
    <planeGeometry args={[10, 10]} /><meshToonMaterial map={tex} /></mesh>
}
const CRATE = new THREE.MeshToonMaterial({ color: '#c9a173' }), INK = new THREE.MeshBasicMaterial({ color: '#4a3426', side: THREE.BackSide })
function Boxes() { return BOXES.map(([x, z, hw, hd], i) => <group key={i} position={[x, 0.07, z]}><mesh material={CRATE}><boxGeometry args={[hw * 2, 0.14, hd * 2]} /></mesh><mesh material={INK} scale={1.03}><boxGeometry args={[hw * 2, 0.14, hd * 2]} /></mesh></group>) }

const HER = { tunic: new THREE.MeshToonMaterial({ color: '#5f8fc4' }), skin: new THREE.MeshToonMaterial({ color: '#f8d9bf' }), hat: new THREE.MeshToonMaterial({ color: '#e9c46a' }), boot: new THREE.MeshToonMaterial({ color: '#6b4a3a' }), shadow: new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: 0.16, depthWrite: false }) }
function Her({ h }) {
  const g = useRef(), lL = useRef(), lR = useRef(), body = useRef()
  useFrame(() => { g.current.position.set(h.x, 0, h.z); g.current.rotation.y = h.yaw
    const s = Math.sin(h.phase) * 0.5 * h.move; lL.current.rotation.x = s; lR.current.rotation.x = -s; body.current.position.y = 0.2 + Math.abs(Math.cos(h.phase)) * 0.012 * h.move })
  return <group ref={g}>
    <mesh material={HER.shadow} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]}><circleGeometry args={[0.09, 24]} /></mesh>
    {[[0.035, lL], [-0.035, lR]].map(([x, r], i) => <group key={i} ref={r} position={[x, 0.12, 0]}><mesh material={HER.boot} position={[0, -0.06, 0]}><capsuleGeometry args={[0.022, 0.08, 4, 8]} /></mesh></group>)}
    <group ref={body} position={[0, 0.2, 0]}><mesh material={HER.tunic}><capsuleGeometry args={[0.07, 0.1, 6, 14]} /></mesh>
      <mesh material={HER.skin} position={[0, 0.16, 0]}><sphereGeometry args={[0.075, 20, 14]} /></mesh>
      <mesh material={HER.hat} position={[0, 0.21, 0]} scale={[1, 0.45, 1]}><sphereGeometry args={[0.095, 20, 12]} /></mesh>
      <mesh material={HER.skin} position={[0, 0.16, 0.07]} scale={0.3}><sphereGeometry args={[0.05, 10, 8]} /></mesh></group>
  </group>
}
function PetView({ p }) {
  const g = useRef(), cfg = p.kind === 'dog' ? DOG_CFG : CAT_CFG, scale = p.kind === 'dog' ? DOG_CFG.s : CAT_SCALE
  useFrame(() => { g.current.position.set(p.x, 0, p.z); g.current.rotation.y = p.yaw })
  return <group ref={g}><group scale={scale}><Quadruped cfg={cfg} st={p.st} /></group></group>
}

// paw prints: a dot wherever a paw is on the ground. A planted paw leaves one dot; a sliding paw leaves a streak.
const N_PR = 2400, PRINT_MAT = new THREE.MeshBasicMaterial({ color: '#5a4630', transparent: true, opacity: 0.55, depthWrite: false })
function Prints({ world }) {
  const ref = useRef(), buf = useMemo(() => ({ at: [], i: 0 }), []), v = useMemo(() => new THREE.Vector3(), []), m = useMemo(() => new THREE.Matrix4(), [])
  useFrame(() => {
    const mesh = ref.current; if (!mesh) return
    const now = world.t
    if (SIM.prints) for (const p of world.pets) { const R = p.st.R; if (!R) continue; const cfg = p.kind === 'dog' ? DOG_CFG : CAT_CFG, Lr = cfg.legH + cfg.body[1] * 0.2
      for (const k of ['FL', 'FR', 'RL', 'RR']) { const leg = R['leg' + k]; if (!leg) continue; leg.localToWorld(v.set(0, -Lr, 0))
        const last = p.prints[k]; if (v.y > 0.006) { p.prints[k] = null; continue }
        if (!last || Math.hypot(v.x - last.x, v.z - last.z) > 0.004 || now - last.t > 0.5) { p.prints[k] = { x: v.x, z: v.z, t: now }; buf.at[buf.i] = { x: v.x, z: v.z, t: now, r: p.kind === 'dog' ? 0.0075 : 0.006 }; buf.i = (buf.i + 1) % N_PR } } }
    for (let i = 0; i < N_PR; i++) { const d = buf.at[i], age = d ? now - d.t : 99, s = !SIM.prints || age > 5 ? 0 : d.r * (1 - age / 5 * 0.6)
      m.makeScale(s, s, s); if (d) m.setPosition(d.x, 0.003, d.z); mesh.setMatrixAt(i, m) }
    mesh.instanceMatrix.needsUpdate = true })
  return <instancedMesh ref={ref} args={[null, PRINT_MAT, N_PR]} frustumCulled={false}><circleGeometry args={[1, 10]} /></instancedMesh>
}

// the world of one view: her + pets, stepped here (before the pets' own rig frames, so it mounts first)
function newWorld(ver) {
  const pets = []
  if (SIM.pets !== 'mochi') pets.push(makePet('dog', ver, 1))
  if (SIM.pets !== 'pip') pets.push(makePet('cat', ver, -1))
  return { ver, her: newHer(), pets, t: 0, cycle: 0 }
}
function Sim({ world, readout }) {
  const controls = useThree((s) => s.controls), camera = useThree((s) => s.camera), tgt = useMemo(() => new THREE.Vector3(0, 0.08, 0.2), [])
  useFrame((_, dt0) => {
    const dt = Math.min(dt0, 0.05) * SIM.ts, sc = SIM.scenario
    world.t += dt; stepHer(world.her, sc, dt)
    if (sc === 'catchup') { world.cycle -= dt; if (world.cycle < 0) { world.cycle = 9; const h = world.her; for (const p of world.pets) { p.x = h.x - Math.sin(h.yaw) * 2.6 + (p.kind === 'dog' ? 0.15 : -0.15); p.z = h.z - Math.cos(h.yaw) * 2.6; p.yaw = h.yaw; p.prints = {} } } }
    for (const p of world.pets) stepPet(p, world.her, sc, dt)
    // follow camera: keep the user's orbit, slide it with the group's centre
    if (SIM.follow && controls) { const fp = SIM.focus && world.pets.find(p => p.kind === SIM.focus); let x = fp ? fp.x : world.her.x, z = fp ? fp.z : world.her.z; if (!fp) for (const p of world.pets) { x += p.x; z += p.z } const n = fp ? 1 : world.pets.length + 1
      const k = Math.min(1, Math.min(dt0, 0.05) * (fp ? 6 : 3)); const nx = tgt.x + (x / n - tgt.x) * k, nz = tgt.z + (z / n - tgt.z) * k, dx = nx - controls.target.x, dz = nz - controls.target.z
      controls.target.x += dx; controls.target.z += dz; camera.position.x += dx; camera.position.z += dz; tgt.set(nx, 0.08, nz); controls.update() }
    if (readout.current) readout.current.textContent = world.pets.map(p => `${p.kind === 'dog' ? 'Pip' : 'Mochi'} · ${gaitName(p)} · ${p.v.toFixed(2)} u/s`).join('   ') + `   ·   her ${world.her.speed.toFixed(2)} u/s`
  })
  return null
}
function View({ ver, label, reset, pets }) {
  const world = useMemo(() => newWorld(ver), [ver, reset, pets]), readout = useRef()
  return <div className="view">
    <Canvas frameloop={CAP ? 'never' : 'always'} dpr={CAP ? 1 : [1, 2]} camera={{ fov: 30, near: 0.05, far: 60, position: CAM }} gl={{ antialias: true }} onCreated={({ camera }) => camera.lookAt(0, 0.08, 0.2)}>
      <color attach="background" args={['#eaf1dc']} /><fog attach="fog" args={['#eaf1dc', 5, 11]} />
      <hemisphereLight args={['#fff4e4', '#c9d6a8', 1.15]} /><directionalLight position={[1.5, 3, 2]} intensity={2.2} color="#fff3dc" />
      <OrbitControls makeDefault target={[0, 0.08, 0.2]} minDistance={0.4} maxDistance={7} maxPolarAngle={1.45} enablePan={false} />
      <Sim world={world} readout={readout} />
      <Ground /><Boxes /><Prints world={world} /><Her h={world.her} />
      {world.pets.map((p, i) => <PetView key={i} p={p} />)}
    </Canvas>
    <div className={'tag ' + ver}>{label}</div>
    <div className="readout" ref={readout} />
  </div>
}

// ---------------- UI ----------------
function Seg({ id, label, value, opts, onChange }) {
  return <div className="seg" role="group" aria-labelledby={id + '-l'}><span className="seg-l" id={id + '-l'}>{label}</span>
    <div className="seg-o">{opts.map(([v, t]) => <button key={v} id={`${id}-${v}`} className={value === v ? 'on' : ''} aria-pressed={value === v} onClick={() => onChange(v)}>{t}</button>)}</div></div>
}
function App() {
  const [s, setS] = useState({ ...SIM }), set = (k, v) => { SIM[k] = v; setS({ ...SIM }) }
  const [reset, setReset] = useState(0), [open, setOpen] = useState(() => innerWidth > 720)
  useEffect(() => { window.__setScenario = (v) => { if (SIM.scenario !== v) set('scenario', v) }
    const kd = (e) => { if (e.key === 'Shift') { SIM.run = true; setS({ ...SIM }) } }, ku = (e) => { if (e.key === 'Shift') { SIM.run = false; setS({ ...SIM }) } }
    addEventListener('keydown', kd); addEventListener('keyup', ku); return () => { removeEventListener('keydown', kd); removeEventListener('keyup', ku) } }, [])
  const scen = (v) => { SIM.click = null; set('scenario', v); setReset(r => r + 1) }
  const views = s.version === 'side' ? [['old', 'Before'], ['new', 'After']] : [[s.version, s.version === 'old' ? 'Before' : 'After']]
  return <>
    <header className="bar">
      <div className="brand"><h1>Pet Motion Studio</h1><p>Tap the ground to walk her there. Hold Shift or switch on Run to run.</p></div>
      <button className="toggle" aria-expanded={open} onClick={() => setOpen(o => !o)}>{open ? 'Hide controls' : 'Controls'}</button>
      {open && <div className="controls">
        <label className="pick" htmlFor="scn"><span>Scenario</span>
          <select id="scn" value={s.scenario} onChange={(e) => scen(e.target.value)}>{SCENARIOS.map(([v, t]) => <option key={v} value={v}>{t}</option>)}</select></label>
        <Seg id="ver" label="Show" value={s.version} opts={[['side', 'Before | After'], ['new', 'After'], ['old', 'Before']]} onChange={(v) => set('version', v)} />
        <Seg id="pets" label="Pets" value={s.pets} opts={[['both', 'Both'], ['pip', 'Pip'], ['mochi', 'Mochi']]} onChange={(v) => { set('pets', v); setReset(r => r + 1) }} />
        <Seg id="ts" label="Speed" value={s.ts} opts={[[1, '1×'], [0.5, '½×'], [0.25, '¼×']]} onChange={(v) => set('ts', v)} />
        <Seg id="run" label="Her pace" value={s.run} opts={[[false, 'Walk'], [true, 'Run']]} onChange={(v) => set('run', v)} />
        <Seg id="opt" label="Paw prints" value={s.prints} opts={[[true, 'On'], [false, 'Off']]} onChange={(v) => set('prints', v)} />
        <Seg id="cam" label="Camera" value={s.follow} opts={[[true, 'Follow'], [false, 'Fixed']]} onChange={(v) => set('follow', v)} />
        <button className="reset" id="reset" onClick={() => setReset(r => r + 1)}>Restart</button>
      </div>}
    </header>
    <main className={'stage n' + views.length}>{views.map(([v, l]) => <View key={v} ver={v} label={l} reset={reset} pets={s.pets} />)}</main>
    <footer className="legend">Paw prints: a single dot means the paw stayed planted. A streak means it slid. Drag to orbit, scroll or pinch to zoom.</footer>
  </>
}
createRoot(document.getElementById('root')).render(<App />)
