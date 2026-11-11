import test from 'node:test'
import assert from 'node:assert/strict'
import { errandsFor, rollDay, accept, deliver } from '../../src/systems/errands.js'

const perfects = (list) => list.filter(e => e.wants.some(w => String(w.itemId).endsWith('_perfect')))

test('day 0 stays a single gather note', () => {
  const list = errandsFor(0)
  assert.equal(list.length, 1)
  assert.equal(perfects(list).length, 0)
})

test('from day 2 at most one perfect dish is pinned, and the roll stays deterministic', () => {
  let saw = false
  for (let day = 2; day < 40; day++) {
    const a = errandsFor(day), b = errandsFor(day)
    assert.deepEqual(a, b)
    assert.equal(a.length, 2)
    assert.ok(perfects(a).length <= 1)
    if (perfects(a).length === 1) {
      saw = true
      const note = perfects(a)[0]
      assert.equal(note.wants.length, 1)
      assert.equal(note.wants[0].count, 1)
      assert.ok(note.npcId)
      assert.equal(a.filter(e => e.npcId === note.npcId).length, 1)
    }
  }
  assert.equal(saw, true)
})

test('a perfect note is taken down the next morning if it was not finished', () => {
  let day = 2, list = null
  for (; day < 80; day++) { const e = errandsFor(day); if (perfects(e).length) { list = e; break } }
  const E = { day: -1, list: [] }
  assert.ok(rollDay(E, day))
  const note = perfects(E.list)[0]
  assert.ok(note)
  const inv = { [note.wants[0].itemId]: 1 }
  assert.ok(rollDay(E, day + 1))
  assert.ok(E.list.every(e => e.day === day + 1))
  assert.equal(E.list.find(e => e.id === note.id), undefined)
  const again = errandsFor(day)
  const keep = again.find(e => e.wants.some(w => w.itemId.endsWith('_perfect')))
  const held = { day, list: again.map(e => ({ ...e, wants: e.wants.map(w => ({ ...w })) })) }
  assert.ok(accept(held, keep.id))
  assert.ok(deliver(held, keep.id, { [keep.wants[0].itemId]: 1 }))
  assert.equal(inv[note.wants[0].itemId], 1)
})
