# Stage C — Studio art + audio plan (input for stage-c-contract.md)
Base: stage-c 835ebc1 (worktree /workspace/tiny-planet-artc, branch art-c; rebased). Same rules as Stage B: Studio modules are
prop/getter-driven and stateless; Codor owns state, saves, rules, App/zones wiring, tests, CI. Everything lazy, 0 bytes
added to the startup chunk (index ~70 KB gz, cap 80). The player is "her"; pets are Pip (Shiba) and Mochi (cat).

## BUILT on art-c (items 1–3): final ids + signatures  (supersedes the "proposed" notes below for these items)
Everything below is lazy: nothing new is imported by the startup chunk (only `registerIcons` was added to game/icons.jsx: +16 B gz).

### 1. Tutorial note — `src/ui/tutorial/` (index.js re-exports)
- `TUTORIAL_STEPS`: ids `move, look, gather, craft, talk, garden, sleep` — `{ id, icon, text, textTouch? }` (touch text on move/look/gather/craft)
- `TUTORIAL_SIGNER = { npcId: 'grandma', name: 'Grandma Fuku' }` (retired seamstress → running-stitch progress motif)
- `withProgress(done: {[id]: bool} | Step[]) → Step[]` with `done` flags
- `<TutorialNote steps touch open onToggle(nextOpen) onDismiss signer className style />` — parchment + washi tape, ink doodles, ticks + ink strike, stitch progress; folded = pinned slip "Grandma's note n/7"
- `SettingsPanel` new optional prop `onTutorial` → row "Grandma's welcome note — Read again"
- Save shape suggestion (Codor): `G.s.tutorial = { done: {id: true}, dismissed, open }`

### 2. Fish — `src/game/fishTable.js`, `src/game/itemsC.js`, `src/art/fish/`, `src/ui/fish/`
- Species ids (12): `minnow, crucian, koi, catfish, lake_lord, ayu, char, loach, mackerel, sea_bream, flounder, pufferfish`
- Rare items (own inventory items, cat 'water'): `RARE_FISH_ITEMS = ['koi', 'sea_bream', 'lake_lord']`; all other catches add generic `'fish'`; collection `G.s.fish[id] = { count, best }`
- Spots `lake | river | harbour`; seasons `spring|summer|autumn|winter`; period = periodAt(); weather `clear|rain` via `weatherKind(weatherFor(day))` (drizzle/rain → rain)
- `fishFor({ spot, season, period, weather }) → FishSpecies[]`; `rollFish(ctx, rnd?) → { fishId, size(cm, 0.1) } | null` (rarity weights common 10 / uncommon 4 / rare 1.2 / legend 0.25; rain-only ×1.5; big sizes rarer). Every spot × season × period × weather has ≥1 species (unit-tested).
- Availability table (draft for Codor to balance):

| id | rarity | cm | spots | seasons | time | weather |
|---|---|---|---|---|---|---|
| minnow | common | 4–9 | lake, river | any | any | any |
| crucian | common | 10–26 | lake | any | morning/day/evening | any |
| koi | rare | 30–72 | lake | spring, summer | day | clear |
| catfish | uncommon | 30–62 | lake, river | summer, autumn | evening/night | rain |
| lake_lord | legend | 96–142 | lake | autumn, winter | night | rain |
| ayu | common | 12–26 | river | spring, summer | morning/day | any |
| char | uncommon | 18–36 | river | autumn, winter | morning | clear |
| loach | common | 8–16 | river, lake | spring–autumn | any | rain |
| mackerel | common | 25–42 | harbour | any | any | any |
| sea_bream | rare | 30–56 | harbour | spring, summer | morning | clear |
| flounder | uncommon | 24–46 | harbour | autumn, winter | day/evening | any |
| pufferfish | uncommon | 10–26 | harbour | summer, autumn | evening/night | clear |

