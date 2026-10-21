// Dev / perf harness only (tiny-planet-perf/art-c/wx.mjs): mounts the Stage C layer into the live game scene from the
// console without React. Not imported by anything in the app.
export * from './index.js'
import { createDrift } from './drift.js'
import { createRain } from '../weather/rain.js'
import { createPuddles, puddleSpots } from '../weather/puddles.js'
import { tickWeather, isTouchTier, SU } from './hooks.js'
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
