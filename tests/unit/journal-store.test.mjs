// Closing any panel (Escape, J, the book's ×) forgets that the book was opened from the bench.
import test from 'node:test'
import assert from 'node:assert/strict'
globalThis.location = { search: '?nosave' } // store.js reads the URL; no browser here
const { G, setPanel } = await import('../../src/game/store.js')

test('closing a panel clears the bench flag; opening one keeps it', () => {
  G.ui.panel = null; G.ui.atBench = true
  setPanel('journal'); assert.equal(G.ui.panel, 'journal'); assert.equal(G.ui.atBench, true)
  setPanel('journal'); assert.equal(G.ui.panel, null); assert.equal(G.ui.atBench, false) // J again closes it
  G.ui.panel = 'recipes'; G.ui.atBench = true; setPanel(null); assert.equal(G.ui.atBench, false)
})
