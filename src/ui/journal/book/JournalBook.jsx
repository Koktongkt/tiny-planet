// The journal as a leather book: painted art (src/assets/ui/journal-frame*.webp, from ui-mocks/a/ref3) with a live layer
// on top, laid out in the art's own 1448x1086 pixels and scaled to fit (fit.js). Five fabric bookmarks stand up out of
// the pages' top edge: Quests, People, Recipes over the left page; Discoveries, Memories over the right. Recipes,
// Discoveries and Memories have paper sub-tabs on the left page. Each page is a list on the left, the picked entry on
// the right (pages.jsx). Design: docs/superpowers/specs/2026-11-23-journal-design.md; mock: ui-mocks/a/journal.html.
import React, { useEffect, useState } from 'react'
import { G, emit } from '../../../game/store.js'
import { newDots } from '../../../systems/journalPages.js'
import { bookScale } from './fit.js'
import { PAGES, SUBS } from './pages.jsx'
import { FRAME, ART } from './preload.js'
import './book.css'

const svg = (d) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{d}</svg>
const ICON = {
  quests: svg(<><path d="M6 3h11a2 2 0 0 1 2 2v13" /><path d="M6 3a2 2 0 0 0-2 2v1h4" /><path d="M8 5v14a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-1h-9v1a2 2 0 0 1-2 2" /><path d="M11 8h5M11 12h5" /></>),
  people: svg(<><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c.6-3.6 3.2-5.5 6.5-5.5s5.9 1.9 6.5 5.5" /><path d="M16 4.8a3.3 3.3 0 0 1 0 6.4M18 14.8c2 .7 3.2 2.4 3.5 5.2" /></>),
  recipes: svg(<><path d="M12 6.5C10 5 7 4.5 3.5 5v13c3.5-.5 6.5 0 8.5 1.5 2-1.5 5-2 8.5-1.5V5c-3.5-.5-6.5 0-8.5 1.5z" /><path d="M12 6.5v13" /><path d="M6.5 9.5c1.3-.2 2.6 0 3.5.5M6.5 13c1.3-.2 2.6 0 3.5.5M14 10c.9-.5 2.2-.7 3.5-.5" /></>),
  discoveries: svg(<><circle cx="10.5" cy="10.5" r="6" /><path d="M15 15l5.5 5.5" /><path d="M10.5 13.5v-4M10.5 9.5c0-2 1.3-3 3-3 0 2-1.3 3-3 3zM10.5 11c0-1.6-1-2.4-2.5-2.4 0 1.6 1 2.4 2.5 2.4z" /></>),
  memories: svg(<><rect x="4" y="3" width="16" height="18" rx="2" transform="rotate(-4 12 12)" /><path d="M6.6 6.2l10.8-.8.7 9.5-10.8.8z" /></>),
}
export const BOOKMARKS = [
  { id: 'quests', side: 'l', label: 'Quests', c: ['#e2654c', '#b8402e'] },
  { id: 'people', side: 'l', label: 'People', c: ['#f3c25a', '#d4922a'] },
  { id: 'recipes', side: 'l', label: 'Recipes', c: ['#7ab4cf', '#4f89a8'] },
  { id: 'discoveries', side: 'r', label: 'Discoveries', c: ['#9cc75c', '#679a34'] },
  { id: 'memories', side: 'r', label: 'Memories', c: ['#ea9a92', '#c86a66'] },
]
// where the book was left open (kept between openings); G.ui.journalAt (openJournal) overrides it once
const MEM = { tab: 'quests', sub: { recipes: 'tools', discoveries: 'fish', memories: 'photos' }, pick: {} }
const pickKey = (tab, sub) => (sub ? tab + '/' + sub : tab)

export { useBookFits } from './useBookFits.js'
export function JournalBook({ onClose }) {
  const [, redraw] = useState(0), bump = () => redraw(x => x + 1)
  const [shown, setShown] = useState(ART.ready) // opened before the preload finished: fade in once the art is decoded
  const [s, setS] = useState(() => bookScale(innerWidth, innerHeight))
  useEffect(() => { const f = () => setS(bookScale(innerWidth, innerHeight)); addEventListener('resize', f); return () => removeEventListener('resize', f) }, [])
  const at = G.ui.journalAt
  if (at) { // opened at a place (the Bag, the bench): take it once
    if (at.tab) MEM.tab = at.tab
    if (at.sub) MEM.sub[MEM.tab] = at.sub
    if (at.pick) MEM.pick[pickKey(MEM.tab, MEM.sub[MEM.tab])] = at.pick
    G.ui.journalAt = null
  }
  const tab = MEM.tab, subs = SUBS[tab], sub = subs ? MEM.sub[tab] : null, key = pickKey(tab, sub)
  const ctx = { sub, pick: MEM.pick[key], setPick: (id) => { MEM.pick[key] = id; bump() }, refresh: () => { bump(); emit() } }
  const [left, right] = PAGES[tab](ctx)
  const dots = newDots(G.s)
  const go = (id) => { MEM.tab = id; bump() }
  return <div className="jb-veil" onPointerDown={e => { if (e.target === e.currentTarget) onClose() }}>
    <div className={'jb-book' + (shown ? '' : ' jb-wait')} style={{ '--s': s }} role="dialog" aria-label="Journal">
      <img className="jb-art" src={FRAME} alt="" draggable="false" decoding="sync" onLoad={() => { ART.ready = true; setShown(true) }} ref={el => { if (el && el.complete && el.naturalWidth && !shown) { ART.ready = true; setShown(true) } }} />
      <nav className="jb-bm" role="tablist" aria-label="Journal sections">
        {['l', 'r'].map(side => <div key={side} className={'jb-grp ' + side}>{BOOKMARKS.filter(b => b.side === side).map(b =>
          <button key={b.id} data-id={b.id} className={'jb-bk' + (b.id === tab ? ' on' : '')} role="tab" aria-selected={b.id === tab} style={{ '--c1': b.c[0], '--c2': b.c[1] }} onClick={() => go(b.id)}>
            {ICON[b.id]}<span className="jb-hand">{b.label}</span>{dots[b.id] && b.id !== tab && <span className="jb-dot" aria-label="something new" />}</button>)}</div>)}
      </nav>
      {subs && <div className="jb-sub" role="tablist" aria-label={'Pages in ' + tab}>{subs.map(t => { const c = t.count ? t.count() : null
        return <button key={t.id} data-sub={t.id} className={'jb-st' + (t.id === sub ? ' on' : '')} role="tab" aria-selected={t.id === sub} style={{ '--c': t.c }} onClick={() => { MEM.sub[tab] = t.id; bump() }}>
          <i /><span className="jb-hand">{t.label}</span>{c && <small className="jb-hand">{c}</small>}</button> })}</div>}
      <div className={'jb-L' + (subs ? ' sub' : '')}>{left}</div>
      <div className="jb-R">{right}</div>
      <button className="jb-x" onClick={onClose} aria-label="Close journal" />
    </div>
  </div>
}
export default JournalBook
