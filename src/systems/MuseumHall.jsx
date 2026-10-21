// Stage C: the museum hall group (planet-local origin, MUSEUM.S, render layer MLAYER) with Studio's interior inside it
// while she's there (lazy chunk; mounted by WorldC after the first visit).
import React, { useEffect, useReducer, useRef } from 'react'
import { useThree } from '@react-three/fiber'
import { MuseumInterior } from '../art/museum/MuseumInterior.jsx'
import { MUSEUM } from '../art/museum/layout.js'
import { G, subscribe } from '../game/store.js'
import { TOUCH } from '../touch.jsx'
import { MU, MLAYER, openSlot } from './museumC.js'
export default function MuseumHall() {
  const [, force] = useReducer(x => x + 1, 0), g = useRef()
  MU.ray = useThree(s => s.raycaster) // tapping a plinth (layer MLAYER) while inside
  useEffect(() => subscribe(force), [])
  // Hoshino / the fish schools mount a beat later: keep everything under the hall on the museum layer while she's inside
  useEffect(() => { if (!MU.inside) return; const i = setInterval(() => g.current && g.current.traverse(o => { if (!o.layers.isEnabled(MLAYER)) o.layers.set(MLAYER) }), 500); return () => clearInterval(i) }, [MU.inside])
  return <group ref={(o) => { g.current = o; MU.obj = o }} scale={MUSEUM.S}>{MU.inside && <MuseumInterior donated={G.s.museum.donated} layer={MLAYER} touch={TOUCH} onInspect={openSlot} />}</group>
}
