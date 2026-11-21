// First batch of chibi furniture, after the cozy-house concept. All in room units (she is ~0.39 tall), front = +z.
// Chunky on purpose: thick tops, stubby round legs, big knobs, puffy cushions, every edge rounded, bodies that bulge a
// little (belly / taper), and details drawn big enough to read from the game camera.
import { defineProp } from '../kit.js'

const PI = Math.PI
const legs4 = (k, w, d, h, r = 0.026, name = 'woodDark', y0 = 0) => { for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.pill([r, h], [sx * w / 2, y0 + h / 2, sz * d / 2], name, { bevel: 0.35, taper: -0.2 }) }
// a raised panel with a darker inset line around it (drawers, doors): reads like the concept's drawn seams
const panel = (k, size, pos, name, line = 'trim', r = 0.02) => { k.box([size[0] + 0.012, size[1] + 0.012, size[2]], [pos[0], pos[1], pos[2] - 0.003], line, { r: r + 0.004, out: false, hi: 0 }); k.box(size, pos, name, { r, out: false }) }

defineProp('bed', { name: 'Bed', size: [0.5, 0.34, 0.72], tags: ['bedroom'], pal: { frame: 'wood', post: 'woodDark', sheet: 'cream', quilt: 'quilt', pillow: 'white', flower: 'quilt' } }, (k) => {
  // quilt top at ~0.15: knee-to-hip on her
  legs4(k, 0.42, 0.62, 0.035, 0.03, 'post')
  k.box([0.5, 0.07, 0.68], [0, 0.065, 0], 'frame', { r: 0.03, belly: 0.03 })
  // headboard: a fat arch between two round posts with ball finials
  k.arch(0.42, 0.12, 0.05, [0, 0.05, -0.33], 'frame', { bevel: 0.014 })
  k.arch(0.3, 0.07, 0.02, [0, 0.1, -0.3], 'woodLight', { bevel: 0.008, out: false })
  for (const s of [-1, 1]) { k.pill([0.034, 0.3], [s * 0.235, 0.15, -0.33], 'post', { bevel: 0.2, belly: 0.12 }); k.ball(0.044, [s * 0.235, 0.315, -0.33], 'post') }
  // footboard: lower, same language
  k.box([0.44, 0.09, 0.045], [0, 0.1, 0.335], 'frame', { r: 0.02 })
  for (const s of [-1, 1]) { k.pill([0.03, 0.18], [s * 0.235, 0.09, 0.335], 'post', { bevel: 0.2, belly: 0.12 }); k.ball(0.038, [s * 0.235, 0.19, 0.335], 'post') }
  // mattress, pillow, gingham quilt draped over the sides and foot, a folded-back sheet, flower cushion
  k.puff([0.45, 0.06, 0.62], [0, 0.12, 0], 'sheet', { bulge: 0.25 })
  k.puff([0.32, 0.075, 0.15], [0, 0.175, -0.22], 'pillow', { bulge: 0.75 })
  k.puff([0.48, 0.045, 0.44], [0, 0.155, 0.1], 'quilt', { bulge: 0.35, pattern: 'gingham', tile: 5 })
  k.puff([0.48, 0.032, 0.07], [0, 0.17, -0.13], 'sheet', { bulge: 0.45 })
  for (const s of [-1, 1]) k.puff([0.014, 0.09, 0.42], [s * 0.242, 0.12, 0.1], 'quilt', { bulge: 0.1, out: false, pattern: 'gingham', tile: 4 })
  k.puff([0.46, 0.08, 0.014], [0, 0.12, 0.322], 'quilt', { bulge: 0.1, out: false, pattern: 'gingham', tile: 5 })
  for (let i = 0; i < 5; i++) { const a = i / 5 * PI * 2; k.ball([0.034, 0.018, 0.034], [0.1 + Math.sin(a) * 0.034, 0.215, -0.19 + Math.cos(a) * 0.034], 'flower', { rot: [0, a, 0] }) }
  k.ball([0.024, 0.02, 0.024], [0.1, 0.224, -0.19], 'cream', { out: false })
})

