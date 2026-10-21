# Tiny Planet: Gather & Craft

## Controls
| Action | Keyboard | Touch |
|---|---|---|
| Walk | WASD / arrow keys | Tap the ground |
| Jump | Space | |
| Gather / interact | E | Tap the prompt, or tap a prop (you walk to it and gather) |
| Bag | B / I / Tab | Bag button |
| Recipes | C | Recipes button |
| Fishing | E / Space / Enter | Tap the bar |
| Placing decor | R rotates, E/Enter places, Esc cancels | Placement bar buttons |
| Planet view | V | |
| Door (go in / out) | E at the door | ✋ Action, or tap the prompt |
| Pet Mochi (cat) | E near him, indoors | ✋ Action |
| Throw a stick for Pip (dog) | E near him, outdoors | ✋ Action |
| Walk indoors | WASD / arrows (same as outside) | Stick (screen-relative), or tap the floor |

## Gatherables
| Zone | Items |
|---|---|
| Forest | Wood, pinecone, mushroom, acorn, moss (plus a starter cluster at the forest edge toward spawn) |
| Meadow | Wildflower, herbs, berries, dandelion fluff, and wool from 4 wandering sheep |
| Lake and harbour | Fish (needs the Rod), shell, reed, clay, driftwood |
| Terraces | Rice, bamboo, tea |
| Waterfall cliff base | Stone, crystal, and spring water (needs the Watering Can) |
| Ruins | Old coin, pottery shard, and glowing moss (night only; brighter and visible from farther with the Lantern) |
| Meadow, village and lakeshore | Fireflies (night only) |

**Fishing minigame:** a fish marker swings along the bar. Press while it is inside the green zone. You get 3 tries.

## Crafting
The bench is beside the house marked **Home**, near spawn. The Recipe Book shows every recipe:
- Recipes whose ingredients you haven't discovered show as "???".
- Known recipes show counts and what's missing.
- The Craft buttons only appear at the bench.

| Group | Recipe | Ingredients |
|---|---|---|
| Tools | Rod | 2 wood, 3 reed |
| Tools | Watering Can | 3 clay |
| Tools | Lantern | 2 bamboo, 3 fireflies |
| Food | Onigiri | 2 rice, 1 fish |
| Food | Mushroom Soup | 3 mushroom, 1 water |
| Food | Berry Jam | 4 berries |
| Food | Herbal Tea | 2 herbs/tea, 1 water |
| Decor | Wreath | 5 flower, 1 reed |
| Decor | Moss Lamp | 2 moss, 2 glowmoss, 1 clay |
| Decor | Basket | 4 reed, 2 bamboo |
| Decor | Wind Chime | 4 shell, 1 driftwood, 1 reed |
| Unlock | Rope Bridge | 6 wood, 6 reed, 4 stone |

The Rope Bridge climbs the cliff on the side away from the lake. At the top is a picnic spot with a chest (1 Sky Seed and 3 Crystal, one time only).

**Decor:** tap a decor item in the Bag to place it. A ghost preview appears ahead of you. It is green when valid (within about 2.2 units of Home) and red otherwise. Stand next to placed decor and press E to pick it back up.

