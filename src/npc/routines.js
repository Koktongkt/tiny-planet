// Townsfolk data: who walks where, and each villager's day plan (morning / day / evening / night).
// buildWalkers / buildNewWalkers draw from the shared seeded rnd(), so App calls them at the same point of its
// module setup as before (moving the call would reshuffle every later random placement).
import * as THREE from 'three'
import { R, rnd, around } from '../world.js'
import { PEOPLE } from '../peopleData.js'
import { VILLAGERS } from '../villagers.js'
import { Zc, LAKE_DOCK_B } from '../zones.jsx'
import { VILLAGE } from '../world/village.js'
export const SHIRTS = ['#e86f5a', '#5f8fc4', '#f2b84b', '#8cc084', '#c97b9a', '#f6ead2']
// townsfolk: path walkers, pacers and idlers built from the procedural Person
export const tangentAt = (n, b = 0) => { const e1 = new THREE.Vector3(0, 1, 0).cross(n).normalize(); const e2 = new THREE.Vector3().crossVectors(n, e1); return e1.multiplyScalar(Math.cos(b)).addScaledVector(e2, Math.sin(b)) }
export function buildWalkers() {
  const W = [], P_ = PEOPLE
  const pathers = [1, 2, 3, 6, 7, 10, 4, 9, 5, 11]
  pathers.forEach((k, i) => W.push({ cfg: P_[k], mode: 'path', t0: (i / pathers.length) * Math.PI * 2 + rnd() * 0.3, sp: (0.045 + rnd() * 0.025) * (i % 2 ? -1 : 1) * (P_[k].elder ? 0.6 : 1), off: (rnd() - 0.5) * 0.1 }))
  const sq = around(VILLAGE, 0.0, 0)
  ;[2, 7, 5].forEach((k, j) => { const n = around(sq, 0.22 / R, j * 2.1); W.push({ cfg: P_[k], mode: 'idle', n, fwd: sq.clone().sub(n), wave: j === 1 }) })
  const pier = around(Zc.harbour, 0.22 * 1.35, 1.6)
  W.push({ cfg: P_[8], mode: 'pace', n: pier, tan: tangentAt(pier, 0.4), range: 0.9, w: 0.25 })
  W.push({ cfg: P_[10], mode: 'pace', n: around(Zc.harbour, 0.22 * 1.45, 3.0), tan: tangentAt(Zc.harbour, 1.2), range: 1.2, w: 0.2 })
  W.push({ cfg: { ...P_[8], top: '#d9655b', hat: 'straw', hatC: '#e2c27a', name: 'angler' }, mode: 'idle', n: (() => { const sh = around(Zc.lake, 0.2 * 1.06, LAKE_DOCK_B); const f = Zc.lake.clone().addScaledVector(sh, -sh.dot(Zc.lake)).normalize(); return sh.clone().addScaledVector(f, 1.15 / R).normalize() })(), fwd: Zc.lake.clone(), lift: () => 0, dock: true })
  W.push({ cfg: P_[3], mode: 'pace', n: around(Zc.terraces, 0.07, 0.5), tan: tangentAt(Zc.terraces, 0.5), range: 0.8, w: 0.18 })
  W.push({ cfg: { ...P_[4], name: 'planter' }, mode: 'pace', n: around(Zc.terraces, 0.11, 2.5), tan: tangentAt(Zc.terraces, 2.0), range: 0.6, w: 0.12 })
  W.push({ cfg: P_[9], mode: 'idle', n: around(Zc.ruins, 0.25 / R, 4.0), fwd: Zc.ruins.clone(), look: -0.35 })
  W.push({ cfg: P_[6], mode: 'pace', n: around(Zc.mills, 0.06, 1.0), tan: tangentAt(Zc.mills, 1.0), range: 1.4, w: 0.35 })
  W.push({ cfg: P_[1], mode: 'pace', n: around(Zc.giant, 1.6 / R, 0.5), tan: tangentAt(Zc.giant, 2.0), range: 0.7, w: 0.3 })
  W.push({ cfg: P_[11], mode: 'pace', n: around(Zc.giant, 1.75 / R, 0.8), tan: tangentAt(Zc.giant, 2.0), range: 0.4, w: 0.3 })
  return W
}
// Villager life: each walker has a schedule by time of day (morning / day / evening / night). A plan entry picks
// how they move (route speed, pacing, or going to an anchor spot) and what they do there (st.act: sit, stretch,
// hoe, sweep, fish, chat, look, carry). Path walkers stroll at different speeds by period and stop now and then
// to look around or stretch. While she talks to one, they stop and turn to her.
export const SQ = around(VILLAGE, 0.0, 0)
export const sqSpot = (d, b) => around(SQ, d / R, b)
export const BENCH = { n: sqSpot(0.42, 0.55), fwd: null }; BENCH.fwd = SQ.clone().sub(BENCH.n)
export const benchSeat = (x) => { const nn = BENCH.n.clone().normalize(), f = BENCH.fwd.clone().addScaledVector(nn, -BENCH.fwd.dot(nn)).normalize(), side = new THREE.Vector3().crossVectors(nn, f); return nn.addScaledVector(side, x / R).addScaledVector(f, 0.005 / R).normalize() }
export const CHAT_A = sqSpot(0.2, 2.6), CHAT_B = CHAT_A.clone().addScaledVector(tangentAt(CHAT_A, 0.3), 0.34 / R).normalize()
export const SWEEP = sqSpot(0.55, 3.9)
// fwd: a unit tangent direction, or {at: point} to face a point
export const A = (n, at, act, extra) => ({ n, at, act, ...extra })
export function buildNewWalkers() {
  const W = [], by = z => VILLAGERS.filter(v => v.zone === z)
  const SPEEDS = { morning: 1.15, day: 1, evening: 0.72, night: 0.5 }
  const STALL2 = sqSpot(0.62, 1.1), SWEEP2 = sqSpot(0.7, 1.4)
  const cook = VILLAGERS.find(v => v.name === 'cook')
  if (cook) W.push({ cfg: { ...cook, hold: { R: 'broom' } }, key: cook.name, mode: 'anchor', plan: { morning: [A(SWEEP2, SQ, 'sweep', { drift: 0.16, dur: 22, stage: 'sweep' }), A(STALL2, SQ, 'sell', { dur: 18, stage: 'sell' })], day: [A(STALL2, SQ, 'sell', { dur: 26, stage: 'sell' }), A(STALL2, SQ, 'eat', { dur: 10, stage: 'eat' })], evening: [A(SWEEP2, SQ, 'sweep', { drift: 0.16, dur: 18, stage: 'sweep' }), A(STALL2, SQ, 'sell', { dur: 14, stage: 'sell' })], night: A(STALL2, SQ, 'sit', { stage: 'rest' }) } })
  by('path').filter(c => c.name !== 'cook').forEach((cfg, i, a) => W.push({ cfg, key: cfg.name, mode: 'path', t0: (i / a.length) * Math.PI * 2 + rnd() * 0.3, sp: (0.045 + rnd() * 0.025) * (i % 2 ? -1 : 1) * (cfg.age === 'elder' ? 0.55 : cfg.age === 'kid' ? 1.25 : 1), off: (rnd() - 0.5) * 0.1,
    speeds: SPEEDS, pause: { every: 22 + i * 4.3, len: 4.5 + (i % 3), act: i % 3 === 1 ? 'stretch' : 'look' } }))
  const [gma, gpa, bak] = by('square')
  const front = BENCH.n.clone().addScaledVector(BENCH.fwd, 1).normalize() // a point in front of the bench
  const seat = (x, extra) => A(benchSeat(x), front, 'sit', extra)
  W.push({ cfg: gma, key: gma.name, mode: 'anchor', plan: { morning: seat(-0.09, { stage: 'rest' }), day: [seat(-0.09, { dur: 20, stage: 'rest' }), A(benchSeat(-0.09), front, 'eat', { dur: 14, stage: 'eat' })], evening: seat(-0.09, { sitTalk: 0.45, stage: 'chat' }), night: seat(-0.09, { stage: 'rest' }) } })
  W.push({ cfg: gpa, key: gpa.name, mode: 'anchor', plan: { morning: A(sqSpot(0.3, 1.6), SQ, 'stretch'), day: A(CHAT_B, CHAT_A, 'chat', { seed: 1.7 }), evening: seat(0.09, { sitTalk: -0.45 }), night: seat(0.09) } })
  const OVEN = sqSpot(0.5, 3.3), STALL = sqSpot(0.3, 2.9)
  W.push({ cfg: bak, key: bak.name, mode: 'anchor', plan: { morning: [A(OVEN, SQ, 'knead', { dur: 26, stage: 'knead' }), A(STALL, SQ, 'sell', { dur: 18, stage: 'sell' })], day: [A(STALL, SQ, 'sell', { dur: 24, stage: 'sell' }), A(CHAT_A, CHAT_B, 'chat', { seed: 0, dur: 12, stage: 'chat' })], evening: [A(STALL, SQ, 'sell', { dur: 12, stage: 'sell' }), A(benchSeat(0.0).clone().addScaledVector(tangentAt(SQ, 1.2), 0.2 / R).normalize(), SQ, 'eat', { dur: 18, stage: 'eat' })], night: A(sqSpot(0.25, 3.3), SQ, 'look', { stage: 'rest' }) } })
  const [fm, fw, sg, db] = by('harbour'), pier = around(Zc.harbour, 0.22 * 1.35, 1.6)
  const pierEnd = pier.clone().addScaledVector(tangentAt(pier, 0.4), 0.7 / R).normalize(), pierSeat = pier.clone().addScaledVector(tangentAt(pier, 0.4), -0.5 / R).normalize(), sea = pier.clone().addScaledVector(tangentAt(pier, 0.4 + 1.57), 1 / R).normalize()
  W.push({ cfg: { ...fm, hold: { R: 'rod' } }, key: fm.name, mode: 'anchor', plan: { morning: A(pierEnd, sea, 'fish', { stage: 'fish' }), day: [A(pierEnd, sea, 'fish', { dur: 26, stage: 'fish' }), A(pierSeat, sea, 'eat', { dur: 14, stage: 'eat' })], evening: [A(pierSeat, sea, 'look', { dur: 18, stage: 'mend' }), A(pierEnd, sea, 'fish', { dur: 14, stage: 'fish' })], night: A(pierSeat, sea, 'sit', { stage: 'rest' }) } })
  W.push({ cfg: fw, key: fw.name, mode: 'pace', n: around(Zc.harbour, 0.22 * 1.2, 2.3), tan: tangentAt(Zc.harbour, 2.3), range: 0.5, w: 0.16, carry: true, work: { act: 'chat', on: 6, off: 9, periods: ['day', 'evening'] } })
  W.push({ cfg: sg, key: sg.name, mode: 'pace', n: around(Zc.harbour, 0.22 * 1.45, 3.0), tan: tangentAt(Zc.harbour, 1.2), range: 1.2, w: 0.2, work: { act: 'look', on: 6, off: 10, periods: ['evening', 'night'] } })
  W.push({ cfg: db, key: db.name, mode: 'pace', n: around(Zc.harbour, 0.22 * 1.3, 2.7), tan: tangentAt(Zc.harbour, 2.0), range: 0.6, w: 0.45, speeds: { morning: 1.3, day: 1.15, evening: 0.9, night: 0.5 }, carry: true, work: { act: 'play', on: 5, off: 11, periods: ['morning', 'day', 'evening'] } })
  const ang = by('lake')[0], dockN = (() => { const sh = around(Zc.lake, 0.2 * 1.06, LAKE_DOCK_B); const f = Zc.lake.clone().addScaledVector(sh, -sh.dot(Zc.lake)).normalize(); return sh.clone().addScaledVector(f, 1.15 / R).normalize() })()
  W.push({ cfg: ang, key: ang.name, mode: 'anchor', dock: true, plan: { morning: A(dockN, Zc.lake, 'fish'), day: A(dockN, Zc.lake, 'fish'), evening: A(dockN, Zc.lake, 'fish'), night: A(dockN, Zc.lake, 'look') } })
  const [fa, fwf] = by('terraces')
  const rowA = around(Zc.terraces, 0.07, 0.5), rowB = around(Zc.terraces, 0.1, 1.4), hut = around(Zc.terraces, 0.13, 3.3)
  W.push({ cfg: { ...fa, hold: { R: 'hoe' } }, key: fa.name, mode: 'anchor', plan: { morning: [A(rowA, Zc.terraces, 'hoe', { dur: 22, stage: 'tend' }), A(rowB, Zc.terraces, 'hoe', { dur: 22, stage: 'tend' })], day: [A(rowB, Zc.terraces, 'hoe', { dur: 20, stage: 'tend' }), A(hut, Zc.terraces, 'eat', { dur: 16, stage: 'eat' })], evening: [A(rowA, Zc.terraces, 'look', { dur: 18, stage: 'survey' }), A(hut, Zc.terraces, 'sit', { dur: 14, stage: 'rest' })], night: A(hut, Zc.terraces, 'sit', { stage: 'rest' }) } })
  W.push({ cfg: fwf, key: fwf.name, mode: 'pace', n: around(Zc.terraces, 0.11, 2.5), tan: tangentAt(Zc.terraces, 2.0), range: 0.6, w: 0.12, work: { act: 'hoe', on: 7, off: 5, periods: ['morning', 'day'] } })
  const sch = by('ruins')[0], rs = around(Zc.ruins, 0.25 / R, 4.0); W.push({ cfg: sch, key: sch.name, mode: 'anchor', plan: { morning: A(rs, Zc.ruins, 'stretch'), day: A(around(Zc.ruins, 0.32 / R, 3.2), Zc.ruins, 'look'), evening: A(rs, Zc.ruins, 'look'), night: A(rs, Zc.ruins, 'look') } })
  const mg = by('mills')[0]; W.push({ cfg: mg, key: mg.name, mode: 'pace', n: around(Zc.mills, 0.06, 1.0), tan: tangentAt(Zc.mills, 1.0), range: 1.4, w: 0.35, speeds: { morning: 1.2, day: 1, evening: 0.8, night: 0.4 }, carry: true, work: { act: 'stretch', on: 4, off: 12, periods: ['evening'] } })
  const [bs, td] = by('giant')
  W.push({ cfg: bs, key: bs.name, mode: 'pace', n: around(Zc.giant, 1.6 / R, 0.5), tan: tangentAt(Zc.giant, 2.0), range: 0.7, w: 0.3, work: { act: 'look', on: 5, off: 8, periods: ['morning', 'day', 'evening', 'night'] } })
  const play1 = around(Zc.giant, 1.75 / R, 0.8), play2 = around(Zc.giant, 1.95 / R, 1.3), napN = around(Zc.giant, 1.45 / R, 0.4)
  W.push({ cfg: td, key: td.name, mode: 'anchor', plan: { morning: [A(play1, Zc.giant, 'play', { dur: 14, stage: 'play' }), A(play2, Zc.giant, 'play', { dur: 12, stage: 'play' })], day: [A(play2, Zc.giant, 'play', { dur: 14, stage: 'play' }), A(napN, Zc.giant, 'nap', { dur: 24, stage: 'nap' })], evening: [A(play1, Zc.giant, 'play', { dur: 12, stage: 'play' }), A(napN, Zc.giant, 'eat', { dur: 12, stage: 'eat' })], night: A(napN, Zc.giant, 'nap', { stage: 'nap' }) } })
  return W
}
export const RATE = { toddler: 12, kid: 10.5, teen: 9, adult: 8, elder: 6 }
export const STATIC_ACTS = new Set(['sit', 'stretch', 'hoe', 'sweep', 'fish', 'chat', 'look', 'knead', 'sell', 'eat', 'nap', 'play', 'wave'])
// where ?view=lineup lines everyone up (meadow)
export const LINEUP = around(Zc.meadow, 0.1, 2.4)
