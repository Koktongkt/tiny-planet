// "Cozy Chibi" her (concept B, approved by KT): the same soft-body rig as every villager (GhibliPerson Character,
// same bones, poses, props, bike IK), re-proportioned to ~2.5 heads, with a painted face decal (4 expressions in one
// canvas atlas, 1 draw) and sculpted hair clumps merged to one cel mesh + one ink hull (2 draws).
// Lazy chunk: nothing here ships in the startup bundle. Head frame used below: the head group in Character
// (origin = head centre, scale 1.17 * head), where the head ellipsoid has radii HR.
import * as THREE from 'three'
import React, { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { Character, TRAVELLER, CEL_U, M, Merge } from '../../GhibliPerson.jsx'
import { T, q } from '../../common.jsx'

const HR = [0.068 / 1.17, 0.0584 / 1.17, 0.0648 / 1.17]
const TOUCH = typeof window !== 'undefined' && matchMedia('(pointer: coarse)').matches

// ---------- face atlas (canvas, drawn once at load: no image file) ----------
// Pass 2: redrawn against the concept B close-up. Region of the face the decal covers, in head-frame units (planar front
// projection); 4 expressions in a 2x2 atlas.
const FX = 0.052, FY0 = -0.047, FY1 = 0.019
export const FACES = ['happy', 'blink', 'sleepy', 'excited']
// pass 6 (KT): features a touch smaller, higher and closer together. FT scales the tweak (1 = chosen, 1.5 = 'stronger').
const FT = 1, FDY = 0.0022 * FT, FDX = 0.0032 * FT, FS = 1 - 0.09 * FT
const EYE = { x: 0.0278 - FDX, y: -0.0153 + FDY, rx: 0.0116 * FS, ry: 0.0127 * FS }
const IRIS = { top: '#1e1410', mid: '#2a1a12', edge: '#1a110d', glow: '#6b4430' }
function drawFaces(W) {
  const H = Math.round(W * (FY1 - FY0) / (2 * FX)), c = document.createElement('canvas'); c.width = W * 2; c.height = H * 2
  const g = c.getContext('2d'), s = W / (2 * FX), INK = '#1e1410', BROW = '#3b2621'
  const el = (x, y, rx, ry, a0 = 0, a1 = Math.PI * 2, ccw = false) => g.ellipse(x, y, rx, ry, 0, a0, a1, ccw)
  const sst = (a, b, v) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t) }
  // lid(x,y,RX,RY,o): o = +1 outer side is +x (viewer-right eye), -1 outer side is -x. Tapered filled band hugging the eye ellipse.
  const lid = (x, y, RX, RY, o) => {
    const N = 40, th0 = -0.35, th1 = -Math.PI - 0.45, W = RY * 0.2, P = [], Q = []
    for (let i = 0; i <= N; i++) { const u = i / N, th = th0 + (th1 - th0) * u
      const w = W * sst(0, 0.16, u) * (1 - sst(0.6, 1, u)) * (0.78 + 0.32 * sst(0.25, 0.62, u)), c = Math.cos(th), sn = Math.sin(th)
      P.push([x - o * (RX + w * 0.35) * c, y + (RY + w * 0.35) * sn]); Q.push([x - o * (RX - w * 0.65) * c, y + (RY - w * 0.65) * sn]) }
    g.fillStyle = INK; g.beginPath(); g.moveTo(...P[0]); P.forEach(q => g.lineTo(...q)); Q.reverse().forEach(q => g.lineTo(...q)); g.closePath(); g.fill() }
  FACES.forEach((name, k) => {
    const ox = (k % 2) * W, oy = Math.floor(k / 2) * H, X = (x) => ox + (x / FX * 0.5 + 0.5) * W, Y = (y) => oy + (1 - (y - FY0) / (FY1 - FY0)) * H
    g.save(); g.beginPath(); g.rect(ox, oy, W, H); g.clip(); g.lineCap = g.lineJoin = 'round'
    // blush: round, saturated pink ovals under the outer eyes, soft rim
    for (const sd of [-1, 1]) { const x = X(sd * (0.0383 - FDX)), y = Y(-0.0319 + FDY + 0.0004 * FT), r = 0.0105 * s, gr = g.createRadialGradient(x, y, 0, x, y, r)
      gr.addColorStop(0, 'rgba(244,146,140,.9)'); gr.addColorStop(0.62, 'rgba(244,146,140,.8)'); gr.addColorStop(1, 'rgba(244,146,140,0)'); g.fillStyle = gr; g.beginPath(); el(x, y, r, r * 0.86); g.fill() }
    // brows: short, thick, softly arched, round ends, tucked just under the bangs
    const by = (name === 'excited' ? 0.0108 : name === 'sleepy' ? 0.0088 : 0.0098) + 0.0004 * FT // eye tops rise only ~0.001 (smaller eyes), brows stay under the bang tips
    g.strokeStyle = BROW; g.lineWidth = 0.0034 * s
    for (const sd of [-1, 1]) { g.beginPath(); const bx = 0.0029 * FT; g.moveTo(X(sd * (0.0192 - bx)), Y(by - 0.0015)); g.quadraticCurveTo(X(sd * (0.0261 - bx)), Y(by + 0.0031), X(sd * (0.0328 - bx)), Y(by - 0.0012)); g.stroke() }
    // eyes
    for (const sd of [-1, 1]) {
      const big = name === 'excited' ? 1.05 : 1, x = X(sd * EYE.x), y = Y(EYE.y), RX = EYE.rx * s * big, RY = EYE.ry * s * big
      if (name === 'blink' || name === 'sleepy') { // closed: a thick downward-curved lash line, tapered ends
        const yy = y + RY * (name === 'sleepy' ? 0.2 : 0.1), w = RX * (name === 'sleepy' ? 0.92 : 0.98)
        g.fillStyle = INK; g.beginPath(); g.moveTo(x - w, yy); g.quadraticCurveTo(x, yy + RY * 0.9, x + w, yy); g.quadraticCurveTo(x, yy + RY * 0.46, x - w, yy); g.fill(); continue }
      g.fillStyle = '#fffaf4'; g.beginPath(); el(x, y, RX, RY); g.fill() // white
      g.save(); g.beginPath(); el(x, y, RX, RY); g.clip()
      // pass 8 (KT): iris pushed toward the nose and narrowed so a clear white crescent shows on the outer side (~22% of the eye width at
      // mid-height, tapering top and bottom); dark iris + warm lower glow from pass 7; ONE big round highlight upper right
      const ix = x - sd * RX * 0.22, iy = y + RY * 0.02, IX = RX * 0.78, IY = RY * 0.97
      g.fillStyle = IRIS.edge; g.beginPath(); el(ix, iy, IX, IY); g.fill()
      let gr = g.createLinearGradient(0, iy - IY, 0, iy + IY); gr.addColorStop(0, IRIS.top); gr.addColorStop(0.55, IRIS.mid); gr.addColorStop(1, IRIS.mid)
      g.fillStyle = gr; g.beginPath(); el(ix, iy, IX * 0.9, IY * 0.92); g.fill()
      g.save(); g.beginPath(); el(ix, iy, IX * 0.9, IY * 0.92); g.clip()
      gr = g.createRadialGradient(ix, iy + IY * 0.7, 0, ix, iy + IY * 0.7, IX * 0.66); gr.addColorStop(0, 'rgba(107,68,48,.85)'); gr.addColorStop(0.45, 'rgba(107,68,48,.5)'); gr.addColorStop(1, 'rgba(107,68,48,0)')
      g.fillStyle = gr; g.beginPath(); el(ix, iy + IY * 0.7, IX * 0.66, IY * 0.4); g.fill()
      g.restore()
      g.fillStyle = '#fff'; g.beginPath(); el(ix + IX * 0.3, iy - IY * 0.36, RX * 0.34, RX * 0.34); g.fill() // the one highlight, top right
      g.restore()
      // soft skin boundary under the eye (no heavy line along the bottom / lower outer side)
      g.strokeStyle = 'rgba(58,34,26,.28)'; g.lineWidth = 0.0005 * s; g.beginPath(); el(x, y, RX, RY); g.stroke()
      // thick upper lid: from the nose-side top, over the top, down the outer side, tapering out a little below mid-height
      lid(x, y, RX, RY, sd)
    }
    // nose: a tiny warm dot
    g.fillStyle = 'rgba(232,148,128,.9)'; g.beginPath(); el(X(0), Y(-0.0238 + FDY + 0.0005 * FT), 0.0017 * s, 0.0011 * s); g.fill()
    // mouth: small soft u (happy / blink), little frown (sleepy), open D with tongue (excited)
    const my = -0.0351 + FDY + 0.0008 * FT // mouth rises a bit more than the eyes: tighter cluster
    if (name === 'excited') { const mouth = () => { g.beginPath(); g.moveTo(X(-0.0088), Y(my + 0.0032)); g.quadraticCurveTo(X(0), Y(my + 0.0042), X(0.0088), Y(my + 0.0032)); g.bezierCurveTo(X(0.0084), Y(my - 0.0082), X(-0.0084), Y(my - 0.0082), X(-0.0088), Y(my + 0.0032)); g.closePath() }
      mouth(); g.fillStyle = '#a3403a'; g.fill(); g.save(); g.clip(); g.fillStyle = '#ef8076'; g.beginPath(); el(X(0), Y(my - 0.0066), 0.0062 * s, 0.0036 * s); g.fill(); g.restore()
      mouth(); g.strokeStyle = '#7a2a24'; g.lineWidth = 0.0011 * s; g.stroke() }
    else { g.strokeStyle = '#c0533f'; g.lineWidth = 0.0021 * s; g.beginPath()
      if (name === 'sleepy') { g.moveTo(X(-0.0042), Y(my - 0.0012)); g.quadraticCurveTo(X(0), Y(my + 0.0026), X(0.0042), Y(my - 0.0012)) }
      else { g.moveTo(X(-0.0068), Y(my + 0.0013)); g.quadraticCurveTo(X(0), Y(my - 0.0044), X(0.0068), Y(my + 0.0013)) }
      g.stroke() }
    g.restore()
  })
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter; return t
}
let atlas = null
const faceMat = () => new THREE.ShaderMaterial({ transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4,
  uniforms: { map: { value: atlas || (atlas = drawFaces(TOUCH ? 640 : 1024)) }, uCell: { value: 0 }, uLight: CEL_U.uLight, uAmb: CEL_U.uAmb },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
  fragmentShader: `uniform sampler2D map; uniform float uCell; uniform vec3 uLight, uAmb; varying vec2 vUv;
    void main(){ vec2 u = clamp(vUv, .004, .996), cell = vec2(mod(uCell, 2.), floor(uCell*.5));
      vec4 c = texture2D(map, vec2((cell.x + u.x)*.5, (1. - cell.y + u.y)*.5)); if (c.a < .01) discard;
      gl_FragColor = vec4(c.rgb*(uLight*.92 + uAmb), c.a);
      #include <colorspace_fragment>
    }` })
