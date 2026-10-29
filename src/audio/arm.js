// Tiny Planet ambient audio: lives in the lazy UI chunk (imported by src/game/UI.jsx), not the startup chunk.
// armAudio(opts) creates the AudioContext on the first gesture and resumes it inside an event that counts as user
// activation everywhere: iOS Safari ignores resume() from touchstart / touch pointerdown, so pointerup, touchend, click
// and keydown are armed too (mouse pointerdown still unlocks desktop at once). The listener stays armed (one state check
// per tap) so a context iOS suspended or 'interrupted' (a call, Siri, the lock screen) comes back on the next tap,
// unless ambient.js says sound is meant to be off (muted / volume 0). iOS 16.4+: AUDIO_SESSION_TYPE is applied only when
// navigator.audioSession exists. 'playback' keeps the game audible with the ring/silent switch on; set the constant to
// 'ambient' if that switch should mute it. ambient.js is dynamic-imported once; no audio code loads before the gesture.
const AUDIO_SESSION_TYPE = 'playback' // switch this one constant to 'ambient' if the silent switch should mute the game
const EV = ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown']
export function armAudio(o, w = window) {
  let ctx = null
  const g = () => {
    if (!ctx) {
      const AC = w.AudioContext || w.webkitAudioContext; if (!AC) return
      try { const s = w.navigator && w.navigator.audioSession; if (s && s.type !== AUDIO_SESSION_TYPE) s.type = AUDIO_SESSION_TYPE } catch (e) {}
      try { ctx = new AC() } catch (e) { return }
      ;(o.load || (() => import('./ambient.js')))().then(m => m.startAudio({ ...o, ctx }))
    }
    if (ctx.state !== 'running' && ctx.state !== 'closed' && (!w.__tpAudioWant || w.__tpAudioWant())) {
      try { ctx.resume().catch(() => {}); const b = ctx.createBufferSource(); b.buffer = ctx.createBuffer(1, 1, 22050); b.connect(ctx.destination); b.start(0) } catch (e) {}
    }
  }
  EV.map(e => w.addEventListener(e, g, !0))
}