## The daily loop (Stage B)
- **Garden:** six beds left of the Home sign. You start with 2 Seed Packets. Press E at an empty bed to plant a Seed Packet (turnip, carrot or herbs) or F for a Sky Seed (from the cliff-top chest). Water each bed once a day with the Watering Can. A bed that starts the morning watered grows one stage (seed → sprout → young → mature → ripe). Herbs take 2 watered days, turnips 3, carrots 4 and the Sky Seed 5. Dry days only pause growth. A ripe crop left for 3 mornings withers; clear the bed and replant. The harvest is 2 turnips, 2 carrots, 3 herbs, or 3 skyberries plus a Sky Seed back.
- **Gifts and friendship:** near a villager press **G**, or tap **♥ Gift** in the dialogue box, then pick something from your bag. Each villager has loves, likes and dislikes based on their profile: love +1 heart, like +½, neutral +¼, dislike −¼, on a 0–5 scale. You can give one gift per villager per day. Hearts appear on the dialogue name plate, and friendlier villagers have extra lines. At 3 hearts they give you 2 Seed Packets, and at 5 hearts a Sky Seed.
- **Errands board:** at the edge of the village square. One request on day 1, then two a day, pinned up each morning; unfinished ones are taken down. Take a note, bring the items, and hand them over for coins, seeds and hearts. From day 3, requests can ask for crops and cooked food.
- **New recipes:** every item that had no use now has one. Acorn Cookie (acorns + rice), Pine Needle Tea (pinecones + water), Seed Packet (fluff + an Old Coin), Fluff Pillow, Wool Scarf, Crystal Lamp and Shard Charm (keepsakes that make good gifts). The crops are used too: Berry Jam from skyberries, Mushroom Soup from a turnip, a carrot and water, and herbs for tea.
- **Food buffs:** tap a food in the Bag to eat it. *Swift* (cookie, onigiri, grilled fish) makes you walk and run 15% faster. *Cozy* (pine tea, herbal tea, soup) makes friendship from gifts grow 1.5× faster. *Lucky* (jam, skyberry) gives a 35% chance of an extra item when you gather. A buff lasts 2 to 3 in-game hours and is shown as a chip under the clock. Eating the same kind again refreshes it.
- **Sound and settings:** ambient sound (wind, birds, river, lake, insects at night) and a soft piano loop start on your first tap or key press. The ⚙ Settings button has volume, music, mute all and text size (Small/Normal/Large/Huge).