- itemsC: `FISH_TEXT[id] = { name, desc }`, `fishName(id)`, `RARITY_LABEL`, `ITEM_LABELS_C` (3 rare items, merged into ITEMS on import)
- Art: `buildFishGeometry(id, lod = 'hi'|'lo')` (cached, non-indexed; attrs color/aBelly/aC2/aFP/aPat; `userData.tris`), `fishMaterial()` (ONE shared MeshToonMaterial, pattern + swim wiggle in shader, `FISH_U.uTime = wind.time`), `fishInkMaterial(thick)`, `setFishSwim(v)`
- `<FishModel id size=30 scale=0.35 quality ink />` = 2 draw calls; `<FishInstances id items=[{ pos, quat, s }] quality ink />` = 2 draw calls per species regardless of count
- Triangles hi/lo: minnow 252/116, crucian 252/116, koi 266/130, catfish 262/126, lake_lord 266/130, ayu 252/116, char 256/120, loach 262/126, mackerel 256/120, sea_bream 260/124, flounder 300/168, pufferfish 286/120 (+ ink hull ≈190–285). Lineup of all 12: 24 calls / 5,644 tris (lo: 2,808). School of 60 mackerel: 2 calls / 26,880 tris.
- Icons: `FISH_ICONS`, `registerFishIcons()` (auto on import) → `<Icon id="koi" />` etc. (icon id = species id); game/icons.jsx gained `registerIcons(map)`
- `<CatchCard fish(id|species) size isNew isRecord where period weather onClose onRelease? />` — Esc/Enter/E/Space close; "Let it go" only when onRelease is passed

### 3. Photo mode — `src/ui/photo/`, `src/art/poses/`
- `FILTER_IDS = ['none','sunny','sepia','ink','pastel','twilight','film']` (labels Natural, Sunny, Old letter, Ink & wash, Pastel, Twilight, Summer film)
- `filterCss(id)`, `applyLiveFilter(canvasEl, id) → cleanup`, `filterMatrix(id)`, `layerStyle(layer)`, `gradeCanvas(src, id, { frame, caption, maxW }) → canvas`, `photoThumb(canvas, maxW = 320, q = .72) → JPEG dataURL`
- Live look = CSS filter on the WebGL canvas + fixed overlay layers (tint/vignette/grain/leak) — no composer pass. Saved photo = same look baked by gradeCanvas (verified: live and saved match).
- **Mount note:** PhotoMode's overlay layers use mix-blend-mode, so mount `<PhotoMode>` where no ancestor creates a stacking context (z-index/transform/opacity/filter) above the canvas, otherwise the blend only sees transparency.
- `<PhotoMode value onChange onShutter onClose touch pets={{ pip, mochi }} lastShot={{ url, caption }} defaultTab='filters'|'her'|'pets' />`, `PHOTO_DEFAULT = { filter, pose, petPose: { pip, mochi }, pair, frame, grid, hideUI }`. Keys: Space/Enter shutter, 1–7 filter, G grid, F frame, H hide UI, Esc/P close.
- Her poses: `HER_POSE_IDS = ['stand','wave','peace','sit','look_up','twirl','kneel','hold_fish']`, registered on import as `POSES['photo_<id>']`; `holdHerPose(id)` / `releaseHerPose()`
- Pets: `PET_POSES.pip` sit, lie, happy, tilt, beg, play_bow, roll; `PET_POSES.mochi` sit, lie, happy, tilt, loaf, stretch, roll, paw_wave (POSE0 keys only, unit-tested); `applyPetPose(st, pet, id, POSE0)`
- Pairs: `PAIR_POSE_IDS = ['side_by_side','cuddle','playtime','pose_off','naptime']`; each `{ label, her, pip: { pose, at: [right, towardCam], yaw }, mochi: {...} }` (offsets in her local frame)

### Chunk sizes (gzip -9) — startup index: 69,160 B (cee1c89) → 69,176 B (art-c), budget 70 KB target / 80 KB ceiling
Lazy chunks when imported via `lazy()/import()` (measured with a temp entry): TutorialNote 2.5 KB (+css 1.4), CatchCard 1.6 KB (+css 1.2; pulls fish icons 2.8, itemsC 1.0, fishTable 0.9), FishModel 5.6 KB (+fish art 0.7), PhotoMode 4.0 KB (+css 2.0; pulls herPoses 1.1, petPoses 0.9). SettingsPanel chunk 1,968 → 2,092 B.

## BUILT on art-c (items 4–5): seasons + rain / puddles / rain audio
Hooks come from Codor's `systems/weather.js` (`applyTo(T, phase)` every clock tick via liveC): `T.season`, `T.seasonW` = **four** weights `[sp,su,au,wi]` (sum 1; last day of a season cross-fades), `T.kind` `'clear'|'rain'`, `T.rain`, `T.wet`. Art reads them defensively in `art/season/hooks.js` (`readWeather` / `hookWeights`; also accepts a legacy scalar `seasonW`).

