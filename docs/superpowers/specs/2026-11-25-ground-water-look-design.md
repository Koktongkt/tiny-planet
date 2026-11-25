# Ground and water look: "clay diorama" (look A)

Date: 2026-11-25. Follows the world rework (`2026-11-24-world-rework-design.md`), which settled *where* everything is. This round settles how the ground, river, lake, harbour and sea *look*.

## Why

The partner reviewed the reworked world and found it "a step down from the main character house set". Her cottage and yard (`src/props/items/exterior.js`, `src/home/Exterior.jsx`) are plump, rounded, ink-outlined and warm; the ground and water around them read flat, faceted, pale and thin. The three qualities the partner named as what feels right in the house set: **round and soft, ink outlines, warm colours**. The ground and water must carry those three.

Three looks were rendered side by side in the engine next to her real cottage props (artifact "Ground and Water Looks"; spike source kept outside the repo in the session scratchpad, `looks-spike/looks.js`). The partner picked **A, clay diorama**:

- a rounded grass lip along every bank, with a band of warm soil showing under it, like a slice of cake;
- a ring of puffy foam beads hugging every shoreline, ink outlined;
- water that goes from turquoise shallows to deep blue, with ripple rings, lily pads and flow marks;
- ground shaded with the same warm toon ramp as her house: sunny yellow-green tops, cool blue-green hollows, soft painted patches, no visible facets.

## Goals

