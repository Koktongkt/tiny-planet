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
  const dialog = page.getByRole('dialog', { name: 'Talking with ' + name })
  await expect(dialog).toHaveClass(/g-glass/)
  await expect(dialog.locator('.tk-progress')).toHaveAttribute('aria-label', /^Page 1 of /)
  await expect(dialog.locator('.tk-identity b')).toHaveText(name)
  await expect(dialog.getByRole('button', { name: 'Give a gift' })).toBeVisible()
  const box = await dialog.boundingBox()
  expect(box.width).toBeLessThanOrEqual(380)
  expect(box.x).toBeGreaterThanOrEqual(0)
  expect(box.y).toBeGreaterThanOrEqual(0)
  expect(box.y + box.height).toBeLessThanOrEqual(800)
  await page.keyboard.press('e')
  await expect(dialog.locator('.tk-progress')).toHaveAttribute('aria-label', /^Page 2 of /)
  await dialog.getByRole('button', { name: 'Close' }).click()
  await expect(dialog).toBeHidden()
  expect(await page.evaluate(() => window.__talk.open)).toBeNull()
  w.check()
})

test('Pip stays quiet beside her until she stands still 3 s, then offers Pet', async ({ page }) => {
  // petOffer shows the bubble once she has been still for 3 s, and placePrompt's timer uses the
  // raw frame delta. Standing through boot (often a minute of stalled frames) already passes 3 s,
  // so the bubble is latched before this test can "just arrive". Rock her a real step each frame
  // so that timer stays at 0 and the offer never latches. Gameplay is unchanged.
  await page.addInitScript(() => {
    let flip = 1
    const loop = () => {
      requestAnimationFrame(loop)
      if (window.__pipHoldStill) return
      const n = window.__player && window.__player.n
      if (!n || typeof n.normalize !== 'function') return
      flip = -flip
      n.x += flip * 0.02
      n.normalize()
    }
    requestAnimationFrame(loop)
  })
  const w = watchErrors(page); await boot(page, '?enter&nosave&t=day&out&at=village&dog=sit')
  await page.waitForFunction(() => { const D = window.__dog; return !!(D && D.n && D.init && !D.onBike && !(D.hop > 0)) }, null, { timeout: 30_000 })
  const arrived = await page.evaluate(() => new Promise((resolve) => {
    const P = window.__player, D = window.__dog
    const axis = P.n.clone().cross(P.fwd).normalize()
    const clear = (n) => {
      const spots = (window.__game.L && window.__game.L.spots) || []
      for (const s of spots) { const sn = s.stand || s.n; if (sn && n.angleTo(sn) < 0.25) return false }
      const b = window.__game.L && window.__game.L.bench; if (b && b.n && n.angleTo(b.n) < 0.25) return false
      return true
    }
    let spot = null
    for (let a = 0.5; a < 3.2 && !spot; a += 0.15) { const c = P.n.clone().applyAxisAngle(axis, a); if (clear(c)) spot = c }
    window.__pipHoldStill = true
    // A forced sit stays put (no side-quest). A quiet pet loses E to anything else in range,
    // so they have to be alone for G.near to be Pip while the bubble is still down.
    D.forced = true; D.state = 'sit'; D.speed = 0; D.route = null
    if (spot) { P.n.copy(spot); D.n.copy(spot) }
    P.target = null; window.__snap = 1
    let frames = 0
    const tick = () => {
      frames++
      const n = window.__game && window.__game.G && window.__game.G.near
      if ((n && /^dog/.test(n.id || '')) || frames > 40) resolve({ quiet: !!(n && n.quiet), id: n && n.id, frames, state: D.state, found: !!spot })
      else requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }))
  expect(arrived.found, 'no empty ground for Pip').toBe(true)
  expect(arrived.quiet, `first frames beside Pip ${JSON.stringify(arrived)}`).toBe(true) // just stopped: no bubble
  await expect(page.locator('.tp-bubble-wrap .tp-prompt')).toHaveCount(0)
  await nearIs(page, () => /^dog/.test(window.__game.G.near?.id || '') && window.__game.G.near.quiet === false)
  await expect(page.locator('.tp-bubble-wrap .tp-prompt')).toContainText('Pip', { timeout: 20_000 })
  w.check()
})
