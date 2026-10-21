// DOM half of the art preview harness (see preview.jsx). Mock data only.
import React, { useEffect, useState } from 'react'
import { Icon, IconDefs, ICON_IDS } from '../game/icons.jsx'
import { itemName, ITEM_LABELS } from '../game/items.js'
import { HeartsBadge, GiftPicker, GiftReaction } from '../ui/gifts/index.js'
import { ErrandsBoard } from '../ui/errands/ErrandsBoard.jsx'
import { SettingsPanel } from '../ui/settings/index.js'
import './parchment.css'
const q = new URLSearchParams(location.search)
const css = `html,body{background:radial-gradient(120% 90% at 30% 20%,#cfe6c0,#a9cf8e 60%,#8fbf7a)}
.pv-wrap{position:fixed;inset:0;overflow:auto;padding:28px;display:flex;flex-direction:column;align-items:center;gap:18px}
.pv-card{padding:18px 26px}.pv-card h3{margin:0 0 10px;font:italic 600 26px TPSerif,Georgia,serif}
.pv-hrow{display:flex;align-items:center;gap:16px;padding:6px 0;border-bottom:1px dashed #3b2f2230;font:italic 500 19px TPSerif,Georgia,serif}.pv-hrow code{font:13px monospace;opacity:.6;min-width:150px}
.pv-plate{display:inline-flex;align-items:baseline;gap:10px;padding:5px 15px 7px;border-radius:10px 14px 12px 9px;background:linear-gradient(#e7f0d8,#cfe0b6);box-shadow:inset 0 0 0 2px #3b2f22,0 3px 6px #2a1e1430;font:italic 600 20px TPSerif,Georgia,serif}
.pv-stage{display:grid;grid-template-columns:repeat(4,1fr);gap:20px;width:min(980px,96vw);margin-top:90px}
.pv-vill{position:relative;height:300px;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;padding:12px}
.pv-vill .who{font:italic 600 20px TPSerif,Georgia,serif}.pv-vill .who small{display:block;font-size:14px;opacity:.6;text-align:center}
.pv-bean{width:56px;height:92px;border-radius:28px 28px 22px 22px;background:linear-gradient(#f2a3a0,#e88c88);box-shadow:inset 0 0 0 2.2px #3b2f22;position:relative;margin-bottom:6px}
.pv-bean::before{content:'';position:absolute;left:6px;top:-40px;width:44px;height:44px;border-radius:50%;background:#f7d3b8;box-shadow:inset 0 0 0 2.2px #3b2f22}
.pv-anchor{position:absolute;left:50%;top:-44px;width:0;height:0}
.pv-freeze .tpg-react *{animation-play-state:paused!important;animation-delay:calc(var(--fz,-.6s))!important}
.pv-icons{display:grid;grid-template-columns:repeat(auto-fill,minmax(112px,1fr));gap:10px;width:min(1180px,96vw)}
.pv-ic{display:flex;flex-direction:column;align-items:center;gap:2px;padding:8px 4px;border-radius:14px;background:#fffaf0b8;box-shadow:inset 0 0 0 1.6px #3b2f2250;font:italic 600 16px/1.1 TPSerif,Georgia,serif;text-align:center}
.pv-ic code{font:11px monospace;opacity:.55}.pv-ic.new{background:#fff6d8;box-shadow:inset 0 0 0 2.2px #3b2f22}
.pv-sec{font:italic 600 24px TPSerif,Georgia,serif;align-self:flex-start;margin:6px 0 -6px max(0px,calc(50% - 590px))}
@media (max-width:640px){.pv-stage{grid-template-columns:1fr 1fr}.pv-wrap{padding:14px}.pv-hrow code{min-width:0;font-size:11px}}`
const BAG = [['berries', 6], ['flower', 9], ['skyberry', 2], ['fish', 1], ['acorn_cookie', 1], ['shell', 4], ['turnip', 3], ['crystal', 1], ['wool_scarf', 1], ['herb_soup', 2], ['clay', 5], ['carrot', 4]].map(([id, count]) => ({ id, count }))
const PREFS = { fish: 'love', acorn_cookie: 'like', flower: 'neutral', clay: 'dislike', herb_soup: 'like' }
function Hearts() { return <div className="pv-wrap"><div className="tpx tpx-paper pv-card"><h3>Hearts meter</h3>
  {[[0], [1], [2.4, 1], [3], [4.7, 1], [5]].map(([h, p], i) => <div key={i} className="pv-hrow"><code>hearts={h}{p ? ' showProgress' : ''}</code><HeartsBadge hearts={h} showProgress={!!p} size={30} /></div>)}
  <div className="pv-hrow"><code>size=20 (nameplate)</code><span className="pv-plate">Gonta <HeartsBadge hearts={3} size={20} /></span></div>
  <div className="pv-hrow"><code>label, pulse=3</code><HeartsBadge hearts={4} label="Friendship" pulse={3} size={24} /></div>
</div></div> }
function Reactions() {
  return <div className="pv-wrap"><div className="pv-stage pv-freeze">{[['love', 'Gonta', 'fisherman', '-.55s'], ['like', 'Oharu', 'baker', '-.6s'], ['neutral', 'Kenji', 'farmer', '-.7s'], ['dislike', 'Mei', 'kid', '-.6s']].map(([k, n, r, fz]) =>
    <div key={k} className="tpx tpx-paper pv-vill" style={{ '--fz': fz }}><div className="pv-bean"><div className="pv-anchor"><GiftReaction kind={k} /></div></div><div className="who">{n}<small>kind="{k}"</small></div></div>)}</div></div>
}
const ERRANDS = [
  { id: 'e1', npcId: 'baker', wants: [{ itemId: 'berries', count: 4 }, { itemId: 'acorn', count: 2 }], reward: { itemId: 'berry_jam', coins: 30 }, day: 4, done: false },
  { id: 'e2', npcId: 'fisherman', wants: [{ itemId: 'skyberry', count: 3 }], reward: { coins: 45, hearts: 1 }, day: 4, done: false },
  { id: 'e3', npcId: 'farmer', wants: [{ itemId: 'turnip', count: 2 }], reward: { itemId: 'seedpack', hearts: 1 }, day: 4, done: true },
  { id: 'e4', npcId: 'grandma', wants: [{ itemId: 'wool', count: 3 }], reward: { itemId: 'wool_scarf' }, day: 4, done: false },
]
const INV = { berries: 6, acorn: 2, skyberry: 1, turnip: 0, wool: 1 }
function Board() { const [es, setEs] = useState(q.get('empty') ? [] : ERRANDS), acc = q.has('accept')
  return <ErrandsBoard errands={acc ? es.map((e, i) => ({ ...e, accepted: i !== 3 })) : es} inventory={INV} day={4} onAccept={acc ? (id) => console.log('accept', id) : undefined} onDeliver={(id) => setEs(l => l.map(e => e.id === id ? { ...e, done: true } : e))} onClose={() => {}} /> }