// head shape in the head frame (same SDF as the baked body: head ellipsoid smooth-unioned with two mochi cheeks)
const CHEEK = [0, -0.026, 0.012, 0.05, 0.0295, 0.035, 0.016] // pass 5: one wide jaw ellipsoid (two cheek blobs left a dip / double bump at the chin), softer blend
const smin = (a, b, k) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25 }
const ell = (x, y, z, cx, cy, cz, rx, ry, rz) => { const a = (x - cx) / rx, b = (y - cy) / ry, c = (z - cz) / rz; return (Math.sqrt(a * a + b * b + c * c) - 1) * Math.min(rx, ry, rz) }
const headSDF = (x, y, z) => { const [cx, cy, cz, rx, ry, rz, k] = CHEEK
  return smin(ell(x, y, z, 0, 0, 0, ...HR), Math.min(ell(x, y, z, -cx, cy, cz, rx, ry, rz), ell(x, y, z, cx, cy, cz, rx, ry, rz)), k) }
// the decal: a grid over the face region, each vertex shot onto the head surface from the front and lifted a hair
const faceGeo = (() => { const NX = 30, NY = 22, pos = [], uv = [], ok = [], idx = []
  for (let j = 0; j <= NY; j++) for (let i = 0; i <= NX; i++) { const u = i / NX, v = j / NY, x = (u * 2 - 1) * FX, y = FY0 + v * (FY1 - FY0)
    let z = 0.09, hit = false; for (; z > -0.01; z -= 0.0008) if (headSDF(x, y, z) < 0) { hit = true; break }
    if (hit) { let a = z, b = z + 0.0008; for (let n = 0; n < 16; n++) { const m = (a + b) / 2; if (headSDF(x, y, m) < 0) a = m; else b = m } z = b + 0.0009 }
    pos.push(x, y, z); uv.push(u, v); ok.push(hit && z > 0.004) }
  for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) { const a = j * (NX + 1) + i, b = a + 1, c = a + NX + 1, d = c + 1
    if (ok[a] && ok[b] && ok[c] && ok[d]) idx.push(a, b, d, a, d, c) }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); return g })()

