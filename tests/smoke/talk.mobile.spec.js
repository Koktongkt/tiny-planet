import { test, expect } from '@playwright/test'
import { watchErrors, boot } from './helpers.js'

test('villager dialogue stays compact and tappable in portrait and landscape', async ({ page }) => {
  const w = watchErrors(page)
  await boot(page, '?enter&nosave&t=day&out&at=talk')
  await page.waitForFunction(() => !!window.__sb && !!window.__talk?.near, null, { timeout: 40_000 })
  await page.locator('.tk-bubble .tp-bubble').tap()
  const dialog = page.locator('.tk-box')
  await expect(dialog).toBeVisible()
  await expect(dialog.locator('.tk-key')).toHaveCount(0)
  await expect(page.locator('.tp-stick')).toHaveCount(0)
  for (const size of [{ width: 390, height: 664 }, { width: 844, height: 390 }]) {
    await page.setViewportSize(size)
    await expect.poll(async () => {
      const b = await dialog.boundingBox()
      return b && b.x >= 0 && b.y >= 0 && b.x + b.width <= size.width + 1 && b.y + b.height <= size.height + 1
    }).toBeTruthy()
    for (const button of await dialog.locator('button').all()) {
      const b = await button.boundingBox()
      expect(b.width).toBeGreaterThanOrEqual(44)
      expect(b.height).toBeGreaterThanOrEqual(44)
    }
  }
  await dialog.getByRole('button', { name: 'Continue' }).tap()
  await expect(dialog.locator('.tk-progress')).toHaveAttribute('aria-label', /^Page 2 of /)
  await dialog.getByRole('button', { name: 'Close' }).tap()
  await expect(dialog).toBeHidden()
  await expect(page.locator('.tp-stick')).toBeVisible()
  w.check()
})
