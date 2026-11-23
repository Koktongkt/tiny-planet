// Her house from outside (lazy chunk): the round chibi cottage, two puffy trees, the entrance from the interior
// (lantern posts, stone steps + mat, daisy pots, bushes), flowering bushes round the walls, stepping stones, rocks,
// sprouts, the crop beds' corner, and a fence round the whole yard with a gate on the path. Everything is a reusable catalog prop (props/items/exterior.js);
// here they are composed into ONE baked mesh (toon + outline + glow + contact shadows) so the whole yard costs a
// handful of draw calls. Each item sits on the real ground (the planet curves away ~0.1 over the garden), upright to
// the local surface. Layout numbers: home/yard.js.
import * as THREE from 'three'
import React, { useMemo } from 'react'
import { R, height, place } from '../world.js'
import { compose } from '../props/index.js'
import { mat } from '../props/items/exterior.js'
import { YARD, HOME_S, COTTAGE, fenceRuns, yardGate } from './yard.js'

const S = HOME_S
// the yard composition, built in the house's own frame (the group it is mounted under: place(homeN, lift, 0))
export function buildYard(homeN, onHouse, lift) {
  const H = place(homeN, lift, 0), inv = new THREE.Matrix4().compose(H.pos, H.q, new THREE.Vector3(1, 1, 1)).invert(), qi = H.q.clone().invert()
  // a frame on the ground at house-frame (x, z): position on the real surface, y = local up, facing yaw (house frame)
  const at = (x, z, yaw = 0, s = S, sink = 0.006) => { const n = onHouse(0, x, z), p = n.clone().multiplyScalar(R + height(n) - sink).applyMatrix4(inv), up = n.clone().applyQuaternion(qi).normalize()
    const f = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw)); f.addScaledVector(up, -f.dot(up)).normalize(); const xx = new THREE.Vector3().crossVectors(up, f)
    return new THREE.Matrix4().makeBasis(xx, up, f).setPosition(p).multiply(new THREE.Matrix4().makeScale(s, s, s)) }
  const polar = (deg, r) => [Math.sin(deg * Math.PI / 180) * r, -Math.cos(deg * Math.PI / 180) * r]
  return compose((k) => {
    // the house (at the frame origin, on the house's own lift like every village house)
    k.use('cottage', mat(0, 0, 0, 0, S), { chimney: COTTAGE.chimney, shadow: false })
    k.shadow(1.5, 1.5)
    // entrance, matching the interior's: lantern posts hugging the door frame, steps + mat, daisy pots, bushes
    const fz = 0.55 * S
    for (const s of [-1, 1]) k.use('lanternPost', at(s * 0.42, fz - 0.02, -s * 0.25))
    k.use('steps', at(0, fz + 0.02, 0), { w: 0.4, mat: true })
    for (const s of [-1, 1]) k.use('flowerPot', at(s * 0.56, fz + 0.0, s))
    // flowering bushes round the foot of the wall, plain bushes toward the back
    ;[[-150, 1, 5], [150, 1, 4], [-100, 0.9, 3], [100, 0.95, 4], [-65, 0.85, 0], [70, 0.85, 2], [-20, 0.8, 0], [20, 0.8, 0]].forEach(([deg, sc, fl], i) => {
      const [x, z] = polar(deg, 0.66 * S), m = at(x, z, -deg * Math.PI / 180 + Math.PI, S * sc)
      fl ? k.use('flowerBush', m, { flowers: fl }) : k.use('bush', m) })
    { const d = YARD.dogHouse; k.use('dogHouse', at(d.x, d.z, d.yaw), { bowlSide: -1, bowlX: -0.18, bowlZ: 0.38 }) } // Pip's house, the bowl out front-left, toward the path
    for (const t of YARD.trees) k.use('puffTree', at(t.x, t.z, t.seed), { seed: t.seed, crown: t.crown })
    for (const [x, z, a] of YARD.stones) k.use('stepStone', at(x, z, a, S, 0.0))
    for (const [x, z, a] of YARD.rocks) k.use('rocks', at(x, z, a))
    YARD.sprouts.forEach(([x, z], i) => k.use('sprout', at(x, z, i * 1.7)))
    // the crop corner (the beds themselves are the Stage B garden's, art/garden): path, watering can, bushes
    for (const [x, z, a] of YARD.gardenStones) k.use('stepStone', at(x, z, a, S * 0.8, 0.0))
    k.use('wateringCan', at(YARD.gardenCan[0], YARD.gardenCan[1], YARD.gardenCan[2]))
    YARD.gardenBushes.forEach(([x, z, sc], i) => k.use('flowerBush', at(x, z, i * 2.1, S * sc), { flowers: 3 }))
    // the yard fence: an oval of fence runs round everything (a post where each run starts, so joints aren't doubled)
    const runs = fenceRuns()
    runs.forEach(([[x0, z0], [x1, z1]], i) => {
      const L = Math.hypot(x1 - x0, z1 - z0), yaw = Math.atan2(z0 - z1, x1 - x0) // the run's +x along (x0,z0) -> (x1,z1)
      k.use('fence', at((x0 + x1) / 2, (z0 + z1) / 2, yaw), { len: L / S, every: 0.24, posts: i === 0 ? 'none' : 'start' }) // the gate's own posts close both ends
    })
    // the gate on the path, its posts in line with the fence; flowering bushes either side, outside
    const G = yardGate(), gy = Math.atan2(G.a[1] - G.b[1], G.b[0] - G.a[0]), gw = Math.hypot(G.b[0] - G.a[0], G.b[1] - G.a[1])
    k.use('gate', at(G.c[0], G.c[1], gy), { w: gw / S - 0.07 })
    for (const s of [-1, 1]) k.use('flowerBush', at(G.c[0] + s * (gw / 2 + 0.2), G.c[1] + 0.14, s, S * 0.85), { flowers: 3 })
  })
}

export function HomeExterior({ homeN, onHouse, lift }) {
  const obj = useMemo(() => buildYard(homeN, onHouse, lift), [])
  return <primitive object={obj} />
}
export default HomeExterior
