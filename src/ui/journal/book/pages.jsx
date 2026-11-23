// The journal book's five pages. Each takes ctx = { sub, pick, setPick, refresh } and returns [leftPage, rightPage].
// Rows come from systems/journalPages.js (pure, unit-tested); this file only draws them, like ui-mocks/a/journal.html.
import React from 'react'
import { G, emit } from '../../../game/store.js'
import { ITEMS, RECIPES, known, owned, haveFor, canCraft, craft } from '../../../game/craft.js'
import { Icon } from '../../../game/icons.jsx'
import { FISH_TEXT, FORAGE_RELIC_TEXT } from '../../../game/itemsC.js'
import { PROFILES } from '../../../talk/profiles.js'
import { PREFS, RETURN_GIFTS } from '../../../systems/friendship.js'
import { quests, people, giftShelves, recipeRows, RECIPE_TABS, discoveries, fishFacts, forageSeason, firsts } from '../../../systems/journalPages.js'
import { SC } from '../../../systems/liveC.js'
import { MAX, PER_PAGE, pageCount } from '../../../systems/photo.js'
import { pasteLook, pasteStyle } from './paste.js'
import { HoshinoPortrait } from '../../../art/museum/portrait.jsx'
import { registerRelicIcons } from '../../../art/museum/icons.jsx'
import '../../../art/forage/icons.jsx'
import { JOURNAL_TABS } from '../text.js'
registerRelicIcons()

const name = (id) => FISH_TEXT[id]?.name || FORAGE_RELIC_TEXT[id]?.name || ITEMS[id]?.name || id
const desc = (id) => FISH_TEXT[id]?.desc || FORAGE_RELIC_TEXT[id]?.desc || ITEMS[id]?.desc || ''
const npc = (id) => PROFILES[id]?.name || id
const T = { itemName: name, npcName: npc, known, owned, haveFor }
const D = (d) => 'Day ' + (d + 1)
const cap = (x) => (x ? x[0].toUpperCase() + x.slice(1) : '')
const blank = (id) => JOURNAL_TABS.find(t => t.id === id)?.blank || ''
const It = ({ id, size, dim }) => <span className="jb-it" style={{ width: size, height: size }}><Icon id={id} size={size} wash={false} dim={dim} /></span>
const Ghost = ({ id, size }) => <span className="jb-it" style={{ width: size, height: size, filter: 'brightness(0)', opacity: 0.18 }}><Icon id={id} size={size} wash={false} /></span>
const short = (n) => n.replace(/^(Grandma|Grandpa|Granny|Professor|Mr\.) /, '')
const hue = (k) => [...k].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7)
function Med({ id, size, unmet }) {
  if (unmet) return <span className="jb-med" style={{ width: size, height: size, fontSize: size * 0.46, background: '#d9c3a3', color: '#f6ead8' }}>?</span>
  if (id === 'scholar') return <HoshinoPortrait size={size} />
  return <span className="jb-med" style={{ '--h': hue(id), width: size, height: size, fontSize: size * 0.46 }}>{short(npc(id))[0]}</span>
}
const HEART = 'M12 21s-7.5-4.6-9.5-9.4C1 8 3.2 4.5 6.8 4.5c2.2 0 3.6 1.2 5.2 3 1.6-1.8 3-3 5.2-3 3.6 0 5.8 3.5 4.3 7.1C19.5 16.4 12 21 12 21z'
function Hearts({ n, size = 16, of = 5 }) {
  return <span className="jb-hearts" aria-label={`${Math.round(n * 2) / 2} of ${of} hearts`}>{Array.from({ length: of }, (_, i) => { const f = Math.max(0, Math.min(1, n - i))
    return <svg key={i} width={size} height={size} viewBox="0 0 24 24"><path d={HEART} fill="#ecd9c0" stroke="#c4936a" strokeWidth="1.6" />
      {f > 0 && <path d={HEART} fill="#ef6f6c" stroke="#b8452e" strokeWidth="1.6" style={{ clipPath: `inset(0 ${100 - f * 100}% 0 0)` }} />}</svg> })}</span>
}
const Box = ({ label, children, style }) => <div className="jb-box" style={style}><b className="jb-lab">{label}</b>{children}</div>
const Row = ({ ok, icon, text, count }) => <div className={'jb-row' + (ok ? ' ok' : '')}><span className="jb-chk" />{icon && <It id={icon} size={34} />}<span className="t">{text}</span>{count && <span className="c">{count}</span>}</div>
const Foot = ({ children }) => <div style={{ marginTop: 'auto', paddingBottom: 6 }}>{children}</div>

