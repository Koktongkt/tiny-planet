// 3D errands notice board prop (art-b): <NoticeBoard n={[x,y,z]} spin={rad} notes={0..4} onInteract={()=>void} quality />
// or position/quaternion directly: <NoticeBoard position={[..]} quaternion={[..]} />. Low-poly, ONE merged vertex-
// coloured toon mesh (+ one ink hull, near camera only) = 1-2 draw calls, ~600 tris. A little shingled roof, two posts,
// a framed cork board, pinned paper notes (count from `notes`, e.g. today's open errands) and a hanging sign plank.
import * as THREE from 'three'
import React, { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { toon, paint } from '../../common.jsx'
import { place } from '../../world.js'
import { P, emitParts, buildGeometry } from '../../art/kit.js'
import { inkMaterial, hullGeometry } from '../../art/ink.js'
const NOTE_C = ['#fffaf0', '#fff1c9', '#fde2e6', '#e6f0dc']
const PIN_C = ['#d9655b', '#5f8fc4', '#e8b84a', '#7fae5f']
export const BOARD_H = 0.62 // overall height (world units; the traveller is ~0.3)
function parts(notes) {
  const o = [], W = 0.46, by = 0.36, bh = 0.26
  for (const s of [-1, 1]) o.push(P('box', '#8a5a3c', [s * (W / 2 + 0.012), 0.3, 0], [0.034, 0.6, 0.034], [0, 0, s * 0.012]))
  o.push(P('box', '#b07a4f', [0, by, -0.004], [W + 0.04, bh + 0.04, 0.03]))           // frame
  o.push(P('box', '#c99a66', [0, by, 0.008], [W - 0.012, bh - 0.012, 0.012]))       // cork
  o.push(P('box', '#9a6a44', [0, by - bh / 2 - 0.03, 0.012], [W * 0.92, 0.022, 0.05])) // little shelf
  // roof: two shingled slopes + ridge
  for (const s of [-1, 1]) o.push(P('box', s < 0 ? '#d9655b' : '#c75a50', [0, by + bh / 2 + 0.09, s * 0.045], [W + 0.13, 0.016, 0.11], [s * 0.62, 0, 0]))
  o.push(P('box', '#8a5a3c', [0, by + bh / 2 + 0.125, 0], [W + 0.15, 0.022, 0.022]))
  // sign plank hanging under the roof
  o.push(P('box', '#e8c9a0', [0, by + bh / 2 + 0.035, 0.03], [0.2, 0.045, 0.012], [0, 0, 0.03]))
  for (const s of [-1, 1]) o.push(P('cyl', '#6e4a32', [s * 0.07, by + bh / 2 + 0.055, 0.03], [0.002, 0.045, 0.002]))
  o.push(P('box', '#7a5236', [0, by + bh / 2 + 0.037, 0.037], [0.13, 0.008, 0.002], [0, 0, 0.03]), P('box', '#d9655b', [-0.08, by + bh / 2 + 0.039, 0.037], [0.014, 0.014, 0.002], [0, 0, 0.8]))
  // pinned notes (0..4)
  const slots = [[-0.14, 0.02, -0.07], [0.0, 0.035, 0.05], [0.14, 0.01, -0.04], [-0.06, -0.075, 0.08], [0.11, -0.08, 0.1]]
  for (let k = 0; k < Math.min(5, notes); k++) { const [x, y, r] = slots[k]; o.push(P('box', NOTE_C[k % 4], [x, by + y, 0.017], [0.1, 0.11, 0.004], [0, 0, r]))
    o.push(P('box', '#9a8a80', [x, by + y + 0.01, 0.02], [0.06, 0.006, 0.002], [0, 0, r]), P('box', '#9a8a80', [x - 0.005, by + y - 0.012, 0.02], [0.05, 0.006, 0.002], [0, 0, r]))
    o.push(P('ico', PIN_C[k % 4], [x, by + y + 0.045, 0.024], [0.009, 0.009, 0.009])) }
  // grass skirt at the foot of the posts
  for (const s of [-1, 1]) o.push(P('dome', '#7fae5f', [s * (W / 2 + 0.012), 0, 0], [0.05, 0.03, 0.05]))
  return o
}
let MAT = null
const mats = () => MAT || (MAT = { body: paint(toon('#ffffff', { vertexColors: true }), 0.16, true, 22), ink: inkMaterial(0.0055, 0) })
export function NoticeBoard({ n, spin = 0, position, quaternion, notes = 3, onInteract, quality = 'hi' }) {
  const geo = useMemo(() => { const out = { pos: [], nor: [], col: [], base: [], w: [] }; emitParts(parts(notes), new THREE.Matrix4(), new THREE.Vector3(), out); const g = buildGeometry(out); g.deleteAttribute('aBase'); g.deleteAttribute('aW'); return { g, hull: hullGeometry(g) } }, [notes])
  useEffect(() => () => { geo.g.dispose(); geo.hull.dispose() }, [geo])
  const tf = useMemo(() => n ? place(new THREE.Vector3(...n), 0, spin) : { pos: new THREE.Vector3(...(position || [0, 0, 0])), q: new THREE.Quaternion(...(quaternion || [0, 0, 0, 1])) }, [n && n.join(), spin, position && position.join(), quaternion && quaternion.join()])
  const m = mats(), ink = useRef(), grp = useRef(), k = useRef(0), _w = useMemo(() => new THREE.Vector3(), [])
  useFrame(({ camera }) => { if (k.current++ % 8 || !ink.current) return; ink.current.visible = quality !== 'lo' && _w.setFromMatrixPosition(grp.current.matrixWorld).distanceTo(camera.position) < 7 })
  return <group ref={grp} position={tf.pos} quaternion={tf.q}>
    <mesh geometry={geo.g} material={m.body} onClick={onInteract ? (e) => { e.stopPropagation(); onInteract() } : undefined} />
    {quality !== 'lo' && <mesh ref={ink} geometry={geo.hull} material={m.ink} raycast={() => null} />}
  </group>
}
export default NoticeBoard