defineProp('roundTable', { name: 'Round table', size: [0.42, 0.24, 0.42], tags: ['living'], pal: { top: 'wood', leg: 'woodDark', cloth: 'cream' } }, (k, o) => {
  k.pill([0.2, 0.048], [0, 0.135, 0], 'top', { bevel: 0.48, seg: 32 })
  k.pill([0.16, 0.025], [0, 0.105, 0], 'leg', { bevel: 0.3, out: false })
  for (let i = 0; i < 3; i++) { const a = i / 3 * PI * 2 + 0.5; k.stick([0.026, 0.13], [Math.sin(a) * 0.105, 0.055, Math.cos(a) * 0.105], 'leg', { rot: [-Math.cos(a) * 0.25, 0, Math.sin(a) * 0.25], taper: -0.25 }) }
  k.box([0.3, 0.01, 0.12], [0, 0.162, 0], 'cloth', { r: 0.004, rot: [0, 0.3, 0], pattern: 'gingham', tile: 3 })
  if (o.lantern) { k.pill([0.024, 0.012], [0.1, 0.168, 0.04], 'woodDark', { bevel: 0.4 }); k.pill([0.022, 0.04], [0.1, 0.193, 0.04], '#ffcf72', { glow: true, bevel: 0.2, belly: 0.1 }); k.dome([0.024, 0.018, 0.024], [0.1, 0.212, 0.04], 'woodDark'); k.halo([0.1, 0.195, 0.04], 0.08) }
  if (o.vase !== false) { k.pill([0.032, 0.05], [-0.02, 0.19, -0.04], 'white', { bevel: 0.45, belly: 0.25 })
    for (let i = 0; i < 5; i++) { const a = i * 1.3; k.daisy([-0.02 + Math.sin(a) * 0.03 * (i ? 1 : 0), 0.255 + (i % 2) * 0.014, -0.04 + Math.cos(a) * 0.03 * (i ? 1 : 0)], 0.026) } }
})

defineProp('pouf', { name: 'Pouf', size: [0.2, 0.1, 0.2], tags: ['living'], pal: { body: 'orange', top: '#f8b862', button: 'woodDark' } }, (k) => {
  k.pill([0.088, 0.085], [0, 0.043, 0], 'body', { bevel: 0.45, belly: 0.16 })
  k.puff([0.15, 0.03, 0.15], [0, 0.088, 0], 'top', { bulge: 0.9, out: false })
  k.ball([0.016, 0.009, 0.016], [0, 0.105, 0], 'button', { out: false })
})

defineProp('stool', { name: 'Stool', size: [0.16, 0.14, 0.16], tags: ['living'], pal: { seat: 'woodLight', leg: 'wood' } }, (k) => {
  k.pill([0.078, 0.034], [0, 0.125, 0], 'seat', { bevel: 0.48, belly: 0.06 })
  for (let i = 0; i < 3; i++) { const a = i / 3 * PI * 2; k.stick([0.018, 0.13], [Math.sin(a) * 0.05, 0.06, Math.cos(a) * 0.05], 'leg', { rot: [-Math.cos(a) * 0.24, 0, Math.sin(a) * 0.24], taper: -0.25 }) }
  k.ring(0.042, 0.009, [0, 0.05, 0], 'leg', { rot: [PI / 2, 0, 0], out: false })
})

