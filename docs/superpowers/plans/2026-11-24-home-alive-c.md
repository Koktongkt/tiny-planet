# Her house, part C Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** stove log, curtains, lamps, yarn toss, alcove fade. **Spec:** `docs/superpowers/specs/2026-11-24-home-alive-c-design.md`

## Global Constraints
- No new lights, no per-frame allocation; toggles must not rebake props or recompile shaders.
- Saved state lives in `G.s.home`; missing on old saves = curtains open, lamps on.

## Review Focus
- A save from before part C loads with curtains open and lamps on.
- Tossing the ball while Mochi is on the bed / sill: he hops down first (chase handles off-floor), no teleport.
- Leaving the house while she holds the log or the ball: it is dropped back (ball on the floor where she stood).
- Pressing E for a lamp from the far side of the desk: stand spots must be free floor.
- Fade only while near the wardrobe; never stuck see-through after she walks away.

### Task 1: pure helpers (TDD) — `src/home/homeLife.js`, `tests/unit/home-life.test.mjs`
- `homeState(s) -> { curtains: boolean, lamps: { desk: boolean, night: boolean } }` fills defaults (open, on) without dropping other fields.
- `fireFlare(level, dt) -> level` decays a 0..1 flare to 0 over ~180 s (exponential, level < 0.02 snaps to 0).
- `tossVel(yaw, speed = 1.1) -> [vx, vz]` along her facing.

### Task 2: alcove fade — `src/home/interior.jsx`
- Factor the bath walls' fade into `useSeeThrough(ref, wantFn)`; BathWalls uses it; Alcove fades when she's within 0.42 of the wardrobe's front.

### Task 3: lamps — `src/home/Room.jsx`, `src/home/Activities.jsx`
- Desk and nightstand floor patches get their own materials, scaled by `HOME.lampK.desk / night` (eased 0..1).
- Find the two props, give their glow mesh and halo per-instance materials, lerp bulb colour (off = 45 %) and halo opacity.
- Prompts "Switch on / off the desk lamp | the bedside lamp", stand spots validated with `freeAt`, pose `lamp`.

### Task 4: curtains — `src/home/Activities.jsx`, `src/home/interior.jsx` (Sunbeam)
- Animated rod + two panels + tie-backs at the left window; `HOME.curtK` eased; Sunbeam opacity × curtK; idle `window` spot only when open.
- Prompt "Open / Close the curtains", pose `curtain`.

### Task 5: stove log — `src/home/Activities.jsx`, `src/home/Room.jsx`, `src/pets/Cat.jsx`
- Log in hand, pick at the woodpile, push into the stove; `HOME.fire` flare drives fire mesh scale, stove floor glow, sparks.
- Cat: `SPOT.hearth`, state `hearth` (sit facing the fire ~8 s, then curl up for the rest).

### Task 6: yarn toss — `src/home/Activities.jsx`, `src/pets/Cat.jsx`
- `CAT.ball.held` with hand position; pose `toss`; on release `tossVel`, cat `chase` (or a one-eye toast when napping).

### Task 7: verify
- Unit tests, lint, build; in-browser shots of each interaction; GAMEPLAY.md section; commit + push.
