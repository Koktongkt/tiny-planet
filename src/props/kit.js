// Chibi prop kit: a tiny framework for cozy furniture / items that can be reused anywhere (her house, the village,
// shops, decor). An item is a recipe of soft chunky parts (rounded boxes, pill cylinders, puffy cushions, blobs...)
// written against a builder `k`; bake() merges every part into ONE vertex-coloured toon mesh + ONE outline hull
// (+ one glow mesh for lamps/fire). So a prop costs 2-3 draw calls wherever it is placed, and recolouring is just
// a palette override.
//
// Units: "room units", y up, base on y = 0, front facing +z. She is ~0.41 tall in these units (her house group is
// scaled by 1.25 into planet units; see home/state.js ROOM.S).
//
//   defineProp('pouf', { size: [0.18, 0.09, 0.18], pal: { body: 'orange' } }, (k, o) => { k.pill([0.09, 0.08], [0, 0.04, 0], 'body') })
//   const group = makeProp('pouf', { pal: { body: '#8fc3e8' } })   // THREE.Group, cached per id + options
//   <Prop id="pouf" position={[x, 0, z]} />                          // React wrapper (props/Prop.jsx)
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

// ---------- palette: named swatches shared by every prop (items refer to these names, or to raw hex) ----------
export const PAL = {
  wood: '#d39a5e', woodLight: '#e8bc84', woodDark: '#9c6338', trim: '#7d4a2c',
  cream: '#fff4e2', linen: '#f6e6cc', white: '#fffaf2', paper: '#fbf1dc',
  quilt: '#f7c95a', quiltDark: '#eba63e', orange: '#f29a46', peach: '#f6c3a0', rose: '#f3a3a8', sky: '#9fd0ee',
  leaf: '#7fb84f', leafLight: '#a6d36a', leafDark: '#5d9a3e', pot: '#fbf6ee', potRim: '#eadfcc',
  iron: '#56505c', ironDark: '#3f3a45', brass: '#e2b65a', stone: '#efe2d0', stoneDark: '#d8c6ae',
  flame: '#ffc36a', glow: '#ffe2a0', ink: '#5a3626',
}
const col = (c) => new THREE.Color(PAL[c] || c)

// ---------- material: warm toon (shadows go peach-brown, never grey) with vertex colours ----------
// The toon gradient map is coloured: the shadow step is a warm tint, so shading reads like the painted concept.
const ramp = new Uint8Array([196, 150, 140, 255, 236, 212, 196, 255, 255, 255, 255, 255])
export const RAMP = new THREE.DataTexture(ramp, 3, 1, THREE.RGBAFormat); RAMP.minFilter = RAMP.magFilter = THREE.NearestFilter; RAMP.needsUpdate = true
export const MAT = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: RAMP, emissive: new THREE.Color('#3a2418'), emissiveIntensity: 0.18 })
export const GLOW = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false })
// view-space inverted-hull outline (same trick as the characters), chunky and soft brown
const OUT_VS = `uniform float uT; void main(){ vec4 mv = modelViewMatrix*vec4(position,1.); vec3 n = normalize(normalMatrix*normal);
  mv.xyz += n*uT*(0.65 + 0.35*clamp(-mv.z*.35,0.,2.)); gl_Position = projectionMatrix*mv; }`
export const mkOutline = (t = 0.0075, c = PAL.ink) => new THREE.ShaderMaterial({ side: THREE.BackSide, polygonOffset: true, polygonOffsetFactor: 2, polygonOffsetUnits: 4,
  uniforms: { uT: { value: t }, uCol: { value: new THREE.Color(c) } }, vertexShader: OUT_VS,
  fragmentShader: 'uniform vec3 uCol; void main(){ gl_FragColor = vec4(uCol,1.);\n#include <colorspace_fragment>\n}' })
export const OUTLINE = mkOutline()

