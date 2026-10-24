// Stage B smoke (desktop): garden plant -> water -> grow -> harvest, a gift + hearts, the errands board (take + hand
// over), cooking at the bench + eating for a buff, and the settings panel (text size + mute, kept in the save).
import { test, expect } from '@playwright/test'
import { watchErrors, boot } from './helpers.js'
const sbReady = (page) => page.waitForFunction(() => window.__sbReady && window.__sbLayout && window.__sb, null, { timeout: 120_000, polling: 250 })
const standAt = (page, what) => page.evaluate((what) => { const P = window.__player, L = window.__sbLayout, n = what === 'board' ? L.board.n : L.plots.find(p => p.id === what).n; P.n.copy(n); P.target = null; window.__snap = 1 }, what)

test('garden: plant a seed packet, water it each day, harvest the crop', async ({ page }) => {
  test.setTimeout(420_000)
  const w = watchErrors(page); await boot(page, '?enter&nosave&t=day&out&at=home&give=can'); await sbReady(page)
  expect(await page.evaluate(() => window.__game.G.s.inv.seedpack)).toBe(2) // starter packets
  await standAt(page, 'plot-0')
  await page.waitForFunction(() => /^plot-0:Plant/.test(window.__game.G.near?.id || ''), null, { timeout: 30_000 })
  await expect(page.locator('.tp-prompt, .tp-chip').first()).toContainText('Plant')
  await page.keyboard.press('e')
  await page.waitForFunction(() => window.__sb.G.s.garden.plots[0].cropId, null, { timeout: 15_000 })
  const crop = await page.evaluate(() => window.__sb.G.s.garden.plots[0].cropId)
  expect(['turnip', 'carrot', 'herb']).toContain(crop)
  expect(await page.evaluate(() => window.__game.G.s.inv.seedpack)).toBe(1)
  for (let d = 0; d < 6; d++) {
    if (await page.evaluate(() => window.__sb.G.s.garden.plots[0].stage) === 'ripe') break
    await page.waitForFunction(() => /^plot-0:Water/.test(window.__game.G.near?.id || ''), null, { timeout: 30_000 })
    await page.keyboard.press('e')
    await page.waitForFunction(() => window.__sb.G.s.garden.plots[0].watered, null, { timeout: 15_000 })
    await page.waitForTimeout(1200) // the watering pose
    await page.evaluate(() => window.__sb.nextDay())
  }
  expect(await page.evaluate(() => window.__sb.G.s.garden.plots[0].stage)).toBe('ripe')
  await page.waitForFunction(() => /^plot-0:Harvest/.test(window.__game.G.near?.id || ''), null, { timeout: 30_000 })
  await page.keyboard.press('e')
  const item = crop === 'herb' ? 'herbs' : crop
  await page.waitForFunction((item) => (window.__game.G.s.inv[item] || 0) >= 2, item, { timeout: 15_000 })
  expect(await page.evaluate(() => window.__sb.G.s.garden.plots[0].cropId)).toBe(null)
  w.check()
})

test('gifts and hearts, then the errands board: take a request and hand it over', async ({ page }) => {
  test.setTimeout(420_000)
  const w = watchErrors(page); await boot(page, '?enter&nosave&t=day&out&at=village&give=shard:3,jam:2,berries:6,reed:4,acorn:4,mushroom:4,flower:4,clay:3,herbs:4,pinecone:4,tea:3,wood:4,wool:2'); await sbReady(page)
  // walk up to a villager (like the dialogue perf view) and press G
  await page.evaluate(() => { const P = window.__home.P, n = (window.__npcs || []).find(n => n.obj && n.ready); const d = n.obj.position.clone().normalize(); const side = P.fwd.clone().cross(d).normalize()
    P.n.copy(d).addScaledVector(side, 0.035).normalize(); P.target = null; P.fwd.copy(d).sub(P.n).addScaledVector(P.n, -d.clone().sub(P.n).dot(P.n)).normalize(); window.__snap = 1 })
  await page.waitForFunction(() => window.__talk && window.__talk.near, null, { timeout: 60_000 })
  const near = await page.evaluate(() => window.__talk.near.key)
  await page.keyboard.press('g')
  await expect(page.locator('.tpg-picker')).toBeVisible({ timeout: 30_000 })
  await page.locator('.tpg-item', { hasText: 'Berry Jam' }).click()
  await page.locator('.tpg-foot .tpx-btn').click()
  await page.waitForFunction((k) => window.__sb.G.s.friends.list[k]?.giftedToday, near, { timeout: 15_000 })
  const f = await page.evaluate((k) => window.__sb.G.s.friends.list[k], near)
  expect(f.hearts).toBeGreaterThan(0); expect(f.lastGiftReaction).toBeTruthy()
  await expect(page.locator('.tk-box')).toBeVisible() // she answers
  await page.keyboard.press('Escape')
  await page.evaluate(() => window.__sb.nextDay()) // a new morning: gifts allowed again, new errands
  expect(await page.evaluate((k) => window.__sb.G.s.friends.list[k].giftedToday, near)).toBe(false)
  // errands board
  await standAt(page, 'board')
  await page.waitForFunction(() => window.__game.G.near?.id === 'errands-board', null, { timeout: 30_000 })
  await page.keyboard.press('e')
  await expect(page.locator('.tpe-board')).toBeVisible({ timeout: 30_000 })
  const e0 = await page.evaluate(() => window.__sb.G.s.errands.list[0])
  expect(e0.day).toBe(1)
  for (const wnt of e0.wants) await page.evaluate(({ itemId, count }) => { const G = window.__game.G; G.s.inv[itemId] = Math.max(G.s.inv[itemId] || 0, count) }, wnt)
  const note = page.locator('.tpe-note').first()
  await note.getByRole('button', { name: 'Take it' }).click()
  await page.waitForFunction(() => window.__sb.G.s.errands.list[0].accepted, null, { timeout: 15_000 })
  await note.getByRole('button', { name: 'Hand over' }).click()
  await page.waitForFunction(() => window.__sb.G.s.errands.list[0].done, null, { timeout: 15_000 })
  await expect(note.locator('.tpe-stamp')).toBeVisible()
  if (e0.reward.coins) expect(await page.evaluate(() => window.__game.G.s.inv.coin)).toBeGreaterThanOrEqual(e0.reward.coins)
  w.check()
})

