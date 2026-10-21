// <Drift get? count? box? /> — seasonal particles (petals / pollen + fireflies / leaves / snow), 1 draw call, GPU-animated.
// get() -> { p: world Vector3, up?: world Vector3 } | null  (default: her position; hidden in orbit view / indoors)
import React, { useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { createDrift } from './drift.js'
import { tickWeather, isTouchTier } from './hooks.js'
import { defaultAnchor } from './anchor.js'
export function Drift({ get, count, box }) {
  const d = useMemo(() => createDrift({ count: count ?? (isTouchTier() ? 350 : 700), box }), [])
  useEffect(() => () => { d.object.geometry.dispose(); d.material.dispose() }, [])
  useFrame((s, dt) => { tickWeather(s.camera, dt); d.update(get ? get() : defaultAnchor(), s.camera, s.gl) })
  return <primitive object={d.object} />
}
export default Drift
