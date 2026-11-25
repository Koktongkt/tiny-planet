// node --test tests/unit — the shore kit: grass lip, soil ribbon (fallback), foam beads, ink waterline; sector chunks
import test from 'node:test'; import assert from 'node:assert/strict'
import * as THREE from 'three'
import { R, ZONES, zv, around, onBridgeDeck, JUMPS } from '../../src/world.js'
import { PIERS, LAKE_DOCK_B } from '../../src/world/zoneLayout.js'
import { inCove } from '../../src/world/shore.js'
import { buildShoreKit, chunkKit, KEEP_CLEAR } from '../../src/world/shoreKit.js'

const fine = buildShoreKit({ fine: true }), coarse = buildShoreKit({ fine: false })
const tris = (g) => g ? (g.index ? g.index.count : g.attributes.position.count) / 3 : 0
const dirs = (g) => { const p = g.attributes.position, out = []; for (let i = 0; i < p.count; i += 3) out.push(new THREE.Vector3().fromBufferAttribute(p, i).normalize()); return out }

test('merged parts; the soil ribbon only as the fallback', () => {
  for (const k of ['lip', 'beads', 'ink']) assert.ok(fine[k] instanceof THREE.BufferGeometry && tris(fine[k]) > 1000, `${k} missing`)
  assert.equal(fine.soil, null); assert.ok(coarse.soil instanceof THREE.BufferGeometry && tris(coarse.soil) > 1000)
})

test('budget: every part together ≤ 150k triangles', () => {
  for (const kit of [fine, coarse]) { const t = tris(kit.lip) + tris(kit.beads) + tris(kit.ink) + tris(kit.soil); assert.ok(t <= 150000, `${t} triangles`) }
})

test('coves: no lip, beads still there', () => {
  assert.ok(!dirs(fine.lip).some(n => inCove(n)), 'a lip in a cove'); assert.ok(dirs(fine.beads).some(n => inCove(n)), 'no beads in the coves')
})

test('clear of bridge decks, piers, the lake dock and jump stones', () => {
  const lake = zv(ZONES.lake), dock = around(lake, ZONES.lake.r * 1.06, LAKE_DOCK_B)
  const nearSeg = (n, a, b, d) => { for (let t = 0; t <= 1; t += 0.05) if (a.clone().lerp(b, t).normalize().angleTo(n) * R < d) return true; return false }
  for (const k of ['lip', 'beads']) for (const n of dirs(fine[k])) {
    assert.ok(!onBridgeDeck(n), `${k} on a bridge deck`)
    for (const p of PIERS) assert.ok(!nearSeg(n, p.root, p.tip, 0.15), `${k} on a pier`)
    assert.ok(dock.angleTo(n) * R > 0.15, `${k} on the lake dock`)
    for (const j of JUMPS) assert.ok(j.c.angleTo(n) * R > 0.25, `${k} on a jump stone`)
  }
  assert.ok(KEEP_CLEAR.length >= PIERS.length + 1)
})

test('chunks: one body and one outline per sector, all triangles kept', () => {
  const ch = chunkKit(fine)
  assert.ok(ch.length >= 8 && ch.length <= 40, `${ch.length} chunks`)
  for (const c of ch) assert.ok(c.body instanceof THREE.BufferGeometry && c.hull instanceof THREE.BufferGeometry)
  const body = ch.reduce((a, c) => a + tris(c.body), 0), hull = ch.reduce((a, c) => a + tris(c.hull), 0)
  assert.equal(body, tris(fine.lip) + tris(fine.beads) + tris(fine.ink)); assert.equal(hull, tris(fine.lip) + tris(fine.beads))
})

test('build time', () => {
  const t0 = performance.now(); chunkKit(buildShoreKit({ fine: true })); const ms = performance.now() - t0
  assert.ok(ms < 300, `${ms.toFixed(0)} ms`)
})
