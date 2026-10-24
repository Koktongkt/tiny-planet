// Procedural score player (lazy chunk, loaded a few seconds after the first gesture). Works on a live AudioContext or an
// OfflineAudioContext (previews). Nothing runs per frame: ambient.js calls setScene() + schedule() at 10 Hz and each
// call schedules whole bars ahead on the audio clock; the audio thread does the rest.
//
//   deck (one per piece; two while crossfading) ─ instrument buses (pan / tone) ─┬─► tone (lowpass: rain) ─► duck ─► out
//                                                                               └─► send ─► reverb ───────┘
import { SAMPLED, LIVE, SR } from './inst.js'
import { THEMES, arrange } from './score.js'
import { mtof, rng } from '../dsp.js'
const XF = 2.2 // crossfade seconds between places
const PAN = { piano: 0, celesta: 0.28, pizz: -0.3, harpsi: -0.22, guitar: 0.32, flute: 0.12, ocarina: 0.12, clarinet: -0.12, accordion: -0.25, strings: 0, wood: 0.35, tri: -0.4, shaker: 0.42, bells: 0.3 }
// touch devices: a shorter room (the convolver is the biggest audio-thread cost) and a lower note cap
const TOUCH = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches
const MAXV = TOUCH ? 48 : 72 // notes scheduled at once, all decks together (a note is ~2-5 nodes)

