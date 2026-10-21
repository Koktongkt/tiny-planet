import * as THREE from 'three'
import { ACT, tickAct, actLocked } from './act.js'
import React, { useMemo, useRef, useEffect, useState, lazy, Suspense } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Outlines, PerformanceMonitor } from '@react-three/drei'
import { EffectComposer, Bloom, Vignette, Noise } from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'
import { R, K, WS, DENS, height, rnd, dir, place, randDir, pathDir, streamDir, distToCurve, toonRamp, wind, windify, ZONES, zv, around, LAKE_W, BRIDGES, BL, bridgeLift, onBridge, onBridgeDeck, JUMPS, streamNear, streamHalf, waterAt, RIVER_HALF, JUMP_HALF, streamDist } from './world.js'
import { PEOPLE } from './peopleData.js'
const PersonLazy = lazy(() => import('./people.jsx').then(m => ({ default: m.Person })))
const Person = (p) => <Suspense fallback={null}><PersonLazy {...p} /></Suspense>
import { GhibliPerson, Character } from './GhibliPerson.jsx'
import { VILLAGERS } from './villagers.js'
import { houseGeos, crownGeos, firGeos, foliage } from './scenery.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { MinimapLazy } from './minimap/index.js'
import { NPCS, TALK, periodAt } from './talk/state.js'
// prototype-only characters load on demand (keeps them, and the 214 KB sprite sheet, out of the startup bundle)
const GhibliPersonV1 = lazy(() => import('./GhibliPersonV1.jsx').then(m => ({ default: m.GhibliPersonV1 })))
const SpritePerson = lazy(() => import('./SpritePerson.jsx').then(m => ({ default: m.SpritePerson })))
const SPRITE = q.get('char') === 'sprite'
const NEWCHAR = !q.has('oldchar')
import { BOOT, bootStage, onBoot, useIdleSlot, nextPaint } from './boot.js'
import { TOUCH, PAD, CAM, TouchPad, useTouchCamera, onTap } from './touch.jsx'
import { HOME, HomeLayer, HomeOverlay, setupHome } from './home/index.jsx'
// Gather & Craft is fetched after the first frame; until then these are inert stubs.
let ropeLift = () => 0, ropePass = () => false, gameBlocksKeys = () => false
const GM = { W: null, U: null }
import { newDay, G, toast } from './game/store.js'
import { Zones, zoneBusy, zoneWet, ZONE_COLLIDERS, zoneColour, rockify, HARBOUR_HOUSES, MILL_FIELD, Zc, LAKE_DOCK_B, Cull } from './zones.jsx'
import { inkRim, INK_K, INK, T, ss, C, CC, toon, glowMats, glow, MAT, VIEW, OCC, occ, RC, planetRef, Instanced, HCL, PU, NOISE_GLSL, paint, Basis, Surface, q } from './common.jsx'
import { dayFromPhase } from './save/schema.js'
import { PRESET, fixed, rot, ROT_A0, DAY_SEC } from './time/clock.js'
import { VILLAGE, MILLS, HOUSES, B0, bl, HB, onHouse, SPOTS, EXTRA_BUSY, gardenBedNs } from './world/village.js'
import { Sky, Lights, Clouds, Birds, Fireflies } from './world/sky.jsx'
import { SHIRTS, tangentAt, buildWalkers, buildNewWalkers, SQ, sqSpot, BENCH, benchSeat, CHAT_A, CHAT_B, SWEEP, A, RATE, STATIC_ACTS, LINEUP } from './npc/routines.js'

const spin = { a: -0.8 * ROT_A0 + 0.25, v: 0 }
const _v = new THREE.Vector3(), _u = new THREE.Vector3(), _f = new THREE.Vector3(), _s = new THREE.Vector3()
function Clock() {
  const camera = useThree(s => s.camera)
  useFrame((_, dt) => {
    dt = Math.min(dt, 0.05)
    wind.time.value += dt; T.h += dt * 24 / DAY_SEC
    if (!fixed) rot.a += dt * Math.PI * 2 / DAY_SEC // round6: one in-game day per real hour (?daylen=<sec> to override)
    const p = rot.a, e = Math.cos(p)
    if (!fixed) { G.s.clock.a = rot.a; newDay(dayFromPhase(rot.a)) }
    if (VIEW.mode === 'follow' && P.wUp.lengthSq() > 0) { // sun relative to the traveller's sky
      _s.setFromMatrixColumn(camera.matrixWorld, 0)
      T.sun.copy(P.wUp).multiplyScalar(e).addScaledVector(_s, Math.sin(p) * 0.9).addScaledVector(P.wFwd, -0.35).normalize()
    } else T.sun.set(Math.sin(p) * 0.9, e, 0.55).normalize()
    if (HOME.inside) HOME.sun() // indoors: light comes in through her window
    T.day = ss(-0.15, 0.45, e); T.night = 1 - ss(-0.35, 0.05, e); T.dusk = Math.max(0, 1 - Math.abs(e - 0.05) / 0.4); PU.uDay.value = T.day
    document.documentElement.style.setProperty('--ink', T.night > 0.5 ? '#f3e6c8' : '#5a4636'); for (const m of glowMats) m.color.copy(m.userData.base).multiplyScalar(0.25 + T.night * 5 + T.dusk * 1.6)
  })
  return null
}

const _wx = new THREE.Vector3(), _wy = new THREE.Vector3(), _wz = new THREE.Vector3(), _wm = new THREE.Matrix4(), _wn = new THREE.Vector3(), _wf = new THREE.Vector3()

// worn footpaths: each village door to the nearest point of the main path, plus the tamped earth of the square.
// Baked into the terrain's vertex colours (no extra geometry); noisy edges so they read as trodden, not drawn.
let WORN = null
function wornAt(v) {
  if (!WORN) { WORN = []; const pts = []; for (let i = 0; i < 600; i++) pts.push(pathDir(i / 600 * Math.PI * 2).normalize())
    HOUSES.forEach((h, i) => { const a = onHouse(i, 0, 0.42); let best = pts[0]; for (const p of pts) if (p.distanceTo(a) < best.distanceTo(a)) best = p; if (best.angleTo(a) * R < 2.2) WORN.push([a, best]) }) }
  let w = 0; const nz = 0.75 + 0.25 * Math.sin(v.x * 140 + v.y * 60) * Math.sin(v.z * 120)
  for (const [a, b] of WORN) { const ab = _wv.copy(b).sub(a), t = Math.max(0, Math.min(1, _wv2.copy(v).sub(a).dot(ab) / ab.lengthSq())), d = _wv2.copy(a).addScaledVector(ab, t).distanceTo(v) * R; const hw = 0.075 * (1 - 0.3 * Math.sin(t * 9)); if (d < hw * 1.8) w = Math.max(w, (1 - d / (hw * 1.8)) * 1.2 * nz) }
  const sd = v.distanceTo(VILLAGE) * R; if (sd < 0.75) w = Math.max(w, Math.min(1, (0.75 - sd) / 0.3) * 0.62 * nz)
  return w
}
const _wv = new THREE.Vector3(), _wv2 = new THREE.Vector3()
function Ground() {
  const geo = useMemo(() => {
    const g = new THREE.IcosahedronGeometry(R, 64); const p = g.attributes.position, v = new THREE.Vector3(), cols = []
    const a = C('#9fd17a'), b = C('#7fbf6a'), c = C('#c8e08a'), sand = C('#d9bf86'), bank = C('#5f9a5e'), worn = C('#c7cf86'), mud = C('#8f7d5c'), bed = C('#4e7f7a'), tmp = new THREE.Color()
    // the icosphere is non-indexed (~6 copies of each point): shade each unique point once
    const seen = new Map()
    for (let i = 0; i < p.count; i++) {
      const key = Math.round(p.getX(i) * 1e4) + ',' + Math.round(p.getY(i) * 1e4) + ',' + Math.round(p.getZ(i) * 1e4), hit = seen.get(key)
      if (hit) { cols.push(hit[0], hit[1], hit[2]); p.setXYZ(i, hit[3], hit[4], hit[5]); continue }
      v.fromBufferAttribute(p, i).normalize(); const hh = height(v)
      const w = Math.sin(v.x * 6 + v.y * 4) * Math.sin(v.z * 5 - v.y * 3)
      tmp.copy(a).lerp(b, w * 0.5 + 0.5).lerp(c, Math.max(0, Math.sin(v.x * 11 + v.z * 9) * Math.sin(v.y * 13)) )
      const sn = streamNear(v), gap = sn.d - sn.half // round6: world units outside the river's edge (<0 = under water)
      if (gap < 0.3) { if (gap < 0) tmp.copy(bed); else if (gap < 0.07) tmp.lerp(mud, 0.85); else tmp.lerp(bank, 0.8 * (1 - (gap - 0.07) / 0.23)) }
      const dp = distToCurve(v, pathDir, 300); if (dp < 0.05 * K) tmp.lerp(sand, 0.8 * (1 - dp / (0.05 * K)))
      if (dp < 0.1 * K && dp >= 0.05 * K) tmp.lerp(worn, 0.35 * (1 - (dp - 0.05 * K) / (0.05 * K)) * (0.6 + 0.4 * Math.sin(v.x * 90 + v.z * 70))) // trampled verge
      { const wd = wornAt(v); if (wd > 0) tmp.lerp(wd > 0.55 ? sand : worn, Math.min(0.75, wd)) }
      zoneColour(v, tmp); cols.push(tmp.r, tmp.g, tmp.b); v.multiplyScalar(R + hh - (gap < 0.04 ? 0.03 + 0.11 * ss(0.04, -0.3, gap) : 0)); p.setXYZ(i, v.x, v.y, v.z); seen.set(key, [tmp.r, tmp.g, tmp.b, v.x, v.y, v.z])
    }
    g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3)); g.computeVertexNormals(); { const nr = g.attributes.normal, cl = g.attributes.color, nv = new THREE.Vector3(), pv = new THREE.Vector3(), cc = new THREE.Color(); for (let i = 0; i < p.count; i++) { pv.fromBufferAttribute(p, i).normalize(); nv.fromBufferAttribute(nr, i); cc.fromBufferAttribute(cl, i); rockify(pv, nv, cc); cl.setXYZ(i, cc.r, cc.g, cc.b) } } return g
  }, [])
  // no inverted hull on the terrain (it doubled ~82k tris): ink is drawn in its own shader instead (inkRim)
  return <mesh geometry={geo} material={useMemo(() => inkRim(paint(toon('#ffffff', { vertexColors: true }), 0.09, true, 1.6)), [])} />
}

