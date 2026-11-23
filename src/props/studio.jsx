// Dev-only chibi prop studio (not a build input; `vite build` only bundles index.html).
// /propstudio.html            every item in a grid, with her standing in the middle for scale
// /propstudio.html?id=bed     one item, turning      &spin=0 to hold still   &yaw=0.6   &her=0 to hide her
import React, { Suspense, lazy, useEffect, useRef } from 'react'
import { createRoot } from 'react-dom/client'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { CATALOG } from './index.js'
import './items/exterior.js'
import { Prop } from './Prop.jsx'
const ChibiHer = lazy(() => import('../art/chibi/ChibiHer.jsx').then(m => ({ default: m.ChibiHer })))
const q = new URLSearchParams(location.search), ONE = q.get('id'), SPIN = q.get('spin') !== '0', YAW = +(q.get('yaw') ?? 0.5), HER = q.get('her') !== '0'
const S = 1.25 // room units -> world units (her house scale), so the props sit at her true size
function Stats() { const gl = useThree(s => s.gl), scene = useThree(s => s.scene); window.__scene = scene; useEffect(() => { gl.info.autoReset = false }, []); useFrame(() => { window.__calls = gl.info.render.calls; window.__tris = gl.info.render.triangles; gl.info.reset() }, -100); return null }
function Turn({ children, x, z }) { const r = useRef(); useFrame((_, dt) => { if (r.current && SPIN && ONE) r.current.rotation.y += dt * 0.5 }); return <group ref={r} position={[x, 0, z]} rotation={[0, ONE ? YAW : 0, 0]}>{children}</group> }
const st = { phase: 0, move: 0, t: 0, turn: 0, dist: 0, seed: 0 }
function Her({ x, z }) { return HER ? <group position={[x, 0, z]} rotation={[0, 0.25, 0]}><Suspense fallback={null}><ChibiHer st={st} /></Suspense></group> : null }
function Label({ y, text }) { return <Html position={[0, y, 0.5]} center style={{ pointerEvents: 'none', whiteSpace: 'nowrap', font: '600 13px Fredoka, system-ui', color: '#6a4632', background: 'rgba(255,250,242,.85)', padding: '2px 8px', borderRadius: 10 }}>{text}</Html> }
function Cam() { const cam = useThree(s => s.camera); useEffect(() => { if (ONE) { const [w, h] = CATALOG[ONE].size, R = Math.max(w * S + 0.6, h * S * 1.15, 0.65); cam.position.set(0, 0.3 + R * 0.75, R * 2.6); cam.lookAt(0, Math.min(h * S, 0.6) * 0.45, 0) } else { cam.position.set(0, 4.6, 7.6); cam.lookAt(0, 0.1, 0.25) } }, []); return null }
const ids = ONE ? [ONE] : ['her', ...Object.keys(CATALOG)], COLS = 4, GAP = 1.35
function Grid() {
  return ids.map((id, i) => { const c = i % COLS, r = Math.floor(i / COLS), x = ONE ? 0.25 : (c - (COLS - 1) / 2) * GAP, z = ONE ? 0 : (r - 1) * 1.25
    if (id === 'her') return <group key={id}><Her x={x} z={z} /><group position={[x, 0, z]}><Label y={-0.02} text="her (for scale)" /></group></group>
    return <group key={id}><Turn x={x} z={z}><group scale={S}><Prop id={id} /></group></Turn>{!ONE && <group position={[x, 0, z]}><Label y={-0.02} text={CATALOG[id].name} /></group>}</group> })
}
createRoot(document.getElementById('root')).render(<Canvas dpr={2} camera={{ fov: 22, near: 0.1, far: 40 }} gl={{ antialias: true }}>
  <color attach="background" args={['#f3e6f2']} />
  <hemisphereLight args={['#fff4e8', '#f0d6c8', 1.25]} /><directionalLight position={[-2, 4, 3]} intensity={2.0} color="#fff1da" />
  <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.001, 0]}><circleGeometry args={[ONE ? 0.8 : 3.4, 48]} /><meshBasicMaterial color="#f8ecdf" /></mesh>
  <Stats /><Cam /><Grid />{ONE && <Her x={-0.25 - CATALOG[ONE].size[0] * S / 2} z={0.05} />}
</Canvas>)
