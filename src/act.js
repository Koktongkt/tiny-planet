// Her action animations (polish): a tiny shared state read by the traveller rig + movement, set by the game layer.
// Kept dependency-free so it sits in the startup chunk for ~1 KB; sparkles render from the lazy game chunk.
export const ACT = { kind: null, t0: 0, dur: 0, lock: 0, spark: null }
// debug: ?act=pick&actt=0.4 freezes her in an action pose (with sparkles) for screenshots
const Q = typeof location !== 'undefined' ? new URLSearchParams(location.search) : new URLSearchParams()
export const FREEZE = Q.get('act') ? { kind: Q.get('act'), t: +(Q.get('actt') ?? 0.4) } : null
// round7: extra her-poses registered by lazy chunks (home activities): POSES[kind](B, mix, st, t, w)
export const POSES = {}
const DURS = { feed: 1.2, pick: 0.85, cast: 1.1, reel: 0.7, craft: 1.4, water: 1.0, pet: 1.1, door: 0.55, place: 0.9 }
let ctx = null
function audio() { if (!ctx) try { ctx = new (window.AudioContext || window.webkitAudioContext)() } catch { return null } if (ctx.state === 'suspended') ctx.resume().catch(() => {}); return ctx }
const FL = { pick: [660, 990, 'sine', 0.12, 0.07], spark: [880, 1320, 'triangle', 0.1, 0.05], craft: [440, 660, 'triangle', 0.18, 0.06], water: [520, 380, 'sine', 0.16, 0.05], pet: [320, 480, 'sine', 0.2, 0.04], door: [240, 180, 'triangle', 0.14, 0.05], place: [400, 560, 'sine', 0.12, 0.05], feed: [560, 700, 'sine', 0.12, 0.05], cook: [330, 440, 'triangle', 0.22, 0.05], bath: [260, 200, 'sine', 0.4, 0.05], tea: [700, 900, 'sine', 0.18, 0.04], read: [500, 620, 'sine', 0.15, 0.03], sleep: [300, 200, 'sine', 0.5, 0.04], cast: [300, 500, 'triangle', 0.1, 0.035], reel: [500, 300, 'sine', 0.14, 0.04] }
/** soft synth blip (WebAudio), different per action; silent until the page has had a user gesture */
export function blip(kind = 'pick') {
  const a = audio(); if (!a || a.state !== 'running') return
  const [f0, f1, type, d, v] = FL[kind] || FL.pick, t = a.currentTime, o = a.createOscillator(), g = a.createGain()
  o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + d)
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t + d)
  o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + d + 0.03)
}
/** start an action pose; movement locks for its duration. spark: a world position (THREE.Vector3, planet-local) for the sparkle burst */
export function startAct(kind, o = {}) {
  ACT.kind = kind; ACT.t0 = performance.now(); ACT.dur = o.dur ?? DURS[kind] ?? 0.8; ACT.lock = o.lock ?? ACT.dur
  if (o.sound !== false) blip(o.sound || kind)
  if (o.spark) ACT.spark = { t0: performance.now() + (o.sparkDelay ?? 0) , pos: o.spark.clone ? o.spark.clone() : o.spark, n: o.sparkN ?? 10, col: o.sparkCol }
  return ACT.dur
}
/** per frame from the traveller: writes st.act/actW/actT, returns true while she's locked */
export function tickAct(st) {
  if (FREEZE) { st.act = FREEZE.kind; st.ownAct = true; st.actT = FREEZE.t; st.actW = 1; ACT.kind = FREEZE.kind; ACT.t0 = performance.now() - FREEZE.t * 1000; ACT.lock = 1e9; return true }
  if (!ACT.kind) { if (st.act && st.actW > 0.01 && st.ownAct) { st.actW *= 0.8 } else if (st.ownAct) { st.act = null; st.actW = 0; st.ownAct = false } return false }
  const e = (performance.now() - ACT.t0) / 1000, k = Math.min(1, e / Math.max(0.001, ACT.dur))
  st.act = ACT.kind; st.ownAct = true; st.actT = e; st.actW = k < 0.16 ? k / 0.16 : k > 0.78 ? Math.max(0, (1 - k) / 0.22) : 1
  if (e >= ACT.lock) { ACT.kind = null; return false }
  return true
}
export const actLocked = () => !!ACT.kind && (performance.now() - ACT.t0) / 1000 < ACT.lock
/** run fn after her hand reaches out (so the door / pop lands on the gesture) */
export const afterReach = (fn, ms = 260) => setTimeout(fn, ms)
if (typeof window !== 'undefined') { window.__act = ACT; window.__startAct = startAct }
