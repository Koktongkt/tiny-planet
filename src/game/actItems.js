// What kind of gesture she uses to gather each item (her action poses live in src/art/chibi/acts.js).
// Shared by the game (how long the pickup takes) and her pose chunk (how it looks). Unknown items use 'pluck'.
export const ITEM_GESTURE = {
  flower: 'sniff', herbs: 'sniff',
  moss: 'pluck', glowmoss: 'pluck', mushroom: 'pluck', acorn: 'pluck', pinecone: 'pluck', coin: 'pluck', skyseed: 'pluck',
  berries: 'bush', tea: 'bush', rice: 'bush',
  reed: 'pull', bamboo: 'pull',
  wood: 'heavy', driftwood: 'heavy', stone: 'heavy',
  shell: 'scoop', clay: 'scoop',
  crystal: 'chip', shard: 'chip',
  firefly: 'catch', fluff: 'catch',
  wool: 'wool',
}
// seconds she is busy (movement locked); the item still lands in the bag at ~1 s
export const GESTURE_DUR = { pluck: 0.95, sniff: 1.3, bush: 1.0, pull: 1.15, heavy: 1.3, scoop: 1.15, chip: 1.3, catch: 1.2, wool: 1.15 }
export const gestureOf = (item) => ITEM_GESTURE[item] || 'pluck'
