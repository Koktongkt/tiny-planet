// Ruins relic icons (art-c item 7), same recipe as game/icons.jsx / forage icons: watercolour wash, flat fills, warm-ink
// outline, one white highlight. registerRelicIcons() adds them to <Icon> (lazy; call from the journal / museum chunks).
import React from 'react'
import { registerIcons } from '../../game/icons.jsx'
const I = '#4a3a35', st = { stroke: I, strokeWidth: 2.6, strokeLinejoin: 'round', strokeLinecap: 'round' }
const hl = { stroke: '#fff', strokeWidth: 2.2, strokeLinecap: 'round', fill: 'none', opacity: 0.7 }
const P = (d, fill, x = {}) => <path d={d} fill={fill} {...st} {...x} />
const H = (d) => <path d={d} {...hl} />
const L = (d, w = 2.6, c = I) => <path d={d} fill="none" stroke={c} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" />
const Ci = (cx, cy, r, fill, x = {}) => <circle cx={cx} cy={cy} r={r} fill={fill} {...st} {...x} />
const El = (cx, cy, rx, ry, fill, x = {}) => <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={fill} {...st} {...x} />
export const RELIC_ICONS = {
  // glazed tile: square, cream glaze, blue wave pattern, a chipped corner
  relic_tile: ['#dfe6ee', <>{P('M12 14 L50 12 L52 48 L40 52 L14 50 Z', '#f4ecd8')}{P('M40 52 L52 48 L50 44 L44 46Z', '#c9b89a', { strokeWidth: 1.8 })}
    {L('M16 26 q5 -6 10 0 q5 6 10 0 q5 -6 10 0', 2.6, '#4f7fb8')}{L('M16 36 q5 -6 10 0 q5 6 10 0 q5 -6 10 0', 2.6, '#4f7fb8')}{L('M17 44 q4 -4 8 0 q4 4 8 0', 2, '#7aa3d0')}
    {L('M15 18 H48', 1.6, '#c9965a')}{H('M17 17 L30 16')}</>],
  // little bronze bell with a red cord and two sound lines
  relic_bell: ['#f0dcb0', <>{L('M32 6 V14', 2.4, '#c0473f')}{L('M24 8 Q32 2 40 8', 2.2, '#c0473f')}{P('M20 46 Q20 18 32 16 Q44 18 44 46 Z', '#c9963a')}{P('M16 46 H48 Q48 52 32 52 Q16 52 16 46Z', '#b07a2a')}
    {Ci(32, 54, 3.6, '#8a5a22', { strokeWidth: 2 })}{L('M22 32 H42', 1.8, '#8a5a22')}{L('M10 22 q-4 6 0 12 M54 22 q4 6 0 12', 2, '#a88a5a')}{H('M26 24 q2 -4 6 -5')}</>],
  // old lens: brass ring, pale blue glass, a starry glint
  relic_lens: ['#dfe4f0', <>{Ci(30, 32, 20, '#d9a54a')}{Ci(30, 32, 14, '#cfe2ee')}{L('M48 46 L56 56', 5, '#8a5a3c')}{L('M48 46 L56 56', 1.6, '#c9965a')}
    {P('M30 24 l2 5 5 1 -4 3 1 5 -4 -3 -4 3 1 -5 -4 -3 5 -1Z', '#fff7d0', { strokeWidth: 1.4 })}{H('M20 28 q2 -6 8 -8')}</>],
  // festival fox mask: white face, red markings, a crack at the ear
  relic_mask: ['#f4dcd4', <>{P('M14 10 L24 22 Q32 18 40 22 L50 10 L50 32 Q48 48 32 56 Q16 48 14 32 Z', '#fbf6ec')}
    {P('M18 16 L23 22 L19 24Z', '#d9655b', { strokeWidth: 1.6 })}{P('M46 16 L41 22 L45 24Z', '#d9655b', { strokeWidth: 1.6 })}
    {L('M21 32 q5 -4 9 0', 2.4)}{L('M34 32 q5 -4 9 0', 2.4)}{L('M24 38 q-3 2 -6 0 M40 38 q3 2 6 0', 2, '#d9655b')}{Ci(32, 46, 2.4, '#4a3a35', { strokeWidth: 1 })}
    {L('M48 12 L44 18 L47 21 L44 26', 1.6, '#8a6a5a')}{H('M20 26 q2 -3 5 -3')}</>],
  // lopsided tea bowl: earthy glaze dripping into a darker foot
  relic_bowl: ['#e6dcc8', <>{P('M10 26 Q12 50 32 52 Q52 50 54 24 Q32 30 10 26Z', '#8f9a6a')}{El(32, 25, 22, 5, '#c9b88a', { transform: 'rotate(-4 32 25)' })}
    {P('M12 32 q4 6 8 2 q4 8 9 3 q5 7 10 1 q5 6 9 0 q3 4 4 2', 'none', { stroke: '#6a7a4a', strokeWidth: 2 })}{P('M24 51 L26 56 H40 L41 51', '#7a5236', { strokeWidth: 2 })}{H('M16 32 q2 8 8 12')}</>],
}
let done = false
export function registerRelicIcons() { if (!done) { registerIcons(RELIC_ICONS); done = true } }
registerRelicIcons()
