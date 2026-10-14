// Procedural Ghibli-style people: smooth capsules + lathe shapes, toon shaded, with a walk cycle.
import * as THREE from 'three'
import React, { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Outlines } from '@react-three/drei'
import { toon, INK } from './common.jsx'

const MC = new Map()
const tm = (c, o) => { const k = c + (o ? JSON.stringify(o) : ''); if (!MC.has(k)) MC.set(k, toon(c, o)); return MC.get(k) }
const eyeMat = new THREE.MeshBasicMaterial({ color: '#2a201c' }), hiMat = new THREE.MeshBasicMaterial({ color: '#ffffff' }), mouthMat = new THREE.MeshBasicMaterial({ color: '#a8504a' })
const lathe = (pts, seg = 16) => new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), seg)
const G = {
  torso: lathe([[0.001, 0], [0.043, 0.002], [0.049, 0.035], [0.052, 0.074], [0.047, 0.103], [0.031, 0.121], [0.001, 0.125]]),
  skirt: lathe([[0.072, -0.13], [0.075, -0.125], [0.07, -0.1], [0.058, -0.05], [0.047, 0.0], [0.044, 0.035]]),
  shortSkirt: lathe([[0.066, -0.06], [0.06, -0.045], [0.047, 0.0], [0.044, 0.035]]),
  hips: new THREE.SphereGeometry(0.046, 16, 12),
  thigh: new THREE.CapsuleGeometry(0.019, 0.08, 4, 10), shin: new THREE.CapsuleGeometry(0.0155, 0.085, 4, 10),
  upper: new THREE.CapsuleGeometry(0.0145, 0.06, 4, 10), fore: new THREE.CapsuleGeometry(0.0125, 0.055, 4, 10),
  hand: new THREE.SphereGeometry(0.0155, 10, 8), foot: new THREE.SphereGeometry(0.02, 12, 8),
  head: new THREE.SphereGeometry(0.05, 22, 16), eye: new THREE.SphereGeometry(0.0085, 10, 8), hi: new THREE.SphereGeometry(0.0027, 6, 5), small: new THREE.SphereGeometry(0.01, 8, 6),
  cap: new THREE.SphereGeometry(0.0545, 22, 14, 0, Math.PI * 2, 0, Math.PI * 0.56),
  back: new THREE.SphereGeometry(0.056, 20, 14, Math.PI - 0.55, Math.PI + 1.1, 0, Math.PI * 0.78),
  neck: new THREE.CylinderGeometry(0.013, 0.015, 0.035, 10),
}

// a preset list of varied townsfolk
export const PEOPLE = [
  { name: 'traveller', kid: true, skin: '#f8d9bf', hair: '#3a2a22', hairStyle: 'short', top: '#f6f0e2', bottom: '#5f8fc4', outfit: 'overalls', shoes: '#7a4a32', hat: 'straw', hatC: '#e9c46a', band: '#d9655b', bag: '#b98a5a' },
  { name: 'girl', kid: true, skin: '#f7d6bd', hair: '#4a3024', hairStyle: 'bob', top: '#f3e9d2', bottom: '#e8b04a', outfit: 'dress', dress: '#e8b04a', shoes: '#c0473f', cheeks: true },
  { name: 'mother', skin: '#f2cfb3', hair: '#2e211c', hairStyle: 'bun', top: '#8fb4d8', bottom: '#8fb4d8', outfit: 'apron', dress: '#8fb4d8', apron: '#fffaf0', shoes: '#6b4a3a', long: true },
  { name: 'farmer', skin: '#e9bf9b', hair: '#5a3e2e', hairStyle: 'short', top: '#d9655b', bottom: '#4f6f9a', outfit: 'overalls', shoes: '#5a3a2a', hat: 'straw', hatC: '#e2c27a', band: '#6a8f4a', h: 1.06 },
  { name: 'grandma', elder: true, skin: '#efcfb6', hair: '#d8d4cf', hairStyle: 'bun', top: '#9c7aa8', bottom: '#6e5a7a', outfit: 'dress', dress: '#7d6a8c', apron: '#e8dfc8', shoes: '#4a3a35', h: 0.92, kerchief: false, long: true },
  { name: 'grandpa', elder: true, skin: '#e7c3a3', hair: '#e2ded8', hairStyle: 'short', top: '#c8b48a', bottom: '#6b5a48', outfit: 'shirt', shoes: '#4a3a35', hat: 'cap', hatC: '#5a6a7a', h: 0.95 },
  { name: 'boy', kid: true, skin: '#eac2a0', hair: '#24201c', hairStyle: 'short', top: '#ffffff', bottom: '#3d4f6e', outfit: 'shirt', shorts: true, shoes: '#e8e1d4', hat: 'cap', hatC: '#5fa05a', cheeks: true, h: 0.92 },
  { name: 'baker', skin: '#f5d4b8', hair: '#8a4a2a', hairStyle: 'pigtails', top: '#f2a3a0', bottom: '#f2a3a0', outfit: 'apron', dress: '#f2a3a0', apron: '#ffffff', shoes: '#7a4a32', cheeks: true, h: 0.97 },
  { name: 'fisher', skin: '#d9a982', hair: '#3a2a22', hairStyle: 'short', top: '#3f6f8f', bottom: '#e9d9b0', outfit: 'shirt', shoes: '#3a2e2a', hat: 'kerchief', hatC: '#e86f5a', h: 1.08 },
  { name: 'teen', skin: '#f6d2b5', hair: '#1f1a18', hairStyle: 'long', top: '#ffffff', bottom: '#2f3f6a', outfit: 'dress', dress: '#2f3f6a', sailor: true, shoes: '#3a2e2a', h: 0.98 },
  { name: 'postman', skin: '#ecc4a2', hair: '#4a3024', hairStyle: 'short', top: '#4f7f6a', bottom: '#4f7f6a', outfit: 'shirt', shoes: '#3a2e2a', hat: 'cap', hatC: '#3f6a5a', bag: '#8a5a3c', h: 1.02 },
  { name: 'toddler', kid: true, tiny: true, skin: '#f9dcc4', hair: '#6a4430', hairStyle: 'pigtails', top: '#f59ab0', bottom: '#f59ab0', outfit: 'dress', dress: '#f59ab0', short: true, shoes: '#ffffff', cheeks: true },
]

