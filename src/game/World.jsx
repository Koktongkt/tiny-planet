// 3D side of Gather & Craft: gatherable props, sheep, fireflies, the Home bench + sign, placed decor + ghost preview,
// the rope bridge + cliff-top reward, the player's lantern, and the proximity/interaction loop.
import { onTap } from '../touch.jsx'
import { startAct, ACT, FREEZE } from '../act.js'
import * as THREE from 'three'
import React, { useMemo, useRef, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { R, height, place, around, ZONES, LAKE_W, HARB_W, CLIFF_H } from '../world.js'
import { T, C, toon, glow, planetRef } from '../common.jsx'
import { G, emit, add, markTaken, available, toast, count, take } from './store.js'
import { SPAWNS, NEEDS_TOOL, ITEMS, DECOR } from './items.js'

const q = new URLSearchParams(location.search)
let seed = 4242; const rr = () => (seed = (seed * 16807) % 2147483647) / 2147483647
const toward = (c, t, a) => { c = c.clone().normalize(); const d = t.clone().addScaledVector(c, -c.dot(t)).normalize(); return c.multiplyScalar(Math.cos(a)).addScaledVector(d, Math.sin(a)).normalize() }
const UPV = new THREE.Vector3(0, 1, 0)
export const GAME = { P: null, blocked: () => false, village: null, Zc: null, home: null, actions: {} }
const posOf = (n, lift = 0) => n.clone().normalize().multiplyScalar(R + height(n) + lift)

// ---------- layout (deterministic, so saved respawn state keeps matching) ----------
let LAYOUT = null
export function layout(Zc, village, homeN, blocked) {
  if (LAYOUT) return LAYOUT
  GAME.Zc = Zc; GAME.village = village; GAME.blocked = blocked
  const spots = [], zc = (z) => z === 'village' ? village : Zc[z], zr = (z) => z === 'village' ? 0.06 : ZONES[z].r
  for (const [zone, item, n, mode] of SPAWNS) {
    for (let i = 0, tries = 0; i < n && tries < 400; tries++) {
      const c = zc(zone), r = zr(zone); let pn, stand, lift = 0
      const wetZ = zone === 'lake' || zone === 'harbour'
      if (mode === 'shore' || (wetZ && mode !== 'water')) pn = around(c, r * (1.03 + rr() * 0.11), rr() * 6.283)
      else if (mode === 'water') { const b = rr() * 6.283; pn = around(c, r * 0.86, b); stand = around(c, r * 1.04, b) }
      else if (mode === 'edge') pn = around(c, r * (0.88 + rr() * 0.12), rr() * 6.283)
      else if (mode === 'base') pn = toward(c, Zc.lake, r + 0.03 + rr() * 0.05).applyAxisAngle(c, (rr() - 0.5) * 2.2)
      else if (mode === 'spring') pn = toward(c, Zc.lake, r + 0.05)
      else pn = around(c, Math.sqrt(rr()) * r * (zone === 'forest' ? 0.8 : 0.85), rr() * 6.283)
      if (mode !== 'water' && blocked(pn) && tries < 300) continue
      const id = `${item}-${zone}-${i}`
      const water = mode === 'water'
      const level = zone === 'lake' ? LAKE_W : HARB_W
      const pos = water ? pn.clone().multiplyScalar(R + level + 0.01) : posOf(pn, lift)
      spots.push({ id, item, zone, n: pn, stand: stand || pn, pos, standPos: stand ? posOf(stand) : pos, night: mode === 'night', water, spin: rr() * 6.28, s: 1.35 + rr() * 0.35 })
      i++
    }
  }
  // showcase cluster in the forest (for the gather screenshot / first-time players)
  const fc = toward(Zc.forest, GAME.P ? GAME.P.n : Zc.meadow, ZONES.forest.r * 1.2)
  ;[['mushroom', 0, 0], ['wood', 0.04, 0.9], ['moss', 0.035, -1.0], ['acorn', 0.05, 2.4], ['pinecone', 0.06, -2.2]].forEach(([item, d, b], k) => { const pn = around(fc, d, b); spots.push({ id: `${item}-show-${k}`, item, zone: 'forest', n: pn, stand: pn, pos: posOf(pn), standPos: posOf(pn), spin: k * 1.7, s: 1.5 }) })
  // home bench, sign
  const hp = place(homeN, 0, 0)
  const benchN = posOf(homeN).add(new THREE.Vector3(0.48, 0, 0.42).applyQuaternion(hp.q)).normalize()
  const signN = posOf(homeN).add(new THREE.Vector3(-0.42, 0, 0.5).applyQuaternion(hp.q)).normalize()
  // rope bridge up the cliff, on the side away from the lake
  const cc = Zc.cliff, cr = ZONES.cliff.r, awayAz = toward(cc, Zc.lake, 0.2).clone()
  const out = toward(cc, cc.clone().multiplyScalar(2).sub(awayAz), 1) // dummy init
  const dirAway = cc.clone().sub(toward(cc, Zc.lake, 0.05)).normalize()
  const A = toward(cc, cc.clone().add(dirAway), cr + 0.24), B = toward(cc, cc.clone().add(dirAway), cr - 0.03)
  const top = toward(cc, cc.clone().add(dirAway), cr * 0.35)
  G.benchPos = posOf(benchN); LAYOUT = window.__layout = { spots, bench: { n: benchN, pos: posOf(benchN), q: place(benchN, 0, 0).q }, sign: { n: signN, pos: posOf(signN) }, homeN, homePos: posOf(homeN), bridge: { A, B, hA: height(A) + 0.03, hB: height(B) + 0.012, top, chest: toward(top, B, 0.022).applyAxisAngle(top, 1.3).normalize() } }
  void out
  if (q.get('decor') === 'demo') { const hpos = posOf(homeN); G.s.placed = [['wreath', 0.3, 0.55, 0], ['basket', 0.62, 0.2, 0.6], ['mosslamp', 0.18, 0.72, 0], ['chime', 0.75, -0.15, 0.3]].map(([item, x, z, rot], i) => ({ uid: 'demo' + i, item, rot, n: hpos.clone().add(new THREE.Vector3(x, 0, z).applyQuaternion(hp.q)).normalize().toArray() })) }
  if (q.has('place')) G.ui.place = { item: q.get('place'), rot: 0.6 }
  return LAYOUT
}
// rope-bridge helpers used by the player controller
export function ropeT(n) { // returns {t, s} along the bridge or null
  if (!LAYOUT || !G.s.unlocked.bridge) return null
  const { A, B } = LAYOUT.bridge, ab = B.clone().sub(A), L2 = ab.lengthSq(), t = n.clone().sub(A).dot(ab) / L2
  const side = n.clone().sub(A.clone().addScaledVector(ab, t)).length() * R
  return { t, side }
}
export function ropeLift(n) {
  const r = ropeT(n); if (!r || r.t < 0 || r.t > 1.02 || r.side > 0.14) return 0
  const { hA, hB } = LAYOUT.bridge, tt = Math.min(1, r.t), h = hA + (hB - hA) * tt - 0.05 * Math.sin(Math.PI * tt)
  return Math.max(0, h - height(n))
}
export const ropePass = (n) => { const r = ropeT(n); return !!r && r.t > -0.05 && r.t < 1.2 && r.side < 0.16 }

// ---------- prop meshes ----------
const _sx = new THREE.Vector3(), _sm = new THREE.Matrix4()
const hullMat = new THREE.MeshBasicMaterial({ color: '#4a3a35', side: THREE.BackSide })
const M = {}; const m = (k, c) => (M[k] = M[k] || toon(c))
function Mx({ geo, mat, hull = 1.12, ...p }) { return <group {...p}><mesh geometry={geo} material={mat} />{hull && <mesh geometry={geo} material={hullMat} scale={hull} />}</group> }
const GE = (() => {
  const g = {}
  g.sph = new THREE.SphereGeometry(1, 16, 12); g.cyl = new THREE.CylinderGeometry(1, 1, 1, 12); g.cone = new THREE.ConeGeometry(1, 1, 12); g.box = new THREE.BoxGeometry(1, 1, 1)
  g.cap = new THREE.SphereGeometry(1, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2); g.ico = new THREE.IcosahedronGeometry(1, 0); g.tor = new THREE.TorusGeometry(1, 0.18, 8, 24)
  g.ring = new THREE.RingGeometry(0.8, 1, 32)
  return g
})()
function Prop({ item, s = 1 }) {
  const t = (k, c) => m(k, c)
  switch (item) {
    case 'wood': return <group scale={s}><Mx geo={GE.cyl} mat={t('wood', '#a8744c')} scale={[0.028, 0.16, 0.028]} position={[0, 0.03, 0]} rotation={[0, 0, Math.PI / 2 - 0.15]} /><Mx geo={GE.cyl} mat={t('wood2', '#8a5a3c')} scale={[0.024, 0.13, 0.024]} position={[0.01, 0.07, 0.02]} rotation={[0.3, 0.6, Math.PI / 2 + 0.1]} /><Mx geo={GE.sph} mat={t('leaf', '#9cc46a')} scale={[0.02, 0.012, 0.03]} position={[0.05, 0.1, 0.03]} /></group>
    case 'pinecone': return <group scale={s}><Mx geo={GE.cone} mat={t('pine', '#a8744c')} scale={[0.032, 0.07, 0.032]} position={[0, 0.035, 0]} rotation={[Math.PI, 0, 0]} /><Mx geo={GE.sph} mat={t('pine', '#a8744c')} scale={0.03} position={[0, 0.06, 0]} /></group>
    case 'mushroom': return <group scale={s}><Mx geo={GE.cyl} mat={t('stem', '#fbf3e4')} scale={[0.018, 0.06, 0.018]} position={[0, 0.03, 0]} /><Mx geo={GE.cap} mat={t('mush', '#d9564a')} scale={[0.05, 0.04, 0.05]} position={[0, 0.058, 0]} />{[[0.02, 0.085, 0.018], [-0.022, 0.08, 0.008], [0.004, 0.096, -0.016]].map((p, i) => <mesh key={i} geometry={GE.sph} material={t('dots', '#fffaf0')} scale={0.008} position={p} />)}<Mx geo={GE.cap} mat={t('mush', '#d9564a')} scale={[0.028, 0.024, 0.028]} position={[0.05, 0.03, 0.02]} /><mesh geometry={GE.cyl} material={t('stem', '#fbf3e4')} scale={[0.01, 0.03, 0.01]} position={[0.05, 0.015, 0.02]} /></group>
    case 'acorn': return <group scale={s}><Mx geo={GE.sph} mat={t('acorn', '#c98a4a')} scale={[0.026, 0.032, 0.026]} position={[0, 0.03, 0]} /><Mx geo={GE.cap} mat={t('acap', '#7a5236')} scale={[0.029, 0.02, 0.029]} position={[0, 0.045, 0]} /><Mx geo={GE.sph} mat={t('acorn', '#c98a4a')} scale={[0.02, 0.025, 0.02]} position={[0.04, 0.022, 0.01]} rotation={[0, 0, 1.2]} /></group>
    case 'moss': case 'glowmoss': { const gm = item === 'glowmoss'; return <group scale={s}><Mx geo={GE.ico} mat={gm ? G_GLOW : t('mossm', '#6f9e4f')} scale={[0.07, 0.035, 0.06]} position={[0, 0.012, 0]} hull={gm ? 0 : 1.1} /><Mx geo={GE.ico} mat={gm ? G_GLOW : t('mossl', '#8fbf6a')} scale={[0.04, 0.03, 0.04]} position={[0.04, 0.02, 0.02]} hull={gm ? 0 : 1.1} /><Mx geo={GE.ico} mat={t('rock', '#b8b0a4')} scale={[0.05, 0.03, 0.04]} position={[-0.04, 0.01, -0.03]} /></group> }
    case 'flower': return <group scale={s}>{[[0, 0], [0.03, 0.02], [-0.025, 0.025], [0.01, -0.03]].map(([x, z], i) => <group key={i} position={[x, 0, z]}><mesh geometry={GE.cyl} material={t('stemg', '#5a8a44')} scale={[0.004, 0.09, 0.004]} position={[0, 0.045, 0]} /><Mx geo={GE.ico} mat={t('fl' + i, ['#f59ab0', '#ffd36e', '#c9b3ff', '#fffaf0'][i])} scale={[0.022, 0.012, 0.022]} position={[0, 0.092, 0]} /></group>)}</group>
    case 'herbs': return <group scale={s}>{[0, 1, 2, 3, 4].map(i => <Mx key={i} geo={GE.sph} mat={t('herb', '#8fbf6a')} scale={[0.012, 0.045, 0.02]} position={[Math.cos(i * 1.3) * 0.02, 0.04, Math.sin(i * 1.3) * 0.02]} rotation={[Math.sin(i) * 0.5, i, Math.cos(i) * 0.5]} />)}</group>
    case 'berries': return <group scale={s}><Mx geo={GE.ico} mat={t('bush', '#5f8f4a')} scale={[0.08, 0.06, 0.07]} position={[0, 0.05, 0]} />{[[0.05, 0.07, 0.04], [-0.04, 0.08, 0.05], [0.02, 0.1, -0.05], [-0.05, 0.05, -0.02], [0.06, 0.04, -0.02]].map((p, i) => <Mx key={i} geo={GE.sph} mat={t('berry', '#c94a6a')} scale={0.014} position={p} hull={1.2} />)}</group>
    case 'fluff': return <group scale={s}><mesh geometry={GE.cyl} material={t('stemg', '#5a8a44')} scale={[0.004, 0.11, 0.004]} position={[0, 0.055, 0]} /><Mx geo={GE.sph} mat={t('fluffm', '#fffaf0')} scale={0.032} position={[0, 0.12, 0]} hull={1.08} /></group>
    case 'shell': return <group scale={s}><Mx geo={GE.cone} mat={t('shell', '#f6c8b0')} scale={[0.03, 0.05, 0.022]} position={[0, 0.012, 0]} rotation={[Math.PI / 2, 0, 0.3]} /></group>
    case 'reed': return <group scale={s}>{[0, 1, 2].map(i => <group key={i} position={[(i - 1) * 0.025, 0, (i % 2) * 0.02]} rotation={[0, 0, (i - 1) * 0.15]}><mesh geometry={GE.cyl} material={t('reedg', '#7fae5f')} scale={[0.004, 0.2, 0.004]} position={[0, 0.1, 0]} /><Mx geo={GE.sph} mat={t('cat', '#a8744c')} scale={[0.01, 0.03, 0.01]} position={[0, 0.2, 0]} hull={1.2} /></group>)}</group>
    case 'clay': return <group scale={s}><Mx geo={GE.sph} mat={t('clay', '#b8aca0')} scale={[0.06, 0.025, 0.05]} position={[0, 0.008, 0]} /><Mx geo={GE.sph} mat={t('clay', '#b8aca0')} scale={[0.03, 0.02, 0.03]} position={[0.04, 0.015, 0.02]} /></group>
    case 'driftwood': return <group scale={s}><Mx geo={GE.cyl} mat={t('drift', '#c8bca8')} scale={[0.02, 0.2, 0.02]} position={[0, 0.015, 0]} rotation={[0.2, 0.4, Math.PI / 2]} /><Mx geo={GE.cyl} mat={t('drift', '#c8bca8')} scale={[0.012, 0.07, 0.012]} position={[0.04, 0.035, 0.02]} rotation={[0, 0, 0.6]} /></group>
    case 'rice': return <group scale={s}>{[0, 1, 2, 3].map(i => <group key={i} position={[Math.cos(i * 1.6) * 0.015, 0, Math.sin(i * 1.6) * 0.015]} rotation={[Math.sin(i) * 0.25, 0, Math.cos(i) * 0.25]}><mesh geometry={GE.cyl} material={t('ricest', '#a8944a')} scale={[0.003, 0.12, 0.003]} position={[0, 0.06, 0]} /><Mx geo={GE.sph} mat={t('riceg', '#f2d27a')} scale={[0.009, 0.028, 0.009]} position={[0.008, 0.12, 0]} rotation={[0, 0, -0.5]} hull={1.2} /></group>)}<Mx geo={GE.cyl} mat={t('tie', '#d9655b')} scale={[0.014, 0.008, 0.014]} position={[0, 0.05, 0]} /></group>
    case 'bamboo': return <group scale={s}>{[0, 1, 2].map(i => <group key={i} position={[(i - 1) * 0.03, 0, (i % 2) * 0.025]}><Mx geo={GE.cyl} mat={t('bam', '#8fbf6a')} scale={[0.011, 0.34 - i * 0.05, 0.011]} position={[0, 0.17 - i * 0.025, 0]} hull={1.25} />{[0.08, 0.18].map(y => <mesh key={y} geometry={GE.cyl} material={t('bamk', '#6f9e4f')} scale={[0.013, 0.006, 0.013]} position={[0, y, 0]} />)}<Mx geo={GE.sph} mat={t('bleaf', '#7fae5f')} scale={[0.04, 0.008, 0.012]} position={[0.03, 0.3 - i * 0.05, 0]} rotation={[0, i, 0.4]} /></group>)}</group>
    case 'tea': return <group scale={s}><Mx geo={GE.ico} mat={t('teab', '#5a8a44')} scale={[0.08, 0.055, 0.075]} position={[0, 0.045, 0]} />{[0, 1, 2, 3].map(i => <mesh key={i} geometry={GE.sph} material={t('teal', '#9cc46a')} scale={[0.016, 0.006, 0.01]} position={[Math.cos(i * 1.6) * 0.05, 0.09, Math.sin(i * 1.6) * 0.05]} />)}</group>
    case 'stone': return <group scale={s}><Mx geo={GE.ico} mat={t('stone', '#b8b0a4')} scale={[0.05, 0.03, 0.045]} position={[0, 0.015, 0]} /><Mx geo={GE.ico} mat={t('stone2', '#a8a094')} scale={[0.028, 0.02, 0.026]} position={[0.05, 0.01, 0.02]} /></group>
    case 'crystal': return <group scale={s}><Mx geo={GE.cone} mat={G_CRYS} scale={[0.022, 0.1, 0.022]} position={[0, 0.05, 0]} /><Mx geo={GE.cone} mat={G_CRYS} scale={[0.016, 0.07, 0.016]} position={[0.03, 0.035, 0.01]} rotation={[0, 0, -0.4]} /><Mx geo={GE.cone} mat={G_CRYS} scale={[0.014, 0.06, 0.014]} position={[-0.025, 0.03, -0.01]} rotation={[0.2, 0, 0.45]} /></group>
    case 'water': return <group scale={s}><Mx geo={GE.ico} mat={t('rock', '#b8b0a4')} scale={[0.12, 0.04, 0.1]} position={[0, 0.0, 0]} /><mesh geometry={GE.cyl} material={G_WATER} scale={[0.07, 0.01, 0.06]} position={[0, 0.03, 0]} /><mesh geometry={GE.ring} material={G_SPARK} scale={0.05} position={[0, 0.037, 0]} rotation={[-Math.PI / 2, 0, 0]} /></group>
    case 'coin': return <group scale={s}><Mx geo={GE.cyl} mat={t('coin', '#e8b84a')} scale={[0.024, 0.006, 0.024]} position={[0, 0.006, 0]} rotation={[0.25, 0, 0.1]} /><Mx geo={GE.ico} mat={t('rock', '#b8b0a4')} scale={[0.03, 0.02, 0.03]} position={[-0.03, 0.01, -0.01]} /></group>
    case 'shard': return <group scale={s}><Mx geo={GE.box} mat={t('pot', '#e8dcc8')} scale={[0.05, 0.006, 0.035]} position={[0, 0.006, 0]} rotation={[0.1, 0.4, 0.15]} /><mesh geometry={GE.box} material={t('potb', '#5f8fc4')} scale={[0.04, 0.007, 0.008]} position={[0, 0.007, 0.006]} rotation={[0.1, 0.4, 0.15]} /></group>
    case 'firefly': return <group scale={s}><mesh geometry={GE.sph} material={G_FLY} scale={0.012} position={[0, 0.25, 0]} /><mesh geometry={GE.sph} material={G_HALO} scale={0.04} position={[0, 0.25, 0]} /></group>
    case 'fish': return <group scale={s}><mesh geometry={GE.ring} material={G_SPARK} scale={0.12} rotation={[-Math.PI / 2, 0, 0]} /><mesh geometry={GE.ring} material={G_SPARK} scale={0.07} rotation={[-Math.PI / 2, 0, 0]} /><Mx geo={GE.sph} mat={t('fishb', '#7aa2b8')} scale={[0.012, 0.012, 0.04]} position={[0.02, 0.006, 0]} rotation={[0, 0.6, 0]} hull={0} /></group>
    default: return null
  }
}
const G_GLOW = glow('#b8ff7a'), G_CRYS = new THREE.MeshToonMaterial({ color: '#b8d4ff', emissive: '#6a7ad0', emissiveIntensity: 0.4 }), G_WATER = new THREE.MeshBasicMaterial({ color: '#9fe6f0' }), G_SPARK = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.75, side: THREE.DoubleSide, depthWrite: false })
const G_RING = new THREE.MeshBasicMaterial({ color: '#fffbe8', transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthTest: false, depthWrite: false })
const G_FLY = glow('#f2ff8a'), G_HALO = new THREE.MeshBasicMaterial({ color: '#e8ff9a', transparent: true, opacity: 0.25, depthWrite: false, toneMapped: false })

