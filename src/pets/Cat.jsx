// Mochi, the house cat. Lives indoors only. A small state machine picks cat things to do (nap in the sunbeam or on
// the bed, groom, stretch + yawn, chase the yarn ball, sit on the windowsill, knead the quilt, wander), comes over
// to rub against her ankles when she's near, purrs with hearts when petted (E), and sometimes just ignores her.
import * as THREE from 'three'
import React, { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Quadruped, newPet, POSE0 } from './Quadruped.jsx'
import { HOME, freeAt, resolve } from '../home/state.js'
import { GEO, cel, OUT, canvasTex } from '../home/kit.jsx'
import { T, q } from '../common.jsx'
import { toast } from '../game/store.js'
import { Hearts, burst } from './fx.jsx'

export const CAT_CFG = { s: 1, body: [0.05, 0.045, 0.085], legH: 0.055, legR: 0.014, stride: 0.06, head: 0.052, headY: 0.06, snout: 0.02, eye: 0.17, ear: 0.62, earSplay: 0.28, whiskers: true, socks: true, stripes: true,
  tail: { n: 6, seg: 0.024, r: 0.012, curl: 0.15, tip: 1 }, col: { main: '#f2a65a', belly: '#fff4e6', dark: '#d9843f', inner: '#f4a3a0', nose: '#e8857e', eye: '#2e2420', shine: '#ffffff' } }
const SPOT = { beam: { x: -0.62, z: 0.25, y: 0 }, bed: { x: -0.92, z: -0.5, y: 0.29, from: { x: -0.5, z: -0.48 } }, sill: { x: -1.2, z: 0.15, y: 0.44, from: { x: -0.98, z: 0.15 } }, bedK: { x: -1.0, z: -0.3, y: 0.29, from: { x: -0.5, z: -0.3 } } }
const pick = (w) => { let s = 0; for (const k in w) s += w[k]; let r = Math.random() * s; for (const k in w) { r -= w[k]; if (r <= 0) return k } return Object.keys(w)[0] }
const ang = (a) => Math.atan2(Math.sin(a), Math.cos(a))
export const CAT = { x: -0.3, z: 0.55, y: 0, yaw: 2.4, state: 'wander', t: 0, dur: 3, mood: 0.7, target: null, hop: null, ball: { x: 0.0, z: 0.7, vx: 0, vz: 0, spin: 0 }, ignoreCD: 0, approachCD: 6, name: 'Mochi' }
if (typeof window !== 'undefined') window.__cat = CAT
const FORCE = q.get('cat')

