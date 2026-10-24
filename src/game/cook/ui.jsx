// Cooking overlay. One shell (timer, pointer, skip, toast) and four step plugs.
// DOM + SVG only. While it is open the WebGL loop idles and the HUD is hidden.
import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { _roots, invalidate } from '@react-three/fiber'
import { createStep, tickStep, resolveCook, calmMotion } from './logic.js'
import { fx } from './sfx.js'
import './cook.css'

// The overlay must not import game modules. Those are shared with the startup
// graph, and pulling them in would fetch this chunk during boot.
const game = () => window.__tp
const touchUi = () => document.documentElement.classList.contains('tp-touch')
const itemName = (id) => { const n = game() && game().itemName(id); return n || '' }

const INK = '#4a3a35'
function worldLoop(mode) {
  // The Canvas prop owns frameloop, so a store write gets reset. Pausing the
  // root (internal.active) stops the WebGL loop without that fight. One
  // invalidate() starts it again. The game clock clamps the resume delta.
  window.__tpWorldLoop = mode === 'always' ? 'always' : 'demand'
  let n = 0
  try {
    for (const root of _roots.values()) {
      const state = root.store && root.store.getState()
      if (!state || !state.internal) continue
      state.internal.active = mode === 'always'
      n++
    }
    if (mode !== 'always') { window.__calls = 0; window.__tris = 0 }
    if (mode === 'always') invalidate()
  } catch (e) {}
  return n
}
const TITLE = { stir: ['Stir', 'Draw circles, or hold Space'], flip: ['Flip', 'Tap when the fish is golden'], press: ['Press', 'Tap each ring as it closes'], pour: ['Pour', 'Hold, then let go on the line'] }

function Stage({ kind, refs }) {
  if (kind === 'flip') return <svg className="tp-cook-pad" ref={refs.pad} viewBox="0 0 320 260" data-step="flip">
    <rect x="70" y="150" width="180" height="28" rx="8" fill="#6a3a28" stroke={INK} strokeWidth="3" />
    <rect x="78" y="118" width="164" height="36" rx="6" fill="#e39a3c" stroke={INK} strokeWidth="2" />
    <g ref={refs.fish}><ellipse cx="160" cy="108" rx="78" ry="32" fill="#f3d2b0" stroke={INK} strokeWidth="3" /><polygon points="228,108 262,86 258,128" fill="#e2b090" stroke={INK} strokeWidth="3" /><circle cx="112" cy="102" r="4" fill={INK} /></g>
    <rect x="36" y="40" width="14" height="150" rx="6" fill="#fffaf0" stroke={INK} strokeWidth="2.4" />
    <rect ref={refs.band} x="36" y="92" width="14" height="36" fill="#e8c56a" />
    <rect ref={refs.mark} x="30" y="168" width="26" height="6" rx="2" fill={INK} />
  </svg>
  if (kind === 'press') return <svg className="tp-cook-pad" ref={refs.pad} viewBox="0 0 320 260" data-step="press">
    <ellipse cx="160" cy="210" rx="90" ry="18" fill="#e7d3b0" stroke={INK} strokeWidth="3" />
    {[0, 1, 2].map(i => <g key={i} ref={el => { refs.rings.current[i] = el }} transform={`translate(${70 + i * 90} 120)`}>
      <circle r="46" fill="none" stroke="#e8c56a" strokeWidth="3" opacity="0.35" />
      <circle className="hot" r="18" fill="#fff6d8" stroke={INK} strokeWidth="3" />
      <circle r="8" fill="#d9655b" />
    </g>)}
  </svg>
  if (kind === 'pour') return <svg className="tp-cook-pad" ref={refs.pad} viewBox="0 0 320 260" data-step="pour">
    <path d="M78 70 h70 v16 h18 l16 28 v-28 h8 v46 h-86 z" fill="#fbf3e4" stroke={INK} strokeWidth="3" />
    <path ref={refs.stream} d="M168 112 v40" fill="none" stroke="#8fd0e0" strokeWidth="6" strokeLinecap="round" opacity="0" />
    <path d="M150 168 h80 v44 a28 28 0 0 1 -80 0 z" fill="#fffaf0" stroke={INK} strokeWidth="3" />
    <path d="M230 176 h16 a16 22 0 0 1 0 36 h-16" fill="none" stroke={INK} strokeWidth="3" />
    <clipPath id="tp-cup"><rect x="154" y="150" width="72" height="70" /></clipPath>
    <rect ref={refs.level} x="154" y="214" width="72" height="0" fill="#c6e07a" clipPath="url(#tp-cup)" />
    <path d="M156 186 h68" ref={refs.line} stroke="#d9655b" strokeWidth="2" strokeDasharray="4 3" />
  </svg>
  return <svg className="tp-cook-pot" ref={refs.pad} viewBox="0 0 320 260" data-step="stir">
    <ellipse cx="160" cy="214" rx="78" ry="16" fill="#000" opacity="0.08" />
    <path d="M78 150 h164 a82 70 0 0 1 -164 0 z" fill="#f4ead2" stroke={INK} strokeWidth="3.4" />
    <ellipse cx="160" cy="150" rx="82" ry="26" fill="#6a8f4a" stroke={INK} strokeWidth="3.4" />
    <ellipse cx="160" cy="150" rx="64" ry="18" fill="#d2e6a4" />
    <g ref={refs.bubbles}>{[0, 1, 2, 3, 4].map(i => <circle key={i} cx={120 + i * 18} cy={148} r={4 + (i % 3)} fill="#fff" opacity="0.85" />)}</g>
    <path d="M242 150 h28 v10 h-28" fill="none" stroke={INK} strokeWidth="4" />
    <g ref={refs.spoon}><rect x="154" y="46" width="8" height="78" rx="3" fill="#e7d3b0" stroke={INK} strokeWidth="2" /><ellipse cx="158" cy="132" rx="16" ry="10" fill="#fbf3e4" stroke={INK} strokeWidth="2.4" /></g>
  </svg>
}