// ship trim: Path / Stream ribbons (+ their shaders) live in the riverProps lazy chunk now (startup index -~2 KB gz)
const PathLazy = lazy(() => import('./riverProps.jsx').then(m => ({ default: m.Path }))), StreamLazy = lazy(() => import('./riverProps.jsx').then(m => ({ default: m.Stream })))
const RiverStonesLazy = lazy(() => import('./riverProps.jsx').then(m => ({ default: m.RiverStones })))

const floorLift = (n) => bridgeLift(n) + ropeLift(n)

const DM = { plank: paint(toon('#b07a4f'), 0.18, true, 12), rail: toon('#8a5a3c'), cloth: ['#ffffff', '#f59ab0', '#8fc3e8', '#ffd36e'].map(c => toon(c, { side: THREE.DoubleSide })), rope: toon('#e8dcc0'), red: toon('#d9534f'), soil: paint(toon('#8a6248'), 0.2, true, 14), cabbage: toon('#8fcf6a'), carrot: toon('#ef8a3c'), fence: toon('#f3e6cc'), stone: paint(toon('#c9c0b2'), 0.15, true, 15), moss: toon('#7fae5f'), cat: toon('#f2a65a'), catW: toon('#fff4e6'), dark: toon('#3a2e2a'), sign: toon('#ffd36e'), curtains: ['#f59ab0', '#8fc3e8', '#fff1c9', '#b8e0a8'].map(c => toon(c)), smoke: toon('#f4f1ee', { transparent: true, opacity: 0.85 }), wing: ['#ffd36e', '#ffffff', '#f59ab0', '#a8d8ff'].map(c => toon(c, { side: THREE.DoubleSide })) }

// ship trim: Bridge + Laundry moved to the riverProps lazy chunk (App-only helpers passed as props)
const BridgeLazy = lazy(() => import('./riverProps.jsx').then(m => ({ default: m.Bridge }))), LaundryLazy = lazy(() => import('./riverProps.jsx').then(m => ({ default: m.Laundry })))

const CatLazy = lazy(() => import('./riverProps.jsx').then(m => ({ default: m.Cat }))) // ship trim: lazy chunk

const MailboxLazy = lazy(() => import('./riverProps.jsx').then(m => ({ default: m.Mailbox }))) // r7-ship: lazy (startup budget)

function VegPatch({ i }) {
  const n = onHouse(i, 0.05, -0.75)
  const { pickets, cabb, carrots } = useMemo(() => {
    const p0 = place(n, 0, i * 1.3), pickets = [], cabb = [], carrots = []
    const at = (x, z, lift, s) => { const d = p0.pos.clone().add(new THREE.Vector3(x, 0, z).applyQuaternion(p0.q)).normalize(); return { ...place(d, lift, i * 1.3), s } }
    for (let k = 0; k <= 12; k++) { const x = -0.36 + k * 0.06; pickets.push(at(x, -0.24, 0, 1), at(x, 0.24, 0, 1)) }
    for (let k = 1; k < 8; k++) { const z = -0.24 + k * 0.06; pickets.push(at(-0.36, z, 0, 1), at(0.36, z, 0, 1)) }
    for (let r = 0; r < 3; r++) for (let k = 0; k < 5; k++) (r === 1 ? carrots : cabb).push(at(-0.24 + k * 0.12, -0.12 + r * 0.12, r === 1 ? 0.03 : 0.035, 0.8 + rnd() * 0.4))
    return { pickets, cabb, carrots }
  }, [])
  const geos = useMemo(() => { const pk = new THREE.BoxGeometry(0.018, 0.12, 0.012); pk.translate(0, 0.06, 0); const cb = new THREE.IcosahedronGeometry(0.035, 1); cb.scale(1, 0.8, 1); const ct = new THREE.ConeGeometry(0.018, 0.05, 6); ct.translate(0, 0.02, 0); return { pk, cb, ct } }, [])
  return <>
    <Surface n={n} lift={0.0} spin={i * 1.3}><mesh position={[0, 0.012, 0]} material={DM.soil}><boxGeometry args={[0.66, 0.03, 0.42]} /></mesh></Surface>
    <Instanced items={pickets} geo={geos.pk} mat={DM.fence} />
    <Instanced items={cabb} geo={geos.cb} mat={DM.cabbage} />
    <Instanced items={carrots} geo={geos.ct} mat={DM.cabbage} />
  </>
}

function Stones() {
  const items = useMemo(() => { const a = []; for (let i = 0; i < 6; i++) for (let k = 0; k < 4; k++) { const d = onHouse(i, (k % 2 ? 0.04 : -0.04), 0.4 + k * 0.13); a.push({ ...place(d, 0.0, rnd() * 3), s: 0.85 + rnd() * 0.3 }) } return a }, [])
  const geo = useMemo(() => { const g = new THREE.CylinderGeometry(0.055, 0.06, 0.025, 9); g.scale(1, 1, 0.8); return g }, [])
  return <Instanced items={items} geo={geo} mat={DM.stone} />
}

const ShrineLazy = lazy(() => import('./riverProps.jsx').then(m => ({ default: m.Shrine }))) // ship trim: lazy chunk

const BusStopLazy = lazy(() => import('./riverProps.jsx').then(m => ({ default: m.BusStop }))) // r7: lazy (startup budget)

const HGEO = new Map()
const houseVariant = (i) => { const k = `${i % 3}|${i % 2}|${i % 4}`; let g = HGEO.get(k); if (!g) HGEO.set(k, g = houseGeos({ w: 0.55 + (i % 3) * 0.1, tall: i % 2 ? 0.55 : 0.45, roof: ['#d9655b', '#5f8fc4', '#e8a24a', '#c97b9a'][i % 4], wall: i % 2 ? '#fbf3e4' : '#f2e2c4', curtain: ['#f59ab0', '#8fc3e8', '#fff1c9', '#b8e0a8'][i % 4], seed: i % 4 })); return g }
const HM = { shell: paint(toon('#ffffff', { vertexColors: true }), 0.1, true, 6), detail: paint(toon('#ffffff', { vertexColors: true }), 0.12, false, 9) }
const HOUSE_LIFT = -0.02
function Moss() { // moss cushions on the tile rows (follow the roof slope) and at the wall foot
  const items = useMemo(() => { const a = []; HOUSES.forEach((hn, i) => { const w = 0.55 + (i % 3) * 0.1, tall = i % 2 ? 0.55 : 0.45, half = 0.335, ridge = tall + 0.31, eave = tall - 0.015, ang = Math.atan2(ridge - eave, half), p = place(hn, HOUSE_LIFT, i * 1.3)
    ;[[-0.3, 0.72, 1], [0.22, 0.86, 1], [0.05, 0.62, -1], [-0.18, 0.9, -1]].forEach(([x, u, sd], k) => { if ((i + k) % 3 === 2) return; const pos = p.pos.clone().add(new THREE.Vector3(x * w, ridge - (ridge - eave) * u + 0.03 + k * 0.002, sd * half * u).applyQuaternion(p.q)); a.push({ pos, q: p.q.clone().multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(sd * ang, 0, 0))).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rnd() * 6, 0))), s: 0.6 + rnd() * 0.5, c: C('#7fae5f').lerp(CC('#a8c86a'), rnd()) }) }) }); return a }, [])
  const geo = useMemo(() => { const g = new THREE.IcosahedronGeometry(0.06, 1); g.scale(1, 0.3, 0.8); return g }, [])
  return <Instanced items={items} geo={geo} mat={useMemo(() => toon('#ffffff'), [])} />
}
const CHIMNEYS = HOUSES.map((hn, i) => { const p = place(hn, HOUSE_LIFT, i * 1.3), c = houseVariant(i).chimney; return { top: p.pos.clone().add(c.clone().applyQuaternion(p.q)), up: p.n } })
const SmokeLazy = lazy(() => import('./riverProps.jsx').then(m => ({ default: m.Smoke }))) // r7-ship: lazy (startup budget)

function Butterflies() {
  const bs = useMemo(() => Array.from({ length: 16 }, (_, i) => ({ base: (i < 10 ? VILLAGE.clone().add(randDir().multiplyScalar(0.35)) : randDir()).normalize(), ph: rnd() * 6, ax: randDir(), m: DM.wing[i % 4] })), [])
  const refs = useRef([])
  useFrame(() => { const t = wind.time.value; bs.forEach((b, i) => { const g = refs.current[i]; if (!g) return; const a = t * 0.35 + b.ph; const n = _wn.copy(b.base).applyAxisAngle(b.ax, Math.sin(a) * 0.08).applyAxisAngle(b.base, a * 0.6).normalize(); const n2 = _wf.copy(b.base).applyAxisAngle(b.ax, Math.sin(a + 0.02) * 0.08).applyAxisAngle(b.base, (a + 0.02) * 0.6).normalize(); const f = n2.sub(n).normalize(); g.position.copy(n).multiplyScalar(R + height(n) + 0.22 + Math.sin(t * 2 + i) * 0.06); g.quaternion.setFromRotationMatrix(_wm.makeBasis(_wx.crossVectors(n, f), n, f)); const fl = Math.sin(t * 16 + i) * 0.9; g.children[0].rotation.z = 0.2 + fl; g.children[1].rotation.z = -0.2 - fl; g.visible = T.night < 0.6 }) })
  return bs.map((b, i) => <group key={i} ref={el => refs.current[i] = el} scale={0.8}>{[1, -1].map(s => <group key={s}><mesh position={[s * 0.022, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} material={b.m}><circleGeometry args={[0.024, 8]} /></mesh></group>)}</group>)
}

function Seeds() {
  const { geo, mat } = useMemo(() => {
    const N = 160, p = [], s = []; for (let i = 0; i < N; i++) { p.push(...randDir().toArray()); s.push(rnd()) }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); geo.setAttribute('seed', new THREE.Float32BufferAttribute(s, 1))
    const mat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { uTime: wind.time, uD: { value: 1 } },
      vertexShader: `attribute float seed; uniform float uTime; varying float vA; void main(){ float u = fract(uTime*.03 + seed); vec3 p = normalize(position + vec3(sin(uTime*.2+seed*9.),0.,cos(uTime*.17+seed*7.))*.15*u) * (${R.toFixed(1)} + .1 + u*1.6); p += vec3(sin(uTime*1.3+seed*20.), cos(uTime*1.1+seed*13.), 0.)*.03; vA = smoothstep(0.,.1,u)*smoothstep(1.,.7,u); vec4 mv = modelViewMatrix*vec4(p,1.); gl_PointSize = 40./-mv.z; gl_Position = projectionMatrix*mv; }`,
      fragmentShader: `uniform float uD; varying float vA; void main(){ vec2 q = gl_PointCoord-.5; float d = length(q); float a = smoothstep(.5,.15,d)*.5 + smoothstep(.12,.0,d)*.6; float rays = .5+.5*cos(atan(q.y,q.x)*8.); a *= mix(.6,1.,rays); gl_FragColor = vec4(vec3(1.,.99,.94), a*vA*uD); }` })
    return { geo, mat }
  }, [])
  useFrame(() => { mat.uniforms.uD.value = 0.9 * (1 - T.night) })
  return <points geometry={geo} material={mat} />
}

