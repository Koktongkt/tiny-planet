// round7: her home life. Activities at the house (E / touch Action), each with a pose for her, a short toast and a
// little particle flourish: sleep in bed (till morning or a nap, with a fade, on the day clock), cook at the stove
// (Food recipes from the crafting system, using what she gathered), a soak in the wooden ofuro (steam), make tea
// (kettle + teapot + cup), read in the armchair, water the indoor plants (they perk up), feed Mochi (his bowl by the
// kitchen; Pip's bowl is outside by the porch, in Dog.jsx). Plus the refined interior: bath nook, armchair, more
// books, rugs, hanging utensils, window plants, firewood. Static clutter is merged (one call per material).
// Lazy chunk: mounted inside the room group (room-local coordinates, scaled by ROOM.S).
import * as THREE from 'three'
import React, { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { HOME, ROOM, BLOCKS } from './state.js'
import { O, Merge, GEO, tm, OUT, canvasTex } from './kit.jsx'
import { Box, W } from './Room.jsx'
import { T, q } from '../common.jsx'
import { G, emit, toast, count, take, add, haveFor, newDay } from '../game/store.js'
import { RECIPES, ITEMS } from '../game/items.js'
import { startAct, POSES } from '../act.js'
import { CAT } from '../pets/catState.js'

// ---------- layout (room-local) ----------
const TUB = { x: -0.78, z: 0.66, r: 0.18, h: 0.3 }
const CHAIR = { x: 0.31, z: -0.68 }
const BOWL = { x: 0.9, z: 0.1 }
CAT.bowlPos = BOWL
const PLANTS = [
  { id: 'big', x: -1.18, z: 0.82, y: 0, s: 1.5, big: true, stand: [-1.06, 0.5], lim: 0.4 },
  { id: 'kitchen', x: 1.15, z: 0.68, y: 0.43, s: 0.55, stand: [0.84, 0.6], lim: 0.34 },
  { id: 'door', x: 0.55, z: -0.9, y: 0, s: 0.85, stand: [0.56, -0.64], lim: 0.26 },
]
if (!BLOCKS.some(b => b.id === 'tub')) BLOCKS.push(
  { id: 'tub', x0: TUB.x - TUB.r - 0.01, x1: TUB.x + TUB.r + 0.01, z0: TUB.z - TUB.r - 0.01, z1: TUB.z + TUB.r + 0.01, round: true },
  { id: 'chair', x0: CHAIR.x - 0.13, x1: CHAIR.x + 0.13, z0: CHAIR.z - 0.14, z1: CHAIR.z + 0.12 },
  { id: 'wood', x0: 1.02, x1: 1.3, z0: -0.55, z1: -0.36 },
)

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
function fadeTo(v, ms) { return new Promise(res => { const v0 = HOME.fade, t0 = performance.now(); const f = () => { const k = Math.min(1, (performance.now() - t0) / ms); HOME.fade = v0 + (v - v0) * (k * k * (3 - 2 * k)); if (k < 1) requestAnimationFrame(f); else res() }; f() }) }
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
  placeAt(-0.52, -0.5, -Math.PI / 2); pose({ x: -0.98, z: -0.3, y: 0.33, yaw: Math.PI, tilt: -Math.PI / 2, rate: 3 })
  if (CAT.state !== 'petted' && !CAT.hop) Object.assign(CAT, { state: 'nap', t: 0, dur: 20, where: 'bed', target: null, forced: false }) // he joins her
  await wait(900); await fadeTo(1, 900); skipTime(full); await wait(full ? 700 : 300)
  await fadeTo(0, 900); toast(full ? `Good morning! Day ${G.s.day + 1} — the light is soft through the window.` : 'A short, cosy nap. You wake up rested.', full ? 'sun' : 'moon', 3400)
  await wait(1500); end()
}
const FOODS = () => RECIPES.filter(r => r.cat === 'Food' && r.id !== 'teacup')
const dish = () => FOODS()[A.dish % FOODS().length]
const need = (r) => haveFor(r).filter(h => !h.ok).map(({ need: [id, n], have: h }) => `${n - h} ${typeof id === 'string' ? ITEMS[id].name : 'Herbs or Tea'}`).join(', ')
function use(r) { for (const [k, n] of r.needs) { if (typeof k === 'string') take(k, n); else { let left = n; for (const x of k.any) { const u = Math.min(left, count(x)); take(x, u); left -= u } } } }
async function cook() {
  // pick the chosen dish, or the first one she has the ingredients for
  let r = dish(); if (!haveFor(r).every(h => h.ok)) { const ok = FOODS().find(x => haveFor(x).every(h => h.ok)); if (ok) r = ok }
  if (!haveFor(r).every(h => h.ok)) { toast(`To cook ${ITEMS[r.makes].name} you need ${need(r)}.`, r.makes, 3000); return }
  if (!await begin('cook', 3.2, 'cook')) return
  placeAt(0.86, -0.66, Math.PI / 2); pose({ x: 0.9, z: -0.76, yaw: Math.PI / 2, rate: 5 }); A.pot = 1
  await wait(2600); use(r); add(r.makes, 1, true); toast(`✦ Cooked ${ITEMS[r.makes].name}! Into the bag it goes.`, r.makes); FX && FX.spark.emit(1.05, 0.62, -0.76, 10, { spread: 0.1, up: 0.35, size: 0.05, life: 1 }); emit()
  await wait(600); A.pot = 0; end()
}
async function bath() {
  if (!await begin('bath', 7.4, 'bath')) return
  placeAt(-0.48, 0.62, -Math.PI / 2); await fadeTo(1, 380)
  pose({ x: TUB.x, z: TUB.z, y: 0.04, yaw: 0, rate: 60 }); HOME.pose.k = 1; A.soak = 1
  await fadeTo(0, 420); toast('Ahh… a warm soak in the ofuro. ♨', 'water', 3200)
  await wait(5200); await fadeTo(1, 380); HOME.pose = null; A.soak = 0; toast('Warm and rosy-cheeked.', 'leaf', 2000)
  await fadeTo(0, 420); end()
}
async function tea() {
  if (!await begin('tea', 4.6, 'tea')) return
  placeAt(0.14, -0.17, 0); pose({ x: 0.14, z: -0.16, yaw: 0, rate: 6 }); A.pour = 1
  const r = RECIPES.find(x => x.id === 'teacup'), herbal = r && haveFor(r).every(h => h.ok)
  await wait(1800); A.pour = 0; A.sip = 1
  if (herbal) { use(r); add('teacup', 1, true) }
  toast(herbal ? 'You brew a pot of herbal tea and pour a cup for later too. ✦ +1 Herbal Tea' : 'A cup of warm barley tea. The kettle sings softly.', 'teacup', 3000)
  await wait(2500); A.sip = 0; end()
}
async function read() {
  if (!await begin('read', 6, 'read')) return
  placeAt(CHAIR.x, CHAIR.z + 0.24, Math.PI); pose({ x: CHAIR.x, z: CHAIR.z + 0.02, y: 0.13, yaw: 0, rate: 5 }); A.book = 1
  const T_ = ['"The Moving Castle" — you lose yourself for a few pages.', 'A field guide to mushrooms. You learn which ones glow.', 'An old book of sea stories. The harbour feels closer.', 'A cookbook: "rice, fish, a pinch of salt and patience."', 'Poems about the wind. Mochi pretends not to listen.']
  toast(T_[Math.floor(Math.random() * T_.length)], 'book', 3600)
  await wait(5600); A.book = 0; end()
}
async function water(pl) {
  if (!await begin('water', 1.9, 'water')) return
  const [sx, sz] = pl.stand; placeAt(sx, sz, Math.atan2(pl.x - sx, pl.z - sz)); pose({ x: sx, z: sz, yaw: Math.atan2(pl.x - sx, pl.z - sz), rate: 8 })
  const first = A.watered()[pl.id] !== G.s.day; A.watered()[pl.id] = G.s.day; pl.perkT = performance.now(); emit()
  for (let i = 0; i < 6; i++) setTimeout(() => FX && FX.drop.emit(pl.x, pl.y + 0.3 * pl.s, pl.z, 3, { spread: 0.06, up: 0.05, size: 0.022, life: 0.6 }), 250 + i * 160)
  setTimeout(() => FX && FX.spark.emit(pl.x, pl.y + 0.25 * pl.s, pl.z, 6, { spread: 0.12, up: 0.25, size: 0.04, life: 1 }), 1100)
  toast(first ? 'The leaves lift and brighten — thank you, they seem to say.' : 'Still happy from earlier. A little sip anyway.', 'can', 2600)
  await wait(1900); end()
}
async function feedCat() {
  if (CAT.bowl > 0) { toast(`${CAT.name}'s bowl is still full.`, 'fish', 2000); return }
  if (!await begin('feed', 1.3)) return
  placeAt(0.78, 0.32, Math.atan2(BOWL.x - 0.78, BOWL.z - 0.32)); pose({ x: 0.78, z: 0.32, yaw: Math.atan2(BOWL.x - 0.78, BOWL.z - 0.32), rate: 8 })
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
    consider({ kind: 'ext', inside: true, id: 'bed', icon: 'moon', verb: 'Sleep', name: 'till morning', chip: true, alt: { verb: 'Nap', icon: 'sun', key: 'F', act: () => sleep(false) }, act: () => sleep(true) }, d(-0.52, -0.5), 0.26)
    const r = dish(); consider({ kind: 'ext', inside: true, id: 'stove' + r.id, icon: r.makes, verb: 'Cook', name: ITEMS[r.makes].name, chip: true, alt: { verb: 'Other dish', icon: 'rotate', key: 'F', act: () => { A.dish++; emit() } }, act: cook }, d(0.86, -0.64), 0.2)
    consider({ kind: 'ext', inside: true, id: 'tub', icon: 'water', verb: 'Take', name: 'a bath', act: bath }, d(-0.5, 0.64), 0.26)
    consider({ kind: 'ext', inside: true, id: 'tea', icon: 'teacup', verb: 'Make', name: 'tea', act: tea }, d(0.14, -0.17), 0.22)
    consider({ kind: 'ext', inside: true, id: 'read', icon: 'book', verb: 'Read', name: 'a book', act: read }, d(CHAIR.x, CHAIR.z + 0.26), 0.22)
    for (const pl of PLANTS) consider({ kind: 'ext', inside: true, id: 'plant-' + pl.id, icon: 'can', verb: 'Water', name: A.watered()[pl.id] === G.s.day ? 'the happy plant' : 'the thirsty plant', act: () => water(pl) }, d(pl.stand[0], pl.stand[1]), pl.lim)
    consider({ kind: 'ext', inside: true, id: 'feedcat', icon: 'fish', verb: 'Feed', name: CAT.name, act: feedCat }, d(0.78, 0.3), 0.22)
  })
}

