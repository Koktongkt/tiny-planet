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
export function mountRideDev() { const RIDE = window.__scRide; if (RIDE) { RIDE.car = RIDE_SEAT.car; RIDE.seat = RIDE_SEAT.lift } holdRidePose() }
