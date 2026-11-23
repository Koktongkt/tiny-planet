// Her home yard, as data: where the cottage, trees, entrance, garden fence and bench sit around Home (HOUSES[0]).
// House frame, world units: +x is to the right as you face the front door, +z points out of the door, origin at the
// house centre. Props are placed at HOME_S (room units -> world, the same scale as her interior). Pure data (no three
// meshes), so the startup chunk can use it for colliders / bench / garden beds while the art loads lazily
// (home/Exterior.jsx). Edit a number here and everything that depends on it (art, colliders, prompts) follows.
export const HOME_S = 1.25
export const COTTAGE = { chimney: { phi: -50, r: 0.3 } } // cottage opts shared with the smoke
export const YARD = {
  houseR: 0.7, // collider radius (the bulging walls + entrance bushes)
  doorZ: 0.45, outZ: 1.0, // 'Go inside' prompt point; where she steps out to
  trees: [{ x: -0.82, z: -0.56, seed: 1, crown: 0.33 }, { x: 0.86, z: -0.46, seed: 2.3, crown: 0.3 }],
  bench: [1.0, 0.5], sign: [-0.5, 1.95], mailbox: [0.48, 1.92], // sign + mailbox just outside the front gate
  stones: [[0.02, 0.98, 0.2], [-0.08, 1.18, -0.4], [0.05, 1.39, 0.9], [-0.04, 1.86, 0.3]],
  rocks: [[1.05, 1.15, 0.4], [-0.62, 0.32, 2.1], [0.35, -0.75, 1], [-1.85, 0.9, 0.5]],
  sprouts: [[0.7, 0.95], [-0.35, 1.45], [0.95, -0.05], [-1.0, -0.05], [0.4, 1.6], [1.3, 0.8], [-0.62, 1.5]],
  // the yard fence: an oval round the house, trees, bench and crop beds, the gate in front on the stepping stones (x = 0)
  fence: { cx: -0.3, cz: 0.25, rx: 1.85, rz: 1.4, gateW: 0.42, seg: 0.45 },
}
// 2 x 3 beds in the yard, left of the house, 0.36 apart (Stage B plots: systems/World3D.jsx, the lawn keeps tufts off them)
export const GARDEN_BEDS = [[-1.16, 0.26], [-1.52, 0.26], [-1.16, 0.62], [-1.52, 0.62], [-1.16, 0.98], [-1.52, 0.98]]
// the oval's point at parameter t (t = 0 is straight out front of its centre, increasing toward +x)
const ovalAt = (f, t) => [f.cx + f.rx * Math.sin(t), f.cz + f.rz * Math.cos(t)]
// the gate: centred where the oval crosses x = 0 in front; returns its two posts' ends + the parameter span it leaves open
export function yardGate(f = YARD.fence) {
  const t0 = Math.asin(-f.cx / f.rx), dt = f.gateW / 2 / Math.hypot(f.rx * Math.cos(t0), f.rz * Math.sin(t0))
  return { t0, dt, a: ovalAt(f, t0 - dt), b: ovalAt(f, t0 + dt), c: ovalAt(f, t0) }
}
// fence runs [[x0, z0], [x1, z1]] (straight chords ~seg long) round the oval, leaving the gate open
export function fenceRuns(f = YARD.fence) {
  const { t0, dt } = yardGate(f), span = Math.PI * 2 - 2 * dt, n = Math.ceil(span * (f.rx + f.rz) / 2 / f.seg), out = []
  for (let i = 0; i < n; i++) out.push([ovalAt(f, t0 + dt + span * i / n), ovalAt(f, t0 + dt + span * (i + 1) / n)])
  return out
}
// circle colliders (house frame x, z, radius in world units): the house, tree trunks, fence posts every ~0.12
export function yardColliders() {
  const c = [[0, 0, YARD.houseR], ...YARD.trees.map(t => [t.x, t.z, 0.13])]
  for (const [[x0, z0], [x1, z1]] of fenceRuns()) { const L = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.round(L / 0.12)); for (let i = 0; i <= n; i++) c.push([x0 + (x1 - x0) * i / n, z0 + (z1 - z0) * i / n, 0.045]) }
  return c
}
// chimney top, house frame (for the smoke): cottage room units * HOME_S (exterior.js chimneyTop, default wall height)
export const CHIMNEY_TOP = (() => { const { phi, r } = COTTAGE.chimney, d = Math.PI / 180; return [Math.sin(phi * d) * r * HOME_S, 1.12 * HOME_S, -Math.cos(phi * d) * r * HOME_S] })()
