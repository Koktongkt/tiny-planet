// Tiny offline DSP kit (pure JS, no WebAudio): renders instrument samples (music/inst.js) and the SFX (sfx.js) into
// Float32Arrays once, so playback is one AudioBufferSourceNode + one GainNode per note. Runs in Node too (unit tests).
export const mtof = (m) => 440 * 2 ** ((m - 69) / 12)
const TAU = Math.PI * 2
/** deterministic noise (LCG) so previews and tests are repeatable */
export function rng(seed = 1) { let s = seed >>> 0 || 1; return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2147483648) - 1 }
/** add a decaying sine partial: rotating phasor (no Math.sin per sample). o: { at (s), att (s), tau2, mix2, ph } */
export function partial(out, sr, f, a, tau, o = {}) {
  if (f <= 0 || f >= sr * 0.48) return
  const w = TAU * f / sr, c = Math.cos(w), s = Math.sin(w), n0 = Math.round((o.at || 0) * sr), att = Math.max(1, (o.att || 0.002) * sr)
  const e1 = Math.exp(-1 / (tau * sr)), e2 = o.tau2 ? Math.exp(-1 / (o.tau2 * sr)) : 0, m2 = o.mix2 || 0
  let x = Math.cos(o.ph || 0), y = Math.sin(o.ph || 0), g1 = a * (1 - m2), g2 = a * m2
  for (let i = n0, k = 0, n = out.length; i < n; i++, k++) {
    const xn = x * c - y * s; y = x * s + y * c; x = xn
    out[i] += y * (g1 + g2) * (k < att ? k / att : 1); g1 *= e1; g2 *= e2
    if ((k & 255) === 0 && g1 + g2 < 1e-4) break
  }
}
/** struck bell / bar: inharmonic ratios, upper partials die faster */
export function bell(out, sr, f, at, a, tau, R = [1, 2.76, 5.4, 8.93], A = [1, 0.35, 0.16, 0.07]) {
  for (let k = 0; k < R.length; k++) partial(out, sr, f * R[k], a * A[k], tau / (1 + 1.4 * k), { at, att: 0.0015, ph: k })
}
/** pitched tone with an exponential pitch glide f0->f1 and an attack/decay envelope. type: sine | tri | saw (soft, 6 harmonics) */
export function tone(out, sr, f0, f1, at, dur, a, o = {}) {
  const n0 = Math.round(at * sr), n = Math.min(out.length - n0, Math.round(dur * sr)), att = Math.max(1, (o.att ?? 0.005) * sr), type = o.type || 'sine'
  const vib = o.vib || 0, vr = o.vibHz || 5.5; let ph = 0
  for (let k = 0; k < n; k++) {
    const u = k / n, f = f0 * (f1 / f0) ** (o.curve ? u ** o.curve : u) * (1 + vib * Math.sin(TAU * vr * k / sr)); ph += TAU * f / sr
    let v = type === 'sine' ? Math.sin(ph) : type === 'tri' ? Math.sin(ph) - Math.sin(3 * ph) / 9 + Math.sin(5 * ph) / 25 : Math.sin(ph) + Math.sin(2 * ph) / 2.2 + Math.sin(3 * ph) / 3.4 + Math.sin(4 * ph) / 5 + Math.sin(5 * ph) / 7 + Math.sin(6 * ph) / 9
    const env = (k < att ? k / att : 1) * (o.hold ? (u < o.hold ? 1 : Math.exp(-(u - o.hold) * (o.dk || 6))) : Math.exp(-u * (o.dk || 6))) * Math.min(1, (n - k) / (0.004 * sr))
    out[n0 + k] += v * a * env
  }
}
/** RBJ biquad, coefficients for one (type, f, Q) */
function coef(type, f, Q, sr) {
  const w = TAU * Math.min(f, sr * 0.45) / sr, cs = Math.cos(w), al = Math.sin(w) / (2 * Q); let b0, b1, b2
  if (type === 'lp') { b0 = (1 - cs) / 2; b1 = 1 - cs; b2 = b0 } else if (type === 'hp') { b0 = (1 + cs) / 2; b1 = -(1 + cs); b2 = b0 } else { b0 = al; b1 = 0; b2 = -al }
  const a0 = 1 + al; return [b0 / a0, b1 / a0, b2 / a0, -2 * cs / a0, (1 - al) / a0]
}
/** filtered noise burst: filter type lp|hp|bp swept f0->f1, envelope att then exp decay; o.am = [Hz, depth] flutter, o.grit = random AM */
export function noise(out, sr, at, dur, a, type, f0, f1 = f0, Q = 0.8, o = {}) {
  const n0 = Math.round(at * sr), n = Math.min(out.length - n0, Math.round(dur * sr)), att = Math.max(1, (o.att ?? 0.004) * sr), R = rng(o.seed || 7)
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0, C = null, gr = 1
  for (let k = 0; k < n; k++) {
    if ((k & 15) === 0) { const u = k / n; C = coef(type, f0 * (f1 / f0) ** u, Q, sr); if (o.grit) gr = 1 - o.grit + o.grit * Math.abs(R()) }
    const x = R(), y = C[0] * x + C[1] * x1 + C[2] * x2 - C[3] * y1 - C[4] * y2; x2 = x1; x1 = x; y2 = y1; y1 = y
    const u = k / n, env = (k < att ? k / att : 1) * Math.exp(-u * (o.dk || 5)) * Math.min(1, (n - k) / (0.003 * sr)) * (o.am ? 1 - o.am[1] * (0.5 + 0.5 * Math.sin(TAU * o.am[0] * k / sr)) : 1)
    out[n0 + k] += y * a * env * gr
  }
}
/** scale to a peak (returns the array) */
export function norm(x, peak = 0.8) { let p = 0; for (let i = 0; i < x.length; i++) p = Math.max(p, Math.abs(x[i])); if (p > 0) { const g = peak / p; for (let i = 0; i < x.length; i++) x[i] *= g } return x }
/** short fade-out at the end so nothing clicks */
export function tail(x, sr, s = 0.01) { const n = Math.round(s * sr); for (let i = 0; i < n && i < x.length; i++) x[x.length - 1 - i] *= i / n; return x }
