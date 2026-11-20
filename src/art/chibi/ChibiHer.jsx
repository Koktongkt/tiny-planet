// "Cozy Chibi" her (concept B, approved by KT): the same soft-body rig as every villager (GhibliPerson Character,
// same bones, poses, props, bike IK), re-proportioned to ~2.5 heads, with a painted face decal (4 expressions in one
// canvas atlas, 1 draw) and sculpted hair clumps merged to one cel mesh + one ink hull (2 draws).
// Lazy chunk: nothing here ships in the startup bundle. Head frame used below: the head group in Character
// (origin = head centre, scale 1.17 * head), where the head ellipsoid has radii HR.
import * as THREE from 'three'
import React, { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { Character, TRAVELLER, CEL_U, M, Merge } from '../../GhibliPerson.jsx'
import { T, q } from '../../common.jsx'

const HR = [0.068 / 1.17, 0.0584 / 1.17, 0.0648 / 1.17]
const TOUCH = typeof window !== 'undefined' && matchMedia('(pointer: coarse)').matches

// ---------- face atlas (canvas, drawn once at load: no image file) ----------
// Pass 2: redrawn against the concept B close-up. Region of the face the decal covers, in head-frame units (planar front
// projection); 4 expressions in a 2x2 atlas.
const FX = 0.052, FY0 = -0.047, FY1 = 0.019
export const FACES = ['happy', 'blink', 'sleepy', 'excited']
const EYE = { x: 0.0255, y: -0.0148, rx: 0.0116, ry: 0.0127 }
function drawFaces(W) {
  const H = Math.round(W * (FY1 - FY0) / (2 * FX)), c = document.createElement('canvas'); c.width = W * 2; c.height = H * 2
  const g = c.getContext('2d'), s = W / (2 * FX), INK = '#2a1a14', BROW = '#3b2621'
  const el = (x, y, rx, ry, a0 = 0, a1 = Math.PI * 2, ccw = false) => g.ellipse(x, y, rx, ry, 0, a0, a1, ccw)
  FACES.forEach((name, k) => {
    const ox = (k % 2) * W, oy = Math.floor(k / 2) * H, X = (x) => ox + (x / FX * 0.5 + 0.5) * W, Y = (y) => oy + (1 - (y - FY0) / (FY1 - FY0)) * H
    g.save(); g.beginPath(); g.rect(ox, oy, W, H); g.clip(); g.lineCap = g.lineJoin = 'round'
    // blush: round, saturated pink ovals under the outer eyes, soft rim
    for (const sd of [-1, 1]) { const x = X(sd * 0.0352), y = Y(-0.0306), r = 0.0089 * s, gr = g.createRadialGradient(x, y, 0, x, y, r)
      gr.addColorStop(0, 'rgba(244,146,140,.9)'); gr.addColorStop(0.62, 'rgba(244,146,140,.8)'); gr.addColorStop(1, 'rgba(244,146,140,0)'); g.fillStyle = gr; g.beginPath(); el(x, y, r, r * 0.86); g.fill() }
    // brows: short, thick, softly arched, round ends, tucked just under the bangs
    const by = name === 'excited' ? 0.0108 : name === 'sleepy' ? 0.0088 : 0.0098
    g.strokeStyle = BROW; g.lineWidth = 0.0026 * s
    for (const sd of [-1, 1]) { g.beginPath(); g.moveTo(X(sd * 0.0186), Y(by - 0.0016)); g.quadraticCurveTo(X(sd * 0.0262), Y(by + 0.0032), X(sd * 0.0336), Y(by - 0.0012)); g.stroke() }
    // eyes
    for (const sd of [-1, 1]) {
      const big = name === 'excited' ? 1.05 : 1, x = X(sd * EYE.x), y = Y(EYE.y), RX = EYE.rx * s * big, RY = EYE.ry * s * big
      if (name === 'blink' || name === 'sleepy') { // closed: a thick downward-curved lash line, tapered ends
        const yy = y + RY * (name === 'sleepy' ? 0.2 : 0.1), w = RX * (name === 'sleepy' ? 0.92 : 0.98)
        g.fillStyle = INK; g.beginPath(); g.moveTo(x - w, yy); g.quadraticCurveTo(x, yy + RY * 0.9, x + w, yy); g.quadraticCurveTo(x, yy + RY * 0.46, x - w, yy); g.fill(); continue }
      g.fillStyle = '#fffaf4'; g.beginPath(); el(x, y, RX, RY); g.fill() // white
      g.save(); g.beginPath(); el(x, y, RX, RY); g.clip()
      const ix = x - sd * RX * 0.13, iy = y + RY * 0.07, IX = RX * 0.8, IY = RY * 0.9 // big dark iris, set toward the nose
      g.fillStyle = '#2a1912'; g.beginPath(); el(ix, iy, IX, IY); g.fill()
      g.fillStyle = '#6b4330'; g.beginPath(); el(ix, iy + IY * 0.3, IX * 0.84, IY * 0.62); g.fill() // warm brown lower crescent
      g.fillStyle = '#2a1912'; g.beginPath(); el(ix, iy + IY * 0.08, IX * 0.8, IY * 0.64); g.fill()
      g.fillStyle = '#fff'; g.beginPath(); el(ix + IX * 0.33, iy - IY * 0.38, IX * 0.34, IX * 0.34); g.fill() // big highlight, top right
      g.beginPath(); el(ix - IX * 0.4, iy + IY * 0.42, IX * 0.13, IX * 0.13); g.fill() // small one, lower left
      if (name === 'excited') { g.beginPath(); el(ix + IX * 0.05, iy + IY * 0.05, IX * 0.08, IX * 0.08); g.fill() }
      g.restore()
      g.strokeStyle = INK; g.lineWidth = 0.0009 * s; g.beginPath(); el(x, y, RX, RY); g.stroke() // clean outline
      const a0 = sd < 0 ? Math.PI - 0.2 : Math.PI + 0.3, a1 = sd < 0 ? Math.PI * 2 - 0.3 : Math.PI * 2 + 0.2 // thick upper lid, heavier at the outer corner
      g.fillStyle = INK; g.beginPath(); el(x, y, RX * 1.05, RY * 1.06, a0, a1); el(x, y + RY * 0.1, RX * 0.97, RY * 0.95, a1, a0, true); g.closePath(); g.fill()
    }
    // nose: a tiny warm dot
    g.fillStyle = 'rgba(232,148,128,.9)'; g.beginPath(); el(X(0), Y(-0.0238), 0.0017 * s, 0.0011 * s); g.fill()
    // mouth: small soft u (happy / blink), little frown (sleepy), open D with tongue (excited)
    const my = -0.0331
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
const CHEEK = [0.011, -0.021, 0.014, 0.034, 0.031, 0.035, 0.012] // pass 3: a soft U (front fullness + round chin), no side puff
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
const RH = [0.0662, 0.0605, 0.0655], HC = [0, 0.0035, -0.0045] // the hair shell ellipsoid
// Pass 3: the fringe is built from locks. Each lock is an arc of azimuth a (0 = front, -x = her right / viewer's left)
// whose lower edge is a rounded tip: y = tip + rise * (1 - sqrt(1 - u^2)), u in -1..1 across the lock. The hair edge is
// the lowest lock at each azimuth, so neighbouring locks meet in small scallop notches; where no lock reaches (the
// centre-left part, the temples, behind the side locks) the base edge shows a sliver of forehead / the ear.
// [a0, a1, tipY, rise, bulge]
const LOCKS = [
  [-1.26, -0.93, -0.034, 0.05, 0.012], // side lock framing the face, down to the cheeks (in front of the side puff)
  [-1.0, -0.44, 0.0232, 0.0062, 0.02], // outer lock sweeping into the side lock
  [-0.47, -0.15, 0.0216, 0.0052, 0.024],
  [-0.07, 0.34, 0.0204, 0.0062, 0.028], // the big centre lock (the part sits just to its left, viewer's view)
  [0.3, 0.98, 0.0229, 0.0064, 0.02],
  [0.93, 1.26, -0.034, 0.05, 0.012]]
function baseY(t) { let y = 0.036 + (-0.004 - 0.036) * ss(0.86, 1.12, t); y += (-0.047 - y) * ss(1.45, 2.1, t); return y }
// -> [edge y, lock bulge (shell units), groove 0..1 (1 = between locks)]
function edge(a) {
  let y = baseY(Math.abs(a)), bulge = 0, groove = 1
  for (const [a0, a1, tip, rise, bu] of LOCKS) { if (a < a0 || a > a1) continue
    const u = (a - a0) / (a1 - a0) * 2 - 1, c = Math.sqrt(Math.max(0, 1 - u * u)), ly = tip + rise * (1 - c)
    if (ly < y) { y = ly; bulge = bu * Math.sqrt(c); groove = ss(0.62, 0.98, Math.abs(u)) } }
  return [y, bulge, groove]
}
// azimuth samples: dense across the face (crisp lock tips and the steep side-lock edges), sparse behind
const AZ = (() => { const out = []; let a = -Math.PI; while (a < Math.PI - 1e-6) { out.push(a); a += Math.abs(a) < 1.45 ? 0.034 : 0.1 } return out })()
function helmetGeo(NT = 13, NL = 5) {
  const pos = [], idx = [], gro = [], rho = 0.0033, cols = [], NA = AZ.length
  for (let i = 0; i < NA; i++) { const a = AZ[i], t = Math.abs(a), sa = Math.sin(a), ca = Math.cos(a)
    const [yE, bulge, groove] = edge(a), thE = Math.acos(Math.min(0.97, Math.max(-0.97, (yE - HC[1]) / RH[1]))), col = [], cg = []
    const P = (th) => { let st = Math.sin(th); const ct = Math.cos(th), w = ss(0.42, 1, th / thE), front = ss(1.2, 0.2, t) * ss(0.45, 1, th / thE)
      if (th > Math.PI / 2) st = 1 - 0.42 * (1 - st) // below the equator the hair hangs straight down instead of hugging the jaw
      const r = 1 + 0.026 * front + bulge * w; return [HC[0] + RH[0] * st * sa * r, HC[1] + RH[1] * ct * r, HC[2] + RH[2] * st * ca * r] }
    for (let j = 1; j <= NT; j++) { const f = j / NT; col.push(P(thE * f)); cg.push(groove * ss(0.3, 0.95, f) * (t < 1.45 ? 1 : 0)) }
    // rounded lip: half a turn from the outer edge to the inside (the tips curl in)
    const E = P(thE), E2 = P(thE - 0.02), n = [E[0] - HC[0], E[1] - HC[1], E[2] - HC[2]], nl = Math.hypot(...n), dn = [E[0] - E2[0], E[1] - E2[1], E[2] - E2[2]], dl = Math.hypot(...dn)
    for (let k = 0; k < 3; k++) { n[k] /= nl; dn[k] /= dl }
    for (let k = 1; k <= NL; k++) { const f = Math.PI * k / NL; col.push([0, 1, 2].map(q => E[q] - n[q] * rho + n[q] * rho * Math.cos(f) + dn[q] * rho * Math.sin(f))); cg.push(groove * (t < 1.45 ? 1 : 0)) }
    col.push([0, 1, 2].map(q => E[q] - n[q] * rho * 2.4 - dn[q] * 0.006)); cg.push(0)
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
const HAIR_GEO = (() => {
  const ball = new THREE.SphereGeometry(1, 18, 12), ballS = new THREE.SphereGeometry(1, 12, 9), ring = new THREE.TorusGeometry(1, 0.34, 6, 16), hel = helmetGeo()
  const parts = [hel,
    part(ball, [0, -0.008, -0.019], [0.0635, 0.054, 0.052]), // back volume of the bob
    part(ball, [0, 0.0695, -0.008], [0.0198, 0.0168, 0.0188]), // top bun
    part(ring, [0, 0.0605, -0.007], [0.0128, 0.0128, 0.011], [Math.PI / 2 - 0.15, 0, 0]),
    ...[-1, 1].flatMap(d => [part(ball, [d * 0.066, -0.034, -0.022], [0.0215, 0.0245, 0.0225]), // side puffs at cheek level
      part(ballS, [d * 0.0555, -0.0155, 0.0125], [0.0052, 0.0082, 0.0042], [0, d * 0.45, 0], 1)])] // ears
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
      float fr = 1. - max(dot(N, V), 0.); c += uRim*smoothstep(.62, .92, fr)*(.2 + .5*lit)*.22;
      gl_FragColor = vec4(c, 1.);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }` }))
function ChibiHair({ set }) {
  return <group ref={set('hair')}><Merge><M geo={HAIR_GEO} mat={chibiHairMat(CHIBI.outfit.skin)} /></Merge></group>
}

export const CHIBI = { ...TRAVELLER, name: 'chibi-her', age: 'toddler',
  body: { H: 0.93, head: 1.55, leg: 0.92, torso: 0.92, arm: 0.84, girth: 1.16, shoulder: 0.92, foot: 1.18, hand: 1.3, cheek: CHEEK },
  hair: { style: 'chibi', c: '#3b2a22' },
  outfit: { ...TRAVELLER.outfit, top: '#fbf6ec', bottom: '#4f7cc4', shoe: '#7a4a2e', cuffs: '#6f98d4' },
  walk: { rate: 11, stride: 0.55, knee: 0.8, bounce: 0.02, arm: 0.6, lean: 0.05, twist: 0.1, sway: 0.06, idle: 'contra' },
  ext: { Face: ChibiFace, Hair: ChibiHair, knot: [0, -0.004, 0.006, 1.35], bag: [0.016, -0.01, -0.006, 1.15] } }
export function ChibiHer({ st }) { return <Character cfg={CHIBI} st={st} res={80} /> }