// decor meshes (placed + ghost)
export function Decor({ item }) {
  const t = (k, c) => m(k, c)
  if (item === 'wreath') return <group><Mx geo={GE.cyl} mat={t('wood', '#a8744c')} scale={[0.012, 0.36, 0.012]} position={[0, 0.18, -0.02]} /><group position={[0, 0.3, 0]}><Mx geo={GE.tor} mat={t('wreathg', '#7fae5f')} scale={0.09} hull={1.06} />{[...Array(8)].map((_, i) => <Mx key={i} geo={GE.ico} mat={t('fl' + (i % 4), ['#f59ab0', '#ffd36e', '#c9b3ff', '#fffaf0'][i % 4])} scale={0.022} position={[Math.cos(i / 8 * 6.28) * 0.09, Math.sin(i / 8 * 6.28) * 0.09, 0.012]} />)}<Mx geo={GE.box} mat={t('bow', '#d9564a')} scale={[0.05, 0.03, 0.01]} position={[0, -0.095, 0.015]} /></group></group>
  if (item === 'mosslamp') return <group><Mx geo={GE.cyl} mat={t('jar', '#e8f6f0')} scale={[0.06, 0.12, 0.06]} position={[0, 0.06, 0]} /><mesh geometry={GE.ico} material={G_GLOW} scale={[0.05, 0.03, 0.05]} position={[0, 0.03, 0]} /><Mx geo={GE.cyl} mat={t('lid', '#b8aca0')} scale={[0.065, 0.02, 0.065]} position={[0, 0.125, 0]} /><mesh geometry={GE.sph} material={G_HALO} scale={0.1} position={[0, 0.07, 0]} /></group>
  if (item === 'basket') return <group><Mx geo={GE.cyl} mat={t('bask', '#d4a868')} scale={[0.09, 0.07, 0.09]} position={[0, 0.035, 0]} /><Mx geo={GE.tor} mat={t('bask2', '#a8744c')} scale={[0.08, 0.08, 0.08]} position={[0, 0.07, 0]} rotation={[0, Math.PI / 2, 0]} hull={1.05} />{[[0.03, 0.08, 0.02, '#d9564a'], [-0.03, 0.08, -0.01, '#ffd36e'], [0.0, 0.085, -0.03, '#9cc46a']].map(([x, y, z, c], i) => <Mx key={i} geo={GE.sph} mat={t('fr' + i, c)} scale={0.025} position={[x, y, z]} />)}</group>
  if (item === 'chime') return <group><Mx geo={GE.cyl} mat={t('wood', '#a8744c')} scale={[0.012, 0.42, 0.012]} position={[0, 0.21, 0]} /><Mx geo={GE.cyl} mat={t('wood2', '#8a5a3c')} scale={[0.008, 0.16, 0.008]} position={[0.07, 0.41, 0]} rotation={[0, 0, Math.PI / 2]} /><ChimeShells /></group>
  return null
}
function ChimeShells() {
  const g = useRef()
  useFrame(({ clock }) => { const t = clock.elapsedTime; g.current.children.forEach((c, i) => { c.rotation.z = Math.sin(t * 2.3 + i * 1.3) * 0.25; c.rotation.x = Math.sin(t * 1.7 + i) * 0.15 }) })
  return <group ref={g}>{[0.02, 0.06, 0.1, 0.14].map((x, i) => <group key={i} position={[x, 0.41, 0]}><mesh geometry={GE.cyl} material={m('str', '#4a3a35')} scale={[0.0015, 0.06 + i * 0.015, 0.0015]} position={[0, -0.03 - i * 0.008, 0]} /><Mx geo={GE.cone} mat={m('shell', '#f6c8b0')} scale={[0.014, 0.03, 0.01]} position={[0, -0.07 - i * 0.015, 0]} rotation={[Math.PI, 0, 0]} /></group>)}</group>
}

