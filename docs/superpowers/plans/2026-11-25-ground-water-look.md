# Ground and Water Look A Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the planet's ground, banks and water the "clay diorama" look (A): soft warm ground, carved rounded banks with a soil band, outlined foam beads, and shallow-to-deep water, matching her house set.

**Architecture:** Pure, node-testable builders in `src/world/` produce geometry (shorelines, the ground mesh with a finer band near water, shore-kit meshes, a distance-to-shore attribute for water). Thin React components in `src/world/` and the existing `Ground` / `WaterCap` / `Sea` / `Stream` render them. One runtime setting, `SHORE_FINE` (`?shore=coarse` turns it off), picks carved banks or the drawn-on fallback. `?world=old` keeps today's code paths untouched.

**Tech Stack:** three.js 0.169, React Three Fiber, Vite, `node --test` unit tests, Playwright smoke and perf scripts.

**Spec:** `docs/superpowers/specs/2026-11-25-ground-water-look-design.md`

## Global Constraints

- Gameplay terrain is unchanged: `height`, `waterAt`, `seaDepth`, `streamNear` in `src/world.js` keep their outputs. Visual-only offsets live in the new builders.
- `?world=old` renders exactly as before (legacy `Ground`, `Stream`, `WaterCap`, `Sea`): every new path is gated on `!OLD_WORLD`.
- Perf caps from `tests/perf/budget.json` on main: phone 350 calls / 1.0M tris walking, 600 / 1.0M planet; desktop 500 / 1.3M walking, 900 / 1.1M planet. New draw calls ≤ 10 in any view; new triangles ≤ 250k in any walking view with `SHORE_FINE` on.
- Palette: sunny `#b8dc62`, grass `#82c34a`, shade `#5aa26a`, soil `#d08f55`, soil shadow `#a8673a`, cove sand `#e9d9b0`, foam `#fffaf0`, deep `#2f8fd0`, mid `#4fb6e2`, shallows `#86e2dc`, ink `PAL.ink` from `src/props/kit.js`.
- Ground and shore pieces use the props' warm toon ramp `RAMP` (`src/props/kit.js`); outlines use `mkOutline` from the same file or the ground's existing `inkRim`.
- Lip: about 0.03 high, sits at the visible waterline, outside walkable ground; nothing is re-placed onto visual height.
- Cliff and peak rock (where `rockify` paints rock) keep faceted shading.
- Sea coast: cake bank everywhere except 3–5 sandy coves, each ≥ 0.6 world units from the railway (`railOff`).
- Commits end with the session's attribution lines; push to `claude/determined-edison-rkfstm` only.

## Review Focus

1. **Startup time:** building the finer ground and the shore kit runs at load on phones. Expect the whole build ≤ 400 ms in node on this machine (Task 3 and Task 4 tests time it).
2. **Bridges, piers, dock, stepping stones and the waterfall foot:** no lip, soil or bead may stand on a bridge deck, pier, dock or jump stone (Task 4 test).
3. **Gameplay drift:** the visible rim must stay within 0.05 world units of where gameplay water begins, so wading, fishing stands and dig sites still look right (Task 3 test).
4. **Seams:** where the fine band meets the coarse ground there must be no crack (Task 3 manifold test: every edge shared by exactly two triangles).
5. **Night and dusk water:** the new water material must keep the `uN` / `uD` tints (Task 5 test checks the uniforms exist and are driven).

---

## File Structure

- Create `src/world/shoreSetting.js`: `SHORE_FINE` from the URL. Tiny, imported everywhere.
- Create `src/world/shore.js`: shoreline runs, coves, `shoreDist`. Pure.
- Create `src/world/groundGeo.js`: the ground mesh builder (weld, palette, fine band, bank profile). Pure.
- Create `src/world/shoreKit.js`: lip, soil ribbon, foam beads, ink waterline geometry. Pure.
- Create `src/world/ShoreKit.jsx`: renders the kit with materials.
- Create `src/world/waterLook.js`: the shared water material and the `aShore` bake. Browser-only material; pure bake.
- Modify `src/App.jsx` (`Ground`), `src/zones.jsx` (`WaterCap`, `Sea`, `zoneColour` retune, lily pads), `src/riverProps.jsx` (`Stream`), `tests/perf/budget.mjs` (`--shore`).
- Tests: `tests/unit/shore.test.mjs`, `tests/unit/ground-geo.test.mjs`, `tests/unit/shore-kit.test.mjs`, `tests/unit/water-look.test.mjs`.

---

### Task 1: Shorelines, coves and the setting

**Files:**
- Create: `src/world/shoreSetting.js`, `src/world/shore.js`
- Test: `tests/unit/shore.test.mjs`

