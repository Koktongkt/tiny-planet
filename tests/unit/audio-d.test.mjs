// node --test tests/unit — audio-d: the score parses, the player schedules sane notes on a mock AudioContext (chord
// tones in the accompaniment, real overlap well under the voice cap, smooth place crossfades), SFX render finite + peak-safe.
import test from 'node:test'; import assert from 'node:assert/strict'
import { THEMES, arrange, chord, line } from '../../src/audio/music/score.js'
import { createMusic } from '../../src/audio/music/player.js'
import { SAMPLED } from '../../src/audio/music/inst.js'
import { DEF, ACT_SFX, render } from '../../src/audio/sfx.js'
import { hookGame } from '../../src/audio/hooks.js'

// ---- a tiny offline-ish AudioContext mock: nodes connect, params record, sources fire onended when 'stopped' ----
function mockCtx() {
  const ctx = { currentTime: 0, sampleRate: 48000, ended: [] }
  const param = (v = 0) => ({ value: v, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {}, setTargetAtTime() {}, cancelScheduledValues() {}, cancelAndHoldAtTime() {} })
  const node = (x = {}) => ({ connect() {}, disconnect() {}, ...x })
  const src = (x) => { const n = node({ ...x, start(t) { n.t0 = t }, stop(t) { n.t1 = t; ctx.ended.push(n) }, onended: null }); return n }
  Object.assign(ctx, {
    createGain: () => node({ gain: param(1) }), createBiquadFilter: () => node({ frequency: param(), Q: param(), type: '' }), createStereoPanner: () => node({ pan: param() }),
    createConvolver: () => node({ buffer: null }), createPeriodicWave: () => ({}),
    createBuffer: (ch, n, sr) => { const d = [...Array(ch)].map(() => new Float32Array(n)); return { duration: n / sr, length: n, sampleRate: sr, getChannelData: (i) => d[i] } },
    createBufferSource: () => src({ buffer: null, playbackRate: param(1) }), createOscillator: () => src({ frequency: param(), detune: param(), setPeriodicWave() {} }),
    advance(t) { ctx.currentTime = t; for (let i = ctx.ended.length - 1; i >= 0; i--) { const n = ctx.ended[i]; if (n.t1 <= t) { ctx.ended.splice(i, 1); n.onended && n.onended() } } },
  })
  return ctx
}
const run = (scene, secs, change) => {
  const ctx = mockCtx(), log = [], M = createMusic(ctx, ctx.createGain(), { staged: false, log })
  let peak = 0
  for (let t = 0; t < secs; t += 0.1) { ctx.advance(t); M.setScene(change ? change(t) : scene, t); M.schedule(t + 0.6)
    const live = log.filter(n => n.t <= t && n.t + n.dur > t).length; peak = Math.max(peak, live) }
  return { log, M, peak }
}

test('score: every piece parses into whole bars with known chords', () => {
  assert.deepEqual(chord('Gm7/D'), { sym: 'Gm7/D', root: 7, iv: [0, 3, 7, 10], bass: 2 })
  assert.equal(line('C5 F5:2 r:.5 A4:.5').beats, 4)
  for (const [id, th] of Object.entries(THEMES)) {
    assert.ok(th.bars.length % 8 === 0, id + ' sections of 8 bars')
    const secs = th.bars.length * th.meter * 60 / th.bpm; assert.ok(secs > 25 && secs < 60, `${id} loop ${secs.toFixed(1)} s`)
    for (const b of th.bars) for (const [, m] of b.mel) assert.ok(m >= 64 && m <= 90, `${id} melody in a singable range (${m})`)
  }
})

test('arrangements: each place/time/season/rain picks real instruments', () => {
  for (const id of Object.keys(THEMES)) for (const season of ['spring', 'summer', 'autumn', 'winter']) for (const period of ['day', 'evening', 'night']) for (const rain of [0, 1]) for (let c = 0; c < 3; c++) {
    const A = arrange(id, { season, period, rain }, c, c); assert.ok(A.parts.filter(Boolean).some(p => p.k === 'mel'), 'has a lead')
    for (const p of A.parts.filter(Boolean)) for (const i of [p.i, p.bass, p.stab].filter(Boolean)) assert.ok(SAMPLED[i] || ['flute', 'ocarina', 'clarinet', 'accordion', 'strings'].includes(i), 'instrument ' + i)
  }
})

