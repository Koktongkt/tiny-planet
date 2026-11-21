// Pip's body + tail, Cozy Chibi pass (round 10), built like his head: one smooth torso mesh from a soft-blended shape
// (deep chest, barrel, round rump, haunches), smooth leg columns with forward paws, and a fat curled tail. The coat
// pattern lives in the shader so its edges stay crisp: orange back and flanks, cream chest bib between orange shoulder
// stripes, a cream belly band and cream 'pants' under the tail; cream legs with painted toe lines. The tail is a
// tapered spiral tube: a cream curl with an orange swirl winding into it. Concept: docs/characters/ref/pets-chibi-concept.jpg.
import * as THREE from 'three'
import React from 'react'
import { OUT } from '../home/kit.jsx'
import { ell, smin, starMesh, patchFur } from './sdfKit.js'

// ---------- torso, in body units (the rig scales x, y, z by cfg.body = half-width, half-height, half-length) ----------
const T = { barrel: [[0, 0, 0], [0.92, 0.88, 0.98]], chest: [[0, 0.04, 0.5], [0.9, 0.96, 0.6]], rump: [[0, 0.06, -0.5], [0.94, 0.9, 0.58]], haunch: [[0.44, -0.14, -0.46], [0.56, 0.68, 0.52]], k: 0.3 }
const tsdf = (x, y, z) => { let d = smin(ell(x, y, z, ...T.barrel), ell(x, y, z, ...T.chest), T.k); d = smin(d, ell(x, y, z, ...T.rump), T.k)
  const [c, r] = T.haunch; return smin(d, Math.min(ell(x, y, z, c, r), ell(x, y, z, [-c[0], c[1], c[2]], r)), 0.2) }
const torsoGeo = starMesh(tsdf, { C: [0, 0, 0], w: 64, h: 48, step: 0.01, far: 2, relax: 4 })
// cream where: belly band underneath, chest bib in front (between the orange shoulder stripes), pants under the tail
const TORSO_GLSL = `vec3 p = vO; float ax = abs(p.x);
  float belly = -0.56 - 0.6*smoothstep(-.15, -.45, p.z)*smoothstep(.25, .55, ax); // a slim belly band underneath; the orange flank runs down into the hind thighs
  float bib = (0.44 - 0.2*smoothstep(-.1, .7, p.y)) - ax;                      // bib narrows toward the top of the chest; orange shoulder stripes either side
  bib = min(min(bib, p.z - 0.18 + 0.25*smoothstep(.2, -.6, p.y)), 0.45 - p.y); // ...only on the front of the chest, not over the shoulders
  float pants = min(1. - length(vec2(ax/0.44, (p.y + 0.3)/0.55)), -0.6 - p.z);    // a soft arch under the tail, between the haunches
  float d = max(max(belly - p.y, bib), pants), w = fwidth(d)*1.2 + 1e-4;
  base = mix(base, uCream, smoothstep(-w, w, d));`
const torsoMat = (c) => patchFur('pipTorso', c.col.main, { glsl: TORSO_GLSL, decl: 'uniform vec3 uCream;', uniforms: { uCream: { value: new THREE.Color(c.col.cream) } } })

// ---------- leg: a slightly tapered column ending in a round paw that pushes forward; top at y = 0, ground at y = -1 ----------
const legGeo = (() => {
  const pts = [], N = 22
  for (let i = 0; i <= N; i++) { const t = i / N, y = 0.08 - t * 1.08 // from just above the hip to the ground
    let r = 0.94 + 0.1 * t + 0.5 * (1 - Math.min(1, t / 0.45)) ** 2 // flares out at the top so the leg swells out of the body; a touch wider toward the paw
    if (y > 0) r *= Math.sqrt(Math.max(0, 1 - (y / 0.08) ** 2)) * 0.6 + 0.4 // rounded top (buried in the body)
    if (y < -0.82) { const u = (-0.82 - y) / 0.18; r = 1.06 * Math.sqrt(Math.max(0, 1 - u * u)) } // round sole
    pts.push(new THREE.Vector2(Math.max(r, 0.001), y)) }
  pts.reverse()
  const g = new THREE.LatheGeometry(pts, 20), p = g.attributes.position
  for (let i = 0; i < p.count; i++) { const y = p.getY(i), k = Math.min(1, Math.max(0, (-0.7 - y) / 0.25)); p.setZ(i, p.getZ(i) * (1 + 0.25 * k) + 0.3 * k * k) } // paw: longer, pushed forward
  g.computeVertexNormals(); g.computeBoundingSphere(); return g
})()
// toe lines: two short ink grooves on the front of each paw
const LEG_GLSL = `vec3 p = vO; float toe = step(p.y, -0.78)*step(0.45, p.z);
  float l = min(abs(abs(p.x) - 0.32), 1.);
  float w = fwidth(p.x)*1.5 + 1e-4;
  base = mix(base, base*0.42, toe*(1. - smoothstep(0.05 - w, 0.05 + w, l)));`
