// Stage C journal + ruins museum (pure; unit-tested). State: G.s.journal { forage, relics }, G.s.museum { donated },
// species log G.s.fish (fish.js). Professor Hoshino = profiles key 'scholar'.
import { FISH_IDS, RARE_ITEMS } from './fish.js'
export const RELICS = ['shard', 'coin', 'crystal', 'relic_tile', 'relic_bell', 'relic_lens', 'relic_mask', 'relic_bowl']
export const NEW_RELICS = RELICS.slice(3)
export const FORAGE = { spring: ['sakura', 'bamboo_shoot'], summer: ['cicada_shell', 'sunflower'], autumn: ['maple_leaf', 'chestnut', 'persimmon'], winter: ['yuzu', 'snowdrop'] }
export const FORAGE_IDS = Object.values(FORAGE).flat()
export const DONATABLE = [...RELICS, ...RARE_ITEMS]
export const HOSHINO = 'scholar'
export const freshJournal = () => ({ forage: {}, relics: {} })
// note a pickup in the journal (relics / seasonal forage). -> true if first time
export function note(j, itemId, day, n = 1) {
  const tab = RELICS.includes(itemId) ? j.relics : FORAGE_IDS.includes(itemId) ? j.forage : null; if (!tab) return false
  const e = tab[itemId]; if (!e) { tab[itemId] = { count: n, firstDay: day }; return true }
  e.count += n; return false
}
export const canDonate = (museum, itemId, inv) => DONATABLE.includes(itemId) && museum.donated[itemId] === undefined && (inv[itemId] || 0) > 0
// moves one item from inv into the museum. -> true if donated
export function donate(museum, itemId, inv, day) {
  if (!canDonate(museum, itemId, inv)) return false
  inv[itemId] -= 1; if (!inv[itemId]) delete inv[itemId]; museum.donated[itemId] = day; return true
}
// journal entries for Studio's <Journal tab entries />. Entry { id, kind, seen, count, best?, firstDay?, donated }
export function entries(tab, s) {
  const don = (id) => s.museum.donated[id] !== undefined
  if (tab === 'fish') return FISH_IDS.map(id => { const e = s.fish[id]; return { id, kind: 'fish', seen: !!e, count: e ? e.count : 0, best: e ? e.best : undefined, firstDay: e ? e.firstDay : undefined, donated: don(id) } })
  if (tab === 'relics') return RELICS.map(id => { const e = s.journal.relics[id]; return { id, kind: 'relic', seen: !!e || !!s.seen[id], count: e ? e.count : 0, firstDay: e ? e.firstDay : undefined, donated: don(id) } })
  if (tab === 'forage') return FORAGE_IDS.map(id => { const e = s.journal.forage[id]; return { id, kind: 'forage', seen: !!e, count: e ? e.count : 0, firstDay: e ? e.firstDay : undefined, donated: false } })
  return []
}
export const progress = (s) => ({ fish: FISH_IDS.filter(id => s.fish[id]).length, fishOf: FISH_IDS.length, donated: Object.keys(s.museum.donated).length, donatedOf: DONATABLE.length })
// ruins dig spots: DIG_SPOTS per day; each yields a seeded find (mostly shards/coins, sometimes a new relic)
export const DIG_SPOTS = 5
const hash = (n) => { let h = (n | 0) * 2654435761; h = (h ^ (h >>> 15)) * 2246822519; return ((h ^ (h >>> 13)) >>> 0) / 4294967296 }
export function digFind(day, spot) {
  const r = hash(day * 31 + spot * 7 + 1)
  if (r < 0.18) return NEW_RELICS[Math.floor(hash(day * 5 + spot) * NEW_RELICS.length)]
  if (r < 0.5) return 'shard'; if (r < 0.62) return 'crystal'; return r < 0.85 ? 'coin' : 'clay'
}
export const canDig = (dig, spot, day) => dig.taken[spot] === undefined || dig.taken[spot] < day
export function dig(d, spot, day) { if (!canDig(d, spot, day)) return null; d.taken[spot] = day; return digFind(day, spot) }
