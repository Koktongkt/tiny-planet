// Outdoor set: her round cottage, puffy trees, flowering bushes, fences + gate, stepping stones, rocks and sprouts.
// Same chibi language and units as items/home.js + items/house.js (room units: she is ~0.39 tall, front = +z, y = 0 at
// the base). Outdoors they are placed at HOME_S (1.25), her true size. Every item is a reusable catalog prop: tweak it
// with opts / pal (roof colour, window layout, crown size...) and drop it anywhere (<Prop id="puffTree" opts={...} />),
// or compose many into one baked mesh with compose() + k.use() (see home/Exterior.jsx).
// Review them in the prop studio: /propstudio.html?id=cottage (or puffTree, flowerBush, fence, gate ...).
import * as THREE from 'three'
import { defineProp } from '../kit.js'
import './house.js' // doorLeaf / doorFrame / steps / lanternPost / bush: the cottage reuses her real front door

const PI = Math.PI, D2R = PI / 180
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _y = new THREE.Vector3(0, 1, 0), ONE = new THREE.Vector3(1, 1, 1)
// a placement matrix: position + yaw (+ uniform scale)
export const mat = (x, y, z, yaw = 0, s = 1) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), _q.clone().setFromAxisAngle(_y, yaw), ONE.clone().multiplyScalar(s))
// round-wall placement (same angles as the interior: phi 0 = back (-z), 90 = right (+x), 180 = front door (+z)):
// a frame on the wall's outer face at height y, facing out
const onWall = (phi, r, y) => mat(Math.sin(phi * D2R) * r, y, -Math.cos(phi * D2R) * r, PI - phi * D2R)
// a cheap little flower (5 petals + eye), facing up
function flower(k, pos, r, petal, eye = 'eye') {
  for (let i = 0; i < 5; i++) { const a = i / 5 * PI * 2; k.ball([r * 0.5, r * 0.2, r * 0.32], [pos[0] + Math.sin(a) * r * 0.55, pos[1], pos[2] + Math.cos(a) * r * 0.55], petal, { rot: [0, a, 0], out: false, lo: true }) }
  k.ball([r * 0.34, r * 0.24, r * 0.34], [pos[0], pos[1] + r * 0.1, pos[2]], eye, { out: false, lo: true })
}

// a puffy three-leaf clover stuck flat on a wall (facing +z): three plump heart leaflets round a centre and a
// little curled stem, like the reference's wall sprigs. s scales it; lean (+1 / -1) tips it toward one side.
function clover(k, s = 1, lean = 1) {
  const r = 0.024 * s, z = 0.006
  ;[[90, 'clover2'], [210, 'clover'], [330, 'clover']].forEach(([deg, c]) => {
    const a = (deg + lean * 12) * D2R, dx = Math.cos(a), dy = Math.sin(a), px = -dy, py = dx
    for (const sd of [-1, 1]) k.ball([r, r * 0.85, r * 0.42], [(dx * 1.25 + px * sd * 0.55) * r, (dy * 1.25 + py * sd * 0.55) * r, z + r * 0.12], c, { rot: [0, 0, a + sd * 0.5], hi: 0.3 }) // the heart's two lobes
    k.ball([r * 0.55, r * 0.4, r * 0.3], [dx * 0.55 * r, dy * 0.55 * r, z + r * 0.05], c, { rot: [0, 0, a], out: false }) // its point, toward the centre
  })
  k.ball(r * 0.3, [0, 0, z + r * 0.16], 'cloverStem', { out: false })
  k.stick([0.0055 * s, 0.05 * s], [lean * 0.006 * s, -0.026 * s, z], 'cloverStem', { rot: [0, 0, lean * 0.3], out: false })
  k.ball([0.006 * s, 0.006 * s, 0.004], [lean * 0.014 * s, -0.05 * s, z], 'cloverStem', { out: false })
}