function SurfaceGroup({ n, lift = 0, spin = 0, children, gref }) {
  const p = useMemo(() => place(n, lift, spin), [n, lift, spin])
  return <group ref={gref} position={p.pos} quaternion={p.q}>{children}</group>
}

// Home sign with the bundled Fredoka font drawn into a canvas texture
function HomeSign({ n }) {
  const tex = useMemo(() => { const c = document.createElement('canvas'); c.width = 256; c.height = 128; const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace
    const draw = () => { const x = c.getContext('2d'); x.fillStyle = '#e9cf9e'; x.fillRect(0, 0, 256, 128); x.strokeStyle = '#8a5a3c'; x.lineWidth = 10; x.strokeRect(5, 5, 246, 118); x.fillStyle = '#5a3a24'; x.font = '500 70px Fredoka, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('Home', 128, 70); x.fillStyle = '#d9655b'; x.beginPath(); x.arc(30, 30, 9, 0, 7); x.fill(); t.needsUpdate = true }
    draw(); document.fonts?.ready.then(draw); return t }, [])
  return <SurfaceGroup n={n} spin={0.4}><Mx geo={GE.cyl} mat={m('wood', '#a8744c')} scale={[0.014, 0.34, 0.014]} position={[0, 0.17, 0]} /><mesh position={[0, 0.32, 0.012]}><planeGeometry args={[0.24, 0.12]} /><meshBasicMaterial map={tex} side={THREE.DoubleSide} /></mesh><mesh position={[0, 0.32, 0.006]} material={hullMat}><boxGeometry args={[0.26, 0.14, 0.008]} /></mesh></SurfaceGroup>
}
function Bench({ b }) {
  return <group position={b.pos} quaternion={b.q}>
    {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([x, z], i) => <Mx key={i} geo={GE.box} mat={m('wood2', '#8a5a3c')} scale={[0.025, 0.14, 0.025]} position={[x * 0.12, 0.07, z * 0.06]} />)}
    <Mx geo={GE.box} mat={m('wood', '#a8744c')} scale={[0.32, 0.03, 0.18]} position={[0, 0.15, 0]} hull={1.06} />
    <Mx geo={GE.cyl} mat={m('jar', '#e8f6f0')} scale={[0.025, 0.05, 0.025]} position={[-0.09, 0.19, 0.02]} />
    <Mx geo={GE.box} mat={m('wood2', '#8a5a3c')} scale={[0.012, 0.012, 0.09]} position={[0.06, 0.172, 0]} rotation={[0, 0.5, 0]} /><Mx geo={GE.box} mat={m('stone', '#b8b0a4')} scale={[0.04, 0.025, 0.025]} position={[0.08, 0.175, -0.035]} rotation={[0, 0.5, 0]} />
    <Mx geo={GE.cyl} mat={m('bask', '#d4a868')} scale={[0.04, 0.03, 0.04]} position={[0.0, 0.18, -0.04]} />
    <Mx geo={GE.ico} mat={m('leaf', '#9cc46a')} scale={0.02} position={[-0.03, 0.18, 0.04]} />
  </group>
}
function RopeBridge({ br }) {
  const items = useMemo(() => {
    const out = [], N = 22, ab = br.B.clone().sub(br.A)
    for (let i = 0; i <= N; i++) { const t = i / N, n = br.A.clone().addScaledVector(ab, t).normalize(); const h = br.hA + (br.hB - br.hA) * t - 0.05 * Math.sin(Math.PI * t); out.push({ n, h, t }) }
    return out }, [br])
  const fwd = br.B.clone().sub(br.A).normalize()
  return <group>
    {items.map(({ n, h }, i) => { const pos = n.clone().multiplyScalar(R + h - 0.012), up = n.clone(), f = fwd.clone().addScaledVector(up, -fwd.dot(up)).normalize(), s = new THREE.Vector3().crossVectors(up, f); const qq = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(s, up, f))
      const slope = Math.atan2((br.hB - br.hA), br.A.angleTo(br.B) * R)
      return <group key={i} position={pos} quaternion={qq}><group rotation={[-slope, 0, 0]}>
        <Mx geo={GE.box} mat={m(i % 2 ? 'wood' : 'wood2', i % 2 ? '#a8744c' : '#c98a5a')} scale={[0.26, 0.014, 0.05]} hull={1.08} />
        {i % 4 === 0 && [-1, 1].map(x => <Mx key={x} geo={GE.cyl} mat={m('wood2', '#8a5a3c')} scale={[0.011, 0.2, 0.011]} position={[x * 0.14, 0.1, 0]} />)}
        {[-1, 1].map(x => <mesh key={'r' + x} geometry={GE.cyl} material={m('rope', '#e2c78e')} scale={[0.005, 0.11, 0.005]} position={[x * 0.14, 0.17, 0]} rotation={[Math.PI / 2, 0, 0]} />)}
      </group></group> })}
  </group>
}
function Reward({ br }) {
  return <group>
    <SurfaceGroup n={br.top} lift={0.035} spin={0.6}><mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.006, 0]}><planeGeometry args={[0.36, 0.3]} /><meshToonMaterial color="#e86f5a" /></mesh>
      {[-0.12, 0, 0.12].map(x => <mesh key={x} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.008, 0]}><planeGeometry args={[0.04, 0.3]} /><meshToonMaterial color="#fffaf0" /></mesh>)}
      <Mx geo={GE.cyl} mat={m('bask', '#d4a868')} scale={[0.05, 0.04, 0.05]} position={[0.08, 0.03, 0.06]} /><Mx geo={GE.cyl} mat={m('jar', '#e8f6f0')} scale={[0.02, 0.045, 0.02]} position={[-0.08, 0.03, -0.05]} />
      <Mx geo={GE.cyl} mat={m('wood2', '#8a5a3c')} scale={[0.01, 0.5, 0.01]} position={[0.22, 0.25, -0.1]} /><mesh position={[0.28, 0.44, -0.1]}><planeGeometry args={[0.12, 0.07]} /><meshToonMaterial color="#5f8fc4" side={THREE.DoubleSide} /></mesh>
    </SurfaceGroup>
    {!G.s.chest && <SurfaceGroup n={br.chest} lift={0.03} spin={2.2}><Mx geo={GE.box} mat={m('chest', '#a8744c')} scale={[0.16, 0.09, 0.1]} position={[0, 0.045, 0]} /><Mx geo={GE.cyl} mat={m('chest2', '#8a5a3c')} scale={[0.05, 0.16, 0.05]} position={[0, 0.09, 0]} rotation={[0, 0, Math.PI / 2]} /><Mx geo={GE.box} mat={m('coin', '#e8b84a')} scale={[0.025, 0.03, 0.015]} position={[0, 0.07, 0.052]} /><mesh geometry={GE.sph} material={G_HALO} scale={0.16} position={[0, 0.08, 0]} /></SurfaceGroup>}
  </group>
}

