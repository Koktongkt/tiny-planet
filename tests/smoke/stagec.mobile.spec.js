// Stage C smoke (iPhone 13 profile): the Stage C layer loads on touch, the tutorial note shows, the Journal + Photo chips
// work, photo mode hides the touch pads, and the calmer reel takes a tap-and-hold.
import { test, expect } from '@playwright/test'
import { watchErrors, boot } from './helpers.js'
test('touch: tutorial note, journal + photo chips, photo mode hides the pads, reel by touch', async ({ page }) => {
  test.setTimeout(420_000)
  const w = watchErrors(page); await boot(page, '?enter&nosave&t=day&out&at=lake&give=rod')
  await page.waitForFunction(() => window.__scReady && window.__sc && window.__scLayout, null, { timeout: 150_000, polling: 250 })
  await expect(page.locator('.tpt-slip')).toBeVisible() // folded on touch
  await page.locator('.tpt-slip').tap(); await expect(page.locator('.tpt-note')).toBeVisible()
  await page.locator('.tpt-x').tap(); await expect(page.locator('.tpt')).toBeHidden()
  await page.locator('.tp-jbtn').tap(); await expect(page.locator('.tpc-book')).toBeVisible(); await page.locator('.tpc-book .tp-x').tap()
  await page.locator('.tp-cambtn').tap()
  await page.waitForFunction(() => document.documentElement.classList.contains('tp-photo'), null, { timeout: 30_000 })
  await expect(page.locator('.tp-pad')).toBeHidden(); await expect(page.locator('.tpc-shutter')).toBeVisible()
  await page.locator('.tpc-close').tap(); await page.waitForFunction(() => !document.documentElement.classList.contains('tp-photo'), null, { timeout: 30_000 })
  await page.waitForFunction(() => window.__game.G.near?.spot?.item === 'fish', null, { timeout: 60_000 })
  await page.evaluate(() => window.__game.actions.act())
  await page.waitForFunction(() => window.__fishSt && window.__fishSt.state === 'bite', null, { timeout: 120_000, polling: 100 })
  const box = await page.locator('.tp-fish-c').boundingBox()
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.down()
  await page.waitForFunction(() => window.__fishSt.state === 'reel', null, { timeout: 60_000, polling: 100 })
  await page.mouse.up()
  w.check()
})
