import * as THREE from 'three'
import React, { useMemo, useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { Outlines } from '@react-three/drei'
import { R, height, toonRamp, wind, place } from './world.js'
export const q = new URLSearchParams(location.search)
export const INK = '#4a3a35'
export const T = { phase: 0.3, night: 0, dusk: 0, day: 1, sun: new THREE.Vector3() }
export const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t) }
export const C = (h) => new THREE.Color(h)
export const toon = (c, o = {}) => new THREE.MeshToonMaterial({ color: c, gradientMap: toonRamp, ...o })
export const glowMats = []
export const glow = (c) => { const m = new THREE.MeshBasicMaterial({ color: c, toneMapped: false }); m.userData.base = C(c); glowMats.push(m); return m }
export const MAT = { wall: toon('#fbf3e4'), wall2: toon('#f2e2c4'), roofs: ['#d9655b', '#5f8fc4', '#e8a24a', '#c97b9a'].map(c => toon(c)), wood: toon('#8a5a3c'), stone: toon('#cfc3b0'), white: toon('#fffaf0'), win: glow('#ffcf6e'), lamp: glow('#ffd27a'), sail: toon('#f6ead2') }
export const VIEW = { mode: ['orbit', 'detail', 'lineup', 'zone', 'hero', 'charstudio'].includes(q.get('view')) ? q.get('view') : 'follow' }
export const OCC = [], occ = (el) => { if (el && !OCC.includes(el)) OCC.push(el) }
export const RC = new THREE.Raycaster()
window.__setView = (m) => { VIEW.mode = m }
export const planetRef = { current: null }
export function Instanced({ items, geo, mat, outline, isOcc }) {
  const ref = useRef()
  useEffect(() => { const o = new THREE.Object3D(); items.forEach((it, i) => { o.position.copy(it.pos); o.quaternion.copy(it.q); o.scale.setScalar(it.s); o.updateMatrix(); ref.current.setMatrixAt(i, o.matrix); if (it.c) ref.current.setColorAt(i, it.c) }); ref.current.instanceMatrix.needsUpdate = true; if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true }, [])
  return <instancedMesh ref={el => { ref.current = el; if (isOcc) occ(el) }} args={[geo, mat, items.length]}>{outline && <Outlines thickness={outline} color={INK} />}</instancedMesh>
}
export const PU = { uDay: { value: 1 } }
export const NOISE_GLSL = `float ph(vec3 p){ return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453); }
float pn3(vec3 p){ vec3 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(mix(ph(i),ph(i+vec3(1,0,0)),f.x),mix(ph(i+vec3(0,1,0)),ph(i+vec3(1,1,0)),f.x),f.y),mix(mix(ph(i+vec3(0,0,1)),ph(i+vec3(1,0,1)),f.x),mix(ph(i+vec3(0,1,1)),ph(i+vec3(1,1,1)),f.x),f.y),f.z); }
float pfbm(vec3 p){ float s=0., a=.5; for(int i=0;i<4;i++){ s+=a*pn3(p); p*=2.07; a*=.5; } return s; }`
export function paint(mat, amt = 0.12, shadow = true, scale = 2.2) {
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = wind.time; sh.uniforms.uDay = PU.uDay
    sh.vertexShader = 'varying vec3 vPW; varying vec3 vPO;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vPO = transformed; vPW = (modelMatrix*vec4(transformed,1.)).xyz;')
    sh.fragmentShader = 'uniform float uTime, uDay; varying vec3 vPW; varying vec3 vPO;\n' + NOISE_GLSL + '\n' + sh.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
      float pn = pfbm(vPO*${scale.toFixed(2)}); float pn2 = pn3(vPO*${(scale * 9).toFixed(2)});
      diffuseColor.rgb *= 1. - ${amt.toFixed(3)} + 2.*${amt.toFixed(3)}*pn; diffuseColor.rgb *= .96 + .08*pn2; // brushy colour variation
      ${shadow ? `float ca = -uTime*0.03; vec3 cp = vec3(cos(ca)*vPW.x - sin(ca)*vPW.z, vPW.y, sin(ca)*vPW.x + cos(ca)*vPW.z);
      float cs = smoothstep(.5,.66, pfbm(cp*.42 + vec3(3.1)));
      diffuseColor.rgb *= mix(1., .74, cs*uDay); diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb*vec3(.86,.9,1.05), cs*uDay*.6);` : ''}`)
  }
  mat.customProgramCacheKey = () => 'paint' + amt + shadow + scale
  return mat
}
paint(MAT.wall, 0.1, true, 6); paint(MAT.wall2, 0.1, true, 6); MAT.roofs.forEach(m => paint(m, 0.14, true, 5)); paint(MAT.wood, 0.15, false, 9)
export function Basis({ n, fwd, lift = 0, children }) {
  const m = useMemo(() => { const nn = n.clone().normalize(), f = fwd.clone().addScaledVector(nn, -fwd.dot(nn)).normalize(); const s = new THREE.Vector3().crossVectors(nn, f); const q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(s, nn, f)); return { p: nn.clone().multiplyScalar(R + height(nn) + lift), q } }, [])
  return <group position={m.p} quaternion={m.q}>{children}</group>
}
export function Surface({ n, lift = 0, spin = 0, children }) { const p = useMemo(() => place(n, lift, spin), []); return <group position={p.pos} quaternion={p.q}>{children}</group> }