export function Person({ cfg, st, seed = 0 }) {
  const r = useRef({})
  const set = (k) => (el) => { r.current[k] = el }
  const m = useMemo(() => ({ skin: tm(cfg.skin), hair: tm(cfg.hair), top: tm(cfg.top), bottom: tm(cfg.bottom), dress: tm(cfg.dress || cfg.bottom), shoes: tm(cfg.shoes), apron: tm(cfg.apron || '#fff'), hat: tm(cfg.hatC || '#e9c46a'), band: tm(cfg.band || '#d9655b'), cheek: tm('#f4a3a0'), bag: tm(cfg.bag || '#b98a5a') }), [])
  const kid = cfg.kid, s = (cfg.h || 1) * (cfg.tiny ? 0.55 : kid ? 0.72 : 1), hs = cfg.tiny ? 1.45 : kid ? 1.28 : 1
  const dressy = cfg.outfit === 'dress' || cfg.outfit === 'apron'
  const legMat = (dressy || cfg.shorts) ? m.skin : m.bottom
  useFrame(() => {
    const R = r.current; if (!R.pelvis) return
    const p = st.phase, mv = st.move, t = st.t ?? 0, el = cfg.elder ? 0.6 : 1
    const sw = Math.sin(p), cw = Math.cos(p)
    R.pelvis.position.y = 0.25 + (Math.cos(2 * p) * 0.006 - 0.004) * mv
    R.pelvis.rotation.z = sw * 0.05 * mv; R.pelvis.rotation.y = sw * 0.09 * mv
    R.chest.rotation.y = -sw * 0.16 * mv; R.chest.rotation.x = (cfg.elder ? 0.2 : 0.03) + 0.06 * mv; R.chest.rotation.z = -sw * 0.03 * mv
    const breathe = 1 + Math.sin(t * 2 + seed) * 0.012 * (1 - mv); R.chest.scale.set(breathe, 1 + (breathe - 1) * 0.6, breathe)
    R.thL.rotation.x = -sw * 0.55 * mv * el; R.thR.rotation.x = sw * 0.55 * mv * el
    R.knL.rotation.x = (Math.max(0, cw) * 0.95 * mv + 0.04) * el; R.knR.rotation.x = (Math.max(0, -cw) * 0.95 * mv + 0.04) * el
    R.ftL.rotation.x = -Math.max(0, cw) * 0.3 * mv; R.ftR.rotation.x = -Math.max(0, -cw) * 0.3 * mv
    const wave = st.wave ? Math.max(0, Math.sin(t * 0.7 + seed)) : 0
    R.shL.rotation.x = sw * 0.5 * mv * el + Math.sin(t * 1.3 + seed) * 0.03 * (1 - mv); R.shR.rotation.x = -sw * 0.5 * mv * el - wave * 2.6
    R.shR.rotation.z = -0.1 - wave * 0.3
    R.elL.rotation.x = -0.25 - 0.35 * mv - Math.max(0, -sw) * 0.25 * mv; R.elR.rotation.x = -0.25 - 0.35 * mv - Math.max(0, sw) * 0.25 * mv - wave * 0.5
    R.elR.rotation.z = Math.sin(t * 9) * 0.4 * wave
    R.head.rotation.x = -Math.cos(2 * p) * 0.035 * mv - (cfg.elder ? 0.12 : 0) + (st.look || 0)
    R.head.rotation.y = sw * 0.08 * mv + Math.sin(t * 0.45 + seed * 3) * 0.45 * (1 - mv)
    R.head.rotation.z = Math.sin(t * 0.7 + seed) * 0.05 * (1 - mv)
    if (R.pig) R.pig.rotation.z = Math.sin(p * 2) * 0.15 * mv
  })
  const leg = (sd, th, kn, ft) => <group ref={set(th)} position={[sd * 0.024, -0.004, 0]}>
    <mesh geometry={G.thigh} position={[0, -0.058, 0]} material={cfg.shorts ? m.bottom : legMat} />
    <group ref={set(kn)} position={[0, -0.117, 0]}>
      <mesh geometry={G.shin} position={[0, -0.058, 0]} material={legMat} />
      <group ref={set(ft)} position={[0, -0.113, 0]}><mesh geometry={G.foot} position={[0, -0.006, 0.013]} scale={[0.85, 0.6, 1.55]} material={m.shoes}><Outlines thickness={0.003} color={INK} /></mesh></group>
    </group>
  </group>
  const arm = (sd, sh, elb) => <group ref={set(sh)} position={[sd * 0.056, 0.104, 0]} rotation={[0, 0, sd * 0.1]}>
    <mesh geometry={G.upper} position={[0, -0.04, 0]} material={m.top} />
    <group ref={set(elb)} position={[0, -0.084, 0]}>
      <mesh geometry={G.fore} position={[0, -0.035, 0]} material={cfg.elder || cfg.name === 'postman' ? m.top : m.skin} />
      <mesh geometry={G.hand} position={[0, -0.074, 0.002]} scale={[0.85, 1.1, 0.75]} material={m.skin} />
    </group>
  </group>
  const hair = () => <>
    <mesh geometry={G.cap} position={[0, 0.047, -0.006]} rotation={[-0.5, 0, 0]} material={m.hair}><Outlines thickness={0.003} color={INK} /></mesh>
    <mesh geometry={G.small} position={[0.01, 0.083, 0.03]} scale={[2.4, 0.8, 1.2]} rotation={[0.6, 0, -0.25]} material={m.hair} />
    {(cfg.hairStyle === 'bob' || cfg.hairStyle === 'long') && <mesh geometry={G.back} position={[0, 0.045, -0.004]} rotation={[0.1, 0, 0]} material={m.hair} />}
    {cfg.hairStyle === 'long' && <mesh geometry={G.thigh} position={[0, -0.0, -0.036]} scale={[1.9, 0.7, 0.7]} material={m.hair} />}
    {cfg.hairStyle === 'bun' && <mesh geometry={G.small} position={[0, 0.09, -0.04]} scale={2.1} material={m.hair}><Outlines thickness={0.003} color={INK} /></mesh>}
    {cfg.hairStyle === 'pigtails' && <group ref={set('pig')}>{[-1, 1].map(x => <mesh key={x} geometry={G.small} position={[x * 0.052, 0.03, -0.018]} scale={[1.4, 2.0, 1.4]} material={m.hair} />)}</group>}
  </>
  const hat = () => cfg.hat === 'straw' ? <>
    <mesh position={[0, 0.088, 0]} material={m.hat}><cylinderGeometry args={[0.105, 0.105, 0.007, 22]} /><Outlines thickness={0.003} color={INK} /></mesh>
    <mesh position={[0, 0.11, 0]} material={m.hat}><cylinderGeometry args={[0.04, 0.052, 0.045, 16]} /></mesh>
    <mesh position={[0, 0.097, 0]} material={m.band}><cylinderGeometry args={[0.0525, 0.0525, 0.013, 16]} /></mesh></>
    : cfg.hat === 'cap' ? <><mesh position={[0, 0.06, -0.003]} material={m.hat}><sphereGeometry args={[0.056, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2]} /><Outlines thickness={0.003} color={INK} /></mesh>
      <mesh position={[0, 0.062, 0.05]} rotation={[0.15, 0, 0]} material={m.hat}><boxGeometry args={[0.07, 0.005, 0.04]} /></mesh></>
    : cfg.hat === 'kerchief' ? <><mesh position={[0, 0.052, -0.004]} rotation={[0.35, 0, 0]} material={m.hat}><sphereGeometry args={[0.057, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.55]} /></mesh>
      <mesh geometry={G.small} position={[0, 0.03, -0.058]} scale={[1.4, 1, 0.8]} material={m.hat} /></> : null
  return <group scale={s}>
    <group ref={set('pelvis')} position={[0, 0.25, 0]}>
      <mesh geometry={G.hips} scale={[1, 0.72, 0.8]} material={dressy ? m.dress : m.bottom} />
      {leg(-1, 'thL', 'knL', 'ftL')}{leg(1, 'thR', 'knR', 'ftR')}
      {dressy && <mesh geometry={cfg.short ? G.shortSkirt : G.skirt} scale={[1, 1, 0.86]} material={m.dress}><Outlines thickness={0.003} color={INK} /></mesh>}
      {cfg.shorts && <mesh geometry={G.shortSkirt} scale={[0.95, 0.9, 0.82]} material={m.bottom} />}
      <group ref={set('chest')} position={[0, 0.022, 0]}>
        <mesh geometry={G.torso} scale={[1, 1, 0.74]} material={cfg.outfit === 'dress' && !cfg.sailor ? m.dress : m.top}><Outlines thickness={0.003} color={INK} /></mesh>
        {cfg.outfit === 'overalls' && <><mesh position={[0, 0.04, 0.033]} material={m.bottom}><boxGeometry args={[0.062, 0.07, 0.012]} /></mesh>
          {[-1, 1].map(x => <mesh key={x} position={[x * 0.024, 0.085, 0.0]} rotation={[0, 0, x * 0.1]} material={m.bottom}><boxGeometry args={[0.012, 0.06, 0.076]} /></mesh>)}
          {[-1, 1].map(x => <mesh key={'b' + x} position={[x * 0.022, 0.07, 0.04]} material={m.apron}><sphereGeometry args={[0.005, 6, 5]} /></mesh>)}</>}
        {cfg.outfit === 'apron' && <mesh position={[0, -0.03, 0.038]} rotation={[-0.06, 0, 0]} material={m.apron}><boxGeometry args={[0.074, 0.17, 0.006]} /><Outlines thickness={0.002} color={INK} /></mesh>}
        {cfg.sailor && <mesh position={[0, 0.1, -0.02]} rotation={[0.5, 0, 0]} material={m.bottom}><boxGeometry args={[0.085, 0.004, 0.06]} /></mesh>}
        {cfg.bag && <><mesh position={[0.05, 0.0, -0.01]} material={m.bag}><boxGeometry args={[0.028, 0.04, 0.035]} /><Outlines thickness={0.002} color={INK} /></mesh><mesh position={[0, 0.06, 0]} rotation={[0, 0, -0.75]} material={m.bag}><torusGeometry args={[0.062, 0.003, 4, 20]} /></mesh></>}
        <mesh geometry={G.neck} position={[0, 0.132, 0]} material={m.skin} />
        {arm(-1, 'shL', 'elL')}{arm(1, 'shR', 'elR')}
        <group ref={set('head')} position={[0, 0.145, 0]} scale={hs}>
          <mesh geometry={G.head} position={[0, 0.045, 0]} scale={[1, 1.04, 0.96]} material={m.skin}><Outlines thickness={0.003} color={INK} /></mesh>
          {[-1, 1].map(x => <group key={x} position={[x * 0.018, 0.043, 0.044]}>
            <mesh geometry={G.eye} scale={[0.78, 1.18, 0.5]} material={eyeMat} />
            <mesh geometry={G.hi} position={[0.002, 0.004, 0.004]} material={hiMat} />
            <mesh position={[0, 0.019, 0.002]} rotation={[0, 0, -x * 0.12]} material={m.hair}><boxGeometry args={[0.014, 0.0028, 0.003]} /></mesh>
          </group>)}
          <mesh geometry={G.small} position={[0, 0.033, 0.049]} scale={0.45} material={m.skin} />
          <mesh position={[0, 0.021, 0.0465]} rotation={[0, 0, 0]} scale={[1, 0.55, 0.4]} material={mouthMat}><sphereGeometry args={[0.0065, 8, 6]} /></mesh>
          {(cfg.cheeks || kid) && [-1, 1].map(x => <mesh key={'c' + x} geometry={G.small} position={[x * 0.031, 0.028, 0.039]} scale={[0.85, 0.55, 0.4]} material={m.cheek} />)}
          {[-1, 1].map(x => <mesh key={'e' + x} geometry={G.small} position={[x * 0.049, 0.04, 0]} scale={[0.6, 1, 0.8]} material={m.skin} />)}
          {hair()}{hat()}
        </group>
      </group>
    </group>
  </group>
}
