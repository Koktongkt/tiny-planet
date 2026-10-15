// cat state lives apart from the (lazy) Cat component so the room camera can read it at startup
export const CAT = { x: -0.3, z: 0.55, y: 0, yaw: 2.4, state: 'wander', t: 0, dur: 3, mood: 0.7, target: null, hop: null, ball: { x: 0.0, z: 0.7, vx: 0, vz: 0, spin: 0 }, ignoreCD: 0, approachCD: 6, name: 'Mochi' }
if (typeof window !== 'undefined') window.__cat = CAT
