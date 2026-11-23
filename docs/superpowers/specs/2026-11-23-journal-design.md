# Journal: one book for quests, people, recipes, discoveries and memories

## Intent
One place to look back on everything she is doing and has found, built like the Bag satchel: the painted journal
art (`ui-mocks/a/ref3/journal-src.webp`, 1448x1086, empty pages) with a live layer on top, scaled to fit. It
replaces the spiral-notebook Journal (J), and later the separate Recipe Book. The mock is `ui-mocks/a/journal.html`.

## Goals
- Five bookmarks along the top: **Quests, People, Recipes** over the left page; **Discoveries, Memories** over the right.
- Sub-pages as small paper tabs on the left page: Recipes (Tools · Food · Decor · Keepsakes), Discoveries
  (Fish · Forage · Relics), Memories (Photos · Firsts).
- Every section uses the layout from the reference image: list or grid on the left page, the picked entry's details on the right.
- The Bag's "Craft with" / "Recipes" buttons open the Journal at Recipes, on the sub-tab for that item.
- The crafting bench opens the Journal at Recipes, with a Craft button on the right page.

## Non-goals (for now)
- Removing the old Recipe Book button and the C key: they keep working until the Journal's Recipes section is done.
- Hotkeys: whether R opens Recipes (R is the bicycle today) is on hold.
- Phones: when the book is too small to read (scale < 0.5, like the Bag), J opens the old notebook and the bench / Bag open the old Recipe Book.
- Villager portraits: none exist except the professor's, so People uses name medallions until art is made.

## Anti-goals
- Nothing in the book should feel like a chore list or a store; it is her notebook.
- Never spoil what has not been found: unfound things are silhouettes, unmet people are "???", gift likes appear only once learned.

## Bookmark bar (agreed in the mock)
- Fabric ribbons with a V-cut top, colours from the book's own ribbons: Quests red, People mustard, Recipes blue, Discoveries green, Memories pink.
- They stand up out of each page's top edge (art y 238), in front of the leather, and never cover the paper.
  They keep to the flat part of each edge (x 160–652 and 796–1262), clear of the curl into the middle of the book.
- The open bookmark rises higher. The others sit lower and slightly muted, and rise a little on hover.
- No counts on bookmarks; a gold dot means something new.

## Pages
- **Quests.** Left: Settle In (n/7 while steps remain), errands accepted at the board (Active), finished ones (Done,
  dimmed). Notes still on the board are never listed one by one: a single "New notes on the board" card ("Go and see")
  says how many are waiting, and its page only sends her to the board. A note gets its own page only once she accepts
  it at the board; nothing can be accepted from the Journal. Right (accepted errand): who asked, a checklist of what
  to bring with have/need counts from the bag, who to bring it to, the reward, and a Track button.
  Track is a placeholder for now: picking which quest the HUD tracker follows is future work.
- **People.** Left: the 22 villagers as cards with name, role and hearts; villagers you haven't met are silhouettes marked "???".
  Right: name, role, favourite thing, 5 hearts with the return gifts at 3 and 5, "Gifted today", and gift shelves
  Loves / Likes / Dislikes, filled only with items she has learned by giving them.
- **Recipes.** Left: rows with name and a ready dot when every ingredient is in the bag; recipes you haven't learned show "???".
  Right: icon, description, each ingredient with have/need, where it's made (bench or stove), Owned badge for tools,
  Craft at the bench, otherwise "Craft at the bench beside Home". Food also shows which dishes she has cooked perfectly.
  The six recipe groups in the game fold into four tabs: Seed Pack, Bridge Kit and the bicycle go under Tools.
- **Discoveries.** Left: icon grid, silhouettes for unfound, "7/12 found · Museum 3/8" at the bottom. Right: name,
  description, first found day, count, best size (fish), a where/when hint (fish: spot, season, time, weather;
  forage: season), museum stamp or a nudge to bring it to Professor Hoshino.
- **Memories.** Photos: up to 48 taped polaroids, 12 to a page with ‹ 1 / 4 › page arrows; the picked one large on
  the right with its day, and "Remove". When the album is full a new photo is not kept (it still downloads) and a note
  says so; nothing older is dropped on its own. Thumbnails are WebP (about 30% smaller), JPEG where the browser cannot
  make WebP. (A cover photo was tried and taken out for now.)
  Firsts: a short diary written from data the game already keeps (first catch of each fish, relics found, museum donations, perfect
  dishes, and with the save additions below, people met and heart milestones).

## Save additions (agreed)
Old saves carry over: each new field starts empty.
1. **Met:** `friends.list[npcId].metDay`: the day of the first chat. People shows only villagers you have met.
2. **Gift memory:** already in the save: `friends.list[npcId].seen = { itemId: 'love' | 'like' | 'neutral' | 'dislike' }`,
   written on every gift (systems/live.js `giveGift`). The gift shelves read it; no new field.
3. **Quest history:** `errands.log`: the last 20 finished errands `{ npcId, wants, reward, day }`, so Done
   survives the daily reset and Firsts can mention them.

## Approaches considered (bookmark bar)
- **A. Live bookmarks drawn over plain art (picked).** Labels, order and number can change without repainting.
- B. Bookmarks painted into the art: the most hand-made look, but adding a section means repainting.
- C. Keep the plaque and hang ribbons from it: very book-like, but cramped labels.

## Left to the builder
Exact spacing, hover and selection effects; empty-page wording; how the Journal shares Bag code (frame scaling,
the 'fits' check); which old Journal pieces (stitches, family line) are reused on the new pages.
