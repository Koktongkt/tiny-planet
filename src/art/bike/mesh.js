// Her bicycle. Lazy: the game only imports this chunk once she is actually riding (PlayerBike in game/World.jsx).
// loadBike() fetches Studio's Village Pet Bike (bicycle.glb: one rigid-skinned mesh, 7 bones, KHR_mesh_quantization,
// no Draco / meshopt / KTX2) and draws it as 2 calls: the toon body plus an inverted-hull ink SkinnedMesh on the same
// skeleton. The GLB and GLTFLoader stay out of the startup chunk. createBike() below is the Stage E placeholder (3 calls),
// kept only as the fallback if the GLB cannot load.
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { toonRamp } from '../../world.js'
import { POSES } from '../../act.js'

const prep = (g, hex) => {
  if (g.index) g = g.toNonIndexed()
  const c = new THREE.Color(hex), a = []
  for (let i = 0; i < g.attributes.position.count; i++) a.push(c.r, c.g, c.b)
  g.setAttribute('color', new THREE.Float32BufferAttribute(a, 3))
  g.deleteAttribute('uv')
  return g
}
const box = (w, h, d, x, y, z, hex, rx = 0, ry = 0, rz = 0) => {
  const g = new THREE.BoxGeometry(w, h, d)
  if (rx) g.rotateX(rx)
  if (ry) g.rotateY(ry)
  if (rz) g.rotateZ(rz)
  g.translate(x, y, z)
  return prep(g, hex)
}

// her body is about 0.28 tall in traveller space, so the bike sits under her hips
const RIM = 0.034
const AY = RIM
const WOOD = '#8a5a3c'
const WOOD2 = '#c49a6c'
const TIRE = '#3a2e2a'
const METAL = '#d5cfc4'
const SEAT = '#d9655b'

function wheelGeometry() {
  const parts = []
  const tire = new THREE.CylinderGeometry(RIM, RIM, 0.012, 8)
  tire.rotateZ(Math.PI / 2)
  parts.push(prep(tire, TIRE))
  const hub = new THREE.CylinderGeometry(0.008, 0.008, 0.016, 5)
  hub.rotateZ(Math.PI / 2)
  parts.push(prep(hub, METAL))
  for (let k = 0; k < 4; k++) {
    const sp = new THREE.BoxGeometry(0.005, RIM * 0.92, 0.003)
    sp.rotateX(k * Math.PI / 4)
    parts.push(prep(sp, METAL))
  }
  const g = mergeGeometries(parts)
  g.computeVertexNormals()
  return g
}

function frameGeometry() {
  const y = AY
  const parts = [
    box(0.01, 0.07, 0.01, 0, y + 0.02, -0.03, WOOD, 0.45),
    box(0.01, 0.08, 0.01, 0, y + 0.025, 0.02, WOOD2, -0.5),
    box(0.009, 0.009, 0.11, 0, y + 0.055, 0.0, WOOD),
    box(0.008, 0.05, 0.008, 0, y + 0.02, 0.068, WOOD, 0.2),
    box(0.055, 0.008, 0.008, 0, y + 0.052, 0.078, TIRE),
    box(0.016, 0.01, 0.03, 0, y + 0.062, -0.04, SEAT),
    box(0.008, 0.008, 0.09, 0, y + 0.006, 0.005, WOOD2),
    box(0.022, 0.006, 0.01, 0, y - 0.004, -0.01, METAL),
  ]
  const g = mergeGeometries(parts)
  g.computeVertexNormals()
  return g
}

export function createBike() {
  const mat = new THREE.MeshToonMaterial({ color: '#ffffff', gradientMap: toonRamp, vertexColors: true })
  const frame = new THREE.Mesh(frameGeometry(), mat)
  const geo = wheelGeometry()
  const wheels = [-0.055, 0.07].map(z => {
    const m = new THREE.Mesh(geo, mat)
    m.position.set(0, AY, z)
    m.frustumCulled = false
    return m
  })
  frame.frustumCulled = false
  return { frame, wheels, calls: 1 + wheels.length }
}

// ---------- Village Pet Bike (Studio GLB) ----------
// Space: traveller space (App.jsx Traveller group): +Y up, +Z forward, +X her left, origin on the ground. Scale 1.35 is
// baked into the vertices (node scale 1). Empties: seat (saddle top), pet_seat (crate floor), hand_L/R, pedal_L/R_target.
export const GLB_URL = new URL('./bicycle.glb', import.meta.url).href
export const INK = '#2e2420' // art/train/kit.js combine() ink
export const BONES = ['body', 'steer', 'wheel_front', 'wheel_rear', 'crank', 'pedal_L', 'pedal_R']
export const EMPTIES = ['seat', 'pet_seat', 'hand_L', 'hand_R', 'pedal_L_target', 'pedal_R_target']

