// little floating effects: hearts (petting), speech bubbles ("Woof!"), dirt / water puffs
import * as THREE from 'three'
import React, { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { canvasTex, GEO } from '../home/kit.jsx'
const heartTex = () => canvasTex(128, 128, (x) => { x.translate(64, 70); x.scale(1.9, 1.9); x.beginPath(); x.moveTo(0, 22); x.bezierCurveTo(-6, 14, -28, 4, -26, -10); x.bezierCurveTo(-24, -26, -4, -26, 0, -12); x.bezierCurveTo(4, -26, 24, -26, 26, -10); x.bezierCurveTo(28, 4, 6, 14, 0, 22); x.fillStyle = '#ff7f9e'; x.fill(); x.lineWidth = 3.5; x.strokeStyle = '#7a2e3e'; x.stroke(); x.fillStyle = 'rgba(255,255,255,.75)'; x.beginPath(); x.ellipse(-12, -12, 5, 3.5, -0.6, 0, 7); x.fill() })
let HT = null
export function burst(g, n = 5) { if (!g) return; const s = g.userData.slots; for (let i = 0; i < n; i++) { const k = s.findIndex(x => x.t >= 1); if (k < 0) return; s[k].t = -i * 0.18; s[k].x = (Math.random() - 0.5) * 0.12; s[k].z = (Math.random() - 0.5) * 0.08; s[k].w = Math.random() * 6 } }
export function Hearts({ gref, y = 0.2, size = 0.11 }) {
  const mats = useMemo(() => { HT = HT || heartTex(); return [...Array(8)].map(() => new THREE.SpriteMaterial({ map: HT, transparent: true, depthWrite: false })) }, [])
  const g = useRef(), slots = useMemo(() => mats.map(() => ({ t: 1, x: 0, z: 0, w: 0 })), [])
  useFrame((_, dt) => { const G = g.current; if (!G) return; G.userData.slots = slots; if (gref) gref.current = G
    G.children.forEach((sp, i) => { const s = slots[i]; if (s.t < 1) s.t += dt / 1.6; const k = Math.max(0, s.t); sp.visible = s.t >= 0 && s.t < 1; if (!sp.visible) return
      sp.position.set(s.x + Math.sin(k * 6 + s.w) * 0.02, y + k * 0.22, s.z); const sc = size * Math.min(1, k * 6) * (1 - k * 0.3); sp.scale.set(sc, sc, 1); sp.material.opacity = 1 - k * k }) })
  return <group ref={g} userData={{ slots }}>{mats.map((m, i) => <sprite key={i} material={m} visible={false} />)}</group>
}
const bubbleTex = (txt) => canvasTex(256, 128, (x) => { x.fillStyle = '#fffaf0'; x.strokeStyle = '#4a3a35'; x.lineWidth = 6; x.beginPath(); x.ellipse(128, 56, 110, 46, 0, 0, 7); x.fill(); x.stroke(); x.beginPath(); x.moveTo(70, 92); x.lineTo(56, 124); x.lineTo(100, 98); x.fill(); x.stroke(); x.fillStyle = '#fffaf0'; x.fillRect(66, 86, 40, 12); x.fillStyle = '#5a3a24'; x.font = '600 54px Fredoka, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(txt, 128, 58) })
export function Bubble({ bref, text = 'Woof!' }) {
  const m = useMemo(() => new THREE.SpriteMaterial({ map: bubbleTex(text), transparent: true, depthWrite: false }), [])
  return <sprite ref={bref} material={m} visible={false} scale={[0.22, 0.11, 1]} />
}
// puffs: dirt (dig) or droplets (splash)
export function Puffs({ pref, color = '#a8835a', n = 10 }) {
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ color, transparent: true, depthWrite: false }), [])
  const g = useRef(), P = useMemo(() => [...Array(n)].map(() => ({ t: 1, v: new THREE.Vector3(), p: new THREE.Vector3() })), [])
  useFrame((_, dt) => { const G = g.current; if (!G) return; if (pref) pref.current = { emit: (k = 3, up = 0.6, spread = 0.4, o) => { for (let i = 0; i < k; i++) { const s = P.find(s => s.t >= 1); if (!s) return; s.t = 0; s.p.set(o ? o[0] : 0, o ? o[1] : 0.02, o ? o[2] : 0); s.v.set((Math.random() - 0.5) * spread, up * (0.6 + Math.random() * 0.6), (Math.random() - 0.5) * spread - (o ? 0 : 0.2)) } } }
    G.children.forEach((c, i) => { const s = P[i]; if (s.t < 1) { s.t += dt / 0.7; s.v.y -= 2.2 * dt; s.p.addScaledVector(s.v, dt) } c.visible = s.t < 1; c.position.copy(s.p); c.scale.setScalar(0.012 * (1 - s.t * 0.5)) }); mat.opacity = 0.9 })
  return <group ref={g}>{P.map((_, i) => <mesh key={i} geometry={GEO.sphL} material={mat} visible={false} />)}</group>
}
