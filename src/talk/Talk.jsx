// Villager chat: the shared Glass & Gold action bubble expands into a compact in-world conversation.
// E / tap / Enter advances, Esc or ✕ closes; gifting retains its existing G shortcut.
// While it's open her movement keys are swallowed, the touch stick is unmounted and the villager stops and faces her.
import * as THREE from 'three'
import React, { useEffect, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { VIEW } from '../common.jsx'
import { G, subscribe } from '../game/store.js'
import { HOME } from '../home/state.js'
import { TOUCH, setHideStick } from '../touch.jsx'
import { NPCS, TALK, weatherFor, noteActivity, recentActivity, periodAt, talkWins } from './state.js'
import { Bubble } from '../game/prompt/WorldPrompt.jsx'
import { placeBubble } from '../game/prompt/logic.js'
import { placeDialogue } from './placement.js'
import { Icon } from '../game/icons.jsx'
import { buildLines, PROFILES } from './profiles.js'
import { HeartsBadge } from '../ui/gifts/Hearts.jsx'
import './talk.css'

const NEAR = 0.62, _w = new THREE.Vector3(), _h = new THREE.Vector3(), _up = new THREE.Vector3(), _q = new THREE.Quaternion()
const modal = () => !!(G.ui.panel || G.ui.place || G.ui.fish || G.ui.crafting)
function close() { if (!TALK.open) return; TALK.open.w.talking = false; TALK.open = null; TALK.lines = null; setHideStick(false); bump() }
function open(npc) {
  const rot = window.__rot || { a: 0.4 }
  const L = buildLines(npc.key, { period: periodAt(rot.a), weather: weatherFor(G.s.day || 0), recent: recentActivity(), stage: npc.stage })
  // Stage B: a friendship line (unlocked by hearts) after the greeting
  const sb = window.__sb, hl = sb && sb.Fr.heartLine(G.s.friends.list[npc.key]); if (hl) L.pages.splice(1, 0, hl)
  TALK.open = npc; TALK.lines = L; TALK.page = 0; npc.w.talking = true; setHideStick(true); TALK.onOpen && TALK.onOpen(); sb && sb.meet && sb.meet(npc.key); bump()
}
// Stage B gifts: G near a villager or the Gift button in the dialogue opens Studio's GiftPicker (systems/Panels.jsx)
function gift(npc) { if (!npc || !window.__sb) return; close(); window.__sb.openGift(npc.key) }
// after a gift she answers in the dialogue box (one page)
if (typeof window !== 'undefined') window.__sbSay = (key, r) => { const npc = NPCS.find(c => c.key === key); if (!npc) return
  const p = PROFILES[key] || {}, say = { love: `Oh! For me? I love this!`, like: `How thoughtful. Thank you!`, neutral: `Oh… thank you, I suppose.`, dislike: `Hmm. That's… not really for me.` }[r.kind]
  TALK.open = npc; TALK.lines = { name: p.name || 'Villager', role: p.role || '', pages: [say] }; TALK.page = 0; npc.w.talking = true; setHideStick(true); bump() }
function advance() { if (!TALK.open) return; if (TALK.page < TALK.lines.pages.length - 1) { TALK.page++; bump() } else close() }
if (typeof window !== 'undefined') window.__openTalk = () => { const n = TALK.near || (window.__npcs || []).find(c => c.ready && c.obj); if (n) open(n) }
const subs = new Set(); function bump() { for (const f of subs) f() }
function useTalk() { const [, f] = useState(0); useEffect(() => { const g = () => f(x => x + 1); subs.add(g); return () => subs.delete(g) }, []) }

// in-canvas: proximity, bubble placement, recent-activity tracking
export function Talk({ P }) {
  const camera = useThree(s => s.camera), size = useThree(s => s.size), n = useRef(0)
  useEffect(() => {
    const key = (e) => {
      if (TALK.open) {
        // Keep keyboard access to the card without leaking Space to the game's jump handler.
        if (e.code === 'Tab') return
        const button = ['Enter', 'Space'].includes(e.code) && e.target?.closest?.('.tk-box button')
        if (button) { e.preventDefault(); e.stopImmediatePropagation(); if (!e.repeat) button.click(); return }
        if (e.code === 'KeyE' || e.code === 'Enter' || e.code === 'Space') { e.preventDefault(); e.stopImmediatePropagation(); advance(); return }
        if (e.code === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); close(); return }
        if (e.code === 'KeyG') { e.preventDefault(); e.stopImmediatePropagation(); gift(TALK.open); return }
        if (!e.metaKey && !e.ctrlKey && e.code !== 'KeyV') { e.preventDefault(); e.stopImmediatePropagation() } // freeze her while talking
        return
      }
      if (e.code === 'KeyE' && TALK.near && !(G.near && TALK.nearD > 0.4) && !modal() && !HOME.inside && !HOME.alt && VIEW.mode === 'follow') { e.preventDefault(); e.stopImmediatePropagation(); open(TALK.near) }
      if (e.code === 'KeyG' && TALK.near && !modal() && !HOME.inside && !HOME.alt && VIEW.mode === 'follow') { e.preventDefault(); e.stopImmediatePropagation(); gift(TALK.near) }
    }
    addEventListener('keydown', key, true)
    // recent activity from the game's own toasts (gathers, crafts, pets) — no hooks into game code needed
    let seen = 0
    const un = subscribe(() => { for (const t of G.ui.toasts) { if (t.id <= seen) continue; seen = t.id; const x = t.text
      let m
      if ((m = /^(?:✦ )?Crafted (.+)!$/.exec(x))) noteActivity('craft', m[1].toLowerCase())
      else if ((m = /^(?:New: |\+\d+ )(.+?)!?$/.exec(x))) noteActivity(/fish/i.test(m[1]) ? 'fish' : 'gather', m[1].toLowerCase())
      else if (/purrs|Mochi|opens one eye/.test(x)) noteActivity('cat')
      else if (/Pip|fetch|stick/i.test(x)) noteActivity('dog') } })
    return () => { removeEventListener('keydown', key, true); un() }
  }, [])
  useFrame(() => {
    if (HOME.inside !== TALK.lastInside) { if (TALK.lastInside && !HOME.inside) noteActivity('indoors'); TALK.lastInside = HOME.inside }
    if (n.current++ % 3) return place()
    let best = null, bd = NEAR
    if (VIEW.mode === 'follow' && !HOME.inside && !HOME.alt && !modal()) for (const c of NPCS) { if (!c.obj || !c.obj.visible || !c.ready) continue; c.obj.getWorldPosition(_w); const d = _w.distanceTo(P.wPos); if (d < bd) { bd = d; best = c } }
    if (TALK.open && (HOME.inside || HOME.alt || VIEW.mode !== 'follow')) close()
    TALK.nearD = bd; if (best !== TALK.near) { TALK.near = best; bump() }
    place()
  })
  const place = () => {
    const el = BUBBLE.el, who = TALK.open || TALK.near, chatting = !!TALK.open
    if (!el) return
    if (!!window.__sb !== BUBBLE.sb) { BUBBLE.sb = !!window.__sb; bump() }
    if (!who || !who.obj || (!chatting && !talkWins(G.near))) {
      el.style.opacity = 0; el.style.visibility = 'hidden'; return
    }
    who.obj.getWorldPosition(_h)
    _up.set(0, 1, 0).applyQuaternion(who.obj.getWorldQuaternion(_q))
    _h.addScaledVector(_up, who.h || 0.92).project(camera)
    const pt = { x: (_h.x + 1) / 2 * size.width, y: (1 - _h.y) / 2 * size.height, behind: _h.z > 1 }
    if (!BUBBLE.box) {
      const r = el.getBoundingClientRect()
      if (!r.width || !r.height) return
      BUBBLE.box = { bw: r.width, bh: r.height }
    }
    const viewport = { w: size.width, h: size.height }
    const p = chatting
      ? placeDialogue(pt, viewport, BUBBLE.box, { touch: TOUCH })
      : placeBubble(pt, viewport, { ...BUBBLE.box, bh: BUBBLE.box.bh + 10 })
    const tf = `translate(${Math.round(p.left)}px, ${Math.round(p.top)}px)`
    if (el.style.transform !== tf) el.style.transform = tf
    el.style.setProperty('--tail', Math.round(p.tail) + 'px')
    el.dataset.tail = chatting ? p.side : pt.behind ? 'none' : 'down'
    el.style.visibility = 'visible'; el.style.opacity = 1
  }
  return null
}
const BUBBLE = { el: null, box: null, sb: false }

