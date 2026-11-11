// Night hides butterflies: no per-frame update and no draw while they rest,
// and dawn poses them from the clock rather than from a frozen step.
import test from 'node:test'
import assert from 'node:assert/strict'
import { butterfliesAwake, butterflyFrame, butterflyAngle } from '../../src/butterflies.js'

test('day and dusk keep butterflies awake, night rests them', () => {
  assert.equal(butterfliesAwake(0), true)
  assert.equal(butterfliesAwake(0.5), true) // dusk weight, still under the hide line
  assert.equal(butterfliesAwake(0.6), false)
  assert.equal(butterfliesAwake(1), false)
})

test('a resting frame skips the update and the draw', () => {
  assert.deepEqual(butterflyFrame(1, true), { update: false, visible: false, awake: false, resume: false })
})

test('dawn resumes with a fresh pose from the clock', () => {
  const slept = butterflyFrame(1, true)
  assert.equal(slept.update, false)
  const dawn = butterflyFrame(0, false)
  assert.deepEqual(dawn, { update: true, visible: true, awake: true, resume: true })
  const atDusk = butterflyAngle(10, 1.25)
  const atDawn = butterflyAngle(40, 1.25)
  assert.notEqual(atDawn, atDusk)
  assert.equal(atDawn, 40 * 0.35 + 1.25)
})

test('an already-awake frame keeps updating', () => {
  assert.deepEqual(butterflyFrame(0.2, true), { update: true, visible: true, awake: true, resume: false })
})
