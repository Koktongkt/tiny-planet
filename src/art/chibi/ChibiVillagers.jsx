// DRAFT — Grandma Fuku and Professor Hoshino chibi looks. The game does not render this chunk.
// Dev preview only, and only with ?dev=chibi-drafts (see src/art/chibi/drafts.js).
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
