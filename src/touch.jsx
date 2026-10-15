// Touch controls: virtual stick + Jump / Action / View buttons, one-finger camera drag, pinch zoom.
// Shown on touch / coarse-pointer devices, or forced with ?touch=1 (?touch=0 forces them off).
// The stick feeds PAD (read by stepPlayer next to the keyboard); the buttons send the same key events the
// keyboard would (Space / E / V), so jumping, gathering, fishing, placing and the bench all share one code path.
import React, { useEffect, useRef, useState } from 'react'
import { q, VIEW } from './common.jsx'
import './touch.css'
const tq = q.get('touch')
export const TOUCH = tq === '1' || (tq !== '0' && typeof matchMedia !== 'undefined' && (matchMedia('(pointer: coarse)').matches || (navigator.maxTouchPoints > 0 && matchMedia('(hover: none)').matches)))
export const PAD = { x: 0, y: 0, mag: 0, run: false, active: false }
export const CAM = { yaw: 0, pitch: 0, zoom: 1, drag: false } // yaw: radians the player turns by (camera follows); pitch / zoom scale the follow camera
const buzz = (ms = 8) => { try { navigator.vibrate && navigator.vibrate(ms) } catch {} }
const key = (type, k, code) => window.dispatchEvent(new KeyboardEvent(type, { key: k, code, bubbles: true, cancelable: true }))
const tapKey = (k, code) => { key('keydown', k, code); setTimeout(() => key('keyup', k, code), 60) }
if (TOUCH && typeof document !== 'undefined') document.documentElement.classList.add('tp-touch')

