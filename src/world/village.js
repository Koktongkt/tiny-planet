// Village layout: the square, mills, houses and the little set-piece spots around the first bridge.
// Pure data (positions on the unit sphere); every consumer imports from here.
import * as THREE from 'three'
import { R, place, BRIDGES, waterAt, onBridge, dir, around, zv, DIG_SITE_POS, MUSEUM_DOOR } from '../world.js'
import { OLD_WORLD } from './flag.js'
import * as LEGACY from './legacy.js'
import { region, HOME_DIR, TRAIN_STOP_LONS } from './regions.js'
import { YARD } from '../home/yard.js'
// The reworked anchors. `near(id, d, deg)`: d rad from a region's centre, on a compass bearing (0 east, 90 north,
// 180 west, 270 south: around()'s convention). Picked against the slope terrain, river, path and bridges (see
// tests/unit/world-village.test.mjs): dry, off the path, off the cliff mesa, outside her yard fence and apart.
const near = (id, d, deg) => around(zv(region(id)), d, deg * Math.PI / 180)
const at = (lat, lon) => dir(lat, lon)
const NEW = {
  VILLAGE: zv(region('village')),
  HOUSES: [
    at(HOME_DIR.lat, HOME_DIR.lon), // [0] her home: the west edge of the village, up from the river
    near('village', 0.11, 90), near('village', 0.2, 97), near('village', 0.11, 225), near('village', 0.15, 281), // [1..4] round the square (north and south: the river runs down its east side, her yard is west)
    near('terraces', 0.22, 22.5), near('terraces', 0.22, 67.5), // [5..6] the farmers, on the terraces' dry east side
    near('harbour', 0.24, 0), at(-0.76, 1.965), // [7..8] the fishers, on the bay's east shore (south of the coast railway, which eases round the bay head)
    near('forest', 0.25, 22.5), near('forest', 0.24, 56), // [9..10] the forest's north-east edge, by the path
  ],
  MILLS: [near('mills', 0.05, 35), near('mills', 0.06, 205)],
  SPOT_DIRS: { shrine: zv(region('peak')), bus: at(0.2788, 0.3714) }, // the shrine on the Peak top; the bus stop by the square's south side of the path
  TRAIN_STOPS: [{ id: 'village', lon: TRAIN_STOP_LONS.village }, { id: 'forest', lon: TRAIN_STOP_LONS.forest }],
  // lamp posts a step off the path: at the bridge's east end (clear of the footings dig site on the village bank), round
  // the square, where the path passes south of her home, by the museum
  LAMPS: [[0.3117, 0.5256], [0.3098, 0.4185], [0.2032, 0.2089], [0.3669, 0.6421], [0.1829, 0.1666], [0.1379, 0.0353], [0.1249, 1.1444], [-0.0205, 1.1189]].map(([la, lo]) => at(la, lo)),
}
const W = OLD_WORLD ? LEGACY : NEW
export const VILLAGE = W.VILLAGE
// for other systems (e.g. Studio's audio zones): the village square centre, planet-local unit vector.
// Surface point: VILLAGE_POS.clone().multiplyScalar(R + height(VILLAGE_POS)); world space: .applyMatrix4(planetRef.current.matrixWorld)
export const VILLAGE_POS = VILLAGE
export const MILLS = W.MILLS
export const HOUSES = W.HOUSES
// the first bridge and helpers to place things relative to it
export const B0 = BRIDGES[0]
export const bl = (b, along, side) => b.c.clone().addScaledVector(b.tan, along / R).addScaledVector(b.side, side / R).normalize()
export const HB = (i) => place(HOUSES[i], 0, i * 1.3)
export const onHouse = (i, x, z) => { const p = HB(i); return p.pos.clone().add(new THREE.Vector3(x, 0, z).applyQuaternion(p.q)).normalize() }
// village lamp posts (App.jsx); the new layout adds one by her gate, across the stepping stones from the mailbox
export const LAMPS = OLD_WORLD ? W.LAMPS : [...W.LAMPS, onHouse(0, -0.5, YARD.mailbox[1] - 0.04)]
// the player's starting direction (App.jsx): the new layout starts her on the stepping stones just inside her gate
export const SPAWN = OLD_WORLD ? W.SPAWN : onHouse(0, 0, YARD.outZ + 0.6)
// set-piece spots by the first bridge (along / side in world units from its centre; +along runs east over the river,
// +side is north). The new layout keeps them on the village bank, the cat well clear of the footings dig site.
const BS = OLD_WORLD ? { cat: [-0.55, 0.32], laundryA: [-1.45, 0.05], laundryB: [-0.8, -0.3], view1: [-1.2, 1.0], view2: [-0.3, 0.55] }
  : { cat: [-0.4, -0.6], laundryA: [-2.0, 0.1], laundryB: [-1.6, 0.6], view1: [-2.0, 1.2], view2: [-1.6, -1.6] }
