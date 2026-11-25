// Where the zone props stand on the reworked planet (zones.jsx draws them; ?world=old keeps zones.jsx's own placement).
// Pure data on the unit sphere (zones.jsx only reads it in the new world), picked against the slope terrain, river, sea, path and coast railway (see
// tests/unit/world-zones.test.mjs): the drowned ruins in the Lake's west half, the Harbour's houses, piers, boats and
// lighthouse round its bay, the Lake dock, and the waterfall where the river drops off the Waterfall Cliff.
import * as THREE from 'three'
import { R, LAKE_W, ZONES, around, zv, dir, height } from '../world.js'
import { riverDir, riverHalf } from './river.js'
import { OLD_WORLD } from './flag.js'

// (its own seeded random: the shared world.js rnd() sequence feeds today's scatter and must not shift)
let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647
const toward = (a, b) => b.clone().addScaledVector(a, -a.dot(b)).normalize() // tangent at a, pointing at b
// the Surface/place() spin that turns a prop's local +z (a house's front door) toward `look`
export function spinToward(n, look) {
  n = n.clone().normalize(); const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), n)
  const x0 = new THREE.Vector3(1, 0, 0).applyQuaternion(q), z0 = new THREE.Vector3(0, 0, 1).applyQuaternion(q), f = toward(n, look)
  return Math.atan2(f.dot(x0), f.dot(z0))
}

// ---- the Lake: the dock on the east shore (by the path, between the museum and the outlet), boat out from it ----
export const LAKE_DOCK_B = -0.25 // bearing from the lake centre (around(): 0 east, pi/2 north)

// ---- the drowned ruins: columns and an arch rising from the lakebed in the Lake's west half, their tops above the
// water (`above` world units, today's column heights), slabs awash at the surface ----
const RC = zv(ZONES.ruins)
const ABOVE = [0.75, 0.35, 0.6, 0.2, 0.8, 0.45, 0.3], TILT = [0, 0.1, 0, 0.25, 0, 0.05, 0.15]
export const RUIN_COLS = ABOVE.map((above, k) => { const n = around(RC, 0.55 / R, k * 0.9 + 0.3), base = height(n); return { n, base, above, h: LAKE_W - base + above, tilt: TILT[k] } })
export const RUIN_ARCH = (() => { const n = around(RC, 0.15 / R, 2.4), base = height(n); return { n, fwd: toward(n, RC), base, depth: LAKE_W - base } })()
export const RUIN_SLABS = (() => { const a = []; for (let i = 0; i < 60 && a.length < 18; i++) { const n = around(RC, Math.sqrt(rnd()) * 0.8 / R, rnd() * 6.283); if (height(n) > LAKE_W - 0.08 || RUIN_COLS.some(c => c.n.angleTo(n) * R < 0.2)) continue; a.push({ n, top: LAKE_W + 0.01 + rnd() * 0.025, spin: rnd() * 6, s: 0.8 + rnd() * 0.6 }) } return a })()

// ---- the Harbour: a bay straddling the coast, open to the sea in the south; the railway eases round its head ----
const HC = zv(ZONES.harbour), HR = ZONES.harbour.r
export const HARBOUR_HOUSES = [[-0.685, 1.30], [-0.75, 1.25], [-0.695, 1.19]].map(([la, lo]) => { const n = dir(la, lo); return { n, spin: spinToward(n, HC) } }) // the west shore, doors to the bay
export const LIGHTHOUSE = dir(-0.775, 1.32) // the west headland at the bay's mouth
// piers: from the shore (at HR * 1.06 on a bearing) toward the bay's centre; the long one by the fishers' houses (east)
export const PIERS = [{ b: -0.2, len: 1.7 }, { b: Math.PI, len: 1.1 }].map(({ b, len }) => { const root = around(HC, HR * 1.06, b); return { b, len, root, fwd: toward(root, HC), tip: root.clone().addScaledVector(toward(root, HC), len / R).normalize() } })
export const BOATS = [0, 1, 2].map(k => { const n = around(HC, HR * (0.7 - k * 0.12), PIERS[0].b + 0.45 + k * 0.4); return { n, fwd: toward(n, HC).negate() } })
export const CRATES = [0, 1, 2, 3, 4].map(k => around(PIERS[0].root, (0.3 + 0.1 * (k % 2)) / R, -0.9 - k * 0.2)) // stacked on the shore beside the long pier's root (south of it)

// harbour folk (npc/routines.js): the angler at the long pier's root looking out over the bay (pierEnd -> sea), a seat
// a step inland, pacers on the east quay by the cargo, along the west shore and by the fishers' houses. pace: n +- range
// (world units) along tan.
const tanAt = (n, b) => { const e1 = new THREE.Vector3(0, 1, 0).cross(n).normalize(), e2 = new THREE.Vector3().crossVectors(n, e1); return e1.multiplyScalar(Math.cos(b)).addScaledVector(e2, Math.sin(b)) }
export const HARBOUR_FOLK = (() => { const P = PIERS[0], step = (n, d, dist) => n.clone().addScaledVector(d, dist / R).normalize()
  const pace = (la, lo, b, range) => { const n = dir(la, lo); return { n, tan: tanAt(n, b), range } }
  return { pierEnd: step(P.root, P.fwd, -0.1), pierSeat: dir(-0.74, 1.885), sea: step(P.root, P.fwd, 1.2),
    quay: pace(-0.745, 1.86, Math.PI / 2, 0.3), west: pace(-0.75, 1.34, Math.PI / 2, 0.3), east: pace(-0.715, 2.015, 0, 0.35) } })()

// ---- the waterfall: where the river drops off the cliff's downhill face (its lip just past the mesa rim) into the
// plunge pool at the cliff foot ----
export const WATERFALL = OLD_WORLD ? null : (() => {
  const c = zv(ZONES.cliff), r = ZONES.cliff.r, at = (a) => { let u = 0; while (u < 0.5 && riverDir(u).angleTo(c) > r) u += 0.0005; while (u < 0.5 && riverDir(u).angleTo(c) < a) u += 0.0005; return u }
  const uLip = at(r + 0.02), uFoot = at(r + 0.075), lip = riverDir(uLip), fwd = toward(lip, riverDir(uLip + 0.004)), foot = riverDir(uFoot)
  return { lip, fwd, foot, uLip, uFoot, width: 2 * riverHalf(uLip) * 0.85, topR: R + height(riverDir(uLip - 0.01)) + 0.02, poolR: Math.max(0.32, riverHalf(uFoot) * 1.3) / R }
})()
