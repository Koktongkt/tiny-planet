// Village layout: the square, mills, houses and the little set-piece spots around the first bridge.
// Pure data (positions on the unit sphere); every consumer imports from here.
import * as THREE from 'three'
import { R, dir, place, BRIDGES, waterAt, onBridge } from '../world.js'
export const VILLAGE = dir(1.05, 0.2)
export const MILLS = [dir(0.25, 1.4), dir(0.45, 1.75)]
export const HOUSES = [[0.9, -0.15], [1.18, 0.55], [0.92, 0.78], [1.3, -0.3], [1.0, 0.95], [0.3, -0.6], [0.75, 2.2], [0.5, 2.55], [0.92, 2.6], [0.35, 2.25], [0.7, 2.85]].map(([la, lo]) => dir(la, lo))
// the first bridge and helpers to place things relative to it
export const B0 = BRIDGES[0]
export const bl = (b, along, side) => b.c.clone().addScaledVector(b.tan, along / R).addScaledVector(b.side, side / R).normalize()
export const HB = (i) => place(HOUSES[i], 0, i * 1.3)
export const onHouse = (i, x, z) => { const p = HB(i); return p.pos.clone().add(new THREE.Vector3(x, 0, z).applyQuaternion(p.q)).normalize() }
export const SPOTS = { shrine: dir(0.12, -1.05), bus: dir(0.52, 1.2), cat: bl(B0, -0.55, 0.32), laundryA: bl(B0, -1.45, 0.05), laundryB: bl(B0, -0.8, -0.3), view1: bl(B0, -1.2, 1.0), view2: bl(B0, -0.3, 0.55) }
// round6: the wider river reaches a couple of the old spots near the first bridge; walk them back onto dry bank
for (const k of ['cat', 'laundryA', 'laundryB', 'view1', 'view2']) { let g = 0; while (g++ < 40 && (waterAt(SPOTS[k], -0.12) || onBridge(SPOTS[k]))) SPOTS[k].addScaledVector(B0.tan, -0.05 / R).normalize() }
window.__spots = { SPOTS, B0 }
export const EXTRA_BUSY = [SPOTS.shrine, SPOTS.bus, SPOTS.cat, SPOTS.laundryA, SPOTS.laundryB, SPOTS.view1, SPOTS.view2, ...BRIDGES.map(b => b.c)]
