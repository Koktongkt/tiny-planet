// <Puddles> core (art-c): every puddle in ONE draw call (instanced quad, 2 tris each). Each puddle is a wobbly blob that
// grows with __T.wet and shrinks as the ground dries, mirrors the sky colour (fresnel), catches a sun glint, has a darker
// soaked rim, and gets rain ripples (procedural rings, more with __T.rain). Planet-local: mount inside the planet group.
import * as THREE from 'three'
import { R, height, place, pathDir, distToCurve, waterAt, onBridge } from '../../world.js'
import { SU } from '../season/hooks.js'
const VS = `attribute vec2 aP; varying vec2 vUv; varying vec2 vP; varying vec3 vV; varying vec3 vN;
void main(){ vUv = position.xz; vP = aP; vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.);
  vec4 mv = viewMatrix * w; vV = -mv.xyz; vN = normalize(mat3(viewMatrix) * mat3(modelMatrix) * mat3(instanceMatrix) * vec3(0., 1., 0.));
  gl_Position = projectionMatrix * mv; }`
const FS = `uniform float uTime, uWet, uRain, uSDay, uNight; uniform vec3 uSky, uSunV; varying vec2 vUv; varying vec2 vP; varying vec3 vV; varying vec3 vN;
float h1(float n){ return fract(sin(n) * 43758.5453); }
void main(){
  vec2 u = vUv; float sd = vP.x * 17.;
  float ang = atan(u.y, u.x), r = length(u * vec2(1., 1.18));
  float wob = .08 * sin(ang * 3. + sd) + .05 * sin(ang * 5. - sd * 1.7) + .03 * sin(ang * 9. + sd * 2.3);
  float size = mix(.25, 1., smoothstep(.05, .85, uWet));
  float edge = .82 * size + wob * size;
  float inside = (1. - smoothstep(edge - .03, edge, r));
  float rim = (1. - smoothstep(edge, edge + .12, r)) * (1. - inside); // soaked ground ring
  if (inside + rim < .01) discard;
  vec3 V = normalize(vV), N = normalize(vN); float ndv = clamp(dot(N, V), 0., 1.);
  float fr = .35 + .65 * pow(1. - ndv, 3.);
  vec3 deep = mix(vec3(.25, .3, .32), vec3(.12, .14, .22), uNight);
  vec3 col = mix(deep, uSky * 1.08, fr);
  float sp = pow(max(dot(reflect(-V, N), normalize(uSunV)), 0.), 160.) * uSDay; col += vec3(1., .95, .82) * sp * 1.4;
  // ripples: 4 rings per puddle, each restarting at a random spot
  float rip = 0.;
  for (int k = 0; k < 4; k++) { float fk = float(k), t = uTime * (.55 + .2 * fk) + fk * .27 + vP.x * 9.; float id = floor(t), f = fract(t);
    vec2 c = (vec2(h1(id * 12.9 + fk + sd), h1(id * 78.2 + fk * 3. + sd)) - .5) * edge * 1.2;
    float d = length(u - c); rip += (1. - smoothstep(0., .025, abs(d - f * .42))) * (1. - f) * step(h1(id + fk * 7.), .35 + .65 * uRain); }
  col = mix(col, vec3(.96, .98, 1.), clamp(rip, 0., 1.) * .55 * uRain);
  col = mix(col, col * .75 + vec3(.95, .97, 1.) * .25, smoothstep(edge - .1, edge - .02, r) * inside); // bright lip
  float a = inside * .92 + rim * .35;
  vec3 outc = mix(vec3(.18, .16, .14), col, inside);
  gl_FragColor = vec4(outc, a * smoothstep(0., .08, uWet));
}`
/** spots: [{ n: Vector3 (planet-local unit dir), r?: radius (world units, default .32), spin? }] */
export function createPuddles(spots) {
  const quad = new THREE.PlaneGeometry(2, 2); quad.rotateX(-Math.PI / 2)
  const m = new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: FS, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4,
    uniforms: { uTime: SU.uTime, uWet: SU.uWet, uRain: SU.uRain, uSky: SU.uSky, uSunV: SU.uSunV, uSDay: SU.uSDay, uNight: SU.uNight } })
  const o = new THREE.InstancedMesh(quad, m, Math.max(1, spots.length)), aP = new Float32Array(Math.max(1, spots.length) * 2), d = new THREE.Object3D()
  spots.forEach((s, i) => { const p = place(s.n, s.lift ?? 0.03, s.spin ?? i * 1.7), rr = s.r ?? 0.32; d.position.copy(p.pos); d.quaternion.copy(p.q); d.scale.set(rr, 1, rr * (0.75 + 0.25 * ((i * 0.618) % 1))); d.updateMatrix(); o.setMatrixAt(i, d.matrix); aP[i * 2] = (i * 0.6180339) % 1; aP[i * 2 + 1] = rr })
  o.count = spots.length; quad.setAttribute('aP', new THREE.InstancedBufferAttribute(aP, 2)); o.instanceMatrix.needsUpdate = true
  o.computeBoundingSphere(); o.renderOrder = 1
  return { object: o, material: m, update() { o.visible = SU.uWet.value > 0.02 && spots.length > 0 } }
}
// flatness: how much the terrain height changes within ~r of n (world units)
const _a = new THREE.Vector3(), _b = new THREE.Vector3()
function slope(n, r, rise) { const h0 = height(n); let m = 0, up = 0; for (let k = 0; k < 6; k++) { const t = k / 6 * Math.PI * 2; _a.set(1, 0, 0); if (Math.abs(n.x) > 0.9) _a.set(0, 1, 0); _b.crossVectors(n, _a).normalize(); _a.crossVectors(_b, n).normalize(); const q = n.clone().addScaledVector(_a, Math.cos(t) * r / R).addScaledVector(_b, Math.sin(t) * r / R).normalize(); const dh = height(q) - h0; m = Math.max(m, Math.abs(dh)); up = Math.max(up, dh) } return rise ? up : m }
/**
 * puddleSpots({ count, near, radius, seed }) -> spots for <Puddles>. Puddles collect on and beside the footpath, in flat
 * dips, never in water or on bridges. `near` (unit Vector3) biases them toward a place (e.g. the village); `avoid(n)`
 * lets the game exclude houses / beds.
 */
export function puddleSpots({ count = 16, near = null, radius = 0.32, seed = 3, avoid = null } = {}) {
  let s = seed * 7919 + 1; const r = () => (s = (s * 16807) % 2147483647) / 2147483647
  const out = []
  for (let tries = 0; out.length < count && tries < count * 60; tries++) {
    const t = r() * Math.PI * 2, c = pathDir(t).normalize()
    if (near && c.angleTo(near) > 0.5 && r() < 0.85) continue
    const f = pathDir(t + 0.01).normalize().sub(c).normalize(), side = new THREE.Vector3().crossVectors(c, f).normalize()
    const n = c.clone().addScaledVector(side, (r() - 0.5) * 0.5 / R).normalize()
    if (waterAt(n, -0.25) || onBridge(n) || (avoid && avoid(n))) continue
    if (slope(n, radius * 1.2) > 0.045 || distToCurve(n, pathDir, 200) * R > 0.45) continue
    if (out.some(o => o.n.angleTo(n) * R < radius * 3)) continue
    const rr = radius * (0.7 + r() * 0.6)
    // water fills the dip up to its rim, and sits above the footpath strip + ground facets (else the flat quad is buried)
    out.push({ n, r: rr, spin: r() * 6.28, lift: 0.03 + slope(n, rr * 0.9, true) })
  }
  return out
}
