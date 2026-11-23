// Journal book (desktop): bookmarks + sub-tabs, People counts a first chat, a note taken at the board gets its own
// page while the rest stay one hint, and the Bag's "Craft with" opens Recipes on the item's tab.
// Phones keep the old notebook (stagec.mobile.spec.js).
import { test, expect } from '@playwright/test'
import fs from 'node:fs'
import { watchErrors, boot } from './helpers.js'
const FIT = fs.readFileSync(new URL('./journal-fit.js', import.meta.url), 'utf8')
const ready = (page) => page.waitForFunction(() => window.__scReady && window.__sb && window.__sc, null, { timeout: 150_000, polling: 250 })

test('journal: five bookmarks, people met, board notes, Bag to Recipes', async ({ page }) => {
  test.setTimeout(420_000)
  const w = watchErrors(page); await boot(page, '?enter&nosave&t=day&out&at=home&give=reed:2'); await ready(page)
  // opens instantly: the book's code, leather art and handwriting font loaded quietly after the game came up
  await page.waitForFunction(() => window.__jbArt && window.__jbArt.ready && window.__jbArt.code && window.__jbArt.font, null, { timeout: 60_000 })
  const t0 = Date.now(); await page.keyboard.press('j')
  await expect(page.locator('.jb-book:not(.jb-wait)')).toBeVisible()
  console.log(`journal open: ${Date.now() - t0} ms from J to the drawn book`)
  expect(await page.evaluate(() => document.fonts.check('700 24px JBHand'))).toBe(true)
  await expect(page.locator('.jb-bk')).toHaveCount(5)

  // everything fits: every bookmark, sub-tab and entry stays inside its page, and no right page needs to scroll
  await page.evaluate(FIT)
  const fit = await page.evaluate(() => window.__jbFitAll(12))
  expect(fit.bad).toEqual({}); expect(fit.rightPageScrolls).toEqual([])

  // People: a first chat counts her as met
  await page.locator('.jb-bk[data-id="people"]').click()
  await expect(page.locator('.jb-ph')).toContainText('0 of 22 met')
  await page.evaluate(() => window.__sb.meet('baker'))
  await expect(page.locator('.jb-ph')).toContainText('1 of 22 met')
  await expect(page.locator('.jb-pc[data-pick="baker"]')).toContainText('Kiko')

  // Quests: today's notes are one hint until she takes one at the board
  await page.locator('.jb-bk[data-id="quests"]').click()
  const notes = await page.evaluate(() => window.__game.G.s.errands.list.filter(e => !e.accepted && !e.done && e.wants.length).map(e => e.id))
  expect(notes.length).toBeGreaterThan(0)
  await expect(page.locator('.jb-qc[data-pick="board"]')).toBeVisible()
  await expect(page.locator('.jb-qc[data-pick^="e"]')).toHaveCount(0)
  await page.evaluate((id) => window.__sb.acceptErrand(id), notes[0])
  await expect(page.locator(`.jb-qc[data-pick="${notes[0]}"]`)).toBeVisible()
  await page.locator(`.jb-qc[data-pick="${notes[0]}"]`).click()
  await expect(page.locator('.jb-R .jb-box').first()).toContainText('Take it to')
  if (notes.length === 1) await expect(page.locator('.jb-qc[data-pick="board"]')).toHaveCount(0)

  // Bag: "Craft with" on reed opens the journal at Recipes > Tools with the fishing rod picked
  await page.keyboard.press('Escape'); await expect(page.locator('.jb-veil')).toBeHidden()
  await page.keyboard.press('b'); await page.locator('.sb-t[title="Reed"]').click()
  await page.locator('.sb-bt', { hasText: 'Craft with' }).click()
  await expect(page.locator('.jb-bk.on[data-id="recipes"]')).toBeVisible()
  await expect(page.locator('.jb-st.on[data-sub="tools"]')).toBeVisible()
  await expect(page.locator('.jb-rc.on[data-pick="rod"]')).toBeVisible()
  w.check()
})
