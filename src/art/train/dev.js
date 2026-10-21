// Dev / perf harness only (tiny-planet-perf/art-c/tr.mjs): mounts stations + carriage skin into the live scene without
// React, and seats her for the ride. Not imported by the app.
import { TRAIN, TRAIN_STOPS } from '../../world/village.js'
import { planetRef } from '../../common.jsx'
import { createStations } from './station.js'
import { applyTrainSkin, RIDE_SEAT } from './carriage.js'
import { holdRidePose } from './ridePose.js'
import { isTouchTier } from '../season/hooks.js'
import { fallbackPlatformN } from './Stations.jsx'
export async function mountTrainDev(scene, { stations = true, skin = true } = {}) {
  const touch = isTouchTier(), parent = planetRef.current || scene, out = { info: {} }
  let st = null, sk = null
  if (stations) { st = createStations(TRAIN_STOPS, (window.__sc && window.__sc.platformN) || fallbackPlatformN, { touch }); parent.add(st); out.info.stationTris = st.userData.tris }
  if (skin) { for (let i = 0; i < 50 && !(TRAIN.cars && TRAIN.cars.every(Boolean)); i++) await new Promise(r => setTimeout(r, 100)); sk = applyTrainSkin(TRAIN.cars, { touch }); out.info.skin = { tris: sk.tris, calls: sk.calls } }
  out.enable = (b) => { if (st) st.visible = b; if (sk) { if (b && !sk.on) { sk = applyTrainSkin(TRAIN.cars, { touch }); sk.on = true } else if (!b) { sk.restore(); sk.on = false } } }
  if (sk) sk.on = true
  return out
}
/** seat her on the open car (uses Codor's RIDE: car + seat lift) and hold the ride pose */
export async function mountRideDev({ overlay = true } = {}) {
  const RIDE = window.__scRide; if (RIDE) { RIDE.car = RIDE_SEAT.car; RIDE.seat = RIDE_SEAT.lift } holdRidePose()
  if (!overlay || !RIDE) return
  const [{ createElement }, { createRoot }, { RideOverlay }] = await Promise.all([import('react'), import('react-dom/client'), import('../../ui/ride/RideOverlay.jsx')])
  const st = document.createElement('style'); st.textContent = '.tpc-ride{display:none!important}'; document.head.appendChild(st)
  const el = document.createElement('div'); document.body.appendChild(el); const root = createRoot(el), SC = window.__sc
  const draw = () => root.render(createElement(RideOverlay, { from: RIDE.from || 'village', to: RIDE.to || 'forest', progress: window.__rideP ?? RIDE.progress, cost: window.__rideCost ?? 0, dwelling: !!(SC && SC.TS.stop), canAlight: !!(SC && SC.TS.stop), onAlight: () => SC && SC.alight() }))
  draw(); setInterval(draw, 400)
}
/** dev camera for screenshots: look at a planet-local point from (a = azimuth around up, d = distance, h = height) */
export async function devCam(kind, { a = 0.6, d = 1.2, h = 0.45, lookH = 0.15, id = 'village' } = {}) {
  const THREE = await import('three'), { HOME } = await import('../../home/state.js')
  if (!kind) { HOME.camOverride = null; return }
  const P = window.__player
  HOME.camOverride = (camera, g) => {
    let p, up, fw
    if (kind === 'her') { p = P.pos ? P.pos.clone() : P.n.clone().multiplyScalar(10.4); up = P.n.clone().normalize() }
    else if (kind === 'car') { const c = TRAIN.cars[RIDE_SEAT.car] || TRAIN.cars[0]; p = c.position.clone(); up = c.position.clone().normalize() }
    else { const n = ((window.__sc && window.__sc.platformN) || fallbackPlatformN)(id).normalize(); p = n.clone().multiplyScalar(10.4); up = n }
    const east = new THREE.Vector3(0, 1, 0).cross(up).normalize(); fw = up.clone().cross(east).normalize()
    const c = p.clone().addScaledVector(east, Math.cos(a) * d).addScaledVector(fw, Math.sin(a) * d).addScaledVector(up, h)
    camera.position.copy(c.applyMatrix4(g.matrixWorld)); camera.up.copy(up).transformDirection(g.matrixWorld); camera.lookAt(p.addScaledVector(up, lookH).applyMatrix4(g.matrixWorld)); return true }
}
