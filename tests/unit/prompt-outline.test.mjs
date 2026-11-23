// Gold outline: swaps the ink hull per mesh, restores it, and keeps up when the prop's meshes are replaced (bake).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import { setOutline, GOLD_HULL } from '../../src/game/prompt/outline.js'

const ink = new THREE.MeshBasicMaterial({ color: '#4a3a35', side: THREE.BackSide })
const body = () => new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshToonMaterial())
const hull = () => new THREE.Mesh(new THREE.BoxGeometry(), ink)

test('targeted prop: hull turns gold, back to ink when untargeted', () => {
  const g = new THREE.Group(), h = hull(); g.add(body(), h)
  setOutline({ id: 'a', obj: g }, 0, false); assert.equal(h.material, GOLD_HULL)
  setOutline(null, 0, false); assert.equal(h.material, ink)
})
test('meshes replaced after targeting (prop bake) get the gold too', () => {
  const g = new THREE.Group(); g.add(body(), hull())
  setOutline({ id: 'b', obj: g }, 0, false)
  g.clear(); const h2 = hull(); g.add(body(), h2) // the merged prop replaces its parts
  setOutline({ id: 'b', obj: g }, 0.1, false); assert.equal(h2.material, GOLD_HULL)
  setOutline(null, 0, false); assert.equal(h2.material, ink)
})
test('see-through silhouette only while blocked', () => {
  const g = new THREE.Group(), b = body(); g.add(b, hull())
  const see = () => b.children.filter(c => c.material && c.material.depthTest === false)
  setOutline({ id: 'c', obj: g }, 0, false); assert.equal(see().length, 1); assert.equal(see()[0].visible, false)
  setOutline({ id: 'c', obj: g }, 0, true); assert.equal(see()[0].visible, true)
  setOutline({ id: 'c', obj: g }, 0, true); assert.equal(see().length, 1) // not added twice
  setOutline(null, 0, false); assert.equal(see().length, 0)
})
