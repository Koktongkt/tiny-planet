# In-World Action Prompts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Draw the E prompt as a glass head bubble over its target (full weight). Quick ground pickups get a gold outline
plus an occasional small chip (light weight). Villagers get the same bubble, with "Give a gift" stacked above.

**Architecture:** Pure logic (target choice, weight, screen placement, chip reminders) lives in `src/game/prompt/`,
with node unit tests. Every `consider()` call gains an `at(out)` anchor in world space. The interaction loop in
`World.jsx` collects candidates and picks one with facing and stickiness. A canvas-side placer projects the anchor each
frame and moves one DOM bubble directly, the way `Talk.jsx` moves its "…" bubble today.

**Tech Stack:** React 18, @react-three/fiber 8, three 0.169, Vite, node:test, Playwright smoke tests.

**Spec:** `docs/superpowers/specs/2026-11-23-in-world-prompts-design.md`

## Global Constraints
- Glass & Gold tokens from `src/ui/glass/glass.css` (`--g-fill`, `--g-rim`, `--gold*`, `--t-gold`); the E coin is today's
  `.g-glass .key` look.
- One target at a time (`G.near`). Words, icons, keys (E, F, G, R) unchanged.
- Phones: same bubble, no E coin (as today, `!TOUCH`). Every tappable bubble and chip is at least 44px tall. The pad's
  Action button stays.
- Keep `.tp-prompt` on the full bubble and `.tp-chip` on the F/G alt bubble and on the light chip; update
  `hud.mobile`, `stageb` and `stagec` smoke tests where they assumed the bottom position.
- `prefers-reduced-motion`: no pop, bob or pulse.
- HUD zoom `zoom:var(--tpts,1)` applies to the bubble.
- Mobile draw budget: the outline adds draws to one object at a time; the see-through silhouette only while blocked.
- No model identifiers in commits or code.

## Review Focus
1. Target behind the camera (walking backwards into a bench): the bubble must sit at the bottom edge, never vanish or
   mirror to the wrong side. Test: `placeBubble` with `behind: true`.
2. Target at the screen edge in phone portrait (390 px wide) with a long name ("Read the errands board"): the bubble
   stays fully inside with an 8 px margin and the tail still points at the target. Test: `placeBubble` clamp cases.
3. Two candidates a hair apart while walking (flower patch): no flip-flopping. Test: `pickTarget` stickiness.
4. A villager and a gather spot both near: exactly one bubble, the same winner E acts on (`talkWins`). Test in Task 6.
5. Going indoors or into the museum while a bubble is up: the old outdoor anchor must not be projected from the
   indoor camera. Test: smoke step in Task 4 (enter the house, assert the bubble is the door-out bubble).

---

### Task 1: Prompt logic (pure)

**Files:**
- Create: `src/game/prompt/logic.js`
- Test: `tests/unit/prompt-logic.test.mjs`

**Interfaces:**
- Produces:
  - `promptWeight(n) -> 'light' | 'full'`: light for `kind==='spot'` when `!n.spot.water` and item not in
    `['wool','fish','water']`; for `kind==='decor'`; for `kind==='ext'` with `id` starting `'dug'`. Everything else full.
  - `pickTarget(cands, prevId, { faceK = 0.6, stick = 0.2 } = {}) -> cand | null`. `cands` are
    `{ o, d, lim, cos }` (cos: facing cosine in [-1,1], or `null` when there is no anchor). Only `d < lim` counts.
    Score = `d * (1 + faceK * (1 - cos) / 2)` (cos `null` → `d`). The previous id is kept unless the best score is
    below `prevScore * (1 - stick)`.
  - `placeBubble({ x, y, behind }, { w, h }, { bw, bh }, margin = 8) -> { left, top, tail }`: screen px of the
    bubble's top-left and the tail's x offset inside the bubble (px from its left). Bubble sits above the point with its
    tail tip on it. Clamped inside `[margin, w - margin]` × `[margin, h - margin]`. `behind`: point mirrored, bubble at
    the bottom edge (`top = h - margin - bh`), x clamped. `tail` clamped to `[14, bw - 14]`.