// sheep that wander the meadow and can be shorn once a day
function Sheep({ i, sheep }) {
  const g = useRef(), wool = useRef(), legs = useRef()
  useFrame((_, dt) => {
    const s = sheep[i], meadow = GAME.Zc.meadow; dt = Math.min(dt, 0.05); s.t += dt
    if (Math.sin(s.t * 0.4 + i * 2) > 0.1 && !s.held) { s.n.addScaledVector(s.f, 0.12 / R * dt).normalize(); s.f.applyAxisAngle(s.n, Math.sin(s.t * 0.7 + i) * dt * 0.8); if (s.n.angleTo(meadow) > ZONES.meadow.r * 0.8) s.f.lerp(meadow.clone().sub(s.n), dt * 2) ; s.walk = 1 } else s.walk = 0
    s.f.addScaledVector(s.n, -s.f.dot(s.n)).normalize()
    const side = _sx.crossVectors(s.n, s.f)
    g.current.quaternion.setFromRotationMatrix(_sm.makeBasis(side, s.n, s.f)); g.current.position.copy(posOf(s.n)); s.pos = g.current.position
    const shorn = !available(s.id); wool.current.scale.setScalar(shorn ? 0.72 : 1)
    legs.current.children.forEach((l, k) => { l.rotation.x = Math.sin(s.t * 9 + k * Math.PI) * 0.4 * s.walk })
    g.current.visible = !G.hideFar || true
  })
  return <group ref={g}>
    <group ref={wool}>{[[0, 0.1, 0, 0.075], [0.04, 0.12, 0.03, 0.05], [-0.04, 0.12, 0.02, 0.05], [0.03, 0.11, -0.04, 0.05], [-0.03, 0.12, -0.04, 0.05], [0, 0.15, 0, 0.05]].map(([x, y, z, r], k) => <Mx key={k} geo={GE.sph} mat={m('wool', '#fffaf0')} scale={r} position={[x, y, z]} hull={1.08} />)}</group>
    <Mx geo={GE.sph} mat={m('sheephead', '#3a2e2a')} scale={[0.03, 0.035, 0.038]} position={[0, 0.12, 0.08]} /><Mx geo={GE.sph} mat={m('sheephead', '#3a2e2a')} scale={[0.012, 0.02, 0.008]} position={[0.03, 0.135, 0.07]} rotation={[0, 0, -0.8]} /><Mx geo={GE.sph} mat={m('sheephead', '#3a2e2a')} scale={[0.012, 0.02, 0.008]} position={[-0.03, 0.135, 0.07]} rotation={[0, 0, 0.8]} />
    <mesh geometry={GE.sph} material={m('eyew', '#fffaf0')} scale={0.006} position={[0.012, 0.13, 0.112]} /><mesh geometry={GE.sph} material={m('eyew', '#fffaf0')} scale={0.006} position={[-0.012, 0.13, 0.112]} />
    <group ref={legs}>{[[0.035, 0.04], [-0.035, 0.04], [0.035, -0.04], [-0.035, -0.04]].map(([x, z], k) => <group key={k} position={[x, 0.06, z]}><Mx geo={GE.cyl} mat={m('sheephead', '#3a2e2a')} scale={[0.008, 0.06, 0.008]} position={[0, -0.03, 0]} /></group>)}</group>
  </group>
}


