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
  await page.waitForFunction(() => window.__scReady, null, { timeout: 60_000 }) // the journal book (Stage C chunk) draws Recipes
  await page.keyboard.press('e'); await expect(page.locator('.jb-veil')).toBeVisible()
  await expect(page.locator('.jb-bk.on[data-id="recipes"]')).toBeVisible()
  await page.locator('.jb-st[data-sub="decor"]').click() // give=all: tools are owned already, decor is craftable
  await page.locator('.jb-rc:has(.jb-rdy)').first().click() // a recipe she has everything for
  const btn = page.locator('[data-act="craft"]:not([disabled])'); await expect(btn).toBeVisible()
  await btn.click()
  await page.waitForFunction(() => window.__game.G.s.crafted === 1 && !window.__game.G.ui.crafting, null, { timeout: 20_000 })
  w.check()
})

// sleep() returns immediately when an idle walk already holds A.doing, and the day only advances
// once that call actually begins. Clear the idle lock in the same turn, then wait for the day
// (skipTime, early) and for the fade to finish (busy) as two states. The fade itself is a few
// wall-clock timeouts; a stalled SwiftShader frame delays them, so the busy wait stays at 60 s.
async function sleepToDay(page, day) {
  await page.waitForFunction(() => !!(window.__homeAct && window.__home && window.__home.inside), null, { timeout: 60_000 })
  const started = await page.evaluate(() => {
    const H = window.__home, A = window.__homeAct.A
    if (H.cancelIdle) H.cancelIdle()
    if (A && A.doing === 'walk') { A.walk = null; A.doing = null; H.hp.target = null }
    window.__game.G.s.taken['smoke-spot'] = 0
    window.__homeAct.sleep()
    return { busy: H.busy, doing: A && A.doing }
  })
  expect(started.doing, `sleep() did not start (busy ${started.busy})`).toBe('sleep')
  try {
    await page.waitForFunction((day) => window.__game.G.s.day === day, day, { timeout: 45_000 })
  } catch (e) {
    const snap = await page.evaluate(() => ({ day: window.__game?.G?.s?.day, busy: window.__home?.busy, doing: window.__homeAct?.A?.doing, fade: window.__home?.fade, a: window.__rot?.a }))
    throw new Error(`sleep did not reach day ${day}: ${JSON.stringify(snap)}\n${e.message}`)
  }
  await page.waitForFunction(() => !window.__home.busy, null, { timeout: 60_000 })
}

test('sleep advances the day and the day survives a reload', async ({ page }) => {
  test.setTimeout(720_000) // three boots + two sleeps; CI runners are ~3x slower than a dev box
  const w = watchErrors(page); await boot(page, '?enter&reset')
  await boot(page, '?enter') // clean save from here; no ?reset on the reload below
  expect(await page.evaluate(() => window.__game.G.s.day)).toBe(0)
  await sleepToDay(page, 1)
  const a0 = await page.evaluate(() => window.__rot.a)
  await page.waitForTimeout(1200) // debounced save
  await page.reload(); await page.waitForFunction(() => window.__loadMarks?.game && !document.getElementById('ld') && window.__game?.L, null, { timeout: 200_000, polling: 500 })
  const s = await page.evaluate(() => { const raw = JSON.parse(localStorage.getItem('tinyplanet.save.v1')); return { day: window.__game.G.s.day, a: window.__rot.a, v: raw.v, rawDay: raw.day, clock: document.querySelector('.tp-clock small')?.textContent, taken: window.__game.G.s.taken['smoke-spot'] } })
  expect(s.v).toBe(8); expect(s.day).toBe(1); expect(s.rawDay).toBe(1); expect(s.clock).toBe('Day 2')
  expect(Math.floor((s.a + Math.PI / 2) / (Math.PI * 2))).toBe(1) // the sun is still on day 1
  expect(Math.abs(s.a - a0)).toBeLessThan(0.3) // time of day carried over (not reset to the start phase)
  expect(s.taken).toBe(0) // yesterday's pick: available again today
  // a second sleep moves on to day 2 (it used to stall after a reload)
  await sleepToDay(page, 2)
  w.check()
})

