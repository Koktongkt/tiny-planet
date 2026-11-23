// Journal pages: plain rows for each bookmark, built from the save (no DOM, no store).
import test from 'node:test'
import assert from 'node:assert/strict'
import { quests, people, giftShelves, recipeRows, RECIPE_TABS, discoveries, fishFacts, firsts, newDots } from '../../src/systems/journalPages.js'
import { PREFS } from '../../src/systems/friendship.js'
import { PROFILES } from '../../src/talk/profiles.js'

const NAMES = { shell: 'Shell', driftwood: 'Driftwood', stone: 'Stone', teacup: 'Herbal Tea', koi: 'Koi', onigiri: 'Onigiri', sakura: 'Sakura Petals' }
const T = {
  itemName: (id) => NAMES[id] || id,
  npcName: (id) => (PROFILES[id] && PROFILES[id].name) || id,
  known: (r) => r.id !== 'bike', owned: (r) => r.makes === 'rod',
  haveFor: (r) => r.needs.map(nd => ({ need: nd, have: 9, ok: r.id === 'can' })),
}
const save = (o = {}) => ({ day: 7, inv: {}, seen: {}, tutorial: { done: {} }, errands: { day: 7, list: [], log: [] }, friends: { day: 7, list: {} },
  fish: {}, journal: { forage: {}, relics: {} }, museum: { donated: {} }, photos: { list: [], cover: null }, ...o })
const errand = (id, npcId, wants, extra = {}) => ({ id, npcId, wants: wants.map(([itemId, count]) => ({ itemId, count })), reward: { coins: 3 }, day: 7, accepted: false, done: false, ...extra })

test('Settle In shows while tutorial steps remain, with progress', () => {
  const rows = quests(save({ tutorial: { done: { move: 1, look: 1, gather: 1, craft: 1, talk: 1 } } }), T)
  assert.equal(rows[0].kind, 'tutorial'); assert.equal(rows[0].desc, "Grandma Fuku's first-day list · 5/7")
  const all = { move: 1, look: 1, gather: 1, craft: 1, talk: 1, garden: 1, sleep: 1 }
  assert.equal(quests(save({ tutorial: { done: all } }), T).some(r => r.kind === 'tutorial'), false)
})

test('notes still on the board collapse into one hint with a count and no details', () => {
  const s = save({ errands: { day: 7, list: [errand('a', 'dock boy', [['stone', 3]]), errand('b', 'farm wife', [['flower', 2]])], log: [] } })
  const rows = quests(s, T), board = rows.filter(r => r.kind === 'board')
  assert.equal(board.length, 1); assert.equal(board[0].desc, '2 requests pinned up in the village'); assert.equal(board[0].state, 'avail')
  assert.equal(board[0].lines, undefined); assert.equal(rows.some(r => r.kind === 'errand'), false)
})

test('an accepted errand lists what to bring with have/need, then who to take it to', () => {
  const s = save({ inv: { shell: 1, driftwood: 1 }, errands: { day: 7, list: [errand('a', 'fishwife', [['shell', 2], ['driftwood', 1]], { accepted: true })], log: [] } })
  const r = quests(s, T).find(x => x.kind === 'errand')
  assert.equal(r.title, 'A favour for Oharu'); assert.equal(r.state, 'active')
  assert.deepEqual(r.lines, [{ text: 'Bring 2 × Shell', have: 1, need: 2, ok: false, itemId: 'shell' }, { text: 'Bring Driftwood', have: 1, need: 1, ok: true, itemId: 'driftwood' }, { text: 'Take it to Oharu', ok: false }])
})

test('a perfect-dish errand names the perfect dish and counts only perfect ones', () => {
  const s = save({ inv: { teacup: 3 }, errands: { day: 7, list: [errand('p', 'grandma', [['teacup_perfect', 1]], { accepted: true })], log: [] } })
  const line = quests(s, T).find(x => x.kind === 'errand').lines[0]
  assert.equal(line.text, 'Bring Perfect Herbal Tea'); assert.equal(line.have, 0); assert.equal(line.itemId, 'teacup')
})

test('the board notice about the full museum is a message, not a checklist', () => {
  const s = save({ errands: { day: 7, list: [{ id: 'hall-7', npcId: 'scholar', mention: 'Every case in the museum is full.', wants: [], reward: {}, day: 7, accepted: true, done: false }], log: [] } })
  const r = quests(s, T).find(x => x.id === 'hall-7')
  assert.equal(r.kind, 'notice'); assert.equal(r.mention, 'Every case in the museum is full.'); assert.equal(r.lines, undefined)
})

