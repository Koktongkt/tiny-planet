// Stage C live wiring (lazy chunk, loaded by the game UI right after Stage B's live.js): seasons + weather hooks on
// window.__T, the train schedule + rides, fishing species rolls + catch log, journal + museum + ruins dig spots, photo
// mode (free camera, capture, album), and the first-day tutorial. Rules live in the pure modules next to this file
// (unit-tested); this file applies them to the game state. Debug/tests: window.__sc.
import * as THREE from 'three'
import { G, emit, toast, add, take, count, DAY_HOOKS } from '../game/store.js'
import { ITEMS } from '../game/items.js'
import { fishName } from '../game/itemsC.js'
import * as W from './weather.js'
import * as F from './fish.js'
import * as Tr from './train.js'
import * as C from './collection.js'
import * as Tu from './tutorial.js'
import * as Ph from './photo.js'
import { WEATHER, periodAt, TALK } from '../talk/state.js'
import { TRAIN, TRAIN_STOPS } from '../world/village.js'
import { T, CAMX } from '../common.jsx'
import { CAM } from '../touch.jsx'
import { wind, R, TRAIN_LAT, dir, height } from '../world.js'
import { SB } from './live.js'
const S = () => G.s
const rotA = () => (window.__rot ? window.__rot.a : 0.4)
const nm = (id) => (ITEMS[id] && ITEMS[id].name) || id

// ---------- seasons + weather (10 Hz) ----------
WEATHER.rain = W.isRainDay; WEATHER.day = -1
const tickWeather = () => { W.applyTo(T, rotA()) }
tickWeather()

// ---------- train ----------
export const SCH = Tr.buildSchedule(TRAIN_STOPS), TS = { lon: 0, stop: null }
TRAIN.fn = (t) => Tr.trainState(SCH, t + SC.toff, TS).lon // toff: test / debug time shift
export const STOP_NAME = { village: 'Lakeside (village)', forest: 'Forest Edge (ruins)' }
// platform: a step north of the rails (toward the lake / ruins paths)
export const platformN = (id) => { const s = TRAIN_STOPS.find(x => x.id === id); return dir(TRAIN_LAT + 0.3 / R, s.lon) }
export const RIDE = { riding: false, from: null, to: null, progress: 0, car: 3, seat: 0.09 }
window.__scRide = RIDE
const nextArrival = (id) => { const t = wind.time.value + SC.toff; for (let k = 0; k < SCH.period; k += 0.5) { if (Tr.trainState(SCH, t + k, _ns).stop === id) return k } return SCH.period }
const _ns = {}
export function stationPrompt(id) {
  const here = TS.stop === id && !RIDE.riding, to = TRAIN_STOPS.find(s => s.id !== id).id
  if (!here) { const k = Math.ceil(nextArrival(id)); return { icon: 'unknown', verb: 'Station:', name: `${STOP_NAME[id]} — next train in ${k > 60 ? Math.floor(k / 60) + 'm ' + (k % 60) + 's' : k + 's'}`, act: () => toast(`Next train in about ${k} s. Wait on the platform.`, 'unknown'), ready: false } }
  const f = Tr.fare(S().train.rides, count('coin'))
  return { icon: 'coin', verb: 'Board the train to', name: `${STOP_NAME[to]} (${f.cost ? '1 coin' : 'first ride free'})`, act: () => board(id), ready: true }
}
export function board(id) {
  if (RIDE.riding || TS.stop !== id) return false
  const f = Tr.fare(S().train.rides, count('coin'))
  if (!f.ok) { toast('A ride costs 1 coin. Errands on the village board pay in coins.', 'coin', 3400); return false }
  if (f.cost) take('coin', f.cost)
  S().train.rides++; Object.assign(RIDE, { riding: true, from: id, to: TRAIN_STOPS.find(s => s.id !== id).id, progress: 0 })
  G.ui.lock = 'ride'; const P = window.__player; if (P) P.target = null
  CAMX.pin = pinRide; toast(f.cost ? 'All aboard! (1 coin)' : 'All aboard! Your first ride is on the house.', 'coin', 3000); emit(); return true
}
const _f = new THREE.Vector3(), _u = new THREE.Vector3()
function pinRide(obj) {
  const P = window.__player, car = TRAIN.cars && TRAIN.cars[RIDE.car]; if (!P || !car) return
  _u.copy(car.position).normalize(); P.n.copy(_u); P.h = 0; P.target = null
  _f.set(0, 0, 1).applyQuaternion(car.quaternion); P.fwd.copy(_f); P.face && P.face.copy(_f)
  obj.position.copy(car.position).addScaledVector(_u, RIDE.seat); obj.quaternion.copy(car.quaternion)
  RIDE.progress = TS.stop ? (TS.stop === RIDE.to ? 1 : 0) : TS.progress
  if (TS.stop === RIDE.to) alight()
}
export function alight() {
  const P = window.__player; CAMX.pin = null; G.ui.lock = null
  if (P) { P.n.copy(platformN(RIDE.to)); P.h = 0; P.target = null }
  toast(`${STOP_NAME[RIDE.to]}. Mind the step!`, 'leaf', 3000); Object.assign(RIDE, { riding: false, from: null, to: null, progress: 0 }); emit()
}

