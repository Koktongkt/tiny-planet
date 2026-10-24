// Stage E live wiring (lazy, loaded with the game UI after live.js): activity + awake energy drain, and the bicycle.
// Food restore itself lives in live.js eatFood. Rules are unit-tested in energy.js / bike.js. Debug: window.__bike.
import { G, emit, toast } from '../game/store.js'
import { HOME } from '../home/state.js'
import * as En from './energy.js'
import * as Bk from './bike.js'
import { SB } from './live.js'

export const RIDE = { mounted: false }
const S = () => G.s

export function ctx() {
  const M = typeof window !== 'undefined' ? window.__museum : null
  const ride = typeof window !== 'undefined' ? window.__scRide : null
  const sc = typeof window !== 'undefined' ? window.__sc : null
  return {
    tools: S().tools,
    inside: !!HOME.inside,
    museum: !!(HOME.alt || (M && M.inside)),
    lock: G.ui.lock || null,
    riding: !!(ride && ride.riding),
    photo: !!(sc && sc.PH && sc.PH.on),
    fish: !!G.ui.fish,
    place: !!G.ui.place,
    panel: !!G.ui.panel,
  }
}

function hopOff() {
  if (!RIDE.mounted) return
  if (Bk.keepMounted(true, ctx())) return
  RIDE.mounted = false
  toast(Bk.BLOCK_TEXT.dismount, 'bike', 1600)
  emit()
}

export function toggle() {
  const c = ctx()
  if (RIDE.mounted && !Bk.keepMounted(true, c)) {
    RIDE.mounted = false
    toast(Bk.BLOCK_TEXT.dismount, 'bike', 1600)
    emit()
    return { mounted: false, ok: true, reason: 'dismount' }
  }
  const next = Bk.tryToggle(RIDE.mounted, c)
  if (!next.ok) { toast(Bk.BLOCK_TEXT[next.reason] || Bk.BLOCK_TEXT.own, 'bike', 2800); return next }
  if (next.mounted === RIDE.mounted) return next
  RIDE.mounted = next.mounted
  toast(Bk.BLOCK_TEXT[next.reason], 'bike', 1800)
  emit()
  return next
}
export const mounted = () => RIDE.mounted
export function hudPrompt() {
  if (!S().tools || !S().tools.bike) return null
  const c = ctx()
  if (c.inside || c.museum || c.fish || c.lock || c.place || c.panel || c.riding || c.photo) return null
  if (RIDE.mounted) return 'off'
  return Bk.tryToggle(false, c).ok ? 'on' : null
}
export const shown = () => RIDE.mounted && Bk.keepMounted(true, ctx())

const swift = () => SB.Bf.has(S().buffs, 'swift', SB.now()) ? SB.Bf.BUFFS.swift.speed : 1
if (typeof window !== 'undefined') {
  window.__energyMul = () => { hopOff(); return En.speedMul(S().energy) }
  window.__moveMul = () => { hopOff(); return Bk.rideScale(S().energy, { swift: swift(), mounted: RIDE.mounted }) }
}

let warnedLow = false, warnedEmpty = false
export function drain(event) {
  const before = En.clamp(S().energy)
  const r = En.applyActivity(before, event)
  if (!r.cost) return r
  S().energy = r.energy
  if (!warnedLow && before > En.LOW && r.energy <= En.LOW) { warnedLow = true; toast('You are getting tired. A bite to eat would help.', 'onigiri', 2800) }
  if (!warnedEmpty && before > 0 && r.energy <= 0) { warnedEmpty = true; toast('You are worn out, but you can still walk — slowly. Eat something.', 'soup', 3200) }
  if (r.energy > En.LOW) { warnedLow = false; warnedEmpty = false }
  return r
}
G.onActivity = drain

// awake drain while the clock actually advances. A jump over an hour is a sleep, a nap, or a hidden tab.
let lastMin = SB.now()
setInterval(() => {
  const m = SB.now()
  const dh = (m - lastMin) / 60
  const before = En.clamp(S().energy)
  if (dh > 0 && dh <= 1) {
    S().energy = En.awakeDrain(before, dh)
    if (!warnedLow && before > En.LOW && S().energy <= En.LOW) { warnedLow = true; toast('You are getting tired. A bite to eat would help.', 'onigiri', 2800) }
    if (!warnedEmpty && before > 0 && S().energy <= 0) { warnedEmpty = true; toast('You are worn out, but you can still walk — slowly. Eat something.', 'soup', 3200) }
  }
  // eating (and any other restore) happens outside this loop; re-arm the toasts once she is back up
  if (S().energy > En.LOW) warnedLow = false
  if (S().energy > 0) warnedEmpty = false
  lastMin = m
}, 2000)

window.__bike = { RIDE, toggle, mounted, hudPrompt, shown, drain, ctx, En, Bk }