function Wildflowers() {
  const { heads, stems } = useMemo(() => {
    const heads = [], stems = [], fc = ['#fff4f0', '#ffd36e', '#f59ab0', '#c9b3ff', '#ff9a7a', '#a8d8ff'].map(C)
    for (let i = 0; i < 2000 * DENS * (TOUCH ? 0.35 : 0.7); i++) { const n = randDir(); if (busy(n) || onBridge(n) || zoneWet(n)) continue; const s = 0.7 + rnd() * 0.6, p = place(n, 0, rnd() * 6); stems.push({ ...p, s }); heads.push({ ...place(n, 0.075 * s), s, c: fc[Math.floor(rnd() * 6)] }) }
    return { heads, stems }
  }, [])
  const geos = useMemo(() => { const st = new THREE.CylinderGeometry(0.004, 0.005, 0.075, 3); st.translate(0, 0.0375, 0); const hd = new THREE.IcosahedronGeometry(0.022, 0); hd.scale(1, 0.6, 1); return { st, hd } }, [])
  const mats = useMemo(() => ({ st: windify(toon('#6aa65a'), 9), hd: toon('#ffffff') }), [])
  return <><Instanced items={stems} geo={geos.st} mat={mats.st} /><Instanced items={heads} geo={geos.hd} mat={mats.hd} /></>
}

function Details() {
  return <>
    {<Suspense fallback={null}>{BRIDGES.map((b, i) => <BridgeLazy key={i} b={b} Basis={Basis} DM={DM} />)}</Suspense>}
    <Suspense fallback={null}><LaundryLazy Basis={Basis} DM={DM} SPOTS={SPOTS} /><CatLazy Basis={Basis} DM={DM} SPOTS={SPOTS} /><ShrineLazy Basis={Basis} DM={DM} SPOTS={SPOTS} /></Suspense><Suspense fallback={null}><BusStopLazy DM={DM} SPOTS={SPOTS} /></Suspense><Moss /><Suspense fallback={null}><SmokeLazy DM={DM} CHIMNEYS={CHIMNEYS} /></Suspense><Butterflies /><Seeds /><Wildflowers /><Stones />
    <Suspense fallback={null}>{[0, 1, 3, 4].map(i => <MailboxLazy key={i} i={i} DM={DM} onHouse={onHouse} />)}</Suspense>
    <VegPatch i={4} /><VegPatch i={5} />
  </>
}

const busy = (n) => EXTRA_BUSY.some(e => e.distanceTo(n) < 0.1 * K) || SPOTS.view1.distanceTo(n) < 0.2 * K || SPOTS.view2.distanceTo(n) < 0.16 * K || HOUSES.some(h => h.distanceTo(n) < 0.12 * K) || MILLS.some(m => m.distanceTo(n) < 0.12 * K) || zoneBusy(n) || distToCurve(n, pathDir, 140) < 0.05 * K || streamDist(n) < 0.06 * K

const tc = ['#5fae63', '#7cc26a', '#4f9a5e', '#9ccf6a'].map(C)
const TREES = [], FIRS = []
for (let i = 0; i < 700 * DENS; i++) { const n = randDir(); const cl = Math.sin(n.x * 4 + 1) * Math.sin(n.z * 3 - n.y * 2); if (cl < 0.1 || busy(n)) continue; const fir = rnd() < 0.4; (fir ? FIRS : TREES).push({ ...place(n, -0.02, rnd() * 6), s: 0.45 + rnd() * 0.35, c: tc[i % 4].clone().multiplyScalar(0.9 + rnd() * 0.2) }) }
const COLLIDERS = [...HOUSES.map(n => ({ n, r: 0.085 * K })), ...MILLS.map(n => ({ n, r: 0.065 * K })), ...[...TREES, ...FIRS].map(t => ({ n: t.n, r: (0.03 + 0.02 * t.s) * K })), ...ZONE_COLLIDERS]
const _setupHome = () => setupHome({ colliders: COLLIDERS, P, homeN: HOUSES[0], doorN: onHouse(0, 0, 0.3), outN: onHouse(0, 0, 0.78) })
function Vegetation() {
  const { grass, flowers } = useMemo(() => {
    const grass = [], flowers = [], g1 = C('#86c46c'), g2 = C('#b9de86'), fc = ['#fff4f0', '#ffd36e', '#f59ab0', '#c9b3ff'].map(C)
    const _t = new THREE.Vector3()
    for (let i = 0; i < 750 * DENS * (TOUCH ? 0.52 : 0.62); i++) { // lawn (patches a bit bigger + sparser than DENS: grass is the biggest triangle cost) patches: soft dome tufts with flower clumps
      const c = randDir(); if (busy(c)) continue
      const k = 6 + Math.floor(rnd() * 14), sp = (0.03 + rnd() * 0.05) * K, col = g1.clone().lerp(g2, rnd())
      for (let j = 0; j < k; j++) { const n = c.clone().add(_t.set(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).multiplyScalar(sp * 2)).normalize(); if (streamDist(n) < 0.05 * K || distToCurve(n, pathDir, 90) < 0.045 * K || zoneWet(n)) continue; grass.push({ ...place(n, -0.01, rnd() * 6), s: (0.7 + rnd() * 0.8) * (TOUCH ? 1.22 : 1.12), c: col.clone().multiplyScalar(0.92 + rnd() * 0.16) }) }
      if (rnd() < 0.45) { const fcol = fc[i % 4]; for (let j = 0; j < 4 + rnd() * 6; j++) { const n = c.clone().add(_t.set(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).multiplyScalar(sp)).normalize(); flowers.push({ ...place(n, 0.045), s: 0.6 + rnd() * 0.5, c: fcol }) } }
    }
    // stage-b: no lawn tufts / flowers under the garden beds (hidden there anyway; filtered after generation so the seeded layout elsewhere is unchanged)
    const beds = gardenBedNs(HOUSES[0], height), clear = (it) => { _t.copy(it.pos).normalize(); return !beds.some(b => b.angleTo(_t) < 0.2 / R) }
    return { grass: grass.filter(clear), flowers: flowers.filter(clear) }
  }, [])
  const geos = useMemo(() => {
    const tuft = new THREE.SphereGeometry(0.07, 9, 5, 0, Math.PI * 2, 0, Math.PI / 2); tuft.scale(1, 0.75, 1)
    const p = tuft.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), a = Math.atan2(z, x); const w = 1 + 0.18 * Math.sin(a * 5); p.setX(i, x * w); p.setZ(i, z * w); p.setY(i, p.getY(i) * (1 + 0.25 * Math.sin(a * 5))) } tuft.computeVertexNormals()
    const cg = crownGeos(), fg = firGeos(), crown = cg.hi, crownLo = cg.lo, crownLo2 = cg.lo2, fir = fg.hi, firLo = fg.lo
    const trunk = new THREE.CylinderGeometry(0.05, 0.1, 0.62, 7); trunk.translate(0, 0.3, 0); { const p = trunk.attributes.position; for (let i = 0; i < p.count; i++) if (p.getY(i) < 0.05) { p.setX(i, p.getX(i) * 1.25); p.setZ(i, p.getZ(i) * 1.25) } trunk.computeVertexNormals() } // root flare
    const fl = new THREE.IcosahedronGeometry(0.035, 1)
    // far LOD (whole clusters swap, see HorizonCull): same silhouette, fewer facets
    const tuftLo = new THREE.SphereGeometry(0.07, 10, TOUCH ? 2 : 3, /* phones: one ring fewer on far tufts */ 0, Math.PI * 2, 0, Math.PI / 2); tuftLo.scale(1.08, 0.9, 1.08) // same lobes, smooth normals, a touch fuller so ridges stay full
    { const q2 = tuftLo.attributes.position; for (let i = 0; i < q2.count; i++) { const x = q2.getX(i), z = q2.getZ(i), a = Math.atan2(z, x); const w = 1 + 0.18 * Math.sin(a * 5); q2.setX(i, x * w); q2.setZ(i, z * w); q2.setY(i, q2.getY(i) * (1 + 0.25 * Math.sin(a * 5))) } tuftLo.computeVertexNormals() }
    const flLo = new THREE.IcosahedronGeometry(0.039, 0)
    const tuftLo2 = new THREE.SphereGeometry(0.075, 6, 2, 0, Math.PI * 2, 0, Math.PI / 2); tuftLo2.scale(1.1, 0.95, 1.1) // orbit / very far: a soft dome
    return { tuft, crown, trunk, fir, fl, tuftLo, tuftLo2, flLo, crownLo, crownLo2, firLo }
  }, [])
  const mats = useMemo(() => ({ grass: windify(toon('#ffffff'), 6), crown: foliage(toon('#ffffff', { vertexColors: true }), 0.08, 0.4), fir: foliage(toon('#ffffff', { vertexColors: true, side: THREE.DoubleSide }), 0.06, 0.3), trunk: MAT.wood, fl: toon('#ffffff') }), [])
  const trunkItems = [...TREES, ...FIRS].map(t => ({ ...t, c: null }))
  return <>
    {/* mobile tier: one LOD step coarser everywhere (budget 350k tris in walk views) */}
    <Instanced items={grass} geo={TOUCH ? geos.tuftLo : geos.tuft} lo={TOUCH ? geos.tuftLo2 : geos.tuftLo} lo2={geos.tuftLo2} mat={mats.grass} />
    <Instanced items={flowers} geo={geos.fl} lo={geos.flLo} mat={mats.fl} />
    <Instanced items={trunkItems} geo={geos.trunk} mat={mats.trunk} />
    <Instanced items={TREES} geo={TOUCH ? geos.crownLo : geos.crown} lo={TOUCH ? geos.crownLo2 : geos.crownLo} lo2={geos.crownLo2} mat={mats.crown} isOcc />
    <Instanced items={FIRS} geo={geos.fir} lo={geos.firLo} mat={mats.fir} isOcc />
    <EdgeVeg />
  </>
}


