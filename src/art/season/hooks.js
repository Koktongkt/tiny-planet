// Stage C seasons + weather (art-c): defensive reads of the hooks that Codor's systems/weather.js applyTo(T, phase) writes
// onto the shared day state T (common.jsx, = window.__T) every clock tick:
//   T.season  'spring'|'summer'|'autumn'|'winter'      (default 'spring')
//   T.seasonW [sp, su, au, wi] blend weights (sum 1; the last day of a season cross-fades into the next).
//             Also accepted: missing (= one-hot on T.season) or a legacy 0..1 scalar (= weight INTO T.season from the previous one)
//   T.kind    'clear'|'rain'                           (default 'clear')
//   T.rain    0..1 rain intensity                      (default 1 if kind==='rain' else 0)
//   T.wet     0..1 ground wetness (lags rain, dries over 3 h)   (default = rain)
// Plus T.day / T.dusk / T.night / T.sun that the Clock already writes. Shared GPU uniforms live here (one set for all
// patched materials, Drift, Rain, Puddles), updated at most once per frame by tickWeather().
import * as THREE from 'three'
import { wind } from '../../world.js'
import { SEASONS, applyTo } from '../../systems/weather.js'
export const SEASON_IDS = SEASONS
const clamp = (x) => (x < 0 ? 0 : x > 1 ? 1 : x)
const num = (v, d) => (typeof v === 'number' && isFinite(v) ? v : d)
const TT = () => (typeof window !== 'undefined' && window.__T) || {}

/** read the hooks with defaults; never throws. `out` is reused when given; out.sw = [sp, su, au, wi] (sums to 1) */
export function readWeather(out = {}, t = TT()) {
  out.season = SEASON_IDS.includes(t.season) ? t.season : 'spring'
  out.sw = hookWeights(out.season, t.seasonW, out.sw || [0, 0, 0, 0])
  out.kind = t.kind === 'rain' ? 'rain' : 'clear'
  out.rain = clamp(num(t.rain, out.kind === 'rain' ? 1 : 0))
  out.wet = clamp(num(t.wet, out.rain))
  out.day = clamp(num(t.day, 1)); out.dusk = clamp(num(t.dusk, 0)); out.night = clamp(num(t.night, 0))
  return out
}
/** T.seasonW (4 weights from weather.js seasonWeights, or legacy scalar / missing) -> normalised [sp, su, au, wi] */
export function hookWeights(season, sw, out = [0, 0, 0, 0]) {
  const i = Math.max(0, SEASON_IDS.indexOf(season))
  if (sw && sw.length === 4) {
    let sum = 0; for (let k = 0; k < 4; k++) { out[k] = clamp(num(sw[k], 0)); sum += out[k] }
    if (sum > 1e-4) { for (let k = 0; k < 4; k++) out[k] /= sum; return out }
  }
  const w = clamp(num(sw, 1)), p = (i + 3) % 4
  out[0] = out[1] = out[2] = out[3] = 0; out[i] = w; out[p] += 1 - w; return out
}
/** preview / tests: write fake hooks onto window.__T (merged). A bare `season` gets one-hot T.seasonW like weather.js */
export function stubWeather(o = {}) {
  if (typeof window === 'undefined') return
  const T = window.__T = window.__T || {}
  if (o.season && !('seasonW' in o)) { const w = T.seasonW && T.seasonW.length === 4 ? T.seasonW : (T.seasonW = [0, 0, 0, 0]); w.fill(0); w[Math.max(0, SEASON_IDS.indexOf(o.season))] = 1 }
  Object.assign(T, o); if (o.kind && !('rain' in o)) T.rain = o.kind === 'rain' ? 1 : 0
}
/** preview: drive the hooks from a clock phase exactly like the game (weather.js applyTo) */
export const stubWeatherAt = (phase) => { if (typeof window !== 'undefined') applyTo(window.__T = window.__T || {}, phase) }

// ---- shared uniforms ----
export const SU = {
  uTime: wind.time,
  uSeason: { value: new THREE.Vector4(1, 0, 0, 0) }, // spring, summer, autumn, winter
  uSnow: { value: 0 }, // winter cover 0..1 (eases in over a few seconds)
  uWet: { value: 0 }, uRain: { value: 0 },
  uSunV: { value: new THREE.Vector3(0, 1, 0) }, // sun direction, view space
  uSky: { value: new THREE.Color('#bfdcef') }, // sky colour near the horizon (puddle / wet sheen reflections)
  uSDay: { value: 1 }, uNight: { value: 0 },
  uPC: { value: new THREE.Vector3() }, // planet centre, world space
}
const W = { sw: [0, 0, 0, 0] }, _s = new THREE.Vector3(), cDay = new THREE.Color('#cfe6f5'), cDusk = new THREE.Color('#f6b79a'), cNight = new THREE.Color('#33406e'), cRain = new THREE.Color('#c4d3dc')
let lastT = -1, lastCam = null
/** update SU from the hooks (+ camera for view-space sun). Safe to call from several components: runs once per frame */
export function tickWeather(camera, dt = 1 / 60) {
  const t = wind.time.value; if (t === lastT && camera === lastCam) return W; lastT = t; lastCam = camera
  readWeather(W); const _w = W.sw
  const k = Math.min(1, dt * 1.5), u = SU.uSeason.value
  u.set(u.x + (_w[0] - u.x) * k, u.y + (_w[1] - u.y) * k, u.z + (_w[2] - u.z) * k, u.w + (_w[3] - u.w) * k)
  SU.uSnow.value += (u.w - SU.uSnow.value) * k
  SU.uWet.value += (W.wet - SU.uWet.value) * Math.min(1, dt * 2); SU.uRain.value += (W.rain - SU.uRain.value) * Math.min(1, dt * 2)
  SU.uSDay.value = W.day; SU.uNight.value = W.night
  const T = TT(); if (camera && T.sun) { _s.copy(T.sun).transformDirection(camera.matrixWorldInverse); SU.uSunV.value.copy(_s) }
  SU.uSky.value.copy(cDay).lerp(cDusk, W.dusk * 0.8).lerp(cNight, W.night).lerp(cRain, W.rain * 0.45 * (1 - W.night))
  return W
}
/** jump straight to the hook values (no easing) — previews / screenshots */
export function snapWeather(camera) { lastT = -1; tickWeather(camera, 100); return W }
export const isTouchTier = () => typeof document !== 'undefined' && document.documentElement.classList.contains('tp-touch')