// ---------- Quests ----------
const PILL = { active: 'Active', avail: 'Go and see', done: 'Done' }
function QuestsPage({ pick, setPick, refresh }) {
  const rows = quests(G.s, T), sel = rows.find(r => r.id === pick) || rows.find(r => r.kind !== 'log') || rows[0]
  let g = ''
  const left = <><div className="jb-ph">Quests <small>Day {G.s.day + 1}</small></div>
    <div className="jb-scroll">{rows.length ? rows.map(r => { const head = r.group !== g ? <div className="jb-qh">{(g = r.group)}</div> : null
      return <React.Fragment key={r.id}>{head}<button data-pick={r.id} className={'jb-qc' + (sel && r.id === sel.id ? ' on' : '') + (r.state === 'done' ? ' done' : '')} onClick={() => setPick(r.id)}>
        <span className="ic">{r.kind === 'tutorial' ? <It id="book" size={58} /> : r.kind === 'board' ? <It id="board" size={58} /> : <Med id={r.npcId} size={54} />}</span>
        <span><b>{r.title}</b><span className="d">{r.desc}</span></span><span className={'jb-pill ' + r.state}>{PILL[r.state]}</span></button></React.Fragment> })
      : <p className="jb-empty">Nothing to do right now. New notes go up on the village board each morning.</p>}</div>
    <div className="jb-lfoot">{((n) => `${n} favour${n === 1 ? '' : 's'} finished`)(((G.s.errands && G.s.errands.log) || []).length)}</div></>
  if (!sel) return [left, <p key="e" className="jb-rdesc" style={{ marginTop: 200 }}>Quests you take on will be written here.</p>]
  let right
  if (sel.kind === 'tutorial') right = <><div className="jb-blob"><It id="book" size={100} /></div><div className="jb-rt">Settle In</div><div className="jb-rule" />
    <p className="jb-rdesc">{npc('grandma')} wrote you a little list for your first days on the planet.</p>
    <Box label="Steps">{sel.lines.map((l, i) => <Row key={i} ok={l.ok} text={l.text} />)}</Box></>
  else if (sel.kind === 'board') right = <><div className="jb-blob"><It id="board" size={100} /></div><div className="jb-rt">New notes on the board</div><div className="jb-rule" />
    <p className="jb-rdesc">Neighbours have pinned up requests on the notice board in the village. Walk over and read them; a favour you take shows up here with everything you need.</p>
    <Foot><div className="jb-hint">Details appear here once you take a note at the board.</div></Foot></>
  else if (sel.kind === 'notice') right = <><div className="jb-blob"><Med id={sel.npcId} size={110} /></div><div className="jb-rt">{sel.title}</div><div className="jb-rule" /><p className="jb-rdesc">{sel.mention}</p></>
  else { const p = PROFILES[sel.npcId] || {}, rw = sel.reward || {}, tracked = G.s.errands.track === sel.id, ready = sel.lines.slice(0, -1).every(l => l.ok)
    right = <><div className="jb-blob"><Med id={sel.npcId} size={110} /></div><div className="jb-rt">{sel.title}</div><div className="jb-rsub">{p.name} · {p.role}</div><div className="jb-rule" />
      <Box label="To do">{sel.lines.map((l, i) => <Row key={i} ok={sel.kind === 'log' || l.ok} icon={l.itemId} text={l.text} count={l.need != null ? `${l.have}/${l.need}` : null} />)}</Box>
      <Box label="Reward" style={{ marginTop: 22 }}><div className="jb-row" style={{ justifyContent: 'center', gap: 22 }}>
        {rw.coins ? <span className="jb-rw"><It id="coin" size={30} /> {rw.coins} coins</span> : null}
        {rw.hearts ? <span className="jb-rw"><Hearts n={1} of={1} size={26} /> +{rw.hearts} heart{rw.hearts > 1 ? 's' : ''}</span> : null}
        {rw.itemId ? <span className="jb-rw"><It id={rw.itemId} size={30} /> {name(rw.itemId)}</span> : null}</div></Box>
      <Foot>{sel.kind === 'log' ? <div className="jb-hint">Finished on {D(sel.day)}.</div>
        : <><button className="jb-btn g" aria-pressed={tracked} onClick={() => { G.s.errands.track = tracked ? null : sel.id; refresh() }}><It id="check" size={30} />{tracked ? 'Tracking' : 'Track'}</button>
          <div className="jb-hint">{ready ? `You have everything. Take it to ${p.name}.` : 'Shows this favour on your quest tracker.'}</div></>}</Foot></> }
  return [left, right]
}