export function Cat() {
  const st = useMemo(() => newPet(), []), root = useRef(), ball = useRef(), hearts = useRef()
  const c = CAT
  const go = (state, dur, extra = {}) => { c.state = state; c.t = 0; c.dur = dur; c.target = null; Object.assign(c, { sub: 0 }, extra) }
  if (!c.init) { c.init = true
    if (FORCE) { const s = FORCE; if (s === 'nap') Object.assign(c, { x: SPOT.beam.x, z: SPOT.beam.z, y: 0 }); if (s === 'bed' || s === 'knead') Object.assign(c, { x: SPOT.bed.x, z: SPOT.bed.z, y: 0.29 }); if (s === 'sill') Object.assign(c, { x: SPOT.sill.x, z: SPOT.sill.z, y: SPOT.sill.y, yaw: -Math.PI / 2 })
      if (s === 'rub' || s === 'pet' || s === 'ignore') Object.assign(HOME.hp, { x: -0.3, z: 0.05, yaw: -1.9 }), Object.assign(c, { x: -0.58, z: -0.02, yaw: 1.3 }); if (s === 'chase') Object.assign(c, { x: -0.2, z: 0.6 })
      go(s === 'bed' ? 'nap' : s === 'pet' ? 'petted' : s, 999, { where: s === 'bed' ? 'bed' : 'beam', forced: true }); if (s === 'pet') c.dur = 999 }
  }
  // petting / proximity
  useMemo(() => { HOME.near.push((consider) => {
    if (!HOME.inside || HOME.busy || c.hop) return
    const d = Math.hypot(HOME.hp.x - c.x, HOME.hp.z - c.z) + Math.max(0, c.y - 0.3)
    consider({ kind: 'ext', inside: true, id: 'cat', icon: 'hand', verb: 'Pet', name: c.name, act: () => petCat() }, d, 0.42)
  }) }, [])
  function petCat() {
    if (c.state === 'nap') { go('stretch', 2.6, { after: Math.random() < 0.6 ? 'petted' : 'ignore' }); toast(`${c.name} opens one eye… then stretches.`, 'leaf'); return }
    if (c.state === 'ignore' || c.ignoreCD > 0 || Math.random() < 0.22) { go('ignore', 3.5); c.ignoreCD = 4; toast(`${c.name} flicks his tail and looks the other way.`, 'leaf'); return }
    go('petted', 3.8); c.mood = Math.min(1, c.mood + 0.25); burst(hearts.current, 6); toast(`${c.name} purrs happily ♥`, 'hand')
  }
  useFrame((_, dt) => {
    st.frozen = !HOME.inside; if (st.frozen) return // he lives indoors: nothing to simulate while she's out
    dt = Math.min(dt, 0.05); c.t += dt; c.ignoreCD -= dt; c.approachCD -= dt
    const g = st.goal, hp = HOME.hp, dHer = Math.hypot(hp.x - c.x, hp.z - c.z), onFloor = c.y < 0.01
    Object.assign(g, POSE0); g.tailUp = 0.45; g.tailWag = 0.12; g.tailSpeed = 2.2
    let move = 0, speed = 0.18, face = null
    // ---------- hop arc onto / off furniture ----------
    if (c.hop) { const h = c.hop; h.t += dt / h.dur; const k = Math.min(1, h.t); c.x = h.a.x + (h.b.x - h.a.x) * k; c.z = h.a.z + (h.b.z - h.a.z) * k; c.y = h.a.y + (h.b.y - h.a.y) * k + Math.sin(k * Math.PI) * (0.12 + Math.abs(h.b.y - h.a.y) * 0.4)
      c.yaw += ang(Math.atan2(h.b.x - h.a.x, h.b.z - h.a.z) - c.yaw) * Math.min(1, dt * 12); g.crouch = k < 0.15 ? 1 : 0; g.stretch = k > 0.15 && k < 0.7 ? 0.6 : 0; g.tailUp = 0.9
      if (k >= 1) c.hop = null; st.speed = 0; apply(); return }
    const hopTo = (b) => { c.hop = { a: { x: c.x, y: c.y, z: c.z }, b, t: 0, dur: 0.45 } }
    // go somewhere on the floor (steering around furniture); returns true on arrival
    const walkTo = (tx, tz, r = 0.05, fast) => { const dx = tx - c.x, dz = tz - c.z, d = Math.hypot(dx, dz); if (d < r) return true
      let want = Math.atan2(dx, dz); for (const o of [0, 0.6, -0.6, 1.2, -1.2, 1.8, -1.8]) { const a = want + o; if (freeAt(c.x + Math.sin(a) * 0.08, c.z + Math.cos(a) * 0.08, 0.05)) { want = a; break } }
      c.yaw += ang(want - c.yaw) * Math.min(1, dt * 7); move = 1; speed = fast ? 0.55 : 0.2; return false }
    // reach a spot that may be up on furniture
    const reach = (s) => { if (Math.abs(c.y - s.y) < 0.02) return Math.hypot(s.x - c.x, s.z - c.z) < 0.08 || walkTo(s.x, s.z, 0.06)
      if (c.y > 0.01 && s.y < 0.01) { hopTo({ x: c.x + (c.x < -0.9 ? 0.3 : 0.25), y: 0, z: c.z }); return false }
      const f = s.from; if (walkTo(f.x, f.z, 0.06)) hopTo({ x: s.x, y: s.y, z: s.z }); return false }
    // ---------- brain ----------
    const S = c.state
    if (S === 'wander') { if (!c.target) { for (let i = 0; i < 20; i++) { const x = -1.1 + Math.random() * 2.1, z = -0.7 + Math.random() * 1.6; if (freeAt(x, z, 0.08)) { c.target = { x, z }; break } } }
      if (!onFloor) reach({ x: c.x, z: c.z, y: 0 }); else if (c.target && walkTo(c.target.x, c.target.z, 0.06)) c.target = null
      if (c.t > c.dur) next() }
    else if (S === 'nap') { const s = c.where === 'bed' ? SPOT.bed : SPOT.beam; if (c.forced) Object.assign(c, { x: s.x, z: s.z, y: s.y })
      if (c.forced || reach(s)) { g.curl = 1; g.eyes = 0; g.tailWag = 0.03; g.earBack = 0.1; face = c.where === 'bed' ? 0.8 : 2.2 }
      if (c.t > c.dur) go('stretch', 2.6) }
    else if (S === 'stretch') { const k = c.t / c.dur; g.stretch = k < 0.55 ? 1 : 0; g.mouth = k > 0.35 && k < 0.7 ? 1 : 0; g.eyes = g.mouth ? 0.15 : 1; g.earBack = g.mouth * 0.5; g.tailUp = 0.9; g.headPitch = g.mouth ? -0.45 : 0
      if (c.t > c.dur) { if (c.after) { const a = c.after; c.after = null; if (a === 'petted') { go('petted', 3.5); burst(hearts.current, 6) } else go(a, 3) } else next() } }
    else if (S === 'groom') { if (!onFloor && c.y < 0.2) reach({ x: c.x, z: c.z, y: 0 }); g.sit = 1; const lick = Math.sin(c.t * 7) > 0; g.pawL = 0.85; g.headPitch = 0.35 + (lick ? 0.12 : 0); g.headYaw = -0.25; g.headTilt = 0.35; g.eyes = 0.35; g.mouth = lick ? 0.15 : 0; if (c.t > c.dur) next() }
    else if (S === 'sill') { if (c.forced || reach(SPOT.sill)) { g.sit = 1; face = -Math.PI / 2; g.headYaw = Math.sin(c.t * 0.4) * 0.5; g.tailUp = -0.4; g.tailWag = 0.35; g.tailSpeed = 1.6; g.earBack = 0; if (Math.sin(c.t * 0.9) > 0.92) g.headTilt = 0.3 } if (c.t > c.dur) next() }
    else if (S === 'knead') { if (c.forced || reach(SPOT.bedK)) { if (c.forced) Object.assign(c, { x: SPOT.bedK.x, z: SPOT.bedK.z, y: SPOT.bedK.y }); g.lie = 0.35; const a = Math.sin(c.t * 6); g.pawL = Math.max(0, a) * 0.45; g.pawR = Math.max(0, -a) * 0.45; g.eyes = 0.2; g.purr = 1; g.tailUp = 0.3; face = 1.2 } if (c.t > c.dur) go('nap', 10 + Math.random() * 8, { where: 'bed' }) }
    else if (S === 'chase') { const b = c.ball; if (!onFloor) reach({ x: c.x, z: c.z, y: 0 }); else {
        const dx = b.x - c.x, dz = b.z - c.z, d = Math.hypot(dx, dz)
        if (c.sub === 0) { if (d > 0.22) walkTo(b.x, b.z, 0.2); else { c.sub = 1; c.subT = 0 } } // stalk
        else if (c.sub === 1) { c.subT += dt; c.yaw += ang(Math.atan2(dx, dz) - c.yaw) * Math.min(1, dt * 8); g.crouch = 1; g.earBack = 0.3; g.tailWag = 0.6; g.tailSpeed = 9; g.tailUp = -0.2; if (c.subT > 1.1) { c.sub = 2; c.subT = 0; c.pa = { x: c.x, z: c.z } } } // butt wiggle
        else { c.subT += dt; const k = Math.min(1, c.subT / 0.32); c.x = c.pa.x + (b.x - c.pa.x) * k * 0.92; c.z = c.pa.z + (b.z - c.pa.z) * k * 0.92; g.hop = Math.sin(k * Math.PI) * 0.09; g.stretch = 0.8; g.pawL = g.pawR = 0.5
          if (k >= 1) { const a = Math.random() * 6.28; b.vx = Math.sin(a) * 0.9; b.vz = Math.cos(a) * 0.9; c.sub = 0; c.hits = (c.hits || 0) + 1; if (c.hits > 3 && !c.forced) { c.hits = 0; go('groom', 4) } } } }
      if (c.t > c.dur && !c.forced) next() }
    else if (S === 'approach') { if (!onFloor) reach({ x: c.x, z: c.z, y: 0 }); else if (walkTo(hp.x, hp.z, 0.16)) go('rub', 4.5, { ra: Math.atan2(c.x - hp.x, c.z - hp.z) }); g.tailUp = 1; g.tailWag = 0.15; if (c.t > 8) next() }
    else if (S === 'rub') { // weave around her ankles, leaning in
      c.ra += dt * 1.3; const tx = hp.x + Math.sin(c.ra) * 0.14, tz = hp.z + Math.cos(c.ra) * 0.14; const dx = tx - c.x, dz = tz - c.z
      c.x += dx * Math.min(1, dt * 5); c.z += dz * Math.min(1, dt * 5); c.yaw += ang(c.ra + Math.PI / 2 - c.yaw) * Math.min(1, dt * 6); move = 0.6; speed = 0.17
      g.tailUp = 1.1; g.tailWag = 0.1; g.headTilt = -0.45; g.headYaw = -0.5; g.eyes = 0.3; g.purr = 1; g.bodyYaw = -0.15
      if (c.t > c.dur && !c.forced) go('sitnear', 4) }
    else if (S === 'sitnear') { g.sit = 1; face = Math.atan2(hp.x - c.x, hp.z - c.z); g.headPitch = -0.3; g.tailWag = 0.25; if (c.t > c.dur) next() }
    else if (S === 'petted') { if (onFloor && dHer > 0.24 && !c.forced) walkTo(hp.x, hp.z, 0.2); g.sit = c.y > 0.1 ? 0 : 1; g.lie = c.y > 0.1 ? 1 : 0; face = Math.atan2(hp.x - c.x, hp.z - c.z); g.eyes = 0.05; g.headPitch = -0.35; g.headTilt = 0.4 * Math.sin(c.t * 1.5); g.tailUp = 1.1; g.tailWag = 0.08; g.purr = 1; g.earBack = -0.1
      if (c.forced && c.t % 1.2 < dt) burst(hearts.current, 3); if (c.t > c.dur) go('sitnear', 3) }
    else if (S === 'ignore') { g.sit = 1; face = Math.atan2(c.x - hp.x, c.z - hp.z); g.tailWag = 0.7; g.tailSpeed = 7; g.tailUp = -0.1; g.earBack = 0.6; g.eyes = 0.5; if (c.t > c.dur && !c.forced) next() }
    // she's close: sometimes come and say hello
    if ((S === 'wander' || S === 'groom' || S === 'sitnear') && dHer < 0.9 && c.approachCD < 0 && !c.forced) { c.approachCD = 9 + Math.random() * 8; if (Math.random() < 0.5 * (0.5 + c.mood)) go('approach', 8); else if (Math.random() < 0.3) go('ignore', 3) }
    function next() { const day = T.day > 0.5
      const k = pick({ nap: day ? 1.4 : 0.6, napBed: 1.6, groom: 1.6, stretch: 0.8, chase: 1.6, sill: day ? 1.6 : 0.8, knead: 0.9, wander: 2 })
      if (k === 'nap') go('nap', 12 + Math.random() * 10, { where: 'beam' }); else if (k === 'napBed') go('nap', 12 + Math.random() * 10, { where: 'bed' }); else if (k === 'groom') go('groom', 4 + Math.random() * 3); else if (k === 'stretch') go('stretch', 2.6); else if (k === 'chase') go('chase', 12); else if (k === 'sill') go('sill', 10 + Math.random() * 8); else if (k === 'knead') go('knead', 4); else go('wander', 3 + Math.random() * 3) }
    if (face != null) c.yaw += ang(face - c.yaw) * Math.min(1, dt * 4)
    if (move) { const s = speed * move; c.x += Math.sin(c.yaw) * s * dt; c.z += Math.cos(c.yaw) * s * dt; if (onFloor) resolve(c, 0.05) }
    st.speed += (move * speed - st.speed) * Math.min(1, dt * 8); st.run = speed > 0.4 ? 1 : 0; st.phase += dt * st.speed / CAT_CFG.stride * 1.6
    apply()
  })
  function apply() {
    root.current.position.set(c.x, c.y, c.z); root.current.rotation.set(0, c.yaw, 0)
    // yarn ball rolls with friction and bounces off walls / furniture
    const b = c.ball, dt = 1 / 60; const nx = b.x + b.vx * dt, nz = b.z + b.vz * dt
    if (freeAt(nx, nz, 0.03)) { b.x = nx; b.z = nz } else { if (!freeAt(nx, b.z, 0.03)) b.vx *= -0.6; if (!freeAt(b.x, nz, 0.03)) b.vz *= -0.6 }
    b.vx *= 0.985; b.vz *= 0.985; const sp = Math.hypot(b.vx, b.vz); b.spin += sp * dt / 0.03
    ball.current.position.set(b.x, 0.03, b.z); ball.current.rotation.set(b.spin, Math.atan2(b.vx, b.vz), 0)
  }
  return <>
    <group ref={root}><group scale={1.0}><Quadruped cfg={CAT_CFG} st={st} /></group><Hearts gref={hearts} y={0.2} /></group>
    <group ref={ball}><mesh geometry={GEO.sph} material={cel('#c97b9a')} scale={0.03} /><mesh geometry={GEO.sph} material={OUT.pet} scale={0.03} />{[0, 1, 2].map(i => <mesh key={i} geometry={GEO.tor} material={cel('#e8a0bb')} scale={[0.029, 0.029, 0.02]} rotation={[i * 1.1, i * 0.7, 0]} />)}</group>
  </>
}
