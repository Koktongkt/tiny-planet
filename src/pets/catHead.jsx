// Mochi's head, Cozy Chibi pass (round 11), built like Pip's: one smooth head mesh from a soft-blended shape (wide
// round skull, full cheeks with little fur points, small muzzle and chin, big ears grown out of the skull), the
// Siamese points painted in the coat shader (dark diamond mask from the forehead over the eyes to below the mouth,
// dark ears with pink insides and cream fluff, whisker stripes on the cheeks, three stripes down the back of the head)
// and a painted face decal (eyes, blush, ':3' mouth / open mouth with tongue). A small 3D nose and thin whiskers keep
// the profile. Concept: docs/characters/ref/pets-chibi-concept.jpg (bottom row). Head units: half-width = 1.
import * as THREE from 'three'
import React, { useMemo } from 'react'
import { OUT, GEO } from '../home/kit.jsx'
import { ell, smin, sstep, hitOf, starMesh, faceDecal, paintEye, patchFur } from './sdfKit.js'

// ---------- shape ----------
export const CHEAD = { skull: [[0, 0.06, -0.06], [0.98, 0.7, 0.82]], jowl: [[0, -0.24, 0.04], [1.04, 0.5, 0.74]], tuft: [[0.98, -0.3, 0.02], [0.2, 0.11, 0.22]],
  muzzle: [[0, -0.19, 0.64], [0.27, 0.17, 0.3]], chin: [[0, -0.38, 0.48], [0.28, 0.2, 0.3]], kJ: 0.28, kT: 0.1, kM: 0.12, kCh: 0.16, kE: 0.1,
  ear: { base: [0.52, 0.4, -0.12], tilt: 0.2, back: 0.1, turn: 0.35, r1: 0.56, r2: 0.09, h: 1.12, flat: 0.4 } }
const E = CHEAD.ear, EARM = [-1, 1].map(s => new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(-E.back, s * E.turn, -s * E.tilt)).setPosition(s * E.base[0], E.base[1], E.base[2]))
const EARI = EARM.map(m => m.clone().invert()), _e = new THREE.Vector3()
function roundCone(x, y, z) { const b = (E.r1 - E.r2) / E.h, a = Math.sqrt(1 - b * b), qx = Math.hypot(x, z), k = -b * qx + a * y
  if (k < 0) return Math.hypot(qx, y) - E.r1
  if (k > a * E.h) return Math.hypot(qx, y - E.h) - E.r2
  return a * qx + b * y - E.r1 }
const ear = (x, y, z, i) => { _e.set(x, y, z).applyMatrix4(EARI[i]); return roundCone(_e.x, _e.y, _e.z / E.flat) * E.flat }
const sdf = (x, y, z) => { const H = CHEAD; let d = smin(ell(x, y, z, ...H.skull), ell(x, y, z, ...H.jowl), H.kJ)
  const [c, r] = H.tuft; d = smin(d, Math.min(ell(x, y, z, c, r), ell(x, y, z, [-c[0], c[1], c[2]], r)), H.kT) // little fur points at the cheeks
  d = smin(d, ell(x, y, z, ...H.muzzle), H.kM); d = smin(d, ell(x, y, z, ...H.chin), H.kCh)
  return smin(d, Math.min(ear(x, y, z, 0), ear(x, y, z, 1)), H.kE) }
const hit = hitOf(sdf)
const headGeo = (() => { const C = [0, -0.08, 0.1], V = (a) => new THREE.Vector3(...a)
  const EM = EARM.map(m => new THREE.Vector3(0, E.h * 0.3, 0).applyMatrix4(m)), EU = EARM.map(m => new THREE.Vector3(0, E.h, 0).applyMatrix4(m).sub(V(C)).normalize())
  // blend both ears' pulls continuously (a hard switch between them left a crack down the middle of the head)
  // (Mochi's ears are big and close together, so each ear's pull is kept narrow and the two never add up past one;
  // overlapping pulls folded the surface between the ears)
  const origin = (d) => { const ws = EU.map(u => sstep(0.9, 0.985, d[0] * u.x + d[1] * u.y + d[2] * u.z)), k = Math.min(1, 1 / Math.max(1e-6, ws[0] + ws[1])), o = [...C]
    for (let e = 0; e < 2; e++) { const w = ws[e] * k; o[0] += (EM[e].x - C[0]) * w; o[1] += (EM[e].y - C[1]) * w; o[2] += (EM[e].z - C[2]) * w } return o }
  return starMesh(sdf, { C, w: 96, h: 72, step: 0.01, far: 2.6, relax: 8, origin }) })()
const NOSE = (() => { const y = -0.11, t = hit([0, y, 2], [0, 0, -1], 0, 2.5); return [0, y, 2 - t] })()

