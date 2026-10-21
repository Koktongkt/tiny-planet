// default anchor for Drift / Rain: her world position + up (window.__player, kept by App.jsx). null = hide
// (orbit / zone views, indoors, or no player yet).
import { VIEW } from '../../common.jsx'
export function defaultAnchor() {
  if (typeof window === 'undefined') return null
  const P = window.__player, H = window.__home
  if (!P || !P.wPos || P.wPos.lengthSq() < 1) return null
  if ((H && H.inside) || (VIEW.mode !== 'follow' && VIEW.mode !== 'detail')) return null
  return { p: P.wPos, up: P.wUp && P.wUp.lengthSq() > 0.5 ? P.wUp : P.wPos }
}
