// <GiftPicker items={{id,count}[]} onPick={(itemId)=>void} onClose /> (Stage B contract)
// Optional (visual only, not in the contract): npcName, hearts (shows the badge in the header), prefs
// ({ [itemId]: 'love'|'like'|'neutral'|'dislike' } = reactions she has already seen; unknown items show no hint),
// giftedToday (greys the Give button with a note), defaultSelected (item id pre-chosen).
// Tap an item to choose it, then "Give". Double-tap / Enter gives straight away. Esc or the veil closes.
import React, { useEffect, useState } from 'react'
import { Icon, IconDefs } from '../../game/icons.jsx'
import { itemName } from '../../game/itemsB.js'
import { HeartsBadge } from './Hearts.jsx'
import '../../art/parchment.css'
import './gifts.css'
export const PREF_ICON = { love: '♥♥', like: '♥', neutral: '·', dislike: '✕' }
const PREF_TXT = { love: 'Loves this', like: 'Likes this', neutral: 'Not fussed', dislike: 'Not keen' }
export function GiftPicker({ items = [], onPick, onClose, npcName, hearts, prefs = {}, giftedToday = false, defaultSelected = null }) {
  const list = items.filter(it => it.count > 0)
  const [sel, setSel] = useState(defaultSelected)
  useEffect(() => { const k = (e) => { if (e.key === 'Escape') onClose && onClose(); if (e.key === 'Enter' && sel && !giftedToday) onPick && onPick(sel) }; addEventListener('keydown', k); return () => removeEventListener('keydown', k) }, [sel, giftedToday, onPick, onClose])
  const give = (id) => { if (!giftedToday && id) onPick && onPick(id) }
  return <div className="tpx tpx-veil" onPointerDown={(e) => { if (e.target === e.currentTarget) onClose && onClose() }}>
    <IconDefs />
    <div className="tpx-paper tpx-panel tpg-picker" role="dialog" aria-label={npcName ? `Choose a gift for ${npcName}` : 'Choose a gift'}>
      <div className="tpx-head">
        <span className="tpg-bow" aria-hidden><Icon id="basket" size={40} /></span>
        <h3>{npcName ? <>A gift for {npcName}?</> : 'Choose a gift'}<small>{giftedToday ? 'You\u2019ve already given a gift today.' : 'Pick something from your bag.'}</small></h3>
        {hearts != null && <HeartsBadge hearts={hearts} size={20} />}
        <button className="tpx-x" aria-label="Close" onClick={onClose}><svg viewBox="0 0 24 24"><path d="M5 5 L19 19 M19 5 L5 19" /></svg></button>
      </div>
      <div className="tpx-scroll">
        {list.length === 0 ? <p className="tpg-empty">Your bag is empty. Gather something first, then come back.</p> :
          <div className="tpg-grid">{list.map(it => { const p = prefs[it.id], on = sel === it.id
            return <button key={it.id} className={'tpg-item' + (on ? ' on' : '') + (p ? ' p-' + p : '')} aria-pressed={on} onClick={() => setSel(it.id)} onDoubleClick={() => give(it.id)}>
              <Icon id={it.id} size={46} />
              <span className="nm">{itemName(it.id)}</span>
              <span className="ct tpx-num">×{it.count}</span>
              {p && <span className="pref" title={PREF_TXT[p]}>{PREF_ICON[p]}</span>}
            </button> })}</div>}
      </div>
      <div className="tpg-foot">
        <span className="tpg-sel">{sel ? <><Icon id={sel} size={28} /><span>{itemName(sel)}</span>{prefs[sel] && <em className={'p-' + prefs[sel]}>{PREF_TXT[prefs[sel]]}</em>}</> : <span className="dim">Nothing chosen yet</span>}</span>
        <button className="tpx-btn go" disabled={!sel || giftedToday} onClick={() => give(sel)}><Icon id="heart" size={24} wash={false} />Give</button>
      </div>
    </div>
  </div>
}
export default GiftPicker
