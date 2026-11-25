// The shared water look (look A): turquoise shallows to deep blue by distance from shore (attribute aShore, world
// units), slow ripple rings on still water, white flow marks on the river; dusk and night tints as before. Plus the
// lake's lily pads. Spec: docs/superpowers/specs/2026-11-25-ground-water-look-design.md
import * as THREE from 'three'
import { R, ZONES, zv, around, wind, waterAt } from '../world.js'
import { RUIN_COLS, LAKE_DOCK_B } from './zoneLayout.js'
import { shoreDist } from './shore.js'

// aShore = -shoreDist (how far out from the shore), clamped to 0..0.9; toWorldDir(v) maps a local vertex to its unit
// direction on the planet
export function bakeShore(geo, toWorldDir) {
  const p = geo.attributes.position, a = new Float32Array(p.count), v = new THREE.Vector3()
  for (let i = 0; i < p.count; i++) a[i] = Math.min(0.9, Math.max(0, -shoreDist(toWorldDir(v.fromBufferAttribute(p, i)))))
  geo.setAttribute('aShore', new THREE.BufferAttribute(a, 1)); return geo
}

const C3 = (h) => new THREE.Color(h)
// centre: the water body's middle (unit vector); ripple rings are laid out in its tangent plane so they stay round
export function shoreWater({ flow = false, centre = new THREE.Vector3(0, 1, 0) } = {}) {
  const c = centre.clone().normalize(), e1 = new THREE.Vector3(0, 1, 0).cross(c); if (e1.lengthSq() < 1e-6) e1.set(1, 0, 0); e1.normalize(); const e2 = new THREE.Vector3().crossVectors(c, e1)
  return new THREE.ShaderMaterial({
    uniforms: { uE1: { value: e1 }, uE2: { value: e2 }, uTime: wind.time, uN: { value: 0 }, uD: { value: 0 }, uSh: { value: C3('#86e2dc') }, uMid: { value: C3('#4fb6e2') }, uDeep: { value: C3('#2f8fd0') } },
    polygonOffset: flow, polygonOffsetFactor: flow ? -3 : 0,
    vertexShader: `attribute float aShore; uniform vec3 uE1,uE2; varying float vS; varying vec2 vUv; varying vec2 vP;
      void main(){ vS = aShore; vUv = uv; vP = vec2(dot(position,uE1), dot(position,uE2)); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `uniform float uTime,uN,uD; uniform vec3 uSh,uMid,uDeep; varying float vS; varying vec2 vUv; varying vec2 vP;
      float h(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
      void main(){
        vec3 c = mix(uSh, uMid, smoothstep(0.02, 0.25, vS)); c = mix(c, uDeep, smoothstep(0.25, 0.6, vS));
        ${flow ? `// white flow marks drifting downstream in three lanes
        float lane = floor(vUv.x*3.), y = vUv.y*0.6 - uTime*0.55 + h(vec2(lane, 2.));
        float mark = step(0.86, fract(y)) * smoothstep(0.08, 0.2, fract(vUv.x*3.)) * smoothstep(0.92, 0.8, fract(vUv.x*3.));
        c = mix(c, vec3(1.), mark*0.85);` : `// slow ripple rings, one per 1.3-unit cell, growing and fading
        vec2 q = vP / 1.3, cell = floor(q), f = fract(q) - 0.5 - (vec2(h(cell), h(cell+7.)) - 0.5)*0.4;
        float t = fract(uTime*0.12 + h(cell+3.)), r = t*0.42, d = length(f);
        float ring = (smoothstep(0.022, 0.0, abs(d - r)) + smoothstep(0.018, 0.0, abs(d - r*0.55))*0.7) * (1. - t) * step(0.18, vS);
        c = mix(c, vec3(1.), ring*0.8);`}
        // tints are in linear space (the output is converted to sRGB below): dusk warms, night goes deep blue
        c = mix(c, c*vec3(1.,.72,.66)+vec3(.03,.01,.012), uD*.5); c = mix(c, vec3(.012,.022,.075) + vec3(.02,.03,.05)*(c.b-.3), uN*.85);
        gl_FragColor = vec4(c,1.);
        #include <colorspace_fragment>
      }` })
}

// lily pads on the open east half of the lake, clear of the drowned ruins and the dock
export const LILY_PADS = (() => {
  const c = zv(ZONES.lake), r = ZONES.lake.r, dock = around(c, r * 1.06, LAKE_DOCK_B), out = []
  for (let k = 0; k < 40 && out.length < 7; k++) {
    const n = around(c, r * (0.35 + 0.45 * ((k * 0.618) % 1)), -1.2 + ((k * 0.382) % 1) * 2.4)
    if (!waterAt(n) || shoreDist(n) > -0.12 || RUIN_COLS.some(col => col.n.angleTo(n) * R < 0.45) || dock.angleTo(n) * R < 0.5 || out.some(o => o.n.angleTo(n) * R < 0.35)) continue
    out.push({ n, s: 0.09 + 0.04 * ((k * 0.73) % 1), spin: k * 1.7, flower: k % 2 === 0 })
  }
  return out
})()
