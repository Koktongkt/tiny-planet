// Gold outline on the targeted quick pickup (light weight). Its ink hull turns gold with a slow pulse; a prop without a
// hull gets a gold back-face shell. When the traveller stands between the camera and the item, a faint gold silhouette
// draws through her so the target never disappears. Per-mesh swaps only: shared materials are never changed.
import * as THREE from 'three'

export const GOLD_HULL = new THREE.MeshBasicMaterial({ color: '#ffd56a', side: THREE.BackSide, toneMapped: false })
const SEE = new THREE.MeshBasicMaterial({ color: '#ffd56a', side: THREE.BackSide, toneMapped: false, transparent: true, opacity: 0.22, depthTest: false, depthWrite: false })
const STILL = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
const C_LO = new THREE.Color('#f2bd48'), C_HI = new THREE.Color('#ffd978')
const OL = { id: null, obj: null, swapped: [], shells: [], see: [], bodies: [] }
if (typeof window !== 'undefined') window.__outline = OL

const isHull = (m) => !!m && m.side === THREE.BackSide && m !== GOLD_HULL && m !== SEE
function restore() {
  for (const [mesh, mat] of OL.swapped) if (mesh.material === GOLD_HULL) mesh.material = mat
  for (const s of OL.shells) s.parent && s.parent.remove(s)
  for (const s of OL.see) s.parent && s.parent.remove(s)
  for (const b of OL.bodies) { delete b.userData.olShell; delete b.userData.olSee }
  OL.swapped = []; OL.shells = []; OL.see = []; OL.bodies = []
}
// idempotent, run every frame: a prop can replace its meshes after it is targeted (MergedProp bakes on first show)
function decorate(obj) {
  const meshes = []; obj.traverse(o => { if (o.isMesh && !o.userData.olMine) meshes.push(o) })
  let hulls = 0
  for (const m of meshes) if (m.material === GOLD_HULL) hulls++; else if (isHull(m.material)) { OL.swapped.push([m, m.material]); m.material = GOLD_HULL; hulls++ }
  for (const b of meshes) {
    if (b.material === GOLD_HULL) continue
    if (!hulls && !b.userData.olShell) { const s = new THREE.Mesh(b.geometry, GOLD_HULL); s.userData.olMine = true; s.scale.setScalar(1.1); b.add(s); OL.shells.push(s); b.userData.olShell = true }
    if (!b.userData.olSee) { const v = new THREE.Mesh(b.geometry, SEE); v.userData.olMine = true; v.renderOrder = 10; v.visible = false; v.scale.setScalar(1.04); b.add(v); OL.see.push(v); b.userData.olSee = true; OL.bodies.push(b) }
  }
}
// target: { id, obj } or null; t: seconds; blocked: the traveller covers the item from the camera
export function setOutline(target, t, blocked) {
  const obj = target && target.obj ? target.obj : null
  if (obj !== OL.obj) { restore(); OL.obj = obj }
  OL.id = obj ? target.id : null
  if (!obj) return
  decorate(obj)
  const pulse = STILL ? 1 : 0.5 + 0.5 * Math.sin(t * 3.2)
  GOLD_HULL.color.lerpColors(C_LO, C_HI, pulse)
  for (const s of OL.shells) s.scale.setScalar(1.08 + 0.04 * pulse)
  for (const v of OL.see) v.visible = !!blocked
}
