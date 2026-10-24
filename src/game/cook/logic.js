// Pure cooking rules: recipe → step, the four step sims, perfect vs normal. No DOM.
// A perfect play is the only way to a perfect dish. Skip and Auto-cook are always the normal dish.

export const STEP_IDS = ['stir', 'flip', 'press', 'pour']
const DUR = { stir: 3.6, flip: 3.4, press: 3.8, pour: 3.5 }
const CALM = 1.6
const FULL_REVS = 2.4
export const STIR_RATE = [0.22, 0.45] // fill per second. The middle of this band is a calm stir.
const SPACE_FILL = 0.32 // holding Space fills at this rate, inside the perfect band
export const FLIP_GOLD = [0.42, 0.62]
export const POUR = { line: 0.72, band: 0.08, rate: 0.28 }

export function stepFor(recipe) {
  const s = recipe && recipe.cook
  return STEP_IDS.includes(s) ? s : 'stir'
}
export function stepDur(step, calm) {
  const b = DUR[step] || DUR.stir
  return calm ? Math.round(b * CALM * 100) / 100 : b
}
export function calmMotion() {
  try {
    if (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches) return true
  } catch (e) {}
  return false
}

export function scoreStir({ fill, rate, bubbled }) {
  const perfect = fill >= 1 && !bubbled && rate >= STIR_RATE[0] && rate <= STIR_RATE[1]
  return { perfect, ok: true, fill, rate }
}
export function scoreFlip(progress) {
  const perfect = progress >= FLIP_GOLD[0] && progress <= FLIP_GOLD[1]
  return { perfect, ok: true, progress }
}
export function scorePress(hits) {
  const landed = hits.filter(Boolean).length
  return { perfect: hits.length === 3 && landed === 3, ok: true, landed }
}
export function scorePour(level) {
  const perfect = Math.abs(level - POUR.line) <= POUR.band
  return { perfect, ok: true, level }
}

export function perfectId(id) { return id + '_perfect' }
export function resolveCook(recipe, { perfect, via }) {
  const go = !!perfect && via === 'play'
  const makes = recipe.makes
  return { item: go ? perfectId(makes) : makes, perfect: go, via }
}

export function pressMarks(dur) {
  return { at: [0.22, 0.5, 0.78].map(u => u * dur), window: dur * 0.06 }
}

export function createStep(kind, calm) {
  const dur = stepDur(kind, !!calm)
  if (kind === 'flip') return { kind, t: 0, dur, progress: 0, gold: false, flipped: null, done: false, score: null }
  if (kind === 'press') return { kind, t: 0, dur, marks: pressMarks(dur), hits: [false, false, false], seen: [false, false, false], hot: false, hotI: -1, landed: 0, done: false, score: null }
  if (kind === 'pour') return { kind, t: 0, dur, level: 0, band: false, rate: calm ? POUR.rate / CALM : POUR.rate, done: false, score: null }
  return { kind: 'stir', t: 0, dur, revs: 0, fill: 0, bubble: 0, rate: 0, done: false, score: null }
}

export function tickStir(s, dt, input) {
  if (s.done) return s
  s.revs += (input.dRevs || 0) + (input.space ? SPACE_FILL * FULL_REVS * dt : 0)
  s.t += dt
  s.fill = Math.min(1, s.revs / FULL_REVS)
  s.bubble = Math.min(1, s.t / s.dur)
  s.rate = s.fill / Math.max(0.25, s.t)
  if (s.fill >= 1 || s.bubble >= 1) {
    s.done = true
    s.score = scoreStir({ fill: s.fill, rate: s.rate, bubbled: s.bubble >= 1 && s.fill < 1 })
  }
  return s
}
export function tickFlip(s, dt, input) {
  if (s.done) return s
  s.t += dt
  if (input.tap && s.flipped == null) s.flipped = Math.min(1, s.t / s.dur)
  s.progress = s.flipped != null ? s.flipped : Math.min(1, s.t / s.dur)
  s.gold = s.flipped == null && s.progress >= FLIP_GOLD[0] && s.progress <= FLIP_GOLD[1]
  if (s.flipped != null || s.t >= s.dur) {
    s.done = true
    s.score = scoreFlip(s.flipped != null ? s.flipped : 1)
    s.gold = false
  }
  return s
}
export function tickPress(s, dt, input) {
  if (s.done) return s
  s.t += dt
  const { at, window } = s.marks
  let hot = false, hotI = -1
  for (let i = 0; i < 3; i++) {
    if (s.seen[i]) continue
    if (Math.abs(s.t - at[i]) <= window) { hot = true; hotI = i; break }
    if (s.t > at[i] + window) s.seen[i] = true
  }
  if (input.tap && hotI >= 0) { s.hits[hotI] = true; s.seen[hotI] = true; hot = false; hotI = -1 }
  s.hot = hot
  s.hotI = hotI
  s.landed = s.hits.filter(Boolean).length
  if (s.seen.every(Boolean) || s.t >= s.dur) {
    s.done = true
    s.hot = false
    s.score = scorePress(s.hits)
  }
  return s
}
export function tickPour(s, dt, input) {
  if (s.done) return s
  s.t += dt
  if (input.hold) s.level = Math.min(1, s.level + s.rate * dt)
  s.band = Math.abs(s.level - POUR.line) <= POUR.band && s.level > 0.2
  if (input.release || s.t >= s.dur) {
    s.done = true
    s.score = scorePour(s.level)
  }
  return s
}
export function tickStep(s, dt, input) {
  if (s.kind === 'flip') return tickFlip(s, dt, input)
  if (s.kind === 'press') return tickPress(s, dt, input)
  if (s.kind === 'pour') return tickPour(s, dt, input)
  return tickStir(s, dt, input)
}
