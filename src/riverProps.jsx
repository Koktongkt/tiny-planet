// round6 (lazy chunk): trail edge stones, river-bank pebbles, stepping stones + marker stakes at the jump spots
import * as THREE from 'three'
import React, { useMemo, useRef, useEffect } from 'react'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { R, K, place, pathDir, streamDir, streamHalf, waterAt, onBridge, JUMPS, JUMP_HALF } from './world.js'
import { toon, paint, C } from './common.jsx'
// round6: edge stones along the trail, pebbles on the river banks, stepping stones + marker stakes at the jump spots.
// One instanced mesh for every stone (8-tri octahedra) and one for the stakes: +2 draw calls, ~6k triangles.
export function RiverStones({ colliders: COLLIDERS, houses: HOUSES, touch: TOUCH }) {
  const { stones, stakes } = useMemo(() => { let sd_ = 99; const rnd = () => (sd_ = (sd_ * 16807) % 2147483647) / 2147483647 // own RNG: leaves the world scatter sequence untouched
    const COLLIDERS_NEAR = (m) => COLLIDERS.some(c => m.angleTo(c.n) < c.r + 0.004)
    const st = [], sk = [], o = new THREE.Object3D(), c = new THREE.Color(), tan = new THREE.Vector3(), side = new THREE.Vector3()
    const put = (n, s, h, col, spin) => { if (waterAt(n, -0.02) && col !== 'step') return; const p = place(n, -0.01, spin); st.push({ p, s, h, c: col === 'step' ? C('#d8d0c0').multiplyScalar(0.95 + rnd() * 0.08) : c.set(col).multiplyScalar(0.85 + rnd() * 0.25).clone() }) }
    const along = (f, step, halfFn, skipP, cols, fringe) => { for (let t = 0; t < Math.PI * 2; t += step) { const n = f(t).normalize(); tan.copy(f(t + 0.004)).normalize().sub(n).normalize(); side.crossVectors(tan, n).normalize()
      for (const sd of [-1, 1]) { if (rnd() < skipP) continue; const hw = halfFn(t) + fringe * (0.5 + rnd()); const m = n.clone().addScaledVector(side, sd * hw / R).addScaledVector(tan, (rnd() - 0.5) * step * 0.6).normalize()
        if (onBridge(m) || HOUSES.some(h => h.distanceTo(m) < 0.11 * K) || COLLIDERS_NEAR(m)) continue; put(m, 0.022 + rnd() * 0.03, 0.45 + rnd() * 0.35, cols[Math.floor(rnd() * cols.length)], rnd() * 6) } } }
    along(pathDir, 0.0042, (t) => 0.17 * (1 + 0.08 * Math.sin(t * 13)), TOUCH ? 0.6 : 0.4, ['#cfc3b0', '#b8ad9c', '#d9cfbd'], 0.03)
    along(streamDir, 0.0045, streamHalf, TOUCH ? 0.6 : 0.42, ['#a59a88', '#8f8778', '#c2b7a4'], 0.04)
    for (const j of JUMPS) { const n = j.c; for (const sd of [-1, 1]) { const bank = JUMP_HALF + 0.02; for (const [a, o_, s] of [[0, 0.02, 0.07], [0.09, 0.11, 0.05], [-0.08, 0.1, 0.045]]) put(n.clone().addScaledVector(j.side, sd * (bank + o_) / R).addScaledVector(j.tan, a / R).normalize(), s, 0.32, 'step', rnd() * 6)
      sk.push(place(n.clone().addScaledVector(j.side, sd * (bank + 0.17) / R).addScaledVector(j.tan, (sd * 0.16) / R).normalize(), -0.01, rnd() * 6)) } }
    return { stones: st, stakes: sk }
  }, [])
  const ref = useRef(), sref = useRef()
  useEffect(() => { const o = new THREE.Object3D()
    stones.forEach((s, i) => { o.position.copy(s.p.pos); o.quaternion.copy(s.p.q); o.scale.set(s.s, s.s * s.h, s.s * (0.8 + (i % 5) * 0.08)); o.updateMatrix(); ref.current.setMatrixAt(i, o.matrix); ref.current.setColorAt(i, s.c) })
    ref.current.instanceMatrix.needsUpdate = true; ref.current.instanceColor.needsUpdate = true; ref.current.computeBoundingSphere()
    stakes.forEach((p, i) => { o.position.copy(p.pos); o.quaternion.copy(p.q); o.scale.setScalar(1); o.updateMatrix(); sref.current.setMatrixAt(i, o.matrix) }); sref.current.instanceMatrix.needsUpdate = true; sref.current.computeBoundingSphere() }, [])
  const geo = useMemo(() => { const g = new THREE.OctahedronGeometry(1, 0); g.translate(0, 0.25, 0); return g }, []), mat = useMemo(() => paint(toon('#ffffff'), 0.12, true, 14), [])
  const stakeG = useMemo(() => { const col = (g, h) => { const c = C(h), a = []; for (let k = 0; k < g.attributes.position.count; k++) a.push(c.r, c.g, c.b); g.setAttribute('color', new THREE.Float32BufferAttribute(a, 3)); return g }
    return mergeGeometries([col(new THREE.BoxGeometry(0.022, 0.2, 0.022).translate(0, 0.1, 0), '#8a5a3c'), col(new THREE.BoxGeometry(0.004, 0.035, 0.05).translate(0.012, 0.17, 0.025), '#d9534f'), col(new THREE.BoxGeometry(0.026, 0.012, 0.026).translate(0, 0.2, 0), '#6e4a33')]) }, [])
  const stakeM = useMemo(() => toon('#ffffff', { vertexColors: true }), [])
  return <><instancedMesh ref={ref} args={[geo, mat, stones.length]} /><instancedMesh ref={sref} args={[stakeG, stakeM, stakes.length]} /></>
}