/** Inverted hull from the first `inkTris` triangles of a skinned geometry: welded per bone, smooth normals, pushed out by
 *  `width`, winding flipped (a FrontSide material then shows only the outline). Keeps skinIndex/skinWeight (same skeleton). */
export function hullGeometry(geo, width) {
  const n = geo.userData.inkTris ?? geo.index.count / 3, ix = geo.index.array
  const P = geo.getAttribute('position'), J = geo.getAttribute('skinIndex'), Wt = geo.getAttribute('skinWeight')
  const pos = new Float32Array(n * 9), ji = new Uint16Array(n * 12), wt = new Float32Array(n * 12)
  for (let k = 0; k < n * 3; k++) {
    const v = ix[k]
    pos[k * 3] = P.getX(v); pos[k * 3 + 1] = P.getY(v); pos[k * 3 + 2] = P.getZ(v)
    for (let c = 0; c < 4; c++) { ji[k * 4 + c] = J.getComponent(v, c); wt[k * 4 + c] = Wt.getComponent(v, c) }
  }
  let h = new THREE.BufferGeometry()
  h.setAttribute('position', new THREE.BufferAttribute(pos, 3)); h.setAttribute('skinIndex', new THREE.BufferAttribute(ji, 4)); h.setAttribute('skinWeight', new THREE.BufferAttribute(wt, 4))
  h = mergeVertices(h, 1e-5) // welds only verts that share a position AND a bone: no seams across moving parts
  h.computeVertexNormals()
  const p = h.attributes.position, nn = h.attributes.normal
  for (let i = 0; i < p.count; i++) p.setXYZ(i, p.getX(i) + nn.getX(i) * width, p.getY(i) + nn.getY(i) * width, p.getZ(i) + nn.getZ(i) * width)
  const idx = h.index.array
  for (let t = 0; t < idx.length; t += 3) { const x = idx[t + 1]; idx[t + 1] = idx[t + 2]; idx[t + 2] = x }
  h.deleteAttribute('normal'); h.computeBoundingSphere()
  return h
}

const triCount = (g) => (g.index ? g.index.count : g.attributes.position.count) / 3
/** gltf (GLTFLoader result) -> { root, mesh, hull, bones, empties, wheelRadius, update({ dist?, spin?, steer?, crank? }), calls, tris } */
export function buildBike(gltf, { ink = true, inkWidth } = {}) {
  const root = gltf.scene, rig = root.getObjectByName('village_pet_bike')
  let mesh = null
  root.traverse(o => { if (o.isSkinnedMesh) mesh = o })
  if (!mesh) throw new Error('bicycle.glb: no skinned mesh')
  mesh.material = new THREE.MeshToonMaterial({ color: '#ffffff', vertexColors: true, gradientMap: toonRamp })
  mesh.frustumCulled = false
  const bones = Object.fromEntries(BONES.map(n => [n, mesh.skeleton.bones.find(b => b.name === n)]))
  const empties = Object.fromEntries(EMPTIES.map(n => [n, root.getObjectByName(n)]))
  const rest = Object.fromEntries(BONES.map(n => [n, bones[n].quaternion.clone()]))
  // wheel radius from the rear wheel bone's vertices (bind space == bike space)
  const ji = mesh.skeleton.bones.indexOf(bones.wheel_rear), J = mesh.geometry.getAttribute('skinIndex'), P = mesh.geometry.getAttribute('position')
  let lo = Infinity, hi = -Infinity
  for (let i = 0; i < P.count; i++) if (J.getX(i) === ji) { const y = P.getY(i); lo = Math.min(lo, y); hi = Math.max(hi, y) }
  const wheelRadius = (hi - lo) / 2
  let hull = null
  if (ink) {
    const w = inkWidth ?? (rig && rig.userData.inkWidth) ?? 0.0016
    hull = new THREE.SkinnedMesh(hullGeometry(mesh.geometry, w), new THREE.MeshBasicMaterial({ color: INK }))
    hull.name = 'bike_ink'; hull.frustumCulled = false
    mesh.parent.add(hull); hull.bind(mesh.skeleton, mesh.bindMatrix)
  }
  const q = new THREE.Quaternion(), X = new THREE.Vector3(1, 0, 0), Y = new THREE.Vector3(0, 1, 0)
  const turn = (n, axis, a) => bones[n].quaternion.copy(rest[n]).multiply(q.setFromAxisAngle(axis, a))
  // spin (rad) or dist (world units rolled: spin = dist / wheelRadius, so the tyres never skid). The crank turns at half
  // the wheel rate and the pedals counter-rotate so they stay level. steer (rad) turns fork, bars, basket and front wheel.
  function update({ dist, spin, steer = 0, crank } = {}) {
    const s = spin ?? (dist != null ? dist / wheelRadius : 0), c = crank ?? s * 0.5
    turn('wheel_front', X, s); turn('wheel_rear', X, s); turn('crank', X, c); turn('pedal_L', X, -c); turn('pedal_R', X, -c); turn('steer', Y, steer)
  }
  return { root, mesh, hull, bones, empties, wheelRadius, update, calls: ink ? 2 : 1, tris: { body: triCount(mesh.geometry), ink: hull ? triCount(hull.geometry) : 0 } }
}

