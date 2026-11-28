// Shared chibi face for villagers: the pass-8 analytic eye recipe (same shapes as her), a 4-cell
// brow/nose/mouth atlas, and optional glasses as one merged mesh. Lazy chunk only.
import * as THREE from 'three'
import React, { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { CEL_U, cel } from '../../GhibliPerson.jsx'
import { approach } from './lifeCore.js'
import { EXCITED_ACTS } from './life.js'
import { T, q } from '../../common.jsx'

export const HR = [0.068 / 1.17, 0.0584 / 1.17, 0.0648 / 1.17]
export const CHEEK = [0, -0.026, 0.012, 0.05, 0.0295, 0.035, 0.016]
export const MIDFACE = [[-0.0278, 0.0397, 0.02, 0.0058, 0.014, 0.0012, 0.001], [-0.0345, 0.0303, 0.03, 0.0162, 0.0243, 0.0055]]
export const MID_FADE = 0
const FX = 0.052, FY0_DEF = -0.047, FY1_DEF = 0.019 // decal region; a face can reach higher (makeFace fy1) for marks up the forehead, or lower (fy0) for a mouth under a mustache
export const FACES = ['happy', 'blink', 'sleepy', 'excited', 'focus', 'laugh']
const CELL = { happy: 0, blink: 0, focus: 1, sleepy: 2, excited: 3, yawn: 3, tired: 1, hungry: 2, laugh: 3 } // laugh: the excited cell with the eyes squeezed into ^ (L.arc)
const FT = 1, FDY = 0.0022 * FT, FDX = 0.0032 * FT, FS = 1 - 0.09 * FT
const F10 = 1, E10X = -0.0009 * F10, E10Y = -0.0048 * F10
export const EYE = { x: 0.0278 - FDX + E10X, y: -0.0153 + FDY + E10Y, rx: 0.0116 * FS, ry: 0.0127 * FS }
const BLUSH = { x: 0.0383 - FDX - 0.0012 * F10, y: -0.0319 + FDY + 0.0004 * FT - 0.0022 * F10, r: 0.0105 }
const IRIS = { top: '#1e1410', mid: '#2a1a12', edge: '#1a110d', glow: '#6b4430' }
const TOUCH = typeof window !== 'undefined' && matchMedia('(pointer: coarse)').matches
const lin = (hex) => { const c = new THREE.Color(hex); return `vec3(${c.r.toFixed(5)},${c.g.toFixed(5)},${c.b.toFixed(5)})` }
const f5 = (x) => x.toFixed(6)

function drawFaces(W, kind, FY1 = FY1_DEF, FY0 = FY0_DEF, off = {}) {
  // off (Fuku): mouth / nose extra drop, eyeDx (eyes and brows further apart), brow { color, edge, width } (her own brows)
  const mDy = off.mouth ?? 0, mW = off.mouthW ?? 1, nDy = off.nose ?? 0, eDx = off.eyeDx ?? 0, bw = off.brow
  const H = Math.round(W * (FY1 - FY0) / (2 * FX)), c = document.createElement('canvas'); c.width = W * 2; c.height = H * 2
  const g = c.getContext('2d'), s = W / (2 * FX)
  const el = (x, y, rx, ry, a0 = 0, a1 = Math.PI * 2, ccw = false) => g.ellipse(x, y, rx, ry, 0, a0, a1, ccw)
  const fuku = kind === 'fuku', ishi = kind === 'ishi' // ishi: 3D brows, nose and mustache (hair mesh); paint lines only
  const BROW = bw?.color ?? (fuku ? '#6a6660' : '#1a1614')
  ;['happy', 'focus', 'sleepy', 'excited'].forEach((name, k) => {
    const ox = (k % 2) * W, oy = Math.floor(k / 2) * H, X = (x) => ox + (x / FX * 0.5 + 0.5) * W, Y = (y) => oy + (1 - (y - FY0) / (FY1 - FY0)) * H
    g.save(); g.beginPath(); g.rect(ox, oy, W, H); g.clip(); g.lineCap = g.lineJoin = 'round'
    const by = (name === 'excited' ? 0.0076 : name === 'sleepy' ? 0.0058 : name === 'focus' ? 0.0063 : 0.0066) + 0.0004 * FT + (fuku ? 0.0002 : 0)
    const arc = fuku ? (name === 'focus' ? 0.0024 : 0.0032) : (name === 'focus' ? 0.0020 : 0.0030)
    if (ishi) { // soft forehead lines above the brows and crinkles at the outer eye corners
      // two faint lines high on the forehead (sheet: ~0.2 H from the top), bending gently upward at the ends
      g.strokeStyle = 'rgba(184,124,98,0.30)'; g.lineWidth = 0.0009 * s
      for (const [y, w, b] of [[0.0280, 0.0175, 0.0016], [0.0244, 0.0150, 0.0013]]) { // a gentle upward bend: the ends lift a little
        g.beginPath(); g.moveTo(X(-w), Y(y + b)); g.quadraticCurveTo(X(0), Y(y - b), X(w), Y(y + b)); g.stroke() }
      g.strokeStyle = 'rgba(150,96,78,0.6)'
      for (const sd of [-1, 1]) { const ex = sd * (EYE.x + EYE.rx * 1.08), ey = EYE.y + 0.0004
        g.beginPath(); g.moveTo(X(ex), Y(ey + 0.0006)); g.lineTo(X(ex + sd * 0.0046), Y(ey + 0.0030)); g.stroke()
        g.beginPath(); g.moveTo(X(ex), Y(ey - 0.0016)); g.lineTo(X(ex + sd * 0.0044), Y(ey - 0.0010)); g.stroke() }
      // (no mouth: it hides under his mustache; the laugh is in the body, the eyes and the mustache bounce, KT)
      g.restore(); return
    }
    const brow = () => { for (const sd of [-1, 1]) { g.beginPath(); const bx = 0.0029 * FT; g.moveTo(X(sd * (0.0192 - bx + eDx)), Y(by - 0.0012 + (name === 'focus' ? -0.0004 : 0))); g.quadraticCurveTo(X(sd * (0.0261 - bx + eDx)), Y(by + arc), X(sd * (0.0328 - bx + eDx)), Y(by - 0.0010)); g.stroke() } }
    if (kind === 'hoshino') {
      const y = by + 0.0022
      g.fillStyle = '#342921'
      for (const side of [-1, 1]) {
        const x = u => X(side * u)
        g.beginPath()
        g.moveTo(x(0.0145), Y(y))
        g.bezierCurveTo(x(0.0147), Y(y + arc + 0.002), x(0.024), Y(y + arc + 0.004), x(0.030), Y(y + arc))
        g.quadraticCurveTo(x(0.034), Y(y + 0.001), x(0.035), Y(y - 0.003))
        g.quadraticCurveTo(x(0.024), Y(y + 0.0006), x(0.016), Y(y - 0.0007))
        g.closePath(); g.fill()
      }
    } else {
      if (bw?.edge) { g.strokeStyle = bw.edge; g.lineWidth = (bw.width + 0.0012) * s; brow() } // thin darker rim round a soft brow
      g.strokeStyle = BROW; g.lineWidth = (bw?.width ?? (fuku ? 0.0032 : 0.0056)) * s; brow()
    }
    if (fuku) { // soft grey-brown smile lines at the eye corners
      g.strokeStyle = 'rgba(120,100,90,0.62)'; g.lineWidth = 0.0011 * s
      for (const sd of [-1, 1]) {
        const ex = sd * (EYE.x + eDx + EYE.rx * 1.04), ey = EYE.y + 0.0002
        g.beginPath(); g.moveTo(X(ex), Y(ey + 0.0010)); g.lineTo(X(ex + sd * 0.0052), Y(ey + 0.0042)); g.stroke()
        g.beginPath(); g.moveTo(X(ex), Y(ey - 0.0014)); g.lineTo(X(ex + sd * 0.0046), Y(ey + 0.0004)); g.stroke()
      }
    }
    if (kind === 'hoshino') {
      const nx = X(0), ny = Y(-0.0265 - nDy)
      g.save(); g.translate(nx, ny); g.scale(0.0054*s, 0.0035*s)
      const shade = g.createLinearGradient(0, -1, 0, 1)
      shade.addColorStop(0, 'rgba(255,224,191,.65)')
      shade.addColorStop(0.5, 'rgba(241,178,145,.32)')
      shade.addColorStop(1, 'rgba(205,132,108,.55)')
      g.fillStyle = shade; g.beginPath(); el(0, 0, 1, 1); g.fill(); g.restore()
    } else {
      g.fillStyle = 'rgba(232,148,128,.9)'; g.beginPath(); el(X(0), Y(-0.0238 + FDY + 0.0005 * FT - 0.0026 * F10 - nDy), 0.0017 * s, 0.0011 * s); g.fill()
    }
    const my = -0.0351 + FDY + 0.0008 * FT - 0.0014 * F10 - mDy
    if (name === 'excited') { const mouth = () => { g.beginPath(); g.moveTo(X(-0.0088 * mW), Y(my + 0.0032)); g.quadraticCurveTo(X(0), Y(my + 0.0042), X(0.0088 * mW), Y(my + 0.0032)); g.bezierCurveTo(X(0.0084 * mW), Y(my - 0.0082), X(-0.0084 * mW), Y(my - 0.0082), X(-0.0088 * mW), Y(my + 0.0032)); g.closePath() }
      mouth(); g.fillStyle = '#a3403a'; g.fill(); g.save(); g.clip(); g.fillStyle = '#ef8076'; g.beginPath(); el(X(0), Y(my - 0.0066), 0.0062 * s, 0.0036 * s); g.fill(); g.restore()
      mouth(); g.strokeStyle = '#7a2a24'; g.lineWidth = 0.0011 * s; g.stroke()
      if (kind === 'hoshino') { g.strokeStyle = 'rgba(150,88,65,0.42)'; g.lineWidth = 0.0007 * s
        for (const sd of [-1, 1]) { const cx = sd * 0.0109 * mW, y = my + 0.0026; g.beginPath(); g.moveTo(X(cx), Y(y)); g.quadraticCurveTo(X(cx + sd * 0.0024), Y(y - 0.0009), X(cx + sd * 0.0027), Y(y - 0.0035)); g.stroke() } } }
    else { g.strokeStyle = fuku ? '#c45a48' : '#b05040'; g.lineWidth = (fuku ? 0.0020 : 0.0018) * s; g.beginPath()
      if (name === 'sleepy') { g.moveTo(X(-0.0042), Y(my - 0.0012)); g.quadraticCurveTo(X(0), Y(my + 0.0026), X(0.0042), Y(my - 0.0012)) }
      else if (name === 'focus') { g.moveTo(X(-0.0054), Y(my + 0.0004)); g.quadraticCurveTo(X(0), Y(my - 0.0018), X(0.0054), Y(my + 0.0004)) }
      else if (fuku) { g.moveTo(X(-0.0080), Y(my + 0.0014)); g.quadraticCurveTo(X(0), Y(my - 0.0034), X(0.0080), Y(my + 0.0014)) }
      else { g.moveTo(X(-0.0074 * mW), Y(my + 0.0012)); g.quadraticCurveTo(X(0), Y(my - 0.0030), X(0.0074 * mW), Y(my + 0.0012)) }
      g.stroke()
      if (kind === 'hoshino' && name !== 'sleepy') { // gentle cheek lines curving down beside the mouth corners (golden sheet)
        const corner = (name === 'happy' ? 0.0094 : 0.0081) * mW, y = my + 0.0008
        g.strokeStyle = 'rgba(150,88,65,0.42)'; g.lineWidth = 0.0007 * s
        for (const sd of [-1, 1]) { g.beginPath(); g.moveTo(X(sd * corner), Y(y + 0.0006)); g.quadraticCurveTo(X(sd * (corner + 0.0026)), Y(y - 0.0006), X(sd * (corner + 0.0028)), Y(y - 0.0036)); g.stroke() }
      }
      if (fuku && name === 'happy') {
        g.strokeStyle = 'rgba(140,90,80,0.45)'; g.lineWidth = 0.00095 * s
        for (const sd of [-1, 1]) { g.beginPath(); g.moveTo(X(sd * 0.0078), Y(my + 0.0006)); g.quadraticCurveTo(X(sd * 0.0104), Y(my - 0.0004), X(sd * 0.0096), Y(my - 0.0026)); g.stroke() }
      } }
    g.restore()
  })
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter; return t
}

// BL: blush placement, DY: every feature this much lower (head frame), EDX: eyes further apart (Fuku)
const faceFS = (FY1 = FY1_DEF, FY0 = FY0_DEF, BL = BLUSH, DY = 0, EDX = 0) => `uniform sampler2D map; uniform float uCellA, uCellB, uMix, uOpen, uSquint, uBlush, uBig, uLash, uArc; uniform vec2 uGaze; uniform vec3 uLight, uAmb; varying vec2 vUv;
  vec4 cellTex(float k, vec2 u){ vec2 cl = vec2(mod(k, 2.), floor(k*.5)); return texture2D(map, vec2((cl.x + u.x)*.5, (1. - cl.y + u.y)*.5)); }
  float cov(float d){ return clamp(.5 - d/max(fwidth(d), 1e-7), 0., 1.); }
  float eSD(vec2 d, vec2 R){ vec2 q = d/R; float k = max(length(q), 1e-5); return (k - 1.)/max(length(q/(R*k)), 1e-5); }
  void over(inout vec4 c, vec3 col, float a){ c.rgb = col*a + c.rgb*(1. - a); c.a = a + c.a*(1. - a); }
  void eye(inout vec4 c, vec2 p, float sd){
    vec2 E = vec2(sd*${f5(EYE.x + EDX)}, ${f5(EYE.y)}), R = vec2(${f5(EYE.rx)}, ${f5(EYE.ry)})*uBig;
    float o = uOpen, k = smoothstep(.1, .3, o), ry = R.y*max(o, .03);
    vec2 Es = vec2(E.x, E.y - R.y + ry), Rs = vec2(R.x, ry), d = p - Es;
    vec4 e = vec4(0.);
    if (k > 0.) {
      float dS = eSD(d, Rs), yb = E.y - R.y + R.y*uSquint, aS = cov(dS)*cov(yb - p.y);
      over(e, ${lin('#fffaf4')}, aS);
      vec2 I0 = vec2(E.x - sd*R.x*.22 + uGaze.x*R.x*.2, E.y - R.y*.02 + uGaze.y*R.y*.12), IR = R*vec2(.78, .97), IR2 = IR*vec2(.9, .92);
      over(e, ${lin(IRIS.edge)}, aS*cov(eSD(p - I0, IR)));
      float aI = aS*cov(eSD(p - I0, IR2)), gy = clamp((I0.y + IR.y - p.y)/(2.*IR.y)/.55, 0., 1.);
      over(e, mix(${lin(IRIS.top)}, ${lin(IRIS.mid)}, gy), aI);
      vec2 G = I0 - vec2(0., .7*IR.y); float rr = length(p - G)/(.66*IR.x);
      float ga = rr < .45 ? mix(.85, .5, rr/.45) : mix(.5, 0., clamp((rr - .45)/.55, 0., 1.));
      over(e, ${lin(IRIS.glow)}, ga*aI*cov(eSD(p - G, vec2(.66*IR.x, .4*IR.y))));
      over(e, vec3(1.), aS*cov(length(p - I0 - vec2(.3*IR.x, .36*IR.y)) - R.x*.34));
      over(e, ${lin('#3a221a')}, .28*cov(abs(dS) - .00025)*cov(yb - p.y));
      vec2 q = vec2(-sd*d.x/Rs.x, -d.y/Rs.y); float th = atan(q.y, q.x); if (th > -.35) th -= 6.2831853;
      float u = (th + .35)/(-3.14159265 - .1), W = R.y*.2;
      float w = W*smoothstep(0., .16, u)*(1. - smoothstep(.6, 1., u))*(.78 + .32*smoothstep(.25, .62, u));
      if (u > 0. && u < 1.) over(e, ${lin('#1e1410')}, cov(dS - .35*w)*cov(-.65*w - dS));
      e *= k;
    }
    if (k < 1.) {
      float yy = E.y - R.y*mix(.1, .2, uLash) + uArc*.42*R.y, lw = R.x*mix(.98, .92, uLash)*mix(1., .9, uArc), xn = (p.x - E.x)/lw, f = max(1. - xn*xn, 0.)*mix(1., -1.25, uArc); // uArc: a squeezed-shut happy ^ (laughing)
      float A = yy - .23*R.y*f, Bq = yy - .45*R.y*f, a = cov(p.y - max(A, Bq))*cov(min(A, Bq) - p.y)*cov(abs(p.x - E.x) - lw); // the band between the two curves (either way up)
      vec4 l = vec4(0.); over(l, ${lin('#1e1410')}, a); e += l*(1. - k);
    }
    c = e + c*(1. - e.a);
  }
  void main(){ vec2 u = clamp(vUv + vec2(0., ${f5(DY / (FY1 - FY0))}), .004, .996), p = vec2((u.x*2. - 1.)*${f5(FX)}, ${f5(FY0)} + u.y*${f5(FY1 - FY0)});
    vec4 c = vec4(0.);
    for (int i = 0; i < 2; i++) { float sd = i == 0 ? -1. : 1.; vec2 B = p - vec2(sd*${f5(BL.x)}, ${f5(BL.y)}); float rr = length(B)/${f5(BL.r)};
      float a = (rr < .62 ? mix(.9, .8, rr/.62) : mix(.8, 0., clamp((rr - .62)/.38, 0., 1.)))*cov(eSD(B, vec2(${f5(BL.r)}, ${f5(BL.r * 0.86)})));
      over(c, ${lin('#f4928c')}, clamp(a*uBlush, 0., .97)); }
    vec4 t = mix(cellTex(uCellA, u), cellTex(uCellB, u), uMix); over(c, t.a > 0. ? t.rgb : vec3(0.), t.a);
    eye(c, p, -1.); eye(c, p, 1.);
    if (c.a < .01) discard;
    gl_FragColor = vec4(c.rgb/c.a*(uLight*.92 + uAmb), c.a);
    #include <colorspace_fragment>
  }`

const smin = (a, b, k) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25 }
const ocol = (x, y, z, cx, cy, cz, rx, hy, rz, r) => { const a = (x - cx) / rx, c = (z - cz) / rz, qx = (Math.sqrt(a * a + c * c) - 1) * Math.min(rx, rz), qy = Math.abs(y - cy) - hy
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r }
const ell = (x, y, z, cx, cy, cz, rx, ry, rz) => { const a = (x - cx) / rx, b = (y - cy) / ry, c = (z - cz) / rz; return (Math.sqrt(a * a + b * b + c * c) - 1) * Math.min(rx, ry, rz) }
/** head SDF in the head frame. headS scales the skull radii (body.headS), cheek is the jaw ellipsoid (body.cheek);
 *  cranium / chin extra lumps (body.cranium, body.chin); all must match the character's body so the face decal and anything placed on the face sit on the baked surface. */
