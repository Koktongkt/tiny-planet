import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { caseCount, HALL_LINE, DONATABLE, RELICS } from '../../src/systems/collection.js'
import { pinHallMention } from '../../src/systems/errands.js'
import { fresh, migrate } from '../../src/save/schema.js'

test('the museum is eleven cases: eight relics and three fish', () => {
  assert.equal(RELICS.length, 8)
  assert.equal(DONATABLE.length, 11)
  const s = fresh()
  assert.deepEqual(caseCount(s), { n: 0, of: 11 })
  for (const id of DONATABLE) s.museum.donated[id] = 1
  assert.deepEqual(caseCount(s), { n: 11, of: 11 })
  assert.match(HALL_LINE, /plinth|case|museum/i)
})

test('the journal labels the museum count on its own line', () => {
  const src = fs.readFileSync(new URL('../../src/ui/journal/Journal.jsx', import.meta.url), 'utf8')
  assert.match(src, /<p className="jn-cases">Museum \{progress\.donated\} of \{progress\.donatedOf\}<\/p>/)
  assert.equal(src.includes('jn-cases"> {progress'), false)
})

test('the board mentions a full museum once, the morning after, and never again', () => {
  const errands = { day: 4, list: [{ id: 'e4-0', npcId: 'baker', wants: [{ itemId: 'berries', count: 1 }], reward: {}, day: 4, accepted: false, done: false }] }
  const museum = { donated: {}, full: 4 }
  assert.equal(pinHallMention(errands, museum, 4), false)
  assert.equal(errands.list.length, 1)
  assert.equal(pinHallMention(errands, museum, 5), true)
  assert.equal(errands.list[0].mention.includes('museum') || errands.list[0].mention.includes('Hoshino'), true)
  assert.equal(errands.list.filter(e => e.mention).length, 1)
  assert.equal(pinHallMention(errands, museum, 6), false)
  assert.equal(errands.list.filter(e => e.mention).length, 1)
})

test('an old save without the hall flags still loads and is not marked told', () => {
  const old = migrate({ v: 6, day: 2, inv: { shard: 1 }, museum: { donated: { shard: 1 } }, clock: { a: 0.4 } })
  assert.equal(old.museum.donated.shard, 1)
  assert.equal(old.museum.full, undefined)
  assert.equal(old.museum.told, undefined)
  old.museum.full = 2
  old.museum.told = 3
  const again = migrate(old)
  assert.equal(again.museum.full, 2)
  assert.equal(again.museum.told, 3)
})