// the placeholder wearing the same interface (GLB fetch failed): no empties, so no ride pose
function placeholderBike() {
  const b = createBike(), root = new THREE.Group()
  root.add(b.frame, ...b.wheels)
  return { root, bones: {}, empties: {}, wheelRadius: RIM, calls: b.calls, update({ dist, spin } = {}) { const s = spin ?? (dist != null ? dist / RIM : 0); for (const w of b.wheels) w.rotation.x = s } }
}

let pending = null
/** fetch + build once (later calls share the promise). Resolves to the GLB bike, or to the placeholder if loading fails. */
export function loadBike(url = GLB_URL) {
  if (!pending) pending = new GLTFLoader().loadAsync(url).then(g => { const b = buildBike(g); RIDE_POSE.bike = b; return b }).catch(e => { console.warn('bike: GLB failed, using the placeholder', e); return placeholderBike() })
  return pending
}

// ---------- her ride pose (POSES.ride_bike, read by GhibliPerson through st.act) ----------
// Hips drop onto the saddle, each leg is a 2-bone IK onto its pedal (so the feet follow the crank), hands reach for the bars.
export const RIDE_POSE = { bike: null, pad: 0.02, frames: 0 }
if (typeof window !== 'undefined') window.__bikeArt = RIDE_POSE // debug: the loaded bike, pose tuning, frames posed
const _a = new THREE.Vector3(), _b = new THREE.Vector3()
const rigLocal = (o, parent, out) => parent.worldToLocal(o.getWorldPosition(out))
export function legIK(L1, L2, dy, dz) {
  // hip -> ankle target (dy, dz) in the leg plane. Bone rotation.x: 0 hangs straight down, negative swings forward.
  const d = Math.min(Math.max(Math.hypot(dy, dz), Math.abs(L1 - L2) + 1e-4), L1 + L2 - 1e-4)
  const aim = Math.atan2(-dz, -dy), hip = Math.acos((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d)), knee = Math.acos((L1 * L1 + L2 * L2 - d * d) / (2 * L1 * L2))
  return { thigh: aim - hip, shin: Math.PI - knee }
}
export function rideBike(B, mix, st, t, w) {
  const bike = RIDE_POSE.bike, E = bike && bike.empties
  RIDE_POSE.frames++
  const par = B.root.parent
  if (!E || !E.seat || !par) return
  const seat = rigLocal(E.seat, par, _a), hipR = B.thL.userData.rest
  B.root.position.y += (seat.y + RIDE_POSE.pad - hipR.y - B.root.position.y) * w
  mix(B.root, 'x', 0); mix(B.hips, 'x', 0); mix(B.hips, 'y', 0); mix(B.hips, 'z', 0)
  mix(B.chest, 'x', 0.22); mix(B.chest, 'y', 0); mix(B.head, 'x', -0.12)
  for (const k of ['L', 'R']) {
    const th = B['th' + k], sh = B['sh' + k + 'n'], ft = B['ft' + k], tg = E['pedal_' + k + '_target']
    if (!tg) continue
    const kn = sh.userData.rest, an = ft.userData.rest, hp = th.userData.rest
    const L1 = Math.hypot(kn.y - hp.y, kn.z - hp.z), L2 = Math.hypot(an.y - kn.y, an.z - kn.z)
    const ped = rigLocal(tg, par, _b), hipY = hp.y + B.root.position.y
    const ik = legIK(L1, L2, ped.y + an.y * 0.8 - hipY, ped.z - hp.z)
    mix(th, 'x', ik.thigh); mix(th, 'y', 0); mix(th, 'z', 0); mix(sh, 'x', ik.shin); mix(ft, 'x', -(ik.thigh + ik.shin) * 0.8)
  }
  for (const [k, sd] of [['L', -1], ['R', 1]]) { mix(B['up' + k], 'x', -1.05); mix(B['up' + k], 'y', 0); mix(B['up' + k], 'z', sd * 0.08); mix(B['fo' + k], 'x', -0.45) }
}
POSES.ride_bike = rideBike
