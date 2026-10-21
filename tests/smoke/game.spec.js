// Desktop smoke: load, enter, walk, gather, craft, sleep + reload (save), v1 save migration, indoor controls, facing.
import { test, expect } from '@playwright/test'
import fs from 'node:fs'
import { watchErrors, boot, hold, holdFrames, playerN, angDeg, startFacingSampler, facingStats } from './helpers.js'
const OUT = '?enter&nosave&t=day&out&at=village'

test('loads, title card enters, no errors', async ({ page }) => {
  const w = watchErrors(page)
  await page.goto('?nosave')
  await expect(page.locator('#go')).toBeVisible({ timeout: 120_000 })
  await expect(async () => { if (await page.locator('#ld').count()) await page.locator('#go').click({ timeout: 2000 }).catch(() => {}); expect(await page.locator('#ld').count()).toBe(0) }).toPass({ timeout: 200_000, intervals: [2000] })
  await page.waitForFunction(() => window.__loadMarks?.frame && window.__loadMarks?.game, null, { timeout: 120_000 })
  const st = await page.evaluate(() => ({ inside: window.__home.inside, calls: window.__calls, startup: window.__loadMarks.frame }))
  expect(st.inside).toBe(true); expect(st.calls).toBeGreaterThan(0)
  w.check()
})

test('walks outdoors with the keyboard', async ({ page }) => {
  const w = watchErrors(page); await boot(page, OUT)
  const a = await playerN(page); await hold(page, ['w'], 3000); const b = await playerN(page)
  expect(angDeg(a, b)).toBeGreaterThan(0.3) // moved on the planet surface
  await hold(page, ['Shift', 'w'], 2000); const c = await playerN(page); expect(angDeg(b, c)).toBeGreaterThan(0.3)
  expect(await page.evaluate(() => window.__player.h)).toBeGreaterThan(-0.05) // not sunk into water/terrain
  w.check()
})

test('gathers an item into the bag', async ({ page }) => {
  const w = watchErrors(page); await boot(page, OUT)
  const id = await page.evaluate(() => { const sp = window.__game.L.spots.find(s => s.id.startsWith('mushroom-show')); const P = window.__player; P.n.copy(sp.stand); P.target = null; window.__snap = 1; return sp.id })
  await page.waitForFunction((id) => window.__game.G.near?.id === id, id, { timeout: 30_000 })
  await page.keyboard.press('e')
  await page.waitForFunction(() => (window.__game.G.s.inv.mushroom || 0) > 0, null, { timeout: 20_000 })
  expect(await page.evaluate((id) => window.__game.G.s.taken[id], id)).toBe(0) // taken today, back tomorrow
  w.check()
})

test('crafts at the bench', async ({ page }) => {
  const w = watchErrors(page); await boot(page, '?enter&nosave&t=day&out&at=home&give=all')
  await page.evaluate(() => { const P = window.__player; P.n.copy(window.__game.L.bench.n); P.target = null; window.__snap = 1 })
  await page.waitForFunction(() => window.__game.G.near?.kind === 'bench', null, { timeout: 30_000 })
  await page.keyboard.press('e')
  const btn = page.locator('.tp-craft:not([disabled])').first(); await expect(btn).toBeVisible()
  await btn.click()
  await page.waitForFunction(() => window.__game.G.s.crafted === 1 && !window.__game.G.ui.crafting, null, { timeout: 20_000 })
  w.check()
})

test('sleep advances the day and the day survives a reload', async ({ page }) => {
  test.setTimeout(720_000) // three boots + two sleeps; CI runners are ~3x slower than a dev box
  const w = watchErrors(page); await boot(page, '?enter&reset')
  await boot(page, '?enter') // clean save from here; no ?reset on the reload below
  expect(await page.evaluate(() => window.__game.G.s.day)).toBe(0)
  await page.evaluate(() => { window.__game.G.s.taken['smoke-spot'] = 0; window.__homeAct.sleep() })
  await page.waitForFunction(() => window.__game.G.s.day === 1 && !window.__home.busy, null, { timeout: 60_000 })
  const a0 = await page.evaluate(() => window.__rot.a)
  await page.waitForTimeout(1200) // debounced save
  await page.reload(); await page.waitForFunction(() => window.__loadMarks?.game && !document.getElementById('ld') && window.__game?.L, null, { timeout: 200_000, polling: 500 })
  const s = await page.evaluate(() => { const raw = JSON.parse(localStorage.getItem('tinyplanet.save.v1')); return { day: window.__game.G.s.day, a: window.__rot.a, v: raw.v, rawDay: raw.day, clock: document.querySelector('.tp-clock small')?.textContent, taken: window.__game.G.s.taken['smoke-spot'] } })
  expect(s.v).toBe(4); expect(s.day).toBe(1); expect(s.rawDay).toBe(1); expect(s.clock).toBe('Day 2')
  expect(Math.floor((s.a + Math.PI / 2) / (Math.PI * 2))).toBe(1) // the sun is still on day 1
  expect(Math.abs(s.a - a0)).toBeLessThan(0.3) // time of day carried over (not reset to the start phase)
  expect(s.taken).toBe(0) // yesterday's pick: available again today
  // a second sleep moves on to day 2 (it used to stall after a reload)
  await page.evaluate(() => window.__homeAct.sleep())
  await page.waitForFunction(() => window.__game.G.s.day === 2 && !window.__home.busy, null, { timeout: 60_000 })
  w.check()
})

