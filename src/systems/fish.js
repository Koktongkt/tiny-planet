// Stage C fishing (pure; unit-tested): species table, catch rolls, the calmer reel minigame and the catch log.
// Inventory keeps ONE generic 'fish' item (all recipes unchanged); species live in G.s.fish[id] = { count, best, firstDay }.
// RARE_ITEMS are also added as their own items (gifts / museum). Studio writes the names + blurbs (itemsC.js);
// Codor balances w (weights), sizes and filters here.
// The species table is Studio's draft (game/fishTable.js: spots, season, time, weather, rarity); Codor balances it here:
// BAL overrides per species and the rarity weights W. Balance rules (unit-tested): every habitat always has a common
// fish at every time of day in every season and weather, so a cast never comes up empty.
import { FISH as DRAFT, RARE_FISH_ITEMS } from '../game/fishTable.js'
export const W = { common: 10, uncommon: 4, rare: 1.2, legend: 0.3 }
const BAL = {
  mackerel: { time: 'any' }, // harbour had nothing at night
  loach: { weather: 'any' }, // the river's all-weather common (was rain-only)
  catfish: { weather: 'any', w: 3 }, // evenings + nights; rain still doubles it below via RAIN_BONUS
  lake_lord: { w: 0.3 },
}
const RAIN_LOVERS = ['catfish', 'loach', 'lake_lord']
export const FISH = Object.fromEntries(DRAFT.map(f => { const b = BAL[f.id] || {}; return [f.id, { rarity: f.rarity, size: f.size, spots: f.spots, habitat: f.spots[0], season: f.season, time: f.time, weather: f.weather, ...b, w: b.w ?? W[f.rarity] }] }))
export const FISH_IDS = Object.keys(FISH)
export const RARE_ITEMS = RARE_FISH_ITEMS
export const RARE = { common: 0, uncommon: 1, rare: 2, legend: 3 }
// spot zone -> habitat (existing spots are 'lake' and 'harbour'; river spots may be added later)
export const habitatOf = (zone) => zone === 'harbour' ? 'harbour' : zone === 'river' ? 'river' : 'lake'
const fits = (v, x) => v === 'any' || v.includes(x)
// ctx: { season, period, kind: 'clear'|'rain', lucky? }. Returns the weighted candidate list (for tests / journal hints)
export function candidates(habitat, ctx) {
  const out = [], wet = ctx.kind === 'rain'
  for (const id of FISH_IDS) { const f = FISH[id]; if (!f.spots.includes(habitat) || !fits(f.season, ctx.season) || !fits(f.time, ctx.period)) continue
    if ((f.weather === 'rain' && !wet) || (f.weather === 'clear' && wet)) continue
    let w = f.w; if (wet && (f.weather === 'rain' || RAIN_LOVERS.includes(id))) w *= 2; if (ctx.lucky && RARE[f.rarity] >= 2) w *= 1.5
    out.push([id, w]) }
  return out
}
// rng: () => [0,1). -> { fishId, size } (size in cm, 1 decimal, triangular toward the middle)
export function rollFish(habitat, ctx, rng = Math.random) {
  const c = candidates(habitat, ctx); if (!c.length) return { fishId: habitat === 'harbour' ? 'mackerel' : 'minnow', size: 10 }
  let tot = 0; for (const [, w] of c) tot += w
  let r = rng() * tot, id = c[c.length - 1][0]; for (const [k, w] of c) { if ((r -= w) < 0) { id = k; break } }
  const [a, b] = FISH[id].size, t = (rng() + rng()) / 2
  return { fishId: id, size: Math.round((a + (b - a) * t) * 10) / 10 }
}
// catch log: log = G.s.fish. -> { isNew, isRecord }
export function recordCatch(log, fishId, size, day) {
  const e = log[fishId], isNew = !e
  if (isNew) { log[fishId] = { count: 1, best: size, firstDay: day }; return { isNew, isRecord: true } }
  e.count++; const isRecord = size > e.best; if (isRecord) e.best = size
  return { isNew, isRecord }
}

// ---------- calmer reel minigame ----------
// idle -> cast -> wait -> bite -> reel -> caught | slipped. No line snapping, no fail-on-miss: keep the catch bar on the fish
// to fill progress; off it, progress drains slowly; she only loses it if progress sits at 0 for SLIP_S.
export const REEL = { fill: 0.35, drain: 0.12, barW: 0.26, rise: 1.1, fall: 0.9, start: 0.3, slipS: 6, castS: 0.65, biteS: 1.2 }
export const fishSpeed = (rarity) => [0.25, 0.35, 0.47, 0.6][RARE[rarity] ?? 0]
export function newReel(fishId, seed = 1) { return { state: 'cast', t: 0, fishId, speed: fishSpeed(FISH[fishId]?.rarity), fx: 0.5, ft: 0.5, bar: 0.5, bv: 0, prog: REEL.start, zero: 0, wait: 1.5 + (seed % 1000) / 1000 * 2.5, k: seed >>> 0 } }
const lcg = (s) => (s.k = (Math.imul(s.k, 1664525) + 1013904223) >>> 0) / 4294967296
// one step; holding = E/Space/pointer down. Mutates and returns st.
export function fishStep(st, dt, holding) {
  st.t += dt
  if (st.state === 'cast') { if (st.t >= REEL.castS) { st.state = 'wait'; st.t = 0 } return st }
  if (st.state === 'wait') { if (st.t >= st.wait) { st.state = 'bite'; st.t = 0 } return st }
  if (st.state === 'bite') { if (holding || st.t >= REEL.biteS) { st.state = 'reel'; st.t = 0 } return st }
  if (st.state !== 'reel') return st
  // the fish wanders between gentle targets
  if (Math.abs(st.ft - st.fx) < 0.02) st.ft = 0.1 + lcg(st) * 0.8
  st.fx += Math.sign(st.ft - st.fx) * Math.min(Math.abs(st.ft - st.fx), st.speed * dt)
  // the bar: holding lifts it, releasing lets it settle (soft, damped)
  st.bv += (holding ? REEL.rise : -REEL.fall) * dt; st.bv *= Math.exp(-dt * 3); st.bar = Math.min(1, Math.max(0, st.bar + st.bv * dt))
  if ((st.bar === 0 && st.bv < 0) || (st.bar === 1 && st.bv > 0)) st.bv = 0
  const on = Math.abs(st.fx - st.bar) < REEL.barW / 2
  st.prog = Math.min(1, Math.max(0, st.prog + (on ? REEL.fill : -REEL.drain) * dt))
  st.zero = st.prog <= 0 ? st.zero + dt : 0
  if (st.prog >= 1) { st.state = 'caught'; st.t = 0 } else if (st.zero >= REEL.slipS) { st.state = 'slipped'; st.t = 0 }
  return st
}
