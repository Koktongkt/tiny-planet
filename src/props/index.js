// Chibi props: the kit (builder, palette, materials, registry) + every item set. Import this to use any prop.
export { PAL, CATALOG, defineProp, makeProp, compose, footprint, MAT, GLOW, OUTLINE, mkOutline, PATTERNS } from './kit.js'
import './items/home.js'
import './items/house.js'
// outdoor set (cottage, puffy trees, flowering bushes, fences...) is imported by its users: home/Exterior.jsx, props/studio.jsx
