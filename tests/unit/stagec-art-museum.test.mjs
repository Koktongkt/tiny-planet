// Stage C art item 7 (art-c): museum layout + geometry, relic art, journal copy, donate card + text, Hoshino wiring.
import test from 'node:test'; import assert from 'node:assert/strict'
import fs from 'node:fs'
import { tris } from '../../src/art/train/kit.js'
import { MUSEUM, SLOTS, SLOT_IDS, MBLOCKS, TANK, slotNear } from '../../src/art/museum/layout.js'
import { buildHall, buildTank, hallGeometry } from '../../src/art/museum/hall.js'
import { relicGeometry, RELIC_MODEL_IDS, chalkOutline } from '../../src/art/museum/relics.js'
globalThis.window ??= {}
const C = await import('../../src/systems/collection.js')
const { PLAQUE_TEXT, HOSHINO_LINES, FORAGE_RELIC_TEXT, FISH_TEXT } = await import('../../src/game/itemsC.js')
const { RARE_FISH_ITEMS } = await import('../../src/game/fishTable.js')
const J = await import('../../src/ui/journal/text.js')
const src = (p) => fs.readFileSync(new URL('../../src/' + p, import.meta.url), 'utf8')

test('every donatable id has a museum slot inside the hall, and slots are not inside walk blocks', () => {
  assert.deepEqual([...SLOT_IDS].sort(), [...C.DONATABLE].sort())
  for (const s of SLOTS) { assert.ok(s.x > MUSEUM.x0 && s.x < MUSEUM.x1 && s.z > MUSEUM.z0 && s.z < MUSEUM.z1, s.id); assert.ok(slotNear(s.x, s.z + 0.2)?.id === s.id || slotNear(s.x + 0.2, s.z)?.id === s.id, 'reachable ' + s.id) }
  assert.ok(MBLOCKS.length >= 4)
  for (const id of RARE_FISH_ITEMS) assert.equal(SLOTS.find(s => s.id === id).kind, 'fish')
})
test('hall + tank fit the interior budget (one toon mesh + glow; small tris)', () => {
  for (const touch of [false, true]) { const h = hallGeometry({ touch }); assert.ok(h.tris < 8000, `hall ${h.tris}`); assert.ok(tris(h.glow) > 0) }
  const t = buildTank(); assert.ok(tris(t.glass) < 200 && tris(t.water) === 12)
  assert.ok(TANK.y1 - TANK.y0 > 0.25)
})
test('relic models for every relic id, small, with chalk outlines for empty plinths', () => {
  assert.deepEqual([...RELIC_MODEL_IDS].sort(), [...C.RELICS].sort())
  for (const id of RELIC_MODEL_IDS) { const g = relicGeometry(id); assert.ok(tris(g.body) > 0 && tris(g.body) < 400, id); const l = chalkOutline(id); assert.equal(l.length % 6, 0); assert.ok(l.length >= 30) }
})
test('relic + museum text: every new relic and every donatable has cozy text and a plaque', () => {
  for (const id of C.NEW_RELICS) { assert.ok(FORAGE_RELIC_TEXT[id].name); assert.ok(FORAGE_RELIC_TEXT[id].desc.length > 40, id) }
  for (const id of C.DONATABLE) assert.ok(PLAQUE_TEXT[id], 'plaque ' + id)
  for (const k of ['donate', 'empty', 'full']) assert.ok(HOSHINO_LINES[k].length)
  const icons = src('art/museum/icons.jsx'); for (const id of C.NEW_RELICS) assert.ok(icons.includes(id + ':'), 'icon ' + id)
})
test('journal copy uses Codor entries: names, silhouettes for unseen, notes, tabs', () => {
  assert.deepEqual(J.JOURNAL_TABS.map(t => t.id), ['fish', 'forage', 'relics', 'photos'])
  const s = { fish: { koi: { count: 2, best: 51, firstDay: 3 } }, journal: C.freshJournal(), museum: { donated: { koi: 4 } }, seen: {} }
  const fish = C.entries('fish', s), koi = fish.find(e => e.id === 'koi')
  assert.equal(J.entryName(koi), FISH_TEXT.koi.name); assert.equal(J.entryNote(koi), '×2 · best 51 cm · day 4'); assert.ok(koi.donated)
  assert.equal(J.entryNote(fish.find(e => !e.seen)), 'not caught yet'); assert.deepEqual(J.tabCount(fish), { seen: 1, of: fish.length })
  C.note(s.journal, 'relic_mask', 2); const mask = C.entries('relics', s).find(e => e.id === 'relic_mask'); assert.equal(J.entryName(mask), 'Festival Mask')
  const jx = src('ui/journal/Journal.jsx'); for (const k of ['brightness(0)', 'jn-stamp', 'Photos', 'onTab']) assert.ok(jx.includes(k), k)
})
test('DonateCard / MuseumInterior / Hoshino contracts', () => {
  const d = src('ui/museum/DonateCard.jsx'); for (const k of ['itemId', 'onDonate', 'onClose', "mode = 'donate'", 'HoshinoPortrait', 'PLAQUE_TEXT']) assert.ok(d.includes(k), k)
  const m = src('art/museum/MuseumInterior.jsx'); for (const k of ['donated', 'onInspect', 'layer', 'FishInstances', 'chalkOutline', 'plaquesGeometry', '<Hoshino']) assert.ok(m.includes(k), k)
  const h = src('art/museum/Hoshino.jsx'); assert.match(h, /name === 'scholar'/); assert.match(h, /attachNotebook/)
})
test('nothing in the startup graph imports the museum / journal art', () => {
  for (const f of ['main.jsx', 'App.jsx', 'GhibliPerson.jsx', 'villagers.js']) { if (!fs.existsSync(new URL('../../src/' + f, import.meta.url))) continue; const s = src(f); assert.ok(!/art\/museum|ui\/journal|ui\/museum/.test(s), f) }
})
