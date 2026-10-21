// <PhotoMode value onChange onShutter onClose touch pets lastShot /> (Stage C, art-c) — presentational photo-mode UI.
// value: { filter: FilterId, pose: HerPoseId, petPose: { pip: PetPoseId|null, mochi: PetPoseId|null }, pair: PairPoseId|null,
//          frame: boolean, grid: boolean, hideUI: boolean }
// onChange(next) gets the whole next value. onShutter() = take the picture (Codor: capture() -> gradeCanvas(img, value.filter,
// { frame: value.frame, caption }) -> download + photoThumb for the journal). pets: { pip: bool, mochi: bool } = nearby.
// lastShot: { url, caption } | null -> the little polaroid that pops into the corner after a shot.
// The live filter itself: applyLiveFilter(gl.domElement, value.filter) (Codor), overlay layers are drawn here.
// Keys: Space/Enter shutter · 1–7 filters · G grid · F frame · H hide/show UI · Esc or P close.
import React, { useEffect, useState } from 'react'
import { FILTERS, FILTER_IDS, filterCss, layerStyle } from './filters.js'
import { HER_POSE_IDS, HER_POSE_LABELS } from '../../art/poses/herPoses.js'
import { PET_POSE_IDS, PET_POSE_LABELS, PAIR_POSES, PAIR_POSE_IDS } from '../../art/poses/petPoses.js'
import '../../art/parchment.css'
import './photo.css'
const ink = { fill: 'none', stroke: '#3b2f22', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }
export const PHOTO_DEFAULT = { filter: 'none', pose: 'stand', petPose: { pip: null, mochi: null }, pair: null, frame: false, grid: false, hideUI: false }
// a tiny watercolour landscape, filtered like the real view, as each filter's swatch
function Swatch({ id }) {
  const F = FILTERS[id]
  return <span className="tpp-sw"><svg viewBox="0 0 60 60" style={{ filter: filterCss(id) === 'none' ? undefined : filterCss(id) }} aria-hidden>
    <rect width="60" height="60" fill="#9fd0ec" /><circle cx="44" cy="17" r="7" fill="#fff1b8" /><path d="M-4 40 Q14 26 30 36 Q44 26 64 34 V60 H-4Z" fill="#8fc46e" /><path d="M-4 48 Q20 40 64 46 V60 H-4Z" fill="#6fae5c" />
    <path d="M14 42 V30 L20 25 L26 30 V42Z" fill="#fbf3e4" /><path d="M12 31 L20 23 L28 31Z" fill="#d9655b" /><circle cx="40" cy="38" r="6" fill="#4f8f4a" /><path d="M40 44 V48" stroke="#7a4e34" strokeWidth="2" /></svg>
    {F.layers.map((L, i) => <i key={i} style={layerStyle(L)} />)}</span>
}
const Doodle = ({ k }) => <svg className="tpp-dd" viewBox="0 0 32 32" aria-hidden>{{
  camera: <><path d="M4 11 Q4 8 7 8 H11 L13 5 H19 L21 8 H25 Q28 8 28 11 V24 Q28 27 25 27 H7 Q4 27 4 24Z" {...ink} fill="#f6e3c0" /><circle cx="16" cy="17" r="5.5" {...ink} fill="#9fc6dc" /><circle cx="14.5" cy="15.5" r="1.5" fill="#fff" /></>,
  grid: <><rect x="5" y="6" width="22" height="20" rx="2" {...ink} /><path d="M12.3 6 V26 M19.6 6 V26 M5 12.7 H27 M5 19.4 H27" {...ink} strokeWidth="1.3" strokeDasharray="2 2" /></>,
  frame: <><rect x="5" y="4" width="22" height="24" rx="1.5" {...ink} fill="#fbf3e4" /><rect x="8" y="7" width="16" height="13" {...ink} fill="#9fd0ec" strokeWidth="1.4" /><path d="M9 24 H20" {...ink} strokeWidth="1.3" /></>,
  eye: <><path d="M3 16 Q16 5 29 16 Q16 27 3 16Z" {...ink} fill="#fffaf0" /><circle cx="16" cy="16" r="4.4" {...ink} fill="#7fa3c8" /></>,
  her: <><circle cx="16" cy="9" r="5" {...ink} fill="#f7d3b8" /><path d="M11 8 Q16 2 21 8" {...ink} fill="#3b2a22" /><path d="M9 28 Q10 16 16 15 Q22 16 23 28Z" {...ink} fill="#e0614f" /></>,
  pip: <><path d="M7 13 L9 5 L13 10 H19 L23 5 L25 13 Q27 22 16 25 Q5 22 7 13Z" {...ink} fill="#d9772f" /><path d="M10 18 Q16 25 22 18 Q19 23 16 23 Q13 23 10 18Z" fill="#fbecd6" /><circle cx="12" cy="15" r="1.4" fill="#1a1410" /><circle cx="20" cy="15" r="1.4" fill="#1a1410" /><path d="M15 19 h2" {...ink} /></>,
  mochi: <><path d="M6 14 L8 4 L13 10 H19 L24 4 L26 14 Q27 25 16 26 Q5 25 6 14Z" {...ink} fill="#f2a65e" /><path d="M14 6.5 L16 10 L18 6.5" {...ink} strokeWidth="1.4" stroke="#c8682a" /><path d="M12 15 q1 -1.5 2 0 M18 15 q1 -1.5 2 0" {...ink} strokeWidth="1.6" /><path d="M14 19 q2 2 4 0 M3 18 H9 M23 18 H29" {...ink} strokeWidth="1.2" /></>,
  pair: <><circle cx="11" cy="15" r="7" {...ink} fill="#d9772f" /><circle cx="21" cy="17" r="6" {...ink} fill="#f2a65e" /><path d="M14 6 q2 -3 4 0 q2 -3 4 0 q0 3 -4 5 q-4 -2 -4 -5Z" {...ink} fill="#e98a86" strokeWidth="1.4" /></>,
}[k]}</svg>
function Chip({ on, children, onClick, disabled, title }) { return <button className={'tpp-chip' + (on ? ' on' : '')} onClick={onClick} disabled={disabled} title={title} aria-pressed={!!on}>{children}</button> }
export function PhotoMode({ value = PHOTO_DEFAULT, onChange, onShutter, onClose, touch = false, pets = { pip: true, mochi: true }, lastShot = null, defaultTab = 'filters' }) {
  const v = { ...PHOTO_DEFAULT, ...value, petPose: { ...PHOTO_DEFAULT.petPose, ...(value.petPose || {}) } }
  const [tab, setTab] = useState(defaultTab), [flash, setFlash] = useState(0)
  const set = (patch) => onChange && onChange({ ...v, ...patch })
  const shoot = () => { setFlash(f => f + 1); onShutter && onShutter() }
  const setPair = (id) => { const P = PAIR_POSES[id]; if (!P) return set({ pair: null }); set({ pair: id, pose: P.her, petPose: { pip: pets.pip ? P.pip.pose : null, mochi: pets.mochi ? P.mochi.pose : null } }) }
  useEffect(() => {
    const k = (e) => { if (e.repeat || e.target?.tagName === 'INPUT') return
      if (e.code === 'Escape' || e.code === 'KeyP') { e.preventDefault(); onClose && onClose() }
      else if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); shoot() }
      else if (/^Digit[1-7]$/.test(e.code)) set({ filter: FILTER_IDS[+e.code.slice(5) - 1] })
      else if (e.code === 'KeyG') set({ grid: !v.grid }); else if (e.code === 'KeyF') set({ frame: !v.frame }); else if (e.code === 'KeyH') set({ hideUI: !v.hideUI }) }
    addEventListener('keydown', k); return () => removeEventListener('keydown', k)
  })
  const F = FILTERS[v.filter] || FILTERS.none
  return <div className={'tpx tpp' + (v.hideUI ? ' hidden' : '') + (touch ? ' touch' : '')}>
    <div className="tpp-layers" aria-hidden>{F.layers.map((L, i) => <i key={v.filter + i} style={layerStyle(L)} />)}</div>
    {v.grid && <svg className="tpp-grid" viewBox="0 0 300 300" preserveAspectRatio="none" aria-hidden><path d="M100 0 V300 M200 0 V300 M0 100 H300 M0 200 H300" /></svg>}
    {v.frame && <div className="tpp-mat" aria-hidden />}
    <svg className="tpp-corners" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden><path d="M2 12 V2 H12 M88 2 H98 V12 M98 88 V98 H88 M12 98 H2 V88" /></svg>
    {flash > 0 && <div key={flash} className="tpp-flash" aria-hidden />}
    {v.hideUI ? <button className="tpx-paper tpp-show" onClick={() => set({ hideUI: false })} aria-label="Show photo controls"><Doodle k="eye" /></button> : <>
      <div className="tpp-top">
        <div className="tpx-paper tpp-tag"><Doodle k="camera" /><b>Photo mode</b><small>{touch ? 'drag to look · pinch to zoom' : 'drag to look · WASD to glide · scroll to zoom'}</small></div>
        <div className="tpp-tbtns">
          <button className={'tpx-paper tpp-ib' + (v.grid ? ' on' : '')} onClick={() => set({ grid: !v.grid })} aria-pressed={v.grid} title="Grid (G)"><Doodle k="grid" /></button>
          <button className={'tpx-paper tpp-ib' + (v.frame ? ' on' : '')} onClick={() => set({ frame: !v.frame })} aria-pressed={v.frame} title="Paper frame (F)"><Doodle k="frame" /></button>
          <button className="tpx-paper tpp-ib" onClick={() => set({ hideUI: true })} title="Hide controls (H)"><Doodle k="eye" /></button>
          <button className="tpx-paper tpp-ib tpp-close" onClick={onClose} aria-label="Leave photo mode" title="Close (Esc)"><svg viewBox="0 0 24 24"><path d="M5 5 L19 19 M19 5 L5 19" /></svg></button></div></div>
      <div className="tpp-bottom">
        <div className="tpx-paper tpp-tray">
          <div className="tpp-tabs" role="tablist">{[['filters', 'Filters', 'camera'], ['her', 'Her pose', 'her'], ['pets', 'Pip & Mochi', 'pair']].map(([id, l, d]) =>
            <button key={id} role="tab" aria-selected={tab === id} className={'tpp-tab' + (tab === id ? ' on' : '')} onClick={() => setTab(id)}><Doodle k={d} />{l}</button>)}</div>
          {tab === 'filters' && <div className="tpp-row">{FILTER_IDS.map((id, i) => <button key={id} className={'tpp-flt' + (v.filter === id ? ' on' : '')} onClick={() => set({ filter: id })} aria-pressed={v.filter === id} title={`${FILTERS[id].label} (${i + 1})`}>
            <Swatch id={id} /><b>{FILTERS[id].label}</b><small>{FILTERS[id].sub}</small></button>)}</div>}
          {tab === 'her' && <div className="tpp-row chips">{HER_POSE_IDS.map(id => <Chip key={id} on={v.pose === id} onClick={() => set({ pose: id, pair: null })}>{HER_POSE_LABELS[id]}</Chip>)}</div>}
          {tab === 'pets' && <div className="tpp-pets">
            <div className="tpp-prow"><span className="tpp-who"><Doodle k="pair" />Together</span><div className="tpp-row chips">{PAIR_POSE_IDS.map(id => <Chip key={id} on={v.pair === id} disabled={!pets.pip && !pets.mochi} onClick={() => setPair(v.pair === id ? null : id)}>{PAIR_POSES[id].label}</Chip>)}</div></div>
            {['pip', 'mochi'].map(p => <div key={p} className="tpp-prow"><span className="tpp-who"><Doodle k={p} />{p === 'pip' ? 'Pip' : 'Mochi'}</span>
              {pets[p] ? <div className="tpp-row chips"><Chip on={!v.petPose[p]} onClick={() => set({ pair: null, petPose: { ...v.petPose, [p]: null } })}>Free</Chip>{PET_POSE_IDS[p].map(id => <Chip key={id} on={v.petPose[p] === id} onClick={() => set({ pair: null, petPose: { ...v.petPose, [p]: id } })}>{PET_POSE_LABELS[id]}</Chip>)}</div>
                : <span className="tpp-away">{p === 'pip' ? 'Pip is off sniffing something.' : 'Mochi is napping somewhere.'} Come closer to them.</span>}</div>)}</div>}
        </div>
        <button className="tpp-shutter" onClick={shoot} aria-label="Take the photo (Space)"><span /></button>
      </div></>}
    {lastShot && <div className="tpp-last" key={lastShot.url}><img src={lastShot.url} alt="" /><span>{lastShot.caption || 'Saved to your journal'}</span></div>}
  </div>
}
export default PhotoMode
