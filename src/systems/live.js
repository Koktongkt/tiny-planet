// Stage B live wiring (lazy chunk, loaded by the game UI after the first frame): garden, gifts + friendship, the daily
// errands board, food buffs and settings on top of the save (G.s.garden / friends / errands / buffs / settings, save v3).
// The rules live in the pure modules next to this file (unit-tested); this file applies them to the game state, toasts
// and the player. Debug/tests: window.__sb.
import { G, emit, toast, add, take, count, newDay, DAY_HOOKS } from '../game/store.js'
import { ITEMS, TOOLS } from '../game/items.js'
import '../game/itemsB.js'
import * as Gd from './garden.js'
import * as Fr from './friendship.js'
import * as Er from './errands.js'
import * as Bf from './buffs.js'
import { PROFILES } from '../talk/profiles.js'
const nm = (id) => (ITEMS[id] && ITEMS[id].name) || id
const who = (npcId) => (PROFILES[npcId] && PROFILES[npcId].name) || npcId
export const now = () => Bf.gameMinutes(window.__rot ? window.__rot.a : 0.4)
const S = () => G.s

// ---------- days ----------
function catchUp(day, quiet) {
  const s = S(), grew = Gd.advanceTo(s.garden, day), reset = Fr.resetDay(s.friends, day), rolled = Er.rollDay(s.errands, day)
  if (!quiet && rolled && s.errands.list.length) setTimeout(() => toast(`New request${s.errands.list.length > 1 ? 's' : ''} on the village errands board.`, 'board', 3400), 1800)
  if (!quiet && grew && s.garden.plots.some(p => p.stage === 'ripe')) setTimeout(() => toast('Something in your garden is ready to pick!', 'seedpack', 3400), 3600)
  return grew || reset || rolled
}

// ---------- garden ----------
// plot frames come from the world layout (SB.setPlots, called by the 3D side once it knows where Home is)
export function setPlots(frames) {
  const g = S().garden, byId = Object.fromEntries(g.plots.map(p => [p.id, p]))
  g.plots = frames.map(f => Object.assign(byId[f.id] || Gd.emptyPlot(f.id), { pos: f.pos, yaw: f.yaw }))
}
const plotOf = (id) => S().garden.plots.find(p => p.id === id)
const crop = (p) => p.cropId === 'herb' ? 'herbs' : p.cropId === 'skyseed' ? 'skyberry' : p.cropId
// -> the prompt for a plot: { icon, verb, name, act, alt? }
export function plotPrompt(id) {
  const p = plotOf(id); if (!p) return null
  if (!p.cropId) {
    const pack = count('seedpack') > 0, sky = count('skyseed') > 0
    if (!pack && !sky) return { icon: 'seedpack', verb: 'Empty bed —', name: 'needs seeds', act: () => toast('You need a Seed Packet or a Sky Seed. Craft packets from dandelion fluff and a coin, or ask around the village.', 'seedpack', 3800) }
    const main = pack ? 'seedpack' : 'skyseed', o = { icon: main, verb: 'Plant', name: nm(main), act: () => plantAt(id, main) }
    if (pack && sky) o.alt = { verb: 'Plant Sky Seed', icon: 'skyseed', key: 'F', act: () => plantAt(id, 'skyseed') }
    return o
  }
  if (p.stage === 'withered') return { icon: 'leaf', verb: 'Clear the', name: 'withered plant', act: () => { Gd.clear(p); toast('Cleared. The soil is ready again.', 'leaf'); emit() } }
  if (p.stage === 'ripe') return { icon: crop(p), verb: 'Harvest', name: nm(crop(p)), act: () => harvestAt(id) }
  if (!p.watered) return { icon: 'can', verb: 'Water', name: `the ${nm(crop(p))} (${p.stage})`, act: () => waterAt(id) }
  return { icon: crop(p), verb: 'Growing:', name: `${nm(crop(p))} (${p.stage})`, act: () => toast(`Watered today. Come back tomorrow morning.`, 'can') }
}
export function plantAt(id, seed) {
  const p = plotOf(id); if (!p || p.cropId || count(seed) < 1) return false
  const i = S().garden.plots.indexOf(p), cropId = seed === 'skyseed' ? 'skyseed' : Gd.packCrop(i, S().day)
  if (!Gd.plant(p, cropId, S().day)) return false
  take(seed, 1); window.__sbAct && window.__sbAct('place', p)
  toast(seed === 'skyseed' ? 'You planted the Sky Seed. Water it every day…' : `Planted ${nm(cropId === 'herb' ? 'herbs' : cropId)} seeds. Water them every day.`, seed); emit(); return true
}
export function waterAt(id) {
  const p = plotOf(id); if (!p) return false
  if (!S().tools.can) { toast('You need a Watering Can for that. Craft one from clay at the bench.', 'can', 3200); return false }
  if (!Gd.water(p)) return false
  window.__sbAct && window.__sbAct('water', p); toast('Watered. It will grow overnight.', 'can'); emit(); return true
}
export function harvestAt(id) {
  const p = plotOf(id); if (!p) return null
  const out = Gd.harvest(p); if (!out) return null
  window.__sbAct && window.__sbAct('pick', p)
  for (const [k, n] of out) add(k, n, true)
  toast('Harvested ' + out.map(([k, n]) => `${n} ${nm(k)}`).join(' + ') + '!', out[0][0], 3200); emit(); return out
}

