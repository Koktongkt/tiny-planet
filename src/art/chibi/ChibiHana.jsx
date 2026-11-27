// DRAFT Hana — flower picker. Opt-in character studio only; no playable model change.
import * as THREE from 'three'
import React, { useLayoutEffect, useRef } from 'react'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { Character, cel, M, Merge, mkOutline, spec } from '../../GhibliPerson.jsx'
import { CHEEK, MIDFACE, MID_FADE, makeFace } from './castFace.jsx'
import { part, tagAW, mergeHair, makeHairMat, makeHairInk, sm } from './castHair.js'
import { HER_MOTION, motionProfile } from './motion.js'
import { makeLife, lifeStep, lifePost } from './life.js'
import { q } from '../../common.jsx'

const SKIN = '#f3bf98', PINK = '#e77984', CREAM = '#fff0d9', CORAL = '#df6667', STRAW = '#efc477', RIBBON = '#c75355'
const BALL = new THREE.SphereGeometry(1, 20, 14)
const OFF = new Float32Array(12)
const Face = makeFace({ kind: 'hana', eyeS: 1.07, blush: 0.93 })
const hairMat = makeHairMat(SKIN, PINK, '#f9a1a0', OFF, [.75, .49, .47])
const hairInk = makeHairInk(OFF)
const lathe = (rows, n = 48) => new THREE.LatheGeometry(rows.map(([r, y]) => new THREE.Vector2(r, y)), n)

// Rounded continuous cap with a scalloped fringe; separate low tied ponytails, no top bun.
function hairGeo() {
  const pos = [], idx = [], aSkin = [], segments = 100, rows = 18
  const edge = a => {
    const t = Math.abs(a)
    const y = .014 + .008 * Math.abs(Math.sin((a + .12) * 6.3)) ** 4 - .008 * sm(.60, 1.0, t)
    const lock = -.041 + .009 * ((t - 1.24) / .25) ** 2
    const framed = THREE.MathUtils.lerp(y, lock, sm(.91, 1.10, t))
    return THREE.MathUtils.lerp(framed, -.051, sm(1.45, 1.9, t))
  }
  for (let i = 0; i <= segments; i++) {
    const a = -Math.PI + i * 2 * Math.PI / segments, e = edge(a)
    const nc = Math.acos(THREE.MathUtils.clamp((e - .004) / .065, -.98, .98))
    for (let j = 0; j <= rows; j++) {
      const th = Math.max(.001, nc * j / rows)
      const r = th > Math.PI/2 ? 1-(.30+.48*sm(1.35,2.3,Math.abs(a)))*(1-Math.sin(th)) : Math.sin(th), groove = sm(.55, 1, j / rows) * .10 * Math.abs(Math.sin((a + .10) * 11)) ** 8
      pos.push(.064 * r * Math.sin(a), .004 + .065 * Math.cos(th), -.005 + .062 * r * Math.cos(a))
      aSkin.push(groove)
      if (i < segments && j < rows) {
        const v = i * (rows + 1) + j
        idx.push(v, v + 1, v + rows + 2, v, v + rows + 2, v + rows + 1)
      }
    }
  }
  const cap = new THREE.BufferGeometry()
  cap.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  cap.setAttribute('aSkin', new THREE.Float32BufferAttribute(aSkin, 1))
  cap.setIndex(idx); cap.computeVertexNormals()
  const bits = [tagAW(cap, (x, y, z) => [3, sm(.025, -.03, y) * sm(0, .045, z) * .45])]
  for (const d of [-1, 1]) {
    // little ears between the cheek frame and the tied ponytail.
    bits.push(tagAW(part(BALL, [d * .063, -.016, .003], [.005, .011, .0078], [0, d * .65, 0], 1), () => [3, 0]))
    bits.push(tagAW(part(BALL, [d * .061, -.022, -.021], [.012, .011, .012], [0, 0, d * .45]), () => [3, 0]))
    const tail = part(BALL, [d * .073, -.038, -.021], [.020, .024, .021], [.17, 0, d * .40])
    // Sweep the tip inwards while narrowing it, for a soft curled ponytail rather than a ball.
    const p = tail.attributes.position
    for (let i=0;i<p.count;i++) { const w=sm(-.040,-.062,p.getY(i)); p.setX(i, d*.073+(p.getX(i)-d*.073)*(1-.30*w)-d*.006*w); p.setZ(i,p.getZ(i)+.003*w) }
    tail.computeVertexNormals()
    bits.push(tagAW(tail, (x, y) => [d < 0 ? 0 : 1, sm(-.022, -.059, y)]))
  }
  return mergeHair(bits)
}
const HAIR = hairGeo()
const brim = lathe([[.058,.035],[.066,.028],[.078,.023],[.090,.020],[.094,.023],[.094,.026],[.089,.030],[.079,.034],[.061,.043],[.058,.040]])
const crown = lathe([[.061,.034],[.064,.041],[.063,.051],[.060,.063],[.054,.073],[.044,.080],[.030,.084],[.015,.086],[0,.087]],64)
const band = lathe([[.0645,.038],[.0655,.041],[.0645,.051],[.0638,.054]],64)
const hatStitch = lathe([[.086,.031],[.087,.0318],[.088,.0315]], 48)
const tie = lathe([[.009,-.004],[.011,-.003],[.011,.003],[.009,.004]], 24)
function HanaHair({ set }) {
  return <group ref={set('hair')}>
    <mesh geometry={HAIR} material={hairMat}/><mesh geometry={HAIR} material={hairInk}/>
    <Merge>
      <group rotation={[-.10, 0, -.025]}>
        <M geo={brim} mat={cel(STRAW)}/>
        <M geo={crown} mat={cel(STRAW)}/>
        <M geo={band} mat={cel(RIBBON)} outline={false}/>
        <M geo={hatStitch} mat={cel('#e0ad60')} outline={false}/>
      </group>
      {[-1,1].map(d => <M key={d} geo={tie} mat={cel(RIBBON)} outline={false} position={[d*.063,-.025,-.021]} rotation={[0,0,d*.65]}/>)}
    </Merge>
  </group>
}

