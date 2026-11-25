// node --test tests/unit — dig sites at the six keeper sites, the museum door, and gatherables kept out of the water
import test from 'node:test'; import assert from 'node:assert/strict'
import { R, K, around, zv, waterAt, seaDepth, onBridge, distToCurve, pathDir, streamDist, height, ZONES, DIG_SITE_POS, MUSEUM_DOOR } from '../../src/world.js'
import { region, DIG_SITES } from '../../src/world/regions.js'
import { HOUSES, SPOTS, LAMPS, STAIR, VILLAGE } from '../../src/world/village.js'
import { HARBOUR_HOUSES, LIGHTHOUSE, RUIN_COLS, RUIN_WATCH, HARBOUR_FOLK } from '../../src/world/zoneLayout.js'
import { DIG_SPOTS, canDig, dig } from '../../src/systems/collection.js'
import { placeSpots } from '../../src/game/spotLayout.js'

const dry = (n) => !waterAt(n) && seaDepth(n) === 0
const ring = (c, d, k = 8) => Array.from({ length: k }, (_, i) => around(c, d, i / k * Math.PI * 2))
const Zc = Object.fromEntries(Object.entries(ZONES).map(([k, z]) => [k, zv(z)]))
// the pure part of zones.jsx ZONE_COLLIDERS (she is pushed out of these); trees and camphors are scattered clear of
// the dig sites (world/village.js EXTRA_BUSY, zones.jsx zoneBusy)
const COLL = [{ n: Zc.lake, r: ZONES.lake.r * 0.98 }, { n: Zc.harbour, r: ZONES.harbour.r * 0.98 }, { n: Zc.cliff, r: ZONES.cliff.r + 0.012 }, { n: Zc.giant, r: 0.62 / R },
  ...RUIN_COLS.map(c => ({ n: c.n, r: 0.13 / R })), ...HARBOUR_HOUSES.map(h => ({ n: h.n, r: 0.42 / R }))]
const PROPS = [...HOUSES, ...HARBOUR_HOUSES.map(h => h.n), ...LAMPS, ...Object.values(SPOTS), ...STAIR.steps.map(s => s.n)]

test('six dig spots', () => {
  assert.equal(DIG_SPOTS, 6); assert.equal(DIG_SITES.length, DIG_SPOTS)
  const d = { taken: {} }
  assert.equal(canDig(d, 5, 3), true)
  assert.ok(dig(d, 5, 3)); assert.equal(d.taken[5], 3); assert.equal(canDig(d, 5, 3), false); assert.equal(canDig(d, 5, 4), true)
})

test('dig sites: dry, walkable, clear of props, at their keeper site', () => {
  for (let i = 0; i < DIG_SPOTS; i++) {
    const n = DIG_SITE_POS(i), s = DIG_SITES[i], rg = region(s.region), c = zv(rg)
    for (const p of [n, ...ring(n, 0.15 / R)]) assert.ok(dry(p) && !onBridge(p), `site ${i} in water`)
    for (const p of ring(n, 0.1 / R)) { const rise = Math.abs(height(p) - height(n)) / 0.1; assert.ok(rise < 1.1, `site ${i} too steep (${rise.toFixed(2)})`) }
    for (const col of COLL) assert.ok(n.angleTo(col.n) > col.r + 0.05 / R, `site ${i} inside a collider`)
    PROPS.forEach((p, k) => assert.ok(p.angleTo(n) * R >= 0.6, `site ${i} ${(p.angleTo(n) * R).toFixed(2)} from prop ${k}`))
    assert.ok(distToCurve(n, pathDir, 600) * R > 0.3, `site ${i} on the path`)
    // inside the keeper site, or at its edge (the drowned ruins and the lighthouse headland: their nearest dry ground;
    // the bridge footings: the far bank, world-path.test.mjs)
    assert.ok(n.angleTo(c) <= rg.r + (i === 4 ? 0.08 : 0.05), `site ${i} ${(n.angleTo(c) / rg.r).toFixed(2)} r from ${s.region}`)
    for (let j = 0; j < i; j++) assert.ok(DIG_SITE_POS(j).angleTo(n) * R > 2, `sites ${j} and ${i} together`)
  }
  assert.ok(DIG_SITE_POS(2).angleTo(zv(region('ruins'))) < DIG_SITE_POS(2).angleTo(zv(region('lake'))), 'lake ruins site on the ruins side of the lake')
  assert.ok(DIG_SITE_POS(3).angleTo(LIGHTHOUSE) * R < 0.5, 'lighthouse site at its base')
  // villagers who stand or pace (npc/routines.js) keep off the dig prompts: their talk prompt would win. The square's
  // bench, chat and sweep spots are routines.js sqSpot(d, b) (that module imports zones.jsx, so they are restated here).
  const sq = (d, b) => around(VILLAGE, d / R, b)
  const folk = [RUIN_WATCH.stand, RUIN_WATCH.day, HARBOUR_FOLK.pierEnd, HARBOUR_FOLK.pierSeat, sq(0.42, 0.55), sq(0.2, 2.6), sq(0.55, 3.9), VILLAGE]
  for (const k of ['quay', 'west', 'east']) { const F = HARBOUR_FOLK[k]; for (const s of [-1, 0, 1]) folk.push(F.n.clone().addScaledVector(F.tan, s * F.range / R).normalize()) }
  for (let i = 0; i < DIG_SPOTS; i++) folk.forEach((f, k) => assert.ok(f.angleTo(DIG_SITE_POS(i)) * R > 0.8, `villager spot ${k} on dig site ${i}`))
})

