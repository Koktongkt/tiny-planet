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
import { R, TRAIN_LAT, dir } from '../../src/world.js'
import { fare } from '../../src/systems/train.js'
globalThis.window ??= {} // world/village.js publishes debug handles on window
const { TRAIN_STOPS } = await import('../../src/world/village.js')
const T = (g) => tris(g)
const platformN = (id) => dir(TRAIN_LAT + 0.3 / R, TRAIN_STOPS.find(s => s.id === id).lon)

test('kit merges parts into body / hull / glow with vertex colours (hull has none)', () => {
  const K = kit(); K.box(1, 1, 1, [0, 0, 0], '#ff0000'); K.box(1, 1, 1, [2, 0, 0], '#ffcc88', { glow: true }); K.cyl(0.5, 1, [0, 2, 0], '#00ff00', { seg: 6 })
  const g = K.build()
  assert.ok(g.body.attributes.color && !g.hull.attributes.color)
  assert.equal(T(g.glow), 12); assert.ok(T(g.hull) >= 12 + 6 * 4 - 1)
})
test('station: few draw calls, small tris, every stop on its platform facing the rails', () => {
  for (const touch of [false, true]) { const g = buildStationGeometry({ touch }); const t = T(g.body) + T(g.hull) + T(g.glow); assert.ok(t <= 600, `station ${t} tris`); assert.ok(T(g.glow) > 0) }
  for (const s of TRAIN_STOPS) { assert.ok(STATION_NAMES[s.id]); assert.equal(T(buildBoardsGeometry(s.id)), 8) }
  const n = platformN('village'), f = platformFrame(n, 0.75), back = new THREE.Vector3(0, 0, -1).applyQuaternion(f.q), rail = dir(TRAIN_LAT, 0.75).multiplyScalar(R).sub(f.pos).normalize()
  assert.ok(back.dot(rail) > 0.9, 'local -z points at the rails'); assert.ok(new THREE.Vector3(0, 1, 0).applyQuaternion(f.q).dot(n.clone().normalize()) > 0.999)
  const M = { body: new THREE.MeshBasicMaterial(), hull: new THREE.MeshBasicMaterial(), glow: new THREE.MeshBasicMaterial(), boards: new THREE.MeshBasicMaterial() }
  const root = createStations(TRAIN_STOPS, platformN, M); assert.equal(root.children.length, TRAIN_STOPS.length)
  for (const st of root.children) assert.equal(st.children.length, 4, '4 draw calls per station')
})
test('carriage skin: 3 calls per car, open car last with the ride seat, restore puts the old coaches back', () => {
  for (const touch of [false, true]) for (const g of [buildCoachGeometry({ touch }), buildOpenCarGeometry({ touch })]) { const t = T(g.body) + T(g.hull) + T(g.glow); assert.ok(t <= 420, `car ${t}`); assert.ok(T(g.glow) > 0, 'glow windows / lanterns') }
  assert.equal(RIDE_SEAT.car, 3); assert.ok(RIDE_SEAT.lift > 0.05 && RIDE_SEAT.lift < 0.12)
  const cars = [0, 1, 2, 3].map(() => { const g = new THREE.Group(); g.add(new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial())); return g })
  const M = { body: new THREE.MeshBasicMaterial(), hull: new THREE.MeshBasicMaterial(), glow: new THREE.MeshBasicMaterial() }
  const sk = applyTrainSkin(cars, M)
  assert.equal(sk.calls, 9); assert.equal(sk.oldCalls, 3); assert.ok(cars[0].children[0].visible, 'engine untouched')
  for (const k of [1, 2, 3]) { assert.equal(cars[k].children[0].visible, false); assert.equal(cars[k].children.length, 4) }
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
