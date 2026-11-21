// Her life layer helpers: springs are frame-rate independent, blinks are timed like real blinks.
import test from 'node:test'
import assert from 'node:assert/strict'
import { SPR, spring, BLINKER, stepBlink, triggerBlink, BLINK, GAZE, stepGaze, envelope, approach } from '../../src/art/chibi/lifeCore.js'

const run = (fps, secs, f) => { const dt = 1 / fps; for (let i = 0; i < Math.round(secs * fps); i++) f(dt) }

test('spring settles on the target and does not depend on the frame rate', () => {
  const a = SPR(), b = SPR()
  run(30, 0.4, dt => spring(a, 1, 2, 0.6, dt)); run(144, 0.4, dt => spring(b, 1, 2, 0.6, dt))
  assert.ok(Math.abs(a.x - b.x) < 0.02, `30 fps ${a.x} vs 144 fps ${b.x}`)
  run(60, 4, dt => spring(a, 1, 2, 0.6, dt)); assert.ok(Math.abs(a.x - 1) < 1e-3)
})
test('an under-damped spring overshoots a little (follow-through), a stiff long frame stays stable', () => {
  const s = SPR(); let peak = 0; run(60, 2, dt => { peak = Math.max(peak, spring(s, 1, 2, 0.5, dt)) })
  assert.ok(peak > 1.05 && peak < 1.4, `peak ${peak}`)
  const t = SPR(); spring(t, 1, 12, 0.7, 0.25); assert.ok(Number.isFinite(t.x) && Math.abs(t.x) < 2)
})
test('blinks: shut briefly, 2-6 s apart, sometimes doubled', () => {
  let r = 0; const rnd = () => (r = (r * 9301 + 49297) % 233280) / 233280
  const b = BLINKER(rnd); let shut = 0, starts = [], prev = 1, t = 0
  run(120, 120, dt => { t += dt; const o = stepBlink(b, dt); if (o < 0.05) shut += dt; if (prev >= 0.5 && o < 0.5) starts.push(t); prev = o })
  const gaps = starts.slice(1).map((x, i) => x - starts[i])
  assert.ok(starts.length > 20 && starts.length < 75, `${starts.length} blinks in 2 min`)
  assert.ok(gaps.every(g => g > 0.15 && g < BLINK.max + 0.3), 'gaps within 0.15..6.3 s')
  assert.ok(gaps.some(g => g < 0.6), 'at least one double blink')
  assert.ok(shut / starts.length < 0.12, 'each blink is shut for well under 0.12 s')
})
test('triggerBlink starts a blink at once', () => {
  const b = BLINKER(() => 0.99); stepBlink(b, 0.01); triggerBlink(b); run(60, 0.1, dt => stepBlink(b, dt)); assert.ok(stepBlink(b, 0.001) < 1)
})
test('gaze jumps fast toward the focus and stays inside the eye', () => {
  const g = GAZE(() => 0.5); run(60, 0.45, dt => stepGaze(g, 0.6, -0.2, dt)); assert.ok(Math.abs(g.x - 0.6) < 0.05 && Math.abs(g.y + 0.2) < 0.05)
  run(60, 0.5, dt => stepGaze(g, 3, 3, dt)); assert.ok(g.x <= 1 && g.y <= 1)
})
test('envelope and approach', () => {
  assert.equal(envelope(-1, 2, 0.3), 0); assert.equal(envelope(1, 2, 0.3), 1); assert.equal(envelope(2.5, 2, 0.3), 0)
  assert.ok(Math.abs(approach(0, 1, 10, 0.1) - (1 - Math.exp(-1))) < 1e-9)
})

test('gaze is calm: holds of 0.35-1.5 s, monotonic moves, no oscillation, no twitches', () => {
  let s = 12345; const rnd = () => (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296
  for (const fps of [30, 60, 144]) {
    const g = GAZE(rnd), dt = 1 / fps; let prev = 0, dir = 0, rev = 0, last = -1, minHold = 9, maxHold = 0, moveStart = 0, maxStep = 0
    for (let i = 0; i < fps * 60; i++) { const t = i * dt, px = g.x; stepGaze(g, 0.3 * Math.sin(t * 0.7), 0, dt, 1)
      const d = g.x - px; maxStep = Math.max(maxStep, Math.abs(d)); if (Math.abs(d) > 1e-4) { const sd = Math.sign(d); if (dir && sd !== dir) rev++; dir = sd }
      if (g.jx !== prev) { if (last >= 0) { const h = t - last; minHold = Math.min(minHold, h); maxHold = Math.max(maxHold, h) } last = t; prev = g.jx } }
    assert.ok(minHold >= 0.34 && maxHold <= 1.51, `hold ${minHold}..${maxHold} @${fps}`)
    assert.ok(maxStep <= 12 * dt + 1e-9, 'slew limited')
    assert.ok(rev <= 60 / 0.35 * 0.5, `direction reversals ${rev} @${fps}`) // at most about one per saccade, never per-frame
  }
  const g = GAZE(() => 0.5); let rv = 0, dr = 0, px = 0; for (let i = 0; i < 600; i++) { stepGaze(g, 0, 0, 1 / 60); const d = g.x - px; if (Math.abs(d) > 1e-5) { if (dr && Math.sign(d) !== dr) rv++; dr = Math.sign(d) } px = g.x }
  assert.ok(rv <= 11, `a constant target only alternates once per saccade (${rv})`) // 10 s / 0.925 s holds
})