export const makeHeadSDF = ({ headS = [1, 1, 1], cranium = null, chin = null, lumps = [], cheek = CHEEK, midface = MIDFACE, fade: mfade = MID_FADE } = {}) => { const hr = HR.map((r, i) => r * headS[i])
  return (x, y, z) => { const [cx, cy, cz, rx, ry, rz, k, jh] = cheek
    // optional 8th cheek value jh (Fuku): the jaw ellipsoid is stretched up by jh (straight sides, elliptical bottom)
    const jaw = (jx) => jh == null ? ell(x, y, z, jx, cy, cz, rx, ry, rz) : ell(x, y - Math.min(Math.max(y - cy, 0), jh), z, jx, cy, cz, rx, ry, rz)
    let h = ell(x, y, z, 0, 0, 0, ...hr); for (const L of [cranium, chin, ...lumps]) if (L) { const [cy, cz, rx, ry, rz, k] = L; h = smin(h, ell(x, y, z, 0, cy, cz, rx, ry, rz), k) }
    h = smin(h, Math.min(jaw(-cx), jaw(cx)), k)
    const fade = mfade * x * x
    for (const [my, mz, a, b, c, mk, r] of midface) h = smin(h, (r != null ? ocol(x, y, z, 0, my, mz, a, b, c, r) : ell(x, y, z, 0, my, mz, a, b, c)) + fade, mk)
    return h } }