test('cook an acorn cookie at the bench and eat it for a buff', async ({ page }) => {
  test.setTimeout(300_000)
  const w = watchErrors(page); await boot(page, '?enter&nosave&t=day&out&at=home&give=acorn:3,rice:1'); await sbReady(page)
  await page.evaluate(() => { const P = window.__player; P.n.copy(window.__game.L.bench.n); P.target = null; window.__snap = 1 })
  await page.waitForFunction(() => window.__game.G.near?.kind === 'bench', null, { timeout: 30_000 })
  await page.keyboard.press('e')
  const card = page.locator('.tp-recipe', { hasText: 'Acorn Cookie' })
  await card.locator('.tp-craft').click()
  await page.waitForFunction(() => (window.__game.G.s.inv.acorn_cookie || 0) === 1 && !window.__game.G.ui.crafting, null, { timeout: 20_000 })
  await page.keyboard.press('Escape'); await page.keyboard.press('b')
  await page.locator('.tp-slot', { hasText: 'Acorn Cookie' }).click()
  await page.waitForFunction(() => window.__game.G.s.buffs.some(b => b.id === 'swift'), null, { timeout: 15_000 })
  await page.keyboard.press('Escape')
  await expect(page.locator('.tp-buff.b-swift')).toBeVisible({ timeout: 15_000 })
  expect(await page.evaluate(() => window.__player.spd)).toBeCloseTo(1.15)
  expect(await page.evaluate(() => window.__game.G.s.inv.acorn_cookie || 0)).toBe(0)
  w.check()
})

test('settings panel: text size and mute are applied and saved', async ({ page }) => {
  test.setTimeout(480_000)
  const w = watchErrors(page); await boot(page, '?enter&reset'); await boot(page, '?enter&t=day'); await sbReady(page)
  await page.locator('.tp-gearbtn').click()
  await expect(page.locator('.tps-panel')).toBeVisible({ timeout: 30_000 })
  await page.getByRole('radio', { name: 'Large' }).click()
  await page.getByRole('switch', { name: 'Mute all' }).click()
  await page.waitForFunction(() => window.__game.G.s.settings.muted && window.__game.G.s.settings.textScale === 1.15, null, { timeout: 10_000 })
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--tpts').trim())).toBe('1.15')
  await page.locator('.tps-foot .tpx-btn').click(); await expect(page.locator('.tps-panel')).toHaveCount(0)
  await page.waitForTimeout(1200) // debounced save
  await page.reload(); await page.waitForFunction(() => window.__loadMarks?.game && !document.getElementById('ld') && window.__game?.L, null, { timeout: 200_000, polling: 500 }); await sbReady(page)
  const s = await page.evaluate(() => ({ v: JSON.parse(localStorage.getItem('tinyplanet.save.v1')).v, set: window.__game.G.s.settings, css: getComputedStyle(document.documentElement).getPropertyValue('--tpts').trim(), audio: JSON.parse(localStorage.getItem('tp-audio') || '{}') }))
  expect(s.v).toBe(6); expect(s.set).toMatchObject({ muted: true, textScale: 1.15, autoCook: false }); expect(s.css).toBe('1.15'); expect(s.audio.muted).toBe(true)
  w.check()
})
