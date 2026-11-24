// Her house, part A: the decisions behind her indoor life, kept pure (no three.js, no React) so they can be unit-tested.
// Walk-to (she walks the last steps to an activity and turns to face it), the idle director (one short walk to a nearby
// spot per idle stretch), idle-spot choice, and which thing she glances at. Room units throughout (she is ~0.39 tall).
export const IDLE_WALK_AFTER = 15 // s standing still before she wanders to something close by
export const IDLE_RANGE = 0.55 // about two of her steps
const ARRIVE = 0.08, STUCK_T = 0.6, STUCK_GAIN = 0.01, TURN_RATE = 10, TURN_OK = 0.08, TURN_MAX = 0.5
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a))

/** start a walk to stand [x, z], ending facing faceYaw; sets hp.target (the movement code walks her there) */
export function makeWalk(hp, stand, faceYaw) {
  const tgt = { x: stand[0], z: stand[1] }; hp.target = tgt
  return { tgt, face: faceYaw, phase: 'walk', best: Math.hypot(hp.x - tgt.x, hp.z - tgt.z), still: 0, turnT: 0 }
}
/** per frame: 'walking' | 'turning' | 'done' | 'stuck' | 'cancelled' */
export function stepWalk(W, hp, dt) {
  if (W.phase === 'stuck') return 'stuck'
  if (W.phase === 'walk') {
    const d = Math.hypot(hp.x - W.tgt.x, hp.z - W.tgt.z)
    if (hp.target !== W.tgt) { if (hp.target || d > ARRIVE) return 'cancelled'; W.phase = 'turn' } // input or a tap replaced / cleared it
    else {
      if (d < W.best - STUCK_GAIN) { W.best = d; W.still = 0 } else W.still += dt
      if (W.still >= STUCK_T) { hp.target = null; W.phase = 'stuck'; return 'stuck' }
      return 'walking'
    }
  }
  if (hp.target) return 'cancelled'
  W.turnT += dt; const dd = wrap(W.face - hp.yaw); hp.yaw += dd * Math.min(1, dt * TURN_RATE)
  return Math.abs(wrap(W.face - hp.yaw)) < TURN_OK || W.turnT >= TURN_MAX ? 'done' : 'turning'
}

export function makeIdle() { return { t: 0, used: false } }
/** ctx { still, blocked }: returns 'walk' once per idle stretch, after IDLE_WALK_AFTER s still and not blocked */
export function stepIdle(I, ctx, dt) {
  if (!ctx.still) { I.t = 0; I.used = false; return null }
  I.t += dt
  if (I.used || ctx.blocked || I.t < IDLE_WALK_AFTER) return null
  I.used = true; return 'walk'
}
/** the nearest spot within IDLE_RANGE whose when(ctx) holds (spots: { id, stand: [x, z], face, when? }) */
export function pickSpot(hp, spots, ctx) {
  let best = null, bd = IDLE_RANGE
  for (const s of spots) { const d = Math.hypot(hp.x - s.stand[0], hp.z - s.stand[1]); if (d <= bd && (!s.when || s.when(ctx))) { bd = d; best = s } }
  return best
}
/** what she glances at indoors: ctx { catD, catBusy, day, night, windowD, stoveD } (distances from her, room units) */
export function pickGlance(ctx, rnd = Math.random) {
  if (ctx.catD < 0.9 && ctx.catBusy) return 'cat'
  const opts = []
  if (ctx.day > 0.5 && ctx.windowD < 1.4) opts.push('window')
  if (ctx.night > 0.4 && ctx.stoveD < 1.2) opts.push('stove')
  return opts.length ? opts[Math.floor(rnd() * opts.length) % opts.length] : null
}

// ---------- part C: things she can use ----------
/** her house's saved bits on the save blob s (s.home), with defaults filled in: curtains open, both lamps on */
export function homeState(s) {
  const h = s.home && typeof s.home === 'object' ? s.home : (s.home = {})
  if (typeof h.curtains !== 'boolean') h.curtains = true
  if (!h.lamps || typeof h.lamps !== 'object') h.lamps = {}
  for (const k of ['desk', 'night']) if (typeof h.lamps[k] !== 'boolean') h.lamps[k] = true
  return h
}
export const FLARE_SECS = 180 // a fresh log's flare settles back over about three minutes
/** a 0..1 fire flare, settling linearly to 0 */
export const fireFlare = (level, dt) => Math.max(0, level - dt / FLARE_SECS)
/** the yarn ball's velocity when she tosses it, along her facing (yaw 0 = +z) */
export const tossVel = (yaw, speed = 1.1) => [Math.sin(yaw) * speed, Math.cos(yaw) * speed]
