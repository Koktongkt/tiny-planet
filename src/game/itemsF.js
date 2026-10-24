// Perfect dishes (Stage F). Same food, a separate bag stack, a sparkle in the UI.
// Imported with crafting so the bag knows the names once the game chunk is up. Not in the startup chunk.
import { ITEMS } from './items.js'
import './itemsB.js'
export const COOKED_IDS = ['onigiri', 'soup', 'jam', 'teacup', 'grilledfish', 'acorn_cookie', 'pine_tea']
export const PERFECT_IDS = COOKED_IDS.map(id => id + '_perfect')
for (const id of COOKED_IDS) {
  const b = ITEMS[id]
  if (!b) continue
  ITEMS[id + '_perfect'] = { name: 'Perfect ' + b.name, cat: 'food', desc: b.desc + ' Cooked just right.', perfect: true, base: id }
}
