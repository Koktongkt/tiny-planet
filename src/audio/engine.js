// Ambient audio graph: pure WebAudio, works on a live AudioContext or an OfflineAudioContext (previews / tests).
// Every layer is procedural (filtered noise, oscillators, LFOs) except the piano loop, which is streamed by ambient.js.
// Nothing here runs per frame: ambient.js calls setMix() + schedule() at ~10 Hz; the audio thread does the rest.
//
//   layers ─► amb (bus) ─► muffle (lowpass, closes indoors) ─┐
//   music (media element, ambient.js)────────────────────────┼─► master ─► soft limiter ─► destination
//   sfx (src/act.js blips, optional) ────────────────────────┘
const clamp = (x, a = 0, b = 1) => x < a ? a : x > b ? b : x
const rnd = (a, b) => a + Math.random() * (b - a)

/** 2 s of white + brown noise, filled in chunks (each well under 1 ms); sources loop it from different offsets */
function noiseBuffers(ctx) {
  const n = Math.round(ctx.sampleRate * 2), CH = 6000, N = { white: null, brown: null, steps: [] }; let W, B, last = 0
  N.steps.push(() => { N.white = ctx.createBuffer(1, n, ctx.sampleRate); N.brown = ctx.createBuffer(1, n, ctx.sampleRate); W = N.white.getChannelData(0); B = N.brown.getChannelData(0) })
  for (let i0 = 0; i0 < n; i0 += CH) N.steps.push(() => { for (let i = i0, e = Math.min(n, i0 + CH); i < e; i++) { const r = Math.random() * 2 - 1; W[i] = r; last = (last + 0.02 * r) / 1.02; B[i] = last * 3.5 } })
  // brown noise drifts: crossfade the last 2000 samples into the start so the loop seam is continuous
  N.steps.push(() => { for (let i = 0, m = 2000; i < m; i++) { const k = i / m; B[n - m + i] = B[n - m + i] * (1 - k) + B[i] * k } })
  return N
}

