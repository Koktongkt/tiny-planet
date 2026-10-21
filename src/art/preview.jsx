// Dev-only art preview harness (art-b): /preview.html?m=<mode>. Renders each Stage B art module with mock data for
// screenshots and perf checks. Never imported by the game; preview.html is not a build input.
// modes: grid | world | measure | hearts | gifts | reactions | board | board3d | icons | settings
// Stage C (art-c, previewC.jsx): tutorial | fishicons | catch | fish | school | photo
import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import * as THREE from 'three'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import '@fontsource/fredoka/latin-500.css'
import { R, wind } from '../world.js'
import { toon, paint, INK, T, ss, CC } from '../common.jsx'
const q = new URLSearchParams(location.search), MODE = q.get('m') || 'grid'
window.__artReady = false
// time of day with the game's own formulas (time/clock.js + world/sky.jsx Lights): ?t=day|dawn|dusk|night (or ?phase=)
const TOD = { day: 0.35, dusk: 1.72, night: 3.0, dawn: Math.PI * 2 - 1.72 }, TOD_K = q.get('t') || 'day'
{ const p = q.has('phase') ? +q.get('phase') : TOD[TOD_K] ?? 0.35, e = Math.cos(p); window.__rot = { a: p, v: 0 }
  T.sun.set(Math.sin(p) * 0.9, e, 0.55).normalize(); T.day = ss(-0.15, 0.45, e); T.night = 1 - ss(-0.35, 0.05, e); T.dusk = Math.max(0, 1 - Math.abs(e - 0.05) / 0.4) }
const MOON_OFF = new THREE.Vector3(6, 0, 8)
const CROPS = ['skyseed', 'turnip', 'carrot', 'herb'], STAGES = ['seed', 'sprout', 'young', 'mature', 'ripe', 'withered']
const onTop = (x, z) => new THREE.Vector3(x, R, z).normalize().multiplyScalar(R).toArray()
const upQ = (p) => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(...p).normalize()).toArray()
// ---------- 3D bits ----------
function Tick() { useFrame((_, dt) => { if (!q.has('freeze')) wind.time.value += Math.min(dt, 0.05) }); return null }
function Stats() {
  const gl = useThree(s => s.gl), n = useRef(0)
  useEffect(() => { gl.info.autoReset = false }, [])
  useFrame(() => { window.__calls = gl.info.render.calls; window.__tris = gl.info.render.triangles; gl.info.reset(); if (++n.current > 20) window.__artReady = true }, -100)
  return null
}
function Lights({ sun }) { // same colours/intensities as world/sky.jsx Lights, driven by T (sun optional override for daytime framing)
  const sunL = useRef(), moon = useRef(), hemi = useRef()
  useEffect(() => { const dir = sun && TOD_K === 'day' ? new THREE.Vector3(...sun).normalize() : T.sun
    sunL.current.position.copy(dir).multiplyScalar(20); sunL.current.color.set('#fff3dc').lerp(CC('#ffa070'), T.dusk); sunL.current.intensity = 2.6 * ss(-0.2, 0.2, dir.y)
    moon.current.position.copy(T.sun).multiplyScalar(-20).add(MOON_OFF); moon.current.intensity = 1.1 * T.night
    hemi.current.color.set('#cfe6ff').lerp(CC('#ffb59a'), T.dusk).lerp(CC('#4a5fa0'), T.night); hemi.current.groundColor.set('#b9d48c').lerp(CC('#2a2f55'), T.night); hemi.current.intensity = 0.9 + 0.25 * T.dusk - 0.3 * T.night }, [])
  return <><directionalLight ref={sunL} /><directionalLight ref={moon} color="#9db4ff" /><hemisphereLight ref={hemi} /></> }
