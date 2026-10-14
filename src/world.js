import * as THREE from 'three'
export const R = 8
export const K = 5 / R // converts old angular sizes (tuned at R=5) to the bigger world
const _dir = (lat, lon) => [Math.cos(lat) * Math.sin(lon), Math.sin(lat), Math.cos(lat) * Math.cos(lon)]
const Z = (lat, lon, r) => { const [x, y, z] = _dir(lat, lon); return { x, y, z, r, lat, lon } }
// biome / zone centres (lat, lon, angular radius)
export const ZONES = {
  lake: Z(-0.55, 0.9, 0.2), cliff: Z(-0.42, 1.38, 0.11), terraces: Z(-0.62, 2.7, 0.18), harbour: Z(-0.32, 4.3, 0.22), ruins: Z(-0.72, 3.85, 0.11),
  forest: Z(-0.05, 3.35, 0.27), giant: Z(-0.4, 3.05, 0.1), meadow: Z(0.4, 5.2, 0.3), mills: Z(1.0, 4.6, 0.18),
}
export const TRAIN_LAT = -0.95
export const LAKE_W = -0.16, HARB_W = -0.2, CLIFF_H = 1.15
const sst = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t) }
const ang = (n, z) => Math.acos(Math.min(1, Math.max(-1, (n.x * z.x + n.y * z.y + n.z * z.z) / Math.hypot(n.x, n.y, n.z))))
export const zoneAng = ang
export const height = (n) => {
  let h = 0.29 * Math.sin(2.7 * n.x + 1.3) * Math.sin(3.1 * n.y + 0.4) * Math.sin(2.3 * n.z + 2.1) + 0.08 * Math.sin(7 * n.x + 5 * n.z)
  const zm = ZONES
  let a = ang(n, zm.meadow); if (a < zm.meadow.r + 0.2) h += sst(zm.meadow.r + 0.2, zm.meadow.r * 0.4, a) * 0.38 * (0.5 + 0.5 * Math.sin(n.x * 15 + 1) * Math.sin(n.z * 13 + n.y * 9))
  a = ang(n, zm.giant); if (a < zm.giant.r * 2.6) h += 0.85 * sst(zm.giant.r * 2.6, zm.giant.r * 0.3, a)
  a = ang(n, zm.cliff); if (a < zm.cliff.r + 0.04) h += CLIFF_H * sst(zm.cliff.r + 0.03, zm.cliff.r, a) + 0.04 * Math.sin(n.x * 40) * sst(zm.cliff.r, 0, a)
  a = ang(n, zm.terraces); if (a < zm.terraces.r + 0.05) { const hill = 1.05 * Math.max(0, 1 - a / zm.terraces.r), stp = 0.15, f = hill / stp, st = Math.floor(f) * stp + stp * sst(0.82, 1, f - Math.floor(f)); h = h + (st + 0.04 - h) * sst(zm.terraces.r + 0.05, zm.terraces.r - 0.01, a) }
  a = ang(n, zm.lake); if (a < zm.lake.r * 1.3) h = h + (-0.55 - h) * sst(zm.lake.r * 1.15, zm.lake.r * 0.55, a)
  a = ang(n, zm.harbour); if (a < zm.harbour.r * 1.3) h = h + (-0.6 - h) * sst(zm.harbour.r * 1.12, zm.harbour.r * 0.6, a)
  return h
}
export function around(c, d, b) { c = c.clone().normalize(); const e1 = new THREE.Vector3(0, 1, 0).cross(c); if (e1.lengthSq() < 1e-6) e1.set(1, 0, 0); e1.normalize(); const e2 = new THREE.Vector3().crossVectors(c, e1); return c.multiplyScalar(Math.cos(d)).addScaledVector(e1, Math.sin(d) * Math.cos(b)).addScaledVector(e2, Math.sin(d) * Math.sin(b)).normalize() }
export const zv = (z) => new THREE.Vector3(z.x, z.y, z.z)
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
