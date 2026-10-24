// Recipe helpers + crafting at the bench + the ?give / ?unlock debug params. Lazy (game chunks only), moved out of
// store.js in Stage B to keep the startup chunk under budget. Importing it also merges the Stage B item ids (itemsB.js).
import { G, emit, toast, count, add, take } from './store.js'
import { ITEMS, TOOLS, DECOR } from './items.js'
import './itemsB.js'
import './itemsE.js'
import { RECIPES } from './recipes.js'
import './itemsF.js'
import { startAct, blip, ACT } from '../act.js'
const q = new URLSearchParams(location.search)
const COOK_STEPS = { stir: 1, flip: 1, press: 1, pour: 1 }
const stepOf = (r) => (r && COOK_STEPS[r.cook] ? r.cook : 'stir')
function spendNeeds(r) {
  for (const [k, n] of r.needs) {
    if (typeof k === 'string') take(k, n)
    else { let left = n; for (const x of k.any) { const u = Math.min(left, count(x)); take(x, u); left -= u } }
  }
}
// Always yields a dish. Ingredients leave the bag only here, once.
export function finishDish(r, result, o = {}) {
  if (!r || !result || !result.item) return null
  spendNeeds(r)
  const item = result.item
  add(item, 1, true)
  if (o.crafted) G.s.crafted++
  if (o.activity && G.onActivity) G.onActivity(o.activity)
  const name = (ITEMS[item] && ITEMS[item].name) || item
  const icon = item.endsWith('_perfect') ? item.slice(0, -8) : item
  toast(result.perfect ? `✦ Perfect ${name}!` : `✦ Cooked ${name}! Into the bag it goes.`, icon)
  if (o.spark && G.benchPos) ACT.spark = { t0: performance.now(), pos: G.benchPos.clone(), n: 14, col: 'gold' }
  emit()
  return item
}
function openSession(recipe, step, debug) {
  const prev = G.ui.cook
  if (prev && !prev.settled) { prev.settled = true; prev.resolve(null) }
  return new Promise(resolve => {
    G.ui.cook = { recipe, step, resolve, debug: !!debug, settled: false }
    emit()
  })
}
// Auto-cook never fetches the mini-game. ?cook= still opens a step, so a debug URL can be played.
export function playFood(recipe) {
  if (G.s.settings && G.s.settings.autoCook && !q.has('cook'))
    return Promise.resolve({ item: recipe.makes, perfect: false, via: 'auto' })
  return openSession(recipe, stepOf(recipe), false)
}
const SAMPLE = { stir: 'soup', flip: 'grilledfish', press: 'onigiri', pour: 'teacup' }
export function openCookStep(step) {
  const cook = COOK_STEPS[step] ? step : 'stir'
  const id = SAMPLE[cook]
  const recipe = RECIPES.find(r => r.id === id) || { id, makes: id, cat: 'Food', needs: [], cook }
  return openSession({ ...recipe, cook }, cook, true)
}
function craftFood(r, done) {
  G.ui.crafting = { id: r.id, t0: performance.now() }
  emit()
  startAct('craft', { dur: 1.25 })
  const P_ = G.P; if (P_ && P_.n) setTimeout(() => { blip('spark') }, 1050)
  playFood(r).then(result => {
    G.ui.crafting = null
    if (result) finishDish(r, result, { crafted: true, activity: 'craft', spark: true })
    else emit()
    done && done()
  }).catch(() => { G.ui.crafting = null; emit(); done && done() })
}
// recipe helpers
const needCount = (need) => typeof need[0] === 'string' ? count(need[0]) : need[0].any.reduce((s, k) => s + count(k), 0)
export const haveFor = (r) => r.needs.map(nd => ({ need: nd, have: needCount(nd), ok: needCount(nd) >= nd[1] }))
export const known = (r) => r.needs.every(([k]) => typeof k === 'string' ? G.s.seen[k] : k.any.some(x => G.s.seen[x]))
export const owned = (r) => (r.cat === 'Tools' && G.s.tools[r.makes]) || (r.cat === 'Unlock' && G.s.unlocked.bridge)
export const canCraft = (r) => !owned(r) && haveFor(r).every(h => h.ok)
export function craft(r, done) {
  if (!canCraft(r) || G.ui.crafting) return
  if (r.cat === 'Food') return craftFood(r, done)
  G.ui.crafting = { id: r.id, t0: performance.now() }; emit(); startAct('craft', { dur: 1.25 }); const P_ = G.P; if (P_ && P_.n) setTimeout(() => { blip('spark') }, 1050)
  const hold = q.get('craft') === r.id
  setTimeout(() => {
    if (hold) return
    for (const [k, n] of r.needs) { if (typeof k === 'string') take(k, n); else { let left = n; for (const x of k.any) { const u = Math.min(left, count(x)); take(x, u); left -= u } } }
    G.ui.crafting = null; G.s.crafted++
    if (r.cat === 'Unlock') { G.s.unlocked.bridge = true; toast('The rope bridge is up! A new path climbs the cliff.', 'bridgekit', 4200) }
    else { add(r.makes, 1, true); toast(`✦ Crafted ${ITEMS[r.makes].name}!`, r.makes) }
    G.onActivity && G.onActivity('craft')
    if (G.benchPos) ACT.spark = { t0: performance.now(), pos: G.benchPos.clone(), n: 14, col: 'gold' }
    emit(); done && done()
  }, 1100)
}
// debug: ?give=all | ?give=wood:3,reed:2
if (q.has('give')) {
  const g = q.get('give')
  if (g === 'all') { for (const k of Object.keys(ITEMS)) { if (TOOLS.includes(k)) G.s.tools[k] = true; else if (!['bridgekit'].includes(k)) G.s.inv[k] = DECOR.includes(k) ? 2 : 9; G.s.seen[k] = true } }
  else if (g === 'some') { Object.assign(G.s.inv, { wood: 4, reed: 2, mushroom: 3, berries: 5, flower: 3, rice: 2, shell: 2, moss: 1, stone: 1 }); for (const k of Object.keys(G.s.inv)) G.s.seen[k] = true }
  else for (const part of g.split(',')) { const [k, n] = part.split(':'); if (ITEMS[k]) { if (TOOLS.includes(k)) G.s.tools[k] = true; else G.s.inv[k] = +(n || 5); G.s.seen[k] = true } }
}
if (q.has('unlock')) G.s.unlocked.bridge = true
if (typeof window !== 'undefined') {
  window.__tp = { G, emit, itemName: (id) => (ITEMS[id] && ITEMS[id].name) || '' }
  const api = window.__tpCook || (window.__tpCook = {})
  if (api.scale == null) api.scale = 1
  api.hold = !!api.hold
  api.open = (step) => openCookStep(step)
  api.skip = () => { api._skip && api._skip() }
  api.finish = () => { api._finish && api._finish() }
  api.close = () => { api._close && api._close() }
  api.force = (v) => { api.forced = v === 'perfect' || v === 'normal' ? v : null; return api.forced }
  if (!Object.getOwnPropertyDescriptor(api, 'state')?.get) Object.defineProperty(api, 'state', { configurable: true, get: () => api._state || null })
  if (q.has('cookResult')) api.force(q.get('cookResult'))
  if (q.has('cook')) setTimeout(() => openCookStep(q.get('cook')), 0)
}
export { RECIPES, ITEMS }