### 4. Seasons — `src/art/season/`, `src/game/forageTable.js`, `src/art/forage/`, `src/game/itemsC.js`
- `patchSeason(mat, kind, {cap?, wet?})` / `patchWet(mat)` / `patchSurface` — chains existing `onBeforeCompile` (paint/ink/wind/foliage). Cap = snow on upward normals (`#define S_CAP`); default `cap = !isTouchTier()`. Key tag `|s:<kind>[c][w]`.
- Kinds: `ground, grass, leaf, ever, flower, stem, roof, cap`. `classify(mesh)` maps by existing shader keys (no startup tags). `seasonizeScene(root,{gl,camera,cap,wet})` → `{patched, rescan(), restore()}`; warm-compiles via `gl.compileAsync` with a 1×1 linear RT bound; rescan every 2 s for Cull remounts.
- Shared uniforms `SU` (`uSeason` vec4, `uSnow`, `uWet`, `uRain`, `uSunV`, `uSky`, `uSDay`, `uNight`); `tickWeather(camera,dt)` once per frame.
- `<Drift get count box/>` — 1 draw call, GPU-animated petals / summer pollen+fireflies / autumn leaves / winter snow (density ↑ with rain in winter). Hidden indoors / orbit (`defaultAnchor`).
- `<SeasonLayer cap wet drift rain puddles spots get onReady/>` — mounts inside the planet group; seasonizes + Drift/Rain/Puddles.
- Forage ids = Codor contract (`systems/collection.js FORAGE`): spring `sakura, bamboo_shoot`; summer `cicada_shell, sunflower`; autumn `maple_leaf, chestnut, persimmon`; winter `yuzu, snowdrop`. `forageTable.js` adds zones/counts + `forageSpawns(season, wet)`. Cozy text in `FORAGE_RELIC_TEXT` (itemsC); SVG icons + `<ForageProp item s/>` (lazy). Preview `?m=forage`.

### 5. Rain — `src/art/weather/`, `src/audio/{engine,ambient,zones}.js`
- `<Rain get count box/>` — 1 draw call, billboarded streaks, colour × sky; fades with winter weight (Drift carries the snow). Default 2000 / 900 touch.
- `<Puddles spots get/>` — 1 draw call instanced quads: sky fresnel, soaked rim, ink lip, 4 ripple rings × `uRain`; spots from `puddleSpots({count,near})` (path-side, flat, not water/bridge, lift = dip rim).
- `patchWet` darkens + glosses ground/grass/roof (`S_WET_COLOR` / `S_WET_SHEEN`). Soft Ghibli rain, not gloomy.
- Audio: engine `rain` bus (hiss / body / brown wash) + `roof` bus (skips muffle); `mixFor` adds `rain` / `roof`, hush birds × dry factor; `zones.js` reads `L.rain ?? T.rain`. Indoor roof patter when `L.inside`.

