import * as THREE from 'three'
import React, { useMemo, useRef, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Outlines } from '@react-three/drei'
import { EffectComposer, Bloom, Vignette, Noise } from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'
import { R, K, height, rnd, dir, place, randDir, pathDir, streamDir, distToCurve, toonRamp, wind, windify, ZONES, zv, around, LAKE_W } from './world.js'
import { Person, PEOPLE } from './people.jsx'
import { GhibliPerson, Character } from './GhibliPerson.jsx'
import { VILLAGERS } from './villagers.js'
import { GhibliPersonV1 } from './GhibliPersonV1.jsx'
import { SpritePerson } from './SpritePerson.jsx'
const SPRITE = q.get('char') === 'sprite'
const NEWCHAR = !q.has('oldchar')
import { Zones, zoneBusy, zoneWet, ZONE_COLLIDERS, zoneColour, rockify, HARBOUR_HOUSES, MILL_FIELD, Zc, LAKE_DOCK_B, Cull } from './zones.jsx'
import { INK, T, ss, C, toon, glowMats, glow, MAT, VIEW, OCC, occ, RC, planetRef, Instanced, PU, NOISE_GLSL, paint, Basis, Surface, q } from './common.jsx'

const PRESET = { day: 0.35, dusk: 1.72, night: 3.0 }
const fixed = q.has('t') || q.has('phase')
const rot = { a: q.has('phase') ? +q.get('phase') : PRESET[q.get('t')] ?? 0.4, v: 0 }
window.__setPhase = (p) => { rot.a = typeof p === 'string' ? PRESET[p] : p; rot.v = 0 }

const spin = { a: -0.8 * rot.a + 0.25, v: 0 }
const _v = new THREE.Vector3(), _u = new THREE.Vector3(), _f = new THREE.Vector3(), _s = new THREE.Vector3()
function Clock() {
  const camera = useThree(s => s.camera)
  useFrame((_, dt) => {
    dt = Math.min(dt, 0.05)
    wind.time.value += dt
    if (!fixed) rot.a += dt * Math.PI * 2 / 180 // full day every 3 minutes
    const p = rot.a, e = Math.cos(p)
    if (VIEW.mode === 'follow' && P.wUp.lengthSq() > 0) { // sun relative to the traveller's sky
      _s.setFromMatrixColumn(camera.matrixWorld, 0)
      T.sun.copy(P.wUp).multiplyScalar(e).addScaledVector(_s, Math.sin(p) * 0.9).addScaledVector(P.wFwd, -0.35).normalize()
    } else T.sun.set(Math.sin(p) * 0.9, e, 0.55).normalize()
    T.day = ss(-0.15, 0.45, e); T.night = 1 - ss(-0.35, 0.05, e); T.dusk = Math.max(0, 1 - Math.abs(e - 0.05) / 0.4); PU.uDay.value = T.day
    document.documentElement.style.setProperty('--ink', T.night > 0.5 ? '#f3e6c8' : '#5a4636'); for (const m of glowMats) m.color.copy(m.userData.base).multiplyScalar(0.25 + T.night * 5 + T.dusk * 1.6)
  })
  return null
}

