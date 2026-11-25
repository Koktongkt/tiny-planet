// Carved banks (a finer band of ground along every shore) are on by default. `?shore=coarse` falls back to the cheaper
// drawn-on banks; the legacy world (?world=old) never uses either. See docs/superpowers/specs/2026-11-25-ground-water-look-design.md
import { OLD_WORLD } from './flag.js'

const q = typeof location !== 'undefined' ? new URLSearchParams(location.search) : null
export const SHORE_FINE = !OLD_WORLD && q?.get('shore') !== 'coarse'

// every water surface is drawn this much below its gameplay level, so the carved grass lip stands proud of it and a
// band of soil shows (look A). Gameplay levels are unchanged. 0 in the legacy world.
export const WATER_DROP = OLD_WORLD ? 0 : 0.05
