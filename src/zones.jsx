// Biomes / zones for the bigger planet: lake + dock, cliff + waterfall, rice terraces, train loop,
// harbour, mossy ruins, camphor forest, giant tree hill, meadow flowers.
import * as THREE from 'three'
import React, { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Outlines } from '@react-three/drei'
import { R, K, height, rnd, place, around, zv, ZONES, TRAIN_LAT, LAKE_W, HARB_W, CLIFF_H, zoneAng, streamDist, wind, windify, dir, streamDir, pathDir, distToCurve } from './world.js'
import { INK, T, C, CC, toon, MAT, VIEW, planetRef, Instanced, paint, Surface, glow, occ } from './common.jsx'
import { TRAIN } from './world/village.js'

const Zc = Object.fromEntries(Object.entries(ZONES).map(([k, z]) => [k, zv(z)]))
const angTo = (n, k) => zoneAng(n, ZONES[k])
const latOf = (n) => Math.asin(Math.max(-1, Math.min(1, n.y / n.length())))
export { Zc }

// ---------- placement helpers ----------
export const LAKE_DOCK_B = 3.6, HARB_PIER_B = 1.2
export const HARBOUR_HOUSES = [0, 1, 2, 3, 4].map(k => around(Zc.harbour, ZONES.harbour.r * 1.3, 2.0 + k * 0.62)).filter(n => streamDist(n) > 0.05)
export const MILL_FIELD = []
for (let i = 0; i < 9 && MILL_FIELD.length < 6; i++) { const n = around(Zc.mills, ZONES.mills.r * (0.25 + 0.7 * ((i * 0.37) % 1)), i * 2.2); if (distToCurve(n, pathDir, 200) > 0.05 && !MILL_FIELD.some(m => m.angleTo(n) < 0.07)) MILL_FIELD.push(n) }
const RUIN_COLS = [0, 1, 2, 3, 4, 5, 6].map(k => ({ n: around(Zc.ruins, 0.55 / R, k * 0.9 + 0.3), h: [0.75, 0.35, 0.6, 0.2, 0.8, 0.45, 0.3][k], tilt: [0, 0.1, 0, 0.25, 0, 0.05, 0.15][k] }))
const CAMPHORS = []
for (let i = 0; i < 160 && CAMPHORS.length < 34; i++) { const n = around(Zc.forest, Math.sqrt(rnd()) * ZONES.forest.r, rnd() * 6.283); if (streamDist(n) < 0.06 * K || distToCurve(n, pathDir, 120) < 0.06 * K || angTo(n, 'giant') < 0.12 || CAMPHORS.some(c => c.n.angleTo(n) < 0.085)) continue; CAMPHORS.push({ n, s: 0.85 + rnd() * 0.5, spin: rnd() * 6 }) }

export function zoneBusy(n) {
  return angTo(n, 'lake') < ZONES.lake.r * 1.2 || angTo(n, 'harbour') < ZONES.harbour.r * 1.15 || angTo(n, 'cliff') < ZONES.cliff.r + 0.035 || angTo(n, 'terraces') < ZONES.terraces.r + 0.02 ||
    angTo(n, 'ruins') < ZONES.ruins.r || angTo(n, 'mills') < ZONES.mills.r + 0.03 || angTo(n, 'meadow') < ZONES.meadow.r * 0.75 || angTo(n, 'giant') < 1.6 / R || Math.abs(latOf(n) - TRAIN_LAT) < 0.3 / R || MILL_FIELD.some(m => m.angleTo(n) < 0.45 / R) || HARBOUR_HOUSES.some(h => h.angleTo(n) < 0.6 / R) || CAMPHORS.some(c => c.n.angleTo(n) < 0.35 / R)
}
export function zoneWet(n) { return angTo(n, 'lake') < ZONES.lake.r * 1.1 || angTo(n, 'harbour') < ZONES.harbour.r * 1.08 || angTo(n, 'terraces') < ZONES.terraces.r || Math.abs(latOf(n) - TRAIN_LAT) < 0.18 / R || angTo(n, 'ruins') < 0.7 / R }
export const ZONE_COLLIDERS = [
  { n: Zc.lake, r: ZONES.lake.r * 0.98 }, { n: Zc.harbour, r: ZONES.harbour.r * 0.98 }, { n: Zc.cliff, r: ZONES.cliff.r + 0.012 }, { n: Zc.giant, r: 0.62 / R },
  ...RUIN_COLS.map(c => ({ n: c.n, r: 0.13 / R })), ...CAMPHORS.map(c => ({ n: c.n, r: 0.16 * c.s / R })), ...HARBOUR_HOUSES.map(n => ({ n, r: 0.42 / R })), ...MILL_FIELD.map(n => ({ n, r: 0.3 / R })),
]
// zone ground colours (applied in Ground vertex colours)
const cRock = C('#a8a294'), cPaddy = C('#a6dcc0'), cRiser = C('#8fb86a'), cForest = C('#4f8f52'), cMeadow = C('#c4e08a'), cSand = C('#e6d4a6'), cRuin = C('#9fb08a'), cBed = C('#7fb8b0')
export function zoneColour(n, col) {
  let a = angTo(n, 'forest'); if (a < ZONES.forest.r + 0.05) col.lerp(cForest, 0.55 * Math.min(1, (ZONES.forest.r + 0.05 - a) / 0.08))
  a = angTo(n, 'meadow'); if (a < ZONES.meadow.r) col.lerp(cMeadow, 0.35 * (1 - a / ZONES.meadow.r))
  for (const k of ['lake', 'harbour']) { a = angTo(n, k); const r = ZONES[k].r; if (a < r * 1.3) col.lerp(a < r * 1.02 ? cBed : cSand, a < r * 1.02 ? 0.8 : Math.min(1, (r * 1.3 - a) / (r * 0.2)) * 0.85) }
  a = angTo(n, 'terraces'); if (a < ZONES.terraces.r) { const f = (1.05 * Math.max(0, 1 - a / ZONES.terraces.r)) / 0.15; col.copy((f - Math.floor(f)) > 0.8 ? cRiser : cPaddy).lerp(CC('#c8e8a0'), 0.25 * Math.sin(n.x * 90) ** 2) }
  a = angTo(n, 'ruins'); if (a < ZONES.ruins.r) col.lerp(cRuin, 0.4)
  if (Math.abs(latOf(n) - TRAIN_LAT) < 0.16 / R) col.lerp(CC('#b9a58a'), 0.8)
}
export const rockify = (n, nrm, col) => { if (angTo(n, 'cliff') < ZONES.cliff.r + 0.05) { const d = nrm.dot(n); if (d < 0.86) col.copy(cRock).multiplyScalar(0.85 + 0.25 * Math.sin(n.y * 300)) } }

