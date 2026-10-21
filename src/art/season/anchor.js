// default anchor for Drift / Rain: her world position + up (window.__player, kept by App.jsx). null = hide
// (orbit / zone views, indoors, or no player yet).
import { VIEW } from '../../common.jsx'
import { ZONES, R } from '../../world.js'
import { isTouchTier } from './hooks.js'
export function defaultAnchor() {
  if (typeof window === 'undefined') return null
  const P = window.__player, H = window.__home
  if (!P || !P.wPos || P.wPos.lengthSq() < 1) return null
  if ((H && H.inside) || (VIEW.mode !== 'follow' && VIEW.mode !== 'detail')) return null
  return { p: P.wPos, up: P.wUp && P.wUp.lengthSq() > 0.5 ? P.wUp : P.wPos }
}
// Drift's anchor: as above, but off in the forest on desktop (Codor: desktop forest view sits at 497/500 draw calls,
// no regressions). Touch keeps it (mobile.forest has its own 400-call cap).
const inForest = (n) => { for (const z of [ZONES.forest, ZONES.giant]) if (z && Math.acos(Math.max(-1, Math.min(1, (n.x * z.x + n.y * z.y + n.z * z.z) / (n.length() || 1)))) < (z.r || 0) + 1.5 / R) return true; return false }
export function driftAnchor() {
  const a = defaultAnchor(); if (!a) return null
  const P = window.__player
  if (!isTouchTier() && P && P.n && inForest(P.n)) return null
  return a
}
