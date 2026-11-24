// Camera-relative movement + camera input (pure, no three.js; shared by the outdoor and indoor controllers).
// Screen directions: x right, y up (away from the camera). Yaw 0 faces +z, as everywhere in the game.
export const ZMIN = 0.55, ZMAX = 2.4, ZOOM0 = 1.45 // zoom scale; the default starts wider than the old 1.0
export const IN_YAW = 0.7 // indoor orbit limit (rad) round the front of the cut-away room
const DEAD = 0.12
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a))

/** what the player asks for: keyboard (WASD / arrows) wins over the stick; { x, y, mag } with mag 0..1 */
export function moveIntent(k, pad) {
  const x = (k.d || k.arrowright ? 1 : 0) - (k.a || k.arrowleft ? 1 : 0), y = (k.w || k.arrowup ? 1 : 0) - (k.s || k.arrowdown ? 1 : 0)
  if (x || y) { const l = Math.hypot(x, y); return { x: x / l, y: y / l, mag: 1 } }
  if (pad && pad.active && pad.mag > DEAD) { const l = Math.hypot(pad.x, pad.y) || 1; return { x: pad.x / l, y: pad.y / l, mag: Math.min(1, (pad.mag - DEAD) / 0.6) } }
  return { x: 0, y: 0, mag: 0 }
}
/** the yaw of a screen direction, given the yaw the camera looks along */
export const screenYaw = (camYaw, x, y) => camYaw - Math.atan2(x, y)
/** ease cur toward want (shortest way); gap = what's left */
export function turnStep(cur, want, dt, rate = 10) { const d = wrap(want - cur), yaw = cur + d * Math.min(1, dt * rate); return { yaw, gap: Math.abs(wrap(want - yaw)) } }
/** walk speed while turning: full when nearly facing, slow while she turns round (no moonwalk) */
export const walkFactor = (gap) => gap < 0.6 ? 1 : gap > 1.6 ? 0.25 : 1 - 0.75 * (gap - 0.6)
/** a wheel step (deltaY > 0 zooms out) */
export const zoomStep = (z, deltaY) => Math.min(ZMAX, Math.max(ZMIN, z * (deltaY > 0 ? 1.1 : 1 / 1.1)))
export const clampInYaw = (y) => Math.max(-IN_YAW, Math.min(IN_YAW, y))
