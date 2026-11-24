// Pip's following (pure, flat 2D; Dog.jsx maps the sphere into this frame, the Motion Studio uses it directly).
// A real dog keeps a loose place near you: the place is smoothed and leads you a little, small moves of yours are
// ignored, he swaps sides along an arc behind you, and when you stop he settles a different way each time (sits;
// stands and looks about; turns a little circle and lies down; sniffs about). Sitting, he follows you with his head
// and only gets up to re-face you when you go out of view.
// World frame: yaw 0 faces +z, forward = (sin yaw, cos yaw).

export const SETTLES = ['sit', 'look', 'circle', 'sniff']
const SETTLE_W = { sit: 0.4, look: 0.3, circle: 0.2, sniff: 0.1 }
const clamp = (x, a, b) => Math.max(a, Math.min(b, x))
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a))
const yawTo = (a, b) => Math.atan2(b.x - a.x, b.z - a.z)

export const followSpeed = (gap, herSpeed) => clamp(herSpeed + (gap - 0.3) * 2.2, 0, 2.8)

export const newFollow = () => ({ mode: 'follow', settle: null, t: 0, dur: 0, side: 1, sideK: 1, flipT: 20, spot: null, goT: 0, herStill: 0, glance: 0, glanceT: 0, anchorYaw: 0, herAt: null })

function pickSettle(rnd) { let r = rnd(); for (const k of SETTLES) { r -= SETTLE_W[k]; if (r <= 0) return k } return 'sit' }

export function stepFollow(F, her, pet, dt, rnd = Math.random) {
  dt = Math.min(dt, 0.05); F.t += dt
  F.goT = her.speed > 0.2 ? F.goT + dt : 0
  F.herStill = her.speed < 0.05 ? F.herStill + dt : 0
  const fx = Math.sin(her.yaw), fz = Math.cos(her.yaw), sx = Math.cos(her.yaw), sz = -Math.sin(her.yaw)
  if (her.speed > 0.2) { F.flipT -= dt; if (F.flipT < 0) { F.side *= -1; F.flipT = 15 + rnd() * 25 } }
  F.sideK += clamp(F.side - F.sideK, -dt * 2.5, dt * 2.5) // the place swings round behind her over ~0.8 s
  const back = -0.36 + her.speed * 0.25, raw = { x: her.x + fx * back + sx * 0.24 * F.sideK, z: her.z + fz * back + sz * 0.24 * F.sideK }
  if (!F.spot) F.spot = { ...raw }
  const k = 1 - Math.exp(-dt / 0.35); F.spot.x += (raw.x - F.spot.x) * k; F.spot.z += (raw.z - F.spot.z) * k
  const stay = { x: pet.x, z: pet.z }, toHer = yawTo(pet, her), pose = { sit: 0, lie: 0, sniff: 0 }
  const carrot = (yaw, d = 0.2) => ({ x: pet.x + Math.sin(yaw) * d, z: pet.z + Math.cos(yaw) * d })
  const go = (mode, dur = 0) => { F.mode = mode; F.t = 0; F.dur = dur }

  if (F.mode !== 'follow' && F.goT > 0.15) { go('follow'); F.settle = null }

  if (F.mode === 'follow') {
    const gap = Math.hypot(F.spot.x - pet.x, F.spot.z - pet.z)
    if (F.herStill > 0.6 && gap < 0.25) {
      F.settle = pickSettle(rnd); F.anchorYaw = pet.yaw; F.herAt = { x: her.x, z: her.z }
      if (F.settle === 'sit') go('sit', 8 + rnd() * 7)
      else go('settle', F.settle === 'look' ? 2 + rnd() * 2 : F.settle === 'circle' ? 2.4 : 1.5 + rnd() * 1.5)
    } else return { x: F.spot.x, z: F.spot.z, speed: followSpeed(gap, her.speed), face: null, pose, look: null }
  }

  if (F.mode === 'settle') {
    const done = F.t > F.dur
    if (F.settle === 'look') { // stand and glance about, now and then back at her
      F.glanceT -= dt; if (F.glanceT < 0) { F.glanceT = 0.6 + rnd() * 0.9; F.glance = rnd() < 0.35 ? wrap(toHer - pet.yaw) : (rnd() * 2 - 1) * 1.1 }
      if (done) go('sit', 8 + rnd() * 7)
      return { ...stay, speed: 0, face: null, pose, look: pet.yaw + F.glance }
    }
    if (F.settle === 'circle') { // one small loop, then flop down
      if (done) { go('lie', 999); return { ...stay, speed: 0, face: null, pose: { ...pose, lie: 1 }, look: toHer } }
      return { ...carrot(F.anchorYaw + (F.t / F.dur) * Math.PI * 2 + 0.9), speed: 0.3, face: null, pose: { ...pose, sniff: 0.4 }, look: null }
    }
    if (F.settle === 'sniff') { // nose down, pottering about
      if (done) go('sit', 8 + rnd() * 7)
      else return { ...carrot(F.anchorYaw + Math.sin(F.t * 1.7) * 0.9), speed: 0.2, face: null, pose: { ...pose, sniff: 1 }, look: null }
    }
  }

  if (F.mode === 'sit' || F.mode === 'lie') {
    if (F.mode === 'sit' && F.t > F.dur) go('lie', 999)
    if (F.herAt && Math.hypot(her.x - F.herAt.x, her.z - F.herAt.z) > 0.45) { go('follow'); F.settle = null; return { x: F.spot.x, z: F.spot.z, speed: followSpeed(Math.hypot(F.spot.x - pet.x, F.spot.z - pet.z), her.speed), face: null, pose, look: null } }
    if (Math.abs(wrap(toHer - pet.yaw)) > 1.3) go('turn') // she's out of view: get up and re-face her
    else return { ...stay, speed: 0, face: null, pose: { ...pose, sit: F.mode === 'sit' ? 1 : 0, lie: F.mode === 'lie' ? 1 : 0 }, look: toHer }
  }

  // turn: stand, step round to face her, sit again
  if (Math.abs(wrap(toHer - pet.yaw)) < 0.25) go('sit', 5 + rnd() * 6)
  return { ...stay, speed: 0, face: toHer, pose, look: toHer }
}