1. The ground reads soft and rounded: no visible triangle facets anywhere on the planet.
2. Ground colour uses a warm palette matched to her yard (see Palette), shaded with the props' warm toon ramp (`RAMP` in `src/props/kit.js`).
3. Every shoreline (both river banks, the lake, the waterfall's plunge pool, the harbour bay, the whole sea coast) gets the A treatment: rounded grass lip, soil band, foam beads, ink lines.
4. All water (river, lake, plunge pool, harbour, sea) shares one look: shallow-to-deep gradient, ripple rings on still water, flow marks on the river, lily pads on the lake. Day, dusk and night variants keep working.
5. It stays inside the project's perf budget on `main` (`tests/perf/budget.json`: phone 1.0M triangles and 350 draw calls walking; desktop 1.3M / 500) and adds only a handful of draw calls.
6. A single switch drops the finer bank terrain and keeps everything else (see Approaches), so the partner can fall back if phones suffer.

## Non-goals (this round)

- Cliff and peak rock layers (stacked "cake" strata), path restyle, trees and scatter restyle, the waterfall sheet itself. Each is a later round.
- Moving anything: the layout from the world rework stays exactly as it is.
- The world reacting to the player (kept for later, per the partner).

## Anti-goals (a failure even if it works)

- The new ground or water looks a different style from her house when seen next to it (the test: the `home`, `lake-museum`, `village-square` and `zones-lake-waterfall` views next to the cottage).
- Visible cracks, seams or flicker where the finer bank terrain meets the rest of the ground, or where foam meets water.
- Gameplay changes: where she can walk, wade, fish, dig or gather must not move. `waterAt`, `seaDepth`, `height` as used by gameplay keep their meaning (banks may change shape visually only within the existing wet/dry boundary).
- Phones noticeably slower without the partner choosing that trade.

## Constraints

- Ground today: one `IcosahedronGeometry(R, 64)` (R = 10.4), non-indexed, vertex-coloured, `inkRim(paint(toon(...)))` material, built in `Ground()` in `src/App.jsx`. Its triangles are about 0.18 world units across, too coarse for a 0.06-wide bank lip. Normals are computed on the non-indexed mesh, so every triangle is lit flat: that is the faceted look.
- Water today: the river is a ribbon with its own shader (`Stream()` in `src/riverProps.jsx`); lake, harbour and plunge pool are `WaterCap` sphere caps with `waterMaterial` (`src/zones.jsx`); the sea is one cap at the planet centre (`Sea()`).
- Gameplay reads terrain through `height(n)`, `waterAt(n)`, `seaDepth(n)`, `streamNear(n)` in `src/world.js`. These are the source of truth and stay so.
- `?world=old` must still render the legacy world unchanged until Task 12 of the world rework removes it.
- Draw calls matter more than triangles on phones; new pieces are merged into few meshes.

## Approaches considered

1. **Shoreline kit on top of the ground.** Smooth and repaint the existing ground; generate shore pieces (grass lip, soil band, foam beads, ink waterline) along every water edge as separate merged meshes; one shared water material. Cheapest that keeps real 3D roundness; banks are drawn over a coarse slope, so the soil band is a ribbon rather than carved ground.
2. **Finer ground everywhere.** Raise the whole planet's ground resolution until banks can be carved into it, as the spike did. About a million more triangles in every view; rejected for phones.
3. **Paint it in the shaders.** Fake banks, foam and outlines in the ground and water shaders. Cheapest, but flat: loses the roundness the partner chose A for.

**Chosen (partner's call): a compromise between 1 and 2.** Everything in 1, plus the ground is made finer **only in a band along the water**, so the bank is carved into the ground itself (a real rounded drop with the soil band on it), as in the spike. A switch (`SHORE_FINE`, on by default) turns the finer band off; with it off, the build is exactly approach 1. If phones suffer, the partner decides whether to flip it, keep it for desktop only, or keep it everywhere.

## The design

### Ground (whole planet)

- **Smooth shading.** Weld duplicate vertices before computing normals, so light rolls smoothly over hills. The welded mesh may stay indexed.
- **Palette** (from her yard; the spike's values are the starting point):
  - sunny grass `#b8dc62`, grass `#82c34a`, cool shade grass `#5aa26a`;
  - soil `#d08f55` to soil shadow `#a8673a`;
  - wet sand at shallow edges `#e9d9b0` (sea coast only);
  - ink `PAL.ink` (`#4a3a35`-family, as the props use).
- **Painting.** Colour comes from height and a slow noise: tops lean sunny, hollows lean cool, with soft patches. Existing colour rules for the path, worn ground and zones (`zoneColour`, `wornAt`, path sand) keep working on top.
- **Material.** The props' warm toon ramp (`RAMP`) with vertex colours, keeping the ground's existing ink-rim shader so silhouettes stay outlined.

### Finer bank band (`SHORE_FINE`)

- Triangles of the ground within a set distance of any shoreline (about 0.6 world units; builder tunes) are subdivided until edges are about 0.04–0.05 world units. Elsewhere the ground is unchanged.
- Where finer meets coarser, the join must be crack-free (no gaps or T-junction seams visible from any view).
- In the band, the **visual** surface uses a bank profile: flat ground, a small rounded rise (the lip), then a steep, rounded drop to just under the water, as in the spike's `cliff` profile. The drop shows the soil colours. This is a visual offset; gameplay `height()` and `waterAt()` are not changed. The visible rim must sit on the existing wet/dry line so she still stands where she stood.
- With `SHORE_FINE` off, the ground is not subdivided and the soil band is drawn by the shore kit as a ribbon instead (approach 1).

### Shore kit (every shoreline, always on)

Built once from the shoreline contours of river (both sides), lake, plunge pool, harbour and sea coast:

- **Grass lip:** a rounded green tube along the top of the bank, ink outlined. With the fine band on, it sits on the carved lip; with it off, it sits on the ground at the waterline offset.
- **Soil band** (only when `SHORE_FINE` is off): a ribbon from the lip down to just under the water, soil-coloured.
- **Foam beads:** puffy, slightly flattened white beads of varying size along the waterline, ink outlined. All beads in one or a few merged or instanced meshes. Beads near her may be finer; distant beads simpler or culled.
- **Ink waterline:** a thin ink line where water meets bank, under the foam.
- Bridges, piers, the dock, stepping stones and the waterfall foot must not be buried in or float above the new pieces.

### Water (all bodies)

- One shared material: turquoise shallows near any shore, deep blue in the middle (by distance to shore), toon-flat, not glossy-realistic.
- Lake, plunge pool, harbour: slow ripple rings. Lake: a few lily pads with pink flowers (ink outlined). River: white flow marks moving downstream. Sea: gentle rings and the existing calm movement, with the beads along the coast. Sea whitecaps shrink (a deferred minor from the world rework).
- Dusk and night tints as today (the `uN` / `uD` uniforms).

## Measuring and the fallback

- `npm run perf:budget` before and after, with `SHORE_FINE` on and off, on every view, against `main`'s caps. Report triangles and draw calls per view.
- Targets: new draw calls in any view ≤ about 10; new triangles in any walking view ≤ about 250k with the fine band on.
- If the fine band breaks a cap or the partner sees slowness on a real phone, the partner chooses: fine band off everywhere, or on desktop only.

## Checks

- Unit: shoreline contours are closed or end at map edges; the visual rim stays within a small tolerance of the gameplay wet/dry line; no fine-band triangle is far from a shoreline; the crack-free join (shared edges have identical vertex positions).
- Existing tests stay green, including the world rework's gameplay tests (spots, dig sites, walkers, arrivals).
- Screenshots: every zone view and orbit day/dusk/night, with `SHORE_FINE` on and off, and the four anti-goal views next to the cottage.

## Left to the builder

- The exact subdivision method and band width, as long as the join is crack-free and the targets hold.
- How foam beads are batched and culled.
- How distance-to-shore reaches the water shader (vertex attribute, texture, or analytic).
- Exact bank profile numbers, tuned with screenshots against the spike.
