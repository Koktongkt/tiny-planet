// Desktop glass HUD: identity bar + weather top-left, five menu buttons top-right, minimap, no phone menu.
import { test, expect } from '@playwright/test'
import { watchErrors, boot } from './helpers.js'

test('desktop glass HUD layout at 1280', async ({ page }) => {
  test.setTimeout(300_000)
  const w = watchErrors(page)
  await boot(page, '?enter&nosave&t=day&out')
  await page.waitForFunction(() => window.__scReady, null, { timeout: 150_000, polling: 250 })
  // the name lives in the identity bar; the old bottom-left controls guide is gone (Grandma's note + the quest tracker teach the keys)
  await expect(page.locator('.tp-clock')).toContainText('Tiny Planet')
  await expect(page.locator('.tp-hint')).toHaveCount(0)
  await expect(page.locator('.tp-menubtn')).toHaveCount(0)
  await expect(page.locator('.tp-pad')).toHaveCount(0)
  await expect(page.locator('.tp-btns > .tp-btn')).toHaveCount(5)
  await expect(page.locator('.mm-map')).toBeVisible()
  const clock = await page.locator('.tp-clock').boundingBox()
  const mapBtn = await page.locator('.mm-btn').boundingBox()
  const bag = await page.locator('.tp-bagbtn').boundingBox()
  // glass HUD: identity bar + weather ring top-left, menu buttons top-right, minimap bottom-left
  expect(clock.x).toBeLessThan(40)
  expect(clock.y).toBeLessThan(40)
  expect(await page.locator('.tp-clock .g-ring').count()).toBe(1)
  expect(mapBtn.width).toBeLessThan(36)
  expect(bag.x).toBeGreaterThan(900)
  expect(bag.y).toBeLessThan(80)
  w.check()
})
