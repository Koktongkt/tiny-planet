// Her photo poses (Stage C, art-c). Lazy chunk: importing registers POSES['photo_<id>'] into act.js, which her rig
// (GhibliPerson.jsx) already calls as POSES[kind](B, mix, st, t, w). B = bones, mix(bone, axis, target) eases by w.
// Arm convention (checked in preview ?m=photo&dbg): upper-arm z > 0 swings upR out/up, z < 0 swings upL out/up; x < 0 = forward.
// holdHerPose(id) / releaseHerPose() drive act.js's ACT so she eases in and holds until released (photo mode only).
import { ACT, POSES } from '../../act.js'
export const HER_POSE_IDS = ['stand', 'wave', 'peace', 'sit', 'look_up', 'twirl', 'kneel', 'hold_fish']
export const HER_POSE_LABELS = { stand: 'Natural', wave: 'Wave', peace: 'Peace sign', sit: 'Sit', look_up: 'Sky gazing', twirl: 'Twirl', kneel: 'Kneel', hold_fish: 'Proud catch' }
const seat = (B, mix, w, drop) => { B.root.position.y -= drop * w; for (const k of ['L', 'R']) { mix(B['th' + k], 'x', -1.5); mix(B['th' + k], 'z', 0); mix(B['sh' + k + 'n'], 'x', 1.45); mix(B['ft' + k], 'x', 0.05) } }
const breathe = (B, mix, t) => mix(B.chest, 'x', 0.02 * Math.sin(t * 1.4))
export const HER_POSES = {
  stand(B, mix, st, t) { breathe(B, mix, t); mix(B.head, 'z', 0.06); mix(B.upL, 'z', -0.08); mix(B.upR, 'z', 0.08); mix(B.foL, 'x', -0.25); mix(B.foR, 'x', -0.25) },
  wave(B, mix, st, t) { breathe(B, mix, t); mix(B.upR, 'z', 2.45); mix(B.upR, 'x', -0.25); mix(B.foR, 'x', -0.35 - Math.sin(t * 7) * 0.32); mix(B.head, 'z', 0.12); mix(B.head, 'x', -0.04); mix(B.upL, 'z', -0.1); mix(B.foL, 'x', -0.3) },
  peace(B, mix, st, t) { breathe(B, mix, t) // hand up beside her face, elbow out; head tilted toward it
    mix(B.upR, 'x', -0.55); mix(B.upR, 'z', 1.15); mix(B.foR, 'x', -2.1); mix(B.head, 'z', 0.2); mix(B.head, 'y', -0.08); mix(B.chest, 'z', 0.04)
    mix(B.upL, 'x', -0.15); mix(B.upL, 'z', -0.3); mix(B.foL, 'x', -0.9) // other hand on her hip
    for (const k of ['L', 'R']) mix(B['th' + k], 'z', k === 'L' ? -0.04 : 0.06) },
  sit(B, mix, st, t, w) { seat(B, mix, w, 0.11); mix(B.chest, 'x', 0.05); mix(B.head, 'z', 0.1 + 0.03 * Math.sin(t * 0.6)); mix(B.thL, 'z', -0.12); mix(B.thR, 'z', 0.12)
    for (const [k, sd] of [['L', -1], ['R', 1]]) { mix(B['up' + k], 'x', -0.5); mix(B['up' + k], 'z', sd * 0.15); mix(B['fo' + k], 'x', -0.85) } },
  look_up(B, mix, st, t) { breathe(B, mix, t); mix(B.head, 'x', -0.5); mix(B.chest, 'x', -0.12); mix(B.root, 'x', -0.04)
    mix(B.upR, 'x', -1.85); mix(B.upR, 'z', -0.2); mix(B.foR, 'x', -1.95) /* shading her eyes */; mix(B.upL, 'z', -0.15); mix(B.foL, 'x', -0.2) },
  twirl(B, mix, st, t) { const s = Math.sin(t * 2.2); mix(B.hips, 'y', s * 0.35); mix(B.chest, 'y', s * 0.15); mix(B.head, 'z', 0.15 - s * 0.08); mix(B.head, 'x', -0.12)
    for (const [k, sd] of [['L', -1], ['R', 1]]) { mix(B['up' + k], 'z', sd * (1.25 + 0.12 * s * sd)); mix(B['up' + k], 'x', -0.15); mix(B['fo' + k], 'x', -0.25) }
    mix(B.thR, 'x', -0.25); mix(B.shRn, 'x', 0.55); mix(B.ftR, 'x', 0.4) /* one foot kicked up behind */ },
  kneel(B, mix, st, t, w) { B.root.position.y -= 0.085 * w; mix(B.root, 'x', 0.1); mix(B.chest, 'x', 0.12); mix(B.head, 'x', -0.08); mix(B.head, 'z', 0.14)
    mix(B.thL, 'x', -1.45); mix(B.shLn, 'x', 1.5); mix(B.thR, 'x', 0.05); mix(B.shRn, 'x', 1.6); mix(B.ftR, 'x', 0.6) // one knee down
    mix(B.upR, 'x', -0.95); mix(B.upR, 'z', 0.2); mix(B.foR, 'x', -0.4) /* hand out to the pets */; mix(B.upL, 'x', -0.6); mix(B.foL, 'x', -1.0) },
  hold_fish(B, mix, st, t) { breathe(B, mix, t); const bob = Math.sin(t * 3) * 0.04 // both hands up in front, showing it off
    for (const [k, sd] of [['L', -1], ['R', 1]]) { mix(B['up' + k], 'x', -1.05 + bob); mix(B['up' + k], 'z', sd * -0.32); mix(B['fo' + k], 'x', -0.8) }
    mix(B.head, 'z', 0.14); mix(B.head, 'x', -0.06); mix(B.chest, 'x', -0.05) },
}
for (const [id, f] of Object.entries(HER_POSES)) POSES['photo_' + id] = (B, mix, st, t, w) => f(B, mix, st, t, w)
/** hold a pose on her (eases in over ~0.3 s via act.js, no movement lock beyond photo mode's own) */
export function holdHerPose(id) {
  if (!HER_POSES[id]) id = 'stand'
  // act.js eases actW in over the first 16% of dur: a 2 s window gives a 0.32 s ease, then we keep pushing t0 forward
  ACT.kind = 'photo_' + id; ACT.dur = 2; ACT.t0 = performance.now(); ACT.lock = 1e9; ACT.spark = null; ACT.hold = true
  if (!holdHerPose.iv) holdHerPose.iv = setInterval(() => { if (!ACT.hold || !ACT.kind || !ACT.kind.startsWith('photo_')) { clearInterval(holdHerPose.iv); holdHerPose.iv = 0; return }
    const e = (performance.now() - ACT.t0) / 1000; if (e > 1.2) ACT.t0 = performance.now() - 0.5 * 1000 }, 250) // stay inside the full-weight band (16%..78%)
}
export function releaseHerPose() { ACT.hold = false; if (ACT.kind && ACT.kind.startsWith('photo_')) ACT.kind = null }
