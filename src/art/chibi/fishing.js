// Her fishing (anim pass 5, KT): a rod in her hands for the whole session, a real cast (wind up over the shoulder,
// snap forward, the line and bobber fly out and land on the water), then a pose for each phase of the reel game:
// wait (tip bobbing), bite (tip yanked down, she leans in), reel (lean back, cranking, rod fighting the fish),
// caught (rod whips up) or slipped (slack line, a little slump). Lazy chunk (her module).
// Phase source: the cast is act 'cast' with item 'rod' (World.jsx); the rest is the reel game's window.__fishSt.state
// while G.ui.fish is open; the landing is act 'reel' with item 'caught' | 'slipped'. Studio: window.__herFish = { phase, k }.
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { planetRef } from '../../common.jsx'
import { R, LAKE_W, HARB_W } from '../../world.js'

const sst = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t) }
const lerp = (a, b, k) => a + (b - a) * k
export const ROD_L = 0.27 // rod length in her body units (she is ~0.37 tall)
export const CAST_DUR = 1.5

// ---- which phase she is in ----
export function fishPhase(st) {
  const w = typeof window !== 'undefined' ? window : {}
  if (w.__herFish) return w.__herFish
  if (st.act === 'cast' && st.actItem === 'rod') return { phase: 'cast', k: Math.min(1, (st.actT || 0) / (st.actDur || CAST_DUR)) }
  if (st.act === 'reel' && (st.actItem === 'caught' || st.actItem === 'slipped')) return { phase: st.actItem, k: Math.min(1, (st.actT || 0) / (st.actDur || 0.9)) }
  const f = w.__game?.G?.ui?.fish, s = w.__fishSt
  if (f && s) return { phase: s.state === 'cast' ? 'wait' : s.state, prog: s.prog || 0, fx: s.fx ?? 0.5, hold: !!s.holding }
  return null
}

// ---- the pose (called from ext.life after the life layer; additive easing toward the targets by the session weight) ----
export function fishPose(F, B, st, dt, t, L) {
  const P = F ? F.phase : null, k = F?.k ?? 0
  L.fw = (L.fw ?? 0) + ((P ? 1 : 0) - (L.fw ?? 0)) * Math.min(1, dt * (P ? 7 : 4)); const w = L.fw
  st.fishing = w > 0.02; if (!st.fishing) { L.rodP = 0.35; return }
  const m = (o, a, v) => { o.rotation[a] += (v - o.rotation[a]) * w }
  // rod pitch (rad above horizontal, in her root frame), set per phase; the rod is posed from it in fishPost
  let rp = 0.45, ry = 0, lean = 0.02, twist = 0, upR = -0.95, foR = -0.55, zR = 0.12, upL = -0.75, foL = -1.15, zL = -0.38, head = 0.06, mood = null
  if (P === 'cast') {
    const grip = sst(0, 0.12, k), back = sst(0.12, 0.46, k), snap = sst(0.5, 0.6, k), settle = sst(0.62, 0.95, k)
    const wind = back * (1 - snap) // 1 = fully wound up
    rp = lerp(lerp(0.45, 2.05, wind), lerp(0.05, 0.45, settle), snap) // tip back over her shoulder, then whipped forward, then up to rest
    ry = -0.55 * wind // wound up, the rod sits over her right shoulder (clear of her head and hair)
    upR = lerp(-0.95, -2.55, wind) * (1 - snap) + lerp(-1.25, -0.95, settle) * snap; foR = lerp(-0.55, -1.15, wind) * (1 - snap) + -0.25 * snap * (1 - settle) + -0.55 * snap * settle
    zR = lerp(0.12, 0.35, wind); upL = lerp(-0.75, -0.25, wind); foL = lerp(-1.15, -0.6, wind); zL = lerp(-0.38, -0.1, wind)
    lean = lerp(-0.1 * wind, 0.14 * (1 - settle) + 0.03, snap); twist = lerp(-0.35 * wind, 0.15 * (1 - settle), snap); head = lerp(-0.1 * wind, 0.12, snap)
    mood = wind > 0.4 ? 'strain' : snap > 0.5 ? 'wow' : null
    st.footBack = wind * (1 - snap)
  } else if (P === 'wait') { rp = 0.45 + 0.04 * Math.sin(t * 1.7); head = 0.1 + 0.02 * Math.sin(t * 0.7) }
  else if (P === 'bite') { const yank = Math.max(0, Math.sin(t * 15)) * 0.25; rp = 0.2 - yank; lean = 0.1; head = 0.16; upR = -1.0; foR = -0.45; mood = 'wow' }
  else if (P === 'reel') { const pull = Math.sin(t * 6) * 0.1, side = ((F.fx ?? 0.5) - 0.5) * 0.8
    rp = 0.85 + pull + (F.hold ? 0.12 : 0); ry = side; lean = -0.12 - (F.hold ? 0.06 : 0); twist = -side * 0.3; upR = -1.15; foR = -0.9; upL = -0.85; foL = -1.2 + 0.25 * Math.sin(t * 14); zL = -0.3 + 0.1 * Math.cos(t * 14); head = 0.02; mood = 'strain' }
  else if (P === 'caught') { const up = sst(0, 0.35, k); rp = lerp(0.85, 1.45, up); lean = -0.08; upR = -1.5; foR = -1.05; upL = -1.4; foL = -1.2; head = -0.06; mood = 'wow'; st.hop = Math.sin(Math.min(1, k * 1.6) * Math.PI) }
  else if (P === 'slipped') { const sl = sst(0, 0.3, k); rp = lerp(0.85, 0.25, sl); lean = 0.08 * sl; head = 0.2 * sl; upR = -0.85; foR = -0.45 }
  L.rodP = rp; L.rodY = ry; st.actMood = mood
  m(B.upR, 'x', upR); m(B.foR, 'x', foR); m(B.upR, 'z', zR); m(B.upL, 'x', upL); m(B.foL, 'x', foL); m(B.upL, 'z', zL)
  m(B.chest, 'y', twist); m(B.root, 'x', lean); m(B.chest, 'x', lean * 0.6); B.head.rotation.x += (head - 0.04) * w
  if (st.footBack) { B.thR.rotation.x += 0.35 * st.footBack * w; B.thL.rotation.x -= 0.2 * st.footBack * w } st.footBack = 0
  if (st.hop) { B.root.position.y += 0.008 * st.hop * w } st.hop = 0
}

