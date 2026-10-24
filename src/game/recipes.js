// Recipes + spawn table (lazy: only the game chunks import this). Stage B recipes use the contract v2 item ids.
// any: [ids] means any combination of those items counts toward n
import { RECIPE as BIKE_RECIPE } from '../systems/bike.js'
export const RECIPES = [
  { id: 'rod', cat: 'Tools', makes: 'rod', needs: [['wood', 2], ['reed', 3]] },
  { id: 'can', cat: 'Tools', makes: 'can', needs: [['clay', 3]] },
  { id: 'lantern', cat: 'Tools', makes: 'lantern', needs: [['bamboo', 2], ['firefly', 3]] },
  { id: 'onigiri', cat: 'Food', makes: 'onigiri', needs: [['rice', 2], ['fish', 1]], cook: 'press' },
  { id: 'soup', cat: 'Food', makes: 'soup', needs: [['mushroom', 3], ['water', 1]], cook: 'stir' },
  { id: 'jam', cat: 'Food', makes: 'jam', needs: [['berries', 4]], cook: 'stir' },
  { id: 'grilledfish', cat: 'Food', makes: 'grilledfish', needs: [['fish', 1]], at: 'stove', cook: 'flip' }, // round7: cooked at home
  { id: 'teacup', cat: 'Food', makes: 'teacup', needs: [[{ any: ['herbs', 'tea'] }, 2], ['water', 1]], cook: 'pour' },
  { id: 'wreath', cat: 'Decor', makes: 'wreath', needs: [['flower', 5], ['reed', 1]] },
  { id: 'mosslamp', cat: 'Decor', makes: 'mosslamp', needs: [['moss', 2], ['glowmoss', 2], ['clay', 1]] },
  { id: 'basket', cat: 'Decor', makes: 'basket', needs: [['reed', 4], ['bamboo', 2]] },
  { id: 'chime', cat: 'Decor', makes: 'chime', needs: [['shell', 4], ['driftwood', 1], ['reed', 1]] },
  // Stage B: a recipe for every item that had no use yet (pinecone, acorn, fluff, wool, coin, shard, crystal) + the crops
  { id: 'acorn_cookie', cat: 'Food', makes: 'acorn_cookie', needs: [['acorn', 3], ['rice', 1]], cook: 'press' },
  { id: 'pine_tea', cat: 'Food', makes: 'pine_tea', needs: [['pinecone', 2], ['water', 1]], cook: 'pour' },
  { id: 'jam_sky', cat: 'Food', makes: 'jam', needs: [['skyberry', 2]], cook: 'stir' },
  { id: 'soup_veg', cat: 'Food', makes: 'soup', needs: [['turnip', 1], ['carrot', 1], ['water', 1]], cook: 'stir' },
  { id: 'seedpack', cat: 'Garden', makes: 'seedpack', needs: [['fluff', 2], ['coin', 1]] },
  { id: 'fluff_pillow', cat: 'Keepsakes', makes: 'fluff_pillow', needs: [['fluff', 4], ['wool', 1]] },
  { id: 'wool_scarf', cat: 'Keepsakes', makes: 'wool_scarf', needs: [['wool', 3]] },
  { id: 'crystal_lamp', cat: 'Keepsakes', makes: 'crystal_lamp', needs: [['crystal', 2], ['clay', 1]] },
  { id: 'shard_charm', cat: 'Keepsakes', makes: 'shard_charm', needs: [['shard', 2], ['reed', 1]] },
  { id: 'bridge', cat: 'Unlock', makes: 'bridgekit', needs: [['wood', 6], ['reed', 6], ['stone', 4]] },
  // Stage E: one bicycle. Coin is not an alternate — `any` cannot say "2 coins or 1 shard".
  BIKE_RECIPE,
]
// spawn table: zone -> [item, count, placement] ; placement keys are interpreted in World.jsx
export const SPAWNS = [
  ['forest', 'wood', 6], ['forest', 'pinecone', 5], ['forest', 'mushroom', 6], ['forest', 'acorn', 5], ['forest', 'moss', 5],
  ['meadow', 'flower', 7], ['meadow', 'herbs', 5], ['meadow', 'berries', 5], ['meadow', 'fluff', 5],
  ['lake', 'fish', 3, 'water'], ['harbour', 'fish', 3, 'water'], ['harbour', 'shell', 6, 'shore'], ['lake', 'reed', 6, 'shore'], ['harbour', 'reed', 3, 'shore'],
  ['lake', 'clay', 4, 'shore'], ['harbour', 'driftwood', 4, 'shore'],
  ['terraces', 'rice', 6], ['terraces', 'bamboo', 4, 'edge'], ['terraces', 'tea', 4, 'edge'],
  ['cliff', 'stone', 5, 'base'], ['cliff', 'crystal', 3, 'base'], ['cliff', 'water', 1, 'spring'],
  ['ruins', 'coin', 3], ['ruins', 'glowmoss', 4, 'night'], ['ruins', 'shard', 4],
  ['meadow', 'firefly', 5, 'night'], ['village', 'firefly', 4, 'night'], ['lake', 'firefly', 4, 'night'],
]
export const NEEDS_TOOL = { fish: 'rod', water: 'can' }
