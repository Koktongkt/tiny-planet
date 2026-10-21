// Stage C item ids (contract v1) — lazy file, like itemsB.js. Codor owns the ids + categories; the names and blurbs are
// PROVISIONAL placeholders until Studio's text lands (Studio owns FISH_LABELS / ITEM_LABELS_C wording).
import { ITEMS } from './items.js'
export const FISH_LABELS = {
  minnow: { name: 'Minnow', desc: 'Tiny, quick and everywhere.' }, crucian: { name: 'Crucian Carp', desc: 'A round, golden lake carp.' },
  catfish: { name: 'Catfish', desc: 'Whiskers first, out of the evening mud.' }, koi: { name: 'Koi', desc: 'Orange and white, like a lantern underwater.' },
  lake_lord: { name: 'Lake Lord', desc: 'An old giant that only rises on rainy nights.' }, ayu: { name: 'Ayu', desc: 'The sweetfish of clear summer rivers.' },
  char: { name: 'White-spotted Char', desc: 'Cold-water speckles.' }, loach: { name: 'Loach', desc: 'A wriggly bottom-dweller.' },
  mackerel: { name: 'Mackerel', desc: 'Blue-striped and lively.' }, flounder: { name: 'Flounder', desc: 'Both eyes on one side, unbothered.' },
  sea_bream: { name: 'Sea Bream', desc: 'Pink, lucky and much admired.' }, pufferfish: { name: 'Pufferfish', desc: 'Puffs up when surprised. Look, don\'t eat.' },
}
export const ITEM_LABELS_C = {
  sakura: { name: 'Sakura Petals', desc: 'A handful of spring.' }, bamboo_shoot: { name: 'Bamboo Shoot', desc: 'Dug before it grows too tall.' },
  cicada_shell: { name: 'Cicada Shell', desc: 'An empty summer coat.' }, sunflower: { name: 'Sunflower', desc: 'Always looking at the sun.' },
  maple_leaf: { name: 'Maple Leaf', desc: 'Red as a tiny hand.' }, chestnut: { name: 'Chestnut', desc: 'Prickly outside, sweet inside.' },
  persimmon: { name: 'Persimmon', desc: 'Orange and soft, best after frost.' }, yuzu: { name: 'Yuzu', desc: 'A bumpy winter citrus.' },
  snowdrop: { name: 'Snowdrop', desc: 'The first flower through the snow.' },
  relic_tile: { name: 'Glazed Tile', desc: 'Painted with a wave pattern.' }, relic_bell: { name: 'Little Bronze Bell', desc: 'Still rings, faintly.' },
  relic_lens: { name: 'Old Lens', desc: 'Someone here once watched the stars.' }, relic_mask: { name: 'Festival Mask', desc: 'A smiling fox, cracked at the ear.' },
  relic_bowl: { name: 'Tea Bowl', desc: 'Lopsided and lovely.' },
}
const CAT = { koi: 'water', lake_lord: 'water', pufferfish: 'water', bamboo_shoot: 'forest', chestnut: 'forest', persimmon: 'meadow', yuzu: 'meadow', sakura: 'meadow', cicada_shell: 'forest', sunflower: 'meadow', maple_leaf: 'forest', snowdrop: 'meadow' }
for (const id of ['koi', 'lake_lord', 'pufferfish']) ITEMS[id] = { ...ITEMS[id], ...FISH_LABELS[id], cat: 'water' }
for (const [id, l] of Object.entries(ITEM_LABELS_C)) ITEMS[id] = { ...ITEMS[id], ...l, cat: CAT[id] || 'treasure' }
export const fishName = (id) => (FISH_LABELS[id] && FISH_LABELS[id].name) || id
