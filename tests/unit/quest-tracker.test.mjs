// HUD quest tracker: tutorial steps first, then a taken errand, then a nudge toward the board.
import test from 'node:test'
import assert from 'node:assert/strict'
import { questFor } from '../../src/ui/glass/quest.js'
import { STEPS } from '../../src/systems/tutorial.js'

const opts = { steps: STEPS, itemName: (id) => ({ wood: 'Wood', berries: 'Berries' }[id] || id), npcName: (id) => ({ grandma: 'Grandma Fuku' }[id] || id) }
const tut = (ids) => ({ done: Object.fromEntries(ids.map(i => [i, true])), dismissed: false })

test('a fresh save tracks the first tutorial step and the one after it', () => {
  const q = questFor({ tutorial: tut([]), inv: {} }, opts)
  assert.equal(q.kind, 'tutorial'); assert.equal(q.progress, '0/7')
  assert.deepEqual(q.lines.map(l => l.state), ['now', 'todo'])
  assert.equal(q.lines[0].text, STEPS[0].text)
})

test('mid-tutorial shows the step just done, the current one and the next', () => {
  const q = questFor({ tutorial: tut(['move', 'look']), inv: {} }, opts)
  assert.equal(q.progress, '2/7')
  assert.deepEqual(q.lines.map(l => l.state), ['done', 'now', 'todo'])
  assert.equal(q.lines[1].text, STEPS[2].text)
})

test('touch wording is used on phones when a step has it', () => {
  const q = questFor({ tutorial: tut([]), inv: {} }, { ...opts, touch: true })
  assert.equal(q.lines[0].text, STEPS[0].textTouch)
})

test('steps done out of order still pick the first open one', () => {
  const q = questFor({ tutorial: tut(['move', 'look', 'gather', 'talk']), inv: {} }, opts)
  assert.equal(q.lines.find(l => l.state === 'now').text, STEPS[3].text) // craft is still open
})

const all = tut(STEPS.map(s => s.id))
test('a taken errand lists what to bring with counts, then who to bring it to', () => {
  const s = { tutorial: all, inv: { wood: 2 }, errands: { list: [{ id: 'e1', npcId: 'grandma', wants: [{ itemId: 'wood', count: 3 }], accepted: true, done: false }] } }
  const q = questFor(s, opts)
  assert.equal(q.kind, 'errand'); assert.equal(q.title, 'A favour for Grandma Fuku')
  assert.deepEqual(q.lines, [{ text: 'Bring 3 × Wood', count: '2/3', state: 'now' }, { text: 'Take it to Grandma Fuku', state: 'todo' }])
  s.inv.wood = 5
  assert.deepEqual(questFor(s, opts).lines.map(l => l.state), ['done', 'now'])
  assert.equal(questFor(s, opts).lines[0].count, '3/3')
})

test('untaken notes nudge toward the board; nothing left means no tracker', () => {
  const e = { id: 'e1', npcId: 'grandma', wants: [{ itemId: 'berries', count: 1 }], accepted: false, done: false }
  assert.equal(questFor({ tutorial: all, inv: {}, errands: { list: [e] } }, opts).kind, 'board')
  assert.equal(questFor({ tutorial: all, inv: {}, errands: { list: [{ ...e, done: true }] } }, opts), null)
  assert.equal(questFor({ tutorial: all, inv: {} }, opts), null)
})
