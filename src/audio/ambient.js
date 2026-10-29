// Tiny Planet audio runtime (lazy chunk; loaded by arm.js on the first user gesture): ambience (engine.js), the
// procedural score (music/player.js, its own chunk, a few seconds later) and the activity SFX (sfx.js + hooks.js).
// Contract (roadmap/stage-b-contract.md): startAudio({ getListener, getZones }) -> { setVolume, setMusic, setSfx, mute, dispose, sfx }
// Extra: getAudioSettings() -> { volume, music, sfx, muted } (for <SettingsPanel value>), onAudioSettings(fn) -> unsubscribe.
import { buildGraph } from './engine.js'
import { zonesAt, defaultListener } from './zones.js'
import { createSfx } from './sfx.js'
import { hookGame } from './hooks.js'

const KEY = 'tp-audio', MUSIC_DELAY = 3000, TICK_MS = 100
const MUSIC_LEVEL = 1.4, AMB_LEVEL = 0.9, SFX_LEVEL = 1.8 // the score sits under the ambience; SFX a touch forward
let SET = { volume: 0.8, music: 0.7, sfx: 0.8, muted: false }
try { SET = { ...SET, ...JSON.parse(localStorage.getItem(KEY) || '{}') } } catch (e) {}
const subs = new Set()
const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(SET)) } catch (e) {} for (const f of subs) f({ ...SET }) }
export const getAudioSettings = () => ({ ...SET })
export const onAudioSettings = (f) => { subs.add(f); return () => subs.delete(f) }
const c01 = (v) => Math.max(0, Math.min(1, +v || 0))

/** listener -> the score's scene: where she is (loc), time of day, season, rain */
export function sceneFor(L, Z) {
  const n = Z.night ?? L.night ?? 0, T = typeof window !== 'undefined' && window.__T
  return { loc: L.loc || (L.inside ? 'house' : 'outdoor'), period: n > 0.6 ? 'night' : n > 0.15 ? 'evening' : 'day', season: L.season || (T && T.season) || 'spring', rain: Z.rain || 0, orbit: L.mode === 'orbit' ? 1 : 0 }
}