const EXCITED = new Set(['wave', 'play', 'reel', 'pick', 'pet', 'photo_wave', 'photo_peace', 'photo_hold_fish', 'photo_twirl', 'photo_kneel'])
function ChibiFace({ st, lod }) {
  const mat = useMemo(faceMat, []), s = useRef({ blinkT: 2, idle: 0 })
  useFrame((_, dt) => { dt = Math.min(dt, 0.05); const o = s.current
    o.idle = st.move > 0.05 || st.act ? 0 : o.idle + dt
    o.blinkT -= dt; if (o.blinkT < 0) o.blinkT = 2.4 + Math.random() * 2.6
    const forced = (typeof window !== 'undefined' && window.__chibiFace) || q.get('face')
    let e = st.act === 'nap' || (T.night > 0.7 && o.idle > 4) || o.idle > 25 ? 'sleepy' : st.act && EXCITED.has(st.act) && (st.actW ?? 1) > 0.3 ? 'excited' : 'happy'
    if (o.blinkT < 0.12 && e !== 'sleepy') e = 'blink'
    if (forced && FACES.includes(forced)) e = forced
    mat.uniforms.uCell.value = FACES.indexOf(e) })
  return <group ref={lod(2)}><mesh geometry={faceGeo} material={mat} renderOrder={2} /></group>
}

