// Pip sits in the bicycle crate while she rides: the pose tucks his legs (no walk cycle) and his
// root copies the pet_seat empty's live world transform. A placeholder bike has no empty, so he stays on the ground.
import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import { rideSeat, sitInCrate, placeAtSeat, hopOffSpot, hopArc, hopPose } from '../../src/pets/petRide.js'

const scratch = () => ({ pos: new THREE.Vector3(), q: new THREE.Quaternion(), pq: new THREE.Quaternion(), inv: new THREE.Matrix4(), up: new THREE.Vector3() })

test('rideSeat is the crate empty only while a real bike is shown', () => {
  const pet = new THREE.Object3D()
  const bike = { empties: { pet_seat: pet, seat: new THREE.Object3D() } }
  assert.equal(rideSeat(true, bike), pet)
  assert.equal(rideSeat(false, bike), null)
  assert.equal(rideSeat(true, null), null)
  assert.equal(rideSeat(true, { empties: {} }), null) // placeholder: no empties
  assert.equal(rideSeat(true, { empties: { pet_seat: null } }), null)
})

test('sitInCrate tucks the legs and keeps only a small idle', () => {
  const goal = { sit: 0, lie: 1, curl: 1, stretch: 1, crouch: 1, roll: 1, hop: 1, pawL: 1, pawR: 1, sniff: 1, bodyYaw: 1, purr: 1, headPitch: 2, headYaw: 2, headTilt: 2, earBack: 2, tailUp: 0, tailWag: 0, tailSpeed: 0, mouth: 1, tongue: 1, happy: 0, pant: 1, eyes: 0 }
  assert.equal(sitInCrate(goal, 0.4), 0) // speed the rig should use: no walk cycle
  assert.equal(goal.sit, 1)
  for (const k of ['lie', 'curl', 'stretch', 'crouch', 'roll', 'hop', 'pawL', 'pawR', 'sniff', 'bodyYaw', 'purr', 'pant']) assert.equal(goal[k], 0, k)
  for (const t of [0, 0.4, 1.2, 2.7, 5]) {
    sitInCrate(goal, t)
    assert.equal(goal.sit, 1)
    assert.ok(Math.abs(goal.headPitch) <= 0.12, `headPitch ${goal.headPitch}`)
    assert.ok(Math.abs(goal.headYaw) <= 0.2, `headYaw ${goal.headYaw}`)
    assert.ok(Math.abs(goal.headTilt) <= 0.12, `headTilt ${goal.headTilt}`)
    assert.ok(Math.abs(goal.earBack) <= 0.2, `earBack ${goal.earBack}`)
    assert.ok(goal.tailUp > 0.5 && goal.tailWag > 0 && goal.tailWag < 0.8)
  }
})

test('placeAtSeat copies the seat world transform into the dog parent, including steer', () => {
  const parent = new THREE.Group()
  parent.position.set(2, -4, 1)
  parent.quaternion.setFromEuler(new THREE.Euler(0.35, 0.5, -0.2))
  const bike = new THREE.Group()
  bike.position.set(0, 10.6, 0.04)
  bike.quaternion.setFromEuler(new THREE.Euler(0.2, 1.1, 0))
  const steer = new THREE.Group()
  steer.rotation.y = 0.4 // basket / fork yaw
  const seat = new THREE.Object3D()
  seat.position.set(0, 0.102, -0.094)
  steer.add(seat)
  bike.add(steer)
  parent.add(bike)
  const dog = new THREE.Group()
  dog.position.set(9, 9, 9)
  parent.add(dog)
  parent.updateMatrixWorld(true)

  assert.equal(placeAtSeat(dog, seat, scratch(), 0), true)
  parent.updateMatrixWorld(true)
  const sw = seat.getWorldPosition(new THREE.Vector3())
  const dw = dog.getWorldPosition(new THREE.Vector3())
  assert.ok(sw.distanceTo(dw) < 1e-5, `pos ${dw.toArray()} vs ${sw.toArray()}`)
  const sq = seat.getWorldQuaternion(new THREE.Quaternion())
  const dq = dog.getWorldQuaternion(new THREE.Quaternion())
  assert.ok(Math.abs(sq.dot(dq)) > 1 - 1e-5)

  // a lift along the seat's up moves her in that direction and keeps her facing
  assert.equal(placeAtSeat(dog, seat, scratch(), 0.25), true)
  parent.updateMatrixWorld(true)
  const up = new THREE.Vector3(0, 1, 0).applyQuaternion(seat.getWorldQuaternion(new THREE.Quaternion()))
  const dw2 = dog.getWorldPosition(new THREE.Vector3())
  assert.ok(Math.abs(dw2.clone().sub(sw).dot(up) - 0.25) < 1e-4)
  assert.ok(dw2.clone().sub(sw).cross(up).length() < 1e-4)
})

test('placeAtSeat leaves the dog where she is when there is no crate', () => {
  const parent = new THREE.Group()
  const dog = new THREE.Group()
  dog.position.set(1, 2, 3)
  parent.add(dog)
  assert.equal(placeAtSeat(dog, null, scratch()), false)
  assert.deepEqual(dog.position.toArray(), [1, 2, 3])
  assert.equal(placeAtSeat(dog, new THREE.Object3D(), scratch()), false) // not in the scene yet
})

test('hopOffSpot puts her on the ground just behind the rider', () => {
  const n = new THREE.Vector3(0, 1, 0)
  const fwd = new THREE.Vector3(0, 0, 1)
  const out = new THREE.Vector3()
  const side = new THREE.Vector3()
  hopOffSpot(n, fwd, out, side, 10.4)
  assert.ok(Math.abs(out.length() - 1) < 1e-6)
  assert.ok(out.dot(n) > 0.998) // a short step, still beside her
  const tang = out.clone().sub(n)
  tang.addScaledVector(n, -tang.dot(n))
  assert.ok(tang.dot(fwd) < 0) // behind, not under the front wheel
  assert.ok(tang.length() > 0.02)
})

test('hopArc leaves the crate and lands on the ground with a small hop', () => {
  const from = new THREE.Vector3(0, 1, 0)
  const ground = new THREE.Vector3(0, 1, 2)
  const up = new THREE.Vector3(0, 1, 0)
  const out = new THREE.Vector3()
  hopArc(from, ground, up, 0, out, 0.08)
  assert.ok(out.distanceTo(from) < 1e-6)
  hopArc(from, ground, up, 1, out, 0.08)
  assert.ok(out.distanceTo(ground) < 1e-6)
  hopArc(from, ground, up, 0.5, out, 0.08)
  assert.ok(Math.abs(out.z - 1) < 1e-6)
  assert.ok(Math.abs(out.y - (1 + 0.08)) < 1e-6)
  const goal = { sit: 0, hop: 0, lie: 1, crouch: 1, tailUp: 0, tailWag: 0, tongue: 0, mouth: 0 }
  hopPose(goal, 0)
  assert.equal(goal.sit, 1)
  assert.equal(goal.hop, 0)
  hopPose(goal, 0.5)
  assert.ok(goal.sit > 0.4 && goal.sit < 0.6)
  assert.ok(goal.hop > 0.9)
  hopPose(goal, 1)
  assert.equal(goal.sit, 0)
  assert.ok(Math.abs(goal.hop) < 1e-6)
})
