// Stage C half of the art preview harness (art-c): /preview.html?m=tutorial|fish|fishicons|catch|photo|school. Mock data only.
import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { wind } from '../world.js'
import { Icon, IconDefs } from '../game/icons.jsx'
import './parchment.css'
const q = new URLSearchParams(location.search)
const ready = () => (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => setTimeout(() => document.body.setAttribute('data-ready', '1'), 400))
const css = `html,body{background:radial-gradient(120% 90% at 30% 20%,#cfe6c0,#a9cf8e 60%,#8fbf7a)}
.pc-wrap{position:fixed;inset:0;overflow:auto;padding:24px;display:flex;flex-direction:column;align-items:center;gap:14px}
.pc-sec{font:italic 600 26px TPSerif,Georgia,serif;color:#3b2f22}
.pc-icons{display:grid;grid-template-columns:repeat(6,1fr);gap:12px;width:min(1180px,96vw)}
.pc-ic{display:flex;flex-direction:column;align-items:center;gap:2px;padding:10px 4px 8px;border-radius:14px;background:#fffaf0c8;box-shadow:inset 0 0 0 1.6px #3b2f2250;font:italic 600 17px/1.1 TPSerif,Georgia,serif;text-align:center;color:#3b2f22}
.pc-ic code{font:11px monospace;opacity:.55}.pc-ic small{font:500 12px Fredoka,sans-serif;opacity:.65}
.pc-row{display:flex;gap:18px;align-items:center;flex-wrap:wrap;justify-content:center}
.pc-labels{position:fixed;inset:0;pointer-events:none}
.pc-lab{position:absolute;transform:translate(-50%,0);font:italic 600 19px/1.1 TPSerif,Georgia,serif;color:#3b2f22;background:#fbf3e2e0;padding:2px 10px 4px;border-radius:10px;box-shadow:inset 0 0 0 1.5px #3b2f22aa;white-space:nowrap;text-align:center}
.pc-lab small{display:block;font:500 11px Fredoka,sans-serif;opacity:.6}
.pc-scene{position:fixed;inset:0}
.pc-hud{position:fixed;left:12px;bottom:10px;font:12px monospace;color:#3b2f22;background:#fffaf0c0;padding:4px 8px;border-radius:8px}
.pc-game{position:fixed;inset:0;background:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 60'%3E%3Cdefs%3E%3ClinearGradient id='s' x1='0' y1='0' x2='0' y2='1'%3E%3Cstop offset='0' stop-color='%238ec5e8'/%3E%3Cstop offset='.55' stop-color='%23d9eef2'/%3E%3Cstop offset='.56' stop-color='%23a9cf8e'/%3E%3Cstop offset='1' stop-color='%237fbf6a'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='100' height='60' fill='url(%23s)'/%3E%3Cellipse cx='22' cy='34' rx='26' ry='6' fill='%2390c47a'/%3E%3Cellipse cx='80' cy='35' rx='30' ry='7' fill='%2398c983'/%3E%3C/svg%3E") center/cover}`
function useCss() { useEffect(() => { const s = document.createElement('style'); s.textContent = css; document.head.appendChild(s) }, []) }
// ---------------- tutorial ----------------
const Tut = React.lazy(() => import('../ui/tutorial/TutorialNote.jsx'))
function Tutorial() {
  useCss(); const [mod, setMod] = useState(null)
  useEffect(() => { import('../ui/tutorial/steps.js').then(setMod) }, [])
  const done = +(q.get('done') ?? 3), [open, setOpen] = useState(!q.has('folded')), touch = q.has('touch') || matchMedia('(pointer:coarse)').matches
  useEffect(() => { if (mod) ready() }, [mod])
  if (!mod) return null
  const steps = mod.TUTORIAL_STEPS.map((s, i) => ({ ...s, done: i < done }))
  return <div className="pc-game"><Suspense fallback={null}><Tut steps={steps} touch={touch} open={open} onToggle={setOpen} onDismiss={() => setOpen(false)} /></Suspense></div>
}
// ---------------- fish icons ----------------
function FishIcons() {
  useCss(); const [m, setM] = useState(null)
  useEffect(() => { Promise.all([import('./fish/icons.jsx'), import('../game/fishTable.js'), import('../game/itemsC.js')]).then(([, t, c]) => { setM({ t, c }); ready() }) }, [])
  if (!m) return null
  return <div className="pc-wrap"><IconDefs /><div className="pc-sec">Stage C fish · 12 species</div>
    <div className="pc-icons">{m.t.FISH.map(f => <div key={f.id} className="pc-ic"><Icon id={f.id} size={+(q.get("sz") || 96)} /><span>{m.c.FISH_TEXT[f.id].name}</span><small>{f.rarity} · {f.spots.join('/')}</small><code>{f.id}</code></div>)}</div>
    <div className="pc-sec" style={{ fontSize: 20 }}>Inline sizes (bag / chips)</div>
    <div className="pc-row">{m.t.FISH.map(f => <Icon key={f.id} id={f.id} size={44} />)}</div><div className="pc-row">{m.t.FISH.map(f => <Icon key={f.id} id={f.id} size={28} />)}<Icon id="fish" size={28} /></div></div>
}
// ---------------- catch card ----------------
const Catch = React.lazy(() => import('../ui/fish/CatchCard.jsx'))
function CatchPv() {
  useCss(); useEffect(() => { setTimeout(ready, 600) }, [])
  const id = q.get('fish') || 'koi'
  return <div className="pc-game"><Suspense fallback={null}><Catch fish={id} size={+(q.get('size') || 54.5)} isNew={!q.has('old')} isRecord={q.has('best')} where={q.get('where') || 'lake'} period={q.get('period') || 'day'} weather={q.get('weather') || 'clear'} onClose={() => {}} onRelease={q.has('release') ? () => {} : undefined} /></Suspense></div>
}
// ---------------- 3D: fish lineup / school ----------------
function Stats() { const gl = useThree(s => s.gl), n = useRef(0); useEffect(() => { gl.info.autoReset = false }, [])
  useFrame(() => { window.__calls = gl.info.render.calls; window.__tris = gl.info.render.triangles; gl.info.reset(); if (++n.current > 20) window.__artReady = true }, -100); return null }
