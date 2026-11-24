# Pet Locomotion (Studio Stage) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the new locomotion (motor, gait with planted feet, body dynamics, Pip's following, Mochi's steering) and show it in a Motion Studio page, old vs new, for the user to review before anything changes in the game.

**Architecture:** Three pure, unit-tested modules (`motor.js`, `gait.js`, `follow.js`) work in a flat 2D local frame. `Quadruped.jsx` gains an opt-in `st.loco` path that reads the gait's foot positions and body dynamics; without it, the rig behaves exactly as today, so the game is untouched. A dev page `motionstudio.html` drives both pets on flat ground with a clickable "her", and is built into one self-contained HTML file for review.

**Tech Stack:** three r169, @react-three/fiber 8, Vite 5, node:test, Playwright (clips).

**Spec:** `docs/superpowers/specs/2026-11-24-pet-locomotion-design.md`

## Global Constraints

- No art changes: heads, coats, colours, silhouettes and leg geometry stay as they are (single-column legs, hip at exactly leg length `L = legH + bh*0.2` above ground).
- The game is unchanged in this stage: `Dog.jsx` / `Cat.jsx` do not set `st.loco`, and the rig's legacy path is byte-for-byte the current behaviour.
- `vite build` of `index.html` must not include the studio (dev page, like `petstudio.html`).
- No new runtime dependencies.
- Units: world units/s for speed, radians for angles. Her walk is 0.88 u/s, her run 1.51 u/s (`src/App.jsx` stepPlayer).

## Review Focus

1. **Standing still while she fidgets.** Small moves of her (< dead zone) must not make Pip get up or shuffle. Test in Task 1 (dead-zone hysteresis) and Task 3 (spot smoothing).
2. **Turning on the spot.** Target directly behind from rest: legs must keep stepping (no frozen pivot), and no foot reaches beyond its limit. Tests in Task 1 (step-turn creep) and Task 2 (reach limit forces lift).
3. **Very large dt (tab switch).** A 0.5 s frame must not explode springs or teleport feet. Every step clamps dt to 0.05. Test in Task 1 and Task 2.
4. **Stop-start in quick succession.** She stops and starts again within half a second: no snap from settle back to follow. Test in Task 3.
5. **Gait boundaries.** A speed hovering at a walk/trot threshold must not flicker. The blend is continuous in speed, so there's nothing to flicker. Test in Task 2 (continuity).

---

### Task 1: Motor (speed, steering, arrival, step-turn)

**Files:**
- Create: `src/pets/motor.js`
- Test: `tests/unit/pet-motor.test.mjs`

**Interfaces:**
- Produces:
  - `MOTOR_DOG`, `MOTOR_CAT`: config objects `{ maxSpeed, accel, decel, jerk, turn0, turnV, turnAcc, deadOut, arrive, creep, lookMax }`
  - `newMotor() -> { v, w, a, moving, look }` (speed u/s, yaw rate rad/s, longitudinal accel u/s², moving flag, head look angle rad)
  - `stepMotor(m, cfg, goal, dt) -> { dYaw, v }`. `goal = { x, z, speed, face? }`: target in the pet's local frame (z ahead, x to the pet's left; `x = 0, z = 0` means no target), desired cruise speed, optional facing angle relative to heading used when not moving. Mutates `m`.
  - `maxTurn(cfg, v) -> number` = `cfg.turn0 / (1 + v / cfg.turnV)`
  - `steerClear(wantAngle, isFree, probe) -> angle`: weighted blend over 9 candidate directions (±0, ±0.35, ±0.7, ±1.05, ±1.4 rad); weight = free ? cos(offset)² : 0. Falls back to `wantAngle` when none is free.

- [ ] **Step 1: Write failing tests** in `tests/unit/pet-motor.test.mjs`:
  - `speed has no steps`: target 3 u ahead, speed 1.5, 400 frames at 1/60: every frame `|Δv| <= (cfg.accel) * dt + 1e-9`.
  - `arrives without overshoot`: integrate position along heading; target 1 u ahead; final distance `< cfg.arrive` and z of the target in the local frame never goes below `-0.02`.
  - `dead zone holds`: after arrival, move the target 0.6×`deadOut` away: `m.moving === false` and `v === 0` for 120 frames; move it 1.2×`deadOut`: `moving` turns true.
  - `turn rate bounded`: every frame `|m.w| <= maxTurn(cfg, m.v) + 1e-9`.
  - `step-turn creeps`: from rest, target 1 u directly behind: within 30 frames `m.v > 0` and `m.v <= cfg.creep + 1e-9`, and `|m.w| > 0`.
  - `big dt is clamped`: one call with `dt = 0.5` changes `v` by at most `cfg.accel * 0.05`.
  - `steerClear avoids a blocked front`: `isFree` false for |angle| < 0.5: result has |angle| ≥ 0.35; all free: returns ≈ want (±1e-6).

