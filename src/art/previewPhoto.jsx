// Photo-mode preview (art-c): her + Pip + Mochi posed on a little meadow, the live CSS filter on the canvas and the
// PhotoMode UI on top. ?filter=<id>&pose=<her pose>&pair=<pair id>&pip=<pose>&mochi=<pose>&tab=filters|her|pets&grid&frame&shot
import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { wind } from '../world.js'
import { toon } from '../common.jsx'
import { tickAct } from '../act.js'
import { Character, TRAVELLER } from '../GhibliPerson.jsx'
import { Quadruped, newPet, POSE0 } from '../pets/Quadruped.jsx'
import { DOG_CFG } from '../pets/Dog.jsx'
import { CAT_CFG, CAT_SCALE } from '../pets/Cat.jsx'
import { PhotoMode, PHOTO_DEFAULT } from '../ui/photo/PhotoMode.jsx'
import { applyLiveFilter, gradeCanvas, photoThumb } from '../ui/photo/filters.js'
import { holdHerPose } from './poses/herPoses.js'
import { applyPetPose, PAIR_POSES } from './poses/petPoses.js'
const q = new URLSearchParams(location.search)
if (q.has('dbg')) import('../act.js').then(({ POSES }) => { POSES.photo_dbg = (B, mix) => { mix(B.upR, 'x', +q.get('x') || 0); mix(B.upR, 'y', +q.get('y') || 0); mix(B.upR, 'z', +q.get('z') || 0); mix(B.foR, 'x', +q.get('f') || 0) } })
const DEF_AT = { pip: { at: [0.2, 0.12], yaw: -0.5 }, mochi: { at: [-0.18, 0.12], yaw: 0.5 } }
function Tick() { useFrame((_, dt) => { wind.time.value += Math.min(dt, 0.05) }); return null }
function Stats() { const gl = useThree(s => s.gl), n = useRef(0); useEffect(() => { gl.info.autoReset = false }, [])
  useFrame(() => { window.__calls = gl.info.render.calls; window.__tris = gl.info.render.triangles; gl.info.reset(); if (++n.current > 40) window.__artReady = true }, -100); return null }
