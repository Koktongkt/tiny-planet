// Stage C train schedule + fares (pure; unit-tested). The train runs east round the TRAIN_LAT ring at its old cruise speed
// and now brakes, dwells and pulls away at each stop (stops: [{ id, lon }], from world/village.js TRAIN_STOPS).
export const CRUISE = 0.05 // rad of longitude / s (the old constant speed)
export const BRAKE = 0.12 // rad of longitude to brake / accelerate over
export const DWELL = 8 // s at each stop
const TAU = Math.PI * 2, mod = (x, m) => ((x % m) + m) % m
// legs between consecutive stops: [{ from, to, lon0, gap, t0, dur }] + loop period
export function buildSchedule(stops, v = CRUISE, D = BRAKE, W = DWELL) {
  const s = stops.map(x => ({ ...x, lon: mod(x.lon, TAU) })).sort((a, b) => a.lon - b.lon), legs = []; let t = 0
  for (let i = 0; i < s.length; i++) { const a = s[i], b = s[(i + 1) % s.length], gap = mod(b.lon - a.lon, TAU) || TAU, D2 = Math.min(D, gap / 2)
    const run = (gap - 2 * D2) / v + 4 * D2 / v; legs.push({ from: a.id, to: b.id, lon0: a.lon, gap, D: D2, t0: t, dwell: W, run }); t += W + run }
  return { legs, period: t, v }
}
// -> { lon, speed (0..1 of cruise), stop (id while dwelling, else null), from, to, progress 0..1 along the leg, dwellLeft s }
export function trainState(sch, t, out = {}) {
  const tt = mod(t, sch.period); let L = sch.legs[sch.legs.length - 1]
  for (const l of sch.legs) if (tt >= l.t0) L = l; else break
  const x = tt - L.t0, v = sch.v, a = v * v / (2 * L.D), tb = 2 * L.D / v // accel time
  out.from = L.from; out.to = L.to
  if (x < L.dwell) { out.lon = L.lon0; out.speed = 0; out.stop = L.from; out.progress = 0; out.dwellLeft = L.dwell - x; return out }
  const r = x - L.dwell, cruiseT = L.run - 2 * tb; let d
  if (r < tb) { d = 0.5 * a * r * r; out.speed = r / tb }
  else if (r < tb + cruiseT) { d = L.D + (r - tb) * v; out.speed = 1 }
  else { const k = Math.min(tb, r - tb - cruiseT); d = L.gap - L.D + v * k - 0.5 * a * k * k; out.speed = 1 - k / tb }
  out.lon = mod(L.lon0 + d, TAU); out.stop = null; out.progress = Math.min(1, d / L.gap); out.dwellLeft = 0
  return out
}
// first ride free, then 1 coin. -> { ok, cost }
export const fare = (rides, coins) => { const cost = rides > 0 ? 1 : 0; return { ok: coins >= cost, cost } }
