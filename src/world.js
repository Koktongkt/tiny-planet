import * as THREE from 'three'
export const R = 10.4 // 1.3x the old 8-unit planet (refine round)
export const WS = R / 8 // world scale vs the R=8 layout (sky props, orbit camera)
export const DENS = 1.5 // scatter density factor so the bigger surface isn't sparser (~WS^2, trimmed for the draw budget)
export const K = 5 / R // converts old angular sizes (tuned at R=5) to the bigger world
const _dir = (lat, lon) => [Math.cos(lat) * Math.sin(lon), Math.sin(lat), Math.cos(lat) * Math.cos(lon)]
const Z = (lat, lon, r) => { const [x, y, z] = _dir(lat, lon); return { x, y, z, r, lat, lon } }
// biome / zone centres (lat, lon, angular radius)
export const ZONES = {
  lake: Z(-0.55, 0.9, 0.2), cliff: Z(-0.42, 1.38, 0.11), terraces: Z(-0.62, 2.7, 0.18), harbour: Z(-0.32, 4.3, 0.22), ruins: Z(-0.72, 3.85, 0.11),
  forest: Z(-0.05, 3.35, 0.27), giant: Z(-0.4, 3.05, 0.1), meadow: Z(0.4, 5.2, 0.3), mills: Z(1.0, 4.6, 0.18),
}
export const TRAIN_LAT = -0.95
export const LAKE_W = -0.16, HARB_W = -0.2, CLIFF_H = 1.15
const sst = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t) }
const ang = (n, z) => Math.acos(Math.min(1, Math.max(-1, (n.x * z.x + n.y * z.y + n.z * z.z) / Math.hypot(n.x, n.y, n.z))))
export const zoneAng = ang
export const height = (n) => {
  let h = 0.29 * Math.sin(2.7 * n.x + 1.3) * Math.sin(3.1 * n.y + 0.4) * Math.sin(2.3 * n.z + 2.1) + 0.08 * Math.sin(7 * n.x + 5 * n.z)
  const zm = ZONES
  let a = ang(n, zm.meadow); if (a < zm.meadow.r + 0.2) h += sst(zm.meadow.r + 0.2, zm.meadow.r * 0.4, a) * 0.38 * (0.5 + 0.5 * Math.sin(n.x * 15 + 1) * Math.sin(n.z * 13 + n.y * 9))
  a = ang(n, zm.giant); if (a < zm.giant.r * 2.6) h += 0.85 * sst(zm.giant.r * 2.6, zm.giant.r * 0.3, a)
  a = ang(n, zm.cliff); if (a < zm.cliff.r + 0.04) h += CLIFF_H * sst(zm.cliff.r + 0.03, zm.cliff.r, a) + 0.04 * Math.sin(n.x * 40) * sst(zm.cliff.r, 0, a)
  a = ang(n, zm.terraces); if (a < zm.terraces.r + 0.05) { const hill = 1.05 * Math.max(0, 1 - a / zm.terraces.r), stp = 0.15, f = hill / stp, st = Math.floor(f) * stp + stp * sst(0.82, 1, f - Math.floor(f)); h = h + (st + 0.04 - h) * sst(zm.terraces.r + 0.05, zm.terraces.r - 0.01, a) }
  a = ang(n, zm.lake); if (a < zm.lake.r * 1.3) h = h + (-0.55 - h) * sst(zm.lake.r * 1.15, zm.lake.r * 0.55, a)
  a = ang(n, zm.harbour); if (a < zm.harbour.r * 1.3) h = h + (-0.6 - h) * sst(zm.harbour.r * 1.12, zm.harbour.r * 0.6, a)
  return h
}
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
export const pathDir = (t) => dir(0.55 + 0.35 * Math.sin(t * 3) , t)
export const streamDir = (t) => { const d = Math.atan2(Math.sin(t - 0.55), Math.cos(t - 0.55)); return dir(-0.15 + 0.3 * Math.sin(t * 2 + 1) + 0.15 * Math.sin(t * 5) + 0.8 * Math.exp(-((d / 0.4) ** 2)), t) }
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
// river crossing gates (bridges + jump spots) for anything that has to path across (Pip)
export const GATES = [...BRIDGES.map(b => ({ kind: 'bridge', t: b.t, c: b.c, b })), ...JUMPS.map(j => ({ kind: 'jump', t: j.t, c: j.c, j }))]
// a point on the given side of the river at gate g, `off` units out from that side's bank
export function gateSide(g, side, off = 0.18, out = new THREE.Vector3()) {
  const n = g.c, t = g.t, h = streamHalf(t), lat = streamLat(t) + side * (h + off) / R
  if (g.kind === 'bridge') { const b = g.b; const L = b.L || BL; out.copy(b.c).addScaledVector(b.tan, (L / 2 + off * 0.5) / R).normalize(); if (streamNear(out).side !== side) out.copy(b.c).addScaledVector(b.tan, -(L / 2 + off * 0.5) / R).normalize(); return out }
  return out.copy(dir(lat, t))
}
if (typeof window !== 'undefined') window.__river = { streamNear, waterAt, BRIDGES, JUMPS, GATES, streamHalf, gateSide }
// old-style 'centre distance' (radians) measured from the new bank: scatter rules tuned for the thin stream keep their meaning
export const streamDist = (n) => { const r = streamNear(n); return Math.max(0, r.d - r.half + 0.17) / R }
if (typeof window !== 'undefined') window.__height = height
