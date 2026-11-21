// Pure helpers for her procedural "life" layer (no three / react): damped springs, blink and gaze schedulers.
// Everything is frame-rate independent (fixed sub-steps) and allocation-free per step.
export const clamp = (x, a, b) => (x < a ? a : x > b ? b : x)
export const sst = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t) }
/** damped spring state */
export const SPR = (x = 0) => ({ x, v: 0 })
/**
 * Advance a damped spring toward target. freq in Hz, zeta = damping ratio (0.5..0.8 reads "alive"), push = extra
 * acceleration (e.g. from body acceleration for secondary motion). Sub-stepped at <= 1/120 s, so the result does not
 * depend on the frame rate.
 */
export function spring(s, target, freq, zeta, dt, push = 0) {
  const w = 6.283185 * freq, n = Math.max(1, Math.ceil(dt * 120)), h = dt / n
  for (let i = 0; i < n; i++) { s.v += (w * w * (target - s.x) - 2 * zeta * w * s.v + push) * h; s.x += s.v * h }
  return s.x
}
/** exponential approach (frame-rate independent lerp): rate in 1/s */
export const approach = (x, target, rate, dt) => x + (target - x) * (1 - Math.exp(-rate * dt))

// ---- blinks: close fast (~60 ms), hold ~40 ms, open slower (~120 ms); every 2-6 s, ~18% double blinks ----
export const BLINK = { close: 0.06, hold: 0.04, open: 0.12, min: 2, max: 6, double: 0.18, gap: 0.16 }
export const BLINKER = (rnd = Math.random) => ({ wait: BLINK.min + rnd() * (BLINK.max - BLINK.min), t: -1, again: false, rnd })
/** start a blink now (e.g. on a quick head turn) unless one is running */
export function triggerBlink(b) { if (b.t < 0) { b.t = 0; b.again = false } }
/** step; returns eye openness 0 (shut) .. 1 (open) */
export function stepBlink(b, dt) {
  if (b.t < 0) { b.wait -= dt; if (b.wait <= 0) { b.t = 0; b.again = b.rnd() < BLINK.double } else return 1 }
  b.t += dt; const { close, hold, open } = BLINK, T = close + hold + open
  if (b.t >= T) { b.t = -1; b.wait = b.again ? BLINK.gap : BLINK.min + b.rnd() * (BLINK.max - BLINK.min); b.again = false; return 1 }
  if (b.t < close) return 1 - sst(0, 1, b.t / close)
  if (b.t < close + hold) return 0
  return sst(0, 1, (b.t - close - hold) / open)
}

// ---- gaze: calm saccades around a focus point. Each saccade is a quick but smooth, monotonic move (exponential approach
// with a slew limit, so it can never ring or oscillate), followed by a hold of 0.35-1.5 s. The wanted focus is low-passed first, so a
// noisy look target cannot make the eyes twitch, and consecutive saccades are at least ~0.12 apart (no tiny back-and-forth). ----
export const GAZE = (rnd = Math.random) => ({ x: 0, y: 0, jx: 0, jy: 0, fx: 0, fy: 0, hold: 0.5, rnd })
export const GAZE_HOLD = [0.35, 1.5], GAZE_SPEED = 12 // eye units per second at most
/** fx, fy: where she wants to look (eye units, -1..1); returns the gaze object with x, y updated */
export function stepGaze(g, fx, fy, dt, amp = 1) {
  g.hold -= dt
  if (g.hold <= 0) { g.hold = GAZE_HOLD[0] + g.rnd() * (GAZE_HOLD[1] - GAZE_HOLD[0])
    let nx = (g.rnd() * 2 - 1) * 0.35 * amp, ny = (g.rnd() * 2 - 1) * 0.2 * amp
    if (Math.abs(nx - g.jx) < 0.12 * amp) nx = g.jx - (g.jx >= 0 ? 1 : -1) * 0.2 * amp // a saccade is a visible move, never a twitch
    g.jx = nx; g.jy = ny }
  g.fx = approach(g.fx, fx, 8, dt); g.fy = approach(g.fy, fy, 8, dt)
  const mv = GAZE_SPEED * dt, tx = clamp(g.fx + g.jx, -1, 1), ty = clamp(g.fy + g.jy, -1, 1)
  g.x += clamp(approach(g.x, tx, 22, dt) - g.x, -mv, mv); g.y += clamp(approach(g.y, ty, 22, dt) - g.y, -mv, mv)
  return g
}
/** smooth 0..1..0 envelope for a one-shot of length dur at time u (seconds), with ramp seconds in/out */
export const envelope = (u, dur, ramp) => (u <= 0 || u >= dur ? 0 : Math.min(sst(0, ramp, u), 1 - sst(dur - ramp, dur, u)))
