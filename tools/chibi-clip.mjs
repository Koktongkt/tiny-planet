// Frame-exact animation clips of a character (studio or game), for reviewing motion.
// The page's clock (requestAnimationFrame + performance.now) is driven one fixed step per frame, so a clip is the same
// every run no matter how slow the software renderer is. Needs the dev server (npm run dev, port 5190).
//
//   node tools/chibi-clip.mjs <outDir> "<query>" <seconds> <fps> '[[t, "js"], ...]' [w h]
//
// <query> is appended to http://localhost:5190/?  e.g.
//   "view=charstudio&t=day&enter&act=cast&item=rod&dur=1.5&angle=0.8&ly=0.15&zoom=0.7"   (studio, looping action)
//   "view=charstudio&t=day&enter&seq=walkrun&angle=0.6&ly=0.2&zoom=0.85"               (studio walk -> run -> stop)
//   "t=day&at=lake&enter&tut=0"                                                          (in the game, follow camera)
// Events run page JS at a clip time, e.g. '[[0,"window.__actClock=0"]]' restarts a studio action,
// '[[0.2,"window.__startAct(\"water\",{dur:1.8})"]]' starts an action in the game, '[[0,"window.__herFids=[\"yawn\"];window.__herLife.idle=5;window.__herLife.fidN=0"]]'
// forces a fidget. In the game the DOM UI is hidden (canvas only) so panels do not cover her.
// Then: ffmpeg -framerate <fps> -i <outDir>/f%04d.png -pix_fmt yuv420p -c:v libx264 -crf 22 clip.mp4
import fs from 'node:fs'
import { chromium } from 'playwright'
const [,, out, qs = '', secs = 2, fps = 12, evs = '[]', W = 360, H = 480] = process.argv
const E = JSON.parse(evs), game = !qs.includes('charstudio')
fs.mkdirSync(out, { recursive: true })
const exe = fs.existsSync('/opt/pw-browsers/chromium') ? { executablePath: '/opt/pw-browsers/chromium' } : {}
const b = await chromium.launch({ ...exe, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
const p = await b.newPage({ viewport: { width: +W, height: +H } }); const errs = []; p.on('pageerror', e => errs.push(e.message))
await p.addInitScript(() => { let vt = 0, q = [], id = 0; const rr = window.requestAnimationFrame.bind(window), free = { on: true }
  window.requestAnimationFrame = (cb) => free.on ? rr(cb) : (q.push(cb), ++id); window.cancelAnimationFrame = () => {}
  const pn = performance.now.bind(performance); performance.now = () => free.on ? pn() : vt
  window.__lock = () => { vt = pn(); free.on = false }; window.__step = (dt) => { vt += dt; const c = q; q = []; c.forEach(f => f(vt)) } })
await p.goto(`http://localhost:5190/?${qs}`)
await p.waitForFunction(() => window.__calls > 0 && window.__herLife, null, { timeout: 150000 })
await p.waitForTimeout(game ? 7000 : 2500)
if (game) await p.addStyleTag({ content: 'body *:not(canvas){visibility:hidden !important} canvas, canvas *{visibility:visible !important}' })
await p.evaluate(() => { window.__lock(); if (window.__seqT) { window.__seqT.t = 0; window.__seqT.yaw = 0 } })
const step = (ms) => p.evaluate((ms) => { const n = Math.ceil(ms / 20); for (let j = 0; j < n; j++) window.__step(ms / n) }, ms)
if (game) await step(1500) // let the follow camera settle
const n = Math.round(secs * fps)
for (let i = 0; i < n; i++) {
  const t = i / fps; for (const [et, js] of E) if (et >= t && et < t + 1 / fps) await p.evaluate(js)
  await step(1000 / fps); await p.screenshot({ path: `${out}/f${String(i).padStart(4, '0')}.png` })
}
console.log(out, n, 'frames', errs.length ? errs.slice(0, 3) : ''); await b.close()
