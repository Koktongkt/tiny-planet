import * as THREE from 'three'
export const R = 10.4 // 1.3x the old 8-unit planet (refine round)
export const WS = R / 8 // world scale vs the R=8 layout (sky props, orbit camera)
export const DENS = 1.5 // scatter density factor so the bigger surface isn't sparser (~WS^2, trimmed for the draw budget)
export const K = 5 / R // converts old angular sizes (tuned at R=5) to the bigger world
import { OLD_WORLD } from './world/flag.js'
import * as LEGACY from './world/legacy.js'
import { region, OPEN_PLOTS, HOME_DIR, SEA_LAT, SEA_W, DIG_SITES, TRAIN_LAT as COAST_TRAIN_LAT } from './world/regions.js'
import * as RIVER from './world/river.js'
export { SEA_LAT, SEA_W }
// The layout (zones, terrain, curves) comes from one source. The reworked layout replaces NEW piece by piece in later
// tasks (what it doesn't override is still today's), and ?world=old (dev only) keeps selecting the frozen legacy module.
const ZN = Object.fromEntries(['lake', 'cliff', 'terraces', 'harbour', 'ruins', 'forest', 'giant', 'meadow', 'mills', 'peak', 'museum', 'village'].map(id => [id, region(id)]))

// ---- the slope terrain: Keepers' Peak at the north pole, village and fields across the middle, sea at the south cap ----
// A closed-form sum of cheap terms (height() runs for every terrain vertex, every placement and the player each frame).
// Each local term tests a dot product against a precomputed cosine before paying for the acos.
const sst = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t) }
const NOISE_K = 0.6, RAMP_H = 0.9, PEAK_H = 2.1, PEAK_W = 1.6 // base noise scale; latitude ramp; Peak dome height / width (x r)
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
// the spring spur: a ridge from the Peak dome down onto the mesa top, so the river can run downhill from the spring onto
// the cliff before it falls off the downhill face (without it the mesa stands ~0.85 above the saddle between them).
// Its crest eases from h0 (s0 rad from the Peak, where it meets the dome) to CLIFF_TOP at the mesa rim, and its flanks
// fall at a fixed slope (fl per rad, rise/run ~0.7) so it stays walkable. Both ends are rounded (capsule distance); it
// stops at the mesa's uphill rim, so the downhill face (the waterfall) keeps its full height. Only raises the ground.
const SPUR = (() => { const p = ZN.peak, c = ZN.cliff, len = Math.acos(p.x * c.x + p.y * c.y + p.z * c.z)
  let nx = p.y * c.z - p.z * c.y, ny = p.z * c.x - p.x * c.z, nz = p.x * c.y - p.y * c.x; const nl = Math.hypot(nx, ny, nz); nx /= nl; ny /= nl; nz /= nl
  const ex = ny * p.z - nz * p.y, ey = nz * p.x - nx * p.z, ez = nx * p.y - ny * p.x // unit tangent at the Peak, toward the cliff
  const mid = len / 2, mx = p.x * Math.cos(mid) + ex * Math.sin(mid), my = p.y * Math.cos(mid) + ey * Math.sin(mid), mz = p.z * Math.cos(mid) + ez * Math.sin(mid)
  return { p, nx, ny, nz, ex, ey, ez, mx, my, mz, c: Math.cos(mid + 0.1), len, s0: 0.12, rim: len - c.r, h0: 2.3, fl: 0.7 * R, e: 0.03 } })()
