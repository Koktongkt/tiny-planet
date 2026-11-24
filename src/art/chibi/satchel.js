// Her satchel, after the turnaround sheet (KT, golden reference): a chunky soft leather bag with a top handle, a
// stitched flap held by two straps with gold buckles, side pockets (a daisy on the inner one, a rolled scroll in the
// outer one), a green plaid blanket rolled under the bottom with two leather ties, and a gold compass charm.
// Built once as ONE vertex-coloured cel geometry + ONE ink-hull geometry (the bulky parts only), so the bag still
// costs 2 draws. Units: the bag body is 1 wide (x), front = +z, origin at the bag's centre; scaled by BAG_S at the end.
import * as THREE from 'three'
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

export const BAG_PAL = {
  leather: '#9a5530', flap: '#a65f36', dark: '#7a4224', pocket: '#8f4c2a', handle: '#84462a', stitch: '#eab46a',
  gold: '#f2b33d', goldDk: '#c98a22', plaidA: '#5f7d32', plaidB: '#b4bd5a', plaidY: '#dccb6e', plaidDk: '#3f5a24',
  scroll: '#ecd6a6', scrollDk: '#cfae76', petal: '#fbf4e2', leaf: '#7e9a3c', face: '#fff7e6', needle: '#d9453a', ink: '#3b2621' }

const _c = new THREE.Color()
// rounded box: every vertex pushed out to a radius r around the inner box (smooth, cel-friendly normals)
function softBox(w, h, d, r, seg = [4, 4, 3]) {
  const g = new THREE.BoxGeometry(w, h, d, ...seg), p = g.attributes.position, v = new THREE.Vector3(), c = new THREE.Vector3()
  const hx = w / 2 - r, hy = h / 2 - r, hz = d / 2 - r
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); c.set(Math.max(-hx, Math.min(hx, v.x)), Math.max(-hy, Math.min(hy, v.y)), Math.max(-hz, Math.min(hz, v.z)))
    const dd = v.clone().sub(c); if (dd.lengthSq() > 0) dd.setLength(r); p.setXYZ(i, c.x + dd.x, c.y + dd.y, c.z + dd.z) }
  return g
}
// place a geometry (indexed while transforming, so smooth normals survive), colour it, and file it
function make(parts, ink, geo, hex, { p = [0, 0, 0], r = [0, 0, 0], s = [1, 1, 1], outline = false, taper = 0, bulge = 0 } = {}) {
  let g = geo.clone(); g.deleteAttribute('uv'); g.deleteAttribute('normal'); g = mergeVertices(g)
  if (taper) { const a = g.attributes.position; g.computeBoundingBox(); const bb = g.boundingBox
    for (let i = 0; i < a.count; i++) { const t = (a.getY(i) - bb.min.y) / (bb.max.y - bb.min.y); a.setX(i, a.getX(i) * (1 - taper * t)) } }
  if (bulge) { const a = g.attributes.position; g.computeBoundingBox(); const bb = g.boundingBox // soft pillowy faces (front and back)
    for (let i = 0; i < a.count; i++) { const u = a.getX(i) / bb.max.x, v = a.getY(i) / bb.max.y, f = Math.max(0, 1 - u * u) * Math.max(0, 1 - v * v); a.setZ(i, a.getZ(i) + Math.sign(a.getZ(i)) * bulge * f) } }
  g.scale(...s); g.rotateX(r[0]); g.rotateY(r[1]); g.rotateZ(r[2]); g.translate(...p); g.computeVertexNormals()
  const n = g.toNonIndexed(), cnt = n.attributes.position.count, col = new Float32Array(cnt * 3); _c.set(hex)
  for (let i = 0; i < cnt; i++) col.set([_c.r, _c.g, _c.b], i * 3)
  n.setAttribute('color', new THREE.BufferAttribute(col, 3)); n.setAttribute('aKind', new THREE.BufferAttribute(new Float32Array(cnt), 1))
  parts.push(n)
  if (outline) { const o = new THREE.BufferGeometry(); o.setAttribute('position', n.attributes.position); o.setAttribute('normal', n.attributes.normal); ink.push(o) }
}
// dashed stitch along a polyline (points on a surface facing +z unless rot given)
function dashes(parts, ink, pts, { z = 0, len = 0.045, gap = 0.032, w = 0.013, hex = BAG_PAL.stitch, rotY = 0 } = {}) {
  const box = new THREE.BoxGeometry(1, 1, 1)
  for (let k = 0; k < pts.length - 1; k++) { const [x0, y0] = pts[k], [x1, y1] = pts[k + 1], L = Math.hypot(x1 - x0, y1 - y0), a = Math.atan2(y1 - y0, x1 - x0)
    for (let t = gap / 2; t + len <= L; t += len + gap) { const m = (t + len / 2) / L, x = x0 + (x1 - x0) * m, y = y0 + (y1 - y0) * m
      const g = box.clone(); g.scale(len, w, 0.012); g.rotateZ(a); g.translate(x, y, z); if (rotY) g.rotateY(rotY)
      make(parts, ink, g, hex) } }
}