export const SPOTS = { shrine: W.SPOT_DIRS.shrine, bus: W.SPOT_DIRS.bus, ...Object.fromEntries(Object.entries(BS).map(([k, [a, s]]) => [k, bl(B0, a, s)])) }
// round6: the wider river reaches a couple of the old spots near the first bridge; walk them back onto dry bank
for (const k of ['cat', 'laundryA', 'laundryB', 'view1', 'view2']) { let g = 0; while (g++ < 40 && (waterAt(SPOTS[k], -0.12) || onBridge(SPOTS[k]))) SPOTS[k].addScaledVector(B0.tan, -0.05 / R).normalize() }
if (typeof window !== 'undefined') window.__spots = { SPOTS, B0 }
// The Peak stair (new layout only; null under ?world=old): stone steps from the Peak's foot on the village side, west
// of the Waterfall Cliff (the direct line from the village crosses the mesa) and of the spring spur, up the great circle
// toward the summit, stopping short of the shrine. steps[k] = { n: centre, up: unit tangent uphill }, every STEP_GAP.
const STEP_GAP = 0.2 // world units between steps
export const STAIR = OLD_WORLD ? null : (() => {
  const top = zv(region('peak')), foot = at(1.04, -0.05), stop = 0.045 // rad short of the summit (the shrine's footprint)
  const len = foot.angleTo(top) - stop, k = Math.floor(len * R / STEP_GAP), axis = new THREE.Vector3().crossVectors(foot, top).normalize(), steps = []
  for (let i = 0; i <= k; i++) { const n = foot.clone().applyAxisAngle(axis, i * STEP_GAP / R); steps.push({ n, up: new THREE.Vector3().crossVectors(axis, n).normalize() }) }
  return { foot, end: steps[steps.length - 1].n, steps }
})()
// the shrine's spin (riverProps Shrine): the new layout turns its torii to face the top of the Peak stair
export const SHRINE_SPIN = OLD_WORLD ? 0.4 : (() => {
  const p = place(SPOTS.shrine, 0, 0), x0 = new THREE.Vector3(1, 0, 0).applyQuaternion(p.q), z0 = new THREE.Vector3(0, 0, 1).applyQuaternion(p.q), d = STAIR.end.clone().sub(SPOTS.shrine)
  return Math.atan2(d.dot(x0), d.dot(z0))
})()
// the farmers' hamlet (sky.jsx fireflies): today's spot under ?world=old, between the two terraces farmhouses otherwise
export const HAMLET = OLD_WORLD ? dir(0.6, 2.45) : HOUSES[5].clone().add(HOUSES[6]).normalize()
// Stage C train stops on the TRAIN_LAT ring (lon in rad): 'village' by the lake path, 'forest' at the lake/forest edge by the ruins.
// TRAIN.fn(t) -> lon (set by the lazy schedule, systems/train.js); TRAIN.cars = the engine + carriage groups (zones.jsx Train)
export const TRAIN_STOPS = W.TRAIN_STOPS
export const TRAIN = { fn: null, cars: null }
export const EXTRA_BUSY = [SPOTS.shrine, SPOTS.bus, SPOTS.cat, SPOTS.laundryA, SPOTS.laundryB, SPOTS.view1, SPOTS.view2, ...BRIDGES.map(b => b.c),
  ...(OLD_WORLD ? [] : [...[0, 1, 2, 3, 4, 5].map(DIG_SITE_POS), MUSEUM_DOOR])] // (new: scatter keeps off the dig sites and the museum door)
// Stage B garden beds beside Home (HOUSES[0]): 2 x 3 beds in the fenced garden left of the house, in the house frame
// (+x right, +z out of the door). Shared by the lazy garden (systems/World3D.jsx) and the lawn, which keeps tufts out
// from under the beds.
import { GARDEN_BEDS } from '../home/yard.js' // inside the fenced crop garden (home/yard.js)
export { GARDEN_BEDS }
export function gardenBedNs(homeN, height) {
  const hp = place(homeN, 0, 0), hpos = homeN.clone().normalize().multiplyScalar(R + height(homeN))
  return GARDEN_BEDS.map(([x, z]) => hpos.clone().add(new THREE.Vector3(x, 0, z).applyQuaternion(hp.q)).normalize())
}
