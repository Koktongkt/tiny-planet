// node --test tests/unit — Pip's following: continuous catch-up speed, ignores fidgets, gradual side switch,
// varied settling, quick return to following after a short stop
import test from 'node:test'; import assert from 'node:assert/strict'
import { newFollow, stepFollow, followSpeed, SETTLES } from '../../src/pets/follow.js'

const DT = 1 / 60
function seeded(s) { return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646 } }
// her: walks along +z at `spd` while `walking(t)`; pet: snaps to the target (we only test the decisions here)
function run(F, secs, walking, opt = {}) {
  const her = opt.her || { x: 0, z: 0, yaw: 0, speed: 0 }, pet = opt.pet || { x: 0, z: -0.4, yaw: 0 }, rnd = opt.rnd || Math.random
  const log = []
  for (let i = 0, t = opt.t0 || 0; i < secs * 60; i++, t += DT) {
    const w = walking(t); her.speed = w ? 0.88 : 0; her.z += her.speed * DT
    if (opt.jitter) { her.x = 0.05 * Math.sin(t * 2) }
    const out = stepFollow(F, her, pet, DT, rnd)
    const k = Math.min(1, DT * 6); pet.x += (out.x - pet.x) * k; pet.z += (out.z - pet.z) * k
    log.push({ t, mode: F.mode, settle: F.settle, out })
  }
  return { her, pet, log }
}

test('catch-up speed is continuous in the gap', () => {
  let prev = followSpeed(0, 0.88)
  for (let g = 0.001; g <= 5; g += 0.001) { const s = followSpeed(g, 0.88); assert.ok(Math.abs(s - prev) < 0.01, `jump at ${g}`); prev = s }
  assert.ok(followSpeed(5, 0.88) <= 2.8 && followSpeed(0, 0) === 0)
})

test('ignores her fidgets once settled', () => {
  const F = newFollow(), o = run(F, 6, () => false)
  assert.notEqual(F.mode, 'follow')
  const r = run(F, 5, () => false, { her: o.her, pet: o.pet, jitter: true, t0: 6 })
  for (const e of r.log) { assert.notEqual(e.mode, 'follow'); assert.equal(e.out.speed, 0) }
})

test('side switch is gradual', () => {
  const F = newFollow(); F.sideK = F.side = -1
  run(F, 0.2, () => true); F.side = 1; let t0 = null, t1 = null
  run(F, 3, () => true, { rnd: () => 0.99 }) // (rnd high: no second flip)
  // re-run, timing the crossing
  const G = newFollow(); G.sideK = G.side = -1; G.flipT = 99; G.side = 1
  for (let i = 0; i < 300; i++) { stepFollow(G, { x: 0, z: i * 0.015, yaw: 0, speed: 0.88 }, { x: 0, z: i * 0.015 - 0.4, yaw: 0 }, DT); const t = i * DT
    if (t0 === null && G.sideK > -0.9) t0 = t; if (t1 === null && G.sideK >= 0.9) t1 = t }
  assert.ok(t1 !== null && t1 - t0 >= 0.6, `crossed in ${t1 - t0}`)
})

test('settling varies', () => {
  const F = newFollow(), rnd = seeded(7), seen = new Set(), her = { x: 0, z: 0, yaw: 0, speed: 0 }, pet = { x: 0, z: -0.4, yaw: 0 }
  for (let c = 0; c < 200; c++) {
    const r = run(F, 3, (t) => t % 3 < 1, { her, pet, rnd, t0: 0 })
    for (const e of r.log) if (e.settle) seen.add(e.settle)
  }
  for (const k of SETTLES) assert.ok(seen.has(k), `never saw ${k}`)
})

test('a short stop goes straight back to following', () => {
  const F = newFollow(), o = run(F, 3, () => false)
  assert.notEqual(F.mode, 'follow')
  const r = run(F, 0.4, () => true, { her: o.her, pet: o.pet })
  const back = r.log.findIndex(e => e.mode === 'follow')
  assert.ok(back >= 0 && back * DT <= 0.2, `back after ${back * DT}s`)
})

test('sitting: looks at her, stands only when she goes out of view', () => {
  // stepFollow picks a settle and a side with Math.random. Running a random settle first
  // left him at a yaw where a 0.1 step was sometimes out of view, so mode became 'turn'.
  // Place him facing her and pass a seeded rng so the probe never calls Math.random.
  const rnd = seeded(1)
  const F = newFollow()
  F.mode = 'sit'; F.settle = null; F.t = 0; F.dur = 8
  F.herAt = { x: 0, z: 1.2 }
  const her = { x: 0.1, z: 1.2, yaw: 0, speed: 0 } // a small step aside: he just looks
  const pet = { x: 0, z: 0, yaw: 0 } // already looking along +z, toward her
  const out = stepFollow(F, her, pet, DT, rnd)
  assert.equal(F.mode, 'sit'); assert.ok(out.look !== null)
})
