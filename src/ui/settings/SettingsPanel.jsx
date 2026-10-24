// <SettingsPanel value={{volume,music,muted,textScale}} onChange onClose /> (Stage B contract) — presentational only.
// onChange(next) receives the whole next value object ({...value, [key]: v}). Volumes are 0..1, textScale ~0.9..1.3.
// Optional keys are drawn only when present in `value`: sfx, ambience (0..1 sliders), minimap, reduceMotion (toggles).
// Stage C (art-c): optional onTutorial() draws a "Read Grandma's note again" row (reopens <TutorialNote>).
import React, { useEffect } from 'react'
import { Icon, IconDefs } from '../../game/icons.jsx'
import '../../art/parchment.css'
import './settings.css'
const SIZES = [[0.9, 'Small'], [1, 'Normal'], [1.15, 'Large'], [1.3, 'Huge']]
function Ico({ k }) { // tiny hand-inked glyphs
  const p = { fill: 'none', stroke: '#3b2f22', strokeWidth: 2.2, strokeLinecap: 'round', strokeLinejoin: 'round' }
  return <svg className="tps-ico" viewBox="0 0 32 32" aria-hidden>{{
    volume: <><path d="M5 12 H10 L17 6 V26 L10 20 H5Z" {...p} fill="#f4ead2" /><path d="M21 11 Q25 16 21 21 M24 7 Q31 16 24 25" {...p} /></>,
    music: <><path d="M12 24 V7 L26 4 V21" {...p} /><ellipse cx="9" cy="24" rx="4" ry="3" {...p} fill="#d9a85a" /><ellipse cx="23" cy="21" rx="4" ry="3" {...p} fill="#d9a85a" /></>,
    sfx: <><path d="M16 4 L19 12 L28 12 L21 18 L24 27 L16 21 L8 27 L11 18 L4 12 L13 12Z" {...p} fill="#fff1c9" /></>,
    ambience: <><path d="M6 22 Q10 12 16 20 Q20 8 26 18" {...p} /><path d="M4 26 H28" {...p} /><circle cx="24" cy="8" r="3" {...p} fill="#fbe6b0" /></>,
    muted: <><path d="M5 12 H10 L17 6 V26 L10 20 H5Z" {...p} fill="#f4ead2" /><path d="M21 12 L28 20 M28 12 L21 20" {...p} stroke="#c0503f" /></>,
    text: <><text x="4" y="25" fontFamily="TPSerif,Georgia,serif" fontStyle="italic" fontSize="22" fill="#3b2f22">A</text><text x="17" y="25" fontFamily="TPSerif,Georgia,serif" fontStyle="italic" fontSize="14" fill="#3b2f22">a</text></>,
    minimap: <><circle cx="16" cy="16" r="11" {...p} fill="#f1e2bf" /><path d="M8 18 Q14 12 18 17 T25 13" {...p} stroke="#5f8fc4" /><path d="M16 9 L19 16 L16 14 L13 16Z" {...p} fill="#d9655b" strokeWidth="1.6" /></>,
    note: <><path d="M8 5 H22 L26 9 V27 H8Z" {...p} fill="#fbf3e2" /><path d="M12 13 H22 M12 17 H22 M12 21 H18" {...p} strokeWidth="1.6" /><circle cx="15" cy="5" r="2.4" {...p} fill="#d9655b" strokeWidth="1.4" /></>,
    reduceMotion: <><path d="M6 16 Q11 10 16 16 T26 16" {...p} /><circle cx="26" cy="16" r="2.4" fill="#3b2f22" /></>,
    autoCook: <><path d="M8 14 h16 a8 7 0 0 1 -16 0 z" {...p} fill="#f4ead2" /><ellipse cx="16" cy="14" rx="8" ry="3" {...p} fill="#d2e6a4" /><path d="M22 16 h5" {...p} /></>,
  }[k]}</svg>
}
const LBL = { volume: 'Volume', music: 'Music', sfx: 'Sounds', ambience: 'Ambience', muted: 'Mute all', textScale: 'Text size', minimap: 'Minimap', reduceMotion: 'Calmer motion', autoCook: 'Auto-cook' }
function Slider({ k, v, set, dim }) {
  return <label className={'tps-row' + (dim ? ' dim' : '')}><Ico k={k} /><span className="tps-l">{LBL[k]}</span>
    <input type="range" min="0" max="1" step="0.05" value={v} onChange={e => set(k, +e.target.value)} style={{ '--v': v * 100 + '%' }} aria-label={LBL[k]} />
    <span className="tpx-num tps-pct">{Math.round(v * 100)}</span></label>
}
function Toggle({ k, v, set }) {
  return <div className="tps-row"><Ico k={k} /><span className="tps-l">{LBL[k]}</span>
    <button className={'tps-sw' + (v ? ' on' : '')} role="switch" aria-checked={!!v} aria-label={LBL[k]} onClick={() => set(k, !v)}><span className="knob" /><span className="t">{v ? 'On' : 'Off'}</span></button></div>
}
export function SettingsPanel({ value = {}, onChange, onClose, onTutorial }) {
  useEffect(() => { const k = (e) => { if (e.key === 'Escape') onClose && onClose() }; addEventListener('keydown', k); return () => removeEventListener('keydown', k) }, [onClose])
  const set = (k, v) => onChange && onChange({ ...value, [k]: v }), muted = !!value.muted, has = (k) => value[k] !== undefined
  return <div className="tpx tpx-veil" onPointerDown={(e) => { if (e.target === e.currentTarget) onClose && onClose() }}>
    <IconDefs />
    <div className="tpx-paper tpx-panel tps-panel" role="dialog" aria-label="Settings">
      <div className="tpx-head"><Icon id="gear" size={40} /><h3>Settings<small>Make yourself at home.</small></h3>
        <button className="tpx-x" aria-label="Close" onClick={onClose}><svg viewBox="0 0 24 24"><path d="M5 5 L19 19 M19 5 L5 19" /></svg></button></div>
      <div className="tpx-scroll">
        <h4 className="tps-h">Sound</h4>
        <Slider k="volume" v={value.volume ?? 1} set={set} dim={muted} />
        <Slider k="music" v={value.music ?? 1} set={set} dim={muted} />
        {has('sfx') && <Slider k="sfx" v={value.sfx} set={set} dim={muted} />}
        {has('ambience') && <Slider k="ambience" v={value.ambience} set={set} dim={muted} />}
        <Toggle k="muted" v={muted} set={set} />
        <h4 className="tps-h">Cooking</h4>
        {has('autoCook') && <Toggle k="autoCook" v={!!value.autoCook} set={set} />}
        <h4 className="tps-h">Reading &amp; view</h4>
        <div className="tps-row seg"><Ico k="text" /><span className="tps-l">{LBL.textScale}</span>
          <div className="tps-seg" role="radiogroup" aria-label="Text size">{SIZES.map(([s, n]) => <button key={s} role="radio" aria-checked={Math.abs((value.textScale ?? 1) - s) < 0.01} className={Math.abs((value.textScale ?? 1) - s) < 0.01 ? 'on' : ''} onClick={() => set('textScale', s)} style={{ fontSize: 15 * s + 'px' }}>{n}</button>)}</div></div>
        <p className="tps-sample" style={{ fontSize: 20 * (value.textScale ?? 1) + 'px' }}>“The wind smells of rain and warm bread.”</p>
        {has('minimap') && <Toggle k="minimap" v={value.minimap} set={set} />}
        {has('reduceMotion') && <Toggle k="reduceMotion" v={value.reduceMotion} set={set} />}
        {onTutorial && <div className="tps-row"><Ico k="note" /><span className="tps-l">Grandma's welcome note</span><button className="tpx-btn tps-note" onClick={onTutorial}>Read again</button></div>}
      </div>
      <div className="tps-foot"><button className="tpx-btn go" onClick={onClose}>Done</button></div>
    </div>
  </div>
}
export default SettingsPanel