## Persistence
- Saved to localStorage under `tinyplanet.save.v1` (the key keeps its historic name): inventory, discoveries, tools, placements, unlocks, taken spots, the day counter, the chest, Studio's plant waterings, and the **clock**.
- Every save carries an explicit format version `v` (currently **3**). On load the save runs through an ordered migration chain in `src/save/schema.js` (v1 → v2 → v3), then missing or broken fields are filled from the defaults. A save without `v` is treated as v1. A save from a newer build still loads (fields it understands are kept).
- **Time of day carries over.** The sun phase (`clock.a`) is saved every 15 s and when the tab is hidden or closed, so after a reload the day continues where it was: regrowth keeps going and the clock shows the right day. One in-game day is one real hour (`?daylen=<seconds>` to change it).
- Save v3 adds `garden` (plots), `friends` (hearts, gifted today), `errands` (today's notes), `buffs` and `settings`. Old saves start with these empty on the day they're on.
- Items respawn at each in-game sunrise (a spot taken on day *d* is back on day *d*+1).
- **Sleep** in the bed skips to the next morning and advances the day (Day *n* → *n*+1), also after a reload. A nap skips two hours.
- Old v1 saves (day counter, no clock) resume on their saved day at the default early-afternoon time.
- With `?t=` or `?phase=` the lighting is pinned and the clock is neither advanced nor saved.
- To start over, use Bag → Reset save, or open the URL with `?reset`.

## Debug URL params
| Param | Effect |
|---|---|
| `?give=all\|some\|id:n,...` | Fill the bag |
| `?unlock` | Rope bridge is built |
| `?ui=bag\|recipes\|craft` | Open a panel |
| `?at=forest\|meadow\|lake\|harbour\|terraces\|cliff\|ruins\|home\|decor\|bridge\|onbridge\|top` | Start at a spot |
| `?t=day\|dusk\|night`, `?phase=x` | Set the time of day |
| `?camd=0.8` | Camera distance |
| `?nosave` | Don't load or save (tests and screenshots) |
| `?reset` | Delete the save on load |
| `?daylen=60` | Day length in seconds (default 3600) |
| `?view=orbit\|lineup\|charstudio` | Planet view / villager line-up / character turntable (the last two are lazy dev chunks) |
| `?nogame` | Turn the game layer off |
| `?decor=demo`, `?place=chime` | Demo placements / start placing |
| `?pick=0.45`, `?fish=1`, `?craft=jam` | Freeze the animation for screenshots |

## Loading screen
- The loader is inline in `index.html` (15.4 KB, or 6.2 KB gzipped) and paints before any JS or WebGL runs. Its only extra file is the 24 KB Cormorant italic woff2, which is preloaded.
- Progress drives the clouds parting, the ink planet drawing itself and the watercolour washes. A small-caps stage line names the current stage.
- It reports real stages, weighted by their measured share of a Fast 3G + 4× CPU load:

  | Stage | Weight | What it covers |
  |---|---|---|
  | Scripts | 20% | Byte-weighted from Resource Timing, using the chunk manifest the build injects |
  | Fonts | 1% | Fredoka |
  | Planet | 31% | Building the planet |
  | Traveller | 7% | Baking the traveller |
  | Shaders | 4% | Shaders precompiled in 16 batches with `renderer.compileAsync` |
  | First frame | 37% | The first rendered frame |

- When it reaches 100% it shows **Enter the world**. Enter, Space, a click or a tap all work; the key that enters doesn't reach the game. An iris then opens from the planet into the world.
- After the first frame, Gather & Craft (World + UI chunks), the far zones and the villagers load in idle time. Villagers bake one per idle slot.
- Debug params:
  - `?enter`: enter automatically when ready (screenshot tooling uses this).
  - `?bootpause=shaders`: hold the real loader state just before the first frame.
- Scripts:
  - `node shoot-loader.mjs [url] [dir] [prefix]` takes the loader shots on a throttled profile.
  - `node measure.mjs [port]` reports the local time to first frame.

## Home and pets
- **She starts inside her house.** It's one cozy room: a bed with a quilt, a kitchen counter, a wood stove with a steaming kettle, a table with a teapot, a bookshelf, plants, and warm light falling through the window onto the floor.
- **The interior** is a real room at the planet's centre (`src/home/Room.jsx`). While she is inside:
  - The camera renders only layer 5, which holds the room, her and the lights. The outside world costs nothing and can't show through.
  - The interior camera stays inside the walls. It eases after her and leans toward Mochi when he's close.
- **The door:** press E at the blue door (inside) or at the Home house's front door (outside). A warm iris closes, she crosses over, and the follow camera lands behind her.
- **Decor:** placing a decor item from the Bag while indoors puts it on the floor in front of her. The ghost preview is green on free floor. The item is saved in `placed` with an `in: [x, z]` room position. Press E next to it to pick it up again.
- **Mochi, the cat** (`src/pets/Cat.jsx`):
  - He stays indoors and runs a small state machine: nap (curled in the sunbeam, or on the bed), groom, stretch then yawn, chase the yarn ball (stalk, butt-wiggle, pounce), sit on the windowsill, knead the quilt, and wander.
  - He hops up onto and down from the bed and the sill.
  - Ear twitches, blinks, breathing and tail flicks are always layered on top.
  - When she's near, he sometimes comes over and weaves around her ankles. Other times he ignores her.
  - Press E to pet him. He purrs and shows hearts, or now and then flicks his tail and looks away. Petting a napping Mochi wakes him with a stretch first.
- **Pip, the dog** (`src/pets/Dog.jsx`):
  - He follows her outside at a loose distance, switching sides now and then. He walks, trots or runs (a bounding gait) to catch up.
  - He steers on the sphere around the world's own colliders: trees, rocks and houses.
  - When she stops he sits, and after a while lies down. While idle he sniffs, digs, rolls in the grass, or chases a butterfly or a little ground bird.
  - He barks at sheep ("Woof!") and splashes in the lake, then shakes himself dry.
  - Digging sometimes turns something up (acorn, stone, coin, shell…). Press E to gather it into the Bag.
  - Fetch: press E near him to throw a stick. He races after it, brings it back and drops it at her feet. Press E again to throw it again.
  - Tail wag follows his mood: fetch and greetings raise it, waiting lowers it.
  - While she's inside, he waits by the front door and greets her with bouncing and wagging when she comes out.
- **Both pets** share a procedural quadruped rig (`src/pets/Quadruped.jsx`). It uses the same cel shader and ink hull as the characters. Poses blend through springs, and gaits are diagonal for walking and bounding for running.

| Param | Effect |
|---|---|
| `?out` | Start outside, by the front door |
| `?cat=nap\|bed\|groom\|stretch\|chase\|sill\|knead\|rub\|pet\|ignore` | Hold the cat in a state |
| `?dog=sit\|sniff\|dig\|roll\|bark\|splash\|chase\|fetch\|wait` | Hold the dog in a state |
| `?petcam=a`, `?dogcam=a` | Close debug camera on the cat or dog, from angle `a` |

Screenshots: `node shoot-pets.mjs [names]`. It needs the dev server on `PORT` (5195 by default) and writes to `/workspace/tiny-planet-perf/home-pets/`.
