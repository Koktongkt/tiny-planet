// <Rain get? count? box? /> — soft rain streaks around her, 1 draw call (0 when dry), GPU-animated. Same get() as <Drift>.
import React, { useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { createRain } from './rain.js'
import { tickWeather, isTouchTier } from '../season/hooks.js'
import { defaultAnchor } from '../season/anchor.js'
export function Rain({ get, count, box }) {
  const r = useMemo(() => createRain({ count: count ?? (isTouchTier() ? 900 : 2000), box }), [])
  useEffect(() => () => { r.object.geometry.dispose(); r.material.dispose() }, [])
  useFrame((s, dt) => { tickWeather(s.camera, dt); r.update(get ? get() : defaultAnchor(), s.camera, s.gl) })
  return <primitive object={r.object} />
}
export default Rain
