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
  // the dog sits on the crate floor (pet_seat), not trotting alongside
  await page.waitForFunction(() => {
    const d = window.__dog, seat = window.__bikeArt?.bike?.empties?.pet_seat
    if (!d?.onBike || d.state !== 'onBike' || !d.obj || !seat || d.speed !== 0) return false
    d.obj.updateWorldMatrix(true, false); seat.updateWorldMatrix(true, false)
    const e = d.obj.matrixWorld.elements, s = seat.matrixWorld.elements
    return Math.hypot(e[12] - s[12], e[13] - s[13], e[14] - s[14]) < 0.05
  }, null, { timeout: 30_000, polling: 250 })
  await page.keyboard.press('r')
  // she is standing still, so he sits beside her once the hop finishes (that is the normal follow brain)
  await page.waitForFunction(() => {
    const d = window.__dog, seat = window.__bikeArt?.bike?.empties?.pet_seat
    if (!d?.obj || !seat || window.__bike.shown() || d.onBike || d.hop > 0) return false
    if (d.state === 'onBike' || d.state === 'hopOff') return false
    d.obj.updateWorldMatrix(true, false); seat.updateWorldMatrix(true, false)
    const player = window.__home.playerObj; player.updateWorldMatrix(true, false)
    const e = d.obj.matrixWorld.elements, p = player.matrixWorld.elements, s = seat.matrixWorld.elements
    const nearHer = Math.hypot(e[12] - p[12], e[13] - p[13], e[14] - p[14])
    const offSeat = Math.hypot(e[12] - s[12], e[13] - s[13], e[14] - s[14])
    return nearHer < 0.85 && offSeat > 0.05
  }, null, { timeout: 30_000, polling: 250 })
  w.check()
})