// ---------- soft primitives (unit-ish, cached; parts scale/position them) ----------
const G = new Map()
const cache = (k, f) => { if (!G.has(k)) G.set(k, f()); return G.get(k) }
// a "pill can": cylinder whose top and bottom edges are rounded by bevel b (as a fraction of the height)
function pillGeo(b = 0.25, seg = 24) {
  return cache('pill' + b + seg, () => { const p = [], n = 6, r = 1, h = 1, bb = Math.min(b, 0.5) * h, br = Math.min(bb, r * 0.5)
    p.push(new THREE.Vector2(0, -h / 2))
    for (let i = 0; i <= n; i++) { const a = -Math.PI / 2 + i / n * Math.PI / 2; p.push(new THREE.Vector2(r - br + Math.cos(a) * br, -h / 2 + bb + Math.sin(a) * bb)) }
    for (let i = 0; i <= n; i++) { const a = i / n * Math.PI / 2; p.push(new THREE.Vector2(r - br + Math.cos(a) * br, h / 2 - bb + Math.sin(a) * bb)) }
    p.push(new THREE.Vector2(0, h / 2)); const g = new THREE.LatheGeometry(p, seg); g.computeVertexNormals(); return g })
}
// a rounded box of size s with edge radius r (true radius, not scaled): built per size so the corners stay round
function rbox(s, r) { const k = `rbx${s.map(x => x.toFixed(3))}|${r.toFixed(3)}`; return cache(k, () => { const rr = Math.min(r, ...s.map(x => x / 2 - 1e-3)); return new RoundedBoxGeometry(s[0], s[1], s[2], 3, rr) }) }
const sph = () => cache('sph', () => new THREE.SphereGeometry(1, 20, 14))
const half = () => cache('half', () => new THREE.SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2))
const tor = (t = 0.3) => cache('tor' + t, () => new THREE.TorusGeometry(1, t, 10, 28))
const cone = (n = 16) => cache('cone' + n, () => new THREE.ConeGeometry(1, 1, n))
const capGeo = (r, h) => cache(`cap${r.toFixed(4)},${h.toFixed(4)}`, () => new THREE.CapsuleGeometry(r, Math.max(1e-3, h - 2 * r), 5, 12))
// puffy cushion: a rounded box whose top and bottom bulge out
function puffGeo(s, bulge) { return cache(`puff${s.map(x => x.toFixed(3))}|${bulge}`, () => { const g = new RoundedBoxGeometry(s[0], s[1], s[2], 4, Math.min(s[1] * 0.48, s[0] / 2, s[2] / 2)), p = g.attributes.position, v = new THREE.Vector3()
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const u = 1 - Math.min(1, (v.x / (s[0] / 2)) ** 2), w = 1 - Math.min(1, (v.z / (s[2] / 2)) ** 2); p.setY(i, v.y * (1 + bulge * u * w)) }
  g.computeVertexNormals(); return g }) }
// a flat arch outline (rect + half circle), extruded with a soft bevel: doors, headboards, mirrors
function archGeo(w, hr, d, bevel) { return cache(`arch${w},${hr},${d},${bevel}`, () => { const s = new THREE.Shape(), r = w / 2; s.moveTo(-r, 0); s.lineTo(r, 0); s.lineTo(r, hr); s.absarc(0, hr, r, 0, Math.PI, false); s.lineTo(-r, 0)
  const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3, curveSegments: 20 }); g.translate(0, 0, -d / 2); g.computeVertexNormals(); return g }) }