defineProp('woodStove', { name: 'Wood stove', size: [0.42, 0.9, 0.42], tags: ['kitchen', 'warm', 'light'], pal: { body: 'iron', dark: 'ironDark', hearth: 'stone', trim: 'brass' }, opts: { flue: 0 } }, (k, o) => {
  k.pill([0.21, 0.03], [0, 0.015, 0.02], 'hearth', { bevel: 0.45, seg: 32 })
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.pill([0.02, 0.05], [sx * 0.08, 0.055, sz * 0.06], 'dark', { bevel: 0.4, taper: -0.3 })
  k.box([0.24, 0.22, 0.2], [0, 0.18, 0], 'body', { r: 0.06, belly: 0.1 })
  k.box([0.27, 0.035, 0.22], [0, 0.3, 0], 'dark', { r: 0.015 })
  // the firebox: a deep warm hollow, glowing embers, two crossed logs with hot ends, a live flame, a brass arch
  k.arch(0.13, 0.04, 0.012, [0, 0.1, 0.098], '#5a2414', { glow: true, bevel: 0 })
  k.ball([0.06, 0.016, 0.008], [0, 0.104, 0.104], '#ff6a24', { glow: true })
  for (const [x, z] of [[-0.03, 0.105], [0.0, 0.108], [0.032, 0.106]]) k.ball([0.012, 0.008, 0.006], [x, 0.104, z + 0.004], '#ffb050', { glow: true })
  for (const [x, a] of [[-0.018, 0.3], [0.018, -0.3]]) { k.stick([0.013, 0.1], [x, 0.114, 0.106], '#6e3c22', { rot: [0, 0, PI / 2 + a], out: false })
    k.ball([0.011, 0.011, 0.004], [x + Math.cos(a) * 0.047 * (x < 0 ? -1 : 1), 0.114 + Math.sin(a) * 0.047 * (x < 0 ? -1 : 1), 0.113], '#ff8a3a', { glow: true }) }
  k.fire([0, 0.104, 0.11], 0.13, 0.11)
  k.archFrame(0.13, 0.04, 0.014, 0.012, [0, 0.1, 0.12], 'trim', { out: false })
  k.knob([0.095, 0.15, 0.112], 'trim', 0.018)
  k.halo([0, 0.15, 0.17], 0.17, '#ffa050', { flicker: true })
  // flue: up from the stove, then (opts.flue > 0) an elbow back through the wall and a chimney outside with a cap
  const fl = o.flue || 0, top = fl ? 0.76 : 0.84
  k.pill([0.042, top - 0.31], [0, 0.31 + (top - 0.31) / 2, -0.02], 'body', { bevel: 0.03 })
  for (const y of [0.45, 0.66]) k.pill([0.05, 0.025], [0, y, -0.02], 'dark', { bevel: 0.3, out: false })
  if (!fl) k.pill([0.052, 0.03], [0, 0.84, -0.02], 'dark', { bevel: 0.3 })
  else { k.ball(0.05, [0, top, -0.02], 'body')
    k.pill([0.042, fl], [0, top, -0.02 - fl / 2], 'body', { rot: [PI / 2, 0, 0], bevel: 0.03 }); k.pill([0.052, 0.025], [0, top, -0.06], 'dark', { rot: [PI / 2, 0, 0], bevel: 0.3, out: false })
    k.ball(0.05, [0, top, -0.02 - fl], 'body'); k.pill([0.042, 0.52], [0, top + 0.26, -0.02 - fl], 'body', { bevel: 0.03 })
    k.pill([0.056, 0.03], [0, top + 0.5, -0.02 - fl], 'dark', { bevel: 0.3 }); k.cone([0.075, 0.06], [0, top + 0.57, -0.02 - fl], 'dark', { n: 4, rot: [0, PI / 4, 0] })
    for (const s of [-1, 1]) k.stick([0.006, 0.05], [s * 0.04, top + 0.53, -0.02 - fl], 'dark', { out: false }) }
})

