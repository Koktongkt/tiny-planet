// The Bag as an adventurer's satchel: painted leather art (src/assets/ui/bag-frame*.webp, made from the reference in
// ui-mocks/a/ref2 by its build.sh) with a live layer on top. Everything is laid out in the art's own 1672x941 pixel
// space and the whole satchel is scaled to fit the screen. The painted title, close button and "Reset save" carry
// invisible buttons; tabs, tiles, the detail card and the discoveries counter are live.
import React, { useEffect, useState } from 'react'
import { G, setPanel } from '../../game/store.js'
import { ITEMS } from '../../game/craft.js'
import { TOOLS, DECOR } from '../../game/items.js'
import { Icon } from '../../game/icons.jsx'
import { startPlace } from '../../game/World.jsx'
import { TALK } from '../../talk/state.js'
import frame1x from '../../assets/ui/bag-frame.webp'
import frame2x from '../../assets/ui/bag-frame@2x.webp'
import { openRecipes } from '../journal/book/openRecipes.js'
import { recipeTabFor } from '../../systems/journalPages.js'
import './bag.css'

const W = 1672, H = 941, MIN_SCALE = 0.5
const fitScale = () => Math.min((innerWidth - 16) / W, (innerHeight - 16) / H)
/** true while the satchel is big enough to read; below that (portrait phones) the plain list Bag is used */
export function useSatchelFits() {
  const [ok, setOk] = useState(() => fitScale() >= MIN_SCALE)
  useEffect(() => { const f = () => setOk(fitScale() >= MIN_SCALE); addEventListener('resize', f); return () => removeEventListener('resize', f) }, [])
  return ok
}

const I = {
  sprout: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21v-9" /><path d="M12 12c0-4-3-6-7-6 0 4 3 6 7 6z" /><path d="M12 10c0-3 2.5-5 6-5 0 3-2.5 5-6 5z" /></svg>,
  tools: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20l9-9" /><path d="M13 11l2-2 1 1 3-3-2-2-3 3 1 1" /><path d="M20 20l-8-8" /><path d="M5 4c-1 2 0 4 2 4l1 1 2-2-1-1c0-2-2-3-4-2z" /></svg>,
  bowl: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12h18c0 4.5-3.5 7.5-9 7.5S3 16.5 3 12z" /><path d="M9 9c-1-1.5 1-2.5 0-4M13 9c-1-1.5 1-2.5 0-4" /></svg>,
  chair: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 11V6a5 3 0 0 1 10 0v5" /><path d="M5 11h14v3H5z" /><path d="M6 14v6M18 14v6" /></svg>,
  hammer: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 6l4 4" /><path d="M11 9l3-3 2-1 3 3-1 2-3 3z" /><path d="M12.5 10.5L4 19l1.5 1.5 8.5-8.5" /></svg>,
  gift: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3.5" y="8" width="17" height="4" rx="1" /><path d="M5 12v8h14v-8M12 8v12" /><path d="M12 8C10 4 6.5 5 8 7.5c.6 1 4 .5 4 .5zM12 8c2-4 5.5-3 4-.5-.6 1-4 .5-4 .5z" /></svg>,
  pin: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21s-6-6.2-6-11a6 6 0 0 1 12 0c0 4.8-6 11-6 11z" /><circle cx="12" cy="10" r="2.2" /></svg>,
  rays: <svg viewBox="0 0 40 40"><path d="M30 6l-4 9M16 10l5 7M6 22l10 1" stroke="#f2b640" strokeWidth="3.4" strokeLinecap="round" /></svg>,
}
// item buckets: one place decides where an item lives, shared by the tabs and the discoveries counter
const isFood = (k) => ITEMS[k]?.cat === 'food'
const isDecor = (k) => DECOR.includes(k)
const isTool = (k) => TOOLS.includes(k)
const base = (k) => (k.endsWith('_perfect') ? k.slice(0, -8) : k)
const WHERE = { forest: 'in the forest', meadow: 'out in the meadow', water: 'by the water', cliff: 'up on the cliffs', ruins: 'among the old ruins', terraces: 'on the terraces', night: 'after dark', treasure: 'somewhere well hidden' }
const TABS = [
  { id: 'gathered', label: 'Gathered', icon: 'sprout', x: 280, w: 225 },
  { id: 'tools', label: 'Tools', icon: 'tools', x: 513, w: 167 },
  { id: 'food', label: 'Food', icon: 'bowl', x: 688, w: 170 },
  { id: 'decor', label: 'Decor', icon: 'chair', x: 866, w: 170 },
]
const EMPTY = {
  gathered: 'Nothing yet. Wander the forest and press E near things that shimmer.',
  tools: 'Craft tools at the bench beside your Home.',
  food: 'Cook something on the stove at home, or pick berries.',
  decor: 'Craft keepsakes at the bench, then place them near Home.',
}

