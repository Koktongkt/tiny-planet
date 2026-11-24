# Her house, part A: she lives there (walk-to, glances, idle moments)

## Why
The interior looks good but the activities feel staged. She snaps to each activity, and between activities she stands still
like a mannequin waiting for input. Part A makes her own body language carry the feeling that this is her home.
(Parts B to E are left for later: the room remembering, new furniture interactions, Mochi reacting, layout fixes.)

## Goals
1. **Walk to the activity.** Pressing E at the bed, stove, table, tub, armchair, plants or Mochi's bowl makes her walk the
   last steps to the standing spot, turn to face it, and then start. No more snapping.
2. **Small reactions inside.** While she stands or walks indoors, she glances at Mochi when he's close and doing
   something, at the window in daylight, and at the stove fire in the evening. Her indoor idle fidgets suit a room
   (no kicking pebbles), and she hums sometimes when she's near the warm stove.
3. **Idle moments, two tiers.**
   - In place, after about 6 s of standing: the existing fidget system with an indoor set.
   - A short walk, after about 15 s: she walks to one interesting spot within about two steps (≈0.55 room units) and does
     a small thing there. At most once per idle stretch. Then she stays and goes back to in-place fidgets.

## Non-goals
- Rug ripples (left out on purpose).
- New furniture interactions, room memory or Mochi reactions (parts B to D).
- Pressing E from across the room. Prompts stay proximity-based; the walk covers the last steps only.

## Anti-goals
- The game moving her when the player wants control: any key, stick or tap cancels an idle walk or idle pose at once.
  If she's sitting on a pouf, she stands (a quick ease) and walks.
- Wandering. One idle walk per idle stretch, short range only, never across the room.
- Her standing on the floor in a pose meant for furniture, or walking through furniture.

## Idle spots (room-local, validated with `freeAt` at load; any spot that isn't free is dropped)
| Spot | What she does |
|---|---|
| Pouf L / Pouf R | Sits on it, hands on her knees, looks around. Holds until input. |
| Door flower pot | Leans in to smell the flowers. |
| Big plant | Reaches out and touches a leaf. |
| Wall bookshelf (by the stove) | Looks up at the books, a hand to her chin. |
| Wood stove (evening/night) | Holds her hands out to the fire. |
| Sunny window (daytime) | Looks out of the window. |

The picture frame from the earlier suggestion is dropped: it hangs on the bed side of the alcove, behind the bed, where
she can't reach.

## Interplay with the existing life layer
- The outdoor floor-sit (after 18 s idle) is kept indoors only on the round rug. Lying back to watch the sky is off indoors.
- No idle walk while Mochi is weaving round her ankles or being petted (or his "Pet" prompt is up), while a panel is
  open, or while an activity is running. (Other prompts don't block: the plant and bed prompts cover the spots beside
  them, and after 15 s still the player clearly isn't about to press E.)

## Approaches considered
1. **Reuse tap-to-walk's `hp.target` plus a small pure "home life" module (chosen).** Straight-line walking with the
   existing collision slide, a stuck timer that falls back to easing her the rest of the way, and an idle director. Cheap
   and fits the existing code.
2. Real pathfinding (a grid A* over the room). Not needed: walks are short (the prompts only show within ~0.3) and
   idle walks are within ~0.55, so a straight line nearly always works.
3. Animating the activities as scripted timelines. A bigger rewrite of Activities.jsx for the same visible result.

## Builder's calls
- Exact timings, pose angles and the indoor fidget set.
- Spot stand distances and the facing angles.
