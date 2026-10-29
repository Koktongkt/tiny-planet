// Audio smoke (mobile, default autoplay policy): one real tap starts the AudioContext and the ambience ticks; a context
// suspended behind our back (what iOS does on a call / Siri / lock) comes back on the next tap; ambient chunk loads.
import { test, expect } from '@playwright/test'
import { watchErrors, boot } from './helpers.js'
test.use({ launchOptions: { args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=user-gesture-required'] } })

test('audio unlocks on a tap and recovers after an interruption', async ({ page }) => {
  test.setTimeout(300_000)
  const w = watchErrors(page)
  await boot(page)
  expect(await page.evaluate(() => window.__audio || null)).toBeNull() // nothing before a gesture
  const vp = page.viewportSize()
  await page.touchscreen.tap(vp.width / 2, vp.height * 0.45)
  await page.waitForFunction(() => window.__audio?.ctx?.state === 'running' && window.__audio.ticks > 2, null, { timeout: 30_000 })
  expect(await page.evaluate(() => window.__audio.E.master.gain.value)).toBeGreaterThan(0.1)
  await page.evaluate(() => window.__audio.ctx.suspend())
  await page.waitForFunction(() => window.__audio.ctx.state === 'suspended', null, { timeout: 10_000 })
  await page.touchscreen.tap(vp.width / 2, vp.height * 0.45)
  await page.waitForFunction(() => window.__audio.ctx.state === 'running', null, { timeout: 10_000 })
  w.check()
})