- [ ] **Step 2: Run** `node --test tests/unit/pet-motor.test.mjs` → FAIL (module not found).

- [ ] **Step 3: Implement `src/pets/motor.js`.** Algorithm (the tests pin the bounds; the shape is this):
  - `dt = min(dt, 0.05)`; `d = hypot(x, z)`; `bearing = atan2(x, z)`.
  - Hysteresis: start moving when `d > deadOut`, stop when `d < arrive`.
  - Desired speed while moving: `min(goal.speed, sqrt(2 * decel * max(0, d - arrive * 0.5))) * max(0, cos(bearing))`; if `|bearing| > 1.1` and `v < creep * 1.5`, use `creep` (step-turn).
  - Longitudinal: `aWant = clamp((vDes - v) * 4, -decel, accel)`; `m.a += (aWant - m.a) * min(1, dt * jerk)`; `v = clamp(v + m.a*dt, 0, maxSpeed)`, then the per-frame change is clamped to `accel*dt`.
  - Yaw: aim = moving ? bearing : (face ?? 0); `wWant = clamp(aim * 3, ±maxTurn(v))`; `m.w` approaches `wWant` at `turnAcc` rad/s², then is clamped to ±maxTurn(v).
  - Look: `m.look += (clamp(aim, ±lookMax) - m.look) * min(1, dt * 8)`.
  - Starting values: `MOTOR_DOG = { maxSpeed: 2.8, accel: 3.2, decel: 4.5, jerk: 10, turn0: 7, turnV: 0.9, turnAcc: 30, deadOut: 0.16, arrive: 0.07, creep: 0.12, lookMax: 1.1 }`. `MOTOR_CAT = { maxSpeed: 1.0, accel: 2.2, decel: 3.0, jerk: 9, turn0: 6, turnV: 0.35, turnAcc: 24, deadOut: 0.1, arrive: 0.05, creep: 0.06, lookMax: 1.2 }`.

- [ ] **Step 4: Run** the tests → PASS.
- [ ] **Step 5: Commit** `feat(pets): locomotion motor (smooth speed, arcs, arrival, step-turn)`.

### Task 2: Gait engine with planted feet

**Files:**
- Create: `src/pets/gait.js`
- Test: `tests/unit/pet-gait.test.mjs`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `GAITS`: `{ walk, trot, gallop, bound }`, each `{ off: [FL, FR, RL, RR] touchdown phase (unwrapped), duty }`:
    - walk (lateral sequence): `off [0.25, 0.75, 0, 0.5]`, duty 0.64
    - trot: `off [0.5, 1.0, 0, 0.5]`, duty 0.46
    - gallop (dog, rotary): `off [0.5, 0.4, 0, 0.1]`, duty 0.3
    - bound (cat): `off [0.5, 0.55, 0, 0.05]`, duty 0.32
  - `gaitMix(cfg, v) -> { off: number[4], duty, stride }`. `cfg.gait = { walkTo, trotTo, runAt, strideMin, strideMax, run: 'gallop'|'bound' }` (speeds in rig-local units/s). Walk below `walkTo`, trot from `walkTo` to `trotTo` blended over ±25 %, then the run gait from `runAt`. `stride` = stance travel = `strideMin + (strideMax - strideMin) * smoothstep(0, runAt*1.4, v)`.
  - `newFeet(hips) -> feet`. `hips` = `[[x, z] × 4]` in body space (FL, FR, RL, RR); `feet = { ph, legs: [{ x, z, y, stance, fx, fz, tx, tz }] }` (y = paw lift).
  - `stepFeet(feet, hips, { v, w, dt, reach }) -> void`. Integrates the phase at `freq = drive * duty / stride` where `drive = max(v, |w| * 0.06)`. Stance: the foot is moved by the body's motion (`p ← Rot(-w*dt)·p − [0, v*dt]`), so it stays still in the world. Swing: from the lift-off point to touchdown `hip + [0, +stride/2] + turn lead`, with a lift `y = liftH * sin(π u)`. If a stance foot drifts farther than `reach` from its hip, it lifts early. With `drive < 1e-3` for 0.3 s, the feet ease back under the hips.
  - `legAngles(foot, hip, L) -> { rx, rz, len }`: pitch and roll aiming the column from the hip to the paw, and the length scale `len = dist / L`.

