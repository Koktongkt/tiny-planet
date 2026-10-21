// Ambient audio graph: pure WebAudio, works on a live AudioContext or an OfflineAudioContext (previews / tests).
// Every layer is procedural (filtered noise, oscillators, LFOs) except the piano loop, which is streamed by index.js.
// Nothing here runs per frame: index.js calls setMix() + schedule() at ~10 Hz; the audio thread does the rest.
//
//   layers ─► amb (bus) ─► muffle (lowpass, closes indoors) ─┐
//   music (media element, index.js) ─────────────────────────┼─► master ─► soft limiter ─► destination
//   sfx (src/act.js blips, optional) ────────────────────────┘
const clamp = (x, a = 0, b = 1) => x < a ? a : x > b ? b : x
const rnd = (a, b) => a + Math.random() * (b - a)

/** 2 s of white + brown noise in one pass (~1 ms); sources loop it from different offsets so layers don't correlate */
function noiseBuffers(ctx) {
  const n = Math.round(ctx.sampleRate * 2), w = ctx.createBuffer(1, n, ctx.sampleRate), b = ctx.createBuffer(1, n, ctx.sampleRate)
  const W = w.getChannelData(0), B = b.getChannelData(0); let last = 0
  for (let i = 0; i < n; i++) { const r = Math.random() * 2 - 1; W[i] = r; last = (last + 0.02 * r) / 1.02; B[i] = last * 3.5 }
  // make the loop seam continuous for the brown buffer (it drifts): crossfade the last 2000 samples into the start
  for (let i = 0, m = 2000; i < m; i++) { const k = i / m; B[n - m + i] = B[n - m + i] * (1 - k) + B[i] * k }
  return { white: w, brown: b }
}