// ---------- hair: one sculpted helmet (heavy blunt bangs with a centre split, temple frames, round bob), side puffs,
// top bun and the ears, all one geometry with its own warm toon hair shader (1 draw) + the shared ink hull (1 draw).
const ss = (e0, e1, x) => { const u = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return u * u * (3 - 2 * u) }
const RH = [0.0662, 0.07, 0.0655], HC = [0, 0.003, -0.0045], TUCK = 0.85 // the hair shell ellipsoid
// Pass 3: the fringe is built from locks. Each lock is an arc of azimuth a (0 = front, -x = her right / viewer's left)
// whose lower edge is a rounded tip: y = tip + rise * (1 - sqrt(1 - u^2)), u in -1..1 across the lock. The hair edge is
// the lowest lock at each azimuth, so neighbouring locks meet in small scallop notches; where no lock reaches (the
// centre-left part, the temples, behind the side locks) the base edge shows a sliver of forehead / the ear.
// [a0, a1, tipY, rise, bulge]
// pass 4 (measured against the concept): three centre locks with small notches, then a deeper notch at |x| ~ 0.16 head
// widths, and outer locks that curve down over the temples into the side locks, so the forehead reads as a soft arch.
// [a0, a1, tipY, rise, bulge, slope]  (slope tilts the tip line across the lock: y += slope * u)
const LOCKS = [
  [-1.4, -1.08, -0.034, 0.05, 0.012], // side lock framing the face, down to the cheeks (in front of the side puff)
  [-1.12, -0.45, 0.0128, 0.012, 0.02, 0.0075], // outer lock curving down over the temple
  [-0.47, -0.14, 0.0186, 0.009, 0.024, -0.005],
  [-0.17, 0.17, 0.0184, 0.004, 0.028], // the big centre lock
  [0.14, 0.47, 0.0186, 0.009, 0.024, 0.005],
  [0.45, 1.12, 0.0128, 0.012, 0.02, -0.0075],
  [1.08, 1.4, -0.034, 0.05, 0.012]]
