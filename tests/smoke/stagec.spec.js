// Stage C smoke (desktop): seasons/weather hooks + save v4, the calmer fishing reel with species, photo mode (free cam,
// hidden HUD, capture into the journal album), a train ride between the two stations (free, then 1 coin), ruins dig +
// museum donation + journal, and the first-day tutorial note.
import { test, expect } from '@playwright/test'
import { watchErrors, boot } from './helpers.js'
const scReady = (page) => page.waitForFunction(() => window.__scReady && window.__sc && window.__scLayout && window.__sbLayout, null, { timeout: 150_000, polling: 250 })
const stand = (page, fn) => page.evaluate(fn)

test('hooks: save v4, __T season + weather, deterministic rain days, tutorial note on day 0', async ({ page }) => {
  test.setTimeout(300_000)
  const w = watchErrors(page); await boot(page, '?enter&nosave&t=day&out&at=home'); await scReady(page)
  const h = await page.evaluate(() => ({ v: window.__game.G.s.v, season: window.__T.season, w: window.__T.seasonW, kind: window.__T.kind, rain: window.__T.rain, wet: window.__T.wet, rainDays: Array.from({ length: 14 }, (_, d) => window.__sc.W.isRainDay(d)) }))
  expect(h.v).toBe(4); expect(h.season).toBe('spring'); expect(h.w).toEqual([1, 0, 0, 0]); expect(h.kind).toBe('clear'); expect(h.rain).toBe(0); expect(h.wet).toBe(0)
  expect(h.rainDays.filter(Boolean).length).toBe(2); expect(h.rainDays[0] || h.rainDays[1]).toBe(false)
  // a rain day at mid-morning: the hooks report rain
  const d = h.rainDays.findIndex(Boolean)
  const r = await page.evaluate((d) => { const [s] = window.__sc.W.rainWindow(d); window.__setPhase(-Math.PI / 2 + d * Math.PI * 2 + (s + 2) / 24 * Math.PI * 2); return new Promise(res => setTimeout(() => res({ kind: window.__T.kind, rain: window.__T.rain, wet: window.__T.wet }), 400)) }, d)
  expect(r.kind).toBe('rain'); expect(r.rain).toBe(1); expect(r.wet).toBeGreaterThan(0.9)
  await expect(page.locator('.tpt')).toBeVisible()
  w.check()
})

test('fishing: wait, bite, reel with the net, species logged; photo mode captures into the journal', async ({ page }) => {
  test.setTimeout(420_000)
  const w = watchErrors(page); await boot(page, '?enter&nosave&t=day&out&at=lake&give=rod'); await scReady(page)
  await page.waitForFunction(() => window.__game.G.near?.spot?.item === 'fish', null, { timeout: 60_000 })
  await page.keyboard.press('e')
  await expect(page.locator('.tp-fish-c')).toBeVisible()
  await page.waitForFunction(() => window.__fishSt && window.__fishSt.state === 'bite', null, { timeout: 120_000, polling: 100 })
  await page.keyboard.down('e'); await page.waitForFunction(() => window.__fishSt.state === 'reel', null, { timeout: 60_000, polling: 100 })
  await expect(page.locator('.tp-fish-c .net')).toBeVisible()
  // the real reel takes ~15 s of game time (minutes on SwiftShader): jump near the end and follow the fish
  await page.evaluate(() => { const s = window.__fishSt; s.prog = 0.97; s.bar = s.fx; s.bv = 0 })
  await page.waitForFunction(() => window.__fishSt.state === 'caught', null, { timeout: 60_000, polling: 100 }); await page.keyboard.up('e')
  await page.waitForFunction(() => (window.__game.G.s.inv.fish || 0) >= 1 && Object.keys(window.__game.G.s.fish).length === 1, null, { timeout: 30_000 })
  // Studio's catch card, closed with Enter
  await expect(page.locator('.tpf-card')).toBeVisible(); await page.keyboard.press('Enter'); await expect(page.locator('.tpf-card')).toBeHidden()
  const log = await page.evaluate(() => window.__game.G.s.fish)
  const [id] = Object.keys(log)
  expect(await page.evaluate((id) => window.__sc.F.FISH[id].spots.includes('lake'), id)).toBe(true); expect(log[id].count).toBe(1); expect(log[id].best).toBeGreaterThan(0)
  // photo mode: P opens the free camera, the HUD hides, the shutter saves a thumbnail into the journal album
  await page.waitForTimeout(1500); await page.keyboard.press('p')
  await page.waitForFunction(() => document.documentElement.classList.contains('tp-photo') && window.__game.G.ui.lock === 'photo', null, { timeout: 30_000 })
  await expect(page.locator('.tpc-pbar')).toBeVisible(); await expect(page.locator('.tp-btns')).toBeHidden()
  await page.keyboard.press('a'); await page.keyboard.press('q')
  const shot = await page.evaluate(() => window.__sc.shutter({ download: false }).then(r => ({ ...r, n: window.__game.G.s.photos.list.length, stored: Object.keys(JSON.parse(localStorage.getItem('tinyplanet.photos') || '{}')).length })))
  expect(shot.n).toBe(1); expect(shot.stored).toBe(1); expect(shot.w).toBeGreaterThan(100); expect(shot.thumbBytes).toBeLessThan(80_000)
  await page.keyboard.press('Escape')
  await page.waitForFunction(() => !document.documentElement.classList.contains('tp-photo') && !window.__game.G.ui.lock, null, { timeout: 30_000 })
  await page.keyboard.press('j'); await expect(page.locator('.tpc-book')).toBeVisible()
  await expect(page.locator('.tpc-entry')).toHaveCount(12)
  await page.locator('.tpc-tabs button', { hasText: 'Photos' }).click(); await expect(page.locator('.tpc-photos img')).toHaveCount(1)
  w.check()
})

