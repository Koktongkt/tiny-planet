# Her house, part A Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** She walks to indoor activities, glances at Mochi, the window and the stove, and has indoor idle moments, including one short walk to a nearby spot.

**Architecture:** A pure, dependency-free module `src/home/homeLife.js` holds the decisions (walk stepping, stuck detection,
idle director, glance picker, spot choice) and is unit-tested. `Activities.jsx` wires it to the room: it builds the
spots from `SPOTS`/`LAYOUT`, runs the walk and idle director in its frame loop, registers the idle poses, and supplies
the glance target to her life layer. `Room.jsx` cancels idle acts on input. `life.js` reads three small window hooks.

**Tech Stack:** React Three Fiber, three.js, node:test, Playwright smoke.

**Spec:** `docs/superpowers/specs/2026-11-24-home-alive-a-design.md`

## Global Constraints
- Any key, stick or tap cancels an idle walk or idle pose at once.
- One idle walk per idle stretch, range ≤ 0.55 room units, after ~15 s idle. In-place fidgets after ~6 s.
- `window.__homeAct.*` debug calls keep running activities directly, with no walk (the smoke tests rely on it).
- No new lights and no allocation per frame in the frame loops (project convention).

## Review Focus
- A walk to an activity blocked by furniture: she must not stay stuck. After 0.6 s without progress she is eased onto the stand spot (today's behaviour).
- The player presses a key mid-walk: the activity does not start and she isn't left frozen (`HOME.busy` stays false).
- Sitting on a pouf, then the player moves: she stands up and walks; no floating seat pose left behind.
- Rain while inside: no "catch raindrops" or "shiver" fidgets indoors.
- She leaves the house mid-idle-pose: the act and pose are cleared on exit.

---

### Task 1: Pure home-life logic

**Files:**
- Create: `src/home/homeLife.js`
- Test: `tests/unit/home-life.test.mjs`

**Interfaces (produces):**
- `makeWalk(hp, stand:[x,z], faceYaw:number) -> W` sets `hp.target = W.tgt` (a fresh `{x,z}` object).
- `stepWalk(W, hp, dt) -> 'walking'|'turning'|'done'|'stuck'|'cancelled'`. `cancelled` when `hp.target` is no longer `W.tgt` before arrival. Arrival is within 0.05 (the movement code clears the target there). `turning` eases `hp.yaw` toward `faceYaw` (rate 10/s) until within 0.08 rad or 0.5 s. `stuck` when the distance hasn't improved by 0.01 in 0.6 s.
- `makeIdle() -> I`; `stepIdle(I, {still:boolean, blocked:boolean}, dt) -> null|'walk'`. Returns `'walk'` once when still time passes `IDLE_WALK_AFTER = 15` and not blocked; not again until `still` goes false.
- `pickSpot(hp, spots, ctx) -> spot|null`: the nearest spot whose `stand` is within `IDLE_RANGE = 0.55` and whose `when(ctx)` (optional) is true. Spots: `{ id, stand:[x,z], face:number, ... }`.
- `pickGlance(ctx, rnd) -> 'cat'|'window'|'stove'|null` where ctx = `{ catD, catBusy, day, night, windowD, stoveD }`. Cat wins when `catD < 0.9 && catBusy`; window only when `day > 0.5 && windowD < 1.4`; stove only when `night > 0.4 && stoveD < 1.2`; otherwise null.

- [ ] Step 1: write tests for the following. A walk reaches the target and reports `turning`, then `done`. Clearing `hp.target` gives `cancelled`. No progress for 0.7 s gives `stuck`. `stepIdle` fires once after 15 s and re-arms after movement. `blocked` defers it. `pickSpot` ignores out-of-range spots and spots whose `when` is false, and picks the nearest. `pickGlance` follows the rules above.
- [ ] Step 2: run `node --test tests/unit/home-life.test.mjs` and expect a failure (module missing).
- [ ] Step 3: implement.
- [ ] Step 4: run again and expect PASS.
- [ ] Step 5: commit.

### Task 2: Walk to activities

**Files:** Modify `src/home/Activities.jsx`

- [ ] Add `goThen(stand, yaw, fn)`. It sets `A.doing = 'walk'`, so prompts hide and nothing else starts, and stores the walk. The `Dynamic` frame loop steps it. On `done` or `stuck` it clears `A.doing` and calls `fn()`. On `cancelled` it just clears.
- [ ] Every prompt `act` in the `HOME.near` hook goes through `goThen` with that activity's stand and facing (bed, stove, tub, table, armchair, each plant, bowl). `__homeAct` stays direct.
- [ ] Verify in the browser: from 0.25 away, pressing E makes her walk, turn, then start. A key press mid-walk cancels the walk and nothing starts. Commit.

### Task 3: Idle spots, idle poses and cancel-on-input

**Files:** Modify `src/act.js` (an `ease` option), `src/home/Activities.jsx`, `src/home/Room.jsx`

- [ ] `startAct(kind, { ease })`: when `ease` is set, `actW = min(1, e/ease, (dur-e)/ease)` instead of the 16%/22% ramps.
- [ ] Spots, validated with `freeAt(x, z, 0.09)` at module load, take the first free stand candidate:
  - pouf L and pouf R: `perch` pose plus `HOME.pose` onto the seat (y = 0.1 − 0.085), held 60 s.
  - door flower pot: `smell`, 3.2 s.
  - big plant: `leaf`, 3 s.
  - wall bookshelf: `browse`, 3.6 s.
  - stove: `warm`, 4.5 s, when night > 0.4.
  - sunny window: `gaze`, 4 s, when day > 0.5.
- [ ] Idle director: `still` = no input, not walking, not busy, no panel. `blocked` = `G.near` set, or `CAT.state` is 'rub'/'petted'. On `'walk'`, pick a spot and `goThen` it, then start the idle act with `{ dur, lock: dur, ease: 0.35, sound: false }`. While it runs, `HOME.idleAct` is set.
- [ ] `HOME.cancelIdle()` clears `ACT.kind` if it's an idle act, unposes, and clears `HOME.idleAct`. `Room.jsx` calls it on any key, stick or tap, and on exit, before the lock check.
- [ ] Verify in the browser: stand near a pouf for 15 s and she sits. Press W and she stands and walks. Commit.

### Task 4: Glances and indoor fidgets in her life layer

**Files:** Modify `src/art/chibi/life.js`, `src/home/Activities.jsx`

- [ ] `life.js`: when there's no villager or dog target, `window.__herInterest?.()` may return a world `Vector3` (tk = 5).
  - Indoors (`window.__home?.inside`), the fidget set is `FIDS_IN` (FIDS without pebble). It is never the rain set. Near the stove (`window.__herNearStove`) the set is hum-weighted.
  - Floor-sit indoors only when `window.__herOnRug`. Lying back is never allowed indoors.
- [ ] `Activities.jsx` supplies `__herInterest`: every 5–9 s it picks a glance with `pickGlance` and holds it 1.6–2.6 s. It returns the world position of Mochi's head, the window, or the stove fire. It also sets `__herNearStove` and `__herOnRug` (rug radius 0.95 from (0, 0.09)) each frame.
- [ ] Run unit tests and lint, then verify in the browser that she turns her head to Mochi. Commit.