- [ ] **Step 1: Write the failing tests**

```js
import { test } from 'node:test'; import assert from 'node:assert/strict'
import { promptWeight, pickTarget, placeBubble } from '../../src/game/prompt/logic.js'
test('weights', () => {
  assert.equal(promptWeight({ kind: 'spot', spot: { item: 'berries' } }), 'light')
  assert.equal(promptWeight({ kind: 'spot', spot: { item: 'wool' } }), 'full')
  assert.equal(promptWeight({ kind: 'spot', spot: { item: 'fish', water: true } }), 'full')
  assert.equal(promptWeight({ kind: 'decor' }), 'light')
  assert.equal(promptWeight({ kind: 'ext', id: 'dug3' }), 'light')
  assert.equal(promptWeight({ kind: 'ext', id: 'dog' }), 'full')
  assert.equal(promptWeight({ kind: 'bench' }), 'full')
})
test('facing beats a slightly closer thing behind', () => {
  const a = { o: { id: 'a' }, d: 0.30, lim: 0.5, cos: -1 }, b = { o: { id: 'b' }, d: 0.34, lim: 0.5, cos: 1 }
  assert.equal(pickTarget([a, b], null).o.id, 'b')
})
test('out of range never wins', () => assert.equal(pickTarget([{ o: { id: 'a' }, d: 0.6, lim: 0.5, cos: 1 }], null), null))
test('sticky: keeps prev unless clearly better', () => {
  const a = { o: { id: 'a' }, d: 0.30, lim: 0.5, cos: null }, b = { o: { id: 'b' }, d: 0.28, lim: 0.5, cos: null }
  assert.equal(pickTarget([a, b], 'a').o.id, 'a')
  assert.equal(pickTarget([a, { ...b, d: 0.2 }], 'a').o.id, 'b')
})
test('placement: centred above, clamped at edges, bottom when behind', () => {
  const s = { w: 390, h: 844 }, b = { bw: 220, bh: 50 }
  assert.deepEqual(placeBubble({ x: 195, y: 400, behind: false }, s, b), { left: 85, top: 350, tail: 110 })
  const r = placeBubble({ x: 385, y: 400, behind: false }, s, b); assert.equal(r.left, 390 - 8 - 220); assert.equal(r.tail, 220 - 14)
  const t = placeBubble({ x: 195, y: 20, behind: false }, s, b); assert.equal(t.top, 8)
  const k = placeBubble({ x: 100, y: 300, behind: true }, s, b); assert.equal(k.top, 844 - 8 - 50)
})
```

- [ ] **Step 2: Run `node --test tests/unit/prompt-logic.test.mjs`.** Expected: FAIL, module not found.
- [ ] **Step 3: Implement the three functions in `src/game/prompt/logic.js`** (no DOM, no three imports).
- [ ] **Step 4: Run the test again.** Expected: PASS.
- [ ] **Step 5: Commit** `Prompt logic: weight, facing + sticky target pick, bubble placement`.

### Task 2: Chip reminders + save v7

**Files:**
- Create: `src/game/prompt/hints.js`
- Modify: `src/save/schema.js` (SAVE_VERSION 7, `hints: {}` in `fresh()`, migration `from: 6`, normalize `hints` to an object)
- Test: `tests/unit/prompt-hints.test.mjs`, extend `tests/unit/save.test.mjs`

**Interfaces:**
- Produces:
  - `HINT = { firstN: 3, idleMs: 1500, staleDays: 1 }`
  - `chipShows(hints, item, day, idleMs) -> boolean`: true when `(hints[item]?.n || 0) < 3`, or `idleMs >= 1500`, or
    `day - hints[item].day >= 1`.
  - `notePickup(hints, item, day) -> void`: `hints[item] = { n: n + 1, day }` (mutates).