// timber-and-plaster houses: one outlined shell (walls, gables, tile rows, chimney, porch roof), one detail mesh
// (timber frame, gutters, shutters, flower boxes, door, porch posts, step) and one glass mesh — 3 meshes + 1 hull
// per house instead of ~20. Geometry is shared between houses with the same size/colour variant.
// layered vegetation at the edges (instanced, clustered + LOD): ferns at tree feet, shrubs hugging house walls and
// path verges, tall grass along the path and stream banks, mossy rocks scattered and on the banks
const _ev = new THREE.Vector3()
const vergeOK = (n) => !zoneWet(n) && !onBridge(n) && !HOUSES.some(h => h.distanceTo(n) < 0.075 * K) && !MILLS.some(m => m.distanceTo(n) < 0.07 * K) && distToCurve(n, pathDir, 140) > 0.028 * K && streamDist(n) > 0.045 * K && !zoneBusy(n) && !EXTRA_BUSY.some(e => e.distanceTo(n) < 0.05 * K)
const EdgeVegLazy = lazy(() => import('./edgeveg.jsx'))
function EdgeVeg() { const ok = useIdleSlot(-1); return ok ? <Suspense fallback={null}><EdgeVegLazy W={{ TREES, FIRS, HOUSES, onHouse, vergeOK, busy, DENS, TOUCH }} /></Suspense> : null }
function House({ n, i }) {
  const hg = houseVariant(i)
  return <Surface n={n} lift={HOUSE_LIFT} spin={i * 1.3}>
    <mesh geometry={hg.shell} material={HM.shell} ref={occ}><Outlines thickness={0.02} color={INK} /></mesh>
    <mesh geometry={hg.detail} material={HM.detail} />
    <mesh geometry={hg.glass} material={MAT.win} />
  </Surface>
}
function Lamp({ n, i = 0 }) {
  const lan = useRef(); useFrame(() => { const t = wind.time.value; lan.current.rotation.z = Math.sin(t * 1.6 + i) * 0.18 + Math.sin(t * 3.7 + i) * 0.05; lan.current.rotation.x = Math.sin(t * 1.1 + i * 2) * 0.1 })
  return <Surface n={n} spin={i}><mesh position={[0, 0.25, 0]} material={MAT.wood}><cylinderGeometry args={[0.015, 0.02, 0.5, 5]} /><Outlines thickness={0.005} color={INK} /></mesh>
    <mesh position={[0.06, 0.49, 0]} material={MAT.wood}><boxGeometry args={[0.13, 0.015, 0.015]} /></mesh>
    <group ref={lan} position={[0.115, 0.485, 0]}><mesh position={[0, -0.03, 0]} material={MAT.wood}><boxGeometry args={[0.004, 0.06, 0.004]} /></mesh>
      <mesh position={[0, -0.075, 0]} material={MAT.lamp}><cylinderGeometry args={[0.028, 0.03, 0.055, 6]} /></mesh>
      <mesh position={[0, -0.042, 0]} material={MAT.wood}><coneGeometry args={[0.04, 0.025, 6]} /></mesh></group>
  </Surface>
}
// stage-b trim: the four sails (+ their ink) and the four spars are one merged mesh each: 12 -> 3 draw calls per mill, same shapes
let BLADES = null
const bladeGeos = () => BLADES || (BLADES = (() => { const s = [], w = [], r = new THREE.Matrix4(); for (let k = 0; k < 4; k++) { r.makeRotationZ(k * Math.PI / 2); s.push(new THREE.BoxGeometry(0.13, 0.6, 0.015).translate(0, 0.38, 0).applyMatrix4(r)); w.push(new THREE.BoxGeometry(0.025, 0.72, 0.02).translate(0, 0.38, -0.01).applyMatrix4(r)) } return { sail: mergeGeometries(s), spar: mergeGeometries(w) } })())
function Windmill({ n, i }) {
  const blades = useRef(); useFrame((_, dt) => { blades.current.rotation.z += dt * (0.8 + i * 0.3) })
  return <Surface n={n} lift={-0.05} spin={-0.4 + i}>
    <mesh position={[0, 0.55, 0]} material={MAT.white}><cylinderGeometry args={[0.16, 0.26, 1.1, 8]} /><Outlines thickness={0.025} color={INK} /></mesh>
    <mesh position={[0, 1.22, 0]} material={MAT.roofs[i % 4]}><coneGeometry args={[0.22, 0.32, 8]} /><Outlines thickness={0.02} color={INK} /></mesh>
    <mesh position={[0, 0.6, 0.235]} material={MAT.win}><planeGeometry args={[0.08, 0.1]} /></mesh>
    <group ref={blades} position={[0, 1.0, 0.26]}>
      <mesh geometry={bladeGeos().sail} material={MAT.sail}><Outlines thickness={0.015} color={INK} /></mesh><mesh geometry={bladeGeos().spar} material={MAT.wood} />
      <mesh material={MAT.wood}><sphereGeometry args={[0.05, 8, 6]} /></mesh>
    </group>
  </Surface>
}

const WALKERS = buildWalkers()
const NEW_WALKERS = buildNewWalkers()
const _c0 = new THREE.Vector3(), _tw = new THREE.Vector3()
function Walker({ w, i }) {
  const ready = useIdleSlot(i), ref = useRef(), st = useMemo(() => ({ phase: rnd() * 6, move: 0, t: 0, wave: w.wave, look: w.look || 0, act: null, actW: 0, talkSeed: i * 1.3 }), [])
  const camera = useThree(s => s.camera)
  const L = useMemo(() => ({ clk: 0, pc: 0, cur: null, curF: new THREE.Vector3(), face: new THREE.Vector3() }), [])
  const npc = useMemo(() => { const c = { key: w.key || w.cfg.name, w, obj: null, st, ready: false, h: 0.4 * (w.cfg.body?.H ?? 1) }; NPCS.push(c); return c }, [])
  useEffect(() => () => { const k = NPCS.indexOf(npc); if (k >= 0) NPCS.splice(k, 1) }, [])
  useFrame((_, dt) => {
    dt = Math.min(dt, 0.05); const t = wind.time.value; st.t = t; npc.obj = ref.current; npc.ready = ready
    const per = periodAt(rot.a), talking = !!w.talking
    let n, fwd, mv = 1, act = null
    if (w.mode === 'path') {
      const pz = w.pause, inPause = pz && ((t + i * 7.1) % pz.every) < pz.len
      const spd = talking || inPause ? 0 : (w.speeds?.[per] ?? 1); L.clk += dt * spd; if (inPause) act = pz.act
      const a = w.t0 + L.clk * w.sp; n = pathDir(a).normalize(); const n2 = pathDir(a + 0.01 * Math.sign(w.sp)).normalize(); fwd = n2.sub(n).normalize(); n.addScaledVector(_wx.crossVectors(n, fwd), w.off / R).normalize()
      mv = spd > 0 ? Math.min(1, 0.55 + 0.45 * spd) : 0; st.rate = spd
    } else if (w.mode === 'pace') {
      const wk = w.work, working = !!wk && wk.periods.includes(per) && ((t + i * 3.3) % (wk.on + wk.off)) < wk.on
      const spd = talking || working ? 0 : (w.speeds?.[per] ?? (per === 'night' ? 0.55 : per === 'evening' ? 0.8 : 1))
      L.pc += dt * w.w * spd; const ph = L.pc + i, s_ = Math.sin(ph), c = Math.cos(ph)
      n = _wn.copy(w.n).addScaledVector(w.tan, s_ * w.range / R).normalize(); fwd = _wf.copy(w.tan).multiplyScalar(c >= 0 ? 1 : -1); mv = spd > 0 ? ss(0.12, 0.35, Math.abs(c)) : 0
      if (working) act = wk.act; else if (w.carry && mv > 0.2) act = 'carry'
    } else if (w.mode === 'anchor') { // walk to this period's spot, then do the activity there
      const pe = w.plan[per]; let pl = pe
      if (Array.isArray(pe)) { const tot = pe.reduce((s, x) => s + (x.dur || 20), 0); let u = (t + i * 5.3) % tot; for (const x of pe) { u -= (x.dur || 20); if (u < 0) { pl = x; break } } }
      if (!L.cur) { L.cur = pl.n.clone().normalize(); L.curF.copy(pl.at).sub(L.cur) }
      npc.stage = pl.stage || pl.act
      let goal = pl.n; if (pl.drift) goal = _tw.copy(pl.n).addScaledVector(tangentAt(pl.n, 0), Math.sin(t * 0.25 + i) * pl.drift / R).normalize()
      const d = L.cur.angleTo(goal) * R, sweeping = pl.drift && d < 0.25
      if (d > 0.012 && !talking) { const step = Math.min(d, (sweeping ? 0.1 : 0.28) * dt) / R; const dv = _tw.copy(goal).addScaledVector(L.cur, -L.cur.dot(goal)).normalize(); L.cur.addScaledVector(dv, step).normalize(); if (!sweeping) L.curF.lerp(dv, Math.min(1, dt * 6)); mv = sweeping ? 0.4 : d > 0.12 ? 1 : 0.5; if (sweeping) act = pl.act }
      else { mv = 0; act = pl.act }
      if (mv === 0 || sweeping) { L.face.copy(pl.at).sub(L.cur); L.curF.lerp(L.face.addScaledVector(L.cur, -L.face.dot(L.cur)).normalize(), Math.min(1, dt * 3)) }
      n = _wn.copy(L.cur); fwd = _wf.copy(L.curF); st.sitTalk = pl.sitTalk; st.look = pl.sitTalk || 0; if (pl.seed !== undefined) st.talkSeed = pl.seed
    } else { n = _wn.copy(w.n).normalize(); fwd = _wf.copy(w.fwd); mv = 0 }
    // greet each other in passing: two villagers walking within ~0.4 units wave once (cooldown), cheap O(22) scan at ~2 Hz
    if (!talking && ready) { L.gT = (L.gT || 0) - dt; L.gCD = (L.gCD || 0) - dt
      if (L.gT <= 0 && L.gCD <= 0 && st.move > 0.3 && (L.scan = (L.scan || 0) - dt) <= 0) { L.scan = 0.5; for (const o of NPCS) { if (o === npc || !o.ready || !o.n) continue; if (o.n.angleTo(n) * R < 0.42 && (o.st.move > 0.3 || o.stage)) { L.gT = 1.6; L.gCD = 22 + (i % 5) * 3; o.greetAt = t; break } } }
      if (npc.greetAt && t - npc.greetAt < 1.4 && !act) { act = 'wave'; mv = 0 }
      if (L.gT > 0) { act = 'wave'; mv = 0 } }
    npc.n = (npc.n || new THREE.Vector3()).copy(n); if (w.mode !== 'anchor') npc.stage = act || (mv > 0.2 ? 'walk' : 'idle')
    if (talking && P.n) { mv = 0; if (act !== 'sit') act = 'chat'; L.face.copy(P.n).sub(n); L.face.addScaledVector(n, -L.face.dot(n)); if (L.face.lengthSq() > 1e-12) { L.face.normalize(); L.curF.lerp(L.face, Math.min(1, dt * 5)); fwd.copy(L.curF) } }
    fwd.addScaledVector(n, -fwd.dot(n)).normalize()
    if (act && STATIC_ACTS.has(act) && !(w.mode === 'anchor' && act === 'sweep')) mv = 0
    if (act) st.act = act; st.actW += ((act ? 1 : 0) - st.actW) * Math.min(1, dt * 3.5); if (!act && st.actW < 0.02) st.act = null
    st.move += (mv - st.move) * Math.min(1, dt * 6); st.phase += dt * (NEWCHAR ? (w.cfg.walk?.rate ?? RATE[w.cfg.age] ?? 8) : w.cfg.kid ? 11 : w.cfg.elder ? 6.5 : 8.5) * st.move * (w.mode === 'path' ? Math.max(0.7, Math.min(1.15, st.rate ?? 1)) : 1)
    const g = ref.current; g.quaternion.setFromRotationMatrix(_wm.makeBasis(_wx.crossVectors(n, fwd), n, fwd))
    g.position.copy(n).multiplyScalar(w.dock ? R + LAKE_W + 0.135 : R + height(n) + 0.005 + bridgeLift(n))
    if (planetRef.current) { // cull by distance (close views) and by horizon (anything on the planet's far side)
      _f.copy(g.position).applyMatrix4(planetRef.current.matrixWorld); _c0.setFromMatrixPosition(planetRef.current.matrixWorld)
      const up = _wy.copy(_f).sub(_c0).normalize(), toCam = _wz.copy(camera.position).sub(_f).normalize()
      g.visible = up.dot(toCam) > (TOUCH && VIEW.mode === 'orbit' ? 0.5 : -0.05) && (VIEW.mode === 'orbit' || /* mobile orbit: skip the few-px villagers along the limb */ camera.position.distanceTo(_f) < (TOUCH ? 7 : 10) /* polish-ship: tighter villager range to fit village budget */) } else g.visible = true
  })
  return <group ref={ref}>{!ready ? null : NEWCHAR ? <Character cfg={w.cfg} st={st} res={TOUCH ? 36 : 44} /* ship trim (was 40/48) */ scale={0.8} /> : <Person cfg={w.cfg} st={st} seed={i} />}</group>
}
// the square's bench (one merged mesh, two seats): grandma all day, grandpa joins her in the evening
function Bench() {
  const geo = useMemo(() => { const parts = [], add = (w, h, d, x, y, z, c, rx = 0) => { const g = new THREE.BoxGeometry(w, h, d); if (rx) g.rotateX(rx); g.translate(x, y, z); const col = C(c), a = []; for (let k = 0; k < g.attributes.position.count; k++) a.push(col.r, col.g, col.b); g.setAttribute('color', new THREE.Float32BufferAttribute(a, 3)); parts.push(g) }
    for (const x of [-0.17, 0.17]) { add(0.03, 0.1, 0.1, x, 0.05, -0.03, '#6e4a33'); add(0.026, 0.2, 0.026, x, 0.15, -0.085, '#6e4a33', -0.12) }
    for (const z of [-0.07, -0.03, 0.01]) add(0.42, 0.016, 0.036, 0, BENCH_Y, z, '#a8744c')
    for (const y of [0.17, 0.215]) add(0.42, 0.034, 0.014, 0, y, -0.095 - (y - 0.17) * 0.12, '#9a6a44')
    return mergeGeometries(parts) }, [])
  return <Basis n={BENCH.n} fwd={BENCH.fwd}><mesh geometry={geo} material={useMemo(() => paint(toon('#ffffff', { vertexColors: true }), 0.15, false, 9), [])}><Outlines thickness={0.006} color={INK} /></mesh></Basis>
}
const BENCH_Y = 0.104
// ?view=lineup: every villager in a row (dev view), lazy chunk
const LineupLazy = lazy(() => import('./debug/Lineup.jsx'))

