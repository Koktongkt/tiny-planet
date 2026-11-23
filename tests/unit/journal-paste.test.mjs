// Photos in the album look pasted in by hand: each gets its own tilt, nudge and tape, the same every time it is shown.
import test from 'node:test'
import assert from 'node:assert/strict'
import { pasteLook, TAPES } from '../../src/ui/journal/book/paste.js'

test('the same photo is always pasted the same way', () => {
  assert.deepEqual(pasteLook('ph1a2b'), pasteLook('ph1a2b'))
})
test('tilt, nudge and tape stay small enough to keep the page tidy', () => {
  for (let i = 0; i < 200; i++) { const l = pasteLook('ph' + i.toString(36))
    assert.ok(Math.abs(l.rot) <= 7, 'rot ' + l.rot); assert.ok(Math.abs(l.x) <= 8 && Math.abs(l.y) <= 8, 'nudge')
    assert.ok(TAPES.includes(l.tape)); assert.ok(Math.abs(l.tapeRot) <= 14) }
})
test('photos are not all pasted alike', () => {
  const looks = Array.from({ length: 12 }, (_, i) => pasteLook('ph' + (1000 + i * 7919).toString(36)))
  assert.ok(new Set(looks.map(l => l.tape)).size >= 2); assert.ok(new Set(looks.map(l => Math.round(l.rot))).size >= 5)
  assert.ok(looks.some(l => l.rot < -1) && looks.some(l => l.rot > 1)) // leaning both ways
})
test('the style uses the album\'s own variable names (a page-wide --r is typed as a length and would swallow a tilt)', async () => {
  const { pasteStyle } = await import('../../src/ui/journal/book/paste.js')
  const st = pasteStyle('ph1'); assert.deepEqual(Object.keys(st).sort(), ['--jb-rot', '--jb-tape', '--jb-x', '--jb-y'])
  assert.match(st['--jb-rot'], /deg$/); assert.match(st['--jb-x'], /px$/)
})