// ---------- coat: cream with Siamese points ----------
const HEAD_GLSL = `vec3 p = vO; float ax = abs(p.x), w;
  // the mask: a point high on the forehead, a dark ring round each eye, and a wing past each eye's outer corner that
  // curves back in to the point below the mouth. The three are blended with a soft union, so the ring flows into the
  // wing tip (no notch) and the underside runs in one smooth curve from the wing tips to the bottom point.
  float dD = p.y > 0.46 || p.y <= 0. ? -1. : 0.62*pow((0.46 - p.y)/0.46, 0.9) - ax;
  float dR = 0.27 - length(vec2(ax - 0.39, p.y));
  float wg = p.y > -0.08 ? 0.7*sqrt(max(0., 1. - pow((p.y + 0.08)/0.1, 2.))) : 0.7*(1. - pow(clamp((-0.08 - p.y)/0.26, 0., 1.), 1.6));
  float dW = wg > .004 ? wg - ax : -1.; // (no zero-width sliver down the chin)
  float k1 = .06, h1 = clamp(.5 + .5*(dR - dD)/k1, 0., 1.), dDR = mix(dD, dR, h1) + k1*h1*(1. - h1);
  float k2 = .24, h2 = clamp(.5 + .5*(dW - dDR)/k2, 0., 1.), hw = mix(dDR, dW, h2) + k2*h2*(1. - h2) + ax;
  float m = min(hw - ax, p.z - 0.05); w = fwidth(m)*1.2 + 1e-4; float dark = smoothstep(-w, w, m);
  // whisker stripes on the cheeks: two tapered bands sloping down and out
  // (short: they start just outside the mask and taper to a point going back along the cheek)
  // (bold, starting just under the mask's wing and sloping down and out past the edge of the face)
  float sx = smoothstep(.56, .62, ax), o = ax - .56;
  for (int k = 0; k < 2; k++) { float yc = -0.21 - 0.13*float(k) - 0.14*o, th = 0.062*(1. - 0.45*smoothstep(0., .5, o))*smoothstep(-.3, -.1, p.z);
    float b = th > .004 ? th - abs(p.y - yc) : -1.; w = fwidth(b)*1.2 + 1e-4; dark = max(dark, sx*smoothstep(-w, w, b)); } // (a zero-width band would leave a hairline)
  // three stripes from the crown down the back of the head
  float back = (1. - smoothstep(.0, .15, p.z))*step(.05, p.y);
  for (int k = -1; k <= 1; k++) { float xc = 0.17*float(k)*(1. + 0.4*(1. - smoothstep(-.6, .2, p.z))); float b = 0.045*(1. - 0.5*(1. - smoothstep(-.75, -.2, p.z))) - abs(p.x - xc);
    w = fwidth(b)*1.2 + 1e-4; dark = max(dark, back*smoothstep(-w, w, b)*smoothstep(-.85, -.6, p.z - p.y*.2)); }
  // ears: dark all over, pink inside with cream fluff at the base, a dark rim left around the pink
  vec3 pinkC = uPink;
  for (int i = 0; i < 2; i++) { vec3 e = (uEarI[i]*vec4(p, 1.)).xyz; float t = e.y/${E.h.toFixed(3)};
    // the ear's own round-cone distance (same as the mesh): dark wherever the surface belongs to the ear, not the blend
    float q = length(vec2(e.x, e.z/${E.flat.toFixed(3)})), cb = ${((E.r1 - E.r2) / E.h).toFixed(4)}, ca = sqrt(1. - cb*cb), kk = -cb*q + ca*e.y;
    float de = (kk < 0. ? length(vec2(q, e.y)) - ${E.r1.toFixed(3)} : kk > ca*${E.h.toFixed(3)} ? length(vec2(q, e.y - ${E.h.toFixed(3)})) - ${E.r2.toFixed(3)} : ca*q + cb*e.y - ${E.r1.toFixed(3)})*${E.flat.toFixed(3)};
    float onEar = (1. - smoothstep(.015, .05, de))*smoothstep(.0, .08, t); dark = max(dark, onEar);
    float hwI = ${E.r1.toFixed(3)}*0.64*max(0., 1. - t/.86), di = hwI > .004 ? hwI - abs(e.x) : -1.; w = fwidth(di)*1.2 + 1e-4;
    float inner = smoothstep(-w, w, di)*smoothstep(.06, .12, t)*smoothstep(-.01, .02, e.z)*onEar;
    float fluff = (1. - smoothstep(.2 + .05*sin(e.x*60.), .26 + .05*sin(e.x*60.), t))*(1. - smoothstep(-.12, .0, e.x*sign(-(uEarI[i]*vec4(0.,0.,0.,1.)).x)));
    base = mix(base, mix(pinkC, uCream2, fluff), inner); dark *= 1. - inner; }
  base = mix(base, uDark, dark);`
