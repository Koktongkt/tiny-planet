// Her train-ride pose (Stage C, art-c). Importing registers POSES.ride_sit into act.js (her rig calls POSES[kind]).
// Seated on the open car's bench facing forward: knees up, hands resting on her lap, a slow sway with the carriage and
// now and then a look out to the side. holdRidePose() / releaseRidePose() keep act.js's ACT on it while riding.
import { ACT, POSES } from '../../act.js'
export function rideSit(B, mix, st, t, w) {
  B.root.position.y -= 0.11 * w
  for (const k of ['L', 'R']) { mix(B['th' + k], 'x', -1.5); mix(B['sh' + k + 'n'], 'x', 1.4); mix(B['ft' + k], 'x', 0.1) }
  mix(B.thL, 'z', -0.08); mix(B.thR, 'z', 0.08)
  const sway = Math.sin(t * 2.1) * 0.035 + Math.sin(t * 5.3) * 0.01 // carriage rock
  mix(B.chest, 'z', sway); mix(B.chest, 'x', 0.06)
  const look = Math.sin(t * 0.23) > 0.55 ? 0.55 : 0 // glances out at the view
  mix(B.head, 'y', look); mix(B.head, 'z', 0.08 - sway * 0.6); mix(B.head, 'x', -0.05)
  for (const [k, sd] of [['L', -1], ['R', 1]]) { mix(B['up' + k], 'x', -0.55); mix(B['up' + k], 'z', sd * 0.12); mix(B['fo' + k], 'x', -0.95) }
}
POSES.ride_sit = rideSit
export function holdRidePose() {
  ACT.kind = 'ride_sit'; ACT.dur = 2; ACT.t0 = performance.now(); ACT.lock = 1e9; ACT.spark = null; ACT.hold = true
  if (!holdRidePose.iv) holdRidePose.iv = setInterval(() => { if (!ACT.hold || ACT.kind !== 'ride_sit') { clearInterval(holdRidePose.iv); holdRidePose.iv = 0; return }
    if ((performance.now() - ACT.t0) / 1000 > 1.2) ACT.t0 = performance.now() - 500 }, 250)
}
export function releaseRidePose() { if (ACT.kind === 'ride_sit') { ACT.hold = false; ACT.kind = null; ACT.lock = 0 } }
