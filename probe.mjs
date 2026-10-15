import { chromium } from 'playwright'
const port = process.argv[2], qs = process.argv[3] || '?enter&nosave&t=day&out&at=home'
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
const p = await b.newPage({ viewport: { width: 1280, height: 800 } })
await p.goto(`http://localhost:${port}/${qs}`); await p.waitForFunction(() => window.__calls > 0 && window.__scene, null, { timeout: 120000 }); await p.waitForTimeout(10000)
const r = await p.evaluate(() => { const S = window.__scene, cam = window.__camera; const out = {}
  S.traverseVisible(o => { if (!(o.isMesh || o.isInstancedMesh) || !o.geometry) return
    const g = o.geometry, tri = (g.index ? g.index.count : g.attributes.position.count) / 3 * (o.isInstancedMesh ? o.count : 1)
    let a = o, path = []; while (a && path.length < 6) { if (a.name) path.push(a.name); a = a.parent }
    const k = (path.slice(-2).join('/') || 'anon') + (o.isInstancedMesh ? ' [inst]' : ''); out[k] = out[k] || [0, 0]; out[k][0]++; out[k][1] += tri })
  return Object.entries(out).sort((a, b) => b[1][1] - a[1][1]).slice(0, 25) })
console.log(r.map(([k, [n, t]]) => `${k}: ${n} meshes ${Math.round(t / 1000)}k`).join('\n')); await b.close()
