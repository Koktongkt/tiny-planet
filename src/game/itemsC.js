// Stage C names + blurbs (lazy file, like itemsB.js). Importing merges the rare fish items into ITEMS; FISH_TEXT covers
// all 12 species for the journal / catch card (only RARE_FISH_ITEMS are inventory items; others stay generic 'fish').
import { ITEMS } from './items.js'
import { RARE_FISH_ITEMS } from './fishTable.js'
export const FISH_TEXT = {
  minnow: { name: 'Silver Minnow', desc: 'Small enough to hide in a raindrop. Quick enough to try.' },
  crucian: { name: 'Crucian Carp', desc: 'A round, bronze lake-dweller who has never once been in a hurry.' },
  koi: { name: 'Koi', desc: 'Painted in red and white by someone patient. Brings luck to whoever lets it go… or keeps it.' },
  catfish: { name: 'Whiskered Catfish', desc: 'Comes up when the rain taps on the lake, to see who is knocking.' },
  lake_lord: { name: 'Lord of the Lake', desc: 'Old as the mill stones, with moss on his fins. They say he only rises for rainy autumn nights.' },
  ayu: { name: 'Sweetfish', desc: 'Smells faintly of watermelon, the old anglers swear. The river\'s summer guest.' },
  char: { name: 'Mountain Char', desc: 'Freckled with little moons. Likes cold water and early mornings.' },
  loach: { name: 'Pond Loach', desc: 'A wriggly little forecaster. When the loaches dance, rain is on the way.' },
  mackerel: { name: 'Mackerel', desc: 'Striped like the waves it came from. Oharu has opinions about how to grill it.' },
  sea_bream: { name: 'Red Sea Bream', desc: 'Rosy and proud, the fish of celebrations. Every festival wants one.' },
  flounder: { name: 'Flounder', desc: 'Lies flat on the sea floor with both eyes on the sky, daydreaming.' },
  pufferfish: { name: 'Pufferfish', desc: 'Puffs up when surprised, which is often. Best admired, not eaten.' },
}
export const ITEM_LABELS_C = Object.fromEntries(RARE_FISH_ITEMS.map(id => [id, FISH_TEXT[id]]))
export const fishName = (id) => (FISH_TEXT[id] && FISH_TEXT[id].name) || id
export const RARITY_LABEL = { common: 'Common', uncommon: 'Uncommon', rare: 'Rare', legend: 'Legendary' }
for (const [id, l] of Object.entries(ITEM_LABELS_C)) ITEMS[id] = { ...ITEMS[id], ...l, cat: 'water' }
