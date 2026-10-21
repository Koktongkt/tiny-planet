// Recipe helpers + crafting at the bench + the ?give / ?unlock debug params. Lazy (game chunks only), moved out of
// store.js in Stage B to keep the startup chunk under budget. Importing it also merges the Stage B item ids (itemsB.js).
import { G, emit, toast, count, add, take } from './store.js'
import { ITEMS, TOOLS, DECOR } from './items.js'
import './itemsB.js'
import { RECIPES } from './recipes.js'
import { startAct, blip, ACT } from '../act.js'
const q = new URLSearchParams(location.search)
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
// debug: ?give=all | ?give=wood:3,reed:2
if (q.has('give')) {
  const g = q.get('give')
  if (g === 'all') { for (const k of Object.keys(ITEMS)) { if (TOOLS.includes(k)) G.s.tools[k] = true; else if (!['bridgekit'].includes(k)) G.s.inv[k] = DECOR.includes(k) ? 2 : 9; G.s.seen[k] = true } }
  else if (g === 'some') { Object.assign(G.s.inv, { wood: 4, reed: 2, mushroom: 3, berries: 5, flower: 3, rice: 2, shell: 2, moss: 1, stone: 1 }); for (const k of Object.keys(G.s.inv)) G.s.seen[k] = true }
  else for (const part of g.split(',')) { const [k, n] = part.split(':'); if (ITEMS[k]) { if (TOOLS.includes(k)) G.s.tools[k] = true; else G.s.inv[k] = +(n || 5); G.s.seen[k] = true } }
}
if (q.has('unlock')) G.s.unlocked.bridge = true
export { RECIPES, ITEMS }