export function buildGraph(ctx, dest = ctx.destination) {
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

  // ---- wind: brown noise, slow gusts (two incommensurate LFOs on gain), a wandering lowpass and a faint whistle ----
  const wind = G(0), windLP = F('lowpass', 520, 0.6), gust = G(0.55), wPan = pan(0)
  chain(noise(N.brown), windLP, gust, wPan, wind); lfo(0.047, 0.3, gust.gain); lfo(0.131, 0.14, gust.gain); lfo(0.071, 260, windLP.frequency)
  if (wPan.pan) lfo(0.023, 0.45, wPan.pan)
  const whistle = G(0.035), wBP = F('bandpass', 1150, 9); chain(noise(N.white), wBP, whistle, wind); lfo(0.09, 0.03, whistle.gain); lfo(0.031, 320, wBP.frequency)
  wind.connect(amb)

  // ---- water: river burble (band noise with fast irregular AM + glints) and lake lapping (low swells) ----
  const river = G(0), rBody = F('bandpass', 1300, 0.45), rAM = G(0.5); chain(noise(N.white), rBody, rAM, river)
  lfo(4.3, 0.12, rAM.gain); lfo(6.9, 0.08, rAM.gain); lfo(0.63, 0.14, rAM.gain); lfo(0.37, 280, rBody.frequency)
  const glint = G(0.16), gBP = F('bandpass', 3100, 1.6); chain(noise(N.white), gBP, glint, river); lfo(2.7, 650, gBP.frequency); lfo(1.9, 0.09, glint.gain)
  const rLow = G(0.5), rLP = F('lowpass', 320, 0.5); chain(noise(N.brown), rLP, rLow, river)
  river.connect(amb)
  const lake = G(0), mkLap = (hz, p, f) => { const g = G(0.45), lp = F('lowpass', f, 0.6); chain(noise(N.brown), lp, g, pan(p), lake); lfo(hz, 0.42, g.gain); lfo(hz * 0.5, 120, lp.frequency) }
  mkLap(0.12, -0.5, 480); mkLap(0.173, 0.5, 620)
  const hiss = G(0.05), hHP = F('highpass', 2500, 0.5); chain(noise(N.white), hHP, hiss, lake); lfo(0.12, 0.04, hiss.gain)
  lake.connect(amb)

  // ---- night insects: two crickets (sine carrier x pulse train x chirp gate) + a soft shimmering chorus ----
  const insects = G(0)
  const cricket = (f, pulse, chirp, p, v) => {
    const o = ctx.createOscillator(); o.frequency.value = f; o.start(t0); nodes.push(o)
    const a = G(0), b = G(0), out = G(v), ca = ctx.createConstantSource ? ctx.createConstantSource() : null
    if (ca) { ca.offset.value = 0.5; ca.connect(a.gain); ca.connect(b.gain); ca.start(t0); nodes.push(ca) } else { a.gain.value = 0.5; b.gain.value = 0.5 }
    lfo(pulse, 0.5, a.gain, 'square'); lfo(chirp, 0.5, b.gain, 'square'); lfo(0.05 + Math.random() * 0.04, v * 0.5, out.gain)
    chain(o, a, b, pan(p), out, insects)
  }
  cricket(4420, 31, 1.55, -0.45, 0.07); cricket(3910, 27, 2.25, 0.5, 0.055); cricket(4780, 36, 0.9, 0.05, 0.03)
  const chorus = G(0.06), cBP = F('bandpass', 5400, 7); chain(noise(N.white), cBP, chorus, insects); lfo(0.31, 0.04, chorus.gain); lfo(0.07, 500, cBP.frequency)
  insects.connect(amb)

  // ---- birds (and river bubbles): short scheduled voices, created ahead of time by schedule() ----
  const birds = G(0); birds.connect(amb)
  const bubbles = G(0); bubbles.connect(amb)
  const voice = (bus, t, f0, f1, d, v, p, type = 'sine') => {
    const o = ctx.createOscillator(), g = G(0), s = pan(p); o.type = type
    o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + d)
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + Math.min(0.012, d * 0.3)); g.gain.exponentialRampToValueAtTime(0.0005, t + d)
    chain(o, g, s, bus); o.start(t); o.stop(t + d + 0.02); o.onended = () => { o.disconnect(); g.disconnect(); s.disconnect() }
  }
  const SONGS = {
    tit(t, p, v) { const n = 2 + (Math.random() * 2 | 0); for (let i = 0; i < n; i++) { voice(birds, t + i * 0.32, 4300, 3500, 0.1, v, p); voice(birds, t + i * 0.32 + 0.14, 3300, 3150, 0.11, v * 0.8, p) } return n * 0.32 },
    trill(t, p, v) { const n = 7 + (Math.random() * 6 | 0), f = rnd(3200, 4600); for (let i = 0; i < n; i++) voice(birds, t + i * 0.055, f * (1 - i * 0.012) * rnd(0.97, 1.04), f * 0.92, 0.04, v * (0.7 + 0.3 * Math.sin(i)), p); return n * 0.055 },
    whistle(t, p, v) { const f = rnd(1900, 2500); voice(birds, t, f, f * 1.55, 0.26, v, p); if (Math.random() < 0.6) voice(birds, t + 0.36, f * 1.5, f * 1.1, 0.2, v * 0.8, p); return 0.6 },
    coo(t, p, v) { for (let i = 0; i < 3; i++) voice(birds, t + i * 0.55, i === 1 ? 560 : 520, 470, i === 1 ? 0.42 : 0.3, v * 1.4, p, 'triangle'); return 1.7 },
  }
  const S = { mix: { wind: 0, river: 0, lake: 0, insects: 0, birds: 0, bubbles: 0, muffle: 1, windTone: 0.5 }, nextBird: t0 + 0.6, nextBubble: t0 }
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
  }
  /** set the layer mix (0..1 each); ramps over `tc` seconds so 10 Hz updates sound continuous */
  function setMix(mx, tc = 0.35) {
    const t = ctx.currentTime; Object.assign(S.mix, mx); const m = S.mix
    wind.gain.setTargetAtTime(0.5 * m.wind, t, tc); windLP.Q.setTargetAtTime(0.5 + m.windTone * 1.2, t, tc)
    river.gain.setTargetAtTime(0.55 * m.river, t, tc); lake.gain.setTargetAtTime(0.5 * m.lake, t, tc)
    insects.gain.setTargetAtTime(0.9 * m.insects, t, tc * 3); birds.gain.setTargetAtTime(m.birds, t, tc * 3); bubbles.gain.setTargetAtTime(m.bubbles, t, tc)
    muffle.frequency.setTargetAtTime(500 + 17500 * m.muffle * m.muffle, t, tc)
  }
  function dispose() { for (const n of nodes) try { n.stop() } catch (e) {} try { master.disconnect(); limiter.disconnect() } catch (e) {} }
  return { ctx, master, amb, music, sfx, setMix, schedule, dispose, S }
}
