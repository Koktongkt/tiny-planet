// Character Studio draft. Gonta uses the shared face, skeleton and cel/ink batching.
import React from 'react'
import * as THREE from 'three'
import { Character, M, Merge, cel } from '../../GhibliPerson.jsx'
import { CHEEK, MIDFACE, makeFace } from './castFace.jsx'

const skin = '#f3bf98', hair = '#503623', ochre = '#bd8b53', yellow = '#f4bc43'
const ball = new THREE.SphereGeometry(1, 20, 14)
const lathe = points => new THREE.LatheGeometry(points.map(([r, y]) => new THREE.Vector2(r, y)), 48)
const crown = lathe([[0, 0], [.065, 0], [.066, .012], [.063, .027], [.054, .042], [.040, .054], [.022, .061], [0, .064]])
const fold = lathe([[.063, -.001], [.068, 0], [.069, .003], [.068, .018], [.065, .021], [.062, .020]])
const coat = lathe([[0, -.086], [.082, -.086], [.086, -.082], [.084, -.052], [.081, -.018], [.077, .017], [.069, .043], [.044, .062], [.024, .068], [0, .068]])
const pocket = new THREE.BoxGeometry(.032, .031, .004)
function Oval({ color, ...props }) {
  return <M geo={ball} mat={cel(color)} {...props} />
}
function GontaHair({ set }) {
  return <group ref={set('hair')}><Merge>
    <Oval color={hair} position={[0, .002, -.021]} scale={[.060, .049, .045]} />
    {[-1, 1].map(d => <React.Fragment key={d}>
      <Oval color={hair} position={[d * .053, .002, .013]} scale={[.009, .025, .025]} />
      <Oval color={skin} position={[d * .059, -.018, .008]} scale={[.008, .013, .009]} />
    </React.Fragment>)}
    <Oval color={hair} position={[.010, .019, .047]} rotation={[0, 0, -.25]} scale={[.025, .009, .009]} />
    <group position={[0, .011, -.002]} rotation={[-.18, 0, 0]}>
      <M geo={crown} mat={cel(ochre)} />
      <M geo={fold} mat={cel('#ce995e')} />
      {Array.from({ length: 26 }, (_, i) => {
        const a = i * Math.PI / 13
        return <Oval key={i} color={ochre} outline={false} position={[.0683 * Math.sin(a), .010, .0683 * Math.cos(a)]} scale={[.0008, .0086, .0008]} />
      })}
      <Oval color="#865932" position={[0, .067, -.003]} scale={[.016, .013, .016]} />
    </group>
  </Merge></group>
}
// Each rib runs from the neck seam to the rolled lip and back into the lining.
function hoodShell() {
  const vertices = [], indices = []
  const rings = [[.034,.035,.062,0], [.063,.050,.063,.062], [.070,.058,.082,.066],
    [.069,.057,.086,.065], [.064,.052,.083,.064], [.042,.039,.064,.025], [.034,.035,.062,0]]
  for (const [rx, rz, height, drop] of rings) {
    for (let i = 0; i < 64; i++) {
      const a = i * Math.PI / 32, front = Math.cos(a), back = (1 - front) / 2
      vertices.push(rx * Math.sin(a), height - drop * back ** 1.8 - .028 * Math.max(0, front) ** 6, rz * front - .017 * back)
    }
  }
  for (let j = 0; j < rings.length - 1; j++) for (let i = 0; i < 64; i++) {
    const v = j * 64 + i, next = j * 64 + (i + 1) % 64
    indices.push(v, next, v + 64, next, next + 64, v + 64)
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
  geo.setIndex(indices)
  geo.computeVertexNormals()
  return geo
}
const hood = hoodShell()
// Follow the coat surface so the storm flap and snaps stay visible down the front.
const flapRows = [[-.082,.071],[-.052,.070],[-.018,.0675],[.017,.064],[.043,.058],[.055,.047]]
const flap = new THREE.BufferGeometry()
flap.setAttribute('position', new THREE.Float32BufferAttribute(
  flapRows.flatMap(([y,z]) => [-.005,y,z,.005,y,z]), 3))
flap.setIndex(flapRows.slice(1).flatMap((_, i) => {
  const n = 2*i
  return [n,n+1,n+2,n+1,n+3,n+2]
}))
flap.computeVertexNormals()
const hem = lathe([[.082,-.084],[.0865,-.081],[.086,-.078]])
const cuff = lathe([[.016,-.001],[.021,0],[.022,.009],[.020,.011]])
const shaft = lathe([[.022,-.025],[.026,-.019],[.025,-.005],[.029,.024],[.030,.034],[.026,.034]])
const bootRim = lathe([[.030,.027],[.031,.028],[.031,.034],[.029,.036],[.025,.035]])
const outsole = lathe([[0,-.043],[.033,-.043],[.035,-.040],[.035,-.035],[.033,-.033],[0,-.033]])
function Boot() {
  return <>
    <M geo={shaft} mat={cel('#57683e')} scale={[1,1,.97]} />
    <M geo={bootRim} mat={cel('#435332')} outline={false} />
    <Oval color="#586940" position={[0,-.026,.012]} scale={[.034,.018,.044]} />
    <M geo={outsole} mat={cel('#353f2d')} position={[0,0,.011]} scale={[1,1,1.32]} />
  </>
}
function Wrist() {
  return <M geo={cuff} mat={cel('#e6a934')} />
}
function Raincoat() {
  return <>
    <M geo={coat} mat={cel(yellow)} scale={[1, 1, .82]} />
    <M geo={hood} mat={cel('#ffca51')} />
    <M geo={hem} mat={cel('#dfa134')} scale={[1,1,.82]} outline={false} />
    {[-1, 1].map(d => <group key={d}>
      <Oval outline={false} color="#ffcb53" position={[d * .026, .056, .021]} rotation={[.16, 0, d * .47]} scale={[.041, .013, .023]} />
      <group position={[d * .042, -.055, .063]} rotation={[0, d * .45, 0]}>
        <M outline={false} geo={pocket} mat={cel('#edb43e')} />
        <Oval outline={false} color="#ffcb53" position={[0, .014, .002]} scale={[.019, .007, .004]} />
        <Oval color="#bc8934" position={[0, .013, .005]} scale={[.0024, .0024, .0012]} outline={false} />
      </group>
    </group>)}
    {[[.043,.058],[.017,.064],[-.018,.0675],[-.052,.070],[-.082,.071]].map(([y,z]) =>
      <Oval key={y} color="#b67f2d" position={[0,y,z+.003]} scale={[.0031,.0031,.0019]} outline={false} />)}
    <M geo={flap} mat={cel('#e7aa39')} outline={false} />
  </>
}
const cfg = {
  name: 'fisherman', age: 'adult',
  body: { H: .89, head: 1.45, torso: 1.13, leg: .96, girth: 1.25, chestW: 1.12, bellyZ: .86,
    arm: .96, armR: [1.12, 1.4, 1.5], armA: .42, shX: 1.26, hand: 1.2,
    legR: 1.28, legX: 1.06, foot: 1.26, bootW: 1.34, bootH: 1.45, bootL: 1.04,
    anY: .044, soleY: .0012, bootShaft: [.025, .032, .026, .012], cheek: CHEEK, midface: MIDFACE },
  outfit: { type: 'jacket', skin, top: yellow, acc: yellow, bottom: '#785435', shoe: '#52603a', shoeY: .074, long: true },
  hair: { style: 'chibi', c: hair }, face: {}, walk: { smooth: true },
  ext: { Face: makeFace({ kind: 'gonta', fy0: -.055 }), Hair: GontaHair, Coat: Raincoat, Boot, Wrist },
}
export function ChibiGonta({ st, scale = .8, res = 52 }) {
  return <Character cfg={cfg} st={st} scale={scale} res={res} />
}
