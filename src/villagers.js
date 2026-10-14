// 22 villagers in the one-soft-body style. Body params -> baked mesh (cached per body), outfit -> shader uniforms.
// age picks walk/idle personality defaults (see AGE in GhibliPerson.jsx); walk overrides tweak each person.
const SK = { a: '#f7d3b8', b: '#f0c7a4', c: '#e3b08a', d: '#d39c74', e: '#c48a62' }
const ADULT = { H: 1.1, head: 0.84, leg: 1.55, torso: 1.3, arm: 1.3, foot: 1.1, neckY: 0.008 }
const TEEN = { H: 1.04, head: 0.9, leg: 1.38, torso: 1.15, arm: 1.18, foot: 1.05 }
const KID = { H: 0.95, head: 1.0 }
const ELDER = { H: 1.0, head: 0.88, leg: 1.3, torso: 1.2, arm: 1.2, hunch: 1, foot: 1.05 }
const TOD = { H: 0.66, head: 1.08, leg: 0.75, torso: 0.85, arm: 0.85, girth: 1.08 }
export const VILLAGERS = [
  // ---- harbour ----
  { name: 'fisherman', zone: 'harbour', age: 'adult', body: { ...ADULT, girth: 1.15, shoulder: 1.15 }, hair: { style: 'short', c: '#2a211c', beard: true }, hat: { type: 'knit', c: '#b5473f', band: '#e8dccb' },
    outfit: { type: 'jacket', skin: SK.d, top: '#e8b84a', bottom: '#3f5168', shoe: '#2e2a28', long: true, sleeve: 'puff' }, hold: { R: 'rod' }, walk: { rate: 7, stride: 0.45, arm: 0.4, idle: 'look' } },
  { name: 'fishwife', zone: 'harbour', age: 'adult', body: { ...ADULT, girth: 1.25, H: 1.05, skirt: 'long' }, hair: { style: 'bun', c: '#5a3a2a' }, hat: { type: 'scarf', c: '#4f7fa8' },
    outfit: { type: 'apron', skin: SK.b, top: '#7a8fb0', acc2: '#f4ecd8', shoe: '#4a3a35', long: true, apronW: 0.05, sleeve: 'puff', skirt: true }, hold: { L: 'basket' }, walk: { rate: 7, sway: 0.07, idle: 'contra' } },
  { name: 'sailor girl', zone: 'harbour', age: 'teen', body: { ...TEEN, skirt: 'short' }, hair: { style: 'long', c: '#1f1a18' },
    outfit: { type: 'sailor', skin: SK.a, top: '#fafaf5', acc: '#d9455b', acc2: '#2f3f6a', legs: '#fafaf5', shoe: '#3a2e2a', sleeve: 'short', skirt: true, bare: true }, walk: { idle: 'look' } },
  { name: 'dock boy', zone: 'harbour', age: 'kid', body: { ...KID, girth: 0.92 }, hair: { style: 'short', c: '#24201c', cowlick: true }, hat: { type: 'cap', c: '#3f6a8a' },
    outfit: { type: 'shirt', skin: SK.c, top: '#f0f0ea', bottom: '#2f4f6e', shoe: '#e8e1d4', sleeve: 'short', bare: true, legHem: 0.07 }, walk: { rate: 11.5, bounce: 0.024, idle: 'tap' } },
  // ---- terraces ----
  { name: 'farmer', zone: 'terraces', age: 'adult', body: { ...ADULT, H: 1.15, girth: 0.95 }, hair: { style: 'short', c: '#4a3426' }, hat: { type: 'straw', c: '#e2c27a', band: '#6a8f4a' },
    outfit: { type: 'overalls', skin: SK.d, top: '#d9655b', bottom: '#4f6f9a', shoe: '#5a3a2a', cuffs: '#6a88b4', sleeve: 'puff', long: false }, walk: { rate: 7.5, stride: 0.55 } },
  { name: 'farm wife', zone: 'terraces', age: 'adult', body: { ...ADULT, H: 1.04, girth: 1.05 }, hair: { style: 'bun', c: '#3a2a22' }, hat: { type: 'scarf', c: '#e8d27a' },
    outfit: { type: 'jacket', skin: SK.c, top: '#8fae7a', bottom: '#6b5a48', shoe: '#4a3a35', long: true, sleeve: 'puff', cuffs: '#7d6a58' }, hold: { L: 'basket' }, walk: { rate: 7 } },
  // ---- village square ----
  { name: 'grandma', zone: 'square', age: 'elder', body: { ...ELDER, H: 0.92, girth: 1.2, skirt: 'long' }, hair: { style: 'bun', c: '#d8d4cf' }, face: { closed: true, glasses: '#8a6a4a' },
    outfit: { type: 'cardigan', skin: SK.a, top: '#7d6a8c', acc: '#c9a0b8', acc2: '#f4ecd8', shoe: '#4a3a35', long: true, sleeve: 'puff', skirt: true }, hold: { R: 'basket' }, walk: { idle: 'sway' } },
  { name: 'grandpa', zone: 'square', age: 'elder', body: { ...ELDER, H: 1.02, girth: 0.88 }, hair: { style: 'bald', c: '#e2ded8', beard: true }, face: { glasses: '#4a3a35', eye: 0.7, browW: 1.6 },
    outfit: { type: 'shirt', skin: SK.b, top: '#c8b48a', bottom: '#6b5a48', shoe: '#3a2e2a', long: true, sleeve: 'puff', cuffs: '#5e4e3e' }, hold: { R: 'cane' }, walk: { idle: 'look' } },
  { name: 'baker', zone: 'square', age: 'adult', body: { ...ADULT, H: 1.02, girth: 1.3, skirt: 'short' }, hair: { style: 'ponytail', c: '#8a4a2a', tie: '#ffffff' },
    outfit: { type: 'apron', skin: SK.a, top: '#f2a3a0', acc2: '#ffffff', legs: '#f4ecd8', shoe: '#7a4a32', sleeve: 'short', skirt: true, bare: true, apronW: 0.055 }, walk: { idle: 'wave' } },
  // ---- ruins / mills / giant tree ----
  { name: 'scholar', zone: 'ruins', age: 'elder', body: { ...ELDER, H: 1.1, girth: 0.82, hunch: 0.6 }, hair: { style: 'short', c: '#b8b4ae', beard: true, beardC: '#d8d4cf' }, face: { glasses: '#2e2420', eye: 0.75 },
    outfit: { type: 'cardigan', skin: SK.b, top: '#e8e1d4', acc: '#6a7a5a', acc2: '#c9a76a', bottom: '#4a4a52', shoe: '#2e2a28', long: true, sleeve: 'puff' }, hold: { R: 'cane' }, walk: { idle: 'look' } },
  { name: 'miller girl', zone: 'mills', age: 'kid', body: { ...KID, skirt: 'short' }, hair: { style: 'braids', c: '#a0603a', tie: '#5fa05a' },
    outfit: { type: 'dress', skin: SK.a, top: '#5fa05a', legs: SK.a, shoe: '#c0473f', sleeve: 'puff', skirt: true, bare: true }, walk: { rate: 11, bounce: 0.026, idle: 'sway' } },
  { name: 'big sister', zone: 'giant', age: 'teen', body: { ...TEEN, H: 1.0, skirt: 'short' }, hair: { style: 'bob', c: '#2e211c' },
    outfit: { type: 'dress', skin: SK.a, top: '#e8b04a', legs: SK.a, shoe: '#7a4a32', sleeve: 'puff', skirt: true, bare: true }, walk: { idle: 'look' } },
  { name: 'toddler', zone: 'giant', age: 'toddler', body: { ...TOD }, hair: { style: 'short', c: '#6a4430', cowlick: true },
    outfit: { type: 'overalls', skin: SK.a, top: '#f59ab0', bottom: '#f2d27a', shoe: '#ffffff', sleeve: 'puff' }, walk: {} },
  { name: 'angler', zone: 'lake', age: 'adult', body: { ...ADULT, H: 1.08, girth: 1.4 }, hair: { style: 'short', c: '#3a2a22' }, hat: { type: 'straw', c: '#e9c46a', band: '#3f6f8f' },
    outfit: { type: 'shirt', skin: SK.c, top: '#f0e6d0', bottom: '#5a6a4a', shoe: '#3a2e2a', sleeve: 'short', cuffs: '#4a5a3c' }, hold: { R: 'rod' }, walk: { idle: 'sway' } },
  // ---- path walkers ----
  { name: 'mother', zone: 'path', age: 'adult', body: { ...ADULT, H: 1.08, girth: 0.92, skirt: 'long' }, hair: { style: 'ponytail', c: '#2e211c', tie: '#e9a0b4' },
    outfit: { type: 'cardigan', skin: SK.a, top: '#8fb4d8', acc: '#f4ecd8', acc2: '#c9a76a', shoe: '#6b4a3a', long: true, sleeve: 'puff', skirt: true }, hold: { R: 'umbrella' }, walk: {} },
  { name: 'postman', zone: 'path', age: 'adult', body: { ...ADULT, H: 1.16, girth: 0.86, leg: 1.7 }, hair: { style: 'short', c: '#4a3024' }, hat: { type: 'cap', c: '#3f6a5a' }, satchel: true,
    outfit: { type: 'jacket', skin: SK.b, top: '#4f7f6a', bottom: '#3f5f52', shoe: '#2e2a28', long: true, sleeve: 'puff' }, walk: { rate: 9, stride: 0.6, arm: 0.65 } },
  { name: 'yukata lady', zone: 'path', age: 'adult', body: { ...ADULT, H: 1.04, girth: 0.9, skirt: 'long' }, hair: { style: 'bun', c: '#1f1a18' },
    outfit: { type: 'yukata', skin: SK.a, top: '#3f5f8f', acc: '#e8b04a', acc2: '#f4ecd8', shoe: '#c0473f', sleeve: 'kimono', skirt: true }, hold: { R: 'umbrella' }, walk: { rate: 9.5, stride: 0.3, arm: 0.2, bounce: 0.004, sway: 0.02 } },
  { name: 'cook', zone: 'path', age: 'adult', body: { ...ADULT, H: 1.06, girth: 1.5, shoulder: 1.1 }, hair: { style: 'bald', c: '#5a3e2e', beard: true }, face: { eye: 0.75 },
    outfit: { type: 'apron', skin: SK.d, top: '#e8dccb', bottom: '#5a4a3a', acc2: '#ffffff', shoe: '#3a2e2a', sleeve: 'short', apronW: 0.07 }, walk: { rate: 6.5, sway: 0.08, bounce: 0.006 } },
  { name: 'tall teen', zone: 'path', age: 'teen', body: { ...TEEN, H: 1.12, girth: 0.82, leg: 1.55 }, hair: { style: 'short', c: '#24201c' },
    outfit: { type: 'shirt', skin: SK.c, top: '#ffffff', bottom: '#2f3f6a', shoe: '#e8e1d4', sleeve: 'short', cuffs: '#3f4f7a' }, hold: { L: 'basket' }, walk: { stride: 0.6, arm: 0.35 } },
  { name: 'old lady', zone: 'path', age: 'elder', body: { ...ELDER, H: 0.9, girth: 1.0, hunch: 1.3, skirt: 'long' }, hair: { style: 'bun', c: '#e2ded8' }, hat: { type: 'scarf', c: '#b5473f' }, face: { closed: true },
    outfit: { type: 'dress', skin: SK.b, top: '#5a6a4a', shoe: '#4a3a35', long: true, sleeve: 'puff', skirt: true }, hold: { R: 'cane' }, walk: {} },
  { name: 'cap boy', zone: 'path', age: 'kid', body: { ...KID, H: 0.9, girth: 1.05 }, hair: { style: 'short', c: '#5a3a24' }, hat: { type: 'cap', c: '#5fa05a' },
    outfit: { type: 'shirt', skin: SK.b, top: '#f2d27a', bottom: '#8a5a3c', shoe: '#c0473f', sleeve: 'short', bare: true, legHem: 0.07 }, walk: { rate: 12, bounce: 0.026, arm: 0.9 } },
  { name: 'basket girl', zone: 'path', age: 'kid', body: { ...KID, H: 0.92, skirt: 'short' }, hair: { style: 'bob', c: '#4a3024' }, face: { wide: 1.05 },
    outfit: { type: 'apron', skin: SK.a, top: '#d9655b', acc2: '#fffaf0', legs: SK.a, shoe: '#7a4a32', sleeve: 'puff', skirt: true, bare: true, apronW: 0.035 }, hold: { R: 'basket' }, walk: { rate: 10.5 } },
]
