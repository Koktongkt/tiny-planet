// Ruins museum hall geometry (art-c item 7): one merged toon mesh (+ baked ink, kit.combine) for the room and furniture,
// one glow mesh (windows + lanterns + desk lamp, lit through the night pass) and the tank glass/water.
import { kit, combine, tris } from '../train/kit.js'
import { MUSEUM as M, MDOOR, DESK, TANK, SLOTS } from './layout.js'
const C = { floor: '#b98a5c', floor2: '#a8784c', wall: '#f3e6cc', wain: '#8a5a3c', beam: '#6e4a33', ceil: '#e8d6b4', rug: '#b5524a', rug2: '#e8b45a',
  plinth: '#7a5236', cap: '#f4ead2', desk: '#8a5a3c', paper: '#fbf3e2', book: ['#b5524a', '#4f7f8f', '#d9a54a', '#6f9e4f', '#7d6a8c', '#c97a4a'], cab: '#6e4a33', brass: '#d9a54a', leaf: '#6fae5f', pot: '#c9734a', iron: '#3b3633', sand: '#e6d6a8', weed: '#5f9a52' }
const rnd = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x) }
export function buildHall({ touch = false } = {}) {
  const K = kit({ ink: 0.008 }), { x0, x1, z0, z1, h } = M, W = x1 - x0, D = z1 - z0
  // floor planks + rug
  K.box(W, 0.04, D, [0, -0.02, 0], C.floor, { hull: false })
  for (let i = 1; i < 10; i++) K.box(0.006, 0.002, D, [x0 + i * W / 10, 0.001, 0], C.floor2, { hull: false })
  K.box(1.3, 0.006, 0.7, [0.45, 0.004, 0.25], C.rug, { hull: false }); K.box(1.16, 0.004, 0.56, [0.45, 0.008, 0.25], C.rug2, { hull: false }); K.box(1.04, 0.004, 0.44, [0.45, 0.011, 0.25], C.rug, { hull: false })
  // walls: back, left, right (front open for the camera), wainscot + top rail, corner posts, ceiling beams
  K.box(W, h, 0.04, [0, h / 2, z0 - 0.02], C.wall, { hull: false }); K.box(0.04, h, D, [x0 - 0.02, h / 2, 0], C.wall, { hull: false }); K.box(0.04, h, D, [x1 + 0.02, h / 2, 0], C.wall, { hull: false })
  K.box(W, 0.34, 0.02, [0, 0.17, z0 + 0.01], C.wain, { hull: false }); K.box(0.02, 0.34, D, [x0 + 0.01, 0.17, 0], C.wain, { hull: false }); K.box(0.02, 0.34, D, [x1 - 0.01, 0.17, 0], C.wain, { hull: false })
  K.box(W, 0.025, 0.035, [0, 0.35, z0 + 0.02], C.beam, { hull: false }); K.box(0.035, 0.025, D, [x0 + 0.02, 0.35, 0], C.beam, { hull: false }); K.box(0.035, 0.025, D, [x1 - 0.02, 0.35, 0], C.beam, { hull: false })
  for (const x of [x0 + 0.03, -0.55, 0.55, x1 - 0.03]) K.box(0.06, h, 0.06, [x, h / 2, z0 + 0.03], C.beam)
  for (const z of [-0.4, 0.4]) { K.box(0.06, h, 0.06, [x0 + 0.03, h / 2, z], C.beam); K.box(0.06, h, 0.06, [x1 - 0.03, h / 2, z], C.beam) }
  for (const z of [-0.9, -0.3, 0.3, 0.9]) K.box(W, 0.07, 0.07, [0, h - 0.035, z], C.beam)
  K.box(W, 0.03, D, [0, h + 0.015, 0], C.ceil, { hull: false })
  // back-wall arched windows (glow) with frames; side window over the tank
  for (const x of [-0.85, 0.25]) { K.box(0.36, 0.42, 0.012, [x, 0.78, z0 + 0.01], '#fff0c8', { glow: true }); K.box(0.4, 0.03, 0.03, [x, 0.56, z0 + 0.025], C.beam); K.box(0.4, 0.03, 0.03, [x, 1.0, z0 + 0.025], C.beam)
    K.cyl(0.2, 0.03, [x, 1.0, z0 + 0.025], C.beam, { rot: [Math.PI / 2, 0, 0], seg: 10, theta: Math.PI, t0: -Math.PI / 2, hull: false }); K.cyl(0.18, 0.012, [x, 1.0, z0 + 0.012], '#fff0c8', { rot: [Math.PI / 2, 0, 0], seg: 10, theta: Math.PI, t0: -Math.PI / 2, glow: true })
    K.box(0.02, 0.42, 0.03, [x, 0.78, z0 + 0.025], C.beam, { hull: false }); K.box(0.36, 0.02, 0.03, [x, 0.78, z0 + 0.025], C.beam, { hull: false }) }
  // door (back wall, as at Home)
  K.box(MDOOR.w + 0.06, MDOOR.h + 0.04, 0.03, [MDOOR.x, (MDOOR.h + 0.04) / 2, z0 + 0.02], C.beam); K.box(MDOOR.w, MDOOR.h, 0.02, [MDOOR.x, MDOOR.h / 2, z0 + 0.04], '#a8744c'); K.sphere(0.018, [MDOOR.x - 0.1, 0.28, z0 + 0.06], C.brass, { seg: 6, hull: false })
  // bookshelf (back-left corner) with books
  K.box(0.9, 0.9, 0.2, [x0 + 0.52, 0.45, z0 + 0.11], C.cab)
  for (let r = 0; r < 4; r++) { K.box(0.84, 0.02, 0.17, [x0 + 0.52, 0.06 + r * 0.22, z0 + 0.13], C.beam, { hull: false })
    let x = x0 + 0.12; for (let i = 0; x < x0 + 0.9 && i < (touch ? 8 : 12); i++) { const w = 0.035 + rnd(r * 20 + i) * 0.03, hh = 0.12 + rnd(r * 31 + i) * 0.06; K.box(w, hh, 0.14, [x + w / 2, 0.07 + r * 0.22 + hh / 2, z0 + 0.13], C.book[(r * 5 + i) % 6], { hull: false }); x += w + 0.006 } }
  // Hoshino's desk: top, legs, papers, a book stack, a brass desk lamp (glow bulb), a magnifier, an inkwell
  const dx = DESK.x, dz = DESK.z
  K.box(DESK.w, 0.035, DESK.d, [dx, DESK.h, dz], C.desk); for (const sx of [-1, 1]) K.box(0.05, DESK.h, DESK.d - 0.04, [dx + sx * (DESK.w / 2 - 0.05), DESK.h / 2, dz], C.beam)
  K.box(DESK.w - 0.08, 0.14, 0.02, [dx, DESK.h - 0.09, dz + DESK.d / 2 - 0.02], C.wain, { hull: false })
  K.box(0.16, 0.004, 0.11, [dx - 0.05, DESK.h + 0.02, dz + 0.03], C.paper, { rot: [0, 0.2, 0], hull: false }); K.box(0.13, 0.004, 0.1, [dx + 0.06, DESK.h + 0.022, dz + 0.02], '#f0e4c8', { rot: [0, -0.3, 0], hull: false })
  for (let i = 0; i < 3; i++) K.box(0.12 - i * 0.01, 0.028, 0.085, [dx + 0.22, DESK.h + 0.032 + i * 0.028, dz - 0.04], C.book[i + 1], { rot: [0, i * 0.15, 0], hull: false })
  K.cyl(0.03, 0.01, [dx - 0.23, DESK.h + 0.022, dz - 0.05], C.brass, { seg: 8, hull: false }); K.box(0.008, 0.12, 0.008, [dx - 0.23, DESK.h + 0.08, dz - 0.05], C.brass, { hull: false })
  K.cyl(0.03, 0.04, [dx - 0.2, DESK.h + 0.14, dz - 0.05], '#3f6f6a', { r2: 0.012, seg: 8, hull: false }); K.sphere(0.016, [dx - 0.2, DESK.h + 0.115, dz - 0.05], '#ffd79a', { seg: 6, glow: true })
  K.cyl(0.018, 0.026, [dx + 0.02, DESK.h + 0.03, dz - 0.07], '#2e2a33', { seg: 6, hull: false })
  // relic plinths
  for (const s of SLOTS) if (s.kind === 'relic') { K.box(0.2, 0.34, 0.2, [s.x, 0.17, s.z], C.plinth); K.box(0.24, 0.035, 0.24, [s.x, 0.355, s.z], C.cap); K.box(0.23, 0.03, 0.23, [s.x, 0.015, s.z], C.beam, { hull: false }) }
  // tank cabinet (the glass + water are their own meshes)
  K.box(TANK.d + 0.06, TANK.y0, TANK.len + 0.06, [TANK.x, TANK.y0 / 2, TANK.z], C.cab)
  K.box(TANK.d + 0.04, 0.03, TANK.len + 0.04, [TANK.x, TANK.y1 + 0.015, TANK.z], C.beam) // lid rim
  K.box(TANK.d - 0.02, 0.03, TANK.len - 0.02, [TANK.x, TANK.y0 + 0.015, TANK.z], C.sand, { hull: false }) // sand
  for (let i = 0; i < (touch ? 5 : 9); i++) { const z = TANK.z - TANK.len / 2 + 0.1 + i * (TANK.len - 0.2) / 8, hh = 0.1 + rnd(i) * 0.16; K.box(0.016, hh, 0.016, [TANK.x - 0.08 + rnd(i + 9) * 0.16, TANK.y0 + 0.03 + hh / 2, z], C.weed, { rot: [0, 0, (rnd(i + 3) - 0.5) * 0.4], hull: false }) }
  for (let i = 0; i < 4; i++) K.sphere(0.03 + rnd(i + 40) * 0.025, [TANK.x - 0.1 + rnd(i + 50) * 0.2, TANK.y0 + 0.04, TANK.z - 0.5 + i * 0.33], '#9a948a', { seg: 6, scale: [1.3, 0.7, 1], hull: false })
  // hanging lanterns (glow) on cords
  for (const [x, z] of [[-0.3, 0.3], [0.7, -0.1], [0.7, 0.7]]) { K.box(0.006, 0.22, 0.006, [x, h - 0.11, z], C.iron, { hull: false }); K.cyl(0.045, 0.1, [x, h - 0.27, z], '#ffd28a', { seg: 8, glow: true }); K.cyl(0.05, 0.015, [x, h - 0.215, z], C.iron, { seg: 8, hull: false }); K.cyl(0.05, 0.015, [x, h - 0.325, z], C.iron, { seg: 8, hull: false }) }
  // plants: a big pot by the door and one by the tank
  for (const [x, z, s] of [[0.62, -1.0, 1.2], [-1.38, 0.95, 1]]) { K.cyl(0.08 * s, 0.14 * s, [x, 0.07 * s, z], C.pot, { r2: 0.1 * s, seg: 8 }); for (let i = 0; i < 5; i++) K.sphere(0.07 * s, [x + Math.cos(i * 1.3) * 0.05 * s, (0.2 + i * 0.05) * s, z + Math.sin(i * 1.3) * 0.05 * s], i % 2 ? C.leaf : '#8fcf6a', { seg: 6, hull: false }) }
  return K.build()
}
/** tank glass (5 panes, back/top open to the camera at +z) + water volume, separate so they can be transparent */
export function buildTank() {
  const G = kit({ inkOn: false }), Wt = kit({ inkOn: false }), { x, z, len, d, y0, y1 } = TANK, hh = y1 - y0
  G.box(d, hh, 0.008, [x, y0 + hh / 2, z - len / 2], '#dff1f4'); G.box(d, hh, 0.008, [x, y0 + hh / 2, z + len / 2], '#dff1f4'); G.box(0.008, hh, len, [x + d / 2, y0 + hh / 2, z], '#dff1f4')
  for (const zz of [z - len / 2, z + len / 2]) for (const xx of [x - d / 2, x + d / 2]) G.box(0.02, hh, 0.02, [xx, y0 + hh / 2, zz], '#6e4a33')
  Wt.box(d - 0.02, hh - 0.08, len - 0.02, [x, y0 + (hh - 0.08) / 2 + 0.02, z], '#7fc4cf')
  return { glass: G.build().body, water: Wt.build().body }
}
export function hallGeometry(o) { const b = buildHall(o); return { one: combine(b), glow: b.glow, tris: tris(combine(b)) + tris(b.glow) } }
