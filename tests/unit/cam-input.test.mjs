// Camera-relative movement and camera input helpers (pure).
import test from 'node:test'
import assert from 'node:assert/strict'
import { moveIntent, screenYaw, turnStep, walkFactor, zoomStep, clampInYaw, ZMIN, ZMAX, ZOOM0 } from '../../src/camInput.js'
const near = (a, b, e = 1e-6) => Math.abs(a - b) < e
const pad0 = { active: false, x: 0, y: 0, mag: 0 }

test('keyboard intent: WASD and arrows as screen directions, diagonals normalised', () => {
  assert.deepEqual(moveIntent({ w: true }, pad0), { x: 0, y: 1, mag: 1 })
  assert.deepEqual(moveIntent({ arrowleft: true }, pad0), { x: -1, y: 0, mag: 1 })
  const d = moveIntent({ s: true, d: true }, pad0); assert.ok(near(d.x, Math.SQRT1_2) && near(d.y, -Math.SQRT1_2) && d.mag === 1)
  assert.equal(moveIntent({ w: true, s: true }, pad0).mag, 0)
})
test('stick intent: dead zone, then 0..1, keyboard wins', () => {
  assert.equal(moveIntent({}, { active: true, x: 0.05, y: 0.05, mag: 0.07 }).mag, 0)
  const p = moveIntent({}, { active: true, x: 0, y: 1, mag: 1 }); assert.ok(p.y > 0.99 && near(p.mag, 1))
  const h = moveIntent({}, { active: true, x: 0.42, y: 0, mag: 0.42 }); assert.ok(h.mag > 0.4 && h.mag < 0.6 && h.x > 0.99)
  assert.deepEqual(moveIntent({ a: true }, { active: true, x: 1, y: 0, mag: 1 }), { x: -1, y: 0, mag: 1 })
})
test('screenYaw: up is where the camera looks, right is screen right', () => {
  assert.ok(near(screenYaw(Math.PI, 0, 1), Math.PI)) // camera looking toward -z: up = -z
  assert.ok(near(Math.sin(screenYaw(Math.PI, 1, 0)), 1)) // right = +x
  assert.ok(near(Math.cos(screenYaw(Math.PI, 0, -1)), 1)) // down = toward the camera (+z)
})
test('turnStep eases toward the target the short way round', () => {
  let s = { yaw: 3.0, gap: 0 }; for (let i = 0; i < 60; i++) s = turnStep(s.yaw, -3.0, 1 / 60)
  assert.ok(s.gap < 0.01 && Math.abs(Math.sin(s.yaw - -3.0)) < 0.01)
  const one = turnStep(3.0, -3.0, 1 / 60); assert.ok(one.yaw > 3.0, 'crosses pi, not the long way')
})
test('walkFactor: full when facing, slow while turning round', () => {
  assert.equal(walkFactor(0.2), 1); assert.equal(walkFactor(2.5), 0.25); const m = walkFactor(1.1); assert.ok(m < 1 && m > 0.25)
})
test('zoom: wider default, clamped wheel steps', () => {
  assert.ok(ZOOM0 > 1.2 && ZOOM0 < ZMAX)
  assert.ok(zoomStep(1, 100) > 1 && zoomStep(1, -100) < 1)
  assert.equal(zoomStep(ZMAX, 100), ZMAX); assert.equal(zoomStep(ZMIN, -100), ZMIN)
})
test('indoor orbit is limited to the front of the cut-away room', () => { assert.equal(clampInYaw(2), 0.7); assert.equal(clampInYaw(-2), -0.7); assert.equal(clampInYaw(0.3), 0.3) })