function baseY(t) { let y = 0.036 + (-0.004 - 0.036) * ss(0.86, 1.12, t); y += (-0.047 - y) * ss(1.3, 1.62, t); return y } // pass 4: the bob comes down right behind the side locks (no gap above the puffs)
// -> [edge y, lock bulge (shell units), groove 0..1 (1 = between locks)]
function edge(a) {
  let y = baseY(Math.abs(a)), bulge = 0, groove = 1
  for (const [a0, a1, tip, rise, bu, sl = 0] of LOCKS) { if (a < a0 || a > a1) continue
    const u = (a - a0) / (a1 - a0) * 2 - 1, c = Math.sqrt(Math.max(0, 1 - u * u)), ly = tip + rise * (1 - c) + sl * u
    bulge = Math.max(bulge, bu * Math.sqrt(c)) // pass 4: the fullest lock at this azimuth, so the shell has no ridge where locks hand over
    if (ly < y) { y = ly; groove = ss(0.62, 0.98, Math.abs(u)) } }
  return [y, bulge, groove]
}
// azimuth samples: dense across the face (crisp lock tips and the steep side-lock edges), sparse behind
const AZ = (() => { const out = []; let a = -Math.PI; while (a < Math.PI - 1e-6) { out.push(a); a += Math.abs(a) < 1.45 ? 0.038 : 0.17 } return out })()
function helmetGeo(NT = 10, NL = 5) {
  const pos = [], idx = [], gro = [], rho = 0.0033, cols = [], NA = AZ.length
  for (let i = 0; i < NA; i++) { const a = AZ[i], t = Math.abs(a), sa = Math.sin(a), ca = Math.cos(a)
    const [yE, bulge, groove] = edge(a), thE = Math.acos(Math.min(0.97, Math.max(-0.97, (yE - HC[1]) / RH[1]))), col = [], cg = []
    const P = (th) => { let st = Math.sin(th); const ct = Math.cos(th), w = ss(0.55, 1.3, th), front = ss(1.2, 0.2, t) * ss(0.55, 1.3, th) /* pass 4: by polar angle, so neighbouring locks meet without a ridge up to the crown */
      if (th > Math.PI / 2) st = 1 - 0.42 * (1 - st) // below the equator the hair hangs straight down instead of hugging the jaw
      const r = 1 + 0.026 * front + bulge * w, Q = [HC[0] + RH[0] * st * sa * r, HC[1] + RH[1] * ct * r, HC[2] + RH[2] * st * ca * r]
      // pass 4: the fringe tips come down onto the forehead (no see-through gap under the bangs, so no stray ink lines)
      const tk = TUCK * ss(thE - 0.2, thE, th) * ss(1.06, 0.72, t) /* only the tip curls in (a wider band makes flaps where locks hand over) */; if (tk <= 0) return Q
      const d = [Q[0] - HC[0], Q[1] - HC[1], Q[2] - HC[2]], L = Math.hypot(...d); d.forEach((v, i) => { d[i] = v / L })
      if (headSDF(HC[0] + d[0] * L, HC[1] + d[1] * L, HC[2] + d[2] * L) < 0) return Q
      let lo = 0, hi = L; for (let n = 0; n < 24; n++) { const m = (lo + hi) / 2; if (headSDF(HC[0] + d[0] * m, HC[1] + d[1] * m, HC[2] + d[2] * m) < 0) lo = m; else hi = m }
      const s2 = Math.max(hi + 0.0016, L - (L - hi) * 1) * (1 - tk) + (hi + 0.0016) * tk
      return [HC[0] + d[0] * s2, HC[1] + d[1] * s2, HC[2] + d[2] * s2] }
    for (let j = 1; j <= NT; j++) { const f = j / NT; col.push(P(thE * f)); cg.push(groove * ss(0.3, 0.95, f) * (t < 1.45 ? 1 : 0)) }
    // rounded lip: half a turn from the outer edge to the inside (the tips curl in)
    const E = P(thE), E2 = P(thE - 0.02), n = [E[0] - HC[0], E[1] - HC[1], E[2] - HC[2]], nl = Math.hypot(...n), dn = [E[0] - E2[0], E[1] - E2[1], E[2] - E2[2]], dl = Math.hypot(...dn)
    for (let k = 0; k < 3; k++) { n[k] /= nl; dn[k] /= dl }
    // the lip's lower half carries an ink value (aSkin 0.47..0.49 -> painted ink line along the fringe tips, as in the concept)
    const lipInk = t < 1.45 ? 1 : 0
    for (let k = 1; k <= NL; k++) { const f = Math.PI * k / NL; col.push([0, 1, 2].map(q => E[q] - n[q] * rho + n[q] * rho * Math.cos(f) + dn[q] * rho * Math.sin(f))); cg.push(lipInk ? (k === 1 ? 1.07 : 1.09) : 0) }
    col.push([0, 1, 2].map(q => E[q] - n[q] * rho * 2.4 - dn[q] * 0.006)); cg.push(lipInk ? 1.09 : 0)
    cols.push(col); gro.push(cg) }
  const R = cols[0].length; pos.push(HC[0], HC[1] + RH[1] * 1.05 * 1, HC[2]) // pole
  const g0 = [0]; for (let i = 0; i < NA; i++) for (let j = 0; j < R; j++) { pos.push(...cols[i][j]); g0.push(gro[i][j]) }
  const at = (i, j) => 1 + (i % NA) * R + j
  for (let i = 0; i < NA; i++) { idx.push(0, at(i, 0), at(i + 1, 0)) // pole fan (winding: outward)
    for (let j = 0; j < R - 1; j++) idx.push(at(i, j), at(i, j + 1), at(i + 1, j + 1), at(i, j), at(i + 1, j + 1), at(i + 1, j)) }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals()
  // aSkin carries the lock grooves for the hair (0..0.45, < 0.5 = hair); the ears use 1 = skin
  g.setAttribute('aSkin', new THREE.Float32BufferAttribute(g0.map(v => v * 0.45), 1)); return g
}
const part = (geo, [x, y, z], [sx, sy, sz], [rx, ry, rz] = [0, 0, 0], skin = 0) => { const g = new THREE.BufferGeometry(); g.setAttribute('position', geo.attributes.position.clone()); g.setIndex(geo.index.clone())
  g.scale(sx, sy, sz); g.rotateX(rx); g.rotateY(ry); g.rotateZ(rz); g.translate(x, y, z); g.computeVertexNormals()
  g.setAttribute('aSkin', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count).fill(skin), 1)); return g }
