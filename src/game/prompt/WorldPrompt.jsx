// In-world action prompt (DOM side). Full weight: a glass head bubble over the target, the second action (F/G) stacked
// above as a smaller bubble. Light weight (quick pickups): a small E + item chip, shown only as a reminder (hints.js).
// The canvas side calls placePrompt() every frame; it moves the element directly (no React state), like Talk's bubble.
// Spec: docs/superpowers/specs/2026-11-23-in-world-prompts-design.md
import React from 'react'
import * as THREE from 'three'
import { TOUCH } from '../../touch.jsx'
import { G } from '../store.js'
import { ITEMS } from '../items.js'
import { NEEDS_TOOL } from '../recipes.js'
import { Icon } from '../icons.jsx'
import { placeBubble } from './logic.js'
import { chipShows } from './hints.js'
import './prompt.css'

export const PROMPT = { el: null, pt: { x: 0, y: 0, behind: false }, idleMs: 0, id: null, box: null, hide: null }
if (typeof window !== 'undefined') window.__prompt = PROMPT

// words and icon for a target (same wording as the old bottom prompt)
export function promptLabel(n) {
  if (n.kind === 'ext') return { icon: n.icon, verb: n.verb, name: n.name }
  if (n.kind === 'bench') return { icon: 'book', verb: 'Craft at', name: 'the bench' }
  if (n.kind === 'chest') return { icon: 'skyseed', verb: 'Open', name: 'the picnic chest' }
  if (n.kind === 'decor') return { icon: n.item, verb: 'Pick up', name: ITEMS[n.item].name, item: n.item }
  const it = n.spot.item
  return { icon: it, item: it, name: it === 'wool' ? 'the sheep' : ITEMS[it].name, verb: it === 'fish' ? 'Fish for' : it === 'wool' ? 'Shear' : it === 'firefly' ? 'Catch' : it === 'water' ? 'Fill can with' : 'Gather' }
}
const pickItem = (n) => n.kind === 'spot' ? n.spot.item : n.kind === 'decor' ? n.item : n.icon

// presentational: the main bubble (tail down) with an optional smaller bubble stacked above
export function Bubble({ icon, verb, name, lack, alt, onAct, onAlt, keyLabel = 'E', cls = '' }) {
  return <div className={'tp-bubble-in ' + cls}>
    {alt && <button className="tp-chip tp-bubble-alt g-glass" onClick={e => { e.stopPropagation(); onAlt && onAlt() }}>{!TOUCH && <span className="key">{alt.key || 'F'}</span>}<Icon id={alt.icon} size={22} /><span>{alt.verb}</span></button>}
    <button className={'tp-prompt tp-bubble g-glass' + (lack ? ' lack' : '')} onClick={e => { e.stopPropagation(); onAct && onAct() }}>
      {!TOUCH && <span className="key">{keyLabel}</span>}<Icon id={icon} size={32} /><span className="tp-bw">{verb}{name ? <> <b>{name}</b></> : null}{lack && <em>needs {lack}</em>}</span>
    </button>
  </div>
}

export function WorldPrompt({ act, hidden }) {
  const n = G.near
  if (!n || hidden) { PROMPT.el = null; return null }
  const L = promptLabel(n), docked = typeof n.at !== 'function'
  const ref = (el) => { PROMPT.el = el; PROMPT.box = null }
  if (n.weight === 'light') {
    const item = pickItem(n), learning = !(G.s.hints && G.s.hints[item] && G.s.hints[item].n >= 3)
    return <div key={n.id} ref={ref} className={'tp-bubble-wrap tp-pickwrap' + (docked ? ' tp-dock' : '')} data-item={item}>
      <button className="tp-chip tp-pick g-glass" aria-label={`${L.verb} ${L.name}`} onClick={e => { e.stopPropagation(); act() }}>
        {!TOUCH && <span className="key">E</span>}<Icon id={L.icon} size={26} />{learning && <span>{L.name}</span>}
      </button>
    </div>
  }
  const need = n.kind === 'spot' && NEEDS_TOOL[n.spot.item], lack = need && !G.s.tools[need] ? ITEMS[need].name : null
  return <div key={n.id} ref={ref} className={'tp-bubble-wrap' + (docked ? ' tp-dock' : '')}>
    <Bubble icon={L.icon} verb={L.verb} name={L.name} lack={lack} alt={n.alt} onAct={act} onAlt={() => n.alt.act()} />
  </div>
}

// canvas side, every frame after the target is chosen: project the anchor and move the bubble
const _v = new THREE.Vector3(), _p = new THREE.Vector3(), _last = new THREE.Vector3()
const TAIL = 10 // px the tail hangs below the bubble box
export function placePrompt(camera, dt, playerObj) {
  const n = G.near, el = PROMPT.el
  if (playerObj) { playerObj.getWorldPosition(_p); const moved = _p.distanceToSquared(_last) > 1e-8; _last.copy(_p)
    PROMPT.idleMs = !n || moved || PROMPT.id !== n.id ? 0 : PROMPT.idleMs + dt * 1000 }
  PROMPT.id = n ? n.id : null
  if (!el || !n || typeof n.at !== 'function') return
  if (n.weight === 'light') {
    const show = chipShows(G.s.hints || {}, el.dataset.item, G.s.day, PROMPT.idleMs)
    if (el.classList.contains('tp-off') === show) el.classList.toggle('tp-off', !show)
  }
  n.at(_v).project(camera)
  const w = innerWidth, h = innerHeight, behind = _v.z > 1
  PROMPT.pt.x = (_v.x + 1) / 2 * w; PROMPT.pt.y = (1 - _v.y) / 2 * h; PROMPT.pt.behind = behind
  if (!PROMPT.box) { const r = el.getBoundingClientRect(); if (!r.width) return; PROMPT.box = { bw: r.width, bh: r.height + TAIL } }
  const p = placeBubble(PROMPT.pt, { w, h }, PROMPT.box)
  el.style.transform = `translate(${p.left.toFixed(1)}px, ${p.top.toFixed(1)}px)`
  el.style.setProperty('--tail', p.tail.toFixed(1) + 'px')
  el.classList.toggle('tp-behind', behind)
}
