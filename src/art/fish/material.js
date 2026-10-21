// Shared fish materials (art-c): one MeshToonMaterial for every species (pattern painted in the fragment shader from
// per-vertex attributes, so one material + one geometry per species = instanceable) and a matching inverted-hull ink.
// Gentle swim wiggle in the vertex shader (uSwim 0..1, per-instance phase from the instance position) — 0 JS per frame.
import * as THREE from 'three'
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { toonRamp, wind } from '../../world.js'
export const FISH_U = { uTime: wind.time, uSwim: { value: 1 } }
const WIGGLE = `
  float fu = aFP.x, bendW = fu * fu;
  vec3 io = vec3(0.);
  #ifdef USE_INSTANCING
    io = instanceMatrix[3].xyz;
  #endif
  io += modelMatrix[3].xyz;
  float swPh = dot(io, vec3(13.1, 7.7, 5.3));
  float sw = sin(uTime * 7. + fu * 3.4 + swPh) * uSwim * bendW;
  transformed.z += sw * 0.085; transformed.x += abs(sw) * 0.01;`
const PATTERN = `
  float fh(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float fn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return mix(mix(fh(i), fh(i + vec2(1, 0)), f.x), mix(fh(i + vec2(0, 1)), fh(i + vec2(1, 1)), f.x), f.y); }
  float fishPat(vec4 fp, vec4 pt) {
    float t = pt.x, sc = pt.y, sd = pt.z * 50.; vec2 q = vec2(fp.x * 6.5 * sc, (fp.y + fp.z * .35) * 2.2 * sc) + sd; float m = 0.;
    if (t < .5) return 0.;
    else if (t < 1.5) { // round spots on the back half
      vec2 g = floor(q * 1.6), f = fract(q * 1.6) - .5; float r = fh(g) * .28 + .1; vec2 o = (vec2(fh(g + 7.), fh(g + 3.)) - .5) * .35;
      m = (1. - smoothstep(r - .03, r + .03, length(f - o))) * step(.35, fh(g + 11.)) * smoothstep(-.45, .05, fp.y); if (sc < .5) m = 1. - smoothstep(.07, .1, length(vec2(fp.x - .2, fp.y - .05) * vec2(1., .8))); }
    else if (t < 2.5) m = smoothstep(.25, .35, sin(fp.x * 6.28 * 4. * sc + fn(q * 2.) * 1.5)) * smoothstep(-.6, -.1, fp.y);
    else if (t < 3.5) { float n = fn(vec2(fp.x * 4.5, fp.y * 2.2 + fp.z * 1.7) + sd) * .7 + fn(vec2(fp.x * 9., fp.y * 4. - fp.z * 3.) + sd) * .3; m = smoothstep(.5, .54, n) * smoothstep(-.7, -.2, fp.y); }
    else if (t < 4.5) m = smoothstep(.55, .62, sin(fp.x * 50. * sc + sin(fp.y * 9. + fp.x * 6.) * 1.6)) * smoothstep(.05, .25, fp.y);
    else if (t < 5.5) { vec2 g = floor(q * 3.), f = fract(q * 3.) - .5; float r = fh(g) * .18 + .1; m = (1. - smoothstep(r - .04, r + .03, length(f))) * step(.45, fh(g + 5.)) * smoothstep(-.6, -.1, fp.y); }
    else if (t < 6.5) m = 1. - smoothstep(.05, .1, abs(fp.y - .02 + .03 * sin(fp.x * 14.)));
    else { vec2 s = vec2(fp.x * 15. * sc, fp.y * 4. * sc + fp.z * 2.); s.y += mod(floor(s.x), 2.) * .5; vec2 f = fract(s) - vec2(.5, .5); m = smoothstep(.3, .42, length(f * vec2(1., 1.25))) * .9 * smoothstep(-.7, .3, fp.y); }
    return m;
  }`