// ---------- the cottage ----------
// A squat round plaster house under a three-tier tiled roof with a knob on top, after the reference: her real front
// door (doorLeaf/doorFrame, the same as inside), arched glowing windows with clover sprigs, a round bath porthole and
// a tall chimney back-right as on the reference. Window angles roughly follow the interior (sunny window -112ish,
// kitchen window -13, porthole 47), so the outside and inside agree.
//   opts: r, h (wall radius + height), roofR (roof size, independent of the walls), belly (how much the walls bulge), windows: [{ phi, clover }], porthole (phi | null), chimney: { phi, r } | null,
//         tiers (1-3), knob, door
defineProp('cottage', { name: 'Round cottage', size: [1.26, 1.16, 1.26], tags: ['outdoor', 'building'],
  pal: { wall: '#fbe6c6', roof: '#f08a4b', roof2: '#f59c5c', roof3: '#ec8243', roofDark: '#b85a2c', trim: '#e8873f', pane: '#ffd873', bar: '#d9773a', clover: '#9ccf45', clover2: '#b4de5e', cloverStem: '#86bb3c', chimney: '#7c4b39', chimneyCap: '#5d382b', knob: '#f6ddd4', porthole: '#cfe7ee' },
  opts: { r: 0.48, roofR: 0.44, h: 0.62, belly: 0.14, windows: [{ phi: -132, clover: true }, { phi: 132, clover: true }, { phi: -13 }], porthole: 47, chimney: { phi: 38, r: 0.3 }, tiers: 3, knob: true, door: true } }, (k, o) => {
  const RW = o.r, HW = o.h
  // walls: a plump, soft drum (a marshmallow): bulging out round the middle, a touch wider at the foot, very round edges
  const TAPER = -0.03, BELLY = o.belly
  k.pill([RW, HW], [0, HW / 2, 0], 'wall', { bevel: 0.2, taper: TAPER, belly: BELLY, hi: 0.06, shade: 0.12 })
  const rAt = (y) => { const t = Math.min(1, Math.max(0, y / HW)); return RW * (1 + TAPER * (t - 0.5) * 2) * (1 + BELLY * Math.sin(PI * t)) } // the drum's radius at height y
  let rDoor = 0; for (let y = 0; y <= 0.5; y += 0.01) rDoor = Math.max(rDoor, rAt(y)) // the door stands clear of the bulge
  // front door: the interior's own door + surround, set into a deep frame that buries itself in the curved wall
  if (o.door) {
    k.use('doorFrame', mat(0, 0, rDoor - 0.05), { d: 0.2, f: 0.055, shadow: false, pal: { frame: o.frame || '#e3843f', inner: '#a95a2a' } }) // deep, so it sinks into the round wall at its edges
    k.use('doorLeaf', mat(0, 0, rDoor + 0.004), { shadow: false })
  }
  // arched windows: orange frame, glowing panes behind a cross bar, a sill; a clover sprig above
  for (const w of o.windows || []) {
    const y = 0.18, ww = 0.17, hr = 0.11 // tall: the arch tops out near the door's, as on the reference
    k.within(onWall(w.phi, rAt(y + 0.08) - 0.004, y), () => {
      k.arch(ww, hr, 0.01, [0, 0, 0.004], 'pane', { glow: true, bevel: 0 })
      k.archFrame(ww, hr, 0.026, 0.04, [0, 0, 0.012], 'trim')
      k.box([0.014, hr + ww / 2, 0.012], [0, (hr + ww / 2) / 2, 0.014], 'bar', { r: 0.004, out: false, seg: 2 })
      k.box([ww, 0.014, 0.012], [0, hr * 0.9, 0.014], 'bar', { r: 0.004, out: false, seg: 2 })
      k.box([ww + 0.075, 0.024, 0.06], [0, -0.03, 0.026], 'trim', { r: 0.01, seg: 2 })
    })
    if (w.clover) k.within(onWall(w.phi + (w.phi < 0 ? -9 : 9), rAt(0.45) - 0.01, 0.45), () => clover(k, 1.55, w.phi < 0 ? 1 : -1)) // above the window, nudged toward the door
  }
  // the bath porthole: a round window with a thick ring
  if (o.porthole != null) k.within(onWall(o.porthole, rAt(0.34), 0.34), () => {
    k.pill([0.045, 0.012], [0, 0, 0.004], 'porthole', { glow: true, rot: [PI / 2, 0, 0], bevel: 0 })
    k.ring(0.05, 0.016, [0, 0, 0.01], 'trim')
  })
  // roof: a low rounded dome (steep at the eave, flattening toward the top, like the reference) under three tiers of
  // narrow rounded tiles, each tier overhanging the one below. Radii scale with roofR, so walls can widen under it.
  const E = HW - 0.08, rk = o.roofR / 0.44 // eave height
  const tiers = [[0.6, 0, 0.47, 0.15, 30], [0.5, 0.11, 0.34, 0.24, 22], [0.37, 0.2, 0.17, 0.3, 15]].slice(0, o.tiers)
    .map(([re, ye, rt, yt, n]) => [re * rk, E + ye, rt * rk, E + yt, n])
  k.dome([0.5 * rk, 0.27, 0.5 * rk], [0, E, 0], 'roofDark'); k.pill([0.5 * rk, 0.02], [0, E + 0.01, 0], 'roofDark', { out: false }) // the core + its underside
  tiers.forEach(([re, ye, rt, yt, n], ti) => {
    const L = Math.hypot(re - rt, yt - ye), th = Math.atan2(re - rt, yt - ye), rm = (re + rt) / 2, ym = (ye + yt) / 2, t = 0.045
    const tau = (rt / re - 1) / (rt / re + 1), w = 2 * PI * rm / n * 0.97 // a hair narrower than the gap: the tiles read one by one
    for (let i = 0; i < n; i++) { const a = (i + ti * 0.5) / n * PI * 2, rr = rm + t / 2 * Math.cos(th)
      k.box([w, L * 1.08, t], [Math.sin(a) * rr, ym + t / 2 * Math.sin(th), Math.cos(a) * rr], i % 3 === 1 ? 'roof2' : i % 3 === 2 ? 'roof3' : 'roof', { rot: [-th, a, 0], order: 'YXZ', r: t * 0.48, taper: tau, seg: 2, hi: 0.1, shade: 0.3 }) }
  })
  const top = tiers[tiers.length - 1][3]
  k.pill([tiers[tiers.length - 1][2] + 0.02, 0.07], [0, top + 0.01, 0], 'roof', { bevel: 0.45 })
  if (o.knob) { k.ring(0.075, 0.034, [0, top + 0.06, 0], 'roof2', { rot: [PI / 2, 0, 0] }); k.ball(0.055, [0, top + 0.1, 0], 'knob') }
  // chimney: a tall round stack standing up out of the roof (back-right, as on the reference) with a pointed hat
  if (o.chimney) { const c = o.chimney, x = Math.sin(c.phi * D2R) * c.r, z = -Math.cos(c.phi * D2R) * c.r
    k.pill([0.056, 0.42], [x, E + 0.21, z], 'chimney', { bevel: 0.1 })
    k.pill([0.066, 0.045], [x, E + 0.4, z], 'chimney', { bevel: 0.4 })
    k.cone([0.082, 0.1], [x, E + 0.47, z], 'chimneyCap', { n: 12 })
    k.ball(0.015, [x, E + 0.525, z], 'chimneyCap', { out: false })
  }
})
// where the cottage's smoke leaves (room units, house-local) for the given opts
export const chimneyTop = (c = { phi: 38, r: 0.3 }, h = 0.62) => [Math.sin(c.phi * D2R) * c.r, h + 0.42, -Math.cos(c.phi * D2R) * c.r]

