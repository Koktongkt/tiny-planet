// <DonateCard itemId onDonate onClose mode? donatedDay? have? /> (art-c item 7) — Professor Hoshino's catalogue card.
// mode 'donate' (default): the item, her note, the plaque he'd write, and Donate / Keep it. After onDonate() the card
// thanks her (one of HOSHINO_LINES.donate) until closed. mode 'inspect': a donated piece seen in the hall (plaque + day).
import React, { useState } from 'react'
import { Icon, IconDefs } from '../../game/icons.jsx'
import { registerFishIcons } from '../../art/fish/icons.jsx'
import { registerRelicIcons } from '../../art/museum/icons.jsx'
import { HoshinoPortrait } from '../../art/museum/portrait.jsx'
import { PLAQUE_TEXT, HOSHINO_LINES, FISH_TEXT } from '../../game/itemsC.js'
import { entryName, entryBlurb } from '../journal/text.js'
import '../../art/parchment.css'
import './donate.css'
registerFishIcons(); registerRelicIcons()
const kindOf = (id) => (FISH_TEXT[id] ? 'fish' : 'relic')
const X = () => <svg viewBox="0 0 24 24"><path d="M6 6 L18 18 M18 6 L6 18" /></svg>
export function DonateCard({ itemId, onDonate, onClose, mode = 'donate', donatedDay, have, line }) {
  const [done, setDone] = useState(false), e = { id: itemId, kind: kindOf(itemId) }, name = entryName(e)
  const thanks = line || HOSHINO_LINES.donate[(itemId || '').length % HOSHINO_LINES.donate.length]
  const inspect = mode === 'inspect' || done
  return <div className="tpx tpx-veil dn-veil" onPointerDown={ev => { if (ev.target === ev.currentTarget && onClose) onClose() }}>
    <IconDefs />
    <div className="tpx-paper dn-card" role="dialog" aria-label={inspect ? name : `Donate ${name}?`}>
      <button className="tpx-x dn-x" aria-label="Close" onClick={onClose}><X /></button>
      <div className="dn-who"><HoshinoPortrait size={92} mood={done ? 'happy' : 'curious'} /><span>Prof. Hoshino</span></div>
      <div className="dn-main">
        <div className="dn-item"><span className="dn-ic"><Icon id={itemId} size={84} /></span><div><h3>{name}</h3><small>{e.kind === 'fish' ? 'for the tank' : 'for a plinth'}{have > 1 && !inspect ? ` · you have ${have}` : ''}</small></div></div>
        <p className="dn-blurb">{entryBlurb(e)}</p>
        <div className="dn-plaque"><i />{PLAQUE_TEXT[itemId] || 'A curious thing. I shall need to think about this one.'}{inspect && donatedDay != null && <small> — catalogued on day {donatedDay + 1}</small>}</div>
        {done ? <p className="dn-say">“{thanks}”</p> : mode === 'donate' ? <p className="dn-say">“May I put it on show? It would be in very good company.”</p> : null}
        <div className="dn-btns">{mode === 'donate' && !done
          ? <><button className="tpx-btn" onClick={onClose}>Keep it</button><button className="tpx-btn go" onClick={() => { const ok = onDonate ? onDonate(itemId) : true; if (ok !== false) setDone(true) }}>Donate</button></>
          : <button className="tpx-btn" onClick={onClose}>{done ? 'You’re welcome' : 'Lovely'}</button>}</div>
      </div>
    </div>
  </div>
}
export default DonateCard
