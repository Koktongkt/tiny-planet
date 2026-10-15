// Home + pets screenshots. node shoot-pets.mjs [only,names]   (dev server on PORT, default 5195)
import { chromium } from 'playwright'
const PORT = process.env.PORT || 5195, OUT = process.env.OUT || '/workspace/tiny-planet-perf/home-pets'
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
const errs = []
const J = [
  ['interior-wide', '?t=day&nosave', 9000],
  ['interior-night', '?t=night&nosave&cat=knead', 9000],
  ['cat-petting-hearts', '?t=day&nosave&cat=pet', 9000],
  ['cat-petting-hearts-close', '?t=day&nosave&cat=pet&petcam=-1.1', 9000],
  ['cat-nap-sunbeam', '?t=day&nosave&cat=nap&petcam=1.0', 9000],
  ['cat-sill', '?t=day&nosave&cat=sill&petcam=0.5', 9000],
  ['cat-groom', '?t=day&nosave&cat=groom&petcam=0.9', 9000],
  ['cat-stretch-yawn', '?t=day&nosave&cat=stretch&petcam=1.5', 9800],
  ['cat-chase', '?t=day&nosave&cat=chase&petcam=1.2', 9000],
  ['cat-knead-bed', '?t=day&nosave&cat=knead&petcam=0.3', 9000],
  ['door-transition', '?t=day&nosave', 8000, `window.__home.exit(); window.__home.fade = 0.7`, 0],
  ['outside-after-door', '?t=day&nosave', 8000, `window.__home.exit()`, 3000],
  ['dog-follow', '?t=day&nosave&out', 6000, null, 0, 'w', 3500],
  ['dog-fetch', '?t=day&nosave&out&dog=fetch', 9500],
  ['dog-fetch-close', '?t=day&nosave&out&dog=fetch&dogcam=1.4', 6400],
  ['dog-dig', '?t=day&nosave&out&dog=dig&dogcam=1.0', 9000],
  ['dog-splash', '?t=day&nosave&out&dog=splash&dogcam=0.3', 12000],
  ['dog-bark-sheep', '?t=day&nosave&at=meadow&dog=bark&dogcam=0.9', 16000],
  ['dog-roll', '?t=day&nosave&out&dog=roll&dogcam=1.3', 8600],
  ['dog-sit', '?t=day&nosave&out&dog=sit&dogcam=0.6', 9000],
  ['dog-wait-door', '?t=day&nosave&out&dog=wait&dogcam=2.6', 12000],
  ['mobile-interior', '?t=day&nosave&touch=1', 9000, null, 0, null, 0, [390, 844]],
]
const only = process.argv[2] ? process.argv[2].split(',') : null, part = process.env.PART ? process.env.PART.split('/').map(Number) : null
for (const [i, [name, qs, wait, js, jsWait, key, keyMs, vw]] of J.entries()) {
  if (only && !only.includes(name)) continue
  if (part && i % part[1] !== part[0]) continue
  const [w, h] = vw || [1280, 800]
  const p = await b.newPage({ viewport: { width: w, height: h }, ...(vw ? { isMobile: true, hasTouch: true, deviceScaleFactor: 2 } : {}) })
  p.on('pageerror', e => errs.push(name + ': ' + e.message)); p.on('console', m => m.type() === 'error' && errs.push(name + ': ' + m.text()))
  await p.goto(`http://localhost:${PORT}/${qs}&enter`); await p.waitForFunction(() => window.__calls > 0, null, { timeout: 120000 }).catch(() => {})
  await p.waitForTimeout(wait)
  if (key) { await p.keyboard.down(key); await p.waitForTimeout(keyMs); await p.keyboard.up(key); await p.waitForTimeout(400) }
  if (js) { await p.evaluate(js); await p.waitForTimeout(jsWait) }
  const st = await p.evaluate(() => ({ calls: window.__calls, tris: window.__tris, cat: window.__cat?.state, dog: window.__dog?.state }))
  await p.screenshot({ path: `${OUT}/${name}.png` }); console.log(name, JSON.stringify(st)); await p.close()
}
console.log('ERR', errs.slice(0, 8).join('\n')); await b.close()
