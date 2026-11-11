import test from 'node:test'
import assert from 'node:assert/strict'
import { notePerfect, stitchRow, COOK_COUNT } from '../../src/systems/perfectLog.js'
import { fresh, migrate } from '../../src/save/schema.js'

test('the first perfect cook is kept, and cooking it again does not move the day', () => {
  const s = fresh()
  assert.equal(notePerfect(s, 'soup_perfect', 3), true)
  assert.equal(notePerfect(s, 'soup_perfect', 9), false)
  assert.equal(s.journal.perfect.soup_perfect, 3)
  assert.equal(COOK_COUNT, 7)
})

test('eating does not clear a stitch, and an old save migrates with an empty row', () => {
  const s = fresh()
  notePerfect(s, 'jam_perfect', 1)
  const eaten = migrate(JSON.parse(JSON.stringify(s)))
  assert.equal(eaten.journal.perfect.jam_perfect, 1)
  const old = migrate({ v: 1, day: 4, inv: { soup: 2 } })
  assert.equal(old.journal.perfect, undefined)
  assert.equal(stitchRow(old).filter(Boolean).length, 0)
  notePerfect(old, 'onigiri_perfect', 4)
  assert.equal(stitchRow(old).filter(Boolean).length, 1)
  assert.equal(stitchRow(old).length, 7)
})