const HANA_MOTION = motionProfile(HER_MOTION, {
  name: 'hana', lively: 1.12, fidgetAfter: 2.8, fidgetEvery: [5, 10],
  sets: { day: ['look','rock','hum','tiptoe','hands'], indoor: ['hum','look','hands','rock'], rain: ['look','catch','shiver'], night: ['look','yawn','hum'], hungry: ['tummy','look'], stove: ['hum','hands','look'] },
  can: { skid: false, lie: false }, skipEvery: [10, 22], yawnUp: 1.35,
})
const LIFE_OFF = q.has('still') && !q.has('life')
export const HANA = {
  name: 'basket girl', age: 'kid', motion: HANA_MOTION,
  body: { H: .79, head: 1.45, torso: 1.04, leg: .91, arm: .86, girth: 1.08, chestW: 1.06, bellyZ: .84, shX: 1.19, armA: .42,
    armR: [1.08,1.23,1.32], legR: 1.12, legX: 1.01, foot: 1.15, hand: 1.15, bootW: 1.28, bootH: 1.04, bootL: 1.01,
    anY: .036, footY: .015, soleY: .0012, cheek: CHEEK, midface: MIDFACE, midfaceFade: MID_FADE },
  hair: { style: 'chibi', c: PINK },
  outfit: { type: 'pinafore', skin: SKIN, top: CREAM, bottom: CORAL, shoe: '#67452f', shoeY: .028, bare: true, legHem: .18, bibW: .038, hemY: .195, sleeve: 'short' },
  walk: { rate: 11, stride: .51, knee: .75, bounce: .010, smooth: true, land: .30, arm: .65, sway: .075, twist: .11, idle: 'contra' },
  ext: { Face, Hair: HanaHair,
    life: (B, st, dt, t, R, mem, state) => { const L = mem.life || (mem.life = makeLife(Math.random,HANA_MOTION)); st.life = L; L.B = B; L.R = R; L.hairOff = OFF
      if (!LIFE_OFF) lifeStep(L,B,st,dt,t,R,state.camera) },
    post: (R,st,dt,t) => { if (!LIFE_OFF) lifePost(st.life,R,st,dt,t) }
  }
}

