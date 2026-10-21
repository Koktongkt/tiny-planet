// <Stations stops? platformN? /> (Stage C, art-c) — both platforms; mount inside the planet group (lazy).
// Defaults: TRAIN_STOPS (world/village.js) and Codor's platformN (systems/liveC.js via window.__sc) with the same formula
// as a fallback, so the preview works without the game.
import React, { useEffect, useMemo } from 'react'
import { TRAIN_STOPS } from '../../world/village.js'
import { R, TRAIN_LAT, dir } from '../../world.js'
import { createStations } from './station.js'
import { stationMaterials } from './mats.js'
import { isTouchTier } from '../season/hooks.js'
export const fallbackPlatformN = (id) => { const s = TRAIN_STOPS.find(x => x.id === id); return dir(TRAIN_LAT + 0.3 / R, s.lon) }
export function Stations({ stops = TRAIN_STOPS, platformN }) {
  const g = useMemo(() => createStations(stops, platformN || (window.__sc && window.__sc.platformN) || fallbackPlatformN, stationMaterials(), { touch: isTouchTier() }), [stops, platformN])
  useEffect(() => () => g.traverse(o => { if (o.isMesh && o.geometry && o.geometry.userData.own) o.geometry.dispose() }), [g])
  return <primitive object={g} />
}
export default Stations
