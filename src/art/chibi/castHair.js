// Shared chibi hair helpers (one cel mesh + one ink hull, aW springs). Lazy.
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { CEL_U, mkOutline } from '../../GhibliPerson.jsx'

export const HOFF = `attribute vec2 aW; uniform vec3 uOff[4];
  vec3 hoff(){ vec3 o = aW.x < .5 ? uOff[0] : aW.x < 1.5 ? uOff[1] : aW.x < 2.5 ? uOff[2] : uOff[3]; return o*aW.y; }
`

export function tagAW(g, f) {
  const p = g.attributes.position, a = new Float32Array(p.count * 2)
  for (let i = 0; i < p.count; i++) { const r = f(p.getX(i), p.getY(i), p.getZ(i)); a[i * 2] = r[0]; a[i * 2 + 1] = r[1] }
  g.setAttribute('aW', new THREE.BufferAttribute(a, 2)); return g
}

export function part(geo, [x, y, z], [sx, sy, sz], [rx, ry, rz] = [0, 0, 0], skin = 0) {
  const g = new THREE.BufferGeometry(); g.setAttribute('position', geo.attributes.position.clone()); g.setIndex(geo.index.clone())
  g.scale(sx, sy, sz); g.rotateX(rx); g.rotateY(ry); g.rotateZ(rz); g.translate(x, y, z); g.computeVertexNormals()
  g.setAttribute('aSkin', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count).fill(skin), 1)); return g
}

export const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t) }

export function mergeHair(parts) {
  const g = mergeGeometries(parts); g.computeBoundingSphere(); return g
}

export function makeHairInk(uOff) {
  const m = mkOutline(false); m.uniforms.uOff = { value: uOff }
  m.vertexShader = HOFF + m.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n  transformed += hoff();')
  return m
}

/** aSkin: 0 hair, 1 skin, 0.5..0.9 darker skin, 2 darker skin for a deep hollow (Fuku's ears).
 *  shade: optional hair shadow tint (default warm brown, for dark hair; white hair wants a light cool grey) */
export function makeHairMat(skin, hair, band, uOff, shade = [0.68, 0.55, 0.5]) {
  return new THREE.ShaderMaterial({
    uniforms: { uOff: { value: uOff }, uSun: CEL_U.uSun, uLight: CEL_U.uLight, uAmb: CEL_U.uAmb, uRim: CEL_U.uRim,
      uHair: { value: new THREE.Color(hair) }, uBand: { value: new THREE.Color(band) }, uSkin: { value: new THREE.Color(skin) }, uHShade: { value: new THREE.Vector3(...shade) } },
    vertexShader: HOFF + `attribute float aSkin; varying vec3 vN, vV, vO; varying float vSkin;
      void main(){ vO = position; vSkin = aSkin; vec4 mv = modelViewMatrix*vec4(position + hoff(),1.); vN = normalize(normalMatrix*normal); vV = -mv.xyz; gl_Position = projectionMatrix*mv; }`,
    fragmentShader: `uniform vec3 uSun, uLight, uAmb, uRim, uHair, uBand, uSkin, uHShade; varying vec3 vN, vV, vO; varying float vSkin;
      void main(){ vec3 N = normalize(vN), V = normalize(vV), L = normalize((viewMatrix*vec4(uSun,0.)).xyz);
        float ndl = dot(N, L), lit = smoothstep(-.04, .12, ndl), sk = step(.5, vSkin);
        vec3 base = mix(uHair, uSkin, sk) * (1. - .2*step(1.5, vSkin)), shade = base*mix(uHShade, vec3(.86,.68,.66), sk);
        vec3 c = mix(shade, base, lit)*uLight + base*uAmb;
        vec3 d = normalize(vO - vec3(0., .004, -.004)); float az = atan(d.x, d.z);
        float band = 1. - smoothstep(.02, .11, abs(d.y - .6 - .02*sin(az*7.) - .012*cos(az*13.)));
        c = mix(c, uBand*uLight*(.75 + .25*lit), band*(1. - sk)*(.3 + .32*lit)*smoothstep(-.2, .5, dot(N, V)));
        c *= 1. - (1. - sk)*.3*smoothstep(.1, .38, vSkin);
        c *= 1. - sk*.24*(1. - step(.9, vSkin)); // aSkin 0.5..0.9: a darker skin tone (the inside of an ear); 1 = plain skin
        c = mix(c, vec3(.17,.1,.08), (1. - sk)*smoothstep(.455, .488, vSkin));
        float fr = 1. - max(dot(N, V), 0.); c += uRim*smoothstep(.62, .92, fr)*(.2 + .5*lit)*.22;
        gl_FragColor = vec4(c, 1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }` })
}