export const headSDF = makeHeadSDF()

export const makeFaceGeo = (headSDF, FY1 = FY1_DEF, FY0 = FY0_DEF) => { const NX = 30, NY = Math.round(22 * (FY1 - FY0) / (FY1_DEF - FY0_DEF)), pos = [], uv = [], ok = [], idx = []
  for (let j = 0; j <= NY; j++) for (let i = 0; i <= NX; i++) { const u = i / NX, v = j / NY, x = (u * 2 - 1) * FX, y = FY0 + v * (FY1 - FY0)
    let z = 0.09, hit = false; for (; z > -0.01; z -= 0.0008) if (headSDF(x, y, z) < 0) { hit = true; break }
    if (hit) { let a = z, b = z + 0.0008; for (let n = 0; n < 16; n++) { const m = (a + b) / 2; if (headSDF(x, y, m) < 0) a = m; else b = m } z = b + 0.0009 }
    pos.push(x, y, z); uv.push(u, v); ok.push(hit && z > 0.004) }
  for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) { const a = j * (NX + 1) + i, b = a + 1, c = a + NX + 1, d = c + 1
    if (ok[a] && ok[b] && ok[c] && ok[d]) idx.push(a, b, d, a, d, c) }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); return g }
export const faceGeo = makeFaceGeo(headSDF)

