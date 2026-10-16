// Pip, her dog. Follows her whenever she's outside: loose-distance follow with walk / trot / run gaits, steering
// on the sphere around trees, rocks and houses (the world's own collider list), sniffing stops, chasing butterflies
// and little birds, barking at sheep, rolling in the grass, splashing in the lake, digging (sometimes something
// turns up to gather), fetch (E), tail wag by mood, sitting when she stops, and waiting by the door while she's in.
import * as THREE from 'three'
import { startAct } from '../act.js'
import React, { useEffect, useMemo, useRef, Suspense, lazy } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Quadruped, newPet, POSE0 } from './Quadruped.jsx'
import { HOME } from '../home/state.js'
import { GEO, cel, OUT } from '../home/kit.jsx'
import { R, height, ZONES, LAKE_W, HARB_W, around, dir as dirLL, zoneAng, pathDir, distToCurve, streamNear, onBridgeDeck, bridgeLift, GATES, gateSide } from '../world.js'
import { TALK } from '../talk/state.js'
import { T, q } from '../common.jsx'
import { G, add, toast } from '../game/store.js'
import { ITEMS } from '../game/items.js'
import { Bubble, Puffs, Hearts, burst } from './fx.jsx'

export const DOG_CFG = { s: 1.0, /* round6: ~31% smaller (was 1.45) so he reads as her dog, not her size */ species: 'dog', floppy: true, body: [0.052, 0.062, 0.125], legH: 0.105, legR: 0.015, stride: 0.08, head: 0.055, headY: 0.06, snout: 0.1, eye: 0.13, ear: 0.55, earSplay: 0.12, collar: true, tongue: true, socks: true, tufts: true, pupils: 'round',
  tail: { n: 7, seg: 0.032, r: 0.026, curl: 0.7, tip: 1, bushy: true }, col: { main: '#c9955a', belly: '#fff6e4', dark: '#8a5a30', inner: '#f08f8f', nose: '#1a1410', eye: '#1a1410', iris: '#5a3820', pupil: '#0e0a08', eyeWhite: '#fffaf0', shine: '#ffffff', collar: '#2f6f8a', tag: '#ffd36e' } }
const _t = new THREE.Vector3(), _a = new THREE.Vector3(), _s = new THREE.Vector3(), _m = new THREE.Matrix4(), _x = new THREE.Vector3(), _y = new THREE.Vector3()
const tan = (n, v, out) => out.copy(v).addScaledVector(n, -n.dot(v)).normalize()
// nearby colliders: the planet has hundreds (every tree), so the dog keeps a short list around itself, refreshed at
// ~5 Hz or when it has moved, instead of scanning them all twice per frame
const NEAR = [], _nc = new THREE.Vector3(); let nearT = 0
function nearColliders(n, dt) { nearT -= dt; if (nearT > 0 && n.dot(_nc) > Math.cos(0.08)) return NEAR
  nearT = 0.2; _nc.copy(n); NEAR.length = 0; for (const c of HOME.colliders) if (angTo(n, c.n) < c.r + 0.25) NEAR.push(c); return NEAR }
const FETCHING = new Set(['fetchRun', 'fetchBack'])
const angTo = (a, b) => Math.acos(Math.min(1, Math.max(-1, a.dot(b) / (a.length() * b.length()))))
const surf = (n, out) => out.copy(n).multiplyScalar(R + Math.max(height(n), LAKE_W - 0.07))
const DIG = ['acorn', 'stone', 'coin', 'shell', 'pinecone', 'clay', 'shard']
export const DOG = { n: new THREE.Vector3(0, 1, 0), f: new THREE.Vector3(1, 0, 0), speed: 0, state: 'follow', t: 0, dur: 0, mood: 0.6, side: 1, idleT: 0, barkCD: 4, splashCD: 0, name: 'Pip',
  petCD: 0, ex: 0, wetT: 0, decT: 2, playWin: 0, playRoll: 20, lastFetchH: -99, throws: 0, cd: {}, route: null, routeT: 0, stick: { mode: 'none', n: new THREE.Vector3(), a: new THREE.Vector3(), b: new THREE.Vector3(), t: 0 }, critter: { on: false, kind: 'fly', n: new THREE.Vector3(), d: new THREE.Vector3(), t: 0, up: 0 }, dug: [] }
if (typeof window !== 'undefined') window.__dog = DOG
const FORCE = q.get('dog')
// debug: ?petsdemo puts a sitting Mochi rig beside Pip for the side-by-side shot (Mochi really lives indoors)
const PetsDemo = q.has('petsdemo') ? lazy(() => import('./Cat.jsx').then(m => ({ default: function CatDemo() { const st = useMemo(() => { const s = newPet(); s.goal.sit = 1; s.goal.tailUp = 0.6; return s }, []); return <group position={[0.17, 0, 0.05]} rotation={[0, -0.5, 0]} scale={m.CAT_SCALE}><Quadruped cfg={m.CAT_CFG} st={st} /></group> } }))) : null

const DOGCAM = q.get('dogcam') // debug: close camera on the dog (?dogcam=angle)
if (DOGCAM) HOME.camOverride = (camera, g) => { const D = DOG, a = window.__camA ?? (+DOGCAM || 0.6), dd = window.__camD ?? 0.62, side = _s.crossVectors(D.n, D.f); const p = surf(D.n, new THREE.Vector3()); const c = p.clone().addScaledVector(D.f, Math.cos(a) * dd).addScaledVector(side, Math.sin(a) * dd).addScaledVector(D.n, 0.38 * dd / 0.75)
  camera.position.copy(c.applyMatrix4(g.matrixWorld)); camera.up.copy(D.n).transformDirection(g.matrixWorld); camera.lookAt(p.addScaledVector(D.n, 0.1).applyMatrix4(g.matrixWorld)); return true }
