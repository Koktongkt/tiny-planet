// The reworked planet's river: one open curve from the spring on Keepers' Peak to the sea, flowing downhill the whole way
// (Peak spring -> along the spring spur onto the Waterfall Cliff mesa -> falls off its downhill face -> skirts the foot of
// the Terraces -> slows down the Village's east side -> through the Lake -> along the coast into the Harbour -> the sea).
// Pure geometry (no height(), no world.js import); world.js wraps it in the old streamDir/streamNear signatures.
import * as THREE from 'three'

export const RIVER_HALF = 0.46 // mid-river half width (world units); 0.6x at the spring, 1.4x at the mouth
const R = 10.4 // planet radius (world.js R; duplicated to keep this module free of a world.js import)

// Control points (lat, lon), upstream first. Tuned against the slope terrain (world.js slopeHeight) and the region table.
export const RIVER_PTS = [
  { lat: 1.212, lon: 0.247 }, // the spring, on the Peak rim (0.18 rad from its centre) at the top of the spring spur
  { lat: 1.173, lon: 0.274 }, // down the spur crest (the spur runs straight from the Peak centre to the cliff centre)
  { lat: 1.124, lon: 0.301 }, // onto the mesa top
  { lat: 1.060, lon: 0.335 }, // across the mesa (level)
  { lat: 1.000, lon: 0.395 },
  { lat: 0.950, lon: 0.430 }, // the lip: the waterfall drops off the downhill face toward the Terraces
  { lat: 0.885, lon: 0.505 }, // the plunge pool at the cliff foot
  { lat: 0.800, lon: 0.535 }, // the foot of the Terraces' west side (bottom step)
  { lat: 0.700, lon: 0.525 },
  { lat: 0.560, lon: 0.470 },
  { lat: 0.440, lon: 0.430 }, // the Village's north-east corner (HOME_DIR is ~3.6 world units west)
  { lat: 0.330, lon: 0.445 }, // the Village's east side
  { lat: 0.200, lon: 0.520 },
  { lat: 0.060, lon: 0.680 }, // into the Lake
  { lat: -0.150, lon: 0.870 }, // across the Lake, east of the drowned ruins
  { lat: -0.360, lon: 0.930 }, // the outlet on the south shore
  { lat: -0.540, lon: 1.020 },
  { lat: -0.660, lon: 1.200 }, // along the coast
  { lat: -0.700, lon: 1.420 }, // into the Harbour bay
  { lat: -0.760, lon: 1.580 },
  { lat: -0.880, lon: 1.640 }, // out past the shoreline
  { lat: -0.980, lon: 1.680 }, // the sea
]

const unitOf = ({ lat, lon }) => new THREE.Vector3(Math.cos(lat) * Math.sin(lon), Math.sin(lat), Math.cos(lat) * Math.cos(lon))
const CP = RIVER_PTS.map(unitOf)

