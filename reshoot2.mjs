import { chromium } from 'playwright'
const PORT = 5196, OUT = '/workspace/tiny-planet-perf/polish/after'
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
const errs = []
const J = [
  ['act-pick', '?t=day&nosave&out&at=forest&act=pick&actt=0.45&camd=0.7', 7000, `window.__snap=1`, 2500],
  ['act-fishing-cast', '?t=day&nosave&out&at=lake&act=cast&actt=0.28&camd=0.7', 7000, `window.__snap=1`, 2500],
  ['act-fishing-reel', '?t=day&nosave&out&at=lake&act=reel&actt=0.35&camd=0.7', 7000, `window.__snap=1`, 2500],
  ['act-craft', '?t=day&nosave&out&at=home&act=craft&actt=0.55&camd=0.7', 7000, `window.__snap=1`, 2500],
  ['act-water', '?t=day&nosave&out&at=lake&act=water&actt=0.5&camd=0.7', 7000, `window.__snap=1`, 2500],
  ['act-pet-dog', '?t=day&nosave&out&dog=petted&act=pet&actt=0.55&camd=0.7', 8000, `window.__snap=1`, 2500],
  ['act-place', '?t=day&nosave&out&at=home&act=place&actt=0.5&camd=0.7', 7000, `window.__snap=1`, 2500],
]
for (const [name, qs, wait, js, jsWait, vw] of J) {
  const [w, h] = vw || [1280, 800]
  const p = await b.newPage({ viewport: { width: w, height: h }, ...(vw ? { isMobile: true, hasTouch: true, deviceScaleFactor: 2 } : {}) })
  p.on('pageerror', e => errs.push(name + ': ' + e.message))
  await p.goto(`http://localhost:${PORT}/${qs}&enter`, { timeout: 90000 }).catch(e => errs.push(name + ' goto ' + e.message))
  await p.waitForFunction(() => window.__calls > 0, null, { timeout: 90000 }).catch(() => {})
  await p.waitForTimeout(wait)
  // wait for talk chunk / npcs
  if (name.startsWith('talk')) {
    await p.waitForFunction(() => (window.__npcs || []).some(c => c.ready && c.obj) && window.__openTalk, null, { timeout: 30000 }).catch(() => {})
    await p.waitForTimeout(500)
  }
  if (js) { await p.evaluate(js).catch(e => errs.push(name + ' js ' + e.message)); await p.waitForTimeout(jsWait || 1500) }
  const st = await p.evaluate(() => ({ calls: window.__calls, tris: window.__tris, talk: !!window.__talk?.open, act: window.__act?.kind, cat: window.__cat?.state, dog: window.__dog?.state }))
  await p.screenshot({ path: `${OUT}/${name}.png` }); console.log(name, JSON.stringify(st)); await p.close()
}
console.log('ERR', errs.slice(0, 10).join('\n')); await b.close()
