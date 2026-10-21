// 3D relics for the museum plinths (art-c item 7): tiny merged kit models, ~0.1-0.15 room units, base at y = 0.
// relicGeometry(id) -> { body, hull, glow } (kit.build); chalkOutline(id) -> Float32Array line segments (xz, for empty slots).
import { kit } from '../train/kit.js'
const B = { gold: '#e2b04a', gold2: '#b07a2a', cream: '#f4ecd8', blue: '#4f7fb8', red: '#d9655b', bronze: '#c9963a', glass: '#cfe2ee', white: '#fbf6ec', glaze: '#8f9a6a', clay: '#c9a27a', ink: '#4a3a35', lilac: '#c9b3ff', ice: '#a8c8f0' }
const MAKE = {
  shard: (K) => { K.box(0.13, 0.016, 0.09, [0, 0.03, 0], B.cream, { rot: [0.5, 0.3, 0.15] }); K.box(0.12, 0.004, 0.012, [0.002, 0.04, 0.004], B.blue, { rot: [0.5, 0.3, 0.15], hull: false }); K.box(0.02, 0.016, 0.02, [0, 0.008, 0.02], B.clay, { hull: false }) },
  coin: (K) => { K.cyl(0.05, 0.012, [0, 0.07, 0], B.gold, { rot: [Math.PI / 2 - 0.25, 0, 0], seg: 14 }); K.box(0.026, 0.026, 0.016, [0, 0.07, 0.002], B.gold2, { rot: [-0.25, 0, Math.PI / 4], hull: false }); K.box(0.07, 0.02, 0.04, [0, 0.01, 0], '#8a5a3c') },
  crystal: (K) => { K.cyl(0.03, 0.12, [0, 0.06, 0], B.ice, { r2: 0.004, seg: 6 }); K.cyl(0.022, 0.08, [0.035, 0.035, 0.01], B.lilac, { r2: 0.003, seg: 6, rot: [0, 0, -0.45] }); K.cyl(0.018, 0.065, [-0.03, 0.03, -0.01], '#d8d0f0', { r2: 0.003, seg: 6, rot: [0.2, 0, 0.5] }) },
  relic_tile: (K) => { K.box(0.12, 0.12, 0.014, [0, 0.07, 0], B.cream, { rot: [-0.2, 0, 0] }); for (const y of [0.045, 0.075, 0.105]) for (let i = 0; i < 4; i++) K.box(0.022, 0.008, 0.004, [-0.042 + i * 0.028, y + (i % 2) * 0.006, 0.012 - y * 0.2], B.blue, { rot: [-0.2, 0, (i % 2 ? -0.5 : 0.5)], hull: false }); K.box(0.07, 0.014, 0.05, [0, 0.007, -0.02], '#8a5a3c') },
  relic_bell: (K) => { K.cyl(0.055, 0.08, [0, 0.05, 0], B.bronze, { r2: 0.034, seg: 12 }); K.sphere(0.034, [0, 0.09, 0], B.bronze, { seg: 10, scale: [1, 0.6, 1], hull: false }); K.cyl(0.06, 0.012, [0, 0.012, 0], B.gold2, { seg: 12, hull: false }); K.box(0.006, 0.04, 0.006, [0, 0.12, 0], B.red, { hull: false }); K.sphere(0.014, [0.03, 0.14, 0], B.red, { seg: 6, hull: false }) },
  relic_lens: (K) => { K.cyl(0.055, 0.016, [0, 0.085, 0], B.gold, { rot: [Math.PI / 2, 0, 0], seg: 14 }); K.cyl(0.044, 0.018, [0, 0.085, 0.001], B.glass, { rot: [Math.PI / 2, 0, 0], seg: 14, hull: false }); K.box(0.012, 0.05, 0.012, [0, 0.03, 0], '#8a5a3c', { hull: false }); K.box(0.07, 0.012, 0.05, [0, 0.006, 0], '#8a5a3c') },
  relic_mask: (K) => { K.sphere(0.055, [0, 0.075, 0], B.white, { seg: 10, scale: [1, 1.05, 0.55] }); for (const s of [-1, 1]) K.cyl(0.02, 0.05, [s * 0.035, 0.13, 0], B.white, { r2: 0.001, seg: 6, rot: [0, 0, -s * 0.35] }); K.cyl(0.018, 0.04, [0, 0.055, 0.03], B.white, { r2: 0.006, seg: 6, rot: [Math.PI / 2 - 0.2, 0, 0], hull: false })
    for (const s of [-1, 1]) { K.box(0.028, 0.006, 0.004, [s * 0.024, 0.085, 0.03], B.ink, { rot: [0, 0, s * 0.3], hull: false }); K.box(0.008, 0.024, 0.004, [s * 0.04, 0.115, 0.022], B.red, { rot: [0, 0, s * 0.3], hull: false }) }
    K.box(0.08, 0.012, 0.04, [0, 0.006, -0.01], '#8a5a3c') },
  relic_bowl: (K) => { K.cyl(0.066, 0.06, [0.002, 0.04, 0], B.glaze, { r2: 0.07, seg: 12 }); K.cyl(0.04, 0.012, [0, 0.006, 0], '#7a5236', { seg: 10, hull: false }); K.cyl(0.06, 0.004, [0.002, 0.069, 0], '#c9b88a', { seg: 12, hull: false }); K.box(0.02, 0.025, 0.004, [0.03, 0.05, 0.063], '#6a7a4a', { hull: false }) },
}
export const RELIC_MODEL_IDS = Object.keys(MAKE)
/** one kit per id, positioned at `pos` (merge several donated relics into one draw call with relicsGeometry) */
export function relicsInto(K, id, pos, s = 1.2) { const f = MAKE[id]; if (!f) return K
  const off = (p) => [p[0] * s + pos[0], p[1] * s + pos[1], p[2] * s + pos[2]], k = { box: (w, h, d, p, c, o = {}) => K.box(w * s, h * s, d * s, off(p), c, o), cyl: (r, l, p, c, o = {}) => K.cyl(r * s, l * s, off(p), c, { ...o, r2: o.r2 != null ? o.r2 * s : undefined }), sphere: (r, p, c, o = {}) => K.sphere(r * s, off(p), c, o) }
  f(k); return K }
