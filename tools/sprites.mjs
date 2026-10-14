// Hand-built SVG sprite set for the 2.5D traveller. node tools/sprites.mjs -> src/assets/traveller-sheet.png (+ svg)
import { chromium } from 'playwright'
import fs from 'fs'
const W = 256, H = 384, COLS = 5, ROWS = 3
const INK = '#3b2621', SK = '#f8d6bc', SKS = '#e9ad98', HR = '#3a2822', HRL = '#5e4236', SM = '#f6eedc', SMS = '#e2cdb8',
  OV = '#5b86c0', OVS = '#4a6ea6', SC = '#e0604e', SCS = '#b9473c', SH = '#7a4630', SO = '#fffaf0', BG = '#c58f5a', BGS = '#9c6a40', ST = '#8a5a3c', BL = '#f2a0a0'
const sw = 'stroke="' + INK + '" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"'
const P = (d, f) => `<path d="${d}" fill="${f}" ${sw}/>`
const E_ = (cx, cy, rx, ry, f, extra = '') => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${f}" ${sw} ${extra}/>`
const shade = (d, f) => `<path d="${d}" fill="${f}"/>` // flat shadow tone, no stroke
const n = v => v.toFixed(1)

// limb as a soft tapered tube from (x1,y1) to (x2,y2), widths w1->w2
function tube(x1, y1, x2, y2, w1, w2, f) {
  const a = Math.atan2(y2 - y1, x2 - x1), nx = -Math.sin(a), ny = Math.cos(a)
  const p = [[x1 + nx * w1, y1 + ny * w1], [x2 + nx * w2, y2 + ny * w2], [x2 - nx * w2, y2 - ny * w2], [x1 - nx * w1, y1 - ny * w1]]
  const ex = Math.cos(a), ey = Math.sin(a)
  return P(`M${n(p[0][0])},${n(p[0][1])} L${n(p[1][0])},${n(p[1][1])} Q${n(x2 + ex * w2 * 1.3)},${n(y2 + ey * w2 * 1.3)} ${n(p[2][0])},${n(p[2][1])} L${n(p[3][0])},${n(p[3][1])} Q${n(x1 - ex * w1)},${n(y1 - ey * w1)} ${n(p[0][0])},${n(p[0][1])}Z`, f)
}
function mitten(x, y, sd, f = SK) { // chunky mitten + thumb
  return E_(x + sd * 5, y - 3, 6, 8, f, `transform="rotate(${sd * -30} ${x + sd * 5} ${y - 3})"`) + E_(x, y, 12, 13, f)
}
function leg(hx, hy, fx, fy, front, sd) { // baggy trouser leg + cuff + sock + shoe, front view
  return P(`M${hx - 19},${hy} Q${hx - 22},${(hy + fy) / 2} ${fx - 18},${fy - 30} L${fx + 18},${fy - 30} Q${hx + 22},${(hy + fy) / 2} ${hx + 19},${hy}Z`, OV)
    + shade(`M${hx + sd * 6},${hy + 4} Q${hx + sd * 18},${(hy + fy) / 2} ${fx + sd * 15},${fy - 33} L${fx + sd * 4},${fy - 33}Z`, OVS)
    + `<rect x="${fx - 21}" y="${fy - 36}" width="42" height="13" rx="6" fill="#7aa2d4" ${sw}/>`
    + `<rect x="${fx - 9}" y="${fy - 24}" width="18" height="12" fill="${SO}" ${sw}/>`
    + (front ? E_(fx, fy - 4, 17, 11, SH) : E_(fx, fy - 4, 16, 10, SH))
}
function headFront(cx, cy, back) {
  let s = ''
  // bob back mass
  s += P(`M${cx - 62},${cy + 30} Q${cx - 72},${cy - 40} ${cx},${cy - 58} Q${cx + 72},${cy - 40} ${cx + 62},${cy + 30} Q${cx + 60},${cy + 46} ${cx + 44},${cy + 42} L${cx - 44},${cy + 42} Q${cx - 60},${cy + 46} ${cx - 62},${cy + 30}Z`, HR)
  if (!back) {
    s += E_(cx, cy + 6, 50, 44, SK)
    s += shade(`M${cx - 47},${cy + 14} Q${cx - 40},${cy + 46} ${cx},${cy + 50} Q${cx - 30},${cy + 36} ${cx - 47},${cy + 14}Z`, SKS)
    // fringe: three chunky lumps
    s += P(`M${cx - 52},${cy + 4} Q${cx - 56},${cy - 44} ${cx},${cy - 46} Q${cx + 56},${cy - 44} ${cx + 52},${cy + 4} Q${cx + 40},${cy - 14} ${cx + 22},${cy - 10} Q${cx + 12},${cy - 22} ${cx - 2},${cy - 12} Q${cx - 18},${cy - 22} ${cx - 30},${cy - 8} Q${cx - 44},${cy - 12} ${cx - 52},${cy + 4}Z`, HR)
    s += `<path d="M${cx - 26},${cy - 34} Q${cx},${cy - 44} ${cx + 22},${cy - 36}" stroke="${HRL}" stroke-width="5" fill="none" stroke-linecap="round"/>`
    // eyes low, big + highlight
    for (const x of [-19, 19]) s += `<ellipse cx="${cx + x}" cy="${cy + 14}" rx="7" ry="10" fill="${INK}"/><circle cx="${cx + x + 2.5}" cy="${cy + 10}" r="3" fill="#fff"/>`
    s += `<path d="M${cx - 27},${cy + 1} q8,-4 15,0 M${cx + 12},${cy + 1} q8,-4 15,0" stroke="${INK}" stroke-width="3" fill="none" stroke-linecap="round"/>`
    s += `<ellipse cx="${cx - 33}" cy="${cy + 28}" rx="9" ry="5.5" fill="${BL}" opacity=".85"/><ellipse cx="${cx + 33}" cy="${cy + 28}" rx="9" ry="5.5" fill="${BL}" opacity=".85"/>`
    s += `<path d="M${cx - 2},${cy + 24} q2,3 4,0" stroke="#c98a78" stroke-width="3" fill="none" stroke-linecap="round"/>`
    s += `<path d="M${cx - 7},${cy + 33} q7,7 14,0" stroke="${INK}" stroke-width="3.5" fill="#d9655b" stroke-linecap="round"/>`
  } else {
    s += shade(`M${cx - 54},${cy + 20} Q${cx - 50},${cy + 38} ${cx - 30},${cy + 40} L${cx + 30},${cy + 40} Q${cx + 10},${cy + 10} ${cx - 54},${cy + 20}Z`, '#2a1c17')
    s += `<path d="M${cx - 30},${cy - 30} Q${cx},${cy - 46} ${cx + 30},${cy - 30} M${cx - 8},${cy - 10} q4,24 0,44 M${cx + 18},${cy - 6} q6,20 2,40" stroke="${HRL}" stroke-width="4" fill="none" stroke-linecap="round"/>`
  }
  // bob ends + cowlick
  s += E_(cx - 56, cy + 30, 16, 17, HR) + E_(cx + 56, cy + 30, 16, 17, HR)
  s += P(`M${cx + 4},${cy - 56} q-2,-12 11,-15 q-3,7 1,14Z`, HR)
  return s
}
function frontView(f, back) { // f: 0 idle, 1..4 walk
  const ph = f ? (f - 1) * Math.PI / 2 : 0, w = f ? 1 : 0, sn = Math.sin(ph)
  const bob = f ? -7 * Math.abs(Math.cos(ph)) : 0, cx = 128, by = bob
  const sd = back ? -1 : 1
  let s = ''
  // legs (lift alternately)
  const liftL = w * Math.max(0, sn) * 12, liftR = w * Math.max(0, -sn) * 12
  s += leg(cx - 22, 262 + by, cx - 23, 372 - liftL, true, -1) + leg(cx + 22, 262 + by, cx + 23, 372 - liftR, true, 1)
  // satchel behind/front
  const bagX = cx + sd * 64
  const bag = `<g transform="rotate(${n(sd * (-6 + 6 * sn * w))} ${bagX} ${226 + by})">` + `<rect x="${bagX - 20}" y="${226 + by}" width="40" height="36" rx="8" fill="${BG}" ${sw}/>` + shade(`M${bagX - 17},${250 + by} L${bagX + 17},${250 + by} L${bagX + 17},${259 + by} L${bagX - 17},${259 + by}Z`, BGS) + `<path d="M${bagX - 20},${236 + by} L${bagX + 20},${236 + by}" stroke="${INK}" stroke-width="4"/></g>`
  if (back) s += bag
  // body: smock top + overalls one silhouette
  s += P(`M${cx - 44},${168 + by} Q${cx - 60},${220 + by} ${cx - 52},${262 + by} Q${cx - 46},${282 + by} ${cx},${282 + by} Q${cx + 46},${282 + by} ${cx + 52},${262 + by} Q${cx + 60},${220 + by} ${cx + 44},${168 + by} Q${cx},${156 + by} ${cx - 44},${168 + by}Z`, SM)
  s += P(`M${cx - 54},${228 + by} Q${cx - 34},${238 + by} ${cx - 24},${226 + by} Q${cx},${236 + by} ${cx + 24},${226 + by} Q${cx + 34},${238 + by} ${cx + 54},${228 + by} Q${cx + 56},${250 + by} ${cx + 52},${262 + by} Q${cx + 46},${284 + by} ${cx},${284 + by} Q${cx - 46},${284 + by} ${cx - 52},${262 + by} Q${cx - 56},${250 + by} ${cx - 54},${228 + by}Z`, OV)
  if (!back) {
    s += P(`M${cx - 26},${228 + by} L${cx - 26},${190 + by} L${cx + 26},${190 + by} L${cx + 26},${228 + by}Z`, OV)
    s += `<rect x="${cx - 13}" y="${200 + by}" width="26" height="18" rx="3" fill="${OVS}" ${sw} stroke-width="3"/>`
    s += `<path d="M${cx - 22},${190 + by} L${cx - 30},${166 + by} M${cx + 22},${190 + by} L${cx + 30},${166 + by}" stroke="${OV}" stroke-width="11" stroke-linecap="round"/>`
    s += `<circle cx="${cx - 20}" cy="${194 + by}" r="4.5" fill="#f2d27a" stroke="${INK}" stroke-width="2.5"/><circle cx="${cx + 20}" cy="${194 + by}" r="4.5" fill="#f2d27a" stroke="${INK}" stroke-width="2.5"/>`
    s += `<path d="M${cx},${244 + by} L${cx},${280 + by}" stroke="${OVS}" stroke-width="3"/>`
  } else {
    s += `<path d="M${cx - 30},${166 + by} L${cx + 18},${230 + by} M${cx + 30},${166 + by} L${cx - 18},${230 + by}" stroke="${OV}" stroke-width="12" stroke-linecap="round"/>`
  }
  s += shade(`M${cx - 54},${232 + by} Q${cx - 50},${278 + by} ${cx - 10},${282 + by} Q${cx - 40},${266 + by} ${cx - 54},${232 + by}Z`, OVS)
  // satchel strap
  s += `<path d="M${cx - sd * 36},${168 + by} L${bagX},${228 + by}" stroke="${ST}" stroke-width="6" stroke-linecap="round"/>`
  if (!back) s += bag
  // arms: sleeves + forearm + mittens, swinging out
  for (const a of [-1, 1]) {
    const sx = cx + a * 50, sy = 186 + by, swing = w * sn * a * (back ? -1 : 1)
    const hx = sx + a * 22, hy = sy + 56 + swing * 8
    s += tube(sx + a * 6, sy + 14, hx, hy - 6, 11, 9, SK)
    s += mitten(hx, hy, -a)
    s += E_(sx, sy, 24, 22, SM) + shade(`M${sx - 20},${sy + 6} Q${sx},${sy + 26} ${sx + 20},${sy + 6} Q${sx},${sy + 16} ${sx - 20},${sy + 6}Z`, SMS)
  }
  // scarf
  s += P(`M${cx - 40},${160 + by} Q${cx},${178 + by} ${cx + 40},${160 + by} L${cx + 38},${148 + by} Q${cx},${162 + by} ${cx - 38},${148 + by}Z`, SC)
  if (!back) s += P(`M${cx + 10},${166 + by} l14,24 l-12,4 l-6,-22Z`, SC) + E_(cx + 10, 166 + by, 8, 7, SCS)
  else s += P(`M${cx - 6},${164 + by} q-4,20 ${-8 - 6 * sn * w},34 l12,0 q2,-16 4,-32Z`, SC)
  s += headFront(cx, 100 + by * 1.15, back)
  return s
}
function sideView(f) { // facing right
  const ph = f ? (f - 1) * Math.PI / 2 : 0, w = f ? 1 : 0, sn = Math.sin(ph)
  const by = f ? -7 * Math.abs(Math.cos(ph)) : 0, cx = 124
  let s = ''
  const legS = (a, far) => { const hx = cx, hy = 262 + by, L = 98, fx = hx + Math.sin(a) * L, fy = Math.min(372, hy + Math.cos(a) * L)
    const c = far ? OVS : OV
    return tube(hx, hy, fx, fy - 30, 19, 17, c) + `<g transform="rotate(${n(-a * 57)} ${fx} ${fy - 30})"><rect x="${fx - 19}" y="${fy - 36}" width="38" height="13" rx="6" fill="${far ? '#6a8fc0' : '#7aa2d4'}" ${sw}/><rect x="${fx - 8}" y="${fy - 24}" width="16" height="12" fill="${SO}" ${sw}/>${E_(fx + 6, fy - 5, 20, 10, far ? '#5e3524' : SH)}</g>` }
  const a1 = 0.42 * sn * w
  s += legS(-a1, true)
  // far arm (behind)
  const armS = (a, far) => { const sx = cx + 4, sy = 186 + by, hx = sx + Math.sin(a) * 52, hy = sy + Math.cos(a) * 52
    return tube(sx, sy + 10, hx, hy - 6, 10, 9, far ? SKS : SK) + mitten(hx, hy, 1, far ? SKS : SK) }
  s += armS(-0.5 * sn * w + 0.05, true)
  // satchel behind hip
  s += `<rect x="${cx - 62}" y="${222 + by}" width="32" height="38" rx="8" fill="${BG}" ${sw} transform="rotate(${n(8 + 8 * sn * w)} ${cx - 46} ${222 + by})"/>`
  // body
  s += P(`M${cx - 30},${166 + by} Q${cx - 50},${222 + by} ${cx - 40},${266 + by} Q${cx - 30},${284 + by} ${cx + 4},${284 + by} Q${cx + 40},${282 + by} ${cx + 42},${256 + by} Q${cx + 46},${214 + by} ${cx + 30},${166 + by} Q${cx},${154 + by} ${cx - 30},${166 + by}Z`, SM)
  s += P(`M${cx - 44},${230 + by} Q${cx - 10},${238 + by} ${cx + 16},${226 + by} L${cx + 16},${192 + by} L${cx + 40},${192 + by} Q${cx + 46},${226 + by} ${cx + 42},${256 + by} Q${cx + 40},${282 + by} ${cx + 4},${284 + by} Q${cx - 30},${284 + by} ${cx - 40},${266 + by} Q${cx - 46},${250 + by} ${cx - 44},${230 + by}Z`, OV)
  s += `<path d="M${cx + 24},${192 + by} L${cx + 8},${166 + by}" stroke="${OV}" stroke-width="11" stroke-linecap="round"/><circle cx="${cx + 26}" cy="${197 + by}" r="4.5" fill="#f2d27a" stroke="${INK}" stroke-width="2.5"/>`
  s += shade(`M${cx - 44},${234 + by} Q${cx - 40},${280 + by} ${cx},${282 + by} Q${cx - 30},${262 + by} ${cx - 44},${234 + by}Z`, OVS)
  s += legS(a1, false)
  s += `<path d="M${cx + 6},${166 + by} L${cx - 46},${226 + by}" stroke="${ST}" stroke-width="6" stroke-linecap="round"/>`
  // near arm
  s += armS(0.5 * sn * w + 0.05, false)
  s += E_(cx + 2, 186 + by, 24, 22, SM) + shade(`M${cx - 18},${192 + by} Q${cx},${212 + by} ${cx + 20},${194 + by} Q${cx},${202 + by} ${cx - 18},${192 + by}Z`, SMS)
  // scarf + tail flowing back
  s += P(`M${cx - 32},${150 + by} Q${cx},${166 + by} ${cx + 32},${152 + by} L${cx + 30},${164 + by} Q${cx},${178 + by} ${cx - 32},${162 + by}Z`, SC)
  s += P(`M${cx - 28},${158 + by} q-22,${6 + 6 * w} ${-34 - 8 * sn * w},${22 - 8 * w} l6,10 q20,-8 32,-22Z`, SC)
  // head profile
  const hy = 100 + by * 1.15, hx = cx + 4
  s += P(`M${hx - 60},${hy + 30} Q${hx - 70},${hy - 44} ${hx},${hy - 58} Q${hx + 56},${hy - 52} ${hx + 50},${hy - 4} L${hx + 10},${hy + 40} L${hx - 44},${hy + 44} Q${hx - 60},${hy + 46} ${hx - 60},${hy + 30}Z`, HR)
  s += P(`M${hx - 8},${hy - 30} Q${hx + 46},${hy - 36} ${hx + 52},${hy + 6} Q${hx + 58},${hy + 14} ${hx + 52},${hy + 22} Q${hx + 48},${hy + 46} ${hx + 16},${hy + 48} Q${hx - 10},${hy + 46} ${hx - 14},${hy + 20}Z`, SK)
  s += P(`M${hx - 14},${hy + 26} Q${hx - 20},${hy - 46} ${hx + 20},${hy - 46} Q${hx + 56},${hy - 40} ${hx + 54},${hy - 2} Q${hx + 42},${hy - 14} ${hx + 32},${hy - 8} Q${hx + 22},${hy - 18} ${hx + 10},${hy - 8} Q${hx - 2},${hy - 4} ${hx - 14},${hy + 26}Z`, HR)
  s += `<ellipse cx="${hx + 34}" cy="${hy + 14}" rx="6" ry="10" fill="${INK}"/><circle cx="${hx + 36}" cy="${hy + 10}" r="2.8" fill="#fff"/>`
  s += `<ellipse cx="${hx + 30}" cy="${hy + 30}" rx="8" ry="5" fill="${BL}" opacity=".85"/><path d="M${hx + 40},${hy + 36} q5,4 9,0" stroke="${INK}" stroke-width="3" fill="none" stroke-linecap="round"/>`
  s += E_(hx - 44, hy + 32, 17, 17, HR) + P(`M${hx + 2},${hy - 56} q-3,-12 10,-16 q-2,8 2,15Z`, HR)
  s += `<path d="M${hx - 40},${hy - 24} Q${hx - 20},${hy - 46} ${hx + 6},${hy - 46}" stroke="${HRL}" stroke-width="5" fill="none" stroke-linecap="round"/>`
  return s
}
const cells = []
for (let r = 0; r < ROWS; r++) for (let f = 0; f < COLS; f++) {
  const body = r === 0 ? frontView(f, false) : r === 1 ? frontView(f, true) : sideView(f)
  cells.push(`<g transform="translate(${f * W},${r * H})">${body}</g>`)
}
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W * COLS}" height="${H * ROWS}" viewBox="0 0 ${W * COLS} ${H * ROWS}">${cells.join('')}</svg>`
fs.writeFileSync('src/assets/traveller-sheet.svg', svg)
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: W * COLS, height: H * ROWS } })
await p.setContent(`<html><body style="margin:0;background:transparent">${svg}</body></html>`)
await p.screenshot({ path: 'src/assets/traveller-sheet.png', omitBackground: true })
await p.setContent(`<html><body style="margin:0;background:repeating-conic-gradient(#eee 0 25%,#fff 0 50%) 0 0/32px 32px">${svg}</body></html>`)
await p.screenshot({ path: 'screenshots/proto-sprite-sheet.png' }); await b.close()
