// <GiftReaction kind={'love'|'like'|'neutral'|'dislike'} /> (Stage B contract)
// A small self-playing popup (~1.8 s): hearts burst (love), a couple of hearts (like), a soft "…" (neutral) or a sweat
// drop + squiggle (dislike). Positioned by its parent: by default centred in a 0-size anchor, so Codor can drop it in
// a container placed over the villager's head (e.g. the talk bubble anchor). Optional: label (override text),
// onDone() (fires when the animation ends), style.
import React, { useEffect } from 'react'
import { HEART_D, HeartDefs } from './Hearts.jsx'
import './gifts.css'
const TXT = { love: 'Oh, I love it!', like: 'Thank you!', neutral: 'Oh… thanks.', dislike: 'Hmm, not for me…' }
const H = ({ cls, style, fill = '#ec6f80' }) => <svg className={cls} style={style} viewBox="0 0 32 30" aria-hidden><path d={HEART_D} fill={fill} stroke="#3b2f22" strokeWidth="2.2" strokeLinejoin="round" /><path d="M8 9 Q9.6 6.8 12 7" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity=".85" /></svg>
export function GiftReaction({ kind = 'like', label, onDone, style }) {
  useEffect(() => { if (!onDone) return; const t = setTimeout(onDone, 1900); return () => clearTimeout(t) }, [kind])
  const burst = kind === 'love' ? 8 : kind === 'like' ? 3 : 0
  return <div className={'tpx tpg-react k-' + kind} style={style} role="status" aria-label={label || TXT[kind]}>
    <HeartDefs />
    <div className="tpg-fx">
      {kind === 'love' && <span className="tpg-ring" />}
      {Array.from({ length: burst }, (_, i) => { const a = kind === 'love' ? (i / burst) * 360 - 90 : -90 + (i - 1) * 32, d = kind === 'love' ? 46 + (i % 2) * 14 : 38 + (i % 2) * 8
        return <H key={i} cls="tpg-fly" fill={i % 3 === 2 ? '#ff9fae' : '#ec6f80'} style={{ '--dx': Math.cos(a * Math.PI / 180) * d + 'px', '--dy': Math.sin(a * Math.PI / 180) * d + 'px', '--d': (i * 0.05) + 's', '--s': kind === 'love' ? 0.8 + (i % 3) * 0.2 : 0.9 }} /> })}
      {(kind === 'love' || kind === 'like') && <H cls="tpg-big" />}
      {kind === 'neutral' && <svg className="tpg-dots" viewBox="0 0 48 20" aria-hidden>{[8, 24, 40].map((x, i) => <circle key={i} cx={x} cy="10" r="4.2" fill="#fbf3e4" stroke="#3b2f22" strokeWidth="2" style={{ animationDelay: i * 0.18 + 's' }} />)}</svg>}
      {kind === 'dislike' && <>
        <svg className="tpg-sweat" viewBox="0 0 24 32" aria-hidden><path d="M12 2 Q22 16 21 21 Q20 30 12 30 Q4 30 3 21 Q2 16 12 2Z" fill="#a8d8f0" stroke="#3b2f22" strokeWidth="2.2" strokeLinejoin="round" /><path d="M8 19 Q8 24 11 26" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" /></svg>
        <svg className="tpg-squig" viewBox="0 0 40 24" aria-hidden><path d="M3 14 Q8 4 13 14 T23 14 T33 14 T39 12" fill="none" stroke="#3b2f22" strokeWidth="2.4" strokeLinecap="round" /></svg>
      </>}
    </div>
    <span className="tpg-say">{label || TXT[kind]}</span>
  </div>
}
export default GiftReaction
