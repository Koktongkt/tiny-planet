// Perf budget gate. node tests/perf/budget.mjs [baseURL] [--only desktop|mobile]
// 1) startup chunk (dist/assets/index-*.js, gzip): warn above targetKB, fail above failKB.
// 2) draw calls / triangles per key view with the follow camera snapped (window.__snap), median over ~4 s,
//    against tests/perf/budget.json caps (+ tolerance for SwiftShader run-to-run drift). FPS / JS ms are reported only.
// Writes perf-report.json and perf-report.md (CI uploads them / posts the table to the job summary).
import fs from 'node:fs'; import zlib from 'node:zlib'; import path from 'node:path'
import { chromium, devices } from 'playwright'
const B = JSON.parse(fs.readFileSync(new URL('./budget.json', import.meta.url)))
const args = process.argv.slice(2), base = args.find(a => /^https?:/.test(a)) || 'http://localhost:4173/'
const only = args.includes('--only') ? args[args.indexOf('--only') + 1] : null
const rows = [], fails = [], warns = []
// 1. startup chunk
const dist = path.resolve('dist/assets')
if (fs.existsSync(dist)) {
  // the entry chunk is the module script index.html loads (a lazy chunk could also be called index-*.js)
  const html = fs.existsSync(path.join(dist, '../index.html')) ? fs.readFileSync(path.join(dist, '../index.html'), 'utf8') : ''
  const f = (/assets\/(index-[\w-]+\.js)/.exec(html) || [])[1] || fs.readdirSync(dist).find(n => /^index-.*\.js$/.test(n))
  const kb = zlib.gzipSync(fs.readFileSync(path.join(dist, f)), { level: 9 }).length / 1024
  rows.push(`| startup chunk ${f} | ${kb.toFixed(2)} KB gz | target ≤ ${B.startup.targetKB}, fail > ${B.startup.failKB} | ${kb > B.startup.failKB ? 'FAIL' : kb > B.startup.targetKB ? 'warn' : 'ok'} |`)
  if (kb > B.startup.failKB) fails.push(`startup chunk ${kb.toFixed(2)} KB gz > ${B.startup.failKB}`); else if (kb > B.startup.targetKB) warns.push(`startup chunk ${kb.toFixed(2)} KB gz > target ${B.startup.targetKB}`)
} else warns.push('no dist/assets: startup chunk not checked')
// 2. views
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
const report = {}
for (const dev of ['desktop', 'mobile']) {
  if (only && only !== dev) continue
  for (const [v, qs] of Object.entries(B.views[dev])) {
    const ctx = await browser.newContext(dev === 'mobile' ? devices['iPhone 13'] : { viewport: { width: 1280, height: 800 } })
    const p = await ctx.newPage(), errs = []; p.on('pageerror', e => errs.push(e.message))
    await p.addInitScript(() => { window.__snap = 1; window.__cb = []; const raf = window.requestAnimationFrame.bind(window); window.requestAnimationFrame = (f) => raf((t) => { const s = performance.now(); try { f(t) } finally { window.__cb.push(performance.now() - s) } }) })
    let m
    try {
      await p.goto(base + qs)
      await p.waitForFunction(() => window.__loadMarks?.frame && !document.getElementById('ld') && window.__calls > 0, null, { timeout: 200_000, polling: 500 })
      await p.waitForTimeout(3500) // cull + LOD settle
      await p.evaluate(() => { window.__cb.length = 0; window.__cs = []; window.__ts = []; const g = () => { window.__cs.push(window.__calls); window.__ts.push(window.__tris); requestAnimationFrame(g) }; requestAnimationFrame(g) })
      const t0 = Date.now(); await p.waitForTimeout(4000)
      m = await p.evaluate(() => ({ cs: window.__cs.filter(x => x != null), ts: window.__ts.filter(x => x != null), cb: window.__cb }))
      m.sec = (Date.now() - t0) / 1000
    } catch (e) { errs.push('measure: ' + e.message.split('\n')[0]) }
    await ctx.close()
    const key = `${dev}.${v}`
    if (!m || !m.cs.length) { fails.push(`${key}: no frames (${errs.join('; ')})`); rows.push(`| ${key} | no frames | | FAIL |`); continue }
    const med = (a) => { a = a.slice().sort((x, y) => x - y); return a[a.length >> 1] }
    const calls = med(m.cs), tris = med(m.ts), js = m.cb.reduce((a, b) => a + b, 0) / Math.max(1, m.cb.length), fps = m.cs.length / m.sec
    const cap = { ...B.caps[dev][v === 'orbit' ? 'orbit' : 'walk'], ...(B.overrides[key] || {}) }
    const lim = { calls: Math.floor(cap.calls * (1 + B.tolerance.calls)), tris: Math.floor(cap.tris * (1 + B.tolerance.tris)) }
    const bad = []
    if (calls > lim.calls) bad.push(`calls ${calls} > ${cap.calls}(+${B.tolerance.calls * 100}%)`)
    if (tris > lim.tris) bad.push(`tris ${tris} > ${cap.tris}(+${B.tolerance.tris * 100}%)`)
    if (errs.length) bad.push('page errors: ' + errs.join('; ').slice(0, 300))
    const over = calls > cap.calls || tris > cap.tris
    if (bad.length) fails.push(`${key}: ${bad.join(', ')}`); else if (over) warns.push(`${key}: over cap within tolerance (calls ${calls}/${cap.calls}, tris ${tris}/${cap.tris})`)
    report[key] = { calls, tris, cap, fps: +fps.toFixed(1), jsMs: +js.toFixed(2), errs }
    rows.push(`| ${key} | ${calls} calls, ${(tris / 1000).toFixed(0)}k tris | ≤ ${cap.calls}, ≤ ${(cap.tris / 1000).toFixed(0)}k${B.overrides[key] ? ' (override)' : ''} | ${bad.length ? 'FAIL' : over ? 'warn' : 'ok'} · ${fps.toFixed(1)} fps, ${js.toFixed(2)} ms JS/frame (info) |`)
    console.log(key, JSON.stringify(report[key]))
  }
}
await browser.close()
const md = ['| check | measured | budget | result |', '|---|---|---|---|', ...rows, '', ...warns.map(w => '- warn: ' + w), ...fails.map(f => '- **FAIL**: ' + f)].join('\n')
fs.writeFileSync('perf-report.json', JSON.stringify({ report, warns, fails }, null, 1)); fs.writeFileSync('perf-report.md', md + '\n')
if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, '## Perf budget (SwiftShader, camera snapped)\n\n' + md + '\n')
console.log(md)
process.exit(fails.length ? 1 : 0)
