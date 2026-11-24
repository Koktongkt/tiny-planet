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
const MOT0 = REDUCED ? 0.35 : 1
/** hair secondary offsets (head-local units): side bun L, side bun R, top bun, front locks — read by the hair shaders */
export const HAIR_OFF = new Float32Array(12)
export const EXCITED_ACTS = new Set(['wave', 'play', 'reel', 'pick', 'pet', 'photo_wave', 'photo_peace', 'photo_hold_fish', 'photo_twirl', 'photo_kneel'])
import { HER_MOTION, between } from './motion.js'
// per-character behaviour (fidget lists, timings, rarity, switches, thresholds) comes from the motion profile: L.P
const ENERGY_LOW_DEFAULT = 25, SKID_D = 1.3 // skid length (s)
// indoors (her house): the fidget lists come from the profile (sets.indoor, sets.stove)
const WIN_ = typeof window !== 'undefined' ? window : null, indoors = () => !!(WIN_ && WIN_.__home && WIN_.__home.inside)
const energyNow = () => { const w = typeof window !== 'undefined' ? window : null; if (!w) return 100; const v = w.__herEnergy ?? w.__game?.G?.s?.energy; return Number.isFinite(v) ? v : 100 }
const sst = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t) }
const bump = (k, n) => Math.max(0, Math.sin(k * Math.PI * n)) // n soft pulses over the fidget
const KE = 0.3 // knee smoothing width
const _p = new THREE.Vector3(), _v = new THREE.Vector3(), _a = new THREE.Vector3(), _q = new THREE.Quaternion(), _t = new THREE.Vector3(), _r = new THREE.Vector3()
const V3S = () => [SPR(), SPR(), SPR()]
const HP = [[3.0, 0.42, 1.0, 0.0045], [3.1, 0.42, 1.0, 0.0045], [4.2, 0.5, 0.7, 0.003], [5.0, 0.55, 0.45, 0.002]] // freq, damping, gain, limit

export function makeLife(rnd = Math.random, P = HER_MOTION) {
  return { P, rnd, m: 0, ph: 0, run: 0, lean: SPR(), turn: 0, idle: 0, fid: null, fu: 0, fidN: P.fidgetAfter + 1.5 + rnd() * 4, fidPrev: '',
    bobY: 0, bobV: 0, headBob: SPR(), lookYaw: SPR(), lookPitch: SPR(), tilt: SPR(), nod: SPR(),
    blink: BLINKER(rnd), open: 1, lid: 0, gaze: GAZE(rnd), gx: 0, gy: 0, scanT: 0, tgt: new THREE.Vector3(), tk: 0, near: 0, camT: 0, camWait: 8 + rnd() * 8,
    mood: 'happy', scf: SPR(), scfZ: SPR(), bagKick: 0, moodT: 0, rideT: 0, blush: 0, squint: 0, yawn: 0, fsq: 0, talk: 0, sit: 0, tired: 0, hungry: 0, en: -1, yumU: 9, sighN: 6, sighU: 9, lie: 0, lieRoll: -1, walkT: 0, skipN: 10, skip: 0, skipU: 9, skidU: 9, skid: 0, runT: 0, skidSd: 1, runMax: 0, waveU: 9, waveCD: 6, bf: null, bfK: 0, dodgeU: 9, dodgeSd: 1, shut: 0,
    hp: new THREE.Vector3(), hv: new THREE.Vector3(), init: 0, hy: 0, hair: [V3S(), V3S(), V3S(), V3S()] }
}

