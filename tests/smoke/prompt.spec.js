// In-world action prompts: anchors on targets, head bubble + pickup chip placement, gold outline, villagers.
import { test, expect } from '@playwright/test'
import { watchErrors, boot } from './helpers.js'

const nearIs = (page, pred) => page.waitForFunction(pred, null, { timeout: 30_000 })
const go = (page, fn) => page.evaluate(fn)

test('every target has an anchor', async ({ page }) => {
  const w = watchErrors(page); await boot(page, '?enter&nosave&t=day&out&at=village')
  await go(page, () => { const sp = window.__game.L.spots.find(s => s.id.startsWith('mushroom-show')); const P = window.__player; P.n.copy(sp.stand); P.target = null; window.__snap = 1 })
  await nearIs(page, () => window.__game.G.near?.kind === 'spot')
  expect(await page.evaluate(() => typeof window.__game.G.near.at)).toBe('function')
  await go(page, () => { const P = window.__player; P.n.copy(window.__game.L.bench.n); P.target = null; window.__snap = 1 })
  await nearIs(page, () => window.__game.G.near?.kind === 'bench')
  expect(await page.evaluate(() => typeof window.__game.G.near.at)).toBe('function')
  await page.waitForFunction(() => { const D = window.__dog; return !!(D && D.n && D.init && !D.onBike && !(D.hop > 0)) }, null, { timeout: 30_000 })
  await go(page, () => { const P = window.__player; P.n.copy(window.__dog.n); P.target = null; window.__snap = 1 })
  await nearIs(page, () => /^dog/.test(window.__game.G.near?.id || ''))
  expect(await page.evaluate(() => typeof window.__game.G.near.at)).toBe('function')
  w.check()
})

// the bubble/chip sits over its target: its tail tip (bottom centre-ish) is within 80 px of the projected anchor
const overAnchor = async (page, sel) => page.evaluate((sel) => {
  const el = document.querySelector(sel), pt = window.__prompt?.pt; if (!el || !pt) return null
  const r = el.getBoundingClientRect(); return { dx: Math.abs(r.left + r.width / 2 - pt.x), bottom: r.bottom, ptY: pt.y, h: innerHeight }
}, sel)

test('pickups get the small chip over the item; the bench gets the head bubble', async ({ page }) => {
  const w = watchErrors(page); await boot(page, '?enter&nosave&t=day&out&at=village')
  await go(page, () => { const sp = window.__game.L.spots.find(s => s.id.startsWith('mushroom-show')); const P = window.__player; P.n.copy(sp.stand); P.target = null; window.__snap = 1 })
  await nearIs(page, () => window.__game.G.near?.kind === 'spot')
  await expect(page.locator('.tp-pick')).toBeVisible({ timeout: 20_000 })
  await expect(page.locator('.tp-pick')).toHaveClass(/tp-chip/)
  await page.waitForTimeout(800)
  const a = await overAnchor(page, '.tp-pick'); expect(a).not.toBeNull(); expect(a.dx).toBeLessThan(80)
  await go(page, () => { const P = window.__player; P.n.copy(window.__game.L.bench.n); P.target = null; window.__snap = 1 })
  await nearIs(page, () => window.__game.G.near?.kind === 'bench')
  await expect(page.locator('.tp-prompt.tp-bubble')).toBeVisible({ timeout: 20_000 })
  await expect(page.locator('.tp-pick')).toHaveCount(0)
  await page.waitForTimeout(800)
  const b = await overAnchor(page, '.tp-prompt'); expect(b.dx).toBeLessThan(80); expect(b.bottom).toBeLessThan(b.h * 2 / 3)
  w.check()
})

test('indoors the bubble follows the house targets', async ({ page }) => {
  const w = watchErrors(page); await boot(page, '?enter&nosave&t=day')
  await page.waitForFunction(() => window.__home?.inside, null, { timeout: 30_000 })
  await page.evaluate(() => Object.assign(window.__home.hp, { x: 0, z: 1.3 })) // by the door
  await expect(page.locator('.tp-prompt.tp-bubble')).toContainText('outside', { timeout: 30_000 })
  w.check()
})

test('the targeted pickup gets the gold outline; the white ring is gone', async ({ page }) => {
  const w = watchErrors(page); await boot(page, '?enter&nosave&t=day&out&at=village')
  await go(page, () => { const sp = window.__game.L.spots.find(s => s.id.startsWith('mushroom-show')); const P = window.__player; P.n.copy(sp.stand); P.target = null; window.__snap = 1 })
  await nearIs(page, () => window.__game.G.near?.kind === 'spot')
  await page.waitForFunction(() => /^mushroom-show/.test(window.__outline?.id || ''), null, { timeout: 20_000 })
  expect(await page.evaluate(() => window.__outline.ring)).toBeUndefined()
  await go(page, () => { const P = window.__player; P.n.copy(window.__game.L.bench.n); P.target = null; window.__snap = 1 })
  await nearIs(page, () => window.__game.G.near?.kind === 'bench')
  await page.waitForFunction(() => window.__outline && window.__outline.id === null, null, { timeout: 20_000 })
  w.check()
})

test('villagers: Talk to bubble with Give a gift stacked above, one bubble at a time', async ({ page }) => {
  const w = watchErrors(page); await boot(page, '?enter&nosave&t=day&out&at=talk')
  const tb = page.locator('.tk-bubble')
  await expect(tb).toContainText('Talk to', { timeout: 40_000 })
  await page.waitForFunction(() => !!window.__sb, null, { timeout: 40_000 })
  await expect(tb).toContainText('Give a gift', { timeout: 20_000 })
  const name = await page.evaluate(() => document.querySelector('.tk-bubble .tp-bubble b')?.textContent || '')
  expect(name.length).toBeGreaterThan(1)
  await expect(page.locator('.tp-bubble-wrap:not(.tp-hidden)')).toHaveCount(0)
  await page.keyboard.press('e')
  await expect(page.locator('.tk-box')).toBeVisible({ timeout: 20_000 })
  await expect(tb.locator('.tp-bubble')).toBeHidden()
  w.check()
})
