// Far touch villagers skip per-frame path/pace/anchor work, then catch up the missed time in
// the same 0.05s slices the frame loop already uses, so waking does not teleport them.
import test from 'node:test'
import assert from 'node:assert/strict'
import { walkerPlan, SLEEP_DIST, THROTTLE } from '../../src/npc/sleep.js'

const sum = (a) => a.reduce((s, x) => s + x, 0)

test('desktop and nearby touch villagers take one step of the frame dt', () => {
  for (const touch of [false, true]) {
    const p = walkerPlan({ touch, talking: false, dist: touch ? 4 : 30, acc: 0, dt: 0.016, placed: true })
    assert.deepEqual(p.steps, [0.016])
    assert.equal(p.acc, 0)
    assert.equal(p.full, true)
  }
})

test('a far touch villager sleeps, then a throttle tick catches up the whole gap', () => {
  let acc = 0, stepped = 0
  for (let i = 0; i < 40; i++) {
    const p = walkerPlan({ touch: true, talking: false, dist: SLEEP_DIST + 2, acc, dt: 0.016, placed: true })
    assert.equal(p.full, false)
    if (!p.steps.length) assert.ok(Math.abs(p.acc - (acc + 0.016)) < 1e-9)
    else { assert.equal(p.acc, 0); assert.ok(Math.abs(sum(p.steps) - (acc + 0.016)) < 1e-9); stepped++ }
    acc = p.acc
  }
  assert.ok(stepped >= 1 && stepped < 40)
  const wake = walkerPlan({ touch: true, talking: false, dist: 3, acc, dt: 0.016, placed: true })
  assert.equal(wake.full, true)
  assert.equal(wake.acc, 0)
  assert.ok(Math.abs(sum(wake.steps) - (acc + 0.016)) < 1e-9)
  for (const s of wake.steps) assert.ok(s <= 0.05 + 1e-9)
})

test('talking, or not yet placed, never sleeps', () => {
  const far = { touch: true, talking: false, dist: 40, acc: 0, dt: 0.016, placed: true }
  assert.equal(walkerPlan({ ...far, talking: true }).full, true)
  assert.equal(walkerPlan({ ...far, placed: false }).steps.length, 1)
  assert.ok(THROTTLE > 0.2 && THROTTLE < 1)
})

test('catch-up slices sum to the missed time and never exceed the frame clamp', () => {
  const p = walkerPlan({ touch: true, talking: false, dist: 30, acc: 0.48, dt: 0.02, placed: true })
  assert.equal(p.full, false)
  assert.ok(Math.abs(sum(p.steps) - 0.5) < 1e-9)
  assert.ok(p.steps.every(s => s <= 0.05 + 1e-9))
  assert.ok(p.steps.length >= 10)
})