// ---------- fishing ----------
export const ctxNow = () => ({ season: T.season || W.seasonOf(S().day), period: periodAt(rotA()), kind: T.kind || 'clear', lucky: SB.Bf.has(S().buffs, 'lucky', SB.now()) })
// spot ids are `${item}-${zone}-${k}`
export const rollFor = (spotId) => F.rollFish(F.habitatOf(String(spotId || '').split('-')[1]), ctxNow())
export function onCatch(r) {
  const s = S(), res = F.recordCatch(s.fish, r.fishId, r.size, s.day)
  if (F.RARE_ITEMS.includes(r.fishId)) setTimeout(() => add(r.fishId, 1, true), 500)
  const tag = res.isNew ? ' — new to your journal!' : res.isRecord ? ' — a new record!' : ''
  setTimeout(() => toast(`${fishName(r.fishId)}, ${r.size} cm${tag}`, F.RARE_ITEMS.includes(r.fishId) ? r.fishId : 'fish', 3600), 900)
  window.__scCatch && window.__scCatch({ ...r, ...res }); emit(); return res
}

// ---------- journal + museum + dig ----------
const g0 = G.onGather
G.onGather = (item) => { g0 && g0(item); if (C.note(S().journal, item, S().day)) toast(`${nm(item)} — added to your journal.`, item); tut('gather') }
export const journal = (tab) => tab === 'photos' ? S().photos.list.map(p => ({ ...p, src: photoStore()[p.id] })) : C.entries(tab, S())
export const donatable = () => C.DONATABLE.filter(id => C.canDonate(S().museum, id, S().inv))
export function donate(id) {
  if (!C.donate(S().museum, id, S().inv, S().day)) return false
  SB.Fr.addHearts(S().friends, C.HOSHINO, 0.5); toast(`Professor Hoshino: "Splendid! The ${nm(id)} goes on display."`, id, 3600); emit(); return true
}
export function digAt(spot) {
  const f = C.dig(S().dig, spot, S().day); if (!f) { toast('Already dug here today.', 'leaf'); return null }
  add(f, 1, true); C.note(S().journal, f, S().day); toast(`You dug up ${ITEMS[f] ? nm(f) : f}!`, f, 3200); emit(); return f
}