function glassesGeo() {
  const parts = []
  const rim = new THREE.TorusGeometry(0.0128, 0.0011, 8, 18)
  for (const sd of [-1, 1]) { const g = rim.clone(); g.rotateY(sd * 0.2); g.translate(sd * EYE.x, EYE.y + 0.0008, 0.0545); parts.push(g) }
  const bridge = new THREE.BoxGeometry(0.011, 0.00115, 0.00115); bridge.translate(0, EYE.y + 0.0022, 0.0555); parts.push(bridge)
  for (const sd of [-1, 1]) { const t = new THREE.BoxGeometry(0.028, 0.00105, 0.00105); t.rotateY(sd * -1.15); t.translate(sd * 0.040, EYE.y + 0.0016, 0.040); parts.push(t) }
  const g = mergeGeometries(parts.map(p => p.index ? p.toNonIndexed() : p)); g.computeVertexNormals(); return g
}
let GLASSES = null
const glasses = () => GLASSES || (GLASSES = glassesGeo())

// Thin round wire spectacles (Hoshino's sheet): lenses ~1.35x the eye, a warm gold wire inked by a dark
// rim just behind it, a small arched bridge and arms running back to the ears. One vertex-coloured mesh.
const tint = (g, hex) => { const c = new THREE.Color(hex), src = g.index ? g.toNonIndexed() : g, a = new Float32Array(src.attributes.position.count * 3)
  for (let i = 0; i < a.length; i += 3) { a[i] = c.r; a[i + 1] = c.g; a[i + 2] = c.b } src.setAttribute('color', new THREE.BufferAttribute(a, 3)); return src }