- [ ] **Step 1: Write failing tests**:
  - `stance feet stay put in the world`: steady v = 0.5, w = 0.4, 600 frames; track the body pose in the world; for every stance interval of every foot, world-position drift < 1e-4.
  - `duty matches gait`: steady speed at mid-walk, fraction of frames each foot is in stance ≈ `duty` (±0.04).
  - `blend is continuous`: sweep v from 0 to 3 in 0.001 steps; between neighbours, `|Δoff[i]| < 0.01` and `|Δduty| < 0.01`.
  - `reach limit forces lift`: w = 6, v = 0, for 300 frames: no stance foot is ever farther than `reach + 1e-6` from its hip.
  - `big dt`: one `stepFeet` with dt 0.5 moves the phase by at most `freq * 0.05`.
  - `legAngles` sanity: foot straight below the hip → rx = 0, rz = 0, len = 1; foot ahead (+z) → rx < 0 (matches the rig: positive rx swings the paw back).

- [ ] **Step 2: Run** `node --test tests/unit/pet-gait.test.mjs` → FAIL.
- [ ] **Step 3: Implement `src/pets/gait.js`** as above.
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat(pets): gait engine (lateral walk, trot, gallop/bound; planted feet)`.

### Task 3: Pip's following and settling

**Files:**
- Create: `src/pets/follow.js`
- Test: `tests/unit/pet-follow.test.mjs`

**Interfaces:**
- Consumes: nothing (works on plain 2D numbers; the studio and later `Dog.jsx` convert to and from their own spaces).
- Produces:
  - `newFollow() -> F` (`{ spot:{x,z}, side, sideK, mode: 'follow'|'settle'|'sit'|'lie', settle: null|'sit'|'look'|'circle'|'sniff', t, herStill }`)
  - `stepFollow(F, her, pet, dt, rnd = Math.random) -> { x, z, speed, face, pose, look }`. `her = { x, z, yaw, speed }`, `pet = { x, z, yaw }` (world 2D, yaw 0 = +z). Returns the world target, desired speed, facing (world yaw or null), pose goals `{ sit, lie, sniff, headYaw }`, and a look target (world yaw or null).
  - Behaviour:
    - Spot = her position + behind 0.36 + side `0.24 * sideK`, plus lead `her.speed * 0.25` along her heading. It's smoothed with a time constant of 0.35 s.
    - `sideK` eases toward `side` over ≈1 s. The side flips at random every 15–40 s while she's moving.
    - Speed = `clamp(her.speed + (gap - 0.3) * 2.2, 0, 2.8)`, continuous in the gap.
    - When she has been still for 0.6 s and he's within 0.25 of the spot, mode → settle, picked from `sit 0.4, look 0.3, circle 0.2, sniff 0.1`. look = stand 2–4 s glancing around, then sit. circle = one small loop (r 0.08), then lie. sniff = nose-down wander 1.5–3 s, then sit. sit → lie after 8–15 s.
    - While sit/lie: `look` tracks her, and he stands up again only when her bearing exceeds 1.3 rad or she moves > 0.45 away.
    - Any time she moves faster than 0.2 for 0.15 s, mode → follow.

- [ ] **Step 1: Write failing tests**:
  - `speed is continuous in the gap`: sweep the gap 0–5 in 0.001 steps; |Δspeed| < 0.01.
  - `ignores fidgets`: settled; her position jitters ±0.05 for 5 s: mode stays settled, speed 0.
  - `side switch is gradual`: force a flip; `sideK` takes ≥ 0.6 s to cross from −0.9 to +0.9.
  - `settle variety`: with a seeded rnd, 200 stops produce all four settle kinds.
  - `stop-start`: she stops for 0.4 s, then walks: mode returns to follow within 0.2 s, and the speed output never jumps by more than 0.01 per frame.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement `src/pets/follow.js`.**
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat(pets): natural following + varied settling for Pip`.

### Task 4: Rig loco path (opt-in)

**Files:**
- Modify: `src/pets/Quadruped.jsx` (the `useFrame` body; legacy path unchanged)
- Modify: `src/pets/Dog.jsx` and `src/pets/Cat.jsx` cfg only: add `gait` and `loco` per-species values (unused by the game yet)
- Test: `tests/unit/pet-rig-loco.test.mjs`