// ---------- photo mode ----------
export const PH = { on: false, yaw: 0, pitch: 0.35, dist: 2.4, lift: 0.3, filter: 'none', pending: null, n: 0 }
export const FILTER_CSS = { none: '', sunny: 'saturate(1.25) brightness(1.06)', sepia: 'sepia(.6) contrast(1.05)', ink: 'grayscale(1) contrast(1.3)', pastel: 'saturate(.7) brightness(1.1) contrast(.9)', twilight: 'hue-rotate(-18deg) saturate(1.2) brightness(.92)', film: 'contrast(1.1) saturate(.85) sepia(.15)' }
const _t = new THREE.Vector3(), _s = new THREE.Vector3(), _o = new THREE.Vector3()
function photoCam(camera) {
  const P = window.__player; if (!P) return false
  if (CAM.yaw) { PH.yaw += CAM.yaw; CAM.yaw = 0 }
  PH.pitch = Math.min(1.35, Math.max(-0.15, PH.pitch)); PH.dist = Math.min(6, Math.max(0.6, PH.dist))
  _t.copy(P.wPos).addScaledVector(P.wUp, PH.lift)
  _s.crossVectors(P.wUp, P.wFwd).normalize()
  _o.copy(P.wFwd).multiplyScalar(-Math.cos(PH.yaw)).addScaledVector(_s, Math.sin(PH.yaw)).multiplyScalar(Math.cos(PH.pitch)).addScaledVector(P.wUp, Math.sin(PH.pitch))
  camera.position.copy(_t).addScaledVector(_o, PH.dist)
  if (camera.position.length() < R + 0.25) camera.position.setLength(R + 0.25) // never under the ground
  camera.up.copy(P.wUp); camera.lookAt(_t); return true
}
const keyPH = (e) => {
  if (!PH.on) return; const k = e.code
  if (k === 'Escape' || k === 'KeyP') { e.preventDefault(); photo(false); return }
  const a = 0.12; if (k === 'ArrowLeft' || k === 'KeyA') PH.yaw -= a; else if (k === 'ArrowRight' || k === 'KeyD') PH.yaw += a
  else if (k === 'ArrowUp' || k === 'KeyW') PH.pitch += a * 0.6; else if (k === 'ArrowDown' || k === 'KeyS') PH.pitch -= a * 0.6
  else if (k === 'KeyQ') PH.dist *= 0.9; else if (k === 'KeyE') PH.dist *= 1.1; else if (k === 'KeyR') PH.lift = Math.min(1.2, PH.lift + 0.08); else if (k === 'KeyF') PH.lift = Math.max(0.05, PH.lift - 0.08)
  else if (k === 'Space' || k === 'Enter') { e.preventDefault(); shutter() } else return
  e.stopPropagation()
}
const wheelPH = (e) => { if (PH.on) PH.dist *= e.deltaY > 0 ? 1.08 : 0.93 }
export function photo(on = !PH.on) {
  if (on === PH.on) return; if (on && (G.ui.panel || G.ui.fish || G.ui.lock)) return
  PH.on = on; document.documentElement.classList.toggle('tp-photo', on)
  if (on) { PH.yaw = 0.5; PH.pitch = 0.35; PH.dist = 2.4 * (CAM.zoom || 1); G.ui.lock = 'photo'; CAMX.f = photoCam; addEventListener('keydown', keyPH, true); addEventListener('wheel', wheelPH, { passive: true }) }
  else { G.ui.lock = null; CAMX.f = null; removeEventListener('keydown', keyPH, true); removeEventListener('wheel', wheelPH) }
  emit()
}
// one rendered frame -> 2D canvas, read in the same task as the render (WorldC useFrame after the composer); no preserveDrawingBuffer
export function capture(filter = PH.filter) { return new Promise((res) => { PH.pending = { res, css: FILTER_CSS[filter] || '' } }) }
let ALBUM = null
const photoStore = () => { if (!ALBUM) { try { ALBUM = JSON.parse(localStorage.getItem(Ph.KEY) || '{}') || {} } catch (e) { ALBUM = {} } Ph.reconcile(S().photos.list, ALBUM) } return ALBUM }
const saveAlbum = () => { try { localStorage.setItem(Ph.KEY, JSON.stringify(ALBUM)); return true } catch (e) { return false } }
export async function shutter({ download = true } = {}) {
  const cv = await capture(), [w, h] = Ph.thumbSize(cv.width, cv.height), th = document.createElement('canvas'); th.width = w; th.height = h
  th.getContext('2d').drawImage(cv, 0, 0, w, h)
  const meta = { id: 'ph' + Date.now().toString(36), day: S().day, filter: PH.filter, w: cv.width, h: cv.height }, url = th.toDataURL('image/jpeg', Ph.THUMB_Q)
  photoStore(); Ph.addPhoto(S().photos.list, ALBUM, meta, url)
  if (!saveAlbum()) { Ph.removePhoto(S().photos.list, ALBUM, meta.id); toast('No room left to keep the photo in your journal.', 'unknown') }
  PH.n++
  if (download) cv.toBlob((b) => { if (!b) return; const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = Ph.fileName(S().day, PH.n); a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000) }, 'image/png')
  window.__scFlash && window.__scFlash(); emit(); return { meta, thumbBytes: url.length, w: cv.width, h: cv.height }
}

// ---------- tutorial ----------
export const TUT = { open: false }
function tut(id) { if (Tu.mark(S().tutorial, id)) { emit(); if (Tu.allDone(S().tutorial) && TUT.open) setTimeout(() => toast('That\'s everything! The planet is yours.', 'leaf', 3200), 600) } }
export const tutorialSteps = () => Tu.steps(S().tutorial)
export const tutorialVisible = () => Tu.visible(S().tutorial, S().day, TUT.reopened)
export function tutorial(open) { if (open) { TUT.reopened = true } else { TUT.reopened = false; S().tutorial.dismissed = true } emit() }
let n0 = null, c0 = S().crafted
function tickTutorial() {
  const P = window.__player, t = S().tutorial
  if (P && !t.done.move) { if (!n0) n0 = P.n.clone(); else if (n0.distanceTo(P.n) > 0.04) tut('move') }
  if (!t.done.craft && S().crafted > c0) tut('craft')
  if (!t.done.talk && TALK.open) tut('talk')
  if (!t.done.garden && S().garden.plots.some(p => p.cropId)) tut('garden')
}
const lookOnce = () => tut('look')
addEventListener('wheel', lookOnce, { passive: true, once: true })
addEventListener('pointermove', (e) => { if (e.buttons && !S().tutorial.done.look && Math.abs(e.movementX) + Math.abs(e.movementY) > 6) lookOnce() }, { passive: true })
DAY_HOOKS.push(() => tut('sleep'))

// ---------- boot ----------
setInterval(tickWeather, 100); setInterval(tickTutorial, 500)
export const SC = { toff: 0, t: () => wind.time.value, W, F, Tr, C, Tu, Ph, SCH, TS, RIDE, PH, TUT, ctxNow, rollFor, onCatch, journal, donatable, donate, digAt, stationPrompt, board, alight, platformN, photo, capture, shutter, tutorial, tutorialSteps, tutorialVisible, FILTER_CSS, height }
window.__sc = SC
emit()
