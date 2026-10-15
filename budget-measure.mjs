// node budget-measure.mjs <port> <tag>  -> per-view draw calls / tris (desktop + mobile), JS ms/frame, first frame
import { chromium } from 'playwright'; import fs from 'fs'
const port = process.argv[2] || 4199, tag = process.argv[3] || 'x', base = `http://localhost:${port}/`
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
const hook = () => { window.__snap = 1; window.__cb = []; const raf = window.requestAnimationFrame.bind(window); window.requestAnimationFrame = (f) => raf((t) => { const s = performance.now(); try { f(t) } finally { window.__cb.push(performance.now() - s) } }) }
const st = a => { a = a.slice().sort((x, y) => x - y); if (!a.length) return {}; const s = a.reduce((x, y) => x + y, 0); return { mean: +(s / a.length).toFixed(2), p95: +a[Math.floor(a.length * 0.95)].toFixed(2), max: +a[a.length - 1].toFixed(0) } }
const V = { house: '?enter&nosave&t=day', home: '?enter&nosave&t=day&out&at=home', forest: '?enter&nosave&t=day&out&at=forest', lake: '?enter&nosave&t=day&out&at=lake', village: '?enter&nosave&t=day&out&at=village', orbit: '?enter&nosave&t=day&view=orbit&nogame' }
const out = { tag, first: [], views: {} }
// first frame x2 unthrottled
for (let r = 0; r < 2; r++) { const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } }); const p = await ctx.newPage(); const t0 = Date.now(); await p.goto(base + '?nosave'); await p.waitForFunction(() => window.__loadMarks && window.__loadMarks.frame, null, { timeout: 120000, polling: 100 }); out.first.push(await p.evaluate(() => Math.round(window.__loadMarks.frame))); await ctx.close() }
for (const mob of [false, true]) for (const [v, qs] of Object.entries(V)) {
  const ctx = await b.newContext(mob ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } : { viewport: { width: 1280, height: 800 } })
  const p = await ctx.newPage(); await p.addInitScript(hook)
  await p.goto(base + qs + (mob ? '&touch=1' : '')); await p.waitForFunction(() => window.__calls > 0, null, { timeout: 120000 }).catch(() => {})
  await p.waitForTimeout(9000)
  await p.evaluate(() => { window.__cb.length = 0; window.__cs = []; window.__ts = []; const g = () => { window.__cs.push(window.__calls); window.__ts.push(window.__tris); requestAnimationFrame(g) }; requestAnimationFrame(g) })
  await p.evaluate(() => { window.__snap = 0 }); await p.waitForTimeout(5000)
  const m = await p.evaluate(() => ({ cb: window.__cb.slice(), cs: window.__cs, ts: window.__ts }))
  out.views[(mob ? 'm-' : 'd-') + v] = { calls: Math.max(...m.cs), tris: Math.max(...m.ts), js: st(m.cb) }
  console.log(mob ? 'mobile' : 'desktop', v, JSON.stringify(out.views[(mob ? 'm-' : 'd-') + v])); await ctx.close()
}
console.log('first frame', out.first)
fs.writeFileSync(`/workspace/tiny-planet-perf/polish/budget-${tag}.json`, JSON.stringify(out, null, 1)); await b.close()
