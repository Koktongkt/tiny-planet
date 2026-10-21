// Game state + persistence (localStorage) + tiny pub/sub. No React here; UI subscribes via useGame().
import { ITEMS, TOOLS } from './items.js'
import { fresh, migrate, TAU } from '../save/schema.js'
// the storage key keeps its historic name; the format version lives in the save's own `v` field (see save/schema.js)
const KEY = 'tinyplanet.save.v1'
const q = new URLSearchParams(location.search)
let S = fresh()
try { if (!q.has('reset') && !q.has('nosave')) { const raw = localStorage.getItem(KEY); if (raw) S = migrate(JSON.parse(raw)) } } catch (e) { S = fresh() }
if (q.has('reset')) localStorage.removeItem(KEY)
export const G = { s: S, ui: { panel: q.get('ui') || null, toasts: [], prompt: null, fish: null, place: null, crafting: null, fly: [] }, near: null, phase: 0, night: 0 }
const subs = new Set()
export const subscribe = (f) => { subs.add(f); return () => subs.delete(f) }
let dirty = false
export const emit = () => { for (const f of subs) f(); if (!dirty) { dirty = true; setTimeout(() => { dirty = false; save() }, 400) } }
// the Clock keeps G.s.clock.a current each frame; persist it now and then and when the tab goes away
if (typeof window !== 'undefined' && !q.has('nosave')) { setInterval(() => save(), 15000); addEventListener('pagehide', () => save()); document.addEventListener('visibilitychange', () => { if (document.hidden) save() }) }
export const save = () => { if (q.has('nosave')) return; try { localStorage.setItem(KEY, JSON.stringify(G.s)) } catch (e) {} }
export const reset = () => { localStorage.removeItem(KEY); G.s = S = fresh(); const rot = window.__rot; if (rot) { rot.a = ((rot.a + Math.PI / 2) % TAU + TAU) % TAU - Math.PI / 2; S.clock.a = rot.a } // day 1 again, same time of day
  toast('A fresh start — the planet is yours again.', 'leaf'); emit() }

let tid = 0
export function toast(text, icon, ms = 2600) { const t = { id: ++tid, text, icon }; G.ui.toasts = [...G.ui.toasts.slice(-3), t]; emit(); setTimeout(() => { G.ui.toasts = G.ui.toasts.filter(x => x !== t); emit() }, ms) }
export const count = (id) => G.s.inv[id] || 0
export function add(id, n = 1, quiet = false) {
  if (TOOLS.includes(id)) G.s.tools[id] = true; else G.s.inv[id] = count(id) + n
  const first = !G.s.seen[id]; G.s.seen[id] = true
  if (!quiet) toast(first ? `New: ${ITEMS[id].name}!` : `+${n} ${ITEMS[id].name}`, id)
  emit()
}
export function take(id, n = 1) { G.s.inv[id] = Math.max(0, count(id) - n); if (!G.s.inv[id]) delete G.s.inv[id] }
// daily respawn: a spot taken on day d is back on day d+1
export const available = (spotId) => { const d = G.s.taken[spotId]; return d === undefined || d < G.s.day }
export const markTaken = (spotId) => { G.s.taken[spotId] = G.s.day }
// Stage B systems (lazy) hook new mornings here: garden growth, gift + errand reset
export const DAY_HOOKS = []
export function newDay(d) { if (d <= G.s.day) return; G.s.day = d; for (const f of DAY_HOOKS) f(d); toast(`A new morning — Day ${d + 1}. Everything has grown back.`, 'sun', 3600); emit() }
export const setPanel = (p) => { G.ui.panel = G.ui.panel === p ? null : p; emit() }
