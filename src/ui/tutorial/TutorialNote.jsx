// <TutorialNote steps={Step[]} touch open onToggle onDismiss /> (Stage C, art-c) — presentational only.
// A first-day letter from Grandma Fuku (profiles key 'grandma'), pinned with washi tape. Steps tick off with an inked
// check + wavy strike; the running stitch along the bottom fills one stitch per finished step.
// Step: { id: 'move'|'look'|'gather'|'craft'|'talk'|'garden'|'sleep', text, textTouch?, icon?, done }
// open (default true): full note; false: a small pinned slip. onToggle(nextOpen) folds/unfolds; onDismiss() puts it away
// for good (Settings → "Read Grandma's note again" brings it back: SettingsPanel onTutorial).
import React from 'react'
import { TUTORIAL_STEPS, TUTORIAL_SIGNER } from './steps.js'
import '../../art/parchment.css'
import './tutorial.css'
const ink = { fill: 'none', stroke: '#3b2f22', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }
// tiny hand-inked doodles (viewBox 0 0 32 32)
const DOODLE = {
  move: <><path d="M9 22 q-3 -5 1 -9 q4 2 2 8 Z" {...ink} fill="#e9d3a8" /><path d="M19 16 q-3 -5 1 -9 q4 2 2 8 Z" {...ink} fill="#e9d3a8" /><circle cx="10" cy="25" r="1.6" fill="#3b2f22" /><circle cx="20" cy="19" r="1.6" fill="#3b2f22" /></>,
  look: <><path d="M4 16 Q16 5 28 16 Q16 27 4 16Z" {...ink} fill="#fffaf0" /><circle cx="16" cy="16" r="4.6" {...ink} fill="#7fa3c8" /><circle cx="17.4" cy="14.6" r="1.3" fill="#fff" /></>,
  gather: <><path d="M16 27 Q15 19 16 13" {...ink} stroke="#5a8a44" />{[0, 72, 144, 216, 288].map(a => <ellipse key={a} cx="16" cy="8.5" rx="2.6" ry="4.4" transform={`rotate(${a} 16 12)`} {...ink} fill="#f4b6c8" strokeWidth="1.6" />)}<circle cx="16" cy="12" r="2.2" fill="#f2c94c" {...ink} strokeWidth="1.4" /></>,
  craft: <><path d="M6 25 L18 13" {...ink} strokeWidth="3" stroke="#8a5a3c" /><path d="M15 8 L23 5 L27 10 L20 15Z" {...ink} fill="#b8b4ae" /><path d="M23 20 l1.5 3 l3 1.5 l-3 1.5 l-1.5 3 l-1.5 -3 l-3 -1.5 l3 -1.5Z" fill="#f2c94c" {...ink} strokeWidth="1.3" /></>,
  talk: <><path d="M5 8 Q5 4 10 4 H22 Q27 4 27 8 V15 Q27 19 22 19 H14 L8 25 L9.5 19 Q5 19 5 15Z" {...ink} fill="#fffaf0" /><path d="M11 11.5 h10 M11 15 h6" {...ink} strokeWidth="1.6" /></>,
  garden: <><path d="M5 25 Q16 21 27 25" {...ink} stroke="#8a5a3c" /><path d="M16 24 V14" {...ink} stroke="#5a8a44" /><path d="M16 16 Q9 15 8 8 Q15 8 16 16Z" {...ink} fill="#9cc46a" /><path d="M16 14 Q22 12 24 6 Q17 6 16 14Z" {...ink} fill="#8fbf6a" /></>,
  sleep: <><path d="M20 5 A11 11 0 1 0 27 21 A9 9 0 0 1 20 5Z" {...ink} fill="#f6e3a6" /><path d="M23 9 h4 l-4 4 h4" {...ink} strokeWidth="1.5" /></>,
}
const Doodle = ({ k }) => <svg className="doodle" viewBox="0 0 32 32" aria-hidden>{DOODLE[k] || DOODLE.gather}</svg>
const Box = ({ done }) => <svg className="box" viewBox="0 0 26 26" aria-hidden>
  <path d="M5 6 Q12 4.4 20.5 5.4 Q21.6 13 20.6 20.8 Q12.6 21.8 5.2 20.6 Q4 13 5 6Z" {...ink} fill="#fffaf0" strokeWidth="1.8" />
  {done && <path className="tick" d="M7.5 13 L11.5 17.5 L23 3.5" {...ink} stroke="#b0453a" strokeWidth="2.6" />}</svg>
