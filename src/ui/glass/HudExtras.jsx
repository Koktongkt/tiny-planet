// Glass HUD extras (desktop): the quest tracker under the identity bar and the hotbar along the bottom.
// Phones keep Grandma's note in the Menu and the bag on the corner button, so these stay desktop-only for now.
import React from 'react'
import { G, emit, toast } from '../../game/store.js'
import { ITEMS } from '../../game/craft.js'
import { TOOLS, DECOR } from '../../game/items.js'
import { Icon } from '../../game/icons.jsx'
import { startPlace } from '../../game/World.jsx'
import { STEPS } from '../../systems/tutorial.js'
import { PROFILES } from '../../talk/profiles.js'
import { questFor } from './quest.js'
import { GL } from './glyphs.js'

const Svg = ({ html, className = '' }) => <span className={'g-svg ' + className} aria-hidden="true" dangerouslySetInnerHTML={{ __html: html }} />
const itemName = (id) => (ITEMS[id] || ITEMS[id.replace(/_perfect$/, '')] || { name: id }).name + (id.endsWith('_perfect') ? ' ✦' : '')
const npcName = (id) => PROFILES[id]?.name || id

export function QuestTracker() {
  const q = questFor(G.s, { steps: STEPS, itemName, npcName })
  if (!q) return null
  return <div className="g-quest" role="status" aria-label={'Quest: ' + q.title}>
    <h4><Svg className="g-scroll" html={GL.scroll} />{q.title}{q.progress && <em>{q.progress}</em>}</h4>
    <ul>{q.lines.map((l, i) => <li key={i} className={l.state}><span>{l.text}</span>{l.count && <em>{l.count}</em>}</li>)}</ul>
  </div>
}

// ---------- hotbar ----------
export const HOT_N = 8
const TOOL_TIP = { rod: 'Rod ready: press E at the water to fish.', can: 'Watering can ready: press E by a planted bed.', lantern: 'Lantern: it lights your way after dark.' }
/** what sits in the hotbar: the tools first (greyed until made), then food to eat, then decor to place */
export function hotSlots() {
  const inv = G.s.inv
  const tools = TOOLS.map(id => ({ id, kind: 'tool', off: !G.s.tools[id] }))
  const quick = Object.keys(inv).filter(k => inv[k] > 0 && (ITEMS[k] || ITEMS[k.replace(/_perfect$/, '')]))
    .filter(k => ITEMS[k.replace(/_perfect$/, '')]?.cat === 'food' || DECOR.includes(k))
    .map(id => ({ id, kind: DECOR.includes(id) ? 'decor' : 'food', n: inv[id] }))
  return tools.concat(quick)
}
/** use hotbar slot i (0-based, on the current page); returns true when something happened */
export function fireHot(i, sbm, page = G.ui.hotPage || 0) {
  const all = hotSlots(), s = all[page * HOT_N + i]; if (!s) return false
  G.ui.hot = s.id; emit()
  const nm = itemName(s.id)
  if (s.kind === 'tool') toast(s.off ? `${nm}: not made yet. Its recipe is in the Recipe Book (C).` : TOOL_TIP[s.id] || nm, s.id)
  else if (s.kind === 'decor') startPlace(s.id)
  else if (sbm.m && sbm.m.buffFor(s.id)) sbm.m.eatFood(s.id)
  else toast(`Not hungry for ${nm} right now.`, s.id.replace(/_perfect$/, ''))
  return true
}
export function Hotbar({ sbm }) {
  const all = hotSlots(), pages = Math.max(1, Math.ceil(all.length / HOT_N)), p = Math.min(G.ui.hotPage || 0, pages - 1)
  const setPage = (n) => { G.ui.hotPage = n; emit() }
  const slots = all.slice(p * HOT_N, p * HOT_N + HOT_N)
  const sel = G.ui.hot && slots.some(s => s.id === G.ui.hot) ? G.ui.hot : null
  return <div className="g-hotbar" role="toolbar" aria-label="Hotbar">
    <button className="g-chev" disabled={pages < 2} onClick={() => setPage((p + pages - 1) % pages)} aria-label="Previous hotbar page"><Svg html={GL.chevL} /></button>
    {Array.from({ length: HOT_N }, (_, i) => { const s = slots[i]
      if (!s) return <div key={'e' + i} className="g-slot empty"><span className="g-num">{i + 1}</span></div>
      const base = s.id.replace(/_perfect$/, '')
      return <button key={s.id} className={'g-slot' + (s.id === sel ? ' sel' : '') + (s.off ? ' off' : '')} onClick={() => fireHot(i, sbm, p)} title={`${itemName(s.id)} (${i + 1})`} aria-label={`${itemName(s.id)}, key ${i + 1}`}>
        <Icon id={base} size={54} wash={false} dim={s.off} />{s.n != null && <span className="g-ct">{s.n}</span>}{s.id.endsWith('_perfect') && <i className="g-star">✦</i>}<span className="g-num">{i + 1}</span></button> })}
    <button className="g-chev" disabled={pages < 2} onClick={() => setPage((p + 1) % pages)} aria-label="Next hotbar page"><Svg html={GL.chevR} /></button>
  </div>
}