function spurLift(x, y, z, h) {
  const S = SPUR; if (x * S.mx + y * S.my + z * S.mz < S.c) return h
  const s = Math.atan2(x * S.ex + y * S.ey + z * S.ez, x * S.p.x + y * S.p.y + z * S.p.z)
  const off = Math.asin(Math.max(-1, Math.min(1, x * S.nx + y * S.ny + z * S.nz))), sc = Math.min(S.rim, Math.max(S.s0, s)), da = Math.hypot(s - sc, off) // capsule distance
  const crest = CLIFF_TOP + (S.h0 - CLIFF_TOP) * sst(S.rim, S.s0, sc)
  const t = crest - S.fl * (Math.sqrt(da * da + S.e * S.e) - S.e)
  return t > h ? t : h
}
// the river's run across the mesa: the normal of its great circle (the mesa ripple calms within ~0.03 rad of it)
const MESA_RUN = (() => { const [a, b] = RIVER.RIVER_MESA_RUN.map(p => new THREE.Vector3(Math.cos(p.lat) * Math.sin(p.lon), Math.sin(p.lat), Math.cos(p.lat) * Math.cos(p.lon))); return a.cross(b).normalize() })()
// the Lake's outlet valley: from inside the lake to inside the harbour the ground along the river is carved down to a
// bed easing from just under LAKE_W to HARB_W (flat under the water, banks at rise/run 0.5), so the water runs downhill
// to the sea (the lake hollow otherwise leaves the lake below the coastal land). Only lowers ground; one riverNear call
// for points inside its cap.
const OUTLET = (() => { const lake = ZN.lake, harb = ZN.harbour, an = (p, z) => Math.acos(Math.min(1, p.x * z.x + p.y * z.y + p.z * z.z))
  let ua = 0, ub = 1, i = 0; const N = 2000
  while (i < N && an(RIVER.riverDir(i / N), lake) > lake.r * 0.5) i++ // into the lake...
  while (i < N && an(RIVER.riverDir(i / N), lake) < lake.r * 0.75) i++; ua = i / N // ...and out past 0.75 r
  while (i < N && an(RIVER.riverDir(i / N), harb) > harb.r * 0.75) i++; ub = i / N // into the harbour to 0.75 r
  const c = RIVER.riverDir((ua + ub) / 2); let reach = 0; for (let k = 0; k <= 40; k++) reach = Math.max(reach, c.angleTo(RIVER.riverDir(ua + (ub - ua) * k / 40)))
  return { ua, ub, x: c.x, y: c.y, z: c.z, c: Math.cos(reach + 0.2), near: { d: 9, u: 0, half: 0, side: 1 } } })()
