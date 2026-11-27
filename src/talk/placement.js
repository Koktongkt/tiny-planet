// Place the conversation in screen-space above the same anchor as the action prompt.
// If the card would cover the speaker's head, try beside them, then a quiet undocked
// position. The bottom fallback reserves room for the hotbar or touch action pad.
import { placeBubble } from '../game/prompt/logic.js'

export function placeDialogue(pt, size, box, { touch = false } = {}) {
  const { w, h } = size, { bw, bh } = box
  const margin = 12, gap = 12
  const top = touch ? Math.min(64, Math.max(margin, h - bh - margin)) : margin
  const bottom = Math.max(top, h - bh - margin)
  const clamp = (v, a, b) => Math.min(Math.max(v, a), Math.max(a, b))
  const onScreen = !pt.behind && pt.x >= 0 && pt.x <= w && pt.y >= 0 && pt.y <= h
  if (onScreen && pt.y - bh - gap >= top) {
    const p = placeBubble({ ...pt, y: pt.y - gap }, size, box, margin)
    return { ...p, side: 'down' }
  }
  if (onScreen) {
    const y = clamp(pt.y - bh / 2, top, bottom)
    // Leave space around the head, even if the camera points towards the edge.
    const clearance = 32
    const right = pt.x + clearance, left = pt.x - clearance - bw
    const tail = clamp(pt.y - y, 16, bh - 16)
    if (right + bw <= w - margin) return { left: right, top: y, tail, side: 'left' }
    if (left >= margin) return { left, top: y, tail, side: 'right' }
  }
  const reserve = touch ? (h < 500 ? 175 : 205) : 100
  const dockTop = clamp(h - reserve - bh, top, bottom)
  return { left: clamp(w / 2 - bw / 2, margin, w - margin - bw), top: dockTop, tail: bw / 2, side: 'none' }
}
