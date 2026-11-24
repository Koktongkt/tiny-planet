// Her procedural "life" layer (lazy chunk; called from GhibliPerson's frame loop through CHIBI.ext.life, after the base
// walk/idle/activity pose). Everything is additive on top of the base pose, frame-rate independent, allocation-free per
// frame, and scaled down under prefers-reduced-motion. Body: breathing squash, weight shift, idle fidgets, a bouncier walk,
// run lean, start/stop settle, head-led turns, a happier bike ride. Secondary: damped springs on the side buns, top bun and
// front locks (shader offsets, no extra draws). Face drivers (blink, gaze, mood, blush, nod/tilt) are left on L for the face.
import * as THREE from 'three'
import { T } from '../../common.jsx'
import { NPCS, TALK } from '../../talk/state.js'
import { SPR, spring, BLINKER, stepBlink, triggerBlink, GAZE, stepGaze, envelope, approach, clamp } from './lifeCore.js'

export const REDUCED = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
const MOT = REDUCED ? 0.35 : 1
/** hair secondary offsets (head-local units): side bun L, side bun R, top bun, front locks — read by the hair shaders */
export const HAIR_OFF = new Float32Array(12)
export const EXCITED_ACTS = new Set(['wave', 'play', 'reel', 'pick', 'pet', 'photo_wave', 'photo_peace', 'photo_hold_fish', 'photo_twirl', 'photo_kneel'])
const FID = { look: 3.4, stretch: 2.6, rock: 2.8, satchel: 2.0, hum: 3.6, pebble: 2.6, hands: 2.8, tiptoe: 2.4, catch: 3.2, shiver: 1.6 }
// which fidgets she picks from: dry weather, and in the rain (catch the drops, shiver, still the odd look round)
const FIDS = ['look', 'stretch', 'rock', 'satchel', 'hum', 'pebble', 'hands', 'tiptoe'], FIDS_RAIN = ['catch', 'shiver', 'catch', 'look', 'satchel', 'hands']
const bump = (k, n) => Math.max(0, Math.sin(k * Math.PI * n)) // n soft pulses over the fidget
const KE = 0.3 // knee smoothing width
const _p = new THREE.Vector3(), _v = new THREE.Vector3(), _a = new THREE.Vector3(), _q = new THREE.Quaternion(), _t = new THREE.Vector3(), _r = new THREE.Vector3()
const V3S = () => [SPR(), SPR(), SPR()]
const HP = [[3.0, 0.42, 1.0, 0.0045], [3.1, 0.42, 1.0, 0.0045], [4.2, 0.5, 0.7, 0.003], [5.0, 0.55, 0.45, 0.002]] // freq, damping, gain, limit

export function makeLife(rnd = Math.random) {
  return { rnd, m: 0, ph: 0, run: 0, lean: SPR(), turn: 0, idle: 0, fid: null, fu: 0, fidN: 4 + rnd() * 4, fidPrev: '',
    bobY: 0, bobV: 0, headBob: SPR(), lookYaw: SPR(), lookPitch: SPR(), tilt: SPR(), nod: SPR(),
    blink: BLINKER(rnd), open: 1, lid: 0, gaze: GAZE(rnd), gx: 0, gy: 0, scanT: 0, tgt: new THREE.Vector3(), tk: 0, near: 0, camT: 0, camWait: 8 + rnd() * 8,
    mood: 'happy', scf: SPR(), scfZ: SPR(), bagKick: 0, moodT: 0, rideT: 0, blush: 0, squint: 0, yawn: 0, fsq: 0, talk: 0,
    hp: new THREE.Vector3(), hv: new THREE.Vector3(), init: 0, hy: 0, hair: [V3S(), V3S(), V3S(), V3S()] }
}