function Ground() { const m = useMemo(() => paint(toon('#9fd17a'), 0.14, false, 3), []); return <mesh material={m} raycast={() => null}><sphereGeometry args={[R - 0.002, 160, 80, 0, Math.PI * 2, 0, 0.5]} /></mesh> }
function Cam({ pos, look }) { const cam = useThree(s => s.camera); useEffect(() => { cam.position.set(...pos); cam.lookAt(...look); cam.updateProjectionMatrix() }, []); return null }
// DOM labels that follow 3D points
function Labels({ items }) {
  const cam = useThree(s => s.camera), size = useThree(s => s.size), refs = useRef([]), v = useMemo(() => new THREE.Vector3(), [])
  useFrame(() => items.forEach((it, i) => { const el = refs.current[i]; if (!el) return; v.fromArray(it.p).project(cam); el.style.transform = `translate(${(v.x * 0.5 + 0.5) * size.width}px,${(-v.y * 0.5 + 0.5) * size.height}px) translate(-50%,-50%)` }))
  const host = useMemo(() => { const d = document.createElement('div'); d.className = 'pv-labels'; document.body.appendChild(d); return d }, [])
  useEffect(() => { const r = createRoot(host); r.render(<>{items.map((it, i) => <div key={i} ref={el => refs.current[i] = el} className={'pv-lab ' + (it.cls || '')}>{it.t}</div>)}</>); return () => setTimeout(() => r.unmount()) }, [])
  return null
}
const Garden = React.lazy(() => import('./garden/index.js'))
const Board3D = React.lazy(() => import('../ui/errands/NoticeBoard.jsx'))
function Post() { const [P, setP] = useState(null); useEffect(() => { Promise.all([import('@react-three/postprocessing'), import('postprocessing')]).then(([a, b]) => setP({ ...a, BF: b.BlendFunction })) }, []); if (!P || q.has('nopost')) return null
  return <P.EffectComposer multisampling={4}><P.Bloom intensity={0.9} luminanceThreshold={0.93} luminanceSmoothing={0.2} mipmapBlur /><P.Noise opacity={0.12} blendFunction={P.BF.SOFT_LIGHT} /><P.Vignette offset={0.3} darkness={0.55} /></P.EffectComposer> }
function GridScene() {
  const S = 0.37, plots = [], labels = []
  CROPS.forEach((c, i) => STAGES.forEach((st, j) => plots.push({ id: c + st, pos: onTop((j - 2.5) * S, (i - 2) * S), cropId: c, stage: st, watered: st === 'young' || st === 'mature', plantedDay: 0 })))
  ;[['empty-dry', null, false], ['empty-wet', null, true], ['t-wet', 'turnip', true], ['c-dry', 'carrot', false], ['h-wet', 'herb', true], ['s-dry', 'skyseed', false]].forEach(([id, c, w], j) => plots.push({ id, pos: onTop((j - 2.5) * S, 2 * S), cropId: c, stage: c ? 'ripe' : 'seed', watered: w, plantedDay: 0 }))
  STAGES.forEach((st, j) => labels.push({ p: onTop((j - 2.5) * S, -2.62 * S), t: st }))
  CROPS.forEach((c, i) => labels.push({ p: onTop(-3.25 * S, (i - 2) * S), t: c, cls: 'row' }))
  ;['dry', 'wet', 'wet', 'dry', 'wet', 'dry'].forEach((t, j) => labels.push({ p: onTop((j - 2.5) * S, 2.58 * S), t: (j < 2 ? 'empty · ' : 'ripe · ') + t, cls: 'small' }))
  return <><Cam pos={[0, R + 2.85, 2.0]} look={[0, R, 0.12]} /><Lights /><Ground /><Garden plots={plots} onInteract={(id) => console.log('interact', id)} /><Labels items={labels} /></>
}
const MIX = [['skyseed', 'ripe', 1], ['turnip', 'mature', 1], ['carrot', 'ripe', 0], ['herb', 'young', 1], ['carrot', 'sprout', 1], ['turnip', 'ripe', 0], ['herb', 'ripe', 1], ['skyseed', 'young', 0], ['turnip', 'seed', 1], ['carrot', 'mature', 1], ['herb', 'withered', 0], ['skyseed', 'mature', 1]]
const mixPlots = () => MIX.map(([c, st, w], k) => ({ id: 'p' + k, pos: onTop(((k % 3) - 1) * 0.34, (Math.floor(k / 3) - 1.5) * 0.34), cropId: c, stage: st, watered: !!w, plantedDay: 0 }))
function Tufts() { // a little meadow around the garden (preview set dressing only)
  const ref = useRef(), N = 260
  const geo = useMemo(() => { const g = new THREE.IcosahedronGeometry(0.06, 1); g.scale(1, 0.6, 1); return g }, []), mat = useMemo(() => toon('#ffffff'), [])
  useEffect(() => { const o = new THREE.Object3D(), c = new THREE.Color(); let k = 0; for (let i = 0; i < N; i++) { const a = i * 2.39996, r = 0.75 + Math.sqrt(i / N) * 2.6, x = Math.cos(a) * r, z = Math.sin(a) * r; const p = new THREE.Vector3(x, R, z).normalize(); o.position.copy(p).multiplyScalar(R); o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), p); o.scale.setScalar(0.6 + (i % 7) / 7); o.updateMatrix(); ref.current.setMatrixAt(k, o.matrix); ref.current.setColorAt(k++, c.set(['#6fae55', '#7fbf6a', '#5f9e4a', '#8cc46a'][i % 4])) } ref.current.instanceMatrix.needsUpdate = true; ref.current.instanceColor.needsUpdate = true }, [])
  return <instancedMesh ref={ref} args={[geo, mat, N]} raycast={() => null} />
}
function WorldScene() {
  const [plots, setPlots] = useState(mixPlots)
  return <><Cam pos={[1.5, R + 1.05, 2.05]} look={[0.05, R + 0.02, -0.1]} /><Lights sun={[0.8, 0.75, 0.35]} /><Ground /><Tufts />
    <Garden plots={plots} onInteract={(id) => setPlots(ps => ps.map(p => p.id === id ? { ...p, watered: !p.watered } : p))} />
    <Board3D position={onTop(-0.95, -0.6)} quaternion={upQ(onTop(-0.95, -0.6))} notes={3} />
    <Post /></>
}
function MeasureScene() { const only = q.get('only') !== '0', lo = q.get('q') === 'lo', d = +(q.get('d') || 2.2)
  return <><Cam pos={[0, R + d * 0.55, d]} look={[0, R, 0]} /><Lights />{!only && <Ground />}<Garden plots={mixPlots()} quality={lo ? 'lo' : 'hi'} /></> }
