// Pip in the bicycle crate. The game calls these once per frame while she is riding (no allocations:
// every vector lives in `scratch` or in the arguments). The crate empty is `pet_seat` on Studio's GLB
// (the rear crate floor, parented to the bike body). Sampling its world matrix keeps him in the crate
// as the bicycle turns; the fork and front basket steer on their own bone and do not carry the crate.
// A placeholder bike has no empties, so rideSeat returns null and he keeps following on the ground.
import * as THREE from 'three'

const SCRATCH = { pos: new THREE.Vector3(), q: new THREE.Quaternion(), pq: new THREE.Quaternion(), inv: new THREE.Matrix4(), up: new THREE.Vector3() }
export const hopFrom = new THREE.Vector3()
export const HOP_S = 0.42
// The crate is about 6 cm wide and the Shiba is wider than that. Scale her toward the floor marker so
// she sits inside it, head and ears above the rim, without a second mesh.
export const RIDE_SCALE = 0.58
export const SEAT_LIFT = -0.012 // root sits a touch below the floor marker so the tucked paws meet the boards

/** The crate empty, or null when she is not riding a GLB bike (hidden, still loading, or the placeholder). */
export function rideSeat(shown, bike) {
  if (!shown || !bike || !bike.empties) return null
  return bike.empties.pet_seat || null
}

/** Sitting in the crate: legs tucked, no hop, a small idle in the head, ears and tail. Returns the gait speed (0). */
export function sitInCrate(goal, t) {
  goal.sit = 1
  goal.lie = 0
  goal.curl = 0
  goal.stretch = 0
  goal.crouch = 0
  goal.roll = 0
  goal.hop = 0
  goal.pawL = 0
  goal.pawR = 0
  goal.sniff = 0
  goal.bodyYaw = 0
  goal.purr = 0
  goal.pant = 0
  goal.headPitch = Math.sin(t * 1.1) * 0.06
  goal.headYaw = Math.sin(t * 0.7) * 0.1
  goal.headTilt = Math.sin(t * 0.85) * 0.05
  goal.earBack = Math.sin(t * 1.6) * 0.08
  goal.tailUp = 0.85
  goal.tailWag = 0.4
  goal.tailSpeed = 5.5
  goal.mouth = 0.12
  goal.tongue = 0.2
  goal.happy = 0.45
  goal.eyes = 1
  return 0
}

/**
 * Copy `seat`'s world transform onto `dog` in the dog parent's space, so he faces the seat's forward.
 * `lift` is metres along the seat's up axis (negative sinks him onto the boards). `s` is a scratch bag.
 * Returns false when there is nothing to sit on.
 */
export function placeAtSeat(dog, seat, s = SCRATCH, lift = 0) {
  const parent = dog && dog.parent
  if (!parent || !seat || !seat.parent) return false
  seat.getWorldPosition(s.pos)
  if (lift) {
    seat.getWorldQuaternion(s.q)
    s.up.set(0, lift, 0).applyQuaternion(s.q)
    s.pos.add(s.up)
  }
  parent.updateWorldMatrix(true, false)
  s.inv.copy(parent.matrixWorld).invert()
  s.pos.applyMatrix4(s.inv)
  dog.position.copy(s.pos)
  seat.getWorldQuaternion(s.q)
  parent.getWorldQuaternion(s.pq)
  s.pq.invert()
  dog.quaternion.copy(s.pq).multiply(s.q)
  return true
}

/** A point on the sphere just behind her and a little to one side. `n` and `fwd` are unit vectors; `out` is written normalised. */
export function hopOffSpot(n, fwd, out, side, radius) {
  side.crossVectors(n, fwd)
  if (side.lengthSq() < 1e-8) side.set(1, 0, 0)
  else side.normalize()
  out.copy(n).addScaledVector(fwd, -0.42 / radius).addScaledVector(side, 0.28 / radius).normalize()
  return out
}

/** Arc from the crate (`from`) down to `ground`. `k` is 0 at the crate and 1 on the ground. Writes `out`. */
export function hopArc(from, ground, up, k, out, height = 0.08) {
  const t = k < 0 ? 0 : k > 1 ? 1 : k
  out.copy(from).lerp(ground, t)
  out.addScaledVector(up, Math.sin(t * Math.PI) * height)
  return out
}

/** Pose blend for the hop down: sitting at k = 0, standing with a hop arc at the top, on his feet at k = 1. */
export function hopPose(goal, k) {
  const t = k < 0 ? 0 : k > 1 ? 1 : k
  goal.sit = 1 - t
  goal.hop = Math.sin(t * Math.PI)
  goal.lie = 0
  goal.crouch = 0
  goal.tailUp = 0.8
  goal.tailWag = 0.55
  goal.tongue = 0.35
  goal.mouth = 0.2
}