export function CookOverlay() {
  const sess = game().G.ui.cook
  const pad = useRef(null), fish = useRef(null), band = useRef(null), mark = useRef(null)
  const rings = useRef([]), stream = useRef(null), level = useRef(null), spoon = useRef(null), bubbles = useRef(null)
  const meter = useRef(null)
  const [toast, setToast] = useState(null)
  const refs = { pad, fish, band, mark, rings, stream, level, spoon, bubbles }
  useEffect(() => {
    if (!sess) return
    const calm = calmMotion() || !!(game().G.s.settings && game().G.s.settings.reduceMotion)
    const step = createStep(sess.step || 'stir', calm)
    const input = { space: false, down: false, taps: 0, dRevs: 0, ang: null }
    let raf = 0, last = performance.now(), stop = false, lastFx = 0, ending = false, pending = null
    const api = window.__tpCook || (window.__tpCook = {})
    const pub = () => {
      api._state = { step: step.kind, t: step.t, fill: step.fill || 0, rate: step.rate || 0, bubble: step.bubble || 0, progress: step.progress || 0, gold: !!step.gold, hot: !!step.hot, hits: step.landed || 0, level: step.level || 0, band: !!step.band, done: step.done, calm }
    }
    const paint = () => {
      const m = meter.current
      if (step.kind === 'stir') {
        if (m) { m.style.width = (step.fill * 100) + '%'; m.parentElement.classList.toggle('good', step.fill >= 1 && step.rate >= 0.22 && step.rate <= 0.45) }
        if (spoon.current) spoon.current.setAttribute('transform', `rotate(${step.revs * 360} 158 150)`)
        if (bubbles.current) bubbles.current.setAttribute('transform', `translate(0 ${-70 * step.bubble})`)
        if (pad.current) pad.current.dataset.fill = step.fill.toFixed(2)
      } else if (step.kind === 'flip') {
        const p = step.progress || 0
        if (m) m.style.width = (p * 100) + '%'
        if (mark.current) mark.current.setAttribute('y', String(168 - p * 128))
        if (fish.current) {
          const hot = p < 0.42 ? 0 : p > 0.62 ? Math.min(1, (p - 0.62) / 0.38) : 0
          const gold = p >= 0.42 && p <= 0.7 ? 1 : 0
          fish.current.querySelector('ellipse').setAttribute('fill', hot > 0.4 ? '#8a4a32' : gold ? '#e2a04a' : '#f3d2b0')
        }
        if (pad.current) pad.current.dataset.gold = step.gold ? '1' : '0'
      } else if (step.kind === 'press') {
        const { at, window: w } = step.marks
        for (let i = 0; i < 3; i++) {
          const g = rings.current[i]; if (!g) continue
          const u = Math.max(0, 1 - Math.abs(step.t - at[i]) / (w * 2.2))
          const c = g.querySelector('.hot')
          if (c) c.setAttribute('r', String(14 + u * 30))
          g.style.opacity = step.seen[i] ? 0.4 : 1
        }
        if (m) m.style.width = ((step.landed / 3) * 100) + '%'
        if (pad.current) pad.current.dataset.hot = step.hot ? '1' : '0'
      } else if (step.kind === 'pour') {
        if (level.current) { const h = step.level * 62; level.current.setAttribute('height', String(h)); level.current.setAttribute('y', String(214 - h)) }
        if (stream.current) stream.current.setAttribute('opacity', (input.down || input.space) && !step.done ? '0.9' : '0')
        if (m) { m.style.width = (step.level * 100) + '%'; m.parentElement.classList.toggle('good', step.band) }
        if (pad.current) pad.current.dataset.band = step.band ? '1' : '0'
      }
      pub()
    }
    const finish = (via) => {
      if (sess.settled || ending) return
      ending = true
      stop = true
      const forced = api.forced || null
      let perfect = !!(step.score && step.score.perfect)
      if (forced === 'perfect') perfect = true
      if (forced === 'normal') perfect = false
      if (via !== 'play') perfect = false
      const res = resolveCook(sess.recipe, { perfect, via })
      pending = res
      if (res.perfect) fx('cook_perfect')
      api.last = res
      pub()
      const name = itemName(res.item) || res.item
      setToast({ perfect: res.perfect, name })
      const go = () => {
        if (sess.settled) return
        sess.settled = true
        api._skip = api._finish = api._close = null
        game().G.ui.cook = null
        game().emit()
        sess.resolve(res)
      }
      if (api.hold) api._close = go
      else setTimeout(go, 780)
    }
    api._skip = () => finish('skip')
    api._finish = () => { if (!step.done) { step.done = true; step.score = step.score || { perfect: false, ok: true } }; finish('play') }
    api._close = () => finish('skip')
    const onKey = (e) => {
      if (e.code !== 'Space' && e.code !== 'Escape') return
      e.preventDefault(); e.stopPropagation()
      if (e.code === 'Escape') { if (e.type === 'keydown') finish('skip'); return }
      if (e.type === 'keydown') { if (!e.repeat) input.taps++; input.space = true }
      else input.space = false
    }
    const angOf = (e) => {
      const el = pad.current; if (!el) return null
      const b = el.getBoundingClientRect()
      return Math.atan2(e.clientY - (b.top + b.height / 2), e.clientX - (b.left + b.width / 2))
    }
    const down = (e) => {
      if (e.button != null && e.button !== 0) return
      input.down = true; input.taps++; input.ang = angOf(e)
      try { e.currentTarget.setPointerCapture && e.currentTarget.setPointerCapture(e.pointerId) } catch (err) {}
    }
    const move = (e) => {
      if (!input.down || step.kind !== 'stir') return
      const a = angOf(e); if (a == null || input.ang == null) { input.ang = a; return }
      let d = a - input.ang; if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2
      input.dRevs += Math.abs(d) / (Math.PI * 2); input.ang = a
    }
    const up = () => { input.down = false; input.ang = null }
    const block = (e) => { e.preventDefault() }
    document.documentElement.classList.add('tp-cooking')
    worldLoop('demand')
    addEventListener('keydown', onKey, true); addEventListener('keyup', onKey, true)
    document.addEventListener('touchmove', block, { passive: false })
    document.addEventListener('gesturestart', block, { passive: false })
    document.addEventListener('gesturechange', block, { passive: false })
    const el = pad.current
    if (el) { el.addEventListener('pointerdown', down); el.addEventListener('pointermove', move); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up) }
    if (step.kind === 'flip' || step.kind === 'pour') fx(step.kind === 'flip' ? 'cook_sizzle' : 'cook_pour')
    const loop = (now) => {
      if (stop || sess.settled) return
      const scale = Number.isFinite(+api.scale) ? +api.scale : 1
      const dt = Math.min(0.05, (now - last) / 1000) * scale
      last = now
      const tap = input.taps > 0; input.taps = 0
      const dRevs = input.dRevs; input.dRevs = 0
      const hold = input.down || input.space
      const release = step.kind === 'pour' && step._held && !hold
      step._held = hold
      if (!step.done) tickStep(step, dt, { space: input.space, dRevs, tap, hold, release })
      if (step.kind === 'stir' && (input.space || dRevs > 0) && now - lastFx > 420) { lastFx = now; fx('cook_stir') }
      if (step.kind === 'press' && tap) fx('craft')
      if (step.kind === 'flip' && step.done && step.flipped != null && !step._fx) { step._fx = 1; fx('cook_sizzle') }
      paint()
      if (step.done) { finish('play'); return }
      raf = requestAnimationFrame(loop)
    }
    paint()
    raf = requestAnimationFrame(loop)
    api.ready = true
    return () => {
      stop = true; api.ready = false; cancelAnimationFrame(raf)
      removeEventListener('keydown', onKey, true); removeEventListener('keyup', onKey, true)
      document.removeEventListener('touchmove', block)
      document.removeEventListener('gesturestart', block)
      document.removeEventListener('gesturechange', block)
      if (el) { el.removeEventListener('pointerdown', down); el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up) }
      document.documentElement.classList.remove('tp-cooking')
      worldLoop('always')
      if (!sess.settled) {
        sess.settled = true
        const res = pending || resolveCook(sess.recipe, { perfect: false, via: 'skip' })
        api.last = res
        sess.resolve(res)
      }
    }
  }, [sess])
  if (!sess) return null
  const [title, hint] = TITLE[sess.step] || TITLE.stir
  const key = touchUi() ? '' : ' · Space'
  return createPortal(<div className={'tp-cook' + (toast ? ' done' : '')} role="dialog" aria-label="Cooking" style={{ touchAction: 'none' }}>
    <div className="tp-cook-card paper">
      <div className="tp-cook-top"><h3>{title}<small>{itemName(sess.recipe.makes)}</small></h3>
        <button className="tp-cook-skip" type="button" onClick={() => window.__tpCook && window.__tpCook.skip()}>Skip</button></div>
      <div className="tp-cook-stage"><Stage kind={sess.step} refs={refs} />
        {toast && <div className="tp-cook-toast paper" role="status"><span className="spark">{toast.perfect ? '✦' : '♡'}</span>{toast.name}<b>{toast.perfect ? 'Perfect' : 'Nicely done'}</b></div>}
      </div>
      <div className="tp-cook-meter" aria-hidden><i ref={meter} /></div>
      <p className="tp-cook-hint">{hint}{key}. Skip keeps an ordinary dish.</p>
    </div>
  </div>, document.body)
}
export default CookOverlay