const PT = 1
const HAIR_GEO = (() => {
  const ball = new THREE.SphereGeometry(1, 18, 12), ballS = new THREE.SphereGeometry(1, 12, 9), ring = new THREE.TorusGeometry(1, 0.34, 6, 16), hel = helmetGeo()
  const parts = [hel,
    part(ball, [0, -0.008, -0.019], [0.0635, 0.054, 0.052]), // back volume of the bob
    part(ball, [0, 0.0715, -0.008], [0.0168, 0.016, 0.017]), // top bun
    part(ring, [0, 0.064, -0.007], [0.0122, 0.0122, 0.0105], [Math.PI / 2 - 0.15, 0, 0]),
    // side puffs at cheek level (pass 4: the ears are gone; the side locks cover that spot in every view, and they poked through)
    // pass 9 (KT): lower (centre near the blush/mouth line) and fuller/rounder, as on the concept. PT scales the change (1 chosen, 1.5 'stronger').
    ...[-1, 1].map(d => part(ball, [d * (0.0615 - 0.0015 * PT), -0.027 - 0.0058 * PT, -0.02 - 0.002 * PT], [0.021 * (1 + 0.19 * PT), 0.024 * (1 + 0.13 * PT), 0.022 * (1 + 0.14 * PT)]))]
  const g = mergeGeometries(parts); g.computeBoundingSphere(); return g })()