export function relicGeometry(id, s = 1) { const K = kit({ ink: 0.004 }); relicsInto(K, id, [0, 0, 0], s); return K.build() }
// chalk outlines for empty plinths: a rough hand-drawn loop (two passes, jittered) of the relic's footprint silhouette
const SIL = { shard: [[-0.06, -0.03], [0.05, -0.045], [0.07, 0.02], [0.0, 0.045], [-0.055, 0.02]], coin: 'circle', crystal: [[-0.04, -0.03], [0.0, -0.05], [0.045, -0.02], [0.03, 0.04], [-0.035, 0.035]],
  relic_tile: [[-0.06, -0.06], [0.06, -0.06], [0.06, 0.06], [-0.06, 0.06]], relic_bell: 'circle', relic_lens: 'circle', relic_mask: [[-0.05, -0.04], [-0.04, 0.05], [0, 0.03], [0.04, 0.05], [0.05, -0.04], [0, -0.06]], relic_bowl: 'circle' }
export function chalkOutline(id, cx = 0, cz = 0, y = 0, seed = 1) {
  let pts = SIL[id] || 'circle'; if (pts === 'circle') { pts = []; for (let i = 0; i < 12; i++) pts.push([Math.cos(i / 12 * Math.PI * 2) * 0.06, Math.sin(i / 12 * Math.PI * 2) * 0.06]) }
  const out = [], j = (i) => (Math.sin(seed * 91.7 + i * 12.9) * 0.5) * 0.008
  for (let pass = 0; pass < 2; pass++) for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length], k = pass * 50 + i
    out.push(cx + a[0] * 1.15 + j(k), y, cz + a[1] * 1.15 + j(k + 7), cx + b[0] * 1.15 + j(k + 1), y, cz + b[1] * 1.15 + j(k + 8)) }
  // a little question mark doodle beside it
  const q = [[0.08, -0.02], [0.095, -0.035], [0.11, -0.02], [0.095, 0.0], [0.095, 0.015]]; for (let i = 0; i < q.length - 1; i++) out.push(cx + q[i][0], y, cz + q[i][1], cx + q[i + 1][0], y, cz + q[i + 1][1])
  out.push(cx + 0.095, y, cz + 0.028, cx + 0.095, y, cz + 0.032)
  return out
}
