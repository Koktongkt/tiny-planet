// Paired Stage F frame sample. node tests/perf/stagef-measure.mjs [baseURL] [out.json]
// SwiftShader, camera snapped, inside the house (no villagers). Reports startup gz, cook chunk gz,
// frame-time median and p95, draw calls, triangles, and JS heap — idle, and with the cook overlay open.
import fs from 'node:fs'
import zlib from 'node:zlib'
import path from 'node:path'
import { chromium } from 'playwright'

const base = process.argv[2] || 'http://localhost:4188/'
const out = process.argv[3] || 'stagef-perf.json'
const runs = Number(process.argv[4] || 2)
const GL = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-precise-memory-info']

function gzOf(file) {
  return zlib.gzipSync(fs.readFileSync(file), { level: 9 }).length / 1024
}
function chunks() {
  const dist = path.resolve('dist/assets')
  const html = fs.readFileSync(path.resolve('dist/index.html'), 'utf8')
  const startup = (/assets\/(index-[\w-]+\.js)/.exec(html) || [])[1]
  const files = fs.readdirSync(dist)
  const cook = files.find(n => /cook-[\w-]+\.js$/.test(n) || /Cook-[\w-]+\.js$/.test(n))
  const cookCss = files.find(n => /cook-[\w-]+\.css$/.test(n) || /Cook-[\w-]+\.css$/.test(n))
  return {
    startup: startup ? { file: startup, kb: +gzOf(path.join(dist, startup)).toFixed(3) } : null,
    cook: cook ? { file: cook, kb: +gzOf(path.join(dist, cook)).toFixed(3) } : null,
    cookCss: cookCss ? { file: cookCss, kb: +gzOf(path.join(dist, cookCss)).toFixed(3) } : null,
  }
}
const med = (a) => { const b = a.filter(x => x != null).slice().sort((x, y) => x - y); return b.length ? b[b.length >> 1] : null }
const p95 = (a) => { const b = a.filter(x => x != null).slice().sort((x, y) => x - y); return b.length ? b[Math.min(b.length - 1, Math.ceil(b.length * 0.95) - 1)] : null }

async function sample(page, ms) {
  await page.evaluate(() => {
    window.__ft = []
    window.__cb = []
    window.__cs = []
    window.__ts = []
    let last = performance.now()
    const loop = (t) => {
      const now = performance.now()
      window.__ft.push(now - last)
      last = now
      window.__cs.push(window.__calls ?? null)
      window.__ts.push(window.__tris ?? null)
      window.__raf = requestAnimationFrame(loop)
    }
    const native = window.requestAnimationFrame.bind(window)
    const prev = window.requestAnimationFrame
    window.__tpRafPrev = prev
    window.requestAnimationFrame = (f) => native((t) => {
      const s = performance.now()
      try { f(t) } finally { window.__cb.push(performance.now() - s) }
    })
    window.__raf = requestAnimationFrame(loop)
  })
  await page.waitForTimeout(ms)
  return page.evaluate(() => {
    cancelAnimationFrame(window.__raf)
    if (window.__tpRafPrev) window.requestAnimationFrame = window.__tpRafPrev
    const heap = performance.memory ? performance.memory.usedJSHeapSize : null
    return { ft: window.__ft, cb: window.__cb, cs: window.__cs, ts: window.__ts, heap, calls: window.__calls, tris: window.__tris, loop: window.__tpWorldLoop || null }
  })
}
function pack(m) {
  const ft = m.ft.slice(2), cb = m.cb.slice(2)
  return {
    frameMs: { n: ft.length, median: +med(ft).toFixed(2), p95: +p95(ft).toFixed(2) },
    jsMs: { n: cb.length, median: +med(cb).toFixed(2), p95: +p95(cb).toFixed(2) },
    calls: med(m.cs),
    tris: med(m.ts),
    heap: m.heap,
    loop: m.loop,
  }
}

const browser = await chromium.launch({ args: GL })
const rows = []
for (let i = 0; i < runs; i++) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  const page = await ctx.newPage()
  page.on('pageerror', (e) => console.log('pageerror', e.message))
  await page.addInitScript(() => { window.__snap = 1 })
  await page.goto(base + '?enter&nosave&t=day&q=fixed')
  await page.waitForFunction(() => window.__loadMarks?.frame && !document.getElementById('ld') && window.__calls > 0 && typeof window.__tpCook?.open === 'function', null, { timeout: 200_000, polling: 500 })
  await page.waitForTimeout(2500)
  const idle = pack(await sample(page, 4000))
  let open = null
  const can = await page.evaluate(() => typeof window.__tpCook?.open === 'function')
  if (can) {
    // open() returns a promise that settles when the dish is done. Do not return it
    // from evaluate — Playwright would wait out the step, then look for a closed overlay.
    // scale 0 holds the step on screen so the whole sample is "overlay open, world idled".
    await page.evaluate(() => {
      window.__tpCook.scale = 0
      window.__tpCook.hold = true
      window.__tpCook.open('stir')
      return null
    })
    await page.waitForFunction(() => window.__tpCook.ready === true && !!document.querySelector('.tp-cook'), null, { timeout: 20_000 }).catch(async (e) => {
      console.log('cook state', await page.evaluate(() => ({ sess: !!window.__game?.G?.ui?.cook, ready: window.__tpCook.ready, loop: window.__tpWorldLoop, dom: !!document.querySelector('.tp-cook') })))
      throw e
    })
    await page.waitForTimeout(400)
    open = pack(await sample(page, 4000))
  }
  rows.push({ idle, open })
  console.log('run', i, JSON.stringify({ idle, open }))
  await ctx.close()
}
await browser.close()
const pick = (k, path) => {
  const xs = rows.map(r => path(r[k])).filter(x => x != null)
  return xs.length ? med(xs) : null
}
const summary = {
  chunks: chunks(),
  runs: rows,
  idle: {
    frameMedian: pick('idle', r => r.frameMs.median),
    frameP95: pick('idle', r => r.frameMs.p95),
    jsMedian: pick('idle', r => r.jsMs.median),
    jsP95: pick('idle', r => r.jsMs.p95),
    calls: pick('idle', r => r.calls),
    tris: pick('idle', r => r.tris),
    heap: pick('idle', r => r.heap),
  },
  open: rows[0].open ? {
    frameMedian: pick('open', r => r.frameMs.median),
    frameP95: pick('open', r => r.frameMs.p95),
    jsMedian: pick('open', r => r.jsMs.median),
    jsP95: pick('open', r => r.jsMs.p95),
    calls: pick('open', r => r.calls),
    tris: pick('open', r => r.tris),
    heap: pick('open', r => r.heap),
  } : null,
}
fs.writeFileSync(out, JSON.stringify(summary, null, 2))
console.log('wrote', out)