const headMat = (c) => patchFur('mochiHead', c.col.main, { glsl: HEAD_GLSL, decl: 'uniform vec3 uDark, uPink, uCream2; uniform mat4 uEarI[2];',
  uniforms: { uDark: { value: new THREE.Color(c.col.dark) }, uPink: { value: new THREE.Color(c.col.inner) }, uCream2: { value: new THREE.Color(c.col.belly) }, uEarI: { value: EARI } } })

// ---------- painted face ----------
const X0 = -1.05, X1 = 1.05, Y0 = -0.75, Y1 = 0.6, INK = '#2a170e'
export const CEYE = { x: 0.39, y: 0.0, rx: 0.16, ry: 0.175 }
function paint(x, eyesOpen, mouthOpen) {
  const el = (cx, cy, rx, ry) => { x.beginPath(); x.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2) }
  for (const s of [-1, 1]) { x.save(); x.translate(s * 0.66, -0.2); x.scale(1, 0.58); const g = x.createRadialGradient(0, 0, 0, 0, 0, 0.17)
    g.addColorStop(0, 'rgba(244,138,132,.6)'); g.addColorStop(0.6, 'rgba(244,138,132,.35)'); g.addColorStop(1, 'rgba(244,138,132,0)'); x.fillStyle = g; x.beginPath(); x.arc(0, 0, 0.17, 0, 7); x.fill(); x.restore() }
  for (const s of [-1, 1]) paintEye(x, s, s * CEYE.x, CEYE.y, CEYE.rx, CEYE.ry, eyesOpen, INK)
  if (mouthOpen) { // small open mouth with a tongue under the ':3'
    x.beginPath(); x.moveTo(-0.09, -0.235); x.quadraticCurveTo(0, -0.255, 0.09, -0.235); x.bezierCurveTo(0.095, -0.32, 0.055, -0.38, 0, -0.38); x.bezierCurveTo(-0.055, -0.38, -0.095, -0.32, -0.09, -0.235); x.closePath()
    x.fillStyle = '#6a2820'; x.fill(); x.save(); x.clip(); el(0, -0.36, 0.075, 0.09); x.fillStyle = '#ef8580'; x.fill(); x.restore()
    x.beginPath(); x.moveTo(-0.09, -0.235); x.bezierCurveTo(-0.095, -0.32, -0.055, -0.38, 0, -0.38); x.bezierCurveTo(0.055, -0.38, 0.095, -0.32, 0.09, -0.235); x.lineWidth = 0.024; x.strokeStyle = INK; x.stroke() }
  x.beginPath(); x.moveTo(0, -0.165); x.lineTo(0, -0.2) // ':3'
  for (const s of [-1, 1]) { x.moveTo(0, -0.2); x.quadraticCurveTo(s * 0.02, -0.255, s * 0.08, -0.25); x.quadraticCurveTo(s * 0.14, -0.245, s * 0.16, -0.2) }
  x.lineWidth = 0.028; x.strokeStyle = INK; x.lineCap = 'round'; x.lineJoin = 'round'; x.stroke()
}
const FACE = faceDecal(sdf, { X0, X1, Y0, Y1, paint })
// whiskers: two thin strokes a side, continuing the cheek stripes past the outline
const WHISK = [-1, 1].flatMap(s => [0, 1].map(k => { const x = s * 0.98, y = -0.21 - 0.13 * k - 0.14 * 0.45, t = hit([x * 1.2, y, 0.3], [-s, 0, 0], 0, 1.5); return { s, k, p: [x * 1.2 - s * (t ?? 0.2), y, 0.3] } }))

export function CatHead({ c, M, set }) {
  const hr = c.head, fm = useMemo(FACE.mat, []), hm = headMat(c)
  return <group scale={hr}>
    <mesh geometry={headGeo} material={hm} /><mesh geometry={headGeo} material={OUT.pet} />
    <mesh ref={set('face')} geometry={FACE.geo} material={fm} renderOrder={2} />
    <group position={NOSE}><mesh geometry={GEO.sph} material={M.nose} scale={[0.1, 0.065, 0.05]} /><mesh geometry={GEO.sph} material={OUT.pet} scale={[0.1, 0.065, 0.05]} />
      <mesh geometry={GEO.sph} material={M.shine} position={[-0.03, 0.025, 0.04]} scale={[0.026, 0.016, 0.01]} /></group>
    {c.whiskers && WHISK.map(({ s, k, p }) => <mesh key={s + '' + k} geometry={GEO.box} material={M.dark} position={[p[0] + s * 0.08, p[1] - 0.02, p[2]]} rotation={[0, s * 0.25, -s * (0.14 + 0.1 * k)]} scale={[0.24, 0.032, 0.032]} />)}
  </group>
}
