---
name: chibi-character
description: Use when designing, building or changing any Tiny Planet human character in the Cozy Chibi style (her, villagers, Hoshino, Grandma and others): face, hair, ears, profile, body, outfit, props, or matching a concept or turnaround sheet. Starts from the locked template (her, pass 12) and its review workflow.
---

# Cozy Chibi character template

Her build (the player) is the **locked template** for every chibi character. Start from it; change only what the new
character's concept sheet asks for.

## Read first

1. `docs/characters/chibi-character-design.md`, section **"Character template (locked by KT, pass 12)"**: the locked
   values table, the reference sheets and the judging steps. Then sections 1-5 (style rules, technical recipe, workflow,
   adapting for a villager, pitfalls).
2. The template sheets: `docs/characters/ref/her-approved-turnaround.jpg` and `her-approved-face-angles.jpg`, and her
   golden reference `docs/characters/ref/her-turnaround-satchel.jpg`. Look at them before changing anything.
3. The code: `src/art/chibi/ChibiHer.jsx` (face, hair, ears, profile `MIDFACE`, body knobs, outfit), `src/art/chibi/satchel.js`,
   and the optional hooks in `src/GhibliPerson.jsx` (they default to the old look, so villagers stay unchanged).
4. Motion: `docs/characters/chibi-animation-guide.md`.

## Rules

- Do not start a villager or another character until KT asks. When KT asks, share her painter, hair builder and hooks;
  swap colours, locks and props rather than forking a new pipeline.
- New look options go behind optional `cfg.body` / `cfg.outfit` / `cfg.ext` fields that default to the old values.
- Keep to about 22 draw calls per character; merge pieces into one cel mesh and one ink hull.
- Profile shapes (`MIDFACE`) must stay broad (rx >= 0.02), and their shading ignores them (front view unchanged).
  Judge any face-shape change from 3/4 and deep 3/4 as well as the side.

## Review workflow

1. `npm run dev`, then `node tools/chibi-shots.mjs <outDir>` for the standard set (four-angle turnaround plus the face from
   ten angles). The studio camera aims at the body, so the plain side shot needs cropping to the face.
2. Show KT side-by-side sheets: concept or golden reference, previous, new. For taste calls, offer a ladder of small,
   equal steps and let KT pick; commit only the chosen one (keep the rest as patches).
3. Check the game camera (`?view=hero`) and a walk pose (`?view=charstudio&pose=walk&freeze=1.2`).
4. `npm run build` and `node --test tests/unit/*.test.mjs` must pass.
5. Record the outcome in the design doc (what changed, the numbers, what KT rejected and why).
