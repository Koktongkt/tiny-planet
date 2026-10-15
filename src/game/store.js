// Game state + persistence (localStorage) + tiny pub/sub. No React here; UI subscribes via useGame().
import { ITEMS, RECIPES, TOOLS, DECOR } from './items.js'
import { startAct, blip, ACT } from '../act.js'
const KEY = 'tinyplanet.save.v1'
const q = new URLSearchParams(location.search)
const fresh = () => ({ inv: {}, seen: {}, tools: {}, placed: [], unlocked: {}, taken: {}, day: 0, chest: false, crafted: 0 })
let S = fresh()
try { if (!q.has('reset') && !q.has('nosave')) Object.assign(S, JSON.parse(localStorage.getItem(KEY) || '{}')) } catch (e) {}
if (q.has('reset')) localStorage.removeItem(KEY)
export const G = { s: S, ui: { panel: q.get('ui') || null, toasts: [], prompt: null, fish: null, place: null, crafting: null, fly: [] }, near: null, phase: 0, night: 0 }
const subs = new Set()
export const subscribe = (f) => { subs.add(f); return () => subs.delete(f) }
let dirty = false
export const emit = () => { for (const f of subs) f(); if (!dirty) { dirty = true; setTimeout(() => { dirty = false; save() }, 400) } }
export const save = () => { if (q.has('nosave')) return; try { localStorage.setItem(KEY, JSON.stringify(G.s)) } catch (e) {} }
export const reset = () => { localStorage.removeItem(KEY); G.s = S = fresh(); toast('A fresh start — the planet is yours again.', 'leaf'); emit() }

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
// recipe helpers
const needCount = (need) => typeof need[0] === 'string' ? count(need[0]) : need[0].any.reduce((s, k) => s + count(k), 0)
export const haveFor = (r) => r.needs.map(nd => ({ need: nd, have: needCount(nd), ok: needCount(nd) >= nd[1] }))
export const known = (r) => r.needs.every(([k]) => typeof k === 'string' ? G.s.seen[k] : k.any.some(x => G.s.seen[x]))
export const owned = (r) => (r.cat === 'Tools' && G.s.tools[r.makes]) || (r.cat === 'Unlock' && G.s.unlocked.bridge)
export const canCraft = (r) => !owned(r) && haveFor(r).every(h => h.ok)
export function craft(r, done) {
  if (!canCraft(r) || G.ui.crafting) return
  G.ui.crafting = { id: r.id, t0: performance.now() }; emit(); startAct('craft', { dur: 1.25 }); const P_ = G.P; if (P_ && P_.n) setTimeout(() => { blip('spark') }, 1050)
  const hold = q.get('craft') === r.id
  setTimeout(() => {
    if (hold) return
    for (const [k, n] of r.needs) { if (typeof k === 'string') take(k, n); else { let left = n; for (const x of k.any) { const u = Math.min(left, count(x)); take(x, u); left -= u } } }
    G.ui.crafting = null; G.s.crafted++
    if (r.cat === 'Unlock') { G.s.unlocked.bridge = true; toast('The rope bridge is up! A new path climbs the cliff.', 'bridgekit', 4200) }
    else { add(r.makes, 1, true); toast(`✦ Crafted ${ITEMS[r.makes].name}!`, r.makes) }
    if (G.benchPos) ACT.spark = { t0: performance.now(), pos: G.benchPos.clone(), n: 14, col: 'gold' }
    emit(); done && done()
  }, 1100)
}
// daily respawn: a spot taken on day d is back on day d+1
export const available = (spotId) => { const d = G.s.taken[spotId]; return d === undefined || d < G.s.day }
export const markTaken = (spotId) => { G.s.taken[spotId] = G.s.day }
export function newDay(d) { if (d <= G.s.day) return; G.s.day = d; toast(`A new morning — Day ${d + 1}. Everything has grown back.`, 'sun', 3600); emit() }
export const setPanel = (p) => { G.ui.panel = G.ui.panel === p ? null : p; emit() }
// debug: ?give=all | ?give=wood:3,reed:2
if (q.has('give')) {
  const g = q.get('give')
  if (g === 'all') { for (const k of Object.keys(ITEMS)) { if (TOOLS.includes(k)) G.s.tools[k] = true; else if (!['bridgekit'].includes(k)) G.s.inv[k] = DECOR.includes(k) ? 2 : 9; G.s.seen[k] = true } }
  else if (g === 'some') { Object.assign(G.s.inv, { wood: 4, reed: 2, mushroom: 3, berries: 5, flower: 3, rice: 2, shell: 2, moss: 1, stone: 1 }); for (const k of Object.keys(G.s.inv)) G.s.seen[k] = true }
  else for (const part of g.split(',')) { const [k, n] = part.split(':'); if (ITEMS[k]) { if (TOOLS.includes(k)) G.s.tools[k] = true; else G.s.inv[k] = +(n || 5); G.s.seen[k] = true } }
}
if (q.has('unlock')) G.s.unlocked.bridge = true
export { RECIPES, ITEMS }
