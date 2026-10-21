// <TrainSkin /> (Stage C, art-c) — dresses zones.jsx's Train (TRAIN.cars) with the new carriages; mount anywhere (lazy).
// Waits for TRAIN.cars, applies once, restores the old coaches on unmount. Optional `riding` holds her ride_sit pose.
import { useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { TRAIN } from '../../world/village.js'
import { applyTrainSkin } from './carriage.js'
import { carMaterials } from './mats.js'
import { holdRidePose, releaseRidePose } from './ridePose.js'
import { isTouchTier } from '../season/hooks.js'
const ST = { skin: null }
export function TrainSkin({ riding = false }) {
  useFrame(() => { if (!ST.skin && TRAIN.cars && TRAIN.cars.length > 1 && TRAIN.cars.every(Boolean)) ST.skin = applyTrainSkin(TRAIN.cars, carMaterials(), { touch: isTouchTier() }) })
  useEffect(() => () => { if (ST.skin) { ST.skin.restore(); ST.skin = null } }, [])
  useEffect(() => { if (riding) { holdRidePose(); return releaseRidePose } }, [riding])
  return null
}
export default TrainSkin
