// First batch of chibi furniture, after the cozy-house concept. All in room units (she is ~0.41 tall), front = +z.
// Chunky on purpose: thick tops, stubby round legs, big knobs, puffy cushions, every edge rounded.
import { defineProp } from '../kit.js'

const PI = Math.PI
const legs4 = (k, w, d, h, r = 0.026, name = 'woodDark', y0 = 0) => { for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.pill([r, h], [sx * w / 2, y0 + h / 2, sz * d / 2], name, { bevel: 0.35 }) }

defineProp('bed', { name: 'Bed', size: [0.5, 0.34, 0.72], tags: ['bedroom'], pal: { frame: 'wood', post: 'woodDark', sheet: 'cream', quilt: 'quilt', stripe: 'quiltDark', pillow: 'white', flower: 'quilt' } }, (k) => {
  // quilt top at ~0.15: knee-to-hip on her (she is ~0.39 tall)
  legs4(k, 0.42, 0.62, 0.035, 0.03, 'post')
  k.box([0.5, 0.07, 0.68], [0, 0.065, 0], 'frame', { r: 0.03 })
  // headboard: a fat arch between two round posts with ball finials
  k.arch(0.42, 0.12, 0.05, [0, 0.05, -0.33], 'frame', { bevel: 0.014 })
  for (const s of [-1, 1]) { k.pill([0.032, 0.3], [s * 0.235, 0.15, -0.33], 'post', { bevel: 0.2 }); k.ball(0.04, [s * 0.235, 0.31, -0.33], 'post') }
  // footboard: lower, same language
  k.box([0.44, 0.09, 0.045], [0, 0.1, 0.335], 'frame', { r: 0.02 })
  for (const s of [-1, 1]) { k.pill([0.028, 0.18], [s * 0.235, 0.09, 0.335], 'post', { bevel: 0.2 }); k.ball(0.034, [s * 0.235, 0.185, 0.335], 'post') }
  // mattress, pillow, quilt with a folded-back sheet and fat stripes, flower cushion
  k.puff([0.45, 0.06, 0.62], [0, 0.12, 0], 'sheet', { bulge: 0.25 })
  k.puff([0.3, 0.065, 0.14], [0, 0.17, -0.22], 'pillow', { bulge: 0.6 })
  k.puff([0.48, 0.045, 0.44], [0, 0.155, 0.1], 'quilt', { bulge: 0.3 })
  k.puff([0.48, 0.032, 0.07], [0, 0.17, -0.13], 'sheet', { bulge: 0.4 })
  for (const x of [-0.15, 0, 0.15]) k.box([0.04, 0.01, 0.42], [x, 0.18, 0.105], 'stripe', { r: 0.004, out: false })
  for (const z of [0.0, 0.2]) k.box([0.47, 0.01, 0.04], [0, 0.18, z], 'stripe', { r: 0.004, out: false })
  for (const s of [-1, 1]) k.puff([0.012, 0.09, 0.42], [s * 0.24, 0.12, 0.1], 'quilt', { bulge: 0.1, out: false })
  for (let i = 0; i < 5; i++) { const a = i / 5 * PI * 2; k.ball([0.026, 0.014, 0.026], [0.1 + Math.sin(a) * 0.026, 0.21, -0.2 + Math.cos(a) * 0.026], 'flower') }
  k.ball([0.018, 0.016, 0.018], [0.1, 0.216, -0.2], 'cream', { out: false })
})

