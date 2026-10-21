import * as THREE from 'three'
import React, { useMemo, useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { Outlines } from '@react-three/drei'
import { R, height, toonRamp, wind, place } from './world.js'
export const q = new URLSearchParams(location.search)
export const INK = '#4a3a35'
// T.h: monotonic in-game hours (advances 24 h per day length even when ?t= pins the lighting) for game-time cooldowns
export const T = { phase: 0.3, night: 0, dusk: 0, day: 1, sun: new THREE.Vector3(), h: 0 }
if (typeof window !== 'undefined') window.__T = T
// Stage C (lazy systems/liveC.js) hooks: f(camera, planet, dt) -> true takes the camera (photo mode); pin(obj, dt) after her pose (train ride)
export const CAMX = { f: null, pin: null }
export const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t) }
export const C = (h) => new THREE.Color(h)
// cached read-only colours for per-frame lerp targets (C() allocates; these must never be mutated)
const _cc = new Map(); export const CC = (h) => { let c = _cc.get(h); if (!c) _cc.set(h, c = new THREE.Color(h)); return c }
export const toon = (c, o = {}) => new THREE.MeshToonMaterial({ color: c, gradientMap: toonRamp, ...o })
export const glowMats = []
export const glow = (c) => { const m = new THREE.MeshBasicMaterial({ color: c, toneMapped: false }); m.userData.base = C(c); glowMats.push(m); return m }
export const MAT = { wall: toon('#fbf3e4'), wall2: toon('#f2e2c4'), roofs: ['#d9655b', '#5f8fc4', '#e8a24a', '#c97b9a'].map(c => toon(c)), wood: toon('#8a5a3c'), stone: toon('#cfc3b0'), white: toon('#fffaf0'), win: glow('#ffcf6e'), lamp: glow('#ffd27a'), sail: toon('#f6ead2') }
export const VIEW = { mode: ['orbit', 'detail', 'lineup', 'zone', 'hero', 'charstudio'].includes(q.get('view')) ? q.get('view') : 'follow' }
export const OCC = [], occ = (el) => { if (el && !OCC.includes(el)) OCC.push(el) }
export const RC = new THREE.Raycaster()
window.__setView = (m) => { VIEW.mode = m }
export const planetRef = { current: null }
// Large instance sets are split into spatial clusters (by nearest of 42 icosphere directions) so each
// cluster gets a tight bounding sphere (frustum culling) and can be dropped when past the planet's horizon.
// Same instances, same per-instance transforms/colours: only which batches are submitted changes.
export const HCL = [] // { mesh, c: local centre direction, rad: angular radius }
const DIRS = (() => { const g = new THREE.IcosahedronGeometry(1, 1), p = g.attributes.position, a = []; for (let i = 0; i < p.count; i++) { const v = new THREE.Vector3().fromBufferAttribute(p, i).normalize(); if (!a.some(u => u.distanceToSquared(v) < 1e-6)) a.push(v) } g.dispose(); return a })()
const CLUSTER_MIN = 160
// mobile orbit: the densest sets (grass) draw every other instance from orbit (budget 500k tris)
const isThin = () => typeof document !== 'undefined' && document.documentElement.classList.contains('tp-touch')
const DIRS12 = (() => { const g = new THREE.IcosahedronGeometry(1, 0), p = g.attributes.position, a = []; for (let i = 0; i < p.count; i++) { const v = new THREE.Vector3().fromBufferAttribute(p, i).normalize(); if (!a.some(u => u.distanceToSquared(v) < 1e-6)) a.push(v) } g.dispose(); return a })()
function InstancedBatch({ items, geo, mat, outline, isOcc, hc, lo, lo2 }) {
  const ref = useRef(), lref = useRef(), l2ref = useRef()
  useEffect(() => { const m = ref.current, o = new THREE.Object3D(); items.forEach((it, i) => { o.position.copy(it.pos); o.quaternion.copy(it.q); o.scale.setScalar(it.s); o.updateMatrix(); m.setMatrixAt(i, o.matrix); if (it.c) m.setColorAt(i, it.c) }); m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true
    // bounds are computed here, after the instance matrices exist (a lazy compute can catch identity matrices)
    m.computeBoundingSphere(); m.boundingSphere.radius += 0.35
    const l = lref.current; if (l) { l.instanceMatrix = m.instanceMatrix; l.instanceColor = m.instanceColor; l.boundingSphere = m.boundingSphere.clone(); l.layers.disable(0) }
    const l2 = l2ref.current; if (l2) { l2.instanceMatrix = m.instanceMatrix; l2.instanceColor = m.instanceColor; l2.boundingSphere = m.boundingSphere.clone(); l2.layers.disable(0) }
    if (hc) { const e = { mesh: m, lo: l, lo2: l2, ...hc }; HCL.push(e); return () => { const k = HCL.indexOf(e); if (k >= 0) HCL.splice(k, 1) } } }, [])
  const hi = <instancedMesh ref={el => { ref.current = el; if (isOcc) occ(el) }} args={[geo, mat, items.length]}>{outline && <Outlines thickness={outline} color={INK} />}</instancedMesh>
  // low-poly twin sharing the same instance buffers; only clustered sets (hc) get swapped
  // optional third tier (lo2) for the orbit view / very far clusters
  return lo && hc ? <>{hi}<instancedMesh ref={lref} args={[lo, mat, items.length]} />{lo2 && <instancedMesh ref={l2ref} args={[lo2, mat, items.length]} />}</> : hi
}
export function Instanced(props) {
  const { items } = props
  const groups = useMemo(() => {
    if (items.length < CLUSTER_MIN) return null
    const b = DIRS.map(() => []), _n = new THREE.Vector3()
    for (const it of items) { _n.copy(it.pos).normalize(); let k = 0, best = -2; for (let j = 0; j < DIRS.length; j++) { const d = DIRS[j].dot(_n); if (d > best) { best = d; k = j } } b[k].push(it) }
    if (!props.geo.boundingSphere) props.geo.computeBoundingSphere()
    const ext = props.geo.boundingSphere.center.length() + props.geo.boundingSphere.radius // furthest point from the instance origin
    return b.map((list, j) => { if (!list.length) return null; const c = new THREE.Vector3(); list.forEach(it => c.add(_n.copy(it.pos).normalize())); c.normalize(); let rad = 0, top = 0
      list.forEach(it => { rad = Math.max(rad, c.angleTo(_n.copy(it.pos).normalize())); top = Math.max(top, it.pos.length() + ext * it.s) })
      // tall instances stay visible past the ground horizon: widen by the extra angle their tops can be seen over it
      const lift = Math.acos(Math.min(1, R / Math.max(R, top)))
      return { list, hc: { c, rad: rad + lift + 0.03 } } }).filter(Boolean)
  }, [items])
  // orbit view: the whole set in ~12 coarse clusters with its cheapest geometry (the fine 42-way clusters cost a
  // draw call each, and from orbit everything is a few px anyway). Swapped in/out by HorizonCull.
  const coarse = useMemo(() => { if (!groups) return null; const b = DIRS12.map(() => []), _n = new THREE.Vector3()
    for (const it of items) { _n.copy(it.pos).normalize(); let k = 0, best = -2; for (let j = 0; j < DIRS12.length; j++) { const d = DIRS12[j].dot(_n); if (d > best) { best = d; k = j } } b[k].push(it) }
    const thin = isThin() && items.length > 1200; /* grass + flowers */ return b.map(list => { if (thin) list = list.filter((_, k) => k % 2 === 0); if (!list.length) return null; const c = new THREE.Vector3(); list.forEach(it => c.add(_n.copy(it.pos).normalize())); c.normalize(); let rad = 0; list.forEach(it => { rad = Math.max(rad, c.angleTo(_n.copy(it.pos).normalize())) }); return { list, hc: { c, rad: rad + 0.05, orbit: true } } }).filter(Boolean) }, [groups])
  if (!groups) return <InstancedBatch {...props} />
  const og = props.lo2 || props.lo || props.geo
  return <>{groups.map((g, i) => <InstancedBatch key={i} {...props} items={g.list} hc={g.hc} />)}{coarse.map((g, i) => <InstancedBatch key={'o' + i} items={g.list} geo={og} mat={props.mat} hc={g.hc} />)}</>
}
export const PU = { uDay: { value: 1 } }
export const NOISE_GLSL = `float ph(vec3 p){ return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453); }
float pn3(vec3 p){ vec3 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(mix(ph(i),ph(i+vec3(1,0,0)),f.x),mix(ph(i+vec3(0,1,0)),ph(i+vec3(1,1,0)),f.x),f.y),mix(mix(ph(i+vec3(0,0,1)),ph(i+vec3(1,0,1)),f.x),mix(ph(i+vec3(0,1,1)),ph(i+vec3(1,1,1)),f.x),f.y),f.z); }
float pfbm(vec3 p){ float s=0., a=.5; for(int i=0;i<4;i++){ s+=a*pn3(p); p*=2.07; a*=.5; } return s; }`
export function paint(mat, amt = 0.12, shadow = true, scale = 2.2) { mat.userData.painted = true
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
// Terrain ink: darkens a constant-pixel-width band where the surface turns away from the eye (planet rim,
// hill ridges against farther ground), so the silhouette reads as an ink line without a hull copy.
// ndv / fwidth(ndv) = pixels to the silhouette, so the line stays ~W px wide at any distance.
export const INK_W = { value: 2.6 }, INK_K = { value: 1100 } // INK_K = px per world unit at distance 1 (set per frame by HorizonCull)
export function inkRim(mat) { const prev = mat.onBeforeCompile, key = mat.customProgramCacheKey
  mat.onBeforeCompile = (sh, r) => { prev && prev(sh, r); sh.uniforms.uInkW = INK_W; sh.uniforms.uInkK = INK_K
    sh.fragmentShader = 'uniform float uInkW, uInkK;\n' + sh.fragmentShader.replace('#include <dithering_fragment>', `#include <dithering_fragment>
      { vec3 Vd = normalize(vViewPosition); float ndv = abs(dot(normalize(vNormal), Vd));
        float px = ndv / max(fwidth(ndv), 1e-4);
        // width = the old hull's 0.06 world units projected (thick on near ridges), never under uInkW px
        float wpx = clamp(.06 * uInkK / length(vViewPosition), uInkW, 28.); float ink = 1. - smoothstep(wpx * .7, wpx, px);
        gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(${[0x4a, 0x3a, 0x35].map(v => (v / 255).toFixed(3)).join(',')}), ink * .92); }`) }
  mat.customProgramCacheKey = () => (key ? key() : '') + 'ink'
  return mat
}
paint(MAT.wall, 0.1, true, 6); paint(MAT.wall2, 0.1, true, 6); MAT.roofs.forEach(m => paint(m, 0.14, true, 5)); paint(MAT.wood, 0.15, false, 9)
export function Basis({ n, fwd, lift = 0, children }) {
  const m = useMemo(() => { const nn = n.clone().normalize(), f = fwd.clone().addScaledVector(nn, -fwd.dot(nn)).normalize(); const s = new THREE.Vector3().crossVectors(nn, f); const q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(s, nn, f)); return { p: nn.clone().multiplyScalar(R + height(nn) + lift), q } }, [])
  return <group position={m.p} quaternion={m.q}>{children}</group>
}
export function Surface({ n, lift = 0, spin = 0, children }) { const p = useMemo(() => place(n, lift, spin), []); return <group position={p.pos} quaternion={p.q}>{children}</group> }