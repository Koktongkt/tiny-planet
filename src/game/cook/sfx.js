// Cook-step sounds. Every number a sound designer would turn lives in COOK_SFX.
// Rendered here (not in src/audio/sfx.js) so the buffers travel with the mini-game chunk.
// Playback patches window.__tpAudio.fx when the audio graph already exists.

export const SR = 24000
export const COOK_SFX = {
  cook_stir: { dur: 0.28, level: 0.2, f0: 310, f1: 560, wobble: 9 },
  cook_sizzle: { dur: 0.36, level: 0.16, f: 2800, crackle: 0.85 },
  cook_pour: { dur: 0.46, level: 0.18, f0: 240, f1: 420, drip: 700 },
  cook_perfect: { dur: 0.7, level: 0.22, notes: [523.25, 659.25, 783.99] },
}

const TAU = Math.PI * 2
function env(u, att, rel) { return Math.min(1, u / att) * Math.min(1, (1 - u) / rel) }

function stir(x, D) {
  const n = x.length
  for (let i = 0; i < n; i++) {
    const u = i / n, f = D.f0 + (D.f1 - D.f0) * u + Math.sin(TAU * D.wobble * u) * 28
    x[i] += Math.sin(TAU * f * (i / SR)) * 0.6 * env(u, 0.08, 0.22)
    x[i] += Math.sin(TAU * f * 2.02 * (i / SR)) * 0.12 * env(u, 0.1, 0.2)
  }
}
function sizzle(x, D, seed) {
  let s = seed >>> 0 || 1, acc = 0
  const n = x.length
  for (let i = 0; i < n; i++) {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    const r = (s / 4294967296) * 2 - 1
    acc = acc * 0.72 + r * D.crackle
    const u = i / n
    x[i] += acc * env(u, 0.04, 0.18)
    x[i] += Math.sin(TAU * D.f * (i / SR)) * 0.04 * env(u, 0.05, 0.3)
  }
}
function pour(x, D, seed) {
  let s = seed >>> 0 || 3, acc = 0
  const n = x.length
  for (let i = 0; i < n; i++) {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    const r = (s / 4294967296) * 2 - 1
    acc = acc * 0.86 + r
    const u = i / n, f = D.f0 + (D.f1 - D.f0) * u
    x[i] += acc * 0.35 * env(u, 0.12, 0.2)
    x[i] += Math.sin(TAU * f * (i / SR)) * 0.25 * env(u, 0.1, 0.25)
    if ((i % Math.round(SR * 0.11)) === 0) x[i] += 0.4
    x[i] += Math.sin(TAU * D.drip * (i / SR)) * 0.05 * env(u, 0.2, 0.2)
  }
}
function perfect(x, D) {
  D.notes.forEach((f, k) => {
    const at = Math.round(k * 0.11 * SR)
    for (let i = at; i < x.length; i++) {
      const u = (i - at) / SR
      const e = Math.min(1, u / 0.01) * Math.exp(-u * 3.2)
      x[i] += Math.sin(TAU * f * (i / SR)) * 0.55 * e
      x[i] += Math.sin(TAU * f * 2 * (i / SR)) * 0.12 * e
    }
  })
}

export function renderCook(name, seed = 1) {
  const D = COOK_SFX[name]
  if (!D) return null
  const x = new Float32Array(Math.max(1, Math.round(D.dur * SR)))
  if (name === 'cook_stir') stir(x, D)
  else if (name === 'cook_sizzle') sizzle(x, D, seed)
  else if (name === 'cook_pour') pour(x, D, seed)
  else perfect(x, D)
  let p = 0
  for (let i = 0; i < x.length; i++) p = Math.max(p, Math.abs(x[i]))
  if (p > 0) { const g = 0.85 / p; for (let i = 0; i < x.length; i++) x[i] *= g }
  const tail = Math.round(0.012 * SR)
  for (let i = 0; i < tail && i < x.length; i++) x[x.length - 1 - i] *= i / tail
  return x
}

const cache = new Map()
function buffer(ctx, name) {
  const hit = cache.get(name)
  if (hit) return hit
  const x = renderCook(name)
  if (!x) return null
  const b = ctx.createBuffer(1, x.length, SR)
  b.getChannelData(0).set(x)
  cache.set(name, b)
  return b
}
function playBuf(A, name, o) {
  const b = buffer(A.ctx, name)
  if (!b) return false
  const src = A.ctx.createBufferSource(), g = A.ctx.createGain()
  src.buffer = b
  src.playbackRate.value = (o && o.rate) || 1
  g.gain.value = ((o && o.vol) ?? 1) * COOK_SFX[name].level
  src.connect(g)
  g.connect(A.sfx || A.ctx.destination)
  try { src.start() } catch (e) { return false }
  return true
}
/** Wrap the live fx() so cook_* names play. Safe to call often; no-op until audio exists. */
export function mountCookSfx() {
  const A = typeof window !== 'undefined' && window.__tpAudio
  if (!A || !A.ctx || !A.fx || A.__cookSfx) return !!A && !!A.__cookSfx
  const prev = A.fx
  A.fx = (name, o) => (COOK_SFX[name] ? playBuf(A, name, o) : prev(name, o))
  A.__cookSfx = 1
  return true
}
export function fx(name, o) {
  mountCookSfx()
  const A = typeof window !== 'undefined' && window.__tpAudio
  if (A && A.fx) return A.fx(name, o)
  return false
}