defineProp('roundTable', { name: 'Round table', size: [0.42, 0.24, 0.42], tags: ['living'], pal: { top: 'wood', leg: 'woodDark', cloth: 'cream' } }, (k, o) => {
  k.pill([0.2, 0.045], [0, 0.135, 0], 'top', { bevel: 0.45, seg: 32 })
  k.pill([0.16, 0.025], [0, 0.105, 0], 'leg', { bevel: 0.3, out: false })
  for (let i = 0; i < 3; i++) { const a = i / 3 * PI * 2 + 0.5; k.stick([0.024, 0.13], [Math.sin(a) * 0.105, 0.055, Math.cos(a) * 0.105], 'leg', { rot: [-Math.cos(a) * 0.25, 0, Math.sin(a) * 0.25] }) }
  k.box([0.3, 0.01, 0.12], [0, 0.16, 0], 'cloth', { r: 0.004, rot: [0, 0.3, 0] })
  if (o.vase !== false) { k.ball([0.032, 0.038, 0.032], [-0.02, 0.195, -0.04], 'white'); k.pill([0.016, 0.03], [-0.02, 0.235, -0.04], 'white', { bevel: 0.3 })
    k.leaves([-0.02, 0.25, -0.04], 5, 0.05, 'leaf', { tilt: 1.1 })
    for (let i = 0; i < 5; i++) { const a = i * 1.3; k.daisy([-0.02 + Math.sin(a) * 0.028 * (i ? 1 : 0), 0.27 + (i % 2) * 0.012, -0.04 + Math.cos(a) * 0.028 * (i ? 1 : 0)], 0.022) } }
})

defineProp('pouf', { name: 'Pouf', size: [0.19, 0.1, 0.19], tags: ['living'], pal: { body: 'orange', top: '#f8b862', button: 'woodDark' } }, (k) => {
  k.pill([0.092, 0.085], [0, 0.043, 0], 'body', { bevel: 0.42 })
  k.puff([0.15, 0.03, 0.15], [0, 0.087, 0], 'top', { bulge: 0.8, out: false })
  k.ball([0.012, 0.007, 0.012], [0, 0.103, 0], 'button', { out: false })
})

defineProp('stool', { name: 'Stool', size: [0.16, 0.14, 0.16], tags: ['living'], pal: { seat: 'woodLight', leg: 'wood' } }, (k) => {
  k.pill([0.075, 0.032], [0, 0.125, 0], 'seat', { bevel: 0.45 })
  for (let i = 0; i < 3; i++) { const a = i / 3 * PI * 2; k.stick([0.016, 0.13], [Math.sin(a) * 0.048, 0.06, Math.cos(a) * 0.048], 'leg', { rot: [-Math.cos(a) * 0.22, 0, Math.sin(a) * 0.22] }) }
  k.ring(0.04, 0.008, [0, 0.05, 0], 'leg', { rot: [PI / 2, 0, 0], out: false })
})

defineProp('woodStove', { name: 'Wood stove', size: [0.42, 0.9, 0.42], tags: ['kitchen', 'warm'], pal: { body: 'iron', dark: 'ironDark', hearth: 'stone', trim: 'brass' } }, (k) => {
  k.pill([0.21, 0.03], [0, 0.015, 0.02], 'hearth', { bevel: 0.45, seg: 32 })
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.pill([0.018, 0.05], [sx * 0.08, 0.055, sz * 0.06], 'dark', { bevel: 0.4 })
  k.box([0.24, 0.22, 0.2], [0, 0.18, 0], 'body', { r: 0.06 })
  k.box([0.27, 0.035, 0.22], [0, 0.3, 0], 'dark', { r: 0.015 })
  k.ring(0.062, 0.014, [0, 0.175, 0.1], 'trim', { out: false })
  k.pill([0.058, 0.01], [0, 0.175, 0.098], 'flame', { rot: [PI / 2, 0, 0], glow: true })
  k.ball([0.03, 0.022, 0.012], [-0.018, 0.16, 0.105], 'glow', { glow: true }); k.ball([0.022, 0.03, 0.012], [0.02, 0.165, 0.105], 'glow', { glow: true })
  k.knob([0.085, 0.175, 0.105], 'trim', 0.014)
  k.pill([0.042, 0.52], [0, 0.57, -0.02], 'body', { bevel: 0.03 })
  for (const y of [0.45, 0.7]) k.pill([0.048, 0.025], [0, y, -0.02], 'dark', { bevel: 0.3, out: false })
  k.pill([0.05, 0.03], [0, 0.84, -0.02], 'dark', { bevel: 0.3 })
})