export function lifeStep(L, B, st, dt, t, R_, camera) {
  if (!(dt > 0)) return
  const m = st.move || 0, act = st.act, aw = act ? st.actW ?? 1 : 0, ride = act === 'ride_bike' && aw > 0.3, busy = !!act && aw > 0.05 && !ride
  // ---- speed / run (phase advances ~7.4/s walking, ~10/s running) ----
  const dph = st.phase - L.ph; L.ph = st.phase; const rate = m > 0.05 ? dph / dt / m : 0
  L.run = approach(L.run, m > 0.3 && !ride && !busy ? clamp((rate - 8.3) / 1.6, 0, 1) : 0, 5, dt)
  const dm = (m - L.m) / dt; L.m = m
  L.idle = m < 0.05 && !busy && !ride ? L.idle + dt : 0
  const idleK = (1 - m) * (busy || ride ? 0 : 1)
  // ---- start / stop: a spring kicked by the change of speed (stop: pitch forward and settle back; start: a small rock back) ----
  spring(L.lean, 0, 1.7, 0.42, dt, -dm * 1.6); const lean = clamp(L.lean.x, -0.18, 0.2) * MOT
  B.root.rotation.x += lean; B.chest.rotation.x += lean * 0.6
  B.hips.scale.y *= 1 - Math.abs(lean) * 0.25; B.hips.scale.x *= 1 + Math.abs(lean) * 0.12
  // ---- breathing squash/stretch + weight shift (idle) ----
  const br = Math.sin(t * 2.05) * MOT, ws = (Math.sin(t * 0.52) + 0.45 * Math.sin(t * 0.21 + 1.3)) * MOT
  B.chest.scale.y *= 1 + 0.014 * br * idleK; B.chest.scale.x *= 1 + 0.006 * br * idleK
  B.hips.scale.y *= 1 + 0.008 * br * idleK; B.hips.scale.x *= 1 - 0.004 * br * idleK; B.hips.scale.z *= 1 - 0.004 * br * idleK
  B.upL.rotation.z -= 0.025 * br * idleK; B.upR.rotation.z += 0.025 * br * idleK; B.head.rotation.x -= 0.012 * br * idleK
  B.hips.position.x += 0.004 * ws * idleK; B.hips.rotation.z += 0.03 * ws * idleK; B.chest.rotation.z -= 0.035 * ws * idleK; B.head.rotation.z += 0.02 * ws * idleK
  // ---- idle fidgets: look around, stretch, rock on the heels, fix the satchel ----
  let fidLookX = 0
  if (L.fid && (m > 0.2 || busy || ride)) L.fid = null
  const rainy = (T.rain || 0) > 0.3
  if (!L.fid && L.idle > 2.5) { L.fidN -= dt; if (L.fidN <= 0) { const set = (typeof window !== 'undefined' && window.__herFids) || (rainy ? FIDS_RAIN : FIDS); let f = set[Math.floor(L.rnd() * set.length)]; if (f === L.fidPrev) f = set[(set.indexOf(f) + 1) % set.length]; L.fid = f; L.fidPrev = f; L.fu = 0; L.fidN = 5 + L.rnd() * 6 } }
  L.yawn = 0; L.bagKick = 0; L.fsq = 0; let fidLookY = 0
  if (L.fid) {
    const d = FID[L.fid], u0 = L.fu; L.fu += dt; const u = L.fu, e = envelope(u, d, 0.45) * idleK * MOT, k = u / d
    if (L.fid === 'look') { const y = Math.sin(k * Math.PI * 2) * 0.6 * e; B.head.rotation.y += y; B.chest.rotation.y += y * 0.25; fidLookX = Math.sign(Math.cos(k * Math.PI * 2 - Math.PI / 2)) * 0.9 * e
      if (u0 < d * 0.5 && u >= d * 0.5) triggerBlink(L.blink) }
    else if (L.fid === 'stretch') { // a gentle reach: arms forward and a little out (clear of the side buns), small lean back, head barely pitched (the face stays put on the head)
      B.upL.rotation.x -= 1.55 * e; B.upR.rotation.x -= 1.55 * e; B.upL.rotation.z -= 0.55 * e; B.upR.rotation.z += 0.55 * e; B.foL.rotation.x -= 0.15 * e; B.foR.rotation.x -= 0.15 * e
      B.chest.rotation.x -= 0.05 * e; B.head.rotation.x -= 0.08 * e; B.root.position.y += 0.005 * e; B.ftL.rotation.x += 0.25 * e; B.ftR.rotation.x += 0.25 * e; L.yawn = e }
    else if (L.fid === 'rock') { const r = Math.sin(k * Math.PI * 2 * 2) * 0.07 * e; B.hips.rotation.x += r; B.chest.rotation.x += r * 0.5; B.thL.rotation.x -= r; B.thR.rotation.x -= r
      B.upL.rotation.x += 0.35 * e; B.upR.rotation.x += 0.35 * e; B.upL.rotation.z += 0.1 * e; B.upR.rotation.z -= 0.1 * e; B.foL.rotation.x -= 0.5 * e; B.foR.rotation.x -= 0.5 * e; B.head.rotation.z += 0.06 * e }
    else if (L.fid === 'satchel') { B.upR.rotation.x -= 0.95 * e; B.upR.rotation.z -= 0.05 * e; B.foR.rotation.x -= 1.45 * e; B.chest.rotation.y += 0.12 * e; B.head.rotation.x += 0.18 * e
      L.bagKick = Math.sin(u * 10) * 0.22 * e * (1 - k) }
    else if (L.fid === 'hum') { // humming a little tune: head and body sway in time, hands clasped behind, eyes happily narrowed
      const sw = Math.sin(k * Math.PI * 4) * e; B.head.rotation.z += 0.14 * sw; B.chest.rotation.z -= 0.04 * sw; B.hips.rotation.z += 0.025 * sw; B.root.position.y += 0.002 * Math.abs(sw)
      B.upL.rotation.x += 0.55 * e; B.upR.rotation.x += 0.55 * e; B.upL.rotation.z += 0.18 * e; B.upR.rotation.z -= 0.18 * e; B.foL.rotation.x -= 0.25 * e; B.foR.rotation.x -= 0.25 * e; L.fsq = 0.55 * e }
    else if (L.fid === 'pebble') { // eyes down, a couple of little kicks at a pebble with the right foot
      const kk = bump(Math.min(1, k * 1.25), 2) * e; B.head.rotation.x += 0.2 * e; fidLookY = -0.9 * e
      B.thR.rotation.x -= 0.9 * kk; B.shRn.rotation.x += 0.5 * kk; B.ftR.rotation.x -= 0.3 * kk; B.chest.rotation.x += 0.03 * e; B.upL.rotation.z -= 0.12 * kk; B.upR.rotation.z += 0.12 * kk }
    else if (L.fid === 'hands') { // looks at her hands (mittens up in front, a little turn of the wrists)
      B.upL.rotation.x -= 0.85 * e; B.upR.rotation.x -= 0.85 * e; B.foL.rotation.x -= 0.9 * e; B.foR.rotation.x -= 0.9 * e; B.upL.rotation.z += 0.42 * e; B.upR.rotation.z -= 0.42 * e
      const tw = Math.sin(k * Math.PI * 3) * 0.25 * e; B.foL.rotation.y += tw; B.foR.rotation.y -= tw; B.head.rotation.x += 0.2 * e; fidLookY = -1 * e }
    else if (L.fid === 'tiptoe') { // bounces up onto her toes twice, arms out a little: pleased with herself
      const up = bump(k, 2) * e; B.root.position.y += 0.012 * up; B.ftL.rotation.x += 0.7 * up; B.ftR.rotation.x += 0.7 * up; B.shLn.rotation.x -= 0.15 * up; B.shRn.rotation.x -= 0.15 * up
      B.upL.rotation.z -= 0.3 * up; B.upR.rotation.z += 0.3 * up; B.head.rotation.x -= 0.05 * up; L.fsq = 0.3 * up }
    else if (L.fid === 'catch') { // rain: holds her hand out, palm up, and looks up at the sky
      B.upR.rotation.x -= 1.2 * e; B.upR.rotation.z -= 0.1 * e; B.foR.rotation.x -= 0.35 * e; B.foR.rotation.y += 0.6 * e; B.head.rotation.x -= 0.12 * e; fidLookY = 0.9 * e
      B.chest.rotation.y -= 0.08 * e }
    else if (L.fid === 'shiver') { // rain: a quick shiver, shoulders up, arms in
      const sh = Math.sin(u * 46) * e * (1 - k * 0.6); B.chest.rotation.z += 0.03 * sh; B.head.rotation.z -= 0.025 * sh; B.hips.position.x += 0.0012 * sh
      B.upL.rotation.z += 0.25 * e; B.upR.rotation.z -= 0.25 * e; B.foL.rotation.x -= 0.5 * e; B.foR.rotation.x -= 0.5 * e; B.chest.rotation.x += 0.05 * e; L.fsq = 0.45 * e }
    if (u >= d) L.fid = null
  }
  // ---- walk / run: deeper bounce and forward lean when running, bigger arm swing, head overlap on the bob ----
  if (m > 0.01 && !ride && !busy) {
    const run = L.run * m * MOT, s = Math.sin(st.phase)
    B.root.rotation.x += 0.13 * run; B.chest.rotation.x += 0.05 * run; B.root.position.y += 0.005 * run * (1 - s * s)
    // knees: the base uses max(0, cos) for the knee (a kink where the leg straightens: the visible "pop", worse with the bigger bounce).
    // Replace the kink with a smooth rectifier so the knee never snaps or locks straight (never mind the villagers: only her rig runs this).
    const c = Math.cos(st.phase), mm = m * MOT
    for (let k = 0; k < 2; k++) { const sg = k ? 1 : -1, x = sg * c, raw = x > 0 ? x : 0, sm = 0.5 * (x + Math.sqrt(x * x + KE * KE)), xf = -x, rf = xf > 0 ? xf : 0, sf = 0.5 * (xf + Math.sqrt(xf * xf + KE * KE))
      const dk = 0.8 * mm * (sm - raw), sn = k ? B.shRn : B.shLn, ft = k ? B.ftR : B.ftL; sn.rotation.x += dk; ft.rotation.x += -dk * 0.75 + 0.25 * mm * (sf - rf) }
    if (rainy) { const h = m * MOT; B.chest.rotation.x += 0.05 * h; B.head.rotation.x += 0.04 * h; B.upL.rotation.z += 0.06 * h; B.upR.rotation.z -= 0.06 * h } // rain: shoulders a little hunched
    B.upL.rotation.x *= 1 + 0.55 * L.run; B.upR.rotation.x *= 1 + 0.55 * L.run; B.foL.rotation.x -= 0.35 * run; B.foR.rotation.x -= 0.35 * run
  }
  const by = B.root.position.y, bv = (by - L.bobY) / dt, ba = (bv - L.bobV) / dt; L.bobY = by; L.bobV = bv
  B.head.rotation.x += clamp(spring(L.headBob, 0, 3.2, 0.5, dt, ba * 0.9), -0.08, 0.08) * MOT
  // ---- turns lead with the head (and the eyes, below); a quick turn makes her blink ----
  const tu0 = L.turn; L.turn = approach(L.turn, st.turn || 0, 8, dt)
  // (the shared base rig turns the head ~0.22*turn *against* the turn; cancel that and lead into it instead, plus a small lean)
  B.head.rotation.y += (L.turn * 0.22 + clamp(L.turn * 0.2, -0.4, 0.4) * MOT) * (ride ? 0.6 : 1)
  if (!ride && !busy) { const tl = clamp(-L.turn * 0.07 * m * (1 + 0.6 * L.run), -0.14, 0.14) * MOT; B.hips.rotation.z += tl; B.chest.rotation.z += tl * 0.5 } // lean into turns, more when running
  if (Math.abs(L.turn) > 1.1 && Math.abs(tu0) <= 1.1) triggerBlink(L.blink)
  // ---- bike: lean into turns, a happy wobble and a little bop ----
  if (ride) { const lt = clamp(-L.turn * 0.12, -0.2, 0.2) * MOT; B.hips.rotation.z += lt; B.chest.rotation.z += lt * 0.5 + 0.025 * Math.sin(t * 2.1) * MOT
    B.head.rotation.z += 0.045 * Math.sin(t * 1.3) * MOT - lt * 0.6; B.head.rotation.x += 0.02 * Math.sin(st.phase * 2) * MOT }
  // ---- look-at: villagers / Pip nearby, sometimes the camera when idle (scan ~3x a second, no allocation) ----
  const head = B.head; head.getWorldPosition(_p)
  L.scanT -= dt
  if (L.scanT <= 0) { L.scanT = 0.33; let best = 0, bd = 1e9
    B.root.getWorldPosition(_r); const hh = Math.max(0.02, _p.distanceTo(_r)), far = hh * 7
    for (let i = 0; i < NPCS.length; i++) { const o = NPCS[i].obj; if (!o) continue; o.getWorldPosition(_t); const d = _t.distanceTo(_p); if (d < far && d < bd) { bd = d; best = 1; L.tgt.copy(_t).add(_v.copy(_p).sub(_r).multiplyScalar(0.8)) } }
    const dog = typeof window !== 'undefined' && window.__dog; if (dog && dog.n && _r.lengthSq() > 0) { _t.copy(dog.n).multiplyScalar(_r.length()); const d = _t.distanceTo(_p); if (d < far * 0.8 && d < bd) { bd = d; best = 2; L.tgt.copy(_t) } }
    L.near = best ? clamp(1 - bd / (hh * 4.5), 0, 1) : 0
    if (!best && L.idle > 6) { L.camWait -= 0.33; if (L.camWait <= 0) { L.camT = 2.2 + L.rnd() * 1.5; L.camWait = 9 + L.rnd() * 10 } }
    L.tk = best || (L.camT > 0 ? 3 : 0) }
  if (L.camT > 0) L.camT -= dt
  if (L.tk === 3 && camera) L.tgt.copy(camera.position)
  let yaw = 0, pitch = 0
  if (L.tk && !busy && !L.fid && (m < 0.6 || L.tk !== 3)) {
    _v.copy(L.tgt); head.parent.worldToLocal(_v); _v.sub(head.position)
    yaw = clamp(Math.atan2(_v.x, _v.z), -1.1, 1.1); pitch = clamp(-Math.atan2(_v.y, Math.hypot(_v.x, _v.z)), -0.3, 0.3); if (Math.abs(Math.atan2(_v.x, _v.z)) > 1.9 || _v.lengthSq() < 9e-4) yaw = pitch = 0 // behind her / on top of her: ignore
  }
  const hy = spring(L.lookYaw, yaw * 0.55, 2.2, 0.75, dt), hp = spring(L.lookPitch, pitch * 0.5, 2.2, 0.75, dt)
  B.head.rotation.y += hy * MOT; B.head.rotation.x += hp * MOT
  if (Math.abs(hy - L.hy) > 0.012 * 60 * dt && Math.abs(yaw) > 0.4 && L.rnd() < dt * 3) triggerBlink(L.blink); L.hy = hy
  // ---- mood: sleepy at night / long idle, excited on pickups and waves, focused on the bike (with smiles), happy near friends ----
  const sleepy = act === 'nap' || (T.night > 0.7 && L.idle > 4) || L.idle > 25
  if (ride) L.rideT += dt; else L.rideT = 0
  const W_ = typeof window !== 'undefined' ? window : null // debug hooks for the studio captures: __herMood, __herNear
  const mood = W_ && W_.__herMood ? W_.__herMood : sleepy ? 'sleepy' : busy && EXCITED_ACTS.has(act) && aw > 0.3 ? 'excited' : ride ? (L.rideT % 7 < 4.6 ? 'focus' : 'happy') : 'happy'
  if (mood !== L.mood) { L.mood = mood; L.moodT = 0 } else L.moodT += dt
  L.talk = approach(L.talk, TALK.open ? 1 : 0, 4, dt)
  const friendly = W_ && W_.__herNear != null ? W_.__herNear : Math.max(L.near * (L.tk === 1 || L.tk === 2 ? 1 : 0), L.talk)
  L.blush = approach(L.blush, mood === 'excited' ? 1 : friendly, 2.5, dt); L.squint = approach(L.squint, mood === 'excited' ? 0.15 : friendly * 0.28 + L.yawn * 0.5 + L.fsq, 4, dt)
  // head: tilt with emotion, nod while listening, droop when sleepy
  B.head.rotation.z += spring(L.tilt, (mood === 'excited' ? 0.09 * Math.sin(t * 3.2) : 0) + friendly * 0.07 * Math.sin(t * 0.9 + 0.6), 2, 0.6, dt) * MOT
  B.head.rotation.x += spring(L.nod, L.talk * 0.06 * Math.max(0, Math.sin(t * 2.4)) + (mood === 'sleepy' ? 0.06 : 0), 2.5, 0.6, dt) * MOT
  // ---- eyes: blinks, gaze (look target remainder + turn lead + fidget look + saccades) ----
  L.open = stepBlink(L.blink, dt)
  const ey = clamp((yaw - hy) / 0.55 + L.turn * 0.25 + fidLookX, -1, 1), ex = clamp((pitch - hp) / -0.4 + fidLookY, -1, 1)
  stepGaze(L.gaze, ey, ex, dt, REDUCED ? 0.4 : mood === 'focus' ? 0.4 : 1); L.gx = L.gaze.x; L.gy = L.gaze.y
  // ---- secondary motion: head acceleration (in the head frame) drives damped springs on buns, top bun and front locks ----
  if (!L.init) { L.hp.copy(_p); L.hv.set(0, 0, 0); L.init = 1 }
  _v.copy(_p).sub(L.hp).divideScalar(dt); _a.copy(_v).sub(L.hv).divideScalar(dt); L.hp.copy(_p); L.hv.copy(_v)
  head.getWorldQuaternion(_q).invert(); _a.applyQuaternion(_q); head.getWorldScale(_t); _a.divideScalar(Math.max(_t.x, 1e-4))
  const yawV = (head.rotation.y - (L.hry ?? head.rotation.y)) / dt; L.hry = head.rotation.y
  for (let i = 0; i < 4; i++) { const [f, z, g, lim] = HP[i], S3 = L.hair[i], sx = i === 0 ? -1 : i === 1 ? 1 : 0
    const k = 0.00022 * g * MOT
    // the side buns sit on the shoulder line: they may swing out and up, never down or in toward the shoulder/arm (no clipping on the down-bounce)
    HAIR_OFF[i * 3] = clamp(spring(S3[0], 0, f, z, dt, -clamp(_a.x, -40, 40) * k * 40 - yawV * 0.0025 * g * MOT * 40 * (i === 2 ? 0.5 : 1)), i === 0 ? -lim : i === 1 ? -0.0004 : -lim, i === 0 ? 0.0004 : lim)
    HAIR_OFF[i * 3 + 1] = clamp(spring(S3[1], 0, f, z, dt, -clamp(_a.y, -40, 40) * k * 40), i < 2 ? 0 : -lim, lim)
    HAIR_OFF[i * 3 + 2] = clamp(spring(S3[2], 0, f, z, dt, -clamp(_a.z, -40, 40) * k * 40 + sx * yawV * 0.001 * MOT * 40), -lim, lim)
  }
}

