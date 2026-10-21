// DOM side of Gather & Craft: HUD, prompt, bag, recipe book / bench, toasts, fly-to-bag, fishing minigame, placement bar.
import { TOUCH } from '../touch.jsx'
import React, { useEffect, useReducer, useRef, useState } from 'react'
import { G, subscribe, emit, setPanel, count, reset } from './store.js'
import { haveFor, known, owned, canCraft, craft, ITEMS, RECIPES } from './craft.js'
import { TOOLS, DECOR } from './items.js'
import { NEEDS_TOOL } from './recipes.js'
import { Icon, IconDefs } from './icons.jsx'
import { GAME, startPlace, confirmPlace } from './World.jsx'
import './ui.css'
const q = new URLSearchParams(location.search)
const useGame = () => { const [, f] = useReducer(x => x + 1, 0); useEffect(() => subscribe(f), []) }
const isModal = () => !!(G.ui.panel || G.ui.fish)
export const gameBlocksKeys = () => isModal() || !!G.ui.place

function Clock() {
  const [, setT] = useState('') // re-render only when the shown minute / icon / day changes (it used to re-render twice a second)
  useEffect(() => { const k = () => { const a = ((window.__rot?.a ?? 0) % 6.283185307 + 6.283185307) % 6.283185307, h = (12 + a / 6.283185307 * 24) % 24; return Math.floor(h * 6) + ':' + G.s.day }; const i = setInterval(() => setT(k()), 500); return () => clearInterval(i) }, [])
  const a = ((window.__rot?.a ?? 0) % 6.283185307 + 6.283185307) % 6.283185307, hour = (12 + a / 6.283185307 * 24) % 24
  const ic = hour >= 6.5 && hour < 17.5 ? 'sun' : hour >= 17.5 && hour < 19.5 || hour >= 5 && hour < 6.5 ? 'dusk' : 'moon'
  const hh = Math.floor(hour), mm = Math.floor((hour - hh) * 6) * 10
  return <div className="tp-clock paper"><Icon id={ic} size={34} /><div><b>{String(hh).padStart(2, '0')}:{String(mm).padStart(2, '0')}</b><small>Day {G.s.day + 1}</small></div></div>
}
function Prompt() {
  const n = G.near; if (!n || G.ui.panel || G.ui.fish || G.ui.place) return null
  let icon = 'hand', verb, name
  if (n.kind === 'ext') { icon = n.icon; verb = n.verb; name = n.name }
  else if (n.kind === 'bench') { icon = 'book'; verb = 'Craft at'; name = 'the bench' }
  else if (n.kind === 'chest') { icon = 'skyseed'; verb = 'Open'; name = 'the picnic chest' }
  else if (n.kind === 'decor') { icon = n.item; verb = 'Pick up'; name = ITEMS[n.item].name }
  else { const it = n.spot.item; icon = it; name = ITEMS[it].name; verb = it === 'fish' ? 'Fish for' : it === 'wool' ? 'Shear' : it === 'firefly' ? 'Catch' : it === 'water' ? 'Fill can with' : 'Gather'; if (it === 'wool') name = 'the sheep' }
  const need = n.kind === 'spot' && NEEDS_TOOL[n.spot.item]; const lack = need && !G.s.tools[need]
  // round6: compact chips (pets): a small main chip, plus an optional secondary chip (e.g. throw a stick, key F)
  if (n.chip) return <div className="tp-chips">
    <button className="tp-chip paper" onClick={() => GAME.actions.act?.()}><span className="key">E</span><Icon id={icon} size={24} /><span>{verb}{name ? <> <b>{name}</b></> : null}</span></button>
    {n.alt && <button className="tp-chip tp-chip-alt paper" onClick={() => n.alt.act()}><span className="key">{n.alt.key || 'F'}</span><Icon id={n.alt.icon} size={20} /><span>{n.alt.verb}</span></button>}
  </div>
  return <button className={'tp-prompt paper' + (lack ? ' lack' : '')} onClick={() => GAME.actions.act?.()}>
    <span className="key">E</span><Icon id={icon} size={38} /><span>{verb} <b>{name}</b>{lack && <em>needs {ITEMS[need].name}</em>}</span>
  </button>
}
function Toasts() { return <div className="tp-toasts">{G.ui.toasts.map(t => <div key={t.id} className="tp-toast paper"><Icon id={t.icon || 'leaf'} size={30} /><span>{t.text}</span></div>)}</div> }
function Fly() {
  const [list, setList] = useState([])
  useEffect(() => { if (G.ui.fly.length) { const add = G.ui.fly; G.ui.fly = []; setList(l => [...l, ...add]); if (!q.has('pick')) add.forEach(f => setTimeout(() => setList(l => l.filter(x => x !== f)), 1100)) } })
  const bag = document.querySelector('.tp-bagbtn')?.getBoundingClientRect()
  const hold = q.has('pick')
  return <>{list.map(f => <div key={f.id} className={'tp-fly' + (hold ? ' hold' : '')} style={{ '--x0': f.x + 'px', '--y0': f.y + 'px', '--x1': (bag ? bag.x + bag.width / 2 : innerWidth - 60) + 'px', '--y1': (bag ? bag.y + bag.height / 2 : 60) + 'px' }}><Icon id={f.item} size={46} /></div>)}</>
}
function Slot({ id, n, onClick, tag }) { return <button className={'tp-slot' + (onClick ? ' act' : '')} onClick={onClick} title={ITEMS[id].desc}><Icon id={id} size={52} /><span className="nm">{ITEMS[id].name}</span>{n != null && <span className="ct">×{n}</span>}{tag && <span className="tag">{tag}</span>}</button> }
function Bag() {
  const inv = Object.entries(G.s.inv).filter(([, n]) => n > 0), decor = inv.filter(([k]) => DECOR.includes(k)), food = inv.filter(([k]) => ITEMS[k].cat === 'food'), mats = inv.filter(([k]) => !DECOR.includes(k) && ITEMS[k].cat !== 'food')
  return <Panel title="Bag" icon="bag" onClose={() => setPanel(null)}>
    <h4>Tools</h4><div className="tp-row">{TOOLS.map(t => G.s.tools[t] ? <Slot key={t} id={t} tag="owned" /> : <div key={t} className="tp-slot ghost"><Icon id={t} size={52} dim /><span className="nm">{ITEMS[t].name}</span><span className="tag dim">not yet</span></div>)}</div>
    <h4>Gathered</h4>{mats.length ? <div className="tp-grid">{mats.map(([k, n]) => <Slot key={k} id={k} n={n} />)}</div> : <p className="tp-empty">Nothing yet — wander the forest and press E near things that shimmer.</p>}
    {!!food.length && <><h4>Food</h4><div className="tp-grid">{food.map(([k, n]) => <Slot key={k} id={k} n={n} />)}</div></>}
    {!!decor.length && <><h4>Decor <small>tap to place near Home</small></h4><div className="tp-grid">{decor.map(([k, n]) => <Slot key={k} id={k} n={n} onClick={() => startPlace(k)} tag="place" />)}</div></>}
    <div className="tp-foot"><span>{Object.keys(G.s.seen).length} / {Object.keys(ITEMS).length} things discovered</span><button className="tp-link" onClick={() => { if (q.has('ui') || confirm('Start over? Your bag, tools, decor and the bridge will be reset.')) { reset(); setPanel(null) } }}>Reset save</button></div>
  </Panel>
}
function Recipes() {
  const bench = G.ui.atBench && G.near?.kind === 'bench' || q.get('ui') === 'craft'
  const cats = ['Tools', 'Food', 'Decor', 'Unlock']
  return <Panel title={bench ? 'Crafting Bench' : 'Recipe Book'} icon="book" onClose={() => { setPanel(null); G.ui.atBench = false }} wide>
    {!bench && <p className="tp-sub">Craft at the bench beside your <b>Home</b>.</p>}
    {cats.map(c => <React.Fragment key={c}><h4>{c}</h4><div className="tp-recipes">{RECIPES.filter(r => r.cat === c).map(r => {
      const k = known(r), have = haveFor(r), own = owned(r), ok = canCraft(r), busy = G.ui.crafting?.id === r.id
      const prog = busy ? Math.min(1, (performance.now() - G.ui.crafting.t0) / 1100) : 0
      return <div key={r.id} className={'tp-recipe' + (k ? '' : ' locked') + (own ? ' own' : '') + (ok ? ' ready' : '') + (busy ? ' busy' : '')}>
        <div className="out">{k ? <Icon id={r.makes} size={58} /> : <Icon id="unknown" size={58} />}</div>
        <div className="body"><div className="ttl">{k ? ITEMS[r.makes].name : '???'}{own && <span className="badge"><Icon id="check" size={18} wash={false} />{c === 'Unlock' ? 'built' : 'owned'}</span>}</div>
          <div className="needs">{have.map(({ need: [id, n], have: h, ok: o }, i) => { const ic = typeof id === 'string' ? id : id.any[0]; const nm = typeof id === 'string' ? ITEMS[id].name : id.any.map(x => ITEMS[x].name).join(' / '); const seen = typeof id === 'string' ? G.s.seen[id] : id.any.some(x => G.s.seen[x])
            return <span key={i} className={'need' + (o ? ' ok' : ' miss')} title={nm}><Icon id={seen ? ic : 'unknown'} size={26} dim={!o} /><span>{Math.min(h, n)}/{n}</span></span> })}</div>
          {!own && !ok && k && <div className="miss-l">Missing: {have.filter(h => !h.ok).map(({ need: [id, n], have: h }) => `${n - h} ${typeof id === 'string' ? ITEMS[id].name : 'Herbs or Tea'}`).join(', ')}</div>}
          {!k && <div className="miss-l">Discover its ingredients to learn this recipe.</div>}
        </div>
        {bench && !own && k && r.at === 'stove' && <div className="miss-l">Cook this on the stove at home.</div>}
        {bench && !own && k && r.at !== 'stove' && <button className="tp-craft" disabled={!ok || !!G.ui.crafting} onClick={() => craft(r, () => emit())} style={{ '--hold': q.get('craft') === r.id ? 'paused' : 'running' }}>{busy ? 'Crafting…' : 'Craft'}</button>}
      </div> })}</div></React.Fragment>)}
  </Panel>
}
function Panel({ title, icon, children, onClose, wide }) {
  return <div className="tp-veil" onPointerDown={e => { if (e.target === e.currentTarget) onClose() }}><div className={'tp-panel paper' + (wide ? ' wide' : '')}>
    <div className="tp-head"><Icon id={icon} size={44} /><h3>{title}</h3><button className="tp-x" onClick={onClose} aria-label="close"><Icon id="close" size={32} wash={false} /></button></div>
    <div className="tp-scroll">{children}</div></div></div>
}
// fishing: a marker swings across the bar; press in the hit zone
function Fishing() {
  const f = G.ui.fish, bar = useRef(), mk = useRef(), [msg, setMsg] = useState(null), st = useRef({ x: 0, v: 1 })
  useEffect(() => {
    if (!f) return; let raf, last = performance.now(), fixed = q.has('fish') ? 0.46 : null
    const loop = (t) => { const s = st.current, dt = Math.min(0.05, (t - last) / 1000); last = t; s.x += s.v * dt * 0.9; if (s.x > 1) { s.x = 1; s.v = -1 } if (s.x < 0) { s.x = 0; s.v = 1 } if (fixed != null) s.x = fixed; if (mk.current) mk.current.style.left = (s.x * 100) + '%'; raf = requestAnimationFrame(loop) }
    raf = requestAnimationFrame(loop)
    const key = (e) => { if (['KeyE', 'Space', 'Enter'].includes(e.code)) { e.preventDefault(); e.stopPropagation(); reel() } if (e.code === 'Escape') { G.ui.fish = null; emit() } }
    addEventListener('keydown', key, true); return () => { cancelAnimationFrame(raf); removeEventListener('keydown', key, true) }
  }, [f?.spot])
  if (!f) return null
  const w = 0.18
  function reel() { const x = st.current.x; if (Math.abs(x - f.zone) < w / 2) { setMsg('Got one!'); setTimeout(() => { setMsg(null); GAME.actions.fishResult(true) }, 600) } else { f.tries--; if (f.tries <= 0) GAME.actions.fishResult(false); else { setMsg(x < f.zone ? 'Too early…' : 'Too late…'); setTimeout(() => setMsg(null), 700); emit() } } }
  return <div className="tp-fish paper" onPointerDown={e => { e.preventDefault(); reel() }}>
    <div className="tp-head small"><Icon id="rod" size={38} /><h3>Something's biting!</h3><span className="tries">{[0, 1, 2].map(i => <Icon key={i} id="fish" size={24} dim={i >= f.tries} />)}</span></div>
    <div className="tp-bar" ref={bar}><div className="zone" style={{ left: (f.zone - w / 2) * 100 + '%', width: w * 100 + '%' }} /><div className="mk" ref={mk}><Icon id="fish" size={34} wash={false} /></div><svg className="waves" viewBox="0 0 100 10" preserveAspectRatio="none"><path d="M0 6 Q5 2 10 6 T20 6 T30 6 T40 6 T50 6 T60 6 T70 6 T80 6 T90 6 T100 6" fill="none" stroke="#fff" strokeOpacity=".6" strokeWidth=".8" /></svg></div>
    <p>{msg || (TOUCH ? <>Tap the bar or ✋ Action when the fish is in the green</> : <>Press <span className="key">E</span> / <span className="key">Space</span> or tap when the fish is in the green</>)}</p>
  </div>
}
function PlaceBar() {
  const p = G.ui.place; if (!p) return null
  return <div className="tp-placebar paper"><Icon id={p.item} size={40} /><span>Placing <b>{ITEMS[p.item].name}</b></span>
    <button onClick={() => { p.rot += Math.PI / 4; emit() }}><Icon id="rotate" size={26} wash={false} /> R</button>
    <button className="go" onClick={confirmPlace}><Icon id="check" size={26} wash={false} /> Place</button>
    <button onClick={() => { G.ui.place = null; emit() }}><Icon id="close" size={24} wash={false} /> Esc</button></div>
}
export function GameUI() {
  useGame()
  useEffect(() => {
    const k = (e) => {
      if (e.repeat) return
      if (G.ui.fish) return
      if (G.ui.place) { if (e.code === 'KeyR') { G.ui.place.rot += Math.PI / 4; emit() } else if (e.code === 'KeyE' || e.code === 'Enter') confirmPlace(); else if (e.code === 'Escape') { G.ui.place = null; emit() } return }
      if (e.code === 'Escape') { setPanel(null); G.ui.atBench = false }
      else if (e.code === 'KeyB' || e.code === 'KeyI' || e.code === 'Tab') { e.preventDefault(); setPanel('bag') }
      else if (e.code === 'KeyC') setPanel('recipes')
      else if (e.code === 'KeyE' && !G.ui.panel) GAME.actions.act?.()
      else if (e.code === 'KeyF' && !G.ui.panel && G.near?.alt) G.near.alt.act()
    }
    addEventListener('keydown', k); return () => removeEventListener('keydown', k)
  }, [])
  const panel = G.ui.panel === 'craft' ? 'recipes' : G.ui.panel
  return <div className="tp-ui">
    <IconDefs />
    <Clock />
    <div className="tp-btns"><button className="tp-btn paper tp-bagbtn" onClick={() => setPanel('bag')}><Icon id="bag" size={46} /><span>Bag</span>{Object.values(G.s.inv).reduce((a, b) => a + b, 0) > 0 && <i>{Object.values(G.s.inv).reduce((a, b) => a + b, 0)}</i>}</button>
      <button className="tp-btn paper" onClick={() => setPanel('recipes')}><Icon id="book" size={46} /><span>Recipes</span></button></div>
    <Prompt /><Toasts /><Fly /><PlaceBar /><Fishing />
    {panel === 'bag' && <Bag />}{panel === 'recipes' && <Recipes />}
  </div>
}
