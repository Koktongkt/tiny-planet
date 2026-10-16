// round6 (lazy chunk): trail edge stones, river-bank pebbles, stepping stones + marker stakes at the jump spots
import * as THREE from 'three'
import React, { useMemo, useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { Outlines } from '@react-three/drei'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { R, K, place, pathDir, streamDir, streamHalf, waterAt, onBridge, JUMPS, JUMP_HALF, BRIDGES, height, wind, toonRamp } from './world.js'
import { toon, paint, C, CC, T, INK, MAT, Surface } from './common.jsx'
// round6: edge stones along the trail, pebbles on the river banks, stepping stones + marker stakes at the jump spots.
// One instanced mesh for every stone (8-tri octahedra) and one for the stakes: +2 draw calls, ~6k triangles.
export function RiverStones({ colliders: COLLIDERS, houses: HOUSES, touch: TOUCH }) {
  const { stones, stakes } = useMemo(() => { let sd_ = 99; const rnd = () => (sd_ = (sd_ * 16807) % 2147483647) / 2147483647 // own RNG: leaves the world scatter sequence untouched
    const COLLIDERS_NEAR = (m) => COLLIDERS.some(c => m.angleTo(c.n) < c.r + 0.004)
    const st = [], sk = [], o = new THREE.Object3D(), c = new THREE.Color(), tan = new THREE.Vector3(), side = new THREE.Vector3()
    const put = (n, s, h, col, spin) => { if (waterAt(n, -0.02) && col !== 'step') return; const p = place(n, -0.01, spin); st.push({ p, s, h, c: col === 'step' ? C('#d8d0c0').multiplyScalar(0.95 + rnd() * 0.08) : c.set(col).multiplyScalar(0.85 + rnd() * 0.25).clone() }) }
    const along = (f, step, halfFn, skipP, cols, fringe) => { for (let t = 0; t < Math.PI * 2; t += step) { const n = f(t).normalize(); tan.copy(f(t + 0.004)).normalize().sub(n).normalize(); side.crossVectors(tan, n).normalize()
      for (const sd of [-1, 1]) { if (rnd() < skipP) continue; const hw = halfFn(t) + fringe * (0.5 + rnd()); const m = n.clone().addScaledVector(side, sd * hw / R).addScaledVector(tan, (rnd() - 0.5) * step * 0.6).normalize()
        if (onBridge(m) || HOUSES.some(h => h.distanceTo(m) < 0.11 * K) || COLLIDERS_NEAR(m)) continue; put(m, 0.022 + rnd() * 0.03, 0.45 + rnd() * 0.35, cols[Math.floor(rnd() * cols.length)], rnd() * 6) } } }
    along(pathDir, 0.0042, (t) => 0.17 * (1 + 0.08 * Math.sin(t * 13)), TOUCH ? 0.66 : 0.55, ['#cfc3b0', '#b8ad9c', '#d9cfbd'], 0.03)
    along(streamDir, 0.0045, streamHalf, TOUCH ? 0.66 : 0.55, ['#a59a88', '#8f8778', '#c2b7a4'], 0.04)
    for (const j of JUMPS) { const n = j.c; for (const sd of [-1, 1]) { const bank = JUMP_HALF + 0.02; for (const [a, o_, s] of [[0, 0.02, 0.07], [0.09, 0.11, 0.05], [-0.08, 0.1, 0.045]]) put(n.clone().addScaledVector(j.side, sd * (bank + o_) / R).addScaledVector(j.tan, a / R).normalize(), s, 0.32, 'step', rnd() * 6)
      sk.push(place(n.clone().addScaledVector(j.side, sd * (bank + 0.17) / R).addScaledVector(j.tan, (sd * 0.16) / R).normalize(), -0.01, rnd() * 6)) } }
    return { stones: st, stakes: sk }
  }, [])
  // ship trim: stones + stakes baked into ONE static vertex-coloured mesh (was two instanced meshes): -1 draw call
  const merged = useMemo(() => { const o = new THREE.Object3D(), parts = []
    const tint = (g, c) => { const a = new Float32Array(g.attributes.position.count * 3); for (let k = 0; k < a.length; k += 3) { a[k] = c.r; a[k + 1] = c.g; a[k + 2] = c.b } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g }
    const base = new THREE.OctahedronGeometry(1, 0); base.translate(0, 0.25, 0); base.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(base.attributes.position.count * 2), 2))
    stones.forEach((s, i) => { o.position.copy(s.p.pos); o.quaternion.copy(s.p.q); o.scale.set(s.s, s.s * s.h, s.s * (0.8 + (i % 5) * 0.08)); o.updateMatrix(); parts.push(tint(base.clone().applyMatrix4(o.matrix), s.c)) })
    const col = (g, h) => { g.attributes.uv.array.fill(0); return tint(g, C(h)) }
    const stake = mergeGeometries([col(new THREE.BoxGeometry(0.022, 0.2, 0.022).translate(0, 0.1, 0), '#8a5a3c'), col(new THREE.BoxGeometry(0.004, 0.035, 0.05).translate(0.012, 0.17, 0.025), '#d9534f'), col(new THREE.BoxGeometry(0.026, 0.012, 0.026).translate(0, 0.2, 0), '#6e4a33')].map(g => g.toNonIndexed()))
    stakes.forEach(p => { o.position.copy(p.pos); o.quaternion.copy(p.q); o.scale.setScalar(1); o.updateMatrix(); parts.push(stake.clone().applyMatrix4(o.matrix)) })
    if (PS.g) parts.unshift(PS.g.toNonIndexed())
    const g = mergeGeometries(parts.map(g => g.index ? g.toNonIndexed() : g)); g.computeBoundingSphere(); return g }, [])
  const mat = useMemo(() => PS.m || paint(toon('#ffffff', { vertexColors: true }), 0.12, true, 14), [])
  useEffect(() => { if (PS.g) PS.merged = true; return () => { PS.merged = false } }, [])
  return <mesh geometry={merged} material={mat} />
}
// ribbon along a curve. width: half-width (number or fn(t)); cross: [u in -1..1, colour?] columns across it
function ribbon(f, width, lift, N = 500, skip, cross = [[-1], [1]], liftFn) {
  const pos = [], uv = [], idx = [], col = [], hasC = cross.some(c => c[1]), cc = cross.map(c => c[1] ? C(c[1]) : null), M = cross.length
  for (let i = 0; i <= N; i++) {
    const t = (i / N) * Math.PI * 2, n = f(t).normalize(), n2 = f(t + 0.01).normalize()
    const tan = n2.clone().sub(n).normalize(), side = new THREE.Vector3().crossVectors(tan, n).normalize()
    const wob = typeof width === 'function' ? width(t) : width * (1 + 0.12 * Math.sin(t * 13))
    cross.forEach(([u], j) => { const d = n.clone().addScaledVector(side, u * wob / R).normalize(); pos.push(...d.multiplyScalar(R + height(d) + (skip && skip(d) ? -0.3 : liftFn ? liftFn(u, t) : lift)).toArray()); uv.push(u * 0.5 + 0.5, t * 20); if (hasC) { const c = cc[j]; col.push(c.r, c.g, c.b) } })
    if (i < N) for (let j = 0; j < M - 1; j++) { const k = i * M + j; idx.push(k, k + 1, k + M, k + 1, k + M + 1, k + M) }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); if (hasC) g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals(); return g
}
// round6: a packed-dirt trail with defined edges: dark trodden rims, a lighter crown, a faint wheel-rut either side
// (vertex colours on one ribbon: no extra draw call), plus edge stones / grass fringe from RiverStones + edgeveg
const PATH_X = [[-1, '#8a6c46'], [-0.86, '#a4855a'], [-0.72, '#c9ad7c'], [-0.4, '#bf9f6e'], [-0.28, '#d6bd8c'], [0.28, '#d6bd8c'], [0.4, '#bf9f6e'], [0.72, '#c9ad7c'], [0.86, '#a4855a'], [1, '#8a6c46']]
// ship trim: the trail ribbon and the stones share one mesh once RiverStones has built (-1 draw call); Path hides itself then
const PS = { g: null, m: null, merged: false }
export function Path() { const g = useMemo(() => (PS.g = ribbon(pathDir, (t) => 0.17 * (1 + 0.08 * Math.sin(t * 13)), 0.045, 700, (d) => onBridge(d), PATH_X, (u) => 0.045 - 0.012 * Math.max(0, Math.abs(u) - 0.85) / 0.15)), []), ref = useRef()
  const m = useMemo(() => (PS.m = paint(toon('#ffffff', { vertexColors: true, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }), 0.16, true, 8)), [])
  useFrame(() => { if (ref.current) ref.current.visible = !PS.merged }); return <mesh ref={ref} geometry={g} material={m} /> }