// ---- rod geometry: cork grip, a little reel, a tapered blank with two guides and a red tip (one mesh) ----
let ROD = null
function rodGeo() {
  if (ROD) return ROD
  const col = (g, hex) => { const c = new THREE.Color(hex), n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) a.set([c.r, c.g, c.b], i * 3); g.setAttribute('color', new THREE.BufferAttribute(a, 3)); g.setAttribute('aKind', new THREE.BufferAttribute(new Float32Array(n), 1)); g.deleteAttribute('uv'); return g.toNonIndexed() }
  const cyl = (r0, r1, len, z0, hex, seg = 8) => { const g = new THREE.CylinderGeometry(r1, r0, len, seg, 1); g.rotateX(Math.PI / 2); g.translate(0, 0, z0 + len / 2); return col(g, hex) }
  const parts = [cyl(0.0058, 0.0052, 0.05, -0.02, '#c9955a'), cyl(0.004, 0.0034, 0.012, 0.03, '#4a3426'),
    cyl(0.0032, 0.0011, ROD_L - 0.042, 0.042, '#7a4a2e'), cyl(0.0014, 0.0011, 0.012, ROD_L - 0.012, '#d9503f')]
  const reel = new THREE.CylinderGeometry(0.009, 0.009, 0.007, 12); reel.rotateZ(Math.PI / 2); reel.translate(0, -0.011, 0.012); parts.push(col(reel, '#b9c2c9'))
  const knob = new THREE.SphereGeometry(0.0028, 6, 4); knob.translate(0.006, -0.016, 0.012); parts.push(col(knob, '#f2b33d'))
  for (const z of [0.11, 0.19]) { const r = new THREE.TorusGeometry(0.0028, 0.0007, 4, 8); r.translate(0, -0.0038, z); parts.push(col(r, '#d9d2c4')) }
  const g = mergeGeometries(parts); g.computeVertexNormals(); g.computeBoundingSphere(); ROD = g; return g
}

const _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _a = new THREE.Vector3(), _b = new THREE.Vector3(), _f = new THREE.Vector3(), _up = new THREE.Vector3()
const BOB_N = 20

