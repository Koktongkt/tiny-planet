import { chromium } from 'playwright'
const PORT = 5196, OUT = '/workspace/tiny-planet-perf/polish/after'
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
const errs = []
const J = [
  // face-on pets
  ['cat-close', '?t=day&nosave&cat=sitnear&petcam=0.55', 8000, `window.__camA=0.9;window.__camD=0.48`, 1200],
  ['dog-close', '?t=day&nosave&out&dog=sit&dogcam=0.2', 8000, `window.__camA=0.25;window.__camD=0.85`, 1200],
  ['pets-together', '?t=day&nosave&out&dog=sit&dogcam=0.55&petsdemo', 9000, `window.__camA=0.7;window.__camD=1.1`, 1200],
  ['cat-distant', '?t=day&nosave&cat=sitnear&petcam=2.6', 7500, `window.__camA=2.4;window.__camD=1.35`, 800],
  ['dog-distant', '?t=day&nosave&out&dog=sit&dogcam=2.2', 7500, `window.__camA=2.0;window.__camD=1.6`, 800],
  // actions in follow with close cam
  ['act-pick', '?t=day&nosave&out&at=forest&act=pick&actt=0.45&camd=0.55', 7000],
  ['act-fishing-cast', '?t=day&nosave&out&at=lake&act=cast&actt=0.28&camd=0.55', 7000],
  ['act-fishing-reel', '?t=day&nosave&out&at=lake&act=reel&actt=0.35&camd=0.55', 7000],
  ['act-craft', '?t=day&nosave&out&at=home&act=craft&actt=0.55&camd=0.55', 7000],
  ['act-water', '?t=day&nosave&out&at=lake&act=water&actt=0.5&camd=0.55', 7000],
  ['act-pet-cat', '?t=day&nosave&cat=pet&act=pet&actt=0.55&petcam=-0.8', 9000],
  ['act-pet-dog', '?t=day&nosave&out&dog=petted&act=pet&actt=0.55&camd=0.6', 8000],
  ['act-door', '?t=day&nosave&act=door&actt=0.35', 8000],
  ['act-place', '?t=day&nosave&out&at=home&act=place&actt=0.5&camd=0.55', 7000],
  // talk
  ['talk-desktop', '?t=day&nosave&out&at=talk', 11000, `window.__openTalk && window.__openTalk()`, 2000],
  ['talk-mobile', '?t=day&nosave&out&at=talk&touch=1', 11000, `window.__openTalk && window.__openTalk()`, 2000, [390, 844]],
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
