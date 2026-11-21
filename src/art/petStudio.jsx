// Dev-only pet studio (not a build input; `vite build` only bundles index.html). One pet from the concept-sheet angles.
// /petstudio.html?pet=pip|mochi&pose=stand|sit|lie [&head] [&one] [&closed] [&shut]
import React, { useEffect, useMemo } from 'react'
import { createRoot } from 'react-dom/client'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Quadruped, newPet, POSE0 } from '../pets/Quadruped.jsx'
import { DOG_CFG } from '../pets/Dog.jsx'
import { CAT_CFG } from '../pets/Cat.jsx'
const q = new URLSearchParams(location.search), kind = q.get('pet') || 'pip', pose = q.get('pose') || 'stand', HEAD = q.has('head')
function Stats() { const gl = useThree(s => s.gl); useEffect(() => { gl.info.autoReset = false }, []); useFrame(() => { window.__calls = gl.info.render.calls; window.__tris = gl.info.render.triangles; gl.info.reset() }, -100); return null }
function Pet({ x, yaw, headYaw = 0 }) {
  const st = useMemo(() => newPet(), [])
  const g = { ...POSE0, tailUp: 0.6, tailWag: 0.15, mouth: q.has('shut') ? 0 : 0.35, tongue: q.has('shut') ? 0 : 0.7, eyes: q.has('closed') ? 0 : 1, headYaw, sit: pose === 'sit' ? 1 : 0, lie: pose === 'lie' ? 1 : 0 }
  useEffect(() => { Object.assign(st.goal, g); Object.assign(st.p, g); st.blink = 99 }, [])
  useFrame(() => { st.blink = 99 })
  const cfg = kind === 'pip' ? DOG_CFG : CAT_CFG
  return <group position={[x, 0, 0]} rotation={[0, yaw, 0]}><Quadruped cfg={cfg} st={st} /></group>
}
function Cam() { const cam = useThree(s => s.camera); useEffect(() => { if (HEAD) { cam.position.set(0, 0.16, 1.3); cam.lookAt(0, 0.135, 0) } else { cam.position.set(0, 0.18, 1.6); cam.lookAt(0, 0.09, 0) } cam.updateProjectionMatrix() }, []); return null }
const V = HEAD ? [[-0.2, 0, 0], [0, 0.6, 0], [0.2, Math.PI / 2, 0]] : q.has('one') ? [[0, 0.35, 0]] : [[-1.0, 0.75, 0], [-0.5, Math.PI / 2, 0], [0, 0, 0], [0.5, Math.PI, 0], [1.0, -0.6, 0.3]]
createRoot(document.getElementById('root')).render(<Canvas dpr={2} camera={{ fov: HEAD ? 11 : q.has('one') ? 6 : 23, near: 0.1, far: 20 }} gl={{ antialias: true }}>
  <color attach="background" args={['#fbf1e6']} /><hemisphereLight args={['#fff4e4', '#e8d8c0', 1.15]} /><directionalLight position={[1.5, 3, 4]} intensity={2.2} color="#fff3dc" />
  <Stats /><Cam />{V.map(([x, y, h], i) => <Pet key={i} x={x} yaw={y} headYaw={h} />)}
</Canvas>)