export function Stream() {
  const g = useMemo(() => ribbon(streamDir, (t) => streamHalf(t), -0.012, 1200, null, [[-1], [-0.6], [0], [0.6], [1]]), [])
  // round6: deeper colour toward the middle, a dark bank line + bright foam at the edges, two layers of drifting flow streaks
  const m = useMemo(() => new THREE.ShaderMaterial({ uniforms: { uTime: wind.time, uN: { value: 0 }, uD: { value: 0 } }, polygonOffset: true, polygonOffsetFactor: -3,
    vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `varying vec2 vUv; uniform float uTime,uN,uD; void main(){ float e = abs(vUv.x-.5)*2.;
      vec3 c = mix(vec3(.1,.31,.5), vec3(.27,.56,.72), smoothstep(.1,.8,e));
      float w = sin(vUv.x*9.+vUv.y*.3)*1.5;
      float f = sin(vUv.y*1.3 - uTime*2.2 + w); float f2 = sin(vUv.y*3.1 - uTime*3.4 + vUv.x*17. + w*.6);
      c = mix(c, vec3(.78,.93,1.), smoothstep(.86,.93,f)*.7*(1.-e*.5)); c = mix(c, vec3(.55,.8,.92), smoothstep(.9,.97,f2)*.5);
      c = mix(c, vec3(.92,.98,1.), smoothstep(.82,.9,e)*(.7+.3*sin(vUv.y*4.-uTime*3.)));
      c = mix(c, vec3(.29,.24,.2), smoothstep(.93,.985,e));
      c = mix(c, c*vec3(1.,.8,.75)+vec3(.12,.04,.06), uD*.5); c = mix(c, vec3(.1,.16,.32)+vec3(.15,.13,.05)*smoothstep(.85,.93,f), uN*.8);
      gl_FragColor = vec4(c,1.); }` }), [])
  useFrame(() => { m.uniforms.uN.value = T.night; m.uniforms.uD.value = T.dusk })
  return <mesh geometry={g} material={m} />
}