// ---- the rod in her right hand: oriented each frame in her root frame (pitch rodP, yaw rodY), so the cast reads cleanly ----
export function makeFishing(celMat, inkMat) {
  const rod = new THREE.Group(), body = new THREE.Mesh(rodGeo(), celMat), ink = new THREE.Mesh(rodGeo(), inkMat); rod.add(body, ink); rod.visible = false
  const lineGeo = new THREE.BufferGeometry(); lineGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array((BOB_N + 1) * 3), 3))
  const line = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color: '#fbf8f0' })); line.frustumCulled = false; line.visible = false
  const bob = new THREE.Group(), red = new THREE.Mesh(new THREE.SphereGeometry(0.009, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#e0503f' })), wht = new THREE.Mesh(new THREE.SphereGeometry(0.009, 10, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#fbf6ec' }))
  bob.add(red, wht); bob.scale.setScalar(2.2); bob.visible = false
  return { rod, line, bob, tgt: new THREE.Vector3(), from: new THREE.Vector3(), land: 0, has: false }
}

/** after her pose: hold the rod in her right fist, string the line from the tip to the bobber, fly / bob / pull the bobber */
export function fishPost(FS, B, F, L, t, dt, root) {
  const w = L.fw ?? 0, vis = w > 0.02; FS.rod.visible = FS.line.visible = FS.bob.visible = vis; if (!vis) { FS.has = false; return }
  // rod: hand position is the rod group's origin (it is a child of the forearm at the hand); orient it in the root frame
  root.updateWorldMatrix(true, false); B.foR.updateWorldMatrix(true, false)
  root.getWorldQuaternion(_q); _e.set(-(L.rodP ?? 0.45), L.rodY ?? 0, 0, 'YXZ'); _q2.setFromEuler(_e); _q.multiply(_q2)
  B.foR.getWorldQuaternion(_q2).invert(); FS.rod.quaternion.copy(_q2.multiply(_q)); FS.rod.updateWorldMatrix(true, false)
  const tip = _a.set(0, 0, ROD_L).applyMatrix4(FS.rod.matrixWorld)
  // target on the water: the fishing spot, else (studio) a point ahead of her on the ground
  root.getWorldPosition(_b); _up.set(0, 1, 0).applyQuaternion(root.getWorldQuaternion(_q)); _f.set(0, 0, 1).applyQuaternion(_q)
  const sp = typeof window !== 'undefined' && window.__game?.G?.ui?.fish && window.__layout?.spots?.find(s => s.id === window.__game.G.ui.fish.spot)
  if (sp && sp.n && planetRef.current) { const wl = sp.zone === 'harbour' ? HARB_W : sp.zone === 'lake' ? LAKE_W : null // float on the water surface (the spot itself sits under it)
    FS.tgt.copy(sp.n).multiplyScalar(wl != null ? R + wl + 0.004 : sp.pos.length()).applyMatrix4(planetRef.current.matrixWorld) }
  else if (!FS.has || !sp) FS.tgt.copy(_b).addScaledVector(_f, 0.62)
  FS.has = true
  const P = F ? F.phase : 'wait', k = F?.k ?? 1, bp = _v
  let sag = 0.05
  if (P === 'cast') { const fly = sst(0.56, 0.92, k)
    if (fly <= 0) { bp.copy(tip).addScaledVector(_up, -0.03); sag = 0 } // hanging at the tip while she winds up
    else { bp.copy(tip).lerp(FS.tgt, fly).addScaledVector(_up, Math.sin(fly * Math.PI) * 0.16); sag = 0.02 * fly }
    if (k > 0.92 && FS.land < 0.5) FS.land = 1 }
  else if (P === 'caught') { const up = sst(0, 0.5, k); bp.copy(FS.tgt).lerp(tip, up * 0.85).addScaledVector(_up, Math.sin(up * Math.PI) * 0.1 - 0.03 * up); sag = 0.01 }
  else if (P === 'reel') { bp.copy(FS.tgt).lerp(_b, 0.5 * (F.prog || 0)).addScaledVector(_up, -0.004 + 0.003 * Math.sin(t * 9)); sag = 0.004 }
  else if (P === 'bite') { bp.copy(FS.tgt).addScaledVector(_up, -0.008 - 0.006 * Math.max(0, Math.sin(t * 15))); sag = 0.012 }
  else if (P === 'slipped') { bp.copy(FS.tgt).addScaledVector(_up, 0.002 * Math.sin(t * 3)); sag = 0.09 }
  else { bp.copy(FS.tgt).addScaledVector(_up, 0.003 * Math.sin(t * 2.4)); sag = 0.05 }
  if (P !== 'cast') FS.land = 0
  FS.bob.position.copy(bp); FS.bob.quaternion.copy(root.getWorldQuaternion(_q))
  // line: tip -> bobber with a parabolic sag (planet-local "down")
  const arr = FS.line.geometry.attributes.position.array
  for (let i = 0; i <= BOB_N; i++) { const u = i / BOB_N; const x = tip.x + (bp.x - tip.x) * u, y = tip.y + (bp.y - tip.y) * u, z = tip.z + (bp.z - tip.z) * u, s = -4 * sag * u * (1 - u)
    arr[i * 3] = x + _up.x * s; arr[i * 3 + 1] = y + _up.y * s; arr[i * 3 + 2] = z + _up.z * s }
  FS.line.geometry.attributes.position.needsUpdate = true
}
