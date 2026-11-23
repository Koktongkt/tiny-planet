# In-world action prompts: decisions so far (parked)

Status: **parked**. Waiting on the ground-item art and highlight revamp; resume after that lands.
Mockups: https://claude.ai/artifact/42D7HtpPdV34xcHDkLMaN1 (private to the owner)

## Why
Today the E prompt (`Prompt()` in `src/game/UI.jsx`) always sits at the bottom of the screen. The goal is to draw it in the
world, where the traveller meets the person, pet or object, in the Glass & Gold style.

## Decided
- **Style A, the head bubble**, for people, pets, stations, doors and boards: today's glass pill becomes a speech bubble
  floating over the target, with a tail pointing down at it. The F action stacks above it as a smaller bubble. It pops in
  and bobs gently.
- **Two weights.** Things you pick up from the ground (gather spots, forage, dug-up finds, placed decor) get a light
  marker instead of the full bubble: the gold shimmer ring under the item, plus a small chip with the E coin and the
  item's icon. It fades in and doesn't move.
- **Ground chips show less often.** The ring always shows. The chip is a reminder that appears only some of the time
  (proposal below).
- Only one prompt shows at a time, as today: the nearest thing in range (`G.near`, set in `src/game/World.jsx`).

## Proposed, not yet confirmed
- Chip reminder rule for ground items: show the chip for the first few pickups of each item type (say 3). After that, show
  the ring only. The chip comes back when the player stands next to an item for about 1.5 s without pressing E, or when
  they haven't gathered that item for a long while (say a full in-game day).
- Stickiness: keep the prompt on its current target until another target is clearly closer, so it doesn't jump between
  items in a patch of flowers.
- Small or floating things (fireflies) anchor just above the object. Near the screen edge, the bubble slides back inside
  the frame and its tail keeps pointing at the target.
- "Needs a tool" state: the same bubble with a greyed coin and a soft red line naming the missing tool.

## Still open
- Phones: same in-world prompt with the whole bubble as the tap target, or keep the bottom button?
- When the target is off screen or behind a wall, should the prompt go back to the bottom of the screen?
- The ground-item chip and ring should be designed with the new highlight style once that revamp is done.
