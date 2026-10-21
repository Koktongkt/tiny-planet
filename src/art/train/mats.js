// Train art materials (Stage C, art-c): toon vertex-colour body + BackSide ink hull + night-pass glow (common.jsx glow()).
import * as THREE from 'three'
import { toon, glow, paint, INK } from '../../common.jsx'
import { boardsTexture } from './station.js'
let SM = null
export function stationMaterials() {
  if (SM) return SM
  SM = { body: paint(toon('#ffffff', { vertexColors: true }), 0.12, true, 8), hull: new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide }), glow: glow('#ffcf86'), boards: toon('#ffffff', { map: boardsTexture() }) }
  return SM
}
let CM = null
export function carMaterials() { if (CM) return CM; CM = { body: toon('#ffffff', { vertexColors: true }), hull: new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide }), glow: glow('#ffd79a') }; return CM }