// ---------- props ----------
function Tub() {
  const staves = 18
  return <group position={[TUB.x, 0, TUB.z]}>
    {/* duckboard (sunoko) under the tub */}
    {[-2, -1, 0, 1, 2].map(i => <Box key={i} p={[i * 0.085, 0.012, 0]} s={[0.065, 0.024, 0.5]} c={W.light} out={OUT.fine} />)}
    {[...Array(staves)].map((_, i) => { const a = i / staves * Math.PI * 2; return <Box key={i} p={[Math.sin(a) * TUB.r, 0.03 + TUB.h / 2, Math.cos(a) * TUB.r]} s={[0.066, TUB.h, 0.022]} rot={[0, a, 0]} c={i % 2 ? '#d9b07a' : '#cfa46c'} out={i % 3 ? null : OUT.fine} /> })}
    {[0.1, 0.27].map(y => <O key={y} geo={GEO.tor} mat={tm(W.iron)} position={[0, 0.03 + y, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[TUB.r + 0.012, TUB.r + 0.012, 0.03]} out={null} />)}
    <O geo={GEO.cyl} mat={tm('#cfa46c')} position={[0, 0.045, 0]} scale={[TUB.r, 0.02, TUB.r]} out={null} />
    {/* bucket + stool + towel rack */}
    <group position={[0.06, 0, -0.29]}><Box geo={GEO.cyl} p={[0, 0.05, 0]} s={[0.05, 0.1, 0.05]} c={'#d9b07a'} out={OUT.fine} /><O geo={GEO.tor} mat={tm(W.iron)} position={[0, 0.07, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[0.052, 0.052, 0.03]} out={null} /><Box geo={GEO.tor} p={[0, 0.12, 0]} s={[0.04, 0.04, 0.03]} c={W.dark} out={null} /></group>
    <group position={[0.27, 0, -0.18]}><Box p={[0, 0.09, 0]} s={[0.1, 0.02, 0.07]} c={W.light} out={OUT.fine} />{[-1, 1].map(s => <Box key={s} p={[s * 0.04, 0.04, 0]} s={[0.015, 0.08, 0.06]} c={W.wood} out={null} />)}<O geo={GEO.pillow} mat={tm('#fbf3e4')} position={[0, 0.11, 0]} scale={[0.07, 0.02, 0.05]} out={OUT.fine} /></group>
    <group position={[-0.5, 0, 0.0]}>{[-1, 1].map(s => <Box key={s} p={[0, 0.3, s * 0.12]} s={[0.025, 0.6, 0.025]} c={W.dark} />)}<Box p={[0, 0.56, 0]} s={[0.02, 0.02, 0.26]} c={W.dark} />
      <O geo={GEO.pillow} mat={tm('#8fc3e8')} position={[0.012, 0.47, 0]} scale={[0.02, 0.2, 0.2]} out={OUT.fine} /><Box p={[0.016, 0.4, 0]} s={[0.022, 0.02, 0.2]} c={'#fbf3e4'} out={null} /></group>
    {/* shelf with soap, bottles, a little plant */}
    <group position={[-0.47, 0.72, -0.3]}><Box p={[0, 0, 0]} s={[0.1, 0.02, 0.32]} c={W.wood} />{[[0, -0.1, '#f6c8b0'], [0, -0.02, '#cfe6c8'], [0, 0.06, '#8fc3e8']].map(([x, z, c], i) => <Box key={i} geo={GEO.cyl} p={[x, 0.04 + i * 0.006, z]} s={[0.02, 0.06 + i * 0.012, 0.02]} c={c} out={OUT.fine} />)}<Box geo={GEO.pillow} p={[0, 0.02, 0.12]} s={[0.04, 0.02, 0.03]} c={'#fffaf0'} out={null} /></group>
    {/* bath mat */}
    <mesh position={[0.32, 0.004, 0]} rotation={[-Math.PI / 2, 0, 0]} material={tm('#8fc3e8')} scale={[0.16, 0.28, 1]}><planeGeometry args={[1, 1]} /></mesh>
    <mesh position={[0.32, 0.006, 0]} rotation={[-Math.PI / 2, 0, 0]} material={tm('#fbf3e4')} scale={[0.12, 0.24, 1]}><planeGeometry args={[1, 1]} /></mesh>
  </group>
}
function Armchair() {
  return <group position={[CHAIR.x, 0, CHAIR.z]}>
    <Box geo={GEO.pillow} p={[0, 0.11, 0]} s={[0.26, 0.12, 0.24]} c={'#c96a5a'} />
    <Box geo={GEO.pillow} p={[0, 0.3, -0.1]} s={[0.26, 0.32, 0.07]} c={'#c96a5a'} />
    {[-1, 1].map(s => <Box key={s} geo={GEO.pillow} p={[s * 0.13, 0.2, 0.0]} s={[0.05, 0.14, 0.24]} c={'#b85a4a'} />)}
    <Box geo={GEO.pillow} p={[0, 0.185, 0.02]} s={[0.2, 0.05, 0.19]} c={'#f2c46a'} />
    {[-1, 1].flatMap(s => [-1, 1].map(t => <Box key={s + '' + t} geo={GEO.cyl} p={[s * 0.11, 0.025, t * 0.1]} s={[0.012, 0.05, 0.012]} c={W.dark} out={null} />))}
    {/* quilt throw over the back */}
    <Box geo={GEO.pillow} p={[0.05, 0.43, -0.09]} s={[0.17, 0.05, 0.1]} c={'#8fc3e8'} out={OUT.fine} rot={[0.4, 0, 0.1]} />
    {/* stack of books beside it + a side crate with a candle */}
    <group position={[-0.22, 0, 0.05]}>{[0, 1, 2, 3].map(i => <Box key={i} p={[0, 0.015 + i * 0.028, 0]} s={[0.12 - i * 0.008, 0.026, 0.09]} rot={[0, i * 0.35, 0]} c={['#d9655b', '#5f8fc4', '#e8a24a', '#8cc084'][i]} out={OUT.fine} />)}</group>
  </group>
}
function Clutter() {
  const x = 1.15
  return <group>
    {/* kitchen: utensil rail with ladle, spatula, whisk, sieve; rice pot, dish rack, onion basket, mat */}
    <group position={[x + 0.13, 0.66, -0.2]}><Box p={[0, 0, 0.15]} s={[0.012, 0.012, 0.42]} c={W.dark} out={null} />
      {[0, 1, 2, 3].map(i => <group key={i} position={[-0.012, -0.01, 0.0 + i * 0.1]}>
        <Box geo={GEO.cyl} p={[0, -0.06, 0]} s={[0.005, 0.12, 0.005]} c={i === 2 ? W.iron : W.wood} out={null} />
        {i === 0 && <Box geo={GEO.half} p={[0, -0.13, 0]} s={[0.025, -0.02, 0.025]} c={W.wood} out={OUT.fine} />}
        {i === 1 && <Box p={[0, -0.14, 0]} s={[0.006, 0.05, 0.035]} c={W.wood} out={OUT.fine} />}
        {i === 2 && <Box geo={GEO.sph} p={[0, -0.14, 0]} s={[0.018, 0.04, 0.018]} c={'#d8d2c8'} out={OUT.fine} />}
        {i === 3 && <><Box geo={GEO.tor} p={[0, -0.14, 0]} s={[0.035, 0.035, 0.03]} rot={[0, Math.PI / 2, 0]} c={W.iron} out={null} /><Box geo={GEO.half} p={[-0.005, -0.14, 0]} s={[0.03, 0.03, 0.03]} rot={[0, 0, Math.PI / 2]} c={'#d8d2c8'} out={null} /></>}
      </group>)}</group>
    <group position={[x, 0.43, -0.22]}><Box geo={GEO.cyl} p={[0, 0.05, 0]} s={[0.06, 0.08, 0.06]} c={'#3a3238'} /><Box geo={GEO.cyl} p={[0, 0.095, 0]} s={[0.064, 0.012, 0.064]} c={W.wood} out={null} /><Box geo={GEO.sph} p={[0, 0.11, 0]} s={0.012} c={W.wood} out={null} /></group>
    <group position={[x + 0.02, 0.43, 0.68]}>{[0, 1, 2].map(i => <Box key={i} geo={GEO.cyl} p={[0, 0.06, -0.05 + i * 0.03]} s={[0.05, 0.004, 0.05]} rot={[Math.PI / 2, 0, 0]} c={'#fffaf0'} out={OUT.fine} />)}<Box p={[0, 0.02, 0]} s={[0.06, 0.02, 0.12]} c={W.light} out={null} /></group>
    <group position={[x - 0.05, 0.43, 0.32]}><Box geo={GEO.cyl} p={[0, 0.02, 0]} s={[0.035, 0.035, 0.035]} c={'#e9d4b0'} out={OUT.fine} />{[0, 1, 2].map(i => <Box key={i} geo={GEO.sph} p={[Math.cos(i * 2.1) * 0.015, 0.045, Math.sin(i * 2.1) * 0.015]} s={[0.014, 0.012, 0.014]} c={i ? '#fbf3e4' : '#c98a4a'} out={null} />)}</group>
    <mesh position={[0.84, 0.004, 0.2]} rotation={[-Math.PI / 2, 0, 0]} material={tm('#e8a24a')} scale={[0.16, 0.5, 1]}><planeGeometry args={[1, 1]} /></mesh>
    {[-0.2, -0.05, 0.1, 0.25, 0.4].map(z => <mesh key={z} position={[0.84, 0.006, 0.2 + z * 0.8]} rotation={[-Math.PI / 2, 0, 0]} material={tm('#c96a5a')} scale={[0.14, 0.02, 1]}><planeGeometry args={[1, 1]} /></mesh>)}
    {/* firewood stack by the stove */}
    <group position={[1.16, 0, -0.46]}>{[0, 1, 2].flatMap(r => [0, 1, 2 - (r > 1 ? 1 : 0)].map(i => <Box key={r + '' + i} geo={GEO.cyl} p={[-0.08 + i * 0.07 + r * 0.035, 0.035 + r * 0.058, 0]} s={[0.032, 0.2, 0.032]} rot={[Math.PI / 2, 0, 0]} c={(r + i) % 2 ? '#a8744c' : '#8a5a3c'} out={OUT.fine} />))}</group>
    {/* runner rug beside the bed, reading rug, more books on the table and the sill, a basket by the window */}
    <mesh position={[-0.47, 0.004, -0.55]} rotation={[-Math.PI / 2, 0, 0]} material={tm('#8cc084')} scale={[0.2, 0.55, 1]}><planeGeometry args={[1, 1]} /></mesh>
    {[-1, 1].map(s => <mesh key={s} position={[-0.47 + s * 0.08, 0.006, -0.55]} rotation={[-Math.PI / 2, 0, 0]} material={tm('#f6ead2')} scale={[0.015, 0.5, 1]}><planeGeometry args={[1, 1]} /></mesh>)}
    <mesh position={[CHAIR.x, 0.004, CHAIR.z + 0.12]} rotation={[-Math.PI / 2, 0, 0]} material={tm('#f2c46a')} scale={[0.22, 0.17, 1]}><circleGeometry args={[1, 28]} /></mesh>
    <mesh position={[CHAIR.x, 0.006, CHAIR.z + 0.12]} rotation={[-Math.PI / 2, 0, 0]} material={tm('#c97b9a')} scale={[0.18, 0.13, 1]}><circleGeometry args={[1, 28]} /></mesh>
    <group position={[0.32, 0.315, 0.3]}>{[0, 1].map(i => <Box key={i} p={[0, 0.012 + i * 0.022, 0]} s={[0.09, 0.02, 0.065]} rot={[0, 0.3 + i * 0.5, 0]} c={['#5f8fc4', '#f6ead2'][i]} out={OUT.fine} />)}</group>
    <group position={[ROOM.x0 + 0.1, 0.44, -0.02]}>{[0, 1].map(i => <Box key={i} p={[0, 0.012 + i * 0.022, 0]} s={[0.07, 0.02, 0.1]} rot={[0, 0.2 * i, 0]} c={['#d9655b', '#e8a24a'][i]} out={OUT.fine} />)}</group>
    <group position={[-1.16, 0, -0.06]}><Box geo={GEO.cyl} p={[0, 0.05, 0]} s={[0.07, 0.1, 0.07]} c={'#c8a070'} out={OUT.fine} />{[0.03, 0.07].map(y => <O key={y} geo={GEO.tor} mat={tm('#a8744c')} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[0.071, 0.071, 0.02]} out={null} />)}{[0, 1, 2].map(i => <Box key={i} geo={GEO.sph} p={[-0.02 + i * 0.02, 0.105, (i - 1) * 0.02]} s={0.022} c={['#f2c46a', '#d9564a', '#8fcf6a'][i]} out={null} />)}</group>
    {/* drying herbs garland on the beam over the kitchen + a print by the door */}
    {[...Array(6)].map((_, i) => <group key={i} position={[0.55 + i * 0.07, ROOM.h - 0.1, -0.67]}><Box p={[0, -0.04, 0]} s={[0.003, 0.08, 0.003]} c={W.dark} out={null} /><Box geo={GEO.cone} p={[0, -0.1, 0]} s={[0.022, 0.07, 0.022]} rot={[Math.PI, 0, 0]} c={i % 2 ? W.leaf : '#b8a05a'} out={OUT.fine} /></group>)}
    {/* cat bowl (food is shown by Bowl) + kibble sack */}
    <group position={[BOWL.x, 0, BOWL.z]}><Box geo={GEO.half} p={[0, 0.03, 0]} s={[0.05, -0.03, 0.05]} c={'#5f8fc4'} out={OUT.fine} /><Box geo={GEO.cyl} p={[0, 0.002, 0]} s={[0.04, 0.004, 0.04]} c={'#4f7fb4'} out={null} /></group>
    <group position={[BOWL.x + 0.02, 0, BOWL.z + 0.14]}><Box geo={GEO.pillow} p={[0, 0.07, 0]} s={[0.08, 0.14, 0.06]} c={'#e9d4b0'} /><Box p={[0, 0.1, 0.031]} s={[0.04, 0.03, 0.004]} c={'#d9655b'} out={null} /></group>
  </group>
}
// teapot (tilts to pour) + her cup (follows her hand when she sips), pot on the stove while cooking, cat-bowl kibble,
// a book in her hands, quilt over her in bed
const _w = new THREE.Vector3(), _l = new THREE.Vector3()
function Dynamic() {
  const pot = useRef(), cup = useRef(), stew = useRef(), kib = useRef(), book = useRef(), quilt = useRef(), water = useRef()
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
    if (Math.random() < dt * (A.soak ? 14 : 2.5)) fx.steam.emit(TUB.x + (Math.random() - 0.5) * 0.2, 0.3, TUB.z + (Math.random() - 0.5) * 0.2, 1, { spread: 0.05, up: 0.09, size: A.soak ? 0.16 : 0.11, life: 2.4 })
    if (A.pot && Math.random() < dt * 10) fx.steam.emit(1.08, 0.58, -0.76, 1, { spread: 0.04, up: 0.12, size: 0.09, life: 1.4 })
    if (A.pour && Math.random() < dt * 6) fx.steam.emit(0.15, 0.36, 0.13, 1, { spread: 0.02, up: 0.08, size: 0.05, life: 1.2 })
    if (A.doing === 'sleep' && Math.random() < dt * 1.3) fx.z.emit(-0.98, 0.45, -0.78, 1, { spread: 0.02, up: 0.07, vx: 0.05, size: 0.06, life: 2.2 })
    if (A.doing === 'read' && Math.random() < dt * 0.5) fx.spark.emit(CHAIR.x, 0.5, CHAIR.z + 0.1, 1, { spread: 0.15, up: 0.05, size: 0.03, life: 1.6 })
    if (A.sip && Math.random() < dt * 5) { const o = HOME.playerObj; if (o) { toRoom(o, 0.02, 0.34, 0.07, _l); fx.steam.emit(_l.x, _l.y + 0.03, _l.z, 1, { spread: 0.01, up: 0.06, size: 0.04, life: 1 }) } }
    water.current.position.y = 0.25 + Math.sin(now * 1.3) * 0.004
    // teapot pours, then rests
    const pk = A.pour ? Math.min(1, (performance.now() - A.t0) / 500) : 0; pot.current.rotation.z = THREE.MathUtils.lerp(pot.current.rotation.z, -0.9 * pk, Math.min(1, dt * 6)); pot.current.position.y = 0.315 + 0.04 * pk
    // cup: on the table, or in her hand while she sips
    const o = HOME.playerObj
    if (A.sip && o) { toRoom(o, 0.02, 0.3, 0.07, _l); cup.current.position.lerp(_l, Math.min(1, dt * 10)) } else cup.current.position.lerp(_l.set(0.15, 0.315, 0.1), Math.min(1, dt * 8))
    book.current.visible = !!A.book && !!o; if (book.current.visible) { toRoom(o, 0, 0.2, 0.1, _l); book.current.position.copy(_l); book.current.rotation.set(-0.9, HOME.pose ? HOME.pose.yaw : 0, 0, 'YXZ') }
    stew.current.visible = !!A.pot; kib.current.visible = CAT.bowl > 0
    quilt.current.visible = A.doing === 'sleep' && (ps?.k ?? 0) > 0.5
    // plants: droop when thirsty (not watered today), perk up with a springy bounce
    for (const pl of PLANTS) { const g = pl.g; if (!g) continue; const happy = A.watered()[pl.id] === G.s.day ? 1 : 0; pl.h = (pl.h ?? happy) + (happy - (pl.h ?? happy)) * Math.min(1, dt * 2.5)
      const e = pl.perkT ? (performance.now() - pl.perkT) / 1000 : 9, bounce = e < 1.5 ? Math.sin(e * 9) * Math.exp(-e * 3) * 0.12 : 0
      g.scale.set(pl.s * (1.08 - 0.08 * pl.h - bounce * 0.5), pl.s * (0.78 + 0.22 * pl.h + bounce), pl.s * (1.08 - 0.08 * pl.h - bounce * 0.5)); g.rotation.z = (1 - pl.h) * 0.08
      pl.mat.color.copy(pl.c0).lerp(pl.cd, 1 - pl.h) }
  })
  return <group ref={grp}>
    {Object.values(fx).map((e, i) => <primitive key={i} object={e.obj} />)}
    <mesh ref={water} position={[TUB.x, 0.25, TUB.z]} rotation={[-Math.PI / 2, 0, 0]} material={WATER} scale={TUB.r - 0.01}><circleGeometry args={[1, 28]} /></mesh>
    <group ref={pot} position={[0.13, 0.315, 0.21]}><O geo={GEO.sph} mat={tm('#8cc084')} position={[0, 0.04, 0]} scale={[0.045, 0.038, 0.045]} out={OUT.fine} /><O geo={GEO.cone} mat={tm('#8cc084')} position={[0.05, 0.05, 0]} scale={[0.012, 0.045, 0.012]} rotation={[0, 0, -1.0]} out={null} /><O geo={GEO.sph} mat={tm(W.dark)} position={[0, 0.08, 0]} scale={0.012} out={null} /><O geo={GEO.tor} mat={tm(W.dark)} position={[-0.045, 0.045, 0]} scale={[0.022, 0.022, 0.02]} out={null} /></group>
    <group ref={cup} position={[0.15, 0.315, 0.1]}><O geo={GEO.cyl} mat={tm('#fffaf0')} position={[0, 0.018, 0]} scale={[0.017, 0.034, 0.017]} out={OUT.fine} /><mesh geometry={GEO.circ} material={tm('#c98a4a')} position={[0, 0.034, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={0.014} /></group>
    <group ref={stew} position={[1.1, 0.445, -0.78]} visible={false}><O geo={GEO.cyl} mat={tm('#3a3238')} position={[0, 0.04, 0]} scale={[0.07, 0.08, 0.07]} out={OUT.fine} /><mesh geometry={GEO.circ} material={tm('#e8b84a')} position={[0, 0.081, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={0.062} /><O geo={GEO.cyl} mat={tm(W.wood)} position={[-0.03, 0.12, 0]} rotation={[0, 0, 0.5]} scale={[0.005, 0.12, 0.005]} out={null} /></group>
    <group ref={kib} position={[BOWL.x, 0.028, BOWL.z]} visible={false}>{[...Array(7)].map((_, i) => <mesh key={i} geometry={GEO.sphL} material={tm('#a8683a')} position={[Math.cos(i * 2.4) * 0.022 * (i % 3) / 2, 0.004 * (i % 2), Math.sin(i * 2.4) * 0.022 * (i % 3) / 2]} scale={0.012} />)}</group>
    <group ref={book} visible={false}><O geo={GEO.box} mat={tm('#5f8fc4')} scale={[0.1, 0.012, 0.075]} out={OUT.fine} /><mesh geometry={GEO.box} material={tm('#fffaf0')} position={[0, 0.008, 0]} scale={[0.094, 0.006, 0.068]} /></group>
    <group ref={quilt} visible={false}><O geo={GEO.pillow} mat={tm(W.quilt, 0)} position={[-0.98, 0.33, -0.48]} scale={[0.5, 0.07, 0.42]} out={OUT.fine} /></group>
  </group>
}
const WATER = new THREE.MeshToonMaterial({ color: '#9fd6e8', transparent: true, opacity: 0.85 })
// indoor plants: pot static, leaves one merged mesh per plant (so the perk-up costs 2 calls a plant)
function Plants() {
  const P = useMemo(() => PLANTS.map(pl => {
    const parts = [], m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion(), e = new THREE.Euler(), n = pl.big ? 8 : pl.row ? 9 : 5
    for (let i = 0; i < n; i++) { const a = i * 2.4, tilt = 0.5 + (i % 3) * 0.2, h = 0.22 + (i % 2) * 0.08, ox = pl.row ? (Math.floor(i / 3) - 1) * 0.22 : 0
      const stem = GEO.cyl.clone(); e.set(Math.cos(a) * tilt, 0, Math.sin(a) * tilt); q4.setFromEuler(e)
      const tip = new THREE.Vector3(0, h, 0).applyQuaternion(q4)
      stem.applyMatrix4(m4.compose(new THREE.Vector3(ox, 0.15, 0).add(tip.clone().multiplyScalar(0.5)), q4, new THREE.Vector3(0.006, h, 0.006))); parts.push(stem)
      const lf = GEO.sph.clone(); e.set(Math.cos(a) * tilt + 0.3, a, Math.sin(a) * tilt); lf.applyMatrix4(m4.compose(new THREE.Vector3(ox, 0.15, 0).add(tip), new THREE.Quaternion().setFromEuler(e), new THREE.Vector3(0.075, 0.018, 0.05))); parts.push(lf) }
    for (const g of parts) { g.deleteAttribute('uv') }
    const geo = mergeGeometries(parts.map(g => g.index ? g.toNonIndexed() : g)); const c0 = new THREE.Color(W.leaf2), mat = tm(W.leaf2).clone(); pl.mat = mat; pl.c0 = c0; pl.cd = new THREE.Color('#a8b06a')
    return { pl, geo, mat } }), [])
  return <>{P.map(({ pl, geo, mat }) => <group key={pl.id} position={[pl.x, pl.y, pl.z]}>
    <group ref={el => (pl.g = el)}><mesh geometry={geo} material={mat} /><mesh geometry={geo} material={OUT.fine} /></group>
  </group>)}</>
}
function Pots() { // static pots (merged with the clutter)
  return <>{PLANTS.map(pl => <group key={pl.id} position={[pl.x, pl.y, pl.z]} scale={pl.s}>
    {(pl.row ? [-0.22, 0, 0.22] : [0]).map(ox => <group key={ox} position={[ox, 0, 0]}><Box geo={GEO.cyl} p={[0, 0.07, 0]} s={[0.08, 0.14, 0.08]} c={W.pot} /><Box geo={GEO.cyl} p={[0, 0.145, 0]} s={[0.088, 0.02, 0.088]} c={'#c46f4a'} out={null} /></group>)}
  </group>)}</>
}
export default function Activities() {
  return <group>
    <Merge><Tub /><Armchair /><Clutter /><Pots /></Merge>
    <Plants /><Dynamic />
  </group>
}
