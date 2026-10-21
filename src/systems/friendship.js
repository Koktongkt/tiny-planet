// Friendship + gifts (Stage B, contract v2). Pure. Friend: { npcId, hearts 0..5 (float), giftedToday, lastGiftReaction }
// npcId = talk/profiles.js key. Preferences follow each villager's profile (role, favourite thing).
export const MAX_HEARTS = 5
export const GAIN = { love: 1, like: 0.5, neutral: 0.25, dislike: -0.25 }
const ALL_LIKE = ['jam', 'acorn_cookie', 'skyberry', 'teacup', 'flower'] // most people are happy with something sweet or pretty
export const PREFS = {
  fisherman: { love: ['onigiri', 'grilledfish'], like: ['fish', 'driftwood', 'pine_tea'], dislike: ['flower', 'fluff'] },
  fishwife: { love: ['grilledfish', 'fish'], like: ['shell', 'soup'], dislike: ['moss'] },
  'sailor girl': { love: ['shell', 'crystal_lamp'], like: ['chime', 'driftwood'], dislike: ['mushroom'] },
  'dock boy': { love: ['stone', 'acorn_cookie'], like: ['shell', 'coin'], dislike: ['herbs', 'teacup'] },
  farmer: { love: ['rice', 'turnip'], like: ['carrot', 'onigiri'], dislike: ['shard'] },
  'farm wife': { love: ['seedpack', 'flower'], like: ['carrot', 'herbs'], dislike: ['stone'] },
  grandma: { love: ['teacup', 'wool_scarf'], like: ['wool', 'pine_tea'], dislike: ['fish'] },
  grandpa: { love: ['wool_scarf', 'pine_tea'], like: ['teacup', 'wood'], dislike: ['jam'] },
  baker: { love: ['berries', 'acorn_cookie'], like: ['rice', 'jam'], dislike: ['clay'] },
  scholar: { love: ['shard', 'shard_charm'], like: ['coin', 'crystal'], dislike: ['fish'] },
  'miller girl': { love: ['rice', 'fluff_pillow'], like: ['fluff', 'flower'], dislike: ['mushroom'] },
  'big sister': { love: ['acorn', 'acorn_cookie'], like: ['pinecone', 'berries'], dislike: ['clay'] },
  toddler: { love: ['acorn', 'fluff'], like: ['pinecone', 'shell', 'skyberry'], dislike: ['herbs', 'soup'] },
  angler: { love: ['fish', 'reed'], like: ['onigiri', 'pine_tea'], dislike: ['fluff'] },
  mother: { love: ['fluff_pillow', 'soup'], like: ['teacup', 'jam'], dislike: ['stone'] },
  postman: { love: ['coin', 'shard_charm'], like: ['teacup', 'acorn_cookie'], dislike: ['mushroom'] },
  'yukata lady': { love: ['tea', 'flower'], like: ['teacup', 'crystal_lamp'], dislike: ['fish'] },
  cook: { love: ['soup', 'carrot'], like: ['mushroom', 'turnip', 'herbs'], dislike: ['flower'] },
  'tall teen': { love: ['crystal_lamp', 'skyberry'], like: ['crystal', 'firefly'], dislike: ['turnip'] },
  'old lady': { love: ['herbs', 'teacup'], like: ['pine_tea', 'moss'], dislike: ['coin'] },
  'cap boy': { love: ['firefly', 'acorn'], like: ['pinecone', 'stone'], dislike: ['teacup'] },
  'basket girl': { love: ['flower', 'basket'], like: ['wreath', 'berries'], dislike: ['fish'] },
}
// what she gives back the first time you reach these hearts
export const RETURN_GIFTS = { 3: ['seedpack', 2], 5: ['skyseed', 1] }
export const newFriend = (npcId) => ({ npcId, hearts: 0, giftedToday: false, lastGiftReaction: null })
export function reactionTo(npcId, itemId) {
  const p = PREFS[npcId] || {}
  if (p.love && p.love.includes(itemId)) return 'love'
  if (p.dislike && p.dislike.includes(itemId)) return 'dislike'
  if ((p.like && p.like.includes(itemId)) || ALL_LIKE.includes(itemId)) return 'like'
  return 'neutral'
}
export const friendOf = (friends, npcId) => friends.list[npcId] || (friends.list[npcId] = newFriend(npcId))
// -> { kind, gained, returns: [[item, n], ...] } or null (already gifted today)
export function give(friends, npcId, itemId, mul = 1) {
  const f = friendOf(friends, npcId); if (f.giftedToday) return null
  const kind = reactionTo(npcId, itemId), before = f.hearts, g = GAIN[kind] * (GAIN[kind] > 0 ? mul : 1)
  f.hearts = Math.max(0, Math.min(MAX_HEARTS, before + g)); f.giftedToday = true; f.lastGiftReaction = kind
  const returns = []; f.got = f.got || []
  for (const h of Object.keys(RETURN_GIFTS)) if (f.hearts >= +h && !f.got.includes(+h)) { f.got.push(+h); returns.push(RETURN_GIFTS[h]) }
  return { kind, gained: f.hearts - before, returns }
}
export function addHearts(friends, npcId, n) { const f = friendOf(friends, npcId); f.hearts = Math.max(0, Math.min(MAX_HEARTS, f.hearts + n)); return f.hearts }
// a new morning: everyone can receive a gift again
export function resetDay(friends, day) { if (friends.day === day) return false; friends.day = day; for (const k in friends.list) friends.list[k].giftedToday = false; return true }
// extra dialogue unlocked by friendship (Talk appends one of these)
export function heartLine(f, name) {
  const h = Math.floor(f ? f.hearts : 0)
  if (h >= 5) return `You're family here now, you know. The whole village says so.`
  if (h >= 4) return `I saved you the best seat on the bench. Don't tell anyone.`
  if (h >= 3) return `I was hoping you'd stop by today.`
  if (h >= 2) return `It's always nice to see you around, friend.`
  if (h >= 1) return `Oh, it's you again! Hello, hello.`
  return null
}