// The same unscaled wrapper anchors both states; the card (not the wrapper) respects HUD zoom.
export function TalkOverlay() {
  useTalk()
  const anchor = useRef(null)
  const L = TALK.lines, pg = TALK.page, chatting = !!L && !!TALK.open
  useEffect(() => {
    const el = anchor.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(() => { BUBBLE.box = null })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  const last = chatting && pg === L.pages.length - 1
  const friend = chatting && window.__sb && window.__sb.friend(TALK.open.key)
  const action = fn => e => { e.stopPropagation(); fn() }
  return <div className={'tp-ui tk-host' + (chatting ? ' tk-talking' : '')}>
    <div className={'tk-bubble' + (chatting ? ' tk-dialogue' : '')} ref={el => { anchor.current = BUBBLE.el = el; BUBBLE.box = null }}>
      {chatting ? <div className="tk-box g-glass" role="dialog" aria-label={`Talking with ${L.name}`}
        onPointerDown={e => e.stopPropagation()} onClick={action(advance)}>
        <header className="tk-head">
          <div className="tk-identity"><b>{L.name}</b><div className="tk-meta"><span>{L.role}</span>{friend && <HeartsBadge hearts={friend.hearts} size={12} className="tk-hearts" />}</div></div>
          {friend && <button type="button" className="tk-gift" aria-label="Give a gift" title={TOUCH ? 'Give a gift' : 'Give a gift (G)'} onClick={action(() => gift(TALK.open))}><Icon id="heart" size={19} /><span>Gift</span></button>}
          <button type="button" className="tk-x" aria-label="Close" title="Close (Esc)" onClick={action(close)}>×</button>
        </header>
        <p aria-live="polite"><span key={pg}>{L.pages[pg]}</span></p>
        <footer className="tk-footer">
          <div className="tk-progress" role="img" aria-label={`Page ${pg + 1} of ${L.pages.length}`}>
            {L.pages.map((_, i) => <span key={i} className={i === pg ? 'active' : i < pg ? 'done' : ''} />)}
          </div>
          <button type="button" className="tk-more" onClick={action(advance)}>
            {!TOUCH && <span className="tk-key" aria-hidden="true">E</span>}
            <span>{last ? 'Goodbye' : 'Continue'}</span><span className="tk-chevron" aria-hidden="true">▸</span>
          </button>
        </footer>
      </div> : TALK.near && <Bubble key={TALK.near.key + (BUBBLE.sb ? '+g' : '')} icon="hand" verb="Talk to" name={(PROFILES[TALK.near.key] || {}).name || 'Villager'}
        alt={BUBBLE.sb ? { key: 'G', icon: 'heart', verb: 'Give a gift' } : null} onAct={() => open(TALK.near)} onAlt={() => gift(TALK.near)} />}
    </div>
  </div>
}
