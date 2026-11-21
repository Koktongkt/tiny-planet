// Shared state for her house interior + the two pets. No React here.
// The room lives in planet-local space at the planet's centre (fully enclosed, so nothing outside can be seen
// through it); while she is inside, the rest of the planet group is hidden and the interior camera takes over.
import * as THREE from 'three'
import { q, VIEW } from '../common.jsx'

// Round8 interior (docs: concept cutaway): a rounded-oval room (superellipse |x/A|^n + |z/B|^n = 1) seen from above the
// cut-away front rim. Sized to her (she is ~0.41 room units tall): door 0.58, counters 0.22, bed top 0.15.
export const ROOM = { A: 1.55, B: 1.1, n: 6, x0: -1.55, x1: 1.55, z0: -1.1, z1: 1.1, h: 1.05, rim: 0.13, y: 0, S: 1.25 } // S: the room group's scale (room units -> planet units)
export const DOOR = { x: 0, z: 1.1, w: 0.3, h: 0.58 } // in the front rim, facing the camera (camera looks toward -z)
// wall height along the oval: full at the back, sloping down to the low front rim (the cut-away)
export const wallH = (z) => { const k = Math.min(1, Math.max(0, (z - 0.42) / 0.5)); return ROOM.h + (ROOM.rim - ROOM.h) * k * k * (3 - 2 * k) }
// furniture footprints (room-local x/z boxes) used for her collision, the cat's steering and placement checks
export const BLOCKS = [
  { id: 'stove', x0: -1.3, x1: -0.84, z0: -1.1, z1: -0.6 },
  { id: 'wood', x0: -0.86, x1: -0.58, z0: -1.1, z1: -0.84 },
  { id: 'kitchen', x0: -0.5, x1: 0.38, z0: -1.1, z1: -0.82 },
  { id: 'fridge', x0: 0.4, x1: 0.72, z0: -1.1, z1: -0.85 },
  { id: 'desk', x0: -1.6, x1: -1.2, z0: -0.74, z1: -0.16 },
  { id: 'stool', x0: -1.12, x1: -0.98, z0: -0.52, z1: -0.38 },
  { id: 'table', x0: -0.16, x1: 0.26, z0: -0.11, z1: 0.31, round: true },
  { id: 'poufL', x0: -0.42, x1: -0.22, z0: 0.02, z1: 0.22, round: true },
  { id: 'poufR', x0: 0.32, x1: 0.52, z0: 0.02, z1: 0.22, round: true },
  { id: 'plantA', x0: -1.6, x1: -1.18, z0: 0.38, z1: 0.62 },
  { id: 'petbed', x0: -1.12, x1: -0.78, z0: 0.4, z1: 0.7, round: true },
  { id: 'bathL', x0: 0.78, x1: 0.86, z0: -1.1, z1: -0.37 },
  { id: 'bathF1', x0: 0.78, x1: 0.94, z0: -0.44, z1: -0.36 },
  { id: 'bathF2', x0: 1.36, x1: 1.6, z0: -0.44, z1: -0.36 },
  { id: 'wardrobe', x0: 1.3, x1: 1.6, z0: -0.36, z1: -0.04 },
  { id: 'night', x0: 1.28, x1: 1.6, z0: -0.02, z1: 0.2 },
  { id: 'bed', x0: 0.82, x1: 1.6, z0: 0.22, z1: 0.74 },
  { id: 'coat', x0: 0.43, x1: 0.57, z0: 0.9, z1: 1.1 },
  { id: 'plantB', x0: 0.76, x1: 0.92, z0: 0.8, z1: 0.98 },
]
export const HOME = {
  inside: false, fade: 0, busy: false, playerObj: null, roomObj: null,
  hp: { x: 0.3, z: 0.5, yaw: 0.5, target: null }, // her room-local position / facing (yaw 0 faces +z)
  near: [], // [(consider, playerLocal) => void] proximity hooks registered by room / cat / dog
  colliders: [], homeN: null, doorN: null, outN: null, houseQ: null, GAME: null,
  petCam: 0, camYaw: Math.PI, DOOR,
}
// she starts inside her house (unless a debug spot or another view was asked for)
HOME.inside = VIEW.mode === 'follow' && !q.has('nogame') && !q.has('at') && !q.has('out') && !q.has('petsdemo') /* ?petsdemo is an outdoor pets view: starting inside left an empty-looking room */
if (typeof window !== 'undefined') window.__home = HOME

const _v = new THREE.Vector3()
// the oval: f < 1 inside (shrunk by r so a body of radius r stays clear of the wall)
const oval = (x, z, r) => Math.pow(Math.abs(x) / (ROOM.A - r), ROOM.n) + Math.pow(Math.abs(z) / (ROOM.B - r), ROOM.n)
// is a room-local floor point free (inside walls, outside furniture)?
export function freeAt(x, z, r = 0.08, skip) {
  if (oval(x, z, r) > 1) return false
  for (const b of BLOCKS) { if (b.id === skip) continue; if (x > b.x0 - r && x < b.x1 + r && z > b.z0 - r && z < b.z1 + r) return false }
  return true
}
// push a circle out of walls + furniture (axis-aligned boxes)
export function resolve(p, r = 0.08, skip) {
  const f = oval(p.x, p.z, r); if (f > 1) { const k = Math.pow(f, -1 / ROOM.n); p.x *= k; p.z *= k } // the oval is homogeneous: scale back onto it
  for (const b of BLOCKS) {
    if (b.id === skip) continue
    const cx = Math.min(b.x1, Math.max(b.x0, p.x)), cz = Math.min(b.z1, Math.max(b.z0, p.z)), dx = p.x - cx, dz = p.z - cz, d = Math.hypot(dx, dz)
    if (d < r) { if (d > 1e-5) { p.x = cx + dx / d * r; p.z = cz + dz / d * r } else { // centre inside the box: leave by the nearest side
      const o = [[p.x - b.x0, -1, 0], [b.x1 - p.x, 1, 0], [p.z - b.z0, 0, -1], [b.z1 - p.z, 0, 1]].sort((a, c) => a[0] - c[0])[0]; p.x += o[1] * (o[0] + r); p.z += o[2] * (o[0] + r) } }
  }
  return p
}
// a point on the oval wall (inner face) at angle-ish parameter: the boundary point along direction (x, z), and its inward normal
export function wallAt(dx, dz, out = {}) { const f = oval(dx, dz, 0), k = Math.pow(f, -1 / ROOM.n), x = dx * k, z = dz * k
  const gx = Math.sign(x) * Math.pow(Math.abs(x) / ROOM.A, ROOM.n - 1) / ROOM.A, gz = Math.sign(z) * Math.pow(Math.abs(z) / ROOM.B, ROOM.n - 1) / ROOM.B, gl = Math.hypot(gx, gz) || 1
  out.x = x; out.z = z; out.nx = -gx / gl; out.nz = -gz / gl; out.rot = Math.atan2(out.nx, out.nz); return out }
export const roomToWorld = (x, y, z, out = _v) => { out.set(x, y, z); if (HOME.roomObj) out.applyMatrix4(HOME.roomObj.matrixWorld); return out }
