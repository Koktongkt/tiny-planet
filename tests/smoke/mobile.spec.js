// iPhone 13 smoke: touch pads up, stick walks and faces the way she goes, minimap clear of the pads.
import { test, expect } from '@playwright/test'
import { watchErrors, boot, playerN, angDeg, startFacingSampler, facingStats } from './helpers.js'
const box = (b) => b && [b.x, b.y, b.x + b.width, b.y + b.height]
const overlap = (a, b) => a && b && a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3]

test('touch pads, stick walk + facing, no overlaps', async ({ page, context }) => {
  const w = watchErrors(page); await boot(page, '?enter&nosave&t=day&out&at=village')
  const stick = page.locator('.tp-stick'); await expect(stick).toBeVisible()
  const r = await stick.boundingBox(), c = { x: r.x + r.width / 2, y: r.y + r.height / 2 }
  const cdp = await context.newCDPSession(page)
  await page.waitForTimeout(1500)
  const ui = await page.evaluate(() => [...document.querySelectorAll('.tp-stick, .tp-acts button, .mm-wrap canvas, .tp-clock')].filter(e => e.offsetParent !== null || getComputedStyle(e).position === 'fixed').map(e => { const b = e.getBoundingClientRect(); return { cls: e.className, b: [b.left, b.top, b.right, b.bottom] } }).filter(x => x.b[2] > x.b[0]))
  const mm = ui.find(x => /mm-map/.test(x.cls)), pads = ui.filter(x => !/mm-map|tp-clock/.test(x.cls))
  if (mm) for (const p of pads) expect(overlap(mm.b, p.b), 'minimap vs ' + p.cls).toBeFalsy()
  const a = await playerN(page); await startFacingSampler(page)
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: c.x, y: c.y, id: 1 }] })
  for (let i = 1; i <= 5; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: c.x, y: c.y - r.height * 0.32 * i / 5, id: 1 }] }); await page.waitForTimeout(40) }
  await page.waitForTimeout(6000); await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  const f = await facingStats(page), b = await playerN(page)
  expect(angDeg(a, b)).toBeGreaterThan(0.3); expect(f.med).toBeLessThan(25)
  w.check()
})
