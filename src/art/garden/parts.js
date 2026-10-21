// Crop + bed geometry for the garden (art-b). Every crop/stage is a list of low-poly parts in plant-local space
// (y up, metres in world units: a plant is 0.02-0.12 tall). Parts carry a vertex colour and a sway weight; the
// garden merges every visible plant into ONE mesh (see GardenPlots.jsx), so the triangle cost is exactly what's drawn.
import * as THREE from 'three'
import { P, emitParts, buildGeometry } from '../kit.js'
export { emitParts, buildGeometry }
export const STAGES = ['seed', 'sprout', 'young', 'mature', 'ripe', 'withered']
export const CROPS = ['skyseed', 'turnip', 'carrot', 'herb']
export const PLOT_SIZE = 0.3 // bed footprint (world units); a 3x4 garden at 0.34 spacing is ~1.0 x 1.4
export const TAG = { skyseed: '#a8d8ff', turnip: '#c99ad0', carrot: '#ef8a3c', herb: '#9cd47a' }
const COL = {
  soilMound: '#7a5638', seed: '#e8d8a8', skySeed: '#a8d8ff', stem: '#6f9e4f', sprout: '#9cd47a',
  turnLeaf: '#7fbf5f', turnLeaf2: '#6aa84f', bulb: '#f8f0ee', bulbTop: '#b06aa8',
  carLeaf: '#6fae4f', carLeaf2: '#86c25e', root: '#ef8a3c',
  herbLeaf: '#6fbf54', herbLeaf2: '#88cf62', bloom: '#fffaf0',
  skyLeaf: '#6fb89a', skyLeaf2: '#8fcfae', vine: '#5f8f6a', berry: '#7f8fe0', berry2: '#a8b4ff', bud: '#d8e4f6', cane: '#c8a878',
  dead: '#a8946a', dead2: '#8a7650', deadStem: '#7a6a48', wood: '#b89070', wood2: '#7a5a42', tagPost: '#c8a878',
}
// leaf: flattened octahedron whose base sits at the origin, tilted up by `pitch`, turned by `yaw`
function leaf(out, c, len, wid, pitch, yaw, y0 = 0, x0 = 0, z0 = 0) {
  // place the leaf centre half a length out along its tilted direction
  const dx = Math.sin(yaw) * Math.cos(pitch), dy = Math.sin(pitch), dz = Math.cos(yaw) * Math.cos(pitch)
  out.push({ k: 'oct', c, p: [x0 + dx * len / 2, y0 + dy * len / 2, z0 + dz * len / 2], s: [wid / 2, wid * 0.09, len / 2], r: [-pitch, yaw, 0], order: 'YXZ' })
}
const rnd = (seed) => { let s = seed % 2147483647; if (s <= 0) s += 2147483646; return () => (s = (s * 16807) % 2147483647) / 2147483647 }
// ---------- crops ----------
// h = overall growth factor per stage
const GROW = { seed: 0, sprout: 0.32, young: 0.6, mature: 0.88, ripe: 1, withered: 0.7 }
export function plantParts(crop, stage, r, lo) {
  const o = [], g = GROW[stage], dead = stage === 'withered'
  const dc = (c, c2) => dead ? (r() < 0.5 ? COL.dead : COL.dead2) : (c2 && r() < 0.5 ? c2 : c)
  if (stage === 'seed') {
    o.push({ ...P('dome', COL.soilMound, [0, 0, 0], [0.034, 0.014, 0.03], [0, r() * 3, 0], 0), ink: true })
    const sc = crop === 'skyseed' ? COL.skySeed : COL.seed
    for (let k = 0; k < (crop === 'skyseed' ? 1 : 3); k++) { const a = k * 2.1 + r(); o.push(P('oct', sc, [Math.cos(a) * 0.01 * (k ? 1 : 0.2), 0.013, Math.sin(a) * 0.01 * (k ? 1 : 0.2)], crop === 'skyseed' ? [0.007, 0.005, 0.01] : [0.0035, 0.0025, 0.005], [0, a, 0], 0)) }
    return o
  }
  if (stage === 'sprout') {
    o.push({ ...P('dome', COL.soilMound, [0, 0, 0], [0.026, 0.008, 0.024], [0, 0, 0], 0), ink: false })
    o.push(P('cyl', COL.stem, [0, 0, 0], [0.0018, 0.022, 0.0018]))
    const yaw = r() * 3, lc = crop === 'skyseed' ? COL.skyLeaf2 : COL.sprout
    leaf(o, lc, 0.016, 0.011, 0.45, yaw, 0.02); leaf(o, lc, 0.016, 0.011, 0.45, yaw + Math.PI, 0.02)
    if (crop === 'carrot') leaf(o, COL.carLeaf2, 0.014, 0.004, 1.2, yaw + 1.6, 0.02)
    return o
  }
  const n = lo ? 0.6 : 1 // lo quality: fewer leaves
  if (crop === 'turnip') {
    const leaves = Math.round((stage === 'young' ? 4 : 6) * n)
    for (let k = 0; k < leaves; k++) leaf(o, dc(COL.turnLeaf, COL.turnLeaf2), (0.04 + 0.03 * g) * (0.85 + 0.3 * r()), 0.02 + 0.014 * g, dead ? -0.15 + 0.3 * r() : 0.75 + 0.45 * r(), k / leaves * 6.283 + r() * 0.5, 0.012 * g)
    if (stage !== 'young') { const b = stage === 'ripe' ? 0.03 : stage === 'mature' ? 0.022 : 0.024, sunk = stage === 'ripe' ? 0.45 : 0.25
      o.push(P('ball', dead ? '#d8ccb8' : COL.bulb, [0, b * sunk, 0], [b, b * 0.9, b], [0, 0, 0], 0))
      o.push(P('cap', dead ? '#8a6a7a' : COL.bulbTop, [0, b * sunk + b * 0.05, 0], [b * 1.05, b * 0.95, b * 1.05], [0, 0, 0], 0)) }
  } else if (crop === 'carrot') {
    const fr = Math.round((stage === 'young' ? 4 : 5) * n)
    for (let k = 0; k < fr; k++) { const yaw = k / fr * 6.283 + r() * 0.6, pit = dead ? 0.55 + 0.3 * r() : 1.0 + 0.35 * r(), len = (0.05 + 0.05 * g) * (0.8 + 0.35 * r()) * (dead ? 0.45 : 1)
      const dx = Math.sin(yaw) * Math.cos(pit), dy = Math.sin(pit), dz = Math.cos(yaw) * Math.cos(pit)
      o.push({ k: 'cyl', c: dead ? COL.deadStem : COL.stem, p: [0, 0.004, 0], s: [0.0016, len, 0.0016], r: [Math.PI / 2 - pit, yaw, 0], order: 'YXZ' })
      for (let j = 1; j <= 1; j++) leaf(o, dc(COL.carLeaf, COL.carLeaf2), 0.018 + 0.006 * g, 0.009, pit - 0.4, yaw + (j % 2 ? 0.5 : -0.5), 0.004 + dy * len * (j / 2.6), dx * len * (j / 2.6), dz * len * (j / 2.6))
      // feathery tip
      leaf(o, dc(COL.carLeaf2, COL.carLeaf), 0.016, 0.01, pit, yaw, 0.004 + dy * len, dx * len, dz * len) }
    if (stage !== 'young') { const rr = stage === 'ripe' ? 0.017 : 0.011
      o.push(P('cone', dead ? '#b8865a' : COL.root, [0, stage === 'ripe' ? 0.014 : 0.005, 0], [rr, 0.05, rr], [Math.PI, 0, 0], 0)) }
  } else if (crop === 'herb') {
    const stems = Math.round((stage === 'young' ? 3 : 4) * n), pairs = 2
    for (let k = 0; k < stems; k++) { const yaw = k / stems * 6.283 + r() * 0.5, lean = (dead ? 0.5 : 0.18) + 0.12 * r(), hgt = (0.035 + 0.05 * g) * (0.8 + 0.4 * r()) * (dead ? 0.7 : 1)
      const ox = Math.sin(yaw) * 0.006, oz = Math.cos(yaw) * 0.006
      o.push({ k: 'cyl', c: dead ? COL.deadStem : COL.stem, p: [ox, 0, oz], s: [0.0017, hgt, 0.0017], r: [lean, yaw, 0], order: 'YXZ' })
      const ux = Math.sin(yaw) * Math.sin(lean), uy = Math.cos(lean), uz = Math.cos(yaw) * Math.sin(lean)
      for (let j = 1; j <= pairs; j++) { const t = j / (pairs + 0.6), y = uy * hgt * t, x = ox + ux * hgt * t, z = oz + uz * hgt * t, ls = 0.021 * (1.15 - t * 0.4)
        leaf(o, dc(COL.herbLeaf, COL.herbLeaf2), ls, ls * 0.8, dead ? -0.5 : 0.25, yaw + 1.57 + j, y, x, z); leaf(o, dc(COL.herbLeaf, COL.herbLeaf2), ls, ls * 0.8, dead ? -0.5 : 0.25, yaw - 1.57 + j, y, x, z) }
      // tip: a small round cluster (and white blossoms when ripe)
      o.push(P('oct', dc(COL.herbLeaf2), [ox + ux * hgt, uy * hgt, oz + uz * hgt], [0.008, 0.006, 0.008], [0, yaw, 0]))
      if (stage === 'ripe') o.push(P('oct', COL.bloom, [ox + ux * hgt, uy * hgt + 0.007, oz + uz * hgt], [0.0055, 0.0055, 0.0055], [0, yaw, 0])) }
  } else { // skyseed: a little vine climbing a cane, pale buds -> glowing skyberries
    const H = 0.05 + 0.08 * g, segs = 3
    if (stage !== 'young') o.push(P('cyl', COL.cane, [0.012, 0, 0], [0.0022, H * 1.08, 0.0022], [0, 0, 0], 0.2))
    let x = 0, y = 0, z = 0
    for (let k = 0; k < segs; k++) { const yaw = k * 2.2 + r(), lean = dead ? 0.9 : 0.32, len = H / segs * 1.08
      o.push({ k: 'cyl', c: dead ? COL.deadStem : COL.vine, p: [x, y, z], s: [0.0019, len, 0.0019], r: [lean, yaw, 0], order: 'YXZ' })
      x += Math.sin(yaw) * Math.sin(lean) * len; y += Math.cos(lean) * len; z += Math.cos(yaw) * Math.sin(lean) * len
      leaf(o, dc(COL.skyLeaf, COL.skyLeaf2), 0.03, 0.022, dead ? -0.6 : 0.35, yaw + 1.8, y, x, z)
      if (!lo || k % 2) leaf(o, dc(COL.skyLeaf2, COL.skyLeaf), 0.026, 0.019, dead ? -0.6 : 0.5, yaw - 1.4, y - len * 0.4, x, z)
      if (stage === 'mature') o.push(P('oct', COL.bud, [x + 0.006, y - 0.004, z], [0.005, 0.007, 0.005]))
      if (stage === 'ripe') { o.push(P('ico', k % 2 ? COL.berry : COL.berry2, [x + 0.008, y - 0.006, z], [0.0085, 0.0085, 0.0085])); if (!lo) o.push(P('ico', COL.berry, [x - 0.006, y - 0.01, z + 0.005], [0.007, 0.007, 0.007])) } }
  }
  return o
}
// where sparkles go (plant-local), ripe only
export function sparkleSpots(crop) { return crop === 'skyseed' ? [[0.01, 0.1, 0], [-0.01, 0.06, 0.008]] : crop === 'herb' ? [[0, 0.085, 0]] : crop === 'turnip' ? [[0, 0.05, 0]] : [[0, 0.06, 0]] }
// plants per bed (bed-local x/z)
export const SLOTS = [[-0.065, -0.065], [0.065, -0.065], [-0.065, 0.065], [0.065, 0.065]]
// marker stake with the crop's colour tag (bed-local)
export function stakeParts(crop) { return [P('box', COL.tagPost, [0.118, 0.035, -0.118], [0.006, 0.07, 0.006], [0, 0.6, 0], 0.15), P('box', TAG[crop] || '#e8dcc8', [0.118, 0.066, -0.118], [0.026, 0.018, 0.004], [0, 0.6, 0.05], 0.15)] }
// ---------- the bed: tilled soil with three furrow ridges + plank edging + corner pegs (one geometry, instanced) ----------
export function bedGeometry() {
  const parts = [], S = PLOT_SIZE, iw = S - 0.036
  parts.push({ ...P('box', '#86603f', [0, 0.012, 0], [iw, 0.026, iw]), soil: 1 })
  for (let k = -1; k <= 1; k++) parts.push({ k: 'cyl', c: '#93694a', p: [-iw / 2 + 0.004, 0.022, k * 0.075], s: [0.012, iw - 0.008, 0.009], r: [0, 0, -Math.PI / 2], soil: 1 })
  const pl = (x, z, lx, lz, c) => parts.push(P('box', c, [x, 0.02, z], [lx, 0.04, lz]))
  pl(0, -S / 2 + 0.01, S, 0.02, COL.wood); pl(0, S / 2 - 0.01, S, 0.02, '#a88462'); pl(-S / 2 + 0.01, 0, 0.02, S - 0.04, '#a88462'); pl(S / 2 - 0.01, 0, 0.02, S - 0.04, COL.wood)
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) parts.push(P('box', COL.wood2, [x * (S / 2 - 0.01), 0.026, z * (S / 2 - 0.01)], [0.026, 0.052, 0.026]))
  const out = { pos: [], nor: [], col: [], base: [], w: [] }, soil = []
  const id = new THREE.Matrix4(), O = new THREE.Vector3()
  for (const pt of parts) { const before = out.pos.length / 3; emitParts([pt], id, O, out); const cnt = out.pos.length / 3 - before; for (let i = 0; i < cnt; i++) soil.push(pt.soil ? 1 : 0) }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(out.pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(out.nor, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(out.col, 3)); g.setAttribute('aSoil', new THREE.Float32BufferAttribute(soil, 1))
  return g
}
export { rnd }