**Interfaces:**
- Produces:
  - `SHORE_FINE: boolean`: `false` when `OLD_WORLD` or the URL has `shore=coarse`, else `true`. Node (no `location`) → `true`.
  - `SHORE_RUNS: Run[]` where `Run = { kind: 'river'|'lake'|'pool'|'harbour'|'sea', closed: boolean, pts: { n: Vector3 (unit), level: number (water surface, as offset from R), out: Vector3 (unit, tangent to sphere, pointing to land) }[] }`. Point spacing ≤ 0.05 world units.
  - `COVES: { n: Vector3, r: number (radians) }[]`, 3–5 entries on the sea coast.
  - `inCove(n: Vector3) => boolean`
  - `shoreDist(n: Vector3) => number`: world units to the nearest shoreline point, negative on the water side. Bucket grid like `riverNear`.
  - `visualGround(n: Vector3) => number`: the drawn ground height before bank shaping: `height(n)` minus today's river carve (`gap < 0.04 ? 0.03 + 0.11 * ss(0.04, -0.3, gap) : 0`, moved here from `Ground()`).

How runs are traced: river edges are `streamDir(t)` offset by `±streamHalf(t)` (drop points inside the lake, pool, harbour or sea caps); lake, harbour and pool by marching outward from the zone centre (`ZONES.lake`, `ZONES.harbour`, `WATERFALL.foot` with `poolR`) on 360 bearings until `visualGround(n) > level`; sea by marching north from the south pole on 1440 longitudes until `visualGround(n) > SEA_W`. Then resample to ≤ 0.05 spacing.

- [ ] **Step 1: Write the failing tests**
  - `runs cover every water body`: `SHORE_RUNS` has kinds river (≥ 2 runs), lake, pool, harbour, sea; lake, pool and sea runs are closed.
  - `points sit on the waterline`: for every point, `Math.abs(visualGround(p.n) - p.level) < 0.03`, and `waterAt(around(p.n, 0.15 / R, bearingOf(p.out) + Math.PI))` is true for lake/harbour/river points.
  - `spacing`: consecutive points ≤ 0.05 world units apart.
  - `coves`: `3 <= COVES.length <= 5`; each cove centre within 0.05 world units of a sea run point; `Math.abs(railOff(c.n)) * R >= 0.6`.
  - `shoreDist sign`: negative at `ZONES.lake` centre, positive at `VILLAGE`, `|shoreDist(p.n)| < 0.03` for sampled run points.
  - `setting`: `SHORE_FINE === true` in node.
- [ ] **Step 2: Run** `node --test tests/unit/shore.test.mjs`. Expected: FAIL, module not found.
- [ ] **Step 3: Implement** `src/world/shoreSetting.js` and `src/world/shore.js` with the interfaces above.
- [ ] **Step 4: Run** `node --test tests/unit/shore.test.mjs` then `npm run -s test:unit`. Expected: PASS, whole suite green.
- [ ] **Step 5: Commit** `Ground look 1: shorelines, coves and the shore setting`.

### Task 2: Ground builder, smooth and warm

**Files:**
- Create: `src/world/groundGeo.js`
- Modify: `src/App.jsx` (`Ground()` uses the builder when `!OLD_WORLD`), `src/zones.jsx` (`zoneColour` tints retuned onto the warm grass)
- Test: `tests/unit/ground-geo.test.mjs`

