// <Rain> core (art-c): soft Ghibli rain in ONE draw call — instanced 2-triangle streaks, billboarded around the fall
// axis and animated on the GPU. Pale, slightly warm-lit streaks (they catch the sky colour and a little sun), never grey
// sheets. Count follows __T.rain (instanceCount), and in winter the rain hands over to Drift's snow.
import * as THREE from 'three'
import { SU } from '../season/hooks.js'
import { anchorer } from '../season/drift.js'
const VS = `attribute vec4 aSeed; attribute vec2 aQ; uniform float uTime, uRain, uSnowW; uniform vec3 uBox, uOff, uSky; uniform vec3 uSunV;
varying vec2 vQ; varying float vA; varying vec3 vC;
void main(){
  float h = aSeed.w, h2 = fract(h * 71.3);
  vec3 dir = normalize(vec3(.16, -1., .06));            // a gentle slant
  float speed = 6.5 + 2.5 * h2, len = .2 + .14 * h2;
  vec3 p = aSeed.xyz * uBox + dir * uTime * speed;
  p -= uOff; p = mod(p, uBox) - uBox * .5; p.y += uBox.y * .25;
  vec3 q = p / uBox; float edge = smoothstep(.5, .34, max(abs(q.x), abs(q.z))) * smoothstep(.5, .38, abs(q.y - .25));
  vec4 c = modelViewMatrix * vec4(p, 1.);
  vec3 ax = normalize(mat3(modelViewMatrix) * dir), side = normalize(cross(ax, normalize(-c.xyz)));
  float w = .006 + .004 * h2;
  c.xyz += side * aQ.x * w + ax * aQ.y * len;
  gl_Position = projectionMatrix * c;
  vQ = aQ; float near = smoothstep(.35, 1.4, -c.z), far = smoothstep(14., 7., -c.z);
  vA = edge * near * far * uRain * (1. - uSnowW) * (.5 + .35 * h2);
  vC = mix(vec3(.9, .95, 1.), uSky, .35) + vec3(1., .92, .78) * .25 * max(0., uSunV.y);
}`
const FS = `varying vec2 vQ; varying float vA; varying vec3 vC;
void main(){ float a = (1. - abs(vQ.x)) * smoothstep(0., .25, vQ.y) * smoothstep(1., .6, vQ.y); gl_FragColor = vec4(vC, vA * a); }`
/** createRain({ count, box }) -> { object, material, update(anchor, camera, renderer) } */
export function createRain({ count = 1400, box = [9, 6, 9] } = {}) {
  const g = new THREE.InstancedBufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(12), 3)) // unused, keeps three happy
  g.setAttribute('aQ', new THREE.BufferAttribute(new Float32Array([-1, 0, 1, 0, 1, 1, -1, 1]), 2)); g.setIndex([0, 1, 2, 0, 2, 3])
  const seeds = new Float32Array(count * 4); let s = 777; const r = () => (s = (s * 16807) % 2147483647) / 2147483647
  for (let i = 0; i < count; i++) seeds.set([r(), r(), r(), r()], i * 4)
  g.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seeds, 4)); g.instanceCount = 0
  const m = new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: FS, transparent: true, depthWrite: false, side: THREE.DoubleSide,
    uniforms: { uTime: SU.uTime, uRain: SU.uRain, uSky: SU.uSky, uSunV: SU.uSunV, uSnowW: { value: 0 }, uBox: { value: new THREE.Vector3(...box) }, uOff: { value: new THREE.Vector3() } } })
  const o = new THREE.Mesh(g, m); o.frustumCulled = false; o.renderOrder = 4
  const a = anchorer(o, m.uniforms)
  return { object: o, material: m, update(anchor, camera, renderer) {
    a.update(anchor, camera, renderer)
    const snowW = SU.uSeason.value.w; m.uniforms.uSnowW.value = snowW
    g.instanceCount = Math.round(count * Math.min(1, SU.uRain.value * 1.25) * (1 - snowW)) // no rain = no draw call
    if (!g.instanceCount) o.visible = false
  } }
}
