// Boot sequencing + progress reporting to the inline loader in index.html (window.__loader).
// Stages: js -> fonts -> world -> bake -> shaders -> frame. Each is reported when it really completes.
import { useEffect, useState } from 'react'
export const BOOT = { done: {}, bakePlayer: false, marks: {} }
const subs = {}
const t0 = performance.timeOrigin ? 0 : performance.now()
export function bootStage(name, p = 1) {
  window.__loader && window.__loader.stage(name, p)
  if (p >= 1 && !BOOT.done[name]) {
    BOOT.done[name] = true; BOOT.marks[name] = Math.round(performance.now() - t0); window.__loadMarks = BOOT.marks
    if (name === 'bakePlayer') BOOT.bakePlayer = true
    ;(subs[name] || []).splice(0).forEach(f => f())
  }
}
export function onBoot(name, f) {
  if (BOOT.done[name]) { f(); return () => {} }
  const l = (subs[name] = subs[name] || []); l.push(f); return () => { const k = l.indexOf(f); if (k >= 0) l.splice(k, 1) }
}
export const nextPaint = () => new Promise(r => requestAnimationFrame(() => setTimeout(r, 0)))
// Villagers bake one at a time in idle slots after the first frame (lowest prio first).
const Q = []; let running = false
const idle = (f) => (window.requestIdleCallback ? requestIdleCallback(f, { timeout: 250 }) : setTimeout(f, 16))
function pump() {
  if (running || !BOOT.done.frame) return; running = true
  const step = () => { const j = Q.shift(); if (!j) { running = false; bootStage('villagers', 1); return } j.go(); requestAnimationFrame(() => idle(step)) }
  idle(step)
}
onBoot('frame', pump)
export function useIdleSlot(prio = 0) {
  const [ok, set] = useState(false)
  useEffect(() => { const j = { prio, go: () => set(true) }; Q.push(j); Q.sort((a, b) => a.prio - b.prio); pump(); return () => { const k = Q.indexOf(j); if (k >= 0) Q.splice(k, 1) } }, [])
  return ok
}
