// node --test tests/unit — pet motor: continuous speed, arrival without overshoot, dead zone, bounded turn, step-turn, dt clamp
import test from 'node:test'; import assert from 'node:assert/strict'
import { MOTOR_DOG, MOTOR_CAT, newMotor, stepMotor, maxTurn, steerClear, toLocal } from '../../src/pets/motor.js'

const DT = 1 / 60
// a pet on a flat floor: yaw 0 faces +z; forward = (sin yaw, cos yaw)
function sim(cfg, target, speed, frames, each) {
  const m = newMotor(), pose = { x: 0, z: 0, yaw: 0 }
  for (let i = 0; i < frames; i++) {
    const t = typeof target === 'function' ? target(i) : target
    const l = toLocal(t.x - pose.x, t.z - pose.z, pose.yaw)
    const v0 = m.v, r = stepMotor(m, cfg, { x: l.x, z: l.z, speed }, DT)
    pose.yaw += r.dYaw; pose.x += Math.sin(pose.yaw) * m.v * DT; pose.z += Math.cos(pose.yaw) * m.v * DT
    each && each(m, pose, l, v0, i)
  }
  return { m, pose }
}

for (const [name, cfg] of [['dog', MOTOR_DOG], ['cat', MOTOR_CAT]]) {
  test(`${name}: speed has no steps`, () => {
    sim(cfg, { x: 0, z: 3 }, Math.min(1.5, cfg.maxSpeed), 400, (m, p, l, v0) => assert.ok(Math.abs(m.v - v0) <= Math.max(cfg.accel, cfg.decel) * DT + 1e-9, `jump ${m.v - v0}`))
  })
  test(`${name}: arrives without overshoot`, () => {
    let minZ = 9
    const { pose } = sim(cfg, { x: 0, z: 1 }, Math.min(1.5, cfg.maxSpeed), 600, (m, p) => { minZ = Math.min(minZ, 1 - p.z) })
    assert.ok(Math.hypot(pose.x, 1 - pose.z) < cfg.arrive, `ended ${1 - pose.z} away`)
    assert.ok(minZ > -0.02, `overshot by ${-minZ}`)
  })
  test(`${name}: turn rate bounded by speed`, () => {
    sim(cfg, (i) => ({ x: Math.sin(i / 40) * 2, z: Math.cos(i / 55) * 2 }), cfg.maxSpeed, 900, (m) => assert.ok(Math.abs(m.w) <= maxTurn(cfg, m.v) + 1e-9))
  })
  test(`${name}: step-turn creeps when the target is behind`, () => {
    let moved = false, turned = false
    sim(cfg, { x: 0, z: -1 }, 1, 30, (m, p, l) => { if (Math.abs(Math.atan2(l.x, l.z)) > 1.1) assert.ok(m.v <= cfg.creep + 1e-9, `v ${m.v}`); if (m.v > 0) moved = true; if (Math.abs(m.w) > 0) turned = true })
    assert.ok(moved && turned)
  })
  test(`${name}: big dt is clamped`, () => {
    const m = newMotor(); stepMotor(m, cfg, { x: 0, z: 3, speed: 1 }, 0.5)
    assert.ok(m.v <= cfg.accel * 0.05 + 1e-9)
  })
}

test('dead zone holds after arrival', () => {
  const cfg = MOTOR_DOG, { m, pose } = sim(cfg, { x: 0, z: 1 }, 1.5, 600)
  assert.equal(m.moving, false)
  const near = { x: pose.x, z: pose.z + cfg.deadOut * 0.6 }
  for (let i = 0; i < 120; i++) { const l = toLocal(near.x - pose.x, near.z - pose.z, pose.yaw); stepMotor(m, cfg, { x: l.x, z: l.z, speed: 1.5 }, DT); assert.equal(m.moving, false); assert.equal(m.v, 0) }
  const far = { x: pose.x, z: pose.z + cfg.deadOut * 1.2 }, l = toLocal(far.x - pose.x, far.z - pose.z, pose.yaw)
  stepMotor(m, cfg, { x: l.x, z: l.z, speed: 1.5 }, DT); assert.equal(m.moving, true)
})

test('steerClear', () => {
  const blocked = steerClear(0, (a) => Math.abs(a) >= 0.5)
  assert.ok(Math.abs(blocked) >= 0.35, `got ${blocked}`)
  assert.ok(Math.abs(steerClear(0.3, () => true) - 0.3) < 1e-6)
  assert.equal(steerClear(0.3, () => false), 0.3)
})

test('toLocal: a target at bearing b reads as atan2(x, z) = b', () => {
  for (const yaw of [0, 1, -2.5]) for (const b of [0.4, -1.2, 2.8]) { const l = toLocal(Math.sin(yaw + b), Math.cos(yaw + b), yaw); assert.ok(Math.abs(Math.atan2(l.x, l.z) - b) < 1e-9) }
})

test('track mode: his place moving along just ahead of him keeps him walking at its pace (no stop-start)', () => {
  const cfg = MOTOR_DOG, m = newMotor(); let stops = 0
  for (let i = 0; i < 300; i++) { // the place runs 0.05 ahead (where the follow law holds it at her pace)
    stepMotor(m, cfg, { x: 0, z: 0.05, speed: Math.min(0.6, i * 0.02), track: true, face: 0 }, DT)
    if (i > 60 && !m.moving) stops++ }
  assert.equal(stops, 0); assert.ok(Math.abs(m.v - 0.6) < 0.05, `v ${m.v}`)
})

test('track mode with a still target near him: he stops', () => {
  const m = newMotor(); for (let i = 0; i < 120; i++) stepMotor(m, MOTOR_DOG, { x: 0, z: 0.03, speed: 0, track: true }, DT)
  assert.equal(m.moving, false); assert.equal(m.v, 0)
})
