// Activity sound effects: short, soft, procedural (original synthesis). Each is rendered ONCE into a mono AudioBuffer
// (≤ 2.6 s at 32 kHz, < 2 ms of JS each, on first use or in idle slices after start) and replayed as one buffer source +
// one gain. Recipes are pure (sfx.test via render()); createSfx() is the WebAudio side.
import { partial, bell, tone, noise, norm, tail, mtof } from './dsp.js'
export const SR = 24000
const chime = (x, sr, m, at, a, tau = 0.9) => { const f = mtof(m); partial(x, sr, f, a, tau, { at, att: 0.001 }); partial(x, sr, f * 2, a * 0.1, tau * 0.4, { at }); partial(x, sr, f * 3, a * 0.04, tau * 0.2, { at }); partial(x, sr, f * 4.07, a * 0.14, 0.05, { at }) }
const pluck = (x, sr, m, at, a, tau = 0.6) => { const f = mtof(m); for (let k = 1; k <= 8; k++) partial(x, sr, f * k, a / k ** 1.3, tau / (1 + 0.3 * k), { at, att: 0.002, ph: k }) }
/** voiced sound (hums, a bark, a meow): harmonics of a gliding f0 weighted by formants that can open over the sound */
function voiced(x, sr, at, dur, f0, f1, a, FM, o = {}) {
  const n0 = Math.round(at * sr), n = Math.min(x.length - n0, Math.round(dur * sr)), W = new Float32Array(15); let ph = 0, f = f0
  for (let i = 0; i < n; i++) {
    const u = i / n
    if ((i & 31) === 0) { f = f0 + (f1 - f0) * u + (o.bump || 0) * Math.sin(Math.PI * u); const fs = 1 + (o.open || 0) * Math.sin(Math.PI * Math.min(1, u * 1.3))
      for (let k = 1; k <= 14; k++) { const fk = f * k; let w = 0; if (fk < sr * 0.45) for (const [F, g, bw] of FM) w += g * Math.exp(-(((fk - F * fs) / (bw || 220)) ** 2)); W[k] = w > 1e-4 ? w / k ** 0.3 : 0 } }
    ph += 2 * Math.PI * f / sr; const s1 = Math.sin(ph), c2 = 2 * Math.cos(ph); let v = W[1] * s1, a2 = 0, a1 = s1 // sin(k ph) by recurrence
    for (let k = 2; k <= 14; k++) { const sk = c2 * a1 - a2; a2 = a1; a1 = sk; v += W[k] * sk }
    const env = Math.min(1, u * dur / (o.att || 0.03)) * Math.min(1, (1 - u) * dur / (o.rel || 0.06)); x[n0 + i] += v * a * env
  }
}
const HUM = [[260, 1, 120], [1050, 0.18, 260], [2300, 0.08, 300]], DOG = [[700, 1, 260], [1700, 0.55, 320], [2900, 0.25, 400]], CAT = [[850, 1, 260], [1900, 0.6, 320], [3100, 0.3, 380]]
const steps = (kind) => (x, sr, s) => {
  if (kind === 'wood') { partial(x, sr, 165 + 12 * s, 1, 0.05); partial(x, sr, 380 + 20 * s, 0.4, 0.028); partial(x, sr, 640, 0.18, 0.015); noise(x, sr, 0, 0.035, 0.35, 'bp', 900, 900, 1, { seed: s }) }
  else if (kind === 'stone') { noise(x, sr, 0, 0.03, 0.7, 'bp', 2700 + 150 * s, 2200, 1.3, { seed: s, att: 0.001 }); partial(x, sr, 140, 0.5, 0.03); noise(x, sr, 0.022, 0.025, 0.3, 'bp', 1800, 1500, 1, { seed: s + 5 }) }
  else { noise(x, sr, 0, 0.075, 1, 'bp', 1500 + 120 * s, 650, 0.9, { seed: s, att: 0.006, dk: 6, grit: 0.55 }); noise(x, sr, 0.03, 0.06, 0.6, 'bp', 2000, 900, 0.9, { seed: s + 9, dk: 6, grit: 0.5 }); noise(x, sr, 0, 0.05, 0.4, 'lp', 300, 250, 0.7, { seed: s + 3 })
    if (kind === 'wet') { tone(x, sr, 280, 540, 0.012, 0.05, 0.22, { dk: 4 }); noise(x, sr, 0.01, 0.05, 0.25, 'bp', 3200, 2600, 1.2, { seed: s + 2, grit: 0.8 }) } }
}
const N = { C5: 72, E5: 76, F5: 77, G5: 79, A5: 81, B5: 83, C6: 84, D6: 86, E6: 88, F6: 89, G6: 91, A6: 93, C7: 96, E7: 100 }
// name: [seconds, level, recipe(x, sr, seed)]
export const DEF = {
  step_grass: [0.12, 0.13, steps('grass')], step_wood: [0.1, 0.16, steps('wood')], step_stone: [0.08, 0.12, steps('stone')], step_wet: [0.12, 0.14, steps('wet')],
  cast: [0.6, 0.3, (x, sr) => { noise(x, sr, 0, 0.38, 1, 'bp', 350, 2600, 1.4, { att: 0.16, dk: 3 }); noise(x, sr, 0.22, 0.25, 0.3, 'bp', 5200, 3000, 3, { dk: 4, seed: 4 }) }],
  plop: [0.3, 0.32, (x, sr) => { tone(x, sr, 260, 780, 0, 0.09, 0.8, { dk: 3, curve: 0.6 }); noise(x, sr, 0, 0.18, 0.3, 'lp', 2400, 600, 0.7, { dk: 5 }); tone(x, sr, 600, 1400, 0.06, 0.05, 0.25) }],
  bite: [0.6, 0.3, (x, sr) => { tone(x, sr, 420, 900, 0, 0.07, 0.7, { dk: 3 }); tone(x, sr, 480, 1000, 0.13, 0.07, 0.6, { dk: 3 }); noise(x, sr, 0, 0.1, 0.25, 'lp', 2000, 800, 0.7); chime(x, sr, N.E6, 0.02, 0.2, 0.4) }],
  reel: [0.03, 0.09, (x, sr) => { noise(x, sr, 0, 0.012, 1, 'bp', 3600, 3600, 2, { att: 0.0005, dk: 8 }); partial(x, sr, 2100, 0.3, 0.006) }],
  splash: [0.6, 0.3, (x, sr) => { noise(x, sr, 0, 0.45, 1, 'lp', 3200, 900, 0.7, { att: 0.01, dk: 5 }); tone(x, sr, 300, 800, 0.05, 0.06, 0.5); tone(x, sr, 500, 1200, 0.12, 0.05, 0.3); noise(x, sr, 0.03, 0.2, 0.2, 'bp', 5000, 4000, 1, { grit: 0.8, seed: 3 }) }],
  catch: [1.5, 0.4, (x, sr) => { [N.F5, N.A5, N.C6, N.F6].forEach((m, i) => chime(x, sr, m, i * 0.08, 0.5, 1)); pluck(x, sr, 53, 0.24, 0.4); chime(x, sr, N.A6, 0.4, 0.15, 0.5) }],
  catch_rare: [2.1, 0.42, (x, sr) => { [N.F5, N.A5, N.C6, N.F6].forEach((m, i) => chime(x, sr, m, i * 0.07, 0.45, 0.8)); chime(x, sr, N.D6, 0.42, 0.4, 0.6); for (const m of [N.A5, N.C6, N.F6]) chime(x, sr, m, 0.6, 0.38, 1.4); pluck(x, sr, 41, 0.6, 0.5, 1); pluck(x, sr, 53, 0.6, 0.3, 1)
    noise(x, sr, 0.6, 1.2, 0.06, 'hp', 7500, 6000, 0.7, { am: [9, 0.7], att: 0.2, dk: 3 }); [N.A6, N.C7, N.F6 + 12].forEach((m, i) => chime(x, sr, m, 0.85 + i * 0.09, 0.14, 0.5)) }],
  catch_legend: [2.7, 0.45, (x, sr) => { DEF.catch_rare[2](x, sr); partial(x, sr, mtof(41), 0.4, 1.4, { at: 0.6 }); [N.G6, N.A6, N.C7, N.F6 + 12, N.A6 + 12].forEach((m, i) => chime(x, sr, m, 1.2 + i * 0.1, 0.16, 0.8)); for (const m of [N.F5, N.C6, N.A6]) chime(x, sr, m, 1.7, 0.25, 1) }],
  slip: [0.8, 0.26, (x, sr) => { tone(x, sr, mtof(79), mtof(77), 0, 0.22, 0.4, { type: 'tri', dk: 3 }); tone(x, sr, mtof(74), mtof(72) * 0.985, 0.22, 0.5, 0.4, { type: 'tri', dk: 4 }) }],
  pick: [0.5, 0.26, (x, sr) => { noise(x, sr, 0, 0.11, 0.5, 'bp', 3200, 2600, 1, { grit: 0.7, am: [40, 0.6] }); tone(x, sr, 600, 1150, 0.05, 0.055, 0.6, { dk: 3 }); chime(x, sr, N.E6, 0.1, 0.25, 0.3) }],
  bag: [0.16, 0.22, (x, sr) => { tone(x, sr, 200, 480, 0, 0.06, 0.8, { dk: 4 }); noise(x, sr, 0.01, 0.06, 0.3, 'lp', 900, 700, 0.7) }],
  dig: [0.62, 0.32, (x, sr) => { for (const at of [0, 0.3]) { noise(x, sr, at, 0.16, 0.8, 'bp', 1300, 900, 1, { grit: 0.9, att: 0.02, dk: 3, seed: at * 10 + 1 }); partial(x, sr, 85, 0.7, 0.07, { at: at + 0.02 }); noise(x, sr, at + 0.03, 0.08, 0.4, 'lp', 500, 400, 0.7) } }],
  relic: [2.1, 0.36, (x, sr) => { [76, 80, 83, 87, 92].forEach((m, i) => chime(x, sr, m, i * 0.1, 0.45, 1.4)); pluck(x, sr, 52, 0.42, 0.35, 1.2); noise(x, sr, 0.4, 1.4, 0.05, 'hp', 7000, 5000, 0.7, { am: [7, 0.7], att: 0.3, dk: 3 }) }],
  shutter: [0.2, 0.3, (x, sr) => { noise(x, sr, 0, 0.015, 1, 'hp', 4000, 4000, 0.7, { att: 0.0005, dk: 6 }); partial(x, sr, 1900, 0.3, 0.008); noise(x, sr, 0.02, 0.05, 0.35, 'bp', 2200, 1800, 1.2, { seed: 5 }); noise(x, sr, 0.085, 0.012, 0.8, 'hp', 3500, 3500, 0.7, { att: 0.0005, seed: 6 }); partial(x, sr, 1500, 0.25, 0.008, { at: 0.085 }) }],
  photo_saved: [1.1, 0.26, (x, sr) => { chime(x, sr, N.C6, 0, 0.5, 0.9); chime(x, sr, N.G6, 0.12, 0.45, 0.9) }],
  photo_open: [0.25, 0.2, (x, sr) => { tone(x, sr, 520, 880, 0, 0.08, 0.5, { dk: 3 }); noise(x, sr, 0.09, 0.01, 0.5, 'hp', 3500, 3500, 0.7, { att: 0.0005 }) }],
  page: [0.36, 0.22, (x, sr) => { noise(x, sr, 0, 0.22, 0.8, 'bp', 1100, 3800, 0.9, { grit: 0.6, att: 0.03, dk: 2.5, am: [55, 0.5] }); noise(x, sr, 0.14, 0.1, 0.3, 'lp', 700, 600, 0.7, { seed: 2 }) }],
  ui_open: [0.2, 0.18, (x, sr) => { noise(x, sr, 0, 0.1, 0.45, 'bp', 1700, 2100, 1, { att: 0.02, dk: 3 }); partial(x, sr, 760, 0.6, 0.035, { at: 0.02 }); partial(x, sr, 760 * 2.4, 0.2, 0.02, { at: 0.02 }) }],
  ui_close: [0.16, 0.15, (x, sr) => { partial(x, sr, 560, 0.5, 0.03); partial(x, sr, 560 * 2.4, 0.15, 0.015); noise(x, sr, 0.01, 0.07, 0.3, 'bp', 1300, 1000, 1, { dk: 4 }) }],
  donate: [1.7, 0.36, (x, sr) => { [N.C6, N.E6, N.G6, N.C7].forEach((m, i) => chime(x, sr, m, i * 0.09, 0.45, 1.1)); partial(x, sr, mtof(60), 0.35, 1.2, { at: 0.27 }); partial(x, sr, mtof(67), 0.15, 0.9, { at: 0.27 }) }],
  hmm: [0.6, 0.34, (x, sr) => { voiced(x, sr, 0, 0.18, 125, 135, 0.6, HUM); voiced(x, sr, 0.23, 0.32, 140, 116, 0.6, HUM) }],
  hmm2: [0.5, 0.34, (x, sr) => { voiced(x, sr, 0, 0.42, 116, 152, 0.6, HUM, { bump: -6 }) }],
  hmm3: [0.75, 0.34, (x, sr) => { voiced(x, sr, 0, 0.15, 135, 128, 0.55, HUM); voiced(x, sr, 0.2, 0.15, 130, 124, 0.5, HUM); voiced(x, sr, 0.4, 0.3, 146, 118, 0.6, HUM) }],
  talk: [0.42, 0.18, (x, sr, s) => { const P = [0, 3, -2, 5, 2, -3]; for (let i = 0; i < 4; i++) { const f = 400 * 2 ** (P[(i + s) % P.length] / 12); tone(x, sr, f, f * 0.94, i * 0.09, 0.065, 0.6, { type: 'tri', dk: 3, att: 0.008 }) } }],
  door: [0.8, 0.3, (x, sr) => { noise(x, sr, 0, 0.01, 0.6, 'hp', 3000, 3000, 0.7, { att: 0.0005 }); partial(x, sr, 1200, 0.3, 0.01); tone(x, sr, 330, 410, 0.05, 0.36, 0.12, { type: 'saw', vib: 0.03, vibHz: 23, dk: 1.5, att: 0.05 }); partial(x, sr, 85, 0.9, 0.09, { at: 0.44 }); noise(x, sr, 0.44, 0.1, 0.5, 'lp', 400, 300, 0.7) }],
  coin: [0.6, 0.22, (x, sr) => { for (const [m, at] of [[95, 0], [100, 0.07]]) { const f = mtof(m); partial(x, sr, f, 0.6, 0.35, { at, att: 0.0008 }); partial(x, sr, f * 2, 0.18, 0.2, { at }); partial(x, sr, f * 3, 0.08, 0.1, { at }) } }],
  coin_spend: [0.3, 0.18, (x, sr) => { partial(x, sr, mtof(91), 0.5, 0.18, { att: 0.0008 }); partial(x, sr, mtof(91) * 2.4, 0.2, 0.05); noise(x, sr, 0, 0.02, 0.2, 'hp', 6000, 6000, 0.7) }],
  bell: [1.6, 0.26, (x, sr) => { for (const at of [0, 0.32]) bell(x, sr, 1180, at, 0.8, 1.1, [1, 2.02, 2.74, 3.76, 5.42], [1, 0.5, 0.35, 0.2, 0.12]) }],
  alight: [0.5, 0.22, (x, sr) => { noise(x, sr, 0, 0.06, 0.5, 'lp', 500, 400, 0.7); partial(x, sr, 95, 0.5, 0.06); chime(x, sr, N.C6, 0.06, 0.3, 0.5) }],
  quest: [2.0, 0.4, (x, sr) => { [N.G5, N.C6, N.E6].forEach((m, i) => chime(x, sr, m, i * 0.09, 0.45, 0.6)); for (const m of [N.E6, N.G6, N.C7]) chime(x, sr, m, 0.34, 0.36, 1.4); pluck(x, sr, 48, 0.34, 0.45, 1); pluck(x, sr, 60, 0.34, 0.25, 1); noise(x, sr, 0.34, 1.2, 0.04, 'hp', 7500, 6000, 0.7, { am: [8, 0.7], att: 0.2, dk: 3 }) }],
  tut: [0.6, 0.22, (x, sr) => { chime(x, sr, N.G6, 0, 0.35, 0.4); chime(x, sr, N.C7, 0.07, 0.3, 0.4) }],
  gift: [1.1, 0.3, (x, sr) => { [88, 92, 95].forEach((m, i) => chime(x, sr, m, i * 0.08, 0.4, 0.8)); pluck(x, sr, 64, 0.16, 0.3, 0.8) }],
  craft: [0.62, 0.26, (x, sr) => { [0, 0.2, 0.4].forEach((at, i) => { partial(x, sr, 420 * (1 + 0.05 * i), 0.7, 0.04, { at, att: 0.0005 }); partial(x, sr, 420 * 2.6, 0.25, 0.02, { at }); noise(x, sr, at, 0.015, 0.3, 'bp', 1500, 1500, 1, { seed: i + 1 }) }) }],
  spark: [0.6, 0.2, (x, sr) => { chime(x, sr, N.A6, 0, 0.3, 0.35); chime(x, sr, N.E7, 0.06, 0.25, 0.35); chime(x, sr, 97, 0.13, 0.2, 0.35) }],
  water: [1.1, 0.24, (x, sr) => { noise(x, sr, 0, 0.9, 0.6, 'lp', 2200, 1500, 0.7, { att: 0.1, dk: 1.6, am: [17, 0.5], grit: 0.3 }); for (const at of [0.2, 0.45, 0.7]) tone(x, sr, 700, 1300, at, 0.04, 0.2) }],
  bark: [0.48, 0.3, (x, sr) => { voiced(x, sr, 0, 0.11, 480, 330, 0.6, DOG, { att: 0.008, rel: 0.04 }); noise(x, sr, 0, 0.05, 0.25, 'bp', 1500, 1200, 1); voiced(x, sr, 0.2, 0.12, 530, 360, 0.6, DOG, { att: 0.008, rel: 0.04 }); noise(x, sr, 0.2, 0.05, 0.22, 'bp', 1600, 1200, 1, { seed: 4 }) }],
  meow: [0.75, 0.28, (x, sr) => { voiced(x, sr, 0, 0.62, 560, 520, 0.6, CAT, { bump: 210, open: 0.45, att: 0.05, rel: 0.18 }) }],
  place: [0.3, 0.24, (x, sr) => { partial(x, sr, 150, 0.9, 0.08); partial(x, sr, 345, 0.35, 0.04); noise(x, sr, 0, 0.05, 0.4, 'lp', 600, 500, 0.7) }],
  feed: [0.6, 0.22, (x, sr) => { partial(x, sr, 1400, 0.15, 0.4); for (let i = 0; i < 9; i++) { const at = 0.03 + i * 0.043 + 0.012 * Math.sin(i * 7); noise(x, sr, at, 0.008, 0.5, 'bp', 3000 + 260 * (i % 5), 3000, 1.5, { seed: i + 2, att: 0.0005 }); partial(x, sr, 2500 + 300 * (i % 4), 0.2, 0.006, { at }) } }],
  cook: [0.9, 0.2, (x, sr) => { noise(x, sr, 0, 0.8, 0.5, 'hp', 3500, 3000, 0.7, { grit: 0.95, att: 0.05, dk: 1.5 }); partial(x, sr, 1700, 0.2, 0.3) }],
  tea: [1.1, 0.22, (x, sr) => { noise(x, sr, 0, 0.5, 0.5, 'bp', 1400, 1900, 1, { grit: 0.5, am: [21, 0.5], att: 0.05, dk: 1.5 }); bell(x, sr, 2400, 0.58, 0.35, 0.4, [1, 2.32, 4.25], [1, 0.4, 0.2]) }],
  bath: [0.8, 0.24, (x, sr) => { noise(x, sr, 0, 0.6, 0.8, 'lp', 2500, 800, 0.7, { att: 0.02, dk: 3 }); for (const at of [0.1, 0.3, 0.5]) tone(x, sr, 350, 900, at, 0.05, 0.25) }],
  sleep: [1.9, 0.26, (x, sr) => { [N.G5, N.E5, N.C5].forEach((m, i) => chime(x, sr, m, i * 0.36, 0.45, 1)) }],
}
// act.js blip(kind) -> sfx name ('pet' picks Pip's bark or Mochi's meow)
export const ACT_SFX = { pick: 'pick', spark: 'spark', craft: 'craft', water: 'water', door: 'door', place: 'place', feed: 'feed', cook: 'cook', bath: 'bath', tea: 'tea', read: 'page', sleep: 'sleep', cast: 'cast', reel: 'splash' }
const VAR = { step_grass: 3, step_wood: 3, step_stone: 3, step_wet: 3, talk: 3 } // seeded variants
/** pure render (also used by unit tests / previews) */
export function render(name, seed = 1) { const D = DEF[name]; if (!D) return null; const x = new Float32Array(Math.round(D[0] * SR)); D[2](x, SR, seed); return tail(norm(x, 0.85), SR) }

