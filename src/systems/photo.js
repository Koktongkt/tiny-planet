// Stage C photo album (pure; unit-tested). Metadata in the save (G.s.photos.list); the small JPEG thumbnails live in
// their own localStorage key so the main save stays small. Up to MAX photos (4 album pages of PER_PAGE); when the album
// is full a new photo is refused, nothing is dropped on its own.
export const PER_PAGE = 12
export const pageCount = (n) => Math.max(1, Math.ceil(n / PER_PAGE))
export const MAX = 48, THUMB_W = 320, THUMB_Q = 0.7, KEY = 'tinyplanet.photos'
// list: meta[], store: { [id]: dataUrl }. -> false when the album is full (nothing added)
export function addPhoto(list, store, meta, dataUrl) {
  if (list.length >= MAX) return false
  list.push(meta); store[meta.id] = dataUrl; return true
}
export function removePhoto(list, store, id) { const i = list.findIndex(p => p.id === id); if (i < 0) return false; list.splice(i, 1); delete store[id]; return true }
// keep metadata and thumbnails consistent (e.g. storage was cleared or a write failed)
export function reconcile(list, store) { const ids = new Set(list.map(p => p.id)); for (const k of Object.keys(store)) if (!ids.has(k)) delete store[k]; for (let i = list.length - 1; i >= 0; i--) if (!store[list[i].id]) list.splice(i, 1); return list }
export const thumbSize = (w, h) => { const tw = Math.min(THUMB_W, w); return [tw, Math.max(1, Math.round(h * tw / w))] }
export const fileName = (day, n) => `tiny-planet-day${day + 1}-${String(n).padStart(2, '0')}.png`
