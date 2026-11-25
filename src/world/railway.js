// The coast railway (Stage C train): a ring round the planet at TRAIN_LAT, just above the shore. On the reworked planet
// it eases north round the head of the Harbour bay (no rails over open harbour water) and crosses the river once, on a
// plank trestle over its outlet valley; everywhere else it runs on the ground. Pure (no React): zones.jsx draws the
// rails, sleepers, trestle and train from it, the stations and systems/liveC.js put the platforms beside it.
// Positions along the ring are longitudes (the train schedule, systems/train.js, runs on lon), any lon wraps.
// Under ?world=old every function reduces to the frozen constant-latitude ring.
import { R, TRAIN_LAT, dir, height } from '../world.js'
import { OLD_WORLD } from './flag.js'
import { riverNear } from './river.js'

const TAU = Math.PI * 2
const wrap = (lon) => ((lon % TAU) + TAU) % TAU
const sst = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t) }
const dsst = (a, b, x) => { const t = (x - a) / (b - a); return t <= 0 || t >= 1 ? 0 : 6 * t * (1 - t) / (b - a) }
// the bay detour: the ring rises BAY_EASE rad north between the two ramps (lon), level across the bay head
const BAY_EASE = 0.10, RAMP_W = [1.34, 1.48], RAMP_E = [1.70, 1.98]

/** latitude of the rail centre line at `lon` */
export const railLat = OLD_WORLD ? () => TRAIN_LAT : (lon) => { const w = wrap(lon); return TRAIN_LAT + BAY_EASE * (sst(RAMP_W[0], RAMP_W[1], w) - sst(RAMP_E[0], RAMP_E[1], w)) }
const railSlope = OLD_WORLD ? () => 0 : (lon) => { const w = wrap(lon); return BAY_EASE * (dsst(RAMP_W[0], RAMP_W[1], w) - dsst(RAMP_E[0], RAMP_E[1], w)) } // d railLat / d lon
/** unit vector of the rail centre line at `lon` */
export const railDir = (lon) => dir(railLat(lon), lon)
/** unit tangent of the ring at `lon`, eastward (the train's direction of travel) */
export function railTangent(lon) {
  const lat = railLat(lon), s = railSlope(lon), cl = Math.cos(lat), sl = Math.sin(lat), so = Math.sin(lon), co = Math.cos(lon)
  const x = cl * co - sl * so * s, y = cl * s, z = -cl * so - sl * co * s, L = Math.hypot(x, y, z) // d dir(railLat(lon), lon) / d lon
  return { x: x / L, y: y / L, z: z / L }
}
/** a point `off` world units across the track from the centre line (+ = left of travel, the north side) */
export function railPoint(lon, off) {
  if (OLD_WORLD) return dir(TRAIN_LAT + off / R, lon)
  const n = railDir(lon), t = railTangent(lon), sx = n.y * t.z - n.z * t.y, sy = n.z * t.x - n.x * t.z, sz = n.x * t.y - n.y * t.x // side = n x t
  return n.set(n.x + sx * off / R, n.y + sy * off / R, n.z + sz * off / R).normalize()
}
/** signed angular offset (rad) of n from the rail centre line, across the track (+ north); exact under ?world=old */
export function railOff(n) {
  const L = Math.sqrt(n.x * n.x + n.y * n.y + n.z * n.z), lat = Math.asin(Math.max(-1, Math.min(1, n.y / L))), lon = Math.atan2(n.x, n.z), d = lat - railLat(lon) // (zones.jsx latOf, exactly)
  if (OLD_WORLD) return d
  const g = railSlope(lon) / Math.cos(lat); return d / Math.sqrt(1 + g * g)
}