function outletValley(x, y, z, h) {
  const O = OUTLET; if (x * O.x + y * O.y + z * O.z < O.c) return h
  const q = RIVER.riverNear({ x, y, z }, O.near), u = q.u; if (u < O.ua - 0.03 || u > O.ub + 0.03) return h
  const bed = LEGACY.LAKE_W - 0.02 + (LEGACY.HARB_W - LEGACY.LAKE_W + 0.02) * Math.min(1, Math.max(0, (u - O.ua) / (O.ub - O.ua)))
  const v = bed + 0.5 * Math.max(0, q.d - q.half - 0.15); if (v >= h) return h
  return h + (v - h) * sst(O.ua - 0.03, O.ua, u) * sst(O.ub + 0.03, O.ub, u)
}
function slopeHeight(n) {
  const L = Math.hypot(n.x, n.y, n.z), x = n.x / L, y = n.y / L, z = n.z / L
  let h = land(x, y, z), d, a
  for (let i = 0; i < FLAT.length; i++) { const f = FLAT[i]; d = x * f.x + y * f.y + z * f.z; if (d > f.c) h += (f.h - h) * sst(f.r + f.ease, f.r, Math.acos(Math.min(1, d))) }
  h = spurLift(x, y, z, h)
  const zc = ZN.cliff; d = x * T.cliff.x + y * T.cliff.y + z * T.cliff.z
  if (d > T.cliff.c) { a = Math.acos(Math.min(1, d)); h += (CLIFF_TOP - h) * sst(zc.r + 0.03, zc.r, a) + 0.04 * Math.sin(x * 40) * sst(zc.r, 0, a) * sst(0.012, 0.04, Math.abs(x * MESA_RUN.x + y * MESA_RUN.y + z * MESA_RUN.z)) }
  const zt = ZN.terraces; d = x * T.terraces.x + y * T.terraces.y + z * T.terraces.z
  if (d > T.terraces.c) { a = Math.acos(Math.min(1, d)); const f = TERR_HILL * Math.max(0, 1 - a / zt.r) / TERR_STEP, st = (Math.floor(f) + sst(0.82, 1, f - Math.floor(f))) * TERR_STEP; h += (st + TERR_BASE - h) * sst(zt.r + 0.05, zt.r - 0.01, a) }
  const zl = ZN.lake; d = x * T.lake.x + y * T.lake.y + z * T.lake.z
  if (d > T.lake.c) h += (LAKE_FLOOR - h) * sst(zl.r * 1.15, zl.r * 0.55, Math.acos(Math.min(1, d)))
  const zh = ZN.harbour; d = x * T.harbour.x + y * T.harbour.y + z * T.harbour.z
  if (d > T.harbour.c) h += (HARB_FLOOR - h) * sst(zh.r * 1.12, zh.r * 0.6, Math.acos(Math.min(1, d)))
  h = outletValley(x, y, z, h)
  // the sea: a 0.06-wide shoreline band drops to a wadeable shelf, which falls away to the sea bed further out
  const lat = Math.asin(Math.max(-1, Math.min(1, y)))
  if (lat < SEA_LAT + 0.02) h += (SHELF - (SHELF - SEA_FLOOR) * sst(SEA_LAT - 0.03, SEA_LAT - 0.08, lat) - h) * sst(SEA_LAT + 0.02, SEA_LAT - 0.04, lat)
  return h
}
// the open river (world/river.js): streamDir(t) = riverDir(t / 2pi), so callers sampling t in [0, 2pi) cover it exactly once
const TAU = Math.PI * 2
// the sandy path: one closed loop linking the regions, eastward from south of her home. A periodic centripetal
// Catmull-Rom through PATH_PTS (in 3D, projected onto the sphere), reparametrized by arc length so t in [0, 2pi) walks
// it at an even pace; any t wraps. It crosses the river three times (an open river from the Peak to the sea has to be
// crossed an odd number of times by a loop round the planet): east of the village square, then over the lake's outlet
// and back over the coast run either side of the village train stop. BRIDGES (below) are found where it crosses.
export const PATH_PTS = [
  { lat: 0.10, lon: 0.00 }, // south of her home (the yard stays clear)
  { lat: 0.21, lon: 0.28 },
  { lat: 0.33, lon: 0.38 }, // through the village square, just south-east of its centre
  { lat: 0.35, lon: 0.56 }, // east over the river (BRIDGES[0], square-on to the flow)
  { lat: 0.47, lon: 0.74 }, // the foot of the terraces
  { lat: 0.42, lon: 0.92 },
  { lat: 0.26, lon: 1.06 },
  { lat: 0.06, lon: 1.13 }, // past the museum, on the lake's north-east shore
  { lat: -0.18, lon: 1.18 }, // down the lake's east shore, over the outlet
  { lat: -0.46, lon: 1.19 },
  { lat: -0.515, lon: 1.255 }, // by the village train stop
  { lat: -0.515, lon: 1.335 },
  { lat: -0.46, lon: 1.41 }, // back over the coast run, north of the harbour
  { lat: -0.30, lon: 1.55 },
  { lat: 0.10, lon: 1.85 },
  { lat: 0.55, lon: 2.32 }, // the forest's north-west edge, by the giant
  { lat: 0.42, lon: 3.00 },
  { lat: 0.175, lon: 3.52 }, // the edge of open plot A
  { lat: 0.15, lon: 3.95 },
  { lat: 0.40, lon: 4.45 }, // across the meadow, by the mills
  { lat: 0.35, lon: 5.00 },
  { lat: 0.30, lon: 5.60 },
  { lat: 0.13, lon: 6.00 },
]
const loopPath = (() => {
  const CP = PATH_PTS.map(p => new THREE.Vector3(Math.cos(p.lat) * Math.sin(p.lon), Math.sin(p.lat), Math.cos(p.lat) * Math.cos(p.lon))), N = CP.length, at = (i) => CP[((i % N) + N) % N]
  const KN = CP.map((p, i) => Math.sqrt(p.distanceTo(at(i + 1)))) // centripetal knot spacing, segment i -> i+1
  const a1 = new THREE.Vector3(), a2 = new THREE.Vector3(), a3 = new THREE.Vector3(), b1 = new THREE.Vector3(), b2 = new THREE.Vector3()
  const lerpK = (out, p, q, ta, tb, t) => out.copy(p).multiplyScalar((tb - t) / (tb - ta)).addScaledVector(q, (t - ta) / (tb - ta))
  const raw = (p, out) => { const i = Math.floor(p) % N, f = p - Math.floor(p), P0 = at(i - 1), P1 = at(i), P2 = at(i + 1), P3 = at(i + 2)
    const t1 = KN[(i - 1 + N) % N], t2 = t1 + KN[i], t3 = t2 + KN[(i + 1) % N], t = t1 + (t2 - t1) * f
    lerpK(a1, P0, P1, 0, t1, t); lerpK(a2, P1, P2, t1, t2, t); lerpK(a3, P2, P3, t2, t3, t); lerpK(b1, a1, a2, 0, t2, t); lerpK(b2, a2, a3, t1, t3, t)
    return lerpK(out, b1, b2, t1, t2, t).normalize() }
  const M = 4000, ARC = new Float64Array(M + 1), a = raw(0, new THREE.Vector3()), b = new THREE.Vector3()
  for (let i = 1; i <= M; i++) { raw((i / M) * N, b); ARC[i] = ARC[i - 1] + a.angleTo(b); a.copy(b) }
  return (t) => { const s = (((t / TAU) % 1) + 1) % 1 * ARC[M]; let lo = 0, hi = M
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (ARC[m] <= s) lo = m; else hi = m }
    return raw(((lo + (s - ARC[lo]) / Math.max(1e-12, ARC[hi] - ARC[lo])) / M) * N, new THREE.Vector3()) }
})()
const NEW = { ...LEGACY, ZONES: Object.fromEntries(Object.entries(ZN).filter(([id]) => id !== 'village')), TRAIN_LAT: COAST_TRAIN_LAT, height: slopeHeight, streamDir: (t) => RIVER.riverDir(t / TAU), pathDir: loopPath }
const W = OLD_WORLD ? LEGACY : NEW
// biome / zone centres (lat, lon, angular radius)
export const ZONES = W.ZONES
export const TRAIN_LAT = W.TRAIN_LAT // the coast railway's latitude (world/railway.js eases it round the Harbour bay)
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
// Legacy (?world=old): the stream is a closed loop given as latitude = f(longitude): streamDir(t) = dir(lat(t), t), so
// "which side" and "how far" are cheap. The reworked planet's river is an open curve (world/river.js) from the Peak spring
// to the sea; the stream* functions below keep their signatures over it, with t = u * 2pi along the river.
// Width varies: ~0.92 wide in general (too far to jump), pinched at the bridges and at a few narrow, marked jump spots
// (~0.3 wide).
const latOfN = (n) => Math.asin(Math.max(-1, Math.min(1, n.y)))
export const streamLat = (t) => latOfN(streamDir(t))
// bridges: where the path crosses the stream; nearest the village first. Legacy: the same longitude parameter on both
// curves. New: the path polyline intersected with the river polyline (great-circle segment tests); b.t is the path
// parameter at the crossing (as legacy, where the two parameters coincide) and b.st the river's stream parameter (u * 2pi).
const VILL = OLD_WORLD ? dir(1.05, 0.2) : zv(region('village'))
export const BRIDGES = []
if (OLD_WORLD) { let prev = null; for (let i = 0; i <= 3000; i++) { const t = (i / 3000) * Math.PI * 2; const d = latOfN(pathDir(t).normalize()) - latOfN(streamDir(t).normalize()); if (prev !== null && Math.sign(d) !== Math.sign(prev)) { const c = pathDir(t).normalize(), tan = pathDir(t + 0.01).normalize().sub(c).normalize(); BRIDGES.push({ c, tan, side: new THREE.Vector3().crossVectors(c, tan).normalize(), t }) } prev = d } }
else { const PN = 1500, RN = 900, P = [], Q = [], _q = { d: 9, u: 0, half: 0, side: 1 }
  for (let i = 0; i <= PN; i++) P.push(pathDir(i / PN * TAU).normalize())
  for (let j = 0; j <= RN; j++) Q.push(RIVER.riverDir(j / RN))
  const n1 = new THREE.Vector3(), n2 = new THREE.Vector3(), x = new THREE.Vector3(), w = new THREE.Vector3()
  const within = (x, a, b, n) => w.crossVectors(a, x).dot(n) >= 0 && w.crossVectors(x, b).dot(n) >= 0 // x on the short arc a -> b
  for (let i = 0; i < PN; i++) { const a = P[i], b = P[i + 1]; if (RIVER.riverNear(a, _q).d > 2) continue // only near the river
    n1.crossVectors(a, b)
    for (let j = 0; j < RN; j++) { const c = Q[j], d = Q[j + 1]; if (c.dot(a) < Math.cos(0.05)) continue
      n2.crossVectors(c, d); x.crossVectors(n1, n2); if (x.lengthSq() < 1e-20) continue; x.normalize(); if (x.dot(a) < 0) x.negate()
      if (!within(x, a, b, n1) || !within(x, c, d, n2) || BRIDGES.some(o => o.c.angleTo(x) * R < 0.5)) continue // (a crossing at a shared vertex counts once)
      const t = (i + a.angleTo(x) / a.angleTo(b)) / PN * TAU % TAU, cc = x.clone(), tan = pathDir(t + 0.001).sub(pathDir(t - 0.001)).projectOnPlane(cc).normalize()
      BRIDGES.push({ c: cc, tan, side: new THREE.Vector3().crossVectors(cc, tan).normalize(), t, st: (j + c.angleTo(x) / c.angleTo(d)) / RN * TAU }) } } }
