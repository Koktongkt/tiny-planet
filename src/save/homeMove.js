// v8: her house moved in the world rework. Outdoor decor is saved as a world direction, so it is turned by the same
// rotation that takes the old house frame onto the new one: it keeps its offset (and facing) from her front door.
import * as THREE from 'three'
import { HOME_DIR } from '../world/regions.js'

const UP = new THREE.Vector3(0, 1, 0)
export const OLD_HOME = Object.freeze({ lat: 0.9, lon: -0.15, spin: 0 })
export const NEW_HOME = Object.freeze({ lat: HOME_DIR.lat, lon: HOME_DIR.lon, spin: 0 })
const dir = (lat, lon) => new THREE.Vector3(Math.cos(lat) * Math.sin(lon), Math.sin(lat), Math.cos(lat) * Math.cos(lon))
// the frame place() builds for a house: tip UP onto its direction, then spin about the local up
const frame = (h) => new THREE.Quaternion().setFromUnitVectors(UP, dir(h.lat, h.lon)).multiply(new THREE.Quaternion().setFromAxisAngle(UP, h.spin || 0))

export function moveHomeRel(n, oldHome = OLD_HOME, newHome = NEW_HOME) {
  const r = frame(newHome).multiply(frame(oldHome).invert())
  return new THREE.Vector3(n[0], n[1], n[2]).applyQuaternion(r).toArray()
}
// outdoor decor (no `in`) with a usable direction moves; indoor decor and anything malformed stays as it was
export const moveDecor = (placed) => Array.isArray(placed) ? placed.map(p => p && !p.in && Array.isArray(p.n) && p.n.length === 3 && p.n.every(Number.isFinite) ? { ...p, n: moveHomeRel(p.n) } : p) : placed
