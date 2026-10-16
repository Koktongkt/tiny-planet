// Procedural, stylised quadruped rig shared by the cat and the dog. Same cel shader + ink hull as her and the
// villagers, so the pets sit in the same picture. A brain writes pose targets into st.goal; this eases st.p
// toward them (springy, so poses blend instead of popping) and layers gait, breathing, ears, eyes and tail on top.
// Species diverge (round7): Mochi = feline anatomy (rounded skull, short muzzle + whisker pads, slit pupils, pointed
// ears with inner tufts, slender S spine, long expressive tail); Pip = Shiba Inu (fox wedge face, cream urajiro over
// red-sesame fur, small upright ears, almond eyes, curled ring tail over the back, compact body, springy trot).
import * as THREE from 'three'
import React, { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { cel, OUT, GEO } from '../home/kit.jsx'

export const POSE0 = { sit: 0, lie: 0, curl: 0, stretch: 0, crouch: 0, roll: 0, headPitch: 0, headYaw: 0, headTilt: 0, earBack: 0, eyes: 1, mouth: 0, tongue: 0, tailUp: 0.3, tailWag: 0.2, tailSpeed: 4, pawL: 0, pawR: 0, sniff: 0, bodyYaw: 0, hop: 0, purr: 0, happy: 0, pant: 0 }
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
  const floppy = !!c.floppy, species = c.species || (floppy ? 'dog' : 'cat'), hr0 = c.head
  useFrame((_, dt) => {
    if (st.frozen) return // off-screen (cat while she's outdoors, dog waiting by the door while she's in)
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
    const bob = Math.abs(Math.sin(ph)) * amp * (0.006 + 0.016 * run) * c.s * (c.spring || 1)
    const pitch = -0.72 * sit + 0.38 * p.stretch + 0.12 * p.crouch - Math.sin(ph) * 0.12 * run * amp
    const B = R_.body
    B.position.set(0, baseY * (1 - 0.5 * lie - 0.34 * p.crouch - 0.12 * p.stretch - 0.22 * sit) + bob + p.hop * c.s * 0.7 - roll * bh * 0.25, -sit * bl * 0.25)
    B.rotation.set(pitch, p.bodyYaw, roll * 2.6 + Math.sin(t * 9) * 0.05 * p.crouch * (1 - roll))
    const br = 1 + Math.sin(t * (lie > 0.5 ? 2.2 : 3 + 11 * p.pant)) * (0.025 + 0.03 * p.pant) + Math.sin(t * 60) * 0.012 * p.purr // breathing (+ purr buzz, quick panting breaths)
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
    const eo = Math.max(0.08, Math.min(p.eyes, blink)); R_.eyeL.scale.y = R_.eyeR.scale.y = eo
    if (R_.pupilL) { const pv = c.pupils === 'vert' ? [hr * 0.022, hr * 0.15 * eo, hr * 0.02] : [hr * 0.06, hr * 0.055 * eo, hr * 0.02]; R_.pupilL.scale.set(...pv); R_.pupilR.scale.set(...pv) }
    R_.mouth.scale.set(1, 0.3 + 2.4 * (p.mouth + Math.max(0, Math.sin(t * 14)) * 0.25 * p.pant), 1); if (R_.tongue) { R_.tongue.visible = p.tongue > 0.1; R_.tongue.position.y = -hr * (0.42 + 0.12 * p.tongue); R_.tongue.scale.set(1, 0.6 + 0.9 * p.tongue + 0.35 * p.pant * Math.max(0, Math.sin(t * 14)), 1) }
    // tail: a springy chain; up/curl from mood, side-to-side wag
    const n = c.tail.n, wag = p.tailWag, wf = p.tailSpeed
    for (let i = 0; i < n; i++) { const s = R_['t' + i]; if (!s) continue
      const u = i / (n - 1)
      // cat curls tip up; dog's bushy tail arcs high and wags big
      const curlAmt = species === 'dog' ? c.tail.curl * 0.35 : c.tail.curl * 0.55
      s.rotation.x = (i === 0 ? -0.55 - 1.05 * p.tailUp + 0.9 * lie + 0.35 * sit * (1 - c.tail.curl) : -(curlAmt + 0.12 * p.tailUp) * (1 - lie * 0.6))
      s.rotation.y = Math.sin(t * wf - i * 0.7) * wag * (species === 'dog' ? 0.55 + u * 0.55 : 0.35 + u * 0.4) + p.curl * 0.55
      s.rotation.z = Math.sin(t * 1.1 + i) * 0.04; if (species === 'cat') s.rotation.x += Math.sin(t * 1.3 - i * 0.55) * 0.09 * (1 - lie) }
    if (R_.curl) { // Shiba: the curled ring sways with the wag, sinks a little when low-spirited
      R_.curl.rotation.set(-0.35 * (1 - Math.min(1, p.tailUp)) + 0.35 * lie, 0, Math.sin(t * wf) * wag * 0.22 + p.curl * 0.3); R_.curl.position.x = Math.sin(t * wf) * wag * 0.006 }
    if (R_.hearts) R_.hearts.visible = false
  })
  const seg = c.tail.seg, tailChain = (i) => i >= c.tail.n ? null : <group ref={set('t' + i)} position={[0, 0, i === 0 ? 0 : -seg]}>
    <Part mat={i >= c.tail.n - (c.tail.tip ?? 0) ? M.tip || M.belly : M.main} pos={[0, 0, -seg * 0.5]} scl={[c.tail.r * (1 - i * c.tail.taper), c.tail.r * (1 - i * c.tail.taper), seg * 0.64]} />{tailChain(i + 1)}</group>
  return <group>
    <group ref={set('body')}>
      {species === 'dog' ? <DogBody c={c} M={M} set={set} legs={legs} /> : <CatBody c={c} M={M} set={set} legs={legs} />}
      {species === 'dog'
        ? <group position={[0, bh * 0.62, -bl * 0.78]}><group ref={set('curl')}><ShibaTail c={c} M={M} /></group></group>
        : <group position={[0, bh * 0.25, -bl * 0.95]}>{tailChain(0)}</group>}
      <group position={[0, species === 'dog' ? bh * 0.42 : bh * 0.3, bl * (species === 'dog' ? 0.9 : 0.86)]}><group ref={set('head')}>
        {species === 'dog' ? <ShibaHead c={c} M={M} set={set} /> : <CatHead c={c} M={M} set={set} />}
      </group></group>
    </group>
  </group>
}
// ---------- shared eye: almond (dog) or round with slit pupil (cat), two shine dots ----------
function Eye({ c, M, s, set, hr, pos, almond }) {
  const e = c.eye
  return <group ref={set(s > 0 ? 'eyeL' : 'eyeR')} position={pos} rotation={[0, s * (almond ? 0.42 : 0.32), s * (almond ? -0.28 : 0)]}>
    <mesh geometry={GEO.sph} material={M.lid} scale={[hr * e * (almond ? 1.5 : 1.22), hr * e * (almond ? 0.95 : 1.3), hr * 0.05]} position={[0, 0, -hr * 0.004]} />
    <mesh geometry={GEO.sph} material={M.iris} scale={[hr * e * (almond ? 1.18 : 1.02), hr * e * (almond ? 0.72 : 1.1), hr * 0.06]} position={[0, 0, hr * 0.012]} />
    <mesh ref={set(s > 0 ? 'pupilL' : 'pupilR')} geometry={GEO.sph} material={M.pupil} position={[0, 0, hr * 0.062]} />
    <mesh geometry={GEO.sph} material={M.shine} position={[s * hr * e * 0.32, hr * e * 0.38, hr * 0.088]} scale={hr * e * 0.2} />
    <mesh geometry={GEO.sph} material={M.shine} position={[-s * hr * e * 0.28, -hr * e * 0.32, hr * 0.086]} scale={hr * e * 0.1} />
  </group>
}
// ---------- Pip: Shiba Inu ----------
function DogBody({ c, M, set, legs }) {
  const [bw, bh, bl] = c.body
  return <>
    <Part gref={set('torso')} mat={M.main} scl={[bw, bh, bl]} />
    {/* deep chest + cream bib (urajiro), compact haunches, darker sesame saddle */}
    <Part mat={M.main} pos={[0, bh * 0.18, bl * 0.5]} scl={[bw * 0.95, bh * 0.92, bl * 0.5]} />
    <Part mat={M.cream} pos={[0, -bh * 0.02, bl * 0.84]} scl={[bw * 0.64, bh * 0.72, bl * 0.28]} out={null} />
    <Part mat={M.cream} pos={[0, -bh * 0.45, bl * 0.05]} scl={[bw * 0.7, bh * 0.5, bl * 0.75]} out={null} />
    {[-1, 1].map(sx => <Part key={'h' + sx} mat={M.main} pos={[sx * bw * 0.42, bh * 0.02, -bl * 0.5]} scl={[bw * 0.5, bh * 0.82, bl * 0.4]} />)}
    {[-1, 1].map(sx => <Part key={'hi' + sx} mat={M.cream} pos={[sx * bw * 0.55, -bh * 0.38, -bl * 0.42]} scl={[bw * 0.32, bh * 0.4, bl * 0.28]} out={null} />)}
    <Part mat={M.dark} pos={[0, bh * 0.72, -bl * 0.05]} scl={[bw * 0.62, bh * 0.32, bl * 0.72]} out={null} />
    <Part mat={M.dark} pos={[0, bh * 0.78, bl * 0.55]} scl={[bw * 0.55, bh * 0.3, bl * 0.32]} out={null} />
    {/* neck ruff tufts */}
    {[-1, 1].map(sx => <Part key={'r' + sx} geo={GEO.cone} mat={M.main} pos={[sx * bw * 0.78, bh * 0.35, bl * 0.72]} rot={[0.3, 0, sx * 1.9]} scl={[bw * 0.22, bh * 0.38, bw * 0.22]} out={null} />)}
    {c.collar && <><Part geo={GEO.tor} mat={M.collar} pos={[0, bh * 0.55, bl * 0.86]} rot={[Math.PI / 2 - 0.75, 0, 0]} scl={[bw * 0.6, bw * 0.6, bw * 0.4]} /><Part mat={M.tag} pos={[0, bh * 0.12, bl * 1.0]} scl={0.007} /></>}
    {legs.map(([k, sx, fz]) => <group key={k} ref={set('leg' + k)} position={[sx * bw * 0.5, -bh * 0.2, fz * bl * 0.55]}>
      <Part geo={GEO.cap} mat={M.main} pos={[0, -c.legH * 0.42, 0]} scl={[c.legR * (fz > 0 ? 1 : 1.15), c.legH * 0.4, c.legR * (fz > 0 ? 1 : 1.2)]} />
      {/* cream inner leg + white socks */}
      <Part geo={GEO.cap} mat={M.cream} pos={[-sx * c.legR * 0.45, -c.legH * 0.55, c.legR * 0.2]} scl={[c.legR * 0.6, c.legH * 0.32, c.legR * 0.75]} out={null} />
      <Part mat={M.cream} pos={[0, -c.legH * 0.93, c.legR * 0.45]} scl={[c.legR * 1.25, c.legR * 0.75, c.legR * 1.6]} />
    </group>)}
  </>
}
// tightly curled tail lying over the back: a fluffy ring of fur clumps, cream underneath, sesame on top
function ShibaTail({ c, M }) {
  const r = c.tail.ring, k = 9
  return <group rotation={[0.25, 0, 0]}>
    {[...Array(k)].map((_, i) => { const a = -0.6 + i / (k - 1) * Math.PI * 1.75, y = Math.sin(a) * r, z = -Math.cos(a) * r * 0.9, top = y > r * 0.15, fat = c.tail.r * (1.15 - i * 0.04)
      return <Part key={i} mat={i === k - 1 ? M.cream : top ? M.dark2 : i < 2 ? M.main : M.cream} pos={[Math.sin(i * 0.8) * fat * 0.12, y + r, z]} scl={[fat, fat * 0.95, fat * 1.05]} out={i % 2 ? null : OUT.pet} /> })}
    <Part mat={M.main} pos={[0, r * 0.55, -r * 0.55]} scl={[c.tail.r * 1.1, c.tail.r * 1.1, c.tail.r * 1.3]} />
  </group>
}
function ShibaHead({ c, M, set }) {
  const hr = c.head
  return <>
    {/* fox-like wedge: broad cheeks, flat forehead, tapering muzzle */}
    <Part mat={M.main} scl={[hr * 1.02, hr * 0.88, hr * 0.92]} />
    {[-1, 1].map(s => <Part key={'ch' + s} mat={M.cream} pos={[s * hr * 0.46, -hr * 0.34, hr * 0.38]} scl={[hr * 0.4, hr * 0.34, hr * 0.42]} out={null} />)}
    {[-1, 1].map(s => <Part key={'cf' + s} geo={GEO.cone} mat={M.cream} pos={[s * hr * 0.88, -hr * 0.34, hr * 0.15]} rot={[0, 0, s * 2.1]} scl={[hr * 0.14, hr * 0.26, hr * 0.14]} out={null} />)}
    {/* long, narrow, tapering muzzle: orange bridge on top, cream underneath */}
    <Part mat={M.main} pos={[0, -hr * 0.06, hr * 0.82]} rot={[0.12, 0, 0]} scl={[hr * 0.27, hr * 0.22, hr * 0.62]} />
    <Part mat={M.cream} pos={[0, -hr * 0.26, hr * 0.9]} rot={[0.05, 0, 0]} scl={[hr * 0.26, hr * 0.17, hr * 0.55]} />
    <Part mat={M.nose} pos={[0, -hr * 0.1, hr * 1.4]} scl={[hr * 0.1, hr * 0.075, hr * 0.07]} out={null} />
    <mesh geometry={GEO.sph} material={M.shine} position={[hr * 0.03, hr * -0.06, hr * 1.465]} scale={hr * 0.022} />
    <group ref={set('mouth')} position={[0, -hr * 0.37, hr * 1.18]}><mesh geometry={GEO.sph} material={M.lip} scale={[hr * 0.13, hr * 0.04, hr * 0.07]} /></group>
    {c.tongue && <group ref={set('tongue')} position={[0, -hr * 0.4, hr * 1.18]}><mesh geometry={GEO.sph} material={M.inner} scale={[hr * 0.09, hr * 0.16, hr * 0.06]} /></group>}
    {/* cream 'eyebrow' dots, almond eyes */}
    {[-1, 1].map(s => <mesh key={'br' + s} geometry={GEO.sph} material={M.cream} position={[s * hr * 0.32, hr * 0.38, hr * 0.74]} scale={[hr * 0.1, hr * 0.06, hr * 0.05]} />)}
    {[-1, 1].map(s => <Eye key={s} c={c} M={M} s={s} set={set} hr={hr} pos={[s * hr * 0.36, hr * 0.13, hr * 0.8]} almond />)}
    {/* small triangular upright ears, cream inside */}
    {[-1, 1].map(s => <group key={'e' + s} ref={set(s > 0 ? 'earL' : 'earR')} position={[s * hr * 0.52, hr * 0.6, -hr * 0.02]}>
      <Part geo={GEO.cone} mat={M.main} pos={[0, hr * c.ear * 0.45, 0]} rot={[-0.15, 0, 0]} scl={[hr * c.ear * 0.5, hr * c.ear, hr * c.ear * 0.24]} />
      <mesh geometry={GEO.cone} material={M.cream} position={[0, hr * c.ear * 0.38, hr * c.ear * 0.1]} rotation={[-0.15, 0, 0]} scale={[hr * c.ear * 0.3, hr * c.ear * 0.7, hr * c.ear * 0.1]} />
      <mesh geometry={GEO.cone} material={M.dark} position={[0, hr * c.ear * 0.8, -hr * c.ear * 0.02]} rotation={[-0.15, 0, 0]} scale={[hr * c.ear * 0.22, hr * c.ear * 0.3, hr * c.ear * 0.18]} />
    </group>)}
  </>
}
// ---------- Mochi: cat ----------
function CatBody({ c, M, set, legs }) {
  const [bw, bh, bl] = c.body
  return <>
    {/* slender flexible spine: chest + waist + hips read as one long S */}
    <Part gref={set('torso')} mat={M.main} scl={[bw * 0.82, bh * 0.82, bl]} />
    <Part mat={M.main} pos={[0, bh * 0.08, bl * 0.55]} scl={[bw * 0.85, bh * 0.92, bl * 0.48]} />
    <Part mat={M.main} pos={[0, bh * 0.05, -bl * 0.55]} scl={[bw * 0.95, bh * 0.95, bl * 0.5]} />
    <Part mat={M.belly} pos={[0, -bh * 0.1, bl * 0.82]} scl={[bw * 0.62, bh * 0.75, bl * 0.3]} out={null} />
    <Part mat={M.belly} pos={[0, -bh * 0.42, 0]} scl={[bw * 0.6, bh * 0.45, bl * 0.8]} out={null} />
    {/* chest ruff tufts */}
    {[-1, 0, 1].map(sx => <Part key={'ru' + sx} geo={GEO.cone} mat={M.belly} pos={[sx * bw * 0.3, -bh * 0.35, bl * 1.0]} rot={[2.6, 0, sx * 0.4]} scl={[bw * 0.2, bh * 0.35, bw * 0.15]} out={null} />)}
    {c.stripes && [-0.75, -0.42, -0.1, 0.22, 0.55].map((z, i) => <Part key={i} mat={M.dark} pos={[0, bh * 0.66, z * bl]} scl={[bw * (0.55 - Math.abs(z) * 0.1), bh * 0.24, bl * 0.06]} out={null} />)}
    {legs.map(([k, sx, fz]) => <group key={k} ref={set('leg' + k)} position={[sx * bw * 0.5, -bh * 0.2, fz * bl * 0.66]}>
      <Part geo={GEO.cap} mat={M.main} pos={[0, -c.legH * 0.42, 0]} scl={[c.legR * (fz > 0 ? 0.9 : 1.2), c.legH * 0.42, c.legR * (fz > 0 ? 0.9 : 1.35)]} />
      {/* soft round paws with pink pads */}
      <Part mat={M.belly} pos={[0, -c.legH * 0.93, c.legR * 0.35]} scl={[c.legR * 1.25, c.legR * 0.8, c.legR * 1.35]} />
      <mesh geometry={GEO.sph} material={M.inner} position={[0, -c.legH * 0.98, c.legR * 0.2]} scale={[c.legR * 0.5, c.legR * 0.2, c.legR * 0.5]} />
    </group>)}
  </>
}
function CatHead({ c, M, set }) {
  const hr = c.head
  return <>
    {/* rounded skull, fluffy cheek ruff, short muzzle with whisker pads */}
    <Part mat={M.main} scl={[hr * 1.08, hr * 0.98, hr * 0.95]} />
    {[-1, 1].map(s => <Part key={'ch' + s} geo={GEO.cone} mat={M.main} pos={[s * hr * 0.95, -hr * 0.3, hr * 0.05]} rot={[0, 0, s * 2.0]} scl={[hr * 0.2, hr * 0.32, hr * 0.22]} out={null} />)}
    {[-1, 1].map(s => <Part key={'cb' + s} mat={M.main} pos={[s * hr * 0.55, -hr * 0.25, hr * 0.25]} scl={[hr * 0.5, hr * 0.48, hr * 0.55]} out={null} />)}
    {[-1, 1].map(s => <Part key={'wp' + s} mat={M.belly} pos={[s * hr * 0.17, -hr * 0.33, hr * 0.8]} scl={[hr * 0.18, hr * 0.14, hr * 0.15]} out={OUT.pet} />)}
    <Part mat={M.belly} pos={[0, -hr * 0.5, hr * 0.7]} scl={[hr * 0.16, hr * 0.1, hr * 0.12]} out={null} />
    <mesh geometry={GEO.cone} material={M.nose} position={[0, -hr * 0.18, hr * 0.93]} rotation={[Math.PI + 0.35, 0, 0]} scale={[hr * 0.09, hr * 0.08, hr * 0.06]} />
    <group ref={set('mouth')} position={[0, -hr * 0.46, hr * 0.84]}><mesh geometry={GEO.sph} material={M.lip} scale={[hr * 0.1, hr * 0.04, hr * 0.05]} /></group>
    {c.tufts && [-1, 0, 1].map(s => <mesh key={'st' + s} geometry={GEO.sph} material={M.dark} position={[s * hr * 0.16, hr * 0.62, hr * 0.62]} rotation={[0.5, 0, s * 0.2]} scale={[hr * 0.05, hr * 0.17, hr * 0.04]} />)}
    {[-1, 1].map(s => <Eye key={s} c={c} M={M} s={s} set={set} hr={hr} pos={[s * hr * 0.4, hr * 0.12, hr * 0.78]} />)}
    {/* pointed ears with pink insides + fur tufts */}
    {[-1, 1].map(s => <group key={'e' + s} ref={set(s > 0 ? 'earL' : 'earR')} position={[s * hr * 0.56, hr * 0.62, -hr * 0.02]}>
      <Part geo={GEO.cone} mat={M.main} pos={[0, hr * c.ear * 0.5, 0]} scl={[hr * c.ear * 0.48, hr * c.ear * 1.15, hr * c.ear * 0.22]} />
      <mesh geometry={GEO.cone} material={M.inner} position={[0, hr * c.ear * 0.42, hr * c.ear * 0.08]} scale={[hr * c.ear * 0.3, hr * c.ear * 0.8, hr * c.ear * 0.08]} />
      {[-1, 1].map(k => <mesh key={k} geometry={GEO.cone} material={M.belly} position={[k * hr * c.ear * 0.08, hr * c.ear * 0.3, hr * c.ear * 0.13]} rotation={[0.2, 0, -k * 0.35]} scale={[hr * c.ear * 0.07, hr * c.ear * 0.5, hr * c.ear * 0.05]} />)}
      <mesh geometry={GEO.cone} material={M.dark} position={[0, hr * c.ear * 1.12, 0]} scale={[hr * c.ear * 0.05, hr * c.ear * 0.18, hr * c.ear * 0.05]} />
    </group>)}
    {c.whiskers && [-1, 1].flatMap(s => [0, 1, 2].map(j => <mesh key={s + '' + j} geometry={GEO.box} material={M.whisker} position={[s * hr * 0.55, -hr * (0.3 + j * 0.06), hr * 0.8]} rotation={[0, s * (0.35 + j * 0.06), s * (0.18 - j * 0.16)]} scale={[hr * 0.75, hr * 0.008, hr * 0.008]} />))}
  </>
}
