// Mochi, the house cat. Lives indoors only. A small state machine picks cat things to do (nap in the sunbeam or on
// the bed, groom, stretch + yawn, chase the yarn ball, sit on the windowsill, knead the quilt, wander), comes over
// to rub against her ankles when she's near, purrs with hearts when petted (E), and sometimes just ignores her.
import * as THREE from 'three'
import { startAct } from '../act.js'
import React, { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Quadruped, newPet, POSE0 } from './Quadruped.jsx'
import { HOME, freeAt, resolve } from '../home/state.js'
import { GEO, cel, OUT, canvasTex } from '../home/kit.jsx'
import { T, q } from '../common.jsx'
import { toast } from '../game/store.js'
import { Hearts, burst } from './fx.jsx'

export const CAT_CFG = { s: 1.05, species: 'cat', body: [0.05, 0.052, 0.08], legH: 0.046, legR: 0.012, stride: 0.05, head: 0.056, headY: 0.045, snout: 0.008, eye: 0.235, ear: 0.72, earSplay: 0.3, whiskers: true, stripes: true, tufts: true, pupils: 'vert',
  tail: { n: 10, seg: 0.03, r: 0.0105, curl: 0.08, tip: 2, taper: 0.03 }, col: { main: '#f2a65e', belly: '#fff7ec', dark: '#c8682a', tip: '#c8682a', inner: '#f4a3a0', nose: '#e8857e', lip: '#6a3a30', iris: '#e8b23a', pupil: '#0e0a08', lid: '#3a2a22', shine: '#ffffff', whisker: '#6a4a3e' } }
// nap spots (room-local; y = surface height). from: floor point to hop up from. claim: she can be 'beaten' to it
const SPOT = { beam: { x: -0.62, z: 0.25, y: 0, face: 2.2 }, bed: { x: -0.92, z: -0.5, y: 0.29, from: { x: -0.5, z: -0.48 }, face: 0.8, claim: 'the bed' }, sill: { x: -1.2, z: 0.15, y: 0.44, from: { x: -0.98, z: 0.15 } }, bedK: { x: -1.0, z: -0.3, y: 0.29, from: { x: -0.5, z: -0.3 } },
  rug: { x: 0.12, z: 0.5, y: 0.006, face: 1.4, claim: 'the rug' }, chair: { x: -0.14, z: 0.26, y: 0.225, from: { x: -0.34, z: 0.34 }, face: 2.6, claim: 'the stool' }, shelf: { x: -0.12, z: -0.9, y: 0.865, from: { x: -0.12, z: -0.66 }, face: 0, claim: null }, sillNap: { x: -1.2, z: 0.05, y: 0.44, from: { x: -0.98, z: 0.05 }, face: 0.2 } }
export const CAT_SCALE = 0.7 // round6: Mochi ~30% smaller so she reads as a pet next to her
const pick = (w) => { let s = 0; for (const k in w) s += w[k]; let r = Math.random() * s; for (const k in w) { r -= w[k]; if (r <= 0) return k } return Object.keys(w)[0] }
const ang = (a) => Math.atan2(Math.sin(a), Math.cos(a))
import { CAT } from './catState.js'
export { CAT }
const FORCE = q.get('cat')

