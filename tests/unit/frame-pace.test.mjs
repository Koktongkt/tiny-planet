// Touch idle pace: full rate while the player is active, 30 fps after a short idle,
// and the rendered steps still cover real time so motion does not speed up or stall.
import test from 'node:test'
import assert from 'node:assert/strict'
import { IDLE_MS, IDLE_FRAME_MS, paceFrame, stampActive } from '../../src/framePace.js'

const base = { touch: true, paused: false, booted: true }

test('desktop is never idled by the touch pacer', () => {
  const d = paceFrame({ ...base, touch: false, now: 5000, lastActive: 0, lastRender: 4990 })
  assert.deepEqual(d, { render: true, idle: false })
})

test('a hidden tab or a paused world does not render', () => {
  assert.equal(paceFrame({ ...base, paused: true, now: 100, lastActive: 100, lastRender: 0 }).render, false)
})

test('boot stays at full rate so the first frame is not throttled', () => {
  const d = paceFrame({ ...base, booted: false, now: 9000, lastActive: 0, lastRender: 8980 })
  assert.equal(d.render, true)
  assert.equal(d.idle, false)
})

test('input or movement keeps full rate, and idle starts after the delay', () => {
  assert.equal(stampActive(1000, 0, { held: true, moving: false }), 1000)
  assert.equal(stampActive(1000, 0, { held: false, moving: true }), 1000)
  assert.equal(stampActive(1000, 400, { held: false, moving: false }), 400)
  const fresh = paceFrame({ ...base, now: 400 + IDLE_MS - 1, lastActive: 400, lastRender: 400 + IDLE_MS - 20 })
  assert.equal(fresh.idle, false)
  assert.equal(fresh.render, true)
  const idle = paceFrame({ ...base, now: 400 + IDLE_MS, lastActive: 400, lastRender: 400 + IDLE_MS - 5 })
  assert.equal(idle.idle, true)
  assert.equal(idle.render, false)
})

test('any new input renders on the next tick even mid-interval', () => {
  const d = paceFrame({ ...base, now: 2000, lastActive: 2000, lastRender: 1995 })
  assert.equal(d.idle, false)
  assert.equal(d.render, true)
})

test('idle renders at 30 fps and the steps add up to real time', () => {
  let last = null, frames = 0, sum = 0
  for (let t = 0; t <= 2000; t += 1000 / 60) {
    const d = paceFrame({ ...base, now: t, lastActive: -1e9, lastRender: last })
    assert.equal(d.idle, true)
    if (!d.render) continue
    if (last != null) {
      const gap = t - last
      assert.ok(gap >= IDLE_FRAME_MS - 1, 'gap ' + gap)
      sum += gap
    }
    frames++
    last = t
  }
  assert.ok(frames >= 58 && frames <= 62, 'frames ' + frames)
  assert.ok(Math.abs(sum - 2000) < 40, 'sum ' + sum)
})

test('active play renders every display tick and still covers real time', () => {
  let last = null, frames = 0, sum = 0
  for (let t = 0; t <= 1000; t += 1000 / 60) {
    const d = paceFrame({ ...base, now: t, lastActive: t, lastRender: last })
    assert.equal(d.render, true)
    assert.equal(d.idle, false)
    if (last != null) sum += t - last
    frames++
    last = t
  }
  assert.ok(frames >= 59 && frames <= 61, 'frames ' + frames)
  assert.ok(Math.abs(sum - 1000) < 20, 'sum ' + sum)
})