// ---------- the builder ----------
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _s = new THREE.Vector3()
class Builder {
  constructor(pal) { this.pal = pal; this.parts = []; this.glow = []; this.base = [] }
  c(name) { return col(this.pal[name] ?? name) }
  // add geometry g with transform; o: { rot, scale, out (outline? default true), glow, shade (0..1 bottom darkening) }
  add(g, pos = [0, 0, 0], name = 'wood', o = {}) {
    const geo = g.index ? g.toNonIndexed() : g.clone(); for (const a of Object.keys(geo.attributes)) if (a !== 'position' && a !== 'normal') geo.deleteAttribute(a)
    if (!geo.attributes.normal) geo.computeVertexNormals()
    // soft painted gradient: each part a touch darker toward its own base (reads as ambient occlusion)
    geo.computeBoundingBox(); const bb = geo.boundingBox, c = this.c(name), sh = o.shade ?? 0.14, p = geo.attributes.position, cols = new Float32Array(p.count * 3)
    for (let i = 0; i < p.count; i++) { const t = (p.getY(i) - bb.min.y) / Math.max(1e-6, bb.max.y - bb.min.y), k = 1 - sh * (1 - t) ** 1.5; cols[i * 3] = c.r * k; cols[i * 3 + 1] = c.g * k; cols[i * 3 + 2] = c.b * k }
    geo.setAttribute('color', new THREE.BufferAttribute(cols, 3))
    _e.set(...(o.rot || [0, 0, 0]), o.order || 'XYZ'); _q.setFromEuler(_e); const s = o.scale ?? 1; _s.set(...(Array.isArray(s) ? s : [s, s, s]))
    geo.applyMatrix4(_m.compose(_v.set(...pos), _q, _s))
    ;(o.glow ? this.glow : this.parts).push({ geo, out: o.out !== false && !o.glow })
    return this
  }
  // ---- shorthands (sizes are full sizes unless noted) ----
  box(size, pos, name, o = {}) { return this.add(rbox(size, o.r ?? Math.min(...size) * 0.22), pos, name, o) } // rounded box, edge radius r
  puff(size, pos, name, o = {}) { return this.add(puffGeo(size, o.bulge ?? 0.35), pos, name, o) } // cushion / mattress / pouf top
  pill([r, h], pos, name, o = {}) { return this.add(pillGeo(o.bevel ?? 0.22, o.seg ?? 24), pos, name, { ...o, scale: [r, h, r] }) } // rounded cylinder (radius, height)
  ball(r, pos, name, o = {}) { return this.add(sph(), pos, name, { ...o, scale: Array.isArray(r) ? r : [r, r, r] }) }
  dome(r, pos, name, o = {}) { return this.add(half(), pos, name, { ...o, scale: Array.isArray(r) ? r : [r, r, r] }) }
  ring(r, t, pos, name, o = {}) { return this.add(tor(t / r), pos, name, { ...o, scale: [r, r, r] }) } // torus in the xy plane (rot it)
  cone([r, h], pos, name, o = {}) { return this.add(cone(o.n ?? 16), pos, name, { ...o, scale: [r, h, r] }) }
  stick([r, h], pos, name, o = {}) { return this.add(capGeo(r, h), pos, name, o) } // capsule: legs, rods, handles (h = full length, ends included)
  arch(w, hr, d, pos, name, o = {}) { return this.add(archGeo(w, hr, d, o.bevel ?? Math.min(0.012, d / 3)), pos, name, o) }
  knob(pos, name = 'brass', r = 0.012) { return this.ball(r, pos, name, { out: false }) }
  // a bunch of leaves around a stem tip: n leaves of length l, each a plump almond shape leaning outward
  leaves(pos, n, l, name = 'leaf', o = {}) { for (let i = 0; i < n; i++) { const a = i * 2.39996 + (o.phase || 0), tilt = (o.tilt ?? 0.9) + (i % 3) * 0.15, rr = l * 0.5 * Math.sin(tilt)
      this.ball([l * 0.26, l * 0.5, l * 0.11], [pos[0] + Math.sin(a) * rr, pos[1] + (o.up ?? 0) + Math.cos(tilt) * l * 0.5 + (i % 2) * l * 0.08, pos[2] + Math.cos(a) * rr], i % 3 === 0 ? (o.alt || 'leafLight') : name, { rot: [tilt, a, 0], order: 'YXZ', out: o.out ?? true }) } return this }
  // a daisy (white petals + yellow eye) facing up
  daisy(pos, r = 0.02, petal = 'white', eye = 'quilt') { for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; this.ball([r * 0.5, r * 0.2, r * 0.28], [pos[0] + Math.sin(a) * r * 0.55, pos[1], pos[2] + Math.cos(a) * r * 0.55], petal, { rot: [0, a, 0], out: false }) } return this.ball([r * 0.36, r * 0.22, r * 0.36], [pos[0], pos[1] + r * 0.08, pos[2]], eye, { out: false }) }
  bake() {
    const g = new THREE.Group()
    if (this.parts.length) { const all = mergeGeometries(this.parts.map(p => p.geo)), outl = this.parts.filter(p => p.out).map(p => p.geo)
      g.add(new THREE.Mesh(all, MAT)); if (outl.length) { const om = new THREE.Mesh(outl.length === this.parts.length ? all : mergeGeometries(outl), OUTLINE); om.userData.outline = true; g.add(om) } }
    if (this.glow.length) g.add(new THREE.Mesh(mergeGeometries(this.glow.map(p => p.geo)), GLOW))
    g.traverse(o => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false } })
    return g
  }
}

// ---------- registry ----------
export const CATALOG = {} // id -> { id, name, size: [w, h, d], footprint, pal, build, tags }
export function defineProp(id, meta, build) { CATALOG[id] = { id, name: meta.name || id, size: meta.size || [0.3, 0.3, 0.3], pal: meta.pal || {}, tags: meta.tags || [], opts: meta.opts || {}, build }; return CATALOG[id] }
const made = new Map()
// a baked THREE.Group for an item; geometry is shared between copies with the same id + options
export function makeProp(id, o = {}) {
  const def = CATALOG[id]; if (!def) throw new Error('unknown prop ' + id)
  const key = id + JSON.stringify(o)
  if (!made.has(key)) { const k = new Builder({ ...def.pal, ...(o.pal || {}) }); def.build(k, { ...def.opts, ...o }); made.set(key, k.bake()) }
  const src = made.get(key), g = new THREE.Group(); src.children.forEach(m => g.add(new THREE.Mesh(m.geometry, m.material))); g.userData.prop = id; return g
}
// floor footprint (x/z box around the origin, after a yaw of 0 / 90 / 180 / 270 deg) for collision lists like home BLOCKS
export function footprint(id, x, z, yaw = 0, pad = 0) { const [w, , d] = CATALOG[id].size, q = Math.round(yaw / (Math.PI / 2)) & 1, hw = (q ? d : w) / 2 + pad, hd = (q ? w : d) / 2 + pad; return { id, x0: x - hw, x1: x + hw, z0: z - hd, z1: z + hd } }
