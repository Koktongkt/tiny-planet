import test from 'node:test'
import assert from 'node:assert/strict'
import { subscribeView, emitView, subscribeStick, emitStick, watchReady } from '../../src/signals.js'

test('a view listener hears the new mode and then unsubscribes', () => {
  const seen = []
  const off = subscribeView(m => seen.push(m))
  emitView('orbit')
  off()
  emitView('follow')
  assert.deepEqual(seen, ['orbit'])
})

test('the talk-stick listener is separate from the view listener', () => {
  const seen = []
  const off = subscribeStick(v => seen.push(v))
  emitView('orbit')
  emitStick(true)
  off()
  emitStick(false)
  assert.deepEqual(seen, [true])
})

test('watchReady fires immediately when the flag is already set', () => {
  let n = 0
  const off = watchReady(() => true, () => { throw new Error('should not subscribe') }, () => n++)
  assert.equal(n, 1)
  off()
})

test('watchReady waits for the event, then unsubscribes', () => {
  let ready = false, n = 0, fire = null
  const off = watchReady(() => ready, (fn) => { fire = fn; return () => { fire = null } }, () => n++)
  fire()
  assert.equal(n, 0)
  ready = true
  fire()
  assert.equal(n, 1)
  assert.equal(fire, null)
  off()
})
