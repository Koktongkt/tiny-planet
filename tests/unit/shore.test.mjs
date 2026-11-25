// node --test tests/unit — shorelines traced from the drawn ground, the sea coves, signed distance to shore
import test from 'node:test'; import assert from 'node:assert/strict'
import { R, zv, ZONES, waterAt, seaDepth } from '../../src/world.js'
import { railOff } from '../../src/world/railway.js'
import { VILLAGE } from '../../src/world/village.js'
import { SHORE_FINE } from '../../src/world/shoreSetting.js'
import { SHORE_RUNS, COVES, inCove, shoreDist, visualGround } from '../../src/world/shore.js'

const kinds = new Set(SHORE_RUNS.map(r => r.kind))
const all = SHORE_RUNS.flatMap(r => r.pts.map(p => ({ ...p, kind: r.kind })))

test('runs cover every water body', () => {
  for (const k of ['river', 'lake', 'pool', 'sea']) assert.ok(kinds.has(k), `no ${k} run`)
  assert.ok(SHORE_RUNS.filter(r => r.kind === 'river').length >= 2, 'both river banks')
  assert.ok(all.some(p => p.kind === 'sea' && p.harbour), 'harbour stretch on the sea run')
  const pool = SHORE_RUNS.filter(r => r.kind === 'pool').reduce((a, r) => a + r.pts.length, 0); assert.ok(pool * 0.05 >= 0.75 * 2 * Math.PI * 0.55, 'the plunge pool ring mostly traced') // open where the river leaves
  const seaPts = all.filter(p => p.kind === 'sea').length, lakePts = all.filter(p => p.kind === 'lake').length
  assert.ok(seaPts * 0.05 > 40, `sea coast too short (${seaPts} pts)`); assert.ok(lakePts * 0.05 > 6, `lake shore too short (${lakePts})`)
})

test('points sit on the waterline, water on the inside', () => {
  let bad = 0
  for (const p of all) {
    if (Math.abs(visualGround(p.n) - p.level) > 0.03) bad++
    const w = p.n.clone().addScaledVector(p.out, -0.15 / R).normalize() // a step to the water side
    if (p.kind !== 'pool' && !(waterAt(w) || seaDepth(w) > 0 || visualGround(w) < p.level)) bad++
  }
  assert.ok(bad < all.length * 0.02, `${bad} of ${all.length} points off the waterline`)
})

test('spacing ≤ 0.05 world units', () => {
  for (const r of SHORE_RUNS) for (let i = 1; i < r.pts.length; i++) assert.ok(r.pts[i].n.angleTo(r.pts[i - 1].n) * R <= 0.0501, `${r.kind} gap at ${i}`)
})

test('coves: three to five, on the sea coast, clear of the railway', () => {
  assert.ok(COVES.length >= 3 && COVES.length <= 5, `${COVES.length} coves`)
  const sea = all.filter(p => p.kind === 'sea')
  for (const c of COVES) {
    assert.ok(sea.some(p => p.n.angleTo(c.n) * R < 0.05), 'cove off the coast')
    assert.ok(Math.abs(railOff(c.n)) * R >= 0.6, 'cove on the railway')
    assert.ok(inCove(c.n) && !inCove(zv(ZONES.lake)))
  }
})

test('shoreDist: negative in water, positive on land, ~0 on the line', () => {
  assert.ok(shoreDist(zv(ZONES.lake)) < 0); assert.ok(shoreDist(VILLAGE) > 0)
  for (let i = 0; i < all.length; i += 37) assert.ok(Math.abs(shoreDist(all[i].n)) < 0.03)
})

test('setting: carved banks on by default', () => { assert.equal(SHORE_FINE, true) })

