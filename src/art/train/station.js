// Stage C stations (art-c): a small wooden platform per stop with a shelter roof, bench, lamp (lit by the game's existing
// night pass: common.jsx glow() materials brighten at dusk/night), a station sign and a timetable board.
// Per station = 4 draw calls (toon body, ink hull, lamp glow, sign+timetable) and ~500 tris; geometry is shared.
// Local frame: x = along the track (east), y = up, z = away from the rails (rails at z ≈ -0.30, the platformN offset).
import * as THREE from 'three'
import { kit, tris } from './kit.js'
import { R, TRAIN_LAT, dir, height } from '../../world.js'
import { toon, glow, paint, INK } from '../../common.jsx'

export const STATION_NAMES = { village: 'Lakeside', forest: 'Forest Edge' }
const C = { plank: '#c0915f', plank2: '#a8784c', stone: '#b9b2a2', edge: '#f2e4bc', post: '#6e4a33', roof: '#3f6f6a', roofEdge: '#efe2c4', panel: '#efe2c4', bench: '#8a5a3c', iron: '#3b3633', lamp: '#4a3f37', green: '#6f9e4f', bloom: '#e8737a' }
export function buildStationGeometry({ touch = false } = {}) {
  const K = kit({ ink: 0.006 })
  // deck (stone skirt + plank top) and the cream safety edge on the track side
  K.box(1.3, 0.09, 0.34, [0, -0.015, -0.01], C.stone)
  K.box(1.28, 0.012, 0.32, [0, 0.036, -0.01], C.plank, { hull: false })
  K.box(1.3, 0.008, 0.022, [0, 0.038, -0.17], C.edge, { hull: false })
  for (const x of [-0.45, -0.15, 0.15, 0.45]) K.box(0.004, 0.003, 0.3, [x, 0.0425, -0.01], C.plank2, { hull: false }) // plank seams
  // shelter: 4 posts + gabled roof (two slabs) with a cream fascia, low back panel
  for (const x of [-0.3, 0.3]) for (const z of [-0.07, 0.11]) K.box(0.026, 0.4, 0.026, [x, 0.24, z], C.post)
  for (const s of [-1, 1]) K.box(0.8, 0.024, 0.17, [0, 0.47 - 0.03, 0.02 + s * 0.075], C.roof, { rot: [s * 0.38, 0, 0] })
  K.box(0.82, 0.03, 0.012, [0, 0.415, -0.1], C.roofEdge, { hull: false })
  K.box(0.62, 0.15, 0.014, [0, 0.12, 0.115], C.panel)
  // bench against the back panel
  K.box(0.3, 0.014, 0.07, [0, 0.085, 0.07], C.bench); K.box(0.3, 0.05, 0.012, [0, 0.125, 0.1], C.bench, { hull: false })
  for (const x of [-0.13, 0.13]) K.box(0.014, 0.045, 0.06, [x, 0.06, 0.07], C.iron, { hull: false })
  // lamp post (east end): post, little arm, lantern housing; the bulb is the glow part
  K.box(0.018, 0.44, 0.018, [0.55, 0.26, -0.11], C.iron)
  K.box(0.07, 0.012, 0.012, [0.55, 0.47, -0.08], C.iron, { hull: false })
  K.box(0.05, 0.012, 0.05, [0.55, 0.45, -0.05], C.lamp, { hull: false })
  K.box(0.03, 0.04, 0.03, [0.55, 0.42, -0.05], '#ffd28a', { glow: true })
  K.box(0.044, 0.01, 0.044, [0.55, 0.395, -0.05], C.lamp, { hull: false })
  // station sign posts (west end; the board itself is the textured part)
  for (const x of [-0.66, -0.4]) K.box(0.016, 0.32, 0.016, [x, 0.17, -0.11], C.post)
  // planter by the bench end (cozy): box + a green mound + a few blooms
  if (!touch) { K.box(0.12, 0.05, 0.06, [0.42, 0.065, 0.1], C.plank2); K.box(0.1, 0.03, 0.045, [0.42, 0.1, 0.1], C.green, { hull: false }); for (const x of [0.39, 0.43, 0.46]) K.box(0.014, 0.014, 0.014, [x, 0.12, 0.1 - 0.01 + (x * 31 % 0.02)], C.bloom, { hull: false }) }
  return K.build()
}
// sign + timetable boards: double-sided quads into one geometry, uv into a 2×2 atlas (row = station)
export const ATLAS_ROWS = ['village', 'forest']
export function buildBoardsGeometry(id) {
  const row = Math.max(0, ATLAS_ROWS.indexOf(id)), v0 = row === 0 ? 0.5 : 0, v1 = v0 + 0.5, pos = [], uv = [], nrm = []
  const quad = (cx, cy, cz, w, h, u0, u1, face) => { // face: +1 = faces -z (track side), -1 = faces +z
    const x0 = cx - w / 2 * face, x1 = cx + w / 2 * face, y0 = cy - h / 2, y1 = cy + h / 2, z = cz - 0.0015 * face
    pos.push(x0, y0, z, x1, y0, z, x1, y1, z, x0, y0, z, x1, y1, z, x0, y1, z); uv.push(u0, v0, u1, v0, u1, v1, u0, v0, u1, v1, u0, v1)
    for (let i = 0; i < 6; i++) nrm.push(0, 0, -face) }
  for (const f of [1, -1]) { quad(-0.53, 0.27, -0.11 + 0.0125 * -f, 0.32, 0.1, 0, 0.62, f); quad(0, 0.29, 0.115 - 0.009 * f, 0.22, 0.12, 0.62, 1, f) }
  // backing boards (cream wood) live in the same draw call: the atlas cells have their own painted border
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3))
  g.computeBoundingSphere(); return g
}
let ATLAS = null
/** hand-lettered sign + timetable atlas (canvas, built once on first mount) */
export function boardsTexture() {
  if (ATLAS || typeof document === 'undefined') return ATLAS
  const W = 1024, H = 512, cv = document.createElement('canvas'); cv.width = W; cv.height = H; const x = cv.getContext('2d')
  const serif = 'italic 600 {s}px TPSerif, "Cormorant Garamond", Georgia, serif', round = '600 {s}px Fredoka, "Trebuchet MS", sans-serif'
  const font = (f, s) => f.replace('{s}', s)
  ATLAS_ROWS.forEach((id, r) => {
    const y0 = r * 256, other = ATLAS_ROWS.find(o => o !== id)
    // sign (0..635): cream board, double ink border, name + arrow to the other stop
    x.fillStyle = '#f3e6c6'; x.fillRect(0, y0, 635, 256); x.strokeStyle = INK; x.lineWidth = 14; x.strokeRect(10, y0 + 10, 615, 236); x.lineWidth = 4; x.strokeRect(30, y0 + 30, 575, 196)
    x.fillStyle = '#3b2f22'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = font(serif, 104); x.fillText(STATION_NAMES[id], 318, y0 + 112)
    x.font = font(round, 40); x.fillStyle = '#6a4f3a'; x.fillText((r === 0 ? '' : '\u2190 ') + STATION_NAMES[other] + (r === 0 ? ' \u2192' : ''), 318, y0 + 190)
    // timetable (635..1024): paper sheet pinned on a dark board, little train doodle, fare line
    x.fillStyle = '#5a4030'; x.fillRect(635, y0, 389, 256); x.fillStyle = '#fbf3e2'; x.fillRect(655, y0 + 18, 349, 220)
    x.fillStyle = '#d9655b'; x.beginPath(); x.arc(829, y0 + 26, 8, 0, 7); x.fill()
    x.fillStyle = '#3b2f22'; x.font = font(serif, 46); x.fillText('Timetable', 829, y0 + 66)
    x.font = font(round, 26); x.fillStyle = '#4a3a35'; x.fillText('to ' + STATION_NAMES[other], 829, y0 + 110); x.fillText('every few minutes', 829, y0 + 142)
    x.font = font(round, 22); x.fillStyle = '#7a5a3a'; x.fillText('first ride free \u00b7 then 1 coin', 829, y0 + 214)
    // doodle train
    x.strokeStyle = '#3b2f22'; x.lineWidth = 3; x.fillStyle = '#c9473f'; x.fillRect(745, y0 + 162, 38, 22); x.strokeRect(745, y0 + 162, 38, 22); x.fillStyle = '#f3e4c4'
    for (const k of [0, 1]) { x.fillRect(789 + k * 48, y0 + 160, 42, 24); x.strokeRect(789 + k * 48, y0 + 160, 42, 24) }
    x.beginPath(); x.moveTo(740, y0 + 190); x.lineTo(925, y0 + 190); x.stroke()
  })
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; ATLAS = t; return t
}
let MATS = null
export function stationMaterials() {
  if (MATS) return MATS
  MATS = { body: paint(toon('#ffffff', { vertexColors: true }), 0.12, true, 8), hull: new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide }), glow: glow('#ffcf86'), boards: toon('#ffffff', { map: boardsTexture() }) }
  return MATS
}
// placement: platform frame at platformN(id) (Codor, systems/liveC.js); -z points at the rails
const _x = new THREE.Vector3(), _z = new THREE.Vector3(), _m = new THREE.Matrix4()
export function platformFrame(n, lon) {
  n = n.clone().normalize(); const rail = dir(TRAIN_LAT, lon), toRail = rail.clone().sub(n); toRail.addScaledVector(n, -toRail.dot(n)).normalize()
  _z.copy(toRail).negate(); _x.crossVectors(n, _z).normalize()
  const pos = n.clone().multiplyScalar(R + height(n)), q = new THREE.Quaternion().setFromRotationMatrix(_m.makeBasis(_x, n, _z))
  return { pos, q }
}
/** -> THREE.Group with both stations (each its own meshes so the far one is frustum-culled). stops = TRAIN_STOPS */
export function createStations(stops, platformN, { touch = false } = {}) {
  const geo = buildStationGeometry({ touch }), M = stationMaterials(), root = new THREE.Group(); root.name = 'stations'
  for (const s of stops) {
    const g = new THREE.Group(); g.name = 'station:' + s.id; const f = platformFrame(platformN(s.id), s.lon); g.position.copy(f.pos); g.quaternion.copy(f.q)
    g.add(new THREE.Mesh(geo.body, M.body), new THREE.Mesh(geo.hull, M.hull), new THREE.Mesh(geo.glow, M.glow), new THREE.Mesh(buildBoardsGeometry(s.id), M.boards))
    root.add(g)
  }
  root.userData.tris = tris(geo.body) + tris(geo.hull) + tris(geo.glow) + 8
  return root
}