// ---------- distance culling ----------
const _w = new THREE.Vector3()
export function Cull({ n, d = 14, children }) {
  const g = useRef(), camera = useThree(s => s.camera), c = useMemo(() => n.clone().normalize().multiplyScalar(R), [])
  useFrame(() => { if (!g.current || !planetRef.current) return; if (VIEW.mode === 'orbit') { g.current.visible = true; return } _w.copy(c).applyMatrix4(planetRef.current.matrixWorld); g.current.visible = camera.position.distanceTo(_w) < d })
  return <group ref={g}>{children}</group>
}
// absolute-radius frame on the sphere
export function Frame({ n, fwd, rad, children }) {
  const m = useMemo(() => { const nn = n.clone().normalize(), f = fwd.clone().addScaledVector(nn, -fwd.dot(nn)).normalize(), s = new THREE.Vector3().crossVectors(nn, f); return { p: nn.clone().multiplyScalar(rad ?? R + height(nn)), q: new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(s, nn, f)) } }, [])
  return <group position={m.p} quaternion={m.q}>{children}</group>
}
const toward = (a, b) => b.clone().addScaledVector(a, -a.dot(b)).normalize()

// ---------- water ----------
function waterMaterial(deep, shallow) {
  const m = new THREE.ShaderMaterial({ uniforms: { uTime: wind.time, uN: { value: 0 }, uD: { value: 0 }, uDeep: { value: C(deep) }, uSh: { value: C(shallow) } },
    vertexShader: `varying vec2 vUv; varying vec3 vP; void main(){ vUv = uv; vP = position; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `varying vec2 vUv; varying vec3 vP; uniform float uTime,uN,uD; uniform vec3 uDeep,uSh;
    float h(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
    float n2(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y); }
    void main(){ float e = vUv.y; vec2 p = vP.xz*2.2;
      vec3 c = mix(uDeep, uSh, smoothstep(.55,1.,1.-e));
      float r = n2(p + vec2(uTime*.25, uTime*.17)) + n2(p*1.7 - vec2(uTime*.2, -uTime*.1));
      c = mix(c, vec3(.93,.99,1.), smoothstep(1.32,1.45,r)*.75);
      c = mix(c, vec3(.97,1.,1.), smoothstep(.86,.97,1.-e)*.8);
      c = mix(c, c*vec3(1.,.82,.78)+vec3(.12,.05,.06), uD*.5); c = mix(c, vec3(.1,.16,.33)+vec3(.15,.13,.05)*smoothstep(1.3,1.45,r), uN*.8);
      gl_FragColor = vec4(c,1.); }` })
  return m
}
function WaterCap({ c, r, level, deep = '#3f9fc0', shallow = '#8fdcdc' }) {
  const mat = useMemo(() => waterMaterial(deep, shallow), [])
  const q = useMemo(() => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), c.clone().normalize()), [])
  useFrame(() => { mat.uniforms.uN.value = T.night; mat.uniforms.uD.value = T.dusk })
  return <mesh quaternion={q} material={mat}><sphereGeometry args={[R + level, 72, 14, 0, Math.PI * 2, 0, r]} /></mesh>
}
const fallMat = () => new THREE.ShaderMaterial({ transparent: true, side: THREE.DoubleSide, uniforms: { uTime: wind.time, uN: { value: 0 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
  fragmentShader: `varying vec2 vUv; uniform float uTime,uN; float h(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
  void main(){ float x = vUv.x*14.; float col = floor(x); float sp = .7 + h(vec2(col,1.))*.6; float s = fract(vUv.y*3. + uTime*sp*1.4 + h(vec2(col,3.)));
    vec3 c = mix(vec3(.55,.85,.95), vec3(.97,1.,1.), smoothstep(.55,.95,s)); c = mix(c, vec3(1.), smoothstep(.15,0.,vUv.y)*.8);
    float edge = smoothstep(0.,.12,vUv.x)*smoothstep(1.,.88,vUv.x); c = mix(c, vec3(.12,.2,.38)+vec3(.2)*smoothstep(.6,.95,s), uN*.75);
    gl_FragColor = vec4(c, (.82 + .18*s)*edge); }` })
const stripMat = () => new THREE.ShaderMaterial({ uniforms: { uTime: wind.time, uN: { value: 0 } }, polygonOffset: true, polygonOffsetFactor: -3,
  vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
  fragmentShader: `varying vec2 vUv; uniform float uTime,uN; void main(){ float e = abs(vUv.x-.5)*2.; vec3 c = mix(vec3(.38,.72,.86), vec3(.6,.88,.9), e);
    float f = sin(vUv.y*1.3 - uTime*3.5 + sin(vUv.x*9.)*1.5); c = mix(c, vec3(.92,.99,1.), smoothstep(.8,.9,f)*.8); c = mix(c, vec3(.96,1.,1.), smoothstep(.75,.95,e)); c = mix(c, vec3(.13,.2,.38), uN*.75); gl_FragColor = vec4(c,1.); }` })
function rib(a, b, width, lift, N = 40, fixedR) {
  const pos = [], uv = [], idx = []
  for (let i = 0; i <= N; i++) { const t = i / N, n = a.clone().lerp(b, t).normalize(), side = new THREE.Vector3().crossVectors(b.clone().sub(a), n).normalize()
    for (const s of [-1, 1]) { const d = n.clone().addScaledVector(side, s * width / R).normalize(); pos.push(...d.multiplyScalar(fixedR ?? (R + height(d) + lift)).toArray()); uv.push(s * 0.5 + 0.5, t * 10) }
    if (i < N) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2) } }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return g
}

const ZM = { plank: paint(toon('#b07a4f'), 0.18, true, 12), post: toon('#7a4e34'), hull: paint(toon('#c96a4a'), 0.12, false, 10), hullIn: toon('#e8d2a8'), stone: paint(toon('#c2bbaa'), 0.18, true, 9), mossy: paint(toon('#b8b8a2'), 0.22, true, 7), moss: toon('#7fae5f'), ivy: toon('#5f9a52'), rope: toon('#e8dcc0'), paper: toon('#ffffff', { side: THREE.DoubleSide }), red: toon('#d9534f'), white: toon('#f8f4ea'), rail: toon('#8a8f98'), sleeper: paint(toon('#7a5a42'), 0.2, false, 20), eng: toon('#3f6f5a'), engRed: toon('#c9473f'), black: toon('#33302e'), brass: toon('#e0b24a'), coach: [toon('#f2e2c4'), toon('#7fb8c8'), toon('#e8a24a')], coachRoof: toon('#6a4a3a'), crate: paint(toon('#c99a62'), 0.2, false, 15), barrel: toon('#9a6a42'), smoke: toon('#f4f1ee', { transparent: true, opacity: 0.85 }), foam: toon('#ffffff', { transparent: true, opacity: 0.8 }), trunk: paint(toon('#7a5a46'), 0.2, false, 6), lantern: glow('#ffd27a'), win: MAT.win }

function Boat({ n, fwd, level, i = 0 }) {
  const g = useRef(); useFrame(() => { const t = wind.time.value; g.current.position.y = Math.sin(t * 1.4 + i) * 0.02; g.current.rotation.z = Math.sin(t * 1.1 + i) * 0.06; g.current.rotation.x = Math.sin(t * 0.9 + i * 2) * 0.03 })
  return <Frame n={n} fwd={fwd} rad={R + level}><group ref={g}>
    <mesh position={[0, 0.02, 0]} scale={[0.2, 0.11, 0.45]} material={ZM.hull}><sphereGeometry args={[1, 18, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} /><Outlines thickness={0.01} color={INK} /></mesh>
    <mesh position={[0, 0.021, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[0.18, 0.42, 1]} material={ZM.hullIn}><circleGeometry args={[1, 18]} /></mesh>
    <mesh position={[0, 0.04, 0.05]} material={ZM.plank}><boxGeometry args={[0.34, 0.018, 0.08]} /></mesh>
    {[-1, 1].map(s => <mesh key={s} position={[s * 0.22, 0.03, -0.05]} rotation={[0.25, 0, s * 1.2]} material={ZM.post}><cylinderGeometry args={[0.008, 0.008, 0.5, 5]} /></mesh>)}
  </group></Frame>
}
function Dock({ c, zr, b, level, len = 1.3 }) {
  const shore = around(c, zr * 1.06, b), f = toward(shore, c)
  return <Frame n={shore} fwd={f} rad={R + level + 0.12}>
    {Array.from({ length: 12 }, (_, k) => <mesh key={k} position={[0, 0, k * len / 12 - 0.05]} rotation={[0, (k % 3 - 1) * 0.03, 0]} material={ZM.plank}><boxGeometry args={[0.34, 0.025, len / 12 * 0.86]} /><Outlines thickness={0.006} color={INK} /></mesh>)}
    {[0.15, 0.6, 1.05].flatMap(z => [-1, 1].map(s => <mesh key={z + '' + s} position={[s * 0.16, -0.2, z]} material={ZM.post}><cylinderGeometry args={[0.022, 0.025, 0.5, 6]} /></mesh>))}
    <mesh position={[0.15, 0.06, len - 0.12]} material={ZM.barrel}><cylinderGeometry args={[0.05, 0.05, 0.1, 10]} /></mesh>
    <mesh position={[-0.13, 0.25, len - 0.1]} material={ZM.post}><cylinderGeometry args={[0.012, 0.014, 0.5, 5]} /></mesh>
    <mesh position={[-0.13, 0.46, len - 0.1]} material={ZM.lantern}><boxGeometry args={[0.05, 0.06, 0.05]} /></mesh>
  </Frame>
}

function Lake() {
  const z = ZONES.lake, c = Zc.lake
  return <>
    <WaterCap c={c} r={z.r * 1.12} level={LAKE_W} />
    <Dock c={c} zr={z.r} b={LAKE_DOCK_B} level={LAKE_W} />
    <Boat n={around(c, z.r * 0.62, LAKE_DOCK_B + 0.35)} fwd={around(c, z.r * 0.3, LAKE_DOCK_B + 1.2).sub(around(c, z.r * 0.62, LAKE_DOCK_B + 0.35))} level={LAKE_W} />
    {[0, 1, 2, 3, 4, 5].map(k => { const n = around(c, z.r * (1.04 + 0.04 * (k % 2)), k * 1.05 + 0.5); return <Surface key={k} n={n} spin={k}><mesh position={[0, 0.02, 0]} scale={[1, 0.5, 0.8]} material={ZM.stone}><icosahedronGeometry args={[0.09 + 0.03 * (k % 3), 0]} /><Outlines thickness={0.006} color={INK} /></mesh></Surface> })}
    {/* reeds */}
    <Instanced items={useMemo(() => Array.from({ length: 70 }, (_, k) => ({ ...place(around(c, z.r * (1.0 + rnd() * 0.08), rnd() * 6.283), -0.02, rnd() * 6), s: 0.7 + rnd() * 0.6 })), [])} geo={useMemo(() => { const g = new THREE.CylinderGeometry(0.006, 0.01, 0.32, 3); g.translate(0, 0.16, 0); return g }, [])} mat={useMemo(() => windify(toon('#6f9a4a'), 2), [])} />
  </>
}

function Waterfall() {
  const c = Zc.cliff, z = ZONES.cliff, lake = Zc.lake
  const d = toward(c, lake), edge = around(c, 0, 0).multiplyScalar(Math.cos(z.r + 0.02)).addScaledVector(d, Math.sin(z.r + 0.02)).normalize()
  const topR = R + height(around(c, z.r * 0.4, 0)) + 0.02, footN = c.clone().multiplyScalar(Math.cos(z.r + 0.075)).addScaledVector(d, Math.sin(z.r + 0.075)).normalize(), footR = R + height(footN)
  const H = topR - footR + 0.08
  const m1 = useMemo(fallMat, []), m2 = useMemo(stripMat, []), m3 = useMemo(stripMat, [])
  const lakeEdge = lake.clone().multiplyScalar(Math.cos(ZONES.lake.r * 0.92)).addScaledVector(toward(lake, c), Math.sin(ZONES.lake.r * 0.92)).normalize()
  const creek = useMemo(() => rib(footN, lakeEdge, 0.16, 0.02), [])
  const top = useMemo(() => rib(around(c, 0.02, 1), edge, 0.14, 0.012), [])
  const foam = useRef()
  useFrame(() => { m1.uniforms.uN.value = T.night; m2.uniforms.uN.value = T.night; m3.uniforms.uN.value = T.night; const t = wind.time.value; foam.current.children.forEach((f, k) => { const u = (t * 0.8 + k / 7) % 1; f.position.set(Math.sin(k * 2.3) * 0.18, u * 0.25, 0.05 + Math.cos(k * 1.7) * 0.08); f.scale.setScalar(0.06 + u * 0.08) }) })
  return <>
    <Frame n={edge} fwd={d} rad={topR}>
      <mesh position={[0, -H / 2, 0.06]} material={m1}><planeGeometry args={[0.42, H, 1, 1]} /></mesh>
      <mesh position={[0, -H / 2 + 0.02, 0.03]} rotation={[0.04, 0, 0]} material={m1}><planeGeometry args={[0.3, H, 1, 1]} /></mesh>
    </Frame>
    <Frame n={footN} fwd={d}><group ref={foam}>{Array.from({ length: 7 }, (_, k) => <mesh key={k} material={ZM.foam}><icosahedronGeometry args={[1, 1]} /></mesh>)}</group></Frame>
    <mesh geometry={creek} material={m2} />
    <mesh geometry={top} material={m3} />
    <WaterCap c={footN} r={0.32 / R} level={height(footN) + 0.012} />
  </>
}

function Terraces() {
  const c = Zc.terraces, z = ZONES.terraces
  const items = useMemo(() => { const a = []; for (let i = 0; i < 1400; i++) { const n = around(c, Math.sqrt(rnd()) * z.r * 0.95, rnd() * 6.283); const f = (1.05 * Math.max(0, 1 - zoneAng(n, z) / z.r)) / 0.15; if (f - Math.floor(f) > 0.7) continue; a.push({ ...place(n, -0.005, rnd() * 6), s: 0.7 + rnd() * 0.5, c: C('#9ccc5a').lerp(CC('#c8dc6a'), rnd()) }) } return a }, [])
  const geo = useMemo(() => { const g = new THREE.ConeGeometry(0.03, 0.11, 5); g.translate(0, 0.055, 0); return g }, [])
  const mat = useMemo(() => windify(toon('#ffffff'), 5), [])
  return <>
    <Instanced items={items} geo={geo} mat={mat} />
    {/* scarecrow + hut */}
    <Surface n={around(c, z.r * 0.15, 1)} spin={0.5}>
      <mesh position={[0, 0.25, 0]} material={ZM.post}><cylinderGeometry args={[0.015, 0.015, 0.5, 5]} /></mesh>
      <mesh position={[0, 0.36, 0]} rotation={[0, 0, Math.PI / 2]} material={ZM.post}><cylinderGeometry args={[0.012, 0.012, 0.32, 5]} /></mesh>
      <mesh position={[0, 0.34, 0]} material={ZM.coach[1]}><boxGeometry args={[0.12, 0.12, 0.06]} /><Outlines thickness={0.004} color={INK} /></mesh>
      <mesh position={[0, 0.45, 0]} material={ZM.hullIn}><sphereGeometry args={[0.045, 10, 8]} /></mesh>
      <mesh position={[0, 0.49, 0]} material={MAT.roofs[2]}><coneGeometry args={[0.09, 0.05, 12]} /><Outlines thickness={0.004} color={INK} /></mesh>
    </Surface>
    <Surface n={around(c, z.r * 1.18, 4.0)} spin={1.2}>
      <mesh position={[0, 0.15, 0]} material={ZM.trunk}><boxGeometry args={[0.36, 0.3, 0.3]} /><Outlines thickness={0.008} color={INK} /></mesh>
      <mesh position={[0, 0.38, 0]} rotation={[0, Math.PI / 4, 0]} material={toon('#d8c07a')}><coneGeometry args={[0.32, 0.26, 4]} /><Outlines thickness={0.008} color={INK} /></mesh>
    </Surface>
  </>
}

const TRAIN_SPEED = 0.05, TRAIN_LIFT = 0.055
const trainAt = new URLSearchParams(location.search).get('trainAt')
const _tn = new THREE.Vector3(), _ts = new THREE.Vector3(), _tu = new THREE.Vector3(), _tm = new THREE.Matrix4()
const ringPos = (lon, lift = TRAIN_LIFT) => { const n = dir(TRAIN_LAT, lon); return n.multiplyScalar(R + height(n) + lift) }
function Train() {
  const rails = useMemo(() => { const mk = (off) => { const pos = [], idx = []; const N = 900; for (let i = 0; i <= N; i++) { const lon = (i / N) * Math.PI * 2; for (const s of [-1, 1]) { const n = dir(TRAIN_LAT + (off + s * 0.008) / R, lon); pos.push(...n.multiplyScalar(R + height(dir(TRAIN_LAT, lon)) + 0.05).toArray()) } if (i < N) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2) } } const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g }; return [mk(-0.07), mk(0.07)] }, [])
  const sleepers = useMemo(() => { const a = [], L = 2 * Math.PI * R * Math.cos(TRAIN_LAT), N = Math.floor(L / 0.13); for (let i = 0; i < N; i++) { const lon = (i / N) * Math.PI * 2, n = dir(TRAIN_LAT, lon); const p = place(n, 0.025, 0); const east = new THREE.Vector3(Math.cos(lon), 0, -Math.sin(lon)); const f = toward(n, east); a.push({ pos: p.pos, q: new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3().crossVectors(n, f), n, f)), s: 1 }) } return a }, [])
  const cars = useRef([]), puffs = useRef()
  const o = useMemo(() => new THREE.Object3D(), [])
  useFrame(() => {
    const t = wind.time.value, lon0 = trainAt != null ? +trainAt : TRAIN.fn ? TRAIN.fn(t) : t * TRAIN_SPEED; TRAIN.cars = cars.current
    cars.current.forEach((g, k) => { if (!g) return; const lon = lon0 - k * 0.44 / (R * Math.cos(TRAIN_LAT)); const p = ringPos(lon), p2 = ringPos(lon + 0.01); const n = _tn.copy(p).normalize(), f = p2.sub(p).normalize(); g.position.copy(p); g.quaternion.setFromRotationMatrix(_tm.makeBasis(_ts.crossVectors(n, f), n, f)); g.position.addScaledVector(n, Math.abs(Math.sin(t * 12 + k)) * 0.004) })
    const eng = cars.current[0]; if (eng) { const up = _tu.copy(eng.position).normalize(); for (let k = 0; k < 8; k++) { const u = (t * 0.6 + k / 8) % 1; o.position.set(0, 0.26 + u * 0.5, 0.12 - u * 0.5).applyQuaternion(eng.quaternion).add(eng.position); o.scale.setScalar((0.03 + u * 0.09) * Math.min(1, u * 6) * (1 - u) ** 0.5); o.updateMatrix(); puffs.current.setMatrixAt(k, o.matrix) } puffs.current.instanceMatrix.needsUpdate = true }
  })
  return <>
    {rails.map((g, i) => <mesh key={i} geometry={g} material={ZM.rail} />)}
    <Instanced items={sleepers} geo={useMemo(() => new THREE.BoxGeometry(0.22, 0.02, 0.05), [])} mat={ZM.sleeper} />
    <group ref={el => cars.current[0] = el}>
      <mesh position={[0, 0.12, 0.04]} rotation={[Math.PI / 2, 0, 0]} material={ZM.eng}><cylinderGeometry args={[0.07, 0.07, 0.26, 16]} /><Outlines thickness={0.006} color={INK} /></mesh>
      <mesh position={[0, 0.17, 0.17]} rotation={[Math.PI / 2, 0, 0]} material={ZM.brass}><cylinderGeometry args={[0.04, 0.04, 0.01, 12]} /></mesh>
      <mesh position={[0, 0.22, 0.11]} material={ZM.black}><cylinderGeometry args={[0.025, 0.018, 0.08, 10]} /></mesh>
      <mesh position={[0, 0.2, 0.0]} material={ZM.brass}><sphereGeometry args={[0.025, 10, 8]} /></mesh>
      <mesh position={[0, 0.15, -0.14]} material={ZM.engRed}><boxGeometry args={[0.16, 0.18, 0.12]} /><Outlines thickness={0.006} color={INK} /></mesh>
      <mesh position={[0, 0.25, -0.14]} material={ZM.black}><boxGeometry args={[0.19, 0.02, 0.15]} /></mesh>
      {[-1, 1].map(s => <mesh key={s} position={[s * 0.081, 0.17, -0.14]} rotation={[0, s * Math.PI / 2, 0]} material={ZM.win}><planeGeometry args={[0.06, 0.05]} /></mesh>)}
      <mesh position={[0, 0.045, 0.19]} rotation={[0.6, 0, 0]} material={ZM.engRed}><boxGeometry args={[0.14, 0.05, 0.05]} /></mesh>
      {[-0.12, 0, 0.12].flatMap(z => [-1, 1].map(s => <mesh key={z + '' + s} position={[s * 0.07, 0.04, z]} rotation={[0, 0, Math.PI / 2]} material={ZM.engRed}><cylinderGeometry args={[0.035, 0.035, 0.015, 12]} /></mesh>))}
    </group>
    {[1, 2, 3].map(k => <group key={k} ref={el => cars.current[k] = el}>
      <mesh position={[0, 0.13, 0]} material={ZM.coach[k - 1]}><boxGeometry args={[0.17, 0.15, 0.36]} /><Outlines thickness={0.006} color={INK} /></mesh>
      <mesh position={[0, 0.215, 0]} rotation={[0, 0, Math.PI / 2]} scale={[0.35, 1, 1]} material={ZM.coachRoof}><cylinderGeometry args={[0.1, 0.1, 0.38, 14, 1, false, 0, Math.PI]} /></mesh>
      {[-1, 1].flatMap(s => [-0.11, 0, 0.11].map(z => <mesh key={s + '' + z} position={[s * 0.0855, 0.15, z]} rotation={[0, s * Math.PI / 2, 0]} material={ZM.win}><planeGeometry args={[0.07, 0.055]} /></mesh>))}
      {[-0.12, 0.12].flatMap(z => [-1, 1].map(s => <mesh key={z + '' + s} position={[s * 0.07, 0.04, z]} rotation={[0, 0, Math.PI / 2]} material={ZM.black}><cylinderGeometry args={[0.03, 0.03, 0.015, 10]} /></mesh>))}
    </group>)}
    <instancedMesh ref={puffs} args={[useMemo(() => new THREE.IcosahedronGeometry(1, 1), []), ZM.smoke, 8]} />
  </>
}

function Harbour() {
  const z = ZONES.harbour, c = Zc.harbour
  const lh = around(c, z.r * 1.08, 0.9)
  return <>
    <WaterCap c={c} r={z.r * 1.1} level={HARB_W} deep="#2f86b0" shallow="#7fd0d8" />
    <Dock c={c} zr={z.r} b={HARB_PIER_B} level={HARB_W} len={1.7} />
    <Dock c={c} zr={z.r} b={HARB_PIER_B + 0.9} level={HARB_W} len={1.1} />
    {[0, 1, 2].map(k => { const n = around(c, z.r * (0.7 - k * 0.12), HARB_PIER_B + 0.3 + k * 0.4); return <Boat key={k} i={k} n={n} fwd={toward(n, c).negate()} level={HARB_W} /> })}
    <Surface n={lh}>
      <mesh position={[0, 0.5, 0]} material={ZM.white}><cylinderGeometry args={[0.11, 0.16, 1.0, 14]} /><Outlines thickness={0.01} color={INK} /></mesh>
      {[0.25, 0.65].map(y => <mesh key={y} position={[0, y, 0]} material={ZM.red}><cylinderGeometry args={[0.14 - y * 0.04, 0.15 - y * 0.04, 0.14, 14]} /></mesh>)}
      <mesh position={[0, 1.08, 0]} material={ZM.lantern}><cylinderGeometry args={[0.08, 0.08, 0.14, 10]} /></mesh>
      <mesh position={[0, 1.2, 0]} material={ZM.red}><coneGeometry args={[0.12, 0.14, 12]} /><Outlines thickness={0.008} color={INK} /></mesh>
    </Surface>
    {[0, 1, 2, 3, 4].map(k => { const n = around(c, z.r * 1.14, HARB_PIER_B - 0.25 + k * 0.12); return <Surface key={k} n={n} spin={k}>{k % 2 ? <mesh position={[0, 0.06, 0]} material={ZM.barrel}><cylinderGeometry args={[0.055, 0.05, 0.12, 10]} /><Outlines thickness={0.005} color={INK} /></mesh> : <mesh position={[0, 0.06, 0]} material={ZM.crate}><boxGeometry args={[0.12, 0.12, 0.12]} /><Outlines thickness={0.005} color={INK} /></mesh>}</Surface> })}
  </>
}

function Ruins() {
  const c = Zc.ruins
  const slabs = useMemo(() => { const a = []; for (let i = 0; i < 40; i++) { const n = around(c, Math.sqrt(rnd()) * 0.75 / R, rnd() * 6.283); a.push({ ...place(n, 0.005, rnd() * 6), s: 0.7 + rnd() * 0.6 }) } return a }, [])
  const ivy = useMemo(() => { const a = []; RUIN_COLS.forEach(col => { for (let k = 0; k < 6; k++) { const p = place(col.n, 0, 0); const local = new THREE.Vector3(Math.cos(k * 2.1) * 0.095, rnd() * col.h, Math.sin(k * 2.1) * 0.095); a.push({ pos: p.pos.clone().add(local.applyQuaternion(p.q)), q: p.q, s: 0.6 + rnd() * 0.7, c: C('#5f9a52').lerp(CC('#8fbf5a'), rnd()) }) } }); return a }, [])
  const arch = around(c, 0.15 / R, 2.4), archF = toward(arch, c)
  return <>
    <Instanced items={slabs} geo={useMemo(() => new THREE.BoxGeometry(0.16, 0.03, 0.12), [])} mat={ZM.mossy} />
    {RUIN_COLS.map((col, k) => <Surface key={k} n={col.n} spin={k}><group rotation={[col.tilt, 0, col.tilt * 0.5]}>
      <mesh position={[0, col.h / 2, 0]} material={ZM.mossy}><cylinderGeometry args={[0.085, 0.095, col.h, 10]} /><Outlines thickness={0.006} color={INK} /></mesh>
      <mesh position={[0, col.h + 0.012, 0]} scale={[1, 0.3, 1]} material={ZM.moss}><sphereGeometry args={[0.09, 10, 6]} /></mesh>
      {col.h > 0.5 && <mesh position={[0, col.h + 0.03, 0]} material={ZM.mossy}><boxGeometry args={[0.22, 0.05, 0.22]} /></mesh>}
    </group></Surface>)}
    <Frame n={arch} fwd={archF}>
      {[-1, 1].map(s => <mesh key={s} position={[s * 0.32, 0.4, 0]} material={ZM.mossy}><boxGeometry args={[0.14, 0.8, 0.14]} /><Outlines thickness={0.006} color={INK} /></mesh>)}
      <mesh position={[0, 0.84, 0]} rotation={[0, 0, 0.04]} material={ZM.mossy}><boxGeometry args={[0.86, 0.1, 0.16]} /><Outlines thickness={0.006} color={INK} /></mesh>
      <mesh position={[0.1, 0.9, 0]} scale={[2.5, 0.35, 1]} material={ZM.moss}><sphereGeometry args={[0.09, 10, 6]} /></mesh>
      <mesh position={[0.55, 0.06, 0.3]} rotation={[0, 0.5, Math.PI / 2]} material={ZM.mossy}><cylinderGeometry args={[0.08, 0.085, 0.55, 10]} /><Outlines thickness={0.006} color={INK} /></mesh>
      <mesh position={[0, 0.03, 0.0]} rotation={[0, 0.3, 0]} material={ZM.mossy}><boxGeometry args={[0.3, 0.06, 0.2]} /></mesh>
    </Frame>
    <Instanced items={ivy} geo={useMemo(() => { const g = new THREE.IcosahedronGeometry(0.035, 0); g.scale(1, 1.3, 0.6); return g }, [])} mat={useMemo(() => toon('#ffffff'), [])} />
  </>
}

function Camphors() {
  const { trunks, crowns } = useMemo(() => {
    const trunks = [], crowns = [], cols = ['#4f8f4a', '#5fa055', '#6fb060', '#86c064'].map(C)
    CAMPHORS.forEach((t, i) => { const p = place(t.n, -0.03, t.spin); trunks.push({ ...p, s: t.s })
      for (let k = 0; k < 7; k++) { const a = k * 0.9 + i, rr = k === 6 ? 0 : 0.42 + rnd() * 0.12; const local = new THREE.Vector3(Math.cos(a) * rr, 1.3 + (k === 6 ? 0.42 : rnd() * 0.25), Math.sin(a) * rr).multiplyScalar(t.s); crowns.push({ pos: p.pos.clone().add(local.applyQuaternion(p.q)), q: p.q, s: t.s * (0.85 + rnd() * 0.35) * (k === 6 ? 1.1 : 1), c: cols[(i + k) % 4].clone().multiplyScalar(0.92 + rnd() * 0.16) }) } })
    return { trunks, crowns }
  }, [])
  const ferns = useMemo(() => { const a = []; for (let i = 0; i < 260; i++) { const n = around(Zc.forest, Math.sqrt(rnd()) * ZONES.forest.r, rnd() * 6.283); if (zoneWet(n)) continue; a.push({ ...place(n, -0.01, rnd() * 6), s: 1.6 + rnd() * 1.4, c: C('#3f7f45').lerp(CC('#6aa85a'), rnd()) }) } return a }, [])
  const geos = useMemo(() => { const tr = new THREE.CylinderGeometry(0.075, 0.13, 1.45, 8); tr.translate(0, 0.72, 0); const cr = new THREE.IcosahedronGeometry(0.42, 1); cr.scale(1.15, 0.8, 1.15); const fe = new THREE.SphereGeometry(0.07, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2); fe.scale(1.4, 0.7, 1.4); return { tr, cr, fe } }, [])
  const mats = useMemo(() => ({ cr: windify(toon('#ffffff'), 0.04, -0.3), fe: windify(toon('#ffffff'), 3) }), [])
  return <><Instanced items={trunks} geo={geos.tr} mat={ZM.trunk} /><Instanced items={crowns} geo={geos.cr} mat={mats.cr} isOcc /><Instanced items={ferns} geo={geos.fe} mat={mats.fe} /></>
}

function GiantTree() {
  const c = Zc.giant
  const trunk = useMemo(() => new THREE.LatheGeometry([[0.0, 0], [0.78, 0], [0.55, 0.25], [0.4, 0.8], [0.37, 1.6], [0.42, 2.3], [0.32, 2.85], [0.0, 3.0]].map(([x, y]) => new THREE.Vector2(x, y)), 18), [])
  const crowns = useMemo(() => { const a = [], cols = ['#4f9a4f', '#62ad58', '#7cc062', '#4a8a50'].map(C), p = place(c, 0, 0); for (let k = 0; k < 18; k++) { const ang = k * 2.4, rr = k < 12 ? 1.1 + rnd() * 0.6 : 0.4 + rnd() * 0.4, y = k < 12 ? 2.7 + rnd() * 0.5 : 3.4 + rnd() * 0.5; const local = new THREE.Vector3(Math.cos(ang) * rr, y, Math.sin(ang) * rr); a.push({ pos: p.pos.clone().add(local.applyQuaternion(p.q)), q: p.q, s: 2.0 + rnd() * 0.9, c: cols[k % 4] }) } return a }, [])
  const crGeo = useMemo(() => { const g = new THREE.IcosahedronGeometry(0.42, 2); g.scale(1.2, 0.8, 1.2); return g }, []), crMat = useMemo(() => windify(toon('#ffffff'), 0.02, -0.3), [])
  return <>
    <Surface n={c} lift={-0.05}>
      <mesh geometry={trunk} material={ZM.trunk}><Outlines thickness={0.02} color={INK} /></mesh>
      {[0, 1, 2, 3, 4, 5].map(k => <mesh key={k} position={[Math.cos(k * 1.05) * 0.55, 0.08, Math.sin(k * 1.05) * 0.55]} rotation={[Math.sin(k * 1.05) * 1.1, 0, -Math.cos(k * 1.05) * 1.1]} material={ZM.trunk}><capsuleGeometry args={[0.1, 0.5, 4, 8]} /></mesh>)}
      {[0, 1, 2, 3, 4].map(k => <mesh key={'b' + k} position={[Math.cos(k * 1.26) * 0.55, 2.55, Math.sin(k * 1.26) * 0.55]} rotation={[Math.sin(k * 1.26) * 0.9, 0, -Math.cos(k * 1.26) * 0.9]} material={ZM.trunk}><cylinderGeometry args={[0.07, 0.13, 1.3, 7]} /></mesh>)}
      <mesh position={[0, 1.15, 0]} rotation={[Math.PI / 2, 0, 0]} material={ZM.rope}><torusGeometry args={[0.43, 0.055, 8, 32]} /><Outlines thickness={0.008} color={INK} /></mesh>
      {[0, 1, 2, 3, 4, 5, 6].map(k => <mesh key={'s' + k} position={[Math.cos(k * 0.9) * 0.46, 1.0, Math.sin(k * 0.9) * 0.46]} rotation={[0, -k * 0.9 + Math.PI / 2, 0.15]} material={ZM.paper}><planeGeometry args={[0.05, 0.16]} /></mesh>)}
      {[-1, 1].map(s => <mesh key={'t' + s} position={[s * 0.3, 0.35, 1.25]} material={ZM.red}><cylinderGeometry args={[0.035, 0.04, 0.7, 8]} /></mesh>)}
      <mesh position={[0, 0.72, 1.25]} material={ZM.red}><boxGeometry args={[0.85, 0.06, 0.07]} /><Outlines thickness={0.006} color={INK} /></mesh>
      <mesh position={[0, 0.6, 1.25]} material={ZM.red}><boxGeometry args={[0.68, 0.04, 0.05]} /></mesh>
    </Surface>
    <Instanced items={crowns} geo={crGeo} mat={crMat} isOcc />
  </>
}

function MeadowFlowers() {
  const { heads, stems } = useMemo(() => {
    const heads = [], stems = [], fc = ['#fff4f0', '#ffd36e', '#f59ab0', '#c9b3ff', '#ff9a7a', '#a8d8ff'].map(C)
    for (let i = 0; i < 1500; i++) { const n = around(Zc.meadow, Math.sqrt(rnd()) * ZONES.meadow.r, rnd() * 6.283); if (distToCurve(n, pathDir, 120) < 0.04 * K || MILL_FIELD.some(m => m.angleTo(n) < 0.3 / R)) continue; const s = 0.8 + rnd() * 0.7, col = fc[Math.floor((Math.sin(n.x * 30) * 0.5 + 0.5) * 5.99)]; stems.push({ ...place(n, 0, rnd() * 6), s }); heads.push({ ...place(n, 0.075 * s), s, c: col }) }
    return { heads, stems }
  }, [])
  const geos = useMemo(() => { const st = new THREE.CylinderGeometry(0.004, 0.005, 0.075, 3); st.translate(0, 0.0375, 0); const hd = new THREE.IcosahedronGeometry(0.024, 0); hd.scale(1, 0.6, 1); return { st, hd } }, [])
  const mats = useMemo(() => ({ st: windify(toon('#6aa65a'), 9), hd: toon('#ffffff') }), [])
  return <><Instanced items={stems} geo={geos.st} mat={mats.st} /><Instanced items={heads} geo={geos.hd} mat={mats.hd} /></>
}

export function Zones() {
  return <>
    <Cull n={Zc.lake} d={16}><Lake /></Cull>
    <Cull n={Zc.cliff} d={16}><Waterfall /></Cull>
    <Cull n={Zc.terraces} d={16}><Terraces /></Cull>
    <Train />
    <Cull n={Zc.harbour} d={16}><Harbour /></Cull>
    <Cull n={Zc.ruins} d={14}><Ruins /></Cull>
    <Cull n={Zc.forest} d={18}><Camphors /></Cull>
    <GiantTree />
    <Cull n={Zc.meadow} d={16}><MeadowFlowers /></Cull>
  </>
}
