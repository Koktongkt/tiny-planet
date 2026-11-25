// Draws the shore kit (src/world/shoreKit.js): per sector one vertex-coloured toon body and one ink outline hull, so
// three.js culls off-screen sectors and Cull hides distant ones while walking. Lazy-loaded in an idle slot (keeps props/kit.js out of the startup chunk).
import React, { useMemo, useEffect } from 'react'
import * as THREE from 'three'
import { RAMP, mkOutline, PAL } from '../props/kit.js'
import { buildShoreKit, chunkKit } from './shoreKit.js'
import { SHORE_FINE } from './shoreSetting.js'
import { Cull } from '../zones.jsx'

export default function ShoreKit() {
  const chunks = useMemo(() => chunkKit(buildShoreKit({ fine: SHORE_FINE })), [])
  const body = useMemo(() => new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: RAMP, emissive: new THREE.Color('#3a2418'), emissiveIntensity: 0.12 }), [])
  const hull = useMemo(() => mkOutline(0.011, PAL.ink), [])
  useEffect(() => { window.__shoreReady = true }, []) // perf script and screenshots wait for this
  // only sectors near the camera draw while walking (beads are tiny further out); every sector shows in planet view
  return <group>{chunks.map((c, i) => <Cull key={i} n={c.n} d={14}><mesh geometry={c.body} material={body} /><mesh geometry={c.hull} material={hull} /></Cull>)}</group>
}