function Scene3D() {
  return <Canvas dpr={1} camera={{ fov: 30, near: 0.01, far: 100 }} gl={{ antialias: true, alpha: true }} style={{ position: 'fixed', inset: 0 }}>
    <Tick /><Stats /><Suspense fallback={null}>{MODE === 'grid' ? <GridScene /> : MODE === 'world' ? <WorldScene /> : MODE === 'board3d' ? <BoardScene /> : <MeasureScene />}</Suspense>
  </Canvas>
}
function BoardScene() { return <><Cam pos={[0.9, R + 0.75, 1.5]} look={[0, R + 0.32, 0]} /><Lights sun={[0.7, 0.8, 0.9]} /><Ground /><Board3D position={[0, R, 0]} notes={+(q.get('notes') ?? 3)} /><Post /></> }
// ---------- DOM bits (lazy) ----------
const DomPreview = React.lazy(() => import('./previewDom.jsx'))
const PreviewC = React.lazy(() => import('./previewC.jsx')), IS_C = ['tutorial', 'fishicons', 'catch', 'fish', 'school', 'photo'].includes(MODE)
const is3D = ['grid', 'world', 'measure', 'board3d'].includes(MODE)
document.body.classList.add('pv-' + MODE, 'tod-' + TOD_K)
const css = document.createElement('style'); css.textContent = `
.pv-labels{position:fixed;inset:0;pointer-events:none;z-index:3}
.pv-lab{position:absolute;left:0;top:0;font:italic 600 20px/1 TPSerif,Georgia,serif;color:#3b2f22;background:#fbf3e2d8;padding:2px 10px 4px;border-radius:10px;box-shadow:inset 0 0 0 1.5px #3b2f22aa;white-space:nowrap}
.pv-lab.row{font-size:19px}.pv-lab.small{font-size:15px;padding:1px 8px 3px}
body.pv-grid,body.pv-world,body.pv-board3d,body.pv-measure{background:linear-gradient(#8ec5e8 0,#bfe0ef 45%,#fdf3d8 100%)}
body.tod-dusk{background:linear-gradient(#6b6fa8 0,#c97f9a 40%,#f78fa0 62%,#ffb38a 100%)!important}
body.tod-dawn{background:linear-gradient(#8e9ccf 0,#d8b4c4 45%,#f6c9b0 70%,#fde3c4 100%)!important}
body.tod-night{background:linear-gradient(#0e1330 0,#141a3a 45%,#2e3c6e 100%)!important}
body.tod-night .pv-lab{background:#2e3c6ed0;color:#f3e6c8;box-shadow:inset 0 0 0 1.5px #f3e6c8aa}`
document.head.appendChild(css)
createRoot(document.getElementById('root')).render(IS_C ? <Suspense fallback={null}><PreviewC mode={MODE} /></Suspense> : is3D ? <Scene3D /> : <Suspense fallback={null}><DomPreview mode={MODE} /></Suspense>)
