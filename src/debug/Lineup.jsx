// ?view=lineup: all villagers in rows on the meadow, for model / outfit review. Dev-only lazy chunk.
import * as THREE from 'three'
import React, { useMemo, lazy, Suspense } from 'react'
import { useFrame } from '@react-three/fiber'
import { R, wind } from '../world.js'
import { Basis, q } from '../common.jsx'
import { PEOPLE } from '../peopleData.js'
import { VILLAGERS } from '../villagers.js'
import { Character } from '../GhibliPerson.jsx'
import { tangentAt, LINEUP } from '../npc/routines.js'
const PersonLazy = lazy(() => import('../people.jsx').then(m => ({ default: m.Person })))
const Person = (p) => <Suspense fallback={null}><PersonLazy {...p} /></Suspense>
const NEWCHAR = !q.has('oldchar')
export default function Lineup() {
  const LIST = NEWCHAR ? VILLAGERS : PEOPLE
  const sts = useMemo(() => LIST.map((_, i) => ({ phase: i * 0.7, move: NEWCHAR ? (q.has('walk') ? 1 : 0) : i % 3 === 0 ? 0 : 1, t: 0, wave: i % 3 === 0 })), [])
  useFrame((_, dt) => { sts.forEach((st, i) => { st.t = wind.time.value; st.phase += dt * 8 * st.move }) })
  const f = tangentAt(LINEUP, 0), side = new THREE.Vector3().crossVectors(LINEUP, f)
  if (NEWCHAR) return LIST.map((cfg, i) => { const row = Math.floor(i / 8), k = i % 8, nr = row < 2 ? 8 : LIST.length - 16; const n = LINEUP.clone().addScaledVector(side, (k - (nr - 1) / 2) * 0.24 / R + (row % 2) * 0.1 / R).addScaledVector(f, -row * 0.4 / R).normalize(); return <Basis key={i} n={n} fwd={f}><Character cfg={cfg} st={sts[i]} res={56} scale={0.8} /></Basis> })
  return PEOPLE.map((cfg, i) => { const n = LINEUP.clone().addScaledVector(side, (i - (PEOPLE.length - 1) / 2) * 0.17 / R).addScaledVector(f, (i % 2) * 0.12 / R).normalize(); return <Basis key={i} n={n} fwd={f}><Person cfg={cfg} st={sts[i]} seed={i} /></Basis> })
}
