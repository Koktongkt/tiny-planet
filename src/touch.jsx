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
    <svg className="ring" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="44" /><path d="M50 14l-5 7h10zM50 86l-5-7h10zM14 50l7-5v10zM86 50l-7-5v10z" /></svg>
    <div className="knob" ref={knob} />
  </div>
}
function Btn({ cls, label, icon, onPress, aria }) {
  const press = (e) => { e.preventDefault(); e.stopPropagation(); e.currentTarget.classList.add('down'); buzz(10); onPress() }
  const rel = (e) => e.currentTarget.classList.remove('down')
  return <button className={'tp-btn paper ' + cls} aria-label={aria || label} onPointerDown={press} onPointerUp={rel} onPointerCancel={rel} onPointerLeave={rel} onContextMenu={e => e.preventDefault()}>
    <span className="ic" aria-hidden="true">{icon}</span><span className="lb">{label}</span></button>
}
function RotateHint() {
  const [show, setShow] = useState(false)
  useEffect(() => { const mq = matchMedia('(orientation: portrait) and (max-width: 520px)'); let t; const f = () => { clearTimeout(t); if (mq.matches && !sessionStorage.getItem('tp.rot')) { setShow(true); t = setTimeout(() => setShow(false), 7000) } else setShow(false) }; f(); mq.addEventListener?.('change', f); return () => { clearTimeout(t); mq.removeEventListener?.('change', f) } }, [])
  if (!show) return null
  return <button className="tp-rotate paper" onPointerDown={e => { e.preventDefault(); sessionStorage.setItem('tp.rot', '1'); setShow(false) }}><span aria-hidden="true">⟲</span> Turn your phone sideways for a wider view <small>tap to hide</small></button>
}
export function TouchPad() {
  const [mode, setMode] = useState(VIEW.mode)
  useEffect(() => { const t = setInterval(() => setMode(VIEW.mode), 300); return () => clearInterval(t) }, [])
  if (!TOUCH) return null
  const walk = mode === 'follow'
  return <div className="tp-pad">
    {walk && <Stick />}
    <div className="tp-acts">
      {walk && <Btn cls="tp-jump" label="Jump" icon={<svg viewBox="0 0 40 40"><path d="M20 30V12M11 20l9-9 9 9" /></svg>} onPress={() => tapKey(' ', 'Space')} />}
      {walk && <Btn cls="tp-act" label="Action" aria="Gather or use" icon={<svg viewBox="0 0 40 40"><path d="M13 22V12a2.5 2.5 0 015 0v8M18 19v-9a2.5 2.5 0 015 0v9M23 19v-7a2.5 2.5 0 015 0v12c0 6-4 9-9 9-4 0-6-2-8-5l-4-6a2.4 2.4 0 014-2.6l2 2.6" /></svg>} onPress={() => tapKey('e', 'KeyE')} />}
      <Btn cls="tp-view" label={walk ? 'Planet' : 'Walk'} aria="Toggle planet view" icon={<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="11" /><path d="M9 20h22M20 9c5 6 5 16 0 22M20 9c-5 6-5 16 0 22" /></svg>} onPress={() => { tapKey('v', 'KeyV'); setTimeout(() => setMode(VIEW.mode), 80) }} />
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