// centripetal Catmull-Rom (no cusps or loops with uneven spacing) through the control points in 3D, then projected onto
// the sphere; the end tangents come from mirrored phantom points. raw(p) takes p in [0, CP.length - 1].
const PH = [CP[0].clone().multiplyScalar(2).sub(CP[1]), ...CP, CP[CP.length - 1].clone().multiplyScalar(2).sub(CP[CP.length - 2])]
const KN = [0]; for (let i = 1; i < PH.length; i++) KN.push(KN[i - 1] + Math.sqrt(PH[i].distanceTo(PH[i - 1])))
const _a1 = new THREE.Vector3(), _a2 = new THREE.Vector3(), _a3 = new THREE.Vector3(), _b1 = new THREE.Vector3(), _b2 = new THREE.Vector3()
const lerpK = (out, p, q, ta, tb, t) => out.copy(p).multiplyScalar((tb - t) / (tb - ta)).addScaledVector(q, (t - ta) / (tb - ta))
function raw(p, out) {
  const i = Math.min(CP.length - 2, Math.max(0, Math.floor(p))), f = p - i // segment CP[i] -> CP[i+1] = PH[i+1] -> PH[i+2]
  const P0 = PH[i], P1 = PH[i + 1], P2 = PH[i + 2], P3 = PH[i + 3], t0 = KN[i], t1 = KN[i + 1], t2 = KN[i + 2], t3 = KN[i + 3], t = t1 + (t2 - t1) * f
  lerpK(_a1, P0, P1, t0, t1, t); lerpK(_a2, P1, P2, t1, t2, t); lerpK(_a3, P2, P3, t2, t3, t)
  lerpK(_b1, _a1, _a2, t0, t2, t); lerpK(_b2, _a2, _a3, t1, t3, t)
  return lerpK(out, _b1, _b2, t1, t2, t).normalize()
}
// arc-length table so u is proportional to distance along the river
const RN = 4000, ARC = new Float64Array(RN + 1)
{ const a = new THREE.Vector3(), b = new THREE.Vector3(); raw(0, a)
  for (let i = 1; i <= RN; i++) { raw((i / RN) * (CP.length - 1), b); ARC[i] = ARC[i - 1] + a.angleTo(b); a.copy(b) } }
export const RIVER_LEN = ARC[RN] * R // world units along the river
const _e0 = raw(0, new THREE.Vector3()), _e1 = raw(1e-3, new THREE.Vector3()), _f0 = raw(CP.length - 1, new THREE.Vector3()), _f1 = raw(CP.length - 1 - 1e-3, new THREE.Vector3())
const END0 = { p: _e0, t: _e0.clone().sub(_e1).projectOnPlane(_e0).normalize() } // heading upstream past the spring
const END1 = { p: _f0, t: _f0.clone().sub(_f1).projectOnPlane(_f0).normalize() } // heading downstream past the end
// the river's centre at u in [0, 1] (unit vector, a new Vector3). Outside [0, 1] it carries on along the end tangents
// (great circles), so callers that peek at u + 0.01 for a tangent stay finite.
export function riverDir(u) {
  const out = new THREE.Vector3()
  if (u <= 0 || u >= 1) { const e = u <= 0 ? END0 : END1, a = (u <= 0 ? -u : u - 1) * ARC[RN]; return out.copy(e.p).multiplyScalar(Math.cos(a)).addScaledVector(e.t, Math.sin(a)) }
  const s = u * ARC[RN]; let lo = 0, hi = RN
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (ARC[m] <= s) lo = m; else hi = m }
  const f = (s - ARC[lo]) / Math.max(1e-12, ARC[hi] - ARC[lo])
  return raw(((lo + f) / RN) * (CP.length - 1), out)
}

// precomputed samples (unit vectors), evenly spaced in u
const SN = 600, SP = new Float32Array(SN * 3)
for (let i = 0; i < SN; i++) { const p = riverDir(i / (SN - 1)); SP[i * 3] = p.x; SP[i * 3 + 1] = p.y; SP[i * 3 + 2] = p.z }
// where the river reaches the open sea: the width eases out to 1.4x between the harbour and here
let U_MOUTH = 1; for (let i = 0; i < SN; i++) if (Math.asin(SP[i * 3 + 1]) < -0.78) { U_MOUTH = i / (SN - 1); break }
const sst = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t) }
// half width (world units): a narrow creek at the spring, today's RIVER_HALF mid-river, 1.4x where it meets the sea
export function riverHalf(u) { return RIVER_HALF * (0.6 + 0.4 * sst(0, 0.18, u) + 0.4 * sst(U_MOUTH - 0.12, U_MOUTH, u)) }

