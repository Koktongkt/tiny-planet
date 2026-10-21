// Save schema + ordered migrations. Pure (no DOM), so node unit tests can import it.
// Every save carries an explicit `v`. A save without `v` is a v1 save (the original Gather & Craft format).
// To change the format: bump SAVE_VERSION, add one step to MIGRATIONS (from = old version), and extend fresh().
export const SAVE_VERSION = 2
export const TAU = Math.PI * 2
// clock phase (rot.a) the game starts at: 0 = noon, so 0.4 is early afternoon
export const START_PHASE = 0.4
// day index the sun angle implies; the same formula the Clock uses
export const dayFromPhase = (a) => Math.max(0, Math.floor((a + Math.PI / 2) / TAU))

export const fresh = () => ({ v: SAVE_VERSION, inv: {}, seen: {}, tools: {}, placed: [], unlocked: {}, taken: {}, day: 0, chest: false, crafted: 0, clock: { a: START_PHASE } })

// each step takes a save of version `from` and returns one of version `from + 1`
export const MIGRATIONS = [
  { from: 1, up: (s) => {
    // v2: explicit version + persisted clock. v1 saves only had `day`; resume on that day at the start phase.
    const day = Number.isFinite(s.day) && s.day > 0 ? Math.floor(s.day) : 0
    return { ...s, day, clock: { a: START_PHASE + day * TAU } }
  } },
]

const isObj = (x) => x && typeof x === 'object' && !Array.isArray(x)

// raw: parsed JSON (or anything). Returns a complete save at SAVE_VERSION. Never throws.
export function migrate(raw) {
  if (!isObj(raw)) return fresh()
  let s = { ...raw }, v = Number.isInteger(s.v) ? s.v : 1
  if (v > SAVE_VERSION) v = SAVE_VERSION // a newer build wrote it; keep what we understand
  for (const m of MIGRATIONS) if (m.from === v) { s = m.up(s); v = m.from + 1 }
  s.v = SAVE_VERSION
  return normalize(s)
}

// fill missing / wrong-typed fields from defaults (keeps unknown extra fields, e.g. Studio's `watered`)
export function normalize(s) {
  const d = fresh(), o = { ...d, ...s }
  for (const k of ['inv', 'seen', 'tools', 'unlocked', 'taken']) if (!isObj(o[k])) o[k] = {}
  if (!Array.isArray(o.placed)) o.placed = []
  if (!Number.isFinite(o.day) || o.day < 0) o.day = 0
  if (!Number.isFinite(o.crafted)) o.crafted = 0
  if (!isObj(o.clock) || !Number.isFinite(o.clock.a)) o.clock = { a: START_PHASE + o.day * TAU }
  // the clock must never sit on an earlier day than the counter (would stall regrowth): move it forward whole days
  const lag = o.day - dayFromPhase(o.clock.a); if (lag > 0) o.clock = { a: o.clock.a + lag * TAU }
  return o
}