- [ ] **Step 1: Write failing tests**: `chipShows({}, 'berries', 0, 0) === true`; after 3× `notePickup` on day 0 →
  `false` at idle 0; `true` at idle 1500; `true` on day 1. Save: `migrate({ v: 6, ... })` gives `v === 7` and
  `hints` deep-equal to `{}`; `migrate({ v: 7, hints: 5 })` normalises `hints` to `{}`.
- [ ] **Step 2: Run** `node --test tests/unit/prompt-hints.test.mjs tests/unit/save.test.mjs`. Expected: FAIL.
- [ ] **Step 3: Implement** `hints.js` and the schema change. Call `notePickup(G.s.hints, item, G.s.day)` where
  the light-weight actions succeed: `pickup()` in `World.jsx`, the decor pick-up branch of `GAME.actions.act`, and the dug-item
  `act` in `src/pets/Dog.jsx`.
- [ ] **Step 4: Run** `npm run test:unit`. Expected: all PASS (other suites that pin `SAVE_VERSION` updated to 7).
- [ ] **Step 5: Commit** `Chip reminders: first 3 pickups, idle 1.5 s, a day away; save v7 hints`.

### Task 3: Anchors on every target + facing-aware pick

**Files:**
- Create: `src/game/prompt/anchors.js`
- Modify: `src/game/World.jsx` (consider collects candidates, `pickTarget`), plus every `consider(` call site:
  `src/game/World.jsx`, `src/systems/WorldC.jsx`, `src/systems/World3D.jsx`, `src/systems/museumC.js`,
  `src/home/Room.jsx`, `src/home/Activities.jsx`, `src/pets/Dog.jsx`, `src/pets/Cat.jsx`
- Test: `tests/smoke/prompt.spec.js` (new)