let API = null
export function startAudio(opts = {}) {
  if (API) return API
  const t0 = performance.now()
  let ctx = opts.ctx
  if (!ctx) try { ctx = new (window.AudioContext || window.webkitAudioContext)() } catch (e) { return (API = { setVolume() {}, setMusic() {}, setSfx() {}, mute() {}, dispose() {}, sfx() { return false } }) }
  const E = buildGraph(ctx, undefined, true), getL = opts.getListener || defaultListener, getZ = opts.getZones || zonesAt
  const S = createSfx(ctx, E.sfx), H = hookGame(S)
  const D = window.__audio = { ctx, E, S, H, ticks: 0, tickMs: 0, tickMax: 0, buildMs: 0, mix: null, music: null, scene: null }
  // act.js blip(kind) asks play() first; anything else can call __tpAudio.sfx(name, { delay, vol, rate, pan })
  window.__tpAudio = { ctx, sfx: E.sfx, play: (kind) => H.act(kind), fx: (name, o) => S.play(name, o) }
  S.warm()

  const applyMaster = (tc = 0.25) => {
    const on = !SET.muted && SET.volume > 0 && !document.hidden
    E.master.gain.setTargetAtTime(on ? SET.volume * AMB_LEVEL : 0, ctx.currentTime, tc)
    E.music.gain.setTargetAtTime(SET.music * MUSIC_LEVEL, ctx.currentTime, 0.6)
    E.sfx.gain.setTargetAtTime((SET.sfx ?? 0.8) * SFX_LEVEL, ctx.currentTime, 0.1)
    // 'interrupted' (iOS: call, Siri, lock screen) needs a resume too; arm.js retries on the next tap if this one is refused
    if (on) { if (ctx.state !== 'running' && ctx.state !== 'closed') ctx.resume().catch(() => {}) } else { clearTimeout(sus); sus = setTimeout(() => { if (SET.muted || document.hidden || !SET.volume) ctx.suspend().catch(() => {}) }, 800) }
  }
  let sus = 0

  // ---- the score: procedural, its own lazy chunk; instrument samples render in small slices, current place first ----
  let M = null, loading = false
  const loadMusic = () => {
    if (M || loading || opts.music === false || !(SET.music > 0)) return
    loading = true; import('./music/player.js').then(m => { if (!API) return; M = D.music = m.createMusic(ctx, E.music) })
  }
  const musicT = setTimeout(loadMusic, opts.musicDelay ?? MUSIC_DELAY)

  // ---- 10 Hz mix update (no per-frame work) ----
  const tick = () => {
    const s = performance.now()
    if (ctx.state === 'running') {
      const L = getL(), Z = getZ(L), mix = mixFor(L, Z), now = ctx.currentTime
      E.setMix(mix); E.schedule(now + 0.6); D.mix = mix
      try { H.tick(L, Z, now) } catch (e) { D.hookErr = e }
      if (M && SET.music > 0) { const sc = D.scene = sceneFor(L, Z); M.setScene(sc, now); M.schedule(now + 0.6) }
    }
    D.ticks++; D.tickMs = performance.now() - s; if (D.ticks > 1 && D.tickMs > D.tickMax) D.tickMax = D.tickMs
  }
  let iv = 0; E.ready.then(() => { if (API) { tick(); iv = setInterval(tick, TICK_MS) } }) // start ticking once the staged build is done
  const vis = () => applyMaster(0.15)
  document.addEventListener('visibilitychange', vis); addEventListener('pageshow', vis) // pageshow: back/forward-cache restore (iOS)
  window.__tpAudioWant = () => !SET.muted && SET.volume > 0 && !document.hidden // arm.js: may a tap wake the context?
  applyMaster(1.2)
  D.buildMs = performance.now() - t0; E.ready.then(() => { D.readyMs = performance.now() - t0 })

  API = {
    setVolume(v) { SET.volume = c01(v); persist(); applyMaster() },
    setMusic(v) { SET.music = c01(v); persist(); if (SET.music > 0) loadMusic(); applyMaster() },
    setSfx(v) { SET.sfx = c01(v); persist(); applyMaster() },
    mute(b = true) { SET.muted = !!b; persist(); applyMaster() },
    sfx: (name, o) => S.play(name, o),
    get settings() { return { ...SET } },
    dispose() { clearInterval(iv); clearTimeout(musicT); clearTimeout(sus); document.removeEventListener('visibilitychange', vis); removeEventListener('pageshow', vis); window.__tpAudioWant = null; if (M) M.dispose(); E.dispose(); chip && chip.remove(); ctx.close().catch(() => {}); API = null; window.__audio = null; window.__tpAudio = null },
  }
  let chip = null
  if (opts.chip !== false) import('./chip.js').then(m => { if (API) chip = m.mountChip(API, getAudioSettings, onAudioSettings) })
  return API
}

/** listener + zones -> layer mix (0..1). Exported for previews/tests. */
export function mixFor(L, Z) {
  const night = Z.night, day = 1 - night, inside = L.inside ? 1 : 0, orbit = L.mode === 'orbit' ? 1 : 0, out = (1 - inside) * (1 - orbit)
  const rain = Z.rain || 0, dry = 1 - 0.85 * rain // Stage C: birds shelter and crickets hush while it rains
  return {
    wind: (orbit ? 0.75 : inside ? 0.22 : 0.32 + 0.55 * Z.hill + 0.12 * Z.lake) * (1 + 0.25 * rain),
    windTone: orbit ? 0.9 : Z.hill,
    birds: dry * day * (inside ? 0.35 : out) * (0.25 + 0.75 * Math.max(Z.forest, 0.55 * Z.village, 0.6 * Z.meadow)),
    coo: Z.meadow > 0.4 || Z.village > 0.4,
    insects: (1 - 0.7 * rain) * night * (inside ? 0.4 : out) * (0.55 + 0.45 * Math.max(Z.meadow, Z.forest, 0.6)),
    rain: rain * (orbit ? 0.35 : inside ? 0.5 : 1), roof: rain * inside,
    river: out * Z.river, bubbles: out * Z.river * 0.9, lake: out * Z.lake,
    muffle: inside ? 0.12 : 1,
    // Stage C train: proximity (orbit = distant toy, indoors = faint), speed 0..1, riding = she's aboard (closer, louder)
    train: (Z.riding ? 1 : (Z.train || 0)) * (orbit ? 0.3 : inside ? 0.25 : 1), trainSpeed: Z.trainSpeed || 0, riding: Z.riding ? 1 : 0,
  }
}
