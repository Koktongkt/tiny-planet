import { chromium } from 'playwright'
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
const [qs, js, out, wait = 7000, jw = 2500] = process.argv.slice(2)
const p = await b.newPage({ viewport: { width: 1000, height: 640 } }); const errs = []; p.on('pageerror', e => errs.push(e.message))
await p.goto(`http://localhost:5195/${qs}&enter`); await p.waitForFunction(() => window.__calls > 0, null, { timeout: 120000 }).catch(() => {})
await p.waitForTimeout(+wait); if (js && js !== '-') { console.log(await p.evaluate(js)); await p.waitForTimeout(+jw) }
console.log(await p.evaluate(() => { const s = window.__scene; let cam; s.traverse(o => { if (o.isCamera) cam = o }); return JSON.stringify({ r: window.__player.n.toArray().map(v => +v.toFixed(3)), h: window.__player.h, dog: window.__dog.state, inside: window.__home.inside }) }))
await p.screenshot({ path: out }); console.log(errs.join('\n')); await b.close()
