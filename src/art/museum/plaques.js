// Plaque atlas (art-c item 7): one canvas, a brass-edged cream card per donatable id + a '?' card, and one merged
// geometry for every plaque in the hall (uv per slot). Donated slots show the name; empty slots show the '?' card.
import * as THREE from 'three'
import { SLOTS } from './layout.js'
const COLS = 4, CW = 256, CH = 96
export const PLAQUE_CELLS = [...SLOTS.map(s => s.id), '?']
let TEX = null
export function plaqueTexture(nameOf = (id) => id) {
  if (TEX || typeof document === 'undefined') return TEX
  const rows = Math.ceil(PLAQUE_CELLS.length / COLS), cv = document.createElement('canvas'); cv.width = COLS * CW; cv.height = rows * CH; const x = cv.getContext('2d')
  PLAQUE_CELLS.forEach((id, i) => { const cx = (i % COLS) * CW, cy = Math.floor(i / COLS) * CH
    x.fillStyle = '#b07a2a'; x.fillRect(cx, cy, CW, CH); x.fillStyle = id === '?' ? '#e9dcc0' : '#f6ecd4'; x.fillRect(cx + 7, cy + 7, CW - 14, CH - 14)
    x.strokeStyle = '#6a4a1a'; x.lineWidth = 3; x.strokeRect(cx + 12, cy + 12, CW - 24, CH - 24)
    x.fillStyle = '#3b2f22'; x.textAlign = 'center'; x.textBaseline = 'middle'
    if (id === '?') { x.font = 'italic 600 56px TPSerif, "Cormorant Garamond", Georgia, serif'; x.globalAlpha = 0.55; x.fillText('?', cx + CW / 2, cy + CH / 2 + 2); x.globalAlpha = 1 }
    else { const n = nameOf(id); let fs = 40; x.font = `italic 600 ${fs}px TPSerif, "Cormorant Garamond", Georgia, serif`; while (x.measureText(n).width > CW - 40 && fs > 22) { fs -= 2; x.font = `italic 600 ${fs}px TPSerif, "Cormorant Garamond", Georgia, serif` } x.fillText(n, cx + CW / 2, cy + CH / 2 + 2) }
    for (const [sx, sy] of [[18, 18], [CW - 18, 18], [18, CH - 18], [CW - 18, CH - 18]]) { x.fillStyle = '#d9a54a'; x.beginPath(); x.arc(cx + sx, cy + sy, 4, 0, 7); x.fill() } })
  TEX = new THREE.CanvasTexture(cv); TEX.colorSpace = THREE.SRGBColorSpace; TEX.anisotropy = 4; return TEX
}
const uvOf = (id) => { const i = PLAQUE_CELLS.indexOf(id), rows = Math.ceil(PLAQUE_CELLS.length / COLS), c = i % COLS, r = Math.floor(i / COLS); return [c / COLS, 1 - (r + 1) / rows, (c + 1) / COLS, 1 - r / rows] }
/** all plaques, one geometry: relic plaques lean on the plinth fronts (+z), fish plaques sit on the tank cabinet (+x) */
export function plaquesGeometry(donated = {}) {
  const pos = [], uv = [], nrm = [], m = new THREE.Matrix4(), v = new THREE.Vector3(), n = new THREE.Vector3()
  for (const s of SLOTS) { const has = donated[s.id] !== undefined, [u0, v0, u1, v1] = uvOf(has ? s.id : '?'), w = 0.13, h = 0.048
    if (s.kind === 'relic') m.makeRotationX(-0.35).setPosition(s.x, 0.115, s.z + 0.088); else m.makeRotationY(Math.PI / 2).setPosition(-1.36 + 0.19 + 0.031, 0.13, s.z)
    const q = [[-w / 2, -h / 2, u0, v0], [w / 2, -h / 2, u1, v0], [w / 2, h / 2, u1, v1], [-w / 2, -h / 2, u0, v0], [w / 2, h / 2, u1, v1], [-w / 2, h / 2, u0, v1]]
    n.set(0, 0, 1).transformDirection(m)
    for (const [x, y, a, b] of q) { v.set(x, y, 0).applyMatrix4(m); pos.push(v.x, v.y, v.z); uv.push(a, b); nrm.push(n.x, n.y, n.z) } }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3)); g.computeBoundingSphere(); return g
}
