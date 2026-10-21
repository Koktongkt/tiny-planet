// Professor Hoshino's dialogue portrait (art-c item 7): a watercolour bust in the icon recipe (wash, flat fills, warm ink),
// round glasses, white hair + beard, tweed cardigan, red bow-scarf, notebook + pencil tucked under his chin.
import React from 'react'
const I = '#4a3a35', st = { stroke: I, strokeWidth: 2.4, strokeLinejoin: 'round', strokeLinecap: 'round' }
export function HoshinoPortrait({ size = 96, mood = 'happy', title = 'Professor Hoshino', style, className }) {
  const brow = mood === 'curious' ? 'M38 44 q6 -5 12 -2 M62 41 q6 -2 11 3' : 'M38 43 q6 -3 12 -1 M62 42 q6 -2 11 1'
  return <svg viewBox="0 0 112 112" width={size} height={size} role="img" aria-label={title} className={className} style={style}>
    <defs><radialGradient id="hsw" cx="40%" cy="35%" r="70%"><stop offset="0" stopColor="#fbf0d8" /><stop offset=".7" stopColor="#efd9b0" /><stop offset="1" stopColor="#e2c48e" /></radialGradient></defs>
    <circle cx="56" cy="56" r="54" fill="url(#hsw)" />
    {/* shoulders: tweed cardigan, shirt collar, bow-scarf */}
    <path d="M14 112 Q16 82 40 76 L72 76 Q96 82 98 112Z" fill="#a89a78" {...st} />
    <path d="M44 76 L56 92 L68 76" fill="#f4ecd8" {...st} strokeWidth={2} />
    <path d="M46 84 Q56 80 66 84 L62 92 Q56 88 50 92Z" fill="#b5524a" {...st} strokeWidth={2} />
    {[...Array(6)].map((_, i) => <path key={i} d={`M${24 + i * 12} ${100 - (i % 2) * 4} l4 -3`} stroke="#8a7a5a" strokeWidth={1.4} strokeLinecap="round" />)}
    {/* head, ears, hair */}
    <ellipse cx="56" cy="50" rx="25" ry="27" fill="#f2c9a4" {...st} />
    <ellipse cx="31" cy="52" rx="4.5" ry="6.5" fill="#f2c9a4" {...st} strokeWidth={2} /><ellipse cx="81" cy="52" rx="4.5" ry="6.5" fill="#f2c9a4" {...st} strokeWidth={2} />
    <path d="M31 46 Q30 22 56 22 Q82 22 81 46 Q76 32 66 32 Q62 27 56 30 Q48 26 42 33 Q34 34 31 46Z" fill="#e8e4de" {...st} />
    {/* beard + moustache */}
    <path d="M34 58 Q36 86 56 88 Q76 86 78 58 Q72 66 66 64 Q56 70 46 64 Q40 66 34 58Z" fill="#f2efea" {...st} />
    <path d="M44 64 Q50 59 56 63 Q62 59 68 64 Q62 67 56 65 Q50 67 44 64Z" fill="#d8d4cf" {...st} strokeWidth={2} />
    {mood === 'happy' ? <path d="M51 70 q5 4 10 0" fill="none" stroke={I} strokeWidth={2} strokeLinecap="round" /> : <ellipse cx="56" cy="70" rx="3" ry="2.4" fill="#8a4a3a" />}
    {/* round glasses, eyes, brows, cheeks, nose */}
    <circle cx="45" cy="50" r="8" fill="#fffaf080" stroke="#2e2420" strokeWidth={2.4} /><circle cx="67" cy="50" r="8" fill="#fffaf080" stroke="#2e2420" strokeWidth={2.4} /><path d="M53 49 q3 -2 6 0" fill="none" stroke="#2e2420" strokeWidth={2.2} />
    {mood === 'happy' ? <><path d="M41 51 q4 -3 8 0" fill="none" stroke={I} strokeWidth={2.2} strokeLinecap="round" /><path d="M63 51 q4 -3 8 0" fill="none" stroke={I} strokeWidth={2.2} strokeLinecap="round" /></> : <><circle cx="45" cy="50" r="2.4" fill={I} /><circle cx="67" cy="50" r="2.4" fill={I} /></>}
    <path d={brow} fill="none" stroke="#bdb8b0" strokeWidth={3} strokeLinecap="round" />
    <ellipse cx="38" cy="60" rx="4" ry="2.4" fill="#e8907a" opacity=".45" /><ellipse cx="74" cy="60" rx="4" ry="2.4" fill="#e8907a" opacity=".45" />
    <path d="M56 54 q-3 5 1 7" fill="none" stroke="#c98a6a" strokeWidth={2} strokeLinecap="round" />
    {/* notebook + pencil */}
    <path d="M70 92 L96 86 L100 104 L74 110Z" fill="#8a3a32" {...st} /><path d="M73 93 L95 88 L98 102 L76 107Z" fill="#fbf3e2" {...st} strokeWidth={1.6} />
    <path d="M78 96 l12 -3 M79 100 l14 -3" stroke="#9a8a7a" strokeWidth={1.4} strokeLinecap="round" />
    <path d="M64 104 L90 80" stroke="#e8b84a" strokeWidth={4} strokeLinecap="round" /><path d="M90 80 l3 -3" stroke={I} strokeWidth={3} strokeLinecap="round" />
    <path d="M44 40 q4 -4 9 -4" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" opacity=".6" />
  </svg>
}
export default HoshinoPortrait
