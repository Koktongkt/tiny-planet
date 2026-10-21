// Stage B 3D side (lazy chunk, mounted by GameWorld once the systems are loaded): the garden beds beside Home and the
// village errands notice board, plus their proximity prompts (through HOME.near, like the room / pets do).
// Art is Studio's (src/art/garden, src/ui/errands/NoticeBoard.jsx), loaded as their own lazy chunks.
import * as THREE from 'three'
import React, { Suspense, lazy, useEffect, useMemo, useReducer } from 'react'
import { R, height, place, around } from '../world.js'
import { startAct } from '../act.js'
import { TOUCH } from '../touch.jsx'
import { G, emit, subscribe, setPanel } from '../game/store.js'
import { VILLAGE_POS } from '../world/village.js'
import { SB } from './live.js'
const GardenPlots = lazy(() => import('../art/garden/GardenPlots.jsx')) // (not index.js: an "index-*" chunk name would look like the startup chunk)
const NoticeBoard = lazy(() => import('../ui/errands/NoticeBoard.jsx'))
const posOf = (n, lift = 0) => n.clone().normalize().multiplyScalar(R + height(n) + lift)
// 2 x 3 beds on the left of the house front (home frame: +x right, +z out of the door), 0.36 apart
const BEDS = [[-0.62, 0.42], [-0.98, 0.42], [-0.62, 0.78], [-0.98, 0.78], [-0.62, 1.14], [-0.98, 1.14]]
const _z = new THREE.Vector3(), _x = new THREE.Vector3(), _f = new THREE.Vector3()
// yaw so a frame built like art/garden plotMatrix (forward = world +Z on the tangent plane) faces `fwd`
function yawFor(u, fwd) { _z.set(0, 0, 1); if (Math.abs(u.z) > 0.95) _z.set(1, 0, 0); _z.addScaledVector(u, -_z.dot(u)).normalize(); _x.crossVectors(u, _z); _f.copy(fwd).addScaledVector(u, -fwd.dot(u)).normalize(); return Math.atan2(_f.dot(_x), _f.dot(_z)) }
function spinToward(n, target) { const q0 = place(n, 0, 0).q, z = new THREE.Vector3(0, 0, 1).applyQuaternion(q0), x = new THREE.Vector3(1, 0, 0).applyQuaternion(q0), d = target.clone().sub(n); d.addScaledVector(n, -d.dot(n)); return Math.atan2(d.dot(x), d.dot(z)) }
export function layoutStageB(L, blocked) {
  const hp = place(L.homeN, 0, 0), hpos = posOf(L.homeN), fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(hp.q)
  const plots = BEDS.map(([x, z], i) => { const n = hpos.clone().add(new THREE.Vector3(x, 0, z).applyQuaternion(hp.q)).normalize(); return { id: 'plot-' + i, n, pos: posOf(n).toArray().map(v => +v.toFixed(4)), yaw: +yawFor(n, fwd).toFixed(4) } })
  // notice board: at the edge of the village square, facing its centre; the first free bearing wins
  let bn = null
  for (const b of [4.2, 3.6, 4.8, 3.0, 5.4, 2.4]) { const n = around(VILLAGE_POS, 0.078, b); if (!blocked(n)) { bn = n; break } }
  if (!bn) bn = around(VILLAGE_POS, 0.078, 4.2)
  return { plots, board: { n: bn, pos: posOf(bn), spin: spinToward(bn, VILLAGE_POS) } }
}
let SL = null, hooked = false
export function StageBWorld({ L, GAME }) {
  const [, force] = useReducer(x => x + 1, 0)
  useEffect(() => subscribe(force), [])
  const lay = useMemo(() => {
    SL = window.__sbLayout = layoutStageB(L, GAME.blocked)
    SB.setPlots(SL.plots.map(({ id, pos, yaw }) => ({ id, pos, yaw }))); emit()
    return SL
  }, [L])
  useEffect(() => {
    window.__sbAct = (kind, p) => startAct(kind, { dur: kind === 'water' ? 1.0 : kind === 'feed' ? 1.2 : 0.85, spark: p ? new THREE.Vector3(...p.pos) : null, sparkCol: kind === 'water' ? 'water' : 'gold', sound: kind === 'water' ? 'water' : 'pick' })
    if (hooked || !GAME.H) return; hooked = true
    GAME.H.near.push((consider, pp) => {
      if (!SL || GAME.H.inside) return
      for (const pl of SL.plots) { const d = pp.distanceTo(_f.fromArray(pl.pos)); if (d < 0.24) { const o = SB.plotPrompt(pl.id); if (o) consider({ kind: 'ext', id: pl.id + ':' + o.verb + o.icon, chip: !!o.alt, ...o }, d, 0.24) } }
      const d = pp.distanceTo(SL.board.pos); if (d < 0.55) consider({ kind: 'ext', id: 'errands-board', icon: 'board', verb: 'Read', name: 'the errands board', act: () => setPanel('errands') }, d, 0.55)
    })
  }, [])
  const tapPlot = (id) => { const pl = SL.plots.find(p => p.id === id); if (!pl || !GAME.P) return; GAME.P.target = pl.n.clone() } // walk over; E / Action then acts
  const notes = G.s.errands.list.filter(e => !e.done).length
  const q = TOUCH ? 'lo' : 'hi'
  return <Suspense fallback={null}>
    <GardenPlots plots={G.s.garden.plots.slice()} quality={q} onInteract={tapPlot} />
    <NoticeBoard n={lay.board.n.toArray()} spin={lay.board.spin} notes={Math.min(4, notes)} quality={q} onInteract={() => { if (GAME.P) GAME.P.target = lay.board.n.clone() }} />
  </Suspense>
}
export default StageBWorld
