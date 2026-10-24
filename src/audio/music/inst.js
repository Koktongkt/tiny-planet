// Instrument samples for the procedural score (rendered once in JS, a root every 6 semitones, re-pitched by playbackRate)
// and the live (oscillator) voices. Everything is an original synthesis: no soundfonts, no downloaded samples.
import { partial, mtof, rng, noise, norm, tail } from '../dsp.js'
export const SR = 24000 // samples are mellow; 24 kHz halves render time + memory (the context resamples)
const roots = (a, b) => { const r = []; for (let m = a; m <= b; m += 6) r.push(m); return r }
const buf = (s) => new Float32Array(Math.round(s * SR))
const body = (f, c, w) => Math.exp(-(((f - c) / w) ** 2))
export const SAMPLED = {
  // warm felt piano: inharmonic partials, two-stage decay, a faint unison beat, soft hammer
  piano: { roots: roots(36, 96), gain: 0.5, rel: 0.35, render(m) {
    const f = mtof(m), x = buf(Math.min(3.2, Math.max(1.3, 3.2 * (220 / f) ** 0.35))), B = 0.00035 * (f / 260)
    const T1 = Math.max(0.3, 1.5 * (260 / f) ** 0.6), T2 = Math.max(1.3, 7 * (260 / f) ** 0.5)
    for (let k = 1; k <= 12; k++) { const fk = f * k * Math.sqrt(1 + B * k * k), a = (1 / k ** 1.15) * (1 - 0.6 * Math.abs(Math.sin(k * Math.PI * 0.13)))
      const o = { tau2: T2 / (1 + 0.35 * (k - 1)), mix2: 0.45, att: 0.002, ph: k }
      partial(x, SR, fk, a, T1 / (1 + 0.5 * (k - 1)), o); if (k < 5) partial(x, SR, fk * 1.0009, a * 0.35, T1 / (1 + 0.5 * (k - 1)), { ...o, ph: k * 2.3 }) }
    noise(x, SR, 0, 0.012, 0.05, 'lp', 2500, 1200, 0.7, { seed: m }); return tail(norm(x, 0.6), SR) } },
  // celesta / music box: nearly pure bar tone, a quick metallic 'ting', a soft 2nd and 3rd from the resonator
  celesta: { roots: roots(60, 102), gain: 0.42, rel: 0.5, render(m) {
    const f = mtof(m), x = buf(Math.max(1.1, 2.2 * (523 / f) ** 0.5)), t = 1.6 * (523 / f) ** 0.6
    partial(x, SR, f, 1, t, { att: 0.001 }); partial(x, SR, f * 2, 0.12, t * 0.35); partial(x, SR, f * 3, 0.05, t * 0.18); partial(x, SR, f * 4.07, 0.16, 0.045); partial(x, SR, f * 6.2, 0.06, 0.02)
    return tail(norm(x, 0.6), SR) } },
  // pizzicato strings (and the plucked bass below 50): harmonic series shaped by a violin-ish body
  pizz: { roots: roots(33, 87), gain: 0.55, rel: 0.12, render(m) {
    const f = mtof(m), x = buf(m < 50 ? 1.4 : 0.8), T = (m < 50 ? 0.8 : 0.42) * (220 / f) ** 0.35
    for (let k = 1; k <= 16; k++) { const fk = f * k; if (fk > 10000) break; partial(x, SR, fk, (1 / k ** 1.25) * (0.6 + body(fk, 480, 260) + 0.5 * body(fk, 2600, 900)), T / (1 + 0.28 * (k - 1)), { att: 0.003, ph: k * 0.7 }) }
    noise(x, SR, 0, 0.01, 0.03, 'bp', 1800, 1800, 1, { seed: m }); return tail(norm(x, 0.6), SR) } },
  // harpsichord: bright plucked series (pluck near the bridge), a crisp quill click
  harpsi: { roots: roots(41, 89), gain: 0.3, rel: 0.2, render(m) {
    const f = mtof(m), x = buf(1.6), T = 1.5 * (220 / f) ** 0.5
    for (let k = 1; k <= 24; k++) { const fk = f * k * (1 + 0.00008 * k * k); if (fk > 10500) break; partial(x, SR, fk, (0.15 + Math.abs(Math.sin(k * Math.PI * 0.12))) / k ** 0.75, T / (1 + 0.12 * (k - 1)), { att: 0.0008, ph: k }) }
    noise(x, SR, 0, 0.006, 0.08, 'hp', 3000, 3000, 0.7, { seed: m }); return tail(norm(x, 0.6), SR) } },
  // nylon guitar / harp: warm plucked series, plucked over the sound hole, long gentle ring
  guitar: { roots: roots(40, 88), gain: 0.48, rel: 0.4, render(m) {
    const f = mtof(m), x = buf(2.2), T = 1.9 * (196 / f) ** 0.5
    for (let k = 1; k <= 14; k++) { const fk = f * k * (1 + 0.00012 * k * k); if (fk > 9000) break; partial(x, SR, fk, (0.08 + Math.abs(Math.sin(k * Math.PI * 0.19))) / k ** 1.3 * (1 + 0.6 * body(fk, 220, 120)), T / (1 + 0.32 * (k - 1)), { att: 0.002, ph: k * 1.3 }) }
    return tail(norm(x, 0.6), SR) } },
  // percussion, one 'root' each (played at a fixed pitch)
  wood: { roots: [72], gain: 0.25, rel: 0.05, render() { const x = buf(0.25); partial(x, SR, 880, 1, 0.04, { att: 0.0005 }); partial(x, SR, 880 * 2.62, 0.35, 0.018); noise(x, SR, 0, 0.01, 0.2, 'bp', 2500, 2500, 1.2, { seed: 3 }); return tail(norm(x, 0.6), SR) } },
  tri: { roots: [96], gain: 0.12, rel: 0.6, render() { const x = buf(1.8); for (const [r, a] of [[1, 1], [2.76, 0.5], [5.4, 0.35], [8.9, 0.2], [11.7, 0.1]]) partial(x, SR, 2350 * r > 11000 ? 0 : 2350 * r, a, 1.3 / (1 + r * 0.3), { att: 0.001 }); return tail(norm(x, 0.6), SR) } },
  shaker: { roots: [84], gain: 0.16, rel: 0.03, render() { const x = buf(0.12); noise(x, SR, 0, 0.11, 1, 'hp', 6500, 5000, 0.7, { att: 0.012, dk: 7, seed: 11 }); return tail(norm(x, 0.6), SR) } },
  bells: { roots: [100], gain: 0.07, rel: 0.1, render() { const x = buf(0.4), R = rng(5); for (let i = 0; i < 4; i++) { const at = 0.012 * i + 0.004 * Math.abs(R()); partial(x, SR, 4200 + 700 * R(), 0.6, 0.12, { at, att: 0.0005 }); partial(x, SR, 6900 + 600 * R(), 0.3, 0.06, { at }) } noise(x, SR, 0, 0.2, 0.3, 'hp', 7000, 7000, 0.7, { seed: 9, dk: 8 }); return tail(norm(x, 0.6), SR) } },
}
// live voices: periodic waves (harmonic amplitudes), envelopes, vibrato; accordion / strings get a detuned twin
export const LIVE = {
  flute: { h: [0, 1, 0.32, 0.1, 0.04, 0.02], gain: 0.15, att: 0.06, dec: 0.4, sus: 0.8, rel: 0.12, vib: 0.006, vibHz: 5.1, chiff: 0.05 },
  ocarina: { h: [0, 1, 0.08, 0.02], gain: 0.17, att: 0.04, dec: 0.3, sus: 0.85, rel: 0.1, vib: 0.005, vibHz: 5.6, chiff: 0.035 },
  clarinet: { h: [0, 1, 0.04, 0.5, 0.03, 0.26, 0.02, 0.12, 0, 0.05], gain: 0.1, att: 0.05, dec: 0.5, sus: 0.82, rel: 0.1, vib: 0.002, vibHz: 4.8, lp: 2600 },
  accordion: { h: [0, 1, 0.7, 0.5, 0.42, 0.3, 0.24, 0.16, 0.12, 0.08, 0.05], gain: 0.07, att: 0.03, dec: 0.3, sus: 0.85, rel: 0.08, twin: 9, lp: 2900, trem: [5.6, 0.12] },
  strings: { h: [0, 1, 0.5, 0.33, 0.25, 0.2, 0.16, 0.13, 0.1, 0.08, 0.06, 0.05, 0.04], gain: 0.045, att: 0.5, dec: 1, sus: 0.9, rel: 0.6, twin: 7, lp: 1700, vib: 0.003, vibHz: 4.6 },
}
