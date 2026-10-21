// Stage C fishing (pure; unit-tested): species table, catch rolls, the calmer reel minigame and the catch log.
// Inventory keeps ONE generic 'fish' item (all recipes unchanged); species live in G.s.fish[id] = { count, best, firstDay }.
// RARE_ITEMS are also added as their own items (gifts / museum). Studio writes the names + blurbs (itemsC.js);
// Codor balances w (weights), sizes and filters here.
export const FISH = {
  minnow: { rarity: 'common', size: [4, 9], habitat: 'lake', season: 'any', time: 'any', weather: 'any', w: 30 },
  crucian: { rarity: 'common', size: [12, 25], habitat: 'lake', season: ['spring', 'summer', 'autumn'], time: 'any', weather: 'any', w: 24 },
  catfish: { rarity: 'uncommon', size: [30, 70], habitat: 'lake', season: 'any', time: ['evening', 'night'], weather: 'any', w: 12 },
  koi: { rarity: 'rare', size: [35, 60], habitat: 'lake', season: ['spring', 'summer'], time: ['morning', 'day'], weather: 'any', w: 5 },
  lake_lord: { rarity: 'legend', size: [90, 140], habitat: 'lake', season: 'any', time: ['night'], weather: 'rain', w: 1.5 },
  ayu: { rarity: 'common', size: [12, 22], habitat: 'river', season: ['summer', 'autumn'], time: 'any', weather: 'any', w: 26 },
  char: { rarity: 'uncommon', size: [20, 40], habitat: 'river', season: ['autumn', 'winter', 'spring'], time: ['morning', 'evening'], weather: 'any', w: 14 },
  loach: { rarity: 'common', size: [8, 16], habitat: 'river', season: 'any', time: 'any', weather: 'any', w: 22 },
  mackerel: { rarity: 'common', size: [25, 40], habitat: 'harbour', season: 'any', time: 'any', weather: 'any', w: 30 },
  flounder: { rarity: 'uncommon', size: [25, 50], habitat: 'harbour', season: 'any', time: 'any', weather: 'any', w: 14 },
  sea_bream: { rarity: 'uncommon', size: [30, 55], habitat: 'harbour', season: ['spring', 'autumn'], time: ['morning', 'day'], weather: 'any', w: 10 },
  pufferfish: { rarity: 'rare', size: [15, 35], habitat: 'harbour', season: ['summer', 'winter'], time: 'any', weather: 'rain', w: 4 },
}
export const FISH_IDS = Object.keys(FISH)
export const RARE_ITEMS = ['koi', 'lake_lord', 'pufferfish']
export const RARE = { common: 0, uncommon: 1, rare: 2, legend: 3 }
// spot zone -> habitat (existing spots are 'lake' and 'harbour'; river spots may be added later)
export const habitatOf = (zone) => zone === 'harbour' ? 'harbour' : zone === 'river' ? 'river' : 'lake'
const fits = (v, x) => v === 'any' || v.includes(x)
// ctx: { season, period, kind: 'clear'|'rain', lucky? }. Returns the weighted candidate list (for tests / journal hints)
export function candidates(habitat, ctx) {
  const out = []
  for (const id of FISH_IDS) { const f = FISH[id]; if (f.habitat !== habitat || !fits(f.season, ctx.season) || !fits(f.time, ctx.period)) continue
    if (f.weather === 'rain' && ctx.kind !== 'rain') continue
    let w = f.w; if (ctx.kind === 'rain' && f.weather === 'rain') w *= 2; if (ctx.lucky && RARE[f.rarity] >= 2) w *= 1.5
    out.push([id, w]) }
  return out
}
// rng: () => [0,1). -> { fishId, size } (size in cm, 1 decimal, triangular toward the middle)
export function rollFish(habitat, ctx, rng = Math.random) {
  const c = candidates(habitat, ctx); if (!c.length) return { fishId: habitat === 'harbour' ? 'mackerel' : habitat === 'river' ? 'loach' : 'minnow', size: 10 }
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