defineProp('fridge', { name: 'Fridge', size: [0.27, 0.5, 0.22], tags: ['kitchen'], pal: { body: 'cream', seam: '#e4d6bf', handle: '#cdbb9e', sticker: 'white' } }, (k) => {
  k.box([0.27, 0.49, 0.21], [0, 0.25, 0], 'body', { r: 0.07 })
  k.box([0.19, 0.008, 0.01], [0, 0.31, 0.105], 'seam', { r: 0.003, out: false })
  k.stick([0.011, 0.08], [-0.095, 0.39, 0.112], 'handle'); k.stick([0.011, 0.08], [-0.095, 0.24, 0.112], 'handle')
  for (const s of [-1, 1]) k.pill([0.022, 0.012], [s * 0.09, 0.006, 0.07], 'seam', { bevel: 0.4, out: false })
  // a little cat-face magnet
  k.ball([0.024, 0.022, 0.008], [0.05, 0.41, 0.108], 'sticker', { out: false })
  for (const s of [-1, 1]) k.cone([0.01, 0.018], [0.05 + s * 0.014, 0.432, 0.108], 'sticker', { rot: [0, 0, -s * 0.35], out: false })
  for (const s of [-1, 1]) k.ball(0.0035, [0.05 + s * 0.009, 0.412, 0.116], 'ink', { out: false })
})

defineProp('lantern', { name: 'Lantern', size: [0.09, 0.16, 0.09], tags: ['light', 'outdoor'], pal: { cage: 'ironDark', core: 'glow' }, opts: { hang: false } }, (k, o) => {
  k.pill([0.04, 0.018], [0, 0.009, 0], 'cage', { bevel: 0.4 })
  k.ball([0.03, 0.04, 0.03], [0, 0.058, 0], 'core', { glow: true })
  for (let i = 0; i < 4; i++) { const a = i / 4 * PI * 2 + PI / 4; k.stick([0.006, 0.085], [Math.sin(a) * 0.036, 0.058, Math.cos(a) * 0.036], 'cage') }
  k.cone([0.058, 0.04], [0, 0.118, 0], 'cage', { n: 4, rot: [0, PI / 4, 0] })
  k.ring(0.012, 0.004, [0, 0.148, 0], 'cage', { out: false })
  if (o.hang) k.stick([0.003, 0.12], [0, 0.21, 0], 'cage', { out: false })
})

defineProp('plant', { name: 'Potted plant', size: [0.2, 0.3, 0.2], tags: ['plant', 'outdoor'], pal: { pot: 'pot', rim: 'potRim', soil: 'woodDark', leaf: 'leaf' }, opts: { flowers: false, big: false } }, (k, o) => {
  const s = o.big ? 1.45 : 1
  k.pill([0.07 * s, 0.12 * s], [0, 0.06 * s, 0], 'pot', { bevel: 0.25 })
  k.ring(0.068 * s, 0.014 * s, [0, 0.118 * s, 0], 'rim', { rot: [PI / 2, 0, 0] })
  k.pill([0.06 * s, 0.01], [0, 0.118 * s, 0], 'soil', { out: false })
  k.leaves([0, 0.15 * s, 0], o.big ? 12 : 8, 0.11 * s, 'leaf', { tilt: 0.75, up: 0.02 * s })
  k.leaves([0, 0.2 * s, 0], o.big ? 7 : 4, 0.09 * s, 'leaf', { tilt: 0.35, phase: 1, up: 0.02 * s })
  if (o.flowers) for (let i = 0; i < 5; i++) { const a = i * 1.26; k.daisy([Math.sin(a) * 0.045 * s * (i ? 1 : 0), 0.25 * s + (i % 2) * 0.015, Math.cos(a) * 0.045 * s * (i ? 1 : 0)], 0.026 * s) }
})

