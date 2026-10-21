// Professor Hoshino (profiles key 'scholar'), museum look (art-c item 7): the villager rig (GhibliPerson Character) with a
// tweed cardigan, red bow-scarf and round glasses, a field notebook in his left hand and a pencil in his right. The notebook
// is parented to his forearm bone at runtime, so nothing in the startup chunk (GhibliPerson Prop) changes.
import React, { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { Character, spec } from '../../GhibliPerson.jsx'
import { VILLAGERS } from '../../villagers.js'
import { kit, combine } from '../train/kit.js'
import { toon } from '../../common.jsx'
const BASE = VILLAGERS.find(v => v.name === 'scholar')
/** Codor: drop-in cfg for the overworld too (same rig; `hold` cleared — the notebook is attachNotebook()) */
export const HOSHINO_LOOK = { ...BASE, scarf: '#b5524a', outfit: { ...BASE.outfit, top: '#a89a78', acc: '#5a6f58', acc2: '#d9b06a', bottom: '#4f4a46' }, hold: {}, walk: { ...BASE.walk, idle: 'look' } }
let NB = null
function notebookGeo() {
  if (NB) return NB
  const K = kit({ ink: 0.0015 })
  K.box(0.05, 0.008, 0.068, [0, 0, 0], '#8a3a32'); K.box(0.046, 0.004, 0.064, [0, 0.006, 0.001], '#fbf3e2', { hull: false }) // open notebook: red cover + pages
  K.box(0.002, 0.002, 0.05, [-0.008, 0.0085, 0], '#7a6a5a', { hull: false }); K.box(0.002, 0.002, 0.04, [0.01, 0.0085, -0.004], '#7a6a5a', { hull: false }) // scribbles
  K.box(0.004, 0.004, 0.068, [0.024, 0.006, 0], '#d9a54a', { hull: false }) // ribbon
  const P = kit({ ink: 0.001 }); P.cyl(0.0025, 0.055, [0, 0, 0], '#e8b84a', { seg: 6 }); P.cyl(0.0025, 0.008, [0, 0.031, 0], '#3b2f22', { seg: 6, r2: 0.0003, hull: false })
  const m = toon('#ffffff', { vertexColors: true })
  NB = { book: combine(K.build()), pencil: combine(P.build()), m }; return NB
}
/** parents the notebook (left hand) + pencil (right hand) to a Character's forearm bones; -> detach() */
export function attachNotebook(root, cfg = HOSHINO_LOOK) {
  const S = spec(cfg.body), g = notebookGeo(), out = []
  for (const k of ['L', 'R']) { const fo = root.getObjectByName('fo' + k); if (!fo) continue
    const hand = new THREE.Group(); hand.position.copy(S['hd' + k].clone().sub(S['el' + k])); fo.add(hand); out.push(hand)
    const m = new THREE.Mesh(k === 'L' ? g.book : g.pencil, g.m); if (k === 'L') { m.rotation.set(0.35, 0.9, 0.1); m.position.set(0.012, 0.0, 0.03) } else { m.rotation.set(1.1, 0, 0.5); m.position.set(0, 0.004, 0.008) }
    m.traverse(o => { o.layers.mask = root.layers.mask }); hand.add(m) }
  return () => out.forEach(h => h.removeFromParent())
}
/** <Hoshino pose='write'|'idle' scale /> — museum figure (writing in his notebook, glancing up now and then) */
export function Hoshino({ scale = 0.8, pose = 'write', res = 44, ...props }) {
  const g = useRef(), st = useMemo(() => ({ move: 0, phase: 0, t: 0, force: true }), []), bones = useRef(null)
  useEffect(() => { let off = null, n = 0; const iv = setInterval(() => { const r = g.current; if (r && r.getObjectByName('foL')) { off = attachNotebook(r); bones.current = { upL: r.getObjectByName('upL'), foL: r.getObjectByName('foL'), upR: r.getObjectByName('upR'), foR: r.getObjectByName('foR'), head: r.getObjectByName('head') }; clearInterval(iv) } else if (++n > 50) clearInterval(iv) }, 100)
    return () => { clearInterval(iv); off && off() } }, [])
  useFrame((_, dt) => { st.t += Math.min(dt, 0.05); const B = bones.current; if (!B || pose !== 'write') return
    const t = st.t, look = Math.sin(t * 0.35) > 0.6 // looks up from his notes now and then
    B.upL.rotation.set(-0.15, 0, 0); B.foL.rotation.set(-1.2, 0, 0)
    B.upR.rotation.set(-0.15, 0, 0); B.foR.rotation.set(-1.1 + Math.sin(t * 9) * (look ? 0 : 0.05), Math.sin(t * 4.3) * (look ? 0 : 0.08), 0)
    if (B.head) B.head.rotation.x = look ? -0.04 : 0.18 })
  return <group ref={g} {...props}><Character cfg={HOSHINO_LOOK} st={st} res={res} scale={scale} /></group>
}
export default Hoshino
