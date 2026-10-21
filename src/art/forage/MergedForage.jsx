// Stage C: Studio's ForageProp collapsed to 2 draw calls (one vertex-coloured toon mesh + one ink hull) per prop, instead of ~20.
// The first spot of each item mounts ForageProp once (hidden), bakes its meshes (local transforms, material colours) into a
// cached pair of geometries, then swaps to the merged meshes; later spots of the same item use the cache directly.
import React, { useLayoutEffect, useReducer, useRef } from 'react'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { toon } from '../../common.jsx'
import { ForageProp } from './ForageProp.jsx'
const CACHE = {}
let body = null, hull = null
const mats = () => { if (!body) { body = toon('#ffffff', { vertexColors: true }); hull = new THREE.MeshBasicMaterial({ color: '#4a3a35', side: THREE.BackSide }) } return { body, hull } }
function bake(root) {
  root.updateMatrixWorld(true); const inv = new THREE.Matrix4().copy(root.matrixWorld).invert(), B = [], H = []
  root.traverse(o => {
    if (!o.isMesh) return
    const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone(); for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k)
    g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld))
    if (o.material.side === THREE.BackSide) { H.push(g); return }
    const c = o.material.color, n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b }
    g.setAttribute('color', new THREE.BufferAttribute(a, 3)); B.push(g)
  })
  return { b: B.length ? mergeGeometries(B) : null, h: H.length ? mergeGeometries(H) : null }
}
export default function MergedForage({ item, s = 1 }) {
  const ref = useRef(), [, force] = useReducer(x => x + 1, 0), c = CACHE[item]
  useLayoutEffect(() => { if (!CACHE[item] && ref.current) { CACHE[item] = bake(ref.current); force() } }, [item])
  if (!c) return <group ref={ref} visible={false}><ForageProp item={item} s={1} /></group>
  const { body, hull } = mats()
  return <group scale={s}>{c.b && <mesh geometry={c.b} material={body} />}{c.h && <mesh geometry={c.h} material={hull} />}</group>
}