/** after the base scarf/bag springs: the tails and the satchel overshoot on starts/stops and turns, and flutter a little */
export function lifePost(L, R_, st, dt, t) {
  if (!L || !L.scf || !(dt > 0)) return
  const lean = L.lean.x, fl = Math.sin(t * 1.7) * 0.04 + Math.sin(t * 4.3) * 0.015 * (st.move || 0)
  if (R_.scarf) { R_.scarf.rotation.x += spring(L.scf, -lean * 2.2, 2.6, 0.45, dt) * MOT + fl * MOT; R_.scarf.rotation.z += spring(L.scfZ, L.turn * 0.04, 2.2, 0.5, dt) * MOT }
  // the tails may hang straight at rest but swing out from the chest (never into it / the bib) once she moves, even on a hard down-bounce
  if (R_.scarf) { const mx = -0.5 * Math.min(1, st.move || 0); if (R_.scarf.rotation.x > mx) R_.scarf.rotation.x = mx
    R_.scarf.rotation.z = clamp(R_.scarf.rotation.z, -0.3, 0.3) } // the base swings the tails ~0.8 rad sideways in a turn: across the chest into the shoulder; keep them near the centre line
  if (R_.bag) { R_.bag.rotation.x += lean * 1.4 * MOT; R_.bag.rotation.z += L.bagKick }
}