function Tick() { useFrame((_, dt) => { if (!q.has('freeze')) wind.time.value += Math.min(dt, 0.05) }); return null }
function Lights() { return <><hemisphereLight args={['#cfe6ff', '#b9d48c', 0.95]} /><directionalLight position={[3, 6, 5]} intensity={2.4} color="#fff3dc" /></> }
function Cam({ pos, look }) { const cam = useThree(s => s.camera); useEffect(() => { cam.position.set(...pos); cam.lookAt(...look); cam.updateProjectionMatrix() }, []); return null }
function Labels({ items }) { const cam = useThree(s => s.camera), size = useThree(s => s.size), [pts, setPts] = useState([])
  useEffect(() => { const v = new THREE.Vector3(); setPts(items.map(it => { v.fromArray(it.p).project(cam); return { ...it, x: (v.x * 0.5 + 0.5) * size.width, y: (-v.y * 0.5 + 0.5) * size.height } })) }, [size])
  useEffect(() => { const host = document.createElement('div'); host.className = 'pc-labels'; host.id = 'pc-labels'; document.body.appendChild(host); return () => host.remove() }, [])
  useEffect(() => { const h = document.getElementById('pc-labels'); if (h) h.innerHTML = pts.map(p => `<div class="pc-lab" style="left:${p.x}px;top:${p.y}px">${p.t}<small>${p.s}</small></div>`).join('') }, [pts]); return null }
