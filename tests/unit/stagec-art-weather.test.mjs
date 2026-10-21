// node --test tests/unit — Stage C art items 4–5: season/weather hook reads (vs Codor's weather.js), season patch
// classification + GLSL coverage, seasonal forage table/text/icons, puddle spots, rain/roof terms in mixFor
import test from 'node:test'; import assert from 'node:assert/strict'
import fs from 'node:fs'
import * as THREE from 'three'
import { readWeather, hookWeights, SEASON_IDS } from '../../src/art/season/hooks.js'
import { classify, SEASON_KINDS, patchSurface, unpatch } from '../../src/art/season/patch.js'
import { S_FRAG_COLOR } from '../../src/art/season/glsl.js'
import { puddleSpots } from '../../src/art/weather/puddles.js'
import { FORAGE, FORAGE_IDS, forageFor, forageSpawns } from '../../src/game/forageTable.js'
import { FORAGE_IDS as CONTRACT_IDS, FORAGE as CONTRACT } from '../../src/systems/collection.js'
import { FORAGE_RELIC_TEXT } from '../../src/game/itemsC.js'
import { ITEMS } from '../../src/game/items.js'
import { applyTo, seasonWeights, SEASONS } from '../../src/systems/weather.js'
import { R, waterAt, onBridge } from '../../src/world.js'