// polish: sparkle burst for her actions (gather pop, catch, craft, place). One instanced mesh of 16 little stars,
// only visible for ~0.9 s after an action, so it costs one draw call while it shows and nothing otherwise.
const SPARK_COL = { gold: ['#fff3b0', '#ffd36e', '#ffffff'], water: ['#dff6ff', '#9fe0f0', '#ffffff'] }
const SPARK_GEO = (() => { const g = new THREE.OctahedronGeometry(1, 0); g.scale(1, 1.6, 1); return g })()
const SPARK_MAT = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, depthWrite: false, toneMapped: false })
function Sparkles() {
  const P = GAME.P
  const ref = useRef(), o = useMemo(() => new THREE.Object3D(), []), seeds = useMemo(() => [...Array(16)].map((_, i) => ({ a: i * 2.399, u: 0.5 + ((i * 37) % 11) / 11, s: 0.6 + ((i * 53) % 7) / 10 })), []), col = useMemo(() => new THREE.Color(), [])
  useFrame(() => { const m = ref.current; if (!m) return; if (FREEZE && !ACT.spark && GAME.P && ['pick', 'water', 'craft', 'place', 'reel'].includes(FREEZE.kind)) { const P = GAME.P; const n = P.n.clone().addScaledVector(P.fwd, 0.13 / R).normalize(); ACT.spark = { pos: n.multiplyScalar(R + height(n) + 0.02), n: 12, col: FREEZE.kind === 'water' || FREEZE.kind === 'reel' ? 'water' : 'gold', freeze: 0.42 } } const sp = ACT.spark
    if (!sp) { m.visible = false; return } const k = sp.freeze ?? (performance.now() - sp.t0) / 900
    if (k < 0) { m.visible = false; return } if (k > 1) { if (!sp.freeze) ACT.spark = null; m.visible = false; return }
    m.visible = true; const up = _sp.copy(sp.pos).normalize(), a = _sa.set(0, 1, 0).cross(up); if (a.lengthSq() < 1e-6) a.set(1, 0, 0); a.normalize(); const b = _sb.crossVectors(up, a)
    const pal = SPARK_COL[sp.col] || SPARK_COL.gold
    for (let i = 0; i < 16; i++) { const sd = seeds[i]; if (i >= sp.n) { o.scale.setScalar(0); o.updateMatrix(); m.setMatrixAt(i, o.matrix); continue }
      const r = 0.04 + k * 0.2 * sd.u, h = 0.04 + k * (0.22 + 0.1 * sd.u) - k * k * 0.08
      o.position.copy(sp.pos).addScaledVector(a, Math.cos(sd.a + k * 2) * r).addScaledVector(b, Math.sin(sd.a + k * 2) * r).addScaledVector(up, h)
      o.quaternion.setFromUnitVectors(_sa.set(0, 1, 0), up); o.rotateY(k * 6 + i); o.scale.setScalar(0.016 * sd.s * Math.sin(Math.min(1, k * 1.15) * Math.PI)); o.updateMatrix(); m.setMatrixAt(i, o.matrix)
      m.setColorAt(i, col.set(pal[i % 3])) }
    m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true })
  return <instancedMesh ref={ref} args={[SPARK_GEO, SPARK_MAT, 16]} frustumCulled={false} visible={false} renderOrder={6} />
}
const _sp = new THREE.Vector3(), _sa = new THREE.Vector3(), _sb = new THREE.Vector3()
// ---------- the world + interaction loop ----------
export function GameWorld() {
  const L = LAYOUT, camera = useThree(s => s.camera)
  const refs = useRef({}), anim = useRef({}), [, force] = React.useReducer(x => x + 1, 0)
  const sheep = GAME.sheep = useMemo(() => [0, 1, 2, 3].map(i => { const n = around(GAME.Zc.meadow, 0.06 + i * 0.04, i * 1.6); const t0 = new THREE.Vector3(0, 1, 0); return { id: `wool-sheep-${i}`, item: 'wool', n, f: t0.clone().addScaledVector(n, -n.dot(t0)).normalize().applyAxisAngle(n, i), t: i * 3, walk: 0, pos: new THREE.Vector3() } }), [])
  useEffect(() => { const u = () => force(); const unsub = (window.__gameSub = window.__gameSub || []); unsub.push(u); return () => { const k = unsub.indexOf(u); if (k >= 0) unsub.splice(k, 1) } }, [])
  const _pp = useMemo(() => new THREE.Vector3(), []), _w = useMemo(() => new THREE.Vector3(), [])
  const freezePick = q.has('pick') ? +q.get('pick') : null
  // act on the nearest interactable (E / tap)
  useEffect(() => {
    GAME.actions.act = () => {
      const nr = G.near; if (!nr) return
      if (nr.kind === 'ext') { nr.act(); return }
      if (nr.kind === 'bench') { G.ui.panel = 'recipes'; G.ui.atBench = true; emit(); return }
      if (nr.kind === 'chest') { G.s.chest = true; add('skyseed', 1, true); add('crystal', 3, true); toast('You found the cliff-top picnic! +1 Sky Seed, +3 Crystal', 'skyseed', 4200); emit(); force(); return }
      if (nr.kind === 'decor') { const k = G.s.placed.findIndex(p => p.uid === nr.uid); if (k >= 0) { const [p] = G.s.placed.splice(k, 1); G.s.inv[p.item] = count(p.item) + 1; toast(`Picked up ${ITEMS[p.item].name}`, p.item); emit(); force() } return }
      const sp = nr.spot, need = NEEDS_TOOL[sp.item]
      if (need && !G.s.tools[need]) { toast(`You need a ${ITEMS[need].name} for that.`, need); return }
      if (sp.item === 'fish') { startAct('cast', { dur: 1.0 }); setTimeout(() => { G.ui.fish = { spot: sp.id, t0: performance.now(), zone: 0.3 + Math.random() * 0.4, tries: 3 }; emit() }, 650); return }
      pickup(sp)
    }
    GAME.actions.fishResult = (ok) => { const sp = L.spots.find(s => s.id === G.ui.fish?.spot); G.ui.fish = null; startAct('reel', { dur: ok ? 0.9 : 0.6, spark: ok && sp ? sp.pos : null, sparkCol: 'water' }); if (ok && sp) { markTaken(sp.id); setTimeout(() => add('fish'), 450) } else toast('It got away… try again!', 'fish'); emit() }
    GAME.actions.tapSpot = (sp) => { GAME.P.target = sp.stand.clone(); G.autoAct = sp.id }
  }, [])
  const pickup = (sp) => {
    if (anim.current[sp.id]) return
    camera.updateMatrixWorld(); _w.copy(sp.pos).applyMatrix4(planetRef.current.matrixWorld).project(camera)
    G.ui.fly = [...G.ui.fly, { id: sp.id + performance.now(), item: sp.item, x: (_w.x * 0.5 + 0.5) * innerWidth, y: (-_w.y * 0.5 + 0.5) * innerHeight }]; emit()
    const isWater = sp.item === 'water'; startAct(isWater ? 'water' : 'pick', { dur: isWater ? 1.0 : 0.85, spark: sp.pos, sparkDelay: 280, sparkN: 12, sparkCol: isWater ? 'water' : 'gold', sound: isWater ? 'water' : 'pick' })
    anim.current[sp.id] = { t0: performance.now() + 280 }
    if (freezePick == null) setTimeout(() => { markTaken(sp.id); add(sp.item); delete anim.current[sp.id]; force() }, 980)
  }
  useFrame(() => {
    const P = GAME.P; if (!P || !L) return
    _pp.copy(P.n).multiplyScalar(R + height(P.n) + P.h)
    const night = T.night > 0.5; G.night = night
    let best = null, bd = 1e9
    const H = GAME.H, inside = !!(H && H.inside)
    const consider = (o, d, lim) => { if (inside && !o.inside) return; if (d < lim && d < bd) { bd = d; best = o } } // indoors only the house's own interactables count
    for (const sp of L.spots) {
      const g = refs.current[sp.id]; if (!g) continue
      const live = available(sp.id) && (!sp.night || night)
      const dc = camera.position.distanceTo(_w.copy(sp.pos).applyMatrix4(planetRef.current.matrixWorld))
      const a = anim.current[sp.id]
      if (a) { // pop -> fly to the player's bag
        let k = Math.max(0, (performance.now() - a.t0) / 700); if (freezePick != null) k = freezePick
        const up = sp.n.clone(), target = _pp.clone().addScaledVector(P.n, 0.22)
        const pop = Math.sin(Math.min(1, k / 0.4) * Math.PI / 2) * 0.16
        g.position.copy(sp.pos).addScaledVector(up, pop).lerp(target, Math.max(0, (k - 0.35) / 0.65) ** 2)
        g.scale.setScalar((1 + 0.35 * Math.sin(Math.min(1, k / 0.35) * Math.PI)) * Math.max(0.05, 1 - Math.max(0, (k - 0.5) / 0.5)))
        g.rotation.y = k * 8; g.visible = true; continue
      }
      g.visible = live && dc < (sp.item === 'glowmoss' && G.s.tools.lantern ? 14 : 10)
      if (g.visible) {
        g.position.copy(sp.pos); g.scale.setScalar(1)
        if (sp.item === 'firefly') g.position.addScaledVector(sp.n, Math.sin(performance.now() / 600 + sp.spin) * 0.05)
        if (sp.item === 'glowmoss') g.scale.setScalar(G.s.tools.lantern && night ? 1.25 : 1)
        const d = _pp.distanceTo(sp.standPos); consider({ kind: 'spot', spot: sp, id: sp.id }, d, sp.water ? 0.75 : sp.item === 'firefly' ? 0.5 : 0.42)
      }
    }
    for (const s of sheep) if (available(s.id)) consider({ kind: 'spot', spot: { ...s, pos: s.pos.clone(), standPos: s.pos.clone(), stand: s.n.clone() }, id: s.id }, _pp.distanceTo(s.pos), 0.45)
    consider({ kind: 'bench', id: 'bench' }, _pp.distanceTo(L.bench.pos), 0.5)
    if (G.s.unlocked.bridge && !G.s.chest) consider({ kind: 'chest', id: 'chest' }, _pp.distanceTo(posOf(L.bridge.chest)), 0.45)
    for (const p of G.s.placed) if (!G.ui.place && !p.in) consider({ kind: 'decor', id: 'decor' + p.uid, uid: p.uid, item: p.item }, _pp.distanceTo(posOf(new THREE.Vector3(...p.n))), 0.35)
    if (H) for (const f of H.near) f(consider, _pp) // door, pets, dug-up finds, indoor decor
    const id = best ? best.id : null
    if (id !== (G.near && G.near.id)) { G.near = best; emit() }
    if (G.autoAct && best && best.id === G.autoAct) { G.autoAct = null; GAME.actions.act() }
    const hl = refs.current.__hl, bu = refs.current.__burst, now = performance.now() / 1000
    if (hl) { const sp = best && best.kind === 'spot' && !best.spot.water ? best.spot : null; hl.visible = !!sp && !G.ui.panel
      if (sp) { const p = place(sp.stand, 0.006, now * 0.6); hl.position.copy(sp.water ? sp.standPos : p.pos); hl.quaternion.copy(p.q); hl.scale.setScalar(1 + Math.sin(now * 4) * 0.08) } }
    if (bu) { const ids = Object.keys(anim.current); bu.visible = ids.length > 0
      if (ids.length) { const g = refs.current[ids[0]], a = anim.current[ids[0]]; let k = Math.max(0, (performance.now() - a.t0) / 700); if (freezePick != null) k = freezePick
        bu.position.copy(g.position); bu.quaternion.copy(g.quaternion); bu.children.forEach((c, i) => { const ang = i / bu.children.length * 6.283 + k * 2, r = 0.05 + k * 0.16; c.position.set(Math.cos(ang) * r, 0.06 + Math.sin(i * 2.1) * 0.04 + k * 0.05, Math.sin(ang) * r); c.scale.setScalar(0.022 * (1 - k * 0.5)) }) } }
    // placement ghost
    const gh = refs.current.__ghost
    if (gh) { const pl = G.ui.place; gh.visible = !!pl
      if (pl && inside) H.ghost(gh, pl, GHOST)
      else if (pl) { pl.in = null; gh.scale.setScalar(1); const n = P.n.clone().addScaledVector(P.fwd, 0.32 / R).normalize(), p = place(n, 0, pl.rot); gh.position.copy(p.pos); gh.quaternion.copy(p.q); pl.n = n.toArray(); pl.ok = n.angleTo(L.homeN) < 2.2 / R; GHOST.color.set(pl.ok ? '#bff0c8' : '#ffb8a8') } }
  })
  if (!L) return null
  return <group>
    {L.spots.map(sp => <group key={sp.id} ref={el => { if (el) refs.current[sp.id] = el }} position={sp.pos} quaternion={place(sp.water ? sp.n : sp.n, 0, sp.spin).q}
      onPointerDown={e => { if (!refs.current[sp.id]?.visible) return; e.stopPropagation(); onTap(e.nativeEvent || e, () => GAME.actions.tapSpot(sp)) }}><Prop item={sp.item} s={sp.s} /></group>)}
    <group ref={el => { if (el) refs.current.__hl = el }} visible={false}><mesh rotation={[-Math.PI / 2, 0, 0]} material={G_RING} renderOrder={5}><ringGeometry args={[0.1, 0.122, 40, 1, 0, 5.2]} /></mesh><mesh rotation={[-Math.PI / 2, 0, 2.6]} material={G_RING} renderOrder={5}><ringGeometry args={[0.135, 0.145, 40, 1, 0, 2.2]} /></mesh></group>
    <group ref={el => { if (el) refs.current.__burst = el }} visible={false}>{[...Array(7)].map((_, i) => <mesh key={i} geometry={GE.ico} material={i % 2 ? G_FLY : G_SPARK} />)}</group>
    {sheep.map((s, i) => <Sheep key={i} i={i} sheep={sheep} />)}
    <Bench b={L.bench} /><HomeSign n={L.sign.n} /><Sparkles />
    {G.s.placed.filter(p => !p.in).map(p => <SurfaceGroup key={p.uid} n={new THREE.Vector3(...p.n)} spin={p.rot}><Decor item={p.item} /></SurfaceGroup>)}
    <group ref={el => { if (el) refs.current.__ghost = el }} visible={false}><GhostDecor /></group>
    {G.s.unlocked.bridge && <><RopeBridge br={L.bridge} /><Reward br={L.bridge} /></>}
  </group>
}
const GHOST = new THREE.MeshBasicMaterial({ color: '#bff0c8', transparent: true, opacity: 0.55, depthWrite: false })
function GhostDecor() {
  const [, force] = React.useReducer(x => x + 1, 0), g = useRef(), last = useRef(null)
  useFrame(() => { const it = G.ui.place?.item || null; if (it !== last.current) { last.current = it; force() } if (g.current) g.current.traverse(o => { if (o.isMesh) o.material = o.material === hullMat || o.userData.hull ? (o.userData.hull = true, hullMat) : GHOST }) })
  return <group ref={g}>{last.current && <Decor item={last.current} />}<mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, 0]} material={GHOST}><ringGeometry args={[0.1, 0.13, 32]} /></mesh></group>
}
// carried lantern (shown at dusk/night once crafted)
export function PlayerLantern() {
  const g = useRef(), l = useRef()
  useFrame(({ clock }) => { const on = !!G.s.tools.lantern && (T.night > 0.3 || T.dusk > 0.5); g.current.visible = on; if (on) { g.current.rotation.z = Math.sin(clock.elapsedTime * 3) * 0.15; l.current.intensity = 1.2 + Math.sin(clock.elapsedTime * 7) * 0.08 } })
  return <group ref={g} position={[0.14, 0.2, 0.05]}><mesh geometry={GE.cyl} material={m('wood2', '#8a5a3c')} scale={[0.003, 0.05, 0.003]} position={[0, 0.03, 0]} /><mesh geometry={GE.cyl} material={glow('#ffd27a')} scale={[0.022, 0.04, 0.022]} position={[0, -0.01, 0]} /><mesh geometry={GE.cyl} material={m('lantcap', '#5a8a44')} scale={[0.026, 0.008, 0.026]} position={[0, 0.012, 0]} /><mesh geometry={GE.sph} material={G_HALO} scale={0.12} /><pointLight ref={l} color="#ffcf8a" intensity={1.2} distance={1.6} decay={1.5} /></group>
}
// place a decor item from the bag
export function startPlace(item) { if (!count(item)) return; G.ui.place = { item, rot: 0 }; G.ui.panel = null; emit() }
export function confirmPlace() { const pl = G.ui.place; if (!pl || !pl.n) return; if (!pl.ok) { toast('Decor goes in or around your Home.', 'leaf'); return } startAct('place', { spark: pl.in ? null : new THREE.Vector3(...pl.n).multiplyScalar(R + height(new THREE.Vector3(...pl.n))), sparkN: 8 }); take(pl.item); G.s.placed.push({ uid: Date.now().toString(36) + Math.random().toString(36).slice(2, 5), item: pl.item, n: pl.n, rot: pl.rot, ...(pl.in ? { in: pl.in } : {}) }); toast(`Placed ${ITEMS[pl.item].name}`, pl.item); G.ui.place = count(pl.item) ? { ...pl } : null; emit(); (window.__gameSub || []).forEach(f => f()) }
export function teleport(P, where) {
  const L = LAYOUT; if (!L) return
  const Zc = GAME.Zc; let n, look
  const spot = (pred) => L.spots.find(pred)
  if (where === 'forest') { const s = spot(s => s.id === 'mushroom-show-0'); n = toward(s.n, Zc.forest, -0.05).applyAxisAngle(s.n, 0.35).normalize(); look = s.n }
  else if (where === 'home') { n = toward(L.bench.n, L.homeN, -0.06); look = L.bench.n }
  else if (where === 'decor') { n = toward(L.homeN, L.bench.n, 0.12); look = L.homeN }
  else if (where === 'onbridge') { n = L.bridge.A.clone().lerp(L.bridge.B, 0.3).normalize(); look = L.bridge.B; P.h = ropeLift(n) }
  else if (where === 'bridge') { n = toward(L.bridge.A, L.bridge.B, -0.11).applyAxisAngle(L.bridge.A, -0.3).normalize(); look = L.bridge.B }
  else if (where === 'top') { n = toward(L.bridge.top, L.bridge.B, 0.034); look = L.bridge.top }
  else if (where === 'lake' || where === 'harbour') { const s = spot(s => s.item === 'fish' && s.zone === where); n = toward(s.stand, s.n, -0.01); look = s.n }
  else if (where === 'cliff') { const s = spot(s => s.item === 'water'); n = toward(s.n, Zc.cliff, -0.05); look = s.n }
  else if (Zc[where]) { const s = spot(s => s.zone === where); n = toward(s.n, Zc[where], -0.04); look = s.n }
  if (!n) return
  P.n.copy(n); const f = look.clone().sub(n); P.fwd.copy(f.addScaledVector(n, -f.dot(n)).normalize())
}
export { LAYOUT }
window.__game = { get L() { return LAYOUT }, G }
