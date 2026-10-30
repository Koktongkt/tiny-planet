// r7 minimap: Ghibli parchment world map on a plain 2D canvas (no WebGL draw calls).
// The base (paper, washes, water, path, river, landmarks, labels) is painted once into an offscreen canvas;
// a ~10 Hz timer only blits it and redraws the markers (player arrow, Pip). Toggle: M key or the small button.
import React, { useEffect, useRef, useState } from 'react'
import { R, height, ZONES, pathDir, streamDir, waterAt, BRIDGES, dir } from '../world.js'
import './minimap.css'

const TOUCH = typeof window !== 'undefined' && (matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window)
const LAT0 = -1.25, LAT1 = 1.35 // the band that has anything on it (poles are empty meadow)
const ll = (n) => [Math.atan2(n.x, n.z), Math.asin(Math.max(-1, Math.min(1, n.y / Math.hypot(n.x, n.y, n.z))))]
const INK = '#4a3a35', PAPER = '#f1e4c6'
function rng(s) { return () => (s = (s * 16807) % 2147483647) / 2147483647 }

function paintBase(W, H, dpr) {
  const c = document.createElement('canvas'); c.width = W * dpr; c.height = H * dpr; const g = c.getContext('2d'); g.scale(dpr, dpr)
  const X = (lon) => ((lon + Math.PI) / (2 * Math.PI)) * W, Y = (lat) => ((LAT1 - lat) / (LAT1 - LAT0)) * H
  const r = rng(7)
  // paper + soft grain + warm vignette
  g.fillStyle = PAPER; g.fillRect(0, 0, W, H)
  for (let i = 0; i < W * H * 0.06; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '120,90,50' : '255,250,235'},${0.04 + r() * 0.06})`; g.fillRect(r() * W, r() * H, 1 + r(), 1 + r()) }
  const vg = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.7); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(120,80,40,0.28)'); g.fillStyle = vg; g.fillRect(0, 0, W, H)
  // terrain washes + water mask on a coarse grid
  const GX = 150, GY = Math.round(GX * H / W), wet = new Uint8Array(GX * GY), cw = W / GX, ch = H / GY
  for (let j = 0; j < GY; j++) for (let i = 0; i < GX; i++) { const lon = -Math.PI + (i + 0.5) / GX * 2 * Math.PI, lat = LAT1 - (j + 0.5) / GY * (LAT1 - LAT0), n = dir(lat, lon)
    if (waterAt(n, 0)) { wet[j * GX + i] = 1; continue }
    const h = height(n); g.fillStyle = h > 0.35 ? `rgba(150,120,80,${Math.min(0.32, (h - 0.35) * 0.5)})` : `rgba(120,160,90,${0.1 + Math.max(0, h) * 0.25})`; g.fillRect(i * cw, j * ch, cw + 0.6, ch + 0.6) }
  g.fillStyle = 'rgba(110,160,190,0.75)'; for (let k = 0; k < wet.length; k++) if (wet[k]) g.fillRect((k % GX) * cw, Math.floor(k / GX) * ch, cw + 0.6, ch + 0.6)
  // ink shoreline: pixel edges of the wet mask, a little jitter for the hand-drawn wobble
  g.strokeStyle = INK; g.lineWidth = 0.9; g.lineCap = 'round'; g.beginPath(); const jt = () => (r() - 0.5) * 0.5
  for (let j = 0; j < GY; j++) for (let i = 0; i < GX; i++) { if (!wet[j * GX + i]) continue; const x = i * cw, y = j * ch
    if (j === 0 || !wet[(j - 1) * GX + i]) { g.moveTo(x + jt(), y + jt()); g.lineTo(x + cw + jt(), y + jt()) }
    if (j === GY - 1 || !wet[(j + 1) * GX + i]) { g.moveTo(x + jt(), y + ch + jt()); g.lineTo(x + cw + jt(), y + ch + jt()) }
    if (!wet[j * GX + ((i + GX - 1) % GX)]) { g.moveTo(x + jt(), y + jt()); g.lineTo(x + jt(), y + ch + jt()) }
    if (!wet[j * GX + ((i + 1) % GX)]) { g.moveTo(x + cw + jt(), y + jt()); g.lineTo(x + cw + jt(), y + ch + jt()) } }
  g.stroke()
  // curves (path dashed, river centre line), split where they wrap around the date line
  const curve = (f, N, style, width, dash) => { g.save(); g.strokeStyle = style; g.lineWidth = width; g.setLineDash(dash || []); g.beginPath(); let px = null
    for (let k = 0; k <= N; k++) { const [lon, lat] = ll(f(k / N * Math.PI * 2).normalize()), x = X(lon), y = Y(lat); if (px === null || Math.abs(x - px) > W / 2) g.moveTo(x, y); else g.lineTo(x + (r() - 0.5) * 0.4, y + (r() - 0.5) * 0.4); px = x }
    g.stroke(); g.restore() }
  curve(streamDir, 600, 'rgba(70,120,160,0.9)', 1.1)
  curve(pathDir, 500, '#8a6c46', 1.4, [3, 2.2])
  // forest: little ink tree glyphs inside the forest + giant zones
  const tree = (x, y, s) => { g.fillStyle = 'rgba(80,120,70,0.85)'; g.strokeStyle = INK; g.lineWidth = 0.6; g.beginPath(); g.moveTo(x, y - s); g.lineTo(x + s * 0.7, y + s * 0.5); g.lineTo(x - s * 0.7, y + s * 0.5); g.closePath(); g.fill(); g.stroke() }
  for (const k of ['forest', 'giant']) { const z = ZONES[k]; for (let i = 0; i < (k === 'forest' ? 22 : 6); i++) { const a = r() * 6.28, d = Math.sqrt(r()) * z.r; const lat = z.lat + Math.sin(a) * d, lon = z.lon + Math.cos(a) * d / Math.max(0.3, Math.cos(z.lat)); const n = dir(lat, lon); if (waterAt(n, -0.05)) continue; const [lo, la] = ll(n); tree(X(lo), Y(la), 2.6 + r()) } }
  // bridges
  for (const b of BRIDGES) { const [lo, la] = ll(b.c); g.save(); g.translate(X(lo), Y(la)); const [l2, a2] = ll(b.c.clone().add(b.tan.clone().multiplyScalar(0.01)).normalize()); g.rotate(Math.atan2(Y(a2) - Y(la), X(l2) - X(lo))); g.fillStyle = '#b07a4f'; g.strokeStyle = INK; g.lineWidth = 0.7; g.fillRect(-4, -1.6, 8, 3.2); g.strokeRect(-4, -1.6, 8, 3.2); g.restore() }
  // village + home + mills: house glyphs
  const house = (x, y, s, col) => { g.fillStyle = '#f6ecd8'; g.strokeStyle = INK; g.lineWidth = 0.7; g.fillRect(x - s, y - s * 0.4, s * 2, s * 1.3); g.strokeRect(x - s, y - s * 0.4, s * 2, s * 1.3); g.fillStyle = col; g.beginPath(); g.moveTo(x - s * 1.3, y - s * 0.4); g.lineTo(x, y - s * 1.5); g.lineTo(x + s * 1.3, y - s * 0.4); g.closePath(); g.fill(); g.stroke() }
  const V = [1.05, 0.2]; for (const [dx, dy] of [[-5, 1], [4, -1], [0, -4], [-1, 4]]) house(X(V[1]) + dx, Y(V[0]) + dy, 2.4, '#c9574b')
  const L = window.__layout; if (L?.homeN) { const [lo, la] = ll(L.homeN); house(X(lo), Y(la), 3, '#d9655b'); g.strokeStyle = INK; g.lineWidth = 0.8; g.beginPath(); g.arc(X(lo), Y(la) - 1, 6.5, 0, 6.28); g.stroke() }
  for (const [la, lo] of [[0.25, 1.4], [0.45, 1.75]]) { const x = X(lo), y = Y(la); g.strokeStyle = INK; g.lineWidth = 0.8; g.beginPath(); for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + 0.4; g.moveTo(x, y); g.lineTo(x + Math.cos(a) * 4, y + Math.sin(a) * 4) } g.stroke() }
  // labels
  g.fillStyle = 'rgba(74,58,53,0.85)'; g.font = `italic ${Math.max(7, W / 34)}px "Cormorant Garamond", Georgia, serif`; g.textAlign = 'center'
  const lab = (t, la, lo, dy = -7) => g.fillText(t, X(lo), Y(la) + dy)
  lab('Lake', ZONES.lake.lat, ZONES.lake.lon, 3); lab('Harbour', ZONES.harbour.lat, ZONES.harbour.lon, 3); lab('Forest', ZONES.forest.lat - 0.18, ZONES.forest.lon, 0); lab('Village', V[0], V[1], -8); lab('Mills', 0.35, 1.58, -8); lab('Meadow', ZONES.meadow.lat, ZONES.meadow.lon, 0)
  // compass rose + hand-inked double border
  g.strokeStyle = INK; g.lineWidth = 0.8; const cx = W - 12, cy = H - 13; g.beginPath(); g.moveTo(cx, cy - 7); g.lineTo(cx + 2.5, cy); g.lineTo(cx, cy + 7); g.lineTo(cx - 2.5, cy); g.closePath(); g.stroke(); g.font = `${Math.max(6, W / 40)}px Georgia, serif`; g.fillStyle = INK; g.fillText('N', cx, cy - 9)
  g.lineWidth = 1.4; g.strokeRect(2.5, 2.5, W - 5, H - 5); g.lineWidth = 0.6; g.strokeRect(5.5, 5.5, W - 11, H - 11)
  return { c, X, Y }
}

const phone = () => typeof document !== 'undefined' && document.documentElement.classList.contains('tp-touch')
export default function Minimap() {
  const ref = useRef(), [on, setOn] = useState(() => !phone()), [idle, setIdle] = useState(false), [size, setSize] = useState(null)
  useEffect(() => { const k = (e) => { if (e.key?.toLowerCase() !== 'm' || /input|textarea/i.test(e.target?.tagName || '') || document.querySelector('.tp-talk, .talk-open')) return; setOn(v => !v) }; addEventListener('keydown', k); return () => removeEventListener('keydown', k) }, [])
  useEffect(() => { const fit = () => { const el = ref.current; if (el) setSize([el.clientWidth, el.clientHeight]) }; fit(); addEventListener('resize', fit); return () => removeEventListener('resize', fit) }, [on])
  useEffect(() => { if (!on || !size || !size[0]) return; const [W, H] = size, dpr = Math.min(2, devicePixelRatio || 1), cv = ref.current; cv.width = W * dpr; cv.height = H * dpr
    const g = cv.getContext('2d'); let base = null, t0 = performance.now()
    const tick = () => { const pad = document.querySelector('.tp-pad'); setIdle(!!(pad && pad.classList.contains('tp-idle')))
      if (!base) { if (!window.__layout && performance.now() - t0 < 4000) return; base = paintBase(W, H, dpr); window.__minimap = { paintedMs: +(performance.now() - t0).toFixed(1), ticks: 0 } }
      const s = performance.now(); g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(base.c, 0, 0); g.setTransform(dpr, 0, 0, dpr, 0, 0)
      const P = window.__player, H_ = window.__home; if (!P) return
      const inside = H_?.inside, n = inside && window.__layout?.homeN ? window.__layout.homeN : P.n, [lon, lat] = ll(n), x = base.X(lon), y = base.Y(lat)
      const D = window.__dog; if (D?.n && !inside) { const [dl, da] = ll(D.n); g.fillStyle = '#c98a4b'; g.strokeStyle = INK; g.lineWidth = 0.7; g.beginPath(); g.arc(base.X(dl), base.Y(da), 2, 0, 6.28); g.fill(); g.stroke() }
      const f = P.face && P.face.lengthSq() > 0.5 ? P.face : P.fwd, east = { x: Math.cos(lon), z: -Math.sin(lon) }, fe = f.x * east.x + f.z * east.z, fn = f.y * Math.cos(lat) - (f.x * Math.sin(lon) + f.z * Math.cos(lon)) * Math.sin(lat)
      const a = Math.atan2(fe, fn); g.save(); g.translate(x, y); g.rotate(a); g.fillStyle = '#d9534f'; g.strokeStyle = INK; g.lineWidth = 0.9; g.beginPath(); g.moveTo(0, -6); g.lineTo(4, 4); g.lineTo(0, 2); g.lineTo(-4, 4); g.closePath(); g.fill(); g.stroke(); g.restore()
      window.__minimap.ticks++; window.__minimap.lastMs = +(performance.now() - s).toFixed(2) }
    const id = setInterval(tick, 100); tick(); return () => clearInterval(id) }, [on, size])
  if (phone() && !on) return null
  return <div className={'mm-wrap' + (idle ? ' mm-idle' : '') + ((TOUCH || phone()) ? ' mm-touch' : '')}>
    {on && <canvas ref={ref} className="mm-map" aria-label="map" />}
    <button className="mm-btn" title="Map (M)" aria-label={on ? 'Close map' : 'Map'} onClick={() => setOn(v => !v)} onPointerDown={e => e.stopPropagation()}>{on ? '×' : '🗺'}</button>
  </div>
}
