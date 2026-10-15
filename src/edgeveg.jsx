// layered edge vegetation (lazy chunk, mounted in an idle slot after the first frame)
import * as THREE from 'three'
import React, { useMemo } from 'react'
import { R, rnd, place, randDir, around, pathDir, streamDir, windify } from './world.js'
import { C, toon, paint, Instanced } from './common.jsx'
import { foliage, fernGeo, tallGrassGeo, shrubGeo, shrubLo, rockGeo } from './scenery.js'
const _ev = new THREE.Vector3()
export default function EdgeVeg({ W }) {
  const { TREES, FIRS, HOUSES, onHouse, vergeOK, busy, DENS, TOUCH } = W
  const S = useMemo(() => {
    const ferns = [], shrubs = [], tall = [], rocks = [], fc = C('#7fb86a'), sc = ['#6fa860', '#86b86a', '#5f9a5a'].map(C), gc = C('#9ccf72'), rc = C('#ffffff')
    const put = (arr, n, s, c, lift = -0.005) => { if (vergeOK(n)) arr.push({ ...place(n, lift, rnd() * 6.28), s, c }) }
    for (const t of [...TREES, ...FIRS]) { if (rnd() < 0.35) continue; const k = 1 + Math.floor(rnd() * 3); for (let j = 0; j < k; j++) put(ferns, around(t.n, (0.12 + rnd() * 0.2) / R, rnd() * 6.28), 0.75 + rnd() * 0.6, fc.clone().multiplyScalar(0.85 + rnd() * 0.3)) }
    HOUSES.forEach((h, i) => { const w = 0.55 + (i % 3) * 0.1; for (const [x, z] of [[-w / 2 - 0.07, -0.18], [w / 2 + 0.07, 0.12], [-w / 2 - 0.06, 0.15], [w / 2 + 0.08, -0.2], [-0.24, -0.33], [0.2, -0.32], [w / 2 - 0.05, 0.36]]) { if (rnd() < 0.25) continue; const n = onHouse(i, x, z); shrubs.push({ ...place(n, -0.01, rnd() * 6.28), s: 0.7 + rnd() * 0.5, c: sc[Math.floor(rnd() * 3)].clone() }) } })
    for (let i = 0; i < 1300 * DENS * (TOUCH ? 0.6 : 1); i++) { const t = rnd() * Math.PI * 2, fn = rnd() < 0.62 ? pathDir : streamDir, c = fn(t).normalize(); const f = fn(t + 0.01).normalize().sub(c), side = _ev.crossVectors(c, f).normalize(), off = (rnd() < 0.5 ? -1 : 1) * (0.2 + rnd() * 0.22) / R
      const n = c.clone().addScaledVector(side, off).normalize(); const r = rnd(); if (r < 0.62) put(tall, n, 0.7 + rnd() * 0.7, gc.clone().multiplyScalar(0.85 + rnd() * 0.25)); else if (r < 0.8) put(shrubs, n, 0.6 + rnd() * 0.5, sc[Math.floor(rnd() * 3)].clone()); else if (r < 0.88) put(rocks, n, 0.5 + rnd() * 0.6, rc.clone().multiplyScalar(0.9 + rnd() * 0.15), -0.015) }
    for (let i = 0; i < 260 * DENS; i++) { const n = randDir(); if (busy(n)) continue; put(rocks, n, 0.6 + rnd() * 1.1, rc.clone().multiplyScalar(0.88 + rnd() * 0.15), -0.02); if (rnd() < 0.5) put(ferns, around(n, 0.12 / R, rnd() * 6), 0.7 + rnd() * 0.4, fc.clone()) }
    return { ferns, shrubs, tall, rocks }
  }, [])
  const G_ = useMemo(() => ({ fern: fernGeo(6), fernLo: fernGeo(4), tall: tallGrassGeo(7), tallLo: tallGrassGeo(3), shrub: shrubGeo(), shrubLo: shrubLo(), rock: rockGeo(1, 2), rockLo: rockGeo(0, 2) }), [])
  const M_ = useMemo(() => ({ leaf: windify(toon('#ffffff', { vertexColors: true, side: THREE.DoubleSide }), 4, 0), shrub: foliage(toon('#ffffff', { vertexColors: true }), 1.5, 0.02), rock: paint(toon('#ffffff', { vertexColors: true }), 0.14, true, 14) }), [])
  return <>
    <Instanced items={S.ferns} geo={TOUCH ? G_.fernLo : G_.fern} lo={G_.fernLo} mat={M_.leaf} />
    <Instanced items={S.tall} geo={G_.tall} lo={G_.tallLo} mat={M_.leaf} />
    <Instanced items={S.shrubs} geo={G_.shrub} lo={G_.shrubLo} mat={M_.shrub} />
    <Instanced items={S.rocks} geo={G_.rock} lo={G_.rockLo} mat={M_.rock} />
  </>
}
