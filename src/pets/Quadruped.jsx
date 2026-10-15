// Procedural, stylised quadruped rig shared by the cat and the dog. Same cel shader + ink hull as her and the
// villagers, so the pets sit in the same picture. A brain writes pose targets into st.goal; this eases st.p
// toward them (springy, so poses blend instead of popping) and layers gait, breathing, ears, eyes and tail on top.
import * as THREE from 'three'
import React, { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { cel, OUT, GEO } from '../home/kit.jsx'

export const POSE0 = { sit: 0, lie: 0, curl: 0, stretch: 0, crouch: 0, roll: 0, headPitch: 0, headYaw: 0, headTilt: 0, earBack: 0, eyes: 1, mouth: 0, tongue: 0, tailUp: 0.3, tailWag: 0.2, tailSpeed: 4, pawL: 0, pawR: 0, sniff: 0, bodyYaw: 0, hop: 0, purr: 0, happy: 0 }
export const newPet = () => ({ p: { ...POSE0 }, goal: { ...POSE0 }, v: {}, speed: 0, phase: 0, run: 0, t: 0, blink: 2, twL: 0, twR: 0, rate: {} })
const K = { hop: 30, roll: 4, bodyYaw: 6, purr: 10 }
function Part({ geo = GEO.sph, mat, out = OUT.pet, pos, scl, rot, children, gref }) {
  return <group ref={gref} position={pos} rotation={rot}><group scale={scl}><mesh geometry={geo} material={mat} />{out && <mesh geometry={geo} material={out} />}</group>{children}</group>
}
export function Quadruped({ cfg, st }) {
  const c = cfg, [bw, bh, bl] = c.body, hr = c.head, M = useMemo(() => Object.fromEntries(Object.entries(c.col).map(([k, v]) => [k, cel(v)])), [c])
  const r = useRef({}), set = (k) => (el) => { r.current[k] = el }
  const legs = useMemo(() => [['FL', 1, 1, 0], ['FR', -1, 1, Math.PI], ['RL', 1, -1, Math.PI], ['RR', -1, -1, 0]], [])
  const baseY = c.legH + bh * 0.55
  useFrame((_, dt) => {
    dt = Math.min(dt, 0.05); st.t += dt; const p = st.p, g = st.goal, R_ = r.current, t = st.t
    for (const k in g) { const kk = K[k] ?? 7; p[k] += (g[k] - p[k]) * Math.min(1, dt * kk) }
    // blink + ear twitches
    st.blink -= dt; if (st.blink < 0) st.blink = 2.5 + Math.random() * 3.5
    const blink = st.blink < 0.12 ? 0.1 : 1
    if (Math.random() < dt * 0.35) st.twL = 1; if (Math.random() < dt * 0.3) st.twR = 1
    st.twL = Math.max(0, st.twL - dt * 5); st.twR = Math.max(0, st.twR - dt * 5)
    // gait: walk = diagonal pairs, run = bound (front pair / rear pair)
    const sp = st.speed, amp = Math.min(1, sp / (c.stride * 3)), run = st.run, ph = st.phase
    const sit = p.sit, lie = Math.max(p.lie, p.curl), roll = p.roll
    const bob = Math.abs(Math.sin(ph)) * amp * (0.006 + 0.016 * run) * c.s
    const pitch = -0.72 * sit + 0.38 * p.stretch + 0.12 * p.crouch - Math.sin(ph) * 0.12 * run * amp
    const B = R_.body
    B.position.set(0, baseY * (1 - 0.5 * lie - 0.34 * p.crouch - 0.12 * p.stretch - 0.22 * sit) + bob + p.hop * c.s * 0.7 - roll * bh * 0.25, -sit * bl * 0.25)
    B.rotation.set(pitch, p.bodyYaw, roll * 2.6 + Math.sin(t * 9) * 0.05 * p.crouch * (1 - roll))
    const br = 1 + Math.sin(t * (lie > 0.5 ? 2.2 : 3)) * 0.025 + Math.sin(t * 60) * 0.012 * p.purr // breathing (+ purr buzz)
    R_.torso.scale.set(bw * br, bh * br * (1 - 0.1 * lie), bl * (1 + 0.08 * p.stretch))
    for (const [k, sx, fz, off] of legs) {
      const L = R_['leg' + k]; if (!L) continue
      const front = fz > 0, swing = Math.sin(ph + (run > 0.5 ? (front ? 0 : Math.PI) + (sx > 0 ? 0 : 0.35) : off)) * amp * (0.55 + 0.15 * run)
      let rx = -pitch + swing
      if (front) { rx += -1.35 * lie - 0.9 * p.stretch - 0.3 * p.crouch - 1.7 * (sx > 0 ? p.pawL : p.pawR) + sit * 0.05 }
      else { rx += -1.3 * sit - 1.15 * lie + 0.25 * p.stretch - 0.5 * p.crouch }
      L.rotation.set(rx, 0, sx * (0.06 + roll * 0.5 + Math.sin(t * 7 + sx) * 0.25 * roll))
      L.scale.y = front ? 1 + 0.2 * sit - 0.25 * lie : 1 - 0.35 * sit - 0.3 * lie
    }
    const H = R_.head
    H.rotation.set(-pitch * 0.85 + p.headPitch + 0.75 * p.sniff + 0.35 * lie * (1 - p.curl), p.headYaw + 1.9 * p.curl, p.headTilt + Math.sin(t * 1.3) * 0.03)
    H.position.y = c.headY * (1 - 0.2 * lie) - 0.25 * p.sniff * hr
    for (const [k, s, tw] of [['earL', 1, st.twL], ['earR', -1, st.twR]]) { const e = R_[k]; if (e) e.rotation.set(-0.5 * p.earBack + Math.sin(tw * 9) * 0.35 * tw, 0, s * (c.earSplay + 0.5 * p.earBack)) }
    const eo = Math.max(0.08, Math.min(p.eyes, blink)); R_.eyeL.scale.y = R_.eyeR.scale.y = eo
    R_.mouth.scale.set(1, 0.3 + 2.4 * p.mouth, 1); if (R_.tongue) { R_.tongue.visible = p.tongue > 0.1; R_.tongue.position.y = -hr * (0.42 + 0.12 * p.tongue) }
    // tail: a springy chain; up/curl from mood, side-to-side wag
    const n = c.tail.n, wag = p.tailWag, wf = p.tailSpeed
    for (let i = 0; i < n; i++) { const s = R_['t' + i]; if (!s) continue
      const u = i / (n - 1)
      s.rotation.x = (i === 0 ? -0.6 - 1.0 * p.tailUp + 0.9 * lie + 0.5 * sit * (1 - c.tail.curl) : -(c.tail.curl * 0.55 + 0.12 * p.tailUp) * (1 - lie * 0.6))
      s.rotation.y = Math.sin(t * wf - i * 0.7) * wag * (0.35 + u * 0.4) + p.curl * 0.55
      s.rotation.z = Math.sin(t * 1.1 + i) * 0.04 }
    if (R_.hearts) R_.hearts.visible = false
  })
  const seg = c.tail.seg, tailChain = (i) => i >= c.tail.n ? null : <group ref={set('t' + i)} position={[0, 0, i === 0 ? 0 : -seg]}>
    <Part mat={i >= c.tail.n - (c.tail.tip ?? 0) ? M.belly : M.main} pos={[0, 0, -seg * 0.5]} scl={[c.tail.r * (1 - i * 0.06), c.tail.r * (1 - i * 0.06), seg * 0.62]} />{tailChain(i + 1)}</group>
  return <group>
    <group ref={set('body')}>
      <Part gref={set('torso')} mat={M.main} pos={[0, 0, 0]} scl={[bw, bh, bl]} />
      {[-1, 1].map(sx => <Part key={'h' + sx} mat={M.main} pos={[sx * bw * 0.5, -bh * 0.12, -bl * 0.52]} scl={[bw * 0.5, bh * 0.62, bl * 0.42]} />)}
      <Part mat={M.belly} pos={[0, -bh * 0.28, bl * 0.18]} scl={[bw * 0.78, bh * 0.72, bl * 0.82]} out={null} />
      {c.stripes && [-0.45, 0, 0.45].map((z, i) => <Part key={i} mat={M.dark} pos={[0, bh * 0.8, z * bl]} scl={[bw * 0.75, bh * 0.25, bl * 0.12]} rot={[0, 0, 0]} out={null} />)}
      {c.collar && <><Part geo={GEO.tor} mat={M.collar} pos={[0, bh * 0.42, bl * 0.8]} rot={[Math.PI / 2 - 0.7, 0, 0]} scl={[bw * 0.52, bw * 0.52, bw * 0.35]} /><Part mat={M.tag} pos={[0, bh * 0.08, bl * 0.97]} scl={0.007} /></>}
      {legs.map(([k, sx, fz]) => <group key={k} ref={set('leg' + k)} position={[sx * bw * 0.52, -bh * 0.25, fz * bl * 0.58]}>
        <Part geo={GEO.cap} mat={M.main} pos={[0, -c.legH * 0.45, 0]} scl={[c.legR, c.legH * 0.42, c.legR]} />
        <Part mat={c.socks ? M.belly : M.main} pos={[0, -c.legH * 0.93, c.legR * 0.35]} scl={[c.legR * 1.25, c.legR * 0.85, c.legR * 1.5]} />
      </group>)}
      <group position={[0, bh * 0.35, -bl * 0.88]}>{tailChain(0)}</group>
      <group position={[0, 0, bl * 0.82]}><group ref={set('head')}>
        <Part mat={M.main} scl={[hr * 1.08, hr, hr * 0.95]} />
        <Part mat={M.belly} pos={[0, -hr * 0.32, hr * (0.62 + c.snout * 0.5)]} scl={[hr * 0.52, hr * 0.38, hr * (0.38 + c.snout)]} out={OUT.pet} />
        <Part mat={M.nose} pos={[0, -hr * 0.18, hr * (0.92 + c.snout * 1.25)]} scl={[hr * 0.13, hr * 0.09, hr * 0.08]} out={null} />
        <group ref={set('mouth')} position={[0, -hr * 0.42, hr * (0.86 + c.snout * 1.0)]}><mesh geometry={GEO.sph} material={M.eye} scale={[hr * 0.16, hr * 0.05, hr * 0.06]} /></group>
        {c.tongue && <group ref={set('tongue')} position={[0, -hr * 0.45, hr * (0.9 + c.snout)]}><mesh geometry={GEO.sph} material={M.inner} scale={[hr * 0.1, hr * 0.13, hr * 0.06]} /></group>}
        {[-1, 1].map(s => <group key={s} ref={set(s > 0 ? 'eyeL' : 'eyeR')} position={[s * hr * 0.4, hr * 0.12, hr * 0.84]}>
          <mesh geometry={GEO.sph} material={M.eye} scale={[hr * c.eye, hr * c.eye * 1.15, hr * 0.08]} rotation={[0, s * 0.35, 0]} />
          <mesh geometry={GEO.sph} material={M.shine} position={[s * hr * 0.04, hr * 0.06, hr * 0.06]} scale={hr * 0.055} />
        </group>)}
        {[-1, 1].map(s => <mesh key={'c' + s} geometry={GEO.sph} material={M.inner} position={[s * hr * 0.62, -hr * 0.2, hr * 0.68]} scale={[hr * 0.16, hr * 0.09, hr * 0.05]} rotation={[0, s * 0.6, 0]} />)}
        {[-1, 1].map(s => <group key={'e' + s} ref={set(s > 0 ? 'earL' : 'earR')} position={[s * hr * 0.52, hr * 0.62, -hr * 0.05]}>
          <Part geo={GEO.cone} mat={M.main} pos={[0, hr * c.ear * 0.45, 0]} scl={[hr * c.ear * 0.55, hr * c.ear, hr * c.ear * 0.32]} />
          <mesh geometry={GEO.cone} material={M.inner} position={[0, hr * c.ear * 0.4, hr * c.ear * 0.1]} scale={[hr * c.ear * 0.33, hr * c.ear * 0.7, hr * c.ear * 0.15]} />
        </group>)}
        {c.whiskers && [-1, 1].flatMap(s => [0, 1].map(j => <mesh key={s + '' + j} geometry={GEO.box} material={M.eye} position={[s * hr * 0.62, -hr * (0.22 + j * 0.1), hr * 0.8]} rotation={[0, s * 0.25, s * (0.12 - j * 0.22)]} scale={[hr * 0.45, hr * 0.012, hr * 0.012]} />))}
      </group></group>
    </group>
  </group>
}