let MAT = null
export function fishMaterial() {
  if (MAT) return MAT
  const m = new THREE.MeshToonMaterial({ color: '#ffffff', vertexColors: true, gradientMap: toonRamp })
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, FISH_U)
    sh.vertexShader = sh.vertexShader.replace('#include <common>', `#include <common>
      attribute vec3 aBelly, aC2; attribute vec4 aFP, aPat; varying vec3 vBelly, vC2; varying vec4 vFP, vPat; uniform float uTime, uSwim;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
      vBelly = aBelly; vC2 = aC2; vFP = aFP; vPat = aPat;${WIGGLE}`)
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
      varying vec3 vBelly, vC2; varying vec4 vFP, vPat;${PATTERN}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
      if (vFP.w > .5) { float bl = smoothstep(-.32, -.12, vFP.y + .06 * sin(vFP.x * 23.) ); vec3 base = mix(vBelly, vColor, bl);
        base = mix(base, vC2, clamp(fishPat(vFP, vPat), 0., 1.) * vPat.w); diffuseColor.rgb = diffuse * base; }`)
  }
  m.customProgramCacheKey = () => 'tp-fish'
  return (MAT = m)
}
const INKS = new Map()
/** ink hull material for a given thickness (view-space units, ~0.0015 for an in-hand fish at follow-cam distance) */
export function fishInkMaterial(thick = 0.004) {
  const k = Math.round(thick * 1e5); if (INKS.has(k)) return INKS.get(k)
  const m = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms: { uInkT: { value: thick }, uInk: { value: new THREE.Color('#4a3a35') }, ...FISH_U },
    vertexShader: `uniform float uInkT, uTime, uSwim; attribute vec4 aFP;
      void main() { vec3 transformed = position;${WIGGLE}
        vec4 wp = vec4(transformed, 1.); vec3 n = normal;
        #ifdef USE_INSTANCING
          wp = instanceMatrix * wp; n = mat3(instanceMatrix) * n;
        #endif
        vec4 mv = modelViewMatrix * wp; vec3 nv = normalize(normalMatrix * n);
        mv.xyz += nv * uInkT * clamp(-mv.z * .35, .6, 2.2); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform vec3 uInk; void main() { gl_FragColor = vec4(uInk, 1.);
      #include <colorspace_fragment>
    }`,
  })
  INKS.set(k, m); return m
}
const HULLS = new Map()
/** welded, smooth-normal hull (position + aFP for the wiggle); eyes / whiskers dropped */
export function fishHullGeometry(geo) {
  if (HULLS.has(geo)) return HULLS.get(geo)
  const keep = geo.userData.ink, pa = geo.attributes.position, fa = geo.attributes.aFP, tri = []
  for (let i = 0; i < pa.count; i += 3) if (!keep || keep[i]) tri.push(i)
  const P = new Float32Array(tri.length * 9), F = new Float32Array(tri.length * 12); let o = 0, q = 0
  for (const t of tri) for (let v = 0; v < 3; v++) { for (let c = 0; c < 3; c++) P[o++] = pa.array[(t + v) * 3 + c]; for (let c = 0; c < 4; c++) F[q++] = fa.array[(t + v) * 4 + c] }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(P, 3))
  const w = mergeVertices(g, 1e-4); w.computeVertexNormals()
  // re-attach aFP to the welded vertices (nearest source vertex with the same position)
  const idx = new Map(); for (let i = 0; i < P.length / 3; i++) idx.set(P[i * 3].toFixed(4) + ',' + P[i * 3 + 1].toFixed(4) + ',' + P[i * 3 + 2].toFixed(4), i)
  const wp = w.attributes.position, wf = new Float32Array(wp.count * 4)
  for (let i = 0; i < wp.count; i++) { const j = idx.get(wp.getX(i).toFixed(4) + ',' + wp.getY(i).toFixed(4) + ',' + wp.getZ(i).toFixed(4)) ?? 0; for (let c = 0; c < 4; c++) wf[i * 4 + c] = F[j * 4 + c] }
  w.setAttribute('aFP', new THREE.BufferAttribute(wf, 4)); g.dispose(); w.computeBoundingSphere(); HULLS.set(geo, w); return w
}
