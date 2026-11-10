// Touch post stack: noise off, bloom only at night, no canvas AA on top of composer MSAA.
// ?fx=full puts the previous touch stack back for A/B.
import test from 'node:test'
import assert from 'node:assert/strict'
import { fxPasses, nightFromPhase } from '../../src/fx.js'

test('nightFromPhase follows the same night band as the clock', () => {
  assert.equal(nightFromPhase(0.35), false) // ?t=day
  assert.equal(nightFromPhase(1.72), false) // ?t=dusk, night weight still under 0.5
  assert.equal(nightFromPhase(3.0), true) // ?t=night
})

test('desktop keeps bloom, noise and vignette, and skips canvas antialias', () => {
  const d = fxPasses({ touch: false, fx: null, night: false })
  assert.deepEqual(d, { antialias: false, bloom: true, noise: true, vignette: true, multisampling: 4 })
  assert.deepEqual(fxPasses({ touch: false, fx: 'full', night: true }), d)
})

test('touch day drops noise and bloom and keeps vignette', () => {
  assert.deepEqual(fxPasses({ touch: true, fx: null, night: false }), {
    antialias: false, bloom: false, noise: false, vignette: true, multisampling: 2,
  })
})

test('touch night keeps bloom so lamps still halo, and still drops noise', () => {
  assert.deepEqual(fxPasses({ touch: true, fx: null, night: true }), {
    antialias: false, bloom: true, noise: false, vignette: true, multisampling: 2,
  })
})

test('?fx=full restores the previous touch stack, including canvas antialias', () => {
  assert.deepEqual(fxPasses({ touch: true, fx: 'full', night: false }), {
    antialias: true, bloom: true, noise: true, vignette: true, multisampling: 2,
  })
})