BRIDGES.sort((a, b) => a.c.distanceTo(VILL) - b.c.distanceTo(VILL))
export const BL = 1.0 // bridge length (world units), spans the pinched river with its banks
export function bridgeLift(n) { for (const b of BRIDGES) { const L = b.L || BL, dx = n.x - b.c.x, dy = n.y - b.c.y, dz = n.z - b.c.z; const a = (dx * b.tan.x + dy * b.tan.y + dz * b.tan.z) * R, s = (dx * b.side.x + dy * b.side.y + dz * b.side.z) * R; if (Math.abs(a) < L / 2 && Math.abs(s) < 0.13) return 0.035 + 0.07 * Math.cos((a / L) * Math.PI) } return 0 }
export const onBridgeDeck = (n, pad = 0) => BRIDGES.some(b => { const dx = n.x - b.c.x, dy = n.y - b.c.y, dz = n.z - b.c.z; return Math.abs((dx * b.tan.x + dy * b.tan.y + dz * b.tan.z) * R) < (b.L || BL) / 2 + pad && Math.abs((dx * b.side.x + dy * b.side.y + dz * b.side.z) * R) < 0.13 + pad * 0.3 })
export const onBridge = (n) => BRIDGES.some(b => b.c.angleTo(n) < ((b.L || BL) / 2 + 0.08) / R)
// narrow jump spots: spread along the river, away from bridges, lake, harbour and forest (new: and off the waterfall,
// off steep runs and out of the sea)
const _wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a))
const RL = RIVER.RIVER_LEN, alongW = (t1, t2) => Math.abs(t1 - t2) / TAU * RL // world units along the open river
export const JUMPS = []
if (OLD_WORLD) { for (let k = 0; k < 14 && JUMPS.length < 4; k++) { const t = ((k * 0.618034) % 1) * Math.PI * 2; const n = streamDir(t).normalize()
    if (BRIDGES.some(b => Math.abs(_wrap(b.t - t)) < 0.55) || JUMPS.some(j => Math.abs(_wrap(j.t - t)) < 0.9)) continue
    if (ang(n, ZONES.harbour) < ZONES.harbour.r * 1.6 || ang(n, ZONES.lake) < ZONES.lake.r * 1.6 || ang(n, ZONES.forest) < ZONES.forest.r * 0.8) continue
    const tan = streamDir(t + 0.004).normalize().sub(n).normalize(); JUMPS.push({ t, c: n, tan, side: new THREE.Vector3().crossVectors(tan, n).normalize() }) } }