export function createMusic(ctx, out, { staged = true, log = null } = {}) {
  const G = (v = 1) => { const g = ctx.createGain(); g.gain.value = v; return g }
  const F = (type, f, Q = 0.7) => { const x = ctx.createBiquadFilter(); x.type = type; x.frequency.value = f; x.Q.value = Q; return x }
  const tone = F('lowpass', 16000, 0.5), duck = G(1); tone.connect(duck); duck.connect(out)
  const verb = ctx.createConvolver(); verb.buffer = impulse(ctx, TOUCH ? 1.5 : 2.4); verb.connect(tone)
  const R = rng(20261024), rand = () => 0.5 + 0.5 * R()
  const BUF = {}, Q = [], WAVE = {}, decks = [], stats = { voices: 0, peakVoices: 0, renderMs: 0, rendered: 0, skipped: 0, bars: 0 }
  const scene = { loc: 'outdoor', period: 'day', season: 'spring', rain: 0, orbit: 0 }
  let cur = null, voices = 0, pumping = 0, disposed = false, PART = '', CPC = null // PART / CPC: what's playing + its chord (for the note log in tests)
  const nb = ctx.createBuffer(1, SR / 2, SR); { const d = nb.getChannelData(0), r = rng(3); for (let i = 0; i < d.length; i++) d[i] = r() }

  // ---- samples: rendered once per root, current piece's instruments first, in ≤ 6 ms slices ----
  function need(list, front) {
    const add = []; for (const i of list) if (SAMPLED[i] && !BUF[i]) { BUF[i] = {}; for (const r of SAMPLED[i].roots) add.push([i, r]) }
    if (front) Q.unshift(...add); else Q.push(...add)
    if (!staged) pump(1e9); else if (!pumping && Q.length) { pumping = 1; setTimeout(step, 0) }
  }
  function pump(ms) { const s = performance.now(); while (Q.length && performance.now() - s < ms) { const [i, r] = Q.shift(), x = SAMPLED[i].render(r), b = ctx.createBuffer(1, x.length, SR); b.getChannelData(0).set(x); BUF[i][r] = b; stats.rendered++ } const dt = performance.now() - s; stats.renderMs += dt; if (ms < 1e9) stats.maxSliceMs = Math.max(stats.maxSliceMs || 0, dt) }
  function step() { if (disposed) return; pump(6); if (Q.length) setTimeout(step, 4); else pumping = 0 }
  const instsOf = (arr) => arr.parts.filter(Boolean).flatMap(p => [p.i, p.bass, p.stab]).filter(Boolean)
  const TI = {}, instsFor = (id) => TI[id] || (TI[id] = [...new Set([0, 1, 2].flatMap(c => instsOf(arrange(id, scene, c, c))))])
  const ready = (id) => instsFor(id).every(i => !SAMPLED[i] || (BUF[i] && SAMPLED[i].roots.every(r => BUF[i][r])))
  const wave = (k) => WAVE[k] || (WAVE[k] = (() => { const h = LIVE[k].h, re = new Float32Array(h.length), im = Float32Array.from(h); return ctx.createPeriodicWave(re, im) })())

  // ---- decks ----
  function deck(id, t, fadeIn) {
    const th = THEMES[id], g = G(0), send = G(th.send); g.connect(tone); g.connect(send); send.connect(verb)
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(1, t + fadeIn)
    const d = { id, th, g, send, buses: {}, bar: 0, cycle: 0, t, end: Infinity, arr: null }
    // pre-render this piece's instruments for every arrangement it may use
    need(instsFor(id), true)
    decks.push(d); return d
  }
  function fadeOut(d, t) {
    const p = d.g.gain; if (p.cancelAndHoldAtTime) p.cancelAndHoldAtTime(t); else { p.cancelScheduledValues(t); p.setValueAtTime(p.value, t) }
    p.linearRampToValueAtTime(0, t + XF); d.end = t + XF + 0.05
  }
  function bus(d, k) {
    if (d.buses[k]) return d.buses[k]
    const L = LIVE[k], g = G(1); let head = g
    if (L && L.lp) { head = F('lowpass', L.lp, 0.6); head.connect(g) }
    if (ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = PAN[k] || 0; g.connect(p); p.connect(d.g) } else g.connect(d.g)
    return (d.buses[k] = head)
  }

  // ---- notes ----
  function play(d, k, t, m, dur, v) {
    if (v <= 0.004) return
    if (voices >= MAXV) { stats.skipped++; return }
    if (log) log.push({ t, k, m, dur, part: PART, pcs: CPC, deck: d.id })
    if (LIVE[k]) return live(d, k, t, m, dur, v)
    const S = SAMPLED[k], set = BUF[k]; if (!S || !set) return
    let best = null, bd = 99; for (const r of S.roots) if (set[r] && Math.abs(m - r) < bd) { bd = Math.abs(m - r); best = r }
    if (best == null || bd > 7) return // not rendered yet
    const b = set[best], rate = 2 ** ((m - best) / 12), s = ctx.createBufferSource(), g = ctx.createGain()
    s.buffer = b; s.playbackRate.value = rate
    g.gain.setValueAtTime(v * S.gain, t); g.gain.setTargetAtTime(0, t + dur, S.rel)
    s.connect(g); g.connect(bus(d, k)); s.start(t); s.stop(Math.min(t + b.duration / rate, t + dur + S.rel * 3))
    voices++; stats.peakVoices = Math.max(stats.peakVoices, voices); s.onended = () => { voices--; s.disconnect(); g.disconnect() }
  }
  function live(d, k, t, m, dur, v) {
    const L = LIVE[k], f = mtof(m), g = ctx.createGain(), nodes = [g], pk = v * L.gain, hold = Math.max(dur, L.att), stopT = t + hold + L.rel * 3 + 0.05
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(pk, t + L.att); g.gain.setTargetAtTime(pk * L.sus, t + L.att, L.dec); g.gain.setTargetAtTime(0, t + hold, L.rel / 2)
    const osc = (det) => { const o = ctx.createOscillator(); o.setPeriodicWave(wave(k)); o.frequency.value = f; o.detune.value = det; o.connect(g); o.start(t); o.stop(stopT); nodes.push(o); return o }
    const o1 = osc(L.twin ? -L.twin / 2 : 0), o2 = L.twin ? osc(L.twin / 2) : null
    if (L.vib && dur > 0.3) { const lf = ctx.createOscillator(), lg = G(0); lf.frequency.value = L.vibHz * (0.95 + 0.1 * rand()); lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(f * L.vib, t + Math.min(dur, 0.6)); lf.connect(lg); lg.connect(o1.frequency); if (o2) lg.connect(o2.frequency); lf.start(t); lf.stop(stopT); nodes.push(lf, lg) }
    if (L.chiff) { const s = ctx.createBufferSource(), bp = F('bandpass', Math.min(9000, f * 2.2), 1.5), cg = G(0); s.buffer = nb; cg.gain.setValueAtTime(v * L.chiff, t); cg.gain.setTargetAtTime(0, t + 0.012, 0.025); s.connect(bp); bp.connect(cg); cg.connect(g); s.start(t, rand() * 0.3); s.stop(t + 0.12); nodes.push(s, bp, cg) }
    g.connect(bus(d, k)); voices++; stats.peakVoices = Math.max(stats.peakVoices, voices)
    o1.onended = () => { voices--; for (const n of nodes) n.disconnect() }
  }

  // ---- harmony helpers ----
  const pcs = (c, tr) => { const s = []; for (const i of c.iv) { const p = (c.root + i + tr + 120) % 12; if (!s.includes(p)) s.push(p) } return s }
  const place = (p, lo) => lo + ((p - lo) % 12 + 12) % 12
  const voicing = (c, tr, lo = 55, n = 4) => { let s = CPC = pcs(c, tr); if (s.length > n) s = s.filter((_, i) => i !== 2); return s.map(p => place(p, lo)).sort((a, b) => a - b) }
  const bassOf = (c, tr, lo = 40) => place((c.bass + tr + 120) % 12, lo)
  const chordAt = (bar, b) => bar.ch.find(c => b >= c.at - 1e-6 && b < c.at + c.len - 1e-6) || bar.ch[0]

  // ---- one bar of one deck ----
  function playBar(d) {
    const th = d.th, bar = th.bars[d.bar], sec = Math.floor(d.bar / 8), M = th.meter
    if (d.bar % 8 === 0 || !d.arr) { d.arr = arrange(th.id, scene, d.cycle, sec); need(instsOf(d.arr)) }
    const A = d.arr, tr = A.tr || 0, rit = d.bar % 8 === 7 ? 1.08 : d.bar % 4 === 3 ? 1.03 : 1, spb = 60 / (th.bpm * (A.tm || 1)) * rit
    const T = (b) => { const fr = b % 1; let x = b; if (Math.abs(fr - 0.5) < 1e-3) x += A.swing || 0; if (M === 3 && Math.abs(b - 1) < 1e-3) x -= A.lilt || 0; return d.t + x * spb + (rand() - 0.5) * 0.012 }
    const next = th.bars[(d.bar + 1) % th.bars.length]
    stats.bars++
    for (const p of A.parts) { if (!p) continue
      const v = p.v; PART = p.k; CPC = null
      if (p.k === 'mel' || p.k === 'dbl') for (const [b, m, dur] of bar.mel) play(d, p.i, T(b), m + tr + (p.o || 0), dur * spb * 0.96, v * (1 + (b === 0 ? 0.12 : 0) + 0.05 * Math.min(dur, 2)) * (0.92 + 0.1 * rand()))
      else if (p.k === 'ctr') { let up = d.bar % 2 === 0
        for (const [b, m, dur] of bar.mel) { if (dur < 2) continue
          const c = chordAt(bar, b), lo = m + tr + 3, cand = []; for (let x = lo; x <= lo + 11; x++) if (pcs(c, tr).includes((x + 120) % 12)) cand.push(x)
          const seq = up ? cand.slice(0, 3) : cand.slice(0, 3).reverse(); up = !up
          seq.forEach((x, j) => { const bt = b + 1 + j * 0.5; if (bt < b + dur - 0.01) play(d, p.i, T(bt), x + (p.o || 0), (j === seq.length - 1 ? 1 : 0.5) * spb, v * (j ? 0.85 : 1)) }) } }
      else if (p.k === 'waltz') { for (const c of bar.ch) { const bn = bassOf(c, tr) + (d.bar % 2 && c.len === M ? 7 : 0), vc = voicing(c, tr, 55, 3)
          if (c.at === 0) play(d, p.bass, T(0), bn > 52 ? bn - 12 : bn, spb * 0.9, v * 1.05)
          for (let b = Math.max(1, c.at); b < c.at + c.len; b++) for (const x of vc) play(d, p.stab, T(b), x, spb * 0.42, v * 0.42) } }
      else if (p.k === 'arp') { const n = M * 2; for (let s = 0; s < n; s++) { const b = s / 2, c = chordAt(bar, b), tones = [bassOf(c, tr, 48), ...voicing(c, tr, 57)], x = tones[p.pat[s % p.pat.length] % tones.length]; play(d, p.i, T(b), x, 1.6 * spb, v * (s === 0 ? 1.1 : 0.85)) } }
      else if (p.k === 'alb') { for (let s = 0; s < M * 2; s++) { const b = s / 2, c = chordAt(bar, b), vc = voicing(c, tr, 57, 3); play(d, p.i, T(b), vc[[0, 2, 1, 2][s % 4]], 0.45 * spb, v * (s % 2 ? 0.8 : 1)) } }
      else if (p.k === 'strum') { for (let b = 0; b < M; b++) { const c = chordAt(bar, b), vc = voicing(c, tr, 55, 3); vc.forEach((x, j) => { play(d, p.i, T(b + 0.5) + j * 0.012, x, 0.35 * spb, v * 0.7); if (b === 0) play(d, p.i, T(b) + j * 0.014, x, 0.3 * spb, v * 0.45) }) } }
      else if (p.k === 'bass') { const c0 = bar.ch[0], r = bassOf(c0, tr)
        if (p.st === 'bar') play(d, p.i, T(0), r, M * spb, v)
        else if (p.st === 'half') { for (const c of bar.ch) play(d, p.i, T(c.at), bassOf(c, tr), c.len * spb * 0.95, v); if (bar.ch.length === 1) play(d, p.i, T(2), r + 7, 2 * spb * 0.9, v * 0.7) }
        else if (p.st === 'rootfifth') { for (const c of bar.ch) { const b0 = bassOf(c, tr); play(d, p.i, T(c.at), b0, 0.8 * spb, v); if (c.len >= 2) play(d, p.i, T(c.at + 2 > M - 1 ? c.at + 1 : c.at + 2), b0 + 7 > 54 ? b0 - 5 : b0 + 7, 0.8 * spb, v * 0.8) } }
        else { // walk: root, chord tone, fifth, approach to the next bar's bass
          const nb2 = bassOf(next.ch[0], tr), seq = [r, place(pcs(chordAt(bar, 1), tr)[1] ?? r, r), place(pcs(chordAt(bar, 2), tr)[2] ?? r, r), nb2 + (nb2 > r ? -1 : 1)]
          if (bar.ch.length > 1) seq[2] = bassOf(bar.ch[1], tr)
          seq.forEach((x, b) => play(d, p.i, T(b), x > 55 ? x - 12 : x, 0.62 * spb, v * (b === 0 ? 1 : 0.8))) } }
      else if (p.k === 'pad') for (const c of bar.ch) { const vc = voicing(c, tr, p.i === 'accordion' ? 53 : 50, 3); for (const x of vc) play(d, p.i, T(c.at), x, c.len * spb + 0.08, v) }
      else if (p.k === 'perc') { const S = SAMPLED[p.i], m = S.roots[0]
        if (p.every) { if (d.bar % p.every === 0) play(d, p.i, T(0), m, 0.5, v) }
        else if (p.eighths) for (let s = 0; s < M * 2; s++) play(d, p.i, T(s / 2), m, 0.1, v * (s % 2 ? 0.55 : s === 0 ? 1 : 0.8))
        else for (const b of p.on) play(d, p.i, T(b), m, 0.15, v * (b === 0 ? 1 : 0.7)) }
      else if (p.k === 'spk') for (let b = 0; b < M; b++) { if (rand() > p.p) continue; const c = chordAt(bar, b), s = pcs(c, tr), x = place(s[(rand() * s.length) | 0], 84); play(d, p.i, T(b + 0.5), x, 0.6 * spb, v * (0.7 + 0.3 * rand())) }
    }
    return M * spb
  }

  /** where she is + how the world sounds: { loc: outdoor|house|museum|train, period: day|evening|night, season, rain 0..1, orbit 0|1 } */
  function setScene(s, now = ctx.currentTime) {
    Object.assign(scene, s); const id = THEMES[scene.loc] ? scene.loc : 'outdoor'
    if (!cur) { need(instsFor(id), true); if (staged && !ready(id)) return; cur = deck(id, now + 0.25, 3.5) } // first piece waits for its samples
    else if (cur.id !== id) { fadeOut(cur, now); cur = deck(id, now + 0.35, XF) }
    const out = id === 'outdoor', wet = out ? scene.rain || 0 : 0
    tone.frequency.setTargetAtTime(16000 - 12500 * wet, now, 0.8)
    duck.gain.setTargetAtTime((1 - 0.32 * wet) * (scene.orbit ? 0.75 : 1), now, 0.8)
  }
  function schedule(until) {
    for (const d of decks) { if (d.t < ctx.currentTime - 0.5) d.t = ctx.currentTime + 0.1 } // music was off / paused: rejoin, don't catch up
    for (const d of decks) while (d.t < until && d.t < d.end) { d.t += playBar(d); if (++d.bar >= d.th.bars.length) { d.bar = 0; d.cycle++ } }
    const now = ctx.currentTime
    for (let i = decks.length - 1; i >= 0; i--) { const d = decks[i]; if (now > d.end + 4) { decks.splice(i, 1); try { d.g.disconnect(); d.send.disconnect() } catch (e) {} } }
    stats.voices = voices; stats.decks = decks.length
  }
  // warm every instrument in the background once the current piece is ready (so a door never waits on a render)
  const all = Object.keys(SAMPLED); setTimeout(() => need(all), staged ? 2500 : 0)
  function dispose() { disposed = true; for (const d of decks) try { d.g.disconnect() } catch (e) {} decks.length = 0; try { duck.disconnect() } catch (e) {} }
  return { setScene, schedule, dispose, stats, scene, get deck() { return cur && cur.id }, get pending() { return Q.length } }
}

/** stereo room tail: decaying noise, darker as it fades (the convolver normalises the energy) */
function impulse(ctx, sec) {
  const sr = ctx.sampleRate, n = Math.round(sr * sec), b = ctx.createBuffer(2, n, sr)
  for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch), r = rng(ch + 17); let lp = 0
    for (let i = 0; i < n; i++) { const t = i / sr, k = 0.15 + 0.8 * Math.min(1, t / sec); lp += (r() - lp) * (1 - k); d[i] = lp * Math.exp(-t * 2.9) * Math.min(1, i / (sr * 0.012)) } }
  return b
}
