// <RideOverlay from to progress onAlight cost? canAlight? dwelling? /> (Stage C, art-c) — the parchment ride card.
// Non-blocking (only the card takes pointer events). Desktop: top-centre ticket; mobile (≤640px): bottom sheet.
// from/to = stop ids ('village'|'forest'), progress 0..1 (TS.progress), cost = fare paid (0 first ride, then 1).
import React from 'react'
import '../../art/parchment.css'
import './ride.css'
import { stopName, fareText, rideStatus } from './fareText.js'
const Stamp = ({ id, here }) => { const s = stopName(id); return <div className={'rd-stop' + (here ? ' here' : '')}><b>{s.name}</b><small>{s.sub}</small></div> }
const Loco = () => <svg viewBox="0 0 40 22" aria-hidden><path d="M3 17h34M6 17V8h10v9M16 17V5h8v12M24 17V10h10v7" /><rect x="7" y="9" width="7" height="5" rx="1" className="w" /><circle cx="10" cy="18.5" r="2.4" /><circle cx="20" cy="18.5" r="2.4" /><circle cx="30" cy="18.5" r="2.4" /><path d="M19 5c0-2 2-4 5-4" className="s" /></svg>
export function RideOverlay({ from, to, progress = 0, onAlight, cost = 0, canAlight = true, dwelling = false }) {
  const p = Math.max(0, Math.min(1, +progress || 0))
  return (
    <div className="tpx rd-wrap" role="status" aria-live="polite">
      <div className="tpx-paper rd-card">
        <div className="rd-row">
          <Stamp id={from} here={p < 0.02} />
          <div className="rd-line" aria-label={`Journey ${Math.round(p * 100)}%`}>
            <i className="rd-dots" /><i className="rd-done" style={{ width: p * 100 + '%' }} />
            <span className="rd-train" style={{ left: p * 100 + '%' }}><Loco /></span>
          </div>
          <Stamp id={to} here={p > 0.98} />
        </div>
        <div className="rd-foot">
          <span className="rd-fare"><i className="rd-coin" />{fareText(cost)}</span>
          <span className="rd-stat">{rideStatus(p, dwelling)}</span>
          <button className="tpx-btn go rd-btn" disabled={!canAlight} onClick={onAlight}>Alight</button>
        </div>
      </div>
    </div>)
}
export default RideOverlay
