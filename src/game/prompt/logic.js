// In-world action prompt: pure logic (no DOM, no three). Which weight a target gets, which target wins (facing +
// sticky), and where the bubble sits on screen. Spec: docs/superpowers/specs/2026-11-23-in-world-prompts-design.md

// quick pickups from the ground get the light weight (gold outline + an occasional chip); the rest the head bubble
const FULL_SPOTS = new Set(['wool', 'fish', 'water'])
export function promptWeight(n) {
  if (!n) return 'full'
  if (n.kind === 'spot') return n.spot && !n.spot.water && !FULL_SPOTS.has(n.spot.item) ? 'light' : 'full'
  if (n.kind === 'decor') return 'light'
  if (n.kind === 'ext' && typeof n.id === 'string' && n.id.startsWith('dug')) return 'light'
  return 'full'
}

// cands: { o, d, lim, cos } (cos: facing cosine, null without an anchor). Things in front of the traveller score as
// closer; the previous target holds until another is clearly better, so the prompt doesn't flicker in a patch.
const score = (c, faceK) => c.cos == null ? c.d : c.d * (1 + faceK * (1 - c.cos) / 2)
export function pickTarget(cands, prevId, { faceK = 0.6, stick = 0.2 } = {}) {
  let best = null, bs = Infinity, prev = null, ps = Infinity
  for (const c of cands) {
    if (!(c.d < c.lim)) continue
    const s = score(c, faceK)
    if (s < bs) { bs = s; best = c }
    if (prevId != null && c.o && c.o.id === prevId) { prev = c; ps = s }
  }
  if (prev && best !== prev && !(bs < ps * (1 - stick))) return prev
  return best
}

// pt: the anchor on screen (px) and whether it is behind the camera; size: the viewport; box: the bubble, its height
// including the tail. Returns the bubble's top-left and the tail's x inside it. Behind the camera the projection is
// mirrored, and the bubble waits at the bottom edge on the side the target is on.
export function placeBubble(pt, size, box, margin = 8) {
  const { w, h } = size, { bw, bh } = box
  const clamp = (v, a, b) => Math.min(Math.max(v, a), Math.max(a, b))
  const x = pt.behind ? w - pt.x : pt.x
  const left = clamp(x - bw / 2, margin, w - margin - bw)
  const top = pt.behind ? h - margin - bh : clamp(pt.y - bh, margin, h - margin - bh)
  const tail = clamp(x - left, 14, bw - 14)
  return { left, top, tail }
}
