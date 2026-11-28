import { clearFloorLine } from '../home/state.js'

const STEP = 0.075
const STEPS = [[1, 0], [-1, 0], [0, 1], [0, -1]]
const RADIUS = 0.04

// Search the floor only when furniture blocks the direct approach. Keep the waypoints
// until the destination moves so the cat commits to one side of the obstacle.
export function findCatPath(x, z, tx, tz) {
  const start = { x, z, i: 0, j: 0, prev: null }
  const queue = [start], visited = new Set(['0,0'])
  for (let k = 0; k < queue.length; k++) {
    const node = queue[k]
    if (Math.hypot(node.x - tx, node.z - tz) < STEP * 2 && clearFloorLine(node.x, node.z, tx, tz, RADIUS)) {
      const path = [{ x: tx, z: tz }]
      for (let p = node; p.prev; p = p.prev) {
        const target = path[path.length - 1]
        if (!clearFloorLine(p.prev.x, p.prev.z, target.x, target.z, RADIUS)) path.push(p)
      }
      return path
    }
    for (const [di, dj] of STEPS) {
      const i = node.i + di, j = node.j + dj, key = i + ',' + j
      if (visited.has(key)) continue
      const nx = x + i * STEP, nz = z + j * STEP
      if (!clearFloorLine(node.x, node.z, nx, nz, RADIUS)) continue
      visited.add(key)
      queue.push({ x: nx, z: nz, i, j, prev: node })
    }
  }
  return []
}
