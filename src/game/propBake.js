// Collapse a gather-prop group into one vertex-coloured body and one ink hull.
// Same triangles, same material colours, same local transforms. Glow and glass stay out
// (null) so those props keep their own materials.
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

function special(m) {
  if (!m || m.isShaderMaterial) return true
  if (m.transparent || m.opacity < 1 || m.map || m.alphaMap) return true
  if (m.toneMapped === false) return true
  if (m.emissive && (m.emissive.r + m.emissive.g + m.emissive.b) > 0) return true
  return false
}

export function bakePropMeshes(root) {
  root.updateMatrixWorld(true)
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert()
  const bodies = [], hulls = []
  let bad = false
  root.traverse(o => {
    if (!o.isMesh || !o.geometry) return
    const m = Array.isArray(o.material) ? null : o.material
    if (special(m)) { bad = true; return }
    const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone()
    for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k)
    g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld))
    if (m.side === THREE.BackSide) { hulls.push(g); return }
    const c = m.color
    const n = g.attributes.position.count, a = new Float32Array(n * 3)
    for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b }
    g.setAttribute('color', new THREE.BufferAttribute(a, 3))
    bodies.push(g)
  })
  if (bad || !bodies.length) return null
  return { body: mergeGeometries(bodies), hull: hulls.length ? mergeGeometries(hulls) : null }
}
