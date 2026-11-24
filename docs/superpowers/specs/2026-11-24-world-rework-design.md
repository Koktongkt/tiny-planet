# World rework: one planet, everything for a reason

Visual companion (sketches, map, region cards): https://claude.ai/artifact/ALqrddXMWLe2zcLDeyGDFo

## Intent and why
Today the world is two eras side by side: her home is in the chibi style (puffy, ink-outlined, hand-made), while the rest
is the v4 low-poly look (box houses, cone pines, grey pillars). The zones also read as a checklist: lake, cliff, terraces,
harbour, ruins, forest, meadow and train each exist, but nothing explains why they are where they are or how they relate.

The goal: **everything in the world exists for a reason, and the player can see that reason as they walk past.** Places
have an impact because their purpose is visible, not explained. The world should feel serious and rich, like a working
place with a past.

## The world (decided)
**Frame: one culture with a long past.** Today's villagers live on top of the stonework of the *first keepers*, who lived
here long before. The keepers left one recognisable motif: mossy, rounded stone with a carved spiral. It turns up at
every keeper site, so a player who notices it once starts finding it everywhere.

**Shape: the planet is one slope.** Keepers' Peak at the top (north pole), the village and fields across the middle, a new
small sea at the bottom (south cap). Water runs downhill through everything. Zones move; the terrain is rebuilt.
*(Settled in review:)* the companion map is one face of the sphere for readability; the regions spread around all 360°
of longitude, with forest, meadow and the two open plots filling between them. The sea covers roughly the cap south of
latitude -0.75; the coast railway runs just above it. The player can wade into the shallows; deeper water stops them
like the river does today.

**Four chains tie the regions together**, each something you can follow on foot:
- **Water:** spring on the Peak → Waterfall Cliff → channels across the Terraces, turning the water mill → river slows
  through the Village past her cottage → Lake over the sunken town → Harbour and the sea.
- **Harvest:** rice (Terraces, hulled at the water mill) and wheat (Meadow, ground at the windmills) → sacks at the
  village bakery and store → the coast railway → boats at the harbour. The same sacks appear at every stop.
- **Wind:** one shared wind direction across the planet. Meadow grass, flags, laundry and kites all lean with it; that is
  why the windmills are there.
- **The keepers:** stone circle on the Peak, torii footings at the giant tree, the drowned town in the lake, the
  sea-watch tower under the lighthouse, the bridge footings in the village, and Hoshino's museum in their last standing
  hall. Every keeper site is a dig spot; the museum keeps what you find.

**Ten regions.** Each has a reason to be there, things you notice walking by, and its own activity.

| # | Region | Why it's here | Signature activity | Today |
|---|---|---|---|---|
| 1 | Keepers' Peak | Highest point; the spring rises here; keeper stone circle with the village shrine built on it; a long stone stair visible from the village | Ring the shrine bell (small daily buff), fill a bottle at the spring, dig at the circle | New (today's shrine is a roadside one) |
| 2 | Waterfall Cliff | The spring drops off a cliff: start of the river | Stone and crystal, wade in the plunge pool, rope bridge to the clifftop picnic and chest | Exists; now fed from the Peak, and the creek leads to the Terraces |
| 3 | The Old Forest | Thickest around the giant camphor, which the keepers planted | Wood and mushrooms, night moss and fireflies, dig at the torii footings | Exists (camphor forest, giant tree) |
| 4 | Terraces and the Water Mill | The river is led across the slope so every step gets water; it turns a wheel that hulls the rice | Plant and harvest rice, pick tea, take sacks to the mill | Terraces exist; moved under the waterfall. Mill is new |
| 5 | The Village | Where the river slows and the land flattens, between fields and sea; everything passes through its square | Bakery and store, errands board, gifts, chat | Exists; gets a bakery and general store, a keeper-footed stone bridge |
| 6 | The Windy Meadow | The open, always-windy side of the planet; windmills grind its wheat | Shear sheep, pick flowers, fly a kite on windy days, take wheat to the mills | Meadow and mills exist; gains a wheat field and a visible wind direction |
| 7 | The Lake and the Sunken Town | The river pools before the sea; the lake rose over the keepers' town | Lake fishing (incl. the Lord of the Lake), row out to the drowned columns | Lake exists; the ruins move here, half-drowned |
| 8 | Harbour and Lighthouse | Where the river meets the sea; lighthouse on the keepers' sea-watch tower | Sea fishing, shells, load cargo | Exists; gains a real sea, stilt huts, keeper base |
| 9 | Coast Railway | Carries rice and flour to the harbour and people between village and sea | Train rides | Exists; the ring follows the coast, platform with goods |
| 10 | Hoshino's Museum | The last keeper hall still above the lake; Hoshino patched it up and moved in | Dig at the trench, sort finds, donate relics and rare fish | Museum exists beside today's ruins; moves to the lake shore, new exterior around the existing interior |

