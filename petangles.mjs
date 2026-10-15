import { chromium } from 'playwright'
const [,, which, out, angles] = process.argv
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
const p = await b.newPage({ viewport: { width: 900, height: 560 } }); const errs = []; p.on('pageerror', e => errs.push(e.message))
const qs = which === 'cat' ? '?t=day&nosave&cat=sitnear&petcam=1' : which === 'catwalk' ? '?t=day&nosave&cat=wander&petcam=1' : which === 'dogwalk' ? '?t=day&nosave&out&dogcam=1' : '?t=day&nosave&out&dog=sit&dogcam=1'
await p.goto('http://localhost:5196/' + qs + '&enter'); await p.waitForFunction(() => window.__calls > 0, null, { timeout: 120000 }); await p.waitForTimeout(7000)
for (const a of angles.split(',')) { const [ang, d] = a.split(':'); await p.evaluate(([x, y]) => { window.__camA = x; window.__camD = y }, [+ang, +(d || (which.startsWith('cat') ? 0.45 : 0.75))]); await p.waitForTimeout(1500); await p.screenshot({ path: `${out}-${a.replace(':', '_')}.png` }) }
console.log('ERR', errs.join('\n')); await b.close()
