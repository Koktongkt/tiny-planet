// Game events -> SFX, wired from INSIDE the audio chunk: no game file imports, nothing new in the startup chunk.
// Three kinds of hook, all cheap:
//  1. act.js blip(kind) asks window.__tpAudio.play(kind) first (every startAct: pick, cast, reel, door, craft, pet, home acts…)
//  2. wraps on the lazy systems' public objects (window.__sc.shutter / donate / digAt, window.__sb.giveGift / deliverErrand),
//     installed once they exist (liveC loads ~4 s after the first frame)
//  3. a 10 Hz diff of state the game already exposes (fishing reel state, dialogue page, open panel, bag + coins,
//     tutorial ticks, train ride, photo mode) plus footsteps predicted from her stride phase
import { ACT_SFX } from './sfx.js'
const RARE = { koi: 'catch_rare', sea_bream: 'catch_rare', lake_lord: 'catch_legend' }
const HMM = ['hmm', 'hmm2', 'hmm3']
const hash = (s) => { let h = 7; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h }
export function hookGame(S, w = window) {
  const st = { fish: null, fs: null, talk: null, page: -1, panel: undefined, inv: -1, coin: -1, tut: -1, done: -1, ride: false, photo: false, k: -1, ph: 0, pt: 0, lastBag: 0, reelT: 0, wrapped: {} }
  const play = (n, o) => S.play(n, o)
  /** act.js kinds -> our sounds (returns true so the old blip stays quiet) */
  function act(kind) {
    if (kind === 'pet') { setTimeout(() => { const L = w.__lastAct; play(L && L.kind === 'dog' && performance.now() - L.t < 200 ? 'bark' : 'meow', { rate: 0.96 + Math.random() * 0.08 }) }, 0); return true }
    const n = ACT_SFX[kind]; return n ? play(n) : false
  }
  const wrap = (o, k, after) => { const f = o && o[k]; if (typeof f !== 'function' || f.__tpa) return; const g = function (...a) { const r = f.apply(this, a); try { after(r, a) } catch (e) {} return r }; g.__tpa = 1; o[k] = g }
  function install() {
    const SC = w.__sc, SB = w.__sb
    if (SC && !st.wrapped.sc) { st.wrapped.sc = 1
      wrap(SC, 'shutter', (p) => { play('shutter'); if (p && p.then) p.then(() => play('photo_saved', { delay: 0.15 }), () => {}) })
      wrap(SC, 'donate', (ok) => { if (ok) play('donate') })
      wrap(SC, 'digAt', (f) => { if (f) { play('dig'); play('relic', { delay: 0.55 }) } }) }
    if (SB && !st.wrapped.sb) { st.wrapped.sb = 1
      wrap(SB, 'giveGift', (r) => { if (r) play(r.kind === 'dislike' ? 'slip' : 'gift') })
      wrap(SB, 'deliverErrand', (r) => { if (r) play('quest', { delay: 0.1 }) }) }
  }
  /** 10 Hz: L = listener (ambient.js), Z = zones, now = ctx time, look = scheduling horizon (s) */
  function tick(L, Z, now, look = 0.15) {
    install()
    const G = w.__game && w.__game.G
    // fishing: the reel state machine (UI.jsx keeps it on window.__fishSt)
    const f = w.__fishSt
    if (f && f !== st.fish) { st.fish = f; st.fs = f.state; play('plop') }
    else if (f && f.state !== st.fs) { st.fs = f.state
      if (f.state === 'bite') play('bite'); else if (f.state === 'caught') play(RARE[f.fishId] || 'catch', { delay: 0.35 }); else if (f.state === 'slipped') play('slip') }
    if (f && f.state === 'reel' && f.bv > 0.04 && (!G || G.ui.fish)) { const gap = 0.16 / Math.min(1.6, 0.4 + f.bv * 2); let t = Math.max(st.reelT, now); while (t < now + look) { play('reel', { at: t, rate: 0.9 + Math.random() * 0.2 }); t += gap } st.reelT = t }
    // dialogue: a voice per page (Hoshino hums, villagers chirp at their own pitch)
    const T = w.__talk, who = T && T.open
    if (who && (who !== st.talk || T.page !== st.page)) { const key = who.key || ''
      if (key === 'scholar') play(HMM[(T.page + (who !== st.talk ? 0 : 1)) % 3]); else play('talk', { rate: 0.82 + (hash(key) % 40) / 100 }) }
    st.talk = who || null; st.page = T ? T.page : -1
    if (G) {
      const p = G.ui.panel || null
      if (st.panel !== undefined && p !== st.panel) play(p === 'journal' ? 'page' : p ? 'ui_open' : 'ui_close')
      st.panel = p
      const inv = G.s.inv || {}; let n = 0; for (const k in inv) if (k !== 'coin') n += inv[k] || 0
      const c = inv.coin || 0
      if (st.inv >= 0 && n > st.inv && performance.now() - st.lastBag > 250) { play('bag'); st.lastBag = performance.now() }
      if (st.coin >= 0 && c !== st.coin) play(c > st.coin ? 'coin' : 'coin_spend')
      st.inv = n; st.coin = c
      const tu = G.s.tutorial && G.s.tutorial.done ? Object.keys(G.s.tutorial.done).length : 0
      if (st.tut >= 0 && tu > st.tut) play('tut'); st.tut = tu
    }
    const R = w.__scRide, riding = !!(R && R.riding)
    if (riding !== st.ride) play(riding ? 'bell' : 'alight'); st.ride = riding
    const PH = w.__sc && w.__sc.PH, ph = !!(PH && PH.on)
    if (ph !== st.photo) play(ph ? 'photo_open' : 'ui_close'); st.photo = ph
    steps(L, Z, now, look, G, riding || ph)
  }
  // footsteps: one per half stride (phase += pi), predicted from the phase rate so they land between 10 Hz ticks
  function steps(L, Z, now, look, G, off) {
    const P = w.__player; if (!P || typeof P.phase !== 'number') return
    const dt = now - st.pt, rate = dt > 0 && dt < 0.5 ? (P.phase - st.ph) / dt : 0; st.ph = P.phase; st.pt = now
    if (off || L.mode === 'orbit' || (G && (G.ui.fish || G.ui.panel)) || P.move < 0.25 || rate < 2 || (P.h || 0) > 0.02) { st.k = Math.floor(P.phase / Math.PI); return }
    const H = w.__home, M = w.__museum, kind = H && H.inside ? 'step_wood' : M && M.inside ? 'step_stone' : (Z.rain || 0) > 0.4 ? 'step_wet' : Z.village > 0.6 ? 'step_stone' : 'step_grass'
    let k = Math.floor(P.phase / Math.PI); if (k < st.k - 2 || k > st.k + 6) st.k = k
    for (;;) { const nk = st.k + 1, t = now + (nk * Math.PI - P.phase) / rate; if (t > now + look) break; st.k = nk; if (t >= now - 0.01) play(kind, { at: Math.max(now, t), vol: 0.75 + Math.min(0.35, P.move * 0.3), rate: 0.92 + Math.random() * 0.16 }) }
  }
  return { act, tick, st }
}
