// Second batch: the rest of her house (kitchen, desk corner, bath, door + windows, rugs, porch), same chibi language as
// items/home.js. Room units (she is ~0.39 tall), front = +z, y = 0 at the item's base.
// Wall-mounted items (tags: 'wall') have their back on z = 0 and stick out toward +z; the caller sets their height.
import * as THREE from 'three'
import { defineProp } from '../kit.js'

const PI = Math.PI
const panel = (k, size, pos, name, line = 'trim', r = 0.02) => { k.box([size[0] + 0.012, size[1] + 0.012, size[2]], [pos[0], pos[1], pos[2] - 0.003], line, { r: r + 0.004, out: false, hi: 0 }); k.box(size, pos, name, { r, out: false }) }
const BOOKS = ['#d9655b', '#5f8fc4', '#e8a24a', '#8cc084', '#c97b9a', '#f6ead2', '#7a5236', '#4f9a5e']

// ---------- kitchen ----------
defineProp('counter', { name: 'Kitchen counter', size: [0.88, 0.34, 0.27], tags: ['kitchen'], pal: { body: 'wood', top: '#f2d8b0', panel: 'woodLight', knob: 'woodDark', basin: 'white', water: '#b9d8e2', tap: '#cfc6b8', hob: 'ironDark' }, opts: { sink: true, hob: true } }, (k, o) => {
  k.box([0.86, 0.2, 0.25], [0, 0.1, 0], 'body', { r: 0.04 })
  k.box([0.9, 0.03, 0.27], [0, 0.212, 0.005], 'top', { r: 0.014 })
  for (const [x, two] of [[-0.32, 1], [-0.11, 0], [0.11, 1], [0.32, 1]]) {
    if (two) { panel(k, [0.18, 0.07, 0.016], [x, 0.145, 0.127], 'panel'); panel(k, [0.18, 0.08, 0.016], [x, 0.06, 0.127], 'panel'); k.knob([x, 0.145, 0.14], 'knob', 0.013); k.knob([x, 0.06, 0.14], 'knob', 0.013) }
    else { panel(k, [0.18, 0.16, 0.016], [x, 0.1, 0.127], 'panel'); k.knob([x + 0.06, 0.12, 0.14], 'knob', 0.013) } }
  k.box([0.84, 0.02, 0.21], [0, 0.01, -0.01], 'woodDark', { r: 0.008, out: false })
  if (o.sink) { k.box([0.22, 0.016, 0.17], [-0.12, 0.227, 0], 'basin', { r: 0.03 }); k.box([0.17, 0.008, 0.12], [-0.12, 0.233, 0.005], 'water', { r: 0.025, out: false, hi: 0.3 })
    k.stick([0.011, 0.11], [-0.12, 0.28, -0.085], 'tap'); k.stick([0.009, 0.07], [-0.12, 0.33, -0.06], 'tap', { rot: [PI / 2 - 0.3, 0, 0] }); for (const s of [-1, 1]) k.pill([0.012, 0.022], [-0.12 + s * 0.04, 0.24, -0.085], 'tap', { bevel: 0.4, out: false }) }
  if (o.hob) { k.box([0.2, 0.012, 0.16], [0.19, 0.232, 0], 'hob', { r: 0.02 }); for (const z of [-0.035, 0.035]) k.ring(0.028, 0.005, [0.19 + (z > 0 ? 0.045 : -0.045), 0.24, z], '#6a626e', { rot: [PI / 2, 0, 0], out: false })
    for (const x of [0.13, 0.25]) k.pill([0.014, 0.012], [x, 0.18, 0.137], 'hob', { rot: [PI / 2, 0, 0], out: false }) }
  for (const [x, c, h] of [[-0.33, '#cfe6c8', 0.07], [-0.295, '#f6c8b0', 0.055]]) { k.pill([0.018, h], [x, 0.227 + h / 2, -0.07], c, { bevel: 0.3, belly: 0.15 }); k.pill([0.009, 0.016], [x, 0.235 + h, -0.07], 'woodDark', { bevel: 0.4, out: false }) }
  k.puff([0.05, 0.022, 0.035], [0.02, 0.238, 0.03], 'quilt', { bulge: 0.4, out: false })
})