export const BAG_S = 0.079 // pass 11 / 12 (KT): a little smaller each time
export function buildSatchel(P = BAG_PAL) {
  const parts = [], ink = []
  const sph = new THREE.SphereGeometry(1, 12, 9), cyl = new THREE.CylinderGeometry(1, 1, 1, 18, 1), box = new THREE.BoxGeometry(1, 1, 1)
  const BW = 1, BH = 0.86, BD = 0.44, top = BH / 2, front = BD / 2
  // body: a soft leather block, a touch narrower at the top
  make(parts, ink, softBox(BW, BH, BD, 0.17, [8, 8, 5]), P.leather, { taper: 0.06, bulge: 0.05, outline: true })
  // flap: over the top and down the front, rounded lower corners
  const FH = 0.56, fy = top - FH / 2 + 0.03
  make(parts, ink, softBox(BW * 1.02, FH, 0.07, 0.034, [8, 3, 1]), P.flap, { p: [0, fy, front + 0.04], bulge: 0.02, outline: true })
  make(parts, ink, softBox(BW * 0.99, 0.05, 0.05, 0.024, [6, 1, 1]), P.ink, { p: [0, fy - FH / 2 + 0.012, front + 0.036], bulge: 0.01 }) // the flap's edge line
  make(parts, ink, softBox(BW * 0.97, 0.07, BD * 0.92, 0.034, [5, 1, 3]), P.flap, { p: [0, top + 0.005, 0.0], outline: true })
  // stitching: a U inside the flap edge, a stitched pocket panel below it, a band across the back
  const fz = front + 0.093, fb = fy - FH / 2 + 0.075, fx = BW * 0.51 - 0.07
  dashes(parts, ink, [[-fx, top - 0.02], [-fx, fb + 0.03], [-fx + 0.04, fb], [fx - 0.04, fb], [fx, fb + 0.03], [fx, top - 0.02]], { z: fz })
  const py = -top + 0.1, px = 0.38
  dashes(parts, ink, [[-px, fb - 0.1], [-px, py + 0.03], [-px + 0.04, py], [px - 0.04, py], [px, py + 0.03], [px, fb - 0.1]], { z: front + 0.045 })
  dashes(parts, ink, [[-0.42, top - 0.12], [0.42, top - 0.12]], { z: -front - 0.003 })
  // two straps down the flap onto the body, each with a gold buckle (square ring + tongue)
  for (const sx of [-0.27, 0.27]) {
    make(parts, ink, softBox(0.13, 0.62, 0.025, 0.012, [2, 4, 1]), P.dark, { p: [sx, top - 0.29, front + 0.095] })
    dashes(parts, ink, [[sx, top - 0.05], [sx, top - 0.56]], { z: front + 0.11, len: 0.03, gap: 0.03, w: 0.01 })
    const ring = new THREE.TorusGeometry(0.08, 0.019, 4, 4); ring.rotateZ(Math.PI / 4)
    make(parts, ink, ring, P.gold, { p: [sx, fb + 0.06, front + 0.115], s: [1, 0.95, 1.4] })
    make(parts, ink, box, P.goldDk, { p: [sx, fb + 0.06, front + 0.118], s: [0.018, 0.1, 0.02] })
  }
  // top handle with its tabs
  const arch = new THREE.TorusGeometry(0.2, 0.045, 8, 18, Math.PI)
  make(parts, ink, arch, P.handle, { p: [0, top + 0.03, 0], s: [1, 1.05, 1] })
  for (const sx of [-0.2, 0.2]) make(parts, ink, softBox(0.1, 0.07, 0.11, 0.025, [2, 1, 2]), P.dark, { p: [sx, top + 0.045, 0] })
  // gold studs where the cross-body strap meets the bag
  for (const sx of [-0.5, 0.5]) make(parts, ink, sph, P.gold, { p: [sx, top - 0.06, 0.02], s: [0.045, 0.045, 0.045] })
  // side pockets
  for (const sd of [-1, 1]) {
    make(parts, ink, softBox(0.16, 0.44, 0.32, 0.06, [2, 3, 3]), P.pocket, { p: [sd * 0.55, -0.1, 0.02], outline: true })
    for (let k = 0; k < 4; k++) make(parts, ink, box, P.stitch, { p: [sd * 0.632, 0.06, -0.09 + k * 0.065], s: [0.012, 0.012, 0.04] }) } // stitched rim
  // daisy on the inner pocket (viewer's left on the front view): five petals, a gold heart, two leaves
  const fl = [-0.6, -0.02, 0.2]
  for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2 + 0.3
    make(parts, ink, sph, P.petal, { p: [fl[0] + Math.cos(a) * 0.075, fl[1] + Math.sin(a) * 0.075, fl[2]], s: [0.068, 0.045, 0.024], r: [0, 0, a] }) }
  make(parts, ink, sph, P.gold, { p: [fl[0], fl[1], fl[2] + 0.015], s: [0.04, 0.04, 0.03] })
  for (const [dx, dy, a] of [[-0.08, -0.11, 0.9], [0.07, -0.12, -0.7]]) make(parts, ink, sph, P.leaf, { p: [fl[0] + dx, fl[1] + dy, fl[2] - 0.01], s: [0.08, 0.034, 0.02], r: [0, 0, a] })
  // rolled scroll in the outer pocket, with a little leaf
  make(parts, ink, cyl, P.scroll, { p: [0.62, 0.2, 0.06], s: [0.06, 0.42, 0.06], r: [0, 0, -0.32], outline: true })
  const lip = new THREE.TorusGeometry(0.05, 0.012, 6, 14); lip.rotateX(Math.PI / 2)
  make(parts, ink, lip, P.scrollDk, { p: [0.687, 0.4, 0.06], r: [0, 0, -0.32] })
  make(parts, ink, sph, P.leaf, { p: [0.57, 0.08, 0.17], s: [0.06, 0.026, 0.016], r: [0, 0, 0.6] })
  // the plaid blanket, rolled under the bottom: bands along the roll, thin cross stripes around it, two leather ties
  const ry = -top - 0.06, rz = 0.06, RR = 0.14, bands = [[P.plaidA, 0.1], [P.plaidB, 0.09], [P.plaidA, 0.09], [P.plaidDk, 0.025], [P.plaidA, 0.09], [P.plaidB, 0.09], [P.plaidA, 0.09], [P.plaidDk, 0.025], [P.plaidA, 0.09], [P.plaidB, 0.09], [P.plaidA, 0.1]]
  const tot = bands.reduce((a, b) => a + b[1], 0); let x0 = -tot / 2
  for (const [hex, w] of bands) { make(parts, ink, cyl, hex, { p: [x0 + w / 2, ry, rz], s: [RR, w, RR], r: [0, 0, Math.PI / 2] }); x0 += w }
  const rollInk = new THREE.CylinderGeometry(RR * 0.99, RR * 0.99, tot * 0.99, 18, 1); rollInk.rotateZ(Math.PI / 2); rollInk.translate(0, ry, rz)
  { const n = rollInk.toNonIndexed(), o = new THREE.BufferGeometry(); o.setAttribute('position', n.attributes.position); o.setAttribute('normal', n.attributes.normal); ink.push(o) }
  for (const a of [-0.5, 0.25, 1.0, 1.75, 2.5, 3.6, 4.6]) make(parts, ink, box, P.plaidY, { p: [0, ry + Math.sin(a) * RR * 1.0, rz + Math.cos(a) * RR * 1.0], s: [tot * 0.995, 0.03, 0.012], r: [-a, 0, 0] })
  for (const sd of [-1, 1]) { const end = new THREE.TorusGeometry(RR * 0.55, 0.018, 6, 16); end.rotateY(Math.PI / 2)
    make(parts, ink, end, P.plaidDk, { p: [sd * tot / 2, ry, rz] }) }
  for (const sx of [-0.28, 0.28]) { const tie = new THREE.TorusGeometry(RR + 0.012, 0.028, 6, 20); tie.rotateY(Math.PI / 2)
    make(parts, ink, tie, P.dark, { p: [sx, ry, rz], s: [1.6, 1, 1] }) }
  // compass charm: gold loop, gold case, cream face, red needle
  const cx = 0.36, cy = -0.34, cz = front + 0.1
  const loop = new THREE.TorusGeometry(0.035, 0.011, 6, 14)
  make(parts, ink, loop, P.gold, { p: [cx, cy + 0.13, front + 0.06] })
  make(parts, ink, box, P.goldDk, { p: [cx, cy + 0.085, cz - 0.01], s: [0.014, 0.05, 0.014] })
  make(parts, ink, cyl, P.gold, { p: [cx, cy, cz], s: [0.09, 0.04, 0.09], r: [Math.PI / 2, 0, 0], outline: true })
  make(parts, ink, cyl, P.face, { p: [cx, cy, cz + 0.016], s: [0.068, 0.012, 0.068], r: [Math.PI / 2, 0, 0] })
  make(parts, ink, box, P.needle, { p: [cx + 0.012, cy + 0.018, cz + 0.024], s: [0.014, 0.06, 0.006], r: [0, 0, -0.6] })
  make(parts, ink, box, P.ink, { p: [cx - 0.012, cy - 0.018, cz + 0.024], s: [0.012, 0.05, 0.006], r: [0, 0, -0.6] })
  make(parts, ink, sph, P.gold, { p: [cx, cy + 0.1, cz - 0.01], s: [0.022, 0.022, 0.022] })
  const S = BAG_S, cel = mergeGeometries(parts), line = mergeGeometries(ink)
  for (const g of [cel, line]) { g.scale(S, S, S); g.computeBoundingSphere() }
  return { cel, line }
}
