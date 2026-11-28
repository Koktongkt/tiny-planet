import { test } from 'node:test'
import assert from 'node:assert/strict'
import { placeDialogue } from '../../src/talk/placement.js'

const desktop = { w: 1280, h: 800 }, card = { bw: 378, bh: 126 }
const at = (x, y, behind = false) => ({ x, y, behind })
const inside = (p, size, box) => {
  assert.ok(p.left >= 12)
  assert.ok(p.top >= 12)
  assert.ok(p.left + box.bw <= size.w - 12)
  assert.ok(p.top + box.bh <= size.h - 12)
}
test('dialogue floats above the speaker with clearance and a pointing tail', () => {
  const p = placeDialogue(at(700, 280), desktop, card)
  assert.deepEqual(p, { left: 511, top: 142, tail: 189, side: 'down' })
  inside(p, desktop, card)
})
test('dialogue stays onscreen at left and right edges', () => {
  for (const x of [0, desktop.w]) {
    const p = placeDialogue(at(x, 300), desktop, card)
    inside(p, desktop, card)
    assert.equal(p.side, 'down')
    assert.ok(p.tail >= 14 && p.tail <= card.bw - 14)
  }
})
test('dialogue moves beside the speaker if there is no room above', () => {
  const r = placeDialogue(at(290, 35), desktop, card)
  assert.equal(r.side, 'left')
  assert.ok(r.left > 290)
  const l = placeDialogue(at(1100, 35), desktop, card)
  assert.equal(l.side, 'right')
  assert.ok(l.left + card.bw < 1100)
  inside(r, desktop, card); inside(l, desktop, card)
})
test('touch fallback keeps the bubble in frame when there is no room above or beside', () => {
  const size = { w: 390, h: 664 }, box = { bw: 340, bh: 155 }
  const p = placeDialogue(at(195, 80), size, box, { touch: true })
  assert.equal(p.side, 'none')
  assert.ok(p.top + box.bh <= size.h - 205)
  inside(p, size, box)
})
test('offscreen and behind-camera fallback has no misleading tail', () => {
  for (const pt of [at(-20, 70), at(700, 400, true)]) {
    const p = placeDialogue(pt, desktop, card)
    assert.equal(p.side, 'none')
    inside(p, desktop, card)
  }
})
test('dialogue placement accounts for larger zoomed cards and landscape phones', () => {
  for (const size of [{ w: 360, h: 640 }, { w: 844, h: 390 }]) {
    const box = { bw: Math.min(442, size.w - 24), bh: 220 }
    for (const pt of [at(size.w / 2, size.h / 2), at(size.w - 4, 70), at(0, 500, true)]) {
      inside(placeDialogue(pt, size, box, { touch: true }), size, box)
    }
  }
})
