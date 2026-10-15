// node shoot-polish.mjs <outdir> [names]  — polish round shots (dev server on PORT, default 5196)
import { chromium } from 'playwright'
const PORT = process.env.PORT || 5196, OUT = process.argv[2] || '/workspace/tiny-planet-perf/polish/after'
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
const errs = []
const MOB = [390, 844]
const J = [
  ['home', '?t=day&out&at=home&nosave', 5000], ['forest', '?t=day&out&at=forest&nosave', 5000], ['lake', '?t=day&out&at=lake&nosave', 5000], ['orbit', '?t=day&view=orbit&nosave', 4000], ['interior', '?t=day&nosave', 7000],
  ['cat-close', '?t=day&nosave&cat=sitnear&petcam=-1.0', 8000], ['dog-close', '?t=day&nosave&out&dog=sit&dogcam=0.8', 8000],
  ['pets-together', '?t=day&nosave&out&dog=sit&dogcam=0.9&petsdemo', 9000], ['cat-distant', '?t=day&nosave&cat=sitnear&petcam=2.8', 8000], ['dog-distant', '?t=day&nosave&out&dog=sit&dogcam=2.5', 8000],
  ['pets-together-distant', '?t=day&nosave&out&dog=sit&dogcam=2.6&petsdemo', 9000],
  ['act-pick', '?t=day&nosave&out&at=forest&act=pick&actt=0.42&view=hero', 6000], ['act-fishing-cast', '?t=day&nosave&out&at=lake&act=cast&actt=0.25&view=hero', 6000], ['act-fishing-reel', '?t=day&nosave&out&at=lake&act=reel&actt=0.3&view=hero', 6000],
  ['act-craft', '?t=day&nosave&out&at=home&act=craft&actt=0.5&view=hero', 6000], ['act-water', '?t=day&nosave&out&at=cliff&act=water&actt=0.5&view=hero', 6000],
  ['act-pet-cat', '?t=day&nosave&cat=pet&act=pet&actt=0.5', 9000], ['act-pet-dog', '?t=day&nosave&out&dog=petted&act=pet&actt=0.5&view=hero', 7000],
  ['act-door', '?t=day&nosave&act=door&actt=0.3', 8000], ['act-place', '?t=day&nosave&out&at=home&act=place&actt=0.5&view=hero', 6000],
  ['talk-desktop', '?t=day&nosave&out&at=talk', 9000, `dispatchEvent(new KeyboardEvent('keydown',{code:'KeyE',key:'e',bubbles:true}))`, 1500],
  ['talk-mobile', '?t=day&nosave&out&at=talk&touch=1', 9000, `dispatchEvent(new KeyboardEvent('keydown',{code:'KeyE',key:'e',bubbles:true}))`, 1500, MOB],
  ['villagers-morning', '?phase=4.95&nosave&out&at=village', 12000], ['villagers-evening', '?phase=1.55&nosave&out&at=village', 12000],
  ['villagers-square-morning', '?phase=4.95&nosave&view=zone&z=square', 12000], ['villagers-square-evening', '?phase=1.55&nosave&view=zone&z=square', 12000],
  ['villagers-terraces', '?phase=5.2&nosave&view=zone&z=terraces-train&trainAt=2.75', 12000], ['villagers-harbour', '?phase=0.2&nosave&view=zone&z=harbour-people', 12000],
  ['mobile-out', '?t=day&out&at=home&nosave&touch=1', 5000, null, 0, MOB],
]
const only = process.argv[3] ? process.argv[3].split(',') : null
for (const [name, qs, wait, js, jsWait, vw] of J) {
  if (only && !only.includes(name)) continue
  const [w, h] = vw || [1280, 800]
  const p = await b.newPage({ viewport: { width: w, height: h }, ...(vw ? { isMobile: true, hasTouch: true, deviceScaleFactor: 2 } : {}) })
  p.on('pageerror', e => errs.push(name + ': ' + e.message)); p.on('console', m => m.type() === 'error' && errs.push(name + ': ' + m.text()))
  await p.goto(`http://localhost:${PORT}/${qs}&enter`); await p.waitForFunction(() => window.__calls > 0, null, { timeout: 120000 }).catch(() => {})
  await p.waitForTimeout(wait)
  if (js) { await p.evaluate(js); await p.waitForTimeout(jsWait || 1500) }
  const st = await p.evaluate(() => ({ calls: window.__calls, tris: window.__tris, cat: window.__cat?.state, dog: window.__dog?.state, talk: !!window.__talk?.open }))
  await p.screenshot({ path: `${OUT}/${name}.png` }); console.log(name, JSON.stringify(st)); await p.close()
}
console.log('ERR', errs.slice(0, 12).join('\n')); await b.close()
