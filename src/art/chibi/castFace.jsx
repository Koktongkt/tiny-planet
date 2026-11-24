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
const FX = 0.052, FY0 = -0.047, FY1 = 0.019
export const FACES = ['happy', 'blink', 'sleepy', 'excited', 'focus']
const CELL = { happy: 0, blink: 0, focus: 1, sleepy: 2, excited: 3, yawn: 3, tired: 1, hungry: 2 }
const FT = 1, FDY = 0.0022 * FT, FDX = 0.0032 * FT, FS = 1 - 0.09 * FT
const F10 = 1, E10X = -0.0009 * F10, E10Y = -0.0048 * F10
export const EYE = { x: 0.0278 - FDX + E10X, y: -0.0153 + FDY + E10Y, rx: 0.0116 * FS, ry: 0.0127 * FS }
const BLUSH = { x: 0.0383 - FDX - 0.0012 * F10, y: -0.0319 + FDY + 0.0004 * FT - 0.0022 * F10, r: 0.0105 }
const IRIS = { top: '#1e1410', mid: '#2a1a12', edge: '#1a110d', glow: '#6b4430' }
const TOUCH = typeof window !== 'undefined' && matchMedia('(pointer: coarse)').matches
const lin = (hex) => { const c = new THREE.Color(hex); return `vec3(${c.r.toFixed(5)},${c.g.toFixed(5)},${c.b.toFixed(5)})` }
const f5 = (x) => x.toFixed(6)

function drawFaces(W, kind) {
  const H = Math.round(W * (FY1 - FY0) / (2 * FX)), c = document.createElement('canvas'); c.width = W * 2; c.height = H * 2
  const g = c.getContext('2d'), s = W / (2 * FX)
  const el = (x, y, rx, ry, a0 = 0, a1 = Math.PI * 2, ccw = false) => g.ellipse(x, y, rx, ry, 0, a0, a1, ccw)
  const fuku = kind === 'fuku'
  const BROW = fuku ? '#5a4a42' : '#2a211c'
  ;['happy', 'focus', 'sleepy', 'excited'].forEach((name, k) => {
    const ox = (k % 2) * W, oy = Math.floor(k / 2) * H, X = (x) => ox + (x / FX * 0.5 + 0.5) * W, Y = (y) => oy + (1 - (y - FY0) / (FY1 - FY0)) * H
    g.save(); g.beginPath(); g.rect(ox, oy, W, H); g.clip(); g.lineCap = g.lineJoin = 'round'
    const by = (name === 'excited' ? 0.0108 : name === 'sleepy' ? 0.0088 : name === 'focus' ? 0.0093 : 0.0098) + 0.0004 * FT + (fuku ? 0.0006 : 0)
    const arc = fuku ? (name === 'focus' ? 0.0026 : 0.0038) : (name === 'focus' ? 0.0014 : 0.0022)
    g.strokeStyle = BROW; g.lineWidth = (fuku ? 0.0032 : 0.0038) * s
    for (const sd of [-1, 1]) { g.beginPath(); const bx = 0.0029 * FT; g.moveTo(X(sd * (0.0192 - bx)), Y(by - 0.0015 + (name === 'focus' ? -0.0004 : 0))); g.quadraticCurveTo(X(sd * (0.0261 - bx)), Y(by + arc), X(sd * (0.0328 - bx)), Y(by - 0.0012)); g.stroke() }
    if (fuku) { // kind, slightly crinkled corners (crow's feet), soft and short
      g.strokeStyle = 'rgba(90,70,60,0.42)'; g.lineWidth = 0.00085 * s
      for (const sd of [-1, 1]) {
        const ex = sd * (EYE.x + EYE.rx * 1.02), ey = EYE.y + 0.0004
        g.beginPath(); g.moveTo(X(ex), Y(ey + 0.0012)); g.lineTo(X(ex + sd * 0.0042), Y(ey + 0.0036)); g.stroke()
        g.beginPath(); g.moveTo(X(ex), Y(ey - 0.0016)); g.lineTo(X(ex + sd * 0.0036), Y(ey - 0.0002)); g.stroke()
      }
    }
    g.fillStyle = 'rgba(232,148,128,.9)'; g.beginPath(); el(X(0), Y(-0.0238 + FDY + 0.0005 * FT - 0.0026 * F10), 0.0017 * s, 0.0011 * s); g.fill()
    const my = -0.0351 + FDY + 0.0008 * FT - 0.0014 * F10
    if (name === 'excited') { const mouth = () => { g.beginPath(); g.moveTo(X(-0.0088), Y(my + 0.0032)); g.quadraticCurveTo(X(0), Y(my + 0.0042), X(0.0088), Y(my + 0.0032)); g.bezierCurveTo(X(0.0084), Y(my - 0.0082), X(-0.0084), Y(my - 0.0082), X(-0.0088), Y(my + 0.0032)); g.closePath() }
      mouth(); g.fillStyle = '#a3403a'; g.fill(); g.save(); g.clip(); g.fillStyle = '#ef8076'; g.beginPath(); el(X(0), Y(my - 0.0066), 0.0062 * s, 0.0036 * s); g.fill(); g.restore()
      mouth(); g.strokeStyle = '#7a2a24'; g.lineWidth = 0.0011 * s; g.stroke() }
    else { g.strokeStyle = fuku ? '#c45a48' : '#b05040'; g.lineWidth = (fuku ? 0.0023 : 0.0019) * s; g.beginPath()
      if (name === 'sleepy') { g.moveTo(X(-0.0042), Y(my - 0.0012)); g.quadraticCurveTo(X(0), Y(my + 0.0026), X(0.0042), Y(my - 0.0012)) }
      else if (name === 'focus') { g.moveTo(X(-0.0054), Y(my + 0.0004)); g.quadraticCurveTo(X(0), Y(my - 0.0018), X(0.0054), Y(my + 0.0004)) }
      else if (fuku) { g.moveTo(X(-0.0076), Y(my + 0.0016)); g.quadraticCurveTo(X(0), Y(my - 0.0050), X(0.0076), Y(my + 0.0016)) }
      else { g.moveTo(X(-0.0058), Y(my + 0.0008)); g.quadraticCurveTo(X(0), Y(my - 0.0032), X(0.0058), Y(my + 0.0008)) }
      g.stroke() }
    g.restore()
  })
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter; return t
}

