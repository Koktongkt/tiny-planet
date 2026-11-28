// Stage C art item 6 (art-c): stations, carriage skin, ride pose, ride overlay copy, train audio wiring.
import test from 'node:test'; import assert from 'node:assert/strict'
import fs from 'node:fs'
import * as THREE from 'three'
import { kit, tris } from '../../src/art/train/kit.js'
import { buildStationGeometry, buildBoardsGeometry, platformFrame, STATION_NAMES, createStations } from '../../src/art/train/station.js'
import { buildCoachGeometry, buildOpenCarGeometry, applyTrainSkin, RIDE_SEAT } from '../../src/art/train/carriage.js'
import { rideSit, holdRidePose, releaseRidePose } from '../../src/art/train/ridePose.js'
import { POSES, ACT } from '../../src/act.js'
import { fareText, stopName, rideStatus } from '../../src/ui/ride/fareText.js'
import { R, TRAIN_LAT, dir, height, waterAt, seaDepth, onBridge, distToCurve, pathDir } from '../../src/world.js'
import { TRAIN_LAT as COAST_LAT } from '../../src/world/regions.js'
import { riverNear } from '../../src/world/river.js'
import { railLat, railDir, railPoint, railTangent, railHeight, railBehind, railOff, TRESTLE, onTrestle, deckHeight, RAIL_LEN, railSpan } from '../../src/world/railway.js'
import { fare } from '../../src/systems/train.js'
globalThis.window ??= {} // world/village.js publishes debug handles on window
const { TRAIN_STOPS } = await import('../../src/world/village.js')
const T = (g) => tris(g)
const platformN = (id) => { const s = TRAIN_STOPS.find(x => x.id === id); return dir(railLat(s.lon) + 0.3 / R, s.lon) } // systems/liveC.js platformN
const dry = (n) => !waterAt(n) && seaDepth(n) === 0
const TAU = Math.PI * 2

