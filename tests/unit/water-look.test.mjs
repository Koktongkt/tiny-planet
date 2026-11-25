// node --test tests/unit — the shared water look: distance-to-shore attribute, the material's uniforms, lily pads
import test from 'node:test'; import assert from 'node:assert/strict'
import * as THREE from 'three'
import { R, ZONES, zv, waterAt, LAKE_W } from '../../src/world.js'
import { RUIN_COLS } from '../../src/world/zoneLayout.js'
import { shoreDist } from '../../src/world/shore.js'
import { bakeShore, shoreWater, LILY_PADS } from '../../src/world/waterLook.js'

test('aShore: deep in the middle of the lake, shallow at its rim', () => {
  const c = zv(ZONES.lake), q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), c.clone().normalize())
  const g = bakeShore(new THREE.SphereGeometry(R + LAKE_W, 48, 12, 0, Math.PI * 2, 0, ZONES.lake.r * 1.12), (v) => v.clone().applyQuaternion(q).normalize())
  const a = g.attributes.aShore; assert.ok(a, 'no aShore attribute')
  assert.ok(a.getX(0) > 0.5, `centre ${a.getX(0)}`)
  let shallow = 0; for (let i = a.count - 49; i < a.count; i++) if (a.getX(i) < 0.3) shallow++
  assert.ok(shallow >= 49 * 0.8, `only ${shallow} of 49 rim vertices shallow`) // not all: the river mouth opens the rim to open water
  for (let i = 0; i < a.count; i++) assert.ok(a.getX(i) >= 0 && a.getX(i) <= 0.9)
})

test('both water materials carry time, night and dusk', () => {
  for (const flow of [true, false]) { const m = shoreWater({ flow }); for (const u of ['uTime', 'uN', 'uD']) assert.ok(m.uniforms[u], `${u} missing (flow ${flow})`) }
})

test('lily pads float on the open lake, clear of the ruins', () => {
  assert.ok(LILY_PADS.length >= 5 && LILY_PADS.length <= 8, `${LILY_PADS.length} pads`)
  for (const p of LILY_PADS) {
    assert.ok(waterAt(p.n) && shoreDist(p.n) < -0.1, 'pad not on open water')
    for (const col of RUIN_COLS) assert.ok(col.n.angleTo(p.n) * R > 0.35, 'pad on a ruin column')
  }
})
