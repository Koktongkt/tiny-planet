// Draws the shore kit (src/world/shoreKit.js): per sector one vertex-coloured toon body and one ink outline hull, so
// three.js culls off-screen sectors. Lazy-loaded in an idle slot (keeps props/kit.js out of the startup chunk).
import React, { useMemo, useEffect } from 'react'
import * as THREE from 'three'
import { RAMP, mkOutline, PAL } from '../props/kit.js'
import { buildShoreKit, chunkKit } from './shoreKit.js'
import { SHORE_FINE } from './shoreSetting.js'

export default function ShoreKit() {
  const chunks = useMemo(() => chunkKit(buildShoreKit({ fine: SHORE_FINE })), [])
  const body = useMemo(() => new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: RAMP, emissive: new THREE.Color('#3a2418'), emissiveIntensity: 0.12 }), [])
  const hull = useMemo(() => mkOutline(0.011, PAL.ink), [])
  useEffect(() => { window.__shoreReady = true }, []) // perf script and screenshots wait for this
  return <group>{chunks.map((c, i) => <group key={i}><mesh geometry={c.body} material={body} /><mesh geometry={c.hull} material={hull} /></group>)}</group>
}