test('museum door: on the museum region, path side, apart from its trench', () => {
  const m = zv(region('museum')), r = region('museum').r
  assert.ok(MUSEUM_DOOR.angleTo(m) <= r, 'door at the museum')
  assert.ok(dry(MUSEUM_DOOR) && !onBridge(MUSEUM_DOOR), 'door in water')
  assert.ok(distToCurve(MUSEUM_DOOR, pathDir, 600) < distToCurve(m, pathDir, 600), 'door on the path side')
  assert.ok(distToCurve(MUSEUM_DOOR, pathDir, 600) * R > 0.3, 'door on the path')
  assert.ok(MUSEUM_DOOR.angleTo(DIG_SITE_POS(5)) * R > 0.8, 'door prompt over the trench prompt')
  for (const col of COLL) assert.ok(MUSEUM_DOOR.angleTo(col.n) > col.r, 'door inside a collider')
})

test('gather spots dry, fishing spots at shore', () => {
  // App.jsx's blocked() without its tree colliders (scattered in JSX; they only reject more)
  const blocked = (n) => streamDist(n) < 0.07 * K || distToCurve(n, pathDir, 140) < 0.035 * K || HOUSES.some(h => h.angleTo(n) < 0.14 * K)
  const spots = placeSpots(Zc, VILLAGE, blocked, Zc.meadow)
  assert.ok(spots.length > 100)
  const lakeOrBay = (n) => waterAt(n) && seaDepth(n) === 0 && (n.angleTo(Zc.lake) < ZONES.lake.r * 1.2 || n.angleTo(Zc.harbour) < ZONES.harbour.r * 1.2)
  for (const sp of spots) {
    if (!sp.water) { assert.ok(dry(sp.n), `${sp.id} in water`); continue }
    assert.ok(dry(sp.stand), `${sp.id} stands in water`)
    assert.ok(lakeOrBay(sp.n) && seaDepth(sp.n) === 0, `${sp.id} not on lake or harbour water`)
    let near = false; for (let t = 0; t <= 1.0001 && !near; t += 0.05) { const p = sp.stand.clone().lerp(sp.n, t).normalize(); near = p.angleTo(sp.stand) * R <= 0.5 && lakeOrBay(p) }
    assert.ok(near, `${sp.id} stands over 0.5 from the water`)
  }
  for (const z of ['lake', 'harbour']) assert.equal(spots.filter(s => s.water && s.zone === z).length, 3, `${z} fishing spots`)
  for (const z of ['ruins']) assert.ok(spots.filter(s => s.zone === z).length >= 8, 'ruins finds on the shore')
  for (let i = 0; i < DIG_SPOTS; i++) assert.ok(spots.every(s => s.n.angleTo(DIG_SITE_POS(i)) * R > 0.45), `a gatherable on dig site ${i}`)
})

test('the ruins visitor watches the drowned ruins from the shore', () => {
  for (const [k, n] of Object.entries(RUIN_WATCH)) {
    for (const p of [n, ...ring(n, 0.12 / R)]) assert.ok(dry(p), `${k} in water`)
    for (const col of COLL) assert.ok(n.angleTo(col.n) > col.r, `${k} inside a collider`)
    assert.ok(ring(n, 0.6 / R, 16).some(p => waterAt(p)), `${k} not on the shore`)
    assert.ok(n.angleTo(Zc.ruins) < 0.15, `${k} far from the ruins`)
    assert.ok(n.angleTo(DIG_SITE_POS(2)) * R > 0.8, `${k} on the dig site`)
  }
})