defineProp('fridge', { name: 'Fridge', size: [0.28, 0.5, 0.22], tags: ['kitchen'], pal: { body: 'cream', seam: '#d9c6a6', handle: '#cdbb9e', cat: '#f7c97a', ear: '#f2a8a0' } }, (k) => {
  k.box([0.27, 0.49, 0.21], [0, 0.25, 0], 'body', { r: 0.075, taper: 0.07, belly: 0.04 })
  k.box([0.21, 0.01, 0.012], [0, 0.31, 0.109], 'seam', { r: 0.004, out: false, hi: 0 })
  k.stick([0.014, 0.09], [-0.1, 0.39, 0.114], 'handle'); k.stick([0.014, 0.09], [-0.1, 0.235, 0.114], 'handle')
  for (const s of [-1, 1]) k.pill([0.024, 0.014], [s * 0.09, 0.007, 0.07], 'seam', { bevel: 0.4, out: false })
  // a big round cat-face magnet: ginger, pink ears, dot eyes, blush
  k.ball([0.042, 0.038, 0.01], [0.045, 0.415, 0.112], 'cat')
  for (const s of [-1, 1]) { k.cone([0.017, 0.03], [0.045 + s * 0.026, 0.452, 0.112], 'cat', { rot: [0, 0, -s * 0.4], out: false }); k.cone([0.009, 0.016], [0.045 + s * 0.026, 0.452, 0.116], 'ear', { rot: [0, 0, -s * 0.4], out: false }) }
  for (const s of [-1, 1]) { k.ball(0.0065, [0.045 + s * 0.016, 0.42, 0.121], 'ink', { out: false }); k.ball([0.008, 0.005, 0.003], [0.045 + s * 0.026, 0.405, 0.12], 'rose', { out: false }) }
  k.ball([0.005, 0.0035, 0.003], [0.045, 0.41, 0.122], 'ink', { out: false })
  // a little note held by a heart magnet
  k.box([0.06, 0.07, 0.004], [0.03, 0.2, 0.108], 'paper', { r: 0.003, rot: [0, 0, 0.08], out: false }); k.ball([0.012, 0.011, 0.006], [0.03, 0.233, 0.112], 'rose', { out: false })
})

defineProp('lantern', { name: 'Lantern', size: [0.09, 0.16, 0.09], tags: ['light', 'outdoor'], pal: { cage: 'ironDark', trim: 'brass', glass: '#ffd27a', core: '#fff3cf' }, opts: { hang: false } }, (k, o) => {
  k.pill([0.044, 0.02], [0, 0.01, 0], 'cage', { bevel: 0.4 })
  k.pill([0.038, 0.009], [0, 0.023, 0], 'trim', { bevel: 0.4, out: false })
  for (let i = 0; i < 4; i++) { const a = i / 4 * PI * 2; k.box([0.05, 0.072, 0.006], [Math.sin(a) * 0.031, 0.062, Math.cos(a) * 0.031], 'glass', { r: 0.002, rot: [0, a, 0], glow: true, belly: 0.08 }) }
  k.ball([0.016, 0.024, 0.016], [0, 0.06, 0], 'core', { glow: true })
  for (let i = 0; i < 4; i++) { const a = i / 4 * PI * 2 + PI / 4; k.stick([0.007, 0.082], [Math.sin(a) * 0.037, 0.062, Math.cos(a) * 0.037], 'cage') }
  k.pill([0.046, 0.011], [0, 0.102, 0], 'trim', { bevel: 0.4, out: false })
  k.cone([0.062, 0.044], [0, 0.125, 0], 'cage', { n: 4, rot: [0, PI / 4, 0] })
  k.ball(0.012, [0, 0.15, 0], 'trim', { out: false }); k.ring(0.013, 0.0045, [0, 0.165, 0], 'cage', { out: false })
  if (o.hang) k.stick([0.003, 0.12], [0, 0.23, 0], 'cage', { out: false })
  k.halo([0, 0.062, 0], 0.11, '#ffc870', { flicker: true })
})

// pot used by the plants: soft belly, rolled rim, dark soil
const pot = (k, r, h, name = 'pot') => { k.pill([r, h], [0, h / 2, 0], name, { bevel: 0.28, belly: 0.1, taper: 0.1 }); k.ring(r * 1.04, r * 0.2, [0, h * 0.97, 0], 'potRim', { rot: [PI / 2, 0, 0] }); k.pill([r * 0.9, 0.01], [0, h * 0.97, 0], 'soil', { out: false }) }

