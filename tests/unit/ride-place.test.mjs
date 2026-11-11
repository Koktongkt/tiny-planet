// On a phone the bicycle control lives in the Menu. Desktop keeps the floating chip.
import test from 'node:test'
import assert from 'node:assert/strict'
import { rideShows } from '../../src/ui/ridePlace.js'

test('no bicycle means no control on either device', () => {
  assert.deepEqual(rideShows({ touch: true, mode: null }), { chip: false, menu: false, label: null })
  assert.deepEqual(rideShows({ touch: false, mode: null }), { chip: false, menu: false, label: null })
})

test('touch puts Ride and Hop off in the menu only', () => {
  assert.deepEqual(rideShows({ touch: true, mode: 'on' }), { chip: false, menu: true, label: 'Ride' })
  assert.deepEqual(rideShows({ touch: true, mode: 'off' }), { chip: false, menu: true, label: 'Hop off' })
})

test('desktop keeps the floating chip and does not add a menu tile', () => {
  assert.deepEqual(rideShows({ touch: false, mode: 'on' }), { chip: true, menu: false, label: 'Ride' })
  assert.deepEqual(rideShows({ touch: false, mode: 'off' }), { chip: true, menu: false, label: 'Hop off' })
})
