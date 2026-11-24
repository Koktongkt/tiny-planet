// Her watering (anim pass 6): a watering can in her hands with a real stream of water.
// Pour (garden beds, house plants): lift the can in front with both hands (right on the top handle, left under the
// spout side), tip it forward, sweep gently over the plants while the water pours from the rose, then tip it back.
// Fill (the waterfall / pools, gather item 'water'): crouch, dip the can, lift it heavy and dripping.
// The can hangs from her right fist through the shared ext.HandR hook and is oriented in her root frame each frame
// (pitch canP, yaw canY), like the fishing rod. Droplets are one InstancedMesh in world space (1 draw).
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

const sst = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t) }
const lerp = (a, b, k) => a + (b - a) * k

export function waterPhase(st) {
  const w = typeof window !== 'undefined' ? window : {}
  if (w.__herWater) return w.__herWater
  if (st.act !== 'water') return null
  return { phase: st.actItem === 'water' ? 'fill' : 'pour', k: Math.min(1, (st.actT || 0) / (st.actDur || 1.8)), dur: st.actDur || 1.8 }
}

export function waterPose(Wt, B, st, dt, t, L) {
  const P = Wt ? Wt.phase : null, k = Wt?.k ?? 0
  L.ww = (L.ww ?? 0) + ((P ? 1 : 0) - (L.ww ?? 0)) * Math.min(1, dt * (P ? 9 : 5)); const w = L.ww
  if (w < 0.02) { L.canP = 0; L.pour = 0; return }
  const m = (o, a, v) => { o.rotation[a] += (v - o.rotation[a]) * w }
  let canP = 0, canY = 0, pour = 0, lean = 0.04, head = 0.15, upR = -1.2, foR = -0.45, zR = -0.22, upL = -1.05, foL = -0.85, zL = 0.55, mood = null
  if (P === 'pour') {
    const up = sst(0, 0.18, k), tip = sst(0.15, 0.32, k) * (1 - sst(0.84, 0.97, k)), sweep = Math.sin((t || 0) * 2.4) * 0.28 * tip
    canP = -0.75 * tip; canY = sweep; pour = sst(0.55, 1, tip)
    upR = lerp(-0.6, -1.3, up) + 0.1 * tip; foR = lerp(-0.3, -0.45, up); zR = lerp(0.05, -0.45, up); upL = lerp(-0.4, -1.0, up); foL = lerp(-0.6, -0.75, up); zL = lerp(0.2, 0.85, up)
    lean = 0.04 + 0.08 * tip; head = 0.18 + 0.12 * tip; mood = tip > 0.4 ? 'calm' : null
    B.chest.rotation.y += sweep * 0.5 * w
  } else if (P === 'fill') {
    const dip = sst(0, 0.25, k) * (1 - sst(0.55, 0.78, k)), lift = sst(0.58, 0.85, k)
    const c = 0.9 * dip; B.root.position.y -= 0.07 * c * w // crouch to dip the can
    m(B.thL, 'x', -1.2 * c); m(B.shLn, 'x', 1.5 * c); m(B.thR, 'x', -0.5 * c); m(B.shRn, 'x', 1.0 * c)
    canP = -1.0 * dip; canY = 0.5 * dip; upR = lerp(-1.25, -0.95, lift); foR = lerp(-0.2, -0.55, lift); upL = lerp(-0.5, -0.9, lift); foL = lerp(-0.7, -0.95, lift)
    lean = 0.3 * dip + 0.02; head = 0.38 * dip + 0.1; mood = lift > 0.2 && lift < 0.9 ? 'strain' : dip > 0.5 ? null : 'wow'
    L.drip = lift > 0.3 ? 1 : 0
  }
  L.canP = canP; L.canY = canY; L.pour = P === 'pour' ? pour : 0; if (P !== 'fill') L.drip = 0
  if (mood) st.actMood = mood
  m(B.upR, 'x', upR); m(B.foR, 'x', foR); m(B.upR, 'z', zR); m(B.upL, 'x', upL); m(B.foL, 'x', foL); m(B.upL, 'z', zL)
  m(B.root, 'x', lean); m(B.chest, 'x', lean * 0.8); B.head.rotation.x += (head - 0.05) * w
}

