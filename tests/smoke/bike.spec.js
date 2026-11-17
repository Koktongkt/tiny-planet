// The Village Pet Bike loads lazily: nothing of it (bike chunk, GLTFLoader chunk, GLB) is fetched until she rides,
// then it mounts as Studio's GLB (2 draw calls: toon body + skinned ink hull) and she takes the ride pose.
import { test, expect } from '@playwright/test'
import { watchErrors, boot } from './helpers.js'

const bikeFiles = (page) => page.evaluate(() => performance.getEntriesByType('resource').map(e => e.name.split('/').pop()).filter(n => /^(mesh|vendor-gltf)-[\w-]+\.js$|^bicycle-[\w-]+\.glb$/.test(n)))

test('bike: lazy GLB, mounts on R, ride pose, hop off', async ({ page }) => {
  test.setTimeout(300_000)
  const w = watchErrors(page)
  await boot(page, '?enter&nosave&t=day&out&at=village&give=bike')
  await page.waitForFunction(() => window.__bike, null, { timeout: 60_000 })
  expect(await bikeFiles(page)).toEqual([])
  await page.keyboard.press('r')
  await page.waitForFunction(() => window.__bike.shown() && window.__bikeArt?.bike && window.__bikeArt.frames > 0, null, { timeout: 90_000, polling: 250 })
  const files = await bikeFiles(page)
  expect(files.some(n => n.endsWith('.glb'))).toBe(true)
  expect(files.some(n => n.startsWith('vendor-gltf-'))).toBe(true)
  const b = await page.evaluate(() => { const k = window.__bikeArt.bike; let ink = 0; window.__scene.traverse(o => { if (o.name === 'bike_ink' && o.isSkinnedMesh) ink++ }); return { calls: k.calls, ink, seat: !!k.empties.seat, pet: !!k.empties.pet_seat } })
  expect(b).toEqual({ calls: 2, ink: 1, seat: true, pet: true })
  await page.keyboard.press('r')
  await page.waitForFunction(() => !window.__bike.shown(), null, { timeout: 30_000, polling: 250 })
  w.check()
})