let hairShader = null
const chibiHairMat = (skin) => hairShader || (hairShader = new THREE.ShaderMaterial({
  uniforms: { uSun: CEL_U.uSun, uLight: CEL_U.uLight, uAmb: CEL_U.uAmb, uRim: CEL_U.uRim, uHair: { value: new THREE.Color('#432c22') }, uBand: { value: new THREE.Color('#7a5641') }, uSkin: { value: new THREE.Color(skin) } },
  vertexShader: `attribute float aSkin; varying vec3 vN, vV, vO; varying float vSkin;
    void main(){ vO = position; vSkin = aSkin; vec4 mv = modelViewMatrix*vec4(position,1.); vN = normalize(normalMatrix*normal); vV = -mv.xyz; gl_Position = projectionMatrix*mv; }`,
  fragmentShader: `uniform vec3 uSun, uLight, uAmb, uRim, uHair, uBand, uSkin; varying vec3 vN, vV, vO; varying float vSkin;
    void main(){ vec3 N = normalize(vN), V = normalize(vV), L = normalize((viewMatrix*vec4(uSun,0.)).xyz);
      float ndl = dot(N, L), lit = smoothstep(-.04, .12, ndl), sk = step(.5, vSkin);
      vec3 base = mix(uHair, uSkin, sk), shade = base*mix(vec3(.68,.55,.5), vec3(.86,.68,.66), sk);
      vec3 c = mix(shade, base, lit)*uLight + base*uAmb;
      // glossy toon sheen: a soft lighter band around the crown, broken into strands
      vec3 d = normalize(vO - vec3(0., .004, -.004)); float az = atan(d.x, d.z);
      float band = 1. - smoothstep(.02, .11, abs(d.y - .6 - .02*sin(az*7.) - .012*cos(az*13.)));
      c = mix(c, uBand*uLight*(.75 + .25*lit), band*(1. - sk)*(.3 + .32*lit)*smoothstep(-.2, .5, dot(N, V)));
      c *= 1. - (1. - sk)*.3*smoothstep(.1, .38, vSkin); // painted grooves between the fringe locks
      c = mix(c, vec3(.17,.1,.08), (1. - sk)*smoothstep(.455, .488, vSkin)); // ink along the fringe tips
      float fr = 1. - max(dot(N, V), 0.); c += uRim*smoothstep(.62, .92, fr)*(.2 + .5*lit)*.22;
      gl_FragColor = vec4(c, 1.);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }` }))
