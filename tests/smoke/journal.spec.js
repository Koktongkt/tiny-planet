// Journal book (desktop): bookmarks + sub-tabs, People counts a first chat, a note taken at the board gets its own
// page while the rest stay one hint, and the Bag's "Craft with" opens Recipes on the item's tab.
// Phones keep the old notebook (stagec.mobile.spec.js).
import { test, expect } from '@playwright/test'
import { watchErrors, boot } from './helpers.js'
const ready = (page) => page.waitForFunction(() => window.__scReady && window.__sb && window.__sc, null, { timeout: 150_000, polling: 250 })

test('journal: five bookmarks, people met, board notes, Bag to Recipes', async ({ page }) => {
  test.setTimeout(300_000)
  const w = watchErrors(page); await boot(page, '?enter&nosave&t=day&out&at=home&give=reed:2'); await ready(page)
  await page.keyboard.press('j'); await expect(page.locator('.jb-veil')).toBeVisible()
  await expect(page.locator('.jb-bk')).toHaveCount(5)

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
