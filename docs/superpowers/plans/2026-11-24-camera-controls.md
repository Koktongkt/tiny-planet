# Camera and movement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans. Checkbox steps.

**Goal:** approach A from the spec. **Spec:** `docs/superpowers/specs/2026-11-24-camera-controls-design.md`

## Global Constraints
- The default zoom is wider than today. Indoor orbit is ±0.7 rad. Mouse clicks act on release only when there was no drag.
- No per-frame allocation in the camera / movement loops.

## Review Focus
- A click on an item to gather still works (now on release).
- Dragging on a UI panel must not orbit (only drags that start on the canvas).
- Holding S from standstill: she turns round to face the camera and walks toward it, no moonwalk.
- Photo mode's wheel / camera unaffected.
- Leaving the house: the camera is in front of her, not behind.

### Task 1: pure input helpers (TDD) — `src/camInput.js`, `tests/unit/cam-input.test.mjs`
- `moveIntent(keys, pad) -> { x, y, mag }`: keyboard wins (diagonals normalised); otherwise the stick past a 0.12 dead zone, with mag rescaled to 0..1.
- `screenYaw(camYaw, x, y) -> yaw`: the room / world yaw for a screen direction (y up = away from the camera).
- `turnStep(cur, want, dt, rate = 10) -> { yaw, gap }`: an eased signed turn; gap is the remaining |angle|.
- `walkFactor(gap) -> 0..1`: 1 when facing (gap < 0.6), a slow 0.25 while turning round (gap > 1.6), linear between.
- `zoomStep(z, deltaY) -> z` in [ZMIN 0.55, ZMAX 2.4]; `ZOOM0 = 1.45`. `clampInYaw(y) -> [-0.7, 0.7]`.

### Task 2: input plumbing — `src/touch.jsx`
- Mouse drags orbit (left or right button, 6 px threshold), and the wheel zooms (skipped in photo mode). The context menu is suppressed on the canvas. `onTap` treats the mouse like touch (fires on a clean release). `CAM.zoom` starts at ZOOM0.

### Task 3: outdoors — `src/App.jsx`
- A camera heading `CAMH.fwd` is transported along the sphere each frame; drag rotates it. stepPlayer uses moveIntent → a direction in the camera frame → turns P.fwd (turnStep) and walks (walkFactor). The Rig goal / look use the camera heading. `HOME.camFront()` sets the heading to look at her face.

### Task 4: indoors — `src/home/Room.jsx`
- Keyboard and stick both use screenYaw + turnStep + walkFactor. The camera orbit is `HOME.inYaw` (clampInYaw); zoom maps 0.55..2.4 to distance 2.25..4.3, centring on the room when wide. Entering resets inYaw; exit calls camFront.

### Task 5: verify — unit tests, lint, build, smoke `game.spec.js` (indoor + facing tests), screenshots of default outdoor / indoor views, exit framing, wide zoom. Update GAMEPLAY.md controls and the tutorial text.