function Sky() {
  const mat = useMemo(() => new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, uniforms: { uSun: { value: T.sun }, uDay: { value: 1 }, uDusk: { value: 0 }, uNight: { value: 0 }, uTime: wind.time }, vertexShader: `varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `varying vec3 vP; uniform vec3 uSun; uniform float uDay,uDusk,uNight,uTime;
    float h(vec3 p){ return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453); }
    float n(vec3 p){ vec3 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(mix(h(i),h(i+vec3(1,0,0)),f.x),mix(h(i+vec3(0,1,0)),h(i+vec3(1,1,0)),f.x),f.y),mix(mix(h(i+vec3(0,0,1)),h(i+vec3(1,0,1)),f.x),mix(h(i+vec3(0,1,1)),h(i+vec3(1,1,1)),f.x),f.y),f.z); }
    float fbm(vec3 p){ float s=0., a=.5; for(int i=0;i<5;i++){ s+=a*n(p); p*=2.03; a*=.5; } return s; }
    void main(){ float y = vP.y*.5+.5;
      vec3 dT=vec3(.56,.77,.91), dH=vec3(.99,.95,.85); vec3 kT=vec3(.42,.44,.66), kH=vec3(1.,.66,.52), kR=vec3(.97,.56,.63); vec3 nT=vec3(.06,.08,.2), nH=vec3(.18,.24,.43);
      vec3 day = mix(dH,dT,smoothstep(.35,.9,y)); vec3 dusk = mix(mix(kH,kR,smoothstep(.3,.55,y)),kT,smoothstep(.5,.95,y)); vec3 night = mix(nH,nT,smoothstep(.3,.85,y));
      vec3 c = night; c = mix(c, dusk, clamp(uDusk*1.2,0.,1.)); c = mix(c, day, uDay*(1.-uDusk*.7));
      float wash = fbm(vP*3.+vec3(uTime*.01,0,0)); c *= .92 + .16*wash; // watercolour blotches
      float sd = max(dot(vP, uSun),0.); c += vec3(1.,.8,.55)*pow(sd,8.)*(.25+uDusk*.6)*(1.-uNight);
      c += vec3(1.,.95,.8)*smoothstep(.9985,.9992,sd)*(1.-uNight);
      vec3 mp = -uSun; c += vec3(.9,.93,1.)*smoothstep(.9986,.9991,dot(vP,normalize(mp+vec3(.3,0,0))))*uNight;
      float st = step(.9965, h(floor(vP*220.)))*(.6+.4*sin(uTime*3.+h(floor(vP*220.))*40.)); c += st*uNight*vec3(1.,.97,.85);
      gl_FragColor = vec4(c,1.); }` }), [])
  useFrame(() => { mat.uniforms.uDay.value = T.day; mat.uniforms.uDusk.value = T.dusk; mat.uniforms.uNight.value = T.night })
  return <mesh material={mat} renderOrder={-1}><sphereGeometry args={[80, 48, 32]} /></mesh>
}

function Lights() {
  const sun = useRef(), hemi = useRef(), moon = useRef()
  const cDay = C('#fff3dc'), cDusk = C('#ffa070'), tmp = new THREE.Color()
  useFrame(() => {
    sun.current.position.copy(T.sun).multiplyScalar(20)
    sun.current.color.copy(cDay).lerp(cDusk, T.dusk); sun.current.intensity = 2.6 * ss(-0.2, 0.2, T.sun.y)
    moon.current.position.copy(T.sun).multiplyScalar(-20).add(new THREE.Vector3(6, 0, 8)); moon.current.intensity = 1.1 * T.night
    hemi.current.color.copy(tmp.set('#cfe6ff').lerp(C('#ffb59a'), T.dusk).lerp(C('#4a5fa0'), T.night))
    hemi.current.groundColor.set('#b9d48c').lerp(C('#2a2f55'), T.night); hemi.current.intensity = 0.9 + 0.25 * T.dusk - 0.3 * T.night
  })
  return <><directionalLight ref={sun} castShadow={false} /><directionalLight ref={moon} color="#9db4ff" /><hemisphereLight ref={hemi} /></>
}

function Ground() {
  const geo = useMemo(() => {
    const g = new THREE.IcosahedronGeometry(R, 64); const p = g.attributes.position, v = new THREE.Vector3(), cols = []
    const a = C('#9fd17a'), b = C('#7fbf6a'), c = C('#c8e08a'), sand = C('#ecd9a8'), bank = C('#6fa86a'), tmp = new THREE.Color()
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i).normalize(); const hh = height(v)
      const w = Math.sin(v.x * 6 + v.y * 4) * Math.sin(v.z * 5 - v.y * 3)
      tmp.copy(a).lerp(b, w * 0.5 + 0.5).lerp(c, Math.max(0, Math.sin(v.x * 11 + v.z * 9) * Math.sin(v.y * 13)) )
      const ds = distToCurve(v, streamDir, 420); if (ds < 0.07 * K) tmp.lerp(bank, 1 - ds / (0.07 * K))
      const dp = distToCurve(v, pathDir, 300); if (dp < 0.05 * K) tmp.lerp(sand, 0.6 * (1 - dp / (0.05 * K)))
      zoneColour(v, tmp); cols.push(tmp.r, tmp.g, tmp.b); p.setXYZ(i, ...v.multiplyScalar(R + hh - (ds < 0.05 * K ? 0.08 * (1 - ds / (0.05 * K)) : 0)).toArray())
    }
    g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3)); g.computeVertexNormals(); { const nr = g.attributes.normal, cl = g.attributes.color, nv = new THREE.Vector3(), pv = new THREE.Vector3(), cc = new THREE.Color(); for (let i = 0; i < p.count; i++) { pv.fromBufferAttribute(p, i).normalize(); nv.fromBufferAttribute(nr, i); cc.fromBufferAttribute(cl, i); rockify(pv, nv, cc); cl.setXYZ(i, cc.r, cc.g, cc.b) } } return g
  }, [])
  return <mesh geometry={geo} material={useMemo(() => paint(toon('#ffffff', { vertexColors: true }), 0.09, true, 1.6), [])}><Outlines thickness={0.06} color={INK} /></mesh>
}

function ribbon(f, width, lift, N = 500, skip) {
  const pos = [], uv = [], idx = []
  for (let i = 0; i <= N; i++) {
    const t = (i / N) * Math.PI * 2, n = f(t).normalize(), n2 = f(t + 0.01).normalize()
    const tan = n2.clone().sub(n).normalize(), side = new THREE.Vector3().crossVectors(tan, n).normalize()
    const wob = width * (1 + 0.25 * Math.sin(t * 13))
    for (const s of [-1, 1]) { const d = n.clone().addScaledVector(side, s * wob / R).normalize(); pos.push(...d.multiplyScalar(R + height(d) + (skip && skip(d) ? -0.3 : lift)).toArray()); uv.push(s * 0.5 + 0.5, t * 20) }
    if (i < N) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2) }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return g
}
function Path() { const g = useMemo(() => ribbon(pathDir, 0.16, 0.045, 700, (d) => onBridge(d)), []); return <mesh geometry={g} material={paint(toon('#ecd9a8', { polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }), 0.12, true, 8)} /> }
function Stream() {
  const g = useMemo(() => ribbon(streamDir, 0.17, -0.012, 900), [])
  const m = useMemo(() => new THREE.ShaderMaterial({ uniforms: { uTime: wind.time, uN: { value: 0 }, uD: { value: 0 } }, polygonOffset: true, polygonOffsetFactor: -3,
    vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `varying vec2 vUv; uniform float uTime,uN,uD; void main(){ float e = abs(vUv.x-.5)*2.;
      vec3 c = mix(vec3(.38,.72,.86), vec3(.6,.88,.9), e);
      float f = sin(vUv.y*1.3 - uTime*2.5 + sin(vUv.x*9.+vUv.y*.3)*1.5); c = mix(c, vec3(.92,.99,1.), smoothstep(.82,.9,f)*.8);
      c = mix(c, vec3(.96,1.,1.), smoothstep(.75,.95,e));
      c = mix(c, c*vec3(1.,.8,.75)+vec3(.12,.04,.06), uD*.5); c = mix(c, vec3(.13,.2,.38)+vec3(.15,.13,.05)*smoothstep(.8,.9,f), uN*.8);
      gl_FragColor = vec4(c,1.); }` }), [])
  useFrame(() => { m.uniforms.uN.value = T.night; m.uniforms.uD.value = T.dusk })
  return <mesh geometry={g} material={m} />
}


const VILLAGE = dir(1.05, 0.2)
const MILLS = [dir(0.25, 1.4), dir(0.45, 1.75)]
const HOUSES = [[0.9, -0.15], [1.18, 0.55], [0.92, 0.78], [1.3, -0.3], [1.0, 0.95], [0.3, -0.6], [0.75, 2.2], [0.5, 2.55], [0.92, 2.6], [0.35, 2.25], [0.7, 2.85]].map(([la, lo]) => dir(la, lo))
// ---------- painted shading: hand-painted noise + drifting cloud shadows ----------

// ---------- bridges where the path crosses the stream ----------
const latOf = (n) => Math.asin(n.y)
const BRIDGES = []
{ let prev = null; for (let i = 0; i <= 3000; i++) { const t = (i / 3000) * Math.PI * 2; const d = latOf(pathDir(t).normalize()) - latOf(streamDir(t).normalize()); if (prev !== null && Math.sign(d) !== Math.sign(prev)) { const c = pathDir(t).normalize(), tan = pathDir(t + 0.01).normalize().sub(c).normalize(); BRIDGES.push({ c, tan, side: new THREE.Vector3().crossVectors(c, tan).normalize() }) } prev = d } }
BRIDGES.sort((a, b) => a.c.distanceTo(VILLAGE) - b.c.distanceTo(VILLAGE))
const B0 = BRIDGES[0]
const BL = 0.62 // bridge length (world units)
const bl = (b, along, side) => b.c.clone().addScaledVector(b.tan, along / R).addScaledVector(b.side, side / R).normalize()
function bridgeLift(n) { for (const b of BRIDGES) { const d = n.clone().sub(b.c); const a = d.dot(b.tan) * R, s = d.dot(b.side) * R; if (Math.abs(a) < BL / 2 && Math.abs(s) < 0.13) return 0.035 + 0.07 * Math.cos((a / BL) * Math.PI) } return 0 }
const onBridge = (n) => BRIDGES.some(b => b.c.angleTo(n) < 0.062 * K)
const HB = (i) => place(HOUSES[i], 0, i * 1.3)
const onHouse = (i, x, z) => { const p = HB(i); return p.pos.clone().add(new THREE.Vector3(x, 0, z).applyQuaternion(p.q)).normalize() }
const SPOTS = { shrine: dir(0.12, -1.05), bus: dir(0.52, 1.2), cat: bl(B0, -0.55, 0.32), laundryA: bl(B0, -1.45, 0.05), laundryB: bl(B0, -0.8, -0.3), view1: bl(B0, -1.2, 1.0), view2: bl(B0, -0.3, 0.55) }
window.__spots = { SPOTS, B0 }
const EXTRA_BUSY = [SPOTS.shrine, SPOTS.bus, SPOTS.cat, SPOTS.laundryA, SPOTS.laundryB, SPOTS.view1, SPOTS.view2, ...BRIDGES.map(b => b.c)]

const DM = { plank: paint(toon('#b07a4f'), 0.18, true, 12), rail: toon('#8a5a3c'), cloth: ['#ffffff', '#f59ab0', '#8fc3e8', '#ffd36e'].map(c => toon(c, { side: THREE.DoubleSide })), rope: toon('#e8dcc0'), red: toon('#d9534f'), soil: paint(toon('#8a6248'), 0.2, true, 14), cabbage: toon('#8fcf6a'), carrot: toon('#ef8a3c'), fence: toon('#f3e6cc'), stone: paint(toon('#c9c0b2'), 0.15, true, 15), moss: toon('#7fae5f'), cat: toon('#f2a65a'), catW: toon('#fff4e6'), dark: toon('#3a2e2a'), sign: toon('#ffd36e'), curtains: ['#f59ab0', '#8fc3e8', '#fff1c9', '#b8e0a8'].map(c => toon(c)), smoke: toon('#f4f1ee', { transparent: true, opacity: 0.85 }), wing: ['#ffd36e', '#ffffff', '#f59ab0', '#a8d8ff'].map(c => toon(c, { side: THREE.DoubleSide })) }

function Bridge({ b }) {
  const planks = 11
  return <Basis n={b.c} fwd={b.tan} lift={0.0}>
    {Array.from({ length: planks }, (_, k) => { const a = (k / (planks - 1) - 0.5) * BL, y = 0.035 + 0.07 * Math.cos((a / BL) * Math.PI); return <mesh key={k} position={[0, y, a]} rotation={[-Math.sin((a / BL) * Math.PI) * 0.35, (k % 2 ? 0.03 : -0.03), 0]} material={DM.plank}><boxGeometry args={[0.26, 0.022, BL / planks * 0.9]} /><Outlines thickness={0.008} color={INK} /></mesh> })}
    {[-1, 1].map(s => <group key={s}>
      {[-0.28, 0, 0.28].map(a => <mesh key={a} position={[s * 0.13, 0.07 + 0.07 * Math.cos((a / BL) * Math.PI), a]} material={DM.rail}><boxGeometry args={[0.022, 0.12, 0.022]} /></mesh>)}
      {[-1, 1].map(h => <mesh key={h} position={[s * 0.13, 0.155 + 0.035, h * 0.15]} rotation={[h * 0.22, 0, 0]} material={DM.rail}><boxGeometry args={[0.02, 0.018, 0.3]} /><Outlines thickness={0.005} color={INK} /></mesh>)}
    </group>)}
  </Basis>
}

function Laundry() {
  const A = SPOTS.laundryA, B = SPOTS.laundryB, f = B.clone().sub(A), mid = A.clone().add(B).normalize(), len = A.angleTo(B) * R
  const cloth = useRef([])
  useFrame(() => { const t = wind.time.value; cloth.current.forEach((c, k) => { if (!c) return; c.rotation.x = 0.25 + Math.sin(t * 3.2 + k * 1.1) * 0.28 + Math.sin(t * 7.3 + k) * 0.06; c.rotation.z = Math.sin(t * 2.1 + k) * 0.05 }) })
  return <Basis n={mid} fwd={f}>
    {[-1, 1].map(s => <mesh key={s} position={[0, 0.25, s * len / 2]} material={DM.rail}><cylinderGeometry args={[0.014, 0.018, 0.5, 6]} /><Outlines thickness={0.005} color={INK} /></mesh>)}
    {[-1, 1].map(s => <mesh key={'r' + s} position={[0, 0.465, s * len / 4]} rotation={[s * 0.12, 0, 0]} material={DM.rope}><boxGeometry args={[0.006, 0.006, len / 2]} /></mesh>)}
    {[-0.3, -0.1, 0.1, 0.3].map((u, k) => <group key={k} ref={el => cloth.current[k] = el} position={[0, 0.455 - (1 - (2 * u) ** 2) * 0.03, u * len]}>
      <mesh position={[0, -0.08, 0]} rotation={[0, Math.PI / 2, 0]} material={DM.cloth[k]}><planeGeometry args={[k % 2 ? 0.15 : 0.12, k % 2 ? 0.13 : 0.17]} /><Outlines thickness={0.004} color={INK} /></mesh>
    </group>)}
  </Basis>
}

function Cat() {
  const body = useRef(), tail = useRef()
  useFrame(() => { const t = wind.time.value; const b = 1 + Math.sin(t * 1.7) * 0.07; body.current.scale.set(1 + (b - 1) * 0.4, b, 1 + (b - 1) * 0.4); tail.current.rotation.y = Math.sin(t * 0.9) * 0.15 })
  return <Basis n={SPOTS.cat} fwd={B0.tan.clone().negate()}>
    <group scale={1.4}>
      <mesh ref={body} position={[0, 0.035, 0]} scale={[1, 0.62, 1.25]} material={DM.cat}><sphereGeometry args={[0.06, 14, 10]} /><Outlines thickness={0.006} color={INK} /></mesh>
      <group position={[0.045, 0.04, 0.05]}>
        <mesh material={DM.cat}><sphereGeometry args={[0.034, 12, 10]} /><Outlines thickness={0.005} color={INK} /></mesh>
        {[-1, 1].map(s => <mesh key={s} position={[s * 0.018, 0.03, 0]} rotation={[0, 0, -s * 0.3]} material={DM.cat}><coneGeometry args={[0.012, 0.024, 4]} /></mesh>)}
        {[-1, 1].map(s => <mesh key={'e' + s} position={[s * 0.013, 0.002, 0.031]} material={DM.dark}><boxGeometry args={[0.012, 0.0025, 0.003]} /></mesh>)}
        <mesh position={[0, -0.012, 0.028]} material={DM.catW}><sphereGeometry args={[0.014, 8, 6]} /></mesh>
      </group>
      <mesh ref={tail} position={[-0.01, 0.012, -0.01]} rotation={[Math.PI / 2, 0, 0]} material={DM.cat}><torusGeometry args={[0.065, 0.011, 6, 18, Math.PI * 1.1]} /></mesh>
    </group>
  </Basis>
}

function Mailbox({ i }) {
  return <Surface n={onHouse(i, -0.42, 0.42)} spin={i * 1.3}>
    <mesh position={[0, 0.11, 0]} material={DM.rail}><boxGeometry args={[0.02, 0.22, 0.02]} /></mesh>
    <mesh position={[0, 0.25, 0]} rotation={[Math.PI / 2, 0, 0]} material={DM.red}><cylinderGeometry args={[0.04, 0.04, 0.1, 12, 1, false, 0, Math.PI]} /><Outlines thickness={0.005} color={INK} /></mesh>
    <mesh position={[0, 0.235, 0]} material={DM.red}><boxGeometry args={[0.08, 0.03, 0.1]} /></mesh>
    <mesh position={[0.045, 0.27, -0.02]} material={MAT.roofs[2]}><boxGeometry args={[0.006, 0.05, 0.03]} /></mesh>
  </Surface>
}

function VegPatch({ i }) {
  const n = onHouse(i, 0.05, -0.75)
  const { pickets, cabb, carrots } = useMemo(() => {
    const p0 = place(n, 0, i * 1.3), pickets = [], cabb = [], carrots = []
    const at = (x, z, lift, s) => { const d = p0.pos.clone().add(new THREE.Vector3(x, 0, z).applyQuaternion(p0.q)).normalize(); return { ...place(d, lift, i * 1.3), s } }
    for (let k = 0; k <= 12; k++) { const x = -0.36 + k * 0.06; pickets.push(at(x, -0.24, 0, 1), at(x, 0.24, 0, 1)) }
    for (let k = 1; k < 8; k++) { const z = -0.24 + k * 0.06; pickets.push(at(-0.36, z, 0, 1), at(0.36, z, 0, 1)) }
    for (let r = 0; r < 3; r++) for (let k = 0; k < 5; k++) (r === 1 ? carrots : cabb).push(at(-0.24 + k * 0.12, -0.12 + r * 0.12, r === 1 ? 0.03 : 0.035, 0.8 + rnd() * 0.4))
    return { pickets, cabb, carrots }
  }, [])
  const geos = useMemo(() => { const pk = new THREE.BoxGeometry(0.018, 0.12, 0.012); pk.translate(0, 0.06, 0); const cb = new THREE.IcosahedronGeometry(0.035, 1); cb.scale(1, 0.8, 1); const ct = new THREE.ConeGeometry(0.018, 0.05, 6); ct.translate(0, 0.02, 0); return { pk, cb, ct } }, [])
  return <>
    <Surface n={n} lift={0.0} spin={i * 1.3}><mesh position={[0, 0.012, 0]} material={DM.soil}><boxGeometry args={[0.66, 0.03, 0.42]} /></mesh></Surface>
    <Instanced items={pickets} geo={geos.pk} mat={DM.fence} />
    <Instanced items={cabb} geo={geos.cb} mat={DM.cabbage} />
    <Instanced items={carrots} geo={geos.ct} mat={DM.cabbage} />
  </>
}

function Stones() {
  const items = useMemo(() => { const a = []; for (let i = 0; i < 6; i++) for (let k = 0; k < 4; k++) { const d = onHouse(i, (k % 2 ? 0.04 : -0.04), 0.4 + k * 0.13); a.push({ ...place(d, 0.0, rnd() * 3), s: 0.85 + rnd() * 0.3 }) } return a }, [])
  const geo = useMemo(() => { const g = new THREE.CylinderGeometry(0.055, 0.06, 0.025, 9); g.scale(1, 1, 0.8); return g }, [])
  return <Instanced items={items} geo={geo} mat={DM.stone} />
}

function Shrine() {
  return <Surface n={SPOTS.shrine} spin={0.4}>
    <mesh position={[0, 0.04, 0]} material={DM.stone}><boxGeometry args={[0.3, 0.08, 0.28]} /><Outlines thickness={0.006} color={INK} /></mesh>
    <mesh position={[0, 0.17, 0]} material={MAT.wood}><boxGeometry args={[0.16, 0.18, 0.14]} /><Outlines thickness={0.006} color={INK} /></mesh>
    {[-1, 1].map(s => <mesh key={s} position={[s * 0.07, 0.3, 0]} rotation={[0, 0, s * 0.55]} material={DM.red}><boxGeometry args={[0.15, 0.015, 0.22]} /><Outlines thickness={0.006} color={INK} /></mesh>)}
    <mesh position={[0, 0.13, 0.075]} material={MAT.win}><planeGeometry args={[0.05, 0.06]} /></mesh>
    {[-1, 1].map(s => <mesh key={'t' + s} position={[s * 0.11, 0.13, 0.3]} material={DM.red}><cylinderGeometry args={[0.012, 0.014, 0.26, 6]} /></mesh>)}
    <mesh position={[0, 0.27, 0.3]} material={DM.red}><boxGeometry args={[0.32, 0.024, 0.03]} /><Outlines thickness={0.005} color={INK} /></mesh>
    <mesh position={[0, 0.22, 0.3]} material={DM.red}><boxGeometry args={[0.24, 0.014, 0.02]} /></mesh>
    <mesh position={[0.13, 0.02, 0.06]} material={DM.stone}><icosahedronGeometry args={[0.04, 0]} /></mesh>
  </Surface>
}

function BusStop() {
  const tex = useMemo(() => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); x.fillStyle = '#ffd36e'; x.beginPath(); x.arc(64, 64, 60, 0, 7); x.fill(); x.lineWidth = 10; x.strokeStyle = '#d9534f'; x.stroke(); x.fillStyle = '#4a3a35'; x.font = '600 34px Fredoka, sans-serif'; x.textAlign = 'center'; x.fillText('BUS', 64, 58); x.font = '500 18px Fredoka, sans-serif'; x.fillText('Inaba', 64, 86); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t }, [])
  return <Surface n={SPOTS.bus} spin={2.2}>
    <mesh position={[0, 0.22, 0]} material={MAT.stone}><cylinderGeometry args={[0.012, 0.014, 0.44, 6]} /></mesh>
    <mesh position={[0, 0.44, 0.012]}><circleGeometry args={[0.075, 24]} /><meshToonMaterial map={tex} gradientMap={toonRamp} /></mesh>
    <mesh position={[0, 0.44, 0.008]} rotation={[Math.PI / 2, 0, 0]} material={DM.red}><cylinderGeometry args={[0.078, 0.078, 0.01, 24]} /></mesh>
    <mesh position={[0.2, 0.07, 0]} material={MAT.wood}><boxGeometry args={[0.22, 0.02, 0.07]} /><Outlines thickness={0.005} color={INK} /></mesh>
    {[-1, 1].map(s => <mesh key={s} position={[0.2 + s * 0.09, 0.03, 0]} material={MAT.wood}><boxGeometry args={[0.02, 0.06, 0.06]} /></mesh>)}
  </Surface>
}

function Moss() {
  const items = useMemo(() => { const a = []; HOUSES.forEach((hn, i) => { const w = 0.55 + (i % 3) * 0.1, tall = i % 2 ? 0.55 : 0.45, p = place(hn, -0.05, i * 1.3); [[-0.22, 0.1, 0.17], [0.18, 0.06, 0.2], [0.05, 0.15, -0.1], [-0.15, 0.04, -0.2]].forEach(([x, y, z], k) => { if ((i + k) % 3 === 2) return; const pos = p.pos.clone().add(new THREE.Vector3(x * w, tall + y, z).applyQuaternion(p.q)); a.push({ pos, q: p.q.clone().multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(z > 0 ? 0.6 : -0.6, rnd(), 0))), s: 0.7 + rnd() * 0.6, c: C('#7fae5f').lerp(C('#a8c86a'), rnd()) }) }) }); return a }, [])
  const geo = useMemo(() => { const g = new THREE.IcosahedronGeometry(0.06, 1); g.scale(1, 0.35, 0.8); return g }, [])
  return <Instanced items={items} geo={geo} mat={useMemo(() => toon('#ffffff'), [])} />
}

const CHIMNEYS = HOUSES.map((hn, i) => { const w = 0.55 + (i % 3) * 0.1, tall = i % 2 ? 0.55 : 0.45, p = place(hn, -0.05, i * 1.3); return { top: p.pos.clone().add(new THREE.Vector3(w * 0.28, tall + 0.47, 0.05).applyQuaternion(p.q)), up: p.n } })
function Smoke() {
  const ref = useRef(), K = 6, o = useMemo(() => new THREE.Object3D(), []), side = useMemo(() => new THREE.Vector3(1, 0, 0), [])
  useFrame(() => {
    const t = wind.time.value; let j = 0
    CHIMNEYS.forEach((c, i) => { for (let k = 0; k < K; k++) { const u = (t * 0.22 + k / K + i * 0.13) % 1; o.position.copy(c.top).addScaledVector(c.up, u * 0.75).addScaledVector(side, u * u * 0.35 + Math.sin(t * 1.3 + k + i) * 0.03); o.scale.setScalar((0.035 + u * 0.11) * Math.min(1, u * 8) * (1 - u) ** 0.6); o.updateMatrix(); ref.current.setMatrixAt(j++, o.matrix) } })
    ref.current.instanceMatrix.needsUpdate = true; DM.smoke.color.set('#f4f1ee').lerp(C('#9aa0c4'), T.night * 0.7); DM.smoke.opacity = 0.85 - 0.25 * T.night
  })
  return <instancedMesh ref={ref} args={[useMemo(() => new THREE.IcosahedronGeometry(1, 2), []), DM.smoke, CHIMNEYS.length * K]} />
}

function Butterflies() {
  const bs = useMemo(() => Array.from({ length: 16 }, (_, i) => ({ base: (i < 10 ? VILLAGE.clone().add(randDir().multiplyScalar(0.35)) : randDir()).normalize(), ph: rnd() * 6, ax: randDir(), m: DM.wing[i % 4] })), [])
  const refs = useRef([])
  useFrame(() => { const t = wind.time.value; bs.forEach((b, i) => { const g = refs.current[i]; if (!g) return; const a = t * 0.35 + b.ph; const n = b.base.clone().applyAxisAngle(b.ax, Math.sin(a) * 0.08).applyAxisAngle(b.base, a * 0.6).normalize(); const n2 = b.base.clone().applyAxisAngle(b.ax, Math.sin(a + 0.02) * 0.08).applyAxisAngle(b.base, (a + 0.02) * 0.6).normalize(); const f = n2.sub(n).normalize(); g.position.copy(n).multiplyScalar(R + height(n) + 0.22 + Math.sin(t * 2 + i) * 0.06); g.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3().crossVectors(n, f), n, f)); const fl = Math.sin(t * 16 + i) * 0.9; g.children[0].rotation.z = 0.2 + fl; g.children[1].rotation.z = -0.2 - fl; g.visible = T.night < 0.6 }) })
  return bs.map((b, i) => <group key={i} ref={el => refs.current[i] = el} scale={0.8}>{[1, -1].map(s => <group key={s}><mesh position={[s * 0.022, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} material={b.m}><circleGeometry args={[0.024, 8]} /></mesh></group>)}</group>)
}

function Seeds() {
  const { geo, mat } = useMemo(() => {
    const N = 160, p = [], s = []; for (let i = 0; i < N; i++) { p.push(...randDir().toArray()); s.push(rnd()) }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); geo.setAttribute('seed', new THREE.Float32BufferAttribute(s, 1))
    const mat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { uTime: wind.time, uD: { value: 1 } },
      vertexShader: `attribute float seed; uniform float uTime; varying float vA; void main(){ float u = fract(uTime*.03 + seed); vec3 p = normalize(position + vec3(sin(uTime*.2+seed*9.),0.,cos(uTime*.17+seed*7.))*.15*u) * (${R.toFixed(1)} + .1 + u*1.6); p += vec3(sin(uTime*1.3+seed*20.), cos(uTime*1.1+seed*13.), 0.)*.03; vA = smoothstep(0.,.1,u)*smoothstep(1.,.7,u); vec4 mv = modelViewMatrix*vec4(p,1.); gl_PointSize = 40./-mv.z; gl_Position = projectionMatrix*mv; }`,
      fragmentShader: `uniform float uD; varying float vA; void main(){ vec2 q = gl_PointCoord-.5; float d = length(q); float a = smoothstep(.5,.15,d)*.5 + smoothstep(.12,.0,d)*.6; float rays = .5+.5*cos(atan(q.y,q.x)*8.); a *= mix(.6,1.,rays); gl_FragColor = vec4(vec3(1.,.99,.94), a*vA*uD); }` })
    return { geo, mat }
  }, [])
  useFrame(() => { mat.uniforms.uD.value = 0.9 * (1 - T.night) })
  return <points geometry={geo} material={mat} />
}

function Wildflowers() {
  const { heads, stems } = useMemo(() => {
    const heads = [], stems = [], fc = ['#fff4f0', '#ffd36e', '#f59ab0', '#c9b3ff', '#ff9a7a', '#a8d8ff'].map(C)
    for (let i = 0; i < 2000; i++) { const n = randDir(); if (busy(n) || onBridge(n) || zoneWet(n)) continue; const s = 0.7 + rnd() * 0.6, p = place(n, 0, rnd() * 6); stems.push({ ...p, s }); heads.push({ ...place(n, 0.075 * s), s, c: fc[Math.floor(rnd() * 6)] }) }
    return { heads, stems }
  }, [])
  const geos = useMemo(() => { const st = new THREE.CylinderGeometry(0.004, 0.005, 0.075, 3); st.translate(0, 0.0375, 0); const hd = new THREE.IcosahedronGeometry(0.022, 0); hd.scale(1, 0.6, 1); return { st, hd } }, [])
  const mats = useMemo(() => ({ st: windify(toon('#6aa65a'), 9), hd: toon('#ffffff') }), [])
  return <><Instanced items={stems} geo={geos.st} mat={mats.st} /><Instanced items={heads} geo={geos.hd} mat={mats.hd} /></>
}

function Details() {
  return <>
    {BRIDGES.map((b, i) => <Bridge key={i} b={b} />)}
    <Laundry /><Cat /><Shrine /><BusStop /><Moss /><Smoke /><Butterflies /><Seeds /><Wildflowers /><Stones />
    {[0, 1, 3, 4].map(i => <Mailbox key={i} i={i} />)}
    <VegPatch i={4} /><VegPatch i={5} />
  </>
}

const busy = (n) => EXTRA_BUSY.some(e => e.distanceTo(n) < 0.1 * K) || SPOTS.view1.distanceTo(n) < 0.2 * K || SPOTS.view2.distanceTo(n) < 0.16 * K || HOUSES.some(h => h.distanceTo(n) < 0.12 * K) || MILLS.some(m => m.distanceTo(n) < 0.12 * K) || zoneBusy(n) || distToCurve(n, pathDir, 140) < 0.05 * K || distToCurve(n, streamDir, 140) < 0.06 * K

const tc = ['#5fae63', '#7cc26a', '#4f9a5e', '#9ccf6a'].map(C)
const TREES = [], FIRS = []
for (let i = 0; i < 700; i++) { const n = randDir(); const cl = Math.sin(n.x * 4 + 1) * Math.sin(n.z * 3 - n.y * 2); if (cl < 0.1 || busy(n)) continue; const fir = rnd() < 0.4; (fir ? FIRS : TREES).push({ ...place(n, -0.02, rnd() * 6), s: 0.45 + rnd() * 0.35, c: tc[i % 4].clone().multiplyScalar(0.9 + rnd() * 0.2) }) }
const COLLIDERS = [...HOUSES.map(n => ({ n, r: 0.085 * K })), ...MILLS.map(n => ({ n, r: 0.065 * K })), ...[...TREES, ...FIRS].map(t => ({ n: t.n, r: (0.03 + 0.02 * t.s) * K })), ...ZONE_COLLIDERS]
function Vegetation() {
  const { grass, flowers } = useMemo(() => {
    const grass = [], flowers = [], g1 = C('#86c46c'), g2 = C('#b9de86'), fc = ['#fff4f0', '#ffd36e', '#f59ab0', '#c9b3ff'].map(C)
    const _t = new THREE.Vector3()
    for (let i = 0; i < 750; i++) { // lawn patches: soft dome tufts with flower clumps
      const c = randDir(); if (busy(c)) continue
      const k = 6 + Math.floor(rnd() * 14), sp = (0.03 + rnd() * 0.05) * K, col = g1.clone().lerp(g2, rnd())
      for (let j = 0; j < k; j++) { const n = c.clone().add(_t.set(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).multiplyScalar(sp * 2)).normalize(); if (distToCurve(n, streamDir, 90) < 0.05 * K || distToCurve(n, pathDir, 90) < 0.045 * K || zoneWet(n)) continue; grass.push({ ...place(n, -0.01, rnd() * 6), s: 0.7 + rnd() * 0.8, c: col.clone().multiplyScalar(0.92 + rnd() * 0.16) }) }
      if (rnd() < 0.45) { const fcol = fc[i % 4]; for (let j = 0; j < 4 + rnd() * 6; j++) { const n = c.clone().add(_t.set(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).multiplyScalar(sp)).normalize(); flowers.push({ ...place(n, 0.045), s: 0.6 + rnd() * 0.5, c: fcol }) } }
    }
    return { grass, flowers }
  }, [])
  const geos = useMemo(() => {
    const tuft = new THREE.SphereGeometry(0.07, 9, 5, 0, Math.PI * 2, 0, Math.PI / 2); tuft.scale(1, 0.75, 1)
    const p = tuft.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), a = Math.atan2(z, x); const w = 1 + 0.18 * Math.sin(a * 5); p.setX(i, x * w); p.setZ(i, z * w); p.setY(i, p.getY(i) * (1 + 0.25 * Math.sin(a * 5))) } tuft.computeVertexNormals()
    const crown = new THREE.IcosahedronGeometry(0.42, 1); crown.scale(1, 1.15, 1); crown.translate(0, 0.85, 0)
    const trunk = new THREE.CylinderGeometry(0.06, 0.09, 0.6, 6); trunk.translate(0, 0.3, 0)
    const fir = new THREE.ConeGeometry(0.32, 1.25, 7); fir.translate(0, 0.9, 0)
    const fl = new THREE.IcosahedronGeometry(0.035, 1)
    return { tuft, crown, trunk, fir, fl }
  }, [])
  const mats = useMemo(() => ({ grass: windify(toon('#ffffff'), 6), crown: windify(toon('#ffffff'), 0.08, 0.4), fir: windify(toon('#ffffff'), 0.06, 0.3), trunk: MAT.wood, fl: toon('#ffffff') }), [])
  const trunkItems = [...TREES, ...FIRS].map(t => ({ ...t, c: null }))
  return <>
    <Instanced items={grass} geo={geos.tuft} mat={mats.grass} />
    <Instanced items={flowers} geo={geos.fl} mat={mats.fl} />
    <Instanced items={trunkItems} geo={geos.trunk} mat={mats.trunk} />
    <Instanced items={TREES} geo={geos.crown} mat={mats.crown} isOcc />
    <Instanced items={FIRS} geo={geos.fir} mat={mats.fir} isOcc />
  </>
}


function House({ n, i }) {
  const roof = MAT.roofs[i % 4], w = 0.55 + (i % 3) * 0.1, tall = i % 2 ? 0.55 : 0.45
  return <Surface n={n} lift={-0.05} spin={i * 1.3}>
    <mesh position={[0, tall / 2, 0]} material={i % 2 ? MAT.wall : MAT.wall2} ref={occ}><boxGeometry args={[w, tall, 0.5]} /><Outlines thickness={0.025} color={INK} /></mesh>
    <mesh position={[0, tall + 0.2, 0]} rotation={[0, Math.PI / 4, 0]} scale={[w * 1.05, 1, 0.75]} material={roof} ref={occ}><coneGeometry args={[0.6, 0.42, 4]} /><Outlines thickness={0.025} color={INK} /></mesh>
    <mesh position={[w * 0.28, tall + 0.3, 0.05]} material={MAT.stone}><boxGeometry args={[0.09, 0.3, 0.09]} /><Outlines thickness={0.015} color={INK} /></mesh>
    {[-1, 1].map(s => <group key={s} position={[s * w * 0.27, tall * 0.55, 0.252]}><mesh material={MAT.win}><planeGeometry args={[0.11, 0.13]} /></mesh>
      {[-1, 1].map(c => <mesh key={c} position={[c * 0.04, 0.005, 0.002]} material={DM.curtains[i % 4]}><planeGeometry args={[0.032, 0.125]} /></mesh>)}
      <mesh position={[0, 0.07, 0.003]} material={MAT.wood}><boxGeometry args={[0.13, 0.015, 0.01]} /></mesh><mesh position={[0, -0.072, 0.012]} material={MAT.wood}><boxGeometry args={[0.13, 0.014, 0.03]} /></mesh></group>)}
    <mesh position={[0, 0.12, 0.252]} material={MAT.wood}><planeGeometry args={[0.12, 0.22]} /></mesh>
    {[-1, 1].map(s => <mesh key={'b' + s} position={[w / 2 + 0.002, tall * 0.55, s * 0.12]} rotation={[0, Math.PI / 2, 0]} material={MAT.win}><planeGeometry args={[0.1, 0.12]} /></mesh>)}
  </Surface>
}
function Lamp({ n, i = 0 }) {
  const lan = useRef(); useFrame(() => { const t = wind.time.value; lan.current.rotation.z = Math.sin(t * 1.6 + i) * 0.18 + Math.sin(t * 3.7 + i) * 0.05; lan.current.rotation.x = Math.sin(t * 1.1 + i * 2) * 0.1 })
  return <Surface n={n} spin={i}><mesh position={[0, 0.25, 0]} material={MAT.wood}><cylinderGeometry args={[0.015, 0.02, 0.5, 5]} /><Outlines thickness={0.005} color={INK} /></mesh>
    <mesh position={[0.06, 0.49, 0]} material={MAT.wood}><boxGeometry args={[0.13, 0.015, 0.015]} /></mesh>
    <group ref={lan} position={[0.115, 0.485, 0]}><mesh position={[0, -0.03, 0]} material={MAT.wood}><boxGeometry args={[0.004, 0.06, 0.004]} /></mesh>
      <mesh position={[0, -0.075, 0]} material={MAT.lamp}><cylinderGeometry args={[0.028, 0.03, 0.055, 6]} /></mesh>
      <mesh position={[0, -0.042, 0]} material={MAT.wood}><coneGeometry args={[0.04, 0.025, 6]} /></mesh></group>
  </Surface>
}
function Windmill({ n, i }) {
  const blades = useRef(); useFrame((_, dt) => { blades.current.rotation.z += dt * (0.8 + i * 0.3) })
  return <Surface n={n} lift={-0.05} spin={-0.4 + i}>
    <mesh position={[0, 0.55, 0]} material={MAT.white}><cylinderGeometry args={[0.16, 0.26, 1.1, 8]} /><Outlines thickness={0.025} color={INK} /></mesh>
    <mesh position={[0, 1.22, 0]} material={MAT.roofs[i % 4]}><coneGeometry args={[0.22, 0.32, 8]} /><Outlines thickness={0.02} color={INK} /></mesh>
    <mesh position={[0, 0.6, 0.235]} material={MAT.win}><planeGeometry args={[0.08, 0.1]} /></mesh>
    <group ref={blades} position={[0, 1.0, 0.26]}>
      {[0, 1, 2, 3].map(k => <group key={k} rotation={[0, 0, k * Math.PI / 2]}><mesh position={[0, 0.38, 0]} material={MAT.sail}><boxGeometry args={[0.13, 0.6, 0.015]} /><Outlines thickness={0.015} color={INK} /></mesh><mesh position={[0, 0.38, -0.01]} material={MAT.wood}><boxGeometry args={[0.025, 0.72, 0.02]} /></mesh></group>)}
      <mesh material={MAT.wood}><sphereGeometry args={[0.05, 8, 6]} /></mesh>
    </group>
  </Surface>
}

const SHIRTS = ['#e86f5a', '#5f8fc4', '#f2b84b', '#8cc084', '#c97b9a', '#f6ead2']
// townsfolk: path walkers, pacers and idlers built from the procedural Person
const tangentAt = (n, b = 0) => { const e1 = new THREE.Vector3(0, 1, 0).cross(n).normalize(); const e2 = new THREE.Vector3().crossVectors(n, e1); return e1.multiplyScalar(Math.cos(b)).addScaledVector(e2, Math.sin(b)) }
const WALKERS = (() => {
  const W = [], P_ = PEOPLE
  const pathers = [1, 2, 3, 6, 7, 10, 4, 9, 5, 11]
  pathers.forEach((k, i) => W.push({ cfg: P_[k], mode: 'path', t0: (i / pathers.length) * Math.PI * 2 + rnd() * 0.3, sp: (0.045 + rnd() * 0.025) * (i % 2 ? -1 : 1) * (P_[k].elder ? 0.6 : 1), off: (rnd() - 0.5) * 0.1 }))
  const sq = around(VILLAGE, 0.0, 0)
  ;[2, 7, 5].forEach((k, j) => { const n = around(sq, 0.22 / R, j * 2.1); W.push({ cfg: P_[k], mode: 'idle', n, fwd: sq.clone().sub(n), wave: j === 1 }) })
  const pier = around(Zc.harbour, 0.22 * 1.35, 1.6)
  W.push({ cfg: P_[8], mode: 'pace', n: pier, tan: tangentAt(pier, 0.4), range: 0.9, w: 0.25 })
  W.push({ cfg: P_[10], mode: 'pace', n: around(Zc.harbour, 0.22 * 1.45, 3.0), tan: tangentAt(Zc.harbour, 1.2), range: 1.2, w: 0.2 })
  W.push({ cfg: { ...P_[8], top: '#d9655b', hat: 'straw', hatC: '#e2c27a', name: 'angler' }, mode: 'idle', n: (() => { const sh = around(Zc.lake, 0.2 * 1.06, LAKE_DOCK_B); const f = Zc.lake.clone().addScaledVector(sh, -sh.dot(Zc.lake)).normalize(); return sh.clone().addScaledVector(f, 1.15 / R).normalize() })(), fwd: Zc.lake.clone(), lift: () => 0, dock: true })
  W.push({ cfg: P_[3], mode: 'pace', n: around(Zc.terraces, 0.07, 0.5), tan: tangentAt(Zc.terraces, 0.5), range: 0.8, w: 0.18 })
  W.push({ cfg: { ...P_[4], name: 'planter' }, mode: 'pace', n: around(Zc.terraces, 0.11, 2.5), tan: tangentAt(Zc.terraces, 2.0), range: 0.6, w: 0.12 })
  W.push({ cfg: P_[9], mode: 'idle', n: around(Zc.ruins, 0.25 / R, 4.0), fwd: Zc.ruins.clone(), look: -0.35 })
  W.push({ cfg: P_[6], mode: 'pace', n: around(Zc.mills, 0.06, 1.0), tan: tangentAt(Zc.mills, 1.0), range: 1.4, w: 0.35 })
  W.push({ cfg: P_[1], mode: 'pace', n: around(Zc.giant, 1.6 / R, 0.5), tan: tangentAt(Zc.giant, 2.0), range: 0.7, w: 0.3 })
  W.push({ cfg: P_[11], mode: 'pace', n: around(Zc.giant, 1.75 / R, 0.8), tan: tangentAt(Zc.giant, 2.0), range: 0.4, w: 0.3 })
  return W
})()
const NEW_WALKERS = (() => {
  const W = [], by = z => VILLAGERS.filter(v => v.zone === z)
  by('path').forEach((cfg, i, a) => W.push({ cfg, mode: 'path', t0: (i / a.length) * Math.PI * 2 + rnd() * 0.3, sp: (0.045 + rnd() * 0.025) * (i % 2 ? -1 : 1) * (cfg.age === 'elder' ? 0.55 : 1), off: (rnd() - 0.5) * 0.1 }))
  const sq = around(VILLAGE, 0.0, 0)
  by('square').forEach((cfg, j) => { const n = around(sq, 0.22 / R, j * 2.1); W.push({ cfg, mode: 'idle', n, fwd: sq.clone().sub(n) }) })
  const [fm, fw, sg, db] = by('harbour'), pier = around(Zc.harbour, 0.22 * 1.35, 1.6)
  W.push({ cfg: fm, mode: 'pace', n: pier, tan: tangentAt(pier, 0.4), range: 0.9, w: 0.22 })
  W.push({ cfg: fw, mode: 'idle', n: around(Zc.harbour, 0.22 * 1.2, 2.3), fwd: Zc.harbour.clone() })
  W.push({ cfg: sg, mode: 'pace', n: around(Zc.harbour, 0.22 * 1.45, 3.0), tan: tangentAt(Zc.harbour, 1.2), range: 1.2, w: 0.2 })
  W.push({ cfg: db, mode: 'pace', n: around(Zc.harbour, 0.22 * 1.3, 2.7), tan: tangentAt(Zc.harbour, 2.0), range: 0.6, w: 0.45 })
  W.push({ cfg: by('lake')[0], mode: 'idle', n: (() => { const sh = around(Zc.lake, 0.2 * 1.06, LAKE_DOCK_B); const f = Zc.lake.clone().addScaledVector(sh, -sh.dot(Zc.lake)).normalize(); return sh.clone().addScaledVector(f, 1.15 / R).normalize() })(), fwd: Zc.lake.clone(), dock: true })
  const [fa, fwf] = by('terraces')
  W.push({ cfg: fa, mode: 'pace', n: around(Zc.terraces, 0.07, 0.5), tan: tangentAt(Zc.terraces, 0.5), range: 0.8, w: 0.18 })
  W.push({ cfg: fwf, mode: 'pace', n: around(Zc.terraces, 0.11, 2.5), tan: tangentAt(Zc.terraces, 2.0), range: 0.6, w: 0.12 })
  W.push({ cfg: by('ruins')[0], mode: 'idle', n: around(Zc.ruins, 0.25 / R, 4.0), fwd: Zc.ruins.clone(), look: -0.35 })
  W.push({ cfg: by('mills')[0], mode: 'pace', n: around(Zc.mills, 0.06, 1.0), tan: tangentAt(Zc.mills, 1.0), range: 1.4, w: 0.35 })
  const [bs, td] = by('giant')
  W.push({ cfg: bs, mode: 'pace', n: around(Zc.giant, 1.6 / R, 0.5), tan: tangentAt(Zc.giant, 2.0), range: 0.7, w: 0.3 })
  W.push({ cfg: td, mode: 'pace', n: around(Zc.giant, 1.75 / R, 0.8), tan: tangentAt(Zc.giant, 2.0), range: 0.4, w: 0.3 })
  return W
})()
const _c0 = new THREE.Vector3()
const RATE = { toddler: 12, kid: 10.5, teen: 9, adult: 8, elder: 6 }
function Walker({ w, i }) {
  const ref = useRef(), st = useMemo(() => ({ phase: rnd() * 6, move: 0, t: 0, wave: w.wave, look: w.look || 0 }), [])
  const camera = useThree(s => s.camera)
  useFrame((_, dt) => {
    dt = Math.min(dt, 0.05); const t = wind.time.value; st.t = t
    let n, fwd, mv = 1
    if (w.mode === 'path') { const a = w.t0 + t * w.sp; n = pathDir(a).normalize(); const n2 = pathDir(a + 0.01 * Math.sign(w.sp)).normalize(); fwd = n2.sub(n).normalize(); n.addScaledVector(new THREE.Vector3().crossVectors(n, fwd), w.off / R).normalize() }
    else if (w.mode === 'pace') { const ph = t * w.w + i, s = Math.sin(ph), c = Math.cos(ph); n = w.n.clone().addScaledVector(w.tan, s * w.range / R).normalize(); fwd = w.tan.clone().multiplyScalar(c >= 0 ? 1 : -1); mv = ss(0.12, 0.35, Math.abs(c)) }
    else { n = w.n.clone().normalize(); fwd = w.fwd.clone(); mv = 0 }
    fwd.addScaledVector(n, -fwd.dot(n)).normalize()
    st.move += (mv - st.move) * Math.min(1, dt * 6); st.phase += dt * (NEWCHAR ? (w.cfg.walk?.rate ?? RATE[w.cfg.age] ?? 8) : w.cfg.kid ? 11 : w.cfg.elder ? 6.5 : 8.5) * st.move
    const g = ref.current; g.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3().crossVectors(n, fwd), n, fwd))
    g.position.copy(n).multiplyScalar(w.dock ? R + LAKE_W + 0.135 : R + height(n) + 0.005 + bridgeLift(n))
    if (planetRef.current) { // cull by distance (close views) and by horizon (anything on the planet's far side)
      _f.copy(g.position).applyMatrix4(planetRef.current.matrixWorld); _c0.setFromMatrixPosition(planetRef.current.matrixWorld)
      const up = _f.clone().sub(_c0).normalize(), toCam = camera.position.clone().sub(_f).normalize()
      g.visible = up.dot(toCam) > -0.05 && (VIEW.mode === 'orbit' || camera.position.distanceTo(_f) < 12) } else g.visible = true
  })
  return <group ref={ref}>{NEWCHAR ? <Character cfg={w.cfg} st={st} res={56} scale={0.8} /> : <Person cfg={w.cfg} st={st} seed={i} />}</group>
}
const LINEUP = around(Zc.meadow, 0.1, 2.4)
function Lineup() {
  const LIST = NEWCHAR ? VILLAGERS : PEOPLE
  const sts = useMemo(() => LIST.map((_, i) => ({ phase: i * 0.7, move: NEWCHAR ? (q.has('walk') ? 1 : 0) : i % 3 === 0 ? 0 : 1, t: 0, wave: i % 3 === 0 })), [])
  useFrame((_, dt) => { sts.forEach((st, i) => { st.t = wind.time.value; st.phase += dt * 8 * st.move }) })
  const f = tangentAt(LINEUP, 0), side = new THREE.Vector3().crossVectors(LINEUP, f)
  if (NEWCHAR) return LIST.map((cfg, i) => { const row = Math.floor(i / 8), k = i % 8, nr = row < 2 ? 8 : LIST.length - 16; const n = LINEUP.clone().addScaledVector(side, (k - (nr - 1) / 2) * 0.24 / R + (row % 2) * 0.1 / R).addScaledVector(f, -row * 0.4 / R).normalize(); return <Basis key={i} n={n} fwd={f}><Character cfg={cfg} st={sts[i]} res={56} scale={0.8} /></Basis> })
  return PEOPLE.map((cfg, i) => { const n = LINEUP.clone().addScaledVector(side, (i - (PEOPLE.length - 1) / 2) * 0.17 / R).addScaledVector(f, (i % 2) * 0.12 / R).normalize(); return <Basis key={i} n={n} fwd={f}><Person cfg={cfg} st={sts[i]} seed={i} /></Basis> })
}

function Clouds() {
  const cl = useMemo(() => Array.from({ length: 12 }, (_, i) => ({ axis: new THREE.Vector3(rnd() - 0.5, 1, rnd() - 0.5).normalize(), off: rnd() * 6, r: 11.5 + rnd() * 2.5, y: (i % 2 ? -1 : 1) * (4.2 + rnd() * 3.5), puffs: Array.from({ length: 4 + (i % 3) }, (_, k) => [k * 0.65 - 1.1, rnd() * 0.35, rnd() * 0.4, 0.5 + rnd() * 0.45]) })), [])
  const refs = useRef([]); const mat = useMemo(() => toon('#ffffff'), [])
  useFrame(() => { const t = wind.time.value; mat.emissive.set('#000000').lerp(C('#ff9f80'), T.dusk * 0.35).lerp(C('#2a3170'), T.night * 0.5); mat.color.set('#ffffff').lerp(C('#ffd2c0'), T.dusk * 0.7).lerp(C('#8a94c4'), T.night * 0.7); cl.forEach((c, i) => { const a = c.off + t * 0.03; const g = refs.current[i]; g.position.set(Math.cos(a) * c.r, c.y, Math.sin(a) * c.r); g.lookAt(0, c.y, 0) }) })
  return cl.map((c, i) => <group key={i} ref={el => refs.current[i] = el}>{c.puffs.map((p, k) => <mesh key={k} position={[p[0], p[1], p[2]]} scale={p[3]} material={mat}><icosahedronGeometry args={[1, 2]} /><Outlines thickness={0.025} color="#8a8fb0" /></mesh>)}</group>)
}
function Birds() {
  const birds = useMemo(() => Array.from({ length: 12 }, (_, i) => ({ f: Math.floor(i / 4), k: i % 4 })), []); const refs = useRef([]); const mat = useMemo(() => toon('#3f3a4a', { side: THREE.DoubleSide }), [])
  useFrame(() => { const t = wind.time.value; birds.forEach((b, i) => { const g = refs.current[i]; const a = t * 0.25 + b.f * 2.1 - b.k * 0.05, r = 10.5 + b.f * 0.6, y = 3.4 + b.f * 1.6 - Math.abs(b.k - 1.5) * 0.15 + Math.sin(t + b.f) * 0.3; g.position.set(Math.cos(a) * r + (b.k % 2) * 0.2, y, Math.sin(a) * r); g.lookAt(Math.cos(a + 0.1) * r, y, Math.sin(a + 0.1) * r); const fl = Math.sin(t * 10 + i) * 0.6; g.children[0].rotation.z = fl; g.children[1].rotation.z = -fl }) })
  return birds.map((b, i) => <group key={i} ref={el => refs.current[i] = el} scale={0.6}>{[1, -1].map(s => <group key={s}><mesh position={[s * 0.12, 0, 0]} material={mat}><boxGeometry args={[0.24, 0.01, 0.07]} /></mesh></group>)}</group>)
}
function Fireflies() {
  const { geo, mat } = useMemo(() => {
    const HAM = dir(0.6, 2.45); const N = 520, p = [], s = []; for (let i = 0; i < N; i++) { const n = i < 90 ? VILLAGE.clone().add(randDir().multiplyScalar(0.4)).normalize() : i < 200 ? HAM.clone().add(randDir().multiplyScalar(0.4)).normalize() : randDir(); p.push(...n.multiplyScalar(R + 0.15 + rnd() * 0.6).toArray()); s.push(rnd() * 6) }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); geo.setAttribute('seed', new THREE.Float32BufferAttribute(s, 1))
    const mat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, uniforms: { uTime: wind.time, uN: { value: 0 } },
      vertexShader: `attribute float seed; uniform float uTime; varying float vA; void main(){ vec3 p = position + vec3(sin(uTime*.7+seed*3.),cos(uTime*.9+seed*5.),sin(uTime*.5+seed))*.12; vA = .5+.5*sin(uTime*2.5+seed*7.); vec4 mv = modelViewMatrix*vec4(p,1.); gl_PointSize = 150./-mv.z; gl_Position = projectionMatrix*mv; }`,
      fragmentShader: `uniform float uN; varying float vA; void main(){ float d = length(gl_PointCoord-.5); float a = smoothstep(.5,0.,d); gl_FragColor = vec4(vec3(.9,1.,.55)*3.*a*vA*uN, a*vA*uN); }` })
    return { geo, mat }
  }, [])
  useFrame(() => { mat.uniforms.uN.value = T.night })
  return <points geometry={geo} material={mat} />
}

// ---------- traveller ----------
const P = { n: dir(0.95, 0.12).normalize(), fwd: new THREE.Vector3(), h: 0, vy: 0, target: null, move: 0, phase: 0, wUp: new THREE.Vector3(), wFwd: new THREE.Vector3(), wPos: new THREE.Vector3() }
{ const t = new THREE.Vector3(0, 1, 0); P.fwd.copy(t.sub(P.n.clone().multiplyScalar(P.n.dot(t)))).normalize().negate() }
const KEYS = {}
if (VIEW.mode === 'detail') { P.n.copy(bl(B0, 0.08, 0)); P.fwd.copy(B0.tan) }
window.__player = P
function Keys() {
  useEffect(() => {
    const d = e => { const k = e.key.toLowerCase(); KEYS[k] = true; if (k === ' ' && Math.abs(P.h - bridgeLift(P.n)) < 0.003) P.vy = 1.9; if (k === 'v') VIEW.mode = VIEW.mode === 'follow' ? 'orbit' : 'follow'; if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) e.preventDefault() }
    const u = e => { KEYS[e.key.toLowerCase()] = false }
    addEventListener('keydown', d); addEventListener('keyup', u); return () => { removeEventListener('keydown', d); removeEventListener('keyup', u) }
  }, [])
  return null
}
function stepPlayer(dt) {
  const f = (KEYS.w || KEYS.arrowup ? 1 : 0) - (KEYS.s || KEYS.arrowdown ? 1 : 0), turn = (KEYS.a || KEYS.arrowleft ? 1 : 0) - (KEYS.d || KEYS.arrowright ? 1 : 0)
  let go = f
  if (f || turn) P.target = null
  if (turn) P.fwd.applyAxisAngle(P.n, turn * 2.4 * dt)
  if (P.target) {
    const tg = P.target.clone().addScaledVector(P.n, -P.n.dot(P.target))
    if (P.n.angleTo(P.target) < 0.015 || tg.lengthSq() < 1e-8) P.target = null
    else { P.fwd.lerp(tg.normalize(), Math.min(1, dt * 8)); go = 1 }
  }
  P.move += ((Math.abs(go) > 0 ? 1 : 0) - P.move) * Math.min(1, dt * 8)
  P.n.addScaledVector(P.fwd, go * (KEYS.shift ? 2.6 : 1.5) / R * dt).normalize()
  for (const c of COLLIDERS) { const a = P.n.angleTo(c.n); if (a < c.r) { const d = P.n.clone().addScaledVector(c.n, -P.n.dot(c.n)).normalize(); P.n.copy(c.n).multiplyScalar(Math.cos(c.r)).addScaledVector(d, Math.sin(c.r)).normalize() } }
  P.fwd.addScaledVector(P.n, -P.fwd.dot(P.n)).normalize()
  const fl = bridgeLift(P.n); P.vy -= 7 * dt; P.h += P.vy * dt; if (P.h < fl) { if (fl - P.h < 0.12 || P.vy < 0) { P.h = fl; P.vy = 0 } } // gravity toward planet centre
  P.phase += dt * (KEYS.shift ? 13 : 9.5) * P.move
}
const PM = { tunic: toon('#5f8fc4'), skin: toon('#f8d9bf'), hat: toon('#e9c46a'), band: toon('#d9655b'), cape: toon('#d9655b', { side: THREE.DoubleSide }), boot: toon('#6b4a3a'), eye: toon('#2e2420'), cheek: toon('#f4a3a0'), bag: toon('#b98a5a') }
const PST = { phase: 0, move: 0, t: 0, turn: 0, dist: 0 }
const _pp = new THREE.Vector3()
const _pf = new THREE.Vector3()
function Traveller() {
  const ref = useRef()
  useFrame((_, dt) => {
    dt = Math.min(dt, 0.05); stepPlayer(dt)
    const side = new THREE.Vector3().crossVectors(P.n, P.fwd)
    ref.current.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(side, P.n, P.fwd))
    ref.current.position.copy(P.n).multiplyScalar(R + height(P.n) + 0.005 + P.h)
    PST.phase = P.phase; PST.move = P.move; PST.t = wind.time.value
    if (_pp.lengthSq() > 0) PST.dist += Math.min(_pp.distanceTo(ref.current.position), 0.2); _pp.copy(ref.current.position)
    if (_pf.lengthSq() > 0) { const a = Math.atan2(_pf.clone().cross(P.fwd).dot(P.n), _pf.dot(P.fwd)); PST.turn += (a / Math.max(dt, 1e-3) - PST.turn) * Math.min(1, dt * 10) } _pf.copy(P.fwd)
  })
  return <group ref={ref}>{SPRITE ? <SpritePerson st={PST} /> : NEWCHAR ? <GhibliPerson st={PST} /> : <Person cfg={PEOPLE[0]} st={PST} />}</group>
}
const HB_LOOK = around(Zc.harbour, 0.29, 2.3)
const ZVIEWS = {
  'square': { cam: around(VILLAGE, 1.3 / R, 0.4), ch: 0.6, look: VILLAGE, lh: 0.2 },
  'harbour-people': { cam: around(HB_LOOK, 1.7 / R, 0.2), ch: 0.75, look: HB_LOOK, lh: 0.2 },
  'lake-waterfall': { cam: around(Zc.lake, 0.42, 3.9), ch: 2.4, look: Zc.lake.clone().lerp(Zc.cliff, 0.55), lh: 0.2 },
  'terraces-train': { cam: dir(-1.2, 2.75), ch: 2.0, look: Zc.terraces.clone().lerp(dir(-0.95, 2.7), 0.45), lh: 0.2 },
  'harbour-ruins': { cam: dir(-0.1, 3.7), ch: 3.4, look: Zc.harbour.clone().lerp(Zc.ruins, 0.45), lh: 0.0 },
  'forest-giant': { cam: around(Zc.giant, 0.78, 4.6), ch: 3.6, look: Zc.giant, lh: 2.0 },
  'meadow-mills': { cam: Zc.meadow.clone().lerp(Zc.mills, 0.15), ch: 2.4, look: Zc.mills, lh: 0.5 },
}
function Rig() {
  const camera = useThree(s => s.camera)
  const goal = useMemo(() => new THREE.Vector3(), []), look = useMemo(() => new THREE.Vector3(), [])
  useFrame((_, dt) => {
    dt = Math.min(dt, 0.05)
    const g = planetRef.current; if (!g) return
    if (VIEW.mode === 'orbit') { if (!window.__drag) { spin.v *= 0.95; if (!fixed) spin.a -= dt * 0.04 } spin.a += spin.v * dt } else spin.v = 0
    g.rotation.y = spin.a; g.updateMatrixWorld()
    P.wPos.copy(P.n).multiplyScalar(R + height(P.n) + P.h).applyMatrix4(g.matrixWorld)
    P.wUp.copy(P.n).transformDirection(g.matrixWorld); P.wFwd.copy(P.fwd).transformDirection(g.matrixWorld)
    const k = 1 - Math.exp(-dt * ((window.__snap || VIEW.mode === 'detail') ? 60 : 4))
    if (VIEW.mode === 'follow') {
      goal.copy(P.wPos).addScaledVector(P.wUp, 1.05).addScaledVector(P.wFwd, -2.1)
      if (goal.length() < R + 0.6) goal.setLength(R + 0.6)
      _v.copy(P.wPos).addScaledVector(P.wUp, 0.3); _u.copy(goal).sub(_v); const dist = _u.length(); RC.set(_v, _u.normalize()); RC.far = dist
      const hit = RC.intersectObjects(OCC, false)[0]; if (hit) goal.copy(_v).addScaledVector(_u, Math.max(0.35, hit.distance - 0.12)).addScaledVector(P.wUp, 0.15 * (1 - hit.distance / dist))
      camera.position.lerp(goal, k); camera.up.lerp(P.wUp, k).normalize()
      look.lerp(_v.copy(P.wPos).addScaledVector(P.wUp, 0.35).addScaledVector(P.wFwd, 0.6), k); camera.lookAt(look)
    } else if (VIEW.mode === 'hero') {
      _s.crossVectors(P.wUp, P.wFwd)
      goal.copy(P.wPos).addScaledVector(P.wFwd, 0.95).addScaledVector(_s, 0.45).addScaledVector(P.wUp, 0.42)
      camera.position.lerp(goal, 1); camera.up.copy(P.wUp); look.copy(P.wPos).addScaledVector(P.wUp, 0.24); camera.lookAt(look)
    } else if (VIEW.mode === 'zone' || VIEW.mode === 'lineup') {
      const zv_ = VIEW.mode === 'lineup' ? { cam: LINEUP.clone().addScaledVector(tangentAt(LINEUP, 0), 2.3 / R).normalize(), ch: 1.1, look: LINEUP.clone().addScaledVector(tangentAt(LINEUP, 0), -0.4 / R).normalize(), lh: 0.25 } : ZVIEWS[q.get('z')] || ZVIEWS.lake
      const camL = zv_.cam.clone().normalize().multiplyScalar(R + Math.max(height(zv_.cam), -0.1) + zv_.ch), lookL = zv_.look.clone().normalize().multiplyScalar(R + height(zv_.look) + zv_.lh)
      camera.position.copy(camL.applyMatrix4(g.matrixWorld)); camera.up.copy(zv_.cam.clone().normalize().transformDirection(g.matrixWorld)); look.copy(lookL.applyMatrix4(g.matrixWorld)); camera.lookAt(look)
    } else if (VIEW.mode === 'detail') {
      const c = B0.c.clone(); const lookL = bl(B0, -0.3, 0.45).multiplyScalar(R + 0.15), camL = bl(B0, -2.3, 1.7).multiplyScalar(R + 1.25)
      goal.copy(camL).applyMatrix4(g.matrixWorld); camera.position.lerp(goal, k); camera.up.lerp(_u.copy(c).transformDirection(g.matrixWorld), k).normalize(); look.lerp(lookL.applyMatrix4(g.matrixWorld), k); camera.lookAt(look)
    } else {
      camera.position.lerp(goal.set(0, 5.8, 30), k); camera.up.lerp(_u.set(0, 1, 0), k).normalize(); look.lerp(_v.set(0, 1, 0), k); camera.lookAt(look)
    }
  })
  return null
}
function Hint() {
  const [m, setM] = React.useState(VIEW.mode)
  useEffect(() => { const id = setInterval(() => setM(VIEW.mode), 300); return () => clearInterval(id) }, [])
  return <div style={{ fontSize: 15, opacity: 0.85, lineHeight: 1.5 }}>{m === 'follow' ? <>WASD / arrows to walk · Space to jump · tap or click to walk there<br />V for planet view</> : <>drag to spin the planet · V to walk</>}</div>
}

function Planet() {
  const onDown = (e) => { if (VIEW.mode !== 'follow') return; e.stopPropagation(); const l = planetRef.current.worldToLocal(e.point.clone()).normalize(); P.target = l }
  return <group rotation={[0.35, 0, 0]}><group ref={el => planetRef.current = el} onPointerDown={onDown}>
    <Ground /><Path /><Stream /><Vegetation />
    {HOUSES.map((n, i) => <House key={i} n={n} i={i} />)}
    {MILLS.map((n, i) => <Windmill key={i} n={n} i={i} />)}
    {[dir(1.05, 0.05), dir(0.95, 0.3), dir(0.75, 0.0), dir(1.22, 0.25), dir(0.35, 1.55), dir(0.15, -0.4), dir(0.62, 2.4), dir(0.8, 2.45), dir(0.45, 2.42), dir(0.6, 2.75)].map((n, i) => <Lamp key={i} n={n} i={i} />)}
    {!q.has('novill') && (NEWCHAR ? NEW_WALKERS : WALKERS).map((w, i) => <Walker key={i} w={w} i={i} />)}
    {VIEW.mode === 'lineup' && <Lineup />}
    <Zones />
    {HARBOUR_HOUSES.map((n, i) => <Cull key={'hh' + i} n={n} d={16}><House n={n} i={i + 3} /></Cull>)}
    {MILL_FIELD.map((n, i) => <Windmill key={'mf' + i} n={n} i={i + 2} />)}
    <Traveller /><Details />
    <Fireflies />
  </group></group>
}

function Stats() {
  const gl = useThree(s => s.gl), scene = useThree(s => s.scene)
  useEffect(() => { gl.info.autoReset = false; window.__scene = scene }, [])
  useFrame(() => { window.__calls = gl.info.render.calls; window.__tris = gl.info.render.triangles; gl.info.reset() }, -100)
  return null
}
// Horizon culling: meshes well past the planet's horizon (as seen from the camera) leave camera layer 0.
// Uses layers, not .visible, so it never fights components that toggle visibility themselves.
function HorizonCull() {
  const camera = useThree(s => s.camera), n = useRef(0), list = useRef(null), _p = useMemo(() => new THREE.Vector3(), []), _o = useMemo(() => new THREE.Vector3(), [])
  useFrame(() => {
    const pl = planetRef.current; if (!pl || n.current++ % 4) return
    if (!list.current || n.current % 240 === 1) { list.current = []; pl.traverse(o => { if ((o.isMesh || o.isPoints) && !o.isInstancedMesh && !o.isSkinnedMesh && o.geometry && o !== pl) list.current.push(o) }) }
    _o.setFromMatrixPosition(pl.matrixWorld); const camD = camera.position.distanceTo(_o)
    const lim = -Math.min(0.42, 4.5 / camD) // looser when close
    for (const o of list.current) {
      _p.setFromMatrixPosition(o.matrixWorld); const r = _p.distanceTo(_o); if (r < R * 0.6) continue // skip big/central stuff (planet, sky)
      const up = _p.sub(_o).divideScalar(r), toCam = camera.position.clone().sub(_o).normalize()
      const hide = up.dot(toCam) < lim
      if (hide) o.layers.disable(0); else o.layers.enable(0)
    }
  })
  return null
}
function Drag() {
  const gl = useThree(s => s.gl)
  useEffect(() => { let lx = 0, lt = 0; const el = gl.domElement
    const dn = e => { if (VIEW.mode !== 'orbit') return; window.__drag = true; lx = e.clientX; lt = performance.now(); spin.v = 0 }
    const mv = e => { if (!window.__drag) return; const dx = e.clientX - lx, now = performance.now(); spin.a += dx * 0.006; spin.v = dx * 0.006 / Math.max((now - lt) / 1000, 0.008); lx = e.clientX; lt = now }
    const up = () => { window.__drag = false }
    el.addEventListener('pointerdown', dn); addEventListener('pointermove', mv); addEventListener('pointerup', up); return () => { el.removeEventListener('pointerdown', dn); removeEventListener('pointermove', mv); removeEventListener('pointerup', up) } }, [])
  return null
}

// ---------- character studio (?view=charstudio) ----------
const ANGLES = { front: 0, three: 0.75, side: Math.PI / 2, back: Math.PI }
function Studio() {
  const camera = useThree(s => s.camera), scene = useThree(s => s.scene)
  const compare = q.has('compare'), walk = q.get('pose') === 'walk', ang = ANGLES[q.get('angle')] ?? 0.4
  const stOld = useMemo(() => ({ phase: 0, move: walk ? 1 : 0, t: 0 }), []), stNew = useMemo(() => ({ phase: 0, move: walk ? 1 : 0, t: 0, turn: 0, dist: 0 }), [])
  const bg = useMemo(() => new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, vertexShader: `varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`, fragmentShader: `varying vec3 vP; void main(){ float y = vP.y*.5+.5; vec3 c = mix(vec3(.98,.93,.86), vec3(.78,.88,.95), smoothstep(.45,.85,y)); gl_FragColor = vec4(c,1.);
    #include <colorspace_fragment>
  }` }), [])
  useFrame((_, dt) => {
    dt = Math.min(dt, 0.05); wind.time.value += dt
    T.sun.set(0.55, 0.75, 0.6).normalize(); T.day = 1; T.dusk = 0; T.night = 0
    for (const st of [stOld, stNew]) { st.t = wind.time.value; st.phase += dt * 9 * st.move; st.dist += dt * 0.27 * st.move }
    if (q.has('freeze')) { stOld.phase = stNew.phase = +q.get('freeze') }
    const d = compare ? 1.35 : 0.95, cx = 0
    camera.position.set(cx + Math.sin(ang) * d, 0.3, Math.cos(ang) * d); camera.up.set(0, 1, 0); camera.lookAt(cx, 0.2, 0)
  })
  return <>
    <mesh material={bg}><sphereGeometry args={[30, 32, 16]} /></mesh>
    <directionalLight position={[3, 4, 3.5]} intensity={2.4} color="#fff3dc" /><hemisphereLight args={['#cfe6ff', '#e8d8b8', 0.9]} />
    <mesh rotation={[-Math.PI / 2, 0, 0]} material={useMemo(() => toon('#efe6d2'), [])}><circleGeometry args={[1.6, 48]} /></mesh>
    {(compare ? (SPRITE ? [[-0.25, 'new'], [0.25, 'sprite']] : [[-0.25, 'old'], [0.25, 'new']]) : [[0, q.has('old') ? 'old' : SPRITE ? 'sprite' : 'new']]).map(([x, k]) => <group key={k} position={[x, 0.001, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]}><circleGeometry args={[0.09, 32]} /><meshBasicMaterial color="#000" transparent opacity={0.12} depthWrite={false} /></mesh>
      {k === 'old' ? (NEWCHAR ? <GhibliPersonV1 st={stOld} /> : <Person cfg={PEOPLE[0]} st={stOld} />) : k === 'sprite' ? <SpritePerson st={stNew} /> : <GhibliPerson st={stNew} />}
    </group>)}
  </>
}

export default function App() {
  if (VIEW.mode === 'charstudio') return <>
    <Canvas dpr={[1, 2]} camera={{ fov: 30, near: 0.01 }} gl={{ antialias: true }} style={{ position: 'fixed', inset: 0 }}>
      <Studio />
      <EffectComposer multisampling={4}><Noise opacity={0.08} blendFunction={BlendFunction.SOFT_LIGHT} /><Vignette offset={0.35} darkness={0.35} /></EffectComposer>
    </Canvas>
    <div style={{ position: 'fixed', left: 28, top: 22, fontFamily: 'Fredoka, sans-serif', color: '#5a4636', fontSize: 22 }}>Character studio{q.has('compare') ? (SPRITE ? ' · 3D (left) vs 2.5D sprite (right)' : (NEWCHAR ? ' · previous 3D prototype (left) vs new (right)' : ' · old (left) vs new (right)')) : ''}</div>
  </>
  return <>
    <Canvas dpr={[1, 2]} camera={{ position: [0, 5.8, 30], fov: 36, far: 400 }} onCreated={({ camera }) => camera.lookAt(0, 1, 0)} gl={{ antialias: true }} style={{ position: 'fixed', inset: 0, cursor: 'pointer' }}>
      <Clock /><Stats /><HorizonCull /><Drag /><Rig /><Keys /><Sky /><Lights /><Planet /><Clouds /><Birds />
      <EffectComposer multisampling={4}>
        <Bloom intensity={0.9} luminanceThreshold={0.93} luminanceSmoothing={0.2} mipmapBlur />
        <Noise opacity={0.12} blendFunction={BlendFunction.SOFT_LIGHT} />
        <Vignette offset={0.3} darkness={0.55} />
      </EffectComposer>
    </Canvas>
    <div style={{ position: 'fixed', left: 32, top: 26, fontFamily: 'Fredoka, sans-serif', color: 'var(--ink)', pointerEvents: 'none', textShadow: '0 1px 0 #fff8' }}>
      <div style={{ fontSize: 34, fontWeight: 500 }}>Tiny Planet</div><Hint />
    </div>
  </>
}
