import * as THREE from 'three'
export const R = 5
export const height = (n) => 0.18 * Math.sin(2.7 * n.x + 1.3) * Math.sin(3.1 * n.y + 0.4) * Math.sin(2.3 * n.z + 2.1) + 0.06 * Math.sin(7 * n.x + 5 * n.z)
let s = 7
export const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647
export const dir = (lat, lon) => new THREE.Vector3(Math.cos(lat) * Math.sin(lon), Math.sin(lat), Math.cos(lat) * Math.cos(lon))
const UP = new THREE.Vector3(0, 1, 0)
export function place(n, lift = 0, spin = 0) {
  n = n.clone().normalize()
  const pos = n.clone().multiplyScalar(R + height(n) + lift)
  const q = new THREE.Quaternion().setFromUnitVectors(UP, n)
  q.multiply(new THREE.Quaternion().setFromAxisAngle(UP, spin))
  return { pos, q, n }
}
export const randDir = () => { const u = rnd() * 2 - 1, t = rnd() * Math.PI * 2, r = Math.sqrt(1 - u * u); return new THREE.Vector3(r * Math.cos(t), u, r * Math.sin(t)) }
// path & stream curves on sphere (lat,lon param)
export const pathDir = (t) => dir(0.55 + 0.35 * Math.sin(t * 3) , t)
export const streamDir = (t) => { const d = Math.atan2(Math.sin(t - 0.55), Math.cos(t - 0.55)); return dir(-0.15 + 0.3 * Math.sin(t * 2 + 1) + 0.15 * Math.sin(t * 5) + 0.8 * Math.exp(-((d / 0.4) ** 2)), t) }
export function distToCurve(n, f, k = 160) { let m = 9; for (let i = 0; i < k; i++) { const d = f((i / k) * Math.PI * 2).distanceTo(n); if (d < m) m = d } return m }
const ramp = new Uint8Array([90, 90, 90, 255, 175, 175, 175, 255, 255, 255, 255, 255])
export const toonRamp = new THREE.DataTexture(ramp, 3, 1, THREE.RGBAFormat)
toonRamp.minFilter = toonRamp.magFilter = THREE.NearestFilter; toonRamp.needsUpdate = true
export const wind = { time: { value: 0 } }
// add wind sway to a toon material via onBeforeCompile (instanced, sway weighted by local y)
export function windify(mat, amp = 0.15, base = 0) {
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = wind.time
    sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      vec4 wp = instanceMatrix * vec4(0.,0.,0.,1.);
      float w = max(position.y - ${base.toFixed(2)}, 0.);
      float g = sin(uTime*1.6 + wp.x*0.9 + wp.z*0.7) * 0.6 + sin(uTime*3.1 + wp.y*1.7)*0.4;
      transformed.x += w*w*${amp.toFixed(3)}*g; transformed.z += w*w*${amp.toFixed(3)}*0.6*cos(uTime*1.3+wp.x);`)
  }
  mat.customProgramCacheKey = () => 'wind' + amp + '_' + base
  return mat
}
