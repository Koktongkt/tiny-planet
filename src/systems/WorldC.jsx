// Stage C 3D side (lazy chunk, mounted by systems/World3D.jsx): proximity prompts for the two train stations, the ruins
// dig spots and the museum door, plus photo-mode capture (one frame read right after the composer renders it).
// Studio's art (stations, carriage, museum, rain, seasons) mounts here as its own lazy chunks once it lands.
import * as THREE from 'three'
import React, { useEffect, useReducer, lazy, Suspense } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { R, height, around } from '../world.js'
import { G, setPanel, subscribe } from '../game/store.js'
import { TRAIN_STOPS } from '../world/village.js'
import { SC, PH, RIDE } from './liveC.js'
import { HOME } from '../home/state.js'
const posOf = (n, lift = 0) => n.clone().normalize().multiplyScalar(R + height(n) + lift)
export function layoutStageC(GAME) {
  const ruins = GAME.Zc && GAME.Zc.ruins
  const stations = TRAIN_STOPS.map(s => { const n = SC.platformN(s.id); return { id: s.id, n, pos: posOf(n) } })
  const digs = ruins ? [0.3, 1.5, 2.7, 3.9, 5.1].map((b, i) => { const n = around(ruins, (0.5 + (i % 2) * 0.18) / R, b); return { i, n, pos: posOf(n) } }) : []
  const museum = ruins ? (() => { const n = around(ruins, 1.05 / R, 0.9); return { n, pos: posOf(n) } })() : null
  return { stations, digs, museum }
}
let LC = null, hooked = false
// capture: mounted only while photo mode is on, so the extra frame callback costs nothing otherwise
function Capture() {
  const gl = useThree(s => s.gl)
  useFrame(() => {
    const p = PH.pending; if (!p) return; PH.pending = null
    const src = gl.domElement, cv = document.createElement('canvas'); cv.width = src.width; cv.height = src.height
    cv.getContext('2d').drawImage(src, 0, 0); p.res(cv) // raw frame; Studio's gradeCanvas bakes the filter look
  }, 2) // after EffectComposer (priority 1) in the same task, so the drawing buffer still holds the frame
  return null
}
// re-renders only when photo mode toggles
function PhotoCapture() {
  const [, force] = useReducer(x => x + 1, 0)
  useEffect(() => { let was = PH.on; return subscribe(() => { if (was !== PH.on) { was = PH.on; force() } }) }, [])
  return PH.on ? <Capture /> : null
}
// train ride: after Traveller's frame (this lazy subscriber runs later at the same priority), sit her in the carriage
// Studio's seasons + weather look (season tint / wet patch on the scene's materials, Drift, Rain, Puddles), its own lazy chunk;
// everything reads the __T hooks liveC writes. Drift uses driftAnchor (off in the desktop forest), touch winter is tint-only.
const SeasonLayer = lazy(() => import('../art/season/SeasonLayer.jsx'))
const TrainC = lazy(() => import('./TrainC.jsx')) // Studio stations + carriages + ride pose
const MuseumHall = lazy(() => import('./MuseumHall.jsx')) // Studio's museum interior (own layer), after the first visit
const MUM = { m: null, visited: false }
function RidePin() { useFrame(() => { if (RIDE.pin && HOME.playerObj) RIDE.pin(HOME.playerObj) }); return null }
export function StageCWorld({ GAME }) {
  const scene = useThree(s => s.scene), [, force] = useReducer(x => x + 1, 0)
  const visit = () => import('./museumC.js').then(m => { MUM.m = m; if (!MUM.visited) { MUM.visited = true; force() } setTimeout(() => m.enter(scene), 60) })
  useEffect(() => {
    LC = window.__scLayout = layoutStageC(GAME)
    if (hooked || !GAME.H) return; hooked = true
    GAME.H.near.push((consider, pp) => {
      if (MUM.m && MUM.m.MU.inside) { MUM.m.nearInside(consider, SC); return }
      if (!LC || GAME.H.inside || G.ui.lock) return
      for (const st of LC.stations) { const d = pp.distanceTo(st.pos); if (d < 0.7) { const o = SC.stationPrompt(st.id); consider({ kind: 'ext', id: 'station:' + st.id + ':' + (o.ready ? 'ready' : o.name), ...o }, d, 0.7) } }
      for (const dg of LC.digs) { const d = pp.distanceTo(dg.pos); if (d < 0.3 && SC.C.canDig(G.s.dig, dg.i, G.s.day)) consider({ kind: 'ext', id: 'dig' + dg.i, icon: 'shard', verb: 'Dig at', name: 'the old stones', act: () => SC.digAt(dg.i) }, d, 0.3) }
      if (LC.museum) { const d = pp.distanceTo(LC.museum.pos); if (d < 0.5) consider({ kind: 'ext', id: 'museum', icon: 'book', verb: 'Visit', name: 'the ruins museum', act: visit }, d, 0.5) }
    })
  }, [])
  return <><PhotoCapture /><RidePin /><Suspense fallback={null}><SeasonLayer /></Suspense><Suspense fallback={null}><TrainC riding={RIDE.riding} /></Suspense>{MUM.visited && <Suspense fallback={null}><MuseumHall /></Suspense>}</>
}
export default StageCWorld