defineProp('jarShelf', { name: 'Jar shelf', size: [0.5, 0.16, 0.12], tags: ['kitchen', 'wall'], pal: { board: 'wood', bracket: 'woodDark', glass: '#f8f2e4', lid: 'wood' } }, (k) => {
  k.box([0.5, 0.024, 0.11], [0, 0, 0.055], 'board', { r: 0.01 })
  for (const x of [-0.19, 0.19]) k.box([0.022, 0.07, 0.07], [x, -0.04, 0.035], 'bracket', { r: 0.008 })
  ;[['#f4c66a', 0.085], ['#e8a24a', 0.07], ['#c98a55', 0.09], ['#f6c8b0', 0.075]].forEach(([c, h], i) => { const x = -0.17 + i * 0.11
    k.pill([0.034, h], [x, 0.012 + h / 2, 0.055], 'glass', { bevel: 0.3, belly: 0.1 }); k.pill([0.028, h * 0.6], [x, 0.012 + h * 0.3, 0.055], c, { bevel: 0.3, out: false }); k.pill([0.036, 0.016], [x, 0.014 + h, 0.055], 'lid', { bevel: 0.4 }) })
  for (const [x, c] of [[-0.12, '#8fc3e8'], [0.0, 'white'], [0.12, '#f6c8b0']]) { k.stick([0.003, 0.03], [x, -0.025, 0.09], 'bracket', { out: false }); k.pill([0.018, 0.03], [x, -0.055, 0.09], c, { bevel: 0.25 }); k.ring(0.01, 0.003, [x + 0.022, -0.055, 0.09], c, { out: false }) }
})

defineProp('bookShelf', { name: 'Book shelf', size: [0.44, 0.17, 0.13], tags: ['wall'], pal: { board: 'wood', bracket: 'woodDark' } }, (k) => {
  k.box([0.44, 0.024, 0.13], [0, 0, 0.065], 'board', { r: 0.01 })
  for (const x of [-0.16, 0.16]) k.box([0.022, 0.08, 0.08], [x, -0.045, 0.04], 'bracket', { r: 0.008 })
  let x = -0.2, s = 7; const r = () => (s = (s * 16807) % 2147483647) / 2147483647
  while (x < 0.03) { const w = 0.026 + r() * 0.016, h = 0.085 + r() * 0.05; k.box([w, h, 0.09], [x + w / 2, 0.012 + h / 2, 0.06], BOOKS[Math.floor(r() * 8)], { r: 0.006 }); x += w + 0.003 }
  k.box([0.03, 0.11, 0.09], [0.058, 0.06, 0.06], BOOKS[0], { r: 0.006, rot: [0, 0, -0.35] })
  for (let i = 0; i < 3; i++) k.box([0.1 - i * 0.01, 0.022, 0.08], [0.15, 0.024 + i * 0.023, 0.06], BOOKS[(i * 3 + 2) % 8], { r: 0.006, rot: [0, i * 0.25, 0] })
})

defineProp('firewood', { name: 'Firewood', size: [0.26, 0.2, 0.2], tags: ['kitchen', 'outdoor'], pal: { bark: '#9a5e36', bark2: '#b0703f', ring: '#f0c890' } }, (k) => {
  ;[[0, 0], [1, 0], [2, 0], [0.5, 1], [1.5, 1], [1, 2]].forEach(([i, r], n) => { const x = -0.075 + i * 0.075, y = 0.038 + r * 0.065
    k.pill([0.036, 0.2], [x, y, 0], n % 2 ? 'bark' : 'bark2', { rot: [PI / 2, 0, 0], bevel: 0.08 }); k.pill([0.03, 0.004], [x, y, 0.1], 'ring', { rot: [PI / 2, 0, 0], out: false }) })
})

