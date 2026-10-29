// Stage F smoke (mobile): the four steps by touch, and a full-screen panel that hides the HUD.
import { test, expect } from '@playwright/test'
import { watchErrors, boot } from './helpers.js'
import { cookReady, openStep, settled, expectCookFits, playStirTouch, playFlip, playPress, playPour } from './cookplay.js'

test('cooking on a phone: touch steps, HUD hidden, controls return', async ({ page }) => {
  test.setTimeout(300_000)
  const w = watchErrors(page)
  await boot(page, '?enter&nosave&t=day&out&at=home')
  await cookReady(page)

  await page.evaluate(() => { window.__tpCook.scale = 0; window.__tpCook.hold = false; window.__tpCook.force(null); window.__tpCook.last = null; window.__tpCook.open('pour') })
  await page.waitForFunction(() => window.__tpCook.ready === true && document.documentElement.classList.contains('tp-cooking'), null, { timeout: 30_000 })
  const hud = await page.evaluate(() => {
    const style = (sel) => { const el = document.querySelector(sel); return el ? getComputedStyle(el) : null }
    const card = document.querySelector('.tp-cook-card').getBoundingClientRect()
    const btns = document.querySelector('.tp-btns').getBoundingClientRect()
    const pad = document.querySelector('.tp-pad')
    const padBox = pad ? pad.getBoundingClientRect() : null
    const overlap = (a, b) => b && a.right > b.left && a.left < b.right && a.bottom > b.top && a.top < b.bottom && b.width > 2 && b.height > 2
    return {
      cooking: document.documentElement.classList.contains('tp-cooking'),
      touch: getComputedStyle(document.querySelector('.tp-cook')).touchAction,
      uiDisplay: style('.tp-ui').display,
      padDisplay: style('.tp-pad') && style('.tp-pad').display,
      overlapBtns: overlap(card, btns),
      overlapPad: overlap(card, padBox),
      centered: Math.abs((card.left + card.right) / 2 - innerWidth / 2) < 48,
      wide: card.width > innerWidth * 0.8,
    }
  })
  expect(hud.cooking).toBe(true)
  expect(hud.touch).toBe('none')
  expect(hud.uiDisplay).toBe('none')
  expect(hud.padDisplay).toBe('none')
  expect(hud.overlapBtns).toBe(false)
  expect(hud.overlapPad).toBe(false)
  expect(hud.centered).toBe(true)
  expect(hud.wide).toBe(true)

  // Phone panel stays inside the screen, Skip included, and the step art stays off the meter.
  for (const size of [{ width: 390, height: 664 }, { width: 360, height: 640 }, { width: 844, height: 390 }, { width: 640, height: 360 }]) {
    await page.setViewportSize(size)
    for (const step of ['press', 'stir']) {
      await openStep(page, step, 0)
      await expectCookFits(page)
    }
  }
  await page.setViewportSize({ width: 390, height: 664 })
  await page.locator('.tp-cook-skip').click()
  await settled(page)
  const back = await page.evaluate(() => ({
    cooking: document.documentElement.classList.contains('tp-cooking'),
    btns: getComputedStyle(document.querySelector('.tp-btns')).display,
    pad: getComputedStyle(document.querySelector('.tp-pad')).display,
  }))
  expect(back.cooking).toBe(false)
  expect(back.btns).not.toBe('none')
  expect(back.pad).not.toBe('none')

  await playStirTouch(page, 'touch')
  await playFlip(page, { pointerType: 'touch' })
  await playPress(page, 'touch')
  await playPour(page, 'touch')
  w.check()
})
