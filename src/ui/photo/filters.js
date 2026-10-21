// Photo-mode filters (Stage C, art-c). No extra render pass: the live view is a CSS `filter` on the WebGL canvas plus a few
// DOM overlay layers (tint / vignette / grain / light leak), and gradeCanvas() bakes the identical look into the saved image.
// FILTERS[id] = { label, sub, css: { brightness, contrast, saturate, sepia, grayscale, hue }, layers: Layer[] }
// Layer = { kind: 'tint', color, mode, alpha } | { kind: 'vignette', alpha } | { kind: 'grain', alpha } | { kind: 'leak', color, alpha }
// mode is a CSS mix-blend-mode that is also a canvas globalCompositeOperation: 'soft-light' | 'multiply' | 'screen' | 'overlay'.
export const FILTER_IDS = ['none', 'sunny', 'sepia', 'ink', 'pastel', 'twilight', 'film']
export const FILTERS = {
  none: { label: 'Natural', sub: 'just as it is', css: {}, layers: [] },
  sunny: { label: 'Sunny', sub: 'warm afternoon', css: { brightness: 1.05, contrast: 1.06, saturate: 1.18, sepia: 0.1 }, layers: [{ kind: 'tint', color: '#ffc77a', mode: 'soft-light', alpha: 0.4 }, { kind: 'leak', color: '#ffd9a0', alpha: 0.35 }] },
  sepia: { label: 'Old letter', sub: 'sepia keepsake', css: { sepia: 0.78, contrast: 0.94, brightness: 1.05, saturate: 0.9 }, layers: [{ kind: 'tint', color: '#f1dcb2', mode: 'multiply', alpha: 0.3 }, { kind: 'vignette', alpha: 0.4 }, { kind: 'grain', alpha: 0.12 }] },
  ink: { label: 'Ink & wash', sub: 'sketchbook', css: { grayscale: 1, contrast: 1.32, brightness: 1.1 }, layers: [{ kind: 'tint', color: '#f3e8cf', mode: 'multiply', alpha: 0.6 }, { kind: 'grain', alpha: 0.1 }, { kind: 'vignette', alpha: 0.2 }] },
  pastel: { label: 'Pastel', sub: 'spring morning', css: { saturate: 0.72, brightness: 1.1, contrast: 0.86 }, layers: [{ kind: 'tint', color: '#f9cfe2', mode: 'soft-light', alpha: 0.45 }, { kind: 'tint', color: '#ffffff', mode: 'screen', alpha: 0.1 }] },
  twilight: { label: 'Twilight', sub: 'blue hour', css: { brightness: 0.94, contrast: 1.06, saturate: 1.08, hue: -8 }, layers: [{ kind: 'tint', color: '#6474d6', mode: 'soft-light', alpha: 0.55 }, { kind: 'leak', color: '#ff9b8a', alpha: 0.3 }, { kind: 'vignette', alpha: 0.45 }] },
  film: { label: 'Summer film', sub: 'old camera', css: { contrast: 1.12, saturate: 1.06, sepia: 0.1, brightness: 1.02 }, layers: [{ kind: 'tint', color: '#2e7a74', mode: 'soft-light', alpha: 0.28 }, { kind: 'leak', color: '#ff8a4a', alpha: 0.32 }, { kind: 'grain', alpha: 0.2 }, { kind: 'vignette', alpha: 0.32 }] },
}
/** CSS filter string for the live view (apply to the WebGL canvas element) */
export function filterCss(id) {
  const c = (FILTERS[id] || FILTERS.none).css, f = []
  if (c.sepia) f.push(`sepia(${c.sepia})`); if (c.grayscale) f.push(`grayscale(${c.grayscale})`); if (c.saturate != null) f.push(`saturate(${c.saturate})`)
  if (c.hue) f.push(`hue-rotate(${c.hue}deg)`); if (c.brightness != null) f.push(`brightness(${c.brightness})`); if (c.contrast != null) f.push(`contrast(${c.contrast})`)
  return f.join(' ') || 'none'
}
/** set the live filter on a canvas element; returns a function that removes it */
export function applyLiveFilter(el, id) { const prev = el.style.filter; el.style.filter = filterCss(id) === 'none' ? '' : filterCss(id); return () => { el.style.filter = prev } }
// ---- the same maths for the saved photo (CSS filter-function matrices from the Filter Effects spec) ----
const mul = (a, b) => { const r = new Array(12); for (let i = 0; i < 3; i++) { for (let j = 0; j < 3; j++) r[i * 4 + j] = a[i * 4] * b[j] + a[i * 4 + 1] * b[4 + j] + a[i * 4 + 2] * b[8 + j]; r[i * 4 + 3] = a[i * 4] * b[3] + a[i * 4 + 1] * b[7] + a[i * 4 + 2] * b[11] + a[i * 4 + 3] } return r }
const M = {
  sepia: (a) => { const k = 1 - a; return [0.393 + 0.607 * k, 0.769 - 0.769 * k, 0.189 - 0.189 * k, 0, 0.349 - 0.349 * k, 0.686 + 0.314 * k, 0.168 - 0.168 * k, 0, 0.272 - 0.272 * k, 0.534 - 0.534 * k, 0.131 + 0.869 * k, 0] },
  grayscale: (a) => { const k = 1 - a; return [0.2126 + 0.7874 * k, 0.7152 - 0.7152 * k, 0.0722 - 0.0722 * k, 0, 0.2126 - 0.2126 * k, 0.7152 + 0.2848 * k, 0.0722 - 0.0722 * k, 0, 0.2126 - 0.2126 * k, 0.7152 - 0.7152 * k, 0.0722 + 0.9278 * k, 0] },
  saturate: (s) => [0.213 + 0.787 * s, 0.715 - 0.715 * s, 0.072 - 0.072 * s, 0, 0.213 - 0.213 * s, 0.715 + 0.285 * s, 0.072 - 0.072 * s, 0, 0.213 - 0.213 * s, 0.715 - 0.715 * s, 0.072 + 0.928 * s, 0],
  hue: (d) => { const a = d * Math.PI / 180, c = Math.cos(a), s = Math.sin(a); return [0.213 + c * 0.787 - s * 0.213, 0.715 - c * 0.715 - s * 0.715, 0.072 - c * 0.072 + s * 0.928, 0, 0.213 - c * 0.213 + s * 0.143, 0.715 + c * 0.285 + s * 0.14, 0.072 - c * 0.072 - s * 0.283, 0, 0.213 - c * 0.213 - s * 0.787, 0.715 - c * 0.715 + s * 0.715, 0.072 + c * 0.928 + s * 0.072, 0] },
  brightness: (b) => [b, 0, 0, 0, 0, b, 0, 0, 0, 0, b, 0],
  contrast: (c) => [c, 0, 0, 0.5 - 0.5 * c, 0, c, 0, 0.5 - 0.5 * c, 0, 0, c, 0.5 - 0.5 * c],
}
/** the filter chain as one 3x4 matrix (same order as filterCss) — exported for tests */
export function filterMatrix(id) {
  const c = (FILTERS[id] || FILTERS.none).css; let m = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0]
  for (const k of ['sepia', 'grayscale', 'saturate', 'hue', 'brightness', 'contrast']) if (c[k] != null && c[k] !== 0) m = mul(M[k](c[k]), m)
  return m
}
let GRAIN = null
function grainTile() { if (GRAIN) return GRAIN; const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'), d = x.createImageData(128, 128)
  let s = 12345; for (let i = 0; i < d.data.length; i += 4) { s = (s * 16807) % 2147483647; const v = 128 + ((s / 2147483647) - 0.5) * 200; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255 } x.putImageData(d, 0, 0); return (GRAIN = c) }
