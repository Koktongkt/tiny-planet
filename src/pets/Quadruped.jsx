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
import { fur, SHADOW } from '../GhibliPerson.jsx'
import { ShibaHead } from './shibaHead.jsx'

export const POSE0 = { sit: 0, lie: 0, curl: 0, stretch: 0, crouch: 0, roll: 0, headPitch: 0, headYaw: 0, headTilt: 0, earBack: 0, eyes: 1, mouth: 0, tongue: 0, tailUp: 0.3, tailWag: 0.2, tailSpeed: 4, pawL: 0, pawR: 0, sniff: 0, bodyYaw: 0, hop: 0, purr: 0, happy: 0, pant: 0 }
export const newPet = () => ({ p: { ...POSE0 }, goal: { ...POSE0 }, v: {}, speed: 0, phase: 0, run: 0, t: 0, blink: 2, twL: 0, twR: 0, rate: {} })
const _lw = new THREE.Vector3(), _ls = new THREE.Vector3(), LOD_PET = 1.7
function lodStep(root, lod, cam, holdFar) { if (!root) return
  if (!lod.current) { const L = []; root.updateWorldMatrix(true, true); root.traverse(o => { if (!o.isMesh || !o.geometry) return; if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere(); o.getWorldScale(_ls); if (o.geometry.boundingSphere.radius * Math.max(_ls.x, _ls.y, _ls.z) < 0.008) L.push(o) }); lod.current = { L, vis: true, n: 0 }; if (typeof window !== 'undefined') (window.__petLod = window.__petLod || []).push(lod.current) }
  const D = lod.current; if (!holdFar && D.n++ % 6) return; root.getWorldPosition(_lw); const v = !holdFar && cam.position.distanceTo(_lw) < LOD_PET
  if (v !== D.vis) { D.vis = v; for (const o of D.L) o.visible = v } }