**Interfaces:**
- Consumes: `gaitMix`, `newFeet`, `stepFeet`, `legAngles` (Task 2).
- Produces: when `st.loco` is truthy, the rig reads `st.speed` (rig units/s), `st.w` (yaw rate), `st.a` (longitudinal accel), `st.look` (head yaw lead) and:
  - legs from planted feet, blended with the pose-based legs by `wLoco = 1 - max(sit, lie, curl, roll)`
  - body height and pitch from the stance legs' hip heights (front pair vs hind pair), passed through a spring (k 400, ζ 0.7)
  - lean `roll = -cfg.loco.lean * v * w` and pitch `+cfg.loco.brake * a` via springs (k 120, ζ 0.6)
  - head: yaw `+ st.look`, counter-pitch and counter-roll against the body (factor 0.8), a nod of `cfg.loco.nod * sin(2·phase)` in the walk only
  - tail: a lagged yaw from `-w` (k 60, ζ 0.5) and, for the cat, lowering toward horizontal with speed above `trotTo`
  - pose keys go through per-key springs `cfg.loco.springs[key] = [k, ζ]` (sit [90, 0.75], lie [40, 0.9], curl [30, 1], crouch [140, 0.7], stretch [60, 0.8]; default [120, 0.85]) instead of the shared exponential ease
- Exports a pure helper `bodyFromFeet(legs, hips, L) -> { y, pitch, roll }` for the test.

- [ ] **Step 1: Failing test**: `bodyFromFeet` with all four feet under the hips → `{ y: L, pitch: 0, roll: 0 }`; front feet spread ±0.3L in z → front hip height `L*cos(asin(0.3))` and pitch > 0 (nose down). Also check that the legacy rig file still exports `POSE0` and `newPet` unchanged.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS.
- [ ] **Step 5:** `npm run test:unit` and `npx eslint src/pets` → clean. **Commit** `feat(pets): opt-in loco path in the quadruped rig`.

### Task 5: Motion Studio

**Files:**
- Create: `motionstudio.html`, `src/art/motionStudio.jsx`, `src/art/motionStudioOld.js` (the old movement, ported flat: stepped speeds 0.6/1.2/1.7/2.7, fixed side slot with an instant flip, sit after 0.9 s, lie at 7 s; cat: constant 0.2/0.55, first-free of 7 offsets)
- Create: `tools/build-motionstudio.mjs` (vite build of `motionstudio.html` into `dist-studio/`, then inline JS and CSS into one `motionstudio.single.html`)

**Interfaces:**
- Consumes: Tasks 1–4; `DOG_CFG`, `CAT_CFG`, `Quadruped`, `newPet`.
- Produces a page with:
  - Flat meadow ground, three box obstacles (for Mochi's steering), and soft light matching `petstudio`.
  - "Her": a simple stylised walker (no game character import). Click or tap the ground to send her there. Hold Shift (or the Run toggle) to run at 1.51; otherwise she walks at 0.88.
  - Controls (HTML overlay, works at phone width):
    - Pet: Pip / Mochi / Both
    - Version: New / Old / Side by side. In side by side, there are two lanes 1.2 u apart, and the same "her" path is mirrored into each lane.
    - Scenario: Free / Stroll with stops / Catch up / Figure‑8 / Zig‑zag / Turn on the spot
    - Time: 1×, ½×, ¼×
    - Footprints on/off: fading dots where each paw plants, which shows sliding at a glance
    - Camera: orbit (drei `OrbitControls`), with an optional follow toggle
  - Mochi in the studio follows her loosely, using the motor + `steerClear` around the boxes and the cat gait.
- [ ] **Step 1:** Implement the page. Run `npx vite --port 5195` and open `/motionstudio.html` in Playwright. There must be no console errors, and each scenario must run for 10 s.
- [ ] **Step 2:** Record clips (Playwright `recordVideo`, 1280×720) of each scenario in side-by-side mode into the scratchpad. Watch them and tune Task 1–4 constants by eye: no visible sliding, lean not exaggerated, no jitter.
- [ ] **Step 3:** `node tools/build-motionstudio.mjs` → a single HTML file < 16 MB. Open it from `file://` in Playwright: it renders with no errors.
- [ ] **Step 4:** `npm run build` still succeeds, and `dist/` contains no studio chunk. Run `npm run test:unit`.
- [ ] **Step 5: Commit** `feat(pets): Motion Studio for reviewing the new locomotion`. Publish the single file as an Artifact for the user.
