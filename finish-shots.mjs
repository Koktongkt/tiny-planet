import { chromium } from 'playwright'
import { createRequire } from 'module'
import fs from 'fs'
import path from 'path'
const require = createRequire(import.meta.url)
// run from polish so playwright resolves
const PORT = 5196, OUT = '/workspace/tiny-planet-perf/polish/after', BEFORE = '/workspace/tiny-planet-perf/polish/before'
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
const errs = []
const J = [
  ['talk-mobile', '?t=day&nosave&out&at=talk&touch=1', 8000, `(()=>{const n=(window.__npcs||[]).find(c=>c.ready&&c.obj); if(n){window.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyE',key:'e',bubbles:true}))}})()`, 1800, [390, 844]],
  ['villagers-terraces', '?phase=5.2&nosave&view=zone&z=terraces-train&trainAt=2.75', 9000],
  ['villagers-harbour', '?phase=0.2&nosave&view=zone&z=harbour-people', 9000],
  ['mobile-out', '?t=day&out&at=home&nosave&touch=1', 4500, null, 0, [390, 844]],
  ['cat-close', '?t=day&nosave&cat=sitnear&petcam=-1.0', 7500],
  ['dog-close', '?t=day&nosave&out&dog=sit&dogcam=0.3', 7500],
  ['pets-together', '?t=day&nosave&out&dog=sit&dogcam=0.5&petsdemo', 8500],
  ['act-pick', '?t=day&nosave&out&at=forest&act=pick&actt=0.42&view=hero', 5500],
  ['talk-desktop', '?t=day&nosave&out&at=talk', 8000, `window.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyE',key:'e',bubbles:true}))`, 1800],
]
for (const [name, qs, wait, js, jsWait, vw] of J) {
  const [w, h] = vw || [1280, 800]
  const p = await b.newPage({ viewport: { width: w, height: h }, ...(vw ? { isMobile: true, hasTouch: true, deviceScaleFactor: 2 } : {}) })
  p.on('pageerror', e => errs.push(name + ': ' + e.message))
  p.on('console', m => m.type() === 'error' && errs.push(name + ': ' + m.text()))
  await p.goto(`http://localhost:${PORT}/${qs}&enter`, { timeout: 90000 }).catch(e => errs.push(name + ' goto: ' + e.message))
  await p.waitForFunction(() => window.__calls > 0, null, { timeout: 90000 }).catch(() => {})
  await p.waitForTimeout(wait)
  if (js) { await p.evaluate(js).catch(e => errs.push(name + ' js: ' + e.message)); await p.waitForTimeout(jsWait || 1500) }
  const st = await p.evaluate(() => ({ calls: window.__calls, tris: window.__tris, talk: !!window.__talk?.open, act: window.__act?.kind })).catch(() => ({}))
  await p.screenshot({ path: `${OUT}/${name}.png` }); console.log(name, JSON.stringify(st)); await p.close()
}
console.log('ERR', errs.slice(0, 12).join('\n')); await b.close()