export function createSfx(ctx, out) {
  const cache = {}, live = [], MAX = 12
  const get = (name, k = 0) => { const key = name + k; if (cache[key]) return cache[key]; const x = render(name, k + 1); if (!x) return null; const b = ctx.createBuffer(1, x.length, SR); b.getChannelData(0).set(x); return (cache[key] = b) }
  /** play(name, { at: ctx time, delay: s, vol, rate, pan }) -> true if it exists */
  function play(name, o = {}) {
    const D = DEF[name]; if (!D) return false
    const b = get(name, VAR[name] ? (Math.random() * VAR[name]) | 0 : 0); if (!b) return false
    while (live.length >= MAX) { const a = live.shift(); try { a.stop() } catch (e) {} }
    const s = ctx.createBufferSource(), g = ctx.createGain(); s.buffer = b; s.playbackRate.value = o.rate || 1; g.gain.value = (o.vol ?? 1) * D[1]
    let last = g; s.connect(g)
    if (o.pan && ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = o.pan; g.connect(p); last = p }
    last.connect(out); s.start(o.at ?? ctx.currentTime + (o.delay || 0)); live.push(s)
    s.onended = () => { const i = live.indexOf(s); if (i >= 0) live.splice(i, 1); s.disconnect(); g.disconnect(); if (last !== g) last.disconnect() }
    return true
  }
  /** render everything in small idle slices so the first fanfare never costs a frame */
  function warm() { const names = Object.keys(DEF), go = () => { const t = performance.now(); while (names.length && performance.now() - t < 4) { const n = names.shift(); for (let k = 0; k < (VAR[n] || 1); k++) get(n, k) } if (names.length) setTimeout(go, 30) }; setTimeout(go, 200) }
  return { play, warm, get }
}
