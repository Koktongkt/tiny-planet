// Shorelines traced from the DRAWN ground (gameplay terrain is not changed): both river banks, the lake, the plunge pool
// under the waterfall and the sea coast (its harbour stretch flagged). Each run is a list of points on the waterline with
// the water level there and `out`, the unit direction (tangent to the sphere) pointing from water to land. Plus the sea
// coves, and shoreDist(n): world units to the nearest shoreline, negative on the water side. Pure (node-testable).
import * as THREE from 'three'
import { R, height, ZONES, zv, dir, LAKE_W, SEA_W, SEA_LAT, streamDir, streamHalf, streamNear } from '../world.js'
import { WATERFALL } from './zoneLayout.js'
import { railOff } from './railway.js'
import { WATER_DROP } from './shoreSetting.js'
export { WATER_DROP }

const TAU = Math.PI * 2, STEP = 0.05 // max spacing between points, world units
const ss = (a, b, t) => { t = Math.min(1, Math.max(0, (t - a) / (b - a))); return t * t * (3 - 2 * t) }

// the ground as Ground() draws it: gameplay height minus the carve under the river (moved here from App.jsx)
export function visualGround(n) {
  const sn = streamNear(n), gap = sn.d - sn.half
  return height(n) - (gap < 0.04 ? 0.03 + 0.11 * ss(0.04, -0.3, gap) : 0)
}

const tangentOut = (n, from) => from.clone().addScaledVector(n, -n.dot(from)).normalize()
// march from c along bearing direction d (unit tangent at c) until the drawn ground rises above `level`
function march(c, d, level, maxA, stepA = 0.03 / R) { // stride, then bisect to the crossing (~1e-4 world units)
  const axis = new THREE.Vector3().crossVectors(c, d).normalize(), p = new THREE.Vector3()
  for (let a = stepA; a < maxA; a += stepA) {
    p.copy(c).applyAxisAngle(axis, a)
    if (visualGround(p) > level) { // refine the crossing between a - step and a
      let lo = a - stepA, hi = a; for (let k = 0; k < 10; k++) { const m = (lo + hi) / 2; p.copy(c).applyAxisAngle(axis, m); if (visualGround(p) > level) hi = m; else lo = m }
      const n = c.clone().applyAxisAngle(axis, hi).normalize(), out = d.clone().applyAxisAngle(axis, hi)
      return { n, out: tangentOut(n, out) }
    }
  }
  return null
}
const basis = (c) => { const e1 = new THREE.Vector3(0, 1, 0).cross(c); if (e1.lengthSq() < 1e-8) e1.set(1, 0, 0); e1.normalize(); return [e1, new THREE.Vector3().crossVectors(c, e1)] }
// a ring of marches around c; consecutive hits form runs, a miss (or a jump) splits them
function ring(c, level, maxA, count, extra) {
  const [e1, e2] = basis(c), runs = []; let run = []
  for (let i = 0; i < count; i++) {
    const b = i / count * TAU, d = e1.clone().multiplyScalar(Math.cos(b)).addScaledVector(e2, Math.sin(b)), h = march(c, d, level, maxA)
    const prev = run[run.length - 1]
    if (h && (!prev || prev.n.angleTo(h.n) * R < 0.6)) run.push({ ...h, level, ...(extra ? extra(h.n) : {}) })
    else { if (run.length) runs.push(run); run = h ? [{ ...h, level, ...(extra ? extra(h.n) : {}) }] : [] }
  }
  if (run.length) runs.push(run)
  const closed = runs.length === 1 && runs[0].length === count
  if (!closed && runs.length > 1 && runs[0].length && run.length && runs[0][0].n.angleTo(runs[runs.length - 1].at(-1).n) * R < 0.6) runs[0] = [...runs.pop(), ...runs[0]] // wrap around
  return runs.map(pts => ({ pts, closed }))
}
// resample a run so no two neighbours are more than STEP apart (slerp between points; level and out lerped)
function resample(pts, closed) {
  const out = [], seq = closed ? [...pts, pts[0]] : pts
  for (let i = 0; i < seq.length - 1; i++) {
    const a = seq[i], b = seq[i + 1], k = Math.max(1, Math.ceil(a.n.angleTo(b.n) * R / STEP))
    for (let j = 0; j < k; j++) { const t = j / k, n = a.n.clone().lerp(b.n, t).normalize(); out.push({ ...a, n, level: a.level + (b.level - a.level) * t, out: tangentOut(n, a.out.clone().lerp(b.out, t)) }) }
  }
  if (!closed) out.push(seq.at(-1))
  return out
}

