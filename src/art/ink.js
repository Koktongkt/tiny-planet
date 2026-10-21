// Cheap inverted-hull ink for merged / instanced art meshes (art-b). One BackSide ShaderMaterial, smooth normals
// rebuilt from welded positions so hard-edged toon parts don't crack. Optional wind sway (same maths as the toon
// material) so the ink follows swaying crops. Uniform is named uInkT (not uT/thickness) on purpose: App's HorizonCull
// treats those names as character/drei hulls; art hulls are toggled by their own near-camera check instead.
import * as THREE from 'three'
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { wind } from '../world.js'
export const INK_LIN = new THREE.Color('#4a3a35')
export const SWAY_GLSL = `
  attribute vec3 aBase; attribute float aW;
  vec3 swayOf(vec3 p, float amp) {
    vec3 up = normalize(aBase + vec3(0., 1e-4, 0.)); vec3 t1 = normalize(cross(up, abs(up.z) < .95 ? vec3(0., 0., 1.) : vec3(1., 0., 0.))); vec3 t2 = cross(up, t1);
    float ph = dot(aBase, vec3(3.1, 2.3, 4.7));
    float g = sin(uTime * 1.7 + ph) * .65 + sin(uTime * 3.3 + ph * 1.9) * .35;
    float w = aW * aW * amp;
    return p + (t1 * g + t2 * .55 * cos(uTime * 1.25 + ph)) * w;
  }`
export function inkMaterial(thick = 0.003, sway = 0) {
  return new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms: { uInkT: { value: thick }, uTime: wind.time, uInk: { value: INK_LIN } },
    vertexShader: `uniform float uInkT, uTime;
      ${sway ? SWAY_GLSL : ''}
      void main() {
        vec3 p = position${sway ? `; p = swayOf(p, ${sway.toFixed(4)})` : ''};
        vec4 wp = vec4(p, 1.);
        #ifdef USE_INSTANCING
          wp = instanceMatrix * wp;
          vec3 n = normalize(mat3(instanceMatrix) * normal);
        #else
          vec3 n = normal;
        #endif
        vec4 mv = modelViewMatrix * wp; vec3 nv = normalize(normalMatrix * n);
        mv.xyz += nv * uInkT * clamp(-mv.z * .35, .6, 2.2); // a touch thicker with distance so it never vanishes abruptly
        gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform vec3 uInk; void main() { gl_FragColor = vec4(uInk, 1.);
      #include <colorspace_fragment>
    }`,
  })
}
// position-only welded copy with smooth normals (+ the sway attributes when present)
export function hullGeometry(geo) {
  const g = new THREE.BufferGeometry(), keep = geo.userData.ink // per-vertex 1/0 (non-indexed): drop un-inked triangles
  const names = ['position', 'aBase', 'aW'].filter(n => geo.getAttribute(n))
  if (keep && !geo.index) { const tri = []; for (let i = 0; i < keep.length; i += 3) if (keep[i]) tri.push(i)
    for (const n of names) { const a = geo.getAttribute(n), k = a.itemSize, arr = new Float32Array(tri.length * 3 * k); let o = 0
      for (const t of tri) for (let v = 0; v < 3; v++) for (let c = 0; c < k; c++) arr[o++] = a.array[(t + v) * k + c]
      g.setAttribute(n, new THREE.BufferAttribute(arr, k)) } }
  else { for (const n of names) g.setAttribute(n, geo.getAttribute(n)); if (geo.index) g.setIndex(geo.index) }
  const m = mergeVertices(g, 1e-5); m.computeVertexNormals(); g.dispose(); return m
}
