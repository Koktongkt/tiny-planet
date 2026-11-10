// Which post passes run. The composer already multisamples, so the canvas antialias flag stays off
// except ?fx=full, which puts the old touch stack back (bloom + noise + canvas AA) for A/B.
// Touch drops the film-grain pass always. Bloom stays at night only: lamps and windows halo, and
// daylight scenes sit under the luminance threshold so the mip blur pass is pure cost there.
const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t) }

export function nightFromPhase(a) {
  return 1 - ss(-0.35, 0.05, Math.cos(a)) > 0.5
}

export function fxPasses({ touch, fx, night }) {
  const full = !touch || fx === 'full'
  return {
    antialias: !!(touch && fx === 'full'),
    bloom: full || !!night,
    noise: full,
    vignette: true,
    multisampling: touch ? 2 : 4,
  }
}
