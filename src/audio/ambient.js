// Tiny Planet ambient audio runtime (lazy chunk; loaded by arm.js on the first user gesture).
// Contract (roadmap/stage-b-contract.md): startAudio({ getListener, getZones }) -> { setVolume(0..1), setMusic(0..1), mute(bool), dispose() }
// Extra: getAudioSettings() -> { volume, music, muted } (for <SettingsPanel value>), onAudioSettings(fn) -> unsubscribe.
import { buildGraph } from './engine.js'
import { zonesAt, defaultListener } from './zones.js'

const KEY = 'tp-audio', MUSIC_DELAY = 4000, TICK_MS = 100
const MUSIC_LEVEL = 0.28, AMB_LEVEL = 0.9 // piano sits well under the ambience
let SET = { volume: 0.8, music: 0.7, muted: false }
try { SET = { ...SET, ...JSON.parse(localStorage.getItem(KEY) || '{}') } } catch (e) {}
const subs = new Set()
const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(SET)) } catch (e) {} for (const f of subs) f({ ...SET }) }
export const getAudioSettings = () => ({ ...SET })
export const onAudioSettings = (f) => { subs.add(f); return () => subs.delete(f) }

let API = null
export function startAudio(opts = {}) {
  if (API) return API
  const t0 = performance.now()
  let ctx = opts.ctx
  if (!ctx) try { ctx = new (window.AudioContext || window.webkitAudioContext)() } catch (e) { return (API = { setVolume() {}, setMusic() {}, mute() {}, dispose() {} }) }
  const E = buildGraph(ctx, undefined, true), getL = opts.getListener || defaultListener, getZ = opts.getZones || zonesAt
  const D = window.__audio = { ctx, E, ticks: 0, tickMs: 0, tickMax: 0, buildMs: 0, mix: null, music: null }
  // share with the SFX blips (src/act.js) if it opts in: window.__tpAudio.{ctx, sfx}
  window.__tpAudio = { ctx, sfx: E.sfx }

  const applyMaster = (tc = 0.25) => {
    const on = !SET.muted && SET.volume > 0 && !document.hidden
    E.master.gain.setTargetAtTime(on ? SET.volume * AMB_LEVEL : 0, ctx.currentTime, tc)
    E.music.gain.setTargetAtTime(SET.music * MUSIC_LEVEL, ctx.currentTime, 1.5)
    if (on) { if (ctx.state === 'suspended') ctx.resume().catch(() => {}); if (el && SET.music > 0) playEl() } else { if (el) el.pause(); clearTimeout(sus); sus = setTimeout(() => { if (SET.muted || document.hidden || !SET.volume) ctx.suspend().catch(() => {}) }, 800) }
    if (el && !(SET.music > 0)) el.pause()
  }
  let sus = 0

  // ---- piano loop: streamed through a media element (decoded off the main thread), fetched a few seconds in ----
  let el = null
  const playEl = () => { const p = el.play(); if (p && p.catch) p.catch(() => { const r = () => { removeEventListener('pointerdown', r, true); if (!SET.muted && SET.music > 0) el.play().catch(() => {}) }; addEventListener('pointerdown', r, true) }) }
  const loadMusic = () => {
    if (el || opts.music === false) return
    el = new Audio(); el.loop = true; el.preload = 'auto'; el.crossOrigin = 'anonymous'
    const base = (import.meta.env && import.meta.env.BASE_URL) || './'
    el.src = base + (el.canPlayType('audio/ogg; codecs="opus"') ? 'audio/piano-loop.ogg' : 'audio/piano-loop.m4a')
    try { ctx.createMediaElementSource(el).connect(E.music) } catch (e) { el.volume = SET.music * MUSIC_LEVEL } // very old Safari: plain element
    D.music = el; if (!SET.muted && SET.music > 0 && !document.hidden) playEl()
  }
  const musicT = setTimeout(loadMusic, opts.musicDelay ?? MUSIC_DELAY)

  // ---- 10 Hz mix update (no per-frame work) ----
  const tick = () => {
    const s = performance.now()
    if (ctx.state === 'running') {
      const L = getL(), Z = getZ(L), mix = mixFor(L, Z)
      E.setMix(mix); E.schedule(ctx.currentTime + 0.6); D.mix = mix
    }
    D.ticks++; D.tickMs = performance.now() - s; if (D.ticks > 1 && D.tickMs > D.tickMax) D.tickMax = D.tickMs
  }
  let iv = 0; E.ready.then(() => { if (API) { tick(); iv = setInterval(tick, TICK_MS) } }) // start ticking once the staged build is done
  const vis = () => applyMaster(0.15)
  document.addEventListener('visibilitychange', vis)
  applyMaster(1.2)
  D.buildMs = performance.now() - t0; E.ready.then(() => { D.readyMs = performance.now() - t0 })

  API = {
    setVolume(v) { SET.volume = Math.max(0, Math.min(1, +v || 0)); persist(); applyMaster() },
    setMusic(v) { SET.music = Math.max(0, Math.min(1, +v || 0)); persist(); if (SET.music > 0) loadMusic(); applyMaster() },
    mute(b = true) { SET.muted = !!b; persist(); applyMaster() },
    get settings() { return { ...SET } },
    dispose() { clearInterval(iv); clearTimeout(musicT); clearTimeout(sus); document.removeEventListener('visibilitychange', vis); if (el) { el.pause(); el.removeAttribute('src'); el.load() } E.dispose(); chip && chip.remove(); ctx.close().catch(() => {}); API = null; window.__audio = null; window.__tpAudio = null },
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
