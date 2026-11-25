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

// optional painted strand lines (opts.lines): locks flowing up to a bun, as drawn on a turnaround sheet.
//   c: head centre, bun: bun centre, br: bun radius (spiral inside), n: locks round the head, twist: swirl per radian
//   of distance from the bun, ink: line colour, mirror: locks mirror left / right (a parting in front, a V up
//   into the bun behind) instead of all twisting one way; round: softens that join behind into a U; petal: each lock
//   is shaded darker at both edges (a rounded petal) instead of on one side; band: scales the base sheen band.
//   rings: instead of locks running to the bun, the lines are rings round it (rings per radian of distance), pushed
//   out into `petals` scallops by `amp`: the layered petal locks of a bun drawn on a sheet. Absent = the old shader, unchanged.
function linesGLSL(L) {
  const v = (a) => `vec3(${a.map(x => x.toFixed(5)).join(',')})`, f4 = (x) => x.toFixed(4)
  return `{ vec3 B = ${v(L.bun)}, C = ${v(L.c)}, ax = normalize(B - C), t1 = normalize(cross(ax, vec3(1.,0.,0.))), t2 = cross(ax, t1);
      vec3 q = normalize(vO - C);
      float d = acos(clamp(dot(q, ax), -1., 1.)), ph = atan(dot(q, t2), dot(q, t1));${L.mirror ? ` ph = sqrt(ph * ph + ${(L.round ?? 0).toFixed(4)});` : ''}
      float f = ${L.rings
        ? `d * ${f4(L.rings)} - ${f4(L.amp ?? 0.4)} * pow(abs(sin(ph * ${f4((L.petals ?? 7) / 2)})), .7)`
        : `ph * ${f4(L.n / (2 * Math.PI))} + d * ${f4(L.twist)} + ${f4(L.wave ?? 0)} * sin(d * 4. + ph * 2.)`};
      vec3 pb = vO - B; float ab = dot(pb, ax); vec3 rp = pb - ab * ax;
      float rb = length(rp) / ${f4(L.br)}, onBun = (1. - smoothstep(.95, 1.12, length(pb) / ${f4(L.br)})) * smoothstep(-.2, .25, ab / ${f4(L.br)});
      float fb = atan(dot(rp, t2), dot(rp, t1)) * ${f4((L.bunN ?? 3) / (2 * Math.PI))} + log(max(rb, .08)) * ${f4(L.bunTwist ?? 1.1)};
      float uM = fract(f), wM = min(fwidth(f), .08) + 1e-4, uB = fract(fb), wB = min(fwidth(fb), .08) + 1e-4;
      float lnM = 1. - smoothstep(wM * .5, wM * 1.5 + ${f4(L.width ?? 0.03)}, min(uM, 1. - uM));
      float lnB = (1. - smoothstep(wB * .5, wB * 1.5 + ${f4(L.width ?? 0.03)}, min(uB, 1. - uB))) * smoothstep(.12, .3, rb);
      float lockM = mix(${f4(L.lock ?? 0.86)}, 1., ${L.petal ? 'pow(sin(3.14159 * uM), .6)' : 'smoothstep(.0, .6, uM)'}), lockB = mix(${f4(L.lock ?? 0.86)}, 1., ${L.petal ? 'pow(sin(3.14159 * uB), .6)' : 'smoothstep(.0, .6, uB)'});
      float fade = (smoothstep(.15, .45, d) * (1. - smoothstep(2.3, 2.55, d))) * (1. - sk);
      float bun = onBun * (1. - sk);
      c *= mix(1., lockM, fade * (1. - bun)) * mix(1., lockB, bun);
      c = mix(c, ${v(L.ink)} * (uLight * .7 + uAmb), (lnM * fade * (1. - bun) + lnB * bun) * ${f4(L.alpha ?? 0.5)}); }
`
}
// aSkin: 0 hair, 1 skin (ears), 2 darker skin (the hollow of an ear)
export function makeHairMat(skin, hair, band, uOff, opts = {}) {
  return new THREE.ShaderMaterial({
    uniforms: { uOff: { value: uOff }, uSun: CEL_U.uSun, uLight: CEL_U.uLight, uAmb: CEL_U.uAmb, uRim: CEL_U.uRim,
      uHair: { value: new THREE.Color(hair) }, uBand: { value: new THREE.Color(band) }, uSkin: { value: new THREE.Color(skin) } },
    vertexShader: HOFF + `attribute float aSkin; varying vec3 vN, vV, vO; varying float vSkin;
      void main(){ vO = position; vSkin = aSkin; vec4 mv = modelViewMatrix*vec4(position + hoff(),1.); vN = normalize(normalMatrix*normal); vV = -mv.xyz; gl_Position = projectionMatrix*mv; }`,
    fragmentShader: `uniform vec3 uSun, uLight, uAmb, uRim, uHair, uBand, uSkin; varying vec3 vN, vV, vO; varying float vSkin;
      void main(){ vec3 N = normalize(vN), V = normalize(vV), L = normalize((viewMatrix*vec4(uSun,0.)).xyz);
        float ndl = dot(N, L), lit = smoothstep(-.04, .12, ndl), sk = step(.5, vSkin);
        vec3 base = mix(uHair, uSkin, sk) * (1. - .2*step(1.5, vSkin)), shade = base*mix(vec3(.68,.55,.5), vec3(.86,.68,.66), sk);
        vec3 c = mix(shade, base, lit)*uLight + base*uAmb;
        vec3 d = normalize(vO - vec3(0., .004, -.004)); float az = atan(d.x, d.z);
        float band = 1. - smoothstep(.02, .11, abs(d.y - .6 - .02*sin(az*7.) - .012*cos(az*13.)));
        c = mix(c, uBand*uLight*(.75 + .25*lit), band*(1. - sk)*(.3 + .32*lit)*smoothstep(-.2, .5, dot(N, V))${opts.lines?.band != null ? ` * ${opts.lines.band.toFixed(3)}` : ''});
        ${opts.lines ? linesGLSL(opts.lines) : ''}c *= 1. - (1. - sk)*.3*smoothstep(.1, .38, vSkin);
        c = mix(c, vec3(.17,.1,.08), (1. - sk)*smoothstep(.455, .488, vSkin));
        float fr = 1. - max(dot(N, V), 0.); c += uRim*smoothstep(.62, .92, fr)*(.2 + .5*lit)*.22;
        gl_FragColor = vec4(c, 1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }` })
}