export function buildGraph(ctx, dest = ctx.destination, staged = false) {
  const t0 = ctx.currentTime, N = noiseBuffers(ctx), nodes = []
  const G = (v = 1) => { const g = ctx.createGain(); g.gain.value = v; return g }
  const F = (type, f, Q = 0.7) => { const x = ctx.createBiquadFilter(); x.type = type; x.frequency.value = f; x.Q.value = Q; return x }
  const pan = (p) => { if (!ctx.createStereoPanner) return G(1); const s = ctx.createStereoPanner(); s.pan.value = p; return s }
  const noise = (buf) => { const s = ctx.createBufferSource(); s.buffer = buf; s.loop = true; s.start(t0, Math.random() * 1.9); nodes.push(s); return s }
  const lfo = (hz, depth, param, type = 'sine') => { const o = ctx.createOscillator(); o.type = type; o.frequency.value = hz; const g = G(depth); o.connect(g); g.connect(param); o.start(t0); nodes.push(o); return o }
  const chain = (...a) => { for (let i = 0; i < a.length - 1; i++) a[i].connect(a[i + 1]); return a[a.length - 1] }

  const limiter = ctx.createDynamicsCompressor(); limiter.threshold.value = -10; limiter.ratio.value = 6; limiter.attack.value = 0.01; limiter.release.value = 0.3
  const master = G(0), amb = G(1), muffle = F('lowpass', 18000, 0.5), music = G(0), sfx = G(1)
  chain(amb, muffle, master); music.connect(master); sfx.connect(master); chain(master, limiter, dest)
  const wind = G(0), river = G(0), lake = G(0), insects = G(0), birds = G(0), bubbles = G(0), rain = G(0)
  for (const x of [wind, river, lake, insects, birds, bubbles, rain]) x.connect(amb)
  // Stage C: roof patter is what you hear INSIDE, so it skips the indoor muffle and goes straight to the master
  const roof = G(0), roofLP = F('lowpass', 3800, 0.5); chain(roof, roofLP, master)
  // Stage C: the little train — its own bus (rumble, wheel roll, scheduled rail clacks, whistle, brake hiss)
  const train = G(0); train.connect(amb)
  const steps = [...N.steps]
  let windLP = null

  // ---- wind: brown noise, slow gusts (two incommensurate LFOs on gain), a wandering lowpass and a faint whistle ----
  steps.push(() => {
  windLP = F('lowpass', 680, 0.6); const gust = G(0.55), wPan = pan(0), air = F('bandpass', 850, 0.8), airG = G(0.22)
  chain(noise(N.brown), windLP, gust, wPan, wind); steps.push(() => { chain(noise(N.white), air, airG, gust); lfo(0.053, 220, air.frequency) }); lfo(0.047, 0.3, gust.gain); lfo(0.131, 0.14, gust.gain); lfo(0.071, 260, windLP.frequency)
  if (wPan.pan) lfo(0.023, 0.45, wPan.pan)
  steps.push(() => { const whistle = G(0.035), wBP = F('bandpass', 1150, 9); chain(noise(N.white), wBP, whistle, wind); lfo(0.09, 0.03, whistle.gain); lfo(0.031, 320, wBP.frequency) })
  })

  // ---- water: river burble (band noise with fast irregular AM + glints) and lake lapping (low swells) ----
  steps.push(() => {
  const rOut = F('lowpass', 4200, 0.5); rOut.connect(river)
  const rBody = F('bandpass', 1300, 0.45), rAM = G(0.5); chain(noise(N.white), rBody, rAM, rOut)
  lfo(4.3, 0.12, rAM.gain); lfo(6.9, 0.08, rAM.gain); lfo(0.63, 0.14, rAM.gain); lfo(0.37, 280, rBody.frequency)
  steps.push(() => { const glint = G(0.16), gBP = F('bandpass', 3100, 1.6); chain(noise(N.white), gBP, glint, rOut); lfo(2.7, 650, gBP.frequency); lfo(1.9, 0.09, glint.gain) })
  const rLow = G(0.5), rLP = F('lowpass', 320, 0.5); chain(noise(N.brown), rLP, rLow, rOut)
  })
  steps.push(() => {
  const mkLap = (hz, p, f) => { const g = G(0.45), lp = F('lowpass', f, 0.6); chain(noise(N.brown), lp, g, pan(p), lake); lfo(hz, 0.42, g.gain); lfo(hz * 0.5, 120, lp.frequency) }
  mkLap(0.12, -0.5, 480); mkLap(0.173, 0.5, 620)
  const hiss = G(0.018), hHP = F('bandpass', 2600, 0.6); chain(noise(N.white), hHP, hiss, lake); lfo(0.12, 0.014, hiss.gain)
  })

  // ---- night insects: two crickets (sine carrier x pulse train x chirp gate) + a soft shimmering chorus ----
  steps.push(() => {
  const cricket = (f, pulse, chirp, p, v) => {
    const o = ctx.createOscillator(); o.frequency.value = f; o.start(t0); nodes.push(o)
    const a = G(0), b = G(0), out = G(v), ca = ctx.createConstantSource ? ctx.createConstantSource() : null
    if (ca) { ca.offset.value = 0.5; ca.connect(a.gain); ca.connect(b.gain); ca.start(t0); nodes.push(ca) } else { a.gain.value = 0.5; b.gain.value = 0.5 }
    lfo(pulse, 0.5, a.gain); { const o2 = ctx.createOscillator(), sm = F('lowpass', 22, 0.5), g2 = G(0.5); o2.type = 'square'; o2.frequency.value = chirp; chain(o2, sm, g2, b.gain); o2.start(t0); nodes.push(o2) } lfo(0.05 + Math.random() * 0.04, v * 0.5, out.gain)
    chain(o, a, b, pan(p), out, insects)
  }
  steps.push(() => cricket(4420, 31, 1.55, -0.45, 0.07), () => cricket(3910, 27, 2.25, 0.5, 0.055), () => cricket(4780, 36, 0.9, 0.05, 0.03))
  const chorus = G(0.06), cBP = F('bandpass', 5400, 7); chain(noise(N.white), cBP, chorus, insects); lfo(0.31, 0.04, chorus.gain); lfo(0.07, 500, cBP.frequency)
  })

  // ---- rain (Stage C): a soft high hiss of fine drops, a mid 'patter' body with fast irregular AM, a low wash; and
  // indoors a roof drum (band noise, ticks scheduled below). Soft and close, never a grey roar. ----
  steps.push(() => {
  const rOut = F('lowpass', 7500, 0.5); rOut.connect(rain)
  const hiss = G(0.3), hHP = F('highpass', 2600, 0.5), hLP = F('lowpass', 9500, 0.4); chain(noise(N.white), hHP, hLP, hiss, rOut); lfo(0.11, 0.06, hiss.gain)
  const body = G(0.42), bBP = F('bandpass', 1250, 0.55); chain(noise(N.white), bBP, body, rOut); lfo(5.3, 0.1, body.gain); lfo(8.7, 0.08, body.gain); lfo(0.19, 0.1, body.gain); lfo(0.07, 260, bBP.frequency)
  steps.push(() => { const wash = G(0.55), wLP = F('lowpass', 380, 0.5); chain(noise(N.brown), wLP, wash, pan(0.2), rOut); lfo(0.05, 0.16, wash.gain) })
  steps.push(() => { const drum = G(0.3), dBP = F('bandpass', 1700, 0.9), dLP = F('lowpass', 2600, 0.5); chain(noise(N.white), dBP, dLP, drum, roof); lfo(3.1, 0.08, drum.gain); lfo(0.13, 0.08, drum.gain)
    const rumble = G(0.35), rbLP = F('lowpass', 220, 0.6); chain(noise(N.brown), rbLP, rumble, roof) })
  })

  // ---- train (Stage C): a low wooden rumble + soft wheel roll, both scaled by speed (setMix) ----
  const tRumble = G(0), tRoll = G(0)
  steps.push(() => { const lp = F('lowpass', 160, 0.8); chain(noise(N.brown), lp, tRumble, train); lfo(7.5, 0.05, tRumble.gain)
    const bp = F('bandpass', 900, 0.6), lp2 = F('lowpass', 2400, 0.5); chain(noise(N.white), bp, lp2, tRoll, train) })

  // ---- birds (and river bubbles): short scheduled voices, created ahead of time by schedule() ----
  const voice = (bus, t, f0, f1, d, v, p, type = 'sine') => {
    const o = ctx.createOscillator(), g = G(0), s = pan(p); o.type = type
    o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + d)
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + Math.min(0.012, d * 0.3)); g.gain.exponentialRampToValueAtTime(0.0005, t + d)
    chain(o, g, s, bus); o.start(t); o.stop(t + d + 0.02); o.onended = () => { o.disconnect(); g.disconnect(); s.disconnect() }
  }
  /** filtered noise burst (train clacks, brake hiss): white noise through `type` filter at f, envelope a -> decay d */
  const burst = (bus, t, type, f, Q, d, v, p = 0, a = 0.004) => {
    if (!N.white) return
    const s = ctx.createBufferSource(), fl = F(type, f, Q), g = G(0), pn = pan(p); s.buffer = N.white
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + a); g.gain.exponentialRampToValueAtTime(0.0005, t + a + d)
    chain(s, fl, g, pn, bus); s.start(t, Math.random() * 1.5); s.stop(t + a + d + 0.05); s.onended = () => { s.disconnect(); fl.disconnect(); g.disconnect(); pn.disconnect() }
  }
  /** soft steam whistle: a warm three-note chord (triangles, lowpassed) with a little vibrato and breath; n toots */
  const whistle = (t, v = 0.05, toots = [[0, 0.9]]) => {
    for (const [dt, len] of toots) { const t1 = t + dt, out = G(0), lp = F('lowpass', 2200, 0.6); chain(out, lp, train)
      out.gain.setValueAtTime(0, t1); out.gain.linearRampToValueAtTime(v, t1 + 0.14); out.gain.setValueAtTime(v, t1 + len - 0.2); out.gain.exponentialRampToValueAtTime(0.0005, t1 + len + 0.35)
      for (const f of [587.3, 740, 880]) { const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.setValueAtTime(f * 0.97, t1); o.frequency.exponentialRampToValueAtTime(f, t1 + 0.12)
        const vib = ctx.createOscillator(), vg = G(f * 0.006); vib.frequency.value = 5.2; chain(vib, vg, o.frequency); o.connect(out)
        o.start(t1); vib.start(t1); o.stop(t1 + len + 0.4); vib.stop(t1 + len + 0.4); o.onended = () => { o.disconnect(); vib.disconnect(); vg.disconnect(); if (f === 880) { out.disconnect(); lp.disconnect() } } }
      burst(train, t1, 'bandpass', 1500, 1.2, len + 0.2, v * 0.35, 0, 0.12)
    }
  }
  /** brake hiss: a long airy highpassed sigh with a faint wheel squeal */
  const brake = (t, v = 0.06) => { burst(train, t, 'highpass', 2600, 0.5, 1.4, v, 0, 0.08); burst(train, t + 0.05, 'bandpass', 5200, 2, 0.9, v * 0.4, 0.2, 0.2); voice(train, t + 0.1, 2950, 2700, 0.7, v * 0.12, 0) }
  const TRAIN_FX = { whistle, brake }

  const SONGS = {
    tit(t, p, v) { const n = 2 + (Math.random() * 2 | 0); for (let i = 0; i < n; i++) { voice(birds, t + i * 0.32, 4300, 3500, 0.1, v, p); voice(birds, t + i * 0.32 + 0.14, 3300, 3150, 0.11, v * 0.8, p) } return n * 0.32 },
    trill(t, p, v) { const n = 7 + (Math.random() * 6 | 0), f = rnd(3200, 4600); for (let i = 0; i < n; i++) voice(birds, t + i * 0.055, f * (1 - i * 0.012) * rnd(0.97, 1.04), f * 0.92, 0.04, v * (0.7 + 0.3 * Math.sin(i)), p); return n * 0.055 },
    whistle(t, p, v) { const f = rnd(1900, 2500); voice(birds, t, f, f * 1.55, 0.26, v, p); if (Math.random() < 0.6) voice(birds, t + 0.36, f * 1.5, f * 1.1, 0.2, v * 0.8, p); return 0.6 },
    coo(t, p, v) { for (let i = 0; i < 3; i++) voice(birds, t + i * 0.55, i === 1 ? 560 : 520, 470, i === 1 ? 0.42 : 0.3, v * 1.4, p, 'triangle'); return 1.7 },
  }
  const S = { mix: { wind: 0, river: 0, lake: 0, insects: 0, birds: 0, bubbles: 0, muffle: 1, windTone: 0.5, rain: 0, roof: 0, train: 0, trainSpeed: 0, riding: 0 }, nextBird: t0 + 0.6, nextBubble: t0, nextDrop: t0, nextTick: t0, nextClack: t0, trainV: 0, trainEv: [] }
  /** schedule voices up to `until` (ctx seconds); called ~10 Hz live, once offline */
  function schedule(until) {
    const m = S.mix
    while (S.nextBird < until) {
      const t = S.nextBird
      if (m.birds > 0.03) { const keys = m.coo ? ['tit', 'trill', 'whistle', 'tit', 'coo'] : ['tit', 'trill', 'whistle', 'tit'], k = keys[Math.random() * keys.length | 0]
        const d = SONGS[k](t, rnd(-0.75, 0.75), rnd(0.025, 0.06)); S.nextBird = t + d + rnd(0.6, 3.2) / Math.max(0.35, m.birds) } else S.nextBird = t + 0.5
    }
    while (S.nextBubble < until) {
      const t = S.nextBubble
      if (m.bubbles > 0.03) { const f = rnd(500, 1500); voice(bubbles, t, f, f * rnd(1.2, 1.6), rnd(0.025, 0.05), rnd(0.015, 0.04), rnd(-0.6, 0.6)); S.nextBubble = t + rnd(0.05, 0.4) / m.bubbles } else S.nextBubble = t + 0.4
    }
    // rain: drops landing on leaves and puddles — quick upward 'plink' sweeps (the classic water-drop shape), soft and sparse
    while (S.nextDrop < until) {
      const t = S.nextDrop
      if (m.rain > 0.03) { const f = rnd(900, 2400); voice(rain, t, f, f * rnd(1.6, 2.4), rnd(0.018, 0.04), rnd(0.008, 0.028), rnd(-0.85, 0.85)); S.nextDrop = t + rnd(0.02, 0.22) / m.rain } else S.nextDrop = t + 0.4
    }
    // train: rail-joint clack pairs (bandpassed knock + a low thump), quicker as she speeds up; whistle / brake events
    while (S.nextClack < until) {
      const t = S.nextClack, sp = m.trainSpeed || 0
      if ((m.train || 0) > 0.02 && sp > 0.06) { const v = 0.05 + 0.07 * sp, gap = 0.11 - 0.04 * sp
        for (const k of [0, 1]) { burst(train, t + k * gap, 'bandpass', rnd(1400, 1900), 2.2, 0.035, v, rnd(-0.2, 0.2)); voice(train, t + k * gap, 140, 70, 0.07, v * 0.9, 0) }
        S.nextClack = t + 1.15 / (0.3 + sp) * rnd(0.92, 1.08) } else S.nextClack = t + 0.3
    }
    for (const ev of S.trainEv.splice(0)) if ((m.train || 0) > 0.02) { const v = 0.035 + 0.035 * Math.min(1, m.train)
      if (ev.k === 'depart') whistle(ev.t, v, [[0, 0.35], [0.5, 1.0]]); else if (ev.k === 'arrive') whistle(ev.t, v * 0.8, [[0, 1.1]]); else brake(ev.t, v * 1.4) }
    // roof (indoors): woody ticks on the tiles + now and then a slow drip from the eaves
    while (S.nextTick < until) {
      const t = S.nextTick
      if (m.roof > 0.03) { const f = rnd(700, 1500); voice(roof, t, f, f * 0.8, rnd(0.01, 0.022), rnd(0.02, 0.05), rnd(-0.7, 0.7), 'triangle')
        if (Math.random() < 0.06) { const g = rnd(1100, 1600); voice(roof, t + 0.05, g, g * 1.9, 0.05, 0.05, rnd(-0.4, 0.4)) }
        S.nextTick = t + rnd(0.015, 0.12) / m.roof } else S.nextTick = t + 0.4
    }
  }
  /** set the layer mix (0..1 each); ramps over `tc` seconds so 10 Hz updates sound continuous */
  function setMix(mx, tc = 0.35) {
    const t = ctx.currentTime; Object.assign(S.mix, mx); const m = S.mix
    wind.gain.setTargetAtTime(0.9 * m.wind, t, tc); windLP && windLP.Q.setTargetAtTime(0.5 + m.windTone * 1.2, t, tc)
    river.gain.setTargetAtTime(0.28 * m.river, t, tc); lake.gain.setTargetAtTime(0.35 * m.lake, t, tc)
    insects.gain.setTargetAtTime(0.6 * m.insects, t, tc * 3); birds.gain.setTargetAtTime(2.5 * m.birds, t, tc * 3); bubbles.gain.setTargetAtTime(0.5 * m.bubbles, t, tc)
    rain.gain.setTargetAtTime(0.42 * (m.rain || 0), t, tc * 2); roof.gain.setTargetAtTime(0.5 * (m.roof || 0), t, tc * 2)
    muffle.frequency.setTargetAtTime(500 + 17500 * m.muffle * m.muffle, t, tc)
    // train: bus = proximity (riding = close), rumble/roll follow speed; edges of speed fire the whistle + brake once
    const sp = m.trainSpeed || 0, tr = Math.min(1, (m.train || 0) * (1 + 0.6 * (m.riding || 0)))
    train.gain.setTargetAtTime(0.9 * tr, t, tc * 2); tRumble.gain.setTargetAtTime(0.25 + 0.55 * sp, t, tc); tRoll.gain.setTargetAtTime(0.12 * sp * sp, t, tc)
    const pv = S.trainV
    if (pv <= 0.02 && sp > 0.02) S.trainEv.push({ k: 'depart', t: t + 0.05 })
    if (pv >= 0.6 && sp < 0.6 && sp < pv) S.trainEv.push({ k: 'arrive', t: t + 0.05 })
    if (pv >= 0.3 && sp < 0.3 && sp < pv) S.trainEv.push({ k: 'brake', t: t + 0.05 })
    S.trainV = sp
  }
  function dispose() { for (const n of nodes) try { n.stop() } catch (e) {} try { master.disconnect(); limiter.disconnect() } catch (e) {} }
  let ready; const stats = { steps: steps.length, tasks: 0, maxTaskMs: 0 }
  if (!staged) { for (let i = 0; i < steps.length; i++) steps[i](); stats.steps = steps.length; ready = Promise.resolve() }
  else ready = new Promise(res => { let i = 0; const go = () => { const s = performance.now(); while (i < steps.length && performance.now() - s < 0.8) steps[i++](); stats.tasks++; stats.maxTaskMs = Math.max(stats.maxTaskMs, performance.now() - s); if (i < steps.length) setTimeout(go, 0); else { stats.steps = steps.length; res() } }; go() })
  return { ctx, master, amb, music, sfx, setMix, schedule, dispose, S, ready, stats, TRAIN_FX }
}