test('finished favours from the log are done, under Finished', () => {
  const s = save({ errands: { day: 7, list: [], log: [{ npcId: 'fisherman', wants: [{ itemId: 'reed', count: 3 }], reward: { coins: 3 }, day: 6 }] } })
  const r = quests(s, T).find(x => x.kind === 'log')
  assert.equal(r.state, 'done'); assert.equal(r.group, 'Finished'); assert.equal(r.desc, 'Done on Day 7')
})

test('people counts met villagers, including friends from older saves', () => {
  const p = people(save({ friends: { day: 7, list: { grandma: { hearts: 0, metDay: 0 }, baker: { hearts: 1 }, cook: { hearts: 0 } } } }), PROFILES)
  assert.equal(p.total, Object.keys(PROFILES).length); assert.equal(p.met, 2)
  assert.equal(p.rows.find(r => r.id === 'cook').metDay, null); assert.equal(p.rows.find(r => r.id === 'grandma').name, 'Grandma Fuku')
})

test('gift shelves show only gifts she has learned, and how many are left to learn', () => {
  const g = giftShelves({ seen: { teacup: 'love', fish: 'dislike', shell: 'neutral' } }, PREFS.grandma)
  assert.deepEqual(g.love, ['teacup']); assert.deepEqual(g.dislike, ['fish']); assert.deepEqual(g.like, [])
  assert.deepEqual(g.left, { love: 1, like: 2, dislike: 0 })
})

test('the Tools recipe tab also holds the seed pack and the bridge kit', () => {
  assert.deepEqual(RECIPE_TABS.tools, ['Tools', 'Garden', 'Unlock'])
  const ids = recipeRows('tools', save(), T).map(r => r.id)
  assert.ok(ids.includes('seedpack')); assert.ok(ids.includes('bridge')); assert.ok(ids.includes('rod'))
})

test('recipe rows know learned, owned, ready and perfect', () => {
  const rows = recipeRows('tools', save(), T), rod = rows.find(r => r.id === 'rod'), can = rows.find(r => r.id === 'can'), bike = rows.find(r => r.id === 'bike')
  assert.equal(rod.owned, true); assert.equal(rod.ready, false); assert.equal(can.ready, true); assert.equal(bike.known, false)
  const food = recipeRows('food', save({ journal: { forage: {}, relics: {}, perfect: { onigiri_perfect: 5 } } }), T)
  assert.equal(food.find(r => r.id === 'onigiri').perfectDay, 5)
})

test('discoveries count what is found and what the museum can take', () => {
  const s = save({ fish: { koi: { count: 1, best: 41, firstDay: 5 }, minnow: { count: 2, best: 8, firstDay: 1 } }, museum: { donated: { koi: 6 } } })
  const d = discoveries('fish', s)
  assert.equal(d.found, 2); assert.equal(d.total, 12); assert.deepEqual(d.museum, { donated: 1, of: 3 })
  assert.equal(discoveries('forage', s).museum, null)
  assert.deepEqual(discoveries('relics', s).museum, { donated: 0, of: 8 })
})

test('fish facts say where, when and in what weather', () => {
  assert.deepEqual(fishFacts('koi'), { rarity: 'rare', where: ['lake'], seasons: ['spring', 'summer'], times: ['day'], weather: 'clear' })
  assert.equal(fishFacts('minnow').seasons, 'any')
})

test('firsts is a diary in day order, with meetings, catches and heart milestones', () => {
  const s = save({ friends: { day: 7, list: { scholar: { hearts: 3, metDay: 4, hit: { 3: 6 } } } }, fish: { koi: { count: 1, best: 41, firstDay: 5 } },
    journal: { forage: { sakura: { count: 1, firstDay: 1 } }, relics: {}, perfect: { onigiri_perfect: 5 } }, museum: { donated: { koi: 6 } },
    errands: { day: 7, list: [], log: [{ npcId: 'baker', wants: [], reward: {}, day: 3 }] } })
  const f = firsts(s, T)
  assert.deepEqual(f.map(e => e.day), [...f.map(e => e.day)].sort((a, b) => a - b))
  const texts = f.map(e => e.text)
  for (const t of ['Found Sakura Petals', 'Did a favour for Kiko', 'Met Professor Hoshino', 'Caught your first Koi', 'Cooked a perfect Onigiri', 'Gave Koi to the museum', 'Professor Hoshino reached 3 hearts']) assert.ok(texts.includes(t), t)
})

test('the Quests bookmark gets a dot while notes wait on the board', () => {
  assert.equal(newDots(save({ errands: { day: 7, list: [errand('a', 'baker', [['berries', 4]])], log: [] } })).quests, true)
  assert.equal(newDots(save()).quests, false)
})