function Stick() {
  const base = useRef(), knob = useRef(), id = useRef(null), c = useRef({ x: 0, y: 0, r: 1 })
  const set = (dx, dy) => {
    const r = c.current.r, d = Math.hypot(dx, dy), m = Math.min(1, d / r), k = d > r ? r / d : 1
    PAD.x = (dx * k) / r; PAD.y = (-dy * k) / r; PAD.mag = m
    const run = m > 0.85; if (run && !PAD.run) buzz(6); PAD.run = run
    if (!knob.current || !base.current) return
    knob.current.style.transform = `translate(${dx * k}px, ${dy * k}px)`
    base.current.classList.toggle('run', run)
  }
  const down = (e) => { if (id.current != null) return; e.preventDefault(); id.current = e.pointerId; base.current.setPointerCapture(e.pointerId)
    const b = base.current.getBoundingClientRect(); c.current = { x: b.left + b.width / 2, y: b.top + b.height / 2, r: b.width * 0.42 }; PAD.active = true; base.current.classList.add('on'); set(e.clientX - c.current.x, e.clientY - c.current.y); buzz(5) }
  const move = (e) => { if (e.pointerId !== id.current) return; e.preventDefault(); set(e.clientX - c.current.x, e.clientY - c.current.y) }
  const up = (e) => { if (e.pointerId !== id.current) return; id.current = null; PAD.x = PAD.y = PAD.mag = 0; PAD.run = false; PAD.active = false; if (knob.current) knob.current.style.transform = ''; base.current?.classList.remove('on', 'run') }
  useEffect(() => () => { if (id.current != null) { id.current = null; PAD.x = PAD.y = PAD.mag = 0; PAD.run = false; PAD.active = false } }, []) // unmounted mid-drag (view toggle / door): release the stick
  return <div className="tp-stick" ref={base} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onLostPointerCapture={up} aria-label="Move: drag the stick, push to the edge to run" role="application">
    <svg className="ring" viewBox="0 0 100 100" aria-hidden="true"><path className="wob" d="M50 6.5c13 .2 25.6 6.4 33.2 17.6 6.9 10.2 8.6 23.7 4.4 35.4-4.4 12.6-15.4 22.6-28.5 25.7C45.6 88.4 30.4 85 20.1 75.6 10.6 67 5.6 53.4 7.5 40.7 9.5 27.1 19 15 31.7 9.7c5.8-2.4 12-3.3 18.3-3.2z" /><path className="wob2" d="M51.5 9.6c11.4.9 22.4 7.4 28.4 17.3" /><path className="nib" d="M50 17.5l-3.6 5.2M50 17.5l3.6 5.2M50 82.5l-3.6-5.2M50 82.5l3.6-5.2M17.5 50l5.2-3.6M17.5 50l5.2 3.6M82.5 50l-5.2-3.6M82.5 50l-5.2 3.6" /></svg>
    <div className="knob" ref={knob} />
  </div>
}
function Btn({ cls, label, icon, onPress, aria }) {
  const press = (e) => { e.preventDefault(); e.stopPropagation(); e.currentTarget.classList.add('down'); buzz(10); onPress() }
  const rel = (e) => e.currentTarget.classList.remove('down')
  return <button className={'tp-btn paper ' + cls} aria-label={aria || label} onPointerDown={press} onPointerUp={rel} onPointerCancel={rel} onPointerLeave={rel} onContextMenu={e => e.preventDefault()}>
    <span className="ic" aria-hidden="true">{icon}</span></button>
}
function RotateHint() {
  const [show, setShow] = useState(false)
  useEffect(() => { const mq = matchMedia('(orientation: portrait) and (max-width: 520px)'); let t; const f = () => { clearTimeout(t); if (mq.matches && !sessionStorage.getItem('tp.rot')) { setShow(true); t = setTimeout(() => setShow(false), 7000) } else setShow(false) }; f(); mq.addEventListener?.('change', f); return () => { clearTimeout(t); mq.removeEventListener?.('change', f) } }, [])
  if (!show) return null
  return <button className="tp-rotate paper" onPointerDown={e => { e.preventDefault(); sessionStorage.setItem('tp.rot', '1'); setShow(false) }}><span aria-hidden="true">⟲</span> Turn your phone sideways for a wider view <small>tap to hide</small></button>
}
// hand-drawn line icons (single ink stroke, slightly uneven like a brush pen); no text on the pad
const ICON = {
  hand: <svg viewBox="0 0 40 40"><path d="M14.2 21.8V11.6c0-1.5 1-2.6 2.4-2.6s2.3 1.1 2.3 2.5l.1 8.3M18.9 19.6V8.9c0-1.5 1-2.5 2.4-2.5 1.3 0 2.3 1 2.3 2.4v10.6M23.6 19.5v-8.2c0-1.4 1-2.4 2.3-2.4 1.4 0 2.3 1.1 2.3 2.5l-.1 12.4c-.1 6.4-4.3 10.2-9.6 10.2-4.2 0-6.6-2-8.7-5.3l-3.7-5.9c-.8-1.2-.4-2.6.8-3.2 1.1-.6 2.3-.3 3.1.7l2.2 2.8" /><path className="soft" d="M17.2 30.1c1.4 1 3.1 1.3 4.7 1" /></svg>,
  foot: <svg viewBox="0 0 40 40"><path d="M16.4 6.8c-.3 4.6-.1 9.7.7 14.4.5 3-.2 5.2-1.8 7.2-1.3 1.7-1.6 3.6-.5 5 1.2 1.6 3.6 1.9 7.1 1.6l6.7-.6c2.1-.2 3.2-1.5 2.8-3.1-.4-1.5-2-2.3-4.4-2.8-2.9-.6-4.6-2-5.1-4.7-.6-3.6-.7-9.2-.6-14.2" /><path className="soft" d="M22.8 31.3l1-2.4M26.4 31.6l.6-2.2" /><path className="soft" d="M9.4 15.2c1.6-1.6 3-2.3 4.5-2.6M8.6 20.6c1.6-.9 3.1-1.2 4.8-1.1" /></svg>,
  globe: <svg viewBox="0 0 40 40"><path d="M20.3 8.6c6.5.1 11.4 5.3 11.2 11.8-.2 6.4-5.4 11.2-11.8 11-6.2-.2-11-5.3-10.8-11.6.2-6.2 5.2-11.3 11.4-11.2z" /><path className="soft" d="M9.4 18.6c3.6 1.4 8.4 1.9 13.2 1.4 3.3-.3 6.4-1 8.6-2M19.8 8.9c-3.2 3.6-4.6 8.2-4.1 13 .4 3.6 1.9 6.9 4.3 9.4" /></svg>,
}
// auto-hide: the pad fades to nothing after a few idle seconds and comes back on any touch.
// Faded controls stay hit-testable, so the first touch both reveals them and works (stick / buttons respond at once).
const IDLE_MS = 3500
function useIdleFade() {
  const [idle, setIdle] = useState(false)
  useEffect(() => {
    if (!TOUCH) return
    let t
    const arm = () => { clearTimeout(t); t = setTimeout(function tick() { if (PAD.active) { t = setTimeout(tick, 600); return } setIdle(true) }, IDLE_MS) }
    const wake = () => { setIdle(false); arm() }
    arm(); addEventListener('pointerdown', wake, true); addEventListener('touchstart', wake, { capture: true, passive: true })
    return () => { clearTimeout(t); removeEventListener('pointerdown', wake, true); removeEventListener('touchstart', wake, { capture: true }) }
  }, [])
  return idle
}
export const PADUI = { hideStick: false } // set by the dialogue box: stick unmounts (releasing PAD) while she is talking
export function TouchPad() {
  const idle = useIdleFade()
  const [mode, setMode] = useState(VIEW.mode)
  useEffect(() => { const t = setInterval(() => setMode(VIEW.mode + (PADUI.hideStick ? ':talk' : '')), 150); return () => clearInterval(t) }, [])
  if (!TOUCH) return null
  const walk = mode.startsWith('follow'), talk = mode.endsWith(':talk')
  return <div className={'tp-pad' + (idle ? ' tp-idle' : '')}>
    {walk && !talk && <Stick />}
    <div className="tp-acts">
      {walk && <Btn cls="tp-jump" label="Jump" icon={ICON.foot} onPress={() => tapKey(' ', 'Space')} />}
      {walk && <Btn cls="tp-act" label="Action" aria="Gather, talk or use" icon={ICON.hand} onPress={() => tapKey('e', 'KeyE')} />}
      <Btn cls="tp-view" label={walk ? 'Planet' : 'Walk'} aria={walk ? 'Planet view' : 'Back to walking'} icon={ICON.globe} onPress={() => { tapKey('v', 'KeyV'); setTimeout(() => setMode(VIEW.mode), 80) }} />
    </div>
    <RotateHint />
  </div>
}
// One finger on empty screen: horizontal drag turns (camera follows), vertical tilts. Two fingers: pinch zoom.
// A drag (or a second finger) cancels the pending tap-to-walk, so only clean taps walk.
export function useTouchCamera(el) {
  useEffect(() => {
    if (!TOUCH || !el) return
    el.style.touchAction = 'none'
    const pts = new Map(); let start = null, pinch0 = 0, zoom0 = 1, last = null
    const dn = (e) => { if (e.pointerType === 'mouse') return; pts.set(e.pointerId, { x: e.clientX, y: e.clientY })
      if (pts.size === 1) { start = { x: e.clientX, y: e.clientY, t: performance.now() }; last = { x: e.clientX, y: e.clientY }; CAM.drag = false }
      if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch0 = Math.hypot(a.x - b.x, a.y - b.y); zoom0 = CAM.zoom; CAM.drag = true } }
    const mv = (e) => { if (!pts.has(e.pointerId)) return; pts.set(e.pointerId, { x: e.clientX, y: e.clientY })
      if (pts.size >= 2) { const [a, b] = [...pts.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); if (pinch0 > 10) CAM.zoom = Math.min(1.9, Math.max(0.55, zoom0 * pinch0 / d)); return }
      if (!start) return
      if (!CAM.drag && Math.hypot(e.clientX - start.x, e.clientY - start.y) > 10) CAM.drag = true
      if (CAM.drag && VIEW.mode === 'follow') { const dx = e.clientX - last.x, dy = e.clientY - last.y; CAM.yaw += dx * 0.008; CAM.pitch = Math.min(1, Math.max(-0.6, CAM.pitch + dy * 0.004)) }
      last = { x: e.clientX, y: e.clientY } }
    const up = (e) => { pts.delete(e.pointerId); if (!pts.size) { start = null; setTimeout(() => { CAM.drag = false }, 0) } }
    el.addEventListener('pointerdown', dn); addEventListener('pointermove', mv); addEventListener('pointerup', up); addEventListener('pointercancel', up)
    return () => { el.removeEventListener('pointerdown', dn); removeEventListener('pointermove', mv); removeEventListener('pointerup', up); removeEventListener('pointercancel', up) }
  }, [el])
}
// Tap helper for 3D targets: mouse acts on press (unchanged desktop feel); touch waits for the finger to lift
// and only fires if it was a clean tap (no drag, no second finger) — so camera drags never walk you somewhere.
export function onTap(e, fn) {
  if (!TOUCH || e.pointerType === 'mouse') { fn(); return }
  const id = e.pointerId, t0 = performance.now()
  const up = (u) => { if (u.pointerId !== id) return; removeEventListener('pointerup', up, true); removeEventListener('pointercancel', cancel, true); if (!CAM.drag && performance.now() - t0 < 600) fn() }
  const cancel = (u) => { if (u.pointerId === id) { removeEventListener('pointerup', up, true); removeEventListener('pointercancel', cancel, true) } }
  addEventListener('pointerup', up, true); addEventListener('pointercancel', cancel, true)
}
if (typeof window !== 'undefined') { window.__pad = PAD; window.__cam = CAM }