function bar(a, b, r, hex) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), g = new THREE.CylinderGeometry(r, r, A.distanceTo(B), 6, 1)
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize()))
  const m = A.add(B).multiplyScalar(0.5); g.translate(m.x, m.y, m.z); return tint(g, hex)
}
export function wireGlassesGeo({ r = 0.0152, wire = '#b5843e', ink = '#4a2e1c', ear = [0.0555, -0.017, 0.006], tilt = 0.32, halfRim = false, sdf = null, rim = [0.00125, 0.00072] } = {}) {
  const parts = [], cy = EYE.y + 0.0006, z = 0.0548
  for (const sd of [-1, 1]) {
    for (const [tube, hex, dz] of [[rim[0], ink, -0.0004], [rim[1], wire, 0.0003]]) {
      const g = new THREE.TorusGeometry(r, tube, 6, 32, halfRim ? Math.PI : Math.PI * 2); if (halfRim) g.rotateZ(Math.PI); g.rotateY(sd * tilt); g.translate(sd * EYE.x, cy, z + dz); parts.push(tint(g, hex))
    }
    // arm: from the outer rim edge straight back to the ear
    const ox = sd * (EYE.x + r * Math.cos(tilt)), oz = z - r * Math.sin(tilt)
    const A = [ox, cy + (halfRim ? 0 : 0.0035), oz], B = [sd * ear[0], ear[1] + 0.009, ear[2]]
    if (!sdf) parts.push(bar(A, B, 0.00085, ink))
    else { // follow the cheek: each point pushed out sideways until it clears the head, so the arm never dips in and out of the face
      const N = 10, pts = []
      for (let i = 0; i <= N; i++) { const u = i / N, p = A.map((a, k) => a + (B[k] - a) * u)
        for (let n = 0; n < 40 && sdf(p[0], p[1], p[2]) < 0.0016; n++) p[0] += sd * 0.0004
        pts.push(p) }
      for (let i = 0; i < N; i++) parts.push(bar(pts[i], pts[i + 1], 0.00085, ink)) }
  }
  // arched bridge between the inner rim edges, sitting a little high on the nose
  const ix = EYE.x - r * Math.cos(tilt), iz = z + r * Math.sin(tilt) + 0.0004, N = 6, pts = []
  for (let i = 0; i <= N; i++) { const u = i / N, x = -ix + 2 * ix * u; pts.push([x, cy + (halfRim ? 0 : 0.0030) + 0.0026 * Math.sin(Math.PI * u), iz + 0.0010 * Math.sin(Math.PI * u)]) }
  for (let i = 0; i < N; i++) { parts.push(bar(pts[i], pts[i + 1], 0.00100, ink)); parts.push(bar([pts[i][0], pts[i][1], pts[i][2] + 0.0004], [pts[i + 1][0], pts[i + 1][1], pts[i + 1][2] + 0.0004], 0.00060, wire)) }
  const g = mergeGeometries(parts.map(p => { for (const k of Object.keys(p.attributes)) if (!['position', 'normal', 'color'].includes(k)) p.deleteAttribute(k); return p }))
  g.computeVertexNormals(); return g
}
const wireMat = () => { const m = cel('#ffffff').clone(); m.uniforms = { ...m.uniforms, ...CEL_U, uColor: { value: new THREE.Color(1, 1, 1) } }; m.vertexColors = true; return m }