function ChibiHair({ set }) {
  return <group ref={set('hair')}><Merge><M geo={HAIR_GEO} mat={chibiHairMat(CHIBI.outfit.skin)} /></Merge></group>
}

// satchel (concept B): a chunky soft leather bag with a rounded flap over the front (one geometry, so still 1 cel + 1 ink)
const BAG_GEO = (() => {
  const soft = (g, r) => { const p = g.attributes.position, v = new THREE.Vector3(), h = new THREE.Vector3()
    g.computeBoundingBox(); const bb = g.boundingBox; h.subVectors(bb.max, bb.min).multiplyScalar(0.5).subScalar(r)
    for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const c = v.clone().clamp(h.clone().negate(), h), d = v.clone().sub(c); if (d.lengthSq() > 0) d.setLength(r); p.setXYZ(i, ...c.add(d).toArray()) }
    g.deleteAttribute('uv'); g.computeVertexNormals(); return g }
  const body = soft(new THREE.BoxGeometry(0.046, 0.038, 0.024, 4, 4, 3), 0.008)
  const flap = soft(new THREE.BoxGeometry(0.048, 0.024, 0.007, 4, 2, 1), 0.0034); flap.translate(0, 0.006, 0.0125); flap.rotateX(-0.06)
  const g = mergeGeometries([mergeVertices(body), mergeVertices(flap)]); g.computeBoundingSphere(); return g })()
export const CHIBI = { ...TRAVELLER, name: 'chibi-her', age: 'toddler',
  // pass 3: proportions from the concept front view (head : torso : legs ~ 42 : 36 : 22): a slightly smaller head over a
  // taller soft barrel torso, thick straight trouser legs, chunky round boots, short arms hanging close to the body
  // pass 4 arms (measured on the concept front): longer soft forearm ~70% of the puff-sleeve width, rounder mitten hands,
  // hanging a little further from the body
  body: { H: 0.89, head: 1.45, leg: 1.06, torso: 1.13, arm: 0.92, girth: 1.25, shoulder: 1.0, chestW: 1.12, bellyZ: 0.86, shX: 1.26, armA: 0.5,
    armR: [1.12, 1.4, 1.5], legR: 1.28, legX: 1.06, foot: 1.4, bootW: 1.5, bootH: 1.22, bootL: 0.98, hand: 1.2, cheek: CHEEK },
  hair: { style: 'chibi', c: '#3b2a22' },
  outfit: { ...TRAVELLER.outfit, top: '#fbf6ec', bottom: '#4f7cc4', shoe: '#7a4a2e', cuffs: '#6f98d4', bibW: 0.042, waistUp: 0.04, shoeY: 0.036 },
  walk: { rate: 11, stride: 0.55, knee: 0.8, bounce: 0.02, arm: 0.6, lean: 0.05, twist: 0.1, sway: 0.06, idle: 'contra' },
  ext: { Face: ChibiFace, Hair: ChibiHair, knot: [0, -0.023, 0.014, 1.6], ring: [1.22, 1.2, 1.2], bag: [-0.02, -0.024, 0.043, 1.3], strap: [0.82, 0.1, -0.02, 0.6, 0, 0.012], bagGeo: BAG_GEO, bagC: '#a8703f' } }
// on the bike the big chibi head would dwarf the frame: she eases down to RIDE_S while riding (the ride pose works in her
// local space, so the seat, the pedal IK and the bars still line up at any scale)
const RIDE_S = 0.8
export function ChibiHer({ st }) {
  const g = useRef()
  useFrame((_, dt) => { const o = g.current; if (!o) return; const k = st.act === 'ride_bike' ? RIDE_S : 1, s = o.scale.x
    if (Math.abs(k - s) > 1e-4) o.scale.setScalar(s + (k - s) * Math.min(1, Math.min(dt, 0.05) * 8)) })
  return <group ref={g}><Character cfg={CHIBI} st={st} res={80} /></group>
}