export function lifeStep(L, B, st, dt, t, R_, camera) {
  if (!(dt > 0)) return
  const P = L.P, MOT = MOT0 * (P.lively ?? 1), FID = P.fidgets
  const m = st.move || 0, act = st.act, aw = act ? st.actW ?? 1 : 0, ride = act === 'ride_bike' && aw > 0.3
  // restActs: game-driven idle poses (bench sit, ruins look) that should still get fidgets. Her has no restActs, so her busy test is unchanged.
  const rest = !!(P.restActs && act && P.restActs.includes(act))
  const busy = (!!act && aw > 0.05 && !ride && !rest) || !!st.fishing
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
  // ---- energy: tired below ~35 (stronger toward 0), hungry at or below LOW; a jump up means she just ate ----
  const en = energyNow(); if (L.en >= 0 && en - L.en >= 8) L.yumU = 0; L.en = en
  L.tired = approach(L.tired, clamp((P.tiredBelow - en) / (P.tiredBelow - 5), 0, 1), 1.5, dt); L.hungry = en <= (P.hungryAt ?? ENERGY_LOW_DEFAULT) ? 1 : 0
  if (!L.fid && L.idle > P.fidgetAfter && L.lie < 0.2) { L.fidN -= dt; if (L.fidN <= 0) { const inn = indoors(), seated = L.sit > 0.5 || rest, set = (WIN_ && WIN_.__herFids) || (seated ? P.sets.seated : L.hungry ? P.sets.hungry : rainy && !inn ? P.sets.rain : T.night > 0.6 ? P.sets.night : inn ? (WIN_.__herNearStove ? P.sets.stove : P.sets.indoor) : P.sets.day); let f = set[Math.floor(L.rnd() * set.length)]; if (f === L.fidPrev) f = set[(set.indexOf(f) + 1) % set.length]; L.fid = f; L.fidPrev = f; L.fu = 0; L.fidN = between(L.rnd, P.fidgetEvery) } }
  L.yawn = 0; L.bagKick = 0; L.fsq = 0; L.shut = 0; let fidLookY = 0
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
    else if (L.fid === 'yawn') { // night (KT): a big yawn with both arms stretched up in a V (out and a little forward, clear of the hair), eyes shut, mouth open
      const y = bump(Math.min(1, k * 1.15), 1) * e, a = sst(0, 0.35, k) * e
      B.upL.rotation.z -= P.yawnUp * a; B.upR.rotation.z += P.yawnUp * a; B.upL.rotation.x -= 0.5 * a; B.upR.rotation.x -= 0.5 * a; B.foL.rotation.z -= 0.6 * a; B.foR.rotation.z += 0.6 * a
      B.head.rotation.x -= 0.1 * y; B.chest.rotation.x -= 0.06 * y; B.root.position.y += 0.004 * y; B.ftL.rotation.x += 0.15 * y; B.ftR.rotation.x += 0.15 * y; L.shut = y; L.yawn = y }
    else if (L.fid === 'tummy') { // hungry: both hands on her tummy, a slow little rub, head down
      const rub = Math.sin(k * Math.PI * 4) * e; B.upL.rotation.x -= 0.55 * e; B.upR.rotation.x -= 0.55 * e; B.upL.rotation.z += 0.32 * e; B.upR.rotation.z -= 0.32 * e
      B.foL.rotation.x -= 0.85 * e; B.foR.rotation.x -= 0.85 * e; B.foL.rotation.y += 0.25 * rub; B.foR.rotation.y += 0.25 * rub; B.head.rotation.x += 0.14 * e; B.chest.rotation.x += 0.04 * e; fidLookY = -0.6 * e }
    else if (L.fid === 'growl') { // hungry: a tummy rumble, a little jolt, hugging her middle, embarrassed
      const j = Math.exp(-u * 9) * Math.sin(u * 40) * MOT, h = e; B.root.position.y += 0.003 * j; B.chest.rotation.x += 0.08 * h + 0.03 * j
      B.upL.rotation.x -= 0.5 * h; B.upR.rotation.x -= 0.5 * h; B.upL.rotation.z += 0.36 * h; B.upR.rotation.z -= 0.36 * h; B.foL.rotation.x -= 0.95 * h; B.foR.rotation.x -= 0.95 * h
      B.head.rotation.x += 0.1 * h; fidLookY = -0.7 * h; if (u0 === 0) triggerBlink(L.blink); L.blush = Math.max(L.blush, 0.9 * h) }
    else if (L.fid === 'peek') { // hungry: reaches into the satchel for a snack, finds nothing, little sigh
      const a = sst(0, 0.3, k) * (1 - sst(0.7, 1, k)), sg = sst(0.68, 0.9, k) * (1 - sst(0.9, 1, k))
      B.upR.rotation.x -= 0.85 * a; B.foR.rotation.x -= 1.2 * a; B.chest.rotation.y += 0.18 * a; B.head.rotation.x += 0.22 * a; B.head.rotation.y += 0.25 * a; fidLookY = -0.9 * a
      L.bagKick = Math.sin(u * 9) * 0.15 * a; B.chest.scale.y *= 1 + 0.03 * sg; B.head.rotation.x += 0.1 * sg }
    else if (L.fid === 'tea') { // both hands around a cup, a slow sip in the middle
      const sip = bump(Math.min(1, Math.max(0, (k - 0.35) / 0.45)), 1) * e
      B.upL.rotation.x -= 0.7 * e; B.upR.rotation.x -= 0.7 * e; B.foL.rotation.x -= 0.85 * e; B.foR.rotation.x -= 0.85 * e
      B.upL.rotation.z += 0.38 * e; B.upR.rotation.z -= 0.38 * e; B.head.rotation.x += 0.16 * sip; fidLookY = -0.3 * e; L.shut = Math.max(L.shut, 0.35 * sip) }
    else if (L.fid === 'glasses') { // one hand up to the temple, a little tilt, a blink as the frames settle
      const g = bump(k, 1) * e
      B.upR.rotation.x -= 1.15 * g; B.foR.rotation.x -= 1.25 * g; B.upR.rotation.z -= 0.15 * g; B.foR.rotation.z -= 0.08 * g
      B.chest.rotation.y -= 0.06 * g; B.head.rotation.x += 0.08 * g; B.head.rotation.z += 0.04 * g
      if (u0 < d * 0.45 && u >= d * 0.45) triggerBlink(L.blink) }
    else if (L.fid === 'notebook') { // book up in the left, pencil over the page, head down, a little scribble
      const scr = Math.sin(k * Math.PI * 6) * e * Math.max(0, 1 - Math.abs(k - 0.55) * 2.2)
      B.upL.rotation.x -= 0.85 * e; B.foL.rotation.x -= 1.15 * e; B.upL.rotation.z += 0.22 * e
      B.upR.rotation.x -= 0.95 * e; B.foR.rotation.x -= 1.2 * e; B.upR.rotation.z -= 0.12 * e; B.foR.rotation.y += 0.15 + 0.2 * scr
      B.head.rotation.x += 0.22 * e; B.chest.rotation.x += 0.05 * e; fidLookY = -0.85 * e }
    if (u >= d) L.fid = null
  }
  // ---- sit down on the grass after a long idle (stands back up quickly once she moves) ----
  const inside = indoors(), sitWant = P.can.sit && L.idle > P.sitAfter && (inside ? !!WIN_.__herOnRug : !rainy) && !busy && !ride && !(WIN_ && WIN_.__herNoSit) // indoors: only on the big round rug
  L.sit = approach(L.sit, sitWant ? 1 : 0, sitWant ? 1.3 : 6, dt)
  if (L.sit > 0.001) { const k = L.sit * L.sit * (3 - 2 * L.sit), z = k
    B.root.position.y -= 0.088 * z; B.root.rotation.x -= 0.06 * z; B.chest.rotation.x += 0.1 * z
    for (const [th, sn, ft, sd] of [[B.thL, B.shLn, B.ftL, -1], [B.thR, B.shRn, B.ftR, 1]]) { th.rotation.x += (-1.45 - th.rotation.x) * z; th.rotation.z += (sd * 0.12 - th.rotation.z) * z; sn.rotation.x += (0.25 - sn.rotation.x) * z; ft.rotation.x += (-0.35 - ft.rotation.x) * z }
    B.upL.rotation.x += 0.35 * z; B.upR.rotation.x += 0.35 * z; B.upL.rotation.z -= 0.35 * z; B.upR.rotation.z += 0.35 * z; B.foL.rotation.x -= 0.15 * z; B.foR.rotation.x -= 0.15 * z }
  // ---- now and then, after sitting a while, she lies back on the grass and watches the sky ----
  if (L.idle < 1) L.lieRoll = -1
  if (L.sit > 0.95 && L.lieRoll < 0) L.lieRoll = P.can.lie && L.rnd() < P.lieChance ? 1 : 0
  const dry = (T.rain || 0) < 0.05 && (T.wet || 0) < 0.3
  const lieWant = sitWant && dry && !inside && ((L.lieRoll === 1 && L.idle > P.lieAfter) || (typeof window !== 'undefined' && window.__herLie))
  L.lie = approach(L.lie, lieWant ? 1 : 0, lieWant ? 0.7 : 5, dt)
  if (L.lie > 0.001) { const z = L.lie * L.lie * (3 - 2 * L.lie)
    B.hips.rotation.x -= 1.32 * z; B.thL.rotation.x += 1.32 * z; B.thR.rotation.x += 1.32 * z; B.root.position.y += P.lieLift * z; B.chest.rotation.x -= 0.1 * z
    B.upL.rotation.z -= 0.55 * z; B.upR.rotation.z += 0.55 * z; B.upL.rotation.x -= 0.2 * z; B.upR.rotation.x -= 0.2 * z
    B.head.rotation.y += 0.18 * Math.sin(t * 0.23) * z * MOT; B.head.rotation.z += 0.06 * Math.sin(t * 0.31 + 1) * z * MOT; L.fsq = Math.max(L.fsq, 0.18 * z) } // watching the clouds drift
  // ---- a happy skip now and then on a long walk (fine weather, daytime) ----
  const walking = m > 0.5 && L.run < 0.3 && !busy && !ride
  L.walkT = walking ? L.walkT + dt : 0
  if (P.can.skip && walking && !rainy && T.night < 0.5 && L.mood === 'happy') { L.skipN -= dt; if (L.skipN <= 0) { L.skipU = 0; L.skipN = between(L.rnd, P.skipEvery) } }
  if (!walking) L.skipU = 9
  L.skipU += dt; const ske = envelope(L.skipU, 2.2, 0.35) * MOT; L.skip = ske
  if (ske > 0) { const hop = Math.max(0, Math.sin(st.phase * 2)); B.root.position.y += 0.014 * ske * hop * hop; B.upL.rotation.x *= 1 + 0.7 * ske; B.upR.rotation.x *= 1 + 0.7 * ske
    B.upL.rotation.z -= 0.2 * ske; B.upR.rotation.z += 0.2 * ske; B.head.rotation.z += 0.05 * ske * Math.sin(st.phase); B.ftL.rotation.x += 0.2 * ske * hop; B.ftR.rotation.x += 0.2 * ske * hop }
  // ---- skid (KT): only after running at least skidAfterRun s; each hard stop after that rolls skidChance (no cooldown).
  // 1 slide: plants her heels and leans way back, front foot out, back foot dragging, arms flung up, dust at her heels
  // 2 teeter: tips forward onto her toes, arms windmilling  3 catch: upright with a little bounce
  L.runT = m > 0.7 && L.run > 0.6 ? (L.runT || 0) + dt : Math.max(0, (L.runT || 0) - dt * 3)
  if (P.can.skid && dm < -2.2 && L.runT > P.skidAfterRun && L.skidU > SKID_D) { L.runT = 0; if (L.rnd() < P.skidChance) { L.skidU = 0; L.skidSd = L.rnd() < 0.5 ? -1 : 1 } }
  if (L.skidU < SKID_D && L.skidU > 0.15 && dm > 1.5) L.skidU = SKID_D // she set off again (speed rising): drop it
  L.skidU += dt; const su = L.skidU, on = su < SKID_D ? sst(0, 0.06, su) * (1 - sst(SKID_D - 0.2, SKID_D, su)) * MOT : 0
  L.skid = on; L.dust = su < 0.42 && on > 0.3 ? 1 : 0
  if (on <= 0 && L.rootZ !== 0) { B.root.position.z = 0; L.rootZ = 0 } else if (on > 0) L.rootZ = 1
  if (on > 0) { const sd = L.skidSd || 1, M = on
    const slide = sst(0, 0.08, su) * (1 - sst(0.36, 0.52, su)), teeter = sst(0.4, 0.55, su) * (1 - sst(0.85, 1.02, su))
    const bounce = Math.max(0, Math.sin(Math.min(1, Math.max(0, (su - 0.95) / 0.3)) * Math.PI))
    const lean = -0.42 * slide + 0.32 * teeter + 0.04 * Math.sin(su * 22) * teeter // back on the heels, then forward on the toes (with a wobble)
    B.root.rotation.x += lean * M; B.chest.rotation.x += lean * 0.35 * M; B.head.rotation.x -= lean * 0.45 * M
    B.root.position.z = 0.03 * Math.exp(-su * 4) * sst(0, 0.05, su) * M // momentum carries her forward (set, not added: the base rig never resets root z)
    B.root.position.y += (-0.012 * slide + 0.007 * bounce) * M
    B.hips.rotation.z += 0.07 * sd * Math.sin(su * 13) * teeter * M; B.chest.rotation.z -= 0.08 * sd * Math.sin(su * 13) * teeter * M
    // legs: slide = front heel out, toes up, back leg dragging; teeter = up on her toes
    B.thL.rotation.x -= 0.85 * slide * M; B.shLn.rotation.x -= 0.15 * slide * M; B.ftL.rotation.x -= 0.6 * slide * M
    B.thR.rotation.x += 0.35 * slide * M; B.shRn.rotation.x += 0.9 * slide * M; B.ftR.rotation.x += 0.35 * slide * M
    B.ftL.rotation.x += 0.55 * teeter * M; B.ftR.rotation.x += 0.55 * teeter * M; B.shLn.rotation.x -= 0.12 * teeter * M; B.shRn.rotation.x -= 0.12 * teeter * M
    // arms: flung up and back in the slide, windmilling in the teeter, down for the catch; right hand wipes her brow
    const wl = su * 17, armUp = slide + teeter
    B.upL.rotation.z -= (0.95 * slide + (0.9 + 0.35 * Math.cos(wl)) * teeter) * M; B.upR.rotation.z += (0.95 * slide + (0.9 + 0.35 * Math.cos(wl + Math.PI)) * teeter) * M
    B.upL.rotation.x += (0.45 * slide - 0.9 * Math.sin(wl) * teeter) * M; B.upR.rotation.x += (0.45 * slide - 0.9 * Math.sin(wl + Math.PI) * teeter) * M
    B.foL.rotation.x -= 0.3 * armUp * M; B.foR.rotation.x -= 0.3 * armUp * M
    L.skidFace = su < 1.0 ? 'excited' : 'happy' }
  // ---- walk / run: deeper bounce and forward lean when running, bigger arm swing, head overlap on the bob ----
  if (m > 0.01 && !ride && !busy) {
    const run = L.run * m * MOT, s = Math.sin(st.phase)
    B.root.rotation.x += 0.13 * run; B.chest.rotation.x += 0.05 * run; B.root.position.y += 0.005 * run * (1 - s * s)
    // knees: the base uses max(0, cos) for the knee (a kink where the leg straightens: the visible "pop", worse with the bigger bounce).
    // Replace the kink with a smooth rectifier so the knee never snaps or locks straight (never mind the villagers: only her rig runs this).
    const c = Math.cos(st.phase), mm = m * MOT
    for (let k = 0; k < 2; k++) { const sg = k ? 1 : -1, x = sg * c, raw = x > 0 ? x : 0, sm = 0.5 * (x + Math.sqrt(x * x + KE * KE)), xf = -x, rf = xf > 0 ? xf : 0, sf = 0.5 * (xf + Math.sqrt(xf * xf + KE * KE))
      const dk = 0.8 * mm * (sm - raw), sn = k ? B.shRn : B.shLn, ft = k ? B.ftR : B.ftL; sn.rotation.x += dk; ft.rotation.x += -dk * 0.75 + 0.25 * mm * (sf - rf) }
    if (L.tired > 0.01) { const k = L.tired * m * MOT // tired: slouched, head down, heavy arms, feet barely lifted, a flatter bob
      B.chest.rotation.x += 0.17 * k; B.head.rotation.x += 0.13 * k; B.root.rotation.x += 0.03 * k; B.root.position.y -= 0.5 * k * Math.max(0, B.root.position.y)
      B.upL.rotation.x *= 1 - 0.6 * k; B.upR.rotation.x *= 1 - 0.6 * k; B.upL.rotation.z += 0.08 * k; B.upR.rotation.z -= 0.08 * k
      B.shLn.rotation.x *= 1 - 0.4 * k; B.shRn.rotation.x *= 1 - 0.4 * k; B.thL.rotation.x *= 1 - 0.2 * k; B.thR.rotation.x *= 1 - 0.2 * k; B.hips.rotation.z *= 1 + 0.4 * k }
    if (rainy && P.can.rainHunch) { const h = m * MOT; B.chest.rotation.x += 0.05 * h; B.head.rotation.x += 0.04 * h; B.upL.rotation.z += 0.06 * h; B.upR.rotation.z -= 0.06 * h } // rain: shoulders a little hunched
    B.upL.rotation.x *= 1 + 0.55 * L.run; B.upR.rotation.x *= 1 + 0.55 * L.run; B.foL.rotation.x -= 0.35 * run; B.foR.rotation.x -= 0.35 * run
  }
  // tired: a sigh now and then (shoulders up, then a slump)
  if (L.tired > 0.4 && !busy && !ride && !L.fid) { L.sighN -= dt; if (L.sighN <= 0) { L.sighU = 0; L.sighN = between(L.rnd, P.sighEvery) } }
  L.sighU += dt; const sge = envelope(L.sighU, 1.4, 0.2) * MOT
  if (sge > 0) { const up = Math.sin(Math.min(1, L.sighU / 1.4) * Math.PI); B.chest.scale.y *= 1 + 0.035 * up; B.upL.rotation.z -= 0.05 * up; B.upR.rotation.z += 0.05 * up; B.head.rotation.x += 0.08 * sge * (L.sighU > 0.6 ? 1 : 0.3) }
  // just ate: a happy tummy pat and a little bounce
  L.yumU += dt; const yme = envelope(L.yumU, 1.6, 0.2) * MOT
  if (yme > 0) { const pat = Math.max(0, Math.sin(L.yumU * 12)); B.upL.rotation.x -= 0.55 * yme; B.upR.rotation.x -= 0.55 * yme; B.upL.rotation.z += 0.3 * yme; B.upR.rotation.z -= 0.3 * yme
    B.foL.rotation.x -= (0.8 + 0.25 * pat) * yme; B.foR.rotation.x -= (0.8 + 0.25 * pat) * yme; B.root.position.y += 0.006 * yme * Math.max(0, Math.sin(L.yumU * 6)); L.fsq = Math.max(L.fsq, 0.5 * yme) }
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
    // indoors: Mochi up to something, the window by day, the fire in the evening (her house supplies the point)
    if (!best && WIN_ && WIN_.__herInterest) { const p = WIN_.__herInterest(); if (p) { L.tgt.copy(p); best = 5 } }
    if (P.can.glanceAtCamera && !best && L.idle > 6) { L.camWait -= 0.33; if (L.camWait <= 0) { L.camT = 2.2 + L.rnd() * 1.5; L.camWait = 9 + L.rnd() * 10 } }
    // butterflies close by win her attention (look, and a little dodge if one comes right at her face)
    L.bf = null; const bl = typeof window !== 'undefined' && window.__bfly && !window.__bfly.resting && window.__bfly.list
    if (bl && !busy && !ride) { let bb = hh * 2.4; for (let i = 0; i < bl.length; i++) { const o = bl[i]; if (!o) continue; o.getWorldPosition(_t); const d = _t.distanceTo(_p); if (d < bb) { bb = d; L.bf = o } }
      if (L.bf) { best = 4; L.bfK = bb / hh } }
    // wave at a villager who comes close (not too often)
    L.waveCD -= 0.33
    if (P.can.wave && best === 1 && L.near > 0.3 && L.waveCD <= 0 && !busy && !ride && !L.fid && L.sit < 0.1 && m < 0.85) { L.waveU = 0; L.waveCD = between(L.rnd, P.waveEvery) }
    L.tk = best || (L.camT > 0 ? 3 : 0) }
  if (L.tk === 4 && L.bf) { L.bf.getWorldPosition(L.tgt); if (P.can.dodge && L.bfK < 0.95 && L.dodgeU > 1.2) { L.dodgeU = 0; head.parent.worldToLocal(_v.copy(L.tgt)); L.dodgeSd = _v.x - head.position.x > 0 ? 1 : -1; triggerBlink(L.blink) } }
  if (L.camT > 0) L.camT -= dt
  if (L.tk === 3 && camera) L.tgt.copy(camera.position)
  let yaw = 0, pitch = 0
  if (L.tk && !busy && (!L.fid || L.tk === 4) && (m < 0.6 || L.tk !== 3)) {
    _v.copy(L.tgt); head.parent.worldToLocal(_v); _v.sub(head.position)
    yaw = clamp(Math.atan2(_v.x, _v.z), -1.1, 1.1); pitch = clamp(-Math.atan2(_v.y, Math.hypot(_v.x, _v.z)), -0.3, 0.3); if (Math.abs(Math.atan2(_v.x, _v.z)) > 1.9 || _v.lengthSq() < 9e-4) yaw = pitch = 0 // behind her / on top of her: ignore
  }
  const hy = spring(L.lookYaw, yaw * 0.55, 2.2, 0.75, dt), hp = spring(L.lookPitch, pitch * 0.5, 2.2, 0.75, dt)
  B.head.rotation.y += hy * MOT; B.head.rotation.x += hp * MOT
  if (Math.abs(hy - L.hy) > 0.012 * 60 * dt && Math.abs(yaw) > 0.4 && L.rnd() < dt * 3) triggerBlink(L.blink); L.hy = hy
  // wave: the upper arm out to the side (clear of the side bun), the forearm up and waving
  L.waveU += dt; const wve = envelope(L.waveU, 1.9, 0.3) * MOT * (1 - L.sit)
  if (wve > 0) { B.upR.rotation.z += 1.4 * wve; B.upR.rotation.x -= 0.25 * wve; B.foR.rotation.z += (1.45 + 0.38 * Math.sin(L.waveU * 10)) * wve; B.chest.rotation.z += 0.04 * wve; L.fsq = Math.max(L.fsq, 0.3 * wve) }
  // dodge: a quick duck and lean away from a butterfly at her face
  L.dodgeU += dt; const dge = envelope(L.dodgeU, 0.7, 0.1) * MOT
  if (dge > 0) { B.hips.rotation.z -= 0.1 * L.dodgeSd * dge; B.chest.rotation.z -= 0.12 * L.dodgeSd * dge; B.head.rotation.z -= 0.1 * L.dodgeSd * dge; B.head.rotation.x += 0.08 * dge; B.root.position.y -= 0.005 * dge
    B.upL.rotation.x -= 0.25 * dge; B.upR.rotation.x -= 0.25 * dge; L.fsq = Math.max(L.fsq, 0.4 * dge) }
  // ---- mood: sleepy at night / long idle, excited on pickups and waves, focused on the bike (with smiles), happy near friends ----
  const sleepy = (act === 'nap' || (T.night > 0.7 && L.idle > 4) || L.idle > P.sleepyAfter) && L.lie < 0.3 // lying back she watches the sky, eyes open
  if (ride) L.rideT += dt; else L.rideT = 0
  const W_ = typeof window !== 'undefined' ? window : null // debug hooks for the studio captures: __herMood, __herNear
  // her action poses (acts.js) say how an action feels: strain = effort, calm = eyes softly closed, wow = delighted
  const am = (busy && aw > 0.3) || st.fishing ? st.actMood : null; if (am === 'calm') L.fsq = Math.max(L.fsq, 0.75 * aw)
  const hungryFace = L.fid === 'tummy' || L.fid === 'growl' || (L.fid === 'peek' && L.fu > FID.peek * 0.55)
  const mood = W_ && W_.__herMood ? W_.__herMood : L.skid > 0.3 ? L.skidFace : am === 'strain' ? 'focus' : am === 'calm' ? 'happy' : am === 'wow' ? 'excited' : L.shut > 0.35 ? 'yawn' : (L.skip > 0.3 || wve > 0.3 || yme > 0.3) ? 'excited' : sleepy ? 'sleepy' : hungryFace ? 'hungry' : L.tired > 0.5 && !busy ? 'tired' : sleepy ? 'sleepy' : busy && EXCITED_ACTS.has(act) && aw > 0.3 ? 'excited' : ride ? (L.rideT % 7 < 4.6 ? 'focus' : 'happy') : 'happy'
  if (mood !== L.mood) { L.mood = mood; L.moodT = 0 } else L.moodT += dt
  L.talk = approach(L.talk, TALK.open ? 1 : 0, 4, dt)
  const friendly = W_ && W_.__herNear != null ? W_.__herNear : Math.max(L.near * (L.tk === 1 || L.tk === 2 ? 1 : 0), L.talk)
  L.blush = approach(L.blush, mood === 'excited' ? 1 : friendly, 2.5, dt); L.squint = approach(L.squint, mood === 'excited' ? 0.15 : friendly * 0.28 + L.yawn * 0.5 + L.fsq, 4, dt)
  // head: tilt with emotion, nod while listening, droop when sleepy
  B.head.rotation.z += spring(L.tilt, (mood === 'excited' ? 0.09 * Math.sin(t * 3.2) : 0) + friendly * 0.07 * Math.sin(t * 0.9 + 0.6), 2, 0.6, dt) * MOT
  B.head.rotation.x += spring(L.nod, L.talk * 0.06 * Math.max(0, Math.sin(t * 2.4)) + (mood === 'sleepy' ? 0.06 : 0), 2.5, 0.6, dt) * MOT
  // ---- eyes: blinks, gaze (look target remainder + turn lead + fidget look + saccades) ----
  L.open = stepBlink(L.blink, dt) * (1 - L.shut)
  const ey = clamp((yaw - hy) / 0.55 + L.turn * 0.25 + fidLookX, -1, 1), ex = clamp((pitch - hp) / -0.4 + fidLookY, -1, 1)
  stepGaze(L.gaze, ey, ex, dt, REDUCED ? 0.4 : mood === 'focus' ? 0.4 : 1); L.gx = L.gaze.x; L.gy = L.gaze.y
  // ---- secondary motion: head acceleration (in the head frame) drives damped springs on buns, top bun and front locks ----
  if (!L.init) { L.hp.copy(_p); L.hv.set(0, 0, 0); L.init = 1 }
  _v.copy(_p).sub(L.hp).divideScalar(dt); _a.copy(_v).sub(L.hv).divideScalar(dt); L.hp.copy(_p); L.hv.copy(_v)
  head.getWorldQuaternion(_q).invert(); _a.applyQuaternion(_q); head.getWorldScale(_t); _a.divideScalar(Math.max(_t.x, 1e-4))
  const yawV = (head.rotation.y - (L.hry ?? head.rotation.y)) / dt; L.hry = head.rotation.y
  const OFF = L.hairOff || HAIR_OFF
  for (let i = 0; i < 4; i++) { const [f, z, g, lim] = HP[i], S3 = L.hair[i], sx = i === 0 ? -1 : i === 1 ? 1 : 0
    const k = 0.00022 * g * MOT
    // the side buns sit on the shoulder line: they may swing out and up, never down or in toward the shoulder/arm (no clipping on the down-bounce)
    OFF[i * 3] = clamp(spring(S3[0], 0, f, z, dt, -clamp(_a.x, -40, 40) * k * 40 - yawV * 0.0025 * g * MOT * 40 * (i === 2 ? 0.5 : 1)), i === 0 ? -lim : i === 1 ? -0.0004 : -lim, i === 0 ? 0.0004 : lim)
    OFF[i * 3 + 1] = clamp(spring(S3[1], 0, f, z, dt, -clamp(_a.y, -40, 40) * k * 40), i < 2 ? 0 : -lim, lim)
    OFF[i * 3 + 2] = clamp(spring(S3[2], 0, f, z, dt, -clamp(_a.z, -40, 40) * k * 40 + sx * yawV * 0.001 * MOT * 40), -lim, lim)
  }
}

