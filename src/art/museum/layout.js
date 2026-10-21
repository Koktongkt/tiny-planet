// Ruins museum interior layout (art-c item 7), in room units (like home/state.js ROOM): y up, floor at 0, the camera
// is expected to look toward -z (door on the back wall, as at Home). Codor: walls + BLOCKS for collision, slots for prompts.
export const MUSEUM = { x0: -1.6, x1: 1.6, z0: -1.2, z1: 1.2, h: 1.36, S: 1.25 }
export const MDOOR = { x: 1.05, z: -1.2, w: 0.3, h: 0.56 }
export const DESK = { x: -0.15, z: -0.86, w: 0.5, d: 0.22, h: 0.19 }
export const TANK = { x: -1.36, z: 0.05, len: 1.4, d: 0.38, y0: 0.24, y1: 0.54 }
const P = (id, x, z) => ({ id, kind: 'relic', x, z, y: 0.215 })
// relic plinths: a column along the right wall + a 2×2 island; fish live in the tank (plaques on the tank cabinet)
export const SLOTS = [
  P('shard', 1.24, -0.5), P('coin', 1.24, -0.08), P('crystal', 1.24, 0.34), P('relic_tile', 1.24, 0.76),
  P('relic_bell', -0.5, 0.12), P('relic_lens', -0.08, 0.12), P('relic_mask', -0.5, 0.56), P('relic_bowl', -0.08, 0.56),
  { id: 'koi', kind: 'fish', x: -1.14, z: -0.42, y: 0.16 }, { id: 'sea_bream', kind: 'fish', x: -1.14, z: 0.05, y: 0.16 }, { id: 'lake_lord', kind: 'fish', x: -1.14, z: 0.52, y: 0.16 },
]
export const SLOT_IDS = SLOTS.map(s => s.id)
// walk-blocking boxes (x0, x1, z0, z1)
export const MBLOCKS = [
  { x0: TANK.x - TANK.d / 2 - 0.06, x1: TANK.x + TANK.d / 2 + 0.04, z0: TANK.z - TANK.len / 2, z1: TANK.z + TANK.len / 2 },
  { x0: DESK.x - DESK.w / 2 - 0.05, x1: DESK.x + DESK.w / 2 + 0.05, z0: -1.2, z1: DESK.z + DESK.d / 2 + 0.02 },
  { x0: 1.1, x1: 1.6, z0: -0.66, z1: 0.92 }, { x0: -0.64, x1: 0.06, z0: -0.02, z1: 0.7 },
  { x0: -1.6, x1: -0.6, z0: -1.2, z1: -0.98 }, // bookshelf
]
/** the slot she'd inspect from (x, z), or null: nearest slot within r */
export function slotNear(x, z, r = 0.32) { let best = null, bd = r; for (const s of SLOTS) { const d = Math.hypot(s.x - x, s.z - z); if (d < bd) { bd = d; best = s } } return best }