defineProp('plant', { name: 'Pothos', size: [0.22, 0.24, 0.22], tags: ['plant', 'outdoor'], pal: { pot: 'pot', potRim: 'potRim', soil: 'woodDark', leaf: 'leaf' } }, (k) => {
  pot(k, 0.068, 0.11)
  k.clump([0, 0.11, 0], 7, 0.12, { e: 0.3 })
  k.clump([0, 0.13, 0], 4, 0.1, { e: 0.8, phase: 0.8 })
  for (const [a, len, n] of [[0.6, 0.15, 4], [2.4, 0.11, 3], [-1.3, 0.19, 5]]) k.vine([Math.sin(a) * 0.07, 0.11, Math.cos(a) * 0.07], a, len, n, 0.075)
})

defineProp('bigPlant', { name: 'Leafy floor plant', size: [0.34, 0.48, 0.34], tags: ['plant'], pal: { pot: 'pot', potRim: 'potRim', soil: 'woodDark', leaf: 'leaf', stem: 'leafDark' } }, (k) => {
  pot(k, 0.1, 0.15)
  for (let i = 0; i < 11; i++) { const a = i * 2.39996, e = 0.9 - (i % 4) * 0.12, h = 0.16 + (i % 3) * 0.06, sx = Math.sin(a) * 0.035, sz = Math.cos(a) * 0.035
    k.stick([0.006, h], [sx, 0.15 + h / 2, sz], 'stem', { rot: [Math.cos(a) * 0.25, 0, -Math.sin(a) * 0.25], out: false })
    k.leaf([sx + Math.sin(a) * 0.04, 0.15 + h - 0.01, sz + Math.cos(a) * 0.04], 0.13 + (i % 3) * 0.02, a, e, i % 3 === 0 ? 'leafLight' : 'leaf', { w: 0.62, roll: Math.sin(i) * 0.3 }) }
})

defineProp('flowerPot', { name: 'Daisy pot', size: [0.17, 0.2, 0.17], tags: ['plant', 'outdoor'], pal: { pot: 'pot', potRim: 'potRim', soil: 'woodDark', leaf: 'leaf' } }, (k) => {
  pot(k, 0.065, 0.1)
  k.clump([0, 0.1, 0], 8, 0.07, { e: 0.3 })
  for (let i = 0; i < 7; i++) { const a = i * 0.9, r = i ? 0.045 : 0; k.stick([0.003, 0.07], [Math.sin(a) * r * 0.7, 0.13, Math.cos(a) * r * 0.7], 'leafDark', { out: false }); k.daisy([Math.sin(a) * r, 0.17 + (i % 2) * 0.02, Math.cos(a) * r], 0.05) }
})

defineProp('wardrobe', { name: 'Wardrobe', size: [0.38, 0.66, 0.24], tags: ['bedroom'], pal: { body: 'wood', panel: 'woodLight', crown: 'woodDark', knob: 'brass', box: '#e9c486' } }, (k, o) => {
  for (const sx of [-1, 1]) k.pill([0.028, 0.045], [sx * 0.14, 0.022, 0.06], 'crown', { bevel: 0.4, taper: -0.3 })
  k.box([0.34, 0.56, 0.22], [0, 0.32, 0], 'body', { r: 0.05, belly: 0.06 })
  k.box([0.38, 0.05, 0.25], [0, 0.615, 0], 'crown', { r: 0.022 })
  for (const s of [-1, 1]) { panel(k, [0.14, 0.43, 0.02], [s * 0.078, 0.33, 0.115], 'panel'); k.knob([s * 0.02, 0.35, 0.13], 'knob', 0.019) }
  if (o.box !== false) { k.box([0.17, 0.09, 0.15], [0.05, 0.685, 0], 'box', { r: 0.015, rot: [0, 0.12, 0] }); k.box([0.18, 0.015, 0.16], [0.05, 0.728, 0], '#dcae6a', { r: 0.006, rot: [0, 0.12, 0] }) }
})

