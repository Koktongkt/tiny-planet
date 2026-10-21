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
// Seasonal forage + new relics (Codor ids, contract v1). Text: Studio (art-c items 4).
export const FORAGE_RELIC_TEXT = {
  sakura: { name: 'Sakura Petals', desc: 'A handful of blossom the wind let go of. It will not last, which is the point.' },
  bamboo_shoot: { name: 'Bamboo Shoot', desc: 'Dug up just as it peeked out of the soil. Tender, if you are quick.' },
  cicada_shell: { name: 'Cicada Shell', desc: 'Left on a tree trunk by someone who grew up and flew away. Very light. Very brave.' },
  sunflower: { name: 'Sunflower', desc: 'Taller than her, and always looking at the sun. Even on cloudy days it remembers where it is.' },
  maple_leaf: { name: 'Maple Leaf', desc: 'Red as a tiny hand waving goodbye to summer. Pressed in a book, it keeps waving.' },
  chestnut: { name: 'Chestnut', desc: 'Hiding in a prickly burr. Roast it and the whole house smells of autumn.' },
  persimmon: { name: 'Persimmon', desc: 'Glowing orange like a little lantern. Wait until it is soft, or it bites back.' },
  yuzu: { name: 'Yuzu', desc: 'Bumpy, sunny and fragrant. One in the bath on the longest night keeps colds away.' },
  snowdrop: { name: 'Snowdrop', desc: 'The first flower through the snow, head bowed like it is shy about being early.' },
  relic_tile: { name: 'Glazed Tile', desc: 'Painted with a wave pattern.' }, relic_bell: { name: 'Little Bronze Bell', desc: 'Still rings, faintly.' },
  relic_lens: { name: 'Old Lens', desc: 'Someone here once watched the stars.' }, relic_mask: { name: 'Festival Mask', desc: 'A smiling fox, cracked at the ear.' },
  relic_bowl: { name: 'Tea Bowl', desc: 'Lopsided and lovely.' },
}
const CAT_C = { bamboo_shoot: 'forest', chestnut: 'forest', cicada_shell: 'forest', maple_leaf: 'forest', persimmon: 'meadow', yuzu: 'meadow', sakura: 'meadow', sunflower: 'meadow', snowdrop: 'meadow' }
for (const [id, l] of Object.entries(FORAGE_RELIC_TEXT)) ITEMS[id] = { ...ITEMS[id], ...l, cat: CAT_C[id] || 'treasure' }
