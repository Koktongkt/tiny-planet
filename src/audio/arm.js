// Tiny Planet ambient audio: the ONLY piece that sits in the startup chunk (~0.1 KB gz).
// armAudio(opts) waits for the first user gesture, creates/resumes the AudioContext inside that gesture (iOS needs it),
// then dynamic-imports the real module (src/audio/ambient.js). No audio code or files load before that.
const EV = ['pointerdown', 'keydown']
export function armAudio(o) {
  const g = () => { EV.map(e => removeEventListener(e, g, !0)); let ctx; try { ctx = new AudioContext(); ctx.resume() } catch (e) {} import('./ambient.js').then(m => m.startAudio({ ...o, ctx })) }
  EV.map(e => addEventListener(e, g, !0))
}