defineProp('nightstand', { name: 'Nightstand + mushroom lamp', size: [0.19, 0.3, 0.18], tags: ['bedroom', 'light'], pal: { body: 'wood', drawer: 'woodLight', knob: 'woodDark', stem: 'cream', cap: 'glow' } }, (k) => {
  k.box([0.18, 0.17, 0.17], [0, 0.095, 0], 'body', { r: 0.04, belly: 0.1 })
  panel(k, [0.13, 0.06, 0.02], [0, 0.12, 0.09], 'drawer'); k.knob([0, 0.12, 0.104], 'knob', 0.016)
  for (const sx of [-1, 1]) k.pill([0.022, 0.02], [sx * 0.06, 0.01, 0], 'knob', { bevel: 0.4, out: false })
  k.pill([0.02, 0.06], [-0.01, 0.21, 0], 'stem', { bevel: 0.4, belly: 0.25 })
  k.dome([0.06, 0.05, 0.06], [-0.01, 0.235, 0], 'cap', { glow: true })
  k.halo([-0.01, 0.25, 0.02], 0.13)
  k.ring(0.058, 0.008, [-0.01, 0.236, 0], '#f4c070', { rot: [PI / 2, 0, 0] })
  for (const [x, z] of [[0.022, 0.025], [-0.036, 0.018], [0.0, -0.036]]) k.ball(0.011, [-0.01 + x, 0.272, z], 'white', { out: false })
  k.box([0.06, 0.02, 0.045], [0.05, 0.19, 0.04], 'leaf', { r: 0.006, rot: [0, 0.3, 0] })
})

defineProp('petBed', { name: 'Pet bed', size: [0.36, 0.1, 0.36], tags: ['pet'], pal: { base: 'wood', rim: '#eaa86a', cushion: 'cream', paw: '#b8703e', bone: 'white', yarn: 'rose' } }, (k) => {
  k.pill([0.17, 0.05], [0, 0.025, 0], 'base', { bevel: 0.4, seg: 32 })
  k.ring(0.145, 0.042, [0, 0.07, 0], 'rim', { rot: [PI / 2, 0, 0] })
  k.pill([0.125, 0.03], [0, 0.06, 0], 'cushion', { bevel: 0.5, seg: 32, out: false })
  // a big paw print on the front of the rim
  k.ball([0.026, 0.02, 0.008], [0, 0.058, 0.184], 'paw', { out: false })
  for (const [x, y] of [[-0.03, 0.08], [-0.011, 0.091], [0.011, 0.091], [0.03, 0.08]]) k.ball([0.009, 0.01, 0.006], [x, y, 0.18], 'paw', { out: false })
  // a chunky bone + a yarn ball with wraps
  k.stick([0.012, 0.1], [0.05, 0.09, -0.03], 'bone', { rot: [0, 0.5, PI / 2], order: 'YXZ' })
  for (const s of [-1, 1]) for (const t of [-1, 1]) k.ball(0.016, [0.05 + s * 0.045 * Math.cos(0.5) + t * 0.008 * Math.sin(0.5), 0.09, -0.03 - s * 0.045 * Math.sin(0.5) + t * 0.008 * Math.cos(0.5)], 'bone', { out: false })
  k.ball(0.036, [-0.055, 0.1, 0.04], 'yarn')
  for (const [rx, rz] of [[0.4, 0], [-0.5, 0.9], [1.2, 0.3]]) k.ring(0.034, 0.003, [-0.055, 0.1, 0.04], '#e3868f', { rot: [rx, 0, rz], out: false })
  k.stick([0.003, 0.08], [-0.01, 0.075, 0.08], '#e3868f', { rot: [PI / 2, 0.6, 0], order: 'YXZ', out: false })
})
