// Stage F screenshots. node tests/perf/stagef-shots.mjs [baseURL]
// Writes desktop + mobile stills of each cook step, the perfect toast, Auto-cook, and the bag sparkle.
import fs from 'node:fs'
import { chromium, devices } from 'playwright'

const base = process.argv[2] || 'http://localhost:4191/'
const out = '/opt/cursor/artifacts'
fs.mkdirSync(out, { recursive: true })
const GL = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']

async function boot(page) {
  await page.goto(base + '?enter&nosave&t=day&out&at=home')
  await page.waitForFunction(() => window.__loadMarks?.frame && window.__tpCook?.open && !document.getElementById('ld'), null, { timeout: 200_000, polling: 500 })
  await page.evaluate(() => { const n = document.querySelector('.tpt-x, .tpt button'); if (n) n.click() })
}

async function shotStep(page, step, file) {
  await page.evaluate((step) => {
    window.__tpCook.hold = false
    window.__tpCook.force(null)
    window.__tpCook.scale = 1
    window.__tpCook.last = null
    window.__tpCook.open(step)
    return null
  }, step)
  await page.waitForFunction(() => window.__tpCook.ready === true, null, { timeout: 30_000 })
  if (step === 'stir') {
    await page.keyboard.down('Space')
    await page.waitForFunction(() => (window.__tpCook.state?.fill || 0) > 0.35, null, { timeout: 20_000 })
    await page.keyboard.up('Space')
  } else if (step === 'flip') {
    await page.waitForFunction(() => document.querySelector('[data-step="flip"]')?.dataset.gold === '1', null, { timeout: 20_000 })
  } else if (step === 'press') {
    await page.waitForFunction(() => window.__tpCook.state?.hot, null, { timeout: 20_000 })
  } else if (step === 'pour') {
    await page.evaluate(() => {
      const pad = document.querySelector('[data-step="pour"]')
      const r = pad.getBoundingClientRect()
      pad.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 1, pointerType: 'mouse', button: 0, buttons: 1, clientX: r.left + r.width / 2, clientY: r.top + 40 }))
    })
    await page.waitForFunction(() => document.querySelector('[data-step="pour"]')?.dataset.band === '1', null, { timeout: 20_000 })
  }
  await page.evaluate(() => { window.__tpCook.scale = 0 })
  await page.waitForTimeout(150)
  await page.locator('.tp-cook-card').screenshot({ path: file })
  await page.evaluate(() => window.__tpCook.skip())
  await page.waitForFunction(() => !document.querySelector('.tp-cook'), null, { timeout: 15_000 })
}

async function shotToast(page, file) {
  await page.evaluate(() => {
    window.__tpCook.hold = true
    window.__tpCook.force('perfect')
    window.__tpCook.scale = 1
    window.__tpCook.last = null
    window.__tpCook.open('stir')
    return null
  })
  await page.waitForFunction(() => window.__tpCook.ready === true, null, { timeout: 30_000 })
  await page.evaluate(() => window.__tpCook.finish())
  await page.waitForSelector('.tp-cook-toast', { timeout: 15_000 })
  await page.waitForTimeout(200)
  await page.locator('.tp-cook-card').screenshot({ path: file })
  await page.evaluate(() => { window.__tpCook.hold = false; window.__tpCook.force(null); window.__tpCook.close() })
  await page.waitForFunction(() => !document.querySelector('.tp-cook'), null, { timeout: 15_000 })
}

async function shotSettings(page, file) {
  await page.waitForFunction(() => window.__sbReady, null, { timeout: 120_000, polling: 250 })
  await page.locator('.tp-gearbtn').click()
  await page.getByRole('switch', { name: 'Auto-cook' }).scrollIntoViewIfNeeded()
  await page.waitForTimeout(200)
  await page.locator('.tps-panel').screenshot({ path: file })
  await page.locator('.tps-foot .tpx-btn').click()
}

async function shotBag(page, file) {
  await page.evaluate(() => {
    const G = window.__game.G
    G.s.inv.soup_perfect = 1
    G.s.seen.soup_perfect = true
    G.s.inv.soup = 1
    G.s.seen.soup = true
    window.__tp.emit()
  })
  await page.keyboard.press('b')
  await page.waitForSelector('.tp-slot.perfect .tp-spark', { timeout: 15_000 })
  await page.locator('.tp-slot.perfect').screenshot({ path: file })
  await page.keyboard.press('Escape')
}

const browser = await chromium.launch({ args: GL })
const jobs = [
  ['desktop', { viewport: { width: 1280, height: 800 } }],
  ['mobile', devices['iPhone 13']],
]
for (const [name, device] of jobs) {
  const ctx = await browser.newContext({ ...device })
  const page = await ctx.newPage()
  await boot(page)
  for (const step of ['stir', 'flip', 'press', 'pour']) {
    const file = `${out}/cook_${step}_${name}.png`
    await shotStep(page, step, file)
    console.log('wrote', file)
  }
  await ctx.close()
}
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  const page = await ctx.newPage()
  await boot(page)
  await shotToast(page, `${out}/cook_perfect_toast.png`)
  console.log('wrote toast')
  await shotSettings(page, `${out}/settings_autocook.png`)
  console.log('wrote settings')
  await shotBag(page, `${out}/bag_sparkle.png`)
  console.log('wrote bag')
  await ctx.close()
}
await browser.close()
console.log('done')
