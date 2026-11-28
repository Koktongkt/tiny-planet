import test from 'node:test'
import assert from 'node:assert/strict'
import { grassGeo, fernGeo, bushGeo, flowerGeo, floweringBushGeo } from '../../src/art/vegetation/kit.js'

const shapes = [grassGeo, tier => grassGeo(tier, true), fernGeo, bushGeo, flowerGeo, floweringBushGeo]
test('plant tiers are single mergeable vertex-coloured meshes with finite attributes and cheaper distant detail', () => {
  for (const shape of shapes) {
    let previous = Infinity
    for (const tier of [0, 1, 2]) {
      const g = shape(tier), p = g.attributes.position
      assert.ok(p.count < previous)
      assert.equal(p.count % 3, 0)
      for (const k of ['normal', 'color', 'petalTint']) {
        assert.equal(g.attributes[k].count, p.count)
        assert.ok(g.attributes[k].array.every(Number.isFinite))
      }
      assert.ok(p.array.every(Number.isFinite))
      g.computeBoundingBox()
      assert.ok(g.boundingBox.min.y > -0.03)
      assert.ok(g.boundingBox.max.y < 0.3)
      previous = p.count
      g.dispose()
    }
  }
})
test('flower has rooted geometry, tinted petals and fixed-colour leaves and centre', () => {
  const g = flowerGeo()
  const mix = g.attributes.petalTint.array
  assert.ok(mix.some(x => x === 1))
  assert.ok(mix.some(x => x === 0))
  g.computeBoundingBox()
  assert.ok(Math.abs(g.boundingBox.min.y) < 0.001)
  g.dispose()
})
