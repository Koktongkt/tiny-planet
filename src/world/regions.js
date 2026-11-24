// Region registry for the reworked planet: pure data (no three.js), the single source of region centres.
// Angles are (lat, lon, r) in radians. ZONES in src/world.js is derived from this unless ?world=old.
const _dir = (lat, lon) => [Math.cos(lat) * Math.sin(lon), Math.sin(lat), Math.cos(lat) * Math.cos(lon)]
const Z = (lat, lon, r) => { const [x, y, z] = _dir(lat, lon); return { x, y, z, r, lat, lon } }

// Point at angular distance d from (lat, lon), heading toward (tLat, tLon) (great-circle).
function toward(lat, lon, tLat, tLon, d) {
  const a = _dir(lat, lon), b = _dir(tLat, tLon)
  const dot = a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
  let t = b.map((v, i) => v - dot * a[i]); const tl = Math.hypot(...t) || 1; t = t.map(v => v / tl)
  const p = a.map((v, i) => v * Math.cos(d) + t[i] * Math.sin(d))
  return { lat: Math.asin(Math.max(-1, Math.min(1, p[1]))), lon: Math.atan2(p[0], p[2]) }
}

// Water flows down this chain (peak -> cliff -> terraces -> village -> lake -> harbour).
export const REGIONS = [
  { id: 'peak', name: "Keepers' Peak", lat: 1.38, lon: 0.0, r: 0.20, keeper: true },
  { id: 'cliff', name: 'Cliff', lat: 1.00, lon: 0.35, r: 0.11, keeper: false },
  { id: 'terraces', name: 'Terraces', lat: 0.72, lon: 0.75, r: 0.18, keeper: false },
  { id: 'village', name: 'Village', lat: 0.35, lon: 0.35, r: 0.10, keeper: false },
  { id: 'lake', name: 'Lake', lat: -0.15, lon: 0.85, r: 0.20, keeper: false },
  { id: 'ruins', name: 'Ruins', lat: -0.12, lon: 0.75, r: 0.08, keeper: false }, // inside the lake's west half (half-drowned)
  { id: 'museum', name: 'Museum', lat: 0.02, lon: 1.05, r: 0.05, keeper: false }, // on the lake shore
  { id: 'harbour', name: 'Harbour', lat: -0.72, lon: 1.60, r: 0.20, keeper: false }, // a bay straddling the coast
  { id: 'forest', name: 'Forest', lat: 0.25, lon: 2.60, r: 0.30, keeper: false },
  { id: 'giant', name: 'Giant', lat: 0.40, lon: 2.40, r: 0.10, keeper: false }, // inside forest
  { id: 'meadow', name: 'Meadow', lat: 0.30, lon: 4.60, r: 0.30, keeper: false }, // windward side
  { id: 'mills', name: 'Mills', lat: 0.55, lon: 4.30, r: 0.15, keeper: false }, // inside meadow
]
const byId = Object.fromEntries(REGIONS.map(r => [r.id, r]))

export const region = (id) => { const r = byId[id]; if (!r) throw new Error('unknown region ' + id); return Z(r.lat, r.lon, r.r) }

// Flat-ish, empty ground reserved for later placement.
export const OPEN_PLOTS = [{ lat: 0.00, lon: 3.60, r: 0.15 }, { lat: 0.55, lon: 5.60, r: 0.15 }]
// Her house (HOUSES[0]), west edge of the village, near the river. Not a region.
export const HOME_DIR = { lat: 0.42, lon: 0.05 }

export const SEA_LAT = -0.78 // shoreline latitude
export const SEA_W = -0.2 // sea surface (same level as HARB_W)
export const TRAIN_LAT = -0.62 // coast railway, just above the shore (world.js keeps the legacy value until Task 8)
export const TRAIN_STOP_LONS = { village: 1.25, forest: 2.60 }

// Dig sites in index order (today's dig.taken[0..4] keys stay valid; 5 is new). Each lies inside its region.
const site = (i, id, d, tLat, tLon) => { const r = byId[id]; return { i, region: id, ...toward(r.lat, r.lon, tLat, tLon, d * r.r) } }
export const DIG_SITES = [
  site(0, 'peak', 0.6, byId.cliff.lat, byId.cliff.lon), // Peak stone circle, offset toward the cliff
  site(1, 'giant', 0.8, byId.forest.lat, byId.forest.lon), // torii footings at the giant, forest-centre side
  site(2, 'ruins', 0.6, byId.lake.lat, byId.lake.lon), // lake ruins shore (ruins overlap the lake)
  site(3, 'harbour', 0.7, -0.72, 1.45), // lighthouse base, lighthouse side
  // Footings of BRIDGES[0]: a placeholder inside the village (toward the lake). The real spot depends on the path and
  // river geometry, so world.js computes it: DIG_SITE_POS(4), on the village bank beside the first bridge's deck.
  site(4, 'village', 0.7, byId.lake.lat, byId.lake.lon),
  { i: 5, region: 'museum', lat: byId.museum.lat, lon: byId.museum.lon }, // museum trench, at the centre
]
for (const r of REGIONS) { const d = DIG_SITES.find(s => s.region === r.id); if (d) r.dig = { lat: d.lat, lon: d.lon } }
