# Her house, part C: things she can use (stove, curtains, lamps, yarn ball)

## Why
Part A gave her body language; part C makes the furniture respond to her. Each interaction uses part A's pattern: press E,
she walks over, turns, does it. Wardrobe (outfits), fridge, coat stand (straw hat) and the desk journal are left for later.

## Goals
1. **Stove: add a log** (prompt in the evening / at night: dusk > 0.3 or night > 0.4). She picks a log from the firewood
   beside the stove (a log in her hands), turns to the stove, crouches and pushes it in. The fire flares (bigger flame,
   sparks, brighter floor glow) and settles back over ~3 minutes. If Mochi isn't asleep he walks to the hearth and sits
   facing the fire, then curls up there. By day the same spot says "Tidy the woodpile": a short crouch, no flare.
2. **Kitchen window: curtains.** Its cream curtains become animated. She stands at the sink, and E opens or closes them:
   she reaches up and the panels slide across. Closed hides that window's sunlight patch on the floor. Saved. Start open.
   (Changed from the sunny side window: that window sits in the cut-away front-left wall and the game camera only sees it
   edge-on, so curtains there were invisible.)
3. **Lamps: the desk lamp and the nightstand mushroom lamp.** E switches each on or off: she reaches out, a click, the
   bulb and its warm floor patch fade in or out. Saved. Start on (today's look). The hanging lantern stays automatic.
4. **Yarn ball: toss it.** Near the ball (on the floor, Mochi not already chasing it), E: she crouches, picks it up (it's in
   her hand), stands and tosses it ahead. Mochi gives chase with his existing chase / bat behaviour; if he's napping he
   only opens one eye half the time.
5. **Alcove wall fade.** The bed alcove's half-wall (with its shelf, picture and plant) fades to see-through when she's in
   front of the wardrobe, like the bath walls do in the bath.

## Non-goals
Wardrobe use, fridge, coat stand hat, desk journal, Mochi reacting to curtains (beam naps).

## Approach
Reuse part A's `goThen` and prompt hook in `Activities.jsx`. New per-room state in `HOME` (fire level, curtain and lamp
eased values) with the saved bits in `G.s.home = { curtains: bool, lamps: { desk: bool, night: bool } }`. Lamps and the
stove fire are found inside the baked props by `userData.prop` and given per-instance materials / scales. Curtains are new
animated meshes. Room.jsx's two lamp floor patches get their own materials driven by the lamp state; the stove patch
and Sunbeam read the fire level and the curtain value. The alcove reuses the bath walls' fade, factored into a shared hook.
Alternatives (new props per state, or rebaking props on toggle) cost a shader recompile or a rebake per toggle.
