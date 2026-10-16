// Shared state for her house interior + the two pets. No React here.
// The room lives in planet-local space at the planet's centre (fully enclosed, so nothing outside can be seen
// through it); while she is inside, the rest of the planet group is hidden and the interior camera takes over.
import * as THREE from 'three'
import { q, VIEW } from '../common.jsx'

export const ROOM = { x0: -1.3, x1: 1.3, z0: -1.0, z1: 1.0, h: 1.18, y: 0, S: 1.25 } // S: the room group's scale (room units -> planet units)
export const DOOR = { x: 0.78, z: -1.0, w: 0.28, h: 0.54 } // on the back wall (camera looks toward -z)
// furniture footprints (room-local x/z boxes) used for her collision, the cat's steering and placement checks
export const BLOCKS = [
  { id: 'bed', x0: -1.3, x1: -0.62, z0: -1.0, z1: -0.2 },
  { id: 'shelf', x0: -0.38, x1: 0.18, z0: -1.0, z1: -0.82 },
  { id: 'kitchen', x0: 0.98, x1: 1.3, z0: -0.35, z1: 0.75 },
  { id: 'table', x0: -0.05, x1: 0.45, z0: -0.05, z1: 0.42, round: true },
  { id: 'plantA', x0: -1.3, x1: -1.1, z0: 0.62, z1: 1.0 },
  { id: 'plantB', x0: 0.36, x1: 0.56, z0: -1.0, z1: -0.82 },
  { id: 'stove', x0: 1.0, x1: 1.3, z0: -1.0, z1: -0.55 },
]
export const HOME = {
  inside: false, fade: 0, busy: false, playerObj: null, roomObj: null,
  hp: { x: 0.55, z: -0.35, yaw: 0.6, target: null }, // her room-local position / facing (yaw 0 faces +z)
  near: [], // [(consider, playerLocal) => void] proximity hooks registered by room / cat / dog
  colliders: [], homeN: null, doorN: null, outN: null, houseQ: null, GAME: null,
  petCam: 0, camYaw: Math.PI,
}
// she starts inside her house (unless a debug spot or another view was asked for)
HOME.inside = VIEW.mode === 'follow' && !q.has('nogame') && !q.has('at') && !q.has('out') && !q.has('petsdemo') /* ?petsdemo is an outdoor pets view: starting inside left an empty-looking room */
if (typeof window !== 'undefined') window.__home = HOME

const _v = new THREE.Vector3()
// is a room-local floor point free (inside walls, outside furniture)?
export function freeAt(x, z, r = 0.08, skip) {
  if (x < ROOM.x0 + r || x > ROOM.x1 - r || z < ROOM.z0 + r || z > ROOM.z1 - r) return false
  for (const b of BLOCKS) { if (b.id === skip) continue; if (x > b.x0 - r && x < b.x1 + r && z > b.z0 - r && z < b.z1 + r) return false }
  return true
}
// push a circle out of walls + furniture (axis-aligned boxes)
export function resolve(p, r = 0.08, skip) {
  p.x = Math.min(ROOM.x1 - r, Math.max(ROOM.x0 + r, p.x)); p.z = Math.min(ROOM.z1 - r, Math.max(ROOM.z0 + r, p.z))
  for (const b of BLOCKS) {
    if (b.id === skip) continue
    const cx = Math.min(b.x1, Math.max(b.x0, p.x)), cz = Math.min(b.z1, Math.max(b.z0, p.z)), dx = p.x - cx, dz = p.z - cz, d = Math.hypot(dx, dz)
    if (d < r) { if (d > 1e-5) { p.x = cx + dx / d * r; p.z = cz + dz / d * r } else { // centre inside the box: leave by the nearest side
      const o = [[p.x - b.x0, -1, 0], [b.x1 - p.x, 1, 0], [p.z - b.z0, 0, -1], [b.z1 - p.z, 0, 1]].sort((a, c) => a[0] - c[0])[0]; p.x += o[1] * (o[0] + r); p.z += o[2] * (o[0] + r) } }
  }
  return p
}
export const roomToWorld = (x, y, z, out = _v) => { out.set(x, y, z); if (HOME.roomObj) out.applyMatrix4(HOME.roomObj.matrixWorld); return out }