// ---------- desk corner ----------
defineProp('desk', { name: 'Desk', size: [0.56, 0.42, 0.32], tags: ['study'], pal: { top: 'woodLight', body: 'wood', panel: 'woodLight', knob: 'woodDark', mat: '#6aa883', lamp: 'brass' } }, (k) => {
  k.box([0.56, 0.026, 0.32], [0, 0.235, 0], 'top', { r: 0.014 })
  k.box([0.18, 0.21, 0.28], [-0.18, 0.11, 0], 'body', { r: 0.03, belly: 0.04 })
  for (const y of [0.065, 0.16]) { panel(k, [0.15, 0.075, 0.016], [-0.18, y, 0.142], 'panel'); k.knob([-0.18, y, 0.155], 'knob', 0.013) }
  for (const s of [-1, 1]) k.stick([0.02, 0.23], [0.24, 0.112, s * 0.12], 'body', { taper: -0.2 })
  k.box([0.2, 0.006, 0.15], [0.05, 0.25, 0.04], 'mat', { r: 0.004, rot: [0, 0.12, 0], pattern: 'grid', tile: 5, out: false })
  k.puff([0.11, 0.06, 0.09], [-0.16, 0.282, -0.06], '#f2e2c4', { bulge: 0.15 }); k.box([0.115, 0.012, 0.095], [-0.16, 0.317, -0.06], '#e2cda8', { r: 0.004 })
  k.pill([0.022, 0.06], [0.2, 0.278, 0.09], 'orange', { bevel: 0.3 }); for (const [dx, c] of [[-0.008, '#d9655b'], [0.008, '#5f8fc4'], [0, '#ffd36e']]) k.stick([0.004, 0.07], [0.2 + dx, 0.31, 0.09 + dx], c, { rot: [dx * 10, 0, dx * 14], out: false })
  // brass desk lamp
  k.pill([0.04, 0.014], [0.18, 0.255, -0.09], 'lamp', { bevel: 0.4 }); k.stick([0.007, 0.13], [0.17, 0.31, -0.09], 'lamp', { rot: [0, 0, 0.3] }); k.stick([0.007, 0.1], [0.12, 0.38, -0.09], 'lamp', { rot: [0, 0, -1.1] })
  k.dome([0.04, 0.035, 0.04], [0.08, 0.375, -0.09], 'lamp', { rot: [0, 0, PI * 0.8] }); k.ball(0.016, [0.075, 0.36, -0.09], '#fff3cf', { glow: true }); k.halo([0.07, 0.33, -0.06], 0.1)
})

defineProp('pegboard', { name: 'Pegboard', size: [0.42, 0.28, 0.05], tags: ['study', 'wall'], pal: { board: '#e6b47c', frame: 'woodDark', tool: '#6a6270' } }, (k) => {
  k.box([0.42, 0.26, 0.018], [0, 0.13, 0.009], 'board', { r: 0.012 })
  for (const s of [-1, 1]) { k.box([0.024, 0.28, 0.026], [s * 0.21, 0.13, 0.013], 'frame', { r: 0.008 }); k.box([0.44, 0.024, 0.026], [0, 0.13 + s * 0.13, 0.013], 'frame', { r: 0.008 }) }
  for (let i = 0; i < 5; i++) { const x = -0.15 + i * 0.075; k.ball(0.007, [x, 0.215, 0.022], 'frame', { out: false })
    if (i % 2) { k.box([0.014, 0.1, 0.01], [x, 0.155, 0.026], 'tool', { r: 0.005 }); k.ring(0.018, 0.006, [x, 0.095, 0.026], 'tool', { out: false }) }
    else { k.stick([0.011, 0.06], [x, 0.18, 0.028], ['#d9655b', '#e8a24a', '#5f8fc4'][i / 2], {}); k.box([0.012, 0.06, 0.008], [x, 0.125, 0.028], 'tool', { r: 0.004, out: false }) } }
})

// ---------- bath ----------
defineProp('tub', { name: 'Bathtub + shower', size: [0.34, 0.8, 0.34], tags: ['bath'], pal: { tub: 'white', band: '#8fc3e8', pipe: '#cfc6b8', foot: 'brass' } }, (k) => {
  for (let i = 0; i < 4; i++) { const a = i / 4 * PI * 2 + PI / 4; k.ball([0.022, 0.03, 0.022], [Math.sin(a) * 0.12, 0.018, Math.cos(a) * 0.12], 'foot') }
  k.pill([0.155, 0.19], [0, 0.115, 0], 'tub', { bevel: 0.25, belly: 0.06, seg: 32 })
  k.ring(0.15, 0.018, [0, 0.205, 0], 'tub', { rot: [PI / 2, 0, 0] })
  k.pill([0.162, 0.022], [0, 0.07, 0], 'band', { bevel: 0.3, seg: 32, out: false })
  k.stick([0.01, 0.64], [-0.04, 0.48, -0.16], 'pipe'); k.stick([0.009, 0.1], [-0.04, 0.79, -0.11], 'pipe', { rot: [PI / 2, 0, 0] }); k.pill([0.04, 0.016], [-0.04, 0.775, -0.06], 'pipe', { bevel: 0.4 })
  k.pill([0.016, 0.02], [0.0, 0.34, -0.155], 'rose', { rot: [PI / 2, 0, 0], bevel: 0.4, out: false })
  k.puff([0.05, 0.03, 0.035], [0.1, 0.225, -0.06], '#f6e2a0', { bulge: 0.5, out: false })
})