/** after the base scarf/bag springs: the tails and the satchel overshoot on starts/stops and turns, and flutter a little */
export function lifePost(L, R_, st, dt, t) {
  if (!L || !L.scf || !(dt > 0)) return
  const MOT = MOT0 * (L.P?.lively ?? 1)
  const lean = L.lean.x, fl = Math.sin(t * 1.7) * 0.04 + Math.sin(t * 4.3) * 0.015 * (st.move || 0)
  if (R_.scarf) { R_.scarf.rotation.x += spring(L.scf, -lean * 2.2, 2.6, 0.45, dt) * MOT + fl * MOT; R_.scarf.rotation.z += spring(L.scfZ, L.turn * 0.04, 2.2, 0.5, dt) * MOT }
  // the tails may hang straight at rest but swing out from the chest (never into it / the bib) once she moves, even on a hard down-bounce
  if (R_.scarf) { const mx = -0.5 * Math.min(1, st.move || 0); if (R_.scarf.rotation.x > mx) R_.scarf.rotation.x = mx
    R_.scarf.rotation.z = clamp(R_.scarf.rotation.z, -0.3, 0.3) } // the base swings the tails ~0.8 rad sideways in a turn: across the chest into the shoulder; keep them near the centre line
  if (R_.bag) { R_.bag.rotation.x += lean * 1.4 * MOT; R_.bag.rotation.z += L.bagKick }
}
