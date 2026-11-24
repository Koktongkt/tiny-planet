// Character review shots from the studio (dev server on :5190, `npm run dev`).
//   node tools/chibi-shots.mjs <outDir> [extraQuery]
// Writes turn-{front,three,side,back}.png (full body) and face-{...}.png (the face from ten angles, including the
// face-framed side and the downward game-camera views), the same set as docs/characters/ref/her-approved-*.jpg.
// Uses the preinstalled Chromium when present (cloud sessions); otherwise Playwright's own.
import fs from 'node:fs'
import { chromium } from 'playwright'
const [,, out = 'shots', extra = ''] = process.argv
fs.mkdirSync(out, { recursive: true })
const exe = fs.existsSync('/opt/pw-browsers/chromium') ? { executablePath: '/opt/pw-browsers/chromium' } : {}
const b = await chromium.launch({ ...exe, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
const F = 'ly=0.33&zoom=2.1&fov=12&level'
const shots = [
  ...['front', 'three', 'side', 'back'].map(a => [`turn-${a}`, `angle=${a}&ly=0.2&zoom=0.8&fov=12`, 600, 800]),
  ['face-front', `angle=0&${F}`], ['face-turn', `angle=0.3&${F}`], ['face-34', `angle=0.6&${F}`], ['face-deep34', `angle=0.9&${F}`],
  ['face-nearside', `angle=1.2&${F}`], ['face-34-other', `angle=-0.6&${F}`], ['face-nearside-other', `angle=-1.2&${F}`],
  ['face-side', 'angle=side&ly=0.33&zoom=1.9&fov=12&level', 700, 500], // the studio aims at the body centre: crop to the face
  ['face-above', 'angle=0&ly=0.31&zoom=2.1&fov=12'], ['face-above-34', 'angle=0.5&ly=0.31&zoom=2.1&fov=12'],
]
const errs = []
for (const [name, qs, w = 500, h = 500] of shots) {
  const p = await b.newPage({ viewport: { width: w, height: h } }); p.on('pageerror', e => errs.push(e.message))
  await p.goto(`http://localhost:5190/?view=charstudio&still&t=day&enter&${qs}${extra}`)
  await p.waitForFunction(() => window.__calls > 0, null, { timeout: 120000 }).catch(() => {})
  await p.waitForTimeout(5000); await p.screenshot({ path: `${out}/${name}.png` })
  console.log(name, await p.evaluate(() => [window.__calls, window.__tris])); await p.close()
}
if (errs.length) console.log('page errors:', errs.slice(0, 3))
await b.close()