defineProp('toilet', { name: 'Toilet', size: [0.16, 0.26, 0.22], tags: ['bath'], pal: { body: 'white', lid: '#f4efe6', flush: '#cfc6b8' } }, (k) => {
  k.pill([0.045, 0.09], [0, 0.045, 0.02], 'body', { bevel: 0.3, taper: 0.25 })
  k.puff([0.13, 0.04, 0.15], [0, 0.105, 0.03], 'body', { bulge: 0.3 }); k.puff([0.12, 0.018, 0.13], [0, 0.13, 0.03], 'lid', { bulge: 0.4 })
  k.box([0.15, 0.13, 0.065], [0, 0.18, -0.07], 'body', { r: 0.025 }); k.box([0.035, 0.014, 0.012], [0.04, 0.23, -0.036], 'flush', { r: 0.005, out: false })
})

defineProp('basin', { name: 'Wash basin + mirror', size: [0.18, 0.56, 0.13], tags: ['bath', 'wall'], pal: { bowl: 'white', tap: '#cfc6b8', frame: 'wood', mirror: '#d8eef4' } }, (k) => {
  k.pill([0.022, 0.2], [0, 0.1, 0.05], 'bowl', { bevel: 0.2, taper: -0.2 })
  k.puff([0.16, 0.055, 0.11], [0, 0.225, 0.06], 'bowl', { bulge: 0.2 }); k.box([0.12, 0.006, 0.07], [0, 0.254, 0.065], '#b9d8e2', { r: 0.02, out: false })
  k.stick([0.008, 0.05], [0, 0.275, 0.022], 'tap', { out: false }); k.stick([0.007, 0.035], [0, 0.297, 0.035], 'tap', { rot: [PI / 2, 0, 0], out: false })
  k.pill([0.07, 0.016], [0, 0.44, 0.008], 'frame', { rot: [PI / 2, 0, 0], bevel: 0.4 }); k.pill([0.058, 0.006], [0, 0.44, 0.018], 'mirror', { rot: [PI / 2, 0, 0], out: false, hi: 0.4 })
  k.ball([0.012, 0.03, 0.006], [-0.02, 0.46, 0.022], 'white', { rot: [0, 0, -0.6], out: false })
})

defineProp('towelRail', { name: 'Towel rail', size: [0.22, 0.2, 0.05], tags: ['bath', 'wall'], pal: { rail: 'woodDark', towel: '#8fc3e8', stripe: 'cream' } }, (k) => {
  for (const s of [-1, 1]) k.pill([0.012, 0.03], [s * 0.1, 0.17, 0.015], 'rail', { rot: [PI / 2, 0, 0], out: false })
  k.stick([0.008, 0.22], [0, 0.17, 0.03], 'rail', { rot: [0, 0, PI / 2] })
  k.puff([0.15, 0.15, 0.022], [0, 0.1, 0.035], 'towel', { bulge: 0.15 }); k.box([0.15, 0.016, 0.024], [0, 0.05, 0.038], 'stripe', { r: 0.006, out: false })
})

