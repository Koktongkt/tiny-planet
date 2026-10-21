// Daily errands board (Stage B, contract v2). Pure + deterministic per day, so a reload shows the same notes.
// Errand: { id, npcId, wants: [{itemId, count}], reward: {itemId?, coins?, hearts?}, day, accepted, done }
const POOL = [ // [npcId, wants, reward] — things you can find on the planet; later days add garden crops
  ['baker', [['berries', 4]], { coins: 2, hearts: 0.5 }],
  ['fisherman', [['reed', 3]], { itemId: 'seedpack', hearts: 0.5 }],
  ['grandma', [['wool', 1], ['flower', 2]], { coins: 3, hearts: 0.5 }],
  ['scholar', [['shard', 2]], { coins: 3, hearts: 0.5 }],
  ['toddler', [['acorn', 3]], { itemId: 'seedpack', hearts: 0.5 }],
  ['cook', [['mushroom', 3]], { coins: 2, hearts: 0.5 }],
  ['farm wife', [['flower', 3]], { itemId: 'seedpack', hearts: 0.5 }],
  ['angler', [['clay', 2]], { coins: 2, hearts: 0.5 }],
  ['old lady', [['herbs', 3]], { coins: 2, hearts: 0.5 }],
  ['cap boy', [['pinecone', 3]], { coins: 1, hearts: 0.5 }],
  ['yukata lady', [['tea', 2]], { coins: 3, hearts: 0.5 }],
  ['postman', [['wood', 3]], { coins: 2, hearts: 0.5 }],
]
const LATER = [ // from day 2 on: crops and crafted things
  ['cook', [['turnip', 1], ['carrot', 1]], { coins: 4, hearts: 1 }],
  ['farmer', [['carrot', 2]], { itemId: 'skyseed', hearts: 1 }],
  ['baker', [['skyberry', 2]], { coins: 5, hearts: 1 }],
  ['grandpa', [['pine_tea', 1]], { coins: 3, hearts: 1 }],
]
const hash = (x) => { x = Math.imul(x ^ 0x9e3779b9, 0x85ebca6b); x ^= x >>> 13; x = Math.imul(x, 0xc2b2ae35); return (x ^ (x >>> 16)) >>> 0 }
export function errandsFor(day) {
  const pool = day >= 2 ? POOL.concat(LATER) : POOL, n = day === 0 ? 1 : 2, out = [], used = new Set()
  for (let k = 0, i = 0; out.length < n && k < 20; k++) {
    const pick = pool[hash(day * 31 + k) % pool.length]; if (used.has(pick[0])) continue; used.add(pick[0])
    out.push({ id: `e${day}-${i++}`, npcId: pick[0], wants: pick[1].map(([itemId, count]) => ({ itemId, count })), reward: { ...pick[2] }, day, accepted: false, done: false })
  }
  return out
}
// a new day pins up new notes (yesterday's unfinished ones are taken down)
export function rollDay(errands, day) { if (errands.day === day) return false; errands.day = day; errands.list = errandsFor(day); return true }
export function accept(errands, id) { const e = errands.list.find(x => x.id === id); if (!e || e.accepted || e.done) return false; e.accepted = true; return true }
export const canDeliver = (e, inv) => !!e && e.accepted && !e.done && e.wants.every(w => (inv[w.itemId] || 0) >= w.count)
// takes the items from inv (mutates) and returns the reward, or null
export function deliver(errands, id, inv) {
  const e = errands.list.find(x => x.id === id); if (!canDeliver(e, inv)) return null
  for (const w of e.wants) { inv[w.itemId] -= w.count; if (!inv[w.itemId]) delete inv[w.itemId] }
  e.done = true; return e.reward
}