// ---------- traveller ----------
const P = { n: dir(0.95, 0.12).normalize(), fwd: new THREE.Vector3(), h: 0, vy: 0, target: null, move: 0, phase: 0, wUp: new THREE.Vector3(), face: new THREE.Vector3(), wFwd: new THREE.Vector3(), wPos: new THREE.Vector3() }
{ const t = new THREE.Vector3(0, 1, 0); P.fwd.copy(t.sub(P.n.clone().multiplyScalar(P.n.dot(t)))).normalize().negate() }
const KEYS = {}
if (VIEW.mode === 'detail') { P.n.copy(bl(B0, 0.08, 0)); P.fwd.copy(B0.tan) }
window.__player = P
_setupHome()
TALK.onOpen = () => { for (const k in KEYS) KEYS[k] = false; P.target = null } // she stops while talking
function Keys() {
  useEffect(() => {
    const d = e => { const k = e.key.toLowerCase(); if (gameBlocksKeys()) { if (k === ' ') e.preventDefault(); return } KEYS[k] = true; if (k === ' ' && Math.abs(P.h - floorLift(P.n)) < 0.003) P.vy = 1.9; if (k === 'v') VIEW.mode = VIEW.mode === 'follow' ? 'orbit' : 'follow'; if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) e.preventDefault() }
    const u = e => { KEYS[e.key.toLowerCase()] = false }
    addEventListener('keydown', d); addEventListener('keyup', u); return () => { removeEventListener('keydown', d); removeEventListener('keyup', u) }
  }, [])
  return null
}
const _prevN = new THREE.Vector3(), _mv = new THREE.Vector3(), _mv2 = new THREE.Vector3(), _mv3 = new THREE.Vector3(), LAST_DRY = { n: new THREE.Vector3(), toast: 0, landed: false }
const NOWATER = q.has('nowater') // debug: walk through water like before
function stepPlayer(dt) {
  let f = (KEYS.w || KEYS.arrowup ? 1 : 0) - (KEYS.s || KEYS.arrowdown ? 1 : 0), turn = (KEYS.a || KEYS.arrowleft ? 1 : 0) - (KEYS.d || KEYS.arrowright ? 1 : 0)
  if (CAM.yaw) { P.fwd.applyAxisAngle(P.n, -CAM.yaw); CAM.yaw = 0; P.target = null } // touch camera drag turns the traveller; the follow camera swings with them
  if (PAD.active && PAD.mag > 0.12 && !f && !turn) { // analog stick: steer toward the stick direction (relative to facing), speed from how far it is pushed
    const a = Math.atan2(-PAD.x, PAD.y); turn = Math.max(-1, Math.min(1, a * 1.6)) * Math.min(1, PAD.mag * 1.4)
    f = Math.abs(a) < 2.0 ? Math.min(1, (PAD.mag - 0.12) / 0.6) * (Math.abs(a) > 1.2 ? 0.5 : 1) : 0
  }
  const run = KEYS.shift || (PAD.active && PAD.run)
  let go = f
  if (gameBlocksKeys() && G.ui.panel) go = 0
  if (actLocked()) { go = 0; turn = 0; P.target = null } // polish: she stands still during an action
  if (f || turn) P.target = null
  if (turn) P.fwd.applyAxisAngle(P.n, turn * 1.9 * dt) // polish: less snap on turn
  if (P.target) {
    const tg = P.target.clone().addScaledVector(P.n, -P.n.dot(P.target))
    if (P.n.angleTo(P.target) < 0.015 || tg.lengthSq() < 1e-8) P.target = null
    else { P.fwd.lerp(tg.normalize(), Math.min(1, dt * 8)); go = 1 }
  }
  P.move += ((Math.abs(go) > 0 ? Math.max(0.35, Math.min(1, Math.abs(go))) : 0) - P.move) * Math.min(1, dt * 8)
  _prevN.copy(P.n)
  P.n.addScaledVector(P.fwd, go * (run ? 1.51 : 0.88) * (P.spd || 1) / R * dt).normalize() // round6: outdoor stroll another ~10% slower (0.975/1.68 -> 0.88/1.51)
  // round6: the river, lake and harbour are impassable on foot. Airborne (a jump) she may cross; landing in water
  // puts her back on the bank she jumped from. On foot, slide along the bank instead of stepping in.
  const air = P.h - floorLift(P.n) > 0.012
  if (!air && !NOWATER && waterAt(P.n)) { const step = _mv.copy(P.n).sub(_prevN), len = step.length(); P.n.copy(_prevN)
    if (len > 1e-7) for (const a of [0.6, -0.6, 1.1, -1.1]) { _mv2.copy(step).applyAxisAngle(_prevN, a).multiplyScalar(Math.cos(a)); _mv3.copy(_prevN).add(_mv2).normalize(); if (!waterAt(_mv3)) { P.n.copy(_mv3); break } }
    if (waterAt(P.n)) { P.n.copy(LAST_DRY.n.lengthSq() ? LAST_DRY.n : _prevN); if (performance.now() - LAST_DRY.toast > 6000 && LAST_DRY.landed) { LAST_DRY.toast = performance.now(); toast('Too wide to jump here. Look for a bridge or the marked stepping stones.', 'leaf', 3000) } }
    if (P.target) P.target = null }
  if (!air && !waterAt(P.n)) LAST_DRY.n.copy(P.n)
  LAST_DRY.landed = air
  const pass = ropePass(P.n)
  for (const c of COLLIDERS) { if (pass && c.n === Zc.cliff) continue; const a = P.n.angleTo(c.n); if (a < c.r) { const d = P.n.clone().addScaledVector(c.n, -P.n.dot(c.n)).normalize(); P.n.copy(c.n).multiplyScalar(Math.cos(c.r)).addScaledVector(d, Math.sin(c.r)).normalize() } }
  P.fwd.addScaledVector(P.n, -P.fwd.dot(P.n)).normalize()
  const fl = floorLift(P.n); P.vy -= 7 * dt; P.h += P.vy * dt; if (P.h < fl) { if (fl - P.h < 0.12 || P.vy < 0) { P.h = fl; P.vy = 0 } } // gravity toward planet centre
  P.phase += dt * (run ? 10 : 7.4) * P.move // cadence follows the slower stride
}
const PM = { tunic: toon('#5f8fc4'), skin: toon('#f8d9bf'), hat: toon('#e9c46a'), band: toon('#d9655b'), cape: toon('#d9655b', { side: THREE.DoubleSide }), boot: toon('#6b4a3a'), eye: toon('#2e2420'), cheek: toon('#f4a3a0'), bag: toon('#b98a5a') }
const PST = { phase: 0, move: 0, t: 0, turn: 0, dist: 0 }
const _pp = new THREE.Vector3()
const _pf = new THREE.Vector3()
// r7: the body faces where she actually moves (velocity), not the control heading P.fwd: S walks her toward the camera
// instead of moonwalking; turning in place (A/D, stick) still turns her. Smooth turn: ~10/s angular blend on the tangent plane.
const _fv = new THREE.Vector3(), _fp = new THREE.Vector3(), _fq = new THREE.Vector3()
function faceStep(dt) {
  if (P.face.lengthSq() < 0.5) P.face.copy(P.fwd)
  _fv.copy(P.n).sub(_fp); const moved = _fp.lengthSq() > 0 && _fv.length() > 0.02 * dt / R; _fp.copy(P.n)
  const tgt = moved ? _fv.addScaledVector(P.n, -_fv.dot(P.n)).normalize() : P.move < 0.05 ? P.fwd : null
  P.face.addScaledVector(P.n, -P.face.dot(P.n)).normalize()
  if (tgt) { const a = Math.atan2(_fq.copy(P.face).cross(tgt).dot(P.n), P.face.dot(tgt)); P.face.applyAxisAngle(P.n, a * Math.min(1, dt * 10)) }
}
// r7: same rule indoors — the room code moves hp.x/z along hp.yaw (S = backwards); the body yaw follows the actual motion
const FI = { yaw: null, x: 0, z: 0 }, _Y = new THREE.Vector3(0, 1, 0)
function faceInside(dt, obj) { const hp = HOME.hp; if (!hp) return
  if (FI.yaw === null) { FI.yaw = hp.yaw; FI.x = hp.x; FI.z = hp.z }
  const dx = hp.x - FI.x, dz = hp.z - FI.z; FI.x = hp.x; FI.z = hp.z
  const ps = HOME.pose; if ((ps && ps.k > 0.001) || Math.hypot(dx, dz) > 0.15) { FI.yaw = ps && ps.k > 0.001 ? ps.yaw : hp.yaw; return } // merge: activity poses own the body (bed/tub/chair); teleports (placeAt) resync
  const moved = Math.hypot(dx, dz) > 0.02 * dt, want = moved ? Math.atan2(dx, dz) : P.move < 0.05 ? hp.yaw : null
  if (want !== null) { let d = want - FI.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); FI.yaw += d * Math.min(1, dt * 10) }
  HOME.faceYaw = FI.yaw; obj.quaternion.setFromAxisAngle(_Y, FI.yaw) }