// ---------- by the door ----------
defineProp('coatStand', { name: 'Coat stand', size: [0.26, 0.62, 0.12], tags: ['entry'], pal: { wood: 'wood', base: 'woodDark', bag: '#f6ecd8', hat: '#e9c46a', band: '#d9655b' } }, (k) => {
  k.pill([0.07, 0.03], [0, 0.015, 0], 'base', { bevel: 0.4 }); k.stick([0.02, 0.6], [0, 0.3, 0], 'wood', { taper: -0.15 })
  k.box([0.24, 0.03, 0.03], [0, 0.56, 0], 'wood', { r: 0.012 }); k.ball(0.024, [0, 0.61, 0], 'wood')
  for (const x of [-0.08, 0.08]) k.stick([0.008, 0.05], [x, 0.55, 0.025], 'base', { rot: [PI / 2 - 0.4, 0, 0], out: false })
  k.ring(0.028, 0.006, [-0.08, 0.52, 0.04], 'bag', { out: false }); k.puff([0.1, 0.12, 0.03], [-0.08, 0.43, 0.045], 'bag', { bulge: 0.2 }); k.box([0.04, 0.03, 0.006], [-0.07, 0.43, 0.062], 'leaf', { r: 0.004, out: false })
  k.pill([0.09, 0.008], [0.08, 0.49, 0.06], 'hat', { rot: [1.25, 0, 0], bevel: 0.5 }); k.dome(0.05, [0.08, 0.493, 0.064], 'hat', { rot: [1.25, 0, 0] }); k.pill([0.051, 0.012], [0.08, 0.497, 0.067], 'band', { rot: [1.25, 0, 0], bevel: 0.3, out: false })
})

// an arched front door leaf: planks, a little window, ring knocker, iron straps. Hinge on its left edge at x = -w/2.
defineProp('doorLeaf', { name: 'Door', size: [0.3, 0.58, 0.04], tags: ['entry'], pal: { wood: '#b0703f', plank: '#8a5634', pane: '#ffe2a6', iron: 'ironDark' }, opts: { w: 0.3, h: 0.58 } }, (k, o) => {
  const w = o.w, hr = o.h - w / 2
  k.arch(w - 0.01, hr, 0.03, [0, 0, 0], 'wood', { bevel: 0.01, pattern: 'planks', tile: 1 })
  for (const dx of [-0.075, 0, 0.075]) k.box([0.006, hr * 0.7, 0.004], [dx, hr * 0.35, 0.022], 'plank', { r: 0.002, out: false })
  k.arch(0.13, 0.03, 0.01, [0, hr - 0.02, 0.018], 'pane', { glow: true, bevel: 0 })
  k.box([0.012, 0.11, 0.012], [0, hr + 0.03, 0.026], 'plank', { r: 0.004, out: false }); k.box([0.13, 0.012, 0.012], [0, hr + 0.015, 0.026], 'plank', { r: 0.004, out: false })
  k.archFrame(0.13, 0.03, 0.012, 0.01, [0, hr - 0.02, 0.024], 'plank', { out: false })
  for (const y of [0.08, hr - 0.05]) k.box([0.1, 0.018, 0.008], [-w / 2 + 0.06, y, 0.022], 'iron', { r: 0.005, out: false })
  k.ring(0.024, 0.006, [w * 0.28, hr * 0.5, 0.032], 'iron', { out: false }); k.ball(0.011, [w * 0.28, hr * 0.5 + 0.024, 0.026], 'iron', { out: false })
})

// a chunky arched wall piece with a doorway (the front door's surround, or a room partition)
defineProp('archWall', { name: 'Arched wall', size: [0.6, 0.78, 0.1], tags: ['structure'], pal: { wall: '#c98552', trim: 'woodDark', cap: '#b06c3c' }, opts: { w: 0.6, h: 0.78, d: 0.1, openW: 0.32, openH: 0.43 } }, (k, o) => {
  const r = o.w / 2
  k.add(archWallGeo(o.w, o.h, o.d, o.openW, o.openH), [0, 0, 0], 'wall')
  k.archFrame(o.openW, o.openH, 0.03, o.d + 0.016, [0, 0, 0], 'trim')
  if (o.h - r > 0.01) k.box([o.w + 0.03, 0.05, o.d + 0.03], [0, o.h - 0.02, 0], 'cap', { r: 0.02 })
})
// rectangular (or round-topped when h ~ w/2 + rect) wall with an arched hole, extruded and bevelled
function archWallGeo(w, h, d, ow, oh) { const s = new THREE.Shape(), r = w / 2, ri = ow / 2
  if (h <= r + 0.02) { s.moveTo(-r, 0); s.lineTo(r, 0); s.absarc(0, 0, r, 0, PI, false) } else { s.moveTo(-r, 0); s.lineTo(r, 0); s.lineTo(r, h); s.lineTo(-r, h); s.lineTo(-r, 0) }
  const p = new THREE.Path(); p.moveTo(-ri, 0); p.lineTo(ri, 0); p.lineTo(ri, oh); p.absarc(0, oh, ri, 0, PI, false); p.lineTo(-ri, 0); s.holes.push(p)
  const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 2, curveSegments: 20 }); g.translate(0, 0, -d / 2); g.computeVertexNormals(); return g }