const atlases = {}
const faceMat = (kind, fy1, fy0, bl, dy, off) => new THREE.ShaderMaterial({ transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4,
  uniforms: { map: { value: atlases[kind] || (atlases[kind] = drawFaces(TOUCH ? 640 : 1024, kind, fy1, fy0, off)) }, uCellA: { value: 0 }, uCellB: { value: 0 }, uMix: { value: 1 }, uOpen: { value: 1 }, uSquint: { value: 0 },
    uBlush: { value: 1 }, uBig: { value: 1 }, uLash: { value: 0 }, uArc: { value: 0 }, uGaze: { value: new THREE.Vector2() }, uLight: CEL_U.uLight, uAmb: CEL_U.uAmb },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
  fragmentShader: faceFS(fy1, fy0, bl, dy, off?.eyeDx ?? 0) })

/** Face component factory. kind: 'fuku' | 'hoshino' | 'ishi'. shape: { headS, cheek } when the head differs from the template. glasses: hex or falsy.
 *  wire: options for wireGlassesGeo (Hoshino's thin wire spectacles, replaces the plain rims). defaultSquint: 0..1 added to the life squint (crinkled lids). */
/** Fuku's options: blushAt { dx, dy, dr } (moves / grows the blush), featDy (moves brows, eyes, nose, mouth and blush down by this
 *  much, head frame), featOff { mouth, mouthW (width scale), nose, eyeDx, brow: { color, edge, width } } (see drawFaces), glassesGeo (her own frames;
 *  it must apply the same featDy). All default to the template. */
