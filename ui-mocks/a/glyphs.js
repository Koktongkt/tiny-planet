// Option A glyphs. WX = full-colour glossy weather art for the badge; GL = monochrome cream chrome glyphs; CUR = currency.
const defs = `<svg width="0" height="0" style="position:absolute"><defs>
<radialGradient id="sunG" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="#fffbe0"/><stop offset=".45" stop-color="#ffd85a"/><stop offset="1" stop-color="#f2a52a"/></radialGradient>
<radialGradient id="sunGlow"><stop offset=".3" stop-color="#ffd860" stop-opacity=".75"/><stop offset="1" stop-color="#ffb840" stop-opacity="0"/></radialGradient>
<radialGradient id="moonG" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#fffdf0"/><stop offset=".6" stop-color="#f3e6b8"/><stop offset="1" stop-color="#d9c48a"/></radialGradient>
<radialGradient id="moonGlow"><stop offset=".3" stop-color="#cfe0ff" stop-opacity=".55"/><stop offset="1" stop-color="#9fb8ff" stop-opacity="0"/></radialGradient>
<linearGradient id="cloudG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".7" stop-color="#e8eef6"/><stop offset="1" stop-color="#c4d0e0"/></linearGradient>
<linearGradient id="cloudD" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#dfe6f0"/><stop offset=".7" stop-color="#a9b6c8"/><stop offset="1" stop-color="#7f8ca2"/></linearGradient>
<linearGradient id="dropG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c8ecff"/><stop offset="1" stop-color="#4aa6e8"/></linearGradient>
<radialGradient id="coinG" cx=".38" cy=".3" r=".75"><stop offset="0" stop-color="#fff6c4"/><stop offset=".45" stop-color="#ffcf3e"/><stop offset="1" stop-color="#d98a12"/></radialGradient>
<linearGradient id="coinE" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e8a020"/><stop offset="1" stop-color="#8a5208"/></linearGradient>
<linearGradient id="gemA" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e8fbff"/><stop offset=".5" stop-color="#7cc8ff"/><stop offset="1" stop-color="#4a6ae8"/></linearGradient>
<linearGradient id="gemB" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b8e4ff"/><stop offset="1" stop-color="#3a52c8"/></linearGradient>
<linearGradient id="leafG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c8f0a0"/><stop offset="1" stop-color="#5fae3e"/></linearGradient>
<linearGradient id="scrollG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fbeccb"/><stop offset="1" stop-color="#e0bf86"/></linearGradient>
<linearGradient id="meG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff3c0"/><stop offset="1" stop-color="#f0a830"/></linearGradient>
</defs></svg>`
const sun = (cx = 32, cy = 32, r = 13, rays = true) => `<circle cx="${cx}" cy="${cy}" r="${r * 2}" fill="url(#sunGlow)"/>` +
  (rays ? Array.from({ length: 8 }, (_, i) => { const a = i * Math.PI / 4, x1 = cx + Math.cos(a) * (r + 4), y1 = cy + Math.sin(a) * (r + 4), x2 = cx + Math.cos(a) * (r + 9), y2 = cy + Math.sin(a) * (r + 9); return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#ffd45a" stroke-width="3.2" stroke-linecap="round"/>` }).join('') : '') +
  `<circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#sunG)" stroke="#e8962a" stroke-width="1.2"/><ellipse cx="${cx - r * .35}" cy="${cy - r * .4}" rx="${r * .35}" ry="${r * .22}" fill="#fff" opacity=".7" transform="rotate(-30 ${cx - r * .35} ${cy - r * .4})"/>`
const moon = (cx = 30, cy = 30, r = 15) => `<circle cx="${cx}" cy="${cy}" r="${r * 1.9}" fill="url(#moonGlow)"/><path d="M${cx + r * .25} ${cy - r} A${r} ${r} 0 1 0 ${cx + r} ${cy + r * .35} A${r * .82} ${r * .82} 0 0 1 ${cx + r * .25} ${cy - r}Z" fill="url(#moonG)" stroke="#c9b070" stroke-width="1.2"/><circle cx="${cx - r * .35}" cy="${cy + r * .15}" r="${r * .14}" fill="#e2cf98"/><circle cx="${cx - r * .05}" cy="${cy + r * .55}" r="${r * .09}" fill="#e2cf98"/>`
const star = (x, y, s = 3) => `<path d="M${x} ${y - s * 1.6}L${x + s * .45} ${y - s * .45}L${x + s * 1.6} ${y}L${x + s * .45} ${y + s * .45}L${x} ${y + s * 1.6}L${x - s * .45} ${y + s * .45}L${x - s * 1.6} ${y}L${x - s * .45} ${y - s * .45}Z" fill="#fff6d0"/>`
const cloud = (dx = 0, dy = 0, s = 1, dark = false) => `<g transform="translate(${dx} ${dy}) scale(${s})"><path d="M14 46 Q5 46 5 38 Q5 30 14 30 Q15 19 27 19 Q35 19 39 26 Q42 23 47 23 Q57 24 57 34 Q62 36 62 41 Q62 46 55 46Z" fill="url(#${dark ? 'cloudD' : 'cloudG'})" stroke="${dark ? '#6a7890' : '#a8b6c8'}" stroke-width="1.4"/><path d="M14 33 Q16 24 26 23" stroke="#fff" stroke-width="2.4" fill="none" stroke-linecap="round" opacity=".85"/></g>`
const drop = (x, y, l = 7) => `<path d="M${x} ${y} Q${x - 3} ${y + l * .6} ${x} ${y + l} Q${x + 3} ${y + l * .6} ${x} ${y}Z" fill="url(#dropG)" stroke="#2f7cc0" stroke-width=".8" transform="rotate(14 ${x} ${y})"/>`
const wind = (y, x0, x1, curl = true) => `<path d="M${x0} ${y} H${x1} ${curl ? `q5 0 5 -4.5 q0 -4 -4 -4 q-3 0 -3.5 3` : ''}" stroke="#fffaf0" stroke-width="3" fill="none" stroke-linecap="round"/>`
const W = (inner) => `<svg viewBox="0 0 64 64">${inner}</svg>`
window.WX = {
  clear: W(sun()),
  breezy: W(sun(26, 27, 11) + wind(42, 14, 46) + wind(51, 22, 40, false) + wind(33, 40, 56, false)),
  cloudy: W(sun(40, 22, 10, false) + cloud(-2, 6, 1)),
  drizzle: W(cloud(0, -4, 1) + drop(22, 46, 7) + drop(36, 48, 7) + drop(29, 54, 6)),
  rain: W(cloud(0, -6, 1, true) + drop(18, 42, 9) + drop(30, 44, 10) + drop(42, 42, 9) + drop(24, 53, 8) + drop(37, 54, 8)),
  night: W(moon(30, 32, 15) + star(50, 14, 3) + star(54, 36, 2.2) + star(12, 14, 2)),
  nightcloudy: W(moon(36, 22, 12) + star(14, 12, 2.4) + cloud(-2, 10, .95)),
  nightrain: W(moon(42, 16, 10) + cloud(0, -2, 1, true) + drop(20, 48, 8) + drop(34, 50, 8)),
}
// cream monochrome chrome glyphs (fill cream, dark detail lines)
const C = '#fbf3e2', D = '#5a4840'
const G = (inner, vb = '0 0 40 40') => `<svg viewBox="${vb}" fill="none" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`
window.GL = {
  bag: G(`<path d="M12 13 Q12 6 20 6 Q28 6 28 13" stroke="${C}" stroke-width="2.6"/><path d="M8 16 Q8 12 13 12 H27 Q32 12 32 16 V31 Q32 35 28 35 H12 Q8 35 8 31Z" fill="${C}"/><path d="M8 20 Q20 24 32 20" stroke="${D}" stroke-width="1.6"/><rect x="15" y="21" width="10" height="7" rx="2" fill="${C}" stroke="${D}" stroke-width="1.6"/><path d="M12 35 V29 M28 35 V29" stroke="${D}" stroke-width="1.4"/>`),
  journal: G(`<path d="M20 9 Q14 6 6 7 V32 Q14 31 20 34 Q26 31 34 32 V7 Q26 6 20 9Z" fill="${C}"/><path d="M20 9 V34" stroke="${D}" stroke-width="1.6"/><path d="M10 13 Q13 12.5 16 13.6 M10 18 Q13 17.5 16 18.6 M24 13.6 Q27 12.5 30 13 M24 18.6 Q27 17.5 30 18" stroke="${D}" stroke-width="1.4"/><path d="M26 7 V17 l2.5 -2 l2.5 2 V7" fill="#e0533f"/>`),
  recipes: G(`<rect x="8" y="6" width="24" height="29" rx="3" fill="${C}"/><path d="M12 6 V35" stroke="${D}" stroke-width="1.6"/><path d="M19 15 Q19 11 22.5 11 Q26 11 26 15 Q28 15 28 17.5 Q28 20 25.5 20 H19.5 Q17 20 17 17.5 Q17 15 19 15Z" fill="${C}" stroke="${D}" stroke-width="1.5"/><path d="M19.5 20 V24 H25.5 V20" stroke="${D}" stroke-width="1.5"/>`),
  gear: G(`<path d="M17.6 4h4.8l.9 4.3 2.6 1.1 3.7-2.4 3.4 3.4-2.4 3.7 1.1 2.6 4.3.9v4.8l-4.3.9-1.1 2.6 2.4 3.7-3.4 3.4-3.7-2.4-2.6 1.1-.9 4.3h-4.8l-.9-4.3-2.6-1.1-3.7 2.4-3.4-3.4 2.4-3.7-1.1-2.6L4 22.4v-4.8l4.3-.9 1.1-2.6-2.4-3.7 3.4-3.4 3.7 2.4 2.6-1.1z" fill="${C}"/><circle cx="20" cy="20" r="5.5" fill="${D}"/><circle cx="20" cy="20" r="3" fill="${C}"/>`),
  camera: G(`<path d="M6 14 Q6 11 9 11 H13 L15.5 7.5 H24.5 L27 11 H31 Q34 11 34 14 V29 Q34 32 31 32 H9 Q6 32 6 29Z" fill="${C}"/><circle cx="20" cy="21" r="6.5" fill="${D}"/><circle cx="20" cy="21" r="4" fill="${C}" opacity=".35"/><circle cx="29" cy="15" r="1.4" fill="${D}"/>`),
  map: G(`<path d="M5 10 L14 7 L26 11 L35 8 V31 L26 34 L14 30 L5 33Z" fill="${C}"/><path d="M14 7 V30 M26 11 V34" stroke="${D}" stroke-width="1.4"/><path d="M19 19 l3 3 m0 -3 l-3 3" stroke="#e0533f" stroke-width="2"/>`),
  hand: G(`<path d="M13 21 V10 a2.4 2.4 0 0 1 4.8 0 V18 M17.8 18 V7.5 a2.4 2.4 0 0 1 4.8 0 V18 M22.6 18 V9.5 a2.4 2.4 0 0 1 4.8 0 V20 M27.4 20 V14 a2.4 2.4 0 0 1 4.8 0 V25 C32.2 31 28 36 22 36 H20 C16 36 13.5 34 11 30.5 L6.5 23.5 a2.4 2.4 0 0 1 3.9 -2.8 L13 23.5" fill="${C}" stroke="${C}" stroke-width="1"/><path d="M17.8 18 V12 M22.6 18 V12 M27.4 20 V16" stroke="${D}" stroke-width="1.2" opacity=".5"/>`),
  run: G(`<circle cx="25.5" cy="7" r="3.6" fill="${C}"/><path d="M11 15.5 L18.5 12 L24.5 16.5 L28.5 22 L34 23 M18.5 12 L15.5 23 L22 27.5 L19.5 36 M15.5 23 L10.5 29.5 H5" stroke="${C}" stroke-width="3.4"/>`),
  jump: G(`<path d="M20 4 L33 18 H25 V35 H15 V18 H7Z" fill="${C}"/>`),
  close: G(`<path d="M11 11 L29 29 M29 11 L11 29" stroke="${C}" stroke-width="4"/>`),
  plus: G(`<path d="M20 9 V31 M9 20 H31" stroke="#fff" stroke-width="5.5"/>`),
  chevL: G(`<path d="M25 6 L13 20 L25 34" stroke="${C}" stroke-width="3"/>`, '0 0 40 40'),
  chevR: G(`<path d="M15 6 L27 20 L15 34" stroke="${C}" stroke-width="3"/>`, '0 0 40 40'),
  arrow: G(`<path d="M20 9 L30 21 H10Z" fill="${C}"/>`),
  me: `<svg viewBox="0 0 40 40"><path d="M20 4 L32 34 L20 27 L8 34Z" fill="url(#meG)" stroke="#7a4a10" stroke-width="2" stroke-linejoin="round"/></svg>`,
  scroll: `<svg viewBox="0 0 40 40"><rect x="4" y="4" width="32" height="32" rx="7" fill="#3e3438" stroke="#d9a24a" stroke-width="1.5"/><path d="M11 11 H27 Q30 11 30 14 V28 Q30 31 27 31 H13 Q10 31 10 28" fill="url(#scrollG)" stroke="#8a5a22" stroke-width="1.4"/><path d="M11 11 Q8 11 8 14 Q8 16 10 16 H13 V14 Q13 11 11 11Z" fill="#e8cf9a" stroke="#8a5a22" stroke-width="1.4"/><path d="M16 17 H25 M16 21 H25 M16 25 H22" stroke="#a07848" stroke-width="1.6" stroke-linecap="round"/></svg>`,
  leaf: `<svg viewBox="0 0 64 64"><path d="M32 54 C16 46 12 28 22 14 C26 22 30 22 32 10 C34 22 38 22 42 14 C52 28 48 46 32 54Z" fill="url(#leafG)" stroke="#3f7a2a" stroke-width="1.6"/><path d="M32 52 V22" stroke="#3f7a2a" stroke-width="1.8" stroke-linecap="round"/></svg>`,
}
window.CUR = {
  coin: `<svg viewBox="0 0 40 40"><circle cx="20" cy="21.5" r="15" fill="url(#coinE)"/><circle cx="20" cy="19.5" r="15" fill="url(#coinG)" stroke="#b87010" stroke-width="1.2"/><circle cx="20" cy="19.5" r="10.5" fill="none" stroke="#e8a020" stroke-width="1.6"/><path d="M20 13.5 l1.8 3.8 4.1.5 -3 2.8.8 4.1 -3.7-2 -3.7 2 .8-4.1 -3-2.8 4.1-.5z" fill="#fff0a8" stroke="#c88a18" stroke-width=".8"/><ellipse cx="14" cy="12" rx="4" ry="2" fill="#fff" opacity=".65" transform="rotate(-35 14 12)"/></svg>`,
  gem: `<svg viewBox="0 0 40 40"><path d="M20 4 L33 15 L20 37 L7 15Z" fill="url(#gemB)" stroke="#2a3a98" stroke-width="1.2" stroke-linejoin="round"/><path d="M20 4 L26 15 L20 37 L14 15Z" fill="url(#gemA)"/><path d="M7 15 H33" stroke="#e8fbff" stroke-width="1" opacity=".8"/><path d="M12 12 L17 8" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".85"/></svg>`,
}
document.addEventListener('DOMContentLoaded', () => document.body.insertAdjacentHTML('afterbegin', defs))
