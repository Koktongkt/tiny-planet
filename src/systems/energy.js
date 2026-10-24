// Stage E energy. Pure. 0–100, default full. Walking is free. Awake time and activities nibble;
// eating Food-category items (see RESTORE) puts it back. Movement slows when it's low and never stops.
export const MAX = 100
export const LOW = 25
export const AWAKE_PER_HOUR = 1.5 // in-game hour, while the clock is actually running (sleep jumps are not billed)
export const LOW_SPEED = 0.75
export const EMPTY_SPEED = 0.55

// Less than a Stardew swing. A short forage → cook → eat loop comes out ahead.
export const COST = {
  gather: 2,
  forage: 2,
  craft: 3,
  fish: 4,
  dig: 4,
  garden: 4,
  cook: 4,
}

// Food-category items only. skyberry is the raw one; every cooked meal restores more.
export const RESTORE = {
  skyberry: 14,
  teacup: 20,
  pine_tea: 20,
  jam: 22,
  acorn_cookie: 28,
  onigiri: 32,
  grilledfish: 34,
  soup: 36,
}

// game event → activity that spends COST. Unknown events (walk, sleep, nap) are free.
export const HOOKS = {
  gather: 'gather', forage: 'gather', pick: 'gather',
  craft: 'craft',
  fish: 'fish', cast: 'fish', reel: 'fish',
  dig: 'dig',
  garden: 'garden', plant: 'garden', water: 'garden', harvest: 'garden',
  cook: 'cook', stove: 'cook',
}

export function clamp(n) {
  if (!Number.isFinite(n)) return MAX
  return Math.max(0, Math.min(MAX, n))
}
export const speedMul = (energy) => {
  const e = clamp(energy)
  if (e <= 0) return EMPTY_SPEED
  if (e <= LOW) return LOW_SPEED
  return 1
}
export function spend(energy, activity) {
  const c = COST[activity]
  const e = clamp(energy)
  if (!c) return e
  return clamp(e - c)
}
export const restoreFor = (itemId) => RESTORE[itemId] || 0
export function eatRestore(energy, itemId) {
  const n = restoreFor(itemId)
  const e = clamp(energy)
  if (!n) return e
  return clamp(e + n)
}
export function awakeDrain(energy, hours) {
  const e = clamp(energy)
  if (!Number.isFinite(hours) || hours <= 0) return e
  return clamp(e - hours * AWAKE_PER_HOUR)
}
export function applyActivity(energy, event) {
  const activity = HOOKS[event] || null
  const before = clamp(energy)
  if (!activity) return { energy: before, event, activity: null, cost: 0 }
  const after = spend(before, activity)
  return { energy: after, event, activity, cost: before - after }
}
