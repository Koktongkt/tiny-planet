// <Puddles spots? get? /> — all puddles in 1 draw call (0 when dry); mount INSIDE the planet group (spots are planet-local).
// spots: [{ n: unit Vector3, r?: world radius, spin? }] (default: puddleSpots() near the village path)
// get?: () => ({ wet?, rain? }) overrides the hooks (previews); normally __T.wet / __T.rain drive it.
import React, { useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { createPuddles, puddleSpots } from './puddles.js'
import { tickWeather, SU } from '../season/hooks.js'
export function Puddles({ spots, get }) {
  const p = useMemo(() => createPuddles(spots || puddleSpots()), [spots])
  useEffect(() => () => { p.object.geometry.dispose(); p.material.dispose() }, [p])
  useFrame((s, dt) => { tickWeather(s.camera, dt); if (get) { const o = get() || {}; if (o.wet != null) SU.uWet.value = o.wet; if (o.rain != null) SU.uRain.value = o.rain } p.update() })
  return <primitive object={p.object} />
}
export default Puddles
