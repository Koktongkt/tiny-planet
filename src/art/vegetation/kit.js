// Outdoor chibi plant kit, refined review V3. All dimensions are world units,
// y up, rooted at 0. Standalone asset library: not wired into the live world.
// Merge each plant to one instanced draw; cheaper tiers preserve the silhouette.
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { windify } from '../../world.js'

export const PLANT_PALETTE = {
  grass: ['#96c64c', '#abd55b'],
  shrub: ['#8ab340', '#a3c74e', '#7c9f3a'],
  fern: ['#739d46', '#91ba55'],
  flower: ['#fffaf0', '#ffe07a', '#f7b5c8', '#c9b3e8', '#f5b89e', '#a8d8e8'],
}
const white = new THREE.Color('#ffffff')
const c = new THREE.Color()
function part(geo, colour = white, petal = 0, shaded = false) {
  if (geo.index) { const old = geo; geo = old.toNonIndexed(); old.dispose() }
  geo.deleteAttribute('uv')
  const n = geo.attributes.position.count, colors = new Float32Array(n * 3), mask = new Float32Array(n)
  c.set(colour)
  const p = geo.attributes.position
  if (shaded) geo.computeBoundingBox()
  const y0 = shaded ? geo.boundingBox.min.y : 0, dy = shaded ? Math.max(.001, geo.boundingBox.max.y - y0) : 1
  for (let i = 0; i < n; i++) {
    const t = shaded ? THREE.MathUtils.clamp((p.getY(i) - y0) / dy, 0, 1) : 1
    const brightness = shaded ? .68 + .32 * Math.sin(t * Math.PI / 2) : 1
    colors[i * 3] = c.r * brightness; colors[i * 3 + 1] = c.g * brightness; colors[i * 3 + 2] = c.b * brightness
    mask[i] = petal
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  geo.setAttribute('petalTint', new THREE.BufferAttribute(mask, 1))
  return geo
}
function merged(parts) {
  const result = mergeGeometries(parts)
  parts.forEach(p => p.dispose())
  result.computeBoundingSphere()
  return result
}
// A thick rounded capsule leaf that tapers only at its root. The concave
// quadratic bend produces a soft arc rather than a pointed triangular blade.
function blade(h, w, bend, a, tier, colour, base = 0) {
  const rings = [[0,-1.825],[.62,-1.61],[.94,-1.24],[1,-.7],[1,.72],[.94,1.22],[.62,1.61],[0,1.825]]
  const profile = tier === 0 ? rings : tier === 1 ? [rings[0],rings[2],rings[3],rings[5],rings[7]] : [rings[0],rings[3],rings[5],rings[7]]
  const g = new THREE.LatheGeometry(profile.map(([r,y])=>new THREE.Vector2(r,y)), [10,6,4][tier])
  g.scale(w, h / 3.65, w * .74).translate(0, h / 2 - .005, 0)
  const p = g.attributes.position, normals = g.attributes.normal, n = new THREE.Vector3()
  for (let i = 0; i < p.count; i++) {
    const u = THREE.MathUtils.clamp((p.getY(i) + .005) / h, 0, 1)
    const k = .46 + .54 * Math.sin(u * Math.PI / 2), dk = .54 * Math.PI / (2 * h) * Math.cos(u * Math.PI / 2)
    const x = p.getX(i), z = p.getZ(i)
    p.setX(i, x * k)
    p.setZ(i, z * k + bend * u * u)
    n.fromBufferAttribute(normals, i)
    n.x /= k; n.z /= k
    n.y -= n.x * x * dk + n.z * (z * dk + 2 * bend * u / h)
    n.normalize(); normals.setXYZ(i, n.x, n.y, n.z)
  }
  g.rotateY(a).translate(Math.sin(a) * w * .28, base, Math.cos(a) * w * .28)
  return part(g, colour, 0, true)
}
export function grassGeo(tier = 0, tall = false) {
  const scale = tall ? 1.48 : 1
  const leaves = [[.090, .019, .008, 0], [.067, .019, .045, 1.68], [.075, .019, .047, -1.68]]
  if (tall && tier === 0) leaves.push([.056, .016, .045, .52], [.057, .015, .051, -2.65])
  return merged(leaves.map(([h, w, b, a], i) => blade(h * scale, w * (tall ? 1.04 : 1), b * scale, a, tier, ['#ffffff', '#e7f3c4', '#f3f9dd'][i % 3])))
}
export function fernGeo(tier = 0) {
  const leaves = [[.115,.02,.045,0],[.083,.020,.08,1.6],[.085,.019,.08,-1.6],[.063,.017,.060,2.65],[.063,.017,.060,-2.65]]
  return merged(leaves.slice(0,tier === 0 ? 5 : 3).map(([h,w,b,a],i)=>blade(h,w,b,a,tier,['#ffffff','#e2edc4','#f4f9dd'][i%3])))
}
function puff(r, x, y, z, tier, colour) {
  const g = new THREE.SphereGeometry(r, [12, 8, 5][tier], [7, 4, 3][tier])
  g.scale(1, 0.92, 0.94).translate(x, y, z)
  return part(g, colour, 0, true)
}
// The home bush's five puffy lobes, at world scale; fewer lobes in the far tier.
export function bushGeo(tier = 0) {
  const lumps = [[.093, 0, .071, -.018], [.073,.075,.052,.020], [.071,-.075,.052,.020], [.070,.016,.101,-.024], [.063,-.022,.049,.069]]
  return merged(lumps.slice(0, tier === 0 ? 5 : tier === 1 ? 4 : 3).map(([r, x, y, z], i) => puff(r, x, y, z, tier, ['#f0f5dd', '#ffffff', '#d4e4ae', '#ffffff', '#e9f3d1'][i])))
}
// The five thick, separate petals follow the existing house daisy recipe.
// The centre and corolla share a tilted head frame, so the flower reads from walk view.
function flowerHead(r, tier, x, y, z, colour = white, tint = 1, tilt = .5) {
  const bits = []
  if (tier > 0) {
    // At game distance, a rounded five-lobed corolla retains the bloom's
    // recognizable silhouette with far fewer triangles than individual petals.
    const g = new THREE.SphereGeometry(1, tier === 1 ? 20 : 10, tier === 1 ? 3 : 2), p = g.attributes.position
    for (let i=0;i<p.count;i++) {
      const a=Math.atan2(p.getZ(i),p.getX(i)), f=.8+.2*Math.cos(a*5)
      p.setXYZ(i,p.getX(i)*r*f,p.getY(i)*r*.22,p.getZ(i)*r*f)
    }
    g.computeVertexNormals();g.rotateX(tilt).translate(x,y,z)
    bits.push(part(g,colour,tint))
  }
  for (let i = 0; tier === 0 && i < 5; i++) {
    const a = i * Math.PI * 2 / 5
    const petal = new THREE.SphereGeometry(1, 8, 4)
    petal.scale(r * .36, r * .18, r * .49).rotateY(a).translate(Math.sin(a) * r * .52, 0, Math.cos(a) * r * .52)
    petal.rotateX(tilt).translate(x,y,z)
    bits.push(part(petal, colour, tint))
  }
  const centre = new THREE.SphereGeometry(1, tier === 0 ? 8 : 6, tier === 0 ? 4 : 3)
  centre.scale(r * .33, r * .22, r * .33).translate(0, r * .13, 0).rotateX(tilt).translate(x,y,z)
  bits.push(part(centre, '#f2b33c'))
  return bits
}
export function flowerGeo(tier = 0) {
  const h = .079, r = .032
  const stem = new THREE.CylinderGeometry(.004,.005,h,tier === 0 ? 8 : 4,1,true).translate(0,h/2,0)
  return merged([part(stem,'#71963e'), blade(.033,.010,.023,1.5,Math.max(1,tier),'#8dc04a',.012),
    blade(.034,.010,.024,-1.7,Math.max(1,tier),'#9bbb52',.019),
    ...flowerHead(r,tier,0,h,0)])
}
export function floweringBushGeo(tier = 0) {
  const bush = bushGeo(tier)
  const colors = bush.attributes.color, green = new THREE.Color('#96bd55')
  for (let i = 0; i < colors.count; i++) colors.setXYZ(i, colors.getX(i) * green.r, colors.getY(i) * green.g, colors.getZ(i) * green.b)
  const spots = [[-.04,.156,.045,.5],[.066,.107,.081,.7],[-.065,.086,.089,1.0]]
  const colours = ['#f7b5c8', '#fffaf0', '#ffe07a']
  return merged([bush, ...spots.slice(0, tier === 0 ? 3 : 2).flatMap(([x,y,z,tilt],i)=>flowerHead(.024,tier,x,y,z,colours[i],0,tilt))])
}

// A softened 3-tone ramp, with warm shadow and a gentle transition between
// tones, to keep the plants in the house's style without flat polygon bands.
const rampBytes = new Uint8Array(64 * 4)
for (let i = 0; i < 64; i++) {
  const x=i/63, a=THREE.MathUtils.smoothstep(x,.10,.56), b=THREE.MathUtils.smoothstep(x,.60,.91)
  for(let k=0;k<3;k++) rampBytes[i*4+k]=Math.round([153,151,128][k]+a*[78,80,91][k]+b*[24,24,36][k])
  rampBytes[i*4+3]=255
}
const ramp = new THREE.DataTexture(rampBytes,64,1,THREE.RGBAFormat)
ramp.minFilter = ramp.magFilter = THREE.LinearFilter
ramp.needsUpdate = true
// A warm, thin silhouette rim without a second mesh draw.
// Material is intended for THREE.InstancedMesh, as windify uses instanceMatrix.
export function plantMaterial(sway = 1, petals = false) {
  const mat = windify(new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: ramp, emissive: '#3a2418', emissiveIntensity: 0.035 }), sway)
  const prev = mat.onBeforeCompile, key = mat.customProgramCacheKey
  mat.onBeforeCompile = (sh, renderer) => {
    prev(sh, renderer)
    if (petals) {
      sh.vertexShader = 'attribute float petalTint;\n' + sh.vertexShader.replace('#include <color_vertex>', `#include <color_vertex>
        #if defined(USE_COLOR) && defined(USE_INSTANCING_COLOR)
          vColor.xyz = mix(color.xyz, vColor.xyz, petalTint);
        #endif`)
    }
    sh.fragmentShader = sh.fragmentShader.replace('#include <dithering_fragment>', `#include <dithering_fragment>
      float ndv = abs(dot(normalize(vNormal), normalize(vViewPosition)));
      float ink = (1.0 - smoothstep(0.045, 0.23, ndv)) * (1.0 - smoothstep(4.0, 9.0, length(vViewPosition))) * 0.88;
      gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(0.35, 0.22, 0.14), ink);`)
  }
  mat.customProgramCacheKey = () => key() + '-plant-' + petals
  return mat
}