const Strike = () => <svg className="strike" viewBox="0 0 200 10" preserveAspectRatio="none" aria-hidden><path d="M2 6 Q30 2 60 5.5 T120 5 T198 4.5" {...ink} stroke="#3b2f22b0" strokeWidth="1.6" vectorEffect="non-scaling-stroke" /></svg>
const Sprig = () => <svg className="tpt-sprig" viewBox="0 0 44 44" aria-hidden><path d="M8 38 Q18 26 34 8" {...ink} stroke="#5a8a44" />
  {[[14, 30, -40], [19, 24, 30], [24, 18, -35], [29, 12, 35]].map(([x, y, r], i) => <ellipse key={i} cx={x} cy={y} rx="6" ry="3" transform={`rotate(${r} ${x} ${y})`} {...ink} strokeWidth="1.5" fill={i % 2 ? '#9cc46a' : '#b6d68a'} />)}
  <circle cx="35" cy="7" r="3.2" {...ink} strokeWidth="1.5" fill="#f4b6c8" /></svg>
// running stitch: n stitches, `k` sewn in red thread, then the needle
function Stitch({ n, k }) {
  const w = 220, gap = w / (n + 0.6)
  return <svg className="tpt-stitch" viewBox="0 0 240 22" preserveAspectRatio="xMinYMid meet" aria-label={`${k} of ${n} done`}>
    {Array.from({ length: n }, (_, i) => { const x = 6 + i * gap; return <path key={i} d={`M${x} ${11 + (i % 2 ? 1 : -1)} q${gap * 0.3} -2 ${gap * 0.58} ${i % 2 ? -1 : 1}`} {...ink}
      stroke={i < k ? '#c0503f' : '#3b2f2240'} strokeWidth={i < k ? 2.6 : 1.8} strokeDasharray={i < k ? undefined : '2 3'} /> })}
    {k > 0 && k < n && <g transform={`translate(${6 + k * gap - 4} 4) rotate(28)`}><path d="M0 0 L3 16" {...ink} stroke="#8a8f99" strokeWidth="2" /><ellipse cx="0.3" cy="2" rx="1" ry="2.2" fill="none" stroke="#8a8f99" strokeWidth="1" /></g>}
    {k >= n && <path d={`M${6 + n * gap} 11 q6 -8 10 0 q-5 6 -10 0`} {...ink} stroke="#c0503f" strokeWidth="2" />}
  </svg>
}
const X = () => <svg viewBox="0 0 24 24"><path d="M5 5 L19 19 M19 5 L5 19" /></svg>
export function TutorialNote({ steps = TUTORIAL_STEPS, touch = false, open = true, onToggle, onDismiss, signer = TUTORIAL_SIGNER.name, className = '', style }) {
  const done = steps.filter(s => s.done).length, all = done >= steps.length, next = steps.find(s => !s.done)
  if (!open) return <div className={'tpx tpt ' + className} style={style}>
    <button className="tpx-paper tpt-slip" onClick={() => onToggle && onToggle(true)} aria-label="Open Grandma's note">
      <svg className="pin" viewBox="0 0 22 22" aria-hidden><circle cx="11" cy="9" r="6" {...ink} fill="#d9655b" /><circle cx="9" cy="7" r="1.6" fill="#fff" opacity=".8" /><path d="M11 15 V21" {...ink} /></svg>
      <b>{all ? 'All done, dear' : "Grandma's note"}</b><span className="tpx-num">{done}/{steps.length}</span></button></div>
  return <div className={'tpx tpt ' + className} style={style}>
    <div className="tpx-paper tpt-note" role="dialog" aria-label="Welcome note">
      <div className="tpt-head"><Sprig /><h3>{all ? 'Well done, dear!' : 'Welcome home, dear'}<small>{all ? 'You\'ll fit right in here.' : 'A few things for your first day'}</small></h3>
        <button className="tpx-x tpt-x" aria-label="Put the note away" onClick={() => onDismiss && onDismiss()}><X /></button></div>
      <ol>{steps.map(s => <li key={s.id} className={(s.done ? 'done' : '') + (s === next ? ' next' : '')}>
        <Box done={s.done} /><Doodle k={s.icon || s.id} /><span className="t">{touch && s.textTouch ? s.textTouch : s.text}{s.done && <Strike />}</span></li>)}</ol>
      <div className="tpt-foot"><Stitch n={steps.length} k={done} /><div className="tpt-sign">— {signer}<small>the bench by the square</small></div></div>
      <div className="tpt-btns">{all ? <button className="tpx-btn go" onClick={() => onDismiss && onDismiss()}>Thank you, Grandma</button>
        : <button className="tpx-btn" onClick={() => onToggle && onToggle(false)}>Fold it away</button>}</div>
    </div></div>
}
export default TutorialNote
