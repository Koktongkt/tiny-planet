# World Rework, Phase 1: The New Planet — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reshape the planet into one slope (Keepers' Peak at the north pole, a small sea at the south cap) with a river running downhill from the spring to the sea, put every region in one registry, and move every existing zone and system onto the new layout with today's art, keeping the game playable and saves intact.

**Architecture:** A data-only region registry (`src/world/regions.js`) becomes the single source of region centres, radii, dig sites and views; `ZONES` and the village anchors are derived from it, so the ~23 consumers keep their imports. The river becomes an open curve with its own module; `streamDir`/`streamNear`/`waterAt` keep their signatures as a compatibility layer. The old layout is frozen in `src/world/legacy.js` behind `?world=old` (dev only, never touches the save) until the new world is approved, then deleted.

**Tech Stack:** Vite + React 18, React Three Fiber / three.js, `node --test` unit tests (`tests/unit/*.test.mjs`), Playwright smoke tests, `tests/perf/budget.mjs`.

**Spec:** `docs/superpowers/specs/2026-11-24-world-rework-design.md` (visual companion: https://claude.ai/artifact/ALqrddXMWLe2zcLDeyGDFo)

## Global Constraints
- Planet radius stays `R = 10.4`.
- Phase 1 uses **today's art**; no new chibi models (those are phases 2+). New placements may reuse existing props (e.g. the roadside shrine moves to the Peak, the ruins move into the lake).
- No changes to recipes, items, fish tables or loot tables in phase 1 (the lean wheat/flour/rice-sack items arrive with their region rounds).
- Her home and yard move **as one piece**; no change to the yard's internal layout (`src/home/yard.js`) or any interior.
- Saves must survive: outdoor placed decor, garden beds and `dig.taken` stay correct after migration. `SAVE_VERSION` goes 7 → 8.
- `?world=old` is developer-only: it forces no-save behaviour (never loads or writes `localStorage`).
- Perf caps (`tests/perf/budget.json`) must hold: desktop walk 500 calls / 600k tris, orbit 900 / 900k; mobile walk 350 / 390k, orbit 600 / 500k.
- The perf/budget views `?at=home|forest|village` and `?view=orbit` must keep working.
- `npm run lint`, `npm run test:unit`, `npm run test:smoke` pass at the end of every task.

## Review Focus
1. **Arrivals on wet or steep ground:** spawn, `?at=` teleports, train arrivals, leaving the house or museum must land on dry, walkable ground. Test in Task 7 (`arrivals are dry`).
2. **Gather and fishing spots in the wrong water:** land spots must be dry, `water` spots must sit at a lake/harbour edge, none in the open sea. Test in Task 9 (`gather spots dry, fishing spots at shore`).
3. **Walkers crossing water:** path walkers must only cross the river on bridges and never enter the sea. Test in Task 5 (`path is dry except on bridges`).
4. **Old saves after the move:** placed decor keeps its offset from the house; garden beds and `dig.taken` unchanged. Tests in Task 10.
5. **The Peak is climbable:** the slope from the village to the Peak top must stay walkable (no wall the player can't climb). Test in Task 3 (`peak slope walkable`).

---

## Layout decisions (starting values; tune with screenshots, keep the tests green)

Angles are `(lat, lon, r)` in radians, as `Z()` in `src/world.js`. Water flows down this chain, lon roughly 0 → 1.6:

| id | lat | lon | r | notes |
|---|---|---|---|---|
| `peak` | 1.38 | 0.0 | 0.20 | highest point; spring on its rim toward `cliff` |
| `cliff` | 1.00 | 0.35 | 0.11 | mesa; waterfall on its downhill face |
| `terraces` | 0.72 | 0.75 | 0.18 | stepped, directly under the waterfall |
| `village` | 0.35 | 0.35 | 0.10 | square centre (`VILLAGE`); river passes its east side |
| `home` | 0.42 | 0.05 | — | her house (`HOUSES[0]`), west edge of the village, near the river |
| `lake` | -0.15 | 0.85 | 0.20 | basin |
| `ruins` | -0.12 | 0.75 | 0.08 | **inside** the lake's west half (half-drowned) |
| `museum` | 0.02 | 1.05 | 0.05 | on the lake shore (angular distance from lake centre in `[r, r + 0.1]`) |
| `harbour` | -0.72 | 1.60 | 0.20 | a bay straddling the coast |
| `forest` | 0.25 | 2.60 | 0.30 | |
| `giant` | 0.40 | 2.40 | 0.10 | inside `forest` |
| `meadow` | 0.30 | 4.60 | 0.30 | windward side |
| `mills` | 0.55 | 4.30 | 0.15 | inside `meadow` |
| open plot A | 0.00 | 3.60 | 0.15 | flat-ish, empty |
| open plot B | 0.55 | 5.60 | 0.15 | flat-ish, empty |

- `SEA_LAT = -0.78` (shoreline latitude). Sea surface `SEA_W = -0.2` (same level as `HARB_W`). Shallows: water depth < 0.12 is wadeable; deeper blocks like the river does.
- `TRAIN_LAT = -0.62` (coast railway, just above the shore). Stops keep their ids (`village`, `forest`; saves and UI key on them) at lon `1.25` and `2.60`. The rails cross the river once; add a plank trestle there.
- Dig sites, in this index order (so today's `dig.taken[0..4]` keys stay valid and only `5` is new): `0` Peak stone circle, `1` torii footings at `giant`, `2` lake ruins shore, `3` lighthouse base at `harbour`, `4` footings of `BRIDGES[0]`, `5` museum trench. `DIG_SPOTS = 6`.
- Phase 1's registry is **data only**. Render code stays in `zones.jsx` etc. reading `ZONES`/`Zc`; each region's code moves to `src/regions/<id>/` during its own region round.

---

### Task 1: Freeze the old layout behind `?world=old`

**Files:**
- Create: `src/world/flag.js`, `src/world/legacy.js`
- Modify: `src/world.js` (layout constants, `height`, `pathDir`, `streamDir` become a pick between legacy and new), `src/world/village.js`, `src/game/store.js:8`
- Test: `tests/unit/world-legacy.test.mjs`

**Interfaces:**
- Produces: `OLD_WORLD: boolean` (`src/world/flag.js`, true when `?world=old`; false in node). `src/world/legacy.js` exports today's values verbatim: `ZONES`, `TRAIN_LAT`, `LAKE_W`, `HARB_W`, `CLIFF_H`, `height(n)`, `pathDir(t)`, `streamDir(t)`, `VILLAGE`, `HOUSES`, `MILLS`, `SPOT_DIRS` (shrine, bus), `TRAIN_STOPS`, `LAMPS`, `SPAWN`.

- [ ] **Step 1: Write the failing test** — `legacy matches today's layout`: import `legacy.js`; assert `ZONES.lake` is `{lat:-0.55, lon:0.9, r:0.2}`, `TRAIN_LAT === -0.95`, `HOUSES.length === 11`, and `height(dir(1.05, 0.2))` equals the value printed by today's `height` for that point (capture it before editing, paste the literal into the test).
- [ ] **Step 2: Run** `node --test tests/unit/world-legacy.test.mjs` — Expected: FAIL (module missing).
- [ ] **Step 3: Implement** `flag.js` and `legacy.js` (copy the current code), then make `world.js`/`village.js` select `legacy` values when `OLD_WORLD`. In `store.js` treat `OLD_WORLD` like `nosave`.
- [ ] **Step 4: Run** unit + smoke tests — Expected: all PASS, game unchanged by default (new values not yet in).
- [ ] **Step 5: Commit** `World rework 1: freeze the old layout behind ?world=old`

### Task 2: Region registry

**Files:**
- Create: `src/world/regions.js`
- Modify: `src/world.js` (`ZONES` derived from the registry unless `OLD_WORLD`)
- Test: `tests/unit/world-regions.test.mjs`

**Interfaces:**
- Produces:
  - `REGIONS: Array<{ id, name, lat, lon, r, keeper: boolean, dig?: { lat, lon } }>` with ids `peak, cliff, terraces, village, lake, ruins, museum, harbour, forest, giant, meadow, mills`.
  - `region(id)`, which returns the same object shape as today's `Z()` (`{x,y,z,r,lat,lon}`).
  - `OPEN_PLOTS: Array<{lat, lon, r}>`, `HOME_DIR: {lat, lon}`, `SEA_LAT`, `SEA_W`, `TRAIN_LAT`, `TRAIN_STOP_LONS: {village, forest}`.
  - `DIG_SITES: Array<{ i, region, lat, lon }>`, length 6, in the index order above.
  - `ZONES` keeps its existing keys (lake, cliff, terraces, harbour, ruins, forest, giant, meadow, mills) and adds `peak` and `museum`.

- [ ] **Step 1: Write the failing tests**
  - `regions do not overlap`: every pair's angular distance is ≥ `r1 + r2`, except the nested pairs `giant⊂forest` and `mills⊂meadow` and the overlapping pair `ruins∩lake`.
  - `open plots are clear`: each plot is clear of every region, with a 0.03 margin.
  - `water chain runs downhill in latitude`: peak > cliff > terraces > village > lake > harbour.
  - `land above the sea`: every region except `harbour` has `lat - r > SEA_LAT`.
  - `museum sits on the lake shore`: its angular distance from the lake is in `[lake.r, lake.r + 0.1]`.
  - `six dig sites, each inside its region`.
- [ ] **Step 2: Run**: expect FAIL.
- [ ] **Step 3: Implement** `regions.js` with the table values above.
- [ ] **Step 4: Run** unit tests. Expect PASS. (The game now reads the new zone centres but the old terrain shape. Rendering looks wrong until Task 3, which is expected inside this branch.)
- [ ] **Step 5: Commit** `World rework 2: region registry`

### Task 3: The slope terrain

**Files:**
- Modify: `src/world.js` (`height(n)` when not `OLD_WORLD`; export `SEA_LAT`, `SEA_W` from the registry)
- Test: `tests/unit/world-terrain.test.mjs`

**Interfaces:**
- Consumes: `REGIONS`, `OPEN_PLOTS`, `SEA_LAT`, `SEA_W` (Task 2).
- Produces: the new `height(n)`. Its signature is unchanged.

**Terrain recipe** (the builder tunes the amplitudes):
- Base: today's low-frequency noise, scaled to 0.6×.
- A latitude ramp adds up to about +0.9 toward the north.
- A rounded Peak dome: +1.6 at the centre, using a smoothstep over 2.5×r.
- Cliff mesa: today's recipe.
- Terraces: today's stepped recipe, on top of the ramp.
- Lake basin: today's recipe.
- Harbour bay: today's recipe.
- Giant hill and meadow bumps: today's recipes.
- Open plots: blended toward a flat local value.
- South of `SEA_LAT`, the ground blends down to about `SEA_W - 0.4`.
- The shoreline is a smoothstep band 0.06 wide, so the shallows form a gentle shelf.

- [ ] **Step 1: Write the failing tests**
  - `peak is the highest point`: `height(peak centre)` is greater than the height at 2,000 seeded random directions.
  - `sea floor below the surface`: every sample with lat < `SEA_LAT - 0.08` has height < `SEA_W - 0.12`.
  - `shallows exist`: along at least 60% of longitudes, the band between `SEA_LAT` and `SEA_LAT - 0.04` has depth under 0.12.
  - `peak slope walkable`: along the great circle from `village` to `peak`, sampled every 0.1 world units, no rise is steeper than 1.1 (rise over run), except within the stair corridor (the Peak's first 0.04 rad toward `village`, where a stair goes in Task 7).
  - `open plots flat`: the height range inside each plot is under 0.15.
- [ ] **Step 2: Run**: expect FAIL.
- [ ] **Step 3: Implement** the recipe.
- [ ] **Step 4: Run** the unit tests, then `?view=orbit&t=day` and `?view=detail` screenshots using `shoot.mjs`. Expect the tests to PASS and the slope to read clearly from orbit.
- [ ] **Step 5: Commit** `World rework 3: slope terrain (peak to sea)`

### Task 4: The downhill river

**Files:**
- Create: `src/world/river.js`
- Modify: `src/world.js` (`streamDir`, `streamNear`, `streamHalf`, `waterAt`, `JUMPS`, `streamDist` and `window.__river` delegate to `river.js` when not `OLD_WORLD`)
- Test: `tests/unit/world-river.test.mjs`

**Interfaces:**
- Consumes: `region()`, `SEA_LAT`, `SEA_W`, and the new `height`.
- Produces:
  - `RIVER_PTS`: control points as `{lat, lon}`. They run through: the spring on the `peak` rim, the `cliff` top and foot, across `terraces`, the east side of `village` and near `HOME_DIR`, into `lake`, then out to `harbour` and past `SEA_LAT`.
  - `riverDir(u)` for `u ∈ [0,1]`, a smooth spherical Catmull-Rom curve.
  - `riverNear(n, out)`, returning `{ d, u, half, side }` (world units). It uses precomputed samples (around 600) with a coarse bucket grid, so it is no slower than today's `streamNear`.
  - `riverHalf(u)`: narrower near the spring (0.6×), today's `RIVER_HALF` mid-river, 1.4× at the mouth.
- Compatibility:
  - `streamDir(t) = riverDir(t / 2π)`, so callers that sample `t ∈ [0, 2π)` cover the river exactly once.
  - `streamNear` returns `{ d, t: u * 2π, half, side }`.
  - `waterAt(n, margin)` is true in these cases:
    - on the river, off a bridge deck
    - in the lake or harbour below their water level (as today)
    - in the sea, where depth is greater than 0.12 (the shallows are walkable)
  - `JUMPS`: 4 stepping-stone sites. Same rule as today (keep away from the lake, harbour and forest), plus none on the waterfall face.

- [ ] **Step 1: Write the failing tests**
  - `river starts at the spring and ends in the sea`: `riverDir(0)` is within `peak.r + 0.04` of the Peak, and `riverDir(1).lat < SEA_LAT`.
  - `river flows downhill`: sample 400 points. `height` never rises by more than 0.03 between neighbouring samples, except inside the lake and harbour basins (their water level is flat).
  - `river visits the chain`: the curve passes within `r` of `cliff`, `terraces`, `lake` and `harbour`, and within 0.12 of `village`.
  - `near is exact on the curve`: `riverNear(riverDir(u)).d < 0.01` for 50 values of u.
  - `water rules`:
    - `waterAt(lake centre)` is true
    - `waterAt(sea point at SEA_LAT - 0.2)` is true
    - `waterAt(shoreline shallows)` is false
    - `waterAt(village centre)` is false
  - `compat`: `streamDir(0)` equals `riverDir(0)`, and `streamNear(...).t` is in `[0, 2π]`.
- [ ] **Step 2: Run**: expect FAIL.
- [ ] **Step 3: Implement**.
- [ ] **Step 4: Run** the unit tests, the river and stream consumers' tests, and the smoke tests. Expect PASS.
- [ ] **Step 5: Commit** `World rework 4: downhill river`

### Task 5: Path and bridges

**Files:**
- Modify: `src/world.js` (`pathDir`, `BRIDGES`, bridge-span code at lines ~127-132)
- Test: `tests/unit/world-path.test.mjs`

**Interfaces:**
- Produces:
  - `pathDir(t)`, still a closed loop with `t ∈ [0, 2π)` and the same signature. It is now defined by periodic control points that pass:
    - the `village` square
    - the foot of `terraces`
    - the `lake` shore by the `museum`
    - the `forest` edge by the `giant`
    - the open plot A edge
    - the `meadow` by the `mills`
    - near `HOME_DIR`
  - `BRIDGES`: found by intersecting the path polyline with the river polyline (great-circle segment tests), sorted by distance to `village`. Each item keeps today's shape `{ c, tan, side, t, L }`.

- [ ] **Step 1: Write the failing tests**
  - `at least two bridges`.
  - `every bridge sits on the river`: `riverNear(b.c).d < riverHalf(...)`.
  - `path is dry except on bridges`: for 1,000 samples, `waterAt(sample)` is false unless the sample is within `b.L` of some bridge.
  - `path never enters the sea`.
- [ ] **Step 2: Run**: expect FAIL.
- [ ] **Step 3: Implement**.
- [ ] **Step 4: Run** the unit tests and smoke tests. Expect PASS.
- [ ] **Step 5: Commit** `World rework 5: path and bridges`

### Task 6: The sea

**Files:**
- Modify: `src/zones.jsx` (a `Sea` component: a sphere cap at radius `R + SEA_W` south of about `SEA_LAT + 0.02`, using the harbour water material, plus foam at the shoreline), `src/minimap/Minimap.jsx` (draw the sea cap and the Peak; the river is drawn as an open curve, not a closed loop), `src/App.jsx` (the "too wide to jump" toast also covers deep sea)
- Test: `tests/unit/world-sea.test.mjs`

**Interfaces:**
- Consumes: `SEA_LAT`, `SEA_W`, `waterAt`.
- Produces: `<Sea />`, mounted with the other zones. It is part of the horizon cull, like the lake.

- [ ] **Step 1: Write the failing test** `sea depth helper`: export `seaDepth(n)` from `world.js`. It returns `SEA_W - height(n)` (0 on land). Assert that it is positive below `SEA_LAT - 0.08` and 0 at `village`.
- [ ] **Step 2: Run**: expect FAIL.
- [ ] **Step 3: Implement** `seaDepth`, `<Sea />` and the minimap changes.
- [ ] **Step 4: Run** the unit tests, smoke tests, `?view=orbit` screenshot and the perf budget. Expect PASS, a visible sea in orbit view, and the orbit view still under its caps.
- [ ] **Step 5: Commit** `World rework 6: the sea`

### Task 7: Village, home and hand-placed spots

**Files:**
- Modify:
  - `src/world/village.js`:
    - `VILLAGE` = `region('village')`
    - `HOUSES` stays 11 entries:
      - `[0]` = `HOME_DIR`
      - `[1..4]` around the village square
      - `[5..6]` near `terraces` (farmers)
      - `[7..8]` near `harbour` (fishers)
      - `[9..10]` near `forest`
      
      Mailboxes use indices 0, 1, 3 and 4, so those four stay village houses.
    - `MILLS` = two directions inside `mills`
    - `SPOTS.shrine` = the Peak top
    - `SPOTS.bus` = by the square
    - `TRAIN_STOPS` lons from `TRAIN_STOP_LONS`
  - `src/App.jsx`:
    - the player spawn `P.n` (line ~415) moves to just outside her gate, at `onHouse(0, 0, YARD.outZ + 0.6)`
    - the lamps list (line ~602) is rebuilt along the new path near the square, the home and the museum
    - `ZVIEWS` (lines ~514-524) gets new camera targets from the registry, plus new views `peak` and `lake-museum`
  - `src/world/sky.jsx:85` (`HAM`): the farmers' hamlet moves to near `terraces`
  - A stone stair (reusing the river stepping-stone or step geometry) runs up the Peak's stair corridor toward the shrine.
- Test: `tests/unit/world-village.test.mjs`

**Interfaces:**
- Consumes: the registry, `waterAt`, `seaDepth`, `height`.
- Produces: the same exports `village.js` has today, with the same names and shapes.

- [ ] **Step 1: Write the failing tests**
  - `houses on dry land and apart`: no house in water, and every pair is at least 0.14·K apart.
  - `home by the river`: `riverNear(HOUSES[0]).d` is between 1.5 and 4 world units. The house itself stays dry, with its yard radius (2.6 world units) clear of water.
  - `arrivals are dry`: the spawn point, each `?at=` target (`home`, `forest`, `village`), each train stop platform and the museum door point all satisfy `!waterAt(n)` and `seaDepth(n) === 0`.
- [ ] **Step 2: Run**: expect FAIL.
- [ ] **Step 3: Implement**.
- [ ] **Step 4: Run** the unit tests, smoke tests, and screenshots of every `ZVIEWS` view plus `?view=zone&z=home|home-garden|home-yard`. Expect PASS, and the home and yard looking identical to today, just in the new place.
- [ ] **Step 5: Commit** `World rework 7: village, home and spots on the new layout`

### Task 8: Zones and the railway on the new layout

**Files:**
- Modify:
  - `src/zones.jsx`:
    - the ruins props sit inside the lake (columns rise from the lakebed, with tops above `LAKE_W`)
    - the train ring follows `TRAIN_LAT`
    - add a plank trestle where the rails cross the river
    - harbour props (pier, lighthouse, houses) face the sea
  - `src/art/train/station.js` and `src/art/train/Stations.jsx`: platform placement on the new ring
  - `src/systems/liveC.js`: the `STOP_NAME` display strings stay
- Test: update `tests/unit/stagec-art-train.test.mjs` to the new ring. Add `rails cross the river once on a trestle`.

**Interfaces:**
- Consumes: `TRAIN_LAT`, `TRAIN_STOPS`, `riverNear`, `region()`.

- [ ] **Step 1: Write and update the failing tests**:
  - `rails cross the river once`: exactly one rail sample run where `riverNear(...).d < half`. The trestle is centred there.
  - `stations on dry ground`.
- [ ] **Step 2: Run**: expect FAIL.
- [ ] **Step 3: Implement**.
- [ ] **Step 4: Run** the unit tests, smoke tests (`stagec.spec.js` covers train rides), and screenshots of the new `lake-museum`, `harbour-ruins` and `terraces-train` views. Expect PASS.
- [ ] **Step 5: Commit** `World rework 8: zones and railway on the new layout`

### Task 9: Museum, dig sites, gather spots, villagers and audio

**Files:**
- Modify:
  - `src/systems/WorldC.jsx`:
    - `digs` comes from `DIG_SITES` (6), each with its position and an index `i`
    - the museum door is at `region('museum')` (the side facing the path), replacing `around(ruins, …)`
  - `src/systems/collection.js`: `DIG_SPOTS = 6`. `digFind` is unchanged.
  - `src/game/World.jsx`: the `layout()` blocked test also rejects `seaDepth(n) > 0`
  - `src/npc/routines.js`: the ruins visitor now looks at the lake ruins from the shore
  - `src/audio/zones.js`: add `peak` (wind and birds) and `sea` (surf), reusing existing layers
  - `src/pets/Dog.jsx` and `src/art/season/anchor.js`: verify only. They read `Zc`/`streamNear`; fix any hard-coded angle you find.
- Test: `tests/unit/world-sites.test.mjs`

**Interfaces:**
- Consumes: `DIG_SITES`, `region()`, `seaDepth`, `waterAt`.

- [ ] **Step 1: Write the failing tests**
  - `six dig spots`: `DIG_SPOTS === 6`, and `canDig` / `dig` work for spot 5.
  - `gather spots dry, fishing spots at shore`: run `layout()` with the real `blocked`. For every non-`water` spot, `!waterAt(n)` and `seaDepth(n) === 0`. For every `water` spot, its `stand` point is dry and within 0.5 world units of lake or harbour water, and not in the open sea.
- [ ] **Step 2: Run**: expect FAIL.
- [ ] **Step 3: Implement**.
- [ ] **Step 4: Run** the unit tests and smoke tests (`stagec.spec.js`: dig, museum, fishing; `game.spec.js`: gathering). Expect PASS.
- [ ] **Step 5: Commit** `World rework 9: museum, dig sites and gatherables on the new layout`

### Task 10: Save migration v8 (the home moves)

**Files:**
- Create: `src/save/homeMove.js`
- Modify: `src/save/schema.js` (`SAVE_VERSION = 8`; `MIGRATIONS` gets `{ from: 7, up }`)
- Test: `tests/unit/save-home-move.test.mjs`. Update `tests/unit/save.test.mjs` for v8.

**Interfaces:**
- Produces: `moveHomeRel(n: [x,y,z], oldHome: {lat,lon,spin}, newHome: {lat,lon,spin}) -> [x,y,z]`.
  - Rotate by `qNew · qOld⁻¹`, where `q = fromUnitVectors(UP, homeDir) · axisAngle(UP, spin)`. This is the same frame `place()` builds.
  - The old home is `{ lat: 0.9, lon: -0.15, spin: 0 }`. The new home is `HOME_DIR` with spin 0.
- The migration applies `moveHomeRel` to every `placed[]` entry without `in` (outdoor decor). Entries with `in` (indoor) are untouched.
- Garden plots and `dig.taken` are untouched. Garden plots are indexed, and the dig indices are kept by design.

- [ ] **Step 1: Write the failing tests**
  - `decor keeps its offset from the house`: build an old-home-relative point at the local offset (0.6, 0, 0.4). After migration, its local offset in the new home frame equals (0.6, 0, 0.4) within 1e-6.
  - `indoor decor untouched`.
  - `v7 save migrates to v8 with garden and dig.taken unchanged`.
  - `v8 save unchanged`.
- [ ] **Step 2: Audit**: `grep -rn "toArray()" src/game src/systems src/pets src/home` finds every saved direction. Each one that is home-relative goes into the migration. List any others in the commit message.
- [ ] **Step 3: Run**: expect FAIL.
- [ ] **Step 4: Implement**.
- [ ] **Step 5: Run** unit tests and smoke tests. Expect PASS.
- [ ] **Step 6: Commit** `World rework 10: save v8 moves home-relative positions with her house`

### Task 11: Verify, document, screenshot

**Files:**
- Modify:
  - `README.md` (World section and `?view=` list: add `peak`, `lake-museum` and the `?world=old` dev note)
  - `ART_DIRECTION.md` (replace the "Planet layout" section with the slope, regions, river and sea; link the spec)
  - `GAMEPLAY.md` (dig spots now at six keeper sites; the museum is on the lake shore)
  - `screenshots/` (new orbit day, dusk and night shots and every zone view)
- Test: no new tests.

- [ ] **Step 1: Run** `npm run lint && npm run test:unit && npm run test:smoke && npm run perf:budget`. Expect all PASS and every view under its caps.
- [ ] **Step 2: Shoot**: `?view=orbit&t=day|dusk|night` plus every zone view. Compare each against the same view with `?world=old`.
- [ ] **Step 3: Update the docs**.
- [ ] **Step 4: Commit and push** `World rework 11: docs and screenshots for the new planet`, then share the screenshots with your human partner for review.

### Task 12: Remove `?world=old` (only after your human partner approves the new world)

**Files:**
- Delete: `src/world/legacy.js`, `src/world/flag.js`, `tests/unit/world-legacy.test.mjs`
- Modify: every `OLD_WORLD` branch (`grep -rn OLD_WORLD src`), `src/game/store.js`, `README.md`

- [ ] **Step 1: Remove** the flag and the legacy branches.
- [ ] **Step 2: Run** `grep -rn "OLD_WORLD\|legacy.js" src tests`. Expect no matches. Then run lint, unit, smoke and perf. Expect PASS.
- [ ] **Step 3: Commit** `World rework 12: remove the old layout`
