// Stage C DOM side (lazy chunk): journal (fish / relics / forage / photos), ruins museum donations, photo-mode bar, train
// ride chip and the first-day tutorial note. These are Codor's plain fallbacks on the existing paper styles; Studio's
// Journal / DonateCard / PhotoMode / RideOverlay / TutorialNote replace them by props when art-c lands.
import React, { Suspense, lazy, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { G, emit, count } from '../game/store.js'
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
const RideOverlay = lazy(() => import('../ui/ride/RideOverlay.jsx'))
registerFishIcons() // species icons for the journal (Studio, art/fish/icons.jsx)
const close = () => { G.ui.panel = null; emit() }
const label = (e) => e.kind === 'fish' ? FISH_TEXT[e.id]?.name : ITEMS[e.id]?.name
function Book({ title, icon, children }) {
  return <div className="tp-veil" onPointerDown={e => { if (e.target === e.currentTarget) close() }}><div className="tp-panel paper wide tpc-book">
    <div className="tp-head"><Icon id={icon} size={44} /><h3>{title}</h3><button className="tp-x" onClick={close} aria-label="close"><Icon id="close" size={32} wash={false} /></button></div>
    <div className="tp-scroll">{children}</div></div></div>
}
// Studio's field notebook (journal) and Hoshino's catalogue card (museum plinths / tank slots), both lazy
const JournalBook = lazy(() => import('../ui/journal/Journal.jsx'))
const DonateCard = lazy(() => import('../ui/museum/DonateCard.jsx'))
function Journal() {
  const [tab, setTab] = useState('fish')
  return <JournalBook tab={tab} onTab={setTab} entries={SC.journal(tab)} progress={SC.C.progress(G.s)} onClose={close} touch={TOUCH} />
}
function Donate() {
  const d = G.ui.donate; if (!d) return null
  const don = G.s.museum.donated[d.id], have = count(d.id)
  const done = () => { G.ui.donate = null; close() }
  return <DonateCard itemId={d.id} mode={d.mode} have={have} donatedDay={don} onClose={done} onDonate={() => SC.donate(d.id)} />
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
  const at = SC.TS.stop // dwelling at a platform: she may step off there
  return <Suspense fallback={null}><RideOverlay from={RIDE.from} to={RIDE.to} progress={RIDE.progress} cost={RIDE.cost} dwelling={!!at} canAlight={!!at} onAlight={() => SC.alight(at)} /></Suspense>
}
function Tutorial() {
  if (!SC.tutorialVisible() || G.ui.panel || PH.on || RIDE.riding) return null
  const t = G.s.tutorial, open = t.open ?? !TOUCH // saved; desktop opens the letter, phone keeps it in the Menu
  if (TOUCH && !open) return null
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
  return <Suspense fallback={null}>{p === 'journal' && <Journal />}{p === 'donate' && <Donate />}<Photo /><Ride /><Tutorial /><Catch /></Suspense>
}
export default StageCPanels