// ---------- friendship + gifts ----------
export const friend = (npcId) => S().friends.list[npcId] || Fr.newFriend(npcId)
export const giftable = () => Object.entries(S().inv).filter(([k, n]) => n > 0 && !TOOLS.includes(k) && k !== 'bridgekit' && ITEMS[k]).map(([id, count]) => ({ id, count }))
export const prefsSeen = (npcId) => { const f = S().friends.list[npcId], o = {}; for (const [k, v] of Object.entries((f && f.seen) || {})) o[k] = v; return o }
export function giveGift(npcId, itemId) {
  if (count(itemId) < 1) return null
  const r = Fr.give(S().friends, npcId, itemId, Bf.has(S().buffs, 'cozy', now()) ? Bf.BUFFS.cozy.heartsMul : 1); if (!r) return null
  take(itemId, 1); const f = S().friends.list[npcId]; f.seen = { ...(f.seen || {}), [itemId]: r.kind }
  for (const [k, n] of r.returns) setTimeout(() => { add(k, n, true); toast(`${who(npcId)} gives you ${n} ${nm(k)} in return!`, k, 3800) }, 2000)
  emit(); return r
}

// ---------- errands ----------
export function acceptErrand(id) { if (!Er.accept(S().errands, id)) return false; const e = S().errands.list.find(x => x.id === id); toast(`You took ${who(e.npcId)}'s request.`, 'board'); emit(); return true }
export function deliverErrand(id) {
  const e = S().errands.list.find(x => x.id === id), r = Er.deliver(S().errands, id, S().inv); if (!r) return null
  if (r.coins) add('coin', r.coins, true)
  if (r.itemId) add(r.itemId, 1, true)
  if (r.hearts) Fr.addHearts(S().friends, e.npcId, r.hearts)
  toast(`${who(e.npcId)}: "Thank you!" ` + [r.coins && `+${r.coins} ${nm('coin')}`, r.itemId && `+1 ${nm(r.itemId)}`, r.hearts && '+♥'].filter(Boolean).join(' '), r.itemId || 'coin', 3600)
  emit(); return r
}

// ---------- food buffs ----------
export const buffFor = (itemId) => Bf.FOOD[itemId] ? Bf.FOOD[itemId][0] : null
export function eatFood(itemId) {
  if (count(itemId) < 1 || !Bf.FOOD[itemId]) return null
  const id = Bf.eat(S().buffs, itemId, now()); take(itemId, 1); const b = S().buffs.find(x => x.id === id); b.src = itemId
  window.__sbAct && window.__sbAct('feed'); toast(`Yum, ${nm(itemId)}! You feel ${Bf.BUFFS[id].name.toLowerCase()}: ${Bf.BUFFS[id].desc}.`, itemId, 3600); applyBuffs(); emit(); return id
}
export const activeBuffs = () => Bf.active(S().buffs, now()).map(b => ({ ...b, ...Bf.BUFFS[b.id], left: Math.max(0, Math.round(b.endsAt - now())) }))
let lastSig = ''
function applyBuffs() {
  const t = now(), P = window.__player; Bf.prune(S().buffs, t)
  if (P) P.spd = Bf.has(S().buffs, 'swift', t) ? Bf.BUFFS.swift.speed : 1
  const sig = S().buffs.map(b => b.id + Math.ceil((b.endsAt - t) / 10)).join(); if (sig !== lastSig) { lastSig = sig; emit() } // chip minutes tick
}
// lucky: World calls G.onGather(item) after a pickup
G.onGather = (item) => { if (Bf.has(S().buffs, 'lucky', now()) && Math.random() < Bf.BUFFS.lucky.bonus) setTimeout(() => { add(item, 1, true); toast(`Lucky! An extra ${nm(item)}.`, item) }, 300) }

// ---------- settings ----------
export function applySettings(next) {
  const s = S().settings = { ...S().settings, ...(next || {}) }
  document.documentElement.style.setProperty('--tpts', String(s.textScale || 1))
  try { localStorage.setItem('tp-audio', JSON.stringify({ volume: s.volume, music: s.music, sfx: s.sfx ?? 0.8, muted: s.muted })) } catch (e) {} // read by src/audio when it starts
  if (window.__tpAudio) import('../audio/ambient.js').then(m => { const A = m.startAudio(); A.setVolume(s.volume); A.setMusic(s.music); A.setSfx && A.setSfx(s.sfx ?? 0.8); A.mute(!!s.muted) })
  if (next) emit()
  return s
}

// ---------- boot ----------
export function init() {
  catchUp(S().day, true)
  if (!S().garden.starter) { S().garden.starter = true; S().inv.seedpack = count('seedpack') + 2 } // two packets to start the garden
  DAY_HOOKS.push((d) => catchUp(d, false))
  applySettings(); applyBuffs(); setInterval(applyBuffs, 2000)
  emit()
}
// debug / smoke tests: the next morning without sleeping (same hooks as a real new day)
export const nextDay = () => newDay(S().day + 1)
export function openGift(npcId) { G.ui.gift = npcId; G.ui.panel = 'gift'; emit() }
export const SB = { now, nextDay, openGift, setPlots, plotPrompt, plantAt, waterAt, harvestAt, friend, giftable, prefsSeen, giveGift, acceptErrand, deliverErrand, eatFood, buffFor, activeBuffs, applySettings, catchUp, G, Gd, Fr, Er, Bf }
window.__sb = SB
init()
