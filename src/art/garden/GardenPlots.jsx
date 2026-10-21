// <GardenPlots plots={Plot[]} onInteract={(plotId)=>void} quality={'hi'|'lo'} /> (Stage B contract, art-b)
// Draw calls: beds (1 InstancedMesh) + every plant of every plot merged into 1 mesh + 1 Points (ripe sparkles),
// plus 2 ink hulls (beds, plants) only when the camera is near and quality is 'hi'. 5 calls max for any garden.
// Plants are rebuilt only when a plot's crop/stage/position changes (not per frame); watering only updates a per-bed
// attribute. Wind sway is in the vertex shader (shared wind clock). Mount inside the planet group: Plot.pos is
// planet-local (surface point; "up" = normalize(pos)).
import * as THREE from 'three'
import React, { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { toon, paint } from '../../common.jsx'
import { wind } from '../../world.js'
import { inkMaterial, hullGeometry, SWAY_GLSL } from '../ink.js'
import { plantParts, stakeParts, sparkleSpots, emitParts, buildGeometry, bedGeometry, SLOTS, PLOT_SIZE, rnd } from './parts.js'
export { PLOT_SIZE, STAGES, CROPS } from './parts.js'
const SWAY = 0.012 // tip displacement (world units) at full weight
const NEAR = 5.5
const PLANT_S = 1.5 // plant scale inside a bed // ink hulls on within this camera distance (world units)
const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return (h >>> 0) % 2147483646 + 1 }
// plot frame: up = normalize(pos), forward = world +Z projected on the tangent plane (X near the poles), turned by plot.yaw
const _u = new THREE.Vector3(), _f = new THREE.Vector3(), _s = new THREE.Vector3(), _mb = new THREE.Matrix4(), _qy = new THREE.Quaternion()
export function plotMatrix(plot, out = new THREE.Matrix4(), sink = 0.006) {
  _u.fromArray(plot.pos).normalize(); _f.set(0, 0, 1); if (Math.abs(_u.z) > 0.95) _f.set(1, 0, 0); _f.addScaledVector(_u, -_f.dot(_u)).normalize()
  _s.crossVectors(_u, _f); _mb.makeBasis(_s, _u, _f)
  if (plot.yaw) _mb.multiply(new THREE.Matrix4().makeRotationY(plot.yaw))
  return out.copy(_mb).setPosition(_s.fromArray(plot.pos).addScaledVector(_u, -sink))
}
let MATS = null
function mats() {
  if (MATS) return MATS
  const crop = paint(toon('#ffffff', { vertexColors: true }), 0.1, true, 60)
  const pc = crop.onBeforeCompile
  crop.onBeforeCompile = (sh, r) => { pc(sh, r)
    sh.vertexShader = 'uniform float uTime;\n' + SWAY_GLSL + '\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>\n transformed = swayOf(transformed, ${SWAY.toFixed(4)});`) }
  crop.customProgramCacheKey = () => 'tp-garden-crop'
  const bed = paint(toon('#ffffff', { vertexColors: true }), 0.18, true, 34)
  const pb = bed.onBeforeCompile
  bed.onBeforeCompile = (sh, r) => { pb(sh, r)
    sh.vertexShader = 'attribute float aSoil; attribute float aWet;\n' + sh.vertexShader.replace('#include <color_vertex>', `#include <color_vertex>
      vColor.rgb *= mix(vec3(1.), vec3(.6, .55, .6), aWet * aSoil);`) }
  bed.customProgramCacheKey = () => 'tp-garden-bed'
  const spark = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
    uniforms: { uTime: wind.time, uSize: { value: 70 } },
    vertexShader: `uniform float uTime, uSize; attribute float aPh; attribute vec3 color; varying vec3 vC; varying float vA;
      void main() { vec3 p = position; float t = uTime * .9 + aPh * 6.283; p += normalize(position) * (.012 * sin(t * .7));
        vec4 mv = modelViewMatrix * vec4(p, 1.); gl_Position = projectionMatrix * mv;
        vA = pow(max(0., sin(t)), 3.); vC = color; gl_PointSize = uSize * (0.35 + .65 * vA) / max(.2, -mv.z); }`,
    fragmentShader: `varying vec3 vC; varying float vA; void main() { vec2 d = gl_PointCoord - .5; float r = length(d);
        float star = max(0., 1. - abs(d.x) * 9.) * max(0., 1. - abs(d.y) * 2.2) + max(0., 1. - abs(d.y) * 9.) * max(0., 1. - abs(d.x) * 2.2);
        float a = (smoothstep(.5, .0, r) * .5 + star) * vA; if (a < .01) discard; gl_FragColor = vec4(vC * a * 1.6, a); }` })
  MATS = { crop, bed, spark, inkPlant: inkMaterial(0.0016, SWAY), inkBed: inkMaterial(0.0022, 0) }
  return MATS
}
let BED = null
const bedGeo = () => BED || (BED = (() => { const g = bedGeometry(); return { g, hull: hullGeometry(g) } })())
function buildPlants(plots, lo) {
  const out = { pos: [], nor: [], col: [], base: [], w: [], ink: [] }, sp = [], spc = [], ph = []
  const M = new THREE.Matrix4(), pm = new THREE.Matrix4(), base = new THREE.Vector3(), tmp = new THREE.Vector3()
  for (const pl of plots) {
    if (!pl.cropId) continue
    plotMatrix(pl, M); const r = rnd(hash(pl.id + pl.cropId))
    if (pl.stage !== 'withered') emitParts(stakeParts(pl.cropId), M, base.setFromMatrixPosition(M), out)
    SLOTS.forEach(([x, z], k) => {
      const yaw = r() * 6.283, s = (0.88 + r() * 0.24) * PLANT_S, jx = (r() - 0.5) * 0.02, jz = (r() - 0.5) * 0.02
      pm.makeRotationY(yaw).scale(tmp.setScalar(s)).setPosition(x + jx, 0.026, z + jz).premultiply(M)
      base.setFromMatrixPosition(pm)
      emitParts(plantParts(pl.cropId, pl.stage, r, lo), pm, base, out, pl.stage === 'ripe' ? 0.075 : 0.1)
      if (pl.stage === 'ripe' && (k === 0 || k === 3 || !lo)) for (const s0 of sparkleSpots(pl.cropId)) { tmp.fromArray(s0).applyMatrix4(pm); sp.push(tmp.x, tmp.y, tmp.z); const c = pl.cropId === 'skyseed' ? [0.75, 0.82, 1] : [1, 0.93, 0.65]; spc.push(...c); ph.push(r()) }
    })
  }
  if (!out.pos.length) return null
  const g = buildGeometry(out)
  let s = null; if (sp.length) { s = new THREE.BufferGeometry(); s.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3)); s.setAttribute('color', new THREE.Float32BufferAttribute(spc, 3)); s.setAttribute('aPh', new THREE.Float32BufferAttribute(ph, 1)); s.computeBoundingSphere() }
  return { g, hull: lo ? null : hullGeometry(g), s }
}
export function GardenPlots({ plots = [], onInteract, quality = 'hi' }) {
  const m = mats(), bg = bedGeo(), lo = quality === 'lo'
  const shapeKey = plots.map(p => `${p.id}|${p.cropId}|${p.stage}|${p.pos.map(v => v.toFixed(3))}|${p.yaw || 0}`).join(';')
  const plants = useMemo(() => buildPlants(plots, lo), [shapeKey, lo])
  useEffect(() => () => { if (plants) { plants.g.dispose(); plants.hull && plants.hull.dispose(); plants.s && plants.s.dispose() } }, [plants])
  const beds = useRef(), bedInk = useRef(), plantInk = useRef(), grp = useRef(), n = useRef(0)
  const wet = useMemo(() => new THREE.InstancedBufferAttribute(new Float32Array(Math.max(1, plots.length)), 1), [plots.length])
  const bedG = useMemo(() => { const g = new THREE.BufferGeometry(); for (const k in bg.g.attributes) g.setAttribute(k, bg.g.attributes[k]); g.setAttribute('aWet', wet); return g }, [wet]) // shares the base buffers, own wet attribute
  const centre = useMemo(() => { const c = new THREE.Vector3(); plots.forEach(p => c.add(_f.fromArray(p.pos))); return plots.length ? c.divideScalar(plots.length) : c }, [shapeKey])
  // bed transforms (on shape change) + wet tint (every render; cheap)
  useEffect(() => { const b = beds.current; if (!b) return; const M = new THREE.Matrix4(); plots.forEach((p, i) => b.setMatrixAt(i, plotMatrix(p, M))); b.instanceMatrix.needsUpdate = true; b.computeBoundingSphere(); b.boundingSphere.radius += 0.05
    const l = bedInk.current; if (l) { l.instanceMatrix = b.instanceMatrix; l.boundingSphere = b.boundingSphere.clone() } }, [shapeKey, plots.length])
  useEffect(() => { plots.forEach((p, i) => { wet.array[i] = p.watered ? 1 : 0 }); wet.needsUpdate = true })
  // near-camera ink: hulls only when close (and 'hi'); checked every 8 frames
  const _w = useMemo(() => new THREE.Vector3(), [])
  useFrame(({ camera }) => { if (n.current++ % 8) return; const near = !lo && grp.current && _w.copy(centre).applyMatrix4(grp.current.matrixWorld).distanceTo(camera.position) < NEAR
    if (bedInk.current) bedInk.current.visible = near; if (plantInk.current) plantInk.current.visible = near })
  const tap = onInteract ? (e) => { if (e.instanceId == null || !plots[e.instanceId]) return; e.stopPropagation(); onInteract(plots[e.instanceId].id) } : undefined
  const hover = onInteract ? (on) => () => { document.body.style.cursor = on ? 'pointer' : '' } : undefined
  return <group ref={grp}>
    {plots.length > 0 && <instancedMesh key={'b' + plots.length} ref={beds} args={[bedG, m.bed, plots.length]} onClick={tap} onPointerOver={hover && hover(true)} onPointerOut={hover && hover(false)} />}
    {plots.length > 0 && !lo && <instancedMesh key={'bi' + plots.length} ref={bedInk} args={[bg.hull, m.inkBed, plots.length]} visible={false} raycast={() => null} />}
    {plants && <mesh geometry={plants.g} material={m.crop} raycast={() => null} />}
    {plants && plants.hull && <mesh ref={plantInk} geometry={plants.hull} material={m.inkPlant} visible={false} raycast={() => null} />}
    {plants && plants.s && <points geometry={plants.s} material={m.spark} raycast={() => null} />}
  </group>
}
export default GardenPlots
