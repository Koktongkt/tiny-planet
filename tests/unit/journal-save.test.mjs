// Journal save additions: met day, heart milestones, finished-errand log, photo cover.
import test from 'node:test'
import assert from 'node:assert/strict'
import { meet, noteMilestones, metOf } from '../../src/systems/friendship.js'
import { errandsFor, accept, deliver, rollDay } from '../../src/systems/errands.js'
import { removePhoto } from '../../src/systems/photo.js'
import { migrate, fresh } from '../../src/save/schema.js'

const friends = () => ({ day: 0, list: {} })

test('meet records the day of the first chat once', () => {
  const f = friends()
  assert.equal(meet(f, 'grandma', 2), true)
  assert.equal(f.list.grandma.metDay, 2)
  assert.equal(meet(f, 'grandma', 5), false)
  assert.equal(f.list.grandma.metDay, 2)
})

test('heart milestones are noted the first day 3 and 5 hearts are reached', () => {
  const fr = { hearts: 3.5, hit: {} }
  assert.deepEqual(noteMilestones(fr, 4), [3]); assert.equal(fr.hit[3], 4)
  assert.deepEqual(noteMilestones(fr, 6), [])
  fr.hearts = 5; assert.deepEqual(noteMilestones(fr, 9), [5]); assert.equal(fr.hit[3], 4)
  assert.deepEqual(noteMilestones({ hearts: 1 }, 1), [])
})

test('metOf counts friends from before met-tracking as met', () => {
  assert.equal(metOf({ hearts: 0.5 }), 0)
  assert.equal(metOf({ hearts: 0, seen: { shell: 'like' } }), 0)
  assert.equal(metOf({ hearts: 0 }), null)
  assert.equal(metOf(undefined), null)
  assert.equal(metOf({ metDay: 3, hearts: 2 }), 3)
})

function readyErrand(day) {
  const errands = { day, list: errandsFor(day) }, e = errands.list[0], inv = {}
  for (const w of e.wants) inv[w.itemId] = w.count
  accept(errands, e.id)
  return { errands, e, inv }
}

test('delivering an errand logs it, newest first', () => {
  const { errands, e, inv } = readyErrand(3)
  deliver(errands, e.id, inv)
  assert.deepEqual(errands.log[0], { npcId: e.npcId, wants: e.wants, reward: e.reward, day: 3 })
})

test('the errand log keeps the last 20', () => {
  let log = []
  for (let d = 0; d < 25; d++) {
    const r = readyErrand(d); r.errands.log = log; deliver(r.errands, r.e.id, r.inv); log = r.errands.log
  }
  assert.equal(log.length, 20); assert.equal(log[0].day, 24)
})

test('a new day keeps the errand log', () => {
  const { errands, e, inv } = readyErrand(1); deliver(errands, e.id, inv)
  rollDay(errands, 2)
  assert.equal(errands.log.length, 1)
})

test('old saves get an empty errand log and no cover; new ones keep theirs', () => {
  const old = fresh(); delete old.errands.log; delete old.photos.cover
  const s = migrate(JSON.parse(JSON.stringify(old)))
  assert.deepEqual(s.errands.log, []); assert.equal(s.photos.cover, null)
  const n = fresh(); n.errands.log = [{ npcId: 'baker', wants: [], reward: {}, day: 1 }]; n.photos.cover = 'p1'
  const s2 = migrate(JSON.parse(JSON.stringify(n)))
  assert.equal(s2.errands.log.length, 1); assert.equal(s2.photos.cover, 'p1')
})

test('removing the cover photo clears the cover', () => {
  const photos = { list: [{ id: 'a' }, { id: 'b' }], cover: 'a' }, store = { a: 'x', b: 'y' }
  removePhoto(photos.list, store, 'b', photos); assert.equal(photos.cover, 'a')
  removePhoto(photos.list, store, 'a', photos); assert.equal(photos.cover, null)
})

// ---- final review fixes ----
import { give, addHearts, newFriend } from '../../src/systems/friendship.js'
import { firsts, recipeRows } from '../../src/systems/journalPages.js'

test('a gift before any chat counts as meeting them that day, and notes heart milestones', () => {
  const f = friends(); f.list.baker = { ...newFriend('baker'), hearts: 2.8 }
  give(f, 'baker', 'berries', 1, 6)
  assert.equal(f.list.baker.metDay, 6); assert.equal(f.list.baker.hit[3], 6)
})
test('hearts from elsewhere (a museum donation) meet and note milestones on that day', () => {
  const f = friends(); addHearts(f, 'scholar', 3, 4)
  assert.equal(f.list.scholar.metDay, 4); assert.equal(f.list.scholar.hit[3], 4)
  addHearts(f, 'cook', 1) // no day: unchanged behaviour
  assert.equal(f.list.cook.metDay, undefined)
})
test('old saves: milestones reached before tracking are marked unknown, never dated later', () => {
  const old = fresh(); old.friends.list.grandma = { npcId: 'grandma', hearts: 3.5, giftedToday: false }
  const s = migrate(JSON.parse(JSON.stringify(old)))
  assert.equal(s.friends.list.grandma.hit[3], -1)
  assert.deepEqual(noteMilestones(s.friends.list.grandma, 40), [])
  const names = { itemName: (x) => x, npcName: (x) => x }
  assert.equal(firsts(s, names).some(e => e.kind === 'hearts'), false)
})
test('new friends start with an empty milestone record', () => { assert.deepEqual(newFriend('baker').hit, {}) })
test('a recipe ingredient that can be one of several only names the ones she has found', () => {
  const T = { known: () => true, owned: () => false, haveFor: (r) => r.needs.map(nd => ({ need: nd, have: 0, ok: false })) }
  const tea = recipeRows('food', { seen: { herbs: true }, journal: {} }, T).find(r => r.id === 'teacup')
  const any = tea.needs.find(n => typeof n.need[0] !== 'string')
  assert.deepEqual(any.show, ['herbs'])
  const plainNeed = tea.needs.find(n => typeof n.need[0] === 'string')
  assert.deepEqual(plainNeed.show, [plainNeed.need[0]])
})