function drawLayers(x, w, h, layers) {
  for (const L of layers) {
    x.save()
    if (L.kind === 'tint') { x.globalCompositeOperation = L.mode; x.globalAlpha = L.alpha; x.fillStyle = L.color; x.fillRect(0, 0, w, h) }
    else if (L.kind === 'vignette') { const g = x.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.32, w / 2, h / 2, Math.hypot(w, h) * 0.56); g.addColorStop(0, 'rgba(40,28,20,0)'); g.addColorStop(1, `rgba(40,28,20,${L.alpha})`); x.globalCompositeOperation = 'multiply'; x.fillStyle = g; x.fillRect(0, 0, w, h) }
    else if (L.kind === 'leak') { const g = x.createRadialGradient(w * 0.92, h * 0.08, 0, w * 0.92, h * 0.08, Math.max(w, h) * 0.6); g.addColorStop(0, L.color); g.addColorStop(1, 'rgba(0,0,0,0)'); x.globalCompositeOperation = 'screen'; x.globalAlpha = L.alpha; x.fillStyle = g; x.fillRect(0, 0, w, h) }
    else if (L.kind === 'grain') { x.globalCompositeOperation = 'overlay'; x.globalAlpha = L.alpha; x.fillStyle = x.createPattern(grainTile(), 'repeat'); x.fillRect(0, 0, w, h) }
    x.restore()
  }
}
/**
 * gradeCanvas(src, id, opts) -> HTMLCanvasElement — the saved photo, with the same look as the live view.
 * src: the captured frame (HTMLCanvasElement | ImageBitmap | HTMLImageElement). opts: { frame: boolean (paper border + caption),
 * caption: string (e.g. 'Day 3 · Spring · the lake'), maxW: number (downscale first, e.g. 1920) }.
 * Uses ctx.filter where the browser supports it (fast) and an exact per-pixel matrix otherwise (Safari).
 */
