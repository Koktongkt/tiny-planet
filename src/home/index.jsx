// Home + pets layer: mounted inside the planet group (3D) and on top of the page (fade overlay).
import React, { useEffect, useRef } from 'react'
import { HOME } from './state.js'
import { Room } from './Room.jsx'
import { Dog } from '../pets/Dog.jsx'
export { HOME }
export function setupHome(o) { Object.assign(HOME, o) }
export function HomeLayer() { return <><Room /><Dog /></> }
// the door transition: a warm paper-coloured iris that closes and re-opens around the screen centre
export function HomeOverlay() {
  const el = useRef()
  useEffect(() => { let raf; const f = () => { const v = HOME.fade, e = el.current; if (e) { e.style.opacity = v > 0.001 ? 1 : 0; e.style.setProperty('--r', (1 - v) * 120 + '%') } raf = requestAnimationFrame(f) }; f(); return () => cancelAnimationFrame(raf) }, [])
  return <div ref={el} aria-hidden="true" style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 40, opacity: 0, background: 'radial-gradient(circle at 50% 52%, transparent calc(var(--r, 120%) - 6%), #6b4a3a calc(var(--r, 120%) - 1%), #3b2a22 calc(var(--r, 120%) + 30%))' }} />
}
