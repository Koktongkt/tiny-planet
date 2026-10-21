// Journal copy helpers (art-c item 7). Names/blurbs come from items.js + itemsC.js (FISH_TEXT, FORAGE_RELIC_TEXT).
import { ITEMS } from '../../game/items.js'
import { FISH_TEXT, FORAGE_RELIC_TEXT } from '../../game/itemsC.js'
export const JOURNAL_TABS = [
  { id: 'fish', label: 'Fish', color: '#7fb3c9', blank: 'Nothing in the net yet. The lake is patient.' },
  { id: 'forage', label: 'Forage', color: '#9cc46a', blank: 'Each season leaves something by the path.' },
  { id: 'relics', label: 'Relics', color: '#d9a54a', blank: 'The ruins are keeping their secrets for now.' },
  { id: 'photos', label: 'Photos', color: '#e8907a', blank: 'No photos yet. Press Photo and find a nice view.' },
]
export const entryName = (e) => (e.kind === 'fish' ? FISH_TEXT[e.id]?.name : FORAGE_RELIC_TEXT[e.id]?.name || ITEMS[e.id]?.name) || e.id
export const entryBlurb = (e) => (e.kind === 'fish' ? FISH_TEXT[e.id]?.desc : FORAGE_RELIC_TEXT[e.id]?.desc || ITEMS[e.id]?.desc) || ''
/** small note line under an entry: count, best size, first day; '???' entries say nothing */
export function entryNote(e) {
  if (!e.seen) return e.kind === 'fish' ? 'not caught yet' : 'not found yet'
  return [e.count > 1 ? `×${e.count}` : null, e.best ? `best ${e.best} cm` : null, e.firstDay != null ? `day ${e.firstDay + 1}` : null].filter(Boolean).join(' · ')
}
export const tabCount = (list) => ({ seen: list.filter(e => e.seen).length, of: list.length })