export function makeFace({ kind, glasses: glassC, wire = null, defaultSquint = 0, blush = 1, shape, fy1, fy0, eyeS = 1, blushAt, featDy = 0, featOff, glassesGeo: ownGlasses } = {}) { // eyeS: eye size (1 = the template)
  const bl = blushAt ? { x: BLUSH.x + (blushAt.dx ?? 0), y: BLUSH.y + (blushAt.dy ?? 0), r: BLUSH.r * (blushAt.dr ?? 1) } : BLUSH
  let gGeo = null
  const geo = shape || fy1 || fy0 ? makeFaceGeo(makeHeadSDF(shape), fy1, fy0) : faceGeo
  const wireG = wire ? wireGlassesGeo({ sdf: makeHeadSDF(shape), ...wire }) : null, wireM = wire ? wireMat() : null
  function Face({ st, lod }) {
    const mat = useMemo(() => faceMat(kind, fy1, fy0, bl, featDy, featOff), [])
    const s = useRef({ A: 0, B: 0, mix: 1, mo: 1, lash: 0, big: 1, idle: 0, blinkT: 2 })
    useFrame(({ clock }, dt) => { dt = Math.min(dt, 0.05); const o = s.current, U = mat.uniforms, L = st.life
      const forced = (typeof window !== 'undefined' && window.__chibiFace) || q.get('face')
      let mood, open
      if (L) { mood = L.mood; open = L.open }
      else { o.idle = st.move > 0.05 || st.act ? 0 : o.idle + dt; o.blinkT -= dt; if (o.blinkT < 0) o.blinkT = 2.4 + Math.random() * 2.6
        mood = st.act === 'nap' || (T.night > 0.7 && o.idle > 4) || o.idle > 25 ? 'sleepy' : st.act && EXCITED_ACTS.has(st.act) && (st.actW ?? 1) > 0.3 ? 'excited' : 'happy'
        open = o.blinkT < 0.12 ? 0 : 1 }
      const shut = st.act === 'nap' || (L && L.idle > 25 && !(L.lie > 0.3)), moT = mood === 'sleepy' ? (shut ? 0 : 0.42) : mood === 'tired' ? 0.66 : 1
      o.mo = approach(o.mo, moT, moT < o.mo ? 1.6 : 6, dt)
      let cell = CELL[mood] ?? 0, gx = L ? L.gx : 0, gy = L ? L.gy : 0, squint = (L ? L.squint : 0) + defaultSquint, blushU = (L ? 1 + 0.32 * L.blush * (0.75 + 0.25 * Math.sin(clock.elapsedTime * 2.6)) : 1) * blush
      if (L && L.fsq) squint = Math.max(squint, 0.4 * L.fsq)
      open = Math.min(open, 1) * o.mo
      let lashT = mood === 'sleepy' ? 1 : 0, bigT = mood === 'excited' ? 1.05 : 1, arc = L ? L.arc || 0 : 0
      if (arc > 0) open = Math.min(open, 1 - arc)
      if (forced && FACES.includes(forced)) { cell = CELL[forced]; gx = gy = squint = 0; blushU = blush; open = forced === 'blink' || forced === 'sleepy' ? 0 : 1; lashT = forced === 'sleepy' ? 1 : 0; bigT = forced === 'excited' ? 1.05 : 1
        if (forced !== 'blink' && forced !== 'sleepy') squint = defaultSquint
        arc = forced === 'laugh' ? 1 : 0; if (arc) open = 0
        o.A = o.B = cell; o.mix = 1; o.lash = lashT; o.big = bigT }
      if (cell !== o.B) { if (o.mix >= 0.5) o.A = o.B; o.B = cell; o.mix = 0 }
      o.mix = approach(o.mix, 1, 9, dt); o.lash = approach(o.lash, lashT, 6, dt); o.big = approach(o.big, bigT, 8, dt)
      U.uCellA.value = o.A; U.uCellB.value = o.B; U.uMix.value = o.mix; U.uOpen.value = open; U.uLash.value = o.lash; U.uBig.value = o.big * eyeS; U.uArc.value = arc
      U.uGaze.value.set(gx, gy); U.uSquint.value = squint; U.uBlush.value = blushU })
    return <group ref={lod(2)}><mesh geometry={geo} material={mat} renderOrder={2} />
      {wireG ? <mesh geometry={wireG} material={wireM} /> : glassC && <mesh geometry={ownGlasses ? (gGeo || (gGeo = ownGlasses())) : glasses()} material={cel(glassC)} />}</group>
  }
  return Face
}
