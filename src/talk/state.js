// Talk + villager-life shared state (no React). Walkers register here; the Talk component picks who is near her.
export const NPCS = [] // { key, w, obj (THREE.Group in planet space), st }
export const TALK = { near: null, open: null, page: 0, lines: null, onOpen: null, recent: [], lastInside: false }
// simple weather: one kind per in-game day (deterministic), only light touches (dialogue + cloud tint); there was none before
const KINDS = ['clear', 'breezy', 'clear', 'cloudy', 'breezy', 'drizzle', 'clear']
export const WEATHER = { kind: 'clear', day: -1 }
export function weatherFor(day) { if (day !== WEATHER.day) { WEATHER.day = day; WEATHER.kind = KINDS[((day * 5 + 3) % KINDS.length + KINDS.length) % KINDS.length] } return WEATHER.kind }
// recent activity: newest first, capped
export function noteActivity(kind, what) { TALK.recent.unshift({ kind, what, t: performance.now() }); TALK.recent.length = Math.min(TALK.recent.length, 6) }
export const recentActivity = () => TALK.recent.find(a => performance.now() - a.t < 180000) || null
// time of day from the planet clock phase (rot.a): 0 = noon, pi/2 = sunset, pi = midnight, 3pi/2 = sunrise
export function periodAt(a) { const p = ((a % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2); if (p < 0.45 || p > 5.6) return 'day'; if (p < 1.95) return p < 1.25 ? 'day' : 'evening'; if (p < 4.3) return 'night'; return 'morning' }
if (typeof window !== 'undefined') window.__talk = TALK
