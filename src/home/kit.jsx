// Tiny toolkit for the interior + pets: the characters' cel shader (so pets match her), the toon materials of the
// world, and a view-space inverted-hull outline that works on any mesh.
import * as THREE from 'three'
import React from 'react'
import { cel } from '../GhibliPerson.jsx'
import { toon, paint } from '../common.jsx'
export { cel }
const OUT_VS = `uniform float uT; void main(){ vec4 mv = modelViewMatrix*vec4(position,1.); vec3 n = normalize(normalMatrix*normal);
  float sil = .5 + .85*length(n.xy); mv.xyz += n*uT*sil*(0.6 + 0.4*clamp(-mv.z*.35,0.,2.)); gl_Position = projectionMatrix*mv; }`
const mkOut = (t, c = '#3b2621') => new THREE.ShaderMaterial({ side: THREE.BackSide, polygonOffset: true, polygonOffsetFactor: 2, polygonOffsetUnits: 4, uniforms: { uT: { value: t }, uCol: { value: new THREE.Color(c) } },
  vertexShader: OUT_VS, fragmentShader: `uniform vec3 uCol; void main(){ gl_FragColor = vec4(uCol,1.);
    #include <colorspace_fragment>
  }` })
export const OUT = { pet: mkOut(0.0036), room: mkOut(0.006, '#4a3a35'), fine: mkOut(0.0028, '#4a3a35') }
const tc = new Map()
export const tm = (c, painted = 0) => { const k = c + painted; if (!tc.has(k)) tc.set(k, painted ? paint(toon(c), painted, false, 7) : toon(c)); return tc.get(k) }
// mesh + outline
export function O({ geo, mat, out = OUT.room, children, ...p }) { return <group {...p}><mesh geometry={geo} material={mat} />{out && <mesh geometry={geo} material={out} />}{children}</group> }
export const GEO = (() => {
  const g = {}
  g.sph = new THREE.SphereGeometry(1, 20, 14); g.sphL = new THREE.SphereGeometry(1, 12, 8)
  g.box = new THREE.BoxGeometry(1, 1, 1); g.cyl = new THREE.CylinderGeometry(1, 1, 1, 16); g.cyl6 = new THREE.CylinderGeometry(1, 1, 1, 8)
  g.cone = new THREE.ConeGeometry(1, 1, 14); g.cap = new THREE.CapsuleGeometry(1, 1, 4, 10)
  g.half = new THREE.SphereGeometry(1, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2); g.tor = new THREE.TorusGeometry(1, 0.25, 8, 22)
  g.plane = new THREE.PlaneGeometry(1, 1); g.circ = new THREE.CircleGeometry(1, 28)
  const rb = new THREE.BoxGeometry(1, 1, 1, 3, 3, 3), p = rb.attributes.position, v = new THREE.Vector3() // soft "pillow" box
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const k = 1 - 0.18 * (Math.abs(v.x * 2) * Math.abs(v.y * 2) + Math.abs(v.y * 2) * Math.abs(v.z * 2) + Math.abs(v.x * 2) * Math.abs(v.z * 2)) / 3; p.setXYZ(i, v.x * k, v.y * (0.85 + 0.15 * k), v.z * k) }
  rb.computeVertexNormals(); g.pillow = rb
  const hs = new THREE.Shape(); hs.moveTo(0, -0.5); hs.bezierCurveTo(-0.15, -0.3, -0.55, -0.05, -0.5, 0.25); hs.bezierCurveTo(-0.45, 0.55, -0.05, 0.6, 0, 0.3); hs.bezierCurveTo(0.05, 0.6, 0.45, 0.55, 0.5, 0.25); hs.bezierCurveTo(0.55, -0.05, 0.15, -0.3, 0, -0.5)
  g.heart = new THREE.ShapeGeometry(hs, 10)
  return g
})()
// canvas texture helper (bubbles, signs)
export function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t }
