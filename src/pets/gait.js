// Pet gait engine (pure). One continuous stride phase; per-leg touchdown offsets and duty factor blend by speed
// between a lateral-sequence walk (one foot at a time: hind, fore on the same side, then the other side), a trot
// (diagonal pairs) and a run (dog: rotary gallop; cat: bound). Feet are planted: a stance paw is carried backwards by
// the body's own motion so it stays still on the ground; a swing paw lifts and reaches to a touchdown point centred on
// its hip. Legs are single columns (no knee), so the rig aims each column at its paw (legAngles).
// Body-local frame: z ahead, x to the side (same as motor.js); leg order FL, FR, RL, RR.

export const GAITS = {
  walk: { off: [0.25, 0.75, 0, 0.5], duty: 0.64 },
  trot: { off: [0.5, 1.0, 0, 0.5], duty: 0.46 },
  gallop: { off: [0.5, 0.4, 0, 0.1], duty: 0.3 },
  bound: { off: [0.5, 0.55, 0, 0.05], duty: 0.32 },
}
const clamp = (x, a, b) => Math.max(a, Math.min(b, x)), lerp = (a, b, k) => a + (b - a) * k
const ss = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t) }
const frac = (x) => ((x % 1) + 1) % 1
const rot = (x, z, a) => { const c = Math.cos(a), s = Math.sin(a); return [x * c - z * s, x * s + z * c] }

// g = { walkTo, trotTo, runAt, strideMin, strideMax, run }; v in rig units/s
export function gaitMix(g, v) {
  const k1 = ss(g.walkTo * 0.75, g.walkTo * 1.25, v), k2 = ss(g.trotTo, g.runAt, v), W = GAITS.walk, T = GAITS.trot, R = GAITS[g.run || 'gallop']
  const off = [0, 1, 2, 3].map(i => lerp(lerp(W.off[i], T.off[i], k1), R.off[i], k2))
  return { off, duty: lerp(lerp(W.duty, T.duty, k1), R.duty, k2), stride: g.strideMin + (g.strideMax - g.strideMin) * ss(0, g.runAt * 1.4, v), k1, k2 }
}

export const newFeet = (hips) => ({ ph: 0, freq: 0, idle: 0, init: true, legs: hips.map(([x, z]) => ({ x, z, y: 0, stance: true, u: 0, u0: 0, s: 0, lx: x, lz: z })) })

const SWING_T = 0.18, SETTLE_T = 0.2, TURN_R = 0.05 // idle swing time, settle-step time, effective radius for turning on the spot

