// Train art materials (Stage C, art-c): toon vertex-colour body + BackSide ink hull + night-pass glow (common.jsx glow()).
import { toon, glow, paint } from '../../common.jsx'
import { boardsTexture } from './station.js'
let SM = null
export function stationMaterials() {
  if (SM) return SM
  SM = { body: paint(toon('#ffffff', { vertexColors: true, map: boardsTexture() }), 0.12, true, 8), glow: glow('#ffcf86') }
  return SM
}
let CM = null
export function carMaterials() { if (CM) return CM; CM = { body: toon('#ffffff', { vertexColors: true }), glow: glow('#ffd79a') }; return CM }
