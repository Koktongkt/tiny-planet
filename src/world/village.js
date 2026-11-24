// Village layout: the square, mills, houses and the little set-piece spots around the first bridge.
// Pure data (positions on the unit sphere); every consumer imports from here.
import * as THREE from 'three'
import { R, place, BRIDGES, waterAt, onBridge } from '../world.js'
import { OLD_WORLD } from './flag.js'
import * as LEGACY from './legacy.js'
const NEW = LEGACY // the reworked anchors replace this in later tasks; ?world=old keeps the frozen layout
const W = OLD_WORLD ? LEGACY : NEW
export const VILLAGE = W.VILLAGE
export const LAMPS = W.LAMPS // village lamp posts (App.jsx)
export const SPAWN = W.SPAWN // the player's starting direction (App.jsx)
// for other systems (e.g. Studio's audio zones): the village square centre, planet-local unit vector (lat 1.05, lon 0.2).
// Surface point: VILLAGE_POS.clone().multiplyScalar(R + height(VILLAGE_POS)); world space: .applyMatrix4(planetRef.current.matrixWorld)
export const VILLAGE_POS = VILLAGE
export const MILLS = W.MILLS
export const HOUSES = W.HOUSES
// the first bridge and helpers to place things relative to it
export const B0 = BRIDGES[0]
export const bl = (b, along, side) => b.c.clone().addScaledVector(b.tan, along / R).addScaledVector(b.side, side / R).normalize()
export const HB = (i) => place(HOUSES[i], 0, i * 1.3)
export const onHouse = (i, x, z) => { const p = HB(i); return p.pos.clone().add(new THREE.Vector3(x, 0, z).applyQuaternion(p.q)).normalize() }
export const SPOTS = { shrine: W.SPOT_DIRS.shrine, bus: W.SPOT_DIRS.bus, cat: bl(B0, -0.55, 0.32), laundryA: bl(B0, -1.45, 0.05), laundryB: bl(B0, -0.8, -0.3), view1: bl(B0, -1.2, 1.0), view2: bl(B0, -0.3, 0.55) }
// round6: the wider river reaches a couple of the old spots near the first bridge; walk them back onto dry bank
for (const k of ['cat', 'laundryA', 'laundryB', 'view1', 'view2']) { let g = 0; while (g++ < 40 && (waterAt(SPOTS[k], -0.12) || onBridge(SPOTS[k]))) SPOTS[k].addScaledVector(B0.tan, -0.05 / R).normalize() }
window.__spots = { SPOTS, B0 }
// Stage C train stops on the TRAIN_LAT ring (lon in rad): 'village' by the lake path, 'forest' at the lake/forest edge by the ruins.
// TRAIN.fn(t) -> lon (set by the lazy schedule, systems/train.js); TRAIN.cars = the engine + carriage groups (zones.jsx Train)
export const TRAIN_STOPS = W.TRAIN_STOPS
export const TRAIN = { fn: null, cars: null }
export const EXTRA_BUSY = [SPOTS.shrine, SPOTS.bus, SPOTS.cat, SPOTS.laundryA, SPOTS.laundryB, SPOTS.view1, SPOTS.view2, ...BRIDGES.map(b => b.c)]
// Stage B garden beds beside Home (HOUSES[0]): 2 x 3 beds in the fenced garden left of the house, in the house frame
// (+x right, +z out of the door). Shared by the lazy garden (systems/World3D.jsx) and the lawn, which keeps tufts out
// from under the beds.
import { GARDEN_BEDS } from '../home/yard.js' // inside the fenced crop garden (home/yard.js)
export { GARDEN_BEDS }
export function gardenBedNs(homeN, height) {
  const hp = place(homeN, 0, 0), hpos = homeN.clone().normalize().multiplyScalar(R + height(homeN))
  return GARDEN_BEDS.map(([x, z]) => hpos.clone().add(new THREE.Vector3(x, 0, z).applyQuaternion(hp.q)).normalize())
}
