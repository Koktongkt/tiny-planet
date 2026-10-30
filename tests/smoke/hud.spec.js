// Desktop HUD stays the full corner layout: title, five buttons, minimap, no phone menu.
import { test, expect } from '@playwright/test'
import { watchErrors, boot } from './helpers.js'

test('desktop HUD is unchanged at 1280', async ({ page }) => {
  test.setTimeout(300_000)
  const w = watchErrors(page)
  await boot(page, '?enter&nosave&t=day&out')
  await page.waitForFunction(() => window.__scReady, null, { timeout: 150_000, polling: 250 })
  await expect(page.locator('.tp-title')).toBeVisible()
  await expect(page.locator('.tp-title')).toContainText('Tiny Planet')
  await expect(page.locator('.tp-title')).toContainText('WASD')
  await expect(page.locator('.tp-menubtn')).toHaveCount(0)
  await expect(page.locator('.tp-pad')).toHaveCount(0)
  await expect(page.locator('.tp-btns > .tp-btn')).toHaveCount(5)
  await expect(page.locator('.mm-map')).toBeVisible()
  const clock = await page.locator('.tp-clock').boundingBox()
  const mapBtn = await page.locator('.mm-btn').boundingBox()
  const bag = await page.locator('.tp-bagbtn').boundingBox()
  expect(clock.x).toBeGreaterThan(900)
  expect(mapBtn.width).toBeLessThan(36)
  expect(bag.y).toBeGreaterThan(500)
  w.check()
})
