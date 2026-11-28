// DRAFT — studio / lineup previews of the chibi cast (Fuku, Hoshino, Ishi). The game does not render this chunk: Fuku
// and Ishi ship through App.jsx; Professor Hoshino is still a draft, dev preview only with ?dev=chibi-drafts (see drafts.js).
import React from 'react'
import { ChibiFuku } from './ChibiFuku.jsx'
import { ChibiHoshino } from './ChibiHoshino.jsx'
import { ChibiIshi } from './ChibiIshi.jsx'

export { ChibiFuku, ChibiHoshino, ChibiIshi }
const MAP = { grandma: ChibiFuku, scholar: ChibiHoshino, fuku: ChibiFuku, hoshino: ChibiHoshino, grandpa: ChibiIshi, ishi: ChibiIshi }

export function ChibiVillager({ name, st, scale = 0.8, res }) {
  const C = MAP[name]
  return C ? <C st={st} scale={scale} res={res} /> : null
}
export default ChibiVillager
