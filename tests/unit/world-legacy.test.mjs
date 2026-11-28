// node --test tests/unit — the frozen pre-rework layout (?world=old) still matches what shipped
import test from 'node:test'; import assert from 'node:assert/strict'
import { ZONES, TRAIN_LAT, HOUSES, height } from '../../src/world/legacy.js'
import { OLD_WORLD } from '../../src/world/flag.js'
import { dir } from '../../src/world.js'

test('legacy matches today\'s layout', () => {
  const { x, y, z, ...lake } = ZONES.lake
  assert.deepEqual(lake, { r: 0.2, lat: -0.55, lon: 0.9 })
  assert.equal(TRAIN_LAT, -0.95)
  assert.equal(HOUSES.length, 11)
  assert.equal(height(dir(1.05, 0.2)), -0.0003090205344109913)
})
test('OLD_WORLD is false outside the browser', () => { assert.equal(OLD_WORLD, false) })