// g also carries reach (max stance foot distance from its hip) and lift (paw lift height)
export function stepFeet(f, hips, g, { v, w, dt }) {
  dt = Math.min(dt, 0.05)
  const mix = gaitMix(g, v), drive = Math.max(v, Math.abs(w) * TURN_R), moving = drive > 1e-3
  f.mix = mix; f.freq = moving ? drive * mix.duty / mix.stride : 0; f.ph += f.freq * dt
  f.idle = moving ? 0 : f.idle + dt
  const Tst = f.freq > 0 ? mix.duty / f.freq : 0, lift = g.lift * (1 + 0.6 * mix.k2) // runs reach higher
  f.legs.forEach((leg, k) => {
    const u = frac(f.ph - mix.off[k]), [hx, hz] = hips[k]
    if (f.init) { leg.u = u; if (u >= mix.duty && moving) { leg.stance = false; leg.u0 = u; leg.s = 0; leg.lx = leg.x; leg.lz = leg.z } return }
    const wrapped = leg.u - u > 0.5
    if (leg.stance) {
      // carried by the body's motion: rotate by the yaw step, then slide back by the forward step (stays put in the world)
      const [x, z] = rot(leg.x, leg.z, w * dt); leg.x = x; leg.z = z - v * dt; leg.y = 0
      const far = Math.hypot(leg.x - hx, leg.z - hz) > g.reach
      if ((moving && u >= mix.duty && !wrapped) || far) { leg.stance = false; leg.u0 = u >= mix.duty ? u : Math.min(u, 0.999); leg.s = 0; leg.lx = leg.x; leg.lz = leg.z; leg.settle = false }
    } else {
      // touchdown point: centred on the hip over the coming stance (half the stance's travel ahead, half its turn back)
      const [tx0, tz0] = rot(hx, hz, -w * Tst / 2), tx = tx0, tz = tz0 + v * Tst / 2
      if (moving && !leg.settle) leg.s = Math.max(leg.s, clamp((u - leg.u0) / Math.max(1e-3, 1 - leg.u0), 0, 1))
      else leg.s = Math.min(1, leg.s + dt / (leg.settle ? SETTLE_T : SWING_T))
      const e = leg.s * leg.s * (3 - 2 * leg.s)
      leg.x = leg.lx + (tx - leg.lx) * e; leg.z = leg.lz + (tz - leg.lz) * e; leg.y = lift * Math.sin(Math.PI * leg.s) * (leg.settle ? 0.5 : 1)
      if ((moving && wrapped && !leg.settle) || (leg.s >= 1 && (!moving || leg.settle))) { leg.stance = true; leg.settle = false; leg.x = tx; leg.z = tz; leg.y = 0 }
    }
    leg.u = u
  })
  f.init = false
  // standing still: step the feet back under the hips one at a time (the farthest first), like shifting weight
  if (f.idle > 0.3 && f.legs.every(l => l.stance)) {
    let best = -1, bd = 0.0015
    f.legs.forEach((l, k) => { const d = Math.hypot(l.x - hips[k][0], l.z - hips[k][1]); if (d > bd) { bd = d; best = k } })
    if (best >= 0) { const l = f.legs[best]; l.stance = false; l.settle = true; l.s = 0; l.lx = l.x; l.lz = l.z }
  }
}

// aim a single-column leg (hip at height L above the ground) at its paw. Rig convention: positive rx swings the paw
// back (-z); rz tilts it out to +x; len scales the column (1 = rest length).
export function legAngles(foot, hip, L, H = L) { // H: the hip's actual height above the ground
  const dx = foot.x - hip[0], dz = foot.z - hip[1], h = H - (foot.y || 0), d = Math.hypot(dx, h, dz)
  return { rx: -Math.atan2(dz, h), rz: Math.asin(clamp(dx / d, -1, 1)), len: d / L }
}

// where the planted feet hold the body up (legs keep their length in stance, so a paw ahead of or behind its hip lowers
// that hip: the walk's natural rise and fall). Returns the body height, pitch (+ = nose down) and roll (+ = +x side up).
// A pair with no paw down (a gallop's flight) rides at rest height.
export function bodyFromFeet(legs, hips, L) {
  const hip = (k) => { const l = legs[k], dx = l.x - hips[k][0], dz = l.z - hips[k][1]; return Math.sqrt(Math.max(0, L * L - dx * dx - dz * dz)) }
  const mean = (ks) => { let s = 0, n = 0; for (const k of ks) if (legs[k].stance) { s += hip(k); n++ } return n ? s / n : L }
  const hF = mean([0, 1]), hH = mean([2, 3]), hL = mean([0, 2]), hR = mean([1, 3])
  const span = hips[0][1] - hips[2][1], width = hips[0][0] - hips[1][0]
  return { y: (hF + hH) / 2, pitch: Math.asin(clamp((hH - hF) / span, -1, 1)), roll: Math.asin(clamp((hL - hR) / width, -1, 1)) }
}

// critically-ish damped spring step (semi-implicit, sub-stepped so a long frame never blows up). s = { x, v }
export function spring(s, target, k, zeta, dt) {
  dt = Math.min(dt, 0.05); const w = Math.sqrt(k), n = Math.max(1, Math.ceil(dt * w / 0.5)), h = dt / n
  for (let i = 0; i < n; i++) { s.v += (k * (target - s.x) - 2 * zeta * w * s.v) * h; s.x += s.v * h }
  return s.x
}
