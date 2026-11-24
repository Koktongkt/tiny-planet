// node --test tests/unit — rig loco helpers: body height / pitch / roll from the planted feet, spring step
import test from 'node:test'; import assert from 'node:assert/strict'
import { bodyFromFeet, legAngles, spring } from '../../src/pets/gait.js'

const L = 0.067, HIPS = [[0.028, 0.04], [-0.028, 0.04], [0.03, -0.039], [-0.03, -0.039]]
const under = () => HIPS.map(([x, z]) => ({ x, z, y: 0, stance: true }))

test('feet under the hips: level body at rest height', () => {
  const b = bodyFromFeet(under(), HIPS, L)
  assert.ok(Math.abs(b.y - L) < 1e-9 && Math.abs(b.pitch) < 1e-9 && Math.abs(b.roll) < 1e-9)
})

test('front feet spread: front sinks, nose-down pitch is positive', () => {
  const legs = under(); legs[0].z += 0.3 * L; legs[1].z -= 0.3 * L
  const b = bodyFromFeet(legs, HIPS, L), hF = L * Math.cos(Math.asin(0.3))
  assert.ok(Math.abs(b.y - (hF + L) / 2) < 1e-9); assert.ok(b.pitch > 0)
})

test('left feet spread: left side sinks, roll is negative', () => {
  const legs = under(); legs[0].z += 0.3 * L; legs[2].z -= 0.3 * L
  assert.ok(bodyFromFeet(legs, HIPS, L).roll < 0)
})

test('no feet down in a pair (flight): that pair rides at rest height', () => {
  const legs = under(); legs[0].stance = legs[1].stance = false; legs[2].z += 0.3 * L; legs[3].z += 0.3 * L
  const b = bodyFromFeet(legs, HIPS, L); assert.ok(b.pitch < 0) // hind low, front at rest: nose up
})

test('legAngles takes the actual hip height', () => {
  const a = legAngles({ x: 0.02, z: 0.03, y: 0 }, [0.02, 0.03], L, L * 0.9); assert.ok(Math.abs(a.len - 0.9) < 1e-9)
})

test('spring settles without blowing up at a big dt', () => {
  const s = { x: 0, v: 0 }
  for (let i = 0; i < 200; i++) spring(s, 1, 400, 0.7, 0.05)
  assert.ok(Math.abs(s.x - 1) < 1e-3)
  const t = { x: 0, v: 0 }; let peak = 0
  for (let i = 0; i < 300; i++) { spring(t, 1, 400, 0.7, 1 / 60); peak = Math.max(peak, t.x) }
  assert.ok(peak < 1.1, `overshoot ${peak}`)
})
