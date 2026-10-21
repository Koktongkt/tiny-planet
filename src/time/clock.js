// The planet clock. rot.a is the sun phase in radians (0 = noon, pi/2 = sunset, pi = midnight, 3pi/2 = sunrise) and keeps
// counting up: one full turn per in-game day, so floor((a + pi/2) / 2pi) is the day index (save/schema.js dayFromPhase).
// ?t=day|dusk|night or ?phase=<rad> pin the lighting ("fixed"): the clock stands still and isn't persisted.
import { q } from '../common.jsx'
import { G } from '../game/store.js'
export const PRESET = { day: 0.35, dusk: 1.72, night: 3.0 }
export const fixed = q.has('t') || q.has('phase')
export const rot = { a: q.has('phase') ? +q.get('phase') : PRESET[q.get('t')] ?? 0.4, v: 0 }
export const ROT_A0 = rot.a // the phase before the save is applied (the orbit view's initial spin is derived from it)
window.__rot = rot
window.__setPhase = (p) => { rot.a = typeof p === 'string' ? PRESET[p] : p; rot.v = 0 }
// stage-a: the clock phase lives in the save, so the day (and regrowth, sleep) continues across reloads
if (!fixed && Number.isFinite(G.s.clock?.a)) rot.a = G.s.clock.a
// one in-game day per real hour (?daylen=<sec> to override)
export const DAY_SEC = q.has('daylen') ? Math.max(10, +q.get('daylen') || 3600) : 3600