function Her({ pose }) {
  const st = useMemo(() => ({ phase: 0, move: 0, t: 0, turn: 0, dist: 0, look: 0 }), [])
  useEffect(() => { holdHerPose(pose); if (q.has('dbg')) setTimeout(() => { window.__act.kind = 'photo_dbg' }, 300) }, [pose])
  useFrame(() => { tickAct(st); st.t = wind.time.value; window.__herSt = st })
  return <Character cfg={TRAVELLER} st={st} res={84} />
}
function Pet({ kind, pose, at, yaw }) {
  const st = useMemo(() => newPet(), [])
  useEffect(() => { if (pose) applyPetPose(st, kind, pose, POSE0); else { Object.assign(st.goal, POSE0, { sit: 1, tailWag: 0.5 }) } }, [pose])
  const cfg = kind === 'pip' ? DOG_CFG : CAT_CFG, s = kind === 'pip' ? DOG_CFG.s : CAT_SCALE
  return <group position={[at[0], 0, at[1]]} rotation={[0, yaw, 0]}><group scale={s}><Quadruped cfg={cfg} st={st} /></group></group>
}
function Meadow() {
  const m = useMemo(() => ({ g: toon('#9fd17a'), g2: toon('#7fbf6a'), tr: toon('#4f8f4a'), tr2: toon('#5f9f52'), wood: toon('#8a5a3c'), wall: toon('#fbf3e4'), roof: toon('#d9655b'), fl: toon('#f4b6c8'), fl2: toon('#fff1b8') }), [])
  const flowers = useMemo(() => [...Array(40)].map((_, i) => { const a = i * 2.4, r = 0.35 + (i % 9) * 0.12; return [Math.cos(a) * r, 0.012, Math.sin(a) * r - 0.4] }), [])
  return <group>
    <mesh material={m.g} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[12, 48]} /></mesh>
    <mesh material={m.g2} position={[0, -0.02, -2.6]} scale={[5, 0.6, 1.4]}><sphereGeometry args={[1, 24, 12]} /></mesh>
    {[[-0.9, -1.1, 0.34], [1.05, -1.4, 0.42], [-1.5, -2.2, 0.5], [1.7, -2.6, 0.55]].map(([x, z, s], i) => <group key={i} position={[x, 0, z]}><mesh material={m.wood} position={[0, s * 0.5, 0]}><cylinderGeometry args={[s * 0.07, s * 0.09, s, 6]} /></mesh><mesh material={i % 2 ? m.tr : m.tr2} position={[0, s * 1.15, 0]} scale={[s * 0.6, s * 0.55, s * 0.6]}><icosahedronGeometry args={[1, 1]} /></mesh></group>)}
    <group position={[0.35, 0, -1.9]} rotation={[0, -0.5, 0]}><mesh material={m.wall} position={[0, 0.17, 0]}><boxGeometry args={[0.42, 0.34, 0.36]} /></mesh><mesh material={m.roof} position={[0, 0.4, 0]} rotation={[0, Math.PI / 4, 0]}><coneGeometry args={[0.36, 0.2, 4]} /></mesh></group>
    {flowers.map((p, i) => <mesh key={i} material={i % 3 ? m.fl : m.fl2} position={p}><sphereGeometry args={[0.012, 6, 4]} /></mesh>)}
  </group>
}
function Cam() { const cam = useThree(s => s.camera); useEffect(() => { const port = innerWidth < innerHeight; cam.position.set(0.05, port ? 0.34 : 0.3, port ? 1.75 : 0.95); cam.lookAt(0, port ? 0.12 : 0.15, 0); cam.updateProjectionMatrix() }, []); return null }
function FilterOnCanvas({ id }) { const gl = useThree(s => s.gl); useEffect(() => applyLiveFilter(gl.domElement, id), [id]); return null }
export default function PreviewPhoto() {
  const pair = q.get('pair'), P = pair && PAIR_POSES[pair]
  const [v, setV] = useState({ ...PHOTO_DEFAULT, filter: q.get('filter') || 'none', pose: P ? P.her : q.get('pose') || 'stand', pair: pair || null, grid: q.has('grid'), frame: q.has('frame'), hideUI: q.has('hide'),
    petPose: { pip: P ? P.pip.pose : q.get('pip') || 'sit', mochi: P ? P.mochi.pose : q.get('mochi') || 'sit' } })
  const [last, setLast] = useState(null), glRef = useRef()
  const lay = v.pair ? PAIR_POSES[v.pair] : DEF_AT
  const shoot = () => { const gl = glRef.current; if (!gl) return; requestAnimationFrame(() => { const src = gl.domElement, out = gradeCanvas(src, v.filter, { frame: v.frame, caption: 'Day 3 · Spring · the meadow' }); setLast({ url: photoThumb(out, 360), caption: 'Saved to your journal' }); window.__lastShot = out }) }
  useEffect(() => { document.body.style.background = '#a8d4ec'; if (q.has('shot')) setTimeout(shoot, 2500) }, [])
  return <>
    <Canvas style={{ position: 'fixed', inset: 0 }} dpr={1} camera={{ fov: 35, near: 0.01, far: 60 }} gl={{ antialias: true, preserveDrawingBuffer: true }} onCreated={({ gl }) => { glRef.current = gl }}>
      <color attach="background" args={['#a8d4ec']} /><fog attach="fog" args={['#cfe6f0', 3, 9]} />
      <hemisphereLight args={['#cfe6ff', '#b9d48c', 1.0]} /><directionalLight position={[2, 4, 3]} intensity={2.5} color="#fff3dc" />
      <Tick /><Stats /><Cam /><FilterOnCanvas id={v.filter} />
      <Suspense fallback={null}><Meadow /><Her pose={v.pose} />
        <Pet kind="pip" pose={v.petPose.pip} at={lay.pip.at} yaw={lay.pip.yaw} /><Pet kind="mochi" pose={v.petPose.mochi} at={lay.mochi.at} yaw={lay.mochi.yaw} /></Suspense>
    </Canvas>
    <PhotoMode value={v} onChange={setV} onShutter={shoot} onClose={() => {}} touch={matchMedia('(pointer:coarse)').matches} lastShot={last} defaultTab={q.get('tab') || 'filters'} />
  </>
}