function lists() {
  const inv = Object.entries(G.s.inv).filter(([k, n]) => n > 0 && (ITEMS[k] || ITEMS[base(k)]))
  return {
    gathered: inv.filter(([k]) => !isFood(base(k)) && !isDecor(base(k)) && !isTool(base(k))).map(([id, n]) => ({ id, n })),
    tools: TOOLS.map(id => ({ id, n: null, ghost: !G.s.tools[id] })),
    food: inv.filter(([k]) => isFood(base(k))).map(([id, n]) => ({ id, n })),
    decor: inv.filter(([k]) => isDecor(base(k))).map(([id, n]) => ({ id, n })),
  }
}
const found = (k) => !!(G.s.seen[k] || G.s.tools[k]) // a tool you own counts as found even if it was never 'seen'
export function discoveries() {
  const groups = [
    { label: 'Nature', icon: 'sprout', test: (k) => !isFood(k) && !isDecor(k) && !isTool(k) },
    { label: 'Food', icon: 'bowl', test: isFood },
    { label: 'Decor', icon: 'chair', test: isDecor },
    { label: 'Tools', icon: 'tools', test: isTool },
  ]
  const ids = Object.keys(ITEMS)
  const rows = groups.map(g => { const all = ids.filter(g.test); return { ...g, seen: all.filter(found).length, total: all.length } })
  const next = ids.find(k => groups[0].test(k) && !found(k) && ITEMS[k].cat !== 'unlock')
  return { seen: ids.filter(found).length, total: ids.length, rows, next }
}

function Card({ tab, sel, sbm }) {
  if (!sel) return <div className="sb-card sb-empty"><div className="sb-blob"><Icon id="bag" size={120} wash={false} /></div><p>{EMPTY[tab]}</p></div>
  const k = base(sel.id), item = ITEMS[sel.id] || ITEMS[k], perfect = sel.id.endsWith('_perfect')
  const kind = { gathered: 'Gathered', tools: 'Tool', food: 'Food', decor: 'Decor' }[tab]
  const buff = tab === 'food' && sbm.m ? sbm.m.buffFor(sel.id) : null
  const tag = sel.ghost ? 'NOT YET' : perfect ? 'PERFECT' : buff ? buff.toUpperCase() : tab === 'tools' ? 'OWNED' : sel.n > 1 ? '×' + sel.n : null
  return <div className="sb-card">
    <div className="sb-blob"><Icon id={k} size={146} wash={false} dim={sel.ghost} />{!sel.ghost && <span className="sb-rays">{I.rays}</span>}</div>
    <h5>{item.name}</h5>
    <span className="sb-pil">{kind.toUpperCase()}{tag && <><b>✦</b>{tag}</>}</span>
    <p>{sel.ghost ? 'Not made yet. Its recipe is in the Recipe Book (C).' : item.desc}</p>
    <div className="sb-ln" />
  </div>
}
function Actions({ tab, sel, sbm }) {
  if (!sel || tab === 'tools') return <div className="sb-acts">{tab === 'tools' && <button className="sb-bt g" onClick={() => openRecipes({ sub: 'tools' })}>{I.hammer}Recipes</button>}</div>
  const near = TALK.near && window.__sb ? TALK.near : null
  const gift = <button className="sb-bt y" disabled={!near} title={near ? 'Give it as a gift' : 'Walk up to a neighbour to give a gift'} onClick={() => { setPanel(null); window.__sb.openGift(near.key) }}>{I.gift}Gift</button>
  if (tab === 'food') { const b = sbm.m && sbm.m.buffFor(sel.id)
    return <div className="sb-acts"><button className="sb-bt g" disabled={!b} title={b ? 'Eat: ' + b : 'Nothing to gain from eating this now'} onClick={() => sbm.m.eatFood(sel.id)}>{I.bowl}Eat</button>{gift}</div> }
  if (tab === 'decor') return <div className="sb-acts"><button className="sb-bt g" onClick={() => startPlace(sel.id)}>{I.pin}Place</button>{gift}</div>
  return <div className="sb-acts"><button className="sb-bt g" onClick={() => openRecipes(recipeTabFor(sel.id) || {})}>{I.hammer}Craft with</button>{gift}</div>
}
function Discoveries({ d, onClose }) {
  return <div className="sb-disc" role="dialog" aria-label="Discoveries">
    <div className="sb-dh">{I.sprout}<b>Discoveries</b><span>{d.seen} / {d.total}</span><button className="sb-dx" onClick={onClose} aria-label="Close discoveries">×</button></div>
    {d.rows.map(r => <div key={r.label} className="sb-dr"><span className="sb-di">{I[r.icon]}</span><span className="sb-dn">{r.label}</span><span className="sb-dm"><i style={{ width: (r.total ? r.seen / r.total * 100 : 0) + '%' }} /></span><span className="sb-dc">{r.seen}/{r.total}</span></div>)}
    {d.next && <div className="sb-dnext"><span className="sb-sil"><Icon id={d.next} size={40} wash={false} /></span><span><b>Still to find:</b> something {WHERE[ITEMS[d.next].cat] || 'out there'}…</span></div>}
    <div className="sb-dsoon">The full discovery journal is coming soon</div>
  </div>
}