const FACE_FS = `uniform sampler2D map; uniform float uCellA, uCellB, uMix, uOpen, uSquint, uBlush, uBig, uLash; uniform vec2 uGaze; uniform vec3 uLight, uAmb; varying vec2 vUv;
  vec4 cellTex(float k, vec2 u){ vec2 cl = vec2(mod(k, 2.), floor(k*.5)); return texture2D(map, vec2((cl.x + u.x)*.5, (1. - cl.y + u.y)*.5)); }
  float cov(float d){ return clamp(.5 - d/max(fwidth(d), 1e-7), 0., 1.); }
  float eSD(vec2 d, vec2 R){ vec2 q = d/R; float k = max(length(q), 1e-5); return (k - 1.)/max(length(q/(R*k)), 1e-5); }
  void over(inout vec4 c, vec3 col, float a){ c.rgb = col*a + c.rgb*(1. - a); c.a = a + c.a*(1. - a); }
  void eye(inout vec4 c, vec2 p, float sd){
    vec2 E = vec2(sd*${f5(EYE.x)}, ${f5(EYE.y)}), R = vec2(${f5(EYE.rx)}, ${f5(EYE.ry)})*uBig;
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
      float yy = E.y - R.y*mix(.1, .2, uLash), lw = R.x*mix(.98, .92, uLash), xn = (p.x - E.x)/lw, f = max(1. - xn*xn, 0.);
      float a = cov(p.y - (yy - .23*R.y*f))*cov((yy - .45*R.y*f) - p.y)*cov(abs(p.x - E.x) - lw);
      vec4 l = vec4(0.); over(l, ${lin('#1e1410')}, a); e += l*(1. - k);
    }
    c = e + c*(1. - e.a);
  }
  void main(){ vec2 u = clamp(vUv, .004, .996), p = vec2((u.x*2. - 1.)*${f5(FX)}, ${f5(FY0)} + u.y*${f5(FY1 - FY0)});
    vec4 c = vec4(0.);
    for (int i = 0; i < 2; i++) { float sd = i == 0 ? -1. : 1.; vec2 B = p - vec2(sd*${f5(BLUSH.x)}, ${f5(BLUSH.y)}); float rr = length(B)/${f5(BLUSH.r)};
      float a = (rr < .62 ? mix(.9, .8, rr/.62) : mix(.8, 0., clamp((rr - .62)/.38, 0., 1.)))*cov(eSD(B, vec2(${f5(BLUSH.r)}, ${f5(BLUSH.r * 0.86)})));
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
export const headSDF = (x, y, z) => { const [cx, cy, cz, rx, ry, rz, k] = CHEEK
  let h = smin(ell(x, y, z, 0, 0, 0, ...HR), Math.min(ell(x, y, z, -cx, cy, cz, rx, ry, rz), ell(x, y, z, cx, cy, cz, rx, ry, rz)), k)
  const fade = MID_FADE * x * x
  for (const [my, mz, a, b, c, mk, r] of MIDFACE) h = smin(h, (r != null ? ocol(x, y, z, 0, my, mz, a, b, c, r) : ell(x, y, z, 0, my, mz, a, b, c)) + fade, mk)
  return h }

export const faceGeo = (() => { const NX = 30, NY = 22, pos = [], uv = [], ok = [], idx = []
  for (let j = 0; j <= NY; j++) for (let i = 0; i <= NX; i++) { const u = i / NX, v = j / NY, x = (u * 2 - 1) * FX, y = FY0 + v * (FY1 - FY0)
    let z = 0.09, hit = false; for (; z > -0.01; z -= 0.0008) if (headSDF(x, y, z) < 0) { hit = true; break }
    if (hit) { let a = z, b = z + 0.0008; for (let n = 0; n < 16; n++) { const m = (a + b) / 2; if (headSDF(x, y, m) < 0) a = m; else b = m } z = b + 0.0009 }
    pos.push(x, y, z); uv.push(u, v); ok.push(hit && z > 0.004) }
  for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) { const a = j * (NX + 1) + i, b = a + 1, c = a + NX + 1, d = c + 1
    if (ok[a] && ok[b] && ok[c] && ok[d]) idx.push(a, b, d, a, d, c) }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); return g })()

function glassesGeo() {
  const parts = []
  const rim = new THREE.TorusGeometry(0.0128, 0.0011, 8, 18)
  for (const sd of [-1, 1]) { const g = rim.clone(); g.rotateY(sd * 0.2); g.translate(sd * EYE.x, EYE.y + 0.0008, 0.0545); parts.push(g) }
  const bridge = new THREE.BoxGeometry(0.011, 0.00115, 0.00115); bridge.translate(0, EYE.y + 0.0022, 0.0555); parts.push(bridge)
  for (const sd of [-1, 1]) { const t = new THREE.BoxGeometry(0.024, 0.0011, 0.0011); t.rotateY(sd * -0.42); t.translate(sd * 0.043, EYE.y + 0.0016, 0.040); parts.push(t) }
  const g = mergeGeometries(parts.map(p => p.index ? p.toNonIndexed() : p)); g.computeVertexNormals(); return g
}
let GLASSES = null
const glasses = () => GLASSES || (GLASSES = glassesGeo())

const atlases = {}
const faceMat = (kind) => new THREE.ShaderMaterial({ transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4,
  uniforms: { map: { value: atlases[kind] || (atlases[kind] = drawFaces(TOUCH ? 640 : 1024, kind)) }, uCellA: { value: 0 }, uCellB: { value: 0 }, uMix: { value: 1 }, uOpen: { value: 1 }, uSquint: { value: 0 },
    uBlush: { value: 1 }, uBig: { value: 1 }, uLash: { value: 0 }, uGaze: { value: new THREE.Vector2() }, uLight: CEL_U.uLight, uAmb: CEL_U.uAmb },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
  fragmentShader: FACE_FS })

/** Face component factory. kind: 'fuku' | 'hoshino'. glasses: hex or falsy. defaultSquint: 0..1 added to the life squint (crinkled lids). */
export function makeFace({ kind, glasses: glassC, defaultSquint = 0, blush = 1 } = {}) {
  function Face({ st, lod }) {
    const mat = useMemo(() => faceMat(kind), [])
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
      let lashT = mood === 'sleepy' ? 1 : 0, bigT = mood === 'excited' ? 1.05 : 1
      if (forced && FACES.includes(forced)) { cell = CELL[forced]; gx = gy = squint = 0; blushU = blush; open = forced === 'blink' || forced === 'sleepy' ? 0 : 1; lashT = forced === 'sleepy' ? 1 : 0; bigT = forced === 'excited' ? 1.05 : 1
        if (forced !== 'blink' && forced !== 'sleepy') squint = defaultSquint
        o.A = o.B = cell; o.mix = 1; o.lash = lashT; o.big = bigT }
      if (cell !== o.B) { if (o.mix >= 0.5) o.A = o.B; o.B = cell; o.mix = 0 }
      o.mix = approach(o.mix, 1, 9, dt); o.lash = approach(o.lash, lashT, 6, dt); o.big = approach(o.big, bigT, 8, dt)
      U.uCellA.value = o.A; U.uCellB.value = o.B; U.uMix.value = o.mix; U.uOpen.value = open; U.uLash.value = o.lash; U.uBig.value = o.big
      U.uGaze.value.set(gx, gy); U.uSquint.value = squint; U.uBlush.value = blushU })
    return <group ref={lod(2)}><mesh geometry={faceGeo} material={mat} renderOrder={2} />
      {glassC && <mesh geometry={glasses()} material={cel(glassC)} />}</group>
  }
  return Face
}
