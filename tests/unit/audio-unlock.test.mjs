// node --test tests/unit — audio unlock on iOS-like rules: only activation-triggering events (pointerup/touchend/click/
// keydown, mouse pointerdown) may resume an AudioContext; touch pointerdown/touchstart may not. The context must end up
// running after one real tap, recover from an OS 'interrupted' state on the next tap, and ask iOS for the playback session.
import test from 'node:test'; import assert from 'node:assert/strict'
import { armAudio } from '../../src/audio/arm.js'

function iosWindow() {
  const L = {}, w = { navigator: { audioSession: { type: 'auto' } }, act: false, loads: 0, ctxs: [] }
  w.addEventListener = (e, f) => { (L[e] = L[e] || []).push(f) }
  w.removeEventListener = (e, f) => { L[e] = (L[e] || []).filter(g => g !== f) }
  const fire = (e, act, x = {}) => { w.act = act; for (const f of [...(L[e] || [])]) f({ type: e, ...x }); w.act = false }
  // one finger tap on iOS: pointerdown + touchstart (no activation), then pointerup + touchend + click (activation)
  w.tap = () => { fire('pointerdown', false, { pointerType: 'touch' }); fire('touchstart', false); fire('pointerup', true, { pointerType: 'touch' }); fire('touchend', true); fire('click', true) }
  w.AudioContext = class { constructor() { this.state = 'suspended'; this.destination = {}; w.ctxs.push(this) }
    resume() { if (w.act && this.state !== 'closed') this.state = 'running'; return Promise.resolve() }
    createBuffer() { return {} } createBufferSource() { return { connect() {}, start() {} } } }
  return w
}
const opts = (w) => ({ chip: false, load: async () => { w.loads++; return { startAudio() {} } } })

test('one touch tap unlocks audio (resume happens on an activation event, not touch pointerdown)', async () => {
  const w = iosWindow(); armAudio(opts(w), w)
  w.tap(); await new Promise(r => setTimeout(r, 0))
  assert.equal(w.ctxs.length, 1, 'exactly one AudioContext')
  assert.equal(w.ctxs[0].state, 'running')
  assert.equal(w.loads, 1, 'ambient.js loaded once')
})
test('iOS silent switch: the session asks for playback (feature-detected)', () => {
  const w = iosWindow(); armAudio(opts(w), w); w.tap()
  assert.equal(w.navigator.audioSession.type, 'playback')
  const w2 = iosWindow(); delete w2.navigator.audioSession; armAudio(opts(w2), w2); assert.doesNotThrow(() => w2.tap())
})
test('a context the OS interrupted (call, Siri) comes back on the next tap', () => {
  const w = iosWindow(); armAudio(opts(w), w); w.tap()
  w.ctxs[0].state = 'interrupted'; w.tap(); assert.equal(w.ctxs[0].state, 'running')
  w.ctxs[0].state = 'suspended'; w.tap(); assert.equal(w.ctxs[0].state, 'running')
  assert.equal(w.ctxs.length, 1)
})
test('muted: taps do not wake a context ambient.js suspended on purpose', () => {
  const w = iosWindow(); armAudio(opts(w), w); w.tap()
  w.__tpAudioWant = () => false; w.ctxs[0].state = 'suspended'; w.tap(); assert.equal(w.ctxs[0].state, 'suspended')
})
test('webkitAudioContext fallback (iOS < 14.5)', () => {
  const w = iosWindow(); w.webkitAudioContext = w.AudioContext; delete w.AudioContext; armAudio(opts(w), w); w.tap()
  assert.equal(w.ctxs[0].state, 'running')
})