function Traveller() {
  const ref = useRef(), [bake, setBake] = useState(BOOT.bakePlayer); useEffect(() => onBoot('bakePlayer', () => setBake(true)), []); useEffect(() => { if (bake) bootStage('baked', 1) }, [bake])
  useFrame((_, dt) => {
    dt = Math.min(dt, 0.05); HOME.playerObj = ref.current
    if (HOME.inside) { HOME.stepInside(dt, KEYS, P, ref.current); faceInside(dt, ref.current) } // inside her house
    else { stepPlayer(dt)
    faceStep(dt); const side = _wx.crossVectors(P.n, P.face)
    ref.current.quaternion.setFromRotationMatrix(_wm.makeBasis(side, P.n, P.face))
    ref.current.position.copy(P.n).multiplyScalar(R + height(P.n) + 0.005 + P.h) }
    tickAct(PST); PST.phase = P.phase; PST.move = P.move; PST.t = wind.time.value
    if (_pp.lengthSq() > 0) PST.dist += Math.min(_pp.distanceTo(ref.current.position), 0.2); _pp.copy(ref.current.position)
    if (_pf.lengthSq() > 0) { const a = Math.atan2(_wy.copy(_pf).cross(HOME.inside ? P.fwd : P.face).dot(P.n), _pf.dot(HOME.inside ? P.fwd : P.face)); PST.turn += (a / Math.max(dt, 1e-3) - PST.turn) * Math.min(1, dt * 10) } _pf.copy(HOME.inside ? P.fwd : P.face)
  })
  return <group ref={ref}>{!bake ? null : SPRITE ? <Suspense fallback={null}><SpritePerson st={PST} /></Suspense> : NEWCHAR ? <GhibliPerson st={PST} /> : <Person cfg={PEOPLE[0]} st={PST} />}{GM.W && <GM.W.PlayerLantern />}</group>
}
const HB_LOOK = around(Zc.harbour, 0.29, 2.3)
const ZVIEWS = {
  'square': { cam: around(VILLAGE, 1.3 / R, 0.4), ch: 0.6, look: VILLAGE, lh: 0.2 },
  'harbour-people': { cam: around(HB_LOOK, 1.7 / R, 0.2), ch: 0.75, look: HB_LOOK, lh: 0.2 },
  'lake-waterfall': { cam: around(Zc.lake, 0.42, 3.9), ch: 2.4, look: Zc.lake.clone().lerp(Zc.cliff, 0.55), lh: 0.2 },
  'terraces-train': { cam: dir(-1.2, 2.75), ch: 2.0, look: Zc.terraces.clone().lerp(dir(-0.95, 2.7), 0.45), lh: 0.2 },
  'harbour-ruins': { cam: dir(-0.1, 3.7), ch: 3.4, look: Zc.harbour.clone().lerp(Zc.ruins, 0.45), lh: 0.0 },
  'forest-giant': { cam: around(Zc.giant, 0.78, 4.6), ch: 3.6, look: Zc.giant, lh: 2.0 },
  'meadow-mills': { cam: Zc.meadow.clone().lerp(Zc.mills, 0.15), ch: 2.4, look: Zc.mills, lh: 0.5 },
}
const CAMD = q.has('camd') ? +q.get('camd') : 1
function Rig() {
  const camera = useThree(s => s.camera)
  const goal = useMemo(() => new THREE.Vector3(), []), look = useMemo(() => new THREE.Vector3(), [])
  useFrame((_, dt) => {
    dt = Math.min(dt, 0.05)
    const g = planetRef.current; if (!g) return
    if (VIEW.mode === 'orbit') { if (!window.__drag) { spin.v *= 0.95; if (!fixed) spin.a -= dt * 0.04 } spin.a += spin.v * dt } else spin.v = 0
    g.rotation.y = spin.a; g.updateMatrixWorld()
    P.wPos.copy(P.n).multiplyScalar(R + height(P.n) + P.h).applyMatrix4(g.matrixWorld)
    P.wUp.copy(P.n).transformDirection(g.matrixWorld); P.wFwd.copy(P.fwd).transformDirection(g.matrixWorld)
    if (HOME.camera(camera, g, dt)) return // interior camera while she's inside
    const k = 1 - Math.exp(-dt * ((window.__snap || VIEW.mode === 'detail') ? 60 : 2.2)) // polish: softer follow lag
    if (VIEW.mode === 'follow') {
      const cz = CAMD * CAM.zoom; goal.copy(P.wPos).addScaledVector(P.wUp, 1.05 * cz * (1 + CAM.pitch)).addScaledVector(P.wFwd, -2.1 * cz * (1 - 0.35 * CAM.pitch))
      if (goal.length() < R + 0.6) goal.setLength(R + 0.6)
      _v.copy(P.wPos).addScaledVector(P.wUp, 0.3); _u.copy(goal).sub(_v); const dist = _u.length(); RC.set(_v, _u.normalize()); RC.far = dist
      const hit = RC.intersectObjects(OCC, false)[0]; if (hit) goal.copy(_v).addScaledVector(_u, Math.max(0.35, hit.distance - 0.12)).addScaledVector(P.wUp, 0.15 * (1 - hit.distance / dist))
      camera.position.lerp(goal, k); camera.up.lerp(P.wUp, k).normalize()
      look.lerp(_v.copy(P.wPos).addScaledVector(P.wUp, 0.32).addScaledVector(P.wFwd, 0.35), k); camera.lookAt(look) // polish: gentler look-ahead
    } else if (VIEW.mode === 'hero') {
      _s.crossVectors(P.wUp, P.wFwd)
      goal.copy(P.wPos).addScaledVector(P.wFwd, 0.95).addScaledVector(_s, 0.45).addScaledVector(P.wUp, 0.42)
      camera.position.lerp(goal, 1); camera.up.copy(P.wUp); look.copy(P.wPos).addScaledVector(P.wUp, 0.24); camera.lookAt(look)
    } else if (VIEW.mode === 'zone' || VIEW.mode === 'lineup') {
      const zv_ = VIEW.mode === 'lineup' ? { cam: LINEUP.clone().addScaledVector(tangentAt(LINEUP, 0), 2.3 / R).normalize(), ch: 1.1, look: LINEUP.clone().addScaledVector(tangentAt(LINEUP, 0), -0.4 / R).normalize(), lh: 0.25 } : ZVIEWS[q.get('z')] || ZVIEWS.lake
      const camL = zv_.cam.clone().normalize().multiplyScalar(R + Math.max(height(zv_.cam), -0.1) + zv_.ch), lookL = zv_.look.clone().normalize().multiplyScalar(R + height(zv_.look) + zv_.lh)
      camera.position.copy(camL.applyMatrix4(g.matrixWorld)); camera.up.copy(zv_.cam.clone().normalize().transformDirection(g.matrixWorld)); look.copy(lookL.applyMatrix4(g.matrixWorld)); camera.lookAt(look)
    } else if (VIEW.mode === 'detail') {
      const c = B0.c.clone(); const lookL = bl(B0, -0.3, 0.45).multiplyScalar(R + 0.15), camL = bl(B0, -2.3, 1.7).multiplyScalar(R + 1.25)
      goal.copy(camL).applyMatrix4(g.matrixWorld); camera.position.lerp(goal, k); camera.up.lerp(_u.copy(c).transformDirection(g.matrixWorld), k).normalize(); look.lerp(lookL.applyMatrix4(g.matrixWorld), k); camera.lookAt(look)
    } else {
      camera.position.lerp(goal.set(0, 5.8 * WS, 30 * WS).multiplyScalar(CAM.zoom), k); camera.up.lerp(_u.set(0, 1, 0), k).normalize(); look.lerp(_v.set(0, 1, 0), k); camera.lookAt(look)
    }
  })
  return null
}
function Hint() {
  const [m, setM] = React.useState(VIEW.mode)
  useEffect(() => { const id = setInterval(() => setM(VIEW.mode), 300); return () => clearInterval(id) }, [])
  return <div style={{ fontSize: 15, opacity: 0.85, lineHeight: 1.5 }}>{TOUCH ? (m === 'follow' ? <>stick to walk · push to the edge to run · tap the ground to walk<br />drag to look · pinch to zoom · ✋ gather</> : <>drag to spin · pinch to zoom · tap Walk to go back</>) : m === 'follow' ? <>WASD / arrows to walk · Space to jump · tap to walk<br />E gather · B bag · C recipes · V planet view</> : <>drag to spin the planet · V to walk</>}</div>
}