// ---- round6 helpers ----
// sticks lie about on the meadow and along the trail; fetch is only offered there, when he's playful, and not again
// for a few in-game hours after the last game (debug: ?fetch=1 always offers it)
const FETCH_DBG = q.get('fetch') === '1'
export const FETCH_COOLDOWN_H = 3
function stickArea(n) { return zoneAng(n, ZONES.meadow) < ZONES.meadow.r * 1.15 || distToCurve(n, pathDir, 120) * R < 0.9 }
function fetchOffered(P) { const D = DOG; if (FETCH_DBG) return true
  if (D.throws > 0 && D.throws < 3 && D.state === 'sitWait') return true // a short game: up to three throws in a row
  const playful = D.mood > 0.72 || D.playWin > 0
  return playful && T.h - D.lastFetchH >= FETCH_COOLDOWN_H && stickArea(P.n) && !onBridgeDeck(P.n) }
// water he can't go into (he still wades the edges): river away from the decks, deep lake / harbour
const _sn = { d: 9, half: 0, t: 0, side: 1 }
function dogBlocked(n, edge = 0.1) { const s = streamNear(n, _sn); if (s.d < s.half - edge && !onBridgeDeck(n, 0.02)) return true
  if (zoneAng(n, ZONES.lake) < ZONES.lake.r * 1.2 && height(n) < LAKE_W - 0.09) return true
  if (zoneAng(n, ZONES.harbour) < ZONES.harbour.r * 1.2 && height(n) < HARB_W - 0.09) return true; return false }