test('readWeather: defaults with no hooks', () => {
  const w = readWeather({}, {})
  assert.equal(w.season, 'spring'); assert.deepEqual(w.sw, [1, 0, 0, 0]); assert.equal(w.kind, 'clear'); assert.equal(w.rain, 0); assert.equal(w.wet, 0)
  assert.equal(readWeather({}, { kind: 'rain' }).rain, 1); assert.equal(readWeather({}, { kind: 'rain', rain: 0.4 }).wet, 0.4)
  assert.equal(readWeather({}, { season: 'monsoon', rain: 7, wet: NaN }).season, 'spring')
  assert.equal(readWeather({}, { rain: 7 }).rain, 1)
})
test('readWeather follows weather.js applyTo over a year (4 weights, sums to 1)', () => {
  assert.deepEqual(SEASON_IDS, SEASONS)
  for (let day = 0; day < 28 * 2; day++) for (const u of [0.1, 0.5, 0.95]) {
    const T = applyTo({}, -Math.PI / 2 + (day + u) * Math.PI * 2), w = readWeather({}, T)
    assert.equal(w.season, T.season); assert.equal(w.kind, T.kind); assert.equal(w.rain, T.rain); assert.equal(w.wet, T.wet)
    assert.ok(Math.abs(w.sw.reduce((a, b) => a + b, 0) - 1) < 1e-9)
    for (let k = 0; k < 4; k++) assert.ok(Math.abs(w.sw[k] - T.seasonW[k]) < 1e-9)
  }
  assert.deepEqual(hookWeights('summer', seasonWeights(13, 0.5)), [0, 0.5, 0.5, 0]) // last summer day cross-fades into autumn
  assert.deepEqual(hookWeights('autumn', 0.25), [0, 0.75, 0.25, 0]) // legacy scalar
  assert.deepEqual(hookWeights('winter', [0, 0, 0, 0]), [0, 0, 0, 1])
})
test('classify by existing shader keys + GLSL covers every kind', () => {
  const mk = (key, geo = new THREE.BoxGeometry(), inst = false) => { const m = new THREE.MeshToonMaterial(); m.customProgramCacheKey = () => key; return inst ? new THREE.InstancedMesh(geo, m, 1) : new THREE.Mesh(geo, m) }
  assert.deepEqual(classify(mk('paint0.1true6ink', new THREE.IcosahedronGeometry(R, 2))), { kind: 'ground', wet: true })
  assert.deepEqual(classify(mk('wind6_0.1')), { kind: 'grass', wet: true })
  assert.equal(classify(mk('foliage0.08_0.4ink')).kind, 'leaf')
  assert.equal(classify(mk('paint0.14true14')).kind, 'cap')
  assert.equal(classify(mk('something-else')), null)
  const fl = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.03, 1), new THREE.MeshToonMaterial(), 4)
  assert.equal(classify(fl).kind, 'flower')
  for (const k of SEASON_KINDS) assert.ok(typeof S_FRAG_COLOR[k] === 'string' && S_FRAG_COLOR[k].length > 10, k)
  const m = new THREE.MeshToonMaterial(); m.customProgramCacheKey = () => 'wind6_0.1'
  patchSurface(m, { kind: 'grass', cap: true, wet: true }); assert.match(m.customProgramCacheKey(), /^wind6_0\.1\|s:grasscw$/)
  unpatch(m); assert.equal(m.customProgramCacheKey(), 'wind6_0.1')
})
test('seasonal forage = Codor contract ids; spawns, text and icons for all 9', () => {
  assert.deepEqual([...FORAGE_IDS].sort(), [...CONTRACT_IDS].sort()); assert.equal(FORAGE.length, 9)
  for (const s of SEASONS) { assert.deepEqual(forageFor(s).map(f => f.id), CONTRACT[s]); for (const [z, id, n] of forageSpawns(s, 1)) assert.ok(typeof z === 'string' && FORAGE_IDS.includes(id) && n > 0) }
  const icons = fs.readFileSync(new URL('../../src/art/forage/icons.jsx', import.meta.url), 'utf8'), props = fs.readFileSync(new URL('../../src/art/forage/ForageProp.jsx', import.meta.url), 'utf8')
  for (const id of FORAGE_IDS) {
    assert.ok(FORAGE_RELIC_TEXT[id] && FORAGE_RELIC_TEXT[id].name && FORAGE_RELIC_TEXT[id].desc.length > 20, id)
    assert.equal(ITEMS[id].name, FORAGE_RELIC_TEXT[id].name)
    assert.ok(icons.includes(`  ${id}: [`), 'icon ' + id); assert.ok(props.includes(`case '${id}'`), 'prop ' + id)
  }
})
test('puddleSpots: dry land, spaced, lifted to the dip rim', () => {
  const sp = puddleSpots({ count: 16 })
  assert.ok(sp.length >= 10, 'got ' + sp.length)
  for (const s of sp) { assert.ok(!waterAt(s.n, -0.25) && !onBridge(s.n)); assert.ok(s.lift >= 0.03 && s.lift < 0.12); assert.ok(s.r > 0.15 && s.r < 0.5) }
  for (let i = 0; i < sp.length; i++) for (let j = i + 1; j < sp.length; j++) assert.ok(sp[i].n.angleTo(sp[j].n) * R > 0.5)
})
test('mixFor: rain term outside, softer + roof patter indoors, birds hush', () => {
  const src = fs.readFileSync(new URL('../../src/audio/ambient.js', import.meta.url), 'utf8')
  const body = src.slice(src.indexOf('export function mixFor'), src.indexOf('\n}\n', src.indexOf('export function mixFor')) + 2).replace('export ', '')
  const mixFor = new Function(body + '; return mixFor')()
  const Z = { river: 0, lake: 0, forest: 0.5, village: 0.5, meadow: 0.5, hill: 0, night: 0 }
  const dry = mixFor({ mode: 'follow' }, { ...Z, rain: 0 }), wet = mixFor({ mode: 'follow' }, { ...Z, rain: 1 }), inn = mixFor({ inside: true, mode: 'follow' }, { ...Z, rain: 1 })
  assert.equal(dry.rain, 0); assert.equal(dry.roof, 0); assert.equal(wet.rain, 1); assert.equal(wet.roof, 0)
  assert.ok(wet.birds < dry.birds * 0.3); assert.equal(inn.roof, 1); assert.ok(inn.rain < wet.rain)
  assert.equal(mixFor({ mode: 'orbit' }, { ...Z, rain: 1 }).rain, 0.35)
})