// ---------- People ----------
function PeoplePage({ pick, setPick }) {
  const P = people(G.s, PROFILES), sel = P.rows.find(r => r.id === pick) || P.rows.find(r => r.metDay != null) || P.rows[0]
  const left = <><div className="jb-ph">People <small>{P.met} of {P.total} met</small></div>
    <div className="jb-scroll"><div className="jb-pgrid">{P.rows.map(r => r.metDay != null
      ? <button key={r.id} data-pick={r.id} className={'jb-pc' + (r.id === sel.id ? ' on' : '')} onClick={() => setPick(r.id)}><Med id={r.id} size={52} /><b>{short(r.name)}</b><Hearts n={r.hearts} size={15} /></button>
      : <button key={r.id} data-pick={r.id} className={'jb-pc unmet' + (r.id === sel.id ? ' on' : '')} onClick={() => setPick(r.id)}><Med unmet size={52} /><b>???</b><Hearts n={0} size={15} /></button>)}</div></div></>
  if (sel.metDay == null) return [left, <><div className="jb-blob sm"><Med unmet size={96} /></div><div className="jb-rt">Not met yet</div><div className="jb-rule" />
    <p className="jb-rdesc">Someone in the village you haven't said hello to yet. Walk up to them and have a chat.</p></>]
  const g = giftShelves({ seen: sel.seen }, PREFS[sel.id]), first = short(sel.name).split(' ').pop()
  const shelf = (k, label) => <div className="jb-shelf"><span>{label}</span>{g[k].map(id => <span key={id} title={name(id)}><It id={id} size={42} /></span>)}{Array.from({ length: g.left[k] }, (_, i) => <span key={'q' + i} className="q">?</span>)}{!g[k].length && !g.left[k] && <span className="jb-hint" style={{ margin: 0 }}>—</span>}</div>
  return [left, <><div className="jb-blob sm"><Med id={sel.id} size={96} /></div><div className="jb-rt">{sel.name}</div><div className="jb-rsub">{cap(sel.role)} · met on {D(sel.metDay)}</div><Hearts n={sel.hearts} size={30} />
    <p className="jb-rdesc" style={{ margin: '8px 10px 14px' }}>Loves <i>{sel.fav}</i>.</p>
    <Box label="Gifts">{shelf('love', 'Loves')}{shelf('like', 'Likes')}{shelf('dislike', 'Dislikes')}</Box>
    <Box label="Friendship" style={{ marginTop: 20, paddingTop: 8 }}>{Object.entries(RETURN_GIFTS).map(([h, [id, n]]) =>
      <Row key={h} ok={sel.hearts >= +h} text={`${h} hearts: ${first} gives you ${n > 1 ? n + ' × ' : 'a '}${name(id)}`} />)}</Box>
    <Foot><div className="jb-hint">{sel.giftedToday ? 'Gifted today. One gift a day each.' : 'No gift yet today.'}</div></Foot></>]
}

// ---------- Recipes ----------
const atBench = () => !!(G.ui.atBench && G.near && G.near.kind === 'bench')
function RecipesPage({ sub, pick, setPick, refresh }) {
  const rows = recipeRows(sub, G.s, T), sel = rows.find(r => r.id === pick) || rows.find(r => r.known) || rows[0]
  const nKnown = rows.filter(r => r.known).length
  const left = <><div className="jb-scroll">{rows.map(r => <button key={r.id} data-pick={r.id} className={'jb-rc' + (sel && r.id === sel.id ? ' on' : '') + (r.known ? '' : ' lock')} onClick={() => setPick(r.id)}>
    {r.known ? <It id={r.makes} size={46} /> : <Ghost id={r.makes} size={46} />}
    <span><b>{r.known ? name(r.makes) : '???'}{r.perfectDay != null && <span className="jb-pf"> ✦</span>}</b>
      <small>{r.known ? r.needs.map(({ need: [, n], show }) => `${n} ${show.map(x => (x === 'unknown' ? '???' : name(x))).join(' or ')}`).join(' · ') : 'Find its ingredients to learn it'}</small></span>
    {r.owned ? <span className="jb-pill done own">{r.cat === 'Unlock' ? 'Built' : 'Owned'}</span> : r.ready ? <span className="jb-rdy" title="You have everything" /> : null}</button>)}</div>
    <div className="jb-lfoot">{nKnown} of {rows.length} learned · <span style={{ color: '#4f8f2a' }}>●</span> ready to make</div></>
  if (!sel) return [left, null]
  if (!sel.known) return [left, <><div className="jb-blob"><Ghost id={sel.makes} size={100} /></div><div className="jb-rt">???</div><div className="jb-rule" /><p className="jb-rdesc">Find all of its ingredients out in the world to learn this recipe.</p></>]
  const r = sel.recipe, busy = G.ui.crafting && G.ui.crafting.id === r.id, stove = r.at === 'stove'
  const action = sel.owned ? <div className="jb-hint">{r.cat === 'Unlock' ? 'Already built.' : 'Already in your bag.'}</div>
    : atBench() && !stove ? <button className="jb-btn g" data-act="craft" disabled={!canCraft(r) || !!G.ui.crafting} onClick={() => craft(r, () => { emit(); refresh() })}><It id="hand" size={30} />{busy ? 'Crafting…' : 'Craft'}</button>
      : <><button className="jb-btn g" disabled><It id="hand" size={30} />Craft</button><div className="jb-hint">{stove ? 'Cook this on the stove at home.' : 'Craft at the bench beside Home.'}</div></>
  return [left, <><div className="jb-blob"><It id={r.makes} size={104} /></div><div className="jb-rt">{name(r.makes)}</div>
    <div className="jb-rsub">{r.cat === 'Unlock' ? 'Builds' : r.cat}{sel.owned ? ' · Owned' : ''}{sel.perfectDay != null && <span className="jb-pf"> · ✦ Perfect on {D(sel.perfectDay)}</span>}</div><div className="jb-rule" />
    <p className="jb-rdesc">{desc(r.makes)}</p>
    <Box label="Needs">{sel.needs.map(({ need: [, n], have, ok, show }, i) =>
      <Row key={i} ok={ok} icon={show[0]} text={show.map(x => (x === 'unknown' ? '???' : name(x))).join(' or ')} count={`${Math.min(have, n)}/${n}`} />)}</Box>
    <Foot>{action}</Foot></>]
}

// ---------- Discoveries ----------
function DiscoveriesPage({ sub, pick, setPick }) {
  const d = discoveries(sub, G.s), sel = d.rows.find(e => e.id === pick) || d.rows.find(e => e.seen) || d.rows[0]
  const canGive = (id) => sub !== 'forage' && (sub === 'relics' || ['koi', 'sea_bream', 'lake_lord'].includes(id))
  const left = <><div className="jb-scroll"><div className="jb-dgrid">{d.rows.map(e => <button key={e.id} data-pick={e.id} className={'jb-dc' + (e.seen ? '' : ' no') + (sel && e.id === sel.id ? ' on' : '')} onClick={() => setPick(e.id)}>
    {e.seen ? <It id={e.id} size={64} /> : <Ghost id={e.id} size={64} />}<b>{e.seen ? name(e.id) : '? ? ?'}</b>{e.donated && <i className="jb-stamp">MUSEUM</i>}</button>)}</div></div>
    <div className="jb-lfoot">{d.found} of {d.total} found{d.museum ? ` · Museum ${d.museum.donated}/${d.museum.of}` : ''}</div></>
  if (!sel || !sel.seen) { const f = sel && sub === 'fish' && fishFacts(sel.id)
    const hint = f ? `Try the ${f.where.join(' or ')}${f.seasons === 'any' ? '' : ' in ' + f.seasons.join(' or ')}${f.times === 'any' ? '' : ', ' + f.times.join(' or ')}${f.weather === 'any' ? '' : ', when it is ' + f.weather}.`
      : sub === 'forage' && sel ? `Look for it in ${forageSeason(sel.id)}.` : blank(sub)
    return [left, <><div className="jb-blob">{sel && <Ghost id={sel.id} size={100} />}</div><div className="jb-rt">Still a mystery</div><div className="jb-rule" /><p className="jb-rdesc">{hint}</p></>] }
  const facts = [['First found', sel.firstDay != null ? D(sel.firstDay) : '—'], [sub === 'fish' ? 'Caught' : 'Found', '×' + Math.max(1, sel.count || 0)]]
  const f = sub === 'fish' && fishFacts(sel.id)
  if (f) facts.push(['Biggest', sel.best ? sel.best + ' cm' : '—'], ['Where', f.where.map(cap).join(', ')], ['When', [f.seasons === 'any' ? 'Any season' : f.seasons.map(cap).join(', '), f.times === 'any' ? 'any time' : f.times.join(', ')].join(' · ')], ['Weather', f.weather === 'any' ? 'Any' : cap(f.weather)])
  if (sub === 'forage') facts.push(['Season', cap(forageSeason(sel.id))])
  const don = G.s.museum.donated[sel.id]
  return [left, <><div className="jb-blob"><It id={sel.id} size={104} /></div><div className="jb-rt">{name(sel.id)}</div>{f && <div className="jb-rsub">{cap(f.rarity === 'legend' ? 'legendary' : f.rarity)}</div>}<div className="jb-rule" />
    <p className="jb-rdesc">{desc(sel.id)}</p>
    <Box label="Notes"><dl className="jb-facts">{facts.map(([a, b]) => <React.Fragment key={a}><dt>{a}</dt><dd>{b}</dd></React.Fragment>)}</dl></Box>
    <Foot>{canGive(sel.id) ? (don !== undefined ? <span className="jb-bigstamp">IN THE MUSEUM · {D(don)}</span> : <div className="jb-hint">Bring one to Professor Hoshino at the ruins to put it on show.</div>) : null}</Foot></>]
}

// ---------- Memories ----------
function Diary({ ev }) {
  let d = -1
  return <div className="jb-diary">{ev.map((e, i) => <React.Fragment key={i}>{e.day !== d && <div className="jb-dd">{D((d = e.day))}</div>}
    <p>{e.kind === 'met' || e.kind === 'favour' ? <Med id={e.id} size={34} /> : e.kind === 'hearts' ? <Hearts n={1} of={1} size={32} /> : <It id={e.id} size={34} />}<span>{e.text}</span></p></React.Fragment>)}</div>
}
function MemoriesPage({ sub, pick, setPick, refresh }) {
  if (sub === 'firsts') {
    const ev = firsts(G.s, T)
    if (!ev.length) return [<p key="e" className="jb-empty">Her journal fills in by itself as the days go by.</p>, null]
    const lines = (n) => n + new Set(ev.slice(0, n).map(e => e.day)).size // a day heading takes a line too
    const cuts = ev.map((e, i) => i).filter(i => i > 0 && ev[i].day !== ev[i - 1].day), goal = lines(ev.length) * 0.45
    const at = cuts.length ? cuts.reduce((b, i) => (Math.abs(lines(i) - goal) < Math.abs(lines(b) - goal) ? i : b), cuts[0]) : ev.length
    return [<div key="l" className="jb-scroll"><Diary ev={ev.slice(0, at)} /></div>, <><div className="jb-scroll" style={{ width: '100%' }}><Diary ev={ev.slice(at)} /></div><div className="jb-hint">Her journal fills in by itself as the days go by.</div></>]
  }
  // the album: oldest first, PER_PAGE to a page; the page follows the picked photo (opens on the newest)
  const list = SC.journal('photos'), sel = list.find(p => p.id === pick) || list[list.length - 1]
  const idx = sel ? list.indexOf(sel) : 0, page = Math.floor(idx / PER_PAGE), pages = pageCount(list.length), first = page * PER_PAGE
  const turn = (d) => { const np = Math.max(0, Math.min(pages - 1, page + d)); setPick(list[Math.min(list.length - 1, np * PER_PAGE)].id) }
  // only photos she has taken are shown, each pasted in by hand (paste.js); an empty album is just the hint
  const left = <><div className="jb-scroll">{list.length ? <div className="jb-mgrid">{list.slice(first, first + PER_PAGE).map(p =>
    <button key={p.id} data-pick={p.id} data-tape={pasteLook(p.id).tape} className={'jb-pol' + (sel && p.id === sel.id ? ' on' : '')} style={pasteStyle(p.id)} onClick={() => setPick(p.id)}>
      {p.src ? <img src={p.src} alt={'Photo from day ' + (p.day + 1)} /> : <div className="jb-lost">faded</div>}<span>{D(p.day)}</span></button>)}</div>
    : <p className="jb-empty jb-albumhint">{blank('photos')}</p>}</div>
    <div className="jb-lfoot jb-pager">{pages > 1 && <button className="jb-turn" data-turn="-1" disabled={page === 0} onClick={() => turn(-1)} aria-label="Previous page">‹</button>}
      <span>{pages > 1 ? `${page + 1} / ${pages} · ` : ''}{list.length} of {MAX} kept</span>
      {pages > 1 && <button className="jb-turn" data-turn="1" disabled={page === pages - 1} onClick={() => turn(1)} aria-label="Next page">›</button>}</div></>
  if (!sel) return [left, <p key="e" className="jb-rdesc" style={{ marginTop: 220 }}>Photos you take are pasted in here.</p>]
  const remove = () => { if (confirm('Remove this photo from your journal?')) { const next = list[idx + 1] || list[idx - 1]; SC.removePhoto(sel.id); setPick(next ? next.id : null); refresh() } }
  return [left, <><div className="jb-pol jb-bigpol" data-tape={pasteLook(sel.id).tape} style={{ ...pasteStyle(sel.id), marginTop: 30 }}>{sel.src ? <img src={sel.src} alt={'Photo from day ' + (sel.day + 1)} /> : <div className="jb-lost">faded</div>}<span>{D(sel.day)}</span></div>
    <div className="jb-rsub" style={{ marginTop: 22 }}>Photo {idx + 1} of {list.length}</div>
    <Foot><button className="jb-btn" style={{ background: '#ead7bb', color: '#6a4a2e' }} onClick={remove}>Remove</button></Foot></>]
}

export const PAGES = { quests: QuestsPage, people: PeoplePage, recipes: RecipesPage, discoveries: DiscoveriesPage, memories: MemoriesPage }
const count = (sub) => () => { const d = discoveries(sub, G.s); return `${d.found}/${d.total}` }
const learned = (tab) => () => { const r = RECIPES.filter(x => RECIPE_TABS[tab].includes(x.cat)); return `${r.filter(known).length}/${r.length}` }
export const SUBS = {
  recipes: [{ id: 'tools', label: 'Tools', c: '#8a9bb0', count: learned('tools') }, { id: 'food', label: 'Food', c: '#e0915a', count: learned('food') },
    { id: 'decor', label: 'Decor', c: '#8fba5c', count: learned('decor') }, { id: 'keepsakes', label: 'Keepsakes', c: '#c98ab8', count: learned('keepsakes') }],
  discoveries: [{ id: 'fish', label: 'Fish', c: '#6fa6c0', count: count('fish') }, { id: 'forage', label: 'Forage', c: '#8fba5c', count: count('forage') }, { id: 'relics', label: 'Relics', c: '#d39a3c', count: count('relics') }],
  memories: [{ id: 'photos', label: 'Photos', c: '#e08a8a', count: () => `${G.s.photos.list.length}` }, { id: 'firsts', label: 'Firsts', c: '#c9a24a' }],
}
