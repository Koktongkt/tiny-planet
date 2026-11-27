import test from 'node:test'
import assert from 'node:assert/strict'
import { HER_MOTION, FUKU_MOTION, HOSHINO_MOTION, KIKO_MOTION, motionProfile, between } from '../../src/art/chibi/motion.js'

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

test('Fuku and Hoshino profiles: every fidget in a set has a duration, her base is untouched', () => {
  assert.equal(HER_MOTION.lively, 1)
  assert.equal(HER_MOTION.can.skip, true)
  assert.ok(!('restActs' in HER_MOTION))
  for (const P of [FUKU_MOTION, HOSHINO_MOTION]) {
    assert.ok(P.lively < 1)
    assert.equal(P.can.skip, false)
    assert.equal(P.can.skid, false)
    assert.ok(Array.isArray(P.restActs) && P.restActs.length)
    for (const [k, list] of Object.entries(P.sets)) for (const f of list) assert.ok(P.fidgets[f] > 0, `${P.name} ${k}: ${f}`)
  }
  assert.ok(FUKU_MOTION.fidgets.tea > 0 && FUKU_MOTION.sets.seated.includes('tea'))
  assert.ok(HOSHINO_MOTION.fidgets.notebook > 0 && HOSHINO_MOTION.sets.day.includes('notebook'))
  assert.ok(HOSHINO_MOTION.sets.day.includes('glasses'))
})


test('Kiko has a grounded draft motion profile with valid fidget durations', () => {
  assert.equal(KIKO_MOTION.name, 'kiko')
  for (const action of ['skip', 'skid', 'sit', 'lie']) assert.equal(KIKO_MOTION.can[action], false)
  assert.equal(KIKO_MOTION.can.wave, true)
  for (const list of Object.values(KIKO_MOTION.sets)) for (const f of list) assert.ok(KIKO_MOTION.fidgets[f] > 0, f)
  assert.equal(HER_MOTION.can.skip, true)
})
