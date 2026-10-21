// Stage C train art (art-c) — lazy entry. Stations, carriage skin, ride pose (registers POSES.ride_sit on import).
export { Stations, fallbackPlatformN } from './Stations.jsx'
export { TrainSkin } from './TrainSkin.jsx'
export { createStations, buildStationGeometry, STATION_NAMES, platformFrame } from './station.js'
export { applyTrainSkin, buildCoachGeometry, buildOpenCarGeometry, RIDE_SEAT } from './carriage.js'
export { rideSit, holdRidePose, releaseRidePose } from './ridePose.js'
