// 2.5D traveller: hand-built SVG sprite sheet (tools/sprites.mjs) on a camera-facing billboard kept upright to the local surface.
import * as THREE from 'three'
import React, { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { T, C, CC } from './common.jsx'
import sheetUrl from './assets/traveller-sheet.png'

const COLS = 5, ROWS = 3, HGT = 0.5, WID = HGT * 256 / 384
let TEX
function tex() {
  if (TEX) return TEX
  TEX = new THREE.TextureLoader().load(sheetUrl); TEX.colorSpace = THREE.SRGBColorSpace
  TEX.generateMipmaps = false; TEX.minFilter = THREE.LinearFilter; TEX.repeat.set(1 / COLS, 1 / ROWS); return TEX
}
const _c = new THREE.Vector3(), _m = new THREE.Matrix4()
// st: { phase, move, dist } — frame advances with distance travelled
export function SpritePerson({ st }) {
  const camera = useThree(s => s.camera)
  const g = useRef(), bill = useRef(), sh = useRef()
  const mat = useMemo(() => { const t = tex().clone(); t.needsUpdate = true
    return new THREE.MeshBasicMaterial({ map: t, transparent: true, alphaTest: 0.35, depthWrite: true, side: THREE.DoubleSide }) }, [])
  const shadowMat = useMemo(() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d')
    const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(40,30,40,.42)'); gr.addColorStop(0.6, 'rgba(40,30,40,.22)'); gr.addColorStop(1, 'rgba(40,30,40,0)')
    x.fillStyle = gr; x.fillRect(0, 0, 64, 64); return new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false }) }, [])
  const tint = useMemo(() => new THREE.Color(), [])
  useFrame(() => {
    // camera position in the character's local frame (y = surface up, z = heading)
    g.current.updateWorldMatrix(true, false)
    _c.copy(camera.position).applyMatrix4(_m.copy(g.current.matrixWorld).invert())
    const a = Math.atan2(_c.x, _c.z), A = Math.abs(a)
    const row = A < Math.PI * 0.3 ? 0 : A > Math.PI * 0.72 ? 1 : 2
    const flip = row === 2 && a > 0 // side art faces right; mirror when heading points screen-left
    const walking = st.move > 0.15
    const f = walking ? 1 + (Math.floor((st.dist ?? st.phase * 0.03) / 0.045) % 4) : 0
    const t = mat.map; t.repeat.x = (flip ? -1 : 1) / COLS; t.offset.set((f + (flip ? 1 : 0)) / COLS, 1 - (row + 1) / ROWS)
    // billboard: yaw only, around local up
    bill.current.rotation.y = a
    // squash bounce
    const s = Math.sin(st.phase), land = Math.pow(Math.abs(Math.cos(st.phase)), 6) * st.move
    const breathe = Math.sin((st.t ?? 0) * 2.2) * 0.012 * (1 - st.move)
    bill.current.scale.set(1 + 0.05 * land, 1 - 0.06 * land + breathe, 1)
    bill.current.position.y = (1 - Math.abs(Math.cos(st.phase))) * 0.012 * st.move
    sh.current.scale.setScalar(1 - 0.15 * (1 - Math.abs(Math.cos(st.phase))) * st.move)
    // time-of-day tint
    tint.setRGB(1, 1, 1).lerp(CC('#ffc39a'), T.dusk * 0.6).lerp(CC('#7d8cc8'), T.night * 0.7)
    mat.color.copy(tint)
  })
  return <group ref={g}>
    <mesh ref={sh} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, 0]} material={shadowMat} renderOrder={1}><planeGeometry args={[0.2, 0.13]} /></mesh>
    <group ref={bill}><mesh position={[0, HGT / 2 - HGT * 10 / 384, 0]} material={mat}><planeGeometry args={[WID, HGT]} /></mesh></group>
  </group>
}
