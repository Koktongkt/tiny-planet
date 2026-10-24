// Food buffs (Stage B). Pure. Buff: { id: 'swift'|'cozy'|'lucky', endsAt: in-game minutes }. Small, timed, no stacking
// of the same kind (eating again refreshes it). In-game minutes come from the clock phase: one day = 1440.
export const TAU = Math.PI * 2
export const gameMinutes = (a) => (a / TAU * 24 + 12) * 60
export const BUFFS = {
  swift: { name: 'Swift', desc: 'walk and run a little faster', speed: 1.15 },
  cozy: { name: 'Cozy', desc: 'friendship grows faster from gifts', heartsMul: 1.5 },
  lucky: { name: 'Lucky', desc: 'sometimes find an extra one when gathering', bonus: 0.35 },
}
// food -> [buff, in-game minutes]
export const FOOD = {
  acorn_cookie: ['swift', 180], onigiri: ['swift', 120], grilledfish: ['swift', 120],
  pine_tea: ['cozy', 180], teacup: ['cozy', 120], soup: ['cozy', 150],
  jam: ['lucky', 150], skyberry: ['lucky', 120],
}
const foodKey = (id) => (typeof id === 'string' && id.endsWith('_perfect') ? id.slice(0, -8) : id)
export function eat(buffs, itemId, now) {
  const f = FOOD[itemId] || FOOD[foodKey(itemId)]; if (!f) return null
  const [id, dur] = f, b = buffs.find(x => x.id === id), endsAt = now + dur
  if (b) b.endsAt = Math.max(b.endsAt, endsAt); else buffs.push({ id, endsAt })
  return id
}
export const active = (buffs, now) => buffs.filter(b => b.endsAt > now)
export const has = (buffs, id, now) => buffs.some(b => b.id === id && b.endsAt > now)
export function prune(buffs, now) { for (let i = buffs.length - 1; i >= 0; i--) if (buffs[i].endsAt <= now) buffs.splice(i, 1) }