defineProp('archWindow', { name: 'Arched window', size: [0.44, 0.48, 0.12], tags: ['structure', 'wall'], pal: { frame: 'woodLight', sill: 'wood', bar: 'woodLight' }, opts: { w: 0.36, h: 0.42 } }, (k, o) => {
  const hr = o.h - o.w / 2
  k.archFrame(o.w, hr, 0.04, 0.05, [0, 0, 0.02], 'frame')
  k.box([0.022, o.h - 0.01, 0.016], [0, (o.h - 0.01) / 2, 0.01], 'bar', { r: 0.006, out: false }); k.box([o.w, 0.02, 0.016], [0, hr * 0.85, 0.01], 'bar', { r: 0.006, out: false })
  k.box([o.w + 0.12, 0.028, 0.11], [0, -0.02, 0.05], 'sill', { r: 0.012 })
})

defineProp('picture', { name: 'Framed picture', size: [0.22, 0.18, 0.03], tags: ['wall', 'decor'], pal: { frame: 'woodDark', sky: '#cfe6ff', hill: '#9fd17a', sun: '#ffd36e', roof: '#d9655b' } }, (k) => {
  k.box([0.22, 0.18, 0.022], [0, 0.09, 0.011], 'frame', { r: 0.014 })
  k.box([0.18, 0.14, 0.006], [0, 0.09, 0.024], 'sky', { r: 0.006, out: false, hi: 0 })
  k.dome([0.08, 0.05, 0.004], [0.0, 0.03, 0.027], 'hill', { rot: [PI / 2, 0, 0], out: false }); k.ball([0.016, 0.016, 0.003], [-0.055, 0.135, 0.028], 'sun', { out: false })
  k.box([0.03, 0.022, 0.004], [0.02, 0.085, 0.029], 'white', { r: 0.003, out: false }); k.cone([0.026, 0.02], [0.02, 0.105, 0.029], 'roof', { n: 3, out: false })
})

// ---------- soft floor things ----------
defineProp('roundRug', { name: 'Round rug', size: [1.2, 0.02, 0.96], tags: ['living'], pal: { rug: '#f4e4cf', ring: '#e6c9a8' }, opts: { rx: 0.6, rz: 0.48, shadow: false } }, (k, o) => {
  k.pill([1, 0.012], [0, 0.006, 0], 'ring', { bevel: 0.45, seg: 48, scale: [o.rx, 0.012, o.rz], out: false, hi: 0 })
  k.pill([1, 0.014], [0, 0.008, 0], 'rug', { bevel: 0.45, seg: 48, scale: [o.rx - 0.04, 0.014, o.rz - 0.04], out: false, hi: 0 })
  k.ring(1, 0.012, [0, 0.016, 0], 'ring', { rot: [PI / 2, 0, 0], scale: [(o.rx - 0.14), (o.rz - 0.14), 0.4], out: false })
})
defineProp('runner', { name: 'Runner rug', size: [0.22, 0.02, 0.4], tags: ['living'], pal: { rug: '#f4e4cf', edge: '#e6c9a8' }, opts: { shadow: false } }, (k) => {
  k.box([0.22, 0.012, 0.4], [0, 0.006, 0], 'edge', { r: 0.005, out: false, hi: 0 }); k.box([0.18, 0.014, 0.36], [0, 0.008, 0], 'rug', { r: 0.005, out: false, hi: 0 })
})
defineProp('tileMat', { name: 'Tile floor', size: [0.7, 0.01, 0.7], tags: ['bath'], pal: { tile: '#c9e3c2' }, opts: { w: 0.7, d: 0.7, shadow: false } }, (k, o) => {
  k.box([o.w, 0.008, o.d], [0, 0.004, 0], 'tile', { r: 0.003, out: false, pattern: 'tiles', tile: 4, hi: 0 })
})
defineProp('petBowls', { name: 'Pet bowls', size: [0.36, 0.12, 0.14], tags: ['pet'], pal: { mat: '#e9a46a', food: '#6f8fae', water: 'white', sack: '#e9d4b0', label: '#d9655b' } }, (k) => {
  k.box([0.28, 0.008, 0.13], [-0.04, 0.004, 0], 'mat', { r: 0.03, out: false })
  for (const [x, c] of [[-0.1, 'food'], [0.03, 'water']]) { k.pill([0.048, 0.034], [x, 0.022, 0], c, { bevel: 0.4, taper: 0.25 }); k.pill([0.036, 0.006], [x, 0.038, 0], x < 0 ? '#a8683a' : '#bfe3f2', { bevel: 0.4, out: false }) }
  k.puff([0.08, 0.13, 0.06], [0.14, 0.065, 0.01], 'sack', { bulge: 0.25, rot: [0, -0.4, 0] }); k.ball([0.022, 0.02, 0.006], [0.135, 0.075, 0.042], 'label', { rot: [0, -0.4, 0], out: false })
})

