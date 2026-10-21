// Dev / perf harness only (tiny-planet-perf/art-c/wx.mjs): mounts the Stage C layer into the live game scene from the
// console without React. Not imported by anything in the app.
export * from './index.js'
import { createDrift } from './drift.js'
import { createRain } from '../weather/rain.js'
import { createPuddles, puddleSpots } from '../weather/puddles.js'
import { tickWeather, snapWeather, isTouchTier, SU, stubWeatherAt, stubWeather, SEASON_IDS } from './hooks.js'
import { SEASON_DAYS, TAU, isRainDay, rainWindow, weatherAt } from '../../systems/weather.js'
import { defaultAnchor } from './anchor.js'
import { planetRef } from '../../common.jsx'
import { VILLAGE } from '../../world/village.js'
export { puddleSpots, SU }
export function mountWeatherDev(scene, { gl, camera, drift = true, rain = true, puddles = true, spots, anchor } = {}) {
  const parts = [], t = isTouchTier()
  if (drift) { const d = createDrift({ count: t ? 350 : 700 }); scene.add(d.object); parts.push(d) }
  if (rain) { const r = createRain({ count: t ? 900 : 2000 }); scene.add(r.object); parts.push(r) }
  let pz = null
  if (puddles) { const sp = spots || puddleSpots({ near: VILLAGE, count: 18 }); pz = createPuddles(sp); pz.spots = sp; (planetRef.current || scene).add(pz.object); parts.push(pz) }
  let last = performance.now(), live = true
  const loop = () => { if (!live) return; const now = performance.now(), dt = Math.min(0.1, (now - last) / 1000); last = now
    tickWeather(camera, dt); const a = anchor ? anchor() : defaultAnchor(); for (const p of parts) p.update(a, camera, gl); requestAnimationFrame(loop) }
  requestAnimationFrame(loop)
  window.__wxSpots = pz ? pz.spots : []
  return { puddles: pz ? pz.object.count : 0, dispose() { live = false; for (const p of parts) p.object.removeFromParent() } }
}

const PRESET = { day: 0.35, dusk: 1.72, night: 3.0 }
/** a clock phase (rot.a) whose weather.js hooks give `season` (+ rain or clear) at the time of day `tod` */
export function phaseFor({ season = 'spring', rain = false, tod = 'day' } = {}) {
  const si = Math.max(0, SEASON_IDS.indexOf(season)), a0 = PRESET[tod] ?? PRESET.day, u0 = (a0 + Math.PI / 2) / TAU
  for (let cyc = 0; cyc < 40; cyc++) for (let k = 0; k < SEASON_DAYS - 1; k++) {
    const day = (cyc * 4 + si) * SEASON_DAYS + k
    if (!rain) { if (!isRainDay(day) && !isRainDay(day - 1)) return a0 + day * TAU; continue }
    if (!isRainDay(day)) continue
    const [s, e] = rainWindow(day), h = u0 * 24
    if (tod === 'day' && (h < s + 1.6 || h > e - 1)) { const hm = Math.max(s + 1.6, Math.min(e - 1, h)); return (hm / 24) * TAU - Math.PI / 2 + day * TAU }
    const w = weatherAt(day, u0); if (w.rain > 0.9 && w.wet > 0.9) return a0 + day * TAU
  }
  return a0
}
/** harness: set the real clock so weather.js produces this weather; falls back to plain stubs off-game */
export function setWeatherDev(o = {}, camera) {
  const a = o.phase ?? phaseFor({ season: o.season, rain: o.kind === 'rain' || o.rain > 0, tod: o.tod })
  if (window.__setPhase) window.__setPhase(a); stubWeatherAt(a)
  if (o.force) stubWeather(o.force) // explicit overrides (only stick until the next 10 Hz liveC tick unless liveC is absent)
  if (camera) snapWeather(camera)
  return { a, T: { season: window.__T.season, seasonW: [...window.__T.seasonW], kind: window.__T.kind, rain: window.__T.rain, wet: window.__T.wet } }
}
