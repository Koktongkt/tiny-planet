// Pets offer their bubble only when invited: after 3 s standing still beside them, or when they're asking.
// Once the bubble has been up and you pet them or walk away, it rests for 10 minutes.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { PET_PROMPT, petOffer, petLeft, newRest } from '../../src/pets/petPrompt.js'
import { pickTarget } from '../../src/game/prompt/logic.js'

test('numbers', () => assert.deepEqual(PET_PROMPT, { stillMs: 3000, restMs: 600000 }))
test('quiet while walking or pausing briefly; bubble after 3 s still', () => {
  const r = newRest()
  assert.equal(petOffer(r, { asking: false, stillMs: 0, now: 0 }), 'quiet')
  assert.equal(petOffer(r, { asking: false, stillMs: 2999, now: 0 }), 'quiet')
  assert.equal(petOffer(r, { asking: false, stillMs: 3000, now: 0 }), 'bubble')
})
test('once up, the bubble stays while you stay near, even if you shuffle', () => {
  const r = newRest(); petOffer(r, { asking: false, stillMs: 3000, now: 0 })
  assert.equal(petOffer(r, { asking: false, stillMs: 0, now: 100 }), 'bubble')
})
test('pet or walk away after it showed: 10 minutes of rest', () => {
  const r = newRest(); petOffer(r, { asking: false, stillMs: 3000, now: 1000 }); petLeft(r, 2000)
  assert.equal(petOffer(r, { asking: false, stillMs: 9000, now: 2000 + 599999 }), 'quiet')
  assert.equal(petOffer(r, { asking: false, stillMs: 3000, now: 2000 + 600000 }), 'bubble')
})
test('leaving before it ever showed starts no rest', () => {
  const r = newRest(); petLeft(r, 500)
  assert.equal(petOffer(r, { asking: false, stillMs: 3000, now: 600 }), 'bubble')
})
test('a pet that is asking shows the bubble even while resting', () => {
  const r = newRest(); petOffer(r, { asking: false, stillMs: 3000, now: 0 }); petLeft(r, 0)
  assert.equal(petOffer(r, { asking: true, stillMs: 0, now: 10 }), 'bubble')
})
test('a quiet pet never takes E from something else in range', () => {
  const pip = { o: { id: 'dog', quiet: true }, d: 0.1, lim: 0.42, cos: 1 }, berry = { o: { id: 'b' }, d: 0.4, lim: 0.42, cos: -1 }
  assert.equal(pickTarget([pip, berry], 'dog').o.id, 'b')
  assert.equal(pickTarget([pip], null).o.id, 'dog') // alone, E still pets quietly
})
test('stillness: counts while she stays put, resets the frame she moves (a teleport too)', async () => {
  const { STILL, tickStill } = await import('../../src/game/prompt/still.js')
  tickStill(0, 0, 0, 0.5); assert.equal(STILL.ms, 0) // first frame: no history
  tickStill(0, 0, 0, 1); tickStill(0, 0, 0, 2.5); assert.equal(STILL.ms, 3500)
  tickStill(0.5, 0, 0, 1); assert.equal(STILL.ms, 0)
})
