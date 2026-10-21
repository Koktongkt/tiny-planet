// <HeartsBadge hearts={number} max={5} /> — hand-inked hearts that fill with a watercolour wash (Stage B contract).
// Renders floor(hearts) full hearts. Optional (not in the contract): size, label, showProgress (faint wash on the next
// heart for the fractional part), pulse (index of a heart that just filled -> little bounce).
import React from 'react'
import './gifts.css'
export const HEART_D = 'M16 27.5 C7 21 2.6 15.2 3 9.8 C3.4 5.2 6.8 2.8 10.4 3 C13.2 3.2 15 5.1 16 7.4 C17 5.1 18.8 3.2 21.6 3 C25.2 2.8 28.6 5.2 29 9.8 C29.4 15.2 25 21 16 27.5Z'
export function HeartDefs() {
  return <svg className="tpg-defs" width="0" height="0" aria-hidden focusable="false"><defs>
    <clipPath id="tpg-clip" clipPathUnits="userSpaceOnUse"><path d={HEART_D} /></clipPath>
    <radialGradient id="tpg-wash" cx="38%" cy="34%" r="75%"><stop offset="0" stopColor="#ff9fae" /><stop offset=".55" stopColor="#ec6f80" /><stop offset="1" stopColor="#c94a62" /></radialGradient>
    <filter id="tpg-bleed" x="-15%" y="-15%" width="130%" height="130%"><feTurbulence type="fractalNoise" baseFrequency="0.09" numOctaves="3" seed="4" /><feDisplacementMap in="SourceGraphic" scale="3.2" /></filter>
    <filter id="tpg-grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.6" numOctaves="2" seed="11" result="n" /><feColorMatrix in="n" values="0 0 0 0 .3  0 0 0 0 .05  0 0 0 0 .1  0 0 0 .5 0" result="g" /><feComposite in="g" in2="SourceGraphic" operator="in" /></filter>
    <filter id="tpg-ink" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" seed="7" /><feDisplacementMap in="SourceGraphic" scale="1.3" /></filter>
  </defs></svg>
}
export function Heart({ fill = 0, size = 24, tilt = 0, pulse = false }) {
  const h = Math.max(0, Math.min(1, fill)), y = 28 - 25.5 * h
  return <svg className={'tpg-heart' + (h >= 1 ? ' full' : '') + (pulse ? ' pulse' : '')} viewBox="0 0 32 30" width={size} height={size * 30 / 32} style={{ transform: `rotate(${tilt}deg)` }} aria-hidden>
    <path d={HEART_D} fill="#fbf3e4" />
    {h > 0 && <g clipPath="url(#tpg-clip)">
      <g filter="url(#tpg-bleed)"><rect className="lvl" x="-2" y={y} width="36" height={32 - y} fill="url(#tpg-wash)" opacity={h >= 1 ? 1 : 0.38} />
        {h >= 1 && <path d="M2 18 Q9 15 16 19 T31 17 L31 31 L2 31Z" fill="#c94a62" opacity=".28" />}</g>
      <rect x="0" y="0" width="32" height="30" filter="url(#tpg-grain)" fill="#fff" opacity={h >= 1 ? 0.9 : 0.5} />
    </g>}
    <g filter="url(#tpg-ink)"><path d={HEART_D} fill="none" stroke="#3b2f22" strokeWidth="2.1" strokeLinejoin="round" />
      {h >= 1 && <path d="M8 8.5 Q9.6 6.4 12 6.6" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" opacity=".85" />}</g>
  </svg>
}
const TILT = [-6, 3, -2, 5, -4, 2, -3]
export function HeartsBadge({ hearts = 0, max = 5, size = 24, label, showProgress = false, pulse = -1, className = '' }) {
  const full = Math.max(0, Math.min(max, Math.floor(hearts))), frac = showProgress ? hearts - full : 0
  return <span className={'tpg-hearts ' + className} role="img" aria-label={`${full} of ${max} hearts`}>
    <HeartDefs />
    {label && <span className="tpg-hl">{label}</span>}
    {Array.from({ length: max }, (_, i) => <Heart key={i} size={size} tilt={TILT[i % TILT.length]} fill={i < full ? 1 : i === full ? frac : 0} pulse={i === pulse} />)}
  </span>
}
export default HeartsBadge