const LAKE_C = zv(ZONES.lake), HARB_C = zv(ZONES.harbour), FOOT = WATERFALL ? WATERFALL.foot.clone().normalize() : null
const POOL_W = FOOT ? height(FOOT) + 0.012 : 0
const lakeR = ZONES.lake.r * 1.6, harbR = ZONES.harbour.r * 1.3

function riverRuns() {
  const N = 2400, runs = []
  const wet = (n) => (n.angleTo(LAKE_C) < lakeR && visualGround(n) < LAKE_W + 0.01) || visualGround(n) < SEA_W + 0.01 || (FOOT && n.angleTo(FOOT) < WATERFALL.poolR * 1.15)
  for (const side of [-1, 1]) { let run = []
    for (let i = 0; i <= N; i++) {
      const t = i / N * TAU, c = streamDir(t).normalize(), c2 = streamDir(t + 0.002).normalize(), tan = c2.clone().sub(c).normalize()
      const s = new THREE.Vector3().crossVectors(tan, c).normalize().multiplyScalar(side), n = c.clone().addScaledVector(s, streamHalf(t) / R).normalize()
      if (wet(n)) { if (run.length > 1) runs.push({ kind: 'river', closed: false, pts: run }); run = []; continue }
      run.push({ n, out: tangentOut(n, s), level: height(n) - 0.012 }) // the ribbon is draped: its edge is the waterline
    }
    if (run.length > 1) runs.push({ kind: 'river', closed: false, pts: run }) }
  return runs
}
function seaRuns() { // march north from the south pole on every longitude
  const S = new THREE.Vector3(0, -1, 0), M = 720, runs = []; let run = []
  for (let i = 0; i < M; i++) {
    const lon = i / M * TAU, d = new THREE.Vector3(Math.sin(lon), 0, Math.cos(lon)), h = march(S, d, SEA_W, Math.PI / 2 + SEA_LAT + 0.5)
    const prev = run[run.length - 1], ok = h && streamNear(h.n).d > streamNear(h.n).half + 0.02
    if (ok && (!prev || prev.n.angleTo(h.n) * R < 0.6)) run.push({ ...h, level: SEA_W, harbour: h.n.angleTo(HARB_C) < harbR })
    else { if (run.length) runs.push(run); run = ok ? [{ ...h, level: SEA_W, harbour: h.n.angleTo(HARB_C) < harbR }] : [] }
  }
  if (run.length) runs.push(run)
  if (runs.length > 1 && runs[0][0].n.angleTo(runs.at(-1).at(-1).n) * R < 0.6) runs[0] = [...runs.pop(), ...runs[0]]
  const closed = runs.length === 1 && runs[0].length === M
  return runs.map(pts => ({ kind: 'sea', closed, pts }))
}

export const SHORE_RUNS = (() => {
  const raw = [
    ...ring(LAKE_C, LAKE_W, lakeR, 360).map(r => ({ kind: 'lake', ...r })),
    ...(FOOT ? ring(FOOT, POOL_W, WATERFALL.poolR * 2.5, 96).map(r => ({ kind: 'pool', ...r })) : []),
    ...riverRuns(), ...seaRuns()]
  return raw.filter(r => r.pts.length > 1).map(r => ({ ...r, pts: resample(r.pts, r.closed) }))
})()

