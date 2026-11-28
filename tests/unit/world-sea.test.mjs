// node --test tests/unit — the sea: depth below the surface, south of the shoreline.
import test from 'node:test'; import assert from 'node:assert/strict'
import { seaDepth, waterAt, dir, SEA_LAT, SEA_W, height } from '../../src/world.js'
import { region } from '../../src/world/regions.js'

test('sea depth helper', () => {
  for (let k = 0; k < 12; k++) assert.ok(seaDepth(dir(SEA_LAT - 0.1, k * 0.5)) > 0, 'positive well south of the shore')
  assert.equal(seaDepth(dir(region('village').lat, region('village').lon)), 0)
  const lake = region('lake'); assert.equal(seaDepth(dir(lake.lat, lake.lon)), 0, 'the lake is not the sea')
})
test('sea depth matches the sea floor, and waterAt follows it', () => {
  const n = dir(SEA_LAT - 0.2, 1)
  assert.equal(seaDepth(n), SEA_W - height(n))
  assert.equal(waterAt(n), seaDepth(n) > 0.12)
})
