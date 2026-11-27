// DRAFT — Grandma Fuku, Professor Hoshino Grandpa Ishi and Kiko chibi looks. The game does not render this chunk.
// Dev preview only, and only with ?dev=chibi-drafts (see src/art/chibi/drafts.js).
import React from 'react'
import { ChibiFuku } from './ChibiFuku.jsx'
import { ChibiHoshino } from './ChibiHoshino.jsx'
import { ChibiIshi } from './ChibiIshi.jsx'

import { ChibiKiko } from './ChibiKiko.jsx'

export { ChibiFuku, ChibiHoshino, ChibiIshi, ChibiKiko }
const MAP = { grandma: ChibiFuku, scholar: ChibiHoshino, fuku: ChibiFuku, hoshino: ChibiHoshino, grandpa: ChibiIshi, ishi: ChibiIshi, baker: ChibiKiko, kiko: ChibiKiko }

export function ChibiVillager({ name, st, scale = 0.8, res }) {
  const C = MAP[name]
  return C ? <C st={st} scale={scale} res={res} /> : null
}
export default ChibiVillager
