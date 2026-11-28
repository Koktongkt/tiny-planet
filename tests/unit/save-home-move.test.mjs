// node --test tests/unit  — v8: outdoor decor follows her house to its new spot
import test from 'node:test'; import assert from 'node:assert/strict'
import * as THREE from 'three'
import { migrate, SAVE_VERSION } from '../../src/save/schema.js'
import { moveHomeRel, OLD_HOME, NEW_HOME } from '../../src/save/homeMove.js'

const UP = new THREE.Vector3(0, 1, 0)
const dir = (lat, lon) => new THREE.Vector3(Math.cos(lat) * Math.sin(lon), Math.sin(lat), Math.cos(lat) * Math.cos(lon))
const frame = (h) => new THREE.Quaternion().setFromUnitVectors(UP, dir(h.lat, h.lon)).multiply(new THREE.Quaternion().setFromAxisAngle(UP, h.spin))
const at = (h, off) => dir(h.lat, h.lon).add(off.clone().applyQuaternion(frame(h)))
const local = (h, p) => p.clone().sub(dir(h.lat, h.lon)).applyQuaternion(frame(h).invert())

test('decor keeps its offset from the house', () => {
  const off = new THREE.Vector3(0.6, 0, 0.4)
  const out = new THREE.Vector3(...moveHomeRel(at(OLD_HOME, off).toArray(), OLD_HOME, NEW_HOME))
  const back = local(NEW_HOME, out)
  for (const [a, b] of [[back.x, 0.6], [back.y, 0], [back.z, 0.4]]) assert.ok(Math.abs(a - b) < 1e-6, `${back.toArray()}`)
})
test('a unit direction stays unit length and lands near the new home', () => {
  const n = at(OLD_HOME, new THREE.Vector3(0.03, 0, 0.02)).normalize().toArray()
  const m = new THREE.Vector3(...moveHomeRel(n, OLD_HOME, NEW_HOME))
  assert.ok(Math.abs(m.length() - 1) < 1e-9)
  assert.ok(m.angleTo(dir(NEW_HOME.lat, NEW_HOME.lon)) < 0.05)
})
const OLD_N = at(OLD_HOME, new THREE.Vector3(0.05, 0, 0.03)).normalize().toArray()
const v7 = () => ({ v: 7, day: 4, placed: [{ uid: 'a', item: 'wreath', rot: 0, n: OLD_N }, { uid: 'b', item: 'basket', rot: 0, n: [0, 1, 0], in: [0.1, 0.2] }],
  garden: { day: 4, plots: [{ id: 'plot-0', crop: 'turnip' }] }, dig: { taken: { 2: 3 } } })
test('indoor decor untouched', () => {
  const s = migrate(v7()); assert.deepEqual(s.placed[1], v7().placed[1])
})
test('v7 save migrates to v8 with garden and dig.taken unchanged', () => {
  const s = migrate(v7())
  assert.equal(s.v, 8); assert.equal(SAVE_VERSION, 8)
  assert.deepEqual(s.garden, v7().garden); assert.deepEqual(s.dig.taken, { 2: 3 })
  assert.deepEqual(s.placed[0].n, moveHomeRel(OLD_N, OLD_HOME, NEW_HOME))
  assert.notDeepEqual(s.placed[0].n, OLD_N)
})
test('v8 save unchanged', () => {
  const s = migrate({ ...v7(), v: 8 }); assert.deepEqual(s.placed, v7().placed)
})