const FURRY = new Set(['main', 'belly', 'cream', 'dark', 'dark2', 'tip', 'stripe']) // coat colours get fur grain; eyes, nose, collar stay clean
const K = { hop: 30, roll: 4, bodyYaw: 6, purr: 10 }
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
      s.rotation.y = Math.sin(t * wf - i * 0.7) * wag * (species === 'dog' ? 0.55 + u * 0.55 : 0.35 + u * 0.4) + p.curl * 0.55
      s.rotation.z = Math.sin(t * 1.1 + i) * 0.04; if (species === 'cat') s.rotation.x += Math.sin(t * 1.3 - i * 0.55) * 0.09 * (1 - lie) }
    if (R_.curl) { // Shiba: the curled ring sways with the wag, sinks a little when low-spirited
      R_.curl.rotation.set(-0.35 * (1 - Math.min(1, p.tailUp)) + 0.35 * lie, 0, Math.sin(t * wf) * wag * 0.22 + p.curl * 0.3); R_.curl.position.x = Math.sin(t * wf) * wag * 0.006 }
    if (R_.hearts) R_.hearts.visible = false
    if (R_.shadow) { R_.shadow.visible = !st.ride; const k = 1 / (1 + p.hop * 9); R_.shadow.scale.set(k * (1 + 0.25 * lie), 1, k) }
  })
  const seg = c.tail.seg, tailChain = (i) => i >= c.tail.n ? null : <group ref={set('t' + i)} position={[0, 0, i === 0 ? 0 : -seg]}>
    <Part mat={i >= c.tail.n - (c.tail.tip ?? 0) ? M.tip || M.belly : c.tail.rings && i % 2 ? M.dark : M.main} pos={[0, 0, -seg * 0.5]} scl={[c.tail.r * (1 - i * c.tail.taper), c.tail.r * (1 - i * c.tail.taper), seg * 0.64]} />{tailChain(i + 1)}</group>
  return <group ref={lodRoot}>
    <group ref={set('shadow')}><mesh geometry={SHADOW.geo} material={SHADOW.mat} scale={[bw * 3.2, 1, bl * 2.7]} position={[0, 0.002, 0]} renderOrder={1} /></group>
    <group ref={set('body')}>
      {species === 'dog' ? <DogBody c={c} M={M} set={set} legs={legs} /> : <CatBody c={c} M={M} set={set} legs={legs} />}
      {species === 'dog'
        ? <group position={[0, bh * (c.tail.up ?? 0.62), -bl * (c.tail.back ?? 0.78)]}><group ref={set('curl')}><ShibaTail c={c} M={M} /></group></group>
        : <group position={[0, bh * (c.tail.up ?? 0.25), -bl * (c.tail.back ?? 0.95)]}>{tailChain(0)}</group>}
      <group position={[0, bh * (c.headUp ?? 0.42), bl * (c.headFwd ?? 0.88)]}><group ref={set('head')}>
        {species === 'dog' ? <ShibaHead c={c} M={M} set={set} /> : <CatHead c={c} M={M} set={set} />}
      </group></group>
    </group>
  </group>
}
// ---------- shared chibi eye (round9, Cozy Chibi pets): big round dark-brown eye, near-black pupil, one large
// shine upper-outer + a tiny one lower-inner. Sits on the head surface, turned to follow it.
function Eye({ c, M, s, set, hr, pos }) {
  const e = c.eye
  return <group ref={set(s > 0 ? 'eyeL' : 'eyeR')} position={pos} rotation={[-0.08, s * 0.42, 0]}>
    <mesh geometry={GEO.sph} material={M.lid} scale={[hr * e * 1.08, hr * e * 1.16, hr * 0.05]} position={[0, 0, -hr * 0.004]} />
    <mesh geometry={GEO.sph} material={M.iris} scale={[hr * e * 0.98, hr * e * 1.06, hr * 0.06]} position={[0, 0, hr * 0.008]} />
    <mesh ref={set(s > 0 ? 'pupilL' : 'pupilR')} geometry={GEO.sph} material={M.pupil} position={[0, -hr * e * 0.08, hr * 0.05]} />
    <mesh geometry={GEO.sph} material={M.shine} position={[s * hr * e * 0.3, hr * e * 0.38, hr * 0.072]} scale={[hr * e * 0.34, hr * e * 0.34, hr * 0.02]} />
    <mesh geometry={GEO.sph} material={M.shine} position={[-s * hr * e * 0.3, -hr * e * 0.42, hr * 0.068]} scale={[hr * e * 0.13, hr * e * 0.13, hr * 0.015]} />
  </group>
}
const Blush = ({ M, hr, x, y, z }) => [-1, 1].map(s => <mesh key={'bl' + s} geometry={GEO.sph} material={M.blush} position={[s * hr * x, hr * y, hr * z]} rotation={[0, s * 0.85, 0]} scale={[hr * 0.15, hr * 0.095, hr * 0.03]} />)
// a short, thick chibi leg: upper (haunch for hind legs), lower capsule, round paw. L = shoulder-to-ground length.
function Leg({ c, M, front, sx, L, upper, lower, paw }) {
  const r = c.legR
  return <>
    {front ? <Part mat={upper} pos={[0, -L * 0.05, 0]} scl={[r * 1.15, L * 0.38, r * 1.25]} />
      : <Part mat={upper} pos={[sx * r * 0.15, -L * 0.02, -r * 0.25]} scl={[r * 1.45, L * 0.55, r * 1.6]} />}
    <Part geo={GEO.cap} mat={lower} pos={[0, -L * 0.52, 0]} scl={[r * 0.95, L * 0.2, r * 1.0]} />
    <Part mat={paw} pos={[0, -L + r * 0.55, r * 0.3]} scl={[r * 1.12, r * 0.62, r * 1.3]} />
  </>
}
// ---------- Pip: chibi Shiba Inu (round9 concept sheet) ----------
// orange back + head, cream chest / belly / legs / lower face, big triangular ears with cream insides, short round
// muzzle, cream brow dots, a fat cream tail curl with an orange swirl over the rump.
function DogBody({ c, M, set, legs }) {
  const [bw, bh, bl] = c.body, L = c.legH + bh * 0.2
  return <>
    <Part gref={set('torso')} mat={M.main} scl={[bw, bh, bl]} />
    <Part mat={M.cream} pos={[0, -bh * 0.46, bl * 0.12]} scl={[bw * 0.84, bh * 0.58, bl * 0.84]} />
    <Part mat={M.cream} pos={[0, -bh * 0.02, bl * 0.62]} scl={[bw * 0.74, bh * 0.82, bl * 0.46]} />
    {[-1, 1].map(sx => <Part key={'h' + sx} mat={M.main} pos={[sx * bw * 0.46, bh * 0.02, -bl * 0.42]} scl={[bw * 0.52, bh * 0.78, bl * 0.52]} />)}
    {legs.map(([k, sx, fz]) => <group key={k} ref={set('leg' + k)} position={[sx * bw * 0.52, -bh * 0.35, fz * bl * 0.56]}>
      <Leg c={c} M={M} front={fz > 0} sx={sx} L={L} upper={fz > 0 ? M.cream : M.main} lower={M.cream} paw={M.cream} />
    </group>)}
  </>
}
// fat curled tail sitting on the rump: a ring of cream fur clumps around an orange swirl, seen face-on from the side
function ShibaTail({ c, M }) {
  const r = c.tail.ring, k = 11, fat = c.tail.r
  return <group rotation={[0.15, 0, 0]}>
    {[...Array(k)].map((_, i) => { const a = i / k * Math.PI * 2, y = Math.sin(a) * r, z = -Math.cos(a) * r
      return <Part key={i} mat={M.cream} pos={[0, y + r, z]} scl={[fat * 0.9, fat * 0.9, fat * 0.9]} out={i % 2 ? null : OUT.pet} /> })}
    <Part mat={M.main} pos={[0, r, 0]} scl={[fat * 1.02, r * 0.48, r * 0.48]} />
    <Part mat={M.cream} pos={[0, r * 1.04, -r * 0.08]} scl={[fat * 1.06, r * 0.2, r * 0.2]} out={null} />
  </group>
}
// ---------- Mochi: chibi Siamese (round9 concept sheet) ----------
// cream coat, dark-brown points (ears, face mask, socks, ringed tail), faint brown back stripes, fluffy chest ruff,
// big ears with pink insides and cream fluff.
function CatBody({ c, M, set, legs }) {
  const [bw, bh, bl] = c.body, L = c.legH + bh * 0.2
  return <>
    <Part gref={set('torso')} mat={M.main} scl={[bw, bh, bl]} />
    <Part mat={M.main} pos={[0, bh * 0.02, -bl * 0.45]} scl={[bw * 1.02, bh * 0.92, bl * 0.55]} />
    <Part mat={M.belly} pos={[0, -bh * 0.05, bl * 0.66]} scl={[bw * 0.72, bh * 0.8, bl * 0.42]} out={null} />
    {/* chest ruff tufts */}
    {[-1, 0, 1].map(sx => <Part key={'ru' + sx} geo={GEO.cone} mat={M.belly} pos={[sx * bw * 0.3, -bh * 0.45, bl * 0.9]} rot={[2.7, 0, sx * 0.35]} scl={[bw * 0.2, bh * 0.4, bw * 0.14]} out={null} />)}
    {c.stripes && [-0.55, -0.2, 0.15].map((z, i) => <Part key={i} mat={M.stripe} pos={[0, bh * 0.62, z * bl]} rot={[0, 0, 0]} scl={[bw * 0.72, bh * 0.38, bl * 0.07]} out={null} />)}
    {legs.map(([k, sx, fz]) => <group key={k} ref={set('leg' + k)} position={[sx * bw * 0.5, -bh * 0.35, fz * bl * 0.58]}>
      <Leg c={c} M={M} front={fz > 0} sx={sx} L={L} upper={M.main} lower={M.dark} paw={M.dark} />
    </group>)}
  </>
}
function CatHead({ c, M, set }) {
  const hr = c.head
  return <>
    <Part mat={M.main} scl={[hr * 1.06, hr * 0.92, hr * 0.88]} />
    {[-1, 1].map(s => <Part key={'ch' + s} geo={GEO.cone} mat={M.main} pos={[s * hr * 0.98, -hr * 0.28, hr * 0.05]} rot={[0, 0, s * 2.05]} scl={[hr * 0.2, hr * 0.3, hr * 0.2]} out={null} />)}
    {/* dark Siamese mask: a soft patch over the muzzle that narrows up between the eyes */}
    <mesh geometry={GEO.sph} material={M.dark} position={[0, -hr * 0.16, hr * 0.54]} scale={[hr * 0.46, hr * 0.42, hr * 0.38]} />
    <mesh geometry={GEO.sph} material={M.dark} position={[0, hr * 0.14, hr * 0.68]} rotation={[-0.25, 0, 0]} scale={[hr * 0.2, hr * 0.36, hr * 0.2]} />
    <mesh geometry={GEO.sph} material={M.dark} position={[0, -hr * 0.3, hr * 0.72]} scale={[hr * 0.24, hr * 0.16, hr * 0.15]} />
    <mesh geometry={GEO.cone} material={M.nose} position={[0, -hr * 0.22, hr * 0.9]} rotation={[Math.PI + 0.35, 0, 0]} scale={[hr * 0.08, hr * 0.06, hr * 0.05]} />
    <group ref={set('mouth')} position={[0, -hr * 0.4, hr * 0.85]}><mesh geometry={GEO.sph} material={M.lip} scale={[hr * 0.09, hr * 0.04, hr * 0.04]} /></group>
    {c.tongue && <group ref={set('tongue')} position={[0, -hr * 0.42, hr * 0.87]}><mesh geometry={GEO.sph} material={M.tongue} scale={[hr * 0.065, hr * 0.1, hr * 0.04]} /></group>}
    {[-1, 1].map(s => <Eye key={s} c={c} M={M} s={s} set={set} hr={hr} pos={[s * hr * 0.4, hr * 0.02, hr * 0.76]} />)}
    <Blush M={M} hr={hr} x={0.66} y={-0.22} z={0.6} />
    {[-1, 1].map(s => <group key={'e' + s} ref={set(s > 0 ? 'earL' : 'earR')} position={[s * hr * 0.56, hr * 0.55, -hr * 0.04]}>
      <Part geo={GEO.cone} mat={M.dark} pos={[0, hr * c.ear * 0.5, 0]} scl={[hr * c.ear * 0.52, hr * c.ear * 1.25, hr * c.ear * 0.26]} />
      <mesh geometry={GEO.cone} material={M.inner} position={[0, hr * c.ear * 0.42, hr * c.ear * 0.1]} scale={[hr * c.ear * 0.34, hr * c.ear * 0.9, hr * c.ear * 0.08]} />
      {[-1, 1].map(k => <mesh key={k} geometry={GEO.cone} material={M.belly} position={[k * hr * c.ear * 0.1, hr * c.ear * 0.18, hr * c.ear * 0.14]} rotation={[0.2, 0, -k * 0.4]} scale={[hr * c.ear * 0.09, hr * c.ear * 0.4, hr * c.ear * 0.05]} />)}
    </group>)}
    {c.whiskers && [-1, 1].flatMap(s => [0, 1].map(j => <mesh key={s + '' + j} geometry={GEO.box} material={M.whisker} position={[s * hr * 0.62, -hr * (0.26 + j * 0.08), hr * 0.66]} rotation={[0, s * 0.5, s * (0.12 - j * 0.24)]} scale={[hr * 0.6, hr * 0.012, hr * 0.012]} />))}
  </>
}
