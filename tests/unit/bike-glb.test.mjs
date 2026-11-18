// node --test tests/unit — Studio's Village Pet Bike GLB: spec (size, tris, 2 draw calls, empties, no compression
// extensions) and that it only loads lazily (no startup module imports the bike chunk, the GLB or GLTFLoader).
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { buildBike, legIK, EMPTIES, BONES } from '../../src/art/bike/mesh.js'

const GLB = new URL('../../src/art/bike/bicycle.glb', import.meta.url)
const SRC = new URL('../../src/', import.meta.url)
const bytes = fs.readFileSync(GLB)
const json = () => { const n = bytes.readUInt32LE(12); return JSON.parse(bytes.subarray(20, 20 + n).toString('utf8')) }
const parse = () => new Promise((res, rej) => new GLTFLoader().parse(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '', res, rej))

test('bicycle.glb is at most 48 KB and uses no Draco / meshopt / KTX2 (KHR_mesh_quantization only)', () => {
  assert.ok(bytes.length <= 48 * 1024, `${bytes.length} bytes`)
  const j = json()
  for (const e of j.extensionsUsed || []) assert.equal(e, 'KHR_mesh_quantization')
  assert.equal(j.meshes.length, 1)
  assert.equal(j.materials.length, 1)
  assert.equal((j.images || []).length, 0)
  for (const n of j.nodes) assert.ok(!n.scale || n.scale.every(s => s === 1), `node ${n.name} has a scale`)
})

test('the bike builds to 2 draw calls (rigid-skinned body + skinned ink hull) within the tri cap, with seat and pet_seat', async () => {
  const b = buildBike(await parse())
  assert.equal(b.calls, 2)
  assert.equal(b.mesh.isSkinnedMesh, true)
  assert.equal(b.hull.isSkinnedMesh, true)
  assert.equal(b.hull.skeleton, b.mesh.skeleton)
  assert.ok(b.tris.body + b.tris.ink <= 2464, JSON.stringify(b.tris))
  for (const n of BONES) assert.ok(b.bones[n], n)
  for (const n of EMPTIES) assert.ok(b.empties[n], n)
  assert.ok(Math.abs(b.wheelRadius - 0.0459) < 0.002, String(b.wheelRadius)) // scale 1.35 baked in
  b.root.updateMatrixWorld(true)
  const seat = b.empties.seat.getWorldPosition(b.root.position.clone())
  assert.ok(seat.y > 0.11 && seat.y < 0.14, `seat y ${seat.y}`)
  // rolling turns both wheels and the crank (half rate); pedals counter-rotate
  const q0 = b.bones.wheel_rear.quaternion.clone()
  b.update({ dist: b.wheelRadius * Math.PI })
  assert.ok(b.bones.wheel_rear.quaternion.angleTo(q0) > 3)
})

test('her leg IK reaches the target and bends the knee forward', () => {
  const L1 = 0.05, L2 = 0.048
  const { thigh, shin } = legIK(L1, L2, -0.07, 0.03)
  const ky = -L1 * Math.cos(thigh), kz = -L1 * Math.sin(thigh)
  const ay = ky - L2 * Math.cos(thigh + shin), az = kz - L2 * Math.sin(thigh + shin)
  assert.ok(Math.hypot(ay + 0.07, az - 0.03) < 1e-6)
  assert.ok(kz > 0.03 * (Math.hypot(ky, kz) / Math.hypot(0.07, 0.03)) - 1e-9) // knee ahead of the hip-ankle line
  assert.ok(shin > 0)
})

test('the bike is lazy: only mesh.js names the GLB or GLTFLoader, and World.jsx reaches it through import()', () => {
  const files = []
  const walk = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (/\.(js|jsx|mjs)$/.test(e.name)) files.push(p) } }
  walk(SRC.pathname)
  const meshJs = path.join(SRC.pathname, 'art/bike/mesh.js')
  for (const f of files) {
    if (f === meshJs) continue
    const s = fs.readFileSync(f, 'utf8')
    assert.ok(!/bicycle\.glb|GLTFLoader/.test(s), `${path.relative(SRC.pathname, f)} names the GLB or GLTFLoader`)
    assert.ok(!/import\s[^;()]*from\s+['"][./]*art\/bike\/mesh\.js['"]/.test(s) && !/import\s+['"][./]*art\/bike\/mesh\.js['"]/.test(s), `${path.relative(SRC.pathname, f)} statically imports the bike`)
  }
  assert.match(fs.readFileSync(path.join(SRC.pathname, 'game/World.jsx'), 'utf8'), /import\('\.\.\/art\/bike\/mesh\.js'\)/)
})
