// DRAFT — studio / lineup previews of the chibi cast. The game does not render this chunk: Grandma Fuku ships through
// App.jsx (ChibiFuku); Professor Hoshino is still a draft, dev preview only with ?dev=chibi-drafts (see drafts.js).
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