// the 11 planks merged into one mesh (same shapes / tilts): 2 draw calls per bridge instead of 22
const planksFor = (BL) => { const planks = Math.round(BL * 16), a = []; for (let k = 0; k < planks; k++) { const u = (k / (planks - 1) - 0.5) * BL, y = 0.035 + 0.07 * Math.cos((u / BL) * Math.PI); const g = new THREE.BoxGeometry(0.26, 0.022, BL / planks * 0.9); g.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(-Math.sin((u / BL) * Math.PI) * 0.35, (k % 2 ? 0.03 : -0.03), 0))); g.translate(0, y, u); a.push(g) } return mergeGeometries(a) }
// round6: posts + handrails follow the (longer) arched deck, merged into one mesh: 2 draw calls instead of 14
const railsFor = (BL) => { const a = [], posts = [-0.47, -0.16, 0.16, 0.47].map(u => u * BL / 1.0), y = (u) => 0.035 + 0.07 * Math.cos((u / BL) * Math.PI)
  for (const s of [-1, 1]) { for (const u of posts) a.push(new THREE.BoxGeometry(0.024, 0.15, 0.024).translate(s * 0.13, y(u) + 0.065, u))
    for (let k = 0; k < posts.length - 1; k++) { const u0 = posts[k], u1 = posts[k + 1], y0 = y(u0) + 0.13, y1 = y(u1) + 0.13, L = Math.hypot(u1 - u0, y1 - y0); const g = new THREE.BoxGeometry(0.02, 0.018, L + 0.02); g.rotateX(-Math.atan2(y1 - y0, u1 - u0)); g.translate(s * 0.13, (y0 + y1) / 2, (u0 + u1) / 2); a.push(g) } }
  return mergeGeometries(a) }
export function Bridge({ b, Basis, DM }) {
  // ship trim: planks + rails in one vertex-coloured mesh with one outline (was 2 meshes + 2 outlines): -2 calls per bridge
  const DECK = useMemo(() => { const tint = (g, h) => { g = g.index ? g.toNonIndexed() : g; const c = C(h), a = new Float32Array(g.attributes.position.count * 3); for (let k = 0; k < a.length; k += 3) { a[k] = c.r; a[k + 1] = c.g; a[k + 2] = c.b } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); if (g.attributes.uv) g.deleteAttribute('uv'); return g }
    return mergeGeometries([tint(planksFor(b.L), '#b07a4f'), tint(railsFor(b.L), '#8a5a3c')]) }, [])
  const mat = useMemo(() => paint(toon('#ffffff', { vertexColors: true }), 0.18, true, 12), [])
  return <Basis n={b.c} fwd={b.tan} lift={0.0}>
    <mesh geometry={DECK} material={mat}><Outlines thickness={0.007} color={INK} /></mesh>
  </Basis>
}

