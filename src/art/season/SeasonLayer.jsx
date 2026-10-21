// <SeasonLayer cap? wet? drift? rain? puddles? spots? get? /> — the whole Stage C season + weather look in one lazy mount.
// Mount it INSIDE the planet group (e.g. next to World3D in GameSlot). On mount (after an idle slot) it patches the
// scene's ground / grass / foliage / flowers / roofs / rocks via seasonizeScene (programs compile async first, so no
// hitch) and restores them on unmount; then it adds <Drift>, <Rain> and <Puddles>. Everything reads the __T hooks.
import React, { useEffect, useState } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import { seasonizeScene } from './patch.js'
import { tickWeather } from './hooks.js'
import { Drift } from './Drift.jsx'
import { Rain } from '../weather/Rain.jsx'
import { Puddles } from '../weather/Puddles.jsx'
const idle = (f) => (typeof requestIdleCallback !== 'undefined' ? requestIdleCallback(f, { timeout: 1500 }) : setTimeout(f, 200))
export function SeasonLayer({ cap, wet = true, drift = true, rain = true, puddles = true, spots, get, onReady }) {
  const scene = useThree(s => s.scene), gl = useThree(s => s.gl), camera = useThree(s => s.camera)
  const [ready, setReady] = useState(false)
  useEffect(() => { let r = null, dead = false
    idle(() => { if (dead) return; seasonizeScene(scene, { gl, camera, cap, wet }).then(x => { if (dead) { x.restore(); return } r = x; setReady(true); onReady && onReady(x.patched) }) })
    return () => { dead = true; if (r) r.restore() } }, [])
  useFrame((s, dt) => { tickWeather(s.camera, dt) })
  return ready ? <>{drift && <Drift get={get} />}{rain && <Rain get={get} />}{puddles && <Puddles spots={spots} />}</> : null
}
export default SeasonLayer
