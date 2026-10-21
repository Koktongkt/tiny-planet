// Stage C carriages (art-c): replaces the plain box coaches with a cozy two-tone carriage (maroon + cream, brass belt,
// curved roof, windows that glow warm at night through the game's night pass) and an open-sided observation car at the
// back with a forward-facing bench — her seat for the ride (she is too tall to sit inside a toy-scale coach).
// Per car: 3 draw calls (toon body, ink hull, glow windows/lanterns) instead of ~13 + Outlines today.
// Car local frame (zones.jsx Train): x = side, y = up (planet normal), z = forward (direction of travel).
import * as THREE from 'three'
import { kit, tris } from './kit.js'
const C = { maroon: '#a2423a', cream: '#f3e4c4', brass: '#d9a54a', roof: '#5d4a3f', under: '#3b3633', wheel: '#33302e', deck: '#a9774c', bench: '#8a5a3c', rail: '#f3e4c4', post: '#6e4a33' }
const wheels = (K, seg) => { for (const z of [-0.12, 0.12]) for (const s of [-1, 1]) K.cyl(0.03, 0.014, [s * 0.075, 0.035, z], C.wheel, { rot: [0, 0, Math.PI / 2], seg, hull: false }) }
export function buildCoachGeometry({ touch = false } = {}) {
  const K = kit({ ink: 0.005 })
  K.box(0.15, 0.02, 0.34, [0, 0.052, 0], C.under, { hull: false })
  K.box(0.17, 0.07, 0.36, [0, 0.096, 0], C.maroon)
  K.box(0.17, 0.075, 0.36, [0, 0.168, 0], C.cream)
  K.box(0.176, 0.009, 0.366, [0, 0.132, 0], C.brass, { hull: false })
  K.cyl(0.098, 0.39, [0, 0.203, 0], C.roof, { rot: [Math.PI / 2, 0, 0], seg: touch ? 6 : 10, scale: [1, 1, 0.36], theta: Math.PI, t0: Math.PI / 2, hull: true }) // half-cylinder roof, squashed
  for (const s of [-1, 1]) K.box(0.012, 0.11, 0.05, [s * 0.086, 0.13, 0.155], C.maroon, { hull: false }) // doors near the front
  wheels(K, touch ? 6 : 8)
  // windows: 3 per side + one at each end (glow part)
  for (const s of [-1, 1]) for (const z of [-0.11, -0.03, 0.05]) K.box(0.004, 0.045, 0.055, [s * 0.0865, 0.17, z], '#ffd79a', { glow: true })
  for (const s of [-1, 1]) K.box(0.08, 0.04, 0.004, [0, 0.172, s * 0.181], '#ffd79a', { glow: true })
  return K.build()
}
/** the open observation car: plank deck, low maroon sides with a cream rail, a forward-facing bench, two lanterns */
export function buildOpenCarGeometry({ touch = false } = {}) {
  const K = kit({ ink: 0.005 })
  K.box(0.15, 0.02, 0.34, [0, 0.052, 0], C.under, { hull: false })
  K.box(0.17, 0.03, 0.36, [0, 0.077, 0], C.maroon)
  K.box(0.16, 0.006, 0.35, [0, 0.094, 0], C.deck, { hull: false })
  for (const s of [-1, 1]) { K.box(0.01, 0.045, 0.36, [s * 0.08, 0.115, 0], C.maroon, { hull: false }); K.box(0.016, 0.01, 0.366, [s * 0.08, 0.142, 0], C.rail) }
  K.box(0.17, 0.045, 0.01, [0, 0.115, -0.178], C.maroon, { hull: false }); K.box(0.176, 0.01, 0.016, [0, 0.142, -0.178], C.rail)
  // bench (seat top ≈ 0.122), facing forward (+z)
  K.box(0.13, 0.012, 0.06, [0, 0.122, -0.02], C.bench); K.box(0.13, 0.06, 0.012, [0, 0.155, -0.052], C.bench)
  for (const x of [-0.055, 0.055]) K.box(0.012, 0.03, 0.05, [x, 0.108, -0.02], C.wheel, { hull: false })
  // rear lantern posts
  for (const s of [-1, 1]) { K.box(0.012, 0.11, 0.012, [s * 0.078, 0.195, -0.17], C.post, { hull: false }); K.box(0.026, 0.032, 0.026, [s * 0.078, 0.265, -0.17], '#ffcf86', { glow: true }) }
  wheels(K, touch ? 6 : 8)
  return K.build()
}
/** seat anchor for the ride on the open car (car index 3 = last), car-local: lift along up + nudge along z */
export const RIDE_SEAT = { car: 3, lift: 0.075, z: -0.012 }
/**
 * applyTrainSkin(cars) — cars = TRAIN.cars (zones.jsx Train: [engine, coach1, coach2, coach3] groups). Hides the old coach
 * meshes and adds the new ones as children (they follow the cars for free). -> { restore(), tris, calls }
 */
export function applyTrainSkin(cars, M, { touch = false } = {}) {
  const coach = buildCoachGeometry({ touch }), open = buildOpenCarGeometry({ touch }), added = [], hidden = []
  let t = 0, calls = 0
  for (let k = 1; k < cars.length; k++) { const g = cars[k]; if (!g) continue
    for (const c of g.children) if (c.visible && !c.userData.artC) { c.visible = false; hidden.push(c) }
    const geo = k === RIDE_SEAT.car ? open : coach
    for (const [gg, m] of [[geo.body, M.body], [geo.hull, M.hull], [geo.glow, M.glow]]) if (gg) { const me = new THREE.Mesh(gg, m); me.userData.artC = true; g.add(me); added.push(me); t += tris(gg); calls++ } }
  let oldCalls = 0, oldTris = 0 // what the hidden coaches cost (each visible mesh = 1 call; tris from its geometry)
  for (const h of hidden) h.traverse(o => { if ((o.isMesh || o.isLine) && (o === h || o.visible !== false) && o.geometry) { oldCalls++; oldTris += tris(o.geometry) * (o.count || 1) } })
  return { tris: t, calls, oldCalls, oldTris, restore() { for (const m of added) m.removeFromParent(); for (const c of hidden) c.visible = true } }
}
