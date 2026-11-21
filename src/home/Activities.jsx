// round7: her home life. Activities at the house (E / touch Action), each with a pose for her, a short toast and a
// little particle flourish: sleep in bed (till morning or a nap, with a fade, on the day clock), cook at the stove
// (Food recipes from the crafting system, using what she gathered), a soak in the tub (steam), make tea
// (kettle + teapot + cup), read in the armchair, water the indoor plants (they perk up), feed Mochi (his bowl by the
// pet corner; Pip's bowl is outside by the porch, in Dog.jsx). The furniture itself is in interior.jsx; this chunk
// adds the plants, the bowls and everything that moves (pot lid, teapot, cup, book, quilt, bath water, particles).
// Lazy chunk: mounted inside the room group (room-local coordinates, scaled by ROOM.S).
import * as THREE from 'three'
import React, { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { HOME, ROOM } from './state.js'
import { O, Merge, GEO, tm, OUT, canvasTex } from './kit.jsx'
import { Box, W } from './interior.jsx'
import { SPOTS } from './interior.jsx'
import { Prop } from '../props/Prop.jsx'
import { T, q } from '../common.jsx'
import { G, emit, toast, newDay } from '../game/store.js'
import { haveFor, RECIPES, ITEMS, playFood, finishDish } from '../game/craft.js'
import { startAct, POSES } from '../act.js'
import { CAT } from '../pets/catState.js'

// ---------- layout (room-local) ----------
// everything comes from the prop layout in interior.jsx
const TUB = SPOTS.tub, STOOL = SPOTS.stool, TABLE = SPOTS.table, BED = SPOTS.bed, BOWL = SPOTS.bowl, COOK = SPOTS.cook
CAT.bowlPos = BOWL
const toward = (x, z, d) => { const r = Math.hypot(x, z) || 1; return [x - x / r * d, z - z / r * d] } // a point d closer to the room's centre
const STOOL_DIR = [Math.sin(STOOL.face), Math.cos(STOOL.face)], READ_STAND = [STOOL.x - STOOL_DIR[0] * 0.2, STOOL.z - STOOL_DIR[1] * 0.2]
const BED_SIDE = (() => { const [hx, hz] = BED.head; let px = -hz, pz = hx; if (px * -BED.x + pz * -BED.z < 0) { px = -px; pz = -pz } return [px, pz] })()
const BED_STAND = [BED.x - BED.head[0] * 0.5 + BED_SIDE[0] * 0.12, BED.z - BED.head[1] * 0.5 + BED_SIDE[1] * 0.12], BED_HEAD = [BED.x + BED.head[0] * 0.24, BED.z + BED.head[1] * 0.24] // stand by the foot of the bed
const BATH_STAND = SPOTS.bath.stand, FEED_STAND = toward(BOWL.x, BOWL.z, 0.25)
const plant = (id, prop, pl, y, d, lim, cam) => ({ id, prop, x: pl.x, z: pl.z, y, yaw: pl.yaw || 0, s: 1, stand: toward(pl.x, pl.z, d), lim, cam })
const PLANTS = [
  plant('big', 'bigPlant', SPOTS.plants.big, 0, 0.32, 0.26),
  plant('kitchen', 'plant', SPOTS.plants.counter, SPOTS.plants.counter.y, 0.4, 0.22),
  plant('door', 'flowerPot', SPOTS.plants.door, 0, 0.26, 0.22),
]

// ---------- her poses for the activities (called from her rig: B bones, mix eases toward a target by w) ----------
const seat = (B, mix, w, drop) => { B.root.position.y -= drop * w; for (const k of ['L', 'R']) { mix(B['th' + k], 'x', -1.5); mix(B['th' + k], 'z', 0); mix(B['sh' + k + 'n'], 'x', 1.45); mix(B['ft' + k], 'x', 0.05) } }
Object.assign(POSES, {
  sleep(B, mix, st, t, w) { const br = Math.sin(t * 1.6) * 0.03; mix(B.head, 'z', 0.28); mix(B.head, 'x', -0.1); mix(B.chest, 'x', br)
    for (const [k, sd] of [['L', -1], ['R', 1]]) { mix(B['up' + k], 'z', sd * 0.12); mix(B['up' + k], 'x', -0.35); mix(B['fo' + k], 'x', -1.3); mix(B['th' + k], 'x', -0.12); mix(B['sh' + k + 'n'], 'x', 0.2) } },
  bath(B, mix, st, t, w) { seat(B, mix, w, 0.05); mix(B.head, 'x', -0.22 + Math.sin(t * 0.7) * 0.04); mix(B.head, 'z', 0.12); mix(B.chest, 'x', -0.12)
    for (const [k, sd] of [['L', -1], ['R', 1]]) { mix(B['up' + k], 'z', sd * -1.15); mix(B['up' + k], 'x', -0.2); mix(B['fo' + k], 'x', -0.5) } },
  read(B, mix, st, t, w) { seat(B, mix, w, 0.035); const flip = Math.max(0, Math.sin(t * 0.9) - 0.85) * 6
    mix(B.head, 'x', 0.38 + Math.sin(t * 0.5) * 0.03); mix(B.chest, 'x', 0.1)
    mix(B.upL, 'x', -0.75); mix(B.upL, 'z', -0.32); mix(B.foL, 'x', -1.25); mix(B.upR, 'x', -0.75 - flip * 0.2); mix(B.upR, 'z', 0.32 - flip * 0.3); mix(B.foR, 'x', -1.25 - flip * 0.2) },
  cook(B, mix, st, t, w) { const a = t * 5.5; mix(B.chest, 'x', 0.2); mix(B.head, 'x', 0.35); mix(B.root, 'x', 0.06)
    mix(B.upR, 'x', -1.05 + Math.sin(a) * 0.18); mix(B.upR, 'z', 0.12 + Math.cos(a) * 0.15); mix(B.foR, 'x', -0.85 + Math.cos(a) * 0.12)
    mix(B.upL, 'x', -0.85); mix(B.upL, 'z', -0.25); mix(B.foL, 'x', -1.0) },
  tea(B, mix, st, t, w) { const k = st.actT || 0, pour = k < 1.8, sip = k >= 2.2
    mix(B.chest, 'x', pour ? 0.22 : 0.02); mix(B.head, 'x', pour ? 0.35 : sip ? -0.08 : 0.15)
    if (pour) { mix(B.upR, 'x', -1.0); mix(B.upR, 'z', 0.25); mix(B.foR, 'x', -0.6 - Math.min(1, k / 0.6) * 0.3); mix(B.upL, 'x', -0.7); mix(B.foL, 'x', -0.8) }
    else { const up = sip ? 1 : (k - 1.8) / 0.4; mix(B.upR, 'x', -0.6 - 0.75 * up); mix(B.upR, 'z', 0.18); mix(B.foR, 'x', -1.2 - 0.85 * up); mix(B.upL, 'x', -0.55 - 0.6 * up); mix(B.upL, 'z', -0.1); mix(B.foL, 'x', -1.5 - 0.5 * up) } },
  feed(B, mix, st, t, w) { const at = st.actT || 0, shake = Math.sin(at * 16) * 0.08 * Math.min(1, at / 0.3)
    B.root.position.y -= 0.07 * w; mix(B.root, 'x', 0.3); mix(B.chest, 'x', 0.4); mix(B.head, 'x', 0.4)
    for (const k of ['L', 'R']) { mix(B['th' + k], 'x', k === 'L' ? -1.25 : -0.55); mix(B['sh' + k + 'n'], 'x', k === 'L' ? 1.55 : 1.05); mix(B['ft' + k], 'x', -0.25) }
    mix(B.upR, 'x', -1.2 + shake); mix(B.upR, 'z', 0.15); mix(B.foR, 'x', -0.6); mix(B.upL, 'x', -1.1); mix(B.upL, 'z', -0.15); mix(B.foL, 'x', -0.7) },
})

// ---------- particles: soft steam, gold sparkles, sleepy z's (one Points call each, room-local) ----------
const sprite = (draw) => canvasTex(64, 64, (x) => { x.clearRect(0, 0, 64, 64); draw(x) })
const TEX = {}
const PVS = `attribute float aS; attribute float aA; varying float vA; uniform float uScale; void main(){ vec4 mv = modelViewMatrix*vec4(position,1.); gl_PointSize = aS*uScale/max(0.05,-mv.z); vA = aA; gl_Position = projectionMatrix*mv; }`
const PFS = `uniform sampler2D map; uniform vec3 uCol; varying float vA; void main(){ vec4 t = texture2D(map, gl_PointCoord); if (t.a*vA < 0.01) discard; gl_FragColor = vec4(uCol*t.rgb, t.a*vA); }`
class Emitter {
  constructor(n, tex, col, o = {}) {
    this.n = n; this.o = o; this.p = new Float32Array(n * 3); this.v = new Float32Array(n * 3); this.s = new Float32Array(n); this.a = new Float32Array(n); this.t = new Float32Array(n).fill(1); this.life = new Float32Array(n).fill(1); this.s0 = new Float32Array(n)
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(this.p, 3)); g.setAttribute('aS', new THREE.BufferAttribute(this.s, 1)); g.setAttribute('aA', new THREE.BufferAttribute(this.a, 1)); g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 4)
    this.m = new THREE.ShaderMaterial({ uniforms: { map: { value: tex }, uCol: { value: new THREE.Color(col) }, uScale: { value: 400 } }, vertexShader: PVS, fragmentShader: PFS, transparent: true, depthWrite: false, toneMapped: false })
    this.obj = new THREE.Points(g, this.m); this.obj.frustumCulled = false; this.obj.renderOrder = 4; this.g = g
  }
  emit(x, y, z, k = 1, o = {}) { for (let i = 0, j = 0; i < this.n && j < k; i++) { if (this.t[i] < 1) continue; j++; const sp = o.spread ?? 0.03
    this.p.set([x + (Math.random() - 0.5) * sp, y + (Math.random() - 0.5) * sp * 0.4, z + (Math.random() - 0.5) * sp], i * 3)
    this.v.set([(Math.random() - 0.5) * (o.vx ?? 0.04), (o.up ?? 0.12) * (0.7 + Math.random() * 0.6), (Math.random() - 0.5) * (o.vx ?? 0.04)], i * 3)
    this.t[i] = 0; this.life[i] = (o.life ?? 1.6) * (0.75 + Math.random() * 0.5); this.s0[i] = (o.size ?? 0.05) * (0.7 + Math.random() * 0.6) } }
  tick(dt, scale) { this.m.uniforms.uScale.value = scale; const g = this.o.grav ?? 0
    for (let i = 0; i < this.n; i++) { if (this.t[i] >= 1) { this.a[i] = 0; continue } this.t[i] += dt / this.life[i]; const k = this.t[i]
      this.v[i * 3 + 1] -= g * dt; for (let c = 0; c < 3; c++) this.p[i * 3 + c] += this.v[i * 3 + c] * dt
      this.v[i * 3] += Math.sin(k * 9 + i) * 0.02 * dt
      this.s[i] = this.s0[i] * (this.o.grow ? 0.5 + k * 1.3 : Math.min(1, k * 6) * (1 - 0.4 * k)); this.a[i] = Math.min(1, k * 5) * (1 - k) * (this.o.alpha ?? 1) }
    this.g.attributes.position.needsUpdate = this.g.attributes.aS.needsUpdate = this.g.attributes.aA.needsUpdate = true }
}
function mkFx() {
  TEX.steam = TEX.steam || sprite(x => { const g = x.createRadialGradient(32, 32, 2, 32, 32, 30); g.addColorStop(0, 'rgba(255,255,255,.9)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64) })
  TEX.spark = TEX.spark || sprite(x => { x.translate(32, 32); x.fillStyle = '#fff'; x.beginPath(); for (let i = 0; i < 8; i++) { const r = i % 2 ? 7 : 28, a = i * Math.PI / 4; x.lineTo(Math.sin(a) * r, -Math.cos(a) * r) } x.closePath(); x.fill(); x.strokeStyle = 'rgba(122,82,54,.8)'; x.lineWidth = 3; x.stroke() })
  TEX.z = TEX.z || sprite(x => { x.font = '700 50px Fredoka, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineWidth = 7; x.strokeStyle = '#5a4636'; x.strokeText('z', 32, 34); x.fillStyle = '#fff'; x.fillText('z', 32, 34) })
  TEX.drop = TEX.drop || sprite(x => { x.fillStyle = '#fff'; x.beginPath(); x.moveTo(32, 6); x.bezierCurveTo(48, 28, 50, 44, 32, 56); x.bezierCurveTo(14, 44, 16, 28, 32, 6); x.fill() })
  return { steam: new Emitter(40, TEX.steam, '#ffffff', { grow: true, alpha: 0.55 }), spark: new Emitter(28, TEX.spark, '#ffe28a', { grav: 0.25 }), z: new Emitter(6, TEX.z, '#ffffff', {}), drop: new Emitter(24, TEX.drop, '#9fd6f0', { grav: 1.6 }) }
}
let FX = null

// ---------- the activity runner ----------
const wait = (ms) => new Promise(r => setTimeout(r, ms))
// same iris deadline as the house door: rAF paints, the timer finishes the fade if frames stall (sleep / nap)
function fadeTo(v, ms) { return new Promise(res => { const v0 = HOME.fade, t0 = performance.now(); let done = false; const step = () => { if (done) return; const k = Math.min(1, (performance.now() - t0) / ms); if (k < 1) { HOME.fade = v0 + (v - v0) * (k * k * (3 - 2 * k)); requestAnimationFrame(step); return } done = true; HOME.fade = v; res() }; setTimeout(step, ms); step() }) }
const A = { doing: null, dish: 0, watered: () => (G.s.watered = G.s.watered || {}) }
function placeAt(x, z, yaw) { Object.assign(HOME.hp, { x, z, yaw, target: null }) }
function pose(o) { HOME.pose = { k: 0, goal: 1, rate: 6, y: 0, tilt: 0, ...o } }
const unpose = () => { if (HOME.pose) HOME.pose.goal = 0 }
async function begin(kind, dur, sound) { if (HOME.busy || A.doing) return false; HOME.busy = true; A.doing = kind; A.t0 = performance.now(); startAct(kind, { dur, lock: dur, sound }); return true }
function end() { unpose(); HOME.busy = false; A.doing = null }
const morningA = (a) => { const P2 = Math.PI * 2; let k = Math.ceil((a + 1.2 + 0.4) / P2); return k * P2 - 1.2 }
function skipTime(toMorning) { const rot = window.__rot; if (!rot) return; const a0 = rot.a, a1 = toMorning ? morningA(a0) : a0 + 2 / 24 * Math.PI * 2; rot.a = a1; T.h += (a1 - a0) / (Math.PI * 2) * 24; newDay(Math.max(0, Math.floor((a1 + Math.PI / 2) / (Math.PI * 2)))) }
async function sleep(full) {
  const dur = full ? 6.2 : 5.2; if (!await begin('sleep', dur, 'sleep')) return
  const [hx, hz] = BED.head; placeAt(BED_STAND[0], BED_STAND[1], Math.atan2(BED.head[0], BED.head[1]))
  pose({ x: BED.x - hx * 0.15, z: BED.z - hz * 0.15, y: BED.top + 0.03, yaw: Math.atan2(-hx, -hz), tilt: -Math.PI / 2, rate: 3 })
  if (CAT.state !== 'petted' && !CAT.hop) Object.assign(CAT, { state: 'nap', t: 0, dur: 20, where: 'bed', target: null, forced: false }) // he joins her
  await wait(900); await fadeTo(1, 900); skipTime(full); await wait(full ? 700 : 300)
  await fadeTo(0, 900); toast(full ? `Good morning! Day ${G.s.day + 1} — the light is soft through the window.` : 'A short, cosy nap. You wake up rested.', full ? 'sun' : 'moon', 3400)
  await wait(1500); end()
}
const FOODS = () => RECIPES.filter(r => r.cat === 'Food' && r.id !== 'teacup')
const dish = () => FOODS()[A.dish % FOODS().length]
const need = (r) => haveFor(r).filter(h => !h.ok).map(({ need: [id, n], have: h }) => `${n - h} ${typeof id === 'string' ? ITEMS[id].name : 'Herbs or Tea'}`).join(', ')
async function cook() {
  // pick the chosen dish, or the first one she has the ingredients for
  let r = dish(); if (!haveFor(r).every(h => h.ok)) { const ok = FOODS().find(x => haveFor(x).every(h => h.ok)); if (ok) r = ok }
  if (!haveFor(r).every(h => h.ok)) { toast(`To cook ${ITEMS[r.makes].name} you need ${need(r)}.`, r.makes, 3000); return }
  const auto = !!(G.s.settings && G.s.settings.autoCook)
  if (!await begin('cook', auto ? 0.9 : 4.2, 'cook')) return
  placeAt(COOK.stand[0], COOK.stand[1], COOK.yaw); pose({ x: COOK.stand[0], z: COOK.stand[1], yaw: COOK.yaw, rate: 5 }); A.pot = 1
  const result = await playFood(r)
  if (result) finishDish(r, result, { activity: 'cook' })
  FX && FX.spark.emit(COOK.x, COOK.y + 0.2, COOK.z, 10, { spread: 0.1, up: 0.35, size: 0.05, life: 1 })
  await wait(auto ? 200 : 600); A.pot = 0; end()
}
async function bath() {
  if (!await begin('bath', 7.4, 'bath')) return
  placeAt(BATH_STAND[0], BATH_STAND[1], Math.PI); await fadeTo(1, 380)
  pose({ x: TUB.x, z: TUB.z + 0.02, y: 0.03, yaw: -0.5, rate: 60, cam: { p: [0.55, 1.3, 0.35], l: [TUB.x, 0.14, TUB.z] } }); HOME.pose.k = 1; A.soak = 1
  await fadeTo(0, 420); toast('Ahh… a warm soak in the tub. ♨', 'water', 3200)
  await wait(5200); await fadeTo(1, 380); HOME.pose = null; A.soak = 0; toast('Warm and rosy-cheeked.', 'leaf', 2000)
  await fadeTo(0, 420); end()
}
async function tea() {
  if (!await begin('tea', 4.6, 'tea')) return
  placeAt(TABLE.x, TABLE.z - 0.32, 0); pose({ x: TABLE.x, z: TABLE.z - 0.31, yaw: 0, rate: 6 }); A.pour = 1
  const r = RECIPES.find(x => x.id === 'teacup'), herbal = r && haveFor(r).every(h => h.ok)
  if (!herbal) {
    await wait(1800); A.pour = 0; A.sip = 1
    toast('A cup of warm barley tea. The kettle sings softly.', 'teacup', 3000)
    await wait(2500); A.sip = 0; end()
    return
  }
  await wait(400); A.pour = 0
  const result = await playFood(r)
  A.sip = 1
  if (result) finishDish(r, result)
  await wait(500); A.sip = 0; end()
}
async function read() {
  if (!await begin('read', 6, 'read')) return
  placeAt(READ_STAND[0], READ_STAND[1], STOOL.face); pose({ x: STOOL.x - STOOL_DIR[0] * 0.01, z: STOOL.z - STOOL_DIR[1] * 0.01, y: STOOL.h - 0.075, yaw: STOOL.face, rate: 5 }); A.book = 1
  const T_ = ['"The Moving Castle" — you lose yourself for a few pages.', 'A field guide to mushrooms. You learn which ones glow.', 'An old book of sea stories. The harbour feels closer.', 'A cookbook: "rice, fish, a pinch of salt and patience."', 'Poems about the wind. Mochi pretends not to listen.']
  toast(T_[Math.floor(Math.random() * T_.length)], 'book', 3600)
  await wait(5600); A.book = 0; end()
}
async function water(pl) {
  if (!await begin('water', 2.6, 'water')) return
  const [sx, sz] = pl.stand; placeAt(sx, sz, Math.atan2(pl.x - sx, pl.z - sz)); pose({ x: sx, z: sz, yaw: Math.atan2(pl.x - sx, pl.z - sz), rate: 8, cam: pl.cam })
  const first = A.watered()[pl.id] !== G.s.day; A.watered()[pl.id] = G.s.day; pl.perkT = performance.now(); emit()
  for (let i = 0; i < 6; i++) setTimeout(() => FX && FX.drop.emit(pl.x, pl.y + 0.3 * pl.s, pl.z, 3, { spread: 0.06, up: 0.05, size: 0.022, life: 0.6 }), 250 + i * 160)
  setTimeout(() => FX && FX.spark.emit(pl.x, pl.y + 0.25 * pl.s, pl.z, 6, { spread: 0.12, up: 0.25, size: 0.04, life: 1 }), 1100)
  toast(first ? 'The leaves lift and brighten — thank you, they seem to say.' : 'Still happy from earlier. A little sip anyway.', 'can', 2600)
  await wait(2600); end()
}
async function feedCat() {
  if (CAT.bowl > 0) { toast(`${CAT.name}'s bowl is still full.`, 'fish', 2000); return }
  if (!await begin('feed', 1.3)) return
  const [fx0, fz0] = FEED_STAND; placeAt(fx0, fz0, Math.atan2(BOWL.x - fx0, BOWL.z - fz0)); pose({ x: fx0, z: fz0, yaw: Math.atan2(BOWL.x - fx0, BOWL.z - fz0), rate: 8 })
  setTimeout(() => { CAT.bowl = 1; FX && FX.spark.emit(BOWL.x, 0.08, BOWL.z, 5, { spread: 0.06, up: 0.2, size: 0.035, life: 0.8 }) }, 700)
  toast(`You fill ${CAT.name}'s bowl. He trots over, tail up.`, 'fish', 2600)
  await wait(1300); end()
}
if (typeof window !== 'undefined') window.__homeAct = { sleep: () => sleep(true), nap: () => sleep(false), cook, bath, tea, read, water: (i = 0) => water(PLANTS[i]), feed: feedCat, A }

// ---------- prompts ----------
if (!HOME.actHooked) { HOME.actHooked = true
  HOME.near.push((consider) => {
    if (!HOME.inside || HOME.busy || A.doing) return
    const hp = HOME.hp, d = (x, z) => Math.hypot(hp.x - x, hp.z - z)
    consider({ kind: 'ext', inside: true, id: 'bed', icon: 'moon', verb: 'Sleep', name: 'till morning', chip: true, alt: { verb: 'Nap', icon: 'sun', key: 'F', act: () => sleep(false) }, act: () => sleep(true) }, d(BED_STAND[0], BED_STAND[1]), 0.26)
    const r = dish(); consider({ kind: 'ext', inside: true, id: 'stove' + r.id, icon: r.makes, verb: 'Cook', name: ITEMS[r.makes].name, chip: true, alt: { verb: 'Other dish', icon: 'rotate', key: 'F', act: () => { A.dish++; emit() } }, act: cook }, d(COOK.stand[0], COOK.stand[1]), 0.22)
    consider({ kind: 'ext', inside: true, id: 'tub', icon: 'water', verb: 'Take', name: 'a bath', act: bath }, d(BATH_STAND[0], BATH_STAND[1]), 0.3)
    consider({ kind: 'ext', inside: true, id: 'tea', icon: 'teacup', verb: 'Make', name: 'tea', act: tea }, d(TABLE.x, TABLE.z - 0.32), 0.2)
    consider({ kind: 'ext', inside: true, id: 'read', icon: 'book', verb: 'Read', name: 'a book', act: read }, d(READ_STAND[0], READ_STAND[1]), 0.22)
    for (const pl of PLANTS) consider({ kind: 'ext', inside: true, id: 'plant-' + pl.id, icon: 'can', verb: 'Water', name: A.watered()[pl.id] === G.s.day ? 'the happy plant' : 'the thirsty plant', act: () => water(pl) }, d(pl.stand[0], pl.stand[1]), pl.lim)
    consider({ kind: 'ext', inside: true, id: 'feedcat', icon: 'fish', verb: 'Feed', name: CAT.name, act: feedCat }, d(FEED_STAND[0], FEED_STAND[1]), 0.22)
  })
}

// ---------- props ----------
// teapot (tilts to pour) + her cup (follows her hand when she sips), pot on the stove while cooking, cat-bowl kibble,
// a book in her hands, quilt over her in bed
const _w = new THREE.Vector3(), _l = new THREE.Vector3()
function Dynamic() {
  const pot = useRef(), cup = useRef(), stew = useRef(), kib = useRef(), book = useRef(), quilt = useRef(), water = useRef(), lid = useRef()
  const gl = useThree(s => s.gl), size = useThree(s => s.size), camera = useThree(s => s.camera)
  const fx = useMemo(() => (FX = mkFx()), [])
  const grp = useRef()
  const toRoom = (obj, x, y, z, out) => { out.set(x, y, z); obj.localToWorld(out); return HOME.roomObj.worldToLocal(out) }
  useFrame((_, dt) => {
    dt = Math.min(dt, 0.05); const now = performance.now() / 1000, ps = HOME.pose
    if (ps) { ps.k += ((ps.goal) - ps.k) * Math.min(1, dt * ps.rate); if (ps.goal === 0 && ps.k < 0.01) HOME.pose = null }
    const scale = size.height * gl.getPixelRatio() / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2)); for (const k in fx) fx[k].tick(dt, scale)
    if (!HOME.inside) return
    // steam: always a wisp from the tub, lots while she soaks; the kettle / pot while cooking or making tea
    if (Math.random() < dt * (A.soak ? 14 : 1.2)) fx.steam.emit(TUB.x + (Math.random() - 0.5) * 0.2, TUB.h, TUB.z + (Math.random() - 0.5) * 0.2, 1, { spread: 0.05, up: 0.09, size: A.soak ? 0.16 : 0.11, life: 2.4 })
    if (A.pot && Math.random() < dt * 10) fx.steam.emit(COOK.x, COOK.y + 0.13, COOK.z, 1, { spread: 0.04, up: 0.12, size: 0.09, life: 1.4 })
    if (A.pour && Math.random() < dt * 6) fx.steam.emit(TABLE.x + 0.08, TABLE.h + 0.05, TABLE.z - 0.04, 1, { spread: 0.02, up: 0.08, size: 0.05, life: 1.2 })
    if (A.doing === 'sleep' && Math.random() < dt * 1.3) fx.z.emit(BED_HEAD[0], 0.36, BED_HEAD[1], 1, { spread: 0.02, up: 0.07, vx: 0.05, size: 0.06, life: 2.2 })
    if (A.doing === 'read' && Math.random() < dt * 0.5) fx.spark.emit(STOOL.x, 0.42, STOOL.z, 1, { spread: 0.15, up: 0.05, size: 0.03, life: 1.6 })
    if (A.sip && Math.random() < dt * 5) { const o = HOME.playerObj; if (o) { toRoom(o, 0.02, 0.34, 0.07, _l); fx.steam.emit(_l.x, _l.y + 0.03, _l.z, 1, { spread: 0.01, up: 0.06, size: 0.04, life: 1 }) } }
    water.current.position.y = TUB.h - 0.03 + Math.sin(now * 1.3) * 0.004
    lid.current.position.y = A.pot ? 0.115 + Math.abs(Math.sin(now * 9)) * 0.008 : 0.082; lid.current.rotation.z = A.pot ? 0.35 : 0; lid.current.position.x = A.pot ? -0.03 : 0
    // teapot pours, then rests
    const pk = A.pour ? Math.min(1, (performance.now() - A.t0) / 500) : 0; pot.current.rotation.z = THREE.MathUtils.lerp(pot.current.rotation.z, -0.9 * pk, Math.min(1, dt * 6)); pot.current.position.y = TABLE.h + 0.04 * pk
    // cup: on the table, or in her hand while she sips
    const o = HOME.playerObj
    if (A.sip && o) { toRoom(o, 0.02, 0.3, 0.07, _l); cup.current.position.lerp(_l, Math.min(1, dt * 10)) } else cup.current.position.lerp(_l.set(TABLE.x + 0.08, TABLE.h, TABLE.z - 0.06), Math.min(1, dt * 8))
    book.current.visible = !!A.book && !!o; if (book.current.visible) { toRoom(o, 0, 0.2, 0.1, _l); book.current.position.copy(_l); book.current.rotation.set(-0.9, HOME.pose ? HOME.pose.yaw : 0, 0, 'YXZ') }
    stew.current.visible = !!A.pot; kib.current.visible = CAT.bowl > 0
    quilt.current.visible = A.doing === 'sleep' && (ps?.k ?? 0) > 0.5
    // plants: droop when thirsty (not watered today), perk up with a springy bounce
    for (const pl of PLANTS) { const g = pl.g; if (!g) continue; const happy = A.watered()[pl.id] === G.s.day ? 1 : 0; pl.h = (pl.h ?? happy) + (happy - (pl.h ?? happy)) * Math.min(1, dt * 2.5)
      const e = pl.perkT ? (performance.now() - pl.perkT) / 1000 : 9, bounce = e < 1.5 ? Math.sin(e * 9) * Math.exp(-e * 3) * 0.12 : 0
      g.scale.set(pl.s * (1.08 - 0.08 * pl.h - bounce * 0.5), pl.s * (0.78 + 0.22 * pl.h + bounce), pl.s * (1.08 - 0.08 * pl.h - bounce * 0.5)); g.rotation.z = (1 - pl.h) * 0.08
    }
  })
  return <group ref={grp}>
    {Object.values(fx).map((e, i) => <primitive key={i} object={e.obj} />)}
    <mesh ref={water} position={[TUB.x, 0.25, TUB.z]} rotation={[-Math.PI / 2, 0, 0]} material={WATER} scale={TUB.r - 0.01}><circleGeometry args={[1, 28]} /></mesh>
    <group ref={pot} position={[TABLE.x - 0.08, TABLE.h, TABLE.z + 0.06]}><O geo={GEO.sph} mat={tm('#8cc084')} position={[0, 0.04, 0]} scale={[0.045, 0.038, 0.045]} out={OUT.fine} /><O geo={GEO.cone} mat={tm('#8cc084')} position={[0.05, 0.05, 0]} scale={[0.012, 0.045, 0.012]} rotation={[0, 0, -1.0]} out={null} /><O geo={GEO.sph} mat={tm(W.dark)} position={[0, 0.08, 0]} scale={0.012} out={null} /><O geo={GEO.tor} mat={tm(W.dark)} position={[-0.045, 0.045, 0]} scale={[0.022, 0.022, 0.02]} out={null} /></group>
    <group ref={cup} position={[TABLE.x + 0.08, TABLE.h, TABLE.z - 0.06]}><O geo={GEO.cyl} mat={tm('#fffaf0')} position={[0, 0.018, 0]} scale={[0.017, 0.034, 0.017]} out={OUT.fine} /><mesh geometry={GEO.circ} material={tm('#c98a4a')} position={[0, 0.034, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={0.014} /></group>
    {/* the orange pot on the cooktop: the lid lifts and rattles while she cooks, and there's stew inside */}
    <group position={[COOK.x, COOK.y, COOK.z]}>
      <O geo={GEO.cyl} mat={tm(W.orange)} position={[0, 0.038, 0]} scale={[0.058, 0.076, 0.058]} out={OUT.fine} />
      {[-1, 1].map(s => <O key={s} geo={GEO.box} mat={tm('#d9722a')} position={[s * 0.066, 0.06, 0]} scale={[0.018, 0.012, 0.03]} out={null} />)}
      <group ref={lid} position={[0, 0.082, 0]}><O geo={GEO.half} mat={tm('#e0782c')} scale={[0.06, 0.022, 0.06]} out={OUT.fine} /><O geo={GEO.sph} mat={tm(W.dark)} position={[0, 0.026, 0]} scale={0.01} out={null} /></group>
      <group ref={stew} visible={false}><mesh geometry={GEO.circ} material={tm('#e8b84a')} position={[0, 0.07, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={0.052} /><O geo={GEO.cyl} mat={tm(W.wood)} position={[0.025, 0.11, 0]} rotation={[0, 0, -0.5]} scale={[0.005, 0.1, 0.005]} out={null} /></group>
    </group>
    <group ref={kib} position={[BOWL.x, 0.028, BOWL.z]} visible={false}>{[...Array(7)].map((_, i) => <mesh key={i} geometry={GEO.sphL} material={tm('#a8683a')} position={[Math.cos(i * 2.4) * 0.022 * (i % 3) / 2, 0.004 * (i % 2), Math.sin(i * 2.4) * 0.022 * (i % 3) / 2]} scale={0.012} />)}</group>
    <group ref={book} visible={false}><O geo={GEO.box} mat={tm('#5f8fc4')} scale={[0.1, 0.012, 0.075]} out={OUT.fine} /><mesh geometry={GEO.box} material={tm('#fffaf0')} position={[0, 0.008, 0]} scale={[0.094, 0.006, 0.068]} /></group>
    <group ref={quilt} visible={false}><O geo={GEO.pillow} mat={tm(W.quilt, 0)} position={[BED.x - 0.06, BED.top + 0.07, BED.z]} scale={[0.4, 0.06, 0.4]} out={OUT.fine} /></group>
  </group>
}
const WATER = new THREE.MeshToonMaterial({ color: '#9fd6e8', transparent: true, opacity: 0.85 })
// indoor plants: chibi props in a group that droops when thirsty and springs up when watered
function Plants() {
  return <>{PLANTS.map(pl => <group key={pl.id} position={[pl.x, pl.y, pl.z]} rotation-y={pl.yaw}><group ref={el => (pl.g = el)}><Prop id={pl.prop} /></group></group>)}</>
}
export default function Activities() {
  return <group>
    <Plants /><Dynamic />
  </group>
}
