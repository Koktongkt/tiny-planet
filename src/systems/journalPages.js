// Journal pages (pure; unit-tested): plain rows for each bookmark of the journal book, built from the save.
// No DOM and no store: names and recipe checks come in through T = { itemName, npcName, known, owned, haveFor }.
import { STEPS } from './tutorial.js'
import { metOf } from './friendship.js'
import { RECIPES } from '../game/recipes.js'
import { FISH, FISH_BY_ID } from '../game/fishTable.js'
import { RELICS, FORAGE, FORAGE_IDS, DONATABLE, entries } from './collection.js'

const D = (day) => 'Day ' + (day + 1)
const plain = (id) => (id.endsWith('_perfect') ? id.slice(0, -8) : id)
const itemLabel = (id, T) => (id.endsWith('_perfect') ? 'Perfect ' + T.itemName(plain(id)) : T.itemName(id))

// ---------- Quests ----------
// Notes still on the board are never listed one by one: one 'board' row sends her there. Only accepted ones get a page.
export function quests(s, T) {
  const rows = [], done = (s.tutorial && s.tutorial.done) || {}, n = STEPS.filter(st => done[st.id]).length
  if (n < STEPS.length) rows.push({ id: 'tutorial', kind: 'tutorial', title: 'Settle In', desc: `${T.npcName('grandma')}'s first-day list · ${n}/${STEPS.length}`, state: 'active', group: 'Today',
    lines: STEPS.map(st => ({ text: st.text, ok: !!done[st.id] })) })
  const list = (s.errands && s.errands.list) || [], inv = s.inv || {}
  for (const e of list.filter(x => x.accepted && !x.done)) {
    if (e.mention) { rows.push({ id: e.id, kind: 'notice', npcId: e.npcId, title: `A note from ${T.npcName(e.npcId)}`, desc: e.mention, mention: e.mention, state: 'active', group: 'Today' }); continue }
    const lines = e.wants.map(w => { const have = Math.min(inv[w.itemId] || 0, w.count)
      return { text: `Bring ${w.count > 1 ? w.count + ' × ' : ''}${itemLabel(w.itemId, T)}`, have, need: w.count, ok: have >= w.count, itemId: plain(w.itemId) } })
    lines.push({ text: `Take it to ${T.npcName(e.npcId)}`, ok: false })
    rows.push({ id: e.id, kind: 'errand', npcId: e.npcId, title: `A favour for ${T.npcName(e.npcId)}`, desc: e.wants.map(w => `${w.count} × ${itemLabel(w.itemId, T)}`).join(', '),
      state: 'active', group: 'Today', lines, reward: e.reward, day: e.day })
  }
  const waiting = list.filter(x => !x.accepted && !x.done && x.wants && x.wants.length).length
  if (waiting) rows.push({ id: 'board', kind: 'board', title: 'New notes on the board', desc: `${waiting} request${waiting > 1 ? 's' : ''} pinned up in the village`, state: 'avail', group: 'Today' })
  for (const [i, e] of ((s.errands && s.errands.log) || []).entries())
    rows.push({ id: 'log' + i, kind: 'log', npcId: e.npcId, title: `A favour for ${T.npcName(e.npcId)}`, desc: `Done on ${D(e.day)}`, state: 'done', group: 'Finished',
      lines: e.wants.map(w => ({ text: `Bring ${w.count > 1 ? w.count + ' × ' : ''}${itemLabel(w.itemId, T)}`, have: w.count, need: w.count, ok: true, itemId: plain(w.itemId) })), reward: e.reward, day: e.day })
  return rows
}
export const newDots = (s) => ({ quests: ((s.errands && s.errands.list) || []).some(x => !x.accepted && !x.done && x.wants && x.wants.length) })

