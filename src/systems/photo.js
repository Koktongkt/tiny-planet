// Stage C photo album (pure; unit-tested). Metadata in the save (G.s.photos.list); the small JPEG thumbnails live in
// their own localStorage key so the main save stays small. Up to MAX photos; the oldest is dropped.
export const MAX = 12, THUMB_W = 320, THUMB_Q = 0.7, KEY = 'tinyplanet.photos'
// list: meta[], store: { [id]: dataUrl }. -> dropped ids
export function addPhoto(list, store, meta, dataUrl) {
  list.push(meta); store[meta.id] = dataUrl; const dropped = []
  while (list.length > MAX) { const o = list.shift(); delete store[o.id]; dropped.push(o.id) }
  return dropped
}
export function removePhoto(list, store, id) { const i = list.findIndex(p => p.id === id); if (i < 0) return false; list.splice(i, 1); delete store[id]; return true }
// keep metadata and thumbnails consistent (e.g. storage was cleared or a write failed)
export function reconcile(list, store) { const ids = new Set(list.map(p => p.id)); for (const k of Object.keys(store)) if (!ids.has(k)) delete store[k]; for (let i = list.length - 1; i >= 0; i--) if (!store[list[i].id]) list.splice(i, 1); return list }
export const thumbSize = (w, h) => { const tw = Math.min(THUMB_W, w); return [tw, Math.max(1, Math.round(h * tw / w))] }
export const fileName = (day, n) => `tiny-planet-day${day + 1}-${String(n).padStart(2, '0')}.png`