### Perf (items 4–5)
- Startup index gz: **69,688 B** (art-c) vs **69,693 B** (stage-c 835ebc1) — **0 bytes added**.
- Extra programs: **+2** season variants (within Codor's ≤3) + **3** ShaderMaterials (Drift/Rain/Puddles) = **+5** total vs unpatched scene. Cap gated off on touch tier by default.
- Extra draw calls (exact layer on/off, walk village rain): **+3** (Drift + Rain + Puddles); orbit / indoors hide Drift+Rain via `defaultAnchor` → **+1** (puddles). Tris ≈ **+4 k** for the three quads/points.
- Lazy gz (multi-entry measure): season index ~3.8 KB, Rain 1.5, Puddles 2.5, Drift 0.4, hooks 1.1, forage icons ~3.8, itemsC 1.7, ambient (+rain) ~5.0 (was ~4.5 on stage-c).

### Screenshots / audio (tiny-planet-perf/art-c/)
`season-{spring,summer,autumn,winter}.png`, `winter-snowcaps.png`, `rain-{day,dusk}.png`, `puddles-close.png`, `forage-items.png`, `rain-preview.ogg` (24 s: clear → rain → indoors roof → drizzle).

### Wiring for Codor
1. Lazy-mount `<SeasonLayer/>` inside the planet group (GameSlot / World3D).
2. Keep writing the weather hooks (`liveC` already calls `W.applyTo(T, rotA)`).
3. Spawns: `forageSpawns(T.season, T.wet)` + `<ForageProp>` as World.jsx Prop default; `registerForageIcons` on import.
4. Audio needs no extra wiring beyond `T.rain` (zones already reads it); roof patter follows `L.inside`.

---

## What main already has (survey)
- Fishing: `G.ui.fish` + `<Fishing>` bar minigame (game/UI.jsx:95), spots from recipes.js (`['lake','fish',3,'water']`, harbour),
  generic item `fish`, `grilledfish`/`onigiri` recipes, villagers fisherman/angler fishing at pier/dock. No species.
- Train: `Train()` in zones.jsx:183, constant loop at `TRAIN_LAT=-0.95` (`lon = wind.time*0.05`, `?trainAt=`), engine + cars +
  steam puffs, instanced sleepers. No stations, no stops, no boarding. Village is at lat +1.05, far from the ring.
- Weather: talk/state.js `weatherFor(day)` → 'clear'|'breezy'|'cloudy'|'drizzle' (dialogue + cloud tint only). No rain/wet.
- Seasons: none. Terrain colours are baked into vertex colours (App.jsx Ground) — so seasons must be a shader tint, not a rebake.
- Camera: follow/orbit/zone/home in App.jsx (~l.458); EffectComposer = Bloom + Noise + Vignette (budget: no extra pass).
- Her poses: `act.js` exports `POSES` registry (`POSES[kind](B, mix, st, t, w)`) for lazy chunks + `?act=` freeze. Pets: `goal` targets
  over `POSE0` (sit, lie, curl, stretch, crouch, roll, headTilt, earBack, tailUp, tailWag, pawL/R, happy, pant…), Quadruped.jsx:12.
- Hoshino = profiles key **'scholar'** (villagers.js: zone 'ruins', elder, glasses, beard). Ruins = `ZONES.ruins` (-0.72, 3.85, r 0.11), `<Ruins/>` in Cull.
- Stage B mount pattern to copy: systems/World3D.jsx (3D, `lazy(() => import('../art/...Component.jsx'))` — not index.js, chunk-name
  rule), systems/Panels.jsx (DOM panels by `G.ui.panel`), proximity prompts via `GAME.H.near.push(consider)`, globals `window.__T`, `__rot`.
- Icons: game/icons.jsx `D` map (SVG, in the lazy game chunk, not startup). Labels: game/itemsB.js `ITEM_LABELS`/`itemName`.
- Audio: engine.js layers wind/river/lake/insects/birds/bubbles, `mixFor(L, Z)` at 10 Hz, `zonesAt(L)`; act.js blips share `__tpAudio`.

## Reused Stage B APIs
- `art/kit.js` `P/emitParts/buildGeometry` → all new props are merged geometries with vertex colours (1 mesh per prop kind).
- `art/ink.js` `inkMaterial/hullGeometry` → one shared ink hull per merged mesh (not drei Outlines per sub-mesh).
- `art/parchment.css` + `Icon` + Cormorant woff2 → journal, tutorial note, catch card, photo UI, museum plaques.
- Audio: engine `buildGraph` gets 2 new procedural layers (rain, train); `mixFor` gets `Z.rain`, `L.onTrain`; zones unchanged otherwise.
- Settings panel: no change; volume/mute already cover the new rain/train layers.

## Proposed ids
- Fish (12): lake `minnow` `crucian` `koi` `catfish` `lake_lord`(legend); river `ayu` `char` `loach`; harbour `mackerel` `sea_bream` `flounder` `pufferfish`.
- Rarity: 'common'|'uncommon'|'rare'|'legend'. Time: 'morning'|'day'|'evening'|'night'|'any' (= talk periodAt).
- Seasons: 'spring'|'summer'|'autumn'|'winter' (7 in-game days each; `season = floor(day/7) % 4`, day 0 = spring).
- Weather kinds: existing 'clear'|'breezy'|'cloudy'|'drizzle' + new 'rain' (rain intensity: drizzle 0.35, rain 0.8).
- Seasonal items (forage): spring `sakura`, `bamboo_shoot`; summer `cicada_shell`, `sunflower`; autumn `maple_leaf`, `chestnut`, `persimmon`; winter `yuzu`, `snowdrop`.
- Relics (museum): existing `shard`, `coin`, `crystal` + new `relic_tile`, `relic_bell`, `relic_lens`, `relic_mask`, `relic_bowl`.
- Photo filters: 'none','sunny','sepia','ink','pastel','twilight','film'.
- Her poses: 'stand','wave','peace','sit','look_up','twirl'. Pet poses (both): 'sit','lie','happy','tilt'; Pip: 'beg','play_bow'; Mochi: 'loaf','stretch','roll'.
- Train stations: 'lake' (lon near ZONES.lake), 'terraces', 'ruins' (museum stop) — exact lon picked by Codor from the ring/paths.
- Tutorial steps: 'move','look','gather','craft','talk','garden','sleep'.

## Per item — module, interface, data needed, hooks
### 1. Tutorial note (DOM only)
`src/ui/tutorial/TutorialNote.jsx` default `<TutorialNote steps={Step[]} touch={bool} onDismiss onToggle />`
Step `{ id, text, textTouch?, icon, done: boolean }`. Pinned parchment note, handwritten ticks, collapses to a corner pin.
Codor: step completion from existing events (move/gather/craft/talk/sleep), save `tutorial:{done:{}, dismissed}`, show on day 0 only.
### 2. Fish models + icons + catch card
`src/art/fish/data.js` `FISH_ART[id] = { len, depth, fin, colours:[a,b,c], pattern:'plain'|'spots'|'stripes'|'koi' }` (art only).
`src/art/fish/FishModel.jsx` `<FishModel id size={cm} quality />` (catch reveal in her hands / splash), `buildFishGeometry(id, lod)`.
`src/art/fish/icons.jsx` `FISH_ICONS` (SVG, same recipe as icons.jsx) + one-line `registerIcons(map)` added to game/icons.jsx.
`src/ui/fish/CatchCard.jsx` `<CatchCard fish={Fish} size={cm} isNew isRecord onClose />`.
Needs from Codor: `Fish { id, name, rarity, size:[min,max] cm, habitat:'lake'|'river'|'harbour', season:SeasonId[]|'any', time:TimeId[]|'any', weather?:'rain'|'any' }`
(Studio drafts names/blurbs), roll on `fishResult(true)`, catch event `{ fishId, size }`. Calmer minigame stays Codor's; Studio can restyle `.tp-fish`.
### 3. Photo mode
`src/ui/photo/PhotoMode.jsx` `<PhotoMode value={{ filter, pose, petPose:{pip,mochi}, frame:bool, grid:bool }} onChange onShutter onClose />`.
`src/ui/photo/filters.js` `FILTERS[id] = { label, css }` + `gradeCanvas(ctx2d, id, {frame})` (same look on the saved PNG; paper frame + date stamp).
`src/art/poses/herPoses.js` registers `POSES['photo_<id>']` into act.js; `src/art/poses/petPoses.js` `PET_POSES.pip|mochi[id] = Partial<POSE0>`.
Filters are CSS `filter` on the canvas element (compositor, no composer pass, 0 draw calls); PNG bakes via 2D-canvas `ctx.filter`.
Codor: free camera + clamp, hide HUD, `capture(): Promise<HTMLCanvasElement>` (render+read in the same frame; no preserveDrawingBuffer),
download/share, freeze pet brains into a 'photo' state and write `goal` from PET_POSES, `ACT.kind = 'photo_'+pose` with lock.
### 4. Seasons (palette + items) — BUILT (see top)
`src/art/season/palettes.js` `PALETTES[id] = { grass:[3], leaf:[3], flower:[4], terrainTint, skyTint, sunTint }`, `seasonUniforms`
`{ uSeasonW: vec4 weights, uSnow }`, `SEASON_GLSL` chunk + `patchSeason(material)` (onBeforeCompile, tints by vertex colour hue).
`src/art/season/Petals.jsx` `<Drift kind={'sakura'|'leaves'|'snow'|null} density quality />` (1 draw call, vertex-shader motion, camera-local box).
`src/art/season/Forage.jsx` `<SeasonForage spots={{id,itemId,n}[]} quality />` instanced pickups + icons for the 9 seasonal items.
Codor: `window.__T.season` (id) + `__T.seasonW` blend (cross-fade over the last in-game day), call `patchSeason` on Ground/grass/leaf/flower
materials (App.jsx), forage spawn tables, item ids/recipes. Audio: Studio maps season → bird/insect density (summer cicadas, winter quiet) in mixFor.
### 5. Weather: rain, puddles, wet ground, rain audio — BUILT (see top)
`src/art/weather/Rain.jsx` `<Rain get={() => T.rain} quality />` — camera-local streak volume, 1 draw call, GPU motion, 0 JS/frame beyond 1 uniform.
`src/art/weather/Puddles.jsx` `<Puddles spots={n[]} get={() => T.wet} quality />` instanced decals with procedural ripples (no textures).
`src/art/weather/wet.js` `WET_GLSL` + `patchWet(material)` (darken + gloss terrain/paths/roofs by `uWet`); sky/cloud grey via existing uniforms.
Audio: engine layer `rain` (filtered noise patter + roof drips when inside via muffle) driven by `Z.rain`; thunder: no (keep it gentle).
Codor: weather state `{ kind, rain:0..1, wet:0..1 }` per day (extend weatherFor with 'rain'; rain ramps in/out over ~1 in-game hour,
wet lags rain and dries over ~3 h), put on `window.__T.rain/.wet`, puddle spot list (paths/village, ~150), fish weather rolls, NPC umbrellas (later).
### 6. Train boarding + ride (visuals)
`src/art/train/Stations.jsx` `<Stations stations={{id,n,spin}[]} quality />` (platform, roof, bench, lantern, name board; merged, 1–2 calls).
`src/art/train/Carriage.jsx` replaces car geometry with an open-sided carriage + seat anchor `SEAT = {pos, quat}`; her `POSES['ride_sit']`.
`src/ui/train/RideOverlay.jsx` `<RideOverlay from to progress={0..1} onAlight />` (ticket stub + next-station board), `<StationSign id />`.
Audio: `train` layer (clack rhythm tied to speed, brake hiss, whistle on depart) via `L.onTrain` + `trainSpeed`.
Codor: stops/dwell + speed curve in Train(), boarding prompt, parenting her to the car, ride camera (Studio gives `RIDE_CAM` offsets),
station placement on the ring, a walk route from the village to the nearest station, alight logic.
### 7. Journal + ruins museum + Professor Hoshino
`src/ui/journal/Journal.jsx` `<Journal tab={'fish'|'relics'|'forage'|'photos'} entries={Entry[]} onTab onClose />` (parchment book, sketch
silhouettes for unseen). Entry `{ id, kind:'fish'|'relic'|'forage', seen, count, best?:cm, firstDay?, donated }`.
`src/art/museum/MuseumExterior.jsx` `<Museum n spin quality />` (small hall beside the ruins). `src/art/museum/MuseumInterior.jsx`
`<MuseumInterior donated={string[]} quality onInspect={(id)=>void} />` — fish tank (instanced `FishSchool`, swim in vertex shader),
relic plinths, Hoshino's desk; empty slots show chalk outlines. `src/ui/museum/DonateCard.jsx` `<DonateCard itemId onDonate onClose />`, plaques.
Hoshino: profile 'scholar' kept; Studio adds `hold:'notebook'` prop + a portrait SVG for the journal/talk header, and drafts museum lines.
Codor: collection state + save migration, donate rules, interior mode (reuse Home interior camera/collision pattern), Hoshino routine
(museum by day, ruins at dusk), relic sources.

## Per-item perf budget (worst case visible at once; desktop / mobile)
| item | draw calls | tris | textures | lazy chunk gz |
|---|---|---|---|---|
| tutorial note | 0 | 0 | 0 | ≤ 4 KB |
| fish model (catch reveal) | 2 (body+ink) | ≤ 600 / 300 | 0 | ≤ 8 KB (models+data) |
| fish icons | 0 | 0 | 0 (SVG) | ≤ 6 KB, separate chunk |
| catch card | 0 | 0 | 0 | ≤ 3 KB |
| photo UI + filters | 0 | 0 | 0 | ≤ 7 KB |
| her + pet poses | 0 | 0 | 0 | ≤ 3 KB |
| seasons: shader tint | +0 | +0 | 0 | ≤ 3 KB (+≤3 shader programs total) |
| seasons: drift + forage | 2–3 | ≤ 8k / 4k | 0 | ≤ 5 KB |
| rain + puddles + wet | 2–3 | ≤ 6k / 3k (≤2k / 800 streaks, ≤150 / 80 puddles) | 0 | ≤ 6 KB |
| rain + train audio | 0 | 0 | 0 (procedural) | ≤ 3 KB (engine chunk) |
| stations (all 3) | ≤ 6 | ≤ 9k / 5k | 0 | ≤ 8 KB |
| carriage + ride UI | ≤ 4 | ≤ 4k | 0 | ≤ 5 KB |
| museum exterior | ≤ 3 | ≤ 6k / 3k | 0 | ≤ 6 KB |
| museum interior (replaces outdoor scene, like Home) | ≤ 60 | ≤ 60k | ≤ 1 × 256² canvas (plaques) | ≤ 15 KB |
| journal UI + Hoshino portrait | 0 | 0 | 0 | ≤ 8 KB |
Rules: everything outdoor sits behind `Cull`/horizon cull + 16-unit LOD; no new React re-renders per frame (getters/uniforms only);
0 per-frame allocations; JS per frame added ≤ 0.3 ms total; weather uniforms update ≤ 10 Hz. Note: village view has little
headroom (it was ~614k tris vs 600k cap at 2bd6270) — Studio items near the village (puddles, drift) must stay on the lo quality there.

## Ownership
Studio: src/art/{fish,poses,season,weather,train,museum}/**, src/ui/{tutorial,fish,photo,train,journal,museum}/**, new icons (via
registerIcons), audio engine layers + mixFor terms, fish/forage/relic display names + blurbs (ITEM_LABELS-style data file), Hoshino art + line drafts, preview.html scenes + screenshots.
Codor: all state/rules/saves/migrations (fish rolls, collection, weather + season clocks, train schedule, tutorial progress), `__T`
hooks, App.jsx/zones.jsx/World3D/Panels mounts, material patch call sites, camera modes (photo free cam, ride, museum interior), capture/PNG
download, item ids + recipes, tests/CI/budget. Shared: id lists in this doc are proposals; Codor finalises them in the contract.

## Build order + timing (Studio side; each step = commit + preview shots, then hand to Codor)
1. Tutorial note — no deps (0.5 session).
2. Fish data/models/icons + catch card — needs only the Fish shape; unblocks fishing + journal (1 session).
3. Photo mode UI + filters + her/pet poses — POSES registry and POSE0 already exist; capture is Codor's (1 session).
4. Seasons palettes/shader chunk + drift + forage art — needs `__T.season` hook; touches the most materials, so early enough to measure (1 session).
5. Weather: rain, puddles, wet patch, rain audio — reuses the season patch pattern (1 session).
6. Train stations, carriage, ride overlay, train audio — waits on Codor's stop/dwell rework of Train() (1 session).
7. Journal, then museum exterior/interior + Hoshino — last: needs collection state (2–5 above feed it) and an interior mode (1.5–2 sessions).
Steps 1–3 can start now in parallel with Codor drafting the contract; 4–5 after the `__T` hooks are agreed.

## Open questions for Codor
1. Fish vs inventory: keep generic `fish` for recipes and record species in the collection, or add species ids as items (recipes then accept cat 'fish')?
2. Who decides fish availability tables (habitat/season/time/weather/rarity weights)? Studio drafts, Codor balances?
3. Seasons: OK to tint via an `onBeforeCompile` patch on Ground/grass/leaf/flower materials (shader programs +≤3), rather than rebaking vertex colours? Snow in winter: tint only, or light snow caps?
4. Weather: extend `weatherFor(day)` with 'rain' (how often? suggest 1 day in 7, never on day 0–1) and expose `__T.rain/.wet/.season/.seasonW`?
5. Train: where do stations go on the TRAIN_LAT ring, and how does she get from the village to one (new path)? Is riding free or ticketed (coin)?
6. Photo mode: entry key/button (suggest P + a camera chip), and is PNG save download-only or also into the journal 'photos' tab (localStorage size cap)?
7. Museum: separate interior mode like Home (recommended for budget) or an open-air pavilion at the ruins? Where do new relics come from (digging spots at ruins)?
8. Tutorial: who signs the note (suggest Grandma or the postman), and should it reappear from Settings?
9. Are forage/relic/fish display names fine in a new lazy `itemsC.js` (like itemsB.js), with Studio owning the text?
