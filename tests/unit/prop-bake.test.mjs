// Gather props on touch collapse to one coloured mesh + one ink hull, same triangles and colours.
import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import { bakePropMeshes } from '../../src/game/propBake.js'

function groupOf(...meshes) {
  const root = new THREE.Group()
  root.add(...meshes)
  root.updateMatrixWorld(true)
  return root
}

test('bakePropMeshes folds opaque parts into one vertex-coloured body and one ink hull', () => {
  const box = new THREE.BoxGeometry(1, 1, 1)
  const body = new THREE.Mesh(box, new THREE.MeshToonMaterial({ color: '#ff0000' }))
  body.position.set(0, 2, 0)
  const hull = new THREE.Mesh(box, new THREE.MeshBasicMaterial({ color: '#4a3a35', side: THREE.BackSide }))
  hull.scale.setScalar(1.12)
  const baked = bakePropMeshes(groupOf(body, hull))
  assert.ok(baked && baked.body && baked.hull)
  assert.equal(baked.body.attributes.color.count, baked.body.attributes.position.count)
  assert.ok(Math.abs(baked.body.attributes.color.getX(0) - body.material.color.r) < 1e-5)
  assert.ok(Math.abs(baked.body.attributes.color.getY(0) - body.material.color.g) < 1e-5)
  // the lifted body sits around y=2, not at the origin
  let maxY = -Infinity
  const p = baked.body.attributes.position
  for (let i = 0; i < p.count; i++) maxY = Math.max(maxY, p.getY(i))
  assert.ok(maxY > 2)
  assert.equal(baked.hull.attributes.position.count, box.toNonIndexed().attributes.position.count)
  box.dispose()
})

test('bakePropMeshes keeps every opaque triangle and refuses glow or glass', () => {
  const a = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), new THREE.MeshToonMaterial({ color: '#00ff00' }))
  const b = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), new THREE.MeshToonMaterial({ color: '#0000ff' }))
  b.position.set(0.5, 0, 0)
  const baked = bakePropMeshes(groupOf(a, b))
  const srcTris = a.geometry.index.count / 3 + b.geometry.index.count / 3
  const outTris = baked.body.index ? baked.body.index.count / 3 : baked.body.attributes.position.count / 3
  assert.equal(outTris, srcTris)
  const glow = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 4), new THREE.MeshBasicMaterial({ color: '#fff', transparent: true, opacity: 0.4 }))
  assert.equal(bakePropMeshes(groupOf(glow)), null)
  const lamp = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial({ color: '#ffd27a', toneMapped: false }))
  assert.equal(bakePropMeshes(groupOf(lamp)), null)
})