export function gradeCanvas(src, id = 'none', opts = {}) {
  const F = FILTERS[id] || FILTERS.none, sw = src.width, sh = src.height, k = opts.maxW && sw > opts.maxW ? opts.maxW / sw : 1
  const w = Math.round(sw * k), h = Math.round(sh * k), c = document.createElement('canvas'); c.width = w; c.height = h
  const x = c.getContext('2d', { willReadFrequently: false }), css = filterCss(id)
  if (css !== 'none' && typeof x.filter === 'string') { x.filter = css; x.drawImage(src, 0, 0, w, h); x.filter = 'none' }
  else { x.drawImage(src, 0, 0, w, h); if (css !== 'none') { const m = filterMatrix(id), d = x.getImageData(0, 0, w, h), p = d.data
    for (let i = 0; i < p.length; i += 4) { const r = p[i] / 255, g = p[i + 1] / 255, b = p[i + 2] / 255
      p[i] = 255 * (m[0] * r + m[1] * g + m[2] * b + m[3]); p[i + 1] = 255 * (m[4] * r + m[5] * g + m[6] * b + m[7]); p[i + 2] = 255 * (m[8] * r + m[9] * g + m[10] * b + m[11]) }
    x.putImageData(d, 0, 0) } }
  drawLayers(x, w, h, F.layers)
  return opts.frame ? paperFrame(c, opts.caption) : c
}
// a soft paper mat with a handwritten caption (TPSerif), like a photo tucked into a journal
function paperFrame(img, caption = '') {
  const w = img.width, h = img.height, m = Math.round(Math.min(w, h) * 0.045), bot = Math.round(m * (caption ? 2.6 : 1)), c = document.createElement('canvas')
  c.width = w + m * 2; c.height = h + m + bot; const x = c.getContext('2d')
  const g = x.createLinearGradient(0, 0, 0, c.height); g.addColorStop(0, '#fbf4e4'); g.addColorStop(1, '#efe2c4'); x.fillStyle = g; x.fillRect(0, 0, c.width, c.height)
  x.drawImage(img, m, m); x.strokeStyle = 'rgba(59,47,34,.55)'; x.lineWidth = Math.max(1.5, m * 0.06); x.strokeRect(m, m, w, h)
  if (caption) { x.fillStyle = '#3b2f22'; x.font = `italic 500 ${Math.round(bot * 0.42)}px TPSerif, "Cormorant Garamond", Georgia, serif`; x.textBaseline = 'middle'; x.fillText(caption, m * 1.2, h + m + bot / 2) }
  return c
}
/** small JPEG for the journal Photos tab (Codor stores ≤ 12): data URL, longest side maxW px */
export function photoThumb(canvas, maxW = 320, quality = 0.72) {
  const k = Math.min(1, maxW / Math.max(canvas.width, canvas.height)), c = document.createElement('canvas'); c.width = Math.round(canvas.width * k); c.height = Math.round(canvas.height * k)
  c.getContext('2d').drawImage(canvas, 0, 0, c.width, c.height); return c.toDataURL('image/jpeg', quality)
}
/** CSS for the live overlay layers (PhotoMode renders these as divs above the canvas, under its own UI) */
export function layerStyle(L) {
  if (L.kind === 'tint') return { background: L.color, mixBlendMode: L.mode, opacity: L.alpha }
  if (L.kind === 'vignette') return { background: `radial-gradient(ellipse at 50% 50%, rgba(40,28,20,0) 45%, rgba(40,28,20,${L.alpha}) 100%)`, mixBlendMode: 'multiply' }
  if (L.kind === 'leak') return { background: `radial-gradient(circle at 92% 8%, ${L.color}, rgba(0,0,0,0) 60%)`, mixBlendMode: 'screen', opacity: L.alpha }
  if (L.kind === 'grain') return { backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'160\' height=\'160\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'.9\' numOctaves=\'2\' stitchTiles=\'stitch\'/%3E%3CfeColorMatrix values=\'0 0 0 0 .5 0 0 0 0 .5 0 0 0 0 .5 0 0 0 1.4 -.2\'/%3E%3C/filter%3E%3Crect width=\'160\' height=\'160\' filter=\'url(%23n)\'/%3E%3C/svg%3E")', mixBlendMode: 'overlay', opacity: L.alpha * 2.2 }
  return {}
}
