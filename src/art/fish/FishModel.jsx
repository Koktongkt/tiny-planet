// <FishModel id size quality ink /> and <FishInstances id items quality ink /> (Stage C, art-c).
// One shared toon material for all species (fishMaterial), one cached geometry per species+LOD, inverted-hull ink.
// FishModel = 2 draw calls (body + ink). FishInstances = 2 draw calls for any number of one species (museum tank, schools).
// Units: model length 1 (nose +X, up +Y). size is in cm; `scale` = world units per metre (default 0.35 ≈ 2x her scale, a
// storybook exaggeration for the catch reveal). Swimming: FISH_U.uSwim (0 still … 1 lively), shared by every fish.
import * as THREE from 'three'
import React, { useLayoutEffect, useMemo, useRef } from 'react'
import { buildFishGeometry } from './geometry.js'
import { fishMaterial, fishInkMaterial, fishHullGeometry, FISH_U } from './material.js'
export { buildFishGeometry, fishMaterial, fishInkMaterial, fishHullGeometry, FISH_U }
export const setFishSwim = (v) => { FISH_U.uSwim.value = v }
const lodOf = (quality) => quality === 'lo' ? 'lo' : 'hi'
export function FishModel({ id, size = 30, scale = 0.35, quality = 'hi', ink, ...props }) {
  const geo = buildFishGeometry(id, lodOf(quality)), hull = fishHullGeometry(geo), s = (size / 100) * scale
  const inkMat = fishInkMaterial(ink ?? Math.max(0.0008, Math.min(0.006, s * 0.035)))
  return <group {...props}><group scale={s}>
    <mesh geometry={geo} material={fishMaterial()} />
    <mesh geometry={hull} material={inkMat} raycast={() => null} />
  </group></group>
}
// items: { pos:[x,y,z], quat?:[x,y,z,w], s: world length }[]
const _o = new THREE.Object3D()
export function FishInstances({ id, items, quality = 'hi', ink = 0.003 }) {
  const a = useRef(), b = useRef(), geo = buildFishGeometry(id, lodOf(quality)), hull = fishHullGeometry(geo)
  useLayoutEffect(() => { items.forEach((it, i) => { _o.position.fromArray(it.pos); if (it.quat) _o.quaternion.fromArray(it.quat); else _o.quaternion.identity(); _o.scale.setScalar(it.s ?? 0.1); _o.updateMatrix(); a.current.setMatrixAt(i, _o.matrix); b.current.setMatrixAt(i, _o.matrix) })
    for (const m of [a.current, b.current]) { m.instanceMatrix.needsUpdate = true; m.computeBoundingSphere() } }, [items])
  const n = items.length, mat = useMemo(() => fishMaterial(), []), im = useMemo(() => fishInkMaterial(ink), [ink])
  return <><instancedMesh ref={a} args={[geo, mat, n]} key={'b' + n} /><instancedMesh ref={b} args={[hull, im, n]} key={'h' + n} raycast={() => null} /></>
}
export default FishModel
