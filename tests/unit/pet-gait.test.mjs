// node --test tests/unit — pet gait: planted stance feet, duty, continuous gait blend, reach limit, dt clamp, leg aiming
import test from 'node:test'; import assert from 'node:assert/strict'
import { GAITS, gaitMix, newFeet, stepFeet, legAngles } from '../../src/pets/gait.js'

const L = 0.067
const G = { walkTo: 0.42, trotTo: 1.25, runAt: 1.7, strideMin: 0.03, strideMax: 0.087, run: 'gallop', reach: 0.05, lift: 0.012 }
const HIPS = [[0.028, 0.04], [-0.028, 0.04], [0.03, -0.039], [-0.03, -0.039]]
const DT = 1 / 60

// body pose in the world: yaw 0 faces +z; a local point (x, z) sits at world pos + (c x + s z, -s x + c z)
const toWorld = (b, p) => { const s = Math.sin(b.yaw), c = Math.cos(b.yaw); return [b.x + c * p.x + s * p.z, b.z - s * p.x + c * p.z] }

test('stance feet stay put in the world', () => {
  for (const [v, w] of [[0.3, 0], [0.5, 0.4], [1.0, -0.8], [2.2, 0.3]]) {
    const f = newFeet(HIPS), b = { x: 0, z: 0, yaw: 0 }, anchor = [null, null, null, null]
    let checked = 0
    for (let i = 0; i < 600; i++) {
      stepFeet(f, HIPS, G, { v, w, dt: DT })
      b.yaw += w * DT; b.x += Math.sin(b.yaw) * v * DT; b.z += Math.cos(b.yaw) * v * DT
      f.legs.forEach((leg, k) => {
        if (!leg.stance) { anchor[k] = null; return }
        const p = toWorld(b, leg)
        if (!anchor[k]) anchor[k] = p
        else { assert.ok(Math.hypot(p[0] - anchor[k][0], p[1] - anchor[k][1]) < 1e-4, `v ${v} w ${w} leg ${k} drifted`); checked++ }
      })
    }
    assert.ok(checked > 300, `only ${checked} stance samples`)
  }
})

test('duty matches the gait', () => {
  const f = newFeet(HIPS), v = 0.2, mix = gaitMix(G, v); let on = 0, n = 0
  for (let i = 0; i < 1200; i++) { stepFeet(f, HIPS, G, { v, w: 0, dt: DT }); if (i > 200) for (const l of f.legs) { n++; if (l.stance) on++ } }
  assert.ok(Math.abs(on / n - mix.duty) < 0.04, `stance ${on / n} vs duty ${mix.duty}`)
})

test('walk is a lateral-sequence four-beat; trot pairs diagonals', () => {
  assert.deepEqual(GAITS.walk.off, [0.25, 0.75, 0, 0.5])
  const t = GAITS.trot.off; assert.equal(t[0] % 1, t[3] % 1); assert.equal(t[1] % 1, t[2] % 1)
})

test('gait blend is continuous in speed', () => {
  for (const g of [G, { ...G, run: 'bound', walkTo: 0.3, trotTo: 0.5, runAt: 0.65 }]) {
    let prev = gaitMix(g, 0)
    for (let v = 0.001; v <= 3; v += 0.001) {
      const m = gaitMix(g, v)
      for (let i = 0; i < 4; i++) assert.ok(Math.abs(m.off[i] - prev.off[i]) < 0.01, `off jump at ${v}`)
      assert.ok(Math.abs(m.duty - prev.duty) < 0.01); assert.ok(Math.abs(m.stride - prev.stride) < 0.001)
      prev = m
    }
  }
})

test('reach limit forces a lift (turning on the spot)', () => {
  const f = newFeet(HIPS); let stepped = 0
  for (let i = 0; i < 300; i++) {
    stepFeet(f, HIPS, G, { v: 0, w: 6, dt: DT })
    f.legs.forEach((l, k) => { if (l.stance) assert.ok(Math.hypot(l.x - HIPS[k][0], l.z - HIPS[k][1]) <= G.reach + 1e-6); else stepped++ })
  }
  assert.ok(stepped > 0, 'legs never stepped')
})

test('big dt is clamped', () => {
  const f = newFeet(HIPS); stepFeet(f, HIPS, G, { v: 1, w: 0, dt: DT }); const ph = f.ph, freq = f.freq
  stepFeet(f, HIPS, G, { v: 1, w: 0, dt: 0.5 }); assert.ok(f.ph - ph <= freq * 0.05 + 1e-6)
})

test('feet settle under the hips when standing', () => {
  const f = newFeet(HIPS)
  for (let i = 0; i < 100; i++) stepFeet(f, HIPS, G, { v: 1, w: 0, dt: DT })
  for (let i = 0; i < 120; i++) stepFeet(f, HIPS, G, { v: 0, w: 0, dt: DT })
  f.legs.forEach((l, k) => { assert.ok(Math.hypot(l.x - HIPS[k][0], l.z - HIPS[k][1]) < 0.002); assert.ok(l.y < 1e-3) })
})

test('legAngles aims the column at the paw', () => {
  const hip = [0.02, 0.03]
  const a = legAngles({ x: 0.02, z: 0.03, y: 0 }, hip, L); assert.ok(Math.abs(a.rx) < 1e-9 && Math.abs(a.rz) < 1e-9 && Math.abs(a.len - 1) < 1e-9)
  assert.ok(legAngles({ x: 0.02, z: 0.05, y: 0 }, hip, L).rx < 0) // paw ahead -> negative pitch (positive swings it back)
  assert.ok(legAngles({ x: 0.03, z: 0.03, y: 0 }, hip, L).rz > 0) // paw out to +x
  assert.ok(legAngles({ x: 0.02, z: 0.03, y: 0.01 }, hip, L).len < 1) // lifted paw -> shorter leg
})
