import { test, expect } from '@playwright/test'
import { watchErrors } from './helpers.js'

test('the start button waits for house and deferred startup work before revealing the room', async ({ page }) => {
  const errors = watchErrors(page)
  await page.goto('?nosave&t=day')
  await page.waitForSelector('#go.on', { timeout: 200_000 })
  const state = await page.evaluate(() => ({ marks: window.__loadMarks, inside: window.__home.inside, camera: window.__cam3.layers.mask, ground: window.__groundReady, shore: window.__shoreReady }))
  expect(state.inside).toBe(true)
  expect(state.camera).toBe(1 << 5)
  expect(state.ground).toBe(true)
  expect(state.shore).toBe(true)
  for (const stage of ['baked', 'cat', 'activities', 'frame', 'villagers', 'edgeveg', 'ground', 'shore', 'game', 'talk']) {
    expect(state.marks[stage], stage).toBeDefined()
    expect(state.marks[stage]).toBeLessThanOrEqual(state.marks.ready)
  }
  await page.locator('#go').click()
  await expect(page.locator('#ld')).toHaveCount(0)
  expect(await page.evaluate(() => window.__home.inside)).toBe(true)
  errors.check()
})
