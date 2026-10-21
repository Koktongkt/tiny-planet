// Stage B DOM side (lazy chunk): settings, errands board, gift picker + reaction, and the food-buff chips.
// Studio's panels (src/ui/*) are presentational; state + rules come from ./live.js. Each panel is its own lazy chunk.
import React, { Suspense, lazy, useEffect, useState } from 'react'
import { G, emit } from '../game/store.js'
import { Icon } from '../game/icons.jsx'
import { PROFILES } from '../talk/profiles.js'
import { SB } from './live.js'
const SettingsPanel = lazy(() => import('../ui/settings/SettingsPanel.jsx'))
const ErrandsBoard = lazy(() => import('../ui/errands/ErrandsBoard.jsx'))
const GiftPicker = lazy(() => import('../ui/gifts/GiftPicker.jsx'))
const GiftReaction = lazy(() => import('../ui/gifts/GiftReaction.jsx'))
const close = () => { G.ui.panel = null; G.ui.gift = null; emit() }
function Buffs() {
  const list = SB.activeBuffs(); if (!list.length) return null
  return <div className="tp-buffs">{list.map(b => <div key={b.id} className={'tp-buff paper b-' + b.id} title={`${b.name}: ${b.desc}`}><Icon id={b.src || 'leaf'} size={30} /><span><b>{b.name}</b><small>{b.left >= 60 ? `${Math.floor(b.left / 60)}h ${String(b.left % 60).padStart(2, '0')}m` : `${b.left}m`}</small></span></div>)}</div>
}
function Reaction() {
  const [r, setR] = useState(null)
  useEffect(() => { window.__sbReact = (kind, name) => setR({ kind, name, k: performance.now() }); return () => { window.__sbReact = null } }, [])
  if (!r) return null
  return <div className="tp-react" key={r.k}><GiftReaction kind={r.kind} onDone={() => setR(null)} label={undefined} /></div>
}
export function StageBPanels() {
  const p = G.ui.panel
  return <Suspense fallback={null}>
    <Buffs /><Reaction />
    {p === 'settings' && <SettingsPanel value={G.s.settings} onChange={(v) => SB.applySettings(v)} onClose={close} onTutorial={window.__sc ? () => { close(); window.__sc.tutorial(true) } : undefined} />}
    {p === 'errands' && <ErrandsBoard errands={G.s.errands.list} inventory={G.s.inv} day={G.s.day + 1} onAccept={SB.acceptErrand} onDeliver={SB.deliverErrand} onClose={close} />}
    {p === 'gift' && G.ui.gift && <GiftPicker items={SB.giftable()} npcName={PROFILES[G.ui.gift]?.name} hearts={SB.friend(G.ui.gift).hearts} prefs={SB.prefsSeen(G.ui.gift)} giftedToday={SB.friend(G.ui.gift).giftedToday}
      onClose={close} onPick={(id) => { const who = G.ui.gift, r = SB.giveGift(who, id); close(); if (r) { window.__sbReact && window.__sbReact(r.kind); window.__sbSay && window.__sbSay(who, r) } }} />}
  </Suspense>
}
export default StageBPanels
