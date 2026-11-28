// The pre-rework planet layout, frozen verbatim (reachable via ?world=old, see flag.js). Pure data + terrain functions
// with no dependency on world.js so world.js can import it. Do not edit: later rework tasks change the other branch.
import * as THREE from 'three'
const _dir = (lat, lon) => [Math.cos(lat) * Math.sin(lon), Math.sin(lat), Math.cos(lat) * Math.cos(lon)]
const Z = (lat, lon, r) => { const [x, y, z] = _dir(lat, lon); return { x, y, z, r, lat, lon } }
const dir = (lat, lon) => new THREE.Vector3(Math.cos(lat) * Math.sin(lon), Math.sin(lat), Math.cos(lat) * Math.cos(lon))
const sst = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t) }
const ang = (n, z) => Math.acos(Math.min(1, Math.max(-1, (n.x * z.x + n.y * z.y + n.z * z.z) / Math.hypot(n.x, n.y, n.z))))
// biome / zone centres (lat, lon, angular radius)
export const ZONES = {
  lake: Z(-0.55, 0.9, 0.2), cliff: Z(-0.42, 1.38, 0.11), terraces: Z(-0.62, 2.7, 0.18), harbour: Z(-0.32, 4.3, 0.22), ruins: Z(-0.72, 3.85, 0.11),
  forest: Z(-0.05, 3.35, 0.27), giant: Z(-0.4, 3.05, 0.1), meadow: Z(0.4, 5.2, 0.3), mills: Z(1.0, 4.6, 0.18),
}
export const TRAIN_LAT = -0.95
export const LAKE_W = -0.16, HARB_W = -0.2, CLIFF_H = 1.15
export const height = (n) => {
  let h = 0.29 * Math.sin(2.7 * n.x + 1.3) * Math.sin(3.1 * n.y + 0.4) * Math.sin(2.3 * n.z + 2.1) + 0.08 * Math.sin(7 * n.x + 5 * n.z)
  const zm = ZONES
  let a = ang(n, zm.meadow); if (a < zm.meadow.r + 0.2) h += sst(zm.meadow.r + 0.2, zm.meadow.r * 0.4, a) * 0.38 * (0.5 + 0.5 * Math.sin(n.x * 15 + 1) * Math.sin(n.z * 13 + n.y * 9))
  a = ang(n, zm.giant); if (a < zm.giant.r * 2.6) h += 0.85 * sst(zm.giant.r * 2.6, zm.giant.r * 0.3, a)
  a = ang(n, zm.cliff); if (a < zm.cliff.r + 0.04) h += CLIFF_H * sst(zm.cliff.r + 0.03, zm.cliff.r, a) + 0.04 * Math.sin(n.x * 40) * sst(zm.cliff.r, 0, a)
  a = ang(n, zm.terraces); if (a < zm.terraces.r + 0.05) { const hill = 1.05 * Math.max(0, 1 - a / zm.terraces.r), stp = 0.15, f = hill / stp, st = Math.floor(f) * stp + stp * sst(0.82, 1, f - Math.floor(f)); h = h + (st + 0.04 - h) * sst(zm.terraces.r + 0.05, zm.terraces.r - 0.01, a) }
  a = ang(n, zm.lake); if (a < zm.lake.r * 1.3) h = h + (-0.55 - h) * sst(zm.lake.r * 1.15, zm.lake.r * 0.55, a)
  a = ang(n, zm.harbour); if (a < zm.harbour.r * 1.3) h = h + (-0.6 - h) * sst(zm.harbour.r * 1.12, zm.harbour.r * 0.6, a)
  return h
}
// path & stream curves on sphere (lat,lon param)
export const pathDir = (t) => dir(0.55 + 0.35 * Math.sin(t * 3) , t)
export const streamDir = (t) => { const d = Math.atan2(Math.sin(t - 0.55), Math.cos(t - 0.55)); return dir(-0.15 + 0.3 * Math.sin(t * 2 + 1) + 0.15 * Math.sin(t * 5) + 0.8 * Math.exp(-((d / 0.4) ** 2)), t) }
// village layout (world/village.js): square, mills, houses, the two far set-piece spots, train stops
export const VILLAGE = dir(1.05, 0.2)
export const MILLS = [dir(0.25, 1.4), dir(0.45, 1.75)]
export const HOUSES = [[0.9, -0.15], [1.18, 0.55], [0.92, 0.78], [1.3, -0.3], [1.0, 0.95], [0.3, -0.6], [0.75, 2.2], [0.5, 2.55], [0.92, 2.6], [0.35, 2.25], [0.7, 2.85]].map(([la, lo]) => dir(la, lo))
export const SPOT_DIRS = { shrine: dir(0.12, -1.05), bus: dir(0.52, 1.2) }
export const TRAIN_STOPS = [{ id: 'village', lon: 0.75 }, { id: 'forest', lon: 3.7 }]
// App.jsx: village lamp posts and the player's starting direction
export const LAMPS = [dir(1.05, 0.05), dir(0.95, 0.3), dir(0.75, 0.0), dir(1.22, 0.25), dir(0.35, 1.55), dir(0.15, -0.4), dir(0.62, 2.4), dir(0.8, 2.45), dir(0.45, 2.42), dir(0.6, 2.75)]
export const SPAWN = dir(0.95, 0.12).normalize()
