# Stage F contract — cooking mini-game

A short, cozy cooking game for every Food recipe. It always makes the dish. It never fails and never eats the ingredients twice.

## Where it opens

Every recipe with `cat: 'Food'` opens the mini-game, at the bench and at the stove. The tea table does too, when she actually brews the herbal-tea recipe. A barley tea with no ingredients stays a quiet sip and does not open the game.

The step lives on the recipe as `cook`. Anything new in Food with no `cook` field stirs.

| Recipe | `cook` | How you play |
|---|---|---|
| soup, soup_veg, jam, jam_sky | stir | Draw circles in the pot, or hold Space. Fill the meter before the bubbles reach the rim. Perfect is a calm middle pace. |
| grilledfish | flip | The underside browns. Tap, click, or press Space in the golden band. |
| onigiri, acorn_cookie | press | Three pulses. Tap or press Space as each ring closes. Perfect is all three. |
| teacup, pine_tea | pour | Hold to pour, release on the cup line. Perfect is inside the band. |

About 3 to 4 seconds. One finger or one key. `prefers-reduced-motion` (and the Calmer motion setting, when it is on) stretches the same steps by 1.6 and slows the motion.

## What you get

Ingredients are spent the same way as before, and only when the dish is done.

| Where | Energy | Notes |
|---|---|---|
| Stove | cook, **4** | unchanged |
| Bench Food | craft, **3** | the mini-game does not add a second cost |
| Tea table, when a cup is brewed | 0 | same as before |

A normal result is the usual dish. Skip, and Auto-cook, are always normal. A perfect result is a separate item id, `{makes}_perfect`. It stacks apart from the normal dish, keeps that dish's food buff, and restores `round(base × 1.25)` energy.

| Dish | Normal | Perfect |
|---|---|---|
| Herbal tea, pine needle tea | 20 | 25 |
| Berry jam | 22 | 28 |
| Acorn cookie | 28 | 35 |
| Onigiri | 32 | 40 |
| Grilled fish | 34 | 43 |
| Mushroom soup | 36 | 45 |

The bag marks a perfect dish with a small sparkle. Skip is always on the panel. Settings → Auto-cook (off by default) never opens the panel.

## Save v6

- `settings.autoCook`: boolean, default **false**.
- Perfect dishes are ordinary bag ids (`soup_perfect`, and the same suffix for every cooked food). They are not a new list field.
- Migration: `src/save/schema.js`, one step `from: 5`. Older saves still walk up to v6. Energy, bag, tools, and settings are kept. A missing `autoCook` becomes false; an explicit true stays true.

## Shape

One lazy chunk, fetched the first time she cooks (Auto-cook does not need it). Shared shell: open and close, timer, pointer input, scoring, Skip, result toast. The four steps plug into that shell. Drawn in the DOM and SVG, so it adds no draw calls. While it is open the WebGL loop idles (`frameloop: 'demand'`) and the HUD, title, and touch pad are hidden. `touch-action: none` and the gesture events are swallowed. Closing puts the loop and the HUD back.

Sounds `cook_stir`, `cook_sizzle`, `cook_pour`, and `cook_perfect` are procedural and live with that chunk. Their numbers sit in `src/game/cook/sfx.js`. The overlay calls `window.__tpAudio?.fx(name)`.

## How to try

- `?give=mushroom:3,water:1` and cook soup at the stove, or craft it at the bench.
- `?cook=stir` (also `flip`, `press`, `pour`) opens that step with nothing spent. `?cookResult=perfect` or `window.__tpCook.force('perfect'|'normal')` fixes the result.
- `window.__tpCook.open('flip')`, `.skip()`, `.finish()`, `.state`.
