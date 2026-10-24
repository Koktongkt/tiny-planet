// Stage F smoke (desktop): play all four cook steps, Skip, a forced normal result, and Auto-cook.
import { test, expect } from '@playwright/test'
import { watchErrors, boot } from './helpers.js'
import { cookReady, openStep, settled, playStirKey, playFlip, playPress, playPour } from './cookplay.js'

test('cooking: stir, flip, press, pour, skip, and auto-cook', async ({ page }) => {
  test.setTimeout(300_000)
  const w = watchErrors(page)
  await boot(page, '?enter&nosave&t=day&out&at=home&give=acorn:3,rice:1')
  await cookReady(page)

  await playStirKey(page)
  await playFlip(page, { key: true })
  await playPress(page, 'mouse')
  await playPour(page, 'mouse')

  await openStep(page, 'stir')
  await expect(page.locator('.tp-cook-skip')).toBeVisible()
  await page.locator('.tp-cook-skip').click()
  await page.waitForFunction(() => window.__tpCook.last?.via === 'skip', null, { timeout: 15_000 })
  expect(await page.evaluate(() => window.__tpCook.last)).toMatchObject({ item: 'soup', perfect: false, via: 'skip' })
  await settled(page)

  await page.evaluate(() => { window.__tpCook.force('normal'); window.__tpCook.last = null; window.__tpCook.scale = 1; window.__tpCook.open('flip') })
  await page.waitForFunction(() => window.__tpCook.ready === true, null, { timeout: 30_000 })
  await page.evaluate(() => window.__tpCook.finish())
  await page.waitForFunction(() => window.__tpCook.last?.via === 'play', null, { timeout: 15_000 })
  expect(await page.evaluate(() => window.__tpCook.last)).toMatchObject({ item: 'grilledfish', perfect: false, via: 'play' })
  await settled(page)

  await page.waitForFunction(() => window.__sbReady && window.__sb, null, { timeout: 120_000, polling: 250 })
  await page.locator('.tp-gearbtn').click()
  await expect(page.getByRole('switch', { name: 'Auto-cook' })).toBeVisible()
  expect(await page.getByRole('switch', { name: 'Auto-cook' }).getAttribute('aria-checked')).toBe('false')
  await page.getByRole('switch', { name: 'Auto-cook' }).click()
  await page.locator('.tps-foot .tpx-btn').click()
  await page.evaluate(() => { const P = window.__player; P.n.copy(window.__game.L.bench.n); P.target = null; window.__snap = 1 })
  await page.waitForFunction(() => window.__game.G.near?.kind === 'bench', null, { timeout: 30_000 })
  await page.keyboard.press('e')
  await page.locator('.tp-recipe', { hasText: 'Acorn Cookie' }).locator('.tp-craft').click()
  await page.waitForFunction(() => (window.__game.G.s.inv.acorn_cookie || 0) === 1 && !window.__game.G.ui.crafting && !window.__game.G.ui.cook, null, { timeout: 20_000 })
  expect(await page.locator('.tp-cook').count()).toBe(0)
  const after = await page.evaluate(() => ({ rice: window.__game.G.s.inv.rice || 0, acorn: window.__game.G.s.inv.acorn || 0, auto: window.__game.G.s.settings.autoCook }))
  expect(after.auto).toBe(true)
  expect(after.acorn).toBe(0)
  expect(after.rice).toBe(0)
  w.check()
})