**Dig spots across all keeper sites** (Peak circle, torii footings, lake ruins, lighthouse base, bridge footings, museum
trench) replace today's five stones at the ruins. *(Builder's call, settled in review:)* one spot per site, six in all,
each diggable once a day (today: five); every spot draws from today's shared loot pool via `digFind(day, spot)`; the save
migration remaps the old five `dig.taken` keys to the new spot ids.

**One visual language**, taken from her cottage (see ART_DIRECTION.md "Her home, outside" and `src/props/items/exterior.js`):
- Trees are clusters of three to five soft balls with ink lines; cedars are stacked pillows, never cones.
- Buildings have big roofs, doors and windows on short, plump, bulging walls. No plain boxes.
- Stone is rounded and a little lumpy, with a highlight. Tiles, planks and stones wobble, seeded so they stay put.
- Warm ink outlines on everything; a tight palette per region.
- Fewer, richer props: one great tree beats five plain ones.

## Goals
1. The planet reshaped as one slope, Peak to sea, with a river that runs downhill from the spring to the sea.
2. All ten regions placed on it, each with its reason visible, its own activity and (for keeper sites) a dig spot.
3. The four chains readable on foot.
4. Every region moved to the chibi style.
5. The world is **built for expansion**: each region is a self-contained piece registered in one list; two open plots are
   reserved on the slope; doors to new spaces (like her house and the museum) remain the pattern for bigger additions
   (keeper tunnels, an island in the sea, a sky shrine).
6. The game stays playable after every round of work.

## Non-goals (this project)
- **The world reacting to the player over time** (villagers using the bridge you built, a path wearing into the grass,
  terraces turning gold after you help, keeper spirals glowing as you donate). Parked for later. Build each chain so it
  can gain states later, but add none now.
- New areas beyond the ten regions (tunnels, island, sky shrine). Only the room for them.
- Changes to recipes, items, fish tables or loot tables, beyond moving where they are found.
- Changes to her home's interior or the museum's interior.
- New characters. Villagers move with their regions and keep their looks.

## Anti-goals (would be a failure even if it works)
- A region that is only decoration, with no visible reason or nothing to do.
- A patchwork: regions that look like they belong to different games.
- A long stretch where the game is broken or unplayable.
- Breaking existing saves: lost decor, a garden in the wrong place, a player stuck in water.
- Blowing the draw-call budget (`tests/perf/budget.json`: desktop walk 500 calls, mobile walk 350, orbit 900 / 600).

