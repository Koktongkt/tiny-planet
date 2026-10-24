# Stage E contract — energy and the bicycle

Gentle urgency. Walking is free. Skipping food makes the day a little harder. Nothing soft-locks.

## Save v5

- `energy`: number, clamped to **0–100**. Fresh saves and migrated v4 (and older) saves start at **100** unless the blob already carried a finite `energy`.
- The bicycle is not its own field. Crafting it sets `tools.bike = true` forever, same as the rod, can and lantern.
- Migration: `src/save/schema.js`, one step `from: 4`. Older saves still walk v1 → v2 → v3 → v4 → v5.

## Energy numbers

| Source | Change |
|---|---|
| Walking, riding, sleeping, napping | 0 |
| Awake time | **1.5 per in-game hour** (only while the clock is moving; a jump longer than one hour is not billed) |
| Gather / forage | 2 |
| Craft | 3 |
| Fish, dig, garden (plant / water / harvest), cook at the stove | 4 |

Eating a Food-category item restores energy on top of its existing buff. Raw food restores less than a cooked meal:

| Item | Restore | Notes |
|---|---|---|
| Skyberry | 14 | raw |
| Herbal tea, pine needle tea | 20 | cooked |
| Berry jam | 22 | cooked |
| Acorn cookie | 28 | cooked |
| Onigiri | 32 | cooked |
| Grilled fish | 34 | cooked |
| Mushroom soup | 36 | cooked |

Activities still succeed at 0 energy. They just cannot go below 0.

Movement (outdoors, indoors, and in the museum):

- energy **> 25**: ×1
- energy **≤ 25**: ×0.75
- energy **0**: ×0.55 (still walks)

The Swift buff (×1.15) still stacks. It is applied with the energy multiplier, not instead of it.

## Bicycle

Recipe id `bike`, category Tools, makes tool `bike`.

- Needs **wood 4 + stone 2 + pottery shard 1**.
- There is no coin alternate. Recipe `any` only adds up one shared count, so it cannot say "2 coins or 1 shard".

Craft once at the bench. Press **R**, or the **Ride** chip, to mount and dismount. Riding multiplies move speed by **1.7** (a stroll on the bike is about as fast as running on foot; holding Shift while riding is much faster). No separate combat or vehicle physics. The mesh is a lazy placeholder: **3 draw calls** (frame + two wheels, one shared material) and only while she is mounted. Zero draw calls when she is off it.

Mount is refused, and an existing ride is ended, when she is:

- indoors at home
- in the museum
- on the train
- fishing
- in photo mode

Opening the bag or placing decor blocks a *new* mount and does not kick her off. The bike is hidden whenever a hard block is active.

## How to try

- `?give=wood:4,stone:2,shard:1` then craft **Bicycle** at the bench, then **R**.
- `?give=bike` owns it immediately.
- Eat from the Bag. The toast includes the energy gained. The bar under the clock is the meter (green, amber at ≤25, empty track at 0). On touch it sits in the clock's padding, so the five HUD buttons stay clear of the clock.
