// Phone HUD (Option B): corner pill + Bag + Menu, map and planet view inside the menu,
// title in Grandma's note, chrome ghosts while the stick is held, no pad overlaps.
import { test, expect } from '@playwright/test'
import { watchErrors, boot } from './helpers.js'

const overlap = (a, b) => a && b && a[0] < b[2] - 1 && b[0] < a[2] - 1 && a[1] < b[3] - 1 && b[1] < a[3] - 1
const rects = (page) => page.evaluate(() => {
  const sels = ['.tp-title', '.tp-clock', '.tp-btns > .tp-btn', '.mm-map', '.mm-btn', '.tpt', '.tp-stick', '.tp-jump', '.tp-act', '.tp-view', '.tp-prompt', '.tp-chip', '.tp-ride', '.tp-rotate']
  const out = []
  for (const sel of sels) for (const e of document.querySelectorAll(sel)) {
    const s = getComputedStyle(e), b = e.getBoundingClientRect()
    if (s.display === 'none' || s.visibility === 'hidden' || parseFloat(s.opacity) < 0.05 || b.width < 2 || b.height < 2) continue
    out.push({ sel, op: +parseFloat(s.opacity).toFixed(2), b: [b.x, b.y, b.right, b.bottom], h: b.height })
  }
  return out
})

test('phone menu, hidden map, note hint, auto-hide, ride key, no pad overlaps', async ({ page, context }) => {
  test.setTimeout(420_000)
  const w = watchErrors(page)
  await boot(page, '?enter&nosave&t=day&out&at=home')
  await page.waitForFunction(() => window.__scReady && window.__seReady && window.__sbLayout && window.__tp, null, { timeout: 150_000, polling: 250 })

  await expect(page.locator('.mm-map')).toHaveCount(0)
  await expect(page.locator('.tp-title')).toBeHidden()
  await expect(page.locator('.tp-view')).toHaveCount(0)
  await expect(page.locator('.tpt-slip')).toHaveCount(0)

  await page.locator('.tp-menubtn').tap()
  for (const name of ['Recipes', 'Journal', 'Photo mode', 'Map', "Grandma's note", 'Settings', 'Planet view']) {
    await expect(page.getByRole('button', { name, exact: true })).toBeVisible()
  }
  await page.getByRole('button', { name: "Grandma's note", exact: true }).tap()
  await expect(page.locator('.tpt-play')).toContainText('Tiny Planet')
  await expect(page.locator('.tpt-play')).toContainText('Stick to walk')
  await page.locator('.tpt-x').tap()
  await expect(page.locator('.tpt')).toBeHidden()

  await page.locator('.tp-menubtn').tap()
  await page.getByRole('button', { name: 'Map', exact: true }).tap()
  await expect(page.locator('.mm-map')).toBeVisible()
  const close = await page.locator('.mm-btn').boundingBox()
  expect(close.width).toBeGreaterThanOrEqual(44)
  expect(close.height).toBeGreaterThanOrEqual(44)
  await page.locator('.mm-btn').tap()
  await expect(page.locator('.mm-map')).toHaveCount(0)

  await page.locator('.tp-menubtn').tap()
  await page.getByRole('button', { name: 'Planet view', exact: true }).tap()
  await expect(page.locator('.tp-stick')).toHaveCount(0)
  await page.locator('.tp-menubtn').tap()
  await page.getByRole('button', { name: 'Back to walking', exact: true }).tap()
  await expect(page.locator('.tp-stick')).toBeVisible()

  await page.evaluate(() => { window.__game.G.s.tools.bike = true; window.__tp.emit() })
  await expect(page.locator('.tp-ride')).toBeVisible()
  await expect(page.locator('.tp-ride .key')).toBeHidden()
  const ride = await page.locator('.tp-ride').boundingBox()
  expect(ride.height).toBeGreaterThanOrEqual(44)

  await page.evaluate(() => { const P = window.__player; P.n.copy(window.__sbLayout.plots[0].n); P.target = null; window.__snap = 1 })
  await expect(page.locator('.tp-prompt, .tp-chip').first()).toBeVisible({ timeout: 30_000 })
  const cdp = await context.newCDPSession(page)
  const hold = async () => {
    const box = await page.locator('.tp-stick').boundingBox()
    const x = box.x + box.width / 2, y = box.y + box.height * 0.62
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1 }] })
    const on = await page.waitForFunction(() => !!document.querySelector('.tp-stick.on'), null, { timeout: 2000 }).then(() => true).catch(() => false)
    if (!on) {
      const info = await page.evaluate(({ x, y }) => {
        const hit = document.elementFromPoint(x, y)
        const s = document.querySelector('.tp-stick')
        return { hit: hit && (hit.getAttribute('aria-label') || hit.className || hit.tagName), stickOp: getComputedStyle(s).opacity, pad: document.querySelector('.tp-pad').className }
      }, { x, y })
      throw new Error('stick did not engage ' + JSON.stringify(info))
    }
    return { x, y }
  }
  await hold()
  await page.waitForFunction(() => parseFloat(getComputedStyle(document.querySelector('.tp-clock')).opacity) < 0.35, null, { timeout: 3000 })
  const faded = await page.evaluate(() => ({
    clock: getComputedStyle(document.querySelector('.tp-clock')).opacity,
    btns: getComputedStyle(document.querySelector('.tp-btns')).opacity,
    prompt: getComputedStyle(document.querySelector('.tp-prompt, .tp-chip')).opacity,
    ride: getComputedStyle(document.querySelector('.tp-ride')).opacity,
    pe: getComputedStyle(document.querySelector('.tp-prompt, .tp-chip')).pointerEvents,
  }))
  expect(Number(faded.clock)).toBeGreaterThan(0.2)
  expect(Number(faded.clock)).toBeLessThan(0.4)
  expect(Number(faded.btns)).toBeLessThan(0.4)
  expect(Number(faded.prompt)).toBeGreaterThan(0.9)
  expect(Number(faded.ride)).toBeGreaterThan(0.9)
  expect(faded.pe).not.toBe('none')
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await page.waitForFunction(() => parseFloat(getComputedStyle(document.querySelector('.tp-clock')).opacity) > 0.95, null, { timeout: 3000 })

  const pads = new Set(['.tp-stick', '.tp-jump', '.tp-act', '.tp-view'])
  for (const size of [{ width: 390, height: 664 }, { width: 360, height: 640 }, { width: 844, height: 390 }, { width: 640, height: 360 }]) {
    await page.setViewportSize(size)
    await page.waitForTimeout(250)
    await hold()
    await page.waitForTimeout(200)
    const els = await rects(page)
    const pad = els.filter(e => pads.has(e.sel)), hud = els.filter(e => !pads.has(e.sel))
    expect(pad.length).toBeGreaterThanOrEqual(3)
    for (const h of hud) for (const p of pad) expect(overlap(h.b, p.b), `${size.width}x${size.height} ${h.sel} vs ${p.sel}`).toBeFalsy()
    for (const e of hud.filter(e => e.sel === '.tp-btns > .tp-btn' || e.sel === '.tp-ride' || e.sel === '.tp-chip')) expect(e.h, e.sel).toBeGreaterThanOrEqual(44)
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  }
  w.check()
})