test('train: board at the village stop (free), ride, alight at the forest stop; the next ride costs a coin', async ({ page }) => {
  test.setTimeout(420_000)
  const w = watchErrors(page); await boot(page, '?enter&nosave&t=day&out&at=home'); await scReady(page)
  // shift the schedule so the train is dwelling at the village stop now, then stand on its platform
  await stand(page, () => { const sc = window.__sc, now = sc.t(); sc.toff = 0
    for (let k = 0; k < sc.SCH.period; k += 0.25) { const s = sc.Tr.trainState(sc.SCH, now + k); if (s.stop === 'village' && s.dwellLeft > 7) { sc.toff = k; break } }
    const P = window.__player; P.n.copy(sc.platformN('village')); P.target = null; window.__snap = 1 })
  await page.waitForFunction(() => /^station:village:ready/.test(window.__game.G.near?.id || ''), null, { timeout: 60_000, polling: 250 })
  await expect(page.locator('.tp-prompt')).toContainText('first ride free')
  await page.keyboard.press('e')
  await page.waitForFunction(() => window.__scRide.riding && window.__game.G.ui.lock === 'ride', null, { timeout: 30_000 })
  await expect(page.locator('.tpc-ride')).toBeVisible()
  // fast-forward to just before the forest stop
  await page.evaluate(() => { const sc = window.__sc, l = sc.SCH.legs[0]; sc.toff = (l.t0 + l.dwell + l.run - 0.3) - sc.t() })
  await page.waitForFunction(() => !window.__scRide.riding && !window.__game.G.ui.lock, null, { timeout: 90_000, polling: 250 })
  const end = await page.evaluate(() => { const P = window.__player, n = window.__sc.platformN('forest'); return { d: P.n.distanceTo(n), rides: window.__game.G.s.train.rides } })
  expect(end.d).toBeLessThan(0.01); expect(end.rides).toBe(1)
  // the train still dwells here: the ride back now costs 1 coin, and she has none
  const p2 = await page.evaluate(() => window.__sc.stationPrompt('forest'))
  expect(p2.verb).toBe('Board the train to'); expect(p2.name).toContain('1 coin')
  expect(await page.evaluate(() => window.__sc.board('forest'))).toBe(false)
  expect(await page.evaluate(() => window.__scRide.riding)).toBe(false)
  w.check()
})

test('ruins: dig spots, museum donation (+ Hoshino), journal relics; tutorial dismiss + reopen', async ({ page }) => {
  test.setTimeout(300_000)
  const w = watchErrors(page); await boot(page, '?enter&nosave&t=day&out&at=home&give=shard:1'); await scReady(page)
  await expect(page.locator('.tpt')).toBeVisible()
  await page.locator('.tpt-x').click(); await expect(page.locator('.tpt')).toBeHidden()
  expect(await page.evaluate(() => window.__game.G.s.tutorial.dismissed)).toBe(true)
  // Settings -> "Read again" brings the note back
  await page.locator('.tp-gearbtn').click(); await page.locator('.tps-note').click(); await expect(page.locator('.tpt')).toBeVisible(); await page.evaluate(() => window.__sc.tutorial(false))
  await stand(page, () => { const P = window.__player; P.n.copy(window.__scLayout.digs[0].n); P.target = null; window.__snap = 1 })
  await page.waitForFunction(() => window.__game.G.near?.id === 'dig0', null, { timeout: 60_000 })
  await page.keyboard.press('e')
  await page.waitForFunction(() => window.__game.G.s.dig.taken[0] === 0, null, { timeout: 15_000 })
  await stand(page, () => { const P = window.__player; P.n.copy(window.__scLayout.museum.n); P.target = null })
  await page.waitForFunction(() => window.__game.G.near?.id === 'museum', null, { timeout: 60_000 })
  await page.keyboard.press('e'); await expect(page.locator('.tpc-book')).toContainText('Ruins Museum')
  const h0 = await page.evaluate(() => window.__sb.friend('scholar').hearts)
  await page.locator('.tpc-book .tp-slot.act', { hasText: 'Shard' }).first().click()
  const m = await page.evaluate(() => ({ don: window.__game.G.s.museum.donated, h: window.__sb.friend('scholar').hearts }))
  expect(m.don.shard).toBe(0); expect(m.h).toBeGreaterThan(h0)
  await page.keyboard.press('Escape'); await page.keyboard.press('j')
  await page.locator('.tpc-tabs button', { hasText: 'Relics' }).click()
  await expect(page.locator('.tpc-entry')).toHaveCount(8)
  w.check()
})
