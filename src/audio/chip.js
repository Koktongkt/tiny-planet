// Small parchment speaker chip (+ music note) in the game's ink-on-paper style. Vanilla DOM: no React, lazy chunk.
// Desktop: bottom-left above the minimap. Touch: left column under the minimap, fades with the touch pad when idle.
// The Stage B SettingsPanel (Studio visuals) can replace this: startAudio({ chip: false }) and drive the returned API.
const INK = '#4a3a35'
const CSS = `.tp-snd{position:fixed;left:16px;bottom:150px;z-index:21;display:flex;gap:6px;transition:opacity 1.2s ease .1s;font-family:Fredoka,sans-serif}
.tp-snd button{width:34px;height:34px;padding:0;display:grid;place-items:center;cursor:pointer;border:2.2px solid ${INK};border-radius:47% 53% 50% 50%/52% 48% 53% 47%;
background:radial-gradient(120% 90% at 25% 15%,#fffaf0 0,#fbf1dc 55%,#f1e0bd 100%);box-shadow:0 2px 0 #4a3a3533,0 6px 14px #3a2a2026;-webkit-tap-highlight-color:transparent;transition:transform .15s}
.tp-snd button:hover{transform:translateY(-1px) rotate(-3deg)}.tp-snd button:active{transform:scale(.92)}
.tp-snd svg{width:22px;height:22px;fill:none;stroke:${INK};stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round}
.tp-snd .off{opacity:.55}.tp-snd .off svg .x{display:inline}.tp-snd svg .x{display:none}
html.tp-touch .tp-snd{left:calc(env(safe-area-inset-left,0px) + 12px);bottom:auto;top:calc(env(safe-area-inset-top,0px) + 214px)}
html.tp-touch .tp-snd.idle{opacity:0}
@media (orientation:landscape) and (max-height:500px){html.tp-touch .tp-snd{top:calc(env(safe-area-inset-top,0px) + 128px)}}`
const SPK = `<svg viewBox="0 0 24 24"><path d="M4.2 9.4h3.3l4.6-3.8c.4-.3.9 0 .9.5v11.8c0 .5-.5.8-.9.5l-4.6-3.8H4.3c-.6 0-1-.5-1-1.1V10.5c0-.6.4-1.1.9-1.1z"/><path class="w" d="M16 9.2c1 .8 1.5 1.8 1.5 2.9s-.5 2.1-1.4 2.8M18.4 6.9c1.7 1.4 2.6 3.2 2.6 5.2 0 1.9-.9 3.7-2.5 5"/><path class="x" d="M16.3 9.4l4.6 5.2M20.9 9.4l-4.6 5.2"/></svg>`
const NOTE = `<svg viewBox="0 0 24 24"><path d="M9.3 17.4V6.6l9.4-2v10.6"/><ellipse cx="7.2" cy="17.6" rx="2.3" ry="1.8" transform="rotate(-18 7.2 17.6)"/><ellipse cx="16.6" cy="15.4" rx="2.3" ry="1.8" transform="rotate(-18 16.6 15.4)"/><path class="x" d="M4.5 4.8l15 14.4"/></svg>`
export function mountChip(api, get, sub) {
  const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st)
  const w = document.createElement('div'); w.className = 'tp-snd'
  w.innerHTML = `<button class="spk" aria-label="Sound on/off" title="Sound">${SPK}</button><button class="mus" aria-label="Music on/off" title="Music">${NOTE}</button>`
  const [b1, b2] = w.querySelectorAll('button'); let lastMusic = get().music || 0.7
  const sync = (s) => { b1.classList.toggle('off', s.muted || !s.volume); b1.querySelector('.w').style.display = s.muted || !s.volume ? 'none' : ''; b2.classList.toggle('off', s.muted || !s.music); b2.setAttribute('aria-pressed', String(!!s.music)); b1.setAttribute('aria-pressed', String(!s.muted)) }
  const stop = (e) => { e.stopPropagation() }
  b1.addEventListener('pointerdown', stop); b2.addEventListener('pointerdown', stop)
  b1.onclick = () => api.mute(!get().muted)
  b2.onclick = () => { const s = get(); if (s.music) { lastMusic = s.music; api.setMusic(0) } else { if (s.muted) api.mute(false); api.setMusic(lastMusic || 0.7) } }
  // touch: fade with the pad (3.5 s idle), back on any touch
  let t = 0; const wake = () => { w.classList.remove('idle'); clearTimeout(t); t = setTimeout(() => w.classList.add('idle'), 3500) }
  addEventListener('pointerdown', wake, true); wake()
  const un = sub(sync); sync(get()); document.body.appendChild(w)
  return { remove() { un(); removeEventListener('pointerdown', wake, true); clearTimeout(t); w.remove(); st.remove() } }
}