// ---------- People ----------
export function people(s, PROFILES) {
  const list = (s.friends && s.friends.list) || {}
  const rows = Object.entries(PROFILES).map(([id, p]) => { const f = list[id]
    return { id, name: p.name, role: p.role, fav: p.fav, hearts: f ? f.hearts : 0, metDay: metOf(f), giftedToday: !!(f && f.giftedToday), seen: (f && f.seen) || {}, hit: (f && f.hit) || {} } })
  return { met: rows.filter(r => r.metDay != null).length, total: rows.length, rows }
}
export function giftShelves(friend, prefs = {}) {
  const seen = (friend && friend.seen) || {}, out = { love: [], like: [], dislike: [], left: {} }
  for (const [id, kind] of Object.entries(seen)) if (out[kind]) out[kind].push(id)
  for (const k of ['love', 'like', 'dislike']) out.left[k] = Math.max(0, (prefs[k] || []).length - out[k].length)
  return out
}

// ---------- Recipes ----------
export const RECIPE_TABS = { tools: ['Tools', 'Garden', 'Unlock'], food: ['Food'], decor: ['Decor'], keepsakes: ['Keepsakes'] }
export function recipeRows(tab, s, T) {
  const perfect = (s.journal && s.journal.perfect) || {}
  return RECIPES.filter(r => (RECIPE_TABS[tab] || []).includes(r.cat)).map(r => { const known = !!T.known(r), owned = !!T.owned(r)
    return { id: r.id, makes: r.makes, cat: r.cat, at: r.at || (r.cook ? 'stove' : 'bench'), recipe: r, known, owned, ready: known && !owned && T.haveFor(r).every(h => h.ok),
      perfectDay: perfect[r.makes + '_perfect'] ?? null, needs: T.haveFor(r) } })
}

// ---------- Discoveries ----------
export function discoveries(tab, s) {
  const rows = entries(tab, s), ids = rows.map(e => e.id)
  const of = tab === 'forage' ? 0 : ids.filter(id => DONATABLE.includes(id)).length
  return { rows, found: rows.filter(e => e.seen).length, total: rows.length, museum: of ? { donated: ids.filter(id => s.museum.donated[id] !== undefined).length, of } : null }
}
export function fishFacts(id) {
  const f = FISH_BY_ID[id]; if (!f) return null
  return { rarity: f.rarity, where: f.spots, seasons: f.season, times: f.time, weather: f.weather }
}
export const forageSeason = (id) => (Object.entries(FORAGE).find(([, l]) => l.includes(id)) || [null])[0]

// ---------- Memories: Firsts ----------
export function firsts(s, T) {
  const ev = [], add = (day, kind, id, text) => { if (Number.isFinite(day)) ev.push({ day, kind, id, text }) }
  for (const [id, f] of Object.entries((s.friends && s.friends.list) || {})) {
    if (f.metDay != null) add(f.metDay, 'met', id, `Met ${T.npcName(id)}`)
    for (const [h, d] of Object.entries(f.hit || {})) add(d, 'hearts', id, `${T.npcName(id)} reached ${h} hearts`)
  }
  for (const f of FISH) { const e = s.fish && s.fish[f.id]; if (e) add(e.firstDay, 'fish', f.id, `Caught your first ${T.itemName(f.id)}`) }
  for (const id of FORAGE_IDS) { const e = s.journal.forage[id]; if (e) add(e.firstDay, 'forage', id, `Found ${T.itemName(id)}`) }
  for (const id of RELICS) { const e = s.journal.relics[id]; if (e) add(e.firstDay, 'relic', id, `Dug up ${T.itemName(id)}`) }
  for (const [id, d] of Object.entries((s.museum && s.museum.donated) || {})) add(d, 'museum', id, `Gave ${T.itemName(id)} to the museum`)
  for (const [id, d] of Object.entries((s.journal && s.journal.perfect) || {})) add(d, 'perfect', plain(id), `Cooked a perfect ${T.itemName(plain(id))}`)
  for (const e of ((s.errands && s.errands.log) || []).slice().reverse()) add(e.day, 'favour', e.npcId, `Did a favour for ${T.npcName(e.npcId)}`)
  return ev.map((e, i) => [e, i]).sort((a, b) => a[0].day - b[0].day || a[1] - b[1]).map(([e]) => e)
}