else { for (let k = 0; k < 60 && JUMPS.length < 4; k++) { const t = ((k * 0.618034) % 1) * TAU; const n = streamDir(t).normalize()
    if (BRIDGES.some(b => alongW(b.st, t) < 2.0) || JUMPS.some(j => alongW(j.t, t) < 2.5)) continue
    if (ang(n, ZONES.harbour) < ZONES.harbour.r * 1.6 || ang(n, ZONES.lake) < ZONES.lake.r * 1.6 || ang(n, ZONES.forest) < ZONES.forest.r * 0.8) continue
    if (ang(n, ZONES.cliff) < ZONES.cliff.r + 0.08 || latOfN(n) < SEA_LAT + 0.05) continue // the waterfall face and plunge pool; the sea
    const up = streamDir(t - 0.3 / RL * TAU).normalize(), dn = streamDir(t + 0.3 / RL * TAU).normalize(); if (Math.abs(height(up) - height(dn)) > 0.12) continue // a steep run
    const tan = streamDir(t + 0.004).normalize().sub(n).normalize(); JUMPS.push({ t, c: n, tan, side: new THREE.Vector3().crossVectors(tan, n).normalize() }) } }
export const RIVER_HALF = RIVER.RIVER_HALF, BRIDGE_HALF = 0.2, JUMP_HALF = 0.14
const gauss = (d, s) => Math.exp(-(d * d) / (s * s))
function loopHalf(t) { let h = RIVER_HALF
  for (const b of BRIDGES) h -= (RIVER_HALF - BRIDGE_HALF) * gauss(_wrap(t - b.t), 0.07)
  for (const j of JUMPS) h = Math.min(h, RIVER_HALF - (RIVER_HALF - JUMP_HALF) * gauss(_wrap(t - j.t), 0.03))
  return h * (1 + 0.06 * Math.sin(t * 13)) }