function FishLineup({ M, T, C }) {
  const ids = q.get('only') ? [q.get('only')] : T.FISH_IDS, lo = q.get('q') === 'lo', cols = ids.length === 1 ? 1 : 4
  const cells = ids.map((id, i) => { const c = i % cols, r = Math.floor(i / cols); return { id, p: [(c - (cols - 1) / 2) * 1.25, -(r - 1) * 0.95, 0] } })
  const labels = cells.map(c => { const g = M.buildFishGeometry(c.id, lo ? 'lo' : 'hi'); return { p: [c.p[0], c.p[1] - 0.3, 0], t: C.FISH_TEXT[c.id].name, s: `${c.id} · ${g.userData.tris} tris (+ink ${M.fishHullGeometry(g).index ? M.fishHullGeometry(g).index.count / 3 : 0})` } })
  return <><Cam pos={ids.length === 1 ? [0.2, 0.25, 1.6] : [0, 0.25, 7.4]} look={[0, ids.length === 1 ? 0 : 0.05, 0]} /><Lights />
    {cells.map(c => <M.FishModel key={c.id} id={c.id} size={100} scale={c.id === 'pufferfish' ? 0.62 : 0.86} quality={lo ? 'lo' : 'hi'} ink={0.0065} position={c.p} rotation={c.id === 'flounder' ? [0.95, -0.25, 0.15] : [0.12, -0.42, 0.03]} />)}
    {!q.has('nolabels') && <Labels items={labels} />}</>
}
function School({ M }) { const id = q.get('fish') || 'koi', n = +(q.get('n') || 40)
  const items = useMemo(() => [...Array(n)].map((_, i) => { const a = i * 2.39996, r = 0.3 + Math.sqrt(i / n) * 2.2; const qq = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -a + Math.PI / 2 + 0.3, 0)); return { pos: [Math.cos(a) * r, Math.sin(i * 1.7) * 0.15, Math.sin(a) * r], quat: qq.toArray(), s: 0.32 + (i % 5) * 0.04 } }), [n])
  return <><Cam pos={[0, 2.6, 3.8]} look={[0, 0, 0]} /><Lights /><M.FishInstances id={id} items={items} ink={0.004} /></> }
