// <MuseumInterior donated onInspect layer? touch? hoshino? /> (art-c item 7) — the ruins museum hall, in room units
// (layout.js MUSEUM; wrap in a group scaled by MUSEUM.S like Home's room). Codor owns the interior camera + movement +
// the door, exactly like Home: render this while inside and set the camera to `layer` so the outdoor scene isn't drawn.
// Draw calls: hall 1 (toon + baked ink) + glow 1 + tank glass 1 + water 1 + plaques 1 + chalk 1 + donated relics 1
// + 2 per fish species in the tank (FishInstances, swim wiggle on the GPU) + Hoshino (villager rig).
import React, { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { toon, glow, paint } from '../../common.jsx'
import { FishInstances } from '../fish/FishModel.jsx'
import { kit, combine } from '../train/kit.js'
import { hallGeometry, buildTank } from './hall.js'
import { relicsInto, chalkOutline } from './relics.js'
import { plaqueTexture, plaquesGeometry } from './plaques.js'
import { SLOTS, TANK, DESK } from './layout.js'
import { Hoshino } from './Hoshino.jsx'
import { ITEMS } from '../../game/items.js'
import { FISH_TEXT } from '../../game/itemsC.js'
const nameOf = (id) => (FISH_TEXT[id] && FISH_TEXT[id].name) || (ITEMS[id] && ITEMS[id].name) || id
let MATS = null
function mats() {
  if (MATS) return MATS
  MATS = { hall: paint(toon('#ffffff', { vertexColors: true }), 0.1, true, 6), glow: glow('#ffe2a8'), relic: toon('#ffffff', { vertexColors: true }),
    glass: new THREE.MeshBasicMaterial({ color: '#e8f6f8', transparent: true, opacity: 0.16, depthWrite: false, toneMapped: false }),
    water: new THREE.MeshToonMaterial({ color: '#86c9d2', transparent: true, opacity: 0.32, depthWrite: false }),
    plaque: toon('#ffffff', { map: plaqueTexture(nameOf) }), chalk: new THREE.LineBasicMaterial({ color: '#f6f2ea', transparent: true, opacity: 0.85 }) }
  return MATS
}
const isDon = (donated, id) => Array.isArray(donated) ? donated.includes(id) : donated && donated[id] !== undefined
const asRec = (donated) => Array.isArray(donated) ? Object.fromEntries(donated.map(id => [id, 0])) : (donated || {})
// fish in the tank: one school per donated species (+ minnows, always) ping-ponging along the tank; tails wiggle on the GPU
const SCHOOL = { koi: { n: 2, s: 0.13, y: 0.36, sp: 0.07 }, sea_bream: { n: 2, s: 0.11, y: 0.44, sp: 0.09 }, lake_lord: { n: 1, s: 0.24, y: 0.34, sp: 0.04 }, minnow: { n: 5, s: 0.04, y: 0.46, sp: 0.16 } }
function School({ id, touch, k }) {
  const g = useRef(), c = SCHOOL[id], items = useMemo(() => [...Array(c.n)].map((_, i) => ({ pos: [(i % 2 ? 0.05 : -0.04) * (c.n > 2 ? 1.4 : 1), (i % 3) * 0.035 - 0.02, -i * c.s * 0.9], quat: new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -Math.PI / 2, 0)).toArray(), s: c.s })), [id])
  const L = TANK.len / 2 - c.s * 0.8 - 0.04
  useFrame(({ clock }, dt) => { const t = clock.elapsedTime * c.sp + k * 1.7, ph = (t % 2 + 2) % 2, dirn = ph < 1 ? 1 : -1, u = ph < 1 ? ph : 2 - ph, e = u * u * (3 - 2 * u)
    const o = g.current; if (!o) return; o.position.set(TANK.x + Math.sin(t * 2.3 + k) * 0.05, c.y + Math.sin(t * 3.1 + k) * 0.03, TANK.z - L + e * 2 * L)
    const target = dirn > 0 ? 0 : Math.PI; o.rotation.y += (target - o.rotation.y) * Math.min(1, dt * 3) })
  return <group ref={g}><FishInstances id={id} items={items} quality={touch ? 'lo' : 'hi'} ink={0.0025} /></group>
}
export function MuseumInterior({ donated = {}, onInspect, layer = 0, touch = false, hoshino = true, highlight = null }) {
  const root = useRef(), M = mats(), hall = useMemo(() => hallGeometry({ touch }), [touch]), tank = useMemo(() => buildTank(), [])
  const key = SLOTS.map(s => isDon(donated, s.id) ? 1 : 0).join('')
  const dyn = useMemo(() => { const rec = asRec(donated), K = kit({ ink: 0.004 }), chalk = []; let any = false
    SLOTS.forEach((s, i) => { if (s.kind !== 'relic') return; if (isDon(donated, s.id)) { relicsInto(K, s.id, [s.x, s.y, s.z], 0.95); any = true } else chalk.push(...chalkOutline(s.id, s.x, s.z, s.y + 0.0015, i + 1)) })
    for (const s of SLOTS) if (s.kind === 'fish' && !isDon(donated, s.id)) chalk.push(...chalkOutline('coin', s.x + 0.03, s.z, TANK.y0 + 0.032, 3)) // chalk ring on the tank sand where a fish will go
    const lines = new THREE.BufferGeometry(); lines.setAttribute('position', new THREE.Float32BufferAttribute(chalk.length ? chalk : [0, 0, 0, 0, 0, 0], 3))
    return { relics: any ? combine(K.build()) : null, chalk: lines, plaques: plaquesGeometry(rec) } }, [key])
  useEffect(() => () => { for (const g of [dyn.relics, dyn.chalk, dyn.plaques]) g && g.dispose() }, [dyn])
  useEffect(() => { const r = root.current; if (r) r.traverse(o => o.layers.set(layer)) })
  const fish = SLOTS.filter(s => s.kind === 'fish' && isDon(donated, s.id)).map(s => s.id)
  const hit = useMemo(() => new THREE.MeshBasicMaterial({ visible: false }), []), hitGeo = useMemo(() => new THREE.BoxGeometry(0.22, 0.4, 0.22), [])
  return <group ref={root}>
    <mesh geometry={hall.one} material={M.hall} />
    <mesh geometry={hall.glow} material={M.glow} />
    {dyn.relics && <mesh geometry={dyn.relics} material={M.relic} />}
    <lineSegments geometry={dyn.chalk} material={M.chalk} />
    <mesh geometry={dyn.plaques} material={M.plaque} />
    {['minnow', ...fish].map((id, k) => <School key={id} id={id} k={k} touch={touch} />)}
    <mesh geometry={tank.water} material={M.water} renderOrder={2} />
    <mesh geometry={tank.glass} material={M.glass} renderOrder={3} />
    {hoshino && <Hoshino position={[DESK.x + DESK.w / 2 + 0.14, 0, DESK.z + 0.06]} rotation={[0, -0.35, 0]} />}
    {onInspect && SLOTS.map(s => <mesh key={s.id} geometry={hitGeo} material={hit} position={[s.x, 0.2, s.z]} onClick={(e) => { e.stopPropagation(); onInspect(s.id) }} />)}
    {highlight && (() => { const s = SLOTS.find(x => x.id === highlight); return s ? <pointLight position={[s.x, 0.9, s.z + 0.2]} color="#ffd79a" intensity={0.6} distance={0.9} decay={1.5} /> : null })()}
  </group>
}
export default MuseumInterior
