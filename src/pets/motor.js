// Pet locomotion motor (pure; shared by Pip on the sphere and Mochi on the room floor). Brains say where to go (a
// target in the pet's own frame) and how eagerly; the motor turns that into a continuous speed and yaw rate the way
// a real animal moves: no speed tiers, braking eased into the stop, wide arcs when fast, a dead zone so small target
// moves do not restart walking, and slow re-stepping turns (creep) instead of frozen-legs pivots.
// Frame: z ahead, x to the pet's side such that atan2(x, z) is the turn (dYaw) that faces the target.

export const MOTOR_DOG = { maxSpeed: 2.8, accel: 3.2, decel: 4.5, jerk: 10, turn0: 7, turnV: 0.9, turnAcc: 30, deadOut: 0.16, arrive: 0.07, creep: 0.12, lookMax: 1.1 }
export const MOTOR_CAT = { maxSpeed: 1.0, accel: 2.2, decel: 3.0, jerk: 9, turn0: 6, turnV: 0.35, turnAcc: 24, deadOut: 0.1, arrive: 0.05, creep: 0.06, lookMax: 1.2 }

export const newMotor = () => ({ v: 0, w: 0, a: 0, moving: false, look: 0 })
export const maxTurn = (cfg, v) => cfg.turn0 / (1 + v / cfg.turnV)
const clamp = (x, a, b) => Math.max(a, Math.min(b, x))

// world offset (dx, dz) seen from a pet whose forward is (sin yaw, cos yaw)
export function toLocal(dx, dz, yaw) { const s = Math.sin(yaw), c = Math.cos(yaw); return { x: dx * c - dz * s, z: dx * s + dz * c } }

export function stepMotor(m, cfg, goal, dt) {
  dt = Math.min(dt, 0.05)
  const d = Math.hypot(goal.x, goal.z), bearing = d > 1e-9 ? Math.atan2(goal.x, goal.z) : 0
  if (!m.moving && d > cfg.deadOut) m.moving = true
  else if (m.moving && d < cfg.arrive) m.moving = false
  // desired speed: cruise, capped by a braking curve (with margin, so jerk lag never overshoots) and by the heading error
  let vDes = 0
  if (m.moving) {
    vDes = Math.min(goal.speed, cfg.maxSpeed, Math.sqrt(2 * cfg.decel * 0.45 * Math.max(0, d - cfg.arrive * 0.5))) * Math.max(0, Math.cos(bearing))
    if (Math.abs(bearing) > 1.1 && m.v < cfg.creep * 1.5) vDes = Math.min(cfg.creep, goal.speed) // step-turn: keep the legs stepping round
  }
  const aWant = clamp((vDes - m.v) * 9, -cfg.decel, cfg.accel)
  m.a += (aWant - m.a) * Math.min(1, dt * cfg.jerk)
  let v = m.v + m.a * dt
  if (m.a > 0) v = Math.min(v, Math.max(vDes, m.v)); else v = Math.max(v, Math.min(vDes, m.v)) // never shoot past the wish
  v = clamp(v, m.v - cfg.decel * dt, m.v + cfg.accel * dt)
  m.v = clamp(v, 0, cfg.maxSpeed)
  // yaw: aim at the target while moving, else at the requested facing; angular accel limited, rate capped by speed
  const aim = m.moving ? bearing : (goal.face ?? 0), lim = maxTurn(cfg, m.v)
  const wWant = clamp(aim * 3, -lim, lim), dw = cfg.turnAcc * dt
  m.w = clamp(m.w + clamp(wWant - m.w, -dw, dw), -lim, lim)
  // head leads the turn
  m.look += (clamp(aim, -cfg.lookMax, cfg.lookMax) - m.look) * Math.min(1, dt * 8)
  return { dYaw: m.w * dt, v: m.v }
}

// weighted blend of the clear directions near the wish (no snapping between fixed offsets)
const OFFS = [0, 0.35, -0.35, 0.7, -0.7, 1.05, -1.05, 1.4, -1.4]
export function steerClear(want, isFree) {
  // sum each side separately and commit to the clearer side (an obstacle dead ahead must not average to 'straight on')
  const side = [[0, 0, 0], [0, 0, 0]] // [sx, sz, weight] for left (o >= 0) and right (o <= 0)
  for (const o of OFFS) { const a = want + o; if (!isFree(a)) continue; const w = Math.cos(o) ** 2
    for (const k of o === 0 ? [0, 1] : [o > 0 ? 0 : 1]) { side[k][0] += Math.sin(a) * w; side[k][1] += Math.cos(a) * w; side[k][2] += w } }
  // the way ahead is clear: blend both sides (blocked ones simply weigh nothing). Blocked: commit to the clearer side.
  const s = isFree(want) ? [side[0][0] + side[1][0], side[0][1] + side[1][1], side[0][2] + side[1][2]] : side[0][2] >= side[1][2] ? side[0] : side[1]
  if (s[2] <= 0) return want
  return Math.atan2(s[0], s[1])
}