export function Laundry({ Basis, DM, SPOTS }) {
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


export function Cat({ Basis, DM, SPOTS }) {
  const body = useRef(), tail = useRef()
  useFrame(() => { const t = wind.time.value; const b = 1 + Math.sin(t * 1.7) * 0.07; body.current.scale.set(1 + (b - 1) * 0.4, b, 1 + (b - 1) * 0.4); tail.current.rotation.y = Math.sin(t * 0.9) * 0.15 })
  return <Basis n={SPOTS.cat} fwd={BRIDGES[0].tan.clone().negate()}>
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


export function Shrine({ Basis, DM, SPOTS }) {
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

export function BusStop({ DM, SPOTS }) {
  const tex = useMemo(() => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); x.fillStyle = '#ffd36e'; x.beginPath(); x.arc(64, 64, 60, 0, 7); x.fill(); x.lineWidth = 10; x.strokeStyle = '#d9534f'; x.stroke(); x.fillStyle = '#4a3a35'; x.font = '600 34px Fredoka, sans-serif'; x.textAlign = 'center'; x.fillText('BUS', 64, 58); x.font = '500 18px Fredoka, sans-serif'; x.fillText('Inaba', 64, 86); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t }, [])
  return <Surface n={SPOTS.bus} spin={2.2}>
    <mesh position={[0, 0.22, 0]} material={MAT.stone}><cylinderGeometry args={[0.012, 0.014, 0.44, 6]} /></mesh>
    <mesh position={[0, 0.44, 0.012]}><circleGeometry args={[0.075, 24]} /><meshToonMaterial map={tex} gradientMap={toonRamp} /></mesh>
    <mesh position={[0, 0.44, 0.008]} rotation={[Math.PI / 2, 0, 0]} material={DM.red}><cylinderGeometry args={[0.078, 0.078, 0.01, 24]} /></mesh>
    <mesh position={[0.2, 0.07, 0]} material={MAT.wood}><boxGeometry args={[0.22, 0.02, 0.07]} /><Outlines thickness={0.005} color={INK} /></mesh>
    {[-1, 1].map(s => <mesh key={s} position={[0.2 + s * 0.09, 0.03, 0]} material={MAT.wood}><boxGeometry args={[0.02, 0.06, 0.06]} /></mesh>)}
  </Surface>
}

export function Mailbox({ i, DM, onHouse }) {
  return <Surface n={onHouse(i, -0.42, 0.42)} spin={i * 1.3}>
    <mesh position={[0, 0.11, 0]} material={DM.rail}><boxGeometry args={[0.02, 0.22, 0.02]} /></mesh>
    <mesh position={[0, 0.25, 0]} rotation={[Math.PI / 2, 0, 0]} material={DM.red}><cylinderGeometry args={[0.04, 0.04, 0.1, 12, 1, false, 0, Math.PI]} /><Outlines thickness={0.005} color={INK} /></mesh>
    <mesh position={[0, 0.235, 0]} material={DM.red}><boxGeometry args={[0.08, 0.03, 0.1]} /></mesh>
    <mesh position={[0.045, 0.27, -0.02]} material={MAT.roofs[2]}><boxGeometry args={[0.006, 0.05, 0.03]} /></mesh>
  </Surface>
}

export function Smoke({ DM, CHIMNEYS }) {
  const ref = useRef(), K = 6, o = useMemo(() => new THREE.Object3D(), []), side = useMemo(() => new THREE.Vector3(1, 0, 0), [])
  useFrame(() => {
    const t = wind.time.value; let j = 0
    CHIMNEYS.forEach((c, i) => { for (let k = 0; k < K; k++) { const u = (t * 0.22 + k / K + i * 0.13) % 1; o.position.copy(c.top).addScaledVector(c.up, u * 0.75).addScaledVector(side, u * u * 0.35 + Math.sin(t * 1.3 + k + i) * 0.03); o.scale.setScalar((0.035 + u * 0.11) * Math.min(1, u * 8) * (1 - u) ** 0.6); o.updateMatrix(); ref.current.setMatrixAt(j++, o.matrix) } })
    ref.current.instanceMatrix.needsUpdate = true; DM.smoke.color.set('#f4f1ee').lerp(CC('#9aa0c4'), T.night * 0.7); DM.smoke.opacity = 0.85 - 0.25 * T.night
  })
  return <instancedMesh ref={ref} args={[useMemo(() => new THREE.IcosahedronGeometry(1, 2), []), DM.smoke, CHIMNEYS.length * K]} />
}