const sideOf = (n) => streamNear(n, _sn).side
const pickW = (w) => { let s = 0; for (const k in w) s += w[k]; if (s <= 0) return null; let r = Math.random() * s; for (const k in w) { r -= w[k]; if (r <= 0) return k } return null }
const _ga = new THREE.Vector3(), _gb = new THREE.Vector3(), _prev = new THREE.Vector3(), _f0 = new THREE.Vector3()
export function Dog() {
  const st = useMemo(() => newPet(), []), root = useRef(), stickW = useRef(), stickM = useRef(), crit = useRef(), bub = useRef(), puff = useRef(), drops = useRef(), hearts = useRef(), dugRefs = useRef([])
  const D = DOG
  const go = (s, dur, x = {}) => { D.state = s; D.t = 0; D.dur = dur; Object.assign(D, x) }
  useMemo(() => {
    HOME.onExit = () => { go('greet', 1.6); D.mood = Math.min(1, D.mood + 0.3) }
    HOME.near.push((consider, pp) => {
      if (HOME.inside || HOME.busy) return
      const P = HOME.P; if (!P) return
      const d = angTo(D.n, P.n) * R
      if (FETCHING.has(D.state) || D.stick.mode === 'fly') return
      // round6: the default near Pip is a small 'Pet' chip; the stick is only offered sometimes, as a second small chip
      const fetchOK = fetchOffered(P)
      if (d < 0.42) { const throwO = { verb: D.throws ? 'Throw again' : 'Throw stick', icon: 'wood', key: 'F', act: throwStick }
        if (D.petCD <= 0) consider({ kind: 'ext', id: 'dog' + (fetchOK ? '+f' : ''), icon: 'hand', verb: 'Pet', name: D.name, chip: true, alt: fetchOK ? throwO : null, act: petDog }, d, 0.42)
        else if (fetchOK) consider({ kind: 'ext', id: 'dog-f', icon: 'wood', verb: throwO.verb, name: '', chip: true, act: throwStick }, d, 0.42) }
      for (const it of D.dug) if (!it.taken) consider({ kind: 'ext', id: 'dug' + it.id, icon: it.item, verb: 'Pick up', name: ITEMS[it.item].name, act: () => { it.taken = true; add(it.item) } }, pp.distanceTo(surf(it.n, _a)), 0.45)
    })
  }, [])
  function petDog() { const P = HOME.P; startAct('pet', { dur: 1.2 }); D.route = null; D.petCD = 6; D.mood = Math.min(1, D.mood + 0.25); go('petted', 2.6); burst(hearts.current, 5); toast(`${D.name} leans into your hand, tail going ♥`, 'hand'); window.__lastAct = { kind: 'dog', t: performance.now() } }
  function throwStick() { startAct('cast', { dur: 0.7, sound: 'cast' })
    const P = HOME.P, s = D.stick
    s.a.copy(P.n); let dist = 1.6 + Math.random() * 0.6
    for (let i = 0; i < 8; i++) { s.b.copy(P.n).addScaledVector(P.fwd, dist / R).normalize(); if (!HOME.colliders.some(c => angTo(s.b, c.n) < c.r + 0.01) && !dogBlocked(s.b, 0.15) && streamNear(s.b).side === streamNear(P.n).side) break; dist *= 0.75 }
    s.mode = 'fly'; s.t = 0; D.route = null; D.throws++; go('fetchRun', 12); D.mood = Math.min(1, D.mood + 0.15); toast(`Go on, ${D.name}!`, 'wood', 1600)
  }
  // spawn by the door / near her
  if (!D.init && HOME.outN && HOME.P) { D.init = true
    if (HOME.inside) { D.n.copy(HOME.outN); go('wait', 999) } else { D.n.copy(HOME.P.n).addScaledVector(HOME.P.fwd, -0.5 / R).normalize() }
    tan(D.n, HOME.homeN.clone().sub(D.n), D.f)
    if (FORCE === 'splash') { const P = HOME.P, L = ZONES.lake, lc = new THREE.Vector3(L.x, L.y, L.z); P.n.copy(around(lc, L.r * 1.18, 2.2)); tan(P.n, lc.clone().sub(P.n), P.fwd) }
    if (FORCE) { const P = HOME.P; D.n.copy(P.n).addScaledVector(P.fwd, 0.55 / R).addScaledVector(_s.crossVectors(P.n, P.fwd), 0.2 / R).normalize(); tan(D.n, P.n.clone().sub(D.n), D.f)
      if (DOGCAM) { P.n.copy(D.n).addScaledVector(D.f, -0.9 / R).normalize(); tan(P.n, D.n.clone().sub(P.n), P.fwd) }
      if (FORCE === 'fetch') { throwStick(); D.n.copy(P.n).addScaledVector(P.fwd, 0.25 / R).normalize() } else if (FORCE !== 'follow') go(FORCE, 999, { forced: true }); if (FORCE === 'wait') { D.n.copy(HOME.outN); tan(D.n, HOME.homeN.clone().sub(D.n), D.f) } }
  }
  // lazy chunk: warm his shaders as soon as he mounts (async where the GPU allows), so stepping outside never hitches
  const gl = useThree(x => x.gl), scene = useThree(x => x.scene), camera = useThree(x => x.camera)
  useEffect(() => { const gs = [root.current, stickW.current, crit.current].filter(Boolean); if (!gs.length) return; const lights = []; scene.traverse(o => { if (o.isLight) lights.push(o) })
    const proxy = { traverse: f => { gs.forEach(g => g.traverse(f)); lights.forEach(f) }, traverseVisible: f => proxy.traverse(f) }
    try { (gl.compileAsync ? gl.compileAsync(proxy, camera, scene) : Promise.resolve(gl.compile(proxy, camera, scene))).catch(() => {}) } catch {} }, [])
  useFrame((_, dt) => {
    dt = Math.min(dt, 0.05); const P = HOME.P; if (!P || !D.init) { if (!D.init && HOME.outN && HOME.P) { D.init = false } return }
    D.t += dt; D.barkCD -= dt; D.splashCD -= dt; D.petCD -= dt; D.mood = Math.max(0.25, D.mood - dt * 0.004); D.clock = (D.clock || 0) + dt; D.decT -= dt; D.routeT -= dt
    D.playWin -= dt; D.playRoll -= dt; if (D.playRoll < 0) { D.playRoll = 40 + Math.random() * 30; if (Math.random() < 0.4) D.playWin = 30 + Math.random() * 20 } // playful moods come and go
    D.ex = Math.max(0, D.ex + (D.speed > 1.8 ? dt : -dt * 0.25)) // exertion -> panting
    const g = st.goal; Object.assign(g, POSE0); bub.current.visible = false
    const dHer = angTo(D.n, P.n) * R, herMoving = P.move > 0.2, sN = streamNear(D.n, _sn), sGap = sN.d - sN.half, wet = height(D.n) < LAKE_W - 0.03 || (sGap < -0.02 && !onBridgeDeck(D.n))
    if (wet) D.wetT += dt; else if (D.wetT > 0.6 && !FETCHING.has(D.state) && D.state !== 'splash' && D.state !== 'shake' && D.state !== 'wait' && D.state !== 'toDoor') { D.wasWet = true; D.wetT = 0; go('shake', 1.1) } else if (!wet) D.wetT = 0
    g.tailUp = 0.6 + 0.6 * D.mood; g.tailWag = 0.25 + 0.75 * D.mood; g.tailSpeed = 8 + 8 * D.mood; g.tongue = D.speed > 1 || D.ex > 1.2 ? 1 : 0.4 * D.mood; g.mouth = g.tongue * 0.25; if (D.ex > 1.2 && D.speed < 0.6) { g.pant = Math.min(1, D.ex / 3); g.mouth = 0.55 }
    let target = null, spd = 0, face = null, arrive = 0.08
    const s = D.stick
    // ---------- stick physics ----------
    if (s.mode === 'fly') { s.t += dt / 0.75; const k = Math.min(1, s.t); s.n.copy(s.a).lerp(s.b, k).normalize(); stickW.current.position.copy(surf(s.n, _a)).addScaledVector(s.n, 0.2 * (1 - k) + Math.sin(k * Math.PI) * 0.5); stickW.current.quaternion.setFromAxisAngle(s.n, s.t * 9); if (k >= 1) s.mode = 'ground' }
    if (s.mode === 'ground') { stickW.current.position.copy(surf(s.n, _a)).addScaledVector(s.n, 0.012); stickW.current.quaternion.setFromUnitVectors(_y.set(0, 1, 0), s.n) }
    stickW.current.visible = s.mode === 'fly' || s.mode === 'ground'; stickM.current.visible = s.mode === 'mouth'
    // ---------- brain ----------
    const S = D.state
    const nearPick = (lim) => dHer < lim && !herMoving
    if (HOME.inside && S !== 'wait' && S !== 'toDoor') go('toDoor', 999)
    st.frozen = HOME.inside && S === 'wait' && D.t > 1.5 // sat by the door while she's inside, out of sight: pause the rig
    if (S === 'toDoor') { target = HOME.outN; spd = 1.4; if (angTo(D.n, HOME.outN) * R < 0.1) go('wait', 999) }
    else if (S === 'wait') { if (!HOME.inside && !D.forced) go('greet', 1.4); face = _t.copy(HOME.homeN); const long = D.t > 8; g.sit = long ? 0 : 1; g.lie = long ? 1 : 0; g.headPitch = long ? 0.25 : -0.15; g.tailWag = 0.12; g.tailUp = 0.2; g.tongue = 0; g.mouth = 0; g.earBack = long ? 0.35 : 0; if (Math.sin(D.t * 0.7) > 0.95) { g.headTilt = 0.4; g.earBack = -0.2 } }
    else if (S === 'greet') { face = P.n; g.hop = Math.abs(Math.sin(D.t * 9)) * 0.06; g.tailWag = 1.4; g.tailSpeed = 20; g.tongue = 1; g.mouth = 0.5; g.headPitch = -0.3; if (D.t > D.dur) go('follow', 0) }
    else if (S === 'fetchRun') { if (s.mode === 'fly' || s.mode === 'ground') { target = s.mode === 'fly' ? s.b : s.n; spd = 3.0; arrive = 0.06; g.earBack = 0.5; if (s.mode === 'ground' && angTo(D.n, s.n) * R < 0.07) { s.mode = 'mouth'; go('fetchBack', 15) } } else go('follow', 0) }
    else if (S === 'fetchBack') { target = P.n; spd = 2.4; arrive = 0.3; g.tailWag = 1.2; g.tailSpeed = 18; g.tongue = 0; g.mouth = 0
      if (dHer < 0.28) { s.mode = 'ground'; s.n.copy(D.n).addScaledVector(D.f, 0.06 / R).normalize(); if (D.throws >= 3) D.lastFetchH = T.h; go('sitWait', 6); D.mood = Math.min(1, D.mood + 0.2); burst(hearts.current, 2) } }
    else if (S === 'sitWait') { face = P.n; g.sit = 1; g.tailWag = 1.3; g.tailSpeed = 18; g.headPitch = -0.25; g.headTilt = Math.sin(D.t * 1.3) * 0.3; if (D.ex > 1.2) { g.pant = 1; g.mouth = 0.7; g.tongue = 1 } if (dHer > 0.9 || D.t > D.dur) { D.lastFetchH = T.h; D.throws = 0; go('follow', 0) } }
    else if (S === 'sniff') { g.sniff = 1; g.headYaw = Math.sin(D.t * 2.3) * 0.35; g.tailWag = 0.5; g.earBack = -0.2; g.mouth = 0; g.tongue = 0; if (D.t % 0.6 < dt) puff.current?.emit(1, 0.15, 0.1, [0, 0.01, 0.1]); if (D.t > D.dur && !D.forced) go('follow', 0) }
    else if (S === 'dig') { g.crouch = 0.6; g.sniff = 0.6; const a = Math.sin(D.t * 16); g.pawL = Math.max(0, a) * 0.6; g.pawR = Math.max(0, -a) * 0.6; g.tailWag = 1; g.tailSpeed = 14; g.tailUp = 1
      if (D.t % 0.12 < dt) puff.current?.emit(2, 0.6, 0.3, [0, 0.015, 0.085])
      if (D.t > D.dur && !D.forced) { if (Math.random() < 0.4 || D.forceFind) { const item = DIG[Math.floor(Math.random() * DIG.length)], it = { id: Date.now() + '' + Math.random(), item, n: D.n.clone().addScaledVector(D.f, 0.1 / R).normalize() }; D.dug = [...D.dug.filter(x => !x.taken).slice(-2), it]; G.s.seen[item] = G.s.seen[item]; toast(`${D.name} dug up something — a ${ITEMS[item].name}!`, item, 3200) } go('follow', 0) }
      if (D.forced && D.t > 2.5 && !D.dug.length) { const it = { id: 'f', item: 'coin', n: D.n.clone().addScaledVector(D.f, 0.1 / R).normalize() }; D.dug = [it] } }
    else if (S === 'roll') { const k = D.forced ? (D.t % 3.2) / 3.2 : D.t / Math.max(1, D.dur); g.roll = k > 0.15 && k < 0.85 ? 1 : 0; g.lie = 1; g.tongue = 1; g.mouth = 0.6; g.eyes = 0.4; g.bodyYaw = Math.sin(D.t * 4) * 0.25 * g.roll; g.tailWag = 0.8; if (D.t > D.dur && !D.forced) go('shake', 0.9) }
    else if (S === 'shake') { g.bodyYaw = Math.sin(D.t * 40) * 0.25; g.headTilt = Math.sin(D.t * 40) * 0.5; g.eyes = 0.2; if (D.t % 0.1 < dt && D.wasWet) drops.current?.emit(3, 0.55, 0.7, [0, 0.085, 0]); if (D.t > D.dur) { D.wasWet = false; go('follow', 0) } }
    else if (S === 'bark') { const sh = D.sheep; if (sh) face = sh.n; const k = (D.t * 2.2) % 1; const woof = k < 0.25; g.mouth = woof ? 1 : 0.1; g.tongue = 0; g.headPitch = woof ? -0.35 : 0; g.hop = woof ? 0.025 : 0; g.earBack = woof ? -0.3 : 0; g.tailWag = 1; g.tailSpeed = 16; g.crouch = 0.3; bub.current.visible = woof || k < 0.5
      if (D.t > D.dur && !D.forced) { bub.current.visible = false; go('follow', 0) } }
    else if (S === 'splash') { const lake = ZONES.lake, lc = _x.set(lake.x, lake.y, lake.z)
      if (!wet && !D.forced && D.t < 6) { target = D.splashT; spd = 2.0 } else { target = null; const k = Math.sin(D.t * 10); g.hop = Math.max(0, k) * 0.06; g.pawL = Math.max(0, k) * 0.7; g.pawR = Math.max(0, -k) * 0.7; g.tongue = 1; g.mouth = 0.7; g.tailWag = 1.3; g.tailSpeed = 18; if (D.t % 0.09 < dt) drops.current?.emit(3, 0.8, 0.6, [0, 0.02, 0.055]) ; if (Math.random() < dt * 0.8) tan(D.n, _a.copy(D.splashC || lc).applyAxisAngle(D.n, (Math.random() - 0.5) * 3), D.f) ; spd = 0.4; target = _a.copy(D.n).addScaledVector(D.f, 0.15 / R) }
      if (D.t > D.dur && !D.forced) { D.wasWet = true; go('shake', 1.1) } }
    else if (S === 'chase') { const c = D.critter; target = c.n; spd = c.up > 0 ? 2.2 : 2.7; g.earBack = 0.3; g.tailWag = 1.2; g.tailSpeed = 16; g.tongue = 1; g.mouth = 0.4; if (c.kind === 'fly' || c.up > 0) g.headPitch = -0.5
      if (!c.on || D.t > D.dur) { c.on = false; go('follow', 0) } }
    else if (S === 'trail') { // nose-down meander along a scent: slow, wobbly heading, little dust puffs
      g.sniff = 1; g.headYaw = Math.sin(D.t * 3.1) * 0.3; g.tailWag = 0.7; g.tailSpeed = 10; g.earBack = -0.15; g.mouth = 0; g.tongue = 0
      D.f.applyAxisAngle(D.n, (Math.sin(D.t * 1.7 + D.seed) * 1.1 + Math.sin(D.t * 4.3) * 0.5) * dt); target = _ga.copy(D.n).addScaledVector(D.f, 0.25 / R).normalize(); spd = 0.45; arrive = 0.02
      if (D.t % 0.5 < dt) puff.current?.emit(1, 0.12, 0.1, [0, 0.01, 0.1]); if ((D.t > D.dur || dHer > 3.2) && !D.forced) go(dHer > 1.4 ? 'catchup' : 'follow', 0) }
    else if (S === 'dawdle') { // something fascinating here: he stays put until she's well ahead, then hurries after her
      g.sniff = D.t % 3 < 1.8 ? 1 : 0; g.headTilt = D.t % 3 >= 1.8 ? 0.35 : 0; g.tailWag = 0.5; g.tongue = 0; g.mouth = 0; if (D.t % 0.7 < dt && g.sniff) puff.current?.emit(1, 0.12, 0.1, [0, 0.01, 0.1])
      if (!D.forced && (dHer > 1.7 || D.t > D.dur)) go('catchup', 0) }
    else if (S === 'catchup') { target = P.n; spd = 2.6; arrive = 0.5; g.earBack = 0.4; g.tailWag = 1.1; g.tailSpeed = 16; g.tongue = 1; g.mouth = 0.5; if (dHer < 0.65 && !D.forced) go(D.ex > 1.2 ? 'pant' : 'follow', 4.5) }
    else if (S === 'pant') { face = P.n; g.sit = 1; g.pant = 1; g.tongue = 1; g.mouth = 0.75; g.headPitch = -0.15; g.tailWag = 0.6; g.eyes = 0.8; if (!D.forced && (D.t > D.dur || (herMoving && dHer > 0.6))) { D.ex = 0; go('follow', 0) } }
    else if (S === 'explore') { // off on his own for a bit, then back
      if (D.sub === 0) { target = D.exT; spd = 1.25; arrive = 0.12; g.tailWag = 0.8; if (angTo(D.n, D.exT) * R < 0.14 || D.t > 9) { D.sub = 1; D.t2 = 0 } }
      else { D.t2 += dt; g.sniff = 1; g.headYaw = Math.sin(D.t * 2.2) * 0.4; g.tongue = 0; g.mouth = 0; if (D.t2 % 0.6 < dt) puff.current?.emit(1, 0.12, 0.1, [0, 0.01, 0.1]); if (D.t2 > 3.2) D.sub = 2 }
      if (D.sub === 2) { target = P.n; spd = 1.5; arrive = 0.45; if (dHer < 0.6) go('follow', 0) }
      if (!D.forced && (dHer > 4.2 || D.t > D.dur)) go('catchup', 0) }
    else if (S === 'talkSit') { // she's chatting with someone: he trots to her side, sits and listens, head tilting
      const side = _s.crossVectors(P.n, P.fwd), spot = _t.copy(P.n).addScaledVector(side, 0.26 / R).addScaledVector(P.fwd, 0.05 / R).normalize()
      if (angTo(D.n, spot) * R > 0.08 && D.t < 6) { target = spot; spd = 1.2; arrive = 0.06 } else { face = TALK.open?.obj ? _gb.copy(TALK.open.obj.position).normalize() : P.n; g.sit = 1; g.headTilt = Math.sin(D.t * 0.9) > 0.6 ? 0.4 : 0; g.tailWag = 0.4; g.earBack = Math.sin(D.t * 0.9) > 0.6 ? -0.25 : 0 }
      if (!TALK.open && !D.forced) go('follow', 0) }
    else if (S === 'petted') { face = P.n; g.sit = 1; g.eyes = 0.15; g.headPitch = -0.4; g.headTilt = Math.sin(D.t * 2) * 0.35; g.tailWag = 1.5; g.tailSpeed = 20; g.tongue = 1; g.mouth = 0.6; g.earBack = 0.5; if (D.t > D.dur) go('sit', 999) }
    else if (S === 'sit' || S === 'lie') { face = P.n; g.sit = S === 'sit' ? 1 : 0; g.lie = S === 'lie' ? 1 : 0; g.headTilt = Math.sin(D.t * 0.8) > 0.9 ? 0.35 : 0; g.tailWag = 0.35 + 0.6 * D.mood; if (D.ex > 1.2) { g.pant = 1; g.tongue = 1; g.mouth = 0.7 } if (herMoving && dHer > 0.45 && !D.forced) go('follow', 0); if (D.t > 7 && S === 'sit' && !D.forced && D.ex < 1) go('lie', 999) ; D.idleT += dt }
    if (D.state === 'follow') { // ---------- the default: keep a loose distance, choose little side-quests ----------
      const side = _s.crossVectors(P.n, P.fwd); if (Math.random() < dt * 0.05) D.side *= -1
      const slot = _t.copy(P.n).addScaledVector(P.fwd, -0.36 / R).addScaledVector(side, D.side * 0.24 / R).normalize()
      const dSlot = angTo(D.n, slot) * R
      if (dSlot > 0.12 || herMoving) { target = slot; spd = dHer > 2.2 ? 2.7 : dHer > 1.0 ? 1.7 : herMoving ? 1.2 : 0.6; arrive = 0.09 }
      if (!herMoving && dHer < 0.8) { D.idleT += dt; if (D.idleT > 0.9) go('sit', 999) } else D.idleT = 0
      // side-quests
      const sheep = HOME.GAME?.sheep; if (sheep && D.barkCD < 0) for (const sh of sheep) if (angTo(D.n, sh.n) * R < 1.2) { D.barkCD = 18; D.sheep = sh; go('bark', 2.6); break }
      const lake = ZONES.lake, lc = _x.set(lake.x, lake.y, lake.z), toLake = angTo(D.n, lc)
      if (D.state === 'follow' && D.splashCD < 0 && toLake < lake.r * 1.6 && dHer < 1.5) { D.splashCD = 25; D.splashT = lakeEdge(lc); go('splash', 4.5) }
      if (D.state === 'follow' && D.splashCD < 0 && sGap < 0.35 && sGap > 0 && dHer < 1.2) { if (Math.random() < 0.5) { D.splashCD = 30; D.splashT = riverEdge(); go('splash', 3.5) } else D.splashCD = 12 }
      if (D.state === 'follow' && D.decT < 0) chooseQuest(herMoving)
    }
    if ((D.state === 'sit' || D.state === 'lie') && !D.forced && D.t > 2.5 && D.decT < 0) chooseQuest(false)
    if (TALK.open && D.state !== 'talkSit' && !FETCHING.has(D.state) && D.state !== 'wait' && D.state !== 'toDoor' && dHer < 3.5 && !D.forced) go('talkSit', 999)
    // weighted random side-quests with per-kind cooldowns, so it never settles into a loop
    function chooseQuest(moving) { D.decT = 1.1 + Math.random() * 0.8; if (Math.random() > (moving ? 0.16 : 0.24)) return
      const now = D.clock, cd = D.cd, W = moving ? { trail: 1.1, chase: 0.7, dawdle: 0.55, explore: 0.3, dig: 0.2, roll: 0 } : { dig: 0.9, trail: 0.7, roll: 0.55, chase: 0.6, explore: 0.5, dawdle: 0 }
      for (const k in W) if ((cd[k] ?? -1) > now) W[k] = 0; if (D.lastQ) W[D.lastQ] *= 0.3
      const k = pickW(W); if (!k) return; D.lastQ = k; cd[k] = now + ({ trail: 14, chase: 20, dawdle: 35, explore: 60, dig: 18, roll: 40 }[k]) * (0.7 + Math.random() * 0.6)
      if (k === 'trail') { D.seed = Math.random() * 6; go('trail', 3 + Math.random() * 3) } else if (k === 'chase') startChase(); else if (k === 'dawdle') go('dawdle', 7)
      else if (k === 'dig') go('dig', 2.4 + Math.random()); else if (k === 'roll') go('roll', 3.2)
      else if (k === 'explore') pickExplore() }
    function pickExplore() { const side = _s.crossVectors(P.n, P.fwd); for (let i = 0; i < 10; i++) { const a = Math.random() * 6.283, r = 1.4 + Math.random() * 1.1; const n = _t.copy(P.n).addScaledVector(P.fwd, Math.cos(a) * r / R).addScaledVector(side, Math.sin(a) * r / R).normalize(); if (!dogBlocked(n, -0.2) && sideOf(n) === sideOf(P.n) && !HOME.colliders.some(c => angTo(n, c.n) < c.r + 0.03)) { D.exT = n.clone(); D.sub = 0; go('explore', 14 + Math.random() * 6); return true } } return false }
    function lakeEdge(lc) { const n = _ga.copy(D.n); for (let i = 0; i < 60; i++) { if (height(n) < LAKE_W - 0.04) break; n.lerp(lc, 0.04).normalize() } D.splashC = lc.clone(); return n.clone() }
    function riverEdge() { const toward = -streamNear(D.n, _sn).side, n = D.n.clone(); let lat = Math.asin(n.y); const lon = Math.atan2(n.x, n.z)
      for (let i = 0; i < 60; i++) { const q = streamNear(n, _sn); if (q.d < q.half - 0.05) break; lat += toward * 0.02 / R; n.copy(dirLL(lat, lon)) } D.splashC = dirLL(lat + toward * 0.3 / R, lon); return n }
    function startChase() { const c = D.critter; c.on = true; c.kind = Math.random() < 0.55 ? 'fly' : 'bird'; c.t = 0; c.up = 0; c.n.copy(D.n).addScaledVector(D.f, 0.5 / R).addScaledVector(_s.crossVectors(D.n, D.f), (Math.random() - 0.5) * 0.6 / R).normalize(); tan(c.n, _a.randomDirection(), c.d); go('chase', 4.5) }
    if (FORCE === 'chase' && D.forced && !D.critter.on) startChase()
    // ---------- critter (butterfly / ground bird) ----------
    const c = D.critter
    if (c.on) { c.t += dt; const k = c.kind === 'fly'
      if (!k && c.up === 0 && angTo(D.n, c.n) * R < 0.45) c.up = 0.001
      if (k || c.up > 0) { c.d.applyAxisAngle(c.n, Math.sin(c.t * 2.3) * dt * 2); tan(c.n, c.d, c.d); c.n.addScaledVector(c.d, (k ? 1.9 : 2.6) / R * dt).normalize(); if (c.up > 0) c.up += dt } else if (c.t % 0.8 < dt) c.n.addScaledVector(c.d, 0.05 / R).normalize()
      if (c.t > 4.3 || c.up > 2.2) c.on = false
      const cr = crit.current; cr.visible = true; cr.position.copy(surf(c.n, _a)).addScaledVector(c.n, k ? 0.22 + Math.sin(c.t * 5) * 0.06 + c.t * 0.03 : c.up * c.up * 0.5 + c.up * 0.2); cr.quaternion.setFromRotationMatrix(_m.makeBasis(_x.crossVectors(c.n, c.d), c.n, c.d))
      const fl = Math.sin(c.t * (k ? 18 : c.up > 0 ? 26 : 0)) * 0.9; cr.children[0].visible = k; cr.children[1].visible = !k; const wg = cr.children[k ? 0 : 1]; wg.children[0].rotation.z = 0.25 + fl; wg.children[1].rotation.z = -0.25 - fl; if (!k && c.up === 0) wg.position.y = Math.abs(Math.sin(c.t * 6)) * 0.01 } else crit.current.visible = false
    // ---------- steering on the sphere (seek + collider avoidance) ----------
    // ---------- river crossings: if the goal is across the water, go by the nearest bridge or jump spot ----------
    if (target && !HOME.inside) { const ts = sideOf(target), ms = sideOf(D.n), rt = D.route
      if (rt && rt.phase === 1) { const dB = angTo(D.n, rt.B) * R; if (dB < 0.1 || (sideOf(D.n) === rt.to && !dogBlocked(D.n, -0.05) && dB < 0.35)) D.route = null; else { target = rt.B; spd = Math.max(spd, 1.1); arrive = 0.04 } }
      else if (ts !== ms && !dogBlocked(target, -0.3) && !onBridgeDeck(D.n, 0.05)) {
        if (!rt || rt.to !== ts || D.routeT < 0) { D.routeT = 1.5; let best = null, bc = 1e9; for (const gt of GATES) { const A = gateSide(gt, ms, 0.2, new THREE.Vector3()), B = gateSide(gt, ts, 0.2, new THREE.Vector3()); const c = angTo(D.n, A) + angTo(B, target) + (gt.kind === 'jump' ? 0.02 : 0); if (c < bc) { bc = c; best = { g: gt, A, B, to: ts, phase: 0 } } } D.route = best }
        const r2 = D.route; if (r2) { if (angTo(D.n, r2.A) * R < 0.1) { r2.phase = 1; r2.t0 = D.clock; r2.d0 = angTo(r2.A, r2.B) * R } else { target = r2.A; spd = Math.max(spd, 1.1); arrive = 0.04 } } }
      else if (rt && rt.phase === 0) D.route = null }
    const crossing = D.route && D.route.phase === 1, jumpX = crossing && D.route.g.kind === 'jump'
    let moveSpd = 0; const CL = nearColliders(D.n, dt)
    if (target) { const d = angTo(D.n, target) * R
      if (d > arrive) { const want = tan(D.n, _a.copy(target).sub(D.n), _a)
        for (const cl of CL) { const ca = angTo(D.n, cl.n); if (ca > cl.r + 0.09) continue
          const away = tan(D.n, _y.copy(D.n).sub(cl.n), _y), toward = -want.dot(away); if (toward <= 0 && ca > cl.r + 0.02) continue
          const w = 1.6 * (1 - Math.max(0, ca - cl.r) / 0.09); const lat = _x.copy(want).addScaledVector(away, toward); if (lat.lengthSq() < 1e-6) lat.crossVectors(D.n, away); lat.normalize(); want.addScaledVector(lat, w).addScaledVector(away, w * 0.5).normalize() }
        moveSpd = Math.min(spd, 0.6 + d * 2.5); const turn = Math.atan2(_x.crossVectors(D.f, want).dot(D.n), D.f.dot(want)), mr = (moveSpd > 2 ? 5 : 4) * dt
        D.f.applyAxisAngle(D.n, Math.max(-mr, Math.min(mr, turn))); if (Math.abs(turn) > 1.6) moveSpd *= 0.4 } }
    if (face) { const want = tan(D.n, _a.copy(face).sub(D.n), _a); const turn = Math.atan2(_x.crossVectors(D.f, want).dot(D.n), D.f.dot(want)); D.f.applyAxisAngle(D.n, turn * Math.min(1, dt * 3)); if (Math.abs(turn) > 0.6 && !g.sit && !g.lie) { moveSpd = 0.25; g.sit = 0 } }
    D.speed += (moveSpd - D.speed) * Math.min(1, dt * (moveSpd > D.speed ? 3 : 5))
    _prev.copy(D.n); D.n.addScaledVector(D.f, D.speed / R * dt).normalize()
    if (!crossing && !D.forced && dogBlocked(D.n) && !dogBlocked(_prev)) { // he wades the edge but won't swim: slide along the bank
      D.n.copy(_prev); _f0.copy(D.f); let ok = false; for (const a of [0.7, -0.7, 1.3, -1.3]) { _ga.copy(_f0).applyAxisAngle(_prev, a); _gb.copy(_prev).addScaledVector(_ga, D.speed * Math.cos(a) / R * dt).normalize(); if (!dogBlocked(_gb)) { D.n.copy(_gb); D.f.lerp(_ga, 0.3).normalize(); ok = true; break } } if (!ok) D.speed *= 0.5 }
    if (jumpX) { const r = D.route, k = Math.min(1, Math.max(0, 1 - angTo(D.n, r.B) * R / Math.max(0.1, r.d0))); g.hop = Math.sin(k * Math.PI) * 0.12 * (r.d0 > 0.3 ? 1 : 0.6); g.stretch = k > 0.2 && k < 0.8 ? 0.8 : 0; D.speed = Math.max(D.speed, 1.6) }
    for (const cl of CL) { const a = angTo(D.n, cl.n); if (a < cl.r) { const dd = tan(cl.n, D.n, _y); D.n.copy(cl.n).multiplyScalar(Math.cos(cl.r)).addScaledVector(dd, Math.sin(cl.r)).normalize() } }
    if (dHer < 0.18 && !HOME.inside && !crossing) D.n.addScaledVector(tan(D.n, _a.copy(D.n).sub(P.n), _a), 0.4 / R * dt).normalize()
    if (dHer > 7 && !HOME.inside && D.state !== 'wait') { D.n.copy(P.n).addScaledVector(P.fwd, -1.2 / R).normalize(); if (dogBlocked(D.n, -0.1) || sideOf(D.n) !== sideOf(P.n)) D.n.copy(P.n).addScaledVector(P.fwd, -0.3 / R).normalize(); D.route = null; tan(D.n, _a.copy(P.n).sub(D.n), D.f) } // lost? catch up off-screen
    tan(D.n, D.f, D.f)
    if (D.speed > 0.05 && Math.random() < dt * 0.3 && !wet) puff.current?.emit(1, 0.1, 0.12, [0, 0.005, -0.055])
    // ---------- gait + placement ----------
    st.speed = D.speed / DOG_CFG.s; st.run = D.speed > 1.9 ? 1 : 0; st.phase += dt * D.speed / (DOG_CFG.stride * DOG_CFG.s) * (st.run ? 1.1 : 1.5)
    root.current.position.copy(surf(D.n, _a)).addScaledVector(D.n, bridgeLift(D.n)); root.current.quaternion.setFromRotationMatrix(_m.makeBasis(_x.crossVectors(D.n, D.f), D.n, D.f))
  })
  return <>
    <group ref={root}>
      <group scale={DOG_CFG.s}><Quadruped cfg={DOG_CFG} st={st} /></group>
      {PetsDemo && <Suspense fallback={null}><PetsDemo /></Suspense>}
      <group ref={stickM} position={[0, 0.117, 0.142]} rotation={[0, Math.PI / 2, 0]} visible={false}><Stick /></group>
      <group position={[0.04, 0.23, 0.06]}><Bubble bref={bub} scale={0.68} /></group>
      <Puffs pref={puff} color="#b08a5e" n={14} /><Puffs pref={drops} color="#bfe8f5" n={16} />
      <Hearts gref={hearts} y={0.17} size={0.09} />
    </group>
    <group ref={stickW} visible={false}><Stick /></group>
    <group ref={crit} visible={false} scale={1.15}>
      <group>{[1, -1].map(s => <group key={s}><mesh position={[s * 0.022, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} material={WING}><circleGeometry args={[0.024, 10]} /></mesh></group>)}</group>
      <group><mesh geometry={GEO.sph} material={cel('#8a6a5a')} scale={[0.018, 0.016, 0.026]} position={[0, 0.02, 0]} /><mesh geometry={GEO.sph} material={OUT.pet} scale={[0.018, 0.016, 0.026]} position={[0, 0.02, 0]} />{[1, -1].map(s => <group key={s} position={[0, 0.025, 0]}><mesh position={[s * 0.02, 0, 0]} material={cel('#6a4a3a')} scale={[0.03, 0.004, 0.018]} geometry={GEO.sph} /></group>)}</group>
    </group>
    <DugItems />
  </>
}
const WING = new THREE.MeshToonMaterial({ color: '#ffd36e', side: THREE.DoubleSide })
function Stick() { return <group><mesh geometry={GEO.cyl} material={cel('#a8744c')} scale={[0.009, 0.2, 0.009]} rotation={[0, 0, Math.PI / 2]} /><mesh geometry={GEO.cyl} material={OUT.pet} scale={[0.009, 0.2, 0.009]} rotation={[0, 0, Math.PI / 2]} /><mesh geometry={GEO.cyl} material={cel('#8a5a3c')} scale={[0.006, 0.05, 0.006]} position={[0.04, 0.015, 0]} rotation={[0, 0, 0.6]} /></group> }
const DUGC = { acorn: '#c98a4a', stone: '#b8b0a4', coin: '#e8b84a', shell: '#f6c8b0', pinecone: '#a8744c', clay: '#b8aca0', shard: '#e8dcc8' }
function DugItems() {
  const refs = useRef([]), _p = useMemo(() => new THREE.Vector3(), [])
  useFrame(() => { for (let i = 0; i < 3; i++) { const g = refs.current[i], it = DOG.dug[i]; if (!g) continue; g.visible = !!it && !it.taken; if (!g.visible) continue
    g.position.copy(surf(it.n, _p)); g.quaternion.setFromUnitVectors(_y.set(0, 1, 0), it.n); const item = g.children[1]; item.position.y = 0.04 + Math.sin(performance.now() / 300) * 0.01; item.rotation.y = performance.now() / 700; item.children[0].material = cel(DUGC[it.item] || '#e8b84a') } })
  return [0, 1, 2].map(i => <group key={i} ref={el => refs.current[i] = el} visible={false}>
    <mesh geometry={GEO.half} material={cel('#8a6248')} scale={[0.07, 0.025, 0.06]} />
    <group><mesh geometry={GEO.sph} scale={[0.024, 0.02, 0.024]} /><mesh geometry={GEO.sph} material={OUT.pet} scale={[0.024, 0.02, 0.024]} /></group>
    <mesh geometry={GEO.tor} material={SPARK} rotation={[-Math.PI / 2, 0, 0]} scale={[0.06, 0.06, 0.01]} position={[0, 0.01, 0]} />
  </group>)
}
const SPARK = new THREE.MeshBasicMaterial({ color: '#fffbe8', transparent: true, opacity: 0.8, depthWrite: false })
