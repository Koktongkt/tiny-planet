// Items, recipes and where things grow. Pure data (no three.js) so the UI can use it too.
export const ITEMS = {
  wood: { name: 'Wood', cat: 'forest', desc: 'Fallen branches from the forest floor.' },
  pinecone: { name: 'Pinecone', cat: 'forest', desc: 'Smells of resin and rain.' },
  mushroom: { name: 'Mushroom', cat: 'forest', desc: 'A plump red-capped mushroom.' },
  acorn: { name: 'Acorn', cat: 'forest', desc: 'A tiny hat on a tiny nut.' },
  moss: { name: 'Moss', cat: 'forest', desc: 'Soft and springy, from shady stones.' },
  flower: { name: 'Wildflower', cat: 'meadow', desc: 'A sprig of meadow flowers.' },
  herbs: { name: 'Herbs', cat: 'meadow', desc: 'Fragrant leaves for tea.' },
  berries: { name: 'Berries', cat: 'meadow', desc: 'Sweet and a little sour.' },
  fluff: { name: 'Dandelion Fluff', cat: 'meadow', desc: 'Make a wish, then keep it.' },
  wool: { name: 'Wool', cat: 'meadow', desc: 'Freshly shorn, still warm.' },
  fish: { name: 'Fish', cat: 'water', desc: 'A silvery lake fish.' },
  shell: { name: 'Shell', cat: 'water', desc: 'Swirled like a tiny trumpet.' },
  reed: { name: 'Reed', cat: 'water', desc: 'Long, bendy and strong.' },
  clay: { name: 'Clay', cat: 'water', desc: 'Cool grey clay from the shore.' },
  driftwood: { name: 'Driftwood', cat: 'water', desc: 'Smoothed silver by the sea.' },
  rice: { name: 'Rice', cat: 'terraces', desc: 'A bundle of golden rice.' },
  bamboo: { name: 'Bamboo', cat: 'terraces', desc: 'Hollow, light and green.' },
  tea: { name: 'Tea Leaves', cat: 'terraces', desc: 'Young leaves from the tea bushes.' },
  stone: { name: 'Stone', cat: 'cliff', desc: 'A good flat stone.' },
  crystal: { name: 'Crystal', cat: 'cliff', desc: 'It hums faintly near the waterfall.' },
  water: { name: 'Spring Water', cat: 'cliff', desc: 'Clear and cold, from the falls.' },
  coin: { name: 'Old Coin', cat: 'ruins', desc: 'Worn smooth. Who dropped it?' },
  glowmoss: { name: 'Glowing Moss', cat: 'ruins', desc: 'Only glows after dark.' },
  shard: { name: 'Pottery Shard', cat: 'ruins', desc: 'A piece of a painted bowl.' },
  firefly: { name: 'Firefly', cat: 'night', desc: 'A little light in a jar.' },
  rod: { name: 'Fishing Rod', cat: 'tool', desc: 'Lets you fish at the lake and harbour.' },
  can: { name: 'Watering Can', cat: 'tool', desc: 'Carries spring water.' },
  lantern: { name: 'Lantern', cat: 'tool', desc: 'Lights your way and reveals glowing moss.' },
  onigiri: { name: 'Onigiri', cat: 'food', desc: 'Rice ball with grilled fish.' },
  soup: { name: 'Mushroom Soup', cat: 'food', desc: 'Warm and earthy.' },
  jam: { name: 'Berry Jam', cat: 'food', desc: 'A jar of summer.' },
  teacup: { name: 'Herbal Tea', cat: 'food', desc: 'Steaming and calm.' },
  grilledfish: { name: 'Grilled Fish', cat: 'food', desc: 'Salted and crisp, straight off her stove.' },
  wreath: { name: 'Flower Wreath', cat: 'decor', desc: 'Hang it by your door.' },
  mosslamp: { name: 'Moss Lamp', cat: 'decor', desc: 'A soft green glow.' },
  basket: { name: 'Woven Basket', cat: 'decor', desc: 'For things worth keeping.' },
  chime: { name: 'Shell Wind Chime', cat: 'decor', desc: 'Sings when the wind passes.' },
  bridgekit: { name: 'Rope Bridge', cat: 'unlock', desc: 'Opens a path up the cliff.' },
  skyseed: { name: 'Sky Seed', cat: 'treasure', desc: 'Found at the cliff-top picnic spot.' },
}
export const TOOLS = ['rod', 'can', 'lantern']
// any: [ids] means any combination of those items counts toward n
export const RECIPES = [
  { id: 'rod', cat: 'Tools', makes: 'rod', needs: [['wood', 2], ['reed', 3]] },
  { id: 'can', cat: 'Tools', makes: 'can', needs: [['clay', 3]] },
  { id: 'lantern', cat: 'Tools', makes: 'lantern', needs: [['bamboo', 2], ['firefly', 3]] },
  { id: 'onigiri', cat: 'Food', makes: 'onigiri', needs: [['rice', 2], ['fish', 1]] },
  { id: 'soup', cat: 'Food', makes: 'soup', needs: [['mushroom', 3], ['water', 1]] },
  { id: 'jam', cat: 'Food', makes: 'jam', needs: [['berries', 4]] },
  { id: 'grilledfish', cat: 'Food', makes: 'grilledfish', needs: [['fish', 1]], at: 'stove' }, // round7: cooked at home
  { id: 'teacup', cat: 'Food', makes: 'teacup', needs: [[{ any: ['herbs', 'tea'] }, 2], ['water', 1]] },
  { id: 'wreath', cat: 'Decor', makes: 'wreath', needs: [['flower', 5], ['reed', 1]] },
  { id: 'mosslamp', cat: 'Decor', makes: 'mosslamp', needs: [['moss', 2], ['glowmoss', 2], ['clay', 1]] },
  { id: 'basket', cat: 'Decor', makes: 'basket', needs: [['reed', 4], ['bamboo', 2]] },
  { id: 'chime', cat: 'Decor', makes: 'chime', needs: [['shell', 4], ['driftwood', 1], ['reed', 1]] },
  { id: 'bridge', cat: 'Unlock', makes: 'bridgekit', needs: [['wood', 6], ['reed', 6], ['stone', 4]] },
]
export const DECOR = ['wreath', 'mosslamp', 'basket', 'chime']
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
// Stage B display names for the proposed ids (art-b-ui). Codor owns the ids, categories and recipe data: merge these
// into ITEMS when the ids are final. Kept separate so the "things discovered" total and ?give=all don't change yet.
export const ITEM_LABELS = {
  skyseed: { name: 'Sky Seed', desc: 'Plant it and see what the sky sends back.' },
  skyberry: { name: 'Skyberry', desc: 'Tastes a little like a cloud.' },
  turnip: { name: 'Turnip', desc: 'Round, white and proudly purple on top.' },
  carrot: { name: 'Carrot', desc: 'Pulled with a satisfying pop.' },
  herb: { name: 'Garden Herb', desc: 'A sprig of basil from your own patch.' },
  wateringcan: { name: 'Watering Can', desc: 'For thirsty seedlings.' },
  seedpack: { name: 'Seed Packet', desc: 'Something will sprout from these.' },
  acorn_cookie: { name: 'Acorn Cookie', desc: 'Nutty, crumbly and still warm.' },
  pine_tea: { name: 'Pine Needle Tea', desc: 'Smells like the forest after rain.' },
  fluff_pillow: { name: 'Fluff Pillow', desc: 'Stuffed with a hundred wishes.' },
  wool_scarf: { name: 'Wool Scarf', desc: 'Striped, soft and a little long.' },
  crystal_lamp: { name: 'Crystal Lamp', desc: 'Hums with a gentle lilac light.' },
  shard_charm: { name: 'Shard Charm', desc: 'An old blue line, worn on a cord.' },
  herb_soup: { name: 'Herb Soup', desc: 'Green, bright and good for you.' },
  berry_jam: { name: 'Berry Jam', desc: 'Sealed under a gingham cap.' },
}
export const itemName = (id) => (ITEMS[id] && ITEMS[id].name) || (ITEM_LABELS[id] && ITEM_LABELS[id].name) || id
