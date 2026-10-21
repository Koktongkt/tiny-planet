// shared helpers for the smoke suite (logic adapted from the ad-hoc scripts in tiny-planet-perf: errs, facing, mobtest)
import { expect } from '@playwright/test'
export const IGNORE = /KHR_parallel_shader_compile|GPU stall due to ReadPixels|WebGL: INVALID_|Automatic fallback to software WebGL/
// collect page errors + console errors; call check() at the end of a test
export function watchErrors(page) {
  const errs = []
  page.on('pageerror', e => errs.push('pageerror: ' + e.message))
  page.on('console', m => { if (m.type() === 'error' && !IGNORE.test(m.text())) errs.push('console: ' + m.text().slice(0, 300)) })
  return { errs, check: () => expect(errs, errs.join('\n')).toEqual([]) }
}
// load a game URL and wait for the first scene frame, the loader gone and the game layer up
export async function boot(page, qs = '?enter&nosave&t=day') {
  await page.goto(qs)
  await page.waitForFunction(() => window.__loadMarks?.frame && window.__loadMarks?.game && !document.getElementById('ld') && window.__home?.playerObj && window.__game?.L, null, { timeout: 200_000, polling: 500 })
  await page.waitForTimeout(2500)
}
export const hold = async (page, keys, ms) => { for (const k of keys) await page.keyboard.down(k); await page.waitForTimeout(ms); for (const k of [...keys].reverse()) await page.keyboard.up(k) }
// angle (deg) the outdoor traveller moved on the planet surface
export const playerN = (page) => page.evaluate(() => { const n = window.__player.n; return [n.x, n.y, n.z] })
export const angDeg = (a, b) => Math.acos(Math.max(-1, Math.min(1, (a[0] * b[0] + a[1] * b[1] + a[2] * b[2]) / (Math.hypot(...a) * Math.hypot(...b))))) * 57.2958
// body heading vs velocity sampler (from round7/facing.mjs): run in the page, read window.__fs
export const startFacingSampler = (page) => page.evaluate(() => { window.__fs = []; let last = null; const gen = window.__fsI = (window.__fsI || 0) + 1
  const loop = () => { if (window.__fsI !== gen) return; requestAnimationFrame(loop); const o = window.__home.playerObj; if (!o) return; o.updateWorldMatrix(true, false); const e = o.matrixWorld.elements
    const pos = { x: e[12], y: e[13], z: e[14] }, f = { x: e[8], y: e[9], z: e[10] }, up = { x: e[4], y: e[5], z: e[6] }
    if (last) { let v = { x: pos.x - last.x, y: pos.y - last.y, z: pos.z - last.z }; const fl = Math.hypot(f.x, f.y, f.z), ul = Math.hypot(up.x, up.y, up.z), u = { x: up.x / ul, y: up.y / ul, z: up.z / ul }
      const d = v.x * u.x + v.y * u.y + v.z * u.z; v = { x: v.x - u.x * d, y: v.y - u.y * d, z: v.z - u.z * d }; const vl = Math.hypot(v.x, v.y, v.z)
      if (vl > 1e-4) window.__fs.push({ ang: Math.acos(Math.max(-1, Math.min(1, (v.x * f.x + v.y * f.y + v.z * f.z) / (vl * fl)))) * 57.3, vl }) }
    last = pos }
  requestAnimationFrame(loop) })
export async function facingStats(page) {
  const arr = await page.evaluate(() => { window.__fsI++; return window.__fs })
  const tail = arr.slice(Math.max(3, Math.floor(arr.length * 0.25))), vm = tail.map(s => s.vl).sort((a, b) => a - b)[tail.length >> 1] || 0
  const a = tail.filter(s => s.vl > vm * 0.4).map(s => s.ang).sort((x, y) => x - y)
  return { n: a.length, med: a.length ? a[a.length >> 1] : null, p90: a.length ? a[Math.floor(a.length * 0.9)] : null }
}
