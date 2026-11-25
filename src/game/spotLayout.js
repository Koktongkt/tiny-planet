// Gatherable spot layout (pure, deterministic: saved respawn state keys on the spot ids). game/World.jsx layout() calls
// it once; tests/unit/world-sites.test.mjs runs it. ?world=old keeps today's placement exactly. On the reworked planet
// nothing is laid in water or the sea, nor on a dig site; the drowned ruins' finds wash up on their dry shore; and each
// fishing spot stands on the first dry bank past the water's edge (in the lake or the bay, never the open sea).
import { R, height, around, ZONES, LAKE_W, HARB_W, waterAt, seaDepth, DIG_SITE_POS } from '../world.js'
import { OLD_WORLD } from '../world/flag.js'
import { SPAWNS } from './recipes.js'
import { FORAGE } from './forageTable.js'

const posOf = (n, lift = 0) => n.clone().normalize().multiplyScalar(R + height(n) + lift)
export const toward = (c, t, a) => { c = c.clone().normalize(); const d = t.clone().addScaledVector(c, -c.dot(t)).normalize(); return c.multiplyScalar(Math.cos(a)).addScaledVector(d, Math.sin(a)).normalize() }
const DIGS = OLD_WORLD ? [] : Array.from({ length: 6 }, (_, i) => DIG_SITE_POS(i))
const wet = (n) => waterAt(n) || seaDepth(n) > 0
const keepOut = (n) => wet(n) || DIGS.some(d => d.angleTo(n) * R < 0.5)
// a fishing spot on bearing b (new world): the float on lake / bay water, she stands on the first dry bank outside the
// zone's collider (zones.jsx ZONE_COLLIDERS, 0.98 r), at most 0.45 from the last water. null if the bearing won't do.
function waterSpot(c, r, b) {
  const pn = around(c, r * 0.86, b); if (!waterAt(pn) || seaDepth(pn) > 0) return null
  let last = pn
  for (let d = r * 0.86; d < r * 1.6; d += 0.02 / R) {
    const p = around(c, d, b); if (seaDepth(p) > 0) return null
    if (wet(p)) { last = p; continue }
    if (d < r * 0.98 + 0.04 / R) continue
    const stand = around(c, Math.max(d, r * 0.98 + 0.04 / R) + 0.05 / R, b)
    return wet(stand) || stand.angleTo(last) * R > 0.45 ? null : { pn, stand }
  }
  return null
}
// Zc: zone centres; village: the square; blocked(n): App.jsx's colliders / river / path / houses; showcaseFrom: where
// the forest showcase cluster faces (her start)
export function placeSpots(Zc, village, blocked, showcaseFrom) {
  let seed = 4242; const rr = () => (seed = (seed * 16807) % 2147483647) / 2147483647
  const spots = [], zc = (z) => z === 'village' ? village : Zc[z], zr = (z) => z === 'village' ? 0.06 : ZONES[z].r
  for (const [zone, item, n, mode] of SPAWNS) {
    for (let i = 0, tries = 0; i < n && tries < 400; tries++) {
      const c = zc(zone), r = zr(zone); let pn, stand, lift = 0
      const wetZ = zone === 'lake' || zone === 'harbour'
      if (mode === 'water' && !OLD_WORLD) { const w = waterSpot(c, r, rr() * 6.283); if (!w) continue; pn = w.pn; stand = w.stand }
      else if (zone === 'ruins' && !OLD_WORLD) pn = around(c, r * (1.15 + rr() * 0.6), rr() * 6.283) // the drowned ruins: on their shore
      else if (mode === 'shore' || (wetZ && mode !== 'water')) pn = around(c, r * (1.03 + rr() * 0.11), rr() * 6.283)
      else if (mode === 'water') { const b = rr() * 6.283; pn = around(c, r * 0.86, b); stand = around(c, r * 1.04, b) }
      else if (mode === 'edge') pn = around(c, r * (0.88 + rr() * 0.12), rr() * 6.283)
      else if (mode === 'base') pn = toward(c, Zc.lake, r + 0.03 + rr() * 0.05).applyAxisAngle(c, (rr() - 0.5) * 2.2)
      else if (mode === 'spring') pn = toward(c, Zc.lake, r + 0.05)
      else pn = around(c, Math.sqrt(rr()) * r * (zone === 'forest' ? 0.8 : 0.85), rr() * 6.283)
      if (mode !== 'water' && blocked(pn) && tries < 300) continue
      if (mode !== 'water' && !OLD_WORLD && keepOut(pn)) continue
      const id = `${item}-${zone}-${i}`
      const water = mode === 'water'
      const level = zone === 'lake' ? LAKE_W : HARB_W
      const pos = water ? pn.clone().multiplyScalar(R + level + 0.01) : posOf(pn, lift)
      spots.push({ id, item, zone, n: pn, stand: stand || pn, pos, standPos: stand ? posOf(stand) : pos, night: mode === 'night', water, spin: rr() * 6.28, s: 1.35 + rr() * 0.35 })
      i++
    }
  }
  // showcase cluster in the forest (for the gather screenshot / first-time players)
  const fc = toward(Zc.forest, showcaseFrom, ZONES.forest.r * 1.2)
  ;[['mushroom', 0, 0], ['wood', 0.04, 0.9], ['moss', 0.035, -1.0], ['acorn', 0.05, 2.4], ['pinecone', 0.06, -2.2]].forEach(([item, d, b], k) => { const pn = around(fc, d, b); spots.push({ id: `${item}-show-${k}`, item, zone: 'forest', n: pn, stand: pn, pos: posOf(pn), standPos: posOf(pn), spin: k * 1.7, s: 1.5 }) })
  // Stage C seasonal forage: laid out for every season with their own seed (the main rr() sequence stays as before),
  // up to the rain-boosted count; which ones show follows forageSpawns(T.season, T.wet) (see World.jsx FORAGE_N).
  // Village forage sits on the outskirts, clear of the board / stalls / villagers. (New world: also off blocked ground
  // and out of the water.)
  { let fs = 9173; const fr = () => (fs = (fs * 16807) % 2147483647) / 2147483647
    for (const f of FORAGE) { const max = Math.ceil(f.n * (f.rain || 1)), c = zc(f.zone), r = zr(f.zone)
      for (let i = 0, tries = 0; i < max && tries < 200; tries++) { const pn = f.zone === 'village' ? around(c, r * (1.6 + fr() * 0.8), fr() * 6.283) : around(c, Math.sqrt(fr()) * r * 0.85, fr() * 6.283)
        if (!OLD_WORLD && (keepOut(pn) || (blocked(pn) && tries < 150))) continue
        const pos = posOf(pn); spots.push({ id: `${f.id}-${f.zone}-${i}`, item: f.id, zone: f.zone, n: pn, stand: pn, pos, standPos: pos, forage: i, spin: fr() * 6.28, s: 1.35 + fr() * 0.35 }); i++ } } }
  return spots
}
