// Touch-only frame pace. Desktop never calls this. Idle means no held input and no
// player movement for IDLE_MS. The rendered frames stay on the real clock: a 30 fps
// idle still advances animation by the time that actually passed, so nothing speeds up.
export const IDLE_MS = 700
export const IDLE_FPS = 30
export const IDLE_FRAME_MS = 1000 / IDLE_FPS

export function stampActive(now, lastActive, { held, moving }) {
  return held || moving ? now : lastActive
}

export function paceFrame({ touch, now, lastActive, lastRender, paused, booted }) {
  if (!touch) return { render: true, idle: false }
  if (paused) return { render: false, idle: false }
  if (!booted) return { render: true, idle: false }
  const idle = now - lastActive >= IDLE_MS
  if (!idle) return { render: true, idle: false }
  // null lastRender is the first frame. A real timestamp of 0 must still count, or the cap never starts.
  if (lastRender == null || now - lastRender >= IDLE_FRAME_MS - 0.5) return { render: true, idle: true }
  return { render: false, idle: true }
}
