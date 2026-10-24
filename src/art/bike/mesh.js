// Stage E placeholder bicycle. Lazy: the game only imports this once she is actually riding.
// 3 draw calls while visible (frame + two wheels that share one material and one geometry). No outlines.
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { toonRamp } from '../../world.js'

const prep = (g, hex) => {
  if (g.index) g = g.toNonIndexed()
  const c = new THREE.Color(hex), a = []
  for (let i = 0; i < g.attributes.position.count; i++) a.push(c.r, c.g, c.b)
  g.setAttribute('color', new THREE.Float32BufferAttribute(a, 3))
  g.deleteAttribute('uv')
  return g
}
const box = (w, h, d, x, y, z, hex, rx = 0, ry = 0, rz = 0) => {
  const g = new THREE.BoxGeometry(w, h, d)
  if (rx) g.rotateX(rx)
  if (ry) g.rotateY(ry)
  if (rz) g.rotateZ(rz)
  g.translate(x, y, z)
  return prep(g, hex)
}

// her body is about 0.28 tall in traveller space, so the bike sits under her hips
const RIM = 0.034
const AY = RIM
const WOOD = '#8a5a3c'
const WOOD2 = '#c49a6c'
const TIRE = '#3a2e2a'
const METAL = '#d5cfc4'
const SEAT = '#d9655b'

function wheelGeometry() {
  const parts = []
  const tire = new THREE.CylinderGeometry(RIM, RIM, 0.012, 8)
  tire.rotateZ(Math.PI / 2)
  parts.push(prep(tire, TIRE))
  const hub = new THREE.CylinderGeometry(0.008, 0.008, 0.016, 5)
  hub.rotateZ(Math.PI / 2)
  parts.push(prep(hub, METAL))
  for (let k = 0; k < 4; k++) {
    const sp = new THREE.BoxGeometry(0.005, RIM * 0.92, 0.003)
    sp.rotateX(k * Math.PI / 4)
    parts.push(prep(sp, METAL))
  }
  const g = mergeGeometries(parts)
  g.computeVertexNormals()
  return g
}

function frameGeometry() {
  const y = AY
  const parts = [
    box(0.01, 0.07, 0.01, 0, y + 0.02, -0.03, WOOD, 0.45),
    box(0.01, 0.08, 0.01, 0, y + 0.025, 0.02, WOOD2, -0.5),
    box(0.009, 0.009, 0.11, 0, y + 0.055, 0.0, WOOD),
    box(0.008, 0.05, 0.008, 0, y + 0.02, 0.068, WOOD, 0.2),
    box(0.055, 0.008, 0.008, 0, y + 0.052, 0.078, TIRE),
    box(0.016, 0.01, 0.03, 0, y + 0.062, -0.04, SEAT),
    box(0.008, 0.008, 0.09, 0, y + 0.006, 0.005, WOOD2),
    box(0.022, 0.006, 0.01, 0, y - 0.004, -0.01, METAL),
  ]
  const g = mergeGeometries(parts)
  g.computeVertexNormals()
  return g
}

export function createBike() {
  const mat = new THREE.MeshToonMaterial({ color: '#ffffff', gradientMap: toonRamp, vertexColors: true })
  const frame = new THREE.Mesh(frameGeometry(), mat)
  const geo = wheelGeometry()
  const wheels = [-0.055, 0.07].map(z => {
    const m = new THREE.Mesh(geo, mat)
    m.position.set(0, AY, z)
    m.frustumCulled = false
    return m
  })
  frame.frustumCulled = false
  return { frame, wheels, calls: 1 + wheels.length }
}