const GAMEON = VIEW.mode === 'follow' && !q.has('nogame')
function loadGame() {
  return Promise.all([import('./game/World.jsx'), import('./game/UI.jsx')]).then(([W, U]) => {
    ropeLift = W.ropeLift; ropePass = W.ropePass; gameBlocksKeys = U.gameBlocksKeys
    W.GAME.P = P; W.GAME.H = HOME; HOME.GAME = W.GAME
    W.layout(Zc, VILLAGE, HOUSES[0], (n) => COLLIDERS.some(c => n.angleTo(c.n) < c.r + 0.012) || streamDist(n) < 0.07 * K || distToCurve(n, pathDir, 140) < 0.035 * K || HOUSES.some(h => h.angleTo(n) < 0.14 * K))
    if (q.has('at')) W.teleport(P, q.get('at'))
    const at = q.get('at'); if (at === 'village' || at === 'talk') { // debug spots for the villager round
      const n = at === 'village' ? around(SQ, 0.62 / R, 2.75) : CHAT_A.clone().addScaledVector(tangentAt(CHAT_A, 1.9), 0.38 / R).normalize(), look = at === 'village' ? SQ : CHAT_A
      P.n.copy(n); const f = look.clone().sub(n); P.fwd.copy(f.addScaledVector(n, -f.dot(n)).normalize()) }
    GM.W = W; GM.U = U; bootStage('game', 1)
  })
}
if (GAMEON) onBoot('frame', () => setTimeout(loadGame, 0))
// villager chat (profiles, lines, dialogue UI) is fetched after the first frame: keeps it out of the startup chunk
const TK = { m: null }
if (VIEW.mode === 'follow') onBoot('frame', () => setTimeout(() => import('./talk/Talk.jsx').then(m => { TK.m = m; bootStage('talk', 1) }), 0))
function TalkSlot({ ui }) { const [, f] = useState(0); useEffect(() => onBoot('talk', () => f(1)), []); if (!TK.m) return null; return ui ? <TK.m.TalkOverlay /> : <TK.m.Talk P={P} /> }
function GameSlot({ ui }) { const [, f] = useState(0); useEffect(() => onBoot('game', () => f(1)), []); const C = ui ? GM.U?.GameUI : GM.W?.GameWorld; return C ? <C /> : null }
window.__player = P
// far zones (lake, harbour, cliff, terraces, ruins…) mount in the first idle slot after the first frame
function DeferredZones() { return useIdleSlot(-1) ? <Zones /> : null }
// The world mounts in a few slices (one per task) so the loader keeps animating while React builds ~3k objects.
// Same tree, same order: later slices just appear a few frames later, all before shaders compile and the first frame.
const SLICES = 4
function useSlices() {
  const [k, setK] = useState(1)
  useEffect(() => { if (k >= SLICES) { bootStage('mounted', 1); return } let dead = false; nextPaint().then(() => { if (!dead) { bootStage('world', k / SLICES * 0.9); setK(k + 1) } }); return () => { dead = true } }, [k])
  return k
}
function Planet() {
  const k = useSlices()
  const onDown = (e) => { if (VIEW.mode !== 'follow' || TALK.open) return; e.stopPropagation(); const l = planetRef.current.worldToLocal(e.point.clone()).normalize(); onTap(e.nativeEvent || e, () => { P.target = l }) }
  return <group rotation={[0.35, 0, 0]}><group ref={el => planetRef.current = el} onPointerDown={onDown}>
    <Ground /><Suspense fallback={null}><PathLazy /><StreamLazy /></Suspense>{k >= 2 && <Vegetation />}
    {k >= 2 && HOUSES.map((n, i) => <House key={i} n={n} i={i} />)}
    {k >= 2 && MILLS.map((n, i) => <Windmill key={i} n={n} i={i} />)}
    {k >= 2 && [dir(1.05, 0.05), dir(0.95, 0.3), dir(0.75, 0.0), dir(1.22, 0.25), dir(0.35, 1.55), dir(0.15, -0.4), dir(0.62, 2.4), dir(0.8, 2.45), dir(0.45, 2.42), dir(0.6, 2.75)].map((n, i) => <Lamp key={i} n={n} i={i} />)}
    {k >= 3 && !q.has('novill') && (NEWCHAR ? NEW_WALKERS : WALKERS).map((w, i) => <Walker key={i} w={w} i={i} />)}
    {k >= 3 && NEWCHAR && <Bench />}
    {VIEW.mode === 'lineup' && <Suspense fallback={null}><LineupLazy /></Suspense>}
    <DeferredZones />
    {k >= 3 && HARBOUR_HOUSES.map((n, i) => <Cull key={'hh' + i} n={n} d={16}><House n={n} i={i + 3} /></Cull>)}
    {k >= 3 && MILL_FIELD.map((n, i) => <Windmill key={'mf' + i} n={n} i={i + 2} />)}
    <Traveller /><HomeLayer />{k >= 4 && <Details />}
    {k >= 4 && <Fireflies />}{k >= 4 && <Suspense fallback={null}><RiverStonesLazy colliders={COLLIDERS} houses={HOUSES} touch={TOUCH} /></Suspense>}
    {k >= 4 && GAMEON && <GameSlot />}
  </group></group>
}

function Stats() {
  const gl = useThree(s => s.gl), scene = useThree(s => s.scene)
  useEffect(() => { gl.info.autoReset = false; window.__scene = scene }, [])
  useFrame(() => { window.__calls = gl.info.render.calls; window.__tris = gl.info.render.triangles; gl.info.reset() }, -100)
  return null
}
// Horizon culling: meshes well past the planet's horizon (as seen from the camera) leave camera layer 0.
// Uses layers, not .visible, so it never fights components that toggle visibility themselves.
const LOD_D = +(q.get('lodd') || (TOUCH ? 5 : 8)) /* polish-ship: sooner LOD for village budget; stage-b: 9 -> 8 (village 614k -> ~590k tris) */ // tufts are ~10px here: facets don't read
const LOD_D2 = +(q.get('lodd2') || (TOUCH ? 17 : 28)) // third tier: a few px, only the silhouette lump matters
function HorizonCull() {
  const camera = useThree(s => s.camera), gl = useThree(s => s.gl), n = useRef(0), list = useRef(null), hulls = useRef(null), _w = useMemo(() => new THREE.Vector3(), []), _p = useMemo(() => new THREE.Vector3(), []), _o = useMemo(() => new THREE.Vector3(), []), _tc = useMemo(() => new THREE.Vector3(), []), _m = useMemo(() => new THREE.Matrix3(), [])
  useFrame(() => {
    const pl = planetRef.current; if (!pl || n.current++ % 4) return
    if (!list.current || n.current % 240 === 1) { list.current = []; pl.traverse(o => { if ((o.isMesh || o.isPoints) && !o.isInstancedMesh && !o.isSkinnedMesh && o.geometry && o !== pl) list.current.push(o) }) }
    _o.setFromMatrixPosition(pl.matrixWorld); const camD = camera.position.distanceTo(_o)
    const lim = -Math.min(0.42, 4.5 / camD) // looser when close
    _tc.copy(camera.position).sub(_o).normalize()
    const subK = TOUCH && VIEW.mode === 'orbit' ? gl.domElement.clientHeight / 2 / Math.tan(camera.fov * Math.PI / 360) : 0 /* radius in css px = r * pxK / dist */
    for (const o of list.current) {
      _p.setFromMatrixPosition(o.matrixWorld); const r = _p.distanceTo(_o); if (r < R * 0.6) continue // skip big/central stuff (planet, sky)
      let sub = false
      if (subK) { const g = o.geometry; if (!g.boundingSphere) g.computeBoundingSphere(); sub = g.boundingSphere.radius * o.matrixWorld.getMaxScaleOnAxis() * subK < camera.position.distanceTo(_p) } /* touch orbit: skip props under ~2 px across */
      const hide = sub || _p.sub(_o).divideScalar(r).dot(_tc) < lim
      if (hide) o.layers.disable(0); else o.layers.enable(0)
    }
    // clustered instance batches: hide only when the whole cluster (centre + angular radius) is past the same horizon
    const limA = Math.acos(lim)
    for (const h of HCL) {
      const par = h.mesh.parent; if (!par) continue
      _p.copy(h.c).applyMatrix3(_m.setFromMatrix4(par.matrixWorld)).normalize()
      const hide = Math.acos(Math.max(-1, Math.min(1, _p.dot(_tc)))) - h.rad > limA
      if (h.orbit) { if (hide || VIEW.mode !== 'orbit') h.mesh.layers.disable(0); else h.mesh.layers.enable(0); continue }
      if (VIEW.mode === 'orbit') { h.mesh.layers.disable(0); h.lo && h.lo.layers.disable(0); h.lo2 && h.lo2.layers.disable(0); continue }
      // LOD: cluster whose nearest edge is farther than LOD_D from the camera draws its low-poly twin
      const dd = h.lo ? _w.copy(_p).multiplyScalar(R).add(_o).distanceTo(camera.position) - h.rad * R : 0
      const far = !!h.lo && (VIEW.mode === 'orbit' || dd > LOD_D), far2 = far && !!h.lo2 && (VIEW.mode === 'orbit' || dd > LOD_D2)
      if (hide || far) h.mesh.layers.disable(0); else h.mesh.layers.enable(0)
      if (h.lo) { if (hide || !far || far2) h.lo.layers.disable(0); else h.lo.layers.enable(0) }
      if (h.lo2) { if (hide || !far2) h.lo2.layers.disable(0); else h.lo2.layers.enable(0) }
    }
    // ink hulls: thin out by projected line width (material.visible, so object.visible/layers owned by other code are untouched) and drop once under ~0.5px (fade, not pop)
    if (!hulls.current || n.current % 240 === 1) { hulls.current = []; pl.parent.parent.traverse(o => { const u = o.material && o.material.uniforms; if (o.isMesh && u && u.thickness && o.material.side === THREE.BackSide && o.parent && o.parent.parent && o.parent.parent.isMesh && !o.parent.parent.isInstancedMesh) hulls.current.push({ o, base: u.thickness.value, p: o.parent.parent }); else if (o.isMesh && u && u.uT && o.material.side === THREE.BackSide) hulls.current.push({ o, base: u.uT.value, p: o, shared: true }) }) }
    const pxK = gl.domElement.height / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2)); INK_K.value = pxK
    for (const h of hulls.current) { if (h.shared) { if (h.base * pxK / Math.max(0.01, _w.setFromMatrixPosition(h.p.matrixWorld).distanceTo(camera.position)) < 0.6) h.o.layers.disable(0); continue } // character ink (shared material): off below ~0.6px (runs after the horizon pass, so only ever removes)
      const u = h.o.material.uniforms.thickness
      if (u.value > 1e-6 && Math.abs(u.value - h.base) > 1e-6 && u.value !== h.cur) h.base = u.value // React re-applied the prop
      const px = h.base * pxK / Math.max(0.01, _w.setFromMatrixPosition(h.p.matrixWorld).distanceTo(camera.position))
      const f = TOUCH ? ss(0.6, 1.1, px) : ss(0.3, 0.75, px); h.o.material.visible = f > 0; u.value = h.cur = h.base * (0.6 + 0.4 * f) } // full weight down to ~0.75px, as before
  })
  return null
}
function TouchCam() { const gl = useThree(s => s.gl); useTouchCamera(gl.domElement); return null }
function Drag() {
  const gl = useThree(s => s.gl)
  useEffect(() => { let lx = 0, lt = 0; const el = gl.domElement
    const dn = e => { if (VIEW.mode !== 'orbit') return; window.__drag = true; lx = e.clientX; lt = performance.now(); spin.v = 0 }
    const mv = e => { if (!window.__drag) return; const dx = e.clientX - lx, now = performance.now(); spin.a += dx * 0.006; spin.v = dx * 0.006 / Math.max((now - lt) / 1000, 0.008); lx = e.clientX; lt = now }
    const up = () => { window.__drag = false }
    el.addEventListener('pointerdown', dn); addEventListener('pointermove', mv); addEventListener('pointerup', up); return () => { el.removeEventListener('pointerdown', dn); removeEventListener('pointermove', mv); removeEventListener('pointerup', up) } }, [])
  return null
}