// the trestle: centred on the one stretch of rail over the river (riverNear d < half), spanning the water and its
// low banks out to where the ground rises back to the rails' level. Its deck runs straight between the ground heights
// at its two ends. null under ?world=old.
const BANK = 0.6 // world units of trestle beyond the water on each side
export const TRESTLE = OLD_WORLD ? null : (() => {
  // runs of rail over the river: a coarse walk (0.004 rad, ~0.03 world units: far narrower than the river), each edge
  // then refined by bisection to ~1e-5 rad
  const step = 0.004, q = { d: 9, u: 0, half: 0, side: 1 }, wetAt = (lon) => riverNear(railDir(lon), q).d < q.half, runs = []; let a = null
  const edge = (lo, hi) => { const w0 = wetAt(lo); for (let k = 0; k < 9; k++) { const m = (lo + hi) / 2; if (wetAt(m) === w0) lo = m; else hi = m } return (lo + hi) / 2 }
  for (let lon = step; lon <= TAU; lon += step) { const wet = wetAt(lon); if (wet && a === null) a = edge(lon - step, lon); if (!wet && a !== null) { runs.push([a, edge(lon - step, lon)]); a = null } }
  if (a !== null) runs.push([a, TAU])
  if (runs.length !== 1) return { runs, lon0: 0, lon1: 0, lonC: 0, h0: 0, h1: 0 } // (the unit test reports this)
  const [ra, rb] = runs[0], lonC = (ra + rb) / 2, w = (rb - ra) / 2 + BANK / (R * Math.cos(railLat(lonC)))
  const lon0 = lonC - w, lon1 = lonC + w
  return { runs, lon0, lon1, lonC, h0: height(railDir(lon0)), h1: height(railDir(lon1)) }
})()
/** is `lon` on the trestle? */
export const onTrestle = (lon) => { if (!TRESTLE) return false; const w = wrap(lon); return w > TRESTLE.lon0 && w < TRESTLE.lon1 }
/** the trestle deck's height at `lon` (inside the span) */
export const deckHeight = (lon) => { const T = TRESTLE, k = (wrap(lon) - T.lon0) / (T.lon1 - T.lon0); return T.h0 + (T.h1 - T.h0) * k }
/** height (above R) the rails sit on at `lon`: the ground, or the trestle deck */
export const railHeight = (lon) => onTrestle(lon) ? deckHeight(lon) : height(railDir(lon))

// arc length round the ring (world units at radius R), so carriages keep their spacing on the detour
const AN = 4096, ARC = new Float64Array(AN + 1)
if (!OLD_WORLD) { let p = railDir(0); for (let i = 1; i <= AN; i++) { const q = railDir(i / AN * TAU); ARC[i] = ARC[i - 1] + p.angleTo(q) * R; p = q } }
/** the ring's length in world units */
export const RAIL_LEN = OLD_WORLD ? TAU * R * Math.cos(TRAIN_LAT) : ARC[AN]
const arcAt = (w) => { const f = w / TAU * AN, i = Math.min(AN - 1, Math.floor(f)); return ARC[i] + (ARC[i + 1] - ARC[i]) * (f - i) }
/** lon (in [0, 2pi)) of the point `s` world units along the ring from lon 0 */
export function lonAtArc(s) {
  if (OLD_WORLD) return wrap(s / (R * Math.cos(TRAIN_LAT)))
  s = ((s % RAIL_LEN) + RAIL_LEN) % RAIL_LEN; let lo = 0, hi = AN
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (ARC[m] <= s) lo = m; else hi = m }
  return (lo + (s - ARC[lo]) / Math.max(1e-12, ARC[hi] - ARC[lo])) / AN * TAU
}
/** lon of the point `d` world units behind `lon` along the ring (keeps lon's turn count, so it can be < lon) */
export function railBehind(lon, d) {
  if (OLD_WORLD) return lon - d / (R * Math.cos(TRAIN_LAT))
  const w = wrap(lon), back = lonAtArc(arcAt(w) - d); let dl = w - back
  if (dl < -1e-6) dl += TAU // wrapped past lon 0
  return lon - Math.max(0, dl)
}