// ---------- puffy tree ----------
// A broccoli tree: a stout tapered trunk with root flares and two forks, under a crown of soft round puffs.
//   opts: h (trunk), crown (puff cluster radius), lean, seed (varies puff sizes / turn)
defineProp('puffTree', { name: 'Puffy tree', size: [0.7, 1.05, 0.7], tags: ['outdoor', 'plant', 'tree'],
  pal: { bark: '#cf8a54', bark2: '#b87545', leaf: '#a2cc4a', leaf2: '#8fbd3f', leaf3: '#b6d963' }, opts: { h: 0.44, crown: 0.32, seed: 1 } }, (k, o) => {
  const H = o.h, C = o.crown, r = (i) => 0.88 + 0.24 * ((Math.sin(i * 12.9898 + o.seed * 78.233) * 43758.5453) % 1 + 1) % 1
  k.pill([0.07, H], [0, H / 2, 0], 'bark', { bevel: 0.12, taper: -0.35, hi: 0.04 })
  for (let i = 0; i < 3; i++) { const a = i * 2.2 + o.seed; k.pill([0.032, 0.08], [Math.sin(a) * 0.07, 0.03, Math.cos(a) * 0.07], 'bark2', { bevel: 0.5, rot: [Math.cos(a) * 0.9, 0, -Math.sin(a) * 0.9] }) }
  for (const s of [-1, 1]) k.stick([0.026, 0.2], [s * 0.07, H - 0.02, 0.01], 'bark', { rot: [0, 0, -s * 0.75] })
  const cy = H + C * 0.7, puffs = [[0, cy + C * 0.25, 0, 0.78, 'leaf']]
  for (let i = 0; i < 7; i++) { const a = i / 7 * PI * 2 + o.seed; puffs.push([Math.sin(a) * C * 0.78, cy - C * 0.05, Math.cos(a) * C * 0.78, 0.46, i % 2 ? 'leaf2' : 'leaf']) }
  for (let i = 0; i < 5; i++) { const a = i / 5 * PI * 2 + 0.6 + o.seed; puffs.push([Math.sin(a) * C * 0.5, cy + C * 0.62, Math.cos(a) * C * 0.5, 0.42, i % 2 ? 'leaf3' : 'leaf']) }
  puffs.push([0, cy + C * 0.98, 0, 0.36, 'leaf3'])
  puffs.forEach(([x, y, z, s, c], i) => k.ball(C * s * r(i), [x, y, z], c, { hi: 0.25, shade: 0.22 }))
})