defineProp('wardrobe', { name: 'Wardrobe', size: [0.36, 0.66, 0.24], tags: ['bedroom'], pal: { body: 'wood', panel: 'woodLight', crown: 'woodDark', knob: 'brass', box: '#e9c486' } }, (k, o) => {
  for (const sx of [-1, 1]) k.pill([0.024, 0.04], [sx * 0.14, 0.02, 0.06], 'crown', { bevel: 0.4 })
  k.box([0.34, 0.56, 0.22], [0, 0.32, 0], 'body', { r: 0.045 })
  k.box([0.37, 0.045, 0.24], [0, 0.615, 0], 'crown', { r: 0.02 })
  for (const s of [-1, 1]) { k.box([0.14, 0.44, 0.02], [s * 0.078, 0.33, 0.11], 'panel', { r: 0.03 }); k.knob([s * 0.018, 0.35, 0.125], 'knob', 0.014) }
  if (o.box !== false) { k.box([0.17, 0.09, 0.15], [0.05, 0.685, 0], 'box', { r: 0.015 }); k.box([0.18, 0.015, 0.16], [0.05, 0.728, 0], '#dcae6a', { r: 0.006 }) }
})

defineProp('nightstand', { name: 'Nightstand + mushroom lamp', size: [0.19, 0.3, 0.18], tags: ['bedroom', 'light'], pal: { body: 'wood', drawer: 'woodLight', knob: 'woodDark', stem: 'cream', cap: 'glow' } }, (k) => {
  k.box([0.18, 0.17, 0.17], [0, 0.095, 0], 'body', { r: 0.035 })
  k.box([0.14, 0.06, 0.02], [0, 0.12, 0.085], 'drawer', { r: 0.015 }); k.knob([0, 0.12, 0.098], 'knob', 0.012)
  for (const sx of [-1, 1]) k.pill([0.02, 0.02], [sx * 0.06, 0.01, 0], 'knob', { bevel: 0.4, out: false })
  k.pill([0.018, 0.06], [-0.01, 0.21, 0], 'stem', { bevel: 0.4 })
  k.dome([0.058, 0.048, 0.058], [-0.01, 0.235, 0], 'cap', { glow: true })
  k.ring(0.056, 0.007, [-0.01, 0.236, 0], '#f4c070', { rot: [PI / 2, 0, 0] })
  for (const [x, z] of [[0.02, 0.025], [-0.035, 0.02], [0.0, -0.035]]) k.ball(0.009, [-0.01 + x, 0.27, z], 'white', { out: false })
  k.box([0.06, 0.02, 0.045], [0.05, 0.19, 0.04], 'leaf', { r: 0.006, rot: [0, 0.3, 0] })
})

defineProp('petBed', { name: 'Pet bed', size: [0.36, 0.09, 0.36], tags: ['pet'], pal: { base: 'wood', rim: '#e8a868', cushion: 'cream', paw: 'peach' } }, (k) => {
  k.pill([0.17, 0.05], [0, 0.025, 0], 'base', { bevel: 0.4, seg: 32 })
  k.ring(0.145, 0.04, [0, 0.07, 0], 'rim', { rot: [PI / 2, 0, 0] })
  k.pill([0.125, 0.03], [0, 0.06, 0], 'cushion', { bevel: 0.5, seg: 32, out: false })
  k.ball([0.022, 0.016, 0.006], [0, 0.03, 0.17], 'paw', { out: false })
  for (const a of [-0.9, -0.3, 0.3, 0.9]) k.ball([0.008, 0.008, 0.005], [Math.sin(a) * 0.026, 0.05 - Math.abs(a) * 0.006, 0.168], 'paw', { out: false })
  // a bone + a yarn ball
  k.stick([0.008, 0.07], [0.05, 0.088, -0.02], 'white', { rot: [0, 0.5, PI / 2], order: 'YXZ' })
  for (const s of [-1, 1]) for (const t of [-1, 1]) k.ball(0.011, [0.05 + s * 0.03 * Math.cos(0.5), 0.088, -0.02 - s * 0.03 * Math.sin(0.5) + t * 0.006], 'white', { out: false })
  k.ball(0.032, [-0.05, 0.1, 0.04], 'rose')
})