function Icons() { const fresh = Object.keys(ITEM_LABELS).concat(['heart', 'board', 'gear'])
  const cell = (id, nw) => <div key={id} className={'pv-ic' + (nw ? ' new' : '')}><Icon id={id} size={64} /><span>{itemName(id)}</span><code>{id}</code></div>
  return <div className="pv-wrap"><IconDefs /><div className="pv-sec">New for Stage B</div><div className="pv-icons">{fresh.map(id => cell(id, true))}</div>
    <div className="pv-sec">Existing set (for style match)</div><div className="pv-icons">{ICON_IDS.filter(i => !fresh.includes(i)).map(id => cell(id, false))}</div></div> }
function Settings() { const [v, setV] = useState({ volume: 0.8, music: 0.55, sfx: 0.9, ambience: 0.7, muted: false, textScale: 1, minimap: true, reduceMotion: false }); return <SettingsPanel value={v} onChange={setV} onClose={() => {}} /> }
export default function DomPreview({ mode }) {
  useEffect(() => { const s = document.createElement('style'); s.textContent = css; document.head.appendChild(s); (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => setTimeout(() => document.body.setAttribute('data-ready', '1'), 300)) }, [])
  if (mode === 'hearts') return <Hearts />
  if (mode === 'gifts') return <GiftPicker items={q.has('empty') ? [] : BAG} npcName="Gonta" hearts={2} prefs={PREFS} defaultSelected={q.get('sel') || 'fish'} onPick={(id) => console.log('pick', id)} onClose={() => {}} />
  if (mode === 'reactions') return <Reactions />
  if (mode === 'board') return <Board />
  if (mode === 'icons') return <Icons />
  if (mode === 'settings') return <Settings />
  return <div className="pv-wrap">unknown mode</div>
}
