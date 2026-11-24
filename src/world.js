import * as THREE from 'three'
export const R = 10.4 // 1.3x the old 8-unit planet (refine round)
export const WS = R / 8 // world scale vs the R=8 layout (sky props, orbit camera)
export const DENS = 1.5 // scatter density factor so the bigger surface isn't sparser (~WS^2, trimmed for the draw budget)
export const K = 5 / R // converts old angular sizes (tuned at R=5) to the bigger world
import { OLD_WORLD } from './world/flag.js'
import * as LEGACY from './world/legacy.js'
import { region, OPEN_PLOTS, HOME_DIR, SEA_LAT, SEA_W } from './world/regions.js'
export { SEA_LAT, SEA_W }
// The layout (zones, terrain, curves) comes from one source. The reworked layout replaces NEW piece by piece in later
// tasks (what it doesn't override is still today's), and ?world=old (dev only) keeps selecting the frozen legacy module.
const ZN = Object.fromEntries(['lake', 'cliff', 'terraces', 'harbour', 'ruins', 'forest', 'giant', 'meadow', 'mills', 'peak', 'museum', 'village'].map(id => [id, region(id)]))

// ---- the slope terrain: Keepers' Peak at the north pole, village and fields across the middle, sea at the south cap ----
// A closed-form sum of cheap terms (height() runs for every terrain vertex, every placement and the player each frame).
// Each local term tests a dot product against a precomputed cosine before paying for the acos.
const sst = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t) }
const NOISE_K = 0.6, RAMP_H = 0.9, PEAK_H = 1.6, PEAK_W = 2.5 // base noise scale; latitude ramp; Peak dome height / width (x r)
const SEA_FLOOR = SEA_W - 0.4, SHELF = SEA_W - 0.06 // the sea bed, and the wadeable shelf just off the shore
const TERR_STEP = 0.15, TERR_HILL = 1.05, LAKE_FLOOR = -0.55, HARB_FLOOR = -0.6
const LAKE_DIP = 0.22 // the ramp sags around the lake so its shore sits just above LAKE_W (see lakeDip)
const latRamp = (lat) => RAMP_H * sst(SEA_LAT, Math.PI / 2, lat)
const sp = (z, lim) => ({ x: z.x, y: z.y, z: z.z, r: z.r, c: Math.cos(lim) }) // a term's centre + the cosine of its reach
const T = { peak: sp(ZN.peak, ZN.peak.r * PEAK_W), meadow: sp(ZN.meadow, ZN.meadow.r + 0.2), giant: sp(ZN.giant, ZN.giant.r * 2.6), cliff: sp(ZN.cliff, ZN.cliff.r + 0.04),
  terraces: sp(ZN.terraces, ZN.terraces.r + 0.05), lake: sp(ZN.lake, ZN.lake.r * 2.6), harbour: sp(ZN.harbour, ZN.harbour.r * 1.3) }
