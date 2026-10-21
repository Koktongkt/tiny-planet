// Stage C seasons + weather (pure, no DOM; unit-tested). Everything is a function of the clock phase rot.a, so it is
// deterministic, survives reloads with the clock, and needs no save fields.
// Day d starts at phase -pi/2 + d*2pi (06:00). Seasons: 7 in-game days each, day 0 = spring; the last day of a season
// cross-fades into the next. Rain: exactly one seeded day in each 7-day block, never on day 0 or 1.
export const TAU = Math.PI * 2
export const SEASONS = ['spring', 'summer', 'autumn', 'winter']
export const SEASON_DAYS = 7
export const seasonIndex = (day) => Math.floor(Math.max(0, day) / SEASON_DAYS) % 4
export const seasonOf = (day) => SEASONS[seasonIndex(day)]
// phase -> { day, u } with u in [0,1) = fraction of the day since 06:00
export function dayPos(a) { const x = (a + Math.PI / 2) / TAU, day = Math.max(0, Math.floor(x)); return { day, u: Math.min(0.999999, Math.max(0, x - day)) } }
const hash = (n) => { let h = (n | 0) * 374761393 + 668265263; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296 }
// [sp, su, au, wi]; out is reused if given (no per-frame allocation)
export function seasonWeights(day, u, out = [0, 0, 0, 0]) {
  out[0] = out[1] = out[2] = out[3] = 0
  const i = seasonIndex(day), last = day % SEASON_DAYS === SEASON_DAYS - 1
  const f = last ? u * u * (3 - 2 * u) : 0
  out[i] = 1 - f; out[(i + 1) % 4] += f
  return out
}
export function rainDayOfBlock(b) { const lo = b === 0 ? 2 : 0; return b * SEASON_DAYS + lo + Math.floor(hash(b * 7 + 11) * (SEASON_DAYS - lo)) }
export const isRainDay = (day) => day >= 2 && rainDayOfBlock(Math.floor(day / SEASON_DAYS)) === day
// rain window in hours after 06:00: starts 1..6 h (07:00-12:00), lasts 4..8 h
export function rainWindow(day) { const s = 1 + Math.floor(hash(day * 13 + 5) * 6), d = 4 + Math.floor(hash(day * 17 + 3) * 5); return [s, s + d] }
export const RAMP_H = 1, WET_IN_H = 1.5, DRY_H = 3
const cl = (x) => Math.min(1, Math.max(0, x))
// -> { kind: 'clear'|'rain', rain 0..1, wet 0..1 }; out reused if given
export function weatherAt(day, u, out = { kind: 'clear', rain: 0, wet: 0 }) {
  out.kind = 'clear'; out.rain = 0; out.wet = 0
  if (!isRainDay(day)) return out
  const h = u * 24, [s, e] = rainWindow(day)
  out.rain = cl((h - s) / RAMP_H) * cl((e - h) / RAMP_H)
  out.kind = out.rain > 0.02 ? 'rain' : 'clear'
  out.wet = h < s ? 0 : h <= e ? cl((h - s) / WET_IN_H) : cl(1 - (h - e) / DRY_H) * cl((e - s) / WET_IN_H)
  return out
}
// one call for the clock tick: fills T.{season, seasonW, kind, rain, wet}
export function applyTo(T, a) {
  const { day, u } = dayPos(a)
  T.season = seasonOf(day); T.seasonW = seasonWeights(day, u, T.seasonW || [0, 0, 0, 0])
  const w = weatherAt(day, u, T._w || (T._w = { kind: 'clear', rain: 0, wet: 0 })); T.kind = w.kind; T.rain = w.rain; T.wet = w.wet
  return T
}