// ---------- flowering bush ----------
// The plain bush (items/house.js) with little five-petal flowers dotted over it. opts: flowers (count), s (size)
defineProp('flowerBush', { name: 'Flowering bush', size: [0.26, 0.17, 0.22], tags: ['outdoor', 'plant'],
  pal: { a: '#86b545', b: '#9cc952', c: '#76a33b', f1: '#f7b5c8', f2: '#ffe07a', f3: '#fffaf0', eye: '#f2b33c' }, opts: { flowers: 4, s: 1 } }, (k, o) => {
  const s = o.s
  for (const [x, y, z, r, c] of [[0, 0.06, 0, 0.085, 'a'], [0.085, 0.045, 0.02, 0.066, 'b'], [-0.085, 0.045, 0.02, 0.066, 'c'], [0.02, 0.11, -0.02, 0.062, 'b'], [-0.04, 0.08, 0.05, 0.05, 'a']]) k.ball(r * s, [x * s, y * s, z * s], c, { hi: 0.22 })
  const spots = [[-0.03, 0.15, 0.03], [0.07, 0.1, 0.05], [-0.09, 0.08, 0.05], [0.03, 0.14, -0.05], [0.1, 0.07, -0.02], [-0.06, 0.12, -0.04]]
  for (let i = 0; i < Math.min(o.flowers, spots.length); i++) { const [x, y, z] = spots[i]; flower(k, [x * s, y * s, z * s], 0.032, ['f1', 'f2', 'f3'][i % 3]) }
})

