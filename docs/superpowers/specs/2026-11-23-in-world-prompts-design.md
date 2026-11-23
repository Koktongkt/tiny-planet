# In-world action prompts and the gold outline: design

Status: **approved** by the owner (2026-11-23). Mockups: https://claude.ai/artifact/42D7HtpPdV34xcHDkLMaN1 (private
to the owner). Highlight test renders came from a throwaway spike, not in the repo.

## Why
Today the E prompt (`Prompt()` in `src/game/UI.jsx`) always sits at the bottom of the screen, far from the thing it is
about. The goal is to draw it in the world, where the traveller meets the person, pet or object, so the game feels
handmade and the player's eye stays on the scene. Ground items get a gold outline in place of the white ring at the
traveller's feet. The ring marks where to stand, not what you will pick up.

## Goals
- The action prompt floats over its target, in the Glass & Gold style, on desktop and phones alike.
- Two weights. Talking, petting, stations, doors and boards get the full head bubble. Quick pickups from the ground get
  a gold outline and, only some of the time, a small chip.
- The prompt stays readable and tappable wherever the target is: near the screen edge, off screen or behind the traveller.

## Non-goals
- No new item art. The ground-item revamp comes later and will revisit the outline and chip.
- No change to what each interaction does, its words, or its key bindings (E, F, G, R).
- Not several prompts at once. One target at a time, as today.

## Anti-goals (a failure even if it works)
- A prompt that jumps between items as you walk through a patch of flowers.
- Visual noise while gathering: bubbles popping on every berry.
- A highlighted item that is invisible because the traveller is standing in front of it.
- Phone tap targets under 44px, or a phone that loses the Action button.

## Approaches considered
For the prompt (mocked up as A to E in the artifact):
- **A, head bubble (picked).** Today's glass pill as a speech bubble over the target, with its tail pointing down.
  It reads like the villagers' "…" bubbles and keeps all of today's words and icons.
- B, gold coin beacon: the smallest footprint, but a small tap target on phones, and the faint coins need several
  targets at once.
- C, contact thread: the most literal, but too busy, and the chip lands on the traveller's feet when close.
- D, paper tag: the most handmade look, but a second visual language beside the glass HUD, and slower to read.
- E, ground ring: hides in grass and gets lost indoors.

For ground items: a full bubble everywhere (rejected: noisy, covers small items, jumps around) vs **two weights
(picked)**.

For the ground highlight (rendered in game): **gold outline (picked)**, warm glow (rejected: turns green bushes olive
and red berries orange), lift and sparkle (rejected for now: barely shows unless moving, busy while gathering).

## Design

### Which target
- Same single target as today (`G.near`, chosen in the interaction loop in `src/game/World.jsx`).
- **Facing counts.** Among candidates in range, prefer the one in front of the traveller (`P.fwd`), with distance
  as the tie-break. Exact weighting is the builder's to tune.
- **Sticky.** Keep the current target until another one is clearly better (a margin, not just closer by a hair).
  The prompt then does not flicker in dense patches.

### Every target knows where it is
Each `consider(...)` call (27 today: World, WorldC, World3D, museumC, Room, Activities, Dog) adds an anchor: a
world-space point just above the target (above the head for people and pets, the top of the board, just above a
mushroom). The prompt is placed by projecting that point to the screen every frame. It moves the DOM element
directly, the way `Talk.jsx` already places the "…" bubble, not through React state. A target with no anchor falls back
to today's bottom position, so the work can land call site by call site.

### Full weight: the head bubble
For everything that isn't a quick pickup: people, pets (pet, feed, bowl), the bench, the chest, doors, stations, plots,
the errands board, the museum, indoor activities, sheep, fishing and the water spring.
- Today's glass pill content (E coin, icon, verb, gold name, the "needs a tool" line) inside a bubble whose tail points
  down at the anchor. It pops in with a small bounce, then bobs gently. No motion when the player prefers reduced
  motion.
- The second action (F, today's `alt` chip) stacks above it as a smaller bubble.
- Phones: the same bubble, without the E coin (as today). The whole bubble is the tap target and stays at least
  44px tall. The pad's Action button stays.

### Light weight: ground pickups
For gather spots, forage, fireflies, dug-up finds and placed decor ("Pick up").
- **Gold outline** on the item itself: its ink-brown outline turns gold with a slow, soft pulse. This replaces the white
  ring (`G_RING` / the `__hl` group).
- **Small chip** just above the item: the E coin and the item's icon, no tail, fades in, no bounce. It shows:
  - for the first 3 pickups of each item type;
  - again when the traveller stands at an item for about 1.5 s without pressing E;
  - again when that item type hasn't been gathered for a full in-game day.
  Otherwise only the outline shows. The chip counts are saved, so the save gets a new field and a migration.
- **Traveller in the way:** when the traveller covers the item from the camera's view, a faint gold silhouette of
  the item shows through her, so the target never disappears.
- **Water** (lake and spring) has no item mesh, so it gets a small ring of gold sparkles on the water surface.
  Those spots use the full bubble anyway (fishing and filling the can).

### Edges and hiding
- Near the screen edge, the bubble is pushed back inside the frame and its tail keeps pointing at the target.
- Target behind the camera: the bubble sits at the bottom edge with its tail pointing down, toward where the target is.
- Panels, fishing, placing decor and talking hide the prompt, as today.

### Villagers
Talking is a separate system (`src/talk/Talk.jsx`) with its own "…" bubble and its own E and G handling; it is not
in `G.near`. **Decided:** villagers get the same head bubble. The "…" bubble becomes "E Talk to <name>" (person icon),
with "G Give a gift" stacked above it as the second action. The bubble is drawn by the same component as every other
prompt; Talk keeps its own key handling and its rule for when a gather target beats a villager. Phones: tapping the
bubble opens the talk, tapping the gift bubble opens the gift picker. The open dialogue box hides the bubble, as today.

## Constraints
- Smoke tests select `.tp-prompt` and `.tp-chip` (`stagec`, `stageb`, `hud.mobile`). `hud.mobile` taps the pet prompt
  as `.tp-chip`, and pets move to the full bubble. Keep the classes where the tests rely on them, or update those tests
  in the same change. Anything tappable stays at least 44px tall on phones.
- Mobile runs near its draw-call cap (see the forage notes in `World.jsx`). The outline adds draws to one item at a time
  only. The silhouette adds one more, and only while the traveller blocks the item.
- Gather props are baked into one body plus one hull mesh (`MergedProp`). The outline swaps the hull's material on the
  targeted item only, never on the shared material.
- HUD zoom (`--tpts`) and the touch layout (`src/game/ui.css`, `glass.css`, `touch.css`) still apply to the bubble.

## Left to the builder
- Facing weight, stickiness margin, anchor heights per target, the pulse speed, and the chip's fade timing.
- How "the traveller covers the item" is detected (for example, a ray from the camera to the item that hits her
  body first).
- Whether the bubble is one DOM element moved per frame (recommended) or several.