export function Cat() {
  const st = useMemo(() => newPet(), []), root = useRef(), ball = useRef(), hearts = useRef()
  const c = CAT
  const go = (state, dur, extra = {}) => { c.state = state; c.t = 0; c.dur = dur; c.target = null; Object.assign(c, { sub: 0 }, extra) }
  if (!c.init) { c.init = true
    if (FORCE) { const s = FORCE; if (s === 'nap') Object.assign(c, { x: SPOT.beam.x, z: SPOT.beam.z, y: 0 }); if (s === 'bed' || s === 'knead') Object.assign(c, { x: SPOT.bed.x, z: SPOT.bed.z, y: 0.29 }); if (s === 'sill') Object.assign(c, { x: SPOT.sill.x, z: SPOT.sill.z, y: SPOT.sill.y, yaw: -Math.PI / 2 })
      if (s === 'rub' || s === 'pet' || s === 'ignore') Object.assign(HOME.hp, { x: -0.3, z: 0.05, yaw: -1.9 }), Object.assign(c, { x: -0.58, z: -0.02, yaw: 1.3 }); if (s === 'chase' || s === 'bat') Object.assign(c, { x: -0.2, z: 0.6 }); const NF = ['bed', 'rug', 'chair', 'shelf', 'sillNap']; if (NF.includes(s)) Object.assign(c, { x: SPOT[s].x, z: SPOT[s].z, y: SPOT[s].y, onFrom: SPOT[s].from }); if (q.get('petcam')) Object.assign(HOME.hp, { x: 0.6, z: 0.8, yaw: -2.2 })
      go(NF.includes(s) ? 'nap' : s === 'pet' ? 'petted' : s, 999, { where: NF.includes(s) ? s : 'beam', forced: true }); if (s === 'pet') c.dur = 999 }
  }
  // petting / proximity
  useMemo(() => { HOME.near.push((consider) => {
    if (!HOME.inside || HOME.busy || c.hop) return
    const d = Math.hypot(HOME.hp.x - c.x, HOME.hp.z - c.z) + Math.max(0, c.y - 0.3)
    consider({ kind: 'ext', inside: true, id: 'cat', icon: 'hand', verb: 'Pet', name: c.name, chip: true, act: () => petCat() }, d, 0.38)
  }) }, [])
  function petCat() { startAct('pet', { dur: 1.2 })
    if (c.state === 'nap') { go('stretch', 2.6, { after: Math.random() < 0.6 ? 'petted' : 'ignore' }); toast(`${c.name} opens one eye… then stretches.`, 'leaf'); return }
    if (c.state === 'ignore' || c.ignoreCD > 0 || Math.random() < 0.22) { go('ignore', 3.5); c.ignoreCD = 4; toast(`${c.name} flicks his tail and looks the other way.`, 'leaf'); return }
    go('petted', 3.8); c.mood = Math.min(1, c.mood + 0.25); burst(hearts.current, 6); toast(`${c.name} purrs happily ♥`, 'hand')
  }
  useFrame((_, dt) => {
    st.frozen = !HOME.inside; if (st.frozen) return // he lives indoors: nothing to simulate while she's out
    if (c.photo) { c.photo(st, null); return } // Stage C photo mode: brain frozen, pose held
    dt = Math.min(dt, 0.05); c.t += dt; c.clock = (c.clock || 0) + dt; c.ignoreCD -= dt; c.approachCD -= dt
    const g = st.goal, hp = HOME.hp, dHer = Math.hypot(hp.x - c.x, hp.z - c.z), onFloor = c.y < 0.01
    Object.assign(g, POSE0); g.tailUp = 0.45; g.tailWag = 0.12; g.tailSpeed = 2.2
    let move = 0, speed = 0.18, face = null
    // ---------- hop arc onto / off furniture ----------
    if (c.hop) { const h = c.hop; h.t += dt / h.dur; const k = Math.min(1, h.t); c.x = h.a.x + (h.b.x - h.a.x) * k; c.z = h.a.z + (h.b.z - h.a.z) * k; c.y = h.a.y + (h.b.y - h.a.y) * k + Math.sin(k * Math.PI) * (0.12 + Math.abs(h.b.y - h.a.y) * 0.4)
      c.yaw += ang(Math.atan2(h.b.x - h.a.x, h.b.z - h.a.z) - c.yaw) * Math.min(1, dt * 12); g.crouch = k < 0.15 ? 1 : 0; g.stretch = k > 0.15 && k < 0.7 ? 0.6 : 0; g.tailUp = 0.9
      if (k >= 1) c.hop = null; st.speed = 0; apply(); return }
    const hopTo = (b) => { c.hop = { a: { x: c.x, y: c.y, z: c.z }, b, t: 0, dur: 0.45 + Math.abs(b.y - c.y) * 0.35 } }
    // go somewhere on the floor (steering around furniture); returns true on arrival
    const walkTo = (tx, tz, r = 0.05, fast) => { const dx = tx - c.x, dz = tz - c.z, d = Math.hypot(dx, dz); if (d < r) return true
      let want = Math.atan2(dx, dz); for (const o of [0, 0.6, -0.6, 1.2, -1.2, 1.8, -1.8]) { const a = want + o; if (freeAt(c.x + Math.sin(a) * 0.07, c.z + Math.cos(a) * 0.07, 0.04)) { want = a; break } }
      c.yaw += ang(want - c.yaw) * Math.min(1, dt * 7); move = 1; speed = fast ? 0.55 : 0.2; return false }
    // reach a spot that may be up on furniture
    const reach = (s, fast) => { if (Math.abs(c.y - s.y) < 0.02) return Math.hypot(s.x - c.x, s.z - c.z) < 0.08 || walkTo(s.x, s.z, 0.06, fast)
      if (c.y > 0.01 && (s.y < 0.01 || Math.hypot(s.x - c.x, s.z - c.z) > 0.15)) { const f = c.onFrom || { x: c.x + (c.x < -0.9 ? 0.3 : 0.25), z: c.z }; c.onFrom = null; hopTo({ x: f.x, y: 0, z: f.z }); return false }
      if (!s.from) { walkTo(s.x, s.z, 0.06, fast); return false } const f = s.from; if (walkTo(f.x, f.z, 0.06, fast)) c.onFrom = f, hopTo({ x: s.x, y: s.y, z: s.z }); return false }
    // ---------- brain ----------
    // round7: she filled his bowl: he heads over and eats (unless forced / mid-cuddle)
    if (CAT.bowl > 0 && c.state !== 'eat' && !c.forced && c.state !== 'petted' && c.state !== 'stretch') go('eat', 30)
    const S = c.state
    if (S === 'eat') { const b = CAT.bowlPos || { x: 0.9, z: 0.1 } // round7: eat from his bowl
      if (!onFloor) reach({ x: c.x, z: c.z, y: 0 }, true); else if (walkTo(b.x - 0.12, b.z, 0.03, c.t < 1.5)) { face = Math.atan2(b.x - c.x, b.z - c.z); const chew = Math.sin(c.t * 10); g.crouch = 0.55; g.headPitch = 0.75 + chew * 0.06; g.mouth = Math.max(0, chew) * 0.3; g.eyes = 0.45; g.tailUp = 0.7; g.tailWag = 0.25; g.earBack = -0.1
        c.ate = (c.ate || 0) + dt; if (c.ate > 5.5) { c.ate = 0; CAT.bowl = 0; toast(`${c.name} licks the bowl clean and washes his face.`, 'fish', 2600); go('groom', 4) } } else { g.tailUp = 1.1 }
      if (c.t > c.dur) { CAT.bowl = 0; next() } }
    else if (S === 'wander') { if (!c.target) { for (let i = 0; i < 20; i++) { const x = -1.1 + Math.random() * 2.1, z = -0.7 + Math.random() * 1.6; if (freeAt(x, z, 0.08)) { c.target = { x, z }; break } } }
      if (!onFloor) reach({ x: c.x, z: c.z, y: 0 }); else if (c.target && walkTo(c.target.x, c.target.z, 0.06)) c.target = null
      if (c.t > c.dur) next() }
    else if (S === 'nap' || S === 'claim') { const s = SPOT[c.where] || SPOT.beam; if (c.forced) Object.assign(c, { x: s.x, z: s.z, y: s.y })
      if (S === 'claim' && Math.abs(c.y - s.y) < 0.02 && Math.hypot(s.x - c.x, s.z - c.z) < 0.08 && !c.claimed) { c.claimed = true; if (s.claim) toast(`${c.name} gets to ${s.claim} first and curls up. It's his now.`, 'leaf', 3200) }
      if (c.forced || reach(s, S === 'claim')) { g.curl = 1; g.eyes = S === 'claim' && c.t < 4 ? 0.35 : 0; g.tailWag = 0.03; g.earBack = 0.1; face = s.face ?? 2.2; if (S === 'claim' && c.t < 4) g.headPitch = -0.2 }
      if (c.t > c.dur) go('stretch', 2.6) }
    else if (S === 'stretch') { const k = c.t / c.dur; g.stretch = k < 0.55 ? 1 : 0; g.mouth = k > 0.35 && k < 0.7 ? 1 : 0; g.eyes = g.mouth ? 0.15 : 1; g.earBack = g.mouth * 0.5; g.tailUp = 0.9; g.headPitch = g.mouth ? -0.45 : 0
      if (c.t > c.dur) { if (c.after) { const a = c.after; c.after = null; if (a === 'petted') { go('petted', 3.5); burst(hearts.current, 6) } else go(a, 3) } else next() } }
    else if (S === 'groom') { if (!onFloor && c.y < 0.2) reach({ x: c.x, z: c.z, y: 0 }); g.sit = 1; const lick = Math.sin(c.t * 7) > 0; g.pawL = 0.85; g.headPitch = 0.35 + (lick ? 0.12 : 0); g.headYaw = -0.25; g.headTilt = 0.35; g.eyes = 0.35; g.mouth = lick ? 0.15 : 0; if (c.t > c.dur) next() }
    else if (S === 'sill') { if (c.forced || reach(SPOT.sill)) { g.sit = 1; face = -Math.PI / 2; const bird = Math.sin(c.t * 0.23 + 1) > 0.55; g.headYaw = bird ? Math.sin(c.t * 2.1) * 0.35 : Math.sin(c.t * 0.4) * 0.5; g.headPitch = bird ? -0.25 : 0; g.tailUp = -0.4; g.tailWag = bird ? 0.8 : 0.35; g.tailSpeed = bird ? 9 : 1.6; g.earBack = bird ? -0.3 : 0; g.mouth = bird && Math.sin(c.t * 22) > 0.3 ? 0.35 : 0 /* chattering at a bird */; if (Math.sin(c.t * 0.9) > 0.92) g.headTilt = 0.3 } if (c.t > c.dur) next() }
    else if (S === 'knead') { if (c.forced || reach(SPOT.bedK)) { if (c.forced) Object.assign(c, { x: SPOT.bedK.x, z: SPOT.bedK.z, y: SPOT.bedK.y }); g.lie = 0.35; const a = Math.sin(c.t * 6); g.pawL = Math.max(0, a) * 0.45; g.pawR = Math.max(0, -a) * 0.45; g.eyes = 0.2; g.purr = 1; g.tailUp = 0.3; face = 1.2 } if (c.t > c.dur) go('nap', 10 + Math.random() * 8, { where: 'bed' }) }
    else if (S === 'chase') { const b = c.ball; if (!onFloor) reach({ x: c.x, z: c.z, y: 0 }); else {
        const dx = b.x - c.x, dz = b.z - c.z, d = Math.hypot(dx, dz)
        if (c.sub === 0) { if (d > 0.22) walkTo(b.x, b.z, 0.2); else { c.sub = 1; c.subT = 0 } } // stalk
        else if (c.sub === 1) { c.subT += dt; c.yaw += ang(Math.atan2(dx, dz) - c.yaw) * Math.min(1, dt * 8); g.crouch = 1; g.earBack = 0.3; g.tailWag = 0.6; g.tailSpeed = 9; g.tailUp = -0.2; if (c.subT > 1.1) { c.sub = 2; c.subT = 0; c.pa = { x: c.x, z: c.z } } } // butt wiggle
        else { c.subT += dt; const k = Math.min(1, c.subT / 0.32); c.x = c.pa.x + (b.x - c.pa.x) * k * 0.92; c.z = c.pa.z + (b.z - c.pa.z) * k * 0.92; g.hop = Math.sin(k * Math.PI) * 0.09; g.stretch = 0.8; g.pawL = g.pawR = 0.5
          if (k >= 1) { const a = Math.random() * 6.28; b.vx = Math.sin(a) * 0.9; b.vz = Math.cos(a) * 0.9; c.sub = 0; c.hits = (c.hits || 0) + 1; if (c.hits > 3 && !c.forced) { c.hits = 0; go('groom', 4) } } } }
      if (c.t > c.dur && !c.forced) next() }
    else if (S === 'zoom') { // sudden zoomies: dash between random spots, ears back, tail up, with little skids
      if (!onFloor) reach({ x: c.x, z: c.z, y: 0 }); else { if (!c.target) { for (let i = 0; i < 20; i++) { const x = -1.15 + Math.random() * 2.2, z = -0.75 + Math.random() * 1.6; if (freeAt(x, z, 0.06) && Math.hypot(x - c.x, z - c.z) > 0.5) { c.target = { x, z }; break } } c.skid = 0.25 }
        if (c.skid > 0) { c.skid -= dt; g.crouch = 0.8; g.earBack = 0.8 } else if (c.target && walkTo(c.target.x, c.target.z, 0.08, true)) c.target = null
        speed = 0.95; g.earBack = 0.7; g.tailUp = 1.2; g.tailWag = 0.3; g.tailSpeed = 12; g.eyes = 1 }
      if (c.t > c.dur) go(Math.random() < 0.5 ? 'groom' : 'sitnear', 3 + Math.random() * 2) }
    else if (S === 'bat') { const b = c.ball, dx = b.x - c.x, dz = b.z - c.z, d = Math.hypot(dx, dz) // sit by the yarn and bat it about
      if (!onFloor) reach({ x: c.x, z: c.z, y: 0 }); else if (d > 0.12) walkTo(b.x, b.z, 0.1); else { face = Math.atan2(dx, dz); g.sit = 1; g.headPitch = 0.3; g.earBack = -0.2; g.tailWag = 0.5; g.tailSpeed = 6
        const k = (c.t * 1.4) % 1, swipe = k > 0.7; const right = Math.floor(c.t * 1.4) % 2; g.pawL = swipe && !right ? 1 : 0; g.pawR = swipe && right ? 1 : 0
        if (swipe && !c.batted) { c.batted = true; const a = Math.atan2(dx, dz) + (right ? -0.9 : 0.9); b.vx = Math.sin(a) * 0.35; b.vz = Math.cos(a) * 0.35 } if (!swipe) c.batted = false }
      if (c.t > c.dur && !c.forced) next() }
    else if (S === 'aloof') { if (!onFloor && c.y < 0.2) reach({ x: c.x, z: c.z, y: 0 }); g.sit = 1; face = Math.atan2(c.x - hp.x, c.z - hp.z); const lick = c.t > 1.2 && Math.sin(c.t * 7) > 0; g.pawL = c.t > 1.2 ? 0.85 : 0; g.headPitch = c.t > 1.2 ? 0.35 + (lick ? 0.12 : 0) : -0.1; g.headYaw = c.t < 1.2 ? 0.6 : -0.25; g.eyes = 0.4; g.tailWag = 0.6; g.tailSpeed = 6; g.earBack = 0.35; if (c.t > c.dur && !c.forced) next() }
    else if (S === 'approach') { if (!onFloor) reach({ x: c.x, z: c.z, y: 0 }); else if (walkTo(hp.x, hp.z, 0.13)) go('rub', 4.5, { ra: Math.atan2(c.x - hp.x, c.z - hp.z) }); g.tailUp = 1; g.tailWag = 0.15; if (c.t > 8) next() }
    else if (S === 'rub') { // weave around her ankles, leaning in
      c.ra += dt * 1.3; const tx = hp.x + Math.sin(c.ra) * 0.115, tz = hp.z + Math.cos(c.ra) * 0.115; const dx = tx - c.x, dz = tz - c.z
      c.x += dx * Math.min(1, dt * 5); c.z += dz * Math.min(1, dt * 5); c.yaw += ang(c.ra + Math.PI / 2 - c.yaw) * Math.min(1, dt * 6); move = 0.6; speed = 0.17
      g.tailUp = 1.1; g.tailWag = 0.1; g.headTilt = -0.45; g.headYaw = -0.5; g.eyes = 0.3; g.purr = 1; g.bodyYaw = -0.15
      if (c.t > c.dur && !c.forced) go('sitnear', 4) }
    else if (S === 'sitnear') { g.sit = 1; face = Math.atan2(hp.x - c.x, hp.z - c.z); g.headPitch = -0.3; g.tailWag = 0.25; if (c.t > c.dur) next() }
    else if (S === 'petted') { if (onFloor && dHer > 0.2 && !c.forced) walkTo(hp.x, hp.z, 0.16); g.sit = c.y > 0.1 ? 0 : 1; g.lie = c.y > 0.1 ? 1 : 0; face = Math.atan2(hp.x - c.x, hp.z - c.z); g.eyes = 0.05; g.headPitch = -0.35; g.headTilt = 0.4 * Math.sin(c.t * 1.5); g.tailUp = 1.1; g.tailWag = 0.08; g.purr = 1; g.earBack = -0.1
      if (c.forced && c.t % 1.2 < dt) burst(hearts.current, 3); if (c.t > c.dur) go('sitnear', 3) }
    else if (S === 'ignore') { g.sit = 1; face = Math.atan2(c.x - hp.x, c.z - hp.z); g.tailWag = 0.7; g.tailSpeed = 7; g.tailUp = -0.1; g.earBack = 0.6; g.eyes = 0.5; if (c.t > c.dur && !c.forced) next() }
    // she's close: sometimes come and say hello
    if ((S === 'wander' || S === 'groom' || S === 'sitnear' || S === 'bat') && dHer < 0.9 && c.approachCD < 0 && !c.forced) { c.approachCD = 9 + Math.random() * 8; const r = Math.random(); if (r < 0.42 * (0.5 + c.mood)) go('approach', 8); else if (r < 0.72) go('aloof', 4 + Math.random() * 3) }
    // she heads for a comfy spot: sometimes he races her to it and curls up there (claims it)
    c.claimCD -= dt; c.scanT -= dt
    if (c.scanT < 0 && !c.forced) { c.scanT = 0.5; const mv = Math.hypot(hp.x - (c.hpx ?? hp.x), hp.z - (c.hpz ?? hp.z)); c.hpx = hp.x; c.hpz = hp.z
      if (mv > 0.03 && c.claimCD < 0 && S !== 'claim' && S !== 'petted' && S !== 'rub') for (const k of ['rug', 'chair', 'bed']) { const sp = SPOT[k], d1 = Math.hypot(hp.x - sp.x, hp.z - sp.z)
        if (d1 < 0.55 && d1 > 0.18 && Math.hypot(c.x - sp.x, c.z - sp.z) < 1.6) { c.claimCD = 40; if (Math.random() < 0.55) { go('claim', 14 + Math.random() * 10, { where: k, claimed: false }); break } } } }
    function next() { const day = T.day > 0.5, cd = c.cd || (c.cd = {}), now = c.clock || 0
      const W = { nap: day ? 1.3 : 0.5, napBed: 1.3, napRug: 0.9, napChair: 0.8, napShelf: 0.7, napSill: day ? 0.5 : 0.9, groom: 1.4, stretch: 0.7, chase: 1.1, bat: 1.2, sill: day ? 1.5 : 0.7, knead: 0.8, zoom: T.night > 0.5 || T.dusk > 0.4 ? 0.9 : 0.45, wander: 1.4 }
      for (const k in W) if ((cd[k] ?? -1) > now) W[k] = 0
      if (c.lastK) W[c.lastK] *= 0.25 // rarely the same thing twice in a row
      const k = pick(W); c.lastK = k; cd[k] = now + ({ zoom: 70, napShelf: 60, knead: 45, chase: 30, bat: 25, stretch: 15 }[k] ?? 20) * (0.7 + Math.random() * 0.6)
      const nap = (where) => go('nap', 12 + Math.random() * 14, { where })
      if (k === 'nap') nap('beam'); else if (k === 'napBed') nap('bed'); else if (k === 'napRug') nap('rug'); else if (k === 'napChair') nap('chair'); else if (k === 'napShelf') nap('shelf'); else if (k === 'napSill') nap('sillNap')
      else if (k === 'groom') go('groom', 4 + Math.random() * 3); else if (k === 'stretch') go('stretch', 2.6); else if (k === 'chase') go('chase', 12); else if (k === 'bat') go('bat', 6 + Math.random() * 5); else if (k === 'sill') go('sill', 10 + Math.random() * 10); else if (k === 'knead') go('knead', 4); else if (k === 'zoom') go('zoom', 4 + Math.random() * 2.5); else go('wander', 3 + Math.random() * 3) }
    if (face != null) c.yaw += ang(face - c.yaw) * Math.min(1, dt * 4)
    if (move) { const s = speed * move; c.x += Math.sin(c.yaw) * s * dt; c.z += Math.cos(c.yaw) * s * dt; if (onFloor) resolve(c, 0.04) }
    st.speed += (move * speed - st.speed) * Math.min(1, dt * 8); st.run = speed > 0.4 ? 1 : 0; st.phase += dt * st.speed / (CAT_CFG.stride * CAT_SCALE) * 1.6
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
    <group ref={root}><group scale={CAT_SCALE}><Quadruped cfg={CAT_CFG} st={st} /></group><Hearts gref={hearts} y={0.14} size={0.085} /></group>
    <group ref={ball}><mesh geometry={GEO.sph} material={cel('#c97b9a')} scale={0.03} /><mesh geometry={GEO.sph} material={OUT.pet} scale={0.03} />{[0, 1, 2].map(i => <mesh key={i} geometry={GEO.tor} material={cel('#e8a0bb')} scale={[0.029, 0.029, 0.02]} rotation={[i * 1.1, i * 0.7, 0]} />)}</group>
  </>
}
