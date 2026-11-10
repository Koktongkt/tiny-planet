// Touch walkers past SLEEP_DIST skip the per-frame path / pace / anchor / greet work.
// Missed time is replayed in the same 0.05s slices a hitch already uses, before the mesh is shown,
// so a villager who walks back into range is where the clock says, not where they froze.
export const SLEEP_DIST = 9.5
export const THROTTLE = 0.4
const MAX_STEP = 0.05

export const walkerStats = { steps: 0, skips: 0 }
if (typeof window !== 'undefined') window.__walkerStats = walkerStats

function slices(total) {
  if (!(total > 0)) return []
  if (total <= MAX_STEP) return [total]
  const n = Math.ceil(total / MAX_STEP - 1e-12)
  const step = total / n
  return Array.from({ length: n }, () => step)
}

export function walkerPlan({ touch, talking, dist, acc = 0, dt, placed }) {
  const live = !touch || talking || !placed || !(dist > SLEEP_DIST)
  if (live) return { steps: slices(acc + dt), acc: 0, full: true }
  const next = acc + dt
  if (next < THROTTLE) return { steps: [], acc: next, full: false }
  return { steps: slices(next), acc: 0, full: false }
}
