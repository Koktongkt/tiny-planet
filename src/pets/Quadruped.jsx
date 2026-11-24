// Procedural, stylised quadruped rig shared by the cat and the dog. Same cel shader + ink hull as her and the
// villagers, so the pets sit in the same picture. A brain writes pose targets into st.goal; this eases st.p
// toward them (springy, so poses blend instead of popping) and layers gait, breathing, ears, eyes and tail on top.
// Round 10/11 (Cozy Chibi pets): the look lives in per-species modules built on src/pets/sdfKit.js — smooth SDF-meshed
// heads and torsos with shader coat patterns and painted face decals (shibaHead / shibaBody for Pip, catHead / catBody
// for Mochi). This file keeps the motion: body, legs, head turn, face expression cell, tail chain.
import * as THREE from 'three'
import React, { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { cel, OUT, GEO } from '../home/kit.jsx'
import { fur, SHADOW } from '../GhibliPerson.jsx'
import { ShibaHead } from './shibaHead.jsx'
import { DogBody, ShibaTail } from './shibaBody.jsx'
import { CatHead } from './catHead.jsx'
import { CatBody, CatTail } from './catBody.jsx'
import { newFeet, stepFeet, legAngles, bodyFromFeet, spring } from './gait.js'

export const POSE0 = { sit: 0, lie: 0, curl: 0, stretch: 0, crouch: 0, roll: 0, headPitch: 0, headYaw: 0, headTilt: 0, earBack: 0, eyes: 1, mouth: 0, tongue: 0, tailUp: 0.3, tailWag: 0.2, tailSpeed: 4, pawL: 0, pawR: 0, sniff: 0, bodyYaw: 0, hop: 0, purr: 0, happy: 0, pant: 0 }
export const newPet = () => ({ p: { ...POSE0 }, goal: { ...POSE0 }, v: {}, speed: 0, phase: 0, run: 0, t: 0, blink: 2, twL: 0, twR: 0, rate: {} })
const _lw = new THREE.Vector3(), _ls = new THREE.Vector3(), LOD_PET = 1.7
function lodStep(root, lod, cam, holdFar) { if (!root) return
  if (!lod.current) { const L = []; root.updateWorldMatrix(true, true); root.traverse(o => { if (!o.isMesh || !o.geometry) return; if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere(); o.getWorldScale(_ls); if (o.geometry.boundingSphere.radius * Math.max(_ls.x, _ls.y, _ls.z) < 0.008) L.push(o) }); lod.current = { L, vis: true, n: 0 }; if (typeof window !== 'undefined') (window.__petLod = window.__petLod || []).push(lod.current) }
  const D = lod.current; if (!holdFar && D.n++ % 6) return; root.getWorldPosition(_lw); const v = !holdFar && cam.position.distanceTo(_lw) < LOD_PET
  if (v !== D.vis) { D.vis = v; for (const o of D.L) o.visible = v } }
const FURRY = new Set(['main', 'belly', 'cream', 'dark', 'dark2', 'tip', 'stripe']) // coat colours get fur grain; eyes, nose, collar stay clean
const K = { hop: 30, roll: 4, bodyYaw: 6, purr: 10 }
const LI = { FL: 0, FR: 1, RL: 2, RR: 3 }
const spr0 = () => ({ x: 0, v: 0 })
function Part({ geo = GEO.sph, mat, out = OUT.pet, pos, scl, rot, children, gref }) {
  return <group ref={gref} position={pos} rotation={rot}><group scale={scl}><mesh geometry={geo} material={mat} />{out && <mesh geometry={geo} material={out} />}</group>{children}</group>
}
export function Quadruped({ cfg, st }) {
  const c = cfg, [bw, bh, bl] = c.body, hr = c.head, M = useMemo(() => Object.fromEntries(Object.entries(c.col).map(([k, v]) => [k, FURRY.has(k) ? fur(v) : cel(v)])), [c])
  const r = useRef({}), set = (k) => (el) => { r.current[k] = el }
  const legs = useMemo(() => [['FL', 1, 1, 0], ['FR', -1, 1, Math.PI], ['RL', 1, -1, Math.PI], ['RR', -1, -1, 0]], [])
  const baseY = c.legH + bh * 0.55
  const floppy = !!c.floppy, species = c.species || (floppy ? 'dog' : 'cat'), hr0 = c.head
  // r7-ship trim: tiny face/fur details (eye shines, brows, tufts, whiskers, inner ears...) are a few px past ~1.7 units:
  // hide them there (each is its own draw call). Collected once by world size.
  const lodRoot = useRef(), lod = useRef(null)
  useFrame((S3, dt) => {
    if (st.frozen) return
    lodStep(lodRoot.current, lod, S3.camera, !!st.ride) // off-screen (cat while she's outdoors, dog waiting by the door while she's in). st.ride holds the far LOD so the crate does not turn the tiny face meshes back on.
    dt = Math.min(dt, 0.05) * (st.ts ?? 1); st.t += dt; const p = st.p, g = st.goal, R_ = r.current, t = st.t; st.R = R_ // st.ts: studio slow-motion; st.R: studio reads paw positions
    // st.loco (opt-in; the Motion Studio for now): planted-feet gait, body dynamics, per-pose springs. Without it the
    // rig is exactly as before. The brain then also feeds st.w (yaw rate), st.a (forward accel) and st.look (head lead).
    const LC = st.loco && c.loco ? c.loco : null, ps = st.ps || (st.ps = {})
    for (const k in g) { const sk = LC && LC.springs[k]; if (sk) p[k] = spring(ps[k] || (ps[k] = { x: p[k], v: 0 }), g[k], sk[0], sk[1], dt); else { const kk = K[k] ?? 7; p[k] += (g[k] - p[k]) * Math.min(1, dt * kk) } }
    // blink + ear twitches
    st.blink -= dt; if (st.blink < 0) st.blink = 2.5 + Math.random() * 3.5
    const blink = st.blink < 0.12 ? 0.1 : 1
    if (Math.random() < dt * 0.35) st.twL = 1; if (Math.random() < dt * 0.3) st.twR = 1
    st.twL = Math.max(0, st.twL - dt * 5); st.twR = Math.max(0, st.twR - dt * 5)
    // gait: walk = diagonal pairs, run = bound (front pair / rear pair)
    const sp = st.speed, amp = LC ? 0 : Math.min(1, sp / (c.stride * 3)), run = st.run, ph = st.phase
    const sit = p.sit, lie = Math.max(p.lie, p.curl), roll = p.roll
    let lo = null
    if (LC) {
      const hips = st.hips || (st.hips = legs.map(([k]) => [R_['leg' + k].position.x, R_['leg' + k].position.z])), Lr = c.legH + bh * 0.2, w = st.w || 0
      const f = st.feet || (st.feet = newFeet(hips)); stepFeet(f, hips, c.gait, { v: sp, w, dt })
      const bf = bodyFromFeet(f.legs, hips, Lr), S = st.spr || (st.spr = { y: spr0(), p: spr0(), r: spr0(), lean: spr0(), acc: spr0(), tail: spr0() })
      spring(S.y, bf.y - Lr, 400, 0.7, dt); spring(S.p, bf.pitch, 400, 0.7, dt); spring(S.r, bf.roll * 0.5, 400, 0.7, dt)
      const cl = (x, m) => Math.max(-m, Math.min(m, x))
      spring(S.lean, cl(-LC.lean * sp * w, 0.15), 120, 0.6, dt); spring(S.acc, cl(-LC.brake * (st.a || 0), 0.14), 120, 0.6, dt); spring(S.tail, cl(-w * 0.25, 0.6), 60, 0.5, dt)
      lo = { f, hips, Lr, S, wL: 1 - Math.min(1, Math.max(sit, lie, roll)) }
    }
    const bob = Math.abs(Math.sin(ph)) * amp * (0.006 + 0.016 * run) * c.s * (c.spring || 1)
    const pitch = -0.72 * sit + 0.38 * p.stretch + 0.12 * p.crouch - Math.sin(ph) * 0.12 * run * amp + (lo ? lo.wL * (lo.S.p.x + lo.S.acc.x) : 0)
    const rollB = lo ? lo.wL * (lo.S.r.x + lo.S.lean.x) : 0
    const B = R_.body
    B.position.set(0, baseY * (1 - 0.5 * lie - 0.34 * p.crouch - 0.12 * p.stretch - 0.22 * sit) + bob + p.hop * c.s * 0.7 - roll * bh * 0.25 + (lo ? lo.wL * lo.S.y.x : 0), -sit * bl * 0.25)
    B.rotation.set(pitch, p.bodyYaw, roll * 2.6 + Math.sin(t * 9) * 0.05 * p.crouch * (1 - roll) + rollB)
    const br = 1 + Math.sin(t * (lie > 0.5 ? 2.2 : 3 + 11 * p.pant)) * (0.025 + 0.03 * p.pant) + Math.sin(t * 60) * 0.012 * p.purr // breathing (+ purr buzz, quick panting breaths)
    R_.torso.scale.set(bw * br, bh * br * (1 - 0.1 * lie), bl * (1 + 0.08 * p.stretch))
    for (const [k, sx, fz, off] of legs) {
      const L = R_['leg' + k]; if (!L) continue
      const front = fz > 0, swing = Math.sin(ph + (run > 0.5 ? (front ? 0 : Math.PI) + (sx > 0 ? 0 : 0.35) : off)) * amp * (0.55 + 0.15 * run)
      let rx = -pitch + swing
      if (front) { rx += -1.35 * lie - 0.9 * p.stretch - 0.3 * p.crouch - 1.7 * (sx > 0 ? p.pawL : p.pawR) + sit * 0.05 }
      else { rx += -1.3 * sit - 1.15 * lie + 0.25 * p.stretch - 0.5 * p.crouch }
      let rz = sx * (0.06 + roll * 0.5 + Math.sin(t * 7 + sx) * 0.25 * roll), sy = front ? 1 + 0.2 * sit - 0.25 * lie : 1 - 0.35 * sit - 0.3 * lie
      if (lo) { // aim the column at its planted / swinging paw from where the hip actually is
        const i = LI[k], h = lo.hips[i], hipY = B.position.y - bh * 0.35 * Math.cos(pitch) - h[1] * Math.sin(pitch) + h[0] * Math.sin(rollB)
        const a = legAngles(lo.f.legs[i], h, lo.Lr, hipY); rx += lo.wL * a.rx; rz += lo.wL * (a.rz - rollB); sy *= 1 + lo.wL * (a.len - 1) }
      L.rotation.set(rx, 0, rz); L.scale.y = sy
    }
    const H = R_.head
    const nod = lo ? LC.nod * Math.sin(lo.f.ph * 4 * Math.PI) * (1 - lo.f.mix.k1) * Math.min(1, sp / 0.2) : 0 // the walk's head nod, twice a stride
    H.rotation.set(-pitch * 0.85 + p.headPitch + 0.75 * p.sniff + 0.35 * lie * (1 - p.curl) + nod, p.headYaw + 1.9 * p.curl + (lo ? st.look || 0 : 0), p.headTilt + Math.sin(t * 1.3) * 0.03 - rollB * 0.8)
    H.position.y = c.headY * (1 - 0.2 * lie) - 0.25 * p.sniff * hr
    for (const [k, s, tw] of [['earL', 1, st.twL], ['earR', -1, st.twR]]) {
      const e = R_[k]; if (!e) continue
      if (floppy) {
        // dog: floppy / semi-floppy ears hang down, lift a little when alert
        const alert = Math.max(0, -p.earBack), hang = 1.15 - 0.55 * alert + 0.25 * p.earBack
        e.rotation.set(hang + Math.sin(tw * 9) * 0.2 * tw, s * 0.15, s * (0.35 + 0.25 * p.earBack))
      } else {
        e.rotation.set(-0.5 * p.earBack + Math.sin(tw * 9) * 0.35 * tw, 0, s * (c.earSplay + 0.5 * p.earBack))
      }
    }
    const eo = Math.max(0.08, Math.min(p.eyes, blink)); if (R_.eyeL) R_.eyeL.scale.y = R_.eyeR.scale.y = eo
    if (R_.face) R_.face.material.uniforms.uCell.value = (eo > 0.45 ? 0 : 2) + (p.tongue > 0.3 || p.mouth > 0.22 || p.pant > 0.2 ? 0 : 1) // painted face: [eyes open|shut] x [mouth open|shut]
    if (R_.pupilL) { const e = c.eye, pv = c.pupils === 'vert' ? [hr * e * 0.2, hr * e * 0.7 * eo, hr * 0.02] : [hr * e * 0.56, hr * e * 0.6 * eo, hr * 0.02]; R_.pupilL.scale.set(...pv); R_.pupilR.scale.set(...pv) }
    if (R_.mouth) R_.mouth.scale.set(1, 0.3 + 2.4 * (p.mouth + Math.max(0, Math.sin(t * 14)) * 0.25 * p.pant), 1); if (R_.tongue) { R_.tongue.visible = p.tongue > 0.1; R_.tongue.position.y = -hr * (0.42 + 0.12 * p.tongue); R_.tongue.scale.set(1, 0.6 + 0.9 * p.tongue + 0.35 * p.pant * Math.max(0, Math.sin(t * 14)), 1) }
    // tail: a springy chain; up/curl from mood, side-to-side wag
    const n = c.tail.n, wag = p.tailWag, wf = p.tailSpeed
    for (let i = 0; i < n; i++) { const s = R_['t' + i]; if (!s) continue
      const u = i / (n - 1)
      // cat curls tip up; dog's bushy tail arcs high and wags big
      const curlAmt = species === 'dog' ? c.tail.curl * 0.35 : c.tail.curl * 0.55
      s.rotation.x = (i === 0 ? (species === 'cat' ? 0.55 + 1.05 * p.tailUp - 1.6 * lie - 0.45 * sit : -0.55 - 1.05 * p.tailUp) + 0.9 * lie + 0.35 * sit * (1 - c.tail.curl) : -(curlAmt + 0.12 * p.tailUp) * (1 - lie * 0.6))
      s.rotation.y = Math.sin(t * wf - i * 0.7) * wag * (species === 'dog' ? 0.55 + u * 0.55 : 0.35 + u * 0.4) + p.curl * 0.55 + (lo ? lo.S.tail.x * (0.5 + u) : 0)
      if (lo && i === 0 && species === 'cat') s.rotation.x -= lo.f.mix.k2 * 0.9 * lo.wL // running: the tail streams out behind
      s.rotation.z = Math.sin(t * 1.1 + i) * 0.04; if (species === 'cat') s.rotation.x += Math.sin(t * 1.3 - i * 0.55) * 0.09 * (1 - lie) }
    if (R_.curl) { // Shiba: the curled ring sways with the wag, sinks a little when low-spirited
      R_.curl.rotation.set(-0.35 * (1 - Math.min(1, p.tailUp)) + 0.35 * lie, lo ? lo.S.tail.x * 0.6 : 0, Math.sin(t * wf) * wag * 0.22 + p.curl * 0.3); R_.curl.position.x = Math.sin(t * wf) * wag * 0.006 }
    if (R_.hearts) R_.hearts.visible = false
    if (R_.shadow) { R_.shadow.visible = !st.ride; const k = 1 / (1 + p.hop * 9); R_.shadow.scale.set(k * (1 + 0.25 * lie), 1, k) }
  })
  const seg = c.tail.seg, tailChain = (i) => i >= c.tail.n ? null : <group ref={set('t' + i)} position={[0, 0, i === 0 ? 0 : -seg]}>
    {!c.tail.tube && <Part mat={i >= c.tail.n - (c.tail.tip ?? 0) ? M.tip || M.belly : c.tail.rings && i % 2 ? M.dark : M.main} pos={[0, 0, -seg * 0.5]} scl={[c.tail.r * (1 - i * c.tail.taper), c.tail.r * (1 - i * c.tail.taper), seg * 0.64]} />}{tailChain(i + 1)}</group>
  return <group ref={lodRoot}>
    <group ref={set('shadow')}><mesh geometry={SHADOW.geo} material={SHADOW.mat} scale={[bw * 3.2, 1, bl * 2.7]} position={[0, 0.002, 0]} renderOrder={1} /></group>
    <group ref={set('body')}>
      {species === 'dog' ? <DogBody c={c} M={M} set={set} legs={legs} /> : <CatBody c={c} M={M} set={set} legs={legs} />}
      {species === 'dog'
        ? <group position={[0, bh * (c.tail.up ?? 0.62), -bl * (c.tail.back ?? 0.78)]}><group ref={set('curl')}><ShibaTail c={c} M={M} /></group></group>
        : <group position={[0, bh * (c.tail.up ?? 0.25), -bl * (c.tail.back ?? 0.95)]}>{tailChain(0)}{c.tail.tube && <CatTail c={c} R={r} />}</group>}
      <group position={[0, bh * (c.headUp ?? 0.42), bl * (c.headFwd ?? 0.88)]}><group ref={set('head')}>
        {species === 'dog' ? <ShibaHead c={c} M={M} set={set} /> : <CatHead c={c} M={M} set={set} />}
      </group></group>
    </group>
  </group>
}
