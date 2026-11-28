# Outdoor vegetation assets — V3 (review)

Standalone procedural Three.js assets matching the refined review: short grass, taller curved grass, fern, puffy bush, flowering bush, and five-petal wildflowers.

- `kit.js` exports mesh factories, three geometry LOD tiers (0 close, 1 medium, 2 far), the plant palette, and an instanced warm-toon material.
- For `flowerGeo`, set the instance colour to a flower swatch and pass `true` as the second argument to `plantMaterial` so only petals receive that tint.
- For `floweringBushGeo`, use white instance colour; the shrub and blossom colours are baked in.
- The geometry and materials are for `THREE.InstancedMesh`; wind uses the existing shared time uniform.
- Meshes are generated in world units, Y-up. Dispose generated geometries when no longer used.
- Visual asset staging only. Existing game world, terrain, placement, house, garden, and renderer imports are intentionally unchanged. In-game performance must be evaluated separately before integration.