// ---------- fence + gate ----------
// A run of chunky wooden fence along +x, centred on the origin: posts with soft caps, two rails.
//   opts: len, h, posts (end posts: 'both' | 'start' | 'end' | 'none'), every (spacing of the middle posts)
defineProp('fence', { name: 'Fence run', size: [0.6, 0.2, 0.06], tags: ['outdoor', 'fence'],
  pal: { post: '#e9a062', cap: '#dd8f52', rail: '#f2b274' }, opts: { len: 0.6, h: 0.2, posts: 'both', every: 0.3, shadow: false } }, (k, o) => {
  const L = o.len, h = o.h, xs = []
  const n = Math.max(1, Math.round(L / o.every)); for (let i = 0; i <= n; i++) xs.push(-L / 2 + L * i / n)
  if (o.posts === 'none' || o.posts === 'end') xs.shift(); if (o.posts === 'none' || o.posts === 'start') xs.pop()
  for (const x of xs) { k.box([0.05, h, 0.05], [x, h / 2, 0], 'post', { r: 0.014, seg: 2, hi: 0.05 }); k.box([0.062, 0.026, 0.062], [x, h + 0.004, 0], 'cap', { r: 0.012, seg: 2 }) }
  for (const y of [h * 0.38, h * 0.78]) k.box([L, 0.028, 0.02], [0, y, 0.004], 'rail', { r: 0.009, seg: 2 })
  k.shadow(L + 0.04, 0.09)
})
// A little plank gate between two posts, hinged on the left and standing a bit open. opts: w, h, open (radians)
defineProp('gate', { name: 'Garden gate', size: [0.36, 0.24, 0.06], tags: ['outdoor', 'fence'],
  pal: { post: '#e9a062', cap: '#dd8f52', plank: '#f2b274', line: '#cf8a50', knob: '#f6c645' }, opts: { w: 0.3, h: 0.2, open: 0.55, shadow: false } }, (k, o) => {
  const w = o.w, h = o.h
  for (const s of [-1, 1]) { k.box([0.056, h + 0.04, 0.056], [s * (w / 2 + 0.03), (h + 0.04) / 2, 0], 'post', { r: 0.015, seg: 2 }); k.box([0.068, 0.026, 0.068], [s * (w / 2 + 0.03), h + 0.05, 0], 'cap', { r: 0.012, seg: 2 }) }
  k.within(mat(-w / 2, 0.02, 0, -o.open), () => { // the leaf, turned about its hinge
    k.arch(w - 0.01, h - 0.07, 0.022, [w / 2, 0, 0], 'plank', { bevel: 0.006 })
    for (let i = 1; i < 4; i++) k.box([0.006, h - 0.04, 0.006], [w * i / 4, (h - 0.04) / 2 + 0.005, 0.013], 'line', { r: 0.002, out: false, hi: 0, seg: 1 })
    for (const y of [h * 0.25, h * 0.6]) k.ball([0.012, 0.012, 0.008], [w - 0.03, y, 0.016], 'knob', { out: false, lo: true })
  })
  k.shadow(w + 0.1, 0.09)
})

// ---------- ground bits ----------
defineProp('stepStone', { name: 'Stepping stone', size: [0.2, 0.02, 0.17], tags: ['outdoor', 'path'], pal: { stone: '#e5cdc4' }, opts: { r: 0.1, shadow: false } }, (k, o) => {
  k.pill([o.r, 0.022], [0, 0.004, 0], 'stone', { bevel: 0.45, scale: [o.r, 0.022, o.r * 0.84], hi: 0.12 })
})
defineProp('rocks', { name: 'Rocks', size: [0.2, 0.08, 0.14], tags: ['outdoor'], pal: { a: '#d7c3bd', b: '#c8b2ab' } }, (k) => {
  k.ball([0.07, 0.045, 0.055], [0, 0.02, 0], 'a', { hi: 0.2 }); k.ball([0.035, 0.025, 0.03], [0.08, 0.01, 0.03], 'b', { hi: 0.2, lo: true })
})
defineProp('sprout', { name: 'Grass sprout', size: [0.08, 0.06, 0.08], tags: ['outdoor', 'plant'], pal: { a: '#8dc04a', b: '#a6d35e' }, opts: { shadow: false } }, (k) => {
  for (const [a, e, l, c] of [[0, 1.15, 0.06, 'a'], [2.2, 0.8, 0.05, 'b'], [-2.1, 0.85, 0.05, 'a']]) k.ball([l * 0.22, l * 0.5, l * 0.1], [Math.sin(a) * Math.cos(e) * l * 0.45, Math.sin(e) * l * 0.48, Math.cos(a) * Math.cos(e) * l * 0.45], c, { rot: [PI / 2 - e, a, 0], order: 'YXZ', lo: true })
})