// the open river: riverHalf(u) pinched at the bridges and jumps over the same world-unit widths as the loop had
function openHalf(t) { const base = RIVER.riverHalf(t / TAU); let h = base
  for (const b of BRIDGES) h -= Math.max(0, base - BRIDGE_HALF) * gauss(alongW(t, b.st), 0.64)
  for (const j of JUMPS) h = Math.min(h, base - Math.max(0, base - JUMP_HALF) * gauss(alongW(t, j.t), 0.27))
  return h * (1 + 0.06 * Math.sin(t / TAU * RL * 1.4)) }
export const streamHalf = OLD_WORLD ? loopHalf : openHalf
// nearest point on the river: { d: world-unit distance from the centre line, half: half width there, t,
// side: legacy +1 north / -1 south; new +1 left bank / -1 right bank, looking downstream }
const SN = 1800; let SP = null
const _sr = { d: 9, half: 0, t: 0, side: 1 }
function loopNear(n, out = _sr) {
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
const _rv = { d: 9, u: 0, half: 0, side: 1 }
function openNear(n, out = _sr) { RIVER.riverNear(n, _rv); out.d = _rv.d; out.t = _rv.u * TAU; out.half = streamHalf(out.t); out.side = _rv.side; return out }
export const streamNear = OLD_WORLD ? loopNear : openNear
// which river side a and b are on, and whether they share it: { same, a, b } (sides as streamNear reports them).
// Legacy: the loop splits the planet in two, so each point's own side decides. The open river doesn't split the planet
// (far away, the nearest point jumps between its two ends), so sides are only compared where the straight walk from
// a to b actually crosses the river: same = an even number of crossings, a / b = the sides just before the first and
// just after the last crossing (or a's own side when there is none).
const _sa = { d: 9, half: 0, t: 0, side: 1 }, _sb = { d: 9, half: 0, t: 0, side: 1 }, _sw = new THREE.Vector3(), _wa = new THREE.Vector3(), _wb = new THREE.Vector3(), _ss = { same: true, a: 1, b: 1 }
export function streamSides(a, b, out = _ss) {
  const sa = streamNear(a, _sa).side, da = _sa.d - _sa.half, sb = streamNear(b, _sb).side, db = _sb.d - _sb.half
  if (OLD_WORLD) { out.a = sa; out.b = sb; out.same = sa === sb; return out }
  out.a = out.b = sa; out.same = true
  const L = a.angleTo(b) * R; if (Math.min(da, db) > L / 2 + 0.05) return out // the walk can't reach the water
  const k = Math.min(40, Math.max(2, Math.ceil(L / 0.2))), step = L / k
  _wa.copy(a).normalize(); _wb.copy(b).normalize()
  let prev = sa, prevNear = da < step + 0.3 && _sa.t > 0.01 && _sa.t < TAU - 0.01, n = 0
  for (let i = 1; i <= k; i++) {
    const s = i === k ? _sb : streamNear(_sw.copy(_wa).multiplyScalar(1 - i / k).addScaledVector(_wb, i / k).normalize(), _sa)
    const near = s.d - s.half < step + 0.3 && s.t > 0.01 && s.t < TAU - 0.01 // round the spring (u = 0) is not a crossing
    if (near && prevNear && s.side !== prev) { if (n === 0) out.a = prev; out.b = s.side; n++ }
    prev = s.side; prevNear = near
  }
  out.same = n % 2 === 0; if (n === 0) out.b = out.a; return out
}
// n moved `dist` world units toward river side `side` (as streamNear reports sides): legacy along the meridian, new
// across the river's local flow direction (for the dog's bank-finding, which used to step in latitude)
const _ac = new THREE.Vector3()
export function streamAcross(n, side, dist, out = new THREE.Vector3()) {
  if (OLD_WORLD) return out.copy(dir(latOfN(_ac.copy(n).normalize()) + side * dist / R, Math.atan2(n.x, n.z)))
  RIVER.riverLeft(RIVER.riverNear(n, _rv).u, _ac); return out.copy(n).normalize().addScaledVector(_ac, side * dist / R).normalize()
}
// is this point open water she can't stand in? (river away from the bridge decks, deep lake, harbour; new: the deep sea
// past the wadeable shelf)
const SEA_DEEP = 0.12
// how far below the sea surface (SEA_W) the ground is, south of the shoreline; 0 on land, in the lake, and in ?world=old
export function seaDepth(n) {
  if (OLD_WORLD || n.y / Math.hypot(n.x, n.y, n.z) >= Math.sin(SEA_LAT + 0.05)) return 0
  return Math.max(0, SEA_W - height(n))
}
export function waterAt(n, margin = 0.02) {
  const s = streamNear(n); if (s.d < s.half - margin && !onBridgeDeck(n)) return true
  if (ang(n, ZONES.lake) < ZONES.lake.r * 1.2 && height(n) < LAKE_W - 0.03) return true
  if (ang(n, ZONES.harbour) < ZONES.harbour.r * 1.2 && height(n) < HARB_W - 0.03) return true
  if (seaDepth(n) > SEA_DEEP) return true
  return false
}
// would a prop standing here stand in water (the sea, a little shallows included, the lake, the harbour, the river and
// its banks)? Scatter (trees, flowers, rocks) skips these points; the water surfaces are opaque, so anything below
// them only shows as a stub through the surface. Always false under ?world=old (its scatter rules stay as they were).
export function underWater(n) {
  if (OLD_WORLD) return false
  if (seaDepth(n) > 0) return true
  const near = (z) => ang(n, z) < z.r * 1.25
  if ((near(ZONES.lake) && height(n) < LAKE_W + 0.02) || (near(ZONES.harbour) && height(n) < HARB_W + 0.02)) return true
  const s = streamNear(n); return s.d < s.half + 0.05
}
// each bridge spans the water it actually crosses (the path meets the river at a slant): centre it on the water and
// size it to the span + a little bank either side
for (const b of BRIDGES) { let lo = 0, hi = 0; const _n = new THREE.Vector3()
  const wet = (a) => { _n.copy(b.c).addScaledVector(b.tan, a / R).normalize(); const sn = streamNear(_n); return sn.d < sn.half }
  while (lo > -2 && wet(lo - 0.02)) lo -= 0.02; while (hi < 2 && wet(hi + 0.02)) hi += 0.02
  const mid = (lo + hi) / 2; b.c = b.c.clone().addScaledVector(b.tan, mid / R).normalize(); b.side.crossVectors(b.c, b.tan).normalize(); b.tan.crossVectors(b.side, b.c).normalize(); b.L = Math.max(0.8, hi - lo + 0.34) }
// dig sites (world/regions.js DIG_SITES order) as unit vectors. Site 4, the footings of BRIDGES[0], is placed here (the
// registry is pure data and only holds a placeholder): on the far bank at the deck's end, beside the path. (The
// village-end bank is the square itself: its bench, chat spots and lamps leave no room for a dig prompt.)
const FOOTINGS = (() => { const b = BRIDGES[0], e = b.c.clone().addScaledVector(b.tan, (b.L / 2 + 0.2) / R), w = b.c.clone().addScaledVector(b.tan, -(b.L / 2 + 0.2) / R)
  return (e.distanceTo(VILL) > w.distanceTo(VILL) ? e : w).addScaledVector(b.side, 0.5 / R).normalize() })()
export const DIG_SITE_POS = (i) => i === 4 ? FOOTINGS.clone() : dir(DIG_SITES[i].lat, DIG_SITES[i].lon)
// the museum door (systems/WorldC.jsx prompt, zones.jsx keeper arch): on the museum region, 0.8 r from its centre on the
// side facing the path. null under ?world=old (the door stays beside the old ruins).
export const MUSEUM_DOOR = OLD_WORLD ? null : (() => { const m = region('museum'), c = dir(m.lat, m.lon); let p = null, best = 9
  for (let i = 0; i < 4000; i++) { const q = pathDir(i / 4000 * Math.PI * 2), d = q.angleTo(c); if (d < best) { best = d; p = q } }
  const t = p.clone().addScaledVector(c, -c.dot(p)).normalize(); return c.multiplyScalar(Math.cos(m.r * 0.8)).addScaledVector(t, Math.sin(m.r * 0.8)).normalize() })()
if (typeof window !== 'undefined') window.__river = OLD_WORLD ? { streamNear, waterAt, BRIDGES, JUMPS, streamHalf } : { streamNear, waterAt, BRIDGES, JUMPS, streamHalf, riverNear: RIVER.riverNear, riverDir: RIVER.riverDir, riverHalf: RIVER.riverHalf, RIVER_PTS: RIVER.RIVER_PTS }
// old-style 'centre distance' (radians) measured from the new bank: scatter rules tuned for the thin stream keep their meaning
export const streamDist = (n) => { const r = streamNear(n); return Math.max(0, r.d - r.half + 0.17) / R }
if (typeof window !== 'undefined') window.__height = height