// ---- coves: small sandy breaks in the sea bank, where she can walk down into the wadeable shelf ----
const COVE_LONS = [1.95, 2.6, 3.6, 4.6, 5.4] // past the harbour quays, below the forest, the open plot, the meadow, the far side
const COVE_R = 0.45 / R
export const COVES = (() => {
  const sea = SHORE_RUNS.filter(r => r.kind === 'sea').flatMap(r => r.pts).filter(p => !p.harbour)
  return COVE_LONS.map(lon => { const t = dir(SEA_LAT, lon); let best = null, bd = 9; for (const p of sea) { const d = p.n.angleTo(t); if (d < bd) { bd = d; best = p } } return best })
    .filter(p => p && Math.abs(railOff(p.n)) * R >= 0.6).slice(0, 5).map(p => ({ n: p.n.clone(), r: COVE_R }))
})()
export const inCove = (n) => COVES.some(c => c.n.angleTo(n) < c.r)

// ---- signed distance to the nearest shoreline point: exact within MAXD world units (all callers need: the fine band
// < 0.9, bank colours < 0.3, water shading < 0.6); beyond that ±1, signed by whether the point is under water ----
const MAXD = 0.9, CELL = 0.3, grid = new Map(), key = (i, j, k) => (i * 73856093) ^ (j * 19349663) ^ (k * 83492791)
for (const r of SHORE_RUNS) for (const p of r.pts) { const kk = key(Math.floor(p.n.x * R / CELL), Math.floor(p.n.y * R / CELL), Math.floor(p.n.z * R / CELL)); if (!grid.has(kk)) grid.set(kk, []); grid.get(kk).push(p) }
const FAR = MAXD, far = new Set()
for (const r of SHORE_RUNS) for (const p of r.pts) far.add(key(Math.floor(p.n.x * R / FAR), Math.floor(p.n.y * R / FAR), Math.floor(p.n.z * R / FAR)))
const _d = new THREE.Vector3()
export function shoreDist(n) {
  { const a = Math.floor(n.x * R / FAR), b = Math.floor(n.y * R / FAR), c = Math.floor(n.z * R / FAR); let any = false // nothing within MAXD?
    for (let x = -1; x <= 1 && !any; x++) for (let y = -1; y <= 1 && !any; y++) for (let z = -1; z <= 1 && !any; z++) if (far.has(key(a + x, b + y, c + z))) any = true
    if (!any) return isWaterFar(n) ? -1 : 1 }
  const i = Math.floor(n.x * R / CELL), j = Math.floor(n.y * R / CELL), k = Math.floor(n.z * R / CELL)
  let best = null, bd = Infinity
  for (let reach = 0; reach <= Math.ceil(MAXD / CELL); reach++) { // shells: only the cells at Chebyshev distance `reach`
    for (let x = -reach; x <= reach; x++) for (let y = -reach; y <= reach; y++) for (let z = -reach; z <= reach; z++) {
      if (Math.max(Math.abs(x), Math.abs(y), Math.abs(z)) !== reach) continue
      const cell = grid.get(key(i + x, j + y, k + z)); if (!cell) continue
      for (const p of cell) { const d = p.n.distanceToSquared(n); if (d < bd) { bd = d; best = p } }
    }
    if (best && Math.sqrt(bd) * R <= reach * CELL) break // nothing in a further shell can be closer
  }
  if (!best || Math.sqrt(bd) * R > MAXD) return isWaterFar(n) ? -1 : 1
  const d = Math.sqrt(bd) * R; _d.copy(n).sub(best.n); return _d.dot(best.out) >= 0 ? d : -d
}
// far from every shore the river carve doesn't apply, so gameplay height decides (cheaper than visualGround)
const isWaterFar = (n) => { const h = height(n); return h < SEA_W || (h < LAKE_W && n.angleTo(LAKE_C) < lakeR) }