const S = spec(HANA.body)
const ink = mkOutline(false)
const mat = cel('#ffffff').clone()
mat.vertexColors = true; mat.defines = { KIND: 1 }
function colored(g, c) {
  const geo = g.index ? g.toNonIndexed() : g.clone(), col = new THREE.Color(c)
  geo.deleteAttribute('uv')
  const a = new Float32Array(geo.attributes.position.count * 3)
  for (let i = 0; i < a.length; i += 3) a.set([col.r,col.g,col.b],i)
  geo.setAttribute('color',new THREE.BufferAttribute(a,3)); return geo
}
function batch(entries) {
  const group = new THREE.Group(), colors = [], lines = []
  for (const [g,c,outlined = true] of entries) {
    const p = colored(g,c); colors.push(p)
    if (outlined) lines.push(p.clone().deleteAttribute('color'))
  }
  group.add(new THREE.Mesh(mergeGeometries(colors),mat))
  if (lines.length) group.add(new THREE.Mesh(mergeGeometries(lines),ink))
  colors.forEach(g=>g.dispose()); lines.forEach(g=>g.dispose()); return group
}
const oval = (x,y,z,rx,ry,rz,rot=0) => BALL.clone().scale(rx,ry,rz).rotateZ(rot).translate(x,y,z)
const skirtTop = S.bellyY + .005, skirtBottom = S.knY - .012
function skirtPoint(a,t,offset=0) {
  const r = .069 + .024*t + .003 * Math.cos(a*8)*t
  const y = THREE.MathUtils.lerp(skirtTop,skirtBottom,t) + .0025 * Math.cos(a*12) * t**5
  return new THREE.Vector3((r+offset)*Math.sin(a),y,(r*.82+offset)*Math.cos(a)+.004)
}
function skirtSurface(lo,hi) {
  const p=[], ind=[], n=96, m=14
  for(let j=0;j<=m;j++) for(let i=0;i<=n;i++) {
    p.push(...skirtPoint(i*2*Math.PI/n,THREE.MathUtils.lerp(lo,hi,j/m)).toArray())
    if(j<m&&i<n){const k=j*(n+1)+i;ind.push(k,k+n+1,k+1,k+1,k+n+1,k+n+2)}
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setIndex(ind);g.computeVertexNormals();return g
}
// Printed petals follow the cloth instead of floating as raised flower props.
function flower(a,t,size) {
  const geos=[]
  for(let j=0;j<6;j++){
    const theta=j*Math.PI*2/5, x=j===5?0:Math.cos(theta)*size*.58, y=j===5?0:Math.sin(theta)*size*.58
    const r=j===5?size*.27:size*.43, pos=[], ind=[]
    const put=(u,v)=>pos.push(...skirtPoint(a+(x+u)/.085,t-(y+v)/(skirtTop-skirtBottom),j===5?.0018:.0012).toArray())
    put(0,0); for(let i=0;i<12;i++)put(r*Math.cos(i*Math.PI/6),r*Math.sin(i*Math.PI/6))
    for(let i=0;i<12;i++)ind.push(0,i+1,(i+1)%12+1)
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setIndex(ind);g.computeVertexNormals()
    geos.push([g,j===5?'#f1bd72':CREAM,false])
  }
  return geos
}
function dress() {
  const entries=[[skirtSurface(0,.88),CORAL],[skirtSurface(.88,1),CREAM]]
  // Deterministic staggered print on all sides. Keep a little negative space at the waist.
  for(let row=0;row<3;row++)for(let i=0;i<8;i++){
    const a=(i+row*.43)*Math.PI*2/8, t=.24+row*.23
    entries.push(...flower(a,t,.008+((i+row)%3)*.0018))
  }
  // waist band and back bow, softly rounded lobes, separate short ribbon tails
  const band=lathe([[.068,skirtTop-.009],[.071,skirtTop-.008],[.071,skirtTop+.003],[.068,skirtTop+.005]]).scale(1,1,.84).translate(0,0,.004)
  entries.push([band,'#ce5859'])
  const z=-.068, y=skirtTop-.006
  entries.push([oval(0,y,z,.012,.012,.014),RIBBON],
    [oval(-.022,y,z,.023,.015,.013,.18),RIBBON],[oval(.022,y,z,.023,.015,.013,-.18),RIBBON],
    [oval(-.012,y-.023,z-.003,.011,.025,.008,-.32),CORAL],[oval(.012,y-.023,z-.003,.011,.025,.008,.32),CORAL])
  const g=batch(entries);g.position.y=-S.hipY;return g
}
function collar() {
  const y=S.neckY-.015, z=.041
  const g=batch([-1,1].map(d=>[oval(d*.013,y,z,.017,.010,.008,d*.22),CREAM]))
  return g
}
function sock(d) {
  const k=d<0?'L':'R', ankle=S['an'+k], knee=S['kn'+k], rr=S.lr[1]*.96
  const g=lathe([[rr*.83,-.008],[rr*.99,-.005],[rr,.006],[rr*1.03,.018],[rr*1.04,.023],[rr*.99,.024]],28).translate(ankle.x-knee.x,ankle.y-knee.y,ankle.z-knee.z)
  return batch([[g,CREAM,false]])
}
function maryJane() {
  const entries=[[oval(0,-.010,.014,.021,.005,.022),'#fff0d9',false],
    [oval(0,-.006,.013,.023,.004,.007),'#67452f',false]]
  return batch(entries)
}
function attachLook(root) {
  const made=[]
  const add=(bone,group,shift=0)=>{if(!bone){group.traverse(o=>{if(o.isMesh)o.geometry.dispose()});return} group.position.y+=shift;bone.add(group);made.push(group)}
  const hips=root.getObjectByName('hips'),chest=root.getObjectByName('chest')
  add(hips,dress(), S.hipY-(hips?.userData.rest.y??S.hipY))
  add(chest,collar(), -(chest?.userData.rest.y??0))
  for(const d of [-1,1]){
    const k=d<0?'L':'R'
    add(root.getObjectByName('sh'+k+'n'),sock(d))
    add(root.getObjectByName('ft'+k),maryJane())
  }
  return ()=>made.forEach(g=>{g.removeFromParent();g.traverse(o=>{if(o.isMesh)o.geometry.dispose()})})
}
export function ChibiHana({st,scale=.8,res=52}) {
  const ref=useRef()
  useLayoutEffect(()=>attachLook(ref.current),[])
  return <group ref={ref}><Character cfg={HANA} st={st} scale={scale} res={res}/></group>
}
export default ChibiHana
