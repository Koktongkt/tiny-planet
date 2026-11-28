// Look A water caps (lake, pool, harbour) and the lake's lily pads, split out of zones.jsx so they load after startup.
import React, { useMemo } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { Outlines } from '@react-three/drei'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { R, LAKE_W, place } from '../world.js'
import { T, toon, INK } from '../common.jsx'
import { WATER_DROP } from './shoreSetting.js'
import { useLook } from './useLook.js'

// look A water: shallows to deep by distance from shore, ripple rings (src/world/waterLook.js)
export function ShapedWaterCap(props) { const L = useLook(); return L ? <ShapedWaterCapL L={L} {...props} /> : null }
function ShapedWaterCapL({ L, c, r, level, segs = [72, 14] }) {
  const { shoreWater, bakeShore } = L
  const mat = useMemo(() => shoreWater({ flow: false, centre: c }), [])
  const geo = useMemo(() => { const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), c.clone().normalize())
    const g = new THREE.SphereGeometry(R + level - WATER_DROP, segs[0], segs[1], 0, Math.PI * 2, 0, r); g.applyQuaternion(q); return bakeShore(g, (v) => v.clone().normalize()) }, [])
  useFrame(() => { mat.uniforms.uN.value = T.night; mat.uniforms.uD.value = T.dusk })
  return <mesh geometry={geo} material={mat} />
}
// lily pads (look A): merged into one vertex-coloured mesh with one outline
export function LilyPads() { const L = useLook(); return L ? <LilyPadsL pads={L.LILY_PADS} /> : null }
function LilyPadsL({ pads }) {
  const geo = useMemo(() => { const parts = []
    for (const p of pads) { const pl = place(p.n, 0, p.spin), m = new THREE.Matrix4().compose(p.n.clone().multiplyScalar(R + LAKE_W - WATER_DROP + 0.012), pl.q, new THREE.Vector3(1, 1, 1))
      const pad = new THREE.CylinderGeometry(p.s, p.s, 0.018, 18, 1, false, 0.35, Math.PI * 2 - 0.5); pad.deleteAttribute('uv'); parts.push([pad.applyMatrix4(m), '#5fae3e'])
      if (p.flower) { const f = new THREE.SphereGeometry(0.034, 10, 6); f.deleteAttribute('uv'); f.scale(1, 0.7, 1); f.translate(p.s * 0.3, 0.03, -p.s * 0.2); parts.push([f.applyMatrix4(m), '#ffb3c1']) } }
    return mergeGeometries(parts.map(([g, h]) => { g = g.index ? g.toNonIndexed() : g; const c = new THREE.Color(h), a = new Float32Array(g.attributes.position.count * 3); for (let i = 0; i < a.length; i += 3) { a[i] = c.r; a[i + 1] = c.g; a[i + 2] = c.b } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g })) }, [])
  return <mesh geometry={geo} material={useMemo(() => toon('#ffffff', { vertexColors: true }), [])}><Outlines thickness={0.006} color={INK} /></mesh>
}
