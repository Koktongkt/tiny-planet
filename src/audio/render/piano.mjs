// Offline renderer for the Tiny Planet piano loop (original composition, additive piano synth + Freeverb).
// node src/audio/render/piano.mjs out.wav   -> 48 kHz stereo 16-bit WAV, seamless loop (reverb tail folded into the start)
// Then: ffmpeg -i out.wav -c:a libopus -b:a 40k public/audio/piano-loop.ogg ; ffmpeg -i out.wav -c:a aac -b:a 48k public/audio/piano-loop.m4a
/* global Buffer, process, console */ // Node-only offline tool (not bundled)
import fs from 'fs'
const SR = 48000, BPM = 60, BEAT = 60 / BPM, BEATS = 64, LOOP = BEATS * BEAT, TAIL = 7
const N = Math.round((LOOP + TAIL) * SR), L = new Float32Array(N), Rr = new Float32Array(N)
const hz = (m) => 440 * 2 ** ((m - 69) / 12)
// ---- score (beats, midi, duration beats, velocity 0..1). F major, IV–V–iii–vi–ii–V7sus–I–Iadd9, 8 s per chord ----
const CH = [[46, 53, 57, 62], [48, 55, 62, 64], [45, 52, 55, 60], [50, 57, 64, 65], [43, 50, 53, 58], [48, 55, 58, 65], [41, 48, 52, 57], [41, 48, 55, 57, 64]]
const notes = []
CH.forEach((c, i) => { const b = i * 8
  notes.push([b, c[0], 7.6, 0.42], [b + 1, c[1], 6.4, 0.3], [b + 2, c[2], 5.2, 0.28], [b + 3, c[3], 4.6, 0.26])
  notes.push([b + 4.5, c[1], 3.2, 0.2], [b + 6, c[c.length - 1], 1.9, 0.2])
})
const MEL = [[1, 74, 1.5, .55], [2.5, 72, 1, .48], [3.5, 69, 3, .5],
  [8.5, 76, 1.5, .55], [10, 74, 1, .48], [11, 79, 3.2, .58], [14.5, 76, 1.4, .42],
  [17, 72, 2, .5], [19, 76, 1, .48], [20, 74, 0.5, .42], [20.5, 72, 3.4, .5],
  [25, 69, 1, .46], [26, 72, 1, .5], [27, 77, 3.2, .58], [30.5, 76, 1.4, .44],
  [33, 74, 2, .52], [35, 77, 1, .5], [36, 79, 1, .54], [37, 81, 3.4, .6], [39.5, 93, 0.5, .16],
  [41, 79, 1.5, .52], [42.5, 77, 1, .46], [43.5, 72, 3.4, .48],
  [49, 69, 1.5, .48], [50.5, 72, 1, .48], [51.5, 76, 2.6, .54], [54.5, 77, 1.4, .46],
  [57, 72, 1, .46], [58, 69, 1, .42], [59, 67, 4.2, .46], [62, 84, 0.6, .14]]
