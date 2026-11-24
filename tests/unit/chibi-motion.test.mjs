import test from 'node:test'
import assert from 'node:assert/strict'
import { HER_MOTION, motionProfile, between } from '../../src/art/chibi/motion.js'

test('motionProfile overrides only what is given and keeps the base intact', () => {
  const grandma = motionProfile(HER_MOTION, { name: 'fuku', lively: 0.6, sitAfter: 8, can: { skip: false }, sets: { day: ['look', 'hum'] }, gestures: { wood: 'pluck' } })
  assert.equal(grandma.name, 'fuku'); assert.equal(grandma.lively, 0.6); assert.equal(grandma.sitAfter, 8)
  assert.equal(grandma.can.skip, false); assert.equal(grandma.can.wave, true) // nested objects merge
  assert.deepEqual(grandma.sets.day, ['look', 'hum']); assert.deepEqual(grandma.sets.rain, HER_MOTION.sets.rain)
  assert.equal(grandma.gestures.wood, 'pluck')
  assert.equal(HER_MOTION.can.skip, true); assert.equal(HER_MOTION.sitAfter, 18) // base untouched
})

test('every fidget in a set has a duration', () => {
  for (const [k, list] of Object.entries(HER_MOTION.sets)) for (const f of list) assert.ok(HER_MOTION.fidgets[f] > 0, `${k}: ${f}`)
})

test('between stays in range', () => {
  for (let i = 0; i < 50; i++) { const v = between(Math.random, [5, 11]); assert.ok(v >= 5 && v <= 11) }
})