// ---------- porch ----------
defineProp('lanternPost', { name: 'Lantern post', size: [0.14, 0.36, 0.14], tags: ['outdoor', 'light'], pal: { stone: 'stone', cap: 'stoneDark', cage: 'ironDark', trim: 'brass', glass: '#ffd27a', core: '#fff3cf' } }, (k) => {
  k.box([0.12, 0.16, 0.12], [0, 0.08, 0], 'stone', { r: 0.025, belly: 0.05 }); k.box([0.14, 0.022, 0.14], [0, 0.17, 0], 'cap', { r: 0.01 })
  const y = 0.18; k.pill([0.05, 0.022], [0, y + 0.011, 0], 'cage', { bevel: 0.4 })
  for (let i = 0; i < 4; i++) { const a = i / 4 * PI * 2; k.box([0.06, 0.085, 0.006], [Math.sin(a) * 0.037, y + 0.07, Math.cos(a) * 0.037], 'glass', { r: 0.002, rot: [0, a, 0], glow: true }) }
  k.ball([0.02, 0.03, 0.02], [y * 0, y + 0.068, 0], 'core', { glow: true })
  for (let i = 0; i < 4; i++) { const a = i / 4 * PI * 2 + PI / 4; k.stick([0.008, 0.096], [Math.sin(a) * 0.045, y + 0.07, Math.cos(a) * 0.045], 'cage') }
  k.cone([0.074, 0.05], [0, y + 0.14, 0], 'cage', { n: 4, rot: [0, PI / 4, 0] }); k.ball(0.013, [0, y + 0.17, 0], 'trim', { out: false })
  k.halo([0, y + 0.07, 0], 0.13, '#ffc870', { flicker: true })
})
defineProp('bush', { name: 'Bush', size: [0.24, 0.16, 0.2], tags: ['outdoor', 'plant'], pal: { a: '#86a845', b: '#9bbb52', c: '#73953a' } }, (k) => {
  for (const [x, y, z, r, c] of [[0, 0.06, 0, 0.085, 'a'], [0.08, 0.045, 0.02, 0.065, 'b'], [-0.08, 0.045, 0.02, 0.065, 'c'], [0.02, 0.11, -0.02, 0.06, 'b'], [-0.04, 0.08, 0.05, 0.05, 'a']]) k.ball(r, [x, y, z], c)
})
defineProp('steps', { name: 'Stone steps', size: [0.56, 0.06, 0.3], tags: ['outdoor', 'entry'], pal: { a: 'stone', b: 'stoneDark' }, opts: { shadow: false } }, (k) => {
  k.box([0.46, 0.06, 0.16], [0, -0.03, 0.08], 'a', { r: 0.02 }); k.box([0.56, 0.06, 0.15], [0, -0.085, 0.22], 'b', { r: 0.02 })
})

// a plain partition wall with a timber cap (pairs with archWall)
defineProp('wallPanel', { name: 'Wall panel', size: [0.6, 0.8, 0.06], tags: ['structure'], pal: { wall: '#f8dcc4', cap: '#b06c3c' }, opts: { w: 0.6, h: 0.8, d: 0.06, shadow: false } }, (k, o) => {
  k.box([o.w, o.h, o.d], [0, o.h / 2, 0], 'wall', { r: 0.012, hi: 0.06 }); k.box([o.w + 0.03, 0.05, o.d + 0.04], [0, o.h - 0.02, 0], 'cap', { r: 0.018 })
})
