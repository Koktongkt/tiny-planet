// Stage B item ids (contract v2) — lazy file. Studio's display names (ITEM_LABELS, art-b-ui) + Codor's categories.
// Importing this merges them into ITEMS (game/items.js), so everything that reads ITEMS[id] knows the new ids once a game
// chunk has loaded. Kept out of the startup chunk on purpose.
import { ITEMS } from './items.js'
export const ITEM_LABELS = {
  skyseed: { name: 'Sky Seed', desc: 'Plant it and see what the sky sends back.' },
  skyberry: { name: 'Skyberry', desc: 'Tastes a little like a cloud.' },
  turnip: { name: 'Turnip', desc: 'Round, white and proudly purple on top.' },
  carrot: { name: 'Carrot', desc: 'Pulled with a satisfying pop.' },
  seedpack: { name: 'Seed Packet', desc: 'Something will sprout from these.' },
  acorn_cookie: { name: 'Acorn Cookie', desc: 'Nutty, crumbly and still warm.' },
  pine_tea: { name: 'Pine Needle Tea', desc: 'Smells like the forest after rain.' },
  fluff_pillow: { name: 'Fluff Pillow', desc: 'Stuffed with a hundred wishes.' },
  wool_scarf: { name: 'Wool Scarf', desc: 'Striped, soft and a little long.' },
  crystal_lamp: { name: 'Crystal Lamp', desc: 'Hums with a gentle lilac light.' },
  shard_charm: { name: 'Shard Charm', desc: 'An old blue line, worn on a cord.' },
}
export const itemName = (id) => (ITEMS[id] && ITEMS[id].name) || (ITEM_LABELS[id] && ITEM_LABELS[id].name) || id
const CAT = { skyseed: 'treasure', skyberry: 'food', turnip: 'garden', carrot: 'garden', seedpack: 'garden', acorn_cookie: 'food', pine_tea: 'food', fluff_pillow: 'keepsake', wool_scarf: 'keepsake', crystal_lamp: 'keepsake', shard_charm: 'keepsake' }
for (const [id, l] of Object.entries(ITEM_LABELS)) ITEMS[id] = { ...ITEMS[id], ...l, cat: CAT[id] || (ITEMS[id] && ITEMS[id].cat) || 'garden' }