function Scene3D() {
  useCss(); const [m, setM] = useState(null)
  useEffect(() => { Promise.all([import('./fish/FishModel.jsx'), import('../game/fishTable.js'), import('../game/itemsC.js')]).then(([M, T, C]) => setM({ M, T, C })) }, [])
  useEffect(() => { document.body.style.background = 'linear-gradient(#f3ead6,#e6d6b6)' }, [])
  return <><Canvas className="pc-scene" dpr={1} camera={{ fov: 30, near: 0.01, far: 100 }} gl={{ antialias: true, alpha: true }}><Tick /><Stats />
    {m && (MODE === 'school' ? <School M={m.M} /> : <FishLineup {...m} />)}</Canvas>
    <Hud /></>
}
function Hud() { const [s, setS] = useState(''); useEffect(() => { const id = setInterval(() => setS(`draw calls ${window.__calls ?? '-'} · triangles ${window.__tris ?? '-'}`), 400); return () => clearInterval(id) }, []); return q.has('hud') ? <div className="pc-hud">{s}</div> : null }
// ---------------- seasonal forage: icons (top) + 3D props (bottom) ----------------
function Forage() {
  useCss(); const [m, setM] = useState(null)
  useEffect(() => { Promise.all([import('./forage/index.js'), import('../game/itemsC.js')]).then(([F, c]) => { setM({ F, c }); ready() }) }, [])
  if (!m) return null
  const SEAS = { spring: '#f6c6d6', summer: '#bfe3a8', autumn: '#f2c48a', winter: '#cfe0f2' }
  const cells = m.F.FORAGE.map((f, i) => ({ id: f.id, p: [(i - 4) * 0.36, 0, 0] }))
  return <div className="pc-wrap"><IconDefs /><div className="pc-sec">Stage C seasonal forage · 9 items</div>
    <div className="pc-icons" style={{ gridTemplateColumns: 'repeat(9,1fr)' }}>{m.F.FORAGE.map(f => <div key={f.id} className="pc-ic" style={{ background: SEAS[f.season[0]] + 'c8' }}><Icon id={f.id} size={+(q.get('sz') || 92)} /><span>{m.c.FORAGE_RELIC_TEXT[f.id].name}</span><small>{f.season.join('/')} · {f.zone}</small><code>{f.id}</code></div>)}</div>
    <div style={{ width: 'min(1180px,96vw)', height: 300, borderRadius: 16, overflow: 'hidden', boxShadow: 'inset 0 0 0 1.6px #3b2f2250', background: 'linear-gradient(#e9f3df,#cfe3b8)' }}>
      <Canvas dpr={1} camera={{ fov: 22, near: 0.01, far: 30 }} gl={{ antialias: true, alpha: true }}><Tick /><Stats /><Lights /><Cam pos={[0, 0.7, 2.5]} look={[0, 0.08, 0]} />
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.001, 0]}><circleGeometry args={[3, 32]} /><meshToonMaterial color="#a9d384" /></mesh>
        {cells.map((c, i) => <group key={c.id} position={c.p} rotation={[0, 0.5 + i * 0.3, 0]}><m.F.ForageProp item={c.id} s={2.5} /></group>)}</Canvas></div>
    <div className="pc-row">{m.F.FORAGE.map(f => <Icon key={f.id} id={f.id} size={44} />)}</div></div>
}
// ---------------- museum (item 7): ?m=museum&fill=empty|half|full[&touch][&her=0] ----------------
const FILLS = { empty: [], half: ['shard', 'coin', 'relic_bell', 'relic_mask', 'koi'], full: null }
function MuseumPv() {
  useCss(); const [m, setM] = useState(null), touch = q.has('touch')
  useEffect(() => { Promise.all([import('./museum/index.js'), import('../GhibliPerson.jsx')]).then(([M, P]) => { setM({ M, P }); setTimeout(ready, 1500) }) }, [])
  if (!m) return null
  const fill = q.get('fill') || 'half', ids = FILLS[fill] ?? m.M.SLOT_IDS, donated = Object.fromEntries(ids.map(id => [id, 3]))
  const st = { move: 0, phase: 0, t: 0, force: true }
  return <div className="pc-scene" style={{ background: '#2e2420' }}>
    <Canvas dpr={1} camera={{ fov: 56, near: 0.02, far: 20 }} gl={{ antialias: true }}><Tick /><Stats /><Progs />
      <hemisphereLight args={['#fff1d8', '#8a6a4a', 0.9]} /><directionalLight position={[1.5, 3, 2.5]} intensity={1.6} color="#fff0d8" /><pointLight position={[0, 1.1, 0.2]} color="#ffc98a" intensity={1.2} distance={3.5} decay={1.4} />
      <Cam pos={q.has('cam') ? q.get('cam').split(',').map(Number) : [0.2, 0.95, 1.75]} look={[-0.15, 0.22, -0.3]} />
      <group scale={1}><m.M.MuseumInterior donated={donated} touch={touch} onInspect={(id) => { window.__inspected = id }} />
        {q.get('her') !== '0' && <group position={[0.45, 0, 0.62]} rotation={[0, Math.PI + 0.5, 0]}><m.P.Character cfg={m.P.TRAVELLER} st={st} res={touch ? 36 : 84} scale={0.8} /></group>}</group>
    </Canvas><div className="pc-hud" id="pc-hud" /></div>
}
function Progs() { const gl = useThree(s => s.gl); useFrame(() => { window.__progs = gl.info.programs ? gl.info.programs.length : 0; const h = document.getElementById('pc-hud'); if (h) h.textContent = `${window.__calls} calls · ${window.__tris} tris · ${window.__progs} programs` }); return null }
const MODE = q.get('m')
const PhotoPv = React.lazy(() => import('./previewPhoto.jsx'))
export default function PreviewC({ mode }) {
  if (mode === 'tutorial') return <Tutorial />
  if (mode === 'fishicons') return <FishIcons />
  if (mode === 'catch') return <CatchPv />
  if (mode === 'fish' || mode === 'school') return <Scene3D />
  if (mode === 'photo') return <Suspense fallback={null}><PhotoPv /></Suspense>
  if (mode === 'forage') return <Forage />
  if (mode === 'museum') return <MuseumPv />
  return <div>unknown mode</div>
}
export const C_MODES = ['tutorial', 'fishicons', 'catch', 'fish', 'school', 'photo', 'forage', 'museum', 'journal', 'donate', 'hoshino']