export function BagSatchel({ sbm, onReset }) {
  const [tab, setTab] = useState('gathered'), [selId, setSel] = useState(null), [disc, setDisc] = useState(false)
  const [s, setS] = useState(fitScale)
  useEffect(() => { const f = () => setS(fitScale()); addEventListener('resize', f); return () => removeEventListener('resize', f) }, [])
  const L = lists(), list = L[tab], sel = list.find(x => x.id === selId) || list[0] || null
  const d = discoveries()
  const slots = Math.max(15, Math.ceil(list.length / 5) * 5)
  return <div className="sb-veil" onPointerDown={e => { if (e.target === e.currentTarget) setPanel(null) }}>
    <div className="sb-bag" style={{ '--s': Math.min(1, s) }} role="dialog" aria-label="Bag">
      <img className="sb-art" src={frame1x} srcSet={`${frame1x} 1x, ${frame2x} 2x`} alt="" draggable="false" />
      {TABS.map(t => { const c = t.id === 'tools' ? L.tools.filter(x => !x.ghost).length : L[t.id].length
        return <button key={t.id} className={'sb-tb' + (tab === t.id ? ' on' : '')} style={{ left: t.x, width: t.w }} onClick={() => { setTab(t.id); setSel(null) }} aria-pressed={tab === t.id}>{I[t.icon]}{t.label} <i>{c}</i></button> })}
      <div className="sb-grid">
        {Array.from({ length: slots }, (_, i) => { const it = list[i]
          if (!it) return <div key={'e' + i} className="sb-t e" />
          const perfect = it.id.endsWith('_perfect'), on = sel && it.id === sel.id
          return <button key={it.id} className={'sb-t tp-slot' + (on ? ' sel' : '') + (perfect ? ' perfect' : '') + (it.ghost ? ' ghost' : '')} onClick={() => setSel(it.id)} title={(ITEMS[it.id] || ITEMS[base(it.id)]).name} aria-pressed={on}>
            <Icon id={base(it.id)} size={86} wash={false} dim={it.ghost} />{it.n != null && <span className="sb-n">{it.n}</span>}{perfect && <i className="sb-sp tp-spark" aria-label="perfect">✦</i>}</button> })}
      </div>
      <Card tab={tab} sel={sel} sbm={sbm} />
      <Actions tab={tab} sel={sel} sbm={sbm} />
      <button className={'sb-foot' + (disc ? ' on' : '')} onClick={() => setDisc(v => !v)} aria-expanded={disc} aria-label={`Discoveries, ${d.seen} of ${d.total} found`}>
        {I.sprout}{d.seen} / {d.total} discovered<span className="sb-m"><i style={{ width: (d.total ? d.seen / d.total * 100 : 0) + '%' }} /></span><span className="sb-more">View ›</span></button>
      {disc && <Discoveries d={d} onClose={() => setDisc(false)} />}
      <button className="sb-hot" style={{ left: 1316, top: 121, width: 72, height: 72, borderRadius: '50%' }} onClick={() => setPanel(null)} aria-label="Close bag" />
      <button className="sb-hot" style={{ left: 1203, top: 782, width: 192, height: 46, borderRadius: 23 }} onClick={onReset} aria-label="Reset save" />
    </div>
  </div>
}
