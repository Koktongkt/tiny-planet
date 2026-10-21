// Tiny Planet ambient audio: the ONLY piece that may sit in the startup chunk (~0.3 KB).
// armAudio(opts) waits for the first user gesture, creates/resumes the AudioContext inside that gesture (iOS needs it),
// then dynamic-imports the real module (src/audio/index.js). No audio code or files load before that.
export function armAudio(opts = {}) {
  if (typeof window === 'undefined' || window.__tpAudioArmed) return
  window.__tpAudioArmed = 1
  const ev = ['pointerdown', 'keydown', 'touchend'], go = () => {
    ev.forEach(e => removeEventListener(e, go, true))
    let ctx = null; try { ctx = new (window.AudioContext || window.webkitAudioContext)(); ctx.resume() } catch (e) {}
    import('./index.js').then(m => m.startAudio({ ...opts, ctx }))
  }
  ev.forEach(e => addEventListener(e, go, true))
}