## Constraints (found in the code)
- **Layout anchors.** Positions derive from a few anchors: `ZONES`, `TRAIN_LAT`, `height()`, `pathDir`, `streamDir`,
  `BRIDGES`, `JUMPS` (`src/world.js`) and `VILLAGE`, `HOUSES`, `MILLS`, `SPOTS`, `TRAIN_STOPS` (`src/world/village.js`).
  About 23 files read them, including `npc/routines.js`, `villagers.js`, `systems/train.js`, `art/train/*`,
  `minimap/Minimap.jsx`, `audio/zones.js`, `game/World.jsx`, `art/museum/Hoshino.jsx`, `pets/Dog.jsx`,
  `art/weather/puddles.js`, `art/season/*`, `edgeveg.jsx`, `riverProps.jsx`, `debug/Lineup.jsx`.
- **The stream is a closed loop** today (`streamDir` is latitude as a function of longitude), and bridges, jumps,
  `waterAt`, `streamNear` and fishing spots assume that. A river running Peak → sea is a different curve shape.
- **Her home** is `HOUSES[0]`; the yard (`src/home/yard.js`) and garden beds are relative to it. It must move as one piece.
- **Saves store absolute planet directions** for outdoor placed decor (`G.s.placed[].n`, `src/game/World.jsx`), and
  possibly other positions (player spot, pet spots). Moving the home needs a one-time save migration that rotates
  every home-relative saved direction from the old home frame to the new one.
- **Performance:** everything repeated is instanced or baked; distance culling and the planet-wide horizon cull stay.
  The perf budget views (`at=home|forest|village`, orbit) must keep working and stay under cap.
- Radius stays `R = 10.4`.

## Approaches considered
- **A. New terrain first, then one region at a time (chosen).** First reshape the planet and add the region list, moving
  every existing zone and system onto the new layout with today's props. Then, one region per round: chibi look, chain
  details, its activity and dig spot. Playable throughout, each round shippable and judged on its own, and the slope is
  validated early. Interim mix of chibi and low-poly regions (already true today).
- B. One full region at a time on the current planet, reshape at the end. Dropped: the water chain can't work until the
  terrain changes, and every region gets placed twice.
- C. Build the new planet alongside the old one behind a flag, switch when done. Dropped: nothing ships for a long time and
  two worlds have to be kept working.

**Safety step (chosen):** during phase 1 the old layout stays reachable with a URL setting (`?world=old`) until the new
terrain works end to end, then it is removed.

## Phases
**Phase 1: the new planet (one shippable round).**
- New `height()` for the slope: Peak at the north pole, sea at the south cap, terraces stepped under the waterfall, the
  lake basin, the meadow on the windward side, two reserved open plots.
- A downhill river from the Peak spring to the sea, replacing the closed-loop stream, with bridges, stepping stones,
  `waterAt` and fishing spots reworked for it. The sandy path re-routed to link the regions.
- A **region registry**: one list of regions, each owning its centre, radius, terrain stamp, props, activities, villager
  spots, audio zone, minimap label and dig spot. Existing zone code is moved behind it; consumers read regions from the
  registry instead of the scattered anchors.
- Every existing zone, villager route, train stop, station, the museum door, the dog, audio zones and the minimap moved to
  the new layout, with today's art.
- Her home and yard moved as one piece; the save migration for home-relative positions.
- `?world=old` kept until the round is done, then removed. It is a developer switch only: it always runs without loading
  or writing the save (like `nosave`), so the one-way migration never meets the old layout.

**Phases 2+: one region per round, in story order.** Keepers' Peak first (it anchors the water and keeper chains), then
the Lake and Hoshino's Museum, then the Village, then the rest (Waterfall, Terraces and mill, Meadow, Forest, Harbour
and sea, Railway). Each round: the chibi art pass, the visible chain details, its activity, its dig spot, its views
(`?view=zone&z=...`) and screenshots, and ART_DIRECTION.md / README / GAMEPLAY.md updated.

## Left to the builder
- Exact placement of regions and open plots on the slope, and exact terrain shapes, within the map in the visual companion.
- The river's curve and where bridges and stepping stones fall.
- The region registry's exact shape and how existing code moves behind it.
- The save version number and migration details.
- Per-round art details inside the style rules above.
