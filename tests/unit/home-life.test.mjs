// Her house, part A: walk-to stepping, the idle director, idle-spot choice and indoor glances (pure logic).
import test from 'node:test'
import assert from 'node:assert/strict'
import { makeWalk, stepWalk, makeIdle, stepIdle, pickSpot, pickGlance, IDLE_WALK_AFTER, IDLE_RANGE } from '../../src/home/homeLife.js'

// a stand-in for Room.jsx's movement: walk toward hp.target, clear it on arrival (d < 0.05)
const move = (hp, dt, speed = 0.5) => { const t = hp.target; if (!t) return; const dx = t.x - hp.x, dz = t.z - hp.z, d = Math.hypot(dx, dz); if (d < 0.05) { hp.target = null; return } const s = Math.min(d, speed * dt); hp.x += dx / d * s; hp.z += dz / d * s; hp.yaw = Math.atan2(dx, dz) }
const run = (secs, f, dt = 1 / 60) => { let r; for (let i = 0; i < Math.round(secs / dt); i++) { r = f(dt); if (r === 'stop') break } return r }

test('a walk reaches the stand, turns to face the activity, then is done', () => {
  const hp = { x: 0, z: 0, yaw: 0, target: null }, W = makeWalk(hp, [0.3, 0], -Math.PI / 2)
  assert.deepEqual(hp.target, { x: 0.3, z: 0 })
  const seen = new Set(); let st
  run(3, dt => { move(hp, dt); st = stepWalk(W, hp, dt); seen.add(st); if (st === 'done') return 'stop' })
  assert.equal(st, 'done'); assert.ok(seen.has('walking') && seen.has('turning'))
  assert.ok(Math.abs(Math.atan2(Math.sin(hp.yaw + Math.PI / 2), Math.cos(hp.yaw + Math.PI / 2))) < 0.1, `yaw ${hp.yaw}`)
})
test('input clearing the target cancels the walk', () => {
  const hp = { x: 0, z: 0, yaw: 0, target: null }, W = makeWalk(hp, [0.4, 0], 0)
  move(hp, 0.1); assert.equal(stepWalk(W, hp, 0.1), 'walking')
  hp.target = null; assert.equal(stepWalk(W, hp, 0.016), 'cancelled')
  const W2 = makeWalk(hp, [0.4, 0], 0); hp.target = { x: 1, z: 1 }; assert.equal(stepWalk(W2, hp, 0.016), 'cancelled') // a tap elsewhere
})
test('no progress for 0.6 s is stuck', () => {
  const hp = { x: 0, z: 0, yaw: 0, target: null }, W = makeWalk(hp, [0.4, 0], 0)
  const st = run(0.7, dt => { const s = stepWalk(W, hp, dt); if (s !== 'walking') return 'stop' }) // she never moves (blocked by furniture)
  assert.equal(st, 'stop', 'stuck within 0.7 s'); assert.equal(stepWalk(W, hp, 0.016), 'stuck')
})
test('the idle director fires once after 15 s still, and re-arms only after she moves', () => {
  const I = makeIdle(); let fired = 0
  run(IDLE_WALK_AFTER - 0.5, dt => { if (stepIdle(I, { still: true, blocked: false }, dt)) fired++ })
  assert.equal(fired, 0)
  run(1, dt => { if (stepIdle(I, { still: true, blocked: false }, dt) === 'walk') fired++ })
  assert.equal(fired, 1)
  run(30, dt => { if (stepIdle(I, { still: true, blocked: false }, dt)) fired++ })
  assert.equal(fired, 1, 'once per idle stretch')
  stepIdle(I, { still: false, blocked: false }, 0.1)
  run(IDLE_WALK_AFTER + 0.5, dt => { if (stepIdle(I, { still: true, blocked: false }, dt)) fired++ })
  assert.equal(fired, 2)
})
test('a blocked idle (prompt showing, Mochi weaving) defers the walk until unblocked', () => {
  const I = makeIdle(); let fired = 0
  run(20, dt => { if (stepIdle(I, { still: true, blocked: true }, dt)) fired++ }); assert.equal(fired, 0)
  if (stepIdle(I, { still: true, blocked: false }, 0.016)) fired++; assert.equal(fired, 1)
})
test('pickSpot: nearest in range whose condition holds', () => {
  const hp = { x: 0, z: 0 }
  const spots = [{ id: 'far', stand: [IDLE_RANGE + 0.1, 0] }, { id: 'b', stand: [0.4, 0] }, { id: 'a', stand: [0.2, 0.1] }, { id: 'night', stand: [0.1, 0], when: c => c.night > 0.4 }]
  assert.equal(pickSpot(hp, spots, { night: 0 }).id, 'a')
  assert.equal(pickSpot(hp, spots, { night: 1 }).id, 'night')
  assert.equal(pickSpot({ x: 5, z: 5 }, spots, {}), null)
})
test('pickGlance: Mochi when close and up to something, the window by day, the stove at night', () => {
  const r = () => 0.5, base = { catD: 5, catBusy: false, day: 0, night: 0, windowD: 5, stoveD: 5 }
  assert.equal(pickGlance(base, r), null)
  assert.equal(pickGlance({ ...base, catD: 0.5, catBusy: true, day: 1, windowD: 0.5 }, r), 'cat')
  assert.equal(pickGlance({ ...base, catD: 0.5, catBusy: false }, r), null)
  assert.equal(pickGlance({ ...base, day: 1, windowD: 1 }, r), 'window')
  assert.equal(pickGlance({ ...base, day: 0.2, windowD: 1 }, r), null)
  assert.equal(pickGlance({ ...base, night: 0.8, stoveD: 0.8 }, r), 'stove')
})

// ---------- part C ----------
import { homeState, fireFlare, tossVel } from '../../src/home/homeLife.js'
test('homeState fills curtains open and lamps on, keeping what is saved and other fields', () => {
  const s = { day: 3 }; const h = homeState(s)
  assert.deepEqual(h, { curtains: true, lamps: { desk: true, night: true } }); assert.equal(s.home, h); assert.equal(s.day, 3)
  const s2 = { home: { curtains: false, lamps: { desk: false } } }; assert.deepEqual(homeState(s2), { curtains: false, lamps: { desk: false, night: true } })
  const s3 = { home: { curtains: 'x', lamps: 5 } }; assert.deepEqual(homeState(s3), { curtains: true, lamps: { desk: true, night: true } })
})
test('fireFlare decays to nothing over a few minutes', () => {
  let f = 1; for (let i = 0; i < 60 * 30; i++) f = fireFlare(f, 1 / 60); assert.ok(f > 0.5 && f < 0.95, `after 30 s ${f}`)
  for (let i = 0; i < 60 * 200; i++) f = fireFlare(f, 1 / 60); assert.equal(f, 0)
})
test('tossVel throws along her facing', () => {
  const [vx, vz] = tossVel(0); assert.ok(Math.abs(vx) < 1e-9 && vz > 0.8)
  const [ax, az] = tossVel(Math.PI / 2, 2); assert.ok(Math.abs(ax - 2) < 1e-9 && Math.abs(az) < 1e-9)
})
