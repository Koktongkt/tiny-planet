// <ErrandsBoard errands={Errand[]} inventory={Record<string,number>} onDeliver={(errandId)=>void} onClose /> (Stage B)
// A Ghibli notice board: a wooden board with a little roof, paper notes pinned or taped at slight angles, each with
// hand-drawn icons of what's wanted (have/need), the reward, and the giver's signature. States per note:
//   open (not enough yet) -> ready ("Hand over" button glows) -> done (faded + red "Thank you" stamp).
// Optional (not in the contract): names ({npcId: 'Gonta'}; default: talk/profiles.js), onAccept(errandId) + errand.accepted
// (shows a "Take it" step before delivering), day (header "Day 4").
import React, { useEffect } from 'react'
import { Icon, IconDefs } from '../../game/icons.jsx'
import { itemName } from '../../game/items.js'
import { PROFILES } from '../../talk/profiles.js'
import { Heart, HeartDefs } from '../gifts/Hearts.jsx'
import '../../art/parchment.css'
import './errands.css'
const NOTE = ['#fffaf0', '#fff4d6', '#fde8ea', '#eef4e2']
const TILT = [-2.4, 1.8, -1.2, 2.6, -1.8, 1.1]
const giver = (id, names) => (names && names[id]) || PROFILES[id]?.name || id
const roleOf = (id) => PROFILES[id]?.role
export const errandState = (e, inv = {}) => e.done ? 'done' : e.wants.every(w => (inv[w.itemId] || 0) >= w.count) ? 'ready' : 'open'
function Pin({ k }) { return k % 3 === 1 ? <span className="tpe-tape" /> : <svg className="tpe-pin" viewBox="0 0 20 20" aria-hidden><circle cx="10" cy="9" r="6.5" fill={['#d9655b', '#5f8fc4', '#e8b84a'][k % 3]} stroke="#3b2f22" strokeWidth="1.8" /><circle cx="8" cy="7" r="1.8" fill="#fff" opacity=".8" /></svg> }
function Stamp() { return <svg className="tpe-stamp" viewBox="0 0 120 120" aria-hidden><defs><path id="tpe-arc" d="M22 60 A38 38 0 1 1 98 60" /></defs>
  <g fill="none" stroke="#c0403a" strokeWidth="4" opacity=".85"><circle cx="60" cy="60" r="52" /><circle cx="60" cy="60" r="44" strokeWidth="1.8" /></g>
  <text fontFamily="TPSerif,Georgia,serif" fontStyle="italic" fontWeight="600" fontSize="17" fill="#c0403a" letterSpacing="2"><textPath href="#tpe-arc" startOffset="50%" textAnchor="middle">THANK YOU</textPath></text>
  <path d="M38 64 L54 80 L84 44" fill="none" stroke="#c0403a" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" opacity=".9" /></svg> }
function Note({ e, k, inv, names, onDeliver, onAccept }) {
  const st = errandState(e, inv), needAccept = onAccept && !e.accepted && !e.done, role = roleOf(e.npcId)
  return <article className={'tpe-note s-' + st + (needAccept ? ' s-new' : '')} style={{ '--tilt': TILT[k % TILT.length] + 'deg', '--paper': NOTE[k % NOTE.length] }}>
    <Pin k={k} />
    <h4>{e.wants.length > 1 ? 'Could you bring…' : 'Wanted:'}</h4>
    <ul className="tpe-wants">{e.wants.map(w => { const have = Math.min(w.count, inv[w.itemId] || 0), ok = have >= w.count
      return <li key={w.itemId} className={ok ? 'ok' : ''}><Icon id={w.itemId} size={44} /><span className="nm">{itemName(w.itemId)}</span><span className="tpx-num ct">{e.done ? '' : <>{have}/{w.count}</>}{!e.done && ok && ' ✓'}</span></li> })}</ul>
    <div className="tpe-reward"><span className="lbl">Reward</span>
      {e.reward.itemId && <span className="rw"><Icon id={e.reward.itemId} size={28} wash={false} />{itemName(e.reward.itemId)}</span>}
      {e.reward.coins ? <span className="rw"><Icon id="coin" size={26} wash={false} /><b className="tpx-num">{e.reward.coins}</b></span> : null}
      {e.reward.hearts ? <span className="rw">{Array.from({ length: Math.ceil(e.reward.hearts) }, (_, i) => <Heart key={i} size={18} fill={1} />)}</span> : null}
    </div>
    <p className="tpe-sig">— {giver(e.npcId, names)}{role ? <small>, {role}</small> : null}</p>
    <div className="tpe-act">
      {e.done ? <span className="tpe-donetxt">Delivered</span>
        : needAccept ? <button className="tpx-btn" onClick={() => onAccept(e.id)}>Take it</button>
          : <button className={'tpx-btn' + (st === 'ready' ? ' go glow' : '')} disabled={st !== 'ready'} onClick={() => onDeliver && onDeliver(e.id)}>{st === 'ready' ? 'Hand over' : 'Not yet'}</button>}
    </div>
    {e.done && <Stamp />}
  </article>
}
export function ErrandsBoard({ errands = [], inventory = {}, onDeliver, onClose, onAccept, names, day }) {
  useEffect(() => { const k = (ev) => { if (ev.key === 'Escape') onClose && onClose() }; addEventListener('keydown', k); return () => removeEventListener('keydown', k) }, [onClose])
  const open = errands.filter(e => !e.done).length
  return <div className="tpx tpx-veil tpe-veil" onPointerDown={(ev) => { if (ev.target === ev.currentTarget) onClose && onClose() }}>
    <IconDefs /><HeartDefs />
    <section className="tpe-board" role="dialog" aria-label="Village errands board">
      <div className="tpe-roof" aria-hidden />
      <header className="tpe-sign"><h3>Village Errands</h3><small>{day != null ? `Day ${day} · ` : ''}{open ? `${open} request${open > 1 ? 's' : ''} pinned up` : 'All done for today'}</small></header>
      <button className="tpx-x tpe-x" aria-label="Close" onClick={onClose}><svg viewBox="0 0 24 24"><path d="M5 5 L19 19 M19 5 L5 19" /></svg></button>
      <div className="tpe-cork tpx-scroll">
        {errands.length === 0 ? <div className="tpe-empty"><Icon id="leaf" size={54} /><p>No requests today.<br />Come back tomorrow morning.</p></div>
          : <div className="tpe-notes">{errands.map((e, k) => <Note key={e.id} e={e} k={k} inv={inventory} names={names} onDeliver={onDeliver} onAccept={onAccept} />)}</div>}
      </div>
    </section>
  </div>
}
export default ErrandsBoard
