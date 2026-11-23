// Light-weight pickup chip reminders (pure). The gold outline always marks the item; the small E chip shows only while
// the player is learning an item (first 3 pickups), when they hesitate at one (1.5 s without pressing E), or after a
// day away from it. Counts live in the save as G.s.hints = { [item]: { n, day } }.
export const HINT = { firstN: 3, idleMs: 1500, staleDays: 1 }
export function chipShows(hints, item, day, idleMs) {
  const h = hints && hints[item]
  if (!h || !(h.n >= HINT.firstN)) return true
  if (idleMs >= HINT.idleMs) return true
  return day - h.day >= HINT.staleDays
}
export function notePickup(hints, item, day) {
  const h = hints[item]
  hints[item] = { n: (h && Number.isFinite(h.n) ? h.n : 0) + 1, day }
}
