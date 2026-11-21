// Mochi's body + tail, Cozy Chibi pass (round 11), built like Pip's: one smooth cream torso (chest, barrel, round rump)
// that grows four short leg roots, smooth leg columns with dark-brown Siamese socks, and the coat pattern in the shader:
// a fluffy white chest ruff with a zigzag edge and soft brown stripes over the back and down the flanks. The tail is a
// smooth tube rebuilt every frame along the rig's springy tail chain, so it still swishes, curls and wags, with dark
// rings and a dark tip. Concept: docs/characters/ref/pets-chibi-concept.jpg (bottom row).
import * as THREE from 'three'
import React, { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { OUT } from '../home/kit.jsx'
import { ell, smin, starMesh, patchFur } from './sdfKit.js'
import { legGeo, legOut } from './shibaBody.jsx'

// ---------- torso, in body units (the rig scales x, y, z by cfg.body) ----------
const T = { barrel: [[0, 0, 0], [0.9, 0.86, 1.0]], chest: [[0, 0.06, 0.52], [0.86, 0.94, 0.56]], rump: [[0, 0.02, -0.52], [0.92, 0.88, 0.56]], ruff: [[0, -0.12, 0.8], [0.5, 0.5, 0.32]], k: 0.3 }
export const CROOT = { y: -0.8, r: [0.3, 0.33, 0.21], k: 0.22, front: [0.5, 0.58], hind: [0.5, -0.58] }
const ROOTS = [[CROOT.front[0], CROOT.front[1]], [-CROOT.front[0], CROOT.front[1]], [CROOT.hind[0], CROOT.hind[1]], [-CROOT.hind[0], CROOT.hind[1]]]
const tsdf = (x, y, z) => { let d = smin(ell(x, y, z, ...T.barrel), ell(x, y, z, ...T.chest), T.k); d = smin(d, ell(x, y, z, ...T.rump), T.k); d = smin(d, ell(x, y, z, ...T.ruff), 0.18) // fluffy chest
  let rt = 9; for (const [lx, lz] of ROOTS) rt = Math.min(rt, ell(x, y, z, [lx, CROOT.y, lz], CROOT.r))
  return smin(d, rt, CROOT.k) }
const torsoGeo = (() => { const C = [0, 0, 0], RD = ROOTS.map(([x, z]) => { const v = new THREE.Vector3(x, CROOT.y - 0.2, z).normalize(); return [v, [x, CROOT.y + 0.15, z]] })
  const origin = (d) => { for (const [v, o] of RD) { const w = d[0] * v.x + d[1] * v.y + d[2] * v.z; if (w > 0.93) { const k = Math.min(1, (w - 0.93) / 0.05); return [o[0] * k, o[1] * k, o[2] * k] } } return C }
  return starMesh(tsdf, { C, w: 72, h: 56, step: 0.008, far: 2.2, relax: 6, origin }) })()
const TORSO_GLSL = `vec3 p = vO; float ax = abs(p.x), w;
  // chest ruff: a near-white fluffy bib, a V pointing down the chest with spiky fur-tuft edges and a thin tan line
  float teeth = 0.1*abs(fract(ax*6. + .25) - .5)*2.;
  float ruff = min(min(p.z - 0.42 + 0.3*ax - 0.07*abs(fract(p.y*6. + .25) - .5)*2., 0.6 - p.y), p.y - (-0.55 + 0.8*ax) - teeth); // front of the chest only
  w = fwidth(ruff)*1.2 + 1e-4; base = mix(base, uRuff, smoothstep(-w, w, ruff));
  float edge = smoothstep(-w, w, ruff)*(1. - smoothstep(.035 - w, .035 + w, ruff))*step(-0.6, p.y)*smoothstep(0., .1, p.z);
  base = mix(base, uStripe, edge*.55);
  // stripes: soft brown bands over the back, tapering to points down the flanks
  float st = 0.;
  for (int k = 0; k < 3; k++) { float zc = -0.05 - 0.27*float(k) - 0.12*(0.8 - p.y), hw = 0.075*smoothstep(-0.25, 0.75, p.y)*(1. - 0.25*float(k == 2));
    float b = hw - abs(p.z - zc); w = fwidth(b)*1.2 + 1e-4; st = max(st, smoothstep(-w, w, b)); }
  base = mix(base, uStripe, st*step(-0.3, p.y));
  // the socks start on the torso's leg roots, a little below the belly line
  float sk = -0.98 + 0.025*sin(p.x*40.) - p.y; w = fwidth(sk)*1.2 + 1e-4; base = mix(base, uDark, smoothstep(-w, w, sk));`
const torsoMat = (c) => patchFur('mochiTorso', c.col.main, { glsl: TORSO_GLSL, decl: 'uniform vec3 uRuff, uStripe, uDark;',
  uniforms: { uRuff: { value: new THREE.Color(c.col.belly) }, uStripe: { value: new THREE.Color(c.col.stripe) }, uDark: { value: new THREE.Color(c.col.sock) } } })
// legs: dark-brown socks (they start on the torso's leg root, which is painted to match)
// (the whole leg below the torso's root is sock)
const LEG_GLSL = `float d = -0.3 - vO.y; float w = fwidth(d)*1.2 + 1e-4; base = mix(base, uDark, smoothstep(-w, w, d));`
const legMat = (c) => patchFur('mochiLeg', c.col.main, { glsl: LEG_GLSL, decl: 'uniform vec3 uDark;', uniforms: { uDark: { value: new THREE.Color(c.col.sock) } } })

export function CatBody({ c, set, legs }) {
  const [bw, bh, bl] = c.body, L = c.legH + bh * 0.2, tm = torsoMat(c), lm = legMat(c)
  const cut = -(bh * (-CROOT.y + CROOT.r[1] - 0.35 - 0.08)) / L // just above the bottom of the torso's leg root, in leg units
  return <>
    <group ref={set('torso')} scale={[bw, bh, bl]}><mesh geometry={torsoGeo} material={tm} /><mesh geometry={torsoGeo} material={OUT.pet} /></group>
    {legs.map(([k, sx, fz]) => <group key={k} ref={set('leg' + k)} position={[sx * bw * CROOT.front[0], -bh * 0.35, fz * bl * CROOT.front[1]]}>
      <group scale={[c.legR * 1.07, L, c.legR * 1.07]}><mesh geometry={legGeo} material={lm} /><mesh geometry={legGeo} material={legOut(cut)} /></group>
    </group>)}
  </>
}

// ---------- tail: a smooth tube along the rig's tail chain (markers t0..tN-1), rebuilt each frame ----------
const NS = 36, NR = 10
const TAIL_GLSL = `float u = vCol.r, w = fwidth(u)*1.4 + 1e-4, ring = 0.;
  for (int k = 0; k < 3; k++) { float c0 = 0.24 + 0.2*float(k); ring = max(ring, smoothstep(c0 - w, c0 + w, u)*(1. - smoothstep(c0 + .1 - w, c0 + .1 + w, u))); }
  ring = max(ring, smoothstep(.82 - w, .82 + w, u)); // three wide dark rings and a dark tip
  base = mix(uCream, uDark, ring);`
const tailMat = (c) => patchFur('mochiTail', '#ffffff', { glsl: TAIL_GLSL, decl: 'uniform vec3 uCream, uDark;', vertexColors: true,
  uniforms: { uCream: { value: new THREE.Color(c.col.main) }, uDark: { value: new THREE.Color(c.col.dark) } } })
const _v = new THREE.Vector3(), _t = new THREE.Vector3(), _n = new THREE.Vector3(), _b = new THREE.Vector3(), _inv = new THREE.Matrix4()
export function CatTail({ c, R }) {
  const anchor = useRef(), m = tailMat(c)
  const geo = useMemo(() => { const g = new THREE.BufferGeometry(), n = (NS + 1) * (NR + 1)
    const col = new Float32Array(n * 3), idx = []
    for (let i = 0; i <= NS; i++) for (let j = 0; j <= NR; j++) col[(i * (NR + 1) + j) * 3] = i / NS
    for (let i = 0; i < NS; i++) for (let j = 0; j < NR; j++) { const a = i * (NR + 1) + j, b = a + NR + 1; idx.push(a, a + 1, b, b, a + 1, b + 1) }
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3)); g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(n * 3), 3))
    g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.setIndex(idx); g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 0.3); return g }, [])
  const pts = useMemo(() => [...Array(c.tail.n + 2)].map(() => new THREE.Vector3()), [c]), curve = useMemo(() => new THREE.CatmullRomCurve3(pts, false, 'centripetal'), [pts])
  useFrame(() => { const A = anchor.current; if (!A) return; A.updateWorldMatrix(true, false)
    const inv = _inv.copy(A.matrixWorld).invert(), n = c.tail.n
    pts[0].set(0, 0, 0)
    for (let i = 0; i < n; i++) { const g = R.current['t' + i]; if (!g) return; g.updateWorldMatrix(true, false); pts[i + 1].set(0, 0, -c.tail.seg).applyMatrix4(g.matrixWorld).applyMatrix4(inv) }
    pts[n + 1].copy(pts[n]).sub(pts[n - 1]).multiplyScalar(0.35).add(pts[n]) // a little past the last joint, for the rounded tip
    const P = geo.attributes.position.array, N = geo.attributes.normal.array, r0 = c.tail.r
    _n.set(1, 0, 0)
    for (let i = 0; i <= NS; i++) { const u = i / NS; curve.getPointAt(u, _v); curve.getTangentAt(u, _t)
      _b.crossVectors(_t, _n).normalize(); _n.crossVectors(_b, _t).normalize() // parallel-transported frame
      const rr = r0 * (1 - 0.18 * u) * (u > 0.9 ? Math.sqrt(Math.max(0, 1 - ((u - 0.9) / 0.1) ** 2)) : 1)
      for (let j = 0; j <= NR; j++) { const a = j / NR * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a), k = (i * (NR + 1) + j) * 3
        const nx = _n.x * ca + _b.x * sa, ny = _n.y * ca + _b.y * sa, nz = _n.z * ca + _b.z * sa
        P[k] = _v.x + nx * rr; P[k + 1] = _v.y + ny * rr; P[k + 2] = _v.z + nz * rr; N[k] = nx; N[k + 1] = ny; N[k + 2] = nz } }
    geo.attributes.position.needsUpdate = true; geo.attributes.normal.needsUpdate = true })
  return <group ref={anchor}><mesh geometry={geo} material={m} frustumCulled={false} /><mesh geometry={geo} material={OUT.pet} frustumCulled={false} /></group>
}
