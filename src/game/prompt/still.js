// How long the traveller has stood still (ms). Ticked at the start of the interaction loop, before targets are
// considered, from her position in whichever space she is in (planet or room). Pets read it (src/pets/petPrompt.js).
export const STILL = { ms: 0, x: NaN, y: NaN, z: NaN }
export function tickStill(x, y, z, dt) {
  const moved = (x - STILL.x) ** 2 + (y - STILL.y) ** 2 + (z - STILL.z) ** 2 > 1e-8 || Number.isNaN(STILL.x)
  STILL.x = x; STILL.y = y; STILL.z = z; STILL.ms = moved ? 0 : STILL.ms + dt * 1000
}
