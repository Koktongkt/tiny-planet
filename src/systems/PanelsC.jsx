// Stage C DOM side (lazy chunk): journal (fish / relics / forage / photos), ruins museum donations, photo-mode bar, train
// ride chip and the first-day tutorial note. These are Codor's plain fallbacks on the existing paper styles; Studio's
// Journal / DonateCard / PhotoMode / RideOverlay / TutorialNote replace them by props when art-c lands.
import React, { Suspense, lazy, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { G, emit } from '../game/store.js'
import { ITEMS } from '../game/items.js'
import { Icon } from '../game/icons.jsx'
import { FISH_TEXT } from '../game/itemsC.js'
import { TOUCH } from '../touch.jsx'
import { SC, RIDE, PH, STOP_NAME } from './liveC.js'
import { withProgress, TUTORIAL_SIGNER } from '../ui/tutorial/steps.js'
import { registerFishIcons } from '../art/fish/icons.jsx'
import './panelsC.css'
const TutorialNote = lazy(() => import('../ui/tutorial/TutorialNote.jsx'))
const CatchCard = lazy(() => import('../ui/fish/CatchCard.jsx'))
const PhotoMode = lazy(() => import('../ui/photo/PhotoMode.jsx'))
registerFishIcons() // species icons for the journal (Studio, art/fish/icons.jsx)
const close = () => { G.ui.panel = null; emit() }
const label = (e) => e.kind === 'fish' ? FISH_TEXT[e.id]?.name : ITEMS[e.id]?.name
function Book({ title, icon, children }) {
  return <div className="tp-veil" onPointerDown={e => { if (e.target === e.currentTarget) close() }}><div className="tp-panel paper wide tpc-book">
    <div className="tp-head"><Icon id={icon} size={44} /><h3>{title}</h3><button className="tp-x" onClick={close} aria-label="close"><Icon id="close" size={32} wash={false} /></button></div>
    <div className="tp-scroll">{children}</div></div></div>
}
const TABS = [['fish', 'Fish'], ['relics', 'Relics'], ['forage', 'Forage'], ['photos', 'Photos']]
function Journal() {
  const [tab, setTab] = useState('fish'), list = SC.journal(tab), pr = SC.C.progress(G.s)
  return <Book title="Journal" icon="book">
    <div className="tpc-tabs">{TABS.map(([k, l]) => <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>)}<span>{pr.fish}/{pr.fishOf} fish · {pr.donated}/{pr.donatedOf} in the museum</span></div>
    {tab === 'photos' ? (list.length ? <div className="tpc-photos">{list.map(p => <figure key={p.id}><img src={p.src} alt={'Photo from day ' + (p.day + 1)} /><figcaption>Day {p.day + 1}</figcaption></figure>)}</div> : <p className="tp-empty">No photos yet — press <span className="key">P</span> or the Photo button.</p>)
      : <div className="tpc-grid">{list.map(e => <div key={e.id} className={'tpc-entry' + (e.seen ? '' : ' unseen')}><Icon id={e.seen ? e.id : 'unknown'} size={44} dim={!e.seen} />
        <b>{e.seen ? label(e) || e.id : '???'}</b><small>{e.seen ? [e.count && `×${e.count}`, e.best && `best ${e.best} cm`, e.donated && 'in museum'].filter(Boolean).join(' · ') : 'not found yet'}</small></div>)}</div>}
  </Book>
}
function Museum() {
  const can = SC.donatable(), don = Object.keys(G.s.museum.donated)
  return <Book title="Ruins Museum" icon="book">
    <p className="tp-sub">Professor Hoshino looks up from his notebook. “Anything for the collection today?”</p>
    <h4>From your bag</h4>{can.length ? <div className="tp-grid">{can.map(id => <button key={id} className="tp-slot act" onClick={() => SC.donate(id)}><Icon id={id} size={52} /><span className="nm">{ITEMS[id]?.name || id}</span><span className="tag">donate</span></button>)}</div> : <p className="tp-empty">Nothing new to donate. Dig at the old stones, gather shards, or catch something rare.</p>}
    <h4>On display ({don.length}/{SC.C.DONATABLE.length})</h4><div className="tp-grid">{SC.C.DONATABLE.map(id => <div key={id} className={'tp-slot' + (don.includes(id) ? '' : ' ghost')}><Icon id={don.includes(id) ? id : 'unknown'} size={52} dim={!don.includes(id)} /><span className="nm">{don.includes(id) ? ITEMS[id]?.name || id : '—'}</span></div>)}</div>
  </Book>
}
// Studio's PhotoMode, portalled to <body>: its overlay layers blend with the canvas, so no stacking-context ancestor (.tp-ui has z-index)
function Photo() {
  if (!PH.on || !PH.v) return null
  return createPortal(<Suspense fallback={null}><PhotoMode value={PH.v} touch={TOUCH} pets={{ pip: !!window.__dog, mochi: !!(window.__cat && window.__home && window.__home.inside) }} lastShot={PH.last}
    onChange={(v) => SC.setPhoto(v)} onShutter={() => SC.shutter()} onClose={() => SC.photo(false)} /></Suspense>, document.body)
}
function Ride() {
  const [, f] = useState(0)
  useEffect(() => { if (!RIDE.riding) return; const i = setInterval(() => f(x => x + 1), 500); return () => clearInterval(i) }, [RIDE.riding])
  if (!RIDE.riding) return null
  return <div className="tpc-ride paper"><Icon id="coin" size={30} /><span>{STOP_NAME[RIDE.from]} → <b>{STOP_NAME[RIDE.to]}</b></span><i><b style={{ width: Math.round(RIDE.progress * 100) + '%' }} /></i></div>
}
function Tutorial() {
  if (!SC.tutorialVisible() || G.ui.panel || PH.on || RIDE.riding) return null
  const t = G.s.tutorial, open = t.open ?? !TOUCH // saved; touch starts as the small pinned slip so it doesn't cover the button column
  return <div className="tpc-tut"><TutorialNote steps={withProgress(t.done)} touch={TOUCH} open={open} onToggle={SC.tutorialFold} onDismiss={() => SC.tutorial(false)} signer={TUTORIAL_SIGNER.name} /></div>
}
// Studio's catch card after a landed fish (G.ui.panel = 'catch' keeps the game keys off while it's up)
function Catch() {
  const [c, setC] = useState(null)
  useEffect(() => { window.__scCatch = (x) => { setC(x); G.ui.panel = 'catch'; emit() }; return () => { window.__scCatch = null } }, [])
  if (!c || G.ui.panel !== 'catch') return null
  return <CatchCard fish={c.fishId} size={c.size} isNew={c.isNew} isRecord={c.isRecord} where={c.where} period={c.period} weather={c.weather} onClose={() => { setC(null); close() }} />
}
export function StageCPanels() {
  const p = G.ui.panel
  return <Suspense fallback={null}>{p === 'journal' && <Journal />}{p === 'museum' && <Museum />}<Photo /><Ride /><Tutorial /><Catch /></Suspense>
}
export default StageCPanels