// coarse bucket grid over the unit cube: each cell lazily keeps the samples that can be nearest to any point in it
// (those within the cell centre's nearest distance + one cell diagonal); far cells keep a sparse subset (FAR_STEP)
// since callers only need a rough distance out there.
const CS = 0.08, NG = Math.ceil(2 / CS) + 1, HD = CS * Math.sqrt(3) / 2, FAR = 0.3, FAR_STEP = 6
const CELLS = new Array(NG * NG * NG)
function cell(ix, iy, iz) {
  const k = (ix * NG + iy) * NG + iz; let c = CELLS[k]; if (c) return c
  const cx = (ix + 0.5) * CS - 1, cy = (iy + 0.5) * CS - 1, cz = (iz + 0.5) * CS - 1; let m = 9, mi = 0
  for (let i = 0; i < SN; i++) { const dx = SP[i * 3] - cx, dy = SP[i * 3 + 1] - cy, dz = SP[i * 3 + 2] - cz, d = dx * dx + dy * dy + dz * dz; if (d < m) { m = d; mi = i } }
  m = Math.sqrt(m); const far = m - HD > FAR, lim = (m + 2 * HD) ** 2, list = []
  for (let i = 0; i < SN; i++) { if (far && i % FAR_STEP && i !== mi) continue; const dx = SP[i * 3] - cx, dy = SP[i * 3 + 1] - cy, dz = SP[i * 3 + 2] - cz; if (dx * dx + dy * dy + dz * dz <= lim) list.push(i) }
  return (CELLS[k] = { list: Int16Array.from(list), far })
}
const ci = (v) => Math.min(NG - 1, Math.max(0, Math.floor((v + 1) / CS)))
// nearest point on the river: { d: world-unit distance from the centre line, u, half: riverHalf(u),
// side: +1 on the left bank (looking downstream), -1 on the right }
const _rr = { d: 9, u: 0, half: 0, side: 1 }
export function riverNear(n, out = _rr) {
  const len = Math.hypot(n.x, n.y, n.z), x = n.x / len, y = n.y / len, z = n.z / len, c = cell(ci(x), ci(y), ci(z)), L = c.list
  let m = 9, bi = 0
  for (let k = 0; k < L.length; k++) { const i = L[k], dx = SP[i * 3] - x, dy = SP[i * 3 + 1] - y, dz = SP[i * 3 + 2] - z, d = dx * dx + dy * dy + dz * dz; if (d < m) { m = d; bi = i } }
  let best = Math.sqrt(m), bu = bi, sa = Math.max(0, bi - 1), sb = sa + 1
  if (!c.far) for (let j = bi - 1; j <= bi; j++) { if (j < 0 || j >= SN - 1) continue // refine on the two neighbouring segments
    const a = j * 3, ax = SP[a], ay = SP[a + 1], az = SP[a + 2], ex = SP[a + 3] - ax, ey = SP[a + 4] - ay, ez = SP[a + 5] - az, L2 = ex * ex + ey * ey + ez * ez
    const f = Math.max(0, Math.min(1, ((x - ax) * ex + (y - ay) * ey + (z - az) * ez) / L2)), dx = ax + ex * f - x, dy = ay + ey * f - y, dz = az + ez * f - z, d = Math.sqrt(dx * dx + dy * dy + dz * dz)
    if (d <= best) { best = d; bu = j + f; sa = j; sb = j + 1 } }
  // side: which side of the local flow direction (left = up x downstream)
  const a = sa * 3, b = sb * 3, tx = SP[b] - SP[a], ty = SP[b + 1] - SP[a + 1], tz = SP[b + 2] - SP[a + 2], px = SP[a], py = SP[a + 1], pz = SP[a + 2]
  const lx = py * tz - pz * ty, ly = pz * tx - px * tz, lz = px * ty - py * tx
  out.side = x * lx + y * ly + z * lz >= 0 ? 1 : -1
  out.u = bu / (SN - 1); out.d = best * R; out.half = riverHalf(out.u); return out
}
// the unit "left bank" direction across the river at u (perpendicular to the flow, tangent to the sphere)
export function riverLeft(u, out = new THREE.Vector3()) {
  const p = riverDir(u), q = riverDir(u + 0.002); q.sub(p); return out.crossVectors(p, q).normalize()
}
