// Character studio (?view=charstudio): a turntable for the traveller / villager models, old vs new and sprite compare.
// Lazy chunk: none of this ships in the startup bundle. Boot (shader precompile + start the loop) is passed in by App
// and mounted together with the scene, so it still compiles what the studio shows.
import * as THREE from 'three'
import React, { useMemo, lazy, Suspense } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { wind } from '../world.js'
import { T, toon, q } from '../common.jsx'
import { PEOPLE } from '../peopleData.js'
import { GhibliPerson } from '../GhibliPerson.jsx'
const PersonLazy = lazy(() => import('../people.jsx').then(m => ({ default: m.Person })))
const Person = (p) => <Suspense fallback={null}><PersonLazy {...p} /></Suspense>
const GhibliPersonV1 = lazy(() => import('../GhibliPersonV1.jsx').then(m => ({ default: m.GhibliPersonV1 })))
const SpritePerson = lazy(() => import('../SpritePerson.jsx').then(m => ({ default: m.SpritePerson })))
const SPRITE = q.get('char') === 'sprite'
const NEWCHAR = !q.has('oldchar')
const ANGLES = { front: 0, three: 0.75, side: Math.PI / 2, back: Math.PI }
function Studio() {
  const camera = useThree(s => s.camera), scene = useThree(s => s.scene)
  const compare = q.has('compare'), walk = q.get('pose') === 'walk', ang = ANGLES[q.get('angle')] ?? 0.4
  const stOld = useMemo(() => ({ phase: 0, move: walk ? 1 : 0, t: 0 }), []), stNew = useMemo(() => ({ phase: 0, move: walk ? 1 : 0, t: 0, turn: 0, dist: 0 }), [])
  const bg = useMemo(() => new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, vertexShader: `varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`, fragmentShader: `varying vec3 vP; void main(){ float y = vP.y*.5+.5; vec3 c = mix(vec3(.98,.93,.86), vec3(.78,.88,.95), smoothstep(.45,.85,y)); gl_FragColor = vec4(c,1.);
    #include <colorspace_fragment>
  }` }), [])
  useFrame((_, dt) => {
    dt = Math.min(dt, 0.05); wind.time.value += dt
    T.sun.set(0.55, 0.75, 0.6).normalize(); T.day = 1; T.dusk = 0; T.night = 0
    for (const st of [stOld, stNew]) { st.t = wind.time.value; st.phase += dt * 9 * st.move; st.dist += dt * 0.27 * st.move }
    if (q.has('freeze')) { stOld.phase = stNew.phase = +q.get('freeze') }
    if (q.has('act')) { stNew.act = q.get('act'); stNew.actW = 1; stNew.move = 0 }
    const d = compare ? 1.35 : 0.95, cx = 0
    camera.position.set(cx + Math.sin(ang) * d, 0.3, Math.cos(ang) * d); camera.up.set(0, 1, 0); camera.lookAt(cx, 0.2, 0)
  })
  return <>
    <mesh material={bg}><sphereGeometry args={[30, 32, 16]} /></mesh>
    <directionalLight position={[3, 4, 3.5]} intensity={2.4} color="#fff3dc" /><hemisphereLight args={['#cfe6ff', '#e8d8b8', 0.9]} />
    <mesh rotation={[-Math.PI / 2, 0, 0]} material={useMemo(() => toon('#efe6d2'), [])}><circleGeometry args={[1.6, 48]} /></mesh>
    {(compare ? (SPRITE ? [[-0.25, 'new'], [0.25, 'sprite']] : [[-0.25, 'old'], [0.25, 'new']]) : [[0, q.has('old') ? 'old' : SPRITE ? 'sprite' : 'new']]).map(([x, k]) => <group key={k} position={[x, 0.001, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]}><circleGeometry args={[0.09, 32]} /><meshBasicMaterial color="#000" transparent opacity={0.12} depthWrite={false} /></mesh>
      {k === 'old' ? (NEWCHAR ? <Suspense fallback={null}><GhibliPersonV1 st={stOld} /></Suspense> : <Person cfg={PEOPLE[0]} st={stOld} />) : k === 'sprite' ? <Suspense fallback={null}><SpritePerson st={stNew} /></Suspense> : <GhibliPerson st={stNew} />}
    </group>)}
  </>
}

export default function StudioScene({ Boot, onLive }) { return <><Boot player={false} onLive={onLive} /><Studio /></> }
