// Stage C fish availability (draft by Studio, balanced by Codor). Pure data + two tiny helpers, no imports, so it can
// live in any lazy chunk (and node tests). Inventory keeps ONE generic 'fish' item; species go to the collection
// (G.s.fish[speciesId] = { count, best }). RARE_FISH_ITEMS also become their own items (museum + gifts).
//
// FishSpecies: { id, rarity, size: [minCm, maxCm], spots: Spot[], season: Season[] | 'any', time: Period[] | 'any',
//                weather: 'any' | 'clear' | 'rain', weight }   (display name + blurb live in game/itemsC.js)
// Spot = 'lake' | 'river' | 'harbour'   Season = 'spring'|'summer'|'autumn'|'winter'   Period = talk/state.js periodAt():
// 'morning'|'day'|'evening'|'night'   Weather = 'clear'|'rain' (weatherFor 'drizzle'/'rain' -> 'rain', anything else 'clear')
export const SEASONS = ['spring', 'summer', 'autumn', 'winter']
export const RARITY = { common: 10, uncommon: 4, rare: 1.2, legend: 0.25 } // base roll weight
export const FISH = [
  { id: 'minnow', rarity: 'common', size: [4, 9], spots: ['lake', 'river'], season: 'any', time: 'any', weather: 'any' },
  { id: 'crucian', rarity: 'common', size: [10, 26], spots: ['lake'], season: 'any', time: ['morning', 'day', 'evening'], weather: 'any' },
  { id: 'koi', rarity: 'rare', size: [30, 72], spots: ['lake'], season: ['spring', 'summer'], time: ['day'], weather: 'clear' },
  { id: 'catfish', rarity: 'uncommon', size: [30, 62], spots: ['lake', 'river'], season: ['summer', 'autumn'], time: ['evening', 'night'], weather: 'rain' },
  { id: 'lake_lord', rarity: 'legend', size: [96, 142], spots: ['lake'], season: ['autumn', 'winter'], time: ['night'], weather: 'rain' },
  { id: 'ayu', rarity: 'common', size: [12, 26], spots: ['river'], season: ['spring', 'summer'], time: ['morning', 'day'], weather: 'any' },
  { id: 'char', rarity: 'uncommon', size: [18, 36], spots: ['river'], season: ['autumn', 'winter'], time: ['morning'], weather: 'clear' },
  { id: 'loach', rarity: 'common', size: [8, 16], spots: ['river', 'lake'], season: ['spring', 'summer', 'autumn'], time: 'any', weather: 'rain' },
  { id: 'mackerel', rarity: 'common', size: [25, 42], spots: ['harbour'], season: 'any', time: ['morning', 'day', 'evening'], weather: 'any' },
  { id: 'sea_bream', rarity: 'rare', size: [30, 56], spots: ['harbour'], season: ['spring', 'summer'], time: ['morning'], weather: 'clear' },
  { id: 'flounder', rarity: 'uncommon', size: [24, 46], spots: ['harbour'], season: ['autumn', 'winter'], time: ['day', 'evening'], weather: 'any' },
  { id: 'pufferfish', rarity: 'uncommon', size: [10, 26], spots: ['harbour'], season: ['summer', 'autumn'], time: ['evening', 'night'], weather: 'clear' },
]
export const FISH_IDS = FISH.map(f => f.id)
export const FISH_BY_ID = Object.fromEntries(FISH.map(f => [f.id, f]))
// these three are also inventory items (gift favourites, museum centrepieces); every other catch adds the generic 'fish'
export const RARE_FISH_ITEMS = ['koi', 'sea_bream', 'lake_lord']
const ok = (list, v) => list === 'any' || !v || list.includes(v)
/** species catchable here and now. ctx: { spot, season, period, weather } (weather already folded to 'clear'|'rain') */
export function fishFor(ctx) {
  return FISH.filter(f => f.spots.includes(ctx.spot) && ok(f.season, ctx.season) && ok(f.time, ctx.period) && (f.weather === 'any' || f.weather === ctx.weather))
}
/** weighted pick + a size in cm (rnd: () => 0..1). Rain lifts the rain-only fish a little. Returns null if nothing bites. */
export function rollFish(ctx, rnd = Math.random) {
  const list = fishFor(ctx); if (!list.length) return null
  const w = list.map(f => RARITY[f.rarity] * (f.weather === 'rain' ? 1.5 : 1)), tot = w.reduce((a, b) => a + b, 0)
  let r = rnd() * tot, k = 0; while (k < list.length - 1 && (r -= w[k]) > 0) k++
  const f = list[k], t = rnd(), size = Math.round(f.size[0] + (f.size[1] - f.size[0]) * (1 - Math.sqrt(1 - t)) * 10) / 10 // big ones rarer
  return { fishId: f.id, size }
}
export const weatherKind = (w) => w === 'drizzle' || w === 'rain' ? 'rain' : 'clear'
