// Gold outline on the targeted quick pickup (light weight). Its ink hull turns gold with a slow pulse; a prop without a
// hull gets a gold back-face shell. When the traveller stands between the camera and the item, a faint gold silhouette
// draws through her so the target never disappears. Per-mesh swaps only: shared materials are never changed.
import * as THREE from 'three'

export const GOLD_HULL = new THREE.MeshBasicMaterial({ color: '#ffd56a', side: THREE.BackSide, toneMapped: false })
const SEE = new THREE.MeshBasicMaterial({ color: '#ffd56a', side: THREE.BackSide, toneMapped: false, transparent: true, opacity: 0.35, depthTest: false, depthWrite: false })
const STILL = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
const C_LO = new THREE.Color('#f2bd48'), C_HI = new THREE.Color('#ffd978')
const OL = { id: null, obj: null, swapped: [], shells: [], see: [] }
if (typeof window !== 'undefined') window.__outline = OL

const isHull = (m) => !!m && m.side === THREE.BackSide && m !== GOLD_HULL && m !== SEE
function restore() {
  for (const [mesh, mat] of OL.swapped) mesh.material = mat
  for (const s of OL.shells) s.parent && s.parent.remove(s)
  for (const s of OL.see) s.parent && s.parent.remove(s)
  OL.swapped = []; OL.shells = []; OL.see = []
}
function decorate(obj) {
  const meshes = []; obj.traverse(o => { if (o.isMesh) meshes.push(o) })
  const hulls = meshes.filter(m => isHull(m.material)), bodies = meshes.filter(m => !isHull(m.material))
  for (const h of hulls) { OL.swapped.push([h, h.material]); h.material = GOLD_HULL }
  for (const b of bodies) {
    if (!hulls.length) { const s = new THREE.Mesh(b.geometry, GOLD_HULL); s.scale.setScalar(1.1); b.add(s); OL.shells.push(s) }
    const v = new THREE.Mesh(b.geometry, SEE); v.renderOrder = 10; v.visible = false; v.scale.setScalar(1.04); b.add(v); OL.see.push(v)
  }
}
// target: { id, obj } or null; t: seconds; blocked: the traveller covers the item from the camera
export function setOutline(target, t, blocked) {
  const obj = target && target.obj ? target.obj : null
  if (obj !== OL.obj) { restore(); OL.obj = obj; if (obj) decorate(obj) }
  OL.id = obj ? target.id : null
  if (!obj) return
  const pulse = STILL ? 1 : 0.5 + 0.5 * Math.sin(t * 3.2)
  GOLD_HULL.color.lerpColors(C_LO, C_HI, pulse)
  for (const s of OL.shells) s.scale.setScalar(1.08 + 0.04 * pulse)
  for (const v of OL.see) v.visible = !!blocked
}
