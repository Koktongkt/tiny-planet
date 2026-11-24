// "Cozy Chibi" her (concept B, approved by KT): the same soft-body rig as every villager (GhibliPerson Character,
// same bones, poses, props, bike IK), re-proportioned to ~2.5 heads, with a painted face decal (4 expressions in one
// canvas atlas, 1 draw) and sculpted hair clumps merged to one cel mesh + one ink hull (2 draws).
// Lazy chunk: nothing here ships in the startup bundle. Head frame used below: the head group in Character
// (origin = head centre, scale 1.17 * head), where the head ellipsoid has radii HR.
import * as THREE from 'three'
import React, { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { Character, TRAVELLER, CEL_U, cel, mkOutline } from '../../GhibliPerson.jsx'
import { buildSatchel } from './satchel.js'
import { makeLife, lifeStep, lifePost, HAIR_OFF, EXCITED_ACTS } from './life.js'
import { approach } from './lifeCore.js'
import { T, q } from '../../common.jsx'

const HR = [0.068 / 1.17, 0.0584 / 1.17, 0.0648 / 1.17]
const TOUCH = typeof window !== 'undefined' && matchMedia('(pointer: coarse)').matches

// ---------- face atlas (canvas, drawn once at load: no image file) ----------
// Pass 2: redrawn against the concept B close-up. Region of the face the decal covers, in head-frame units (planar front
// projection); 4 expressions in a 2x2 atlas.
const FX = 0.052, FY0 = -0.047, FY1 = 0.019
export const FACES = ['happy', 'blink', 'sleepy', 'excited', 'focus']
// anim1: the atlas now only holds brows, nose and mouth (cells: happy, focus, sleepy, excited). Eyes and blush are drawn
// analytically in the face shader (same shapes/colours as pass 8) so lids can blink partway, irises can dart, the lower lid
// can squint, the blush can pulse and expressions crossfade instead of swapping.
const CELL = { happy: 0, blink: 0, focus: 1, sleepy: 2, excited: 3 }
// pass 6 (KT): features a touch smaller, higher and closer together. FT scales the tweak (1 = chosen, 1.5 = 'stronger').
const FT = 1, FDY = 0.0022 * FT, FDX = 0.0032 * FT, FS = 1 - 0.09 * FT
// pass 10 (KT, turnaround sheet): the eye line sits lower in the face, a touch closer together; nose, mouth and blush
// follow so the cluster keeps its spacing. F10 scales the tweak.
const F10 = 1, E10X = -0.0009 * F10, E10Y = -0.0048 * F10
const EYE = { x: 0.0278 - FDX + E10X, y: -0.0153 + FDY + E10Y, rx: 0.0116 * FS, ry: 0.0127 * FS }
const BLUSH = { x: 0.0383 - FDX - 0.0012 * F10, y: -0.0319 + FDY + 0.0004 * FT - 0.0022 * F10, r: 0.0105 }
const IRIS = { top: '#1e1410', mid: '#2a1a12', edge: '#1a110d', glow: '#6b4430' }
function drawFaces(W) {
  const H = Math.round(W * (FY1 - FY0) / (2 * FX)), c = document.createElement('canvas'); c.width = W * 2; c.height = H * 2
  const g = c.getContext('2d'), s = W / (2 * FX), BROW = '#3b2621'
  const el = (x, y, rx, ry, a0 = 0, a1 = Math.PI * 2, ccw = false) => g.ellipse(x, y, rx, ry, 0, a0, a1, ccw)
  ;['happy', 'focus', 'sleepy', 'excited'].forEach((name, k) => {
    const ox = (k % 2) * W, oy = Math.floor(k / 2) * H, X = (x) => ox + (x / FX * 0.5 + 0.5) * W, Y = (y) => oy + (1 - (y - FY0) / (FY1 - FY0)) * H
    g.save(); g.beginPath(); g.rect(ox, oy, W, H); g.clip(); g.lineCap = g.lineJoin = 'round'
    // brows: short, thick, softly arched, round ends, tucked just under the bangs (focus: a touch lower and flatter)
    const by = (name === 'excited' ? 0.0108 : name === 'sleepy' ? 0.0088 : name === 'focus' ? 0.0093 : 0.0098) + 0.0004 * FT, arc = name === 'focus' ? 0.0022 : 0.0031
    g.strokeStyle = BROW; g.lineWidth = 0.0040 * s // pass 12c: a touch thicker
    for (const sd of [-1, 1]) { g.beginPath(); const bx = 0.0029 * FT; g.moveTo(X(sd * (0.0192 - bx)), Y(by - 0.0015 + (name === 'focus' ? -0.0004 : 0))); g.quadraticCurveTo(X(sd * (0.0261 - bx)), Y(by + arc), X(sd * (0.0328 - bx)), Y(by - 0.0012)); g.stroke() }
    // nose: a tiny warm dot
    g.fillStyle = 'rgba(232,148,128,.9)'; g.beginPath(); el(X(0), Y(-0.0238 + FDY + 0.0005 * FT - 0.0026 * F10), 0.0017 * s, 0.0011 * s); g.fill()
    // mouth: small soft u (happy), small flat smile (focus), little frown (sleepy), open D with tongue (excited)
    const my = -0.0351 + FDY + 0.0008 * FT - 0.0014 * F10 // mouth rises a bit more than the eyes: tighter cluster
    if (name === 'excited') { const mouth = () => { g.beginPath(); g.moveTo(X(-0.0088), Y(my + 0.0032)); g.quadraticCurveTo(X(0), Y(my + 0.0042), X(0.0088), Y(my + 0.0032)); g.bezierCurveTo(X(0.0084), Y(my - 0.0082), X(-0.0084), Y(my - 0.0082), X(-0.0088), Y(my + 0.0032)); g.closePath() }
      mouth(); g.fillStyle = '#a3403a'; g.fill(); g.save(); g.clip(); g.fillStyle = '#ef8076'; g.beginPath(); el(X(0), Y(my - 0.0066), 0.0062 * s, 0.0036 * s); g.fill(); g.restore()
      mouth(); g.strokeStyle = '#7a2a24'; g.lineWidth = 0.0011 * s; g.stroke() }
    else { g.strokeStyle = '#c0533f'; g.lineWidth = 0.0021 * s; g.beginPath()
      if (name === 'sleepy') { g.moveTo(X(-0.0042), Y(my - 0.0012)); g.quadraticCurveTo(X(0), Y(my + 0.0026), X(0.0042), Y(my - 0.0012)) }
      else if (name === 'focus') { g.moveTo(X(-0.0054), Y(my + 0.0004)); g.quadraticCurveTo(X(0), Y(my - 0.0022), X(0.0054), Y(my + 0.0004)) }
      else { g.moveTo(X(-0.0068), Y(my + 0.0013)); g.quadraticCurveTo(X(0), Y(my - 0.0044), X(0.0068), Y(my + 0.0013)) }
      g.stroke() }
    g.restore()
  })
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter; return t
}
let atlas = null
const lin = (hex) => { const c = new THREE.Color(hex); return `vec3(${c.r.toFixed(5)},${c.g.toFixed(5)},${c.b.toFixed(5)})` } // sRGB hex -> linear (like the sRGB atlas)
const f5 = (x) => x.toFixed(6)
const FACE_FS = `uniform sampler2D map; uniform float uCellA, uCellB, uMix, uOpen, uSquint, uBlush, uBig, uLash; uniform vec2 uGaze; uniform vec3 uLight, uAmb; varying vec2 vUv;
  vec4 cellTex(float k, vec2 u){ vec2 cl = vec2(mod(k, 2.), floor(k*.5)); return texture2D(map, vec2((cl.x + u.x)*.5, (1. - cl.y + u.y)*.5)); }
  float cov(float d){ return clamp(.5 - d/max(fwidth(d), 1e-7), 0., 1.); } // d < 0 inside, ~1px AA at any distance
  float eSD(vec2 d, vec2 R){ vec2 q = d/R; float k = max(length(q), 1e-5); return (k - 1.)/max(length(q/(R*k)), 1e-5); } // ~signed distance to an ellipse
  void over(inout vec4 c, vec3 col, float a){ c.rgb = col*a + c.rgb*(1. - a); c.a = a + c.a*(1. - a); } // premultiplied
  void eye(inout vec4 c, vec2 p, float sd){
    vec2 E = vec2(sd*${f5(EYE.x)}, ${f5(EYE.y)}), R = vec2(${f5(EYE.rx)}, ${f5(EYE.ry)})*uBig;
    float o = uOpen, k = smoothstep(.1, .3, o), ry = R.y*max(o, .03);
    vec2 Es = vec2(E.x, E.y - R.y + ry), Rs = vec2(R.x, ry), d = p - Es;   // the upper lid comes down; the bottom stays put
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
      over(e, vec3(1.), aS*cov(length(p - I0 - vec2(.3*IR.x, .36*IR.y)) - R.x*.34)); // the one highlight, moves with the iris
      over(e, ${lin('#3a221a')}, .28*cov(abs(dS) - .00025)*cov(yb - p.y));       // soft skin boundary
      // thick tapered upper lid hugging the (closing) eye: nose-side top, over the top, down the outer side
      vec2 q = vec2(-sd*d.x/Rs.x, -d.y/Rs.y); float th = atan(q.y, q.x); if (th > -.35) th -= 6.2831853;
      float u = (th + .35)/(-3.14159265 - .1), W = R.y*.2;
      float w = W*smoothstep(0., .16, u)*(1. - smoothstep(.6, 1., u))*(.78 + .32*smoothstep(.25, .62, u));
      if (u > 0. && u < 1.) over(e, ${lin('#1e1410')}, cov(dS - .35*w)*cov(-.65*w - dS));
      e *= k;
    }
    if (k < 1.) { // shut: a thick downward-curved lash line with tapered ends (blink / sleepy)
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
const faceMat = () => new THREE.ShaderMaterial({ transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4,
  uniforms: { map: { value: atlas || (atlas = drawFaces(TOUCH ? 640 : 1024)) }, uCellA: { value: 0 }, uCellB: { value: 0 }, uMix: { value: 1 }, uOpen: { value: 1 }, uSquint: { value: 0 },
    uBlush: { value: 1 }, uBig: { value: 1 }, uLash: { value: 0 }, uGaze: { value: new THREE.Vector2() }, uLight: CEL_U.uLight, uAmb: CEL_U.uAmb },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
  fragmentShader: FACE_FS })
// head shape in the head frame (same SDF as the baked body: head ellipsoid smooth-unioned with two mochi cheeks)
const CHEEK = [0, -0.026, 0.012, 0.05, 0.0295, 0.035, 0.016] // pass 5: one wide jaw ellipsoid (two cheek blobs left a dip / double bump at the chin), softer blend
// pass 12c (KT, side view of the sheet): the profile shows a nose through the face's own contour. A soft swell of the
// mid-face around the nose blends into the head: in profile the line dips just under the eye, comes out to a rounded
// nose point and slopes back to the mouth and chin. Broad enough (about 6 bake cells tall) for the marching-cubes body to
// keep it. The body bake shades it with the normals of the head without the swell, so from the front it is invisible.
// 12h (KT, a red line drawn over the profile): straight down from under the eye, a sharp step out, a vertical front
// that stays forward down past the mouth, then a gradual curve back into the chin. The step and the vertical front are
// an oval column (an ellipsoid cannot make a flat front with a crisp top corner; 12k: a box's side edge looked like a beak in 3/4); a tall ellipsoid under it starts the
// curve into the chin, its front level with the box's at their seam.
// [y, z, rx, ry, rz, smin k]           ellipsoid (radii)
// [y, z, rx, hy, rz, smin k, round r]  oval column (cross-section radii, half height, edge radius)
const MIDFACE = [[-0.0278, 0.0397, 0.02, 0.0058, 0.014, 0.0012, 0.001], [-0.0345, 0.0303, 0.03, 0.0162, 0.0243, 0.0055]] // LOCKED (KT, template): the 12k shapes moved back 0.0033, a soft nose and chin
// 12m (KT: smoother in 3/4 without touching the side view): every swell recedes as MID_FADE * x^2 away from the centre
// line. Zero on the centre line, so the profile is exactly the same; in 3/4 the swells ease back into the cheeks.
const MID_FADE = 0 // locked at 0; raise it to ease the swells into the cheeks in 3/4 (never changes the profile)
const smin = (a, b, k) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25 }
// a short vertical column with an oval cross-section (rx, rz), half height hy, rounded top/bottom edges r: a flat vertical
// front with a crisp step in profile, but sides that round back into the cheeks in 3/4 (a box's side edge read as a beak)
const ocol = (x, y, z, cx, cy, cz, rx, hy, rz, r) => { const a = (x - cx) / rx, c = (z - cz) / rz, qx = (Math.sqrt(a * a + c * c) - 1) * Math.min(rx, rz), qy = Math.abs(y - cy) - hy
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r }
const ell = (x, y, z, cx, cy, cz, rx, ry, rz) => { const a = (x - cx) / rx, b = (y - cy) / ry, c = (z - cz) / rz; return (Math.sqrt(a * a + b * b + c * c) - 1) * Math.min(rx, ry, rz) }
const headSDF = (x, y, z) => { const [cx, cy, cz, rx, ry, rz, k] = CHEEK
  let h = smin(ell(x, y, z, 0, 0, 0, ...HR), Math.min(ell(x, y, z, -cx, cy, cz, rx, ry, rz), ell(x, y, z, cx, cy, cz, rx, ry, rz)), k)
  const fade = MID_FADE * x * x
  for (const [my, mz, a, b, c, mk, r] of MIDFACE) h = smin(h, (r != null ? ocol(x, y, z, 0, my, mz, a, b, c, r) : ell(x, y, z, 0, my, mz, a, b, c)) + fade, mk)
  return h }
// the decal: a grid over the face region, each vertex shot onto the head surface from the front and lifted a hair
const faceGeo = (() => { const NX = 30, NY = 22, pos = [], uv = [], ok = [], idx = []
  for (let j = 0; j <= NY; j++) for (let i = 0; i <= NX; i++) { const u = i / NX, v = j / NY, x = (u * 2 - 1) * FX, y = FY0 + v * (FY1 - FY0)
    let z = 0.09, hit = false; for (; z > -0.01; z -= 0.0008) if (headSDF(x, y, z) < 0) { hit = true; break }
    if (hit) { let a = z, b = z + 0.0008; for (let n = 0; n < 16; n++) { const m = (a + b) / 2; if (headSDF(x, y, m) < 0) a = m; else b = m } z = b + 0.0009 }
    pos.push(x, y, z); uv.push(u, v); ok.push(hit && z > 0.004) }
  for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) { const a = j * (NX + 1) + i, b = a + 1, c = a + NX + 1, d = c + 1
    if (ok[a] && ok[b] && ok[c] && ok[d]) idx.push(a, b, d, a, d, c) }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); return g })()

function ChibiFace({ st, lod }) {
  const mat = useMemo(faceMat, []), s = useRef({ A: 0, B: 0, mix: 1, mo: 1, lash: 0, big: 1, idle: 0, blinkT: 2 })
  useFrame(({ clock }, dt) => { dt = Math.min(dt, 0.05); const o = s.current, U = mat.uniforms, L = st.life
    const forced = (typeof window !== 'undefined' && window.__chibiFace) || q.get('face')
    let mood, open
    if (L) { mood = L.mood; open = L.open }
    else { // no life layer (should not happen): the old schedule
      o.idle = st.move > 0.05 || st.act ? 0 : o.idle + dt; o.blinkT -= dt; if (o.blinkT < 0) o.blinkT = 2.4 + Math.random() * 2.6
      mood = st.act === 'nap' || (T.night > 0.7 && o.idle > 4) || o.idle > 25 ? 'sleepy' : st.act && EXCITED_ACTS.has(st.act) && (st.actW ?? 1) > 0.3 ? 'excited' : 'happy'
      open = o.blinkT < 0.12 ? 0 : 1 }
    // sleepy: drowsy half-lids at night, fully shut on a nap or a long idle
    const shut = st.act === 'nap' || (L && L.idle > 25), moT = mood === 'sleepy' ? (shut ? 0 : 0.42) : 1
    o.mo = approach(o.mo, moT, moT < o.mo ? 1.6 : 6, dt)
    let cell = CELL[mood] ?? 0, gx = L ? L.gx : 0, gy = L ? L.gy : 0, squint = L ? L.squint : 0, blush = L ? 1 + 0.32 * L.blush * (0.75 + 0.25 * Math.sin(clock.elapsedTime * 2.6)) : 1
    open = Math.min(open, 1) * o.mo
    let lashT = mood === 'sleepy' ? 1 : 0, bigT = mood === 'excited' ? 1.05 : 1
    if (forced && FACES.includes(forced)) { cell = CELL[forced]; gx = gy = squint = 0; blush = 1; open = forced === 'blink' || forced === 'sleepy' ? 0 : 1; lashT = forced === 'sleepy' ? 1 : 0; bigT = forced === 'excited' ? 1.05 : 1
      o.A = o.B = cell; o.mix = 1; o.lash = lashT; o.big = bigT }
    if (cell !== o.B) { if (o.mix >= 0.5) o.A = o.B; o.B = cell; o.mix = 0 }
    o.mix = approach(o.mix, 1, 9, dt); o.lash = approach(o.lash, lashT, 6, dt); o.big = approach(o.big, bigT, 8, dt)
    U.uCellA.value = o.A; U.uCellB.value = o.B; U.uMix.value = o.mix; U.uOpen.value = open; U.uLash.value = o.lash; U.uBig.value = o.big
    U.uGaze.value.set(gx, gy); U.uSquint.value = squint; U.uBlush.value = blush })
  return <group ref={lod(2)}><mesh geometry={faceGeo} material={mat} renderOrder={2} /></group>
}

// ---------- hair: one sculpted helmet (heavy blunt bangs with a centre split, temple frames, round bob), side puffs,
// top bun and the ears, all one geometry with its own warm toon hair shader (1 draw) + the shared ink hull (1 draw).
const ss = (e0, e1, x) => { const u = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return u * u * (3 - 2 * u) }
const RH = [0.069, 0.0712, 0.0668], HC = [0, 0.003, -0.005], TUCK = 0.85 // the hair shell ellipsoid (pass 10: a wider, rounder dome; the sheet's bob is broad above the ears)
// Pass 3: the fringe is built from locks. Each lock is an arc of azimuth a (0 = front, -x = her right / viewer's left)
// whose lower edge is a rounded tip: y = tip + rise * (1 - sqrt(1 - u^2)), u in -1..1 across the lock. The hair edge is
// the lowest lock at each azimuth, so neighbouring locks meet in small scallop notches; where no lock reaches (the
// centre-left part, the temples, behind the side locks) the base edge shows a sliver of forehead / the ear.
// [a0, a1, tipY, rise, bulge]
// pass 4 (measured against the concept): three centre locks with small notches, then a deeper notch at |x| ~ 0.16 head
// widths, and outer locks that curve down over the temples into the side locks, so the forehead reads as a soft arch.
// [a0, a1, tipY, rise, bulge, slope]  (slope tilts the tip line across the lock: y += slope * u)
const LOCKS = [
  [-1.42, -1.04, -0.041, 0.016, 0.012, 0.003], // side lock framing the face, down to the jaw (pass 12: slimmer than pass 10's)
  [-1.12, -0.45, 0.0128, 0.012, 0.02, 0.0075], // outer lock curving down over the temple
  [-0.47, -0.14, 0.0186, 0.009, 0.024, -0.005],
  [-0.17, 0.17, 0.0184, 0.004, 0.028], // the big centre lock
  [0.14, 0.47, 0.0186, 0.009, 0.024, 0.005],
  [0.45, 1.12, 0.0128, 0.012, 0.02, -0.0075],
  [1.04, 1.42, -0.041, 0.016, 0.012, -0.003]]
function baseY(t) { let y = 0.036 + (-0.004 - 0.036) * ss(0.86, 1.12, t); y += (-0.052 - y) * ss(1.3, 1.62, t); return y } // pass 4: the bob comes down right behind the side locks (no gap above the puffs)
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
const AZ = (() => { const out = []; let a = -Math.PI; while (a < Math.PI - 1e-6) { out.push(a); a += Math.abs(a) < 1.45 ? 0.038 : 0.095 } return out })() // pass 11: denser behind (the flared bob's silhouette)
// pass 11 (KT, kept in pass 12): the bob's lower half flares out into one continuous curled lobe at the sides and back
// (it replaces the separate side-puff spheres, whose own ink ring read as a second ball in profile). Horizontal only, so
// the hem does not drop onto the shoulders. FL = flare at the sides; it eases off toward the back and is zero across the
// face and side locks.
const FL = 0.34, FL_BACK = 0.25
function flare(t, th, thE) { // a round bulge (circular profile) over the lower band, so the lobe curls instead of making a wing
  const w = ss(1.4, 1.75, t) * (FL + (FL_BACK - FL) * ss(1.9, 2.9, t)), a = 1.62, c = a + 0.52 * (thE - a), h = 0.6 * (thE - a), u = (th - c) / h
  return th <= a ? 0 : w * Math.sqrt(Math.max(0, 1 - u * u))
}
// ears (pass 12): small and flat, lying against the side of the head between the side lock and the bob; turned a
// little forward so they read from the front without poking out like a ball
const EAR = { x: 0.068, y: -0.0165, z: 0.0025 }
function helmetGeo(NT = 18, NL = 5) {
  const pos = [], idx = [], gro = [], rho = 0.0033, cols = [], NA = AZ.length
  for (let i = 0; i < NA; i++) { const a = AZ[i], t = Math.abs(a), sa = Math.sin(a), ca = Math.cos(a)
    const [yE, bulge, groove] = edge(a), thE = Math.acos(Math.min(0.97, Math.max(-0.97, (yE - HC[1]) / RH[1]))), col = [], cg = []
    const P = (th) => { let st = Math.sin(th); const ct = Math.cos(th), w = ss(0.55, 1.3, th), front = ss(1.2, 0.2, t) * ss(0.55, 1.3, th) /* pass 4: by polar angle, so neighbouring locks meet without a ridge up to the crown */
      if (th > Math.PI / 2) st = 1 - 0.42 * (1 - st) // below the equator the hair hangs straight down instead of hugging the jaw
      const r = 1 + 0.026 * front + bulge * w, rh = r + flare(t, th, thE), Q = [HC[0] + RH[0] * st * sa * rh, HC[1] + RH[1] * ct * r, HC[2] + RH[2] * st * ca * rh]
      // pass 4: the fringe tips come down onto the forehead (no see-through gap under the bangs, so no stray ink lines)
      const tk = TUCK * ss(thE - 0.2, thE, th) * ss(1.06, 0.72, t) /* only the tip curls in (a wider band makes flaps where locks hand over) */; if (tk <= 0) return Q
      const d = [Q[0] - HC[0], Q[1] - HC[1], Q[2] - HC[2]], L = Math.hypot(...d); d.forEach((v, i) => { d[i] = v / L })
      if (headSDF(HC[0] + d[0] * L, HC[1] + d[1] * L, HC[2] + d[2] * L) < 0) return Q
      let lo = 0, hi = L; for (let n = 0; n < 24; n++) { const m = (lo + hi) / 2; if (headSDF(HC[0] + d[0] * m, HC[1] + d[1] * m, HC[2] + d[2] * m) < 0) lo = m; else hi = m }
      const s2 = Math.max(hi + 0.0016, L - (L - hi) * 1) * (1 - tk) + (hi + 0.0016) * tk
      return [HC[0] + d[0] * s2, HC[1] + d[1] * s2, HC[2] + d[2] * s2] }
    for (let j = 1; j <= NT; j++) { const f = j / NT; col.push(P(thE * (0.4 * f + 0.6 * Math.sin(f * Math.PI / 2)))); /* pass 11: rows bunch toward the hem (the curl) */ cg.push(groove * ss(0.3, 0.95, f) * (t < 1.45 ? 1 : 0)) }
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
let HAIR_INK_GEO = null
const HAIR_GEO = (() => {
  const ball = new THREE.SphereGeometry(1, 18, 12), ballS = new THREE.SphereGeometry(1, 12, 9), ring = new THREE.TorusGeometry(1, 0.34, 6, 16), hel = helmetGeo()
  const parts = [hel,
    part(ball, [0, -0.02, -0.024], [0.071, 0.061, 0.058]), // back volume of the bob (pass 10: fuller)
    part(ball, [0, 0.0715, -0.008], [0.0168, 0.016, 0.017]), // top bun
    part(ring, [0, 0.064, -0.007], [0.0122, 0.0122, 0.0105], [Math.PI / 2 - 0.15, 0, 0]),
    ...[-1, 1].map(d => part(ballS, [d * EAR.x, EAR.y, EAR.z], [0.0042, 0.0122, 0.0076], [0, d * 0.75, d * 0.1], 1)), // pass 12 ears (skin); 12c: longer vertically
]
  // life layer: aW = (part, weight) for the secondary springs (0/1 side puffs, 2 top bun, 3 front + side locks); 0 weight = rigid
  const W = (g, f) => { const p = g.attributes.position, a = new Float32Array(p.count * 2); for (let i = 0; i < p.count; i++) { const r = f(p.getX(i), p.getY(i), p.getZ(i)); a[i * 2] = r[0]; a[i * 2 + 1] = r[1] } g.setAttribute('aW', new THREE.BufferAttribute(a, 2)); return g }
  const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t) }
  // the flared lobe rides the side springs (0 = her right / -x, 1 = left); the fringe and side locks keep spring 3
  // the flared lobe rides the side springs (0 = her right / -x, 1 = left); the fringe and side locks keep spring 3
  W(parts[0], (x, y, z) => { const wf = sm(0.03, -0.04, y) * sm(-0.01, 0.035, z), ws = sm(0.06, 0.088, Math.abs(x)) * sm(-0.012, -0.045, y); return ws > wf ? [x < 0 ? 0 : 1, ws] : [3, wf] }); W(parts[1], () => [3, 0])
  W(parts[2], (x, y) => [2, sm(0.058, 0.085, y)]); W(parts[3], () => [2, 0.35])
  for (const k of [4, 5]) W(parts[k], () => [3, 0]) // ears: rigid
  const g = mergeGeometries(parts); g.computeBoundingSphere()
  HAIR_INK_GEO = g; return g })()
const HOFF = `attribute vec2 aW; uniform vec3 uOff[4];
  vec3 hoff(){ vec3 o = aW.x < .5 ? uOff[0] : aW.x < 1.5 ? uOff[1] : aW.x < 2.5 ? uOff[2] : uOff[3]; return o*aW.y; }
`
// the hair's own ink hull gets the same spring offsets, so the outline follows the moving buns (still 1 draw)
const hairInk = (() => { const m = mkOutline(false); m.uniforms.uOff = { value: HAIR_OFF }; m.vertexShader = HOFF + m.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n  transformed += hoff();'); return m })()
let hairShader = null
const chibiHairMat = (skin) => hairShader || (hairShader = new THREE.ShaderMaterial({
  uniforms: { uOff: { value: HAIR_OFF }, uSun: CEL_U.uSun, uLight: CEL_U.uLight, uAmb: CEL_U.uAmb, uRim: CEL_U.uRim, uHair: { value: new THREE.Color('#432c22') }, uBand: { value: new THREE.Color('#7a5641') }, uSkin: { value: new THREE.Color(skin) } },
  vertexShader: HOFF + `attribute float aSkin; varying vec3 vN, vV, vO; varying float vSkin;
    void main(){ vO = position; vSkin = aSkin; vec4 mv = modelViewMatrix*vec4(position + hoff(),1.); vN = normalize(normalMatrix*normal); vV = -mv.xyz; gl_Position = projectionMatrix*mv; }`,
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
  return <group ref={set('hair')}><mesh geometry={HAIR_GEO} material={chibiHairMat(CHIBI.outfit.skin)} /><mesh geometry={HAIR_INK_GEO} material={hairInk} /></group>
}

// satchel (turnaround sheet): top handle, stitched flap with two buckled straps, side pockets (daisy, scroll), a plaid
// blanket rolled underneath and a compass charm. One vertex-coloured cel mesh + one ink hull: still 2 draws.
let satchel = null, satchelMat = null
const SATCHEL_INK = mkOutline(false)
// [x, y, z, yaw]: in the bag group (her left hip); the front turns out and forward as on the sheet
const BAG_AT = [0.016, -0.05, 0.016, 0.4]
function ChibiSatchel() {
  if (!satchel) { satchel = buildSatchel()
    satchelMat = cel('#ffffff').clone(); satchelMat.uniforms = { ...satchelMat.uniforms, ...CEL_U, uColor: { value: new THREE.Color(1, 1, 1) } }; satchelMat.vertexColors = true; satchelMat.defines = { KIND: 1 } }
  return <group position={BAG_AT.slice(0, 3)} rotation={[0, BAG_AT[3], 0]}><mesh geometry={satchel.cel} material={satchelMat} /><mesh geometry={satchel.line} material={SATCHEL_INK} /></group>
}
// pass 10 body details (turnaround sheet), all her-only via ext hooks:
// puff sleeve with a rolled cuff band at the hem (one geometry, so the sleeve is still 1 cel + 1 ink)
const SLEEVE_GEO = (() => {
  const prof = [[0.0, -0.051], [0.019, -0.052], [0.026, -0.048], [0.025, -0.041], [0.029, -0.028], [0.03, -0.01], [0.026, 0.006], [0.016, 0.014], [0.0, 0.016]]
  const body = new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), 28)
  // pass 11 (KT): a flat folded band (straight face, softly rounded edges), not a round donut
  const band = [[0.0236, -0.0522], [0.0292, -0.0526], [0.0312, -0.0518], [0.0318, -0.0502], [0.0318, -0.0418], [0.0313, -0.0402], [0.0298, -0.0394], [0.0246, -0.0392]]
  const roll = new THREE.LatheGeometry(band.map(([r, y]) => new THREE.Vector2(r, y)), 28)
  const g = mergeGeometries([body.toNonIndexed(), roll.toNonIndexed()]); g.computeBoundingSphere(); return g })()
// rolled jeans cuffs: a tall flat band, a little wider than the leg (the base cuff is a round donut)
const CUFF_GEO = (() => { const pr = [[0, -0.0125], [0.0255, -0.0127], [0.0281, -0.0121], [0.0292, -0.0104], [0.0295, -0.0075], [0.0295, 0.0072], [0.0291, 0.0098], [0.0279, 0.0113], [0.0252, 0.0118], [0.02, 0.0118], [0, 0.0116]]
  const g = new THREE.LatheGeometry(pr.map(([r, y]) => new THREE.Vector2(r, y)), 28); g.deleteAttribute('uv'); g.computeBoundingSphere(); return g })()
// scarf tails: broad flat ribbons with a notched end that hang down the front (the base tails are thin pyramids)
const TAIL_GEO = (() => { const sh = new THREE.Shape(), w0 = 0.0105, w1 = 0.013, L = 0.058
  sh.moveTo(-w0, 0); sh.lineTo(w0, 0); sh.quadraticCurveTo(w1 * 1.05, -L * 0.5, w1, -L); sh.lineTo(0, -L + 0.008); sh.lineTo(-w1, -L); sh.quadraticCurveTo(-w1 * 1.05, -L * 0.5, -w0, 0)
  const g = new THREE.ExtrudeGeometry(sh, { depth: 0.0035, bevelEnabled: true, bevelThickness: 0.0016, bevelSize: 0.0016, bevelSegments: 2, curveSegments: 6 })
  g.translate(0, -0.006, -0.0035); g.deleteAttribute('uv'); g.clearGroups(); g.computeVertexNormals(); return g })()
const LIFE_OFF = q.has('still') && !q.has('life')
export const CHIBI = { ...TRAVELLER, name: 'chibi-her', age: 'toddler',
  // pass 3: proportions from the concept front view (head : torso : legs ~ 42 : 36 : 22): a slightly smaller head over a
  // taller soft barrel torso, thick straight trouser legs, chunky round boots, short arms hanging close to the body
  // pass 4 arms (measured on the concept front): longer soft forearm ~70% of the puff-sleeve width, rounder mitten hands,
  // hanging a little further from the body
  body: { H: 0.89, head: 1.45, leg: 0.96, torso: 1.13, arm: 0.92, girth: 1.25, shoulder: 1.0, chestW: 1.12, bellyZ: 0.86, shX: 1.26, armA: 0.5,
    armR: [1.12, 1.4, 1.5], legR: 1.28, legX: 1.06, foot: 1.4, bootW: 1.5, bootH: 1.45, bootL: 1.04, hand: 1.2, cheek: CHEEK, midface: MIDFACE, midfaceFade: MID_FADE,
    // pass 11 boots (KT): taller chunky boots that stand on a flat sole. The ankle rises 0.01 and the shin shortens to
    // match (leg 1.06 -> 0.96 keeps the hip where it was), so the cuffs ride higher and more boot shows below them.
    anY: 0.044, footY: 0.017, soleY: 0.0012, bootShaft: [0.0228, 0.0165, 0.0238, -0.009] },
  hair: { style: 'chibi', c: '#3b2a22' },
  scarf: '#d9503f', // pass 12 skin: warmer, deeper peach measured off the sheet
  // pass 10: palette from the turnaround sheet (warmer shirt, deeper denim and scarf), stitched seams
  outfit: { ...TRAVELLER.outfit, skin: '#f3bf98', top: '#f7ead3', bottom: '#4271b8', shoe: '#83492a', cuffs: '#6d95d2', bibW: 0.042, waistUp: 0.04, shoeY: 0.05, seams: true },
  // anim pass 2 (KT: too bouncy): a low rounded bob instead of a hop, weight carried in the hips and shoulders (more sway
  // and twist), a softer footfall squash, a slightly longer stride
  walk: { rate: 11, stride: 0.6, knee: 0.8, bounce: 0.011, smooth: true, land: 0.35, arm: 0.72, lean: 0.06, twist: 0.15, sway: 0.095, idle: 'contra' },
  ext: { life: (B, st, dt, t, R_, mem, state) => { const L = mem.life || (mem.life = makeLife()); st.life = L; L.B = B; L.R = R_; if (typeof window !== 'undefined') window.__herLife = L
    const P = window.__herProf, t0 = P ? performance.now() : 0
    if (!LIFE_OFF) lifeStep(L, B, st, dt, t, R_, state.camera)
    if (P) { P.ms += performance.now() - t0; P.n++ } }, // window.__herProf = { ms: 0, n: 0 }: CPU time of the life layer (perf runs)
  post: (R_, st, dt, t) => { if (!LIFE_OFF) lifePost(st.life, R_, st, dt, t) }, // ?still in the studio: no life layer (matched before/after stills); add &life to keep it
    Face: ChibiFace, Hair: ChibiHair, sleeveGeo: SLEEVE_GEO, cuffGeo: CUFF_GEO, tailGeo: TAIL_GEO, tails: [-0.3, 0.24], tailX: 0.3, knot: [0, -0.023, 0.014, 1.6], ring: [1.22, 1.2, 1.2], bag: [-0.02, -0.024, 0.043, 1.3], strap: [0.82, 0.1, -0.02, 0.6, 0, 0.012, 2.4], strapC: '#8a4e2c', Bag: ChibiSatchel } }
// on the bike the big chibi head would dwarf the frame: she eases down to RIDE_S while riding (the ride pose works in her
// local space, so the seat, the pedal IK and the bars still line up at any scale)
const RIDE_S = 0.8
export function ChibiHer({ st }) {
  const g = useRef()
  useFrame((_, dt) => { const o = g.current; if (!o) return; const k = st.act === 'ride_bike' ? RIDE_S : 1, s = o.scale.x
    if (Math.abs(k - s) > 1e-4) o.scale.setScalar(s + (k - s) * Math.min(1, Math.min(dt, 0.05) * 8)) })
  return <group ref={g}><Character cfg={CHIBI} st={st} res={80} /></group>
}
