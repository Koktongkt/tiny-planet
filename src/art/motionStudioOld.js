// Motion Studio: the pets' CURRENT movement, ported flat for the before/after comparison. Same numbers as the game
// today (Dog.jsx follow + steering, Cat.jsx walkTo): stepped catch-up speeds, a fixed side slot that flips at once,
// sit after 0.9 s / lie at 7 s, the cat's instant start/stop at a fixed speed and first-free-of-seven steering.
// Pets: { x, z, yaw, st } ; her: { x, z, yaw, speed } ; free(x, z, r) -> bool (no box there).
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a)), clamp = (x, a, b) => Math.max(a, Math.min(b, x))
const yawTo = (a, b) => Math.atan2(b.x - a.x, b.z - a.z)
const firstFree = (p, want, free, r = 0.04) => { for (const o of [0, 0.6, -0.6, 1.2, -1.2, 1.8, -1.8]) { const a = want + o; if (free(p.x + Math.sin(a) * 0.07, p.z + Math.cos(a) * 0.07, r)) return a } return want }

export function oldDog(p, her, dt, free, rnd = Math.random) {
  const O = p.o || (p.o = { state: 'follow', t: 0, idleT: 0, side: 1, speed: 0 })
  O.t += dt
  const dHer = Math.hypot(her.x - p.x, her.z - p.z), herMoving = her.speed > 0.2, go = (s) => { O.state = s; O.t = 0 }
  let target = null, spd = 0, face = null, arrive = 0.08
  if (O.state === 'sit' || O.state === 'lie') { face = yawTo(p, her); if (herMoving && dHer > 0.45) go('follow'); else if (O.t > 7 && O.state === 'sit') go('lie') }
  if (O.state === 'follow') {
    if (rnd() < dt * 0.05) O.side *= -1
    const fx = Math.sin(her.yaw), fz = Math.cos(her.yaw), sx = Math.cos(her.yaw), sz = -Math.sin(her.yaw)
    const slot = { x: her.x - fx * 0.36 + sx * O.side * 0.24, z: her.z - fz * 0.36 + sz * O.side * 0.24 }
    const dSlot = Math.hypot(slot.x - p.x, slot.z - p.z)
    if (dSlot > 0.12 || herMoving) { target = slot; spd = dHer > 2.2 ? 2.7 : dHer > 1.0 ? 1.7 : herMoving ? 1.2 : 0.6; arrive = 0.09 }
    if (!herMoving && dHer < 0.8) { O.idleT += dt; if (O.idleT > 0.9) { go('sit'); O.idleT = 0 } } else O.idleT = 0
  }
  let moveSpd = 0
  if (target) { const d = Math.hypot(target.x - p.x, target.z - p.z)
    if (d > arrive) { const want = firstFree(p, yawTo(p, target), free, 0.05)
      moveSpd = Math.min(spd, 0.6 + d * 2.5); const turn = wrap(want - p.yaw), near = d < 0.3, mr = (moveSpd > 2 ? 5 : 4) * (near ? 2.5 : 1) * dt
      p.yaw += clamp(turn, -mr, mr); if (Math.abs(turn) > 1.6) moveSpd *= 0.4
      if (near) moveSpd *= Math.max(0.15, Math.cos(Math.min(1.57, Math.abs(turn)))) } }
  if (face != null) { const turn = wrap(face - p.yaw); p.yaw += turn * Math.min(1, dt * 3) }
  O.speed += (moveSpd - O.speed) * Math.min(1, dt * (moveSpd > O.speed ? 3 : 5))
  p.x += Math.sin(p.yaw) * O.speed * dt; p.z += Math.cos(p.yaw) * O.speed * dt
  return { speed: O.speed, sit: O.state === 'sit' ? 1 : 0, lie: O.state === 'lie' ? 1 : 0 }
}

// the cat's floor movement: walkTo turns at dt*7 toward the first free of seven fixed offsets and moves at a fixed
// speed from the first frame (only the leg animation is eased)
function walkTo(p, tx, tz, r, fast, dt, free) {
  const d = Math.hypot(tx - p.x, tz - p.z); if (d < r) return { arrived: true, speed: 0 }
  const want = firstFree(p, Math.atan2(tx - p.x, tz - p.z), free); p.yaw += wrap(want - p.yaw) * Math.min(1, dt * 7)
  return { arrived: false, speed: fast ? 0.55 : 0.2 }
}

export function oldCat(p, her, dt, free, mode, rnd = Math.random) {
  const O = p.o || (p.o = { state: 'go', t: 0, target: null, dur: 0 })
  O.t += dt
  let speed = 0, sit = 0, crouch = 0, face = null
  if (mode === 'wander') {
    if (O.state === 'pause') { sit = O.sitting ? 1 : 0; if (O.t > O.dur) { O.state = rnd() < 0.15 ? 'zoom' : 'go'; O.t = 0; O.target = null; O.dur = 4 + rnd() * 2.5 } }
    if (O.state === 'go' || O.state === 'zoom') {
      if (!O.target) { for (let i = 0; i < 20; i++) { const x = -1.1 + rnd() * 2.2, z = -1.1 + rnd() * 2.2; if (free(x, z, 0.08) && (O.state === 'go' || Math.hypot(x - p.x, z - p.z) > 0.5)) { O.target = { x, z }; break } } O.skid = 0.25 }
      if (O.state === 'zoom' && O.skid > 0) { O.skid -= dt; crouch = 0.8 }
      else if (O.target) { const r = walkTo(p, O.target.x, O.target.z, 0.06, O.state === 'zoom', dt, free); speed = O.state === 'zoom' ? (r.arrived ? 0 : 0.95) : r.speed
        if (r.arrived) { O.target = null; if (O.state === 'go') { O.state = 'pause'; O.t = 0; O.dur = 2 + rnd() * 3; O.sitting = rnd() < 0.5 } } }
      if (O.state === 'zoom' && O.t > O.dur) { O.state = 'pause'; O.t = 0; O.dur = 3; O.sitting = true }
    }
  } else { // follow her: walk to a spot beside her and sit there, facing her
    const sx = Math.cos(her.yaw), sz = -Math.sin(her.yaw), fx = Math.sin(her.yaw), fz = Math.cos(her.yaw)
    const spot = { x: her.x - fx * 0.3 - sx * 0.22, z: her.z - fz * 0.3 - sz * 0.22 }, d = Math.hypot(spot.x - p.x, spot.z - p.z)
    if (O.state === 'sitnear') { sit = 1; face = yawTo(p, her); if (d > 0.3) { O.state = 'go'; O.t = 0 } }
    else { const r = walkTo(p, spot.x, spot.z, 0.13, d > 0.7, dt, free); speed = r.speed; if (r.arrived) { O.state = 'sitnear'; O.t = 0 } }
  }
  if (face != null) p.yaw += wrap(face - p.yaw) * Math.min(1, dt * 4)
  p.x += Math.sin(p.yaw) * speed * dt; p.z += Math.cos(p.yaw) * speed * dt
  return { speed, sit, crouch }
}