**Interfaces:**
- Consumes: `visualGround`, `SHORE_RUNS` from Task 1.
- Produces: `buildGround({ fine: boolean, paint: (v: Vector3, c: Color) => void, isRock: (v: Vector3, normal: Vector3) => boolean }) => BufferGeometry`. Indexed; attributes `position`, `normal`, `color`. `paint` applies the existing per-point rules (path sand, worn ground, `zoneColour`, river bank/mud); `isRock` marks rock (from `rockify`'s rule) whose triangles keep flat normals. In this task `fine` is accepted and ignored.
  - `grassColour(v: Vector3, out: Color) => Color`: the warm palette by height and slow noise (spike `looks-spike/looks.js` is the reference).

- [ ] **Step 1: Write the failing tests**
  - `welded`: geometry is indexed; no two vertices closer than 1e-5.
  - `smooth on grass`: for 500 random grass vertices, the angle between the vertex normal and the mean of its adjacent face normals is < 0.05 rad.
  - `rock stays faceted`: with `isRock = () => true`, normals equal their face normals.
  - `palette`: `grassColour` at the highest non-rock point is closer to `#b8dc62` than to `#5aa26a`, and at a hollow the reverse.
  - `same shape`: for 500 random vertices, `|radius - (R + visualGround(n))| < 1e-4` (fine off).
- [ ] **Step 2: Run** `node --test tests/unit/ground-geo.test.mjs`. Expected: FAIL.
- [ ] **Step 3: Implement** `buildGround` and `grassColour`; switch `Ground()` to it (material: toon `RAMP` with vertex colours, keep `inkRim`); move the river-carve formula to `visualGround`; retune `zoneColour` tints to blend onto the warm grass.
- [ ] **Step 4: Run** unit tests; build; shoot `?view=zone&z=home`, `square`, `lake-museum` (dev server 5190, `shoot.mjs --custom` into `.superpowers/` shots). Expected: PASS; no facets on grass; warm greens next to the cottage.
- [ ] **Step 5: Commit** `Ground look 2: smooth warm ground`.

### Task 3: The fine band and carved banks

**Files:**
- Modify: `src/world/groundGeo.js`
- Test: `tests/unit/ground-geo.test.mjs`

**Interfaces:**
- Consumes: `shoreDist`, `inCove`, `SHORE_RUNS`.
- Produces: `buildGround({ fine: true, ... })` subdivides near water and shapes banks. `bankOffset(w: number, cove: boolean) => number`: visual height offset at signed shore distance `w` (world units): 0 for `w > 0.12`; a rounded rise peaking ~+0.03 at `w ≈ 0.05`; a steep rounded drop to about `-0.10` by `w ≈ -0.03`; for coves a gentle slope instead (no rise). `bankIsSoil(w: number, cove: boolean) => boolean` for the soil colour band.

Subdivision (not determined by the tests): two passes. In each pass split an edge when its midpoint has `|shoreDist| < 0.6` and its length > 0.05; decide per edge (a shared map keyed by the two vertex indices) so both triangles agree; re-triangulate each triangle by how many of its edges split (0, 1, 2 or 3) with the standard templates. New vertices are projected to `R + visualGround(n) + bankOffset(...)`.

- [ ] **Step 1: Write the failing tests**
  - `no cracks`: in the fine mesh every edge is used by exactly two triangles.
  - `fine near water`: every triangle with a vertex where `|shoreDist| < 0.3` has all edges ≤ 0.06.
  - `coarse away`: triangle count with `fine: true` minus with `fine: false` is ≤ 250000.
  - `rim on the waterline`: for each run point, the drawn surface along `p.out` crosses `p.level` within 0.05 world units of `p.n`.
  - `soil band`: vertices with `bankIsSoil` get a colour within the soil range; none in coves.
  - `build time`: `buildGround({ fine: true })` completes in < 400 ms (median of 3).
- [ ] **Step 2: Run** `node --test tests/unit/ground-geo.test.mjs`. Expected: FAIL on the new tests.
- [ ] **Step 3: Implement** the subdivision, `bankOffset`, `bankIsSoil`; `Ground()` passes `fine: SHORE_FINE`.
- [ ] **Step 4: Run** unit tests; shoot `zones-lake-waterfall`, `harbour-villagers`, `lake-museum` with and without `&shore=coarse`. Expected: PASS; carved rounded banks with soil showing; no seams.
- [ ] **Step 5: Commit** `Ground look 3: finer band and carved banks`.

### Task 4: Shore kit

**Files:**
- Create: `src/world/shoreKit.js`, `src/world/ShoreKit.jsx`
- Modify: `src/App.jsx` (mount `<ShoreKit />` inside `Planet` when `!OLD_WORLD`)
- Test: `tests/unit/shore-kit.test.mjs`

**Interfaces:**
- Consumes: `SHORE_RUNS`, `COVES`, `inCove`, `SHORE_FINE`, `bankOffset`.
- Produces: `buildShoreKit({ fine: boolean }) => { lip: BufferGeometry, soil: BufferGeometry|null, beads: BufferGeometry, ink: BufferGeometry }`, each one merged geometry. Lip: tube radius ~0.03 on the rim (on the carved lip when fine, at the waterline offset when coarse), none in coves or where `kind === 'harbour'` meets a pier. Soil: ribbon from rim to `level - 0.04`, only when `fine` is false. Beads: flattened spheres (8×6 segments) every ~0.075 along the waterline, radius 0.038–0.058 seeded per index. Ink: thin ribbon at the waterline.
  - `<ShoreKit />`: 4 meshes (lip toon, soil toon, beads toon + one outline hull, ink basic) → ≤ 5 draw calls.

- [ ] **Step 1: Write the failing tests**
  - `merged`: each of `lip`, `beads`, `ink` is a single geometry; `soil` is null when `fine` is true.
  - `budget`: total triangles of all parts ≤ 150000 (×2 for the beads' outline still ≤ 250000 with Task 3's band).
  - `coves bare`: no lip vertex within a cove; beads still present in coves.
  - `clear of structures`: no lip, soil or bead vertex where `onBridgeDeck(n)` or within 0.15 world units of a pier (`PIERS`), the lake dock (`LAKE_DOCK_B`) or a `JUMPS` stone.
  - `build time`: `buildShoreKit({ fine: true })` < 200 ms.
- [ ] **Step 2: Run** `node --test tests/unit/shore-kit.test.mjs`. Expected: FAIL.
- [ ] **Step 3: Implement** `buildShoreKit` and `<ShoreKit />` (materials: toon `RAMP`, `mkOutline(0.011, PAL.ink)` for beads and lip).
- [ ] **Step 4: Run** unit tests; shoot the zone views with and without `&shore=coarse`. Expected: PASS; outlined beads and lip on every shore; coves sandy.
- [ ] **Step 5: Commit** `Ground look 4: shore kit (lip, soil, foam beads, ink waterline)`.

### Task 5: Water look

**Files:**
- Create: `src/world/waterLook.js`
- Modify: `src/zones.jsx` (`WaterCap`, `Sea`, lily pads on the lake), `src/riverProps.jsx` (`Stream` flow marks and colours)
- Test: `tests/unit/water-look.test.mjs`

**Interfaces:**
- Consumes: `shoreDist`.
- Produces:
  - `bakeShore(geo: BufferGeometry, toWorldDir: (i: number) => Vector3) => BufferGeometry`: adds attribute `aShore` (float, `-shoreDist`, clamped 0–1.5 world units).
  - `shoreWater({ flow: boolean }) => ShaderMaterial` with uniforms `uTime`, `uN`, `uD`: colour `shallows #86e2dc → mid #4fb6e2 → deep #2f8fd0` by `aShore` (0 → 0.25 → 0.6+); `flow: false` draws slow ripple rings; `flow: true` (river) draws white flow marks moving along the ribbon's `uv.y`. Dusk and night tints as today's `waterMaterial`.
  - Lily pads: 5–8 instanced pads with pink flowers on the lake, ink outlined (1–2 draw calls).
- [ ] **Step 1: Write the failing tests**
  - `aShore`: after `bakeShore` on a lake cap, the attribute exists; values near the centre > 0.5 and near the rim < 0.08.
  - `uniforms`: `shoreWater({ flow: true })` and `({ flow: false })` both have `uTime`, `uN`, `uD` (run with a stub `ShaderMaterial` if needed in node).
  - `pads on water`: every lily pad position has `waterAt` true and `shoreDist < -0.1`.
- [ ] **Step 2: Run** `node --test tests/unit/water-look.test.mjs`. Expected: FAIL.
- [ ] **Step 3: Implement**; swap `WaterCap`, `Sea` and `Stream` to the new material when `!OLD_WORLD`; shrink sea whitecaps.
- [ ] **Step 4: Run** unit tests; shoot zone views at `t=day|dusk|night`. Expected: PASS; turquoise shallows, rings, flow marks; dusk/night tinted.
- [ ] **Step 5: Commit** `Ground look 5: shared water look, ripples, flow, lily pads`.

### Task 6: Measure, document, screenshot

**Files:**
- Modify: `tests/perf/budget.mjs` (`--shore coarse` appends `&shore=coarse` to every view URL), `ART_DIRECTION.md` (a "Ground and water" section replacing the ground/lawn shading notes; link the spec), `screenshots/` (orbit day/dusk/night and every zone view, re-shot).
- Test: no new unit tests.

- [ ] **Step 1: Run** `npm run -s lint && npm run -s test:unit`. Expected: 0 errors, all pass.
- [ ] **Step 2: Run** targeted smoke specs: `PW_CHROMIUM=/opt/pw-browsers/chromium npx playwright test tests/smoke/game.spec.js tests/smoke/stagec.spec.js --trace off`. Expected: only failures already failing on main.
- [ ] **Step 3: Run** perf twice: `node tests/perf/budget.mjs` and `node tests/perf/budget.mjs --shore coarse` (preview on 4173, `PW_CHROMIUM` set), and once on main's build for the before numbers. Expected: every view under main's caps; new calls ≤ 10, new tris ≤ 250k per walking view. Record the three tables in the ledger.
- [ ] **Step 4: Shoot** screenshots and a side-by-side of `home`, `lake-museum`, `village-square`, `zones-lake-waterfall` with `shore=coarse` vs default for the partner.
- [ ] **Step 5: Commit and push** `Ground look 6: perf, docs and screenshots`, then share the side-by-side with the partner and ask whether to keep the fine band everywhere, desktop only, or off.
