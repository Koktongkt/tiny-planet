// <Journal tab onTab entries progress onClose photos? touch? /> (art-c item 7) — her field notebook: a spiral-bound,
// ruled page with washi-tape tabs (fish · forage · relics · photos), hand-drawn entry cells, ink silhouettes for things
// not found yet, a 'museum' stamp on donated ones, and polaroids for photos. Data: liveC journal(tab) /
// collection.entries(tab, G.s) (Entry { id, kind, seen, count, best?, firstDay?, donated }) and progress(G.s).
// For tab 'photos', `entries` = [{ id, day, src }] (liveC journal('photos')).
import React, { useEffect, useState } from 'react'
import { Icon, IconDefs } from '../../game/icons.jsx'
import { registerFishIcons } from '../../art/fish/icons.jsx'
import '../../art/forage/icons.jsx'
import { registerRelicIcons } from '../../art/museum/icons.jsx'
import { JOURNAL_TABS, entryName, entryBlurb, entryNote, tabCount } from './text.js'
import '../../art/parchment.css'
import './journal.css'
registerFishIcons(); registerRelicIcons()
const X = () => <svg viewBox="0 0 24 24"><path d="M6 6 L18 18 M18 6 L6 18" /></svg>
function Cell({ e, on, onPick }) {
  return <button className={'jn-cell' + (e.seen ? '' : ' unseen') + (on ? ' on' : '')} onClick={() => onPick(e.id)} aria-label={e.seen ? entryName(e) : 'Not found yet'}>
    <span className="jn-ic">{e.seen ? <Icon id={e.id} size={58} /> : <Icon id={e.id} size={58} wash={false} style={{ filter: 'brightness(0)', opacity: 0.2 }} />}</span>
    <b>{e.seen ? entryName(e) : '? ? ?'}</b><small>{entryNote(e)}</small>
    {e.donated && <i className="jn-stamp">museum</i>}
  </button>
}
function Photos({ list }) {
  return <div className="jn-photos">{list.map((p, i) => <figure key={p.id} style={{ '--r': ((i * 37) % 9 - 4) * 0.8 + 'deg' }}><i className="jn-tape" />{p.src ? <img src={p.src} alt={'Photo from day ' + (p.day + 1)} /> : <div className="jn-lost">faded</div>}<figcaption>Day {p.day + 1}</figcaption></figure>)}</div>
}
export function Journal({ tab = 'fish', onTab, entries = [], progress, onClose, touch = false }) {
  const [pick, setPick] = useState(null), T = JOURNAL_TABS.find(t => t.id === tab) || JOURNAL_TABS[0]
  useEffect(() => setPick(null), [tab])
  const sel = tab !== 'photos' && entries.find(e => e.id === pick), cnt = tab === 'photos' ? null : tabCount(entries)
  return <div className="tpx tpx-veil jn-veil" onPointerDown={e => { if (e.target === e.currentTarget && onClose) onClose() }}>
    <IconDefs />
    <div className={'jn-book' + (touch ? ' touch' : '')} role="dialog" aria-label="Journal" style={{ '--tab': T.color }}>
      <div className="jn-spiral" aria-hidden>{[...Array(touch ? 0 : 9)].map((_, i) => <i key={i} />)}</div>
      <nav className="jn-tabs" role="tablist">{JOURNAL_TABS.map(t => <button key={t.id} role="tab" aria-selected={t.id === tab} className={t.id === tab ? 'on' : ''} style={{ '--c': t.color }} onClick={() => onTab && onTab(t.id)}>{t.label}</button>)}</nav>
      <div className="jn-page">
        <header className="jn-head"><h3>{T.label}</h3>
          <span className="jn-prog">{cnt ? <>{cnt.seen}<small>/{cnt.of}</small> found</> : <>{entries.length}<small>/12</small> kept</>}{progress && <em> · {progress.donated}/{progress.donatedOf} in the museum</em>}</span>
          {onClose && <button className="tpx-x" aria-label="Close journal" onClick={onClose}><X /></button>}</header>
        <div className="jn-body tpx-scroll">
          {tab === 'photos' ? (entries.length ? <Photos list={entries} /> : <p className="jn-blank">{T.blank}</p>)
            : (entries.some(e => e.seen) || entries.length ? <div className="jn-grid">{entries.map(e => <Cell key={e.id} e={e} on={pick === e.id} onPick={setPick} />)}</div> : <p className="jn-blank">{T.blank}</p>)}
        </div>
        <footer className="jn-note">{sel ? (sel.seen ? <><b>{entryName(sel)}.</b> {entryBlurb(sel)}{sel.donated ? <em> Now on show at the ruins museum.</em> : null}</> : <>Still a mystery. {T.blank}</>) : <span className="jn-hint">{tab === 'photos' ? 'Up to twelve photos fit between these pages.' : 'Tap an entry to read her notes.'}</span>}</footer>
      </div>
    </div>
  </div>
}
export default Journal
