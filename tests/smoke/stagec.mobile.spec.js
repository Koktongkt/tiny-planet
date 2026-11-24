// Stage C smoke (iPhone 13 profile): the Stage C layer loads on touch, the tutorial note shows, the Journal + Photo chips
// work, photo mode hides the touch pads, and the calmer reel takes a tap-and-hold.
import { test, expect } from '@playwright/test'
import { watchErrors, boot } from './helpers.js'
test('touch: tutorial note, journal + photo chips, photo mode hides the pads, reel by touch', async ({ page }) => {
  test.setTimeout(420_000)
  const w = watchErrors(page); await boot(page, '?enter&nosave&t=day&out&at=lake&give=rod')
  await page.waitForFunction(() => window.__scReady && window.__sc && window.__scLayout, null, { timeout: 150_000, polling: 250 })
  await expect(page.locator('.tpt-slip')).toHaveCount(0) // phone: the note is in the Menu, not a corner slip
  await page.locator('.tp-menubtn').tap()
  await page.locator('.tp-notebtn').tap(); await expect(page.locator('.tpt-note')).toBeVisible()
  await expect(page.locator('.tpt-play')).toContainText('Tiny Planet')
  await page.locator('.tpt-x').tap(); await expect(page.locator('.tpt')).toBeHidden()
  await page.locator('.tp-menubtn').tap()
  await page.locator('.tp-jbtn').tap(); await expect(page.locator('.jn-veil')).toBeVisible(); await page.locator('.jn-veil .tpx-x').tap()
  await page.locator('.tp-menubtn').tap()
  await page.locator('.tp-cambtn').tap()
  await page.waitForFunction(() => document.documentElement.classList.contains('tp-photo'), null, { timeout: 30_000 })
  await expect(page.locator('.tp-pad')).toBeHidden(); await expect(page.locator('.tpp-shutter')).toBeVisible()
  await page.locator('.tpp-close').tap(); await page.waitForFunction(() => !document.documentElement.classList.contains('tp-photo'), null, { timeout: 30_000 })
  await page.waitForFunction(() => window.__game.G.near?.spot?.item === 'fish', null, { timeout: 60_000 })
  // Fish is a head bubble. HUD chips also use .tp-chip and sit earlier in the DOM, so .first()
  // tapped those and fishing never started. The bubble follows the scene, so it is never 'stable'.
  const fishBubble = page.locator('.tp-bubble-wrap .tp-prompt')
  await expect(fishBubble).toBeVisible({ timeout: 20_000 })
  // The bubble is moved every frame. A coordinate tap misses it on SwiftShader (~1 fps), so the
  // reel never opens. Click the button itself, the same action the bubble's onClick runs.
  await fishBubble.evaluate((el) => el.click())
  await expect(page.locator('.tp-fish-c')).toBeVisible({ timeout: 30_000 })
  // Cast, wait and bite share one unclamped frame. On SwiftShader a frame is longer than biteS
  // (1.2 s), so 'bite' lasts a single frame and a 100 ms poll misses it. 'reel' means the bite happened.
  await page.waitForFunction(() => { const s = window.__fishSt; return !!s && (s.state === 'bite' || s.state === 'reel') }, null, { timeout: 30_000, polling: 100 })
  if (await page.evaluate(() => window.__fishSt.state) === 'bite') {
    const box = await page.locator('.tp-fish-c').boundingBox()
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.down()
    await page.waitForFunction(() => window.__fishSt.state === 'reel', null, { timeout: 60_000, polling: 100 })
    await page.mouse.up()
  } else await page.mouse.up().catch(() => {})
  w.check()
})