// ---------- character studio (?view=charstudio) ----------
// ?view=charstudio: the character turntable is a dev tool, fetched on demand (src/debug/Studio.jsx)
const StudioScene = lazy(() => import('./debug/Studio.jsx'))

// Runs once the scene graph is committed: bake the traveller, precompile every shader in batches
// (so the loader can show real progress), then start the render loop.
function Boot({ onLive, player = true }) {
  const gl = useThree(s => s.gl), scene = useThree(s => s.scene), camera = useThree(s => s.camera), live = useRef(false)
  useEffect(() => { let dead = false; (async () => {
    if (player) { await new Promise(r => onBoot('mounted', r)); if (dead) return }
    bootStage('world', 1); await nextPaint()
    if (player) { bootStage('bakePlayer', 1); await new Promise(r => onBoot('baked', r)) }
    bootStage('bake', 1); await nextPaint()
    // one representative object per distinct program (material + skinning/instancing/vertex colours)
    const seen = new Set(), reps = []
    scene.traverse(o => { if (!(o.isMesh || o.isPoints || o.isLine) || !o.material) return; for (const m of [].concat(o.material)) { const k = m.uuid + (o.isSkinnedMesh ? 's' : '') + (o.isInstancedMesh ? 'i' : '') + (o.geometry?.attributes.color ? 'c' : ''); if (!seen.has(k)) { seen.add(k); reps.push(o) } } })
    // Compile against the composer's input buffer (the target RenderPass really draws into) so the program
    // variants match the first frame, then "first-use" every object with sliced warm renders on a private layer (31):
    // the blocking link/uniform queries + buffer uploads happen in small tasks instead of one long first frame.
    const comp = COMPOSER.current, rt = comp ? comp.inputBuffer : null
    const lights = []; scene.traverse(o => { if (o.isLight) lights.push(o) })
    const warmCam = camera.clone(); warmCam.layers.set(31)
    // 1) with KHR_parallel_shader_compile, queue every program at once (compiles in parallel, never blocks here);
    //    without it, programs compile inside the sliced warm-up renders below, so the cost is spread over many tasks
    const parallel = gl.extensions.has('KHR_parallel_shader_compile')
    const compileOn = (list, async) => { const prev = gl.getRenderTarget(); gl.setRenderTarget(rt); try { const proxy = { traverse: f => list.forEach(f), traverseVisible: () => {} }; return async ? gl.compileAsync(proxy, camera, scene) : gl.compile(proxy, camera, scene) } finally { gl.setRenderTarget(prev) } }
    if (parallel) { try { await compileOn(reps, true) } catch (err) { console.warn('compile', err) } }
    // 2) first-use them in time-boxed slices (~40 ms each), yielding a paint between slices
    const warm = (batch) => {
      const prev = gl.getRenderTarget(), saved = batch.map(o => [o, o.frustumCulled, o.isInstancedMesh ? o.count : -1])
      try {
        lights.forEach(l => l.layers.enable(31)); saved.forEach(([o]) => { o.layers.enable(31); o.frustumCulled = false; if (o.isInstancedMesh) o.count = Math.min(o.count, 1) }) // real (tiny-target) draw: program link, uniforms, buffer upload and the driver's first-draw work
        gl.setRenderTarget(rt); gl.render(scene, warmCam)
      } catch (err) { console.warn('warm batch', err) } finally {
        gl.setRenderTarget(prev); lights.forEach(l => l.layers.disable(31)); saved.forEach(([o, fc, c]) => { o.layers.disable(31); o.frustumCulled = fc; if (c >= 0) o.count = c })
      }
    }
    // 2) first-use EVERY renderable (not just one per program) into the composer target, in ~30 ms slices with a
    //    paint between them: program link + uniform lookup + buffer/VAO upload + the driver's first draw all happen
    //    here instead of in one multi-second first frame
    const all = []; scene.traverse(o => { if ((o.isMesh || o.isPoints || o.isLine) && o.material) all.push(o) })
    for (let i = 0; i < all.length && !dead;) {
      const t0 = performance.now(), batch = []
      do { batch.push(all[i++]); if (batch.length >= 8) { warm(batch.splice(0)) } } while (i < all.length && performance.now() - t0 < 30)
      if (batch.length) warm(batch)
      bootStage('shaders', i / all.length); await nextPaint()
    }
    window.__programs = reps.length
    // effect passes (bloom/noise/vignette) compile on their first composer render: do that off-screen-behind-the-loader now
    if (COMPOSER.current && !dead) { try { COMPOSER.current.render(0) } catch (err) { console.warn('warm composer', err) } await nextPaint() }
    bootStage('shaders', 1)
    if (q.get('bootpause') === 'shaders') return // screenshot aid: hold the real loader state before the first frame
    live.current = true; onLive()
  })(); return () => { dead = true } }, [])
  useFrame(() => { if (live.current && !BOOT.done.frame) requestAnimationFrame(() => bootStage('frame', 1)) }, 100)
  return null
}
const COMPOSER = { current: null }
// battery / thermal: stop the render loop while the tab is hidden; adaptive resolution when frames struggle
// (between 1x and the usual cap; ?q=fixed keeps the cap for screenshot comparisons)
const DPR_MAX = TOUCH ? 1.25 : 1.5, ADAPT = q.get('q') !== 'fixed'
function useHidden() { const [h, setH] = useState(typeof document !== 'undefined' && document.hidden); useEffect(() => { const f = () => setH(document.hidden); document.addEventListener('visibilitychange', f); return () => document.removeEventListener('visibilitychange', f) }, []); return h }
export default function App() {
  const [live, setLive] = useState(false), hidden = useHidden()
  const [dpr, setDpr] = useState(Math.min(DPR_MAX, typeof devicePixelRatio !== 'undefined' ? devicePixelRatio : 1))
  if (VIEW.mode === 'charstudio') return <>
    <Canvas frameloop={live ? 'always' : 'never'} dpr={TOUCH ? [1, 1.25] : [1, 1.5]} camera={{ fov: 30, near: 0.01 }} gl={{ antialias: true }} style={{ position: 'fixed', inset: 0 }}>
      <Suspense fallback={null}><StudioScene Boot={Boot} onLive={() => setLive(true)} /></Suspense>
      <EffectComposer multisampling={4}><Noise opacity={0.08} blendFunction={BlendFunction.SOFT_LIGHT} /><Vignette offset={0.35} darkness={0.35} /></EffectComposer>
    </Canvas>
    <div style={{ position: 'fixed', left: 28, top: 22, fontFamily: 'Fredoka, sans-serif', color: '#5a4636', fontSize: 22 }}>Character studio{q.has('compare') ? (SPRITE ? ' · 3D (left) vs 2.5D sprite (right)' : (NEWCHAR ? ' · previous 3D prototype (left) vs new (right)' : ' · old (left) vs new (right)')) : ''}</div>
  </>
  return <>
    <Canvas frameloop={live && !hidden ? 'always' : 'never'} dpr={dpr} camera={{ position: [0, 5.8 * WS, 30 * WS], fov: 36, far: 400 }} gl={{ antialias: true }} onCreated={({ camera, gl }) => { camera.lookAt(0, 1, 0); gl.debug.checkShaderErrors = !!import.meta.env.DEV }} style={{ position: 'fixed', inset: 0, cursor: 'pointer' }}>
      {ADAPT && live && <PerformanceMonitor factor={1} flipflops={3} onChange={({ factor }) => setDpr(Math.min(devicePixelRatio || 1, Math.round((1 + (DPR_MAX - 1) * factor) * 20) / 20))} />}
      <Boot onLive={() => setLive(true)} /><Clock /><TalkSlot /><Stats /><HorizonCull /><Drag /><Rig /><Keys /><TouchCam /><Sky /><Lights /><Planet /><Clouds /><Birds />
      <EffectComposer ref={c => { COMPOSER.current = c }} multisampling={TOUCH ? 2 : 4}>
        <Bloom intensity={0.9} luminanceThreshold={0.93} luminanceSmoothing={0.2} mipmapBlur />
        <Noise opacity={0.12} blendFunction={BlendFunction.SOFT_LIGHT} />
        <Vignette offset={0.3} darkness={0.55} />
      </EffectComposer>
    </Canvas>
    <div className="tp-title" style={{ position: 'fixed', left: 32, top: 26, fontFamily: 'Fredoka, sans-serif', color: 'var(--ink)', pointerEvents: 'none', textShadow: '0 1px 0 #fff8' }}>
      <div style={{ fontSize: 34, fontWeight: 500 }}>Tiny Planet</div><Hint />
    </div>
    {GAMEON && <GameSlot ui />}
    <TouchPad />
    {live && <Suspense fallback={null}><MinimapLazy /></Suspense>}{/* r7: minimap (src/minimap, lazy) */}
    <TalkSlot ui />
    <HomeOverlay />
  </>
}
