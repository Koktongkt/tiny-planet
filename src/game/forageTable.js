// Stage C seasonal forage spawns (art-c draft; Codor balances counts). Ids + seasons come from Codor's contract
// (systems/collection.js FORAGE); this adds where/how many for spawning. Pure data. Names / blurbs: game/itemsC.js.
// Same spawn shape as recipes.js SPAWNS: [zone, item, count]. Out-of-season nodes simply don't spawn.
import { FORAGE as BY_SEASON } from '../systems/collection.js'
const WHERE = {
  sakura: { zone: 'village', n: 4 }, bamboo_shoot: { zone: 'terraces', n: 4 },
  cicada_shell: { zone: 'forest', n: 5 }, sunflower: { zone: 'village', n: 4 },
  maple_leaf: { zone: 'forest', n: 5 }, chestnut: { zone: 'forest', n: 5 }, persimmon: { zone: 'village', n: 3 },
  yuzu: { zone: 'terraces', n: 4 }, snowdrop: { zone: 'village', n: 4, rain: 1.3 }, // more after snowfall
}
export const FORAGE = Object.entries(BY_SEASON).flatMap(([season, ids]) => ids.map(id => ({ id, season: [season], ...WHERE[id] })))
export const FORAGE_IDS = FORAGE.map(f => f.id)
export const FORAGE_BY_ID = Object.fromEntries(FORAGE.map(f => [f.id, f]))
/** forage items in season (season = T.season) */
export const forageFor = (season) => FORAGE.filter(f => f.season.includes(season))
/** SPAWNS-shaped rows for this season: [zone, item, count] (count scaled up by the item's `rain` bonus × wet) */
export const forageSpawns = (season, wet = 0) => forageFor(season).map(f => [f.zone, f.id, Math.round(f.n * (1 + ((f.rain || 1) - 1) * wet))])
