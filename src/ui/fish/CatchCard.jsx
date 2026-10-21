// <CatchCard fish size isNew isRecord where period weather onClose onRelease? /> (Stage C, art-c) — presentational.
// fish: species id or a FishSpecies object ({ id, rarity, ... } from game/fishTable.js). size in cm. where: 'lake'|'river'|'harbour'.
// period: 'morning'|'day'|'evening'|'night'; weather: 'clear'|'rain'. Text from game/itemsC.js (FISH_TEXT).
import React, { useEffect } from 'react'
import { Icon, IconDefs } from '../../game/icons.jsx'
import { registerFishIcons } from '../../art/fish/icons.jsx'
import { FISH_BY_ID } from '../../game/fishTable.js'
import { FISH_TEXT, RARITY_LABEL } from '../../game/itemsC.js'
import '../../art/parchment.css'
import './fish.css'
registerFishIcons()
const WHERE = { lake: 'at the lake', river: 'in the river', harbour: 'off the harbour pier' }
const WHEN = { morning: 'one early morning', day: 'in the bright of day', evening: 'as the sun went down', night: 'under the stars' }
const STARS = { common: 1, uncommon: 2, rare: 3, legend: 4 }
export function CatchCard({ fish, size, isNew = false, isRecord = false, where, period, weather, onClose, onRelease }) {
  const f = typeof fish === 'string' ? FISH_BY_ID[fish] || { id: fish, rarity: 'common' } : fish, t = FISH_TEXT[f.id] || { name: f.id, desc: '' }
  useEffect(() => { const k = (e) => { if (['Escape', 'Enter', 'KeyE', 'Space'].includes(e.code)) { e.preventDefault(); onClose && onClose() } }; addEventListener('keydown', k); return () => removeEventListener('keydown', k) }, [onClose])
  const n = STARS[f.rarity] || 1, line = [where && WHERE[where], period && WHEN[period]].filter(Boolean).join(', ') + (weather === 'rain' ? ', in the rain' : '')
  return <div className="tpx tpx-veil tpf-veil" onPointerDown={(e) => { if (e.target === e.currentTarget) onClose && onClose() }}>
    <IconDefs />
    <div className={'tpx-paper tpf-card r-' + f.rarity} role="dialog" aria-label={'You caught a ' + t.name}>
      <div className="tpf-kicker">{f.rarity === 'legend' ? 'Oh my… you caught' : 'You caught'}</div>
      <div className="tpf-art"><svg className="tpf-splash" viewBox="0 0 200 120" aria-hidden><path d="M20 80 Q30 40 70 46 Q90 18 128 34 Q170 28 178 64 Q196 94 150 100 Q100 116 56 104 Q14 104 20 80Z" fill="#cfe6ee" opacity=".7" />
        {[[24, 30], [176, 26], [186, 92], [14, 98], [100, 12]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r={3 + (i % 3)} fill="#a9d2e0" opacity=".8" />)}</svg>
        <Icon id={f.id} size={200} wash={false} />{isNew && <div className="tpf-stamp" aria-label="New to your journal"><span>New!</span></div>}</div>
      <h3 className="tpf-name">{t.name}</h3>
      <div className="tpf-meta"><span className="tpf-stars" aria-label={RARITY_LABEL[f.rarity]}>{[0, 1, 2, 3].map(i => <svg key={i} viewBox="0 0 20 20" className={i < n ? 'on' : ''}><path d="M10 2 L12.4 7.4 L18 8 L13.8 11.8 L15 17.6 L10 14.6 L5 17.6 L6.2 11.8 L2 8 L7.6 7.4Z" /></svg>)}<i>{RARITY_LABEL[f.rarity]}</i></span>
        {size != null && <span className="tpf-size"><svg viewBox="0 0 60 14" aria-hidden><path d="M2 7 H58" /><path d="M2 3 V11 M58 3 V11 M16 5 V9 M30 4 V10 M44 5 V9" /></svg><b className="tpx-num">{(+size).toFixed(size >= 100 ? 0 : 1)} cm</b>{isRecord && <em className="tpf-best">Personal best!</em>}</span>}</div>
      <p className="tpf-desc">{t.desc}</p>
      {line && <p className="tpf-where">Caught {line}.</p>}
      <div className="tpf-btns">{onRelease && <button className="tpx-btn" onClick={onRelease}>Let it go</button>}<button className="tpx-btn go" onClick={onClose}>Into the basket</button></div>
    </div></div>
}
export default CatchCard
