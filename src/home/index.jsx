// Home + pets layer: mounted inside the planet group (3D) and on top of the page (fade overlay).
import React, { Suspense, lazy, useEffect, useRef, useState } from 'react'
import { HOME } from './state.js'
import { Room } from './Room.jsx'
import { afterReveal } from '../boot.js'
// Pip the dog lives outdoors and the game starts inside the house, so his code (AI, fetch, dig, critters) is a separate
// chunk fetched after the title reveal. It mounts while she's still indoors, and compiles its own materials on mount.
const loadDog = () => import('../pets/Dog.jsx')
const Dog = lazy(() => loadDog().then(m => ({ default: m.Dog })))
function LateDog() {
  const [on, setOn] = useState(!HOME.inside) // starting outdoors (?out / debug spots): no reason to wait
  useEffect(() => {
    if (on) return
    let t, idle, dead = false
    const go = () => { if (!dead) setOn(true) }
    const off = afterReveal(() => { t = setTimeout(() => { if (window.requestIdleCallback) idle = requestIdleCallback(go, { timeout: 1500 }); else go() }, 1200) })
    HOME.needDog = go // exiting early still requests Pip immediately
    return () => { dead = true; off(); clearTimeout(t); if (idle != null) cancelIdleCallback(idle); if (HOME.needDog === go) HOME.needDog = null }
  }, [on])
  return on ? <Suspense fallback={null}><Dog /></Suspense> : null
}
export { HOME }
export function setupHome(o) { Object.assign(HOME, o) }
export function HomeLayer() { return <><Room /><LateDog /></> }
// the door transition: a warm paper-coloured iris that closes and re-opens around the screen centre
export function HomeOverlay() {
  const el = useRef()
  useEffect(() => { let raf; const f = () => { const v = HOME.fade, e = el.current; if (e) { e.style.opacity = v > 0.001 ? 1 : 0; e.style.setProperty('--r', (1 - v) * 120 + '%') } raf = requestAnimationFrame(f) }; f(); return () => cancelAnimationFrame(raf) }, [])
  return <div ref={el} aria-hidden="true" style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 40, opacity: 0, background: 'radial-gradient(circle at 50% 52%, transparent calc(var(--r, 120%) - 6%), #6b4a3a calc(var(--r, 120%) - 1%), #3b2a22 calc(var(--r, 120%) + 30%))' }} />
}