test('combine folds body + flipped ink hull + extras into one geometry', async () => {
  const { combine } = await import('../../src/art/train/kit.js')
  const K = kit(); K.box(1, 1, 1, [0, 0, 0], '#ff0000'); const g = K.build(), one = combine(g, { uv: [0.5, 0.05], extra: [buildBoardsGeometry('village')] })
  assert.equal(T(one), T(g.body) + T(g.hull) + 8); assert.ok(one.attributes.uv && one.attributes.color)
})
test('kit merges parts into body / hull / glow with vertex colours (hull has none)', () => {
  const K = kit(); K.box(1, 1, 1, [0, 0, 0], '#ff0000'); K.box(1, 1, 1, [2, 0, 0], '#ffcc88', { glow: true }); K.cyl(0.5, 1, [0, 2, 0], '#00ff00', { seg: 6 })
  const g = K.build()
  assert.ok(g.body.attributes.color && !g.hull.attributes.color)
  assert.equal(T(g.glow), 12); assert.ok(T(g.hull) >= 12 + 6 * 4 - 1)
})
test('station: few draw calls, small tris, every stop on its platform facing the rails', () => {
  for (const touch of [false, true]) { const g = buildStationGeometry({ touch }); const t = T(g.body) + T(g.hull) + T(g.glow); assert.ok(t <= 600, `station ${t} tris`); assert.ok(T(g.glow) > 0) }
  for (const s of TRAIN_STOPS) { assert.ok(STATION_NAMES[s.id]); assert.equal(T(buildBoardsGeometry(s.id)), 8) }
  for (const s of TRAIN_STOPS) {
    const n = platformN(s.id), f = platformFrame(n, s.lon), back = new THREE.Vector3(0, 0, -1).applyQuaternion(f.q), railN = railDir(s.lon), rail = railN.clone().multiplyScalar(R + railHeight(s.lon)).sub(f.pos).normalize() // the rails (zones.jsx ringPos)
    assert.ok(back.dot(rail) > 0.9, `${s.id}: local -z points at the rails`); assert.ok(new THREE.Vector3(0, 1, 0).applyQuaternion(f.q).dot(n.clone().normalize()) > 0.999)
  }
  const M = { body: new THREE.MeshBasicMaterial(), glow: new THREE.MeshBasicMaterial() }
  const root = createStations(TRAIN_STOPS, platformN, M); assert.equal(root.children.length, TRAIN_STOPS.length)
  for (const st of root.children) assert.equal(st.children.length, 2, '2 draw calls per station (body+ink+boards, glow)')
  assert.ok(root.userData.tris <= 600, `station ${root.userData.tris}`)
})
test('the train runs on the coast ring: TRAIN_LAT at the stops, eased round the Harbour bay', () => {
  assert.equal(TRAIN_LAT, COAST_LAT); assert.equal(TRAIN_LAT, -0.62)
  for (const s of TRAIN_STOPS) assert.equal(railLat(s.lon), TRAIN_LAT, `${s.id} stop on TRAIN_LAT`)
  let far = 0; for (let i = 0; i < 2000; i++) { const lon = i / 2000 * TAU; if (railLat(lon) !== TRAIN_LAT) far++; assert.ok(Math.abs(railLat(lon) - TRAIN_LAT) <= 0.1 + 1e-12) }
  assert.ok(far < 2000 * 0.12, 'the detour is local (the bay head)')
  // carriages keep their spacing round the detour: a point 0.44 behind along the ring is ~0.44 away (a chord: <= the arc)
  for (let i = 0; i < 400; i++) { const lon = i / 400 * TAU + 0.003, b = railBehind(lon, 0.44); assert.ok(b < lon); const d = railDir(lon).angleTo(railDir(b)) * R; assert.ok(d > 0.42 && d <= 0.4401, `spacing ${d.toFixed(3)} at ${lon.toFixed(2)}`) }
  assert.ok(Math.abs(railBehind(10, 0) - 10) < 1e-9); assert.ok(RAIL_LEN > TAU * R * Math.cos(TRAIN_LAT))
  for (let i = 0; i < 400; i++) { const lon = i / 400 * TAU, t = railTangent(lon), a = railDir(lon), b = railDir(lon + 1e-4).sub(a).normalize(); assert.ok(t.x * b.x + t.y * b.y + t.z * b.z > 0.9999, 'tangent') }
  for (const off of [-0.3, 0.3]) for (let i = 0; i < 200; i++) { const lon = i / 200 * TAU; assert.ok(Math.abs(railOff(railPoint(lon, off)) * R - off) < 0.05, 'railOff measures across the track (first order: the ramps curve)') }
})
test('rails cross the river once on a trestle', () => {
  // exactly one run of rail samples over the river (riverNear d < half), and the trestle is centred there and spans it
  const q = { d: 9, u: 0, half: 0, side: 1 }, runs = [], step = 0.0005; let a = null
  for (let lon = 0; lon < TAU; lon += step) { const wet = riverNear(railDir(lon), q).d < q.half; if (wet && a === null) a = lon; if (!wet && a !== null) { runs.push([a, lon - step]); a = null } }
  if (a !== null) runs.push([a, TAU])
  assert.equal(runs.length, 1, `rails cross the river ${runs.length} times`)
  const [ra, rb] = runs[0]
  assert.ok(TRESTLE && Math.abs(TRESTLE.lonC - (ra + rb) / 2) < 0.002, 'trestle centred on the crossing')
  assert.ok(TRESTLE.lon0 < ra && TRESTLE.lon1 > rb, 'trestle spans the river'); assert.ok(railSpan(TRESTLE.lon0, TRESTLE.lon1) < 3.5, 'a short trestle')
  // off the trestle the rails, sleepers and ballast stand on dry land (no rails on open harbour water or in the sea)
  for (let i = 0; i < 6000; i++) { const lon = i / 6000 * TAU; if (onTrestle(lon)) continue; for (const off of [-0.2, 0, 0.2]) assert.ok(dry(railPoint(lon, off)), `rails in water at lon ${lon.toFixed(3)} (${off})`) }
  // the deck meets the ground at both ends and clears the water beneath
  for (const lon of [TRESTLE.lon0, TRESTLE.lon1]) assert.ok(Math.abs(deckHeight(lon) - height(railDir(lon))) < 1e-9, 'deck ends on the banks')
  for (let lon = TRESTLE.lon0; lon <= TRESTLE.lon1; lon += 0.002) { const g = height(railDir(lon)); assert.ok(railHeight(lon) >= g - 0.02, 'deck above the ground'); if (lon > ra && lon < rb) assert.ok(railHeight(lon) - g > 0.12, `deck clears the water by ${(railHeight(lon) - g).toFixed(2)}`) }
})
test('stations on dry ground', () => {
  for (const s of TRAIN_STOPS) {
    const n = platformN(s.id), f = platformFrame(n, s.lon)
    // the platform deck (1.3 x 0.34, x along the track, -z to the rails) and the rails in front of it
    for (const x of [-0.65, 0, 0.65]) for (const z of [-0.3, -0.17, 0, 0.17]) { const p = new THREE.Vector3(x, 0, z).applyQuaternion(f.q).add(f.pos).normalize(); assert.ok(dry(p) && !onBridge(p), `${s.id} platform in water at ${x},${z}`) }
    assert.ok(!onTrestle(s.lon) && !onTrestle(s.lon - 0.1) && !onTrestle(s.lon + 0.1), `${s.id} by the trestle`)
    assert.ok(distToCurve(n, pathDir, 600) * R > 0.4, `${s.id} platform on the path`)
    assert.ok(riverNear(n).d - riverNear(n).half > 0.5, `${s.id} platform by the river`)
  }
})
test('carriage skin: 3 calls per car, open car last with the ride seat, restore puts the old coaches back', () => {
  for (const touch of [false, true]) for (const g of [buildCoachGeometry({ touch }), buildOpenCarGeometry({ touch })]) { const t = T(g.body) + T(g.hull) + T(g.glow); assert.ok(t <= 420, `car ${t}`); assert.ok(T(g.glow) > 0, 'glow windows / lanterns') }
  assert.equal(RIDE_SEAT.car, 3); assert.ok(RIDE_SEAT.lift > 0.05 && RIDE_SEAT.lift < 0.12)
  const cars = [0, 1, 2, 3].map(() => { const g = new THREE.Group(); g.add(new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial())); return g })
  const M = { body: new THREE.MeshBasicMaterial(), glow: new THREE.MeshBasicMaterial() }
  const sk = applyTrainSkin(cars, M)
  assert.equal(sk.calls, 6); assert.equal(sk.oldCalls, 3); assert.ok(cars[0].children[0].visible, 'engine untouched')
  for (const k of [1, 2, 3]) { assert.equal(cars[k].children[0].visible, false); assert.equal(cars[k].children.length, 3) }
  sk.restore(); for (const k of [1, 2, 3]) { assert.equal(cars[k].children.length, 1); assert.ok(cars[k].children[0].visible) }
})
test('ride_sit is registered in POSES and drives a seated, swaying pose', () => {
  assert.equal(POSES.ride_sit, rideSit)
  const bone = () => ({ rotation: { x: 0, y: 0, z: 0 }, position: { y: 0 } }), B = { root: { position: { y: 0 } } }
  for (const k of ['thL', 'thR', 'shLn', 'shRn', 'ftL', 'ftR', 'chest', 'head', 'upL', 'upR', 'foL', 'foR']) B[k] = bone()
  const mix = (b, ax, v) => { if (b) b.rotation[ax] = v }
  rideSit(B, mix, {}, 1.3, 1); assert.ok(B.root.position.y < -0.1); assert.ok(B.thL.rotation.x < -1.4 && B.shLn.rotation.x > 1.3)
  const z1 = B.chest.rotation.z; rideSit(B, mix, {}, 2.0, 1); assert.notEqual(B.chest.rotation.z, z1, 'sways with the carriage')
  globalThis.performance ??= { now: Date.now }; holdRidePose(); assert.equal(ACT.kind, 'ride_sit'); releaseRidePose(); assert.equal(ACT.kind, null)
})
test('ride overlay copy follows the fare rule (first ride free, then 1 coin)', () => {
  assert.equal(fareText(fare(0, 0).cost), 'First ride on the house'); assert.equal(fareText(fare(1, 3).cost), 'Fare: 1 coin')
  assert.equal(stopName('village').name, 'Lakeside'); assert.equal(stopName('forest').name, 'Forest Edge')
  assert.match(rideStatus(0.5), /Rattling/); assert.match(rideStatus(0.95), /Slowing/); assert.match(rideStatus(0, true), /Waiting/)
  const src = fs.readFileSync(new URL('../../src/ui/ride/RideOverlay.jsx', import.meta.url), 'utf8')
  for (const k of ['from', 'to', 'progress', 'onAlight', 'Alight', 'parchment.css']) assert.ok(src.includes(k), k)
})
test('train audio: engine has the train bus + events, mixFor/zonesAt carry a train term', () => {
  const eng = fs.readFileSync(new URL('../../src/audio/engine.js', import.meta.url), 'utf8'), amb = fs.readFileSync(new URL('../../src/audio/ambient.js', import.meta.url), 'utf8'), z = fs.readFileSync(new URL('../../src/audio/zones.js', import.meta.url), 'utf8')
  for (const k of ['const train = G(0)', 'nextClack', "k: 'depart'", "k: 'arrive'", "k: 'brake'", 'TRAIN_FX']) assert.ok(eng.includes(k), k)
  assert.match(amb, /train: \(Z\.riding/); assert.match(amb, /trainSpeed: Z\.trainSpeed/)
  assert.match(z, /export function trainNear/); assert.match(z, /\.\.\.tr \}/)
})
test('nothing in the startup graph imports the train art', () => {
  for (const f of ['../../src/main.jsx', '../../src/App.jsx']) { if (!fs.existsSync(new URL(f, import.meta.url))) continue; const s = fs.readFileSync(new URL(f, import.meta.url), 'utf8'); assert.ok(!/from ['"][^'"]*art\/train/.test(s) && !/from ['"][^'"]*ui\/ride/.test(s), f) }
})
