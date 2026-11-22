// Sky dome (watercolour gradient, sun, moon, stars), sun / moon / hemisphere lights, clouds, birds and fireflies.
// All of it follows the shared day state T (common.jsx) that the Clock updates each frame.
// Clouds and Fireflies draw from the shared seeded rnd() at mount, exactly as before (same mount order in App).
import * as THREE from 'three'
import React, { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Outlines } from '@react-three/drei'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { R, WS, rnd, dir, randDir, wind } from '../world.js'
import { T, ss, C, CC, toon, VIEW } from '../common.jsx'
import { VILLAGE } from './village.js'
import { HOME } from '../home/state.js'
const MOON_OFF = new THREE.Vector3(6, 0, 8)
// Colours are authored in sRGB and linearised at the end: written raw they were brightened a second time by the
// output encoding, which is what turned the cornflower sky into a pale grey-cream.
// Sky gradient is measured from the camera's own "up" (the traveller's local up in walk view), not world Y: on a tiny
// planet world Y is only "up" at the north pole, so elsewhere the walk camera only ever saw the pale horizon band.
// yw: 0.5 is the planet's visible rim, which dips well below level on a tiny planet (uDip). Washes are kept light.
// In planet view (uOrbit) the backdrop stretches the same palette across the frame and adds a soft halo around the globe.
export function Sky() {
  const mat = useMemo(() => new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, uniforms: { uSun: { value: T.sun }, uDay: { value: 1 }, uDusk: { value: 0 }, uNight: { value: 0 }, uTime: wind.time, uUp: { value: new THREE.Vector3(0, 1, 0) }, uOrbit: { value: VIEW.mode === 'orbit' ? 1 : 0 }, uHalo: { value: 0.95 }, uDip: { value: 0 } },
    vertexShader: `varying vec3 vP, vW; void main(){ vP = normalize(position); vW = (modelMatrix*vec4(position,1.)).xyz; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `varying vec3 vP, vW; uniform vec3 uSun, uUp; uniform float uDay,uDusk,uNight,uTime,uOrbit,uHalo,uDip;
    float h(vec3 p){ return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453); }
    float n(vec3 p){ vec3 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(mix(h(i),h(i+vec3(1,0,0)),f.x),mix(h(i+vec3(0,1,0)),h(i+vec3(1,1,0)),f.x),f.y),mix(mix(h(i+vec3(0,0,1)),h(i+vec3(1,0,1)),f.x),mix(h(i+vec3(0,1,1)),h(i+vec3(1,1,1)),f.x),f.y),f.z); }
    float fbm(vec3 p){ float s=0., a=.5; for(int i=0;i<5;i++){ s+=a*n(p); p*=2.03; a*=.5; } return s; }
    void main(){ vec3 vD = normalize(vW - cameraPosition);
      float yw = .5 + .5*sin(clamp(asin(clamp(dot(vD, normalize(uUp)),-1.,1.)) + uDip, -1.5707, 1.5707));
      float yo = clamp(.5 + (yw-.5)*2.6, 0., 1.);
      float y = mix(yw, yo, uOrbit);
      vec3 dT=vec3(.49,.74,.91), dM=vec3(.72,.86,.94), dH=vec3(.99,.95,.84); vec3 kT=vec3(.42,.44,.68), kH=vec3(1.,.70,.52), kR=vec3(.97,.56,.63); vec3 nT=vec3(.05,.07,.19), nH=vec3(.17,.23,.44);
      vec3 day = mix(mix(dH,dM,smoothstep(.47,.6,y)),dT,smoothstep(.56,.85,y));
      vec3 dusk = mix(mix(kH,kR,smoothstep(.46,.6,y)),kT,smoothstep(.58,.9,y)); vec3 night = mix(nH,nT,smoothstep(.46,.8,y));
      vec3 c = night; c = mix(c, dusk, clamp(uDusk*1.2,0.,1.)); c = mix(c, day, uDay*(1.-uDusk*.7));
      float wash = fbm(vP*3.+vec3(uTime*.01,0,0)); c *= .96 + .08*wash;
      float sd = max(dot(vP, uSun),0.); c += vec3(1.,.8,.55)*pow(sd,8.)*(.25+uDusk*.6)*(1.-uNight);
      c += vec3(1.,.95,.8)*smoothstep(.9985,.9992,sd)*(1.-uNight);
      vec3 mp = -uSun; c += vec3(.9,.93,1.)*smoothstep(.9986,.9991,dot(vP,normalize(mp+vec3(.3,0,0))))*uNight;
      float st = step(.9965, h(floor(vP*220.)))*(.6+.4*sin(uTime*3.+h(floor(vP*220.))*40.)); c += st*uNight*vec3(1.,.97,.85);
      float ca = dot(vD, normalize(-cameraPosition)), rim = (uHalo - ca) / max(1. - uHalo, 1e-3);
      float halo = exp(-max(rim, 0.)*5.) * step(ca, uHalo + .02);
      vec3 hc = mix(mix(vec3(.62,.75,1.), vec3(1.,.8,.62), uDusk), vec3(.45,.55,.95), uNight);
      c = mix(c, c*.8 + hc*.4, halo*uOrbit);
      gl_FragColor = vec4(pow(max(c, 0.), vec3(2.2)),1.); }` }), []) // palette above is sRGB (ART_DIRECTION hex values); the buffer is linear
  useFrame(({ camera }) => {
    const u = mat.uniforms; u.uDay.value = T.day; u.uDusk.value = T.dusk; u.uNight.value = T.night; u.uUp.value.copy(camera.up)
    u.uOrbit.value += ((VIEW.mode === 'orbit' ? 1 : 0) - u.uOrbit.value) * 0.08
    const d = camera.position.length(); u.uDip.value = Math.acos(Math.min(1, R / Math.max(d, R))); u.uHalo.value = Math.sqrt(Math.max(0, 1 - (R * 1.04 / Math.max(d, R * 1.1)) ** 2)) // cos of the globe's angular radius
  })
  return <mesh material={mat} renderOrder={-1}><sphereGeometry args={[80 * WS, 48, 32]} /></mesh>
}

export function Lights() {
  const sun = useRef(), hemi = useRef(), moon = useRef()
  const cDay = C('#fff3dc'), cDusk = C('#ffa070'), tmp = new THREE.Color()
  useFrame(() => {
    sun.current.position.copy(T.sun).multiplyScalar(20)
    sun.current.color.copy(cDay).lerp(cDusk, T.dusk); sun.current.intensity = 2.6 * ss(-0.2, 0.2, T.sun.y)
    moon.current.position.copy(T.sun).multiplyScalar(-20).add(MOON_OFF); const inN = HOME.inside ? T.night : 0 // indoors at night the room is lit by its lamp and stove, not the cool moon fill
    moon.current.intensity = 1.1 * T.night * (1 - 0.7 * inN)
    hemi.current.color.copy(tmp.set('#cfe6ff').lerp(CC('#ffb59a'), T.dusk).lerp(CC('#4a5fa0'), T.night))
    hemi.current.groundColor.set('#b9d48c').lerp(CC('#2a2f55'), T.night); hemi.current.intensity = (0.9 + 0.25 * T.dusk - 0.3 * T.night) * (1 - 0.35 * inN)
    if (HOME.inside) { // indoors: a warm peach fill from above and a honey bounce off the wooden floor (the sky's blue + the grass green made the room's shadows grey)
      hemi.current.color.copy(tmp.set('#ffe6d2').lerp(CC('#ffd6bc'), T.dusk * 0.5).lerp(CC('#7a5a8a'), T.night)); hemi.current.groundColor.set('#e8b48a').lerp(CC('#6a4040'), T.night)
      sun.current.color.set('#ffead2').lerp(CC('#ffcfa8'), T.dusk * 0.6); sun.current.intensity *= 0.85; hemi.current.intensity = (0.95 + 0.1 * T.dusk - 0.35 * T.night) } // keeps a soft cream light all afternoon (the outdoor dusk orange made the room glow)
  })
  return <><directionalLight ref={sun} castShadow={false} /><directionalLight ref={moon} color="#9db4ff" /><hemisphereLight ref={hemi} /></>
}

export function Clouds() {
  const cl = useMemo(() => Array.from({ length: 12 }, (_, i) => ({ axis: new THREE.Vector3(rnd() - 0.5, 1, rnd() - 0.5).normalize(), off: rnd() * 6, r: (11.5 + rnd() * 2.5) * WS, y: (i % 2 ? -1 : 1) * (4.2 + rnd() * 3.5) * WS, puffs: Array.from({ length: 4 + (i % 3) }, (_, k) => [k * 0.65 - 1.1, rnd() * 0.35, rnd() * 0.4, 0.5 + rnd() * 0.45]) })), [])
  const refs = useRef([]); const mat = useMemo(() => toon('#ffffff'), [])
  useFrame(() => { const t = wind.time.value; mat.emissive.set('#000000').lerp(CC('#ff9f80'), T.dusk * 0.35).lerp(CC('#2a3170'), T.night * 0.5); mat.color.set('#ffffff').lerp(CC('#ffd2c0'), T.dusk * 0.7).lerp(CC('#8a94c4'), T.night * 0.7); cl.forEach((c, i) => { const a = c.off + t * 0.03; const g = refs.current[i]; g.position.set(Math.cos(a) * c.r, c.y, Math.sin(a) * c.r); g.lookAt(0, c.y, 0) }) })
  // each cloud's puffs merged into one mesh (+1 hull): 12+12 draw calls instead of ~120
  const geos = useMemo(() => cl.map(c => mergeGeometries(c.puffs.map(p => new THREE.IcosahedronGeometry(1, 2).scale(p[3], p[3], p[3]).translate(p[0], p[1], p[2])))), [])
  return cl.map((c, i) => <group key={i} ref={el => refs.current[i] = el}><mesh geometry={geos[i]} material={mat}><Outlines thickness={0.025} color="#8a8fb0" /></mesh></group>)
}
export function Birds() {
  const birds = useMemo(() => Array.from({ length: 12 }, (_, i) => ({ f: Math.floor(i / 4), k: i % 4 })), []); const refs = useRef([]); const mat = useMemo(() => toon('#3f3a4a', { side: THREE.DoubleSide }), [])
  useFrame(() => { const t = wind.time.value; birds.forEach((b, i) => { const g = refs.current[i]; const a = t * 0.25 + b.f * 2.1 - b.k * 0.05, r = (10.5 + b.f * 0.6) * WS, y = (3.4 + b.f * 1.6) * WS - Math.abs(b.k - 1.5) * 0.15 + Math.sin(t + b.f) * 0.3; g.position.set(Math.cos(a) * r + (b.k % 2) * 0.2, y, Math.sin(a) * r); g.lookAt(Math.cos(a + 0.1) * r, y, Math.sin(a + 0.1) * r); const fl = Math.sin(t * 10 + i) * 0.6; g.children[0].rotation.z = fl; g.children[1].rotation.z = -fl }) })
  return birds.map((b, i) => <group key={i} ref={el => refs.current[i] = el} scale={0.6}>{[1, -1].map(s => <group key={s}><mesh position={[s * 0.12, 0, 0]} material={mat}><boxGeometry args={[0.24, 0.01, 0.07]} /></mesh></group>)}</group>)
}
export function Fireflies() {
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
