// How a photo sits in the album, as if pasted in by hand: a tilt, a small nudge off the grid and a strip (or two) of
// tape. Seeded from the photo's id, so it looks the same every time the book opens.
export const TAPES = ['top', 'corners', 'left', 'top-skew']
function rng(id) { let h = 2166136261; for (const c of String(id)) h = Math.imul(h ^ c.charCodeAt(0), 16777619)
  return () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); h ^= h >>> 16; return (h >>> 0) / 4294967296 } }
export function pasteLook(id) {
  const r = rng(id), s = (a) => (r() * 2 - 1) * a
  const rot = s(6.5), x = s(7), y = s(7), tape = TAPES[Math.floor(r() * TAPES.length)], tapeRot = s(12)
  return { rot: +rot.toFixed(2), x: +x.toFixed(1), y: +y.toFixed(1), tape, tapeRot: +tapeRot.toFixed(1) }
}
/** CSS custom properties for a polaroid button / figure */
// own names: something on the page types a bare --r as a length, which turned every tilt into 0px (no transform)
export const pasteStyle = (id) => { const l = pasteLook(id); return { '--jb-rot': l.rot + 'deg', '--jb-x': l.x + 'px', '--jb-y': l.y + 'px', '--jb-tape': l.tapeRot + 'deg' } }