// orange carried onto the legs: front legs get the shoulder stripe down the outer upper leg, hind legs an orange thigh
// (cream only on the inside). uSide = which way is 'outer' for this leg.
const LEG_COAT = `float o = vO.x*uSide + 0.25*vO.z*(uHind > .5 ? -1. : 0.), y = vO.y;
  float d = uHind > .5
    ? (0.5 + 0.35*o - 0.25*smoothstep(-.35, -.7, y)) - (-y)*1.0 - 0.0          // thigh: edge curves lower on the outside, round toward the hock
    : o - (0.05 + 1.1*smoothstep(-.15, -.68, y));                                // shoulder stripe: wide at the top, tapering to a point down the outer leg
  d = uHind > .5 ? d : d;
  float wc = fwidth(d)*1.2 + 1e-4; base = mix(base, uMain, smoothstep(-wc, wc, d));`
const legMat = (c, hind, side) => patchFur(`pipLeg${hind}${side}`, c.col.cream, { glsl: LEG_GLSL + LEG_COAT, decl: 'uniform vec3 uMain; uniform float uSide, uHind;',
  uniforms: { uMain: { value: new THREE.Color(c.col.main) }, uSide: { value: side }, uHind: { value: hind } } })
// the legs' ink outline stops just inside the body, so there's no ring where leg meets torso; only the silhouette below
const legOutC = {}
const legOut = (cut) => legOutC[cut] || (legOutC[cut] = (() => { const m = OUT.pet.clone()
  m.vertexShader = m.vertexShader.replace('void main(){', 'varying float vY; void main(){ vY = position.y;')
  m.fragmentShader = 'varying float vY;\n' + m.fragmentShader.replace('void main(){', `void main(){ if (vY > ${cut.toFixed(3)}) discard;`)
  return m })())

export function DogBody({ c, M, set, legs }) {
  const [bw, bh, bl] = c.body, L = c.legH + bh * 0.2, tm = torsoMat(c)
  const cut = (hind) => -(bh * (hind ? 0.44 : 0.52)) / L // where the torso's underside crosses the leg, in leg units
  return <>
    <group ref={set('torso')} scale={[bw, bh, bl]}><mesh geometry={torsoGeo} material={tm} /><mesh geometry={torsoGeo} material={OUT.pet} /></group>
    {legs.map(([k, sx, fz]) => <group key={k} ref={set('leg' + k)} position={[sx * bw * (fz > 0 ? 0.5 : 0.54), -bh * 0.35, fz * bl * (fz > 0 ? 0.52 : 0.5)]}>
      <group scale={[c.legR * (fz > 0 ? 1 : 1.08), L, c.legR * (fz > 0 ? 1 : 1.08)]}><mesh geometry={legGeo} material={legMat(c, fz > 0 ? 0 : 1, sx)} /><mesh geometry={legGeo} material={legOut(cut(fz < 0))} /></group>
    </group>)}
  </>
}

// ---------- tail: a fat tapered tube wound into a spiral in the y-z plane (seen face-on from the side); so fat its turns
// merge into a puffy curl, so the swirl itself is painted on in the shader ----------
const TURN = 2 * Math.PI * 1.25
const tailCurve = new (class extends THREE.Curve {
  getPoint(t, out = new THREE.Vector3()) { const a = t * TURN, r = 1 - 0.7 * t // rises from the rump, curls forward over the back, winds inward
    return out.set(0, 1 - r * Math.cos(a), -r * Math.sin(a) * 0.95) }
})()
const tubeR = (t) => 0.72 * (1 - 0.3 * t) * (t > 0.95 ? Math.sqrt(Math.max(0, 1 - ((t - 0.95) / 0.05) ** 2)) : 1) // tapers, then a round end
const tailGeo = (() => {
  const TS = 120, RS = 14, g = new THREE.TubeGeometry(tailCurve, TS, 1, RS, false), p = g.attributes.position, c = new THREE.Vector3()
  for (let i = 0; i <= TS; i++) { const t = i / TS, rr = tubeR(t); tailCurve.getPoint(t, c)
    for (let j = 0; j <= RS; j++) { const k = i * (RS + 1) + j, x = p.getX(k), y = p.getY(k), z = p.getZ(k)
      p.setXYZ(k, c.x + (x - c.x) * rr, c.y + (y - c.y) * rr, c.z + (z - c.z) * rr) } }
  g.computeVertexNormals(); g.computeBoundingSphere(); return g
})()
// the swirl, painted on the curl's faces: an orange spiral band edged with a thin ink line, winding into a cream centre
const TAIL_GLSL = `vec2 q = vec2(-vO.z, vO.y - 1.); float rad = length(q), th = atan(q.y, q.x)/6.2832 + .5;
  float u = rad*1.6 - th, b = fract(u), w = fwidth(u)*1.2 + 1e-4;
  float inside = (1. - smoothstep(.78, .84, rad))*smoothstep(.1, .16, rad);
  float band = (1. - smoothstep(.46 - w, .46 + w, b))*smoothstep(.02 - w, .02 + w, b);
  float line = 1. - smoothstep(0., w*1.6 + .015, abs(b - .47));
  base = mix(uCream, uMain, band*inside); base = mix(base, base*.45, line*inside*.8);`
const tailMat = (c) => patchFur('pipTail', '#ffffff', { glsl: TAIL_GLSL, decl: 'uniform vec3 uCream; uniform vec3 uMain;', 
  uniforms: { uCream: { value: new THREE.Color(c.col.cream) }, uMain: { value: new THREE.Color(c.col.main) } } })
export function ShibaTail({ c }) {
  const s = c.tail.ring, m = tailMat(c)
  return <group rotation={[0.1, 0, 0]} scale={s}><mesh geometry={tailGeo} material={m} /><mesh geometry={tailGeo} material={OUT.pet} /></group>
}