notes.push(...MEL)
// ---- piano voice: inharmonic partials, two-stage decay, damper on release, slight unison detune, hammer tick ----
function note(start, m, durB, vel) {
  const f = hz(m), t0 = Math.round(start * BEAT * SR), off = durB * BEAT, B = 0.00035 * (f / 260)
  const T1 = Math.max(0.35, 1.6 * (260 / f) ** 0.6), T2 = Math.max(1.6, 9 * (260 / f) ** 0.55)
  const pan = Math.max(-0.6, Math.min(0.6, (m - 62) / 30)), gl = Math.cos((pan + 1) * Math.PI / 4), gr = Math.sin((pan + 1) * Math.PI / 4)
  const K = Math.min(14, Math.floor(9000 / f)), len = Math.min(N - t0, Math.round((off + 1.2) * SR))
  const amps = [], fr = [], d1 = [], d2 = []
  for (let k = 1; k <= K; k++) { amps.push(vel ** (1 + 0.15 * k) * (1 / k ** 1.15) * (k === 1 ? 1 : 0.9) * (1 - 0.6 * Math.abs(Math.sin(k * Math.PI * 0.13)))); fr.push(f * k * Math.sqrt(1 + B * k * k)); d1.push(T1 / (1 + 0.5 * (k - 1))); d2.push(T2 / (1 + 0.35 * (k - 1))) }
  for (let k = 0; k < K; k++) {
    const w1 = 2 * Math.PI * fr[k] / SR, w2 = w1 * (1 + 0.0007), a = amps[k], ph = Math.random() * 6.28
    const e1 = Math.exp(-1 / (d1[k] * SR)), e2 = Math.exp(-1 / (d2[k] * SR)), er = Math.exp(-1 / (0.18 / (1 + 0.3 * k) * SR))
    let g1 = 0.55 * a, g2 = 0.45 * a, rel = 1
    for (let i = 0; i < len; i++) { const t = i / SR; if (t > off) rel *= er
      const att = i < 96 ? i / 96 : 1, s = att * rel * (g1 + g2) * (Math.sin(w1 * i + ph) + 0.5 * Math.sin(w2 * i + ph * 1.3)) / 1.5
      g1 *= e1; g2 *= e2; L[t0 + i] += s * gl; Rr[t0 + i] += s * gr }
  }
  // hammer: a 6 ms band of soft noise
  let lp = 0; for (let i = 0; i < 300 && t0 + i < N; i++) { lp += 0.25 * ((Math.random() * 2 - 1) - lp); const s = lp * vel * 0.05 * Math.exp(-i / 70); L[t0 + i] += s * gl; Rr[t0 + i] += s * gr }
}
for (const n of notes) note(...n)
// ---- Freeverb-style room (comb + allpass), wet ~28% ----
function verb(inp, spread) {
  const combs = [1557, 1617, 1491, 1422, 1277, 1356, 1188, 1116].map(d => ({ b: new Float32Array(d + spread), i: 0, f: 0 })), aps = [556, 441, 341, 225].map(d => ({ b: new Float32Array(d + spread), i: 0 }))
  const out = new Float32Array(inp.length), fb = 0.86, damp = 0.35
  for (let n = 0; n < inp.length; n++) { const x = inp[n] * 0.024; let y = 0
    for (const c of combs) { const o = c.b[c.i]; c.f = o * (1 - damp) + c.f * damp; c.b[c.i] = x + c.f * fb; c.i = (c.i + 1) % c.b.length; y += o }
    for (const a of aps) { const o = a.b[a.i]; a.b[a.i] = y + o * 0.5; a.i = (a.i + 1) % a.b.length; y = o - y }
    out[n] = y }
  return out
}
const wl = verb(L, 0), wr = verb(Rr, 23)
const S = Math.round(LOOP * SR), oL = new Float32Array(S), oR = new Float32Array(S)
for (let i = 0; i < N; i++) { const j = i % S; oL[j] += L[i] * 0.78 + wl[i] * 0.9; oR[j] += Rr[i] * 0.78 + wr[i] * 0.9 } // fold the tail into the loop start
let pk = 0; for (let i = 0; i < S; i++) pk = Math.max(pk, Math.abs(oL[i]), Math.abs(oR[i]))
const g = 0.7 / pk, buf = Buffer.alloc(44 + S * 4)
buf.write('RIFF', 0); buf.writeUInt32LE(36 + S * 4, 4); buf.write('WAVEfmt ', 8); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22); buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(S * 4, 40)
for (let i = 0; i < S; i++) { buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, oL[i] * g)) * 32767), 44 + i * 4); buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, oR[i] * g)) * 32767), 46 + i * 4) }
fs.writeFileSync(process.argv[2] || 'piano-loop.wav', buf); console.log('loop', LOOP, 's notes', notes.length, 'peak', pk.toFixed(2))
