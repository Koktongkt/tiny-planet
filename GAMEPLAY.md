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

## Persistence
- Saved to localStorage under `tinyplanet.save.v1`: inventory, discoveries, tools, placements, unlocks, taken spots, day and chest.
- Items respawn at each in-game sunrise (one day is 3 minutes).
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
| `?nosave` | Don't save |
| `?nogame` | Turn the game layer off |
| `?decor=demo`, `?place=chime` | Demo placements / start placing |
| `?pick=0.45`, `?fish=1`, `?craft=jam` | Freeze the animation for screenshots |

## Loading screen
- The loader is inline in `index.html` (about 4.9 KB gzipped, plain HTML, CSS and SVG). It paints before any JS or WebGL runs.
- Progress shows as a leafy loading bar with the traveller walking along its top.
- It reports real stages, weighted by their measured share of a Fast 3G + 4× CPU load:

  | Stage | Weight | What it covers |
  |---|---|---|
  | Scripts | 20% | Byte-weighted from Resource Timing, using the chunk manifest the build injects |
  | Fonts | 1% | Fredoka |
  | Planet | 31% | Building the planet |
  | Traveller | 7% | Baking the traveller |
  | Shaders | 4% | Shaders precompiled in 16 batches with `renderer.compileAsync` |
  | First frame | 37% | The first rendered frame |

- When it reaches 100% it shows **Press to enter**. Enter, Space, a click or a tap all work; the key that enters doesn't reach the game. The loader then fades out.
- After the first frame, Gather & Craft (World + UI chunks), the far zones and the villagers load in idle time. Villagers bake one per idle slot.
- Debug params:
  - `?enter`: enter automatically when ready (screenshot tooling uses this).
  - `?bootpause=shaders`: hold the real loader state just before the first frame.
- Scripts:
  - `node shoot-loader.mjs [url] [dir] [prefix]` takes the loader shots on a throttled profile.
  - `node measure.mjs [port]` reports the local time to first frame.
