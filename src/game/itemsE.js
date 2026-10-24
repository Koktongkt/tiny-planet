// Stage E bicycle item. Lazy (imported with crafting). Kept out of the startup chunk.
import { ITEMS, TOOLS } from './items.js'
if (!TOOLS.includes('bike')) TOOLS.push('bike')
if (!ITEMS.bike) ITEMS.bike = { name: 'Bicycle', cat: 'tool', desc: 'A wooden bicycle. Press R to ride. It stays outside, off the train, and out of the museum.' }
