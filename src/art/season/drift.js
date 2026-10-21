// <Drift> core (art-c): seasonal particles around her in ONE draw call, animated entirely on the GPU.
// spring: sakura petals · summer: pollen motes by day, fireflies at night · autumn: tumbling leaves · winter: snow.
// During a change-over each particle picks its season by hash against the uSeason weights, so the mix cross-fades.
// In winter, __T.rain turns into heavier snowfall (Rain.jsx fades out by the same weight).
import * as THREE from 'three'
import { SU } from './hooks.js'
const VS = `attribute vec4 aSeed; uniform float uTime, uRain, uNight, uSDay, uPx, uDens; uniform vec4 uSeason; uniform vec3 uBox, uOff;
varying vec4 vCol; varying vec3 vRot; varying float vType;
void main(){
  float h = aSeed.w, h2 = fract(h * 91.73), h3 = fract(h * 357.1);
  vec4 s = uSeason; float type = h < s.x ? 0. : h < s.x + s.y ? 1. : h < s.x + s.y + s.z ? 2. : 3.;
  // how many of each kind are on (fraction of the pool): petals .55, motes .35 (fireflies .7 at night), leaves .5, snow 1 (+rain)
  float dens = type < .5 ? .8 : type < 1.5 ? mix(.35, .7, uNight) : type < 2.5 ? .5 : min(1., .55 + .45 * uRain);
  float on = step(h3, dens * uDens * (type > 2.5 ? 1. : 1. - .7 * uRain));
  float fall = type < .5 ? .28 : type < 1.5 ? -.025 : type < 2.5 ? .42 : mix(.34, .55, uRain);
  float sway = type < .5 ? .5 : type < 1.5 ? .25 : type < 2.5 ? .6 : .3;
  vec3 p = aSeed.xyz * uBox;
  float sp = .7 + .6 * h2;
  p.y -= uTime * fall * sp;
  p.x += uTime * (type > 2.5 ? .08 : .16) + sin(uTime * (.7 + h2) + h * 40.) * sway;
  p.z += cos(uTime * (.55 + h3) + h * 31.) * sway * .8;
  if (type > .5 && type < 1.5) p += vec3(sin(uTime * .9 + h * 17.), sin(uTime * 1.3 + h * 9.) * .6, cos(uTime * .8 + h * 23.)) * .25;
  p -= uOff;
  p = mod(p, uBox) - uBox * .5; p.y += uBox.y * .3;
  vec3 q = p / uBox; float edge = (1. - smoothstep(.36, .5, max(abs(q.x), abs(q.z)))) * (1. - smoothstep(.4, .5, abs(q.y - .3)));
  vec4 mv = modelViewMatrix * vec4(p, 1.);
  float size = type < .5 ? .1 : type < 1.5 ? mix(.03, .06, uNight) : type < 2.5 ? .12 : mix(.05, .075, h2);
  gl_PointSize = size * uPx / max(.2, -mv.z) * on;
  gl_Position = projectionMatrix * mv;
  float near = smoothstep(.25, 1.1, -mv.z);
  float tum = uTime * (1.2 + 1.8 * h2) + h * 6.28;
  vRot = vec3(tum * (type > 2.5 || (type > .5 && type < 1.5) ? 0. : .6) + h * 6.28, max(.25, abs(cos(tum))), h2);
  vType = type;
  vec3 col; float a;
  if (type < .5) { col = mix(vec3(.98, .62, .74), vec3(1., .82, .88), h2); a = 1.; }
  else if (type < 1.5) { col = mix(vec3(1., .97, .78), vec3(.86, 1., .5) * 2.2, uNight); a = mix(.55, .9 * (.5 + .5 * sin(uTime * 2.4 + h * 40.)), uNight); }
  else if (type < 2.5) { col = h2 < .35 ? vec3(.95, .5, .2) : h2 < .6 ? vec3(.85, .3, .23) : h2 < .85 ? vec3(.96, .74, .28) : vec3(.72, .55, .3); a = 1.; }
  else { col = vec3(1.); a = 1.; }
  col *= mix(1., .55, uNight * step(vType, 2.5) * step(.5, abs(vType - 1.)));
  vCol = vec4(col, a * edge * near * on);
}`
const FS = `varying vec4 vCol; varying vec3 vRot; varying float vType;
void main(){
  vec2 q = gl_PointCoord - .5; float c = cos(vRot.x), s = sin(vRot.x); q = mat2(c, -s, s, c) * q; q.x /= vRot.y;
  float a;
  if (vType < .5) { // petal: rounded teardrop with a little notch
    vec2 p = q * vec2(2.4, 2.); float d = length(vec2(p.x, p.y * (p.y > 0. ? 1.25 : .9))); a = (1. - smoothstep(.5, .62, d)) * (1. - (1. - smoothstep(0., .06, abs(p.x))) * step(.42, p.y));
    gl_FragColor = vec4(mix(vCol.rgb, vCol.rgb * vec3(.78, .6, .66), smoothstep(.3, .55, d)), vCol.a * a); if (a < .02) discard; return;
  } else if (vType < 1.5) { float d = length(q); a = (1. - smoothstep(.0, .5, d)); a *= a; }
  else if (vType < 2.5) { // leaf: pointed vesica + a darker vein
    vec2 p = q * 2.2; float d = abs(p.x) + p.y * p.y * .9; a = (1. - smoothstep(.5, .62, d + abs(p.y) * .35));
    if (abs(p.x) < .045 && abs(p.y) < .5) { gl_FragColor = vec4(vCol.rgb * .7, vCol.a * a); return; }
    gl_FragColor = vec4(mix(vCol.rgb, vCol.rgb * .7, smoothstep(.35, .58, d + abs(p.y) * .35)), vCol.a * a); if (a < .02) discard; return;
  } else { float d = length(q); a = (1. - smoothstep(.4, .5, d)); gl_FragColor = vec4(mix(vec3(1.), vec3(.72, .78, .9), smoothstep(.22, .46, d)), vCol.a * a); if (a < .02) discard; return; }
  if (a < .02) discard;
  gl_FragColor = vec4(vCol.rgb, vCol.a * a);
}`
/** createDrift({ count, box: [w,h,d] }) -> { object: THREE.Points, update(anchor, camera, renderer) } */
export function createDrift({ count = 700, box = [8, 5, 8] } = {}) {
  const g = new THREE.BufferGeometry(), seeds = new Float32Array(count * 4)
  let s = 12345; const r = () => (s = (s * 16807) % 2147483647) / 2147483647
  for (let i = 0; i < count; i++) seeds.set([r(), r(), r(), (i + 0.5) / count], i * 4)
  // hash order shuffled so the season split is spatially even
  for (let i = count - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)), t = seeds[i * 4 + 3]; seeds[i * 4 + 3] = seeds[j * 4 + 3]; seeds[j * 4 + 3] = t }
  g.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 4)); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3))
  const m = new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: FS, transparent: true, depthWrite: false,
    uniforms: { uTime: SU.uTime, uSeason: SU.uSeason, uRain: SU.uRain, uNight: SU.uNight, uSDay: SU.uSDay, uPx: { value: 800 }, uDens: { value: 1 }, uBox: { value: new THREE.Vector3(...box) }, uOff: { value: new THREE.Vector3() } } })
  const o = new THREE.Points(g, m); o.frustumCulled = false; o.renderOrder = 3
  return { object: o, material: m, ...anchorer(o, m.uniforms) }
}
// keeps a particle box centred on an anchor (her position) aligned to the planet's up; world-stable when she walks:
// the movement since last frame (in the box's frame) is fed to uOff, so particles don't travel with her.
const _q = new THREE.Quaternion(), _d = new THREE.Vector3(), _iq = new THREE.Quaternion(), Y = new THREE.Vector3(0, 1, 0)
export function anchorer(o, U) {
  const st = { pos: new THREE.Vector3(), up: new THREE.Vector3(0, 1, 0), q: new THREE.Quaternion(), init: false }
  o.matrixAutoUpdate = false
  o.updateMatrixWorld = function () { this.matrixWorld.compose(st.pos, st.q, _one) } // ignores the parent: mount anywhere
  return {
    /** anchor: { p: world Vector3, up?: world Vector3 } | null (null / orbit view hides it) */
    update(anchor, camera, renderer) {
      if (!anchor || !anchor.p) { o.visible = false; return }
      o.visible = true
      const up = _d.copy(anchor.up || anchor.p).normalize()
      if (!st.init) { st.q.setFromUnitVectors(Y, up); st.pos.copy(anchor.p); st.up.copy(up); st.init = true }
      _q.setFromUnitVectors(st.up, up); st.q.premultiply(_q); st.up.copy(up)
      const mv = _d.copy(anchor.p).sub(st.pos); _iq.copy(st.q).invert(); mv.applyQuaternion(_iq)
      if (mv.lengthSq() < 4) U.uOff.value.add(mv) // teleports don't smear
      st.pos.copy(anchor.p)
      if (renderer && camera && U.uPx) { const h = renderer.domElement.height || 800; U.uPx.value = h / (2 * Math.tan((camera.fov || 50) * Math.PI / 360)) }
    },
  }
}
const _one = new THREE.Vector3(1, 1, 1)
