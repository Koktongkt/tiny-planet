// Anchors for the in-world prompt: each target hands the interaction loop a function that writes the world-space point
// the bubble floats above (planet group, room group or a moving object), recomputed every frame.
import * as THREE from 'three'
import { planetRef } from '../../common.jsx'
import { HOME, roomToWorld } from '../../home/state.js'

const _u = new THREE.Vector3(), _q = new THREE.Quaternion()
// a planet-local point, lifted along its own up
export const atPlanet = (local, lift = 0) => (out) => {
  out.copy(local); const l = out.length(); if (l > 0) out.multiplyScalar((l + lift) / l)
  return planetRef.current ? out.applyMatrix4(planetRef.current.matrixWorld) : out
}
// room units (as HOME.hp and the interior camera use them)
export const atRoom = (x, z, y = 0) => (out) => roomToWorld(x, y, z, out)
// a moving object (a sheep, Pip, Mochi): its world position plus its world up × h
export const atObj = (obj, h = 0) => (out) => {
  obj.getWorldPosition(out); obj.getWorldQuaternion(_q)
  return out.addScaledVector(_u.set(0, 1, 0).applyQuaternion(_q), h)
}
// the traveller's world position and facing (local +Z: outdoors her basis is (side, n, face), indoors a yaw about up)
const _f = new THREE.Vector3(), _p = new THREE.Vector3(), _a = new THREE.Vector3()
export function facingCos(at) {
  const o = HOME.playerObj; if (!o || !at) return null
  o.getWorldPosition(_p); _f.set(0, 0, 1).transformDirection(o.matrixWorld)
  at(_a).sub(_p); _u.set(0, 1, 0).transformDirection(o.matrixWorld); _a.addScaledVector(_u, -_a.dot(_u)) // level: anchors float above
  const l = _a.length(); if (l < 1e-6) return 1
  return _a.dot(_f) / l
}
