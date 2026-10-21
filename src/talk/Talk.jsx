// Villager chat: a '…' bubble over the nearest villager when she's close, Action (E / touch Action) opens a
// storybook dialogue box (parchment, ink border, Cormorant italic, name plate). E / tap / Enter advances, Esc or ✕ closes.
// While it's open her movement keys are swallowed, the touch stick is unmounted and the villager stops and faces her.
import * as THREE from 'three'
import React, { useEffect, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { VIEW } from '../common.jsx'
import { G, subscribe } from '../game/store.js'
import { HOME } from '../home/state.js'
import { PADUI } from '../touch.jsx'
import { NPCS, TALK, weatherFor, noteActivity, recentActivity, periodAt } from './state.js'
import { buildLines, PROFILES } from './profiles.js'
import { HeartsBadge } from '../ui/gifts/Hearts.jsx'
import './talk.css'
const HoshinoPortrait = React.lazy(() => import('../art/museum/portrait.jsx').then(m => ({ default: m.HoshinoPortrait }))) // Stage C (Studio)

const NEAR = 0.62, _w = new THREE.Vector3(), _h = new THREE.Vector3(), _up = new THREE.Vector3()
const modal = () => !!(G.ui.panel || G.ui.place || G.ui.fish || G.ui.crafting)
function close() { if (!TALK.open) return; TALK.open.w.talking = false; TALK.open = null; TALK.lines = null; PADUI.hideStick = false; bump() }
function open(npc) {
  const rot = window.__rot || { a: 0.4 }
  const L = buildLines(npc.key, { period: periodAt(rot.a), weather: weatherFor(G.s.day || 0), recent: recentActivity(), stage: npc.stage })
  // Stage B: a friendship line (unlocked by hearts) after the greeting
  const sb = window.__sb, hl = sb && sb.Fr.heartLine(G.s.friends.list[npc.key]); if (hl) L.pages.splice(1, 0, hl)
  TALK.open = npc; TALK.lines = L; TALK.page = 0; npc.w.talking = true; PADUI.hideStick = true; TALK.onOpen && TALK.onOpen(); bump()
}
// Stage B gifts: G near a villager or the Gift button in the dialogue opens Studio's GiftPicker (systems/Panels.jsx)
function gift(npc) { if (!npc || !window.__sb) return; close(); window.__sb.openGift(npc.key) }
// after a gift she answers in the dialogue box (one page)
if (typeof window !== 'undefined') window.__sbSay = (key, r) => { const npc = NPCS.find(c => c.key === key); if (!npc) return
  const p = PROFILES[key] || {}, say = { love: `Oh! For me? I love this!`, like: `How thoughtful. Thank you!`, neutral: `Oh… thank you, I suppose.`, dislike: `Hmm. That's… not really for me.` }[r.kind]
  TALK.open = npc; TALK.lines = { name: p.name || 'Villager', role: p.role || '', pages: [say] }; TALK.page = 0; npc.w.talking = true; PADUI.hideStick = true; bump() }
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
        if (e.code === 'KeyE' || e.code === 'Enter' || e.code === 'Space') { e.preventDefault(); e.stopImmediatePropagation(); advance(); return }
        if (e.code === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); close(); return }
        if (e.code === 'KeyG') { e.preventDefault(); e.stopImmediatePropagation(); gift(TALK.open); return }
        if (!e.metaKey && !e.ctrlKey && e.code !== 'KeyV') { e.preventDefault(); e.stopImmediatePropagation() } // freeze her while talking
        return
      }
      if (e.code === 'KeyE' && TALK.near && !(G.near && TALK.nearD > 0.4) && !modal() && !HOME.inside && VIEW.mode === 'follow') { e.preventDefault(); e.stopImmediatePropagation(); open(TALK.near) }
      if (e.code === 'KeyG' && TALK.near && !modal() && !HOME.inside && VIEW.mode === 'follow') { e.preventDefault(); e.stopImmediatePropagation(); gift(TALK.near) }
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
    if (VIEW.mode === 'follow' && !HOME.inside && !modal()) for (const c of NPCS) { if (!c.obj || !c.obj.visible || !c.ready) continue; c.obj.getWorldPosition(_w); const d = _w.distanceTo(P.wPos); if (d < bd) { bd = d; best = c } }
    if (TALK.open && (HOME.inside || VIEW.mode !== 'follow')) close()
    TALK.nearD = bd; if (best !== TALK.near) { TALK.near = best; bump() }
    place()
  })
  const place = () => { const el = BUBBLE.el, who = TALK.open || TALK.near; if (!el) return
    if (!who || !who.obj) { el.style.opacity = 0; return }
    who.obj.getWorldPosition(_h); _up.set(0, 1, 0).applyQuaternion(who.obj.getWorldQuaternion(new THREE.Quaternion())); _h.addScaledVector(_up, who.h || 0.92).project(camera)
    if (_h.z > 1) { el.style.opacity = 0; return }
    el.style.opacity = TALK.open ? 0 : 1; el.style.transform = `translate(${((_h.x + 1) / 2 * size.width).toFixed(1)}px, ${((1 - _h.y) / 2 * size.height).toFixed(1)}px) translate(-50%, -100%)` }
  return null
}
const BUBBLE = { el: null }
// DOM overlay: bubble + dialogue box
export function TalkOverlay() {
  useTalk()
  const L = TALK.lines, pg = TALK.page
  return <>
    <div className="tk-bubble" ref={el => BUBBLE.el = el} aria-hidden="true"><span>…</span></div>
    {L && <div className="tk-box" role="dialog" aria-label={`Talking with ${L.name}`} onPointerDown={e => { e.stopPropagation(); e.preventDefault(); advance() }}>
      <div className="tk-plate">{TALK.open && TALK.open.key === 'scholar' && <React.Suspense fallback={null}><HoshinoPortrait size={44} className="tk-portrait" /></React.Suspense>}<b>{L.name}</b><i>{L.role}</i>{window.__sb && TALK.open && <HeartsBadge hearts={window.__sb.friend(TALK.open.key).hearts} size={18} className="tk-hearts" />}</div>
      {window.__sb && TALK.open && <button className="tk-gift" aria-label="Give a gift" onPointerDown={e => { e.stopPropagation(); e.preventDefault(); gift(TALK.open) }}>♥ Gift{TOUCHY ? '' : ' (G)'}</button>}
      <button className="tk-x" aria-label="Close" onPointerDown={e => { e.stopPropagation(); e.preventDefault(); close() }}>✕</button>
      <p key={pg}>{L.pages[pg]}</p>
      <div className="tk-more">{pg < L.pages.length - 1 ? <>{'❧'} <small>{TOUCHY ? 'tap' : 'E'} to continue</small></> : <small>{TOUCHY ? 'tap' : 'E'} to say goodbye</small>}</div>
    </div>}
  </>
}
const TOUCHY = typeof document !== 'undefined' && document.documentElement.classList.contains('tp-touch')