const TERR_BASE = latRamp(ZN.terraces.lat) + 0.04 // the steps sit level on the ramp at the terraces' centre
const lakeDip = (a) => LAKE_DIP * sst(ZN.lake.r * 2.6, ZN.lake.r * 1.2, a)
// rolling ground before any flattening: noise (calmer on the Peak and along the coast), ramp, dome, meadow bumps, giant hill
function land(x, y, z) {
  const lat = Math.asin(Math.max(-1, Math.min(1, y)))
  let calm = 0.45 + 0.55 * sst(SEA_LAT, SEA_LAT + 0.3, lat), h = 0
  let d = x * T.peak.x + y * T.peak.y + z * T.peak.z
  if (d > T.peak.c) { const a = Math.acos(Math.min(1, d)), k = sst(ZN.peak.r * PEAK_W, 0, a); h += PEAK_H * k; calm *= 1 - 0.85 * k }
  h += calm * NOISE_K * (0.29 * Math.sin(2.7 * x + 1.3) * Math.sin(3.1 * y + 0.4) * Math.sin(2.3 * z + 2.1) + 0.08 * Math.sin(7 * x + 5 * z)) + latRamp(lat)
  d = x * T.meadow.x + y * T.meadow.y + z * T.meadow.z
  if (d > T.meadow.c) h += sst(ZN.meadow.r + 0.2, ZN.meadow.r * 0.4, Math.acos(Math.min(1, d))) * 0.38 * (0.5 + 0.5 * Math.sin(x * 15 + 1) * Math.sin(z * 13 + y * 9))
  d = x * T.giant.x + y * T.giant.y + z * T.giant.z
  if (d > T.giant.c) h += 0.85 * sst(ZN.giant.r * 2.6, ZN.giant.r * 0.3, Math.acos(Math.min(1, d)))
  d = x * T.lake.x + y * T.lake.y + z * T.lake.z
  if (d > T.lake.c) h -= lakeDip(Math.acos(Math.min(1, d)))
  return h
}
// level spots: blended toward the ground height at their centre (flat inside r, eased out over the next `ease` rad)
const flatSpot = (lat, lon, r, ease) => { const c = Math.cos(lat); const x = c * Math.sin(lon), y = Math.sin(lat), z = c * Math.cos(lon); return { x, y, z, r, ease, c: Math.cos(r + ease), h: land(x, y, z) } }
const FLAT = [flatSpot(ZN.village.lat, ZN.village.lon, ZN.village.r, 0.06), flatSpot(HOME_DIR.lat, HOME_DIR.lon, 2.6 / R, 0.08), ...OPEN_PLOTS.map(p => flatSpot(p.lat, p.lon, p.r, 0.06))]
const CLIFF_TOP = land(ZN.cliff.x, ZN.cliff.y, ZN.cliff.z) + LEGACY.CLIFF_H // a level mesa top, CLIFF_H above the ground at its centre
function slopeHeight(n) {
  const L = Math.hypot(n.x, n.y, n.z), x = n.x / L, y = n.y / L, z = n.z / L
  let h = land(x, y, z), d, a
  for (let i = 0; i < FLAT.length; i++) { const f = FLAT[i]; d = x * f.x + y * f.y + z * f.z; if (d > f.c) h += (f.h - h) * sst(f.r + f.ease, f.r, Math.acos(Math.min(1, d))) }
  const zc = ZN.cliff; d = x * T.cliff.x + y * T.cliff.y + z * T.cliff.z
  if (d > T.cliff.c) { a = Math.acos(Math.min(1, d)); h += (CLIFF_TOP - h) * sst(zc.r + 0.03, zc.r, a) + 0.04 * Math.sin(x * 40) * sst(zc.r, 0, a) }
  const zt = ZN.terraces; d = x * T.terraces.x + y * T.terraces.y + z * T.terraces.z
  if (d > T.terraces.c) { a = Math.acos(Math.min(1, d)); const f = TERR_HILL * Math.max(0, 1 - a / zt.r) / TERR_STEP, st = (Math.floor(f) + sst(0.82, 1, f - Math.floor(f))) * TERR_STEP; h += (st + TERR_BASE - h) * sst(zt.r + 0.05, zt.r - 0.01, a) }
  const zl = ZN.lake; d = x * T.lake.x + y * T.lake.y + z * T.lake.z
  if (d > T.lake.c) h += (LAKE_FLOOR - h) * sst(zl.r * 1.15, zl.r * 0.55, Math.acos(Math.min(1, d)))
  const zh = ZN.harbour; d = x * T.harbour.x + y * T.harbour.y + z * T.harbour.z
  if (d > T.harbour.c) h += (HARB_FLOOR - h) * sst(zh.r * 1.12, zh.r * 0.6, Math.acos(Math.min(1, d)))
  // the sea: a 0.06-wide shoreline band drops to a wadeable shelf, which falls away to the sea bed further out
  const lat = Math.asin(Math.max(-1, Math.min(1, y)))
  if (lat < SEA_LAT + 0.02) h += (SHELF - (SHELF - SEA_FLOOR) * sst(SEA_LAT - 0.03, SEA_LAT - 0.08, lat) - h) * sst(SEA_LAT + 0.02, SEA_LAT - 0.04, lat)
  return h
}
const NEW = { ...LEGACY, ZONES: Object.fromEntries(Object.entries(ZN).filter(([id]) => id !== 'village')), height: slopeHeight }
const W = OLD_WORLD ? LEGACY : NEW
// biome / zone centres (lat, lon, angular radius)
export const ZONES = W.ZONES
export const TRAIN_LAT = W.TRAIN_LAT
export const LAKE_W = W.LAKE_W, HARB_W = W.HARB_W, CLIFF_H = W.CLIFF_H
const ang = (n, z) => Math.acos(Math.min(1, Math.max(-1, (n.x * z.x + n.y * z.y + n.z * z.z) / Math.hypot(n.x, n.y, n.z))))
export const zoneAng = ang
export const height = W.height
export function around(c, d, b) { c = c.clone().normalize(); const e1 = new THREE.Vector3(0, 1, 0).cross(c); if (e1.lengthSq() < 1e-6) e1.set(1, 0, 0); e1.normalize(); const e2 = new THREE.Vector3().crossVectors(c, e1); return c.multiplyScalar(Math.cos(d)).addScaledVector(e1, Math.sin(d) * Math.cos(b)).addScaledVector(e2, Math.sin(d) * Math.sin(b)).normalize() }
export const zv = (z) => new THREE.Vector3(z.x, z.y, z.z)
let s = 7
export const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647
export const dir = (lat, lon) => new THREE.Vector3(Math.cos(lat) * Math.sin(lon), Math.sin(lat), Math.cos(lat) * Math.cos(lon))
const UP = new THREE.Vector3(0, 1, 0)
export function place(n, lift = 0, spin = 0) {
  n = n.clone().normalize()
  const pos = n.clone().multiplyScalar(R + height(n) + lift)
  const q = new THREE.Quaternion().setFromUnitVectors(UP, n)
  q.multiply(new THREE.Quaternion().setFromAxisAngle(UP, spin))
  return { pos, q, n }
}
export const randDir = () => { const u = rnd() * 2 - 1, t = rnd() * Math.PI * 2, r = Math.sqrt(1 - u * u); return new THREE.Vector3(r * Math.cos(t), u, r * Math.sin(t)) }
// path & stream curves on sphere (lat,lon param)
export const pathDir = W.pathDir
export const streamDir = W.streamDir
// curve samples are cached per (curve, k) as flat arrays: same points as before, ~40x cheaper per query
const CURVES = new Map()
export function distToCurve(n, f, k = 160) {
  let c = CURVES.get(f); if (!c) CURVES.set(f, c = new Map())
  let a = c.get(k); if (!a) { a = new Float32Array(k * 3); for (let i = 0; i < k; i++) { const p = f((i / k) * Math.PI * 2); a[i * 3] = p.x; a[i * 3 + 1] = p.y; a[i * 3 + 2] = p.z } c.set(k, a) }
  const x = n.x, y = n.y, z = n.z; let m = 81
  for (let i = 0; i < a.length; i += 3) { const dx = a[i] - x, dy = a[i + 1] - y, dz = a[i + 2] - z, d = dx * dx + dy * dy + dz * dz; if (d < m) m = d }
  return Math.min(9, Math.sqrt(m))
}
const ramp = new Uint8Array([90, 90, 90, 255, 175, 175, 175, 255, 255, 255, 255, 255])
export const toonRamp = new THREE.DataTexture(ramp, 3, 1, THREE.RGBAFormat)
toonRamp.minFilter = toonRamp.magFilter = THREE.NearestFilter; toonRamp.needsUpdate = true
export const wind = { time: { value: 0 } }
// add wind sway to a toon material via onBeforeCompile (instanced, sway weighted by local y)
export function windify(mat, amp = 0.15, base = 0) {
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = wind.time
    sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      vec4 wp = instanceMatrix * vec4(0.,0.,0.,1.);
      float w = max(position.y - ${base.toFixed(2)}, 0.);
      float g = sin(uTime*1.6 + wp.x*0.9 + wp.z*0.7) * 0.6 + sin(uTime*3.1 + wp.y*1.7)*0.4;
      transformed.x += w*w*${amp.toFixed(3)}*g; transformed.z += w*w*${amp.toFixed(3)}*0.6*cos(uTime*1.3+wp.x);`)
  }
  mat.customProgramCacheKey = () => 'wind' + amp + '_' + base
  return mat
}

// ---------------- round6: a real river (wide, banked, impassable) + crossings ----------------
// The stream is a closed loop given as latitude = f(longitude): streamDir(t) = dir(lat(t), t), so "which side" and
// "how far" are cheap. Width varies: ~0.92 wide in general (too far to jump), pinched at the bridges and at a few
// narrow, marked jump spots (~0.3 wide).
const latOfN = (n) => Math.asin(Math.max(-1, Math.min(1, n.y)))
export const streamLat = (t) => latOfN(streamDir(t))
// bridges: where the path crosses the stream (same longitude parameter); nearest the village first
const VILL = dir(1.05, 0.2)
export const BRIDGES = []
{ let prev = null; for (let i = 0; i <= 3000; i++) { const t = (i / 3000) * Math.PI * 2; const d = latOfN(pathDir(t).normalize()) - latOfN(streamDir(t).normalize()); if (prev !== null && Math.sign(d) !== Math.sign(prev)) { const c = pathDir(t).normalize(), tan = pathDir(t + 0.01).normalize().sub(c).normalize(); BRIDGES.push({ c, tan, side: new THREE.Vector3().crossVectors(c, tan).normalize(), t }) } prev = d } }
BRIDGES.sort((a, b) => a.c.distanceTo(VILL) - b.c.distanceTo(VILL))
export const BL = 1.0 // bridge length (world units), spans the pinched river with its banks
export function bridgeLift(n) { for (const b of BRIDGES) { const L = b.L || BL, dx = n.x - b.c.x, dy = n.y - b.c.y, dz = n.z - b.c.z; const a = (dx * b.tan.x + dy * b.tan.y + dz * b.tan.z) * R, s = (dx * b.side.x + dy * b.side.y + dz * b.side.z) * R; if (Math.abs(a) < L / 2 && Math.abs(s) < 0.13) return 0.035 + 0.07 * Math.cos((a / L) * Math.PI) } return 0 }
export const onBridgeDeck = (n, pad = 0) => BRIDGES.some(b => { const dx = n.x - b.c.x, dy = n.y - b.c.y, dz = n.z - b.c.z; return Math.abs((dx * b.tan.x + dy * b.tan.y + dz * b.tan.z) * R) < (b.L || BL) / 2 + pad && Math.abs((dx * b.side.x + dy * b.side.y + dz * b.side.z) * R) < 0.13 + pad * 0.3 })
export const onBridge = (n) => BRIDGES.some(b => b.c.angleTo(n) < ((b.L || BL) / 2 + 0.08) / R)
// narrow jump spots: spread around the loop, away from bridges, lake and harbour
const _wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a))
export const JUMPS = []
{ for (let k = 0; k < 14 && JUMPS.length < 4; k++) { const t = ((k * 0.618034) % 1) * Math.PI * 2; const n = streamDir(t).normalize()
    if (BRIDGES.some(b => Math.abs(_wrap(b.t - t)) < 0.55) || JUMPS.some(j => Math.abs(_wrap(j.t - t)) < 0.9)) continue
    if (ang(n, ZONES.harbour) < ZONES.harbour.r * 1.6 || ang(n, ZONES.lake) < ZONES.lake.r * 1.6 || ang(n, ZONES.forest) < ZONES.forest.r * 0.8) continue
    const tan = streamDir(t + 0.004).normalize().sub(n).normalize(); JUMPS.push({ t, c: n, tan, side: new THREE.Vector3().crossVectors(tan, n).normalize() }) } }
export const RIVER_HALF = 0.46, BRIDGE_HALF = 0.2, JUMP_HALF = 0.14
const gauss = (d, s) => Math.exp(-(d * d) / (s * s))
export function streamHalf(t) { let h = RIVER_HALF
  for (const b of BRIDGES) h -= (RIVER_HALF - BRIDGE_HALF) * gauss(_wrap(t - b.t), 0.07)
  for (const j of JUMPS) h = Math.min(h, RIVER_HALF - (RIVER_HALF - JUMP_HALF) * gauss(_wrap(t - j.t), 0.03))
  return h * (1 + 0.06 * Math.sin(t * 13)) }
// nearest point on the river: { d: world-unit distance from the centre line, half: half width there, t, side: +1 north / -1 south }
const SN = 1800; let SP = null
const _sr = { d: 9, half: 0, t: 0, side: 1 }
export function streamNear(n, out = _sr) {
  if (!SP) { SP = new Float32Array(SN * 3); for (let i = 0; i < SN; i++) { const p = streamDir(i / SN * Math.PI * 2).normalize(); SP[i * 3] = p.x; SP[i * 3 + 1] = p.y; SP[i * 3 + 2] = p.z } }
  const len = Math.hypot(n.x, n.y, n.z), x = n.x / len, y = n.y / len, z = n.z / len, lon = Math.atan2(x, z), lat = Math.asin(Math.max(-1, Math.min(1, y)))
  const dl = lat - streamLat(lon); out.side = dl >= 0 ? 1 : -1
  if (Math.abs(dl) > 0.16) { out.d = Math.abs(dl) * R; out.t = lon; out.half = RIVER_HALF; return out } // far: the latitude gap is a fine bound
  // search samples within +-0.25 rad of longitude
  const i0 = Math.round(((lon % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2) / (Math.PI * 2) * SN), w = Math.ceil(0.25 / (Math.PI * 2) * SN)
  let m = 9, bi = i0
  for (let k = -w; k <= w; k++) { const i = ((i0 + k) % SN + SN) % SN; const dx = SP[i * 3] - x, dy = SP[i * 3 + 1] - y, dz = SP[i * 3 + 2] - z, d = dx * dx + dy * dy + dz * dz; if (d < m) { m = d; bi = i } }
  // refine on the two neighbouring segments
  let best = Math.sqrt(m), bt = bi / SN * Math.PI * 2
  for (const j of [bi - 1, bi]) { const a = ((j % SN) + SN) % SN, b = (a + 1) % SN; const ax = SP[a * 3], ay = SP[a * 3 + 1], az = SP[a * 3 + 2], ex = SP[b * 3] - ax, ey = SP[b * 3 + 1] - ay, ez = SP[b * 3 + 2] - az, L2 = ex * ex + ey * ey + ez * ez
    const u = Math.max(0, Math.min(1, ((x - ax) * ex + (y - ay) * ey + (z - az) * ez) / L2)), dx = ax + ex * u - x, dy = ay + ey * u - y, dz = az + ez * u - z, d = Math.sqrt(dx * dx + dy * dy + dz * dz)
    if (d < best) { best = d; bt = (a + u) / SN * Math.PI * 2 } }
  out.d = best * R; out.t = bt; out.half = streamHalf(bt); return out
}
// is this point open water she can't stand in? (river away from the bridge decks, deep lake, harbour)
export function waterAt(n, margin = 0.02) {
  const s = streamNear(n); if (s.d < s.half - margin && !onBridgeDeck(n)) return true
  if (ang(n, ZONES.lake) < ZONES.lake.r * 1.2 && height(n) < LAKE_W - 0.03) return true
  if (ang(n, ZONES.harbour) < ZONES.harbour.r * 1.2 && height(n) < HARB_W - 0.03) return true
  return false
}
// each bridge spans the water it actually crosses (the path meets the river at a slant): centre it on the water and
// size it to the span + a little bank either side
for (const b of BRIDGES) { let lo = 0, hi = 0; const _n = new THREE.Vector3()
  const wet = (a) => { _n.copy(b.c).addScaledVector(b.tan, a / R).normalize(); const sn = streamNear(_n); return sn.d < sn.half }
  while (lo > -2 && wet(lo - 0.02)) lo -= 0.02; while (hi < 2 && wet(hi + 0.02)) hi += 0.02
  const mid = (lo + hi) / 2; b.c = b.c.clone().addScaledVector(b.tan, mid / R).normalize(); b.side.crossVectors(b.c, b.tan).normalize(); b.tan.crossVectors(b.side, b.c).normalize(); b.L = Math.max(0.8, hi - lo + 0.34) }
if (typeof window !== 'undefined') window.__river = { streamNear, waterAt, BRIDGES, JUMPS, streamHalf }
// old-style 'centre distance' (radians) measured from the new bank: scatter rules tuned for the thin stream keep their meaning
export const streamDist = (n) => { const r = streamNear(n); return Math.max(0, r.d - r.half + 0.17) / R }
if (typeof window !== 'undefined') window.__height = height
