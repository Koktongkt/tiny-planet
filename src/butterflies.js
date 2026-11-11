// Butterflies rest at night. The pose is a function of the wind clock, so skipping
// the frames they are hidden does not leave them behind: dawn samples the clock again.
export const BUTTERFLY_NIGHT = 0.6

export function butterfliesAwake(night) {
  return night < BUTTERFLY_NIGHT
}

export function butterflyAngle(time, phase) {
  return time * 0.35 + phase
}

export function butterflyFrame(night, wasAwake) {
  const awake = butterfliesAwake(night)
  if (!awake) return { update: false, visible: false, awake: false, resume: false }
  return { update: true, visible: true, awake: true, resume: !wasAwake }
}
