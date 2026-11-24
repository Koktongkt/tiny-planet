// Lazy entry for the two new chibi villagers. Walker / Studio / Lineup import only this module.
import React from 'react'
import { ChibiFuku } from './ChibiFuku.jsx'
import { ChibiHoshino } from './ChibiHoshino.jsx'

export { ChibiFuku, ChibiHoshino }
const MAP = { grandma: ChibiFuku, scholar: ChibiHoshino, fuku: ChibiFuku, hoshino: ChibiHoshino }

export function ChibiVillager({ name, st, scale = 0.8, res }) {
  const C = MAP[name]
  return C ? <C st={st} scale={scale} res={res} /> : null
}
export default ChibiVillager