**Interfaces:**
- Consumes: `pickTarget` (Task 1).
- Produces:
  - `atPlanet(local: Vector3, lift: number) -> (out) => Vector3`: planet-local point lifted along its own up, to world
    via `planetRef.current.matrixWorld`.
  - `atRoom(x, z, y) -> (out) => Vector3`: room units, using the player object's mapping
    (`roomToWorld(x * ROOM.S, y, z * ROOM.S, out)`). Check by anchoring at `HOME.hp` and confirming it projects
    onto the traveller.
  - `atMuseum(x, z, y)`: same for `MU.obj` (museumC's `toWorld`, scaled by `MUSEUM.S`).
  - `atObj(obj, h) -> (out) => Vector3`: `obj` world position plus its world up × `h` (moving things: sheep, pets, cat).
  - Every candidate object may carry `at` (anchor fn) and `obj` (the Object3D to outline, light weight only).
  - `G.near` keeps its shape and gains `at`, `obj`, `weight`.
- Anchor heights to start from (planet units, tune by eye): items 0.1, decor 0.25, pets 0.32, bench/chest 0.45,
  doors/board/stations 0.7, villagers use `who.h || 0.92` as Talk does.
- Facing: player world position and forward from `HOME.playerObj` (forward = local +Z through `matrixWorld`; this
  holds outdoors, where the basis is `(side, n, face)`, and indoors, where it is a yaw about up).

- [ ] **Step 1: Write the failing smoke test** `prompt.spec.js` › "every target has an anchor": boot
  `?enter&nosave&t=day&out&at=village`. Teleport to `mushroom-show` (as in `game.spec.js` "gathers an item"), then
  the bench (`at=home`), then Pip (`?dog=sit`). Each time, wait for `G.near` and assert
  `typeof window.__game.G.near.at === 'function'`.
- [ ] **Step 2: Run** `npx playwright test tests/smoke/prompt.spec.js --trace off`. Expected: FAIL (`at` undefined).
- [ ] **Step 3: Implement** `anchors.js`. Change `consider` in `GameWorld`'s frame loop to push `{ o, d, lim, cos }`
  (cos from the anchor when present; the `inside` filter stays). Call `pickTarget(cands, G.near?.id)` once after
  `H.near`. Then add `at` (and `obj` for spots: `refs.current[sp.id]`; for decor and dug items where a ref exists) at every
  call site.
- [ ] **Step 4: Run** the new spec and `npx playwright test tests/smoke/game.spec.js --trace off`. Expected: PASS.
- [ ] **Step 5: Commit** `Prompt anchors on every target; facing-aware, sticky target pick`.

### Task 4: The head bubble and the light chip

**Files:**
- Create: `src/game/prompt/WorldPrompt.jsx`, `src/game/prompt/prompt.css`
- Modify: `src/game/UI.jsx` (replace `Prompt()` with `<WorldPrompt />`), `src/game/World.jsx` (mount `PromptPlacer`)
- Test: `tests/smoke/prompt.spec.js`

**Interfaces:**
- Consumes: `G.near.{at, weight}`, `placeBubble`, `chipShows`, `HINT`.
- Produces: `PROMPT = { el: null, chipEl: null, idleMs: 0 }` (module state the placer writes);
  `Bubble({ coin, icon, verb, name, lack, alt, onAct, small })` presentational component (used by Task 6).
- Full: `.tp-prompt.g-glass.tp-bubble` pill with tail (`::after` rotated square, glass fill, rim on two sides), alt
  stacked above as `.tp-chip.tp-bubble-alt`. Pop 0.35 s `cubic-bezier(.3,1.6,.5,1)`, bob 2.4 s ±4 px. "Needs a tool": coin
  greyed, `em` line as today.
- Light: `.tp-chip.tp-pick` with E coin + item icon only (name only while `(hints[item]?.n||0) < 3`), fade 0.25 s, no
  bob, placed just above `at`. Shown only when `chipShows(...)`. `PROMPT.idleMs` counts while the player hasn't moved
  and `G.near` is unchanged.
- `PromptPlacer` (canvas side, `useFrame`): project `G.near.at(_v)` with the active camera. `behind = projected z > 1`.
  Measure the bubble once per target change (`offsetWidth/Height`). Apply `placeBubble`, write
  `transform: translate(left, top)` and `--tail` on the element. If `at` is missing, add the class `tp-dock`,
  which keeps today's bottom position. Hidden while `G.ui.panel || G.ui.fish || G.ui.place || G.ui.lock` or when Talk
  wins (Task 6).
- Touch: whole bubble/chip `onPointerDown` → `GAME.actions.act()`; alt → `n.alt.act()`. `min-height: 44px` under
  `html.tp-touch`.

- [ ] **Step 1: Extend `prompt.spec.js`**: at `mushroom-show`, `.tp-pick` is visible and its box centre is within
  80 px horizontally of the projected spot. At the bench, `.tp-prompt` is visible and its bottom is above the
  viewport's lower third. Enter the house (`HOME.enter()`): within 3 s `.tp-prompt` contains "outside".
- [ ] **Step 2: Run it.** Expected: FAIL (no `.tp-pick`; prompt still docked at the bottom).
- [ ] **Step 3: Implement** the component, the CSS and the placer.
- [ ] **Step 4: Run** `prompt.spec.js`, `stageb.spec.js`, `stagec.spec.js` and `hud.mobile.spec.js`. Fix the tests'
  position assumptions only, never their behaviour checks. Expected: PASS.
- [ ] **Step 5: Screenshot check**: desktop day and phone portrait, at the bench and at Pip; view them.
- [ ] **Step 6: Commit** `In-world head bubble (full) and pickup chip (light)`.

### Task 5: Gold outline for light-weight targets

**Files:**
- Create: `src/game/prompt/outline.js`
- Modify: `src/game/World.jsx` (remove the `__hl` ring group and `G_RING`, drive the outline)
- Test: `tests/smoke/prompt.spec.js`

**Interfaces:**
- Produces: `setOutline(obj: Object3D | null, t: number) -> void`. It restores the previous object and decorates the
  new one: meshes whose material is a dark `BackSide` hull get `GOLD_HULL` (`#ffd56a`, `BackSide`,
  `toneMapped:false`). Hull-less meshes get one child shell with the same geometry, `GOLD_HULL`, scaled `1.13 + 0.05 *
  pulse`, where pulse is `0.5+0.5*sin(t*3.2)` (a constant under reduced motion). It also handles the blocked case:
  when a raycast from the camera to the anchor hits `HOME.playerObj` first, it shows a second shell with
  `depthTest:false`, opacity 0.35 and `renderOrder` 10.
- `outline.js` never mutates shared materials. It swaps per mesh and keeps the original in `userData`.
- Water spots: reuse the existing `__burst` sparkle group as a slow ring of gold sparkles on the water while that spot is
  the target.

- [ ] **Step 1: Extend `prompt.spec.js`**: at `mushroom-show`, `window.__outline?.id === 'mushroom-show-…'`
  (expose the outlined id on `window.__outline` for tests). After walking away, it is `null`. Also
  `refs.__hl` is gone: `document` has no ring (assert via `window.__outline.ring === undefined`).
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `prompt.spec.js` and `game.spec.js` "gathers an item". Then `npm run perf:budget`, which must
  stay within its current limits. Expected: PASS.
- [ ] **Step 5: Screenshot check**: berry bush in the meadow, plus the bush hidden behind the traveller (`berries-meadow-0`
  from its stand) showing the see-through silhouette.
- [ ] **Step 6: Commit** `Gold outline on the targeted ground item replaces the white ring`.

### Task 6: Villagers

**Files:**
- Modify: `src/talk/Talk.jsx` (bubble markup, `talkWins`), `src/talk/talk.css`, `src/game/prompt/WorldPrompt.jsx`
- Test: `tests/smoke/prompt.spec.js`

**Interfaces:**
- Consumes: `Bubble` (Task 4), `placeBubble`.
- Produces: `talkWins() -> boolean` exported from `src/talk/state.js`:
  `!!TALK.near && !TALK.open && !(G.near && TALK.nearD > 0.4)`. This is the same rule the E handler already uses.
  `WorldPrompt` hides itself when it is true.
- The "…" `.tk-bubble` becomes `Bubble` with icon `hand`, verb "Talk to", name `PROFILES[key].name`. When `window.__sb`
  exists, it gets an alt bubble: icon `heart`, "Give a gift", key `G`. Touch: tap main → `open(TALK.near)`, tap alt →
  `gift(TALK.near)`. Placement keeps Talk's own projection, with `placeBubble` for clamping.

- [ ] **Step 1: Extend `prompt.spec.js`** using `?at=talk` (as `shoot-polish.mjs` does): `.tk-bubble` contains
  "Talk to" and the villager's name, and "Give a gift". `.tp-prompt` is not visible at the same time. Pressing E
  opens `.tk-box`.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `prompt.spec.js` and any existing talk smoke tests (`grep -l talk tests/smoke`). Expected: PASS.
- [ ] **Step 5: Commit** `Villagers: Talk to bubble with Give a gift stacked above`.

### Task 7: Whole-branch check

- [ ] Run `npm run lint`, `npm run test:unit`, `npx playwright test --trace off`. All pass, or failures are shown to
  be unrelated by running the same tests on `main`.
- [ ] Screenshot set (desktop day and night, phone portrait): bench, Pip with F, villager with G, a berry chip, the
  outline, an edge clamp, a target behind the camera. Save to `screenshots/prompts/`.
- [ ] Commit `Screenshots: in-world prompts` and push.
