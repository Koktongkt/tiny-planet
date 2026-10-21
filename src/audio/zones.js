// Where is she, acoustically? Reads existing world data (src/world.js) + globals the game already exposes
// (window.__player, window.__home, T/VIEW from common.jsx, VILLAGE_POS from world/village.js).
import { ZONES, R, height, streamNear } from '../world.js'
import { T, VIEW } from '../common.jsx'
import { VILLAGE_POS as VILLAGE, TRAIN } from '../world/village.js'
const c = (x) => x < 0 ? 0 : x > 1 ? 1 : x
const ang = (n, z) => Math.acos(Math.max(-1, Math.min(1, n.x * z.x + n.y * z.y + n.z * z.z)))
const near = (n, z, r, fall) => c(1 - Math.max(0, ang(n, z) - r) * R / fall) // 1 inside the zone, fading over `fall` world units
const _n = { x: 0, y: 1, z: 0 }
export function defaultListener() {
  const P = window.__player, H = window.__home, L = window.__layout
  let n = P && P.n ? P.n : _n
  if (H && H.inside && L && L.homeN) n = L.homeN
  return { n, mode: VIEW.mode, inside: !!(H && H.inside), night: T.night }
}
/** zone weights 0..1: river, lake (lake + harbour sea), forest, village, meadow, hill, night */
export function zonesAt(L) {
  const n = L.n, len = Math.hypot(n.x, n.y, n.z) || 1, u = { x: n.x / len, y: n.y / len, z: n.z / len }
  const s = streamNear(u), bank = Math.max(0, s.d - s.half)
  const river = c(1 - bank / 2.6) ** 2
  const lake = Math.max(near(u, ZONES.lake, ZONES.lake.r * 0.95, 3.2), 0.8 * near(u, ZONES.harbour, ZONES.harbour.r * 0.95, 3.6)) ** 1.5
  const forest = Math.max(near(u, ZONES.forest, ZONES.forest.r, 2.5), near(u, ZONES.giant, ZONES.giant.r, 2))
  const village = near(u, VILLAGE, 0.1, 3), meadow = Math.max(near(u, ZONES.meadow, ZONES.meadow.r, 2.5), 0.7 * near(u, ZONES.terraces, ZONES.terraces.r, 2))
  const hill = c((height(u) - 0.12) / 0.7)
  // Stage C: rain 0..1 from the weather hooks (__T.kind / __T.rain; Codor), read defensively
  const rain = L.rain ?? (typeof T.rain === 'number' ? T.rain : T.kind === 'rain' ? 1 : 0)
  // Stage C train: distance to the nearest car (TRAIN.cars, zones.jsx), speed from liveC's TS, riding from liveC's RIDE
  const tr = trainNear(u, L)
  return { river, lake, forest, village, meadow, hill, night: c(L.night ?? T.night), rain: c(rain), ...tr }
}
/** {train 0..1 (1 within ~0.6 units, fading over 4), trainSpeed 0..1, riding} — L.train / L.trainSpeed / L.riding override */
export function trainNear(u, L = {}) {
  const w = typeof window !== 'undefined' ? window : {}, cars = L.cars || (TRAIN.cars || []), RIDE = w.__scRide, TS = w.__sc && w.__sc.TS
  let d = Infinity
  for (const g of cars) { if (!g || !g.position) continue; const p = g.position, l = Math.hypot(p.x, p.y, p.z) || 1; d = Math.min(d, ang(u, { x: p.x / l, y: p.y / l, z: p.z / l }) * R) }
  const riding = L.riding ?? !!(RIDE && RIDE.riding)
  return { train: L.train ?? (riding ? 1 : c(1 - Math.max(0, d - 0.6) / 4) ** 1.5), trainSpeed: c(L.trainSpeed ?? (TS && typeof TS.speed === 'number' ? TS.speed : 0)), riding }
}
