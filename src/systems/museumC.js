// Stage C ruins museum interior mode (lazy; loaded by WorldC when she visits). Like Home, the hall sits at the planet's
// centre in planet-local space on its own render layer (6): while she's inside, the camera renders only that layer (hall,
// Hoshino, her, the scene lights), her outdoor position is held at the museum door and App's Traveller hands her movement
// to MU.step (HOME.alt). Prompts are 'inside' entries, so nothing outdoors competes. Studio's layout: MUSEUM / MDOOR /
// MBLOCKS / slotNear (art/museum/layout.js).
import * as THREE from 'three'
import { MUSEUM, MDOOR, MBLOCKS, slotNear } from '../art/museum/layout.js'
import { HOME } from '../home/state.js'
import { G, emit, count } from '../game/store.js'
import { PAD, CAM } from '../touch.jsx'
import { actLocked, startAct } from '../act.js'
export const MLAYER = 6
export const MU = { inside: false, busy: false, obj: null, mp: { x: MDOOR.x, z: MDOOR.z + 0.3, yaw: 0 }, camYaw: Math.PI, prevCam: null }
if (typeof window !== 'undefined') window.__museum = MU
const UP = new THREE.Vector3(0, 1, 0), _a = new THREE.Vector3(), _b = new THREE.Vector3(), _q = new THREE.Quaternion()
// rAF paints the iris. The timer finishes the fade on wall-clock time so a stalled frame (or a hidden tab,
// where rAF is paused) cannot leave the door lock or HOME.fade stuck after the fade's own duration.
function fadeTo(v, ms) { return new Promise(res => { const v0 = HOME.fade, t0 = performance.now(); let done = false; const step = () => { if (done) return; const k = Math.min(1, (performance.now() - t0) / ms); if (k < 1) { HOME.fade = v0 + (v - v0) * (k * k * (3 - 2 * k)); requestAnimationFrame(step); return } done = true; HOME.fade = v; res() }; setTimeout(step, ms); step() }) }
export function resolveM(p, r = 0.09) {
  p.x = Math.min(MUSEUM.x1 - r, Math.max(MUSEUM.x0 + r, p.x)); p.z = Math.min(MUSEUM.z1 - r, Math.max(MUSEUM.z0 + r, p.z))
  for (const b of MBLOCKS) { const cx = Math.min(b.x1, Math.max(b.x0, p.x)), cz = Math.min(b.z1, Math.max(b.z0, p.z)), dx = p.x - cx, dz = p.z - cz, d = Math.hypot(dx, dz)
    if (d < r) { if (d > 1e-5) { p.x = cx + dx / d * r; p.z = cz + dz / d * r } else { const o = [[p.x - b.x0, -1, 0], [b.x1 - p.x, 1, 0], [p.z - b.z0, 0, -1], [b.z1 - p.z, 0, 1]].sort((u, w) => u[0] - w[0])[0]; p.x += o[1] * (o[0] + r); p.z += o[2] * (o[0] + r) } } }
  return p
}
// her movement inside (same feel as Home: tank keys, camera-relative stick)
function step(dt, KEYS, P, obj) {
  const mp = MU.mp; HOME.playerObj = obj
  let f = (KEYS.w || KEYS.arrowup ? 1 : 0) - (KEYS.s || KEYS.arrowdown ? 1 : 0), turn = (KEYS.a || KEYS.arrowleft ? 1 : 0) - (KEYS.d || KEYS.arrowright ? 1 : 0)
  if (CAM.yaw) { mp.yaw -= CAM.yaw; CAM.yaw = 0 }
  if (PAD.active && PAD.mag > 0.12 && !f && !turn) { const want = MU.camYaw - Math.atan2(PAD.x, PAD.y); let d = want - mp.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); mp.yaw += d * Math.min(1, dt * 9); f = Math.min(1, (PAD.mag - 0.12) / 0.6) * (Math.abs(d) < 1.6 ? 1 : 0.3) }
  if (MU.busy || G.ui.panel || actLocked()) f = turn = 0
  const run = KEYS.shift || (PAD.active && PAD.run)
  mp.yaw += turn * 2.0 * dt
  const eMul = window.__energyMul ? window.__energyMul() : 1
  const sp = f * (run ? 0.81 : 0.52) / MUSEUM.S * 1.15 * dt * eMul; mp.x += Math.sin(mp.yaw) * sp; mp.z += Math.cos(mp.yaw) * sp; resolveM(mp)
  P.move += ((f ? Math.max(0.35, Math.abs(f)) : 0) - P.move) * Math.min(1, dt * 8); P.phase += dt * (run ? 11 : 8.2) * P.move; P.h = 0; P.vy = 0
  obj.position.set(mp.x * MUSEUM.S, 0, mp.z * MUSEUM.S); obj.quaternion.setFromAxisAngle(UP, mp.yaw)
}
const toWorld = (x, y, z, out) => { out.set(x, y, z); if (MU.obj) out.applyMatrix4(MU.obj.matrixWorld); return out }
const camL = new THREE.Vector3(), lookL = new THREE.Vector3(), _g = new THREE.Vector3(), _l = new THREE.Vector3(); let snap = 0, fov0 = null
function cam(camera, g, dt) {
  if (!MU.inside || !MU.obj) { if (fov0 != null) { camera.fov = fov0; fov0 = null; camera.updateProjectionMatrix(); camera.layers.set(0) } return MU.prevCam ? MU.prevCam(camera, g, dt) : false }
  if (fov0 == null) { fov0 = camera.fov; camera.fov = 56; camera.updateProjectionMatrix(); camera.layers.set(MLAYER) }
  const mp = MU.mp, z = Math.min(1, Math.max(0.6, CAM.zoom || 1))
  _g.set(Math.max(-1, Math.min(1, mp.x * 0.5)), 0.74 + 0.36 * z + 0.12 * (CAM.pitch || 0), MUSEUM.z1 - 0.08); _l.set(mp.x * 0.85, 0.24, Math.min(mp.z - 0.12, 0.7))
  const k = snap > 0 ? 1 : 1 - Math.exp(-dt * 2.0); snap--
  camL.lerp(_g, k); lookL.lerp(_l, k); if (k === 1) { camL.copy(_g); lookL.copy(_l) }
  MU.camYaw = Math.atan2(lookL.x - camL.x, lookL.z - camL.z)
  camera.position.copy(toWorld(camL.x, camL.y, camL.z, _a)); camera.up.copy(_b.copy(UP).transformDirection(MU.obj.matrixWorld)); camera.lookAt(toWorld(lookL.x, lookL.y, lookL.z, _b))
  return true
}
function layersOn(scene) { scene.traverse(o => { if (o.isLight) o.layers.enable(MLAYER) }); if (HOME.playerObj) HOME.playerObj.traverse(o => o.layers.enable(MLAYER)) }
const fading = () => HOME.fade > 0.02 // iris still moving: don't start a second door fade on top of this one
export async function enter(scene) {
  if (MU.busy || MU.inside || HOME.inside || fading()) return; MU.busy = true; startAct('door'); await new Promise(r => setTimeout(r, 300))
  await fadeTo(1, 380)
  layersOn(scene); if (MU.ray) MU.ray.layers.enable(MLAYER); Object.assign(MU.mp, { x: MDOOR.x, z: MDOOR.z + 0.3, yaw: 0.15 }); snap = 3
  if (HOME.camera !== cam) { MU.prevCam = HOME.camera; HOME.camera = cam }
  MU.inside = true; HOME.alt = step; G.near = null; emit()
  MU.busy = false // lock ends with the cut, not the iris reopening (that can sit behind a multi-second frame)
  await fadeTo(0, 520)
}
export async function exit() {
  if (MU.busy || !MU.inside || fading()) return; MU.busy = true; startAct('door'); await new Promise(r => setTimeout(r, 300))
  await fadeTo(1, 380)
  MU.inside = false; HOME.alt = null; if (MU.ray) MU.ray.layers.disable(MLAYER); G.near = null; const P = window.__player; if (P) { P.target = null; P.fwd.negate() } // step back out, facing away from the door
  window.__snap = 1; setTimeout(() => { window.__snap = 0 }, 200); emit()
  MU.busy = false
  await fadeTo(0, 520)
}
// Hoshino's catalogue card for a slot: 'donate' when she carries one that isn't on display yet, else 'inspect'
export function openSlot(id) {
  const mode = G.s.museum.donated[id] === undefined && count(id) > 0 ? 'donate' : 'inspect'
  G.ui.donate = { id, mode }; G.ui.panel = 'donate'; emit()
}
MU.open = openSlot
// prompts while inside: plinths / tank slots (look or donate) and the door
export function nearInside(consider, SC) {
  if (!MU.inside) return
  const mp = MU.mp, dd = Math.hypot(mp.x - MDOOR.x, mp.z - MDOOR.z)
  if (dd < 0.42) consider({ kind: 'ext', inside: true, id: 'museum-exit', icon: 'leaf', verb: 'Leave', name: 'the museum', act: () => exit() }, dd * 0.01, 1)
  const s = slotNear(mp.x, mp.z, 0.36); if (!s) return
  const don = G.s.museum.donated[s.id] !== undefined, have = count(s.id) > 0, nm = SC.itemName(s.id)
  const mode = don || !have ? 'inspect' : 'donate'
  consider({ kind: 'ext', inside: true, id: 'mslot-' + s.id + mode, icon: don || have ? s.id : 'book', verb: mode === 'donate' ? 'Donate' : 'Look at', name: don || have ? nm : 'the empty plinth', act: () => openSlot(s.id) }, 0.002 + Math.hypot(mp.x - s.x, mp.z - s.z) * 0.01, 1)
}
