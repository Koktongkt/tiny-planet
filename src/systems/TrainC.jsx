// Stage C train art (lazy chunk from WorldC): Studio's two stations, the carriage skin (her open observation car + ride_sit
// pose while riding) and the seat calibration. Train audio is wired inside the audio chunk (zones.js reads TRAIN / __scRide).
import React from 'react'
import { Stations, TrainSkin, RIDE_SEAT } from '../art/train/index.js'
import { RIDE, platformN } from './liveC.js'
RIDE.car = RIDE_SEAT.car; RIDE.seat = RIDE_SEAT.lift // her seat on the open car (liveC's 0.09 default floated her above the bench)
export default function TrainC({ riding }) { return <><Stations platformN={platformN} /><TrainSkin riding={riding} /></> }