// ---- the can: grip at the origin (top handle), body below, spout forward and up with a brass rose ----
let CAN = null
const SPOUT_TIP = new THREE.Vector3(0, -0.012, 0.098)
function canGeo() {
  if (CAN) return CAN
  const col = (g, hex) => { const c = new THREE.Color(hex), n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) a.set([c.r, c.g, c.b], i * 3); g.setAttribute('color', new THREE.BufferAttribute(a, 3)); g.setAttribute('aKind', new THREE.BufferAttribute(new Float32Array(n), 1)); g.deleteAttribute('uv'); return g.toNonIndexed() }
  const body = new THREE.CylinderGeometry(0.03, 0.033, 0.048, 16, 1); body.translate(0, -0.05, 0)
  const top = new THREE.SphereGeometry(0.03, 16, 6, 0, Math.PI * 2, 0, Math.PI / 2); top.scale(1, 0.35, 1); top.translate(0, -0.026, 0)
  const rim = new THREE.TorusGeometry(0.031, 0.003, 6, 18); rim.rotateX(Math.PI / 2); rim.translate(0, -0.073, 0)
  const band = new THREE.TorusGeometry(0.0305, 0.0022, 6, 18); band.rotateX(Math.PI / 2); band.translate(0, -0.04, 0)
  const handle = new THREE.TorusGeometry(0.024, 0.0045, 6, 14, Math.PI); handle.rotateY(Math.PI / 2); handle.scale(1, 0.75, 1); handle.translate(0, -0.024, 0) // over the top, front to back
  const spout = new THREE.CylinderGeometry(0.0045, 0.008, 0.075, 8, 1); spout.translate(0, 0.0375, 0); spout.rotateX(1.0); spout.translate(0, -0.062, 0.025)
  const rose = new THREE.CylinderGeometry(0.011, 0.005, 0.014, 10, 1); rose.translate(0, 0.007, 0); rose.rotateX(1.0); rose.translate(SPOUT_TIP.x, SPOUT_TIP.y - 0.008, SPOUT_TIP.z - 0.006)
  const g = mergeGeometries([col(body, '#6fb3a8'), col(top, '#62a296'), col(rim, '#4d8a80'), col(band, '#4d8a80'), col(handle, '#4d8a80'), col(spout, '#6fb3a8'), col(rose, '#d9a441')])
  g.computeVertexNormals(); g.computeBoundingSphere(); CAN = g; return g
}

const N = 70, _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _e = new THREE.Euler(), _a = new THREE.Vector3(), _b = new THREE.Vector3(), _d = new THREE.Vector3(), _up = new THREE.Vector3(), _s = new THREE.Vector3(), _m = new THREE.Matrix4(), _one = new THREE.Vector3()
export function makeWatering(celMat, inkMat) {
  const can = new THREE.Group(); can.add(new THREE.Mesh(canGeo(), celMat), new THREE.Mesh(canGeo(), inkMat)); can.visible = false
  const drops = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 6, 4), new THREE.MeshBasicMaterial({ color: '#7fc8ea' }), N)
  drops.frustumCulled = false; drops.visible = false; drops.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
  const P = Array.from({ length: N }, () => ({ p: new THREE.Vector3(), v: new THREE.Vector3(), life: 0 }))
  for (let i = 0; i < N; i++) { _m.makeScale(0, 0, 0); drops.setMatrixAt(i, _m) }
  return { can, drops, P, acc: 0, head: 0 }
}

export function waterPost(WS, B, L, dt, root) {
  const w = L.ww ?? 0, vis = w > 0.02; WS.can.visible = vis
  if (vis) {
    root.updateWorldMatrix(true, false); B.foR.updateWorldMatrix(true, false)
    root.getWorldQuaternion(_q); _e.set(-(L.canP ?? 0), L.canY ?? 0, 0, 'YXZ'); _q2.setFromEuler(_e); _q.multiply(_q2)
    B.foR.getWorldQuaternion(_q2).invert(); WS.can.quaternion.copy(_q2.multiply(_q)); WS.can.updateWorldMatrix(true, false)
  }
  // droplets: spawn at the rose while pouring (or a slow drip from a full can), fall with gravity, fade at the ground
  const rate = vis ? (L.pour || 0) * 80 + (L.drip || 0) * 6 : 0; let alive = 0
  root.getWorldScale(_s); const ws = _s.y, g = 1.9 * ws
  _up.set(0, 1, 0).applyQuaternion(root.getWorldQuaternion(_q)); root.getWorldPosition(_b)
  if (rate > 0) { WS.acc += rate * dt; WS.can.updateWorldMatrix(true, false); const tip = _a.copy(SPOUT_TIP).applyMatrix4(WS.can.matrixWorld)
    _d.set(0, 0.6, 0.8).transformDirection(WS.can.matrixWorld) // out of the rose, along the spout
    while (WS.acc >= 1) { WS.acc -= 1; const o = WS.P[WS.head]; WS.head = (WS.head + 1) % N
      o.p.copy(tip); o.v.copy(_d).multiplyScalar((L.pour ? 0.32 : 0.02) * ws).add(_one.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(0.06 * ws)); o.life = 0.9 } }
  else WS.acc = 0
  for (let i = 0; i < N; i++) { const o = WS.P[i]
    if (o.life > 0) { o.v.addScaledVector(_up, -g * dt); o.p.addScaledVector(o.v, dt); o.life -= dt
      if (_one.copy(o.p).sub(_b).dot(_up) < 0.004 * ws) o.life = 0 }
    const r = o.life > 0 ? 0.0065 * ws * Math.min(1, o.life * 3) : 0; if (r > 0) alive++
    _m.makeScale(r, r, r).setPosition(o.p); WS.drops.setMatrixAt(i, _m) }
  WS.drops.instanceMatrix.needsUpdate = true; WS.drops.visible = alive > 0
}
