// Fish icons for the 12 Stage C species (art-c), same recipe as game/icons.jsx: watercolour wash, flat fills, warm ink
// outline, one white highlight, the shared wobble filter. Shapes are generated from the same FISH_ART profile as the 3D
// models so the icon and the catch match. Import this module (lazy) and call registerFishIcons() once; Icon id = species id.
import React from 'react'
import { registerIcons } from '../../game/icons.jsx'
import { FISH_ART } from './art.js'
const I = '#4a3a35', st = { stroke: I, strokeWidth: 2.4, strokeLinejoin: 'round', strokeLinecap: 'round' }
const WASH = { minnow: '#cfe3ea', crucian: '#ead9b0', koi: '#f6d2c4', catfish: '#d6d8c6', lake_lord: '#d8e4be', ayu: '#e4e6c2', char: '#f0d6c0', loach: '#e6dccb', mackerel: '#c8e2e0', sea_bream: '#f6cfcc', flounder: '#e6dccc', pufferfish: '#f0e6be' }
const rnd = (s) => () => (s = (s * 16807) % 2147483647) / 2147483647
// Catmull-Rom through points -> smooth cubic path
function smooth(pts, close) {
  const n = pts.length, at = (i) => pts[close ? (i + n) % n : Math.max(0, Math.min(n - 1, i))]
  let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`
  for (let i = 0; i < (close ? n : n - 1); i++) { const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2)
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6], c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6]
    d += ` C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}` }
  return d + (close ? 'Z' : '')
}
const poly = (pts) => 'M' + pts.map(p => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' L') + 'Z'
function fishIcon(id) {
  const A = FISH_ART[id], flat = !!A.flat, R = rnd(id.length * 977 + id.charCodeAt(0) * 31)
  const prof = (u) => { const p = A.hump, tr = A.tail; return u < p ? Math.sqrt(Math.max(0, 1 - ((p - u) / p) ** 2)) : tr + (1 - tr) * Math.pow(0.5 + 0.5 * Math.cos(Math.PI * (u - p) / (1 - p)), 0.85) }
  const D = flat ? A.width * 0.62 : A.depth, len = id === 'pufferfish' ? 34 : 40, x0 = id === 'pufferfish' ? 13 : 7, K = Math.min(64, 23 / Math.max(D * 0.5, 0.12)) // vertical px per unit
  const X = (u) => x0 + u * len, half = (u) => prof(u) * D * 0.5 * K * (flat ? 1 : 1)
  const cy = 33, N = 12, top = [], bot = []
  for (let i = 0; i <= N; i++) { const u = i / N; top.push([X(u), cy - half(u) * 1.0]); bot.push([X(u), cy + half(u) * 0.95]) }
  const body = smooth([...top, ...bot.reverse().slice(1, -1)], true)
  const tH = Math.max(half(1), 2), TL = (0.2 + 0.25 * A.depth) * len * (flat ? 0.8 : 1), tx = X(1) - 1, d = D * K * 0.5
  const tail = { fork: [[tx, cy - tH], [tx + TL, cy - d * 1.2], [tx + TL * 0.55, cy], [tx + TL, cy + d * 1.2], [tx, cy + tH]],
    moon: [[tx, cy - tH], [tx + TL * 1.05, cy - d * 1.4], [tx + TL * 0.6, cy], [tx + TL * 1.05, cy + d * 1.4], [tx, cy + tH]],
    round: [[tx, cy - tH], [tx + TL * 0.7, cy - d * 0.9], [tx + TL, cy], [tx + TL * 0.7, cy + d * 0.9], [tx, cy + tH]],
    fan: [[tx, cy - tH], [tx + TL * 1.0, cy - d * 1.5], [tx + TL * 1.35, cy - d * 0.5], [tx + TL * 0.95, cy], [tx + TL * 1.35, cy + d * 0.5], [tx + TL * 1.0, cy + d * 1.5], [tx, cy + tH]] }[A.tailFin]
  // fit: scale everything so the tail tip stays inside 60px
  const right = Math.max(...tail.map(p => p[0])), fit = Math.min(1, 54 / (right - x0 + 4)), T = `translate(${32 - (x0 + (right - x0) / 2) * fit} ${33 - cy * fit}) scale(${fit}) rotate(-8 32 33)`
  const tailD = (A.tailFin === 'round' || A.tailFin === 'fan') ? smooth(tail, true) : poly(tail)
  let dorsal = null, anal = null
  if (!flat && A.dorsal !== 'none') { const u0 = A.dorsal === 'long' ? 0.3 : 0.36, u1 = A.dorsal === 'long' ? 0.78 : 0.62, ht = { low: 0.09, tall: 0.15, spiny: 0.13, long: 0.1 }[A.dorsal] * (0.6 + A.depth) * K * 0.9
    const y = (u) => cy - half(u) + 1.5
    dorsal = A.dorsal === 'spiny' ? poly([[X(u0), y(u0)], [X(u0 + 0.04), y(u0) - ht], [X(u0 + 0.09), y(u0 + 0.09) - ht * 0.6], [X(u0 + 0.14), y(u0 + 0.14) - ht * 0.95], [X(u0 + 0.2), y(u0 + 0.2) - ht * 0.55], [X(u1 - 0.03), y(u1) - ht * 0.6], [X(u1), y(u1)]])
      : smooth([[X(u0), y(u0)], [X(u0 + 0.06), y(u0) - ht], [X((u0 + u1) / 2 + 0.06), y(u1) - ht * 0.6], [X(u1), y(u1)]], true)
    anal = smooth([[X(0.64), cy + half(0.64) - 1.5], [X(0.7), cy + half(0.68) + ht * 0.5], [X(0.82), cy + half(0.82) + ht * 0.35], [X(0.83), cy + half(0.83) - 1.5]], true) }
  const fringe = flat ? [-1, 1].map(sd => smooth([...Array(9)].map((_, i) => { const u = 0.12 + i * 0.1; return [X(u), cy + sd * (half(u) + 3.2 + (i % 2) * 0.6)] }).concat([...Array(9)].map((_, i) => { const u = 0.92 - i * 0.1; return [X(u), cy + sd * (half(u) - 1)] })), true)) : []
  const pec = flat ? null : smooth([[X(0.27), cy + half(0.27) * 0.25], [X(0.27) + 9, cy + half(0.27) * 0.25 + 4], [X(0.27) + 6, cy + half(0.27) * 0.25 + 7]], true)
  const clip = 'tpf-' + id
  // pattern in body space (clipped)
  const pat = [], pc = A.pat, top0 = (u) => cy - half(u)
  const P = A.pattern
  if (P === 1) { if (A.patScale < 0.5) pat.push(<ellipse key="g" cx={X(0.22)} cy={cy - half(0.22) * 0.15} rx={3.4} ry={2.4} fill={pc} />)
    else for (let i = 0; i < 16; i++) { const u = 0.12 + R() * 0.8, v = R() * 0.85; pat.push(<circle key={i} cx={X(u)} cy={top0(u) + v * half(u) * 1.1} r={1 + R() * 1.6 * (A.patScale > 1.3 ? 0.7 : 1)} fill={pc} />) } }
  else if (P === 3) { for (const [u, v, r] of [[0.2, 0.25, 7], [0.5, 0.2, 8], [0.74, 0.5, 4.5], [0.38, 0.75, 3.5]]) pat.push(<path key={u} d={smooth([...Array(7)].map((_, i) => { const a = i / 7 * Math.PI * 2, rr = r * (0.75 + R() * 0.45); return [X(u) + Math.cos(a) * rr * 1.3, top0(u) + v * half(u) * 2 + Math.sin(a) * rr] }), true)} fill={pc} />) }
  else if (P === 4) { for (let i = 0; i < 9; i++) { const u = 0.22 + i * 0.07; pat.push(<path key={i} d={`M${X(u)} ${top0(u) - 2} q2.6 4 -0.6 7 q-2 3 1 6`} fill="none" stroke={pc} strokeWidth={2} strokeLinecap="round" />) } }
  else if (P === 5) { for (let i = 0; i < 26; i++) { const u = 0.12 + R() * 0.8, v = R() * 1.1; pat.push(<circle key={i} cx={X(u)} cy={top0(u) + v * half(u) * 1.2} r={0.8 + R() * 0.9} fill={pc} />) } }
  else if (P === 6) pat.push(<path key="l" d={smooth([...Array(8)].map((_, i) => [X(0.1 + i * 0.12), cy - 0.6 + Math.sin(i * 1.6) * 0.5]), false)} fill="none" stroke={pc} strokeWidth={2.8} strokeLinecap="round" />)
  else if (P === 7) { for (let r = 0; r < 3; r++) for (let i = 0; i < 7; i++) { const u = 0.25 + i * 0.085 + (r % 2) * 0.04, y = top0(u) + 2.6 + r * 3.6; if (y > cy + half(u) - 2) continue; pat.push(<path key={r + '-' + i} d={`M${X(u) - 2.4} ${y} q2.4 2.8 4.8 0`} fill="none" stroke={pc} strokeWidth={1.2} opacity={0.75} />) } }
  const eye = flat ? [[X(0.18), cy - half(0.18) * 0.45], [X(0.26), cy - half(0.26) * 0.7]] : [[X(0.11), cy - half(0.11) * 0.28]]
  const er = id === 'pufferfish' ? 3.6 : Math.max(2.2, Math.min(3.2, D * K * 0.12))
  const spikes = A.spikes ? [...Array(11)].map((_, i) => { const u = 0.16 + i * 0.07, sd = i % 2 ? 1 : -1, y = sd < 0 ? cy - half(u) : cy + half(u); return <path key={i} d={`M${X(u) - 1.6} ${y} L${X(u) + 0.6} ${y + sd * 3.6} L${X(u) + 1.6} ${y}`} fill={A.fin} {...st} strokeWidth={1.4} /> }) : null
  const whisk = A.whiskers ? <path d={`M${X(0.03)} ${cy + 1} q-3 4 -1 ${4 + 5 * A.whiskers} M${X(0.05)} ${cy + 2} q2 4 5 ${3 + 4 * A.whiskers}`} fill="none" {...st} strokeWidth={1.6} /> : null
  return [WASH[id] || '#d8e8ee', <g transform={T}>
    <defs><clipPath id={clip}><path d={body} /></clipPath></defs>
    {fringe.map((d, i) => <path key={i} d={d} fill={A.fin} {...st} strokeWidth={1.8} />)}
    {dorsal && <path d={dorsal} fill={A.fin} {...st} />}{anal && <path d={anal} fill={A.fin} {...st} />}
    <path d={tailD} fill={A.fin} {...st} />
    <path d={`M${tx + 3} ${cy - tH * 0.4} l${TL * 0.5} ${-d * 0.45} M${tx + 3} ${cy + tH * 0.4} l${TL * 0.5} ${d * 0.45}`} stroke={I} strokeOpacity={0.35} strokeWidth={1.2} fill="none" />
    {spikes}
    <path d={body} fill={A.back} />
    <g clipPath={`url(#${clip})`}>
      <path d={`M0 ${cy + D * K * 0.12} ${[...Array(9)].map((_, i) => `Q${4 + i * 7} ${cy + D * K * 0.12 + (i % 2 ? 2 : -2)} ${8 + i * 7} ${cy + D * K * 0.12}`).join(' ')} L64 64 L0 64Z`} fill={A.belly} />
      {pat}
      {A.glow && <path d={body} fill="none" stroke="#f3e6a0" strokeWidth={5} opacity={0.35} />}
    </g>
    <path d={body} fill="none" {...st} />
    {pec && <path d={pec} fill={A.fin} {...st} strokeWidth={1.8} />}
    {!flat && <path d={`M${X(0.21)} ${cy - half(0.21) * 0.65} q2.6 ${half(0.21) * 0.65} 0 ${half(0.21) * 1.3}`} fill="none" stroke={I} strokeWidth={1.5} strokeLinecap="round" opacity={0.75} />}
    {eye.map(([x, y], i) => <g key={i}><circle cx={x} cy={y} r={er} fill="#fffaf0" {...st} strokeWidth={1.5} /><circle cx={x - 0.4} cy={y + 0.2} r={er * 0.58} fill="#231a15" /><circle cx={x - 1.0} cy={y - 0.8} r={er * 0.22} fill="#fff" /></g>)}
    {whisk}
    <path d={`M${X(0.3)} ${top0(0.3) + 2.6} Q${X(0.48)} ${top0(0.48) + 1.6} ${X(0.66)} ${top0(0.66) + 2.4}`} stroke="#fff" strokeWidth={2} strokeLinecap="round" fill="none" opacity={0.7} />
  </g>]
}
export const FISH_ICONS = Object.fromEntries(Object.keys(FISH_ART).map(id => [id, fishIcon(id)]))
let done = false
export function registerFishIcons() { if (!done) { registerIcons(FISH_ICONS); done = true } }
registerFishIcons()