test('an old v1 save loads and migrates', async ({ page }) => {
  const v1 = fs.readFileSync(new URL('../unit/fixtures/save-v1.json', import.meta.url), 'utf8')
  await page.addInitScript((v1) => { if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', 1); localStorage.setItem('tinyplanet.save.v1', v1) } }, v1)
  const w = watchErrors(page); await boot(page, '?enter')
  const s = await page.evaluate(() => ({ day: window.__game.G.s.day, v: window.__game.G.s.v, wood: window.__game.G.s.inv.wood, rod: window.__game.G.s.tools.rod, a: window.__rot.a, clock: document.querySelector('.tp-clock small')?.textContent }))
  expect(s).toMatchObject({ day: 3, v: 8, wood: 4, rod: true, clock: 'Day 4' })
  expect(Math.floor((s.a + Math.PI / 2) / (Math.PI * 2))).toBe(3)
  w.check()
})

test('indoor controls: walk, turn, go out of the door', async ({ page }) => {
  test.setTimeout(480_000)
  const w = watchErrors(page); await boot(page)
  const h0 = await page.evaluate(() => ({ x: window.__home.hp.x, z: window.__home.hp.z, yaw: window.__home.hp.yaw, inside: window.__home.inside }))
  expect(h0.inside).toBe(true)
  // Sim time is clamped to 50 ms per frame, so a fixed 1.5 s of wall clock is not enough
  // when software GL is near 1 fps. Wait until she has actually moved.
  await page.keyboard.down('w')
  await page.waitForFunction((o) => { const h = window.__home.hp; return Math.hypot(h.x - o.x, h.z - o.z) > 0.1 }, h0, { timeout: 90_000 })
  await page.keyboard.up('w')
  const h1 = await page.evaluate(() => ({ x: window.__home.hp.x, z: window.__home.hp.z, yaw: window.__home.hp.yaw }))
  expect(Math.hypot(h1.x - h0.x, h1.z - h0.z)).toBeGreaterThan(0.1)
  await page.keyboard.down('a')
  await page.waitForFunction((y) => Math.abs(window.__home.hp.yaw - y) > 0.2, h1.yaw, { timeout: 90_000 })
  await page.keyboard.up('a')
  expect(Math.abs(await page.evaluate(() => window.__home.hp.yaw) - h1.yaw)).toBeGreaterThan(0.2)
  await hold(page, ['w'], 5000) // walk into a wall: stays in the room
  const h2 = await page.evaluate(() => window.__home.hp); expect(Math.abs(h2.x)).toBeLessThan(1.6); expect(Math.abs(h2.z)).toBeLessThan(1.6)
  await page.evaluate(() => { const H = window.__home; H.hp.x = H.DOOR.x; H.hp.z = H.DOOR.z - 0.16; H.hp.target = null })
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
  // Indoors, W/S are camera-relative. From the default spot that walks her into the round table,
  // and the samples are then a slide along the furniture (~90 degrees off the way she is facing).
  // Stand where the next half-metre of that walk is open floor, already facing the way the key will take her.
  for (const keys of [['w'], ['s']]) {
    const placed = await page.evaluate((key) => {
      const H = window.__home
      if (H.cancelIdle) H.cancelIdle()
      if (H.pose && H.pose.idle) H.pose = null
      const cam = H.camYaw || Math.PI, dir = key === 's' ? cam + Math.PI : cam
      const dx = Math.sin(dir), dz = Math.cos(dir)
      let spot = null
      for (let x = -1.15; x <= 1.15 && !spot; x += 0.12) for (let z = -1.15; z <= 1.25 && !spot; z += 0.12) {
        let ok = H.freeAt(x, z, 0.12)
        for (let t = 0.08; ok && t <= 0.55; t += 0.08) ok = H.freeAt(x + dx * t, z + dz * t, 0.12)
        if (ok) spot = { x, z }
      }
      if (!spot) return null
      H.hp.x = spot.x; H.hp.z = spot.z; H.hp.yaw = dir; H.hp.target = null
      return spot
    }, keys[0])
    expect(placed, 'open floor for indoor ' + keys.join('+')).not.toBeNull()
    await startFacingSampler(page); await holdFrames(page, keys, 16, 90_000)
    const r = await facingStats(page); expect(r.n, 'indoor ' + keys).toBeGreaterThan(3)
    expect(r.med, 'indoor ' + keys.join('+') + ' median deg').toBeLessThan(25)
  }
  w.check()
})