for (const loc of ['outdoor', 'house', 'museum', 'train']) test(`player: ${loc} schedules chord-true accompaniment with a light voice load`, () => {
  const { log, peak } = run({ loc, period: 'day', season: 'spring', rain: 0 }, 60)
  assert.ok(log.length > 200, `${loc}: ${log.length} notes in a minute`)
  for (const n of log) { assert.ok(Number.isFinite(n.t) && Number.isFinite(n.m) && n.dur > 0, 'finite'); if (n.pcs && n.part !== 'mel') assert.ok(n.pcs.includes((n.m % 12 + 12) % 12) || n.part === 'ctr', `${loc} ${n.part} ${n.m} in chord ${n.pcs}`) }
  assert.ok(peak < 40, `${loc}: ${peak} notes sounding at once`)
})

test('player: places crossfade (two decks only while fading), rain softens the outdoor tone', () => {
  const { M, log } = run(null, 30, (t) => ({ loc: t < 10 ? 'outdoor' : t < 20 ? 'house' : 'museum', period: 'day', season: 'spring', rain: 0 }))
  const decksAt = (a, b) => new Set(log.filter(n => n.t >= a && n.t < b).map(n => n.deck))
  assert.deepEqual([...decksAt(4, 9)], ['outdoor']); assert.deepEqual([...decksAt(14, 19)], ['house']); assert.deepEqual([...decksAt(25, 30)], ['museum'])
  assert.ok(!log.some(n => n.deck === 'outdoor' && n.t > 10 + 2.2 + 3.5), 'outdoor stops scheduling after its fade (≤ one bar of tail)')
  assert.equal(M.deck, 'museum')
})

test('sfx: every recipe renders finite audio, peak-normalised, short', () => {
  for (const name of Object.keys(DEF)) { const x = render(name); let pk = 0; for (const v of x) { assert.ok(Number.isFinite(v)); pk = Math.max(pk, Math.abs(v)) }
    assert.ok(pk > 0.5 && pk <= 0.851, `${name} peak ${pk}`); assert.ok(DEF[name][0] <= 3, name + ' ≤ 3 s') }
  for (const n of Object.values(ACT_SFX)) assert.ok(DEF[n], 'act.js kind maps to ' + n)
})

test('hooks: fishing, dialogue, panels, bag, coins, train and footsteps fire the right sounds', () => {
  const heard = [], w = { __player: { phase: 0, move: 1, h: 0 }, __talk: { open: null, page: 0 }, __game: { G: { ui: { panel: null, fish: null }, s: { inv: { coin: 2 }, tutorial: { done: {} } } } } }
  const H = hookGame({ play: (n) => { heard.push(n); return true } }, w), L = { mode: 'follow' }, Z = { village: 0, rain: 0 }
  let t = 0; const tick = () => { t += 0.1; w.__player.phase += 0.74; H.tick(L, Z, t) }
  tick(); tick(); tick()
  assert.ok(heard.filter(n => n === 'step_grass').length >= 1, 'footsteps on grass')
  w.__fishSt = { state: 'wait', fishId: 'koi', bv: 0 }; w.__game.G.ui.fish = {}; tick(); assert.ok(heard.includes('plop'))
  w.__fishSt.state = 'bite'; tick(); assert.ok(heard.includes('bite'))
  w.__fishSt.state = 'reel'; w.__fishSt.bv = 0.5; tick(); assert.ok(heard.includes('reel'))
  w.__fishSt.state = 'caught'; tick(); assert.ok(heard.includes('catch_rare'), 'koi gets the bigger jingle')
  w.__talk.open = { key: 'scholar' }; tick(); assert.ok(heard.some(n => n.startsWith('hmm')), 'Hoshino hums')
  w.__talk.open = { key: 'baker' }; tick(); assert.ok(heard.includes('talk'))
  w.__game.G.ui.panel = 'journal'; tick(); assert.ok(heard.includes('page'))
  w.__game.G.s.inv.minnow = 1; w.__game.G.s.inv.coin = 3; tick(); assert.ok(heard.includes('bag') && heard.includes('coin'))
  w.__scRide = { riding: true }; tick(); assert.ok(heard.includes('bell'))
  assert.equal(H.act('door'), true); assert.ok(heard.includes('door'))
})