test('an old v1 save loads and migrates', async ({ page }) => {
  const v1 = fs.readFileSync(new URL('../unit/fixtures/save-v1.json', import.meta.url), 'utf8')
  await page.addInitScript((v1) => { if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', 1); localStorage.setItem('tinyplanet.save.v1', v1) } }, v1)
  const w = watchErrors(page); await boot(page, '?enter')
  const s = await page.evaluate(() => ({ day: window.__game.G.s.day, v: window.__game.G.s.v, wood: window.__game.G.s.inv.wood, rod: window.__game.G.s.tools.rod, a: window.__rot.a, clock: document.querySelector('.tp-clock small')?.textContent }))
  expect(s).toMatchObject({ day: 3, v: 4, wood: 4, rod: true, clock: 'Day 4' })
  expect(Math.floor((s.a + Math.PI / 2) / (Math.PI * 2))).toBe(3)
  w.check()
})

test('indoor controls: walk, turn, go out of the door', async ({ page }) => {
  test.setTimeout(480_000)
  const w = watchErrors(page); await boot(page)
  const h0 = await page.evaluate(() => ({ ...window.__home.hp, inside: window.__home.inside }))
  expect(h0.inside).toBe(true)
  await hold(page, ['w'], 1500)
  const h1 = await page.evaluate(() => ({ x: window.__home.hp.x, z: window.__home.hp.z, yaw: window.__home.hp.yaw }))
  expect(Math.hypot(h1.x - h0.x, h1.z - h0.z)).toBeGreaterThan(0.1)
  await hold(page, ['a'], 1000)
  expect(Math.abs(await page.evaluate(() => window.__home.hp.yaw) - h1.yaw)).toBeGreaterThan(0.2)
  await hold(page, ['w'], 5000) // walk into a wall: stays in the room
  const h2 = await page.evaluate(() => window.__home.hp); expect(Math.abs(h2.x)).toBeLessThan(1.6); expect(Math.abs(h2.z)).toBeLessThan(1.6)
  await page.evaluate(() => { const H = window.__home; H.hp.x = 0.78; H.hp.z = -0.85; H.hp.target = null })
  await page.waitForFunction(() => window.__game.G.near?.id === 'door' || /door/i.test(window.__game.G.near?.verb + window.__game.G.near?.name), null, { timeout: 20_000 }).catch(() => {})
  await page.keyboard.press('e')
  await page.waitForFunction(() => !window.__home.inside, null, { timeout: 30_000 })
  w.check()
})

test('faces the direction of travel (outdoors and indoors)', async ({ page }) => {
  test.setTimeout(900_000)
  const w = watchErrors(page); await boot(page, OUT)
  await page.evaluate(() => { const P = window.__player; window.__start = { n: P.n.clone(), fwd: P.fwd.clone() } })
  for (const keys of [['w'], ['s'], ['w', 'a'], ['s', 'd']]) {
    // back to the same open spot each time so a wall or the river can't stop her
    await page.evaluate(() => { const P = window.__player; P.n.copy(window.__start.n); P.fwd.copy(window.__start.fwd); P.target = null; window.__snap = 1 }); await page.waitForTimeout(1500)
    await startFacingSampler(page); await holdFrames(page, keys, 50); await page.waitForTimeout(300)
    const r = await facingStats(page); expect(r.n, keys.join('+')).toBeGreaterThan(3)
    expect(r.med, keys.join('+') + ' median deg').toBeLessThan(25); expect(r.p90, keys.join('+') + ' p90 deg').toBeLessThan(45)
  }
  await boot(page)
  for (const keys of [['w'], ['s']]) {
    await startFacingSampler(page); await holdFrames(page, keys, 40, 90_000)
    const r = await facingStats(page); if (r.n > 3) expect(r.med, 'indoor ' + keys).toBeLessThan(25)
  }
  w.check()
})
