// Stage E bicycle. Pure rules: one craft, then tools.bike forever, and where she is allowed to be on it.
// The coin-instead-of-shard path is not used. Recipe `any` sums one shared count, and 2 coins is not 1 shard.
import { speedMul } from './energy.js'

export const BIKE_SPEED = 1.7 // multiplies her stroll and her run. A stroll on it lands next to running; Shift while riding is much faster
export const RECIPE = { id: 'bike', cat: 'Tools', makes: 'bike', needs: [['wood', 4], ['stone', 2], ['shard', 1]] }

export function canCraftBike(save) {
  if (save.tools && save.tools.bike) return false
  const inv = save.inv || {}
  return RECIPE.needs.every(([k, n]) => typeof k === 'string' && (inv[k] || 0) >= n)
}
export function craftBike(save) {
  if (!canCraftBike(save)) return false
  for (const [k, n] of RECIPE.needs) {
    save.inv[k] -= n
    if (save.inv[k] <= 0) delete save.inv[k]
  }
  save.tools = save.tools || {}
  save.tools.bike = true
  save.crafted = (save.crafted || 0) + 1
  save.seen = save.seen || {}
  save.seen.bike = true
  return true
}

// hard: she cannot stay mounted. soft: she also cannot mount (bag and placement included).
function hard(ctx) {
  if (ctx.inside) return 'inside'
  if (ctx.museum) return 'museum'
  if (ctx.lock === 'ride' || ctx.riding) return 'ride'
  if (ctx.lock === 'photo' || ctx.photo) return 'photo'
  if (ctx.fish) return 'fish'
  return null
}
function blocked(ctx) {
  return hard(ctx) || (ctx.place ? 'place' : null) || (ctx.panel ? 'panel' : null)
}

export function tryToggle(mounted, ctx = {}) {
  if (mounted) return { mounted: false, ok: true, reason: 'dismount' }
  if (!ctx.tools || !ctx.tools.bike) return { mounted: false, ok: false, reason: 'own' }
  const why = blocked(ctx)
  if (why) return { mounted: false, ok: false, reason: why }
  return { mounted: true, ok: true, reason: 'mount' }
}
// true while she should stay on it. Opening the bag or placing decor does not kick her off.
export function keepMounted(mounted, ctx = {}) {
  if (!mounted || !ctx.tools || !ctx.tools.bike) return false
  return !hard(ctx)
}
export function rideScale(energy, { swift = 1, mounted = false } = {}) {
  return speedMul(energy) * swift * (mounted ? BIKE_SPEED : 1)
}

export const BLOCK_TEXT = {
  own: 'Craft a bicycle at the bench: 4 wood, 2 stone and a pottery shard.',
  inside: 'The bicycle stays outside.',
  museum: 'Walk the museum — the bicycle stays at the door.',
  ride: 'No bicycles on the train.',
  photo: 'Hop off before taking a photo.',
  fish: 'The bicycle waits while you fish.',
  place: 'Finish placing that first.',
  panel: 'Close this first.',
  dismount: 'You hop off.',
  mount: 'You hop on. The path feels quicker.',
}
