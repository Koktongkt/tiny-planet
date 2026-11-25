// One-soft-body Ghibli characters (player default + all villagers).
// Body: SDF (head/neck/torso/[skirt]/arms/legs, smooth-min blended) baked once per body type with marching cubes
// (narrow-band evaluation), skinned to a small skeleton (GPU skinning). Outfits are painted in the fragment shader from
// rest-pose position + smooth region weights (crisp fwidth-AA edges). Rigid hair/hats/clothes/props ride on bones.
import * as THREE from 'three'
import React, { useMemo, useRef, useLayoutEffect } from 'react'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { useFrame, createPortal } from '@react-three/fiber'
import { MarchingCubes } from 'three/examples/jsm/objects/MarchingCubes.js'
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { T, C, CC } from './common.jsx'
import { POSES } from './act.js'

// ---------- shading ----------
export const CEL_U = { uSun: { value: new THREE.Vector3(0.4, 0.8, 0.5).normalize() }, uLight: { value: new THREE.Color(1, 0.97, 0.92) }, uAmb: { value: new THREE.Color(0.1, 0.1, 0.14) }, uRim: { value: new THREE.Color(1, 0.93, 0.8) }, uShadeTint: { value: new THREE.Color(0.8, 0.62, 0.68) } }
let litFrame = -1
function updateLight(frame) { if (frame === litFrame) return; litFrame = frame
  CEL_U.uSun.value.copy(T.sun); CEL_U.uLight.value.setRGB(1, 0.97, 0.92).lerp(CC('#ffb48a'), T.dusk * 0.5).lerp(CC('#6f7fb8'), T.night * 0.75)
  CEL_U.uAmb.value.setRGB(0.12, 0.11, 0.15).lerp(CC('#1c2240'), T.night) }
const VS = `#include <common>
  #include <skinning_pars_vertex>
  varying vec3 vN; varying vec3 vV; varying vec3 vO; varying float vAO; varying vec4 vReg; varying vec3 vCol; varying vec3 vUp; varying float vKind;
  #ifdef BODY
    attribute float aAO; attribute vec4 aReg;
  #endif
  #ifdef KIND
    attribute float aKind;
  #endif
  void main(){
    #include <beginnormal_vertex>
    #include <skinbase_vertex>
    #include <skinnormal_vertex>
    #include <begin_vertex>
    #include <skinning_vertex>
    vO = position;
    #ifdef USE_COLOR
      vCol = color;
    #else
      vCol = vec3(1.);
    #endif
    #ifdef BODY
      vAO = aAO; vReg = aReg;
    #else
      vAO = 1.; vReg = vec4(0.);
    #endif
    #ifdef KIND
      vKind = aKind;
    #else
      vKind = 0.;
    #endif
    vUp = normalize(normalMatrix*vec3(0.,1.,0.));
    vec4 mv = modelViewMatrix*vec4(transformed,1.); vN = normalize(normalMatrix*objectNormal); vV = -mv.xyz; gl_Position = projectionMatrix*mv; }`
// outfit painter. uY = (waistY, neckY, shoeY, legHemY); uO = (type, longSleeve, bareLegs, apronW); uZ = (chestY, bellyZ, hipY, 0)
const PAINT = `
  float aa(float d){ float w = fwidth(d)*1.1 + 1e-6; return smoothstep(-w, w, d); }
  vec3 outfit(){
    float x = vO.x, ax = abs(x), y = vO.y, z = vO.z, front = aa(z - .004), back = 1. - front;
    float arm = smoothstep(.42,.58,vReg.x), fore = smoothstep(.42,.58,vReg.y), leg = smoothstep(.42,.58,vReg.z), hand = smoothstep(.4,.6,vReg.w);
    int ty = int(uO.x + .5);
    float waist = aa(uY.x - y), neck = aa(y - uY.y);
    // torso
    vec3 torso = mix(uTop, uBottom, waist);
    if (ty == 0) { // overalls: bib + straps (front), crossed straps (back)
      float bib = front * aa(uO.w - ax) * aa(uZ.x + .018 - y);
      float strapF = front * aa(y - uZ.x - .002) * aa(.0085 - abs(ax - uO.w + .001));
      float u = (y - uY.x) / max(uY.y - uY.x, .01);
      float strapB = back * aa(y - uY.x) * aa(.0085 - abs(ax - mix(.004, .034, clamp(u, 0., 1.))));
      torso = mix(torso, uBottom, max(bib, max(strapF, strapB)));
      float pocket = front * aa(.015 - ax) * aa(y - uZ.x + .025) * aa(uZ.x - .002 - y) * aa(z - .02);
      torso = mix(torso, uBottom*.84, pocket);
      if (uZ.w > .5) { // outfit.seams: darker stitched seams (bib pocket rim, front fly, curved hip pockets, bib top)
        float ln = .0011, inBib = aa(uZ.x + .018 - y);
        float rim = front * aa(.0165 - ax) * aa(y - uZ.x + .0265) * aa(uZ.x - .0005 - y) * (1. - aa(.0145 - ax) * aa(y - uZ.x + .0245) * aa(uZ.x - .0025 - y));
        float fly = front * aa(ln - abs(x)) * aa(uY.x - .004 - y) * aa(y - uZ.z - .004);
        float hp = ax - .021 - (uY.x - y) * 1.15;
        float hip = front * aa(ln - abs(hp)) * aa(uY.x - .001 - y) * aa(y - uY.x + .026) * aa(ax - .02);
        float top = front * inBib * aa(ln - abs(y - uZ.x - .0155)) * aa(uO.w - .003 - ax) * (1. - waist);
        torso = mix(torso, uBottom*.66, clamp(max(max(rim, fly), max(hip, top)), 0., 1.) * .85);
      }
    } else if (ty == 2) { // apron
      float ap = front * aa(uO.w - ax) * aa(uZ.x + .01 - y) * aa(z - .006);
      float ties = aa(.004 - abs(y - uY.x - .004)) * (1. - ap);
      torso = mix(torso, uAcc2, max(ap, ties));
    } else if (ty == 3) { // yukata: obi + crossed collar
      float obi = aa(.014 - abs(y - uY.x - .006));
      float col = front * aa(.0055 - abs(x + (y - uY.y) * .55)) * aa(y - uY.x);
      torso = mix(uTop, uAcc, obi); torso = mix(torso, uAcc2, col);
    } else if (ty == 4) { // sailor collar + tie
      float colB = back * aa(.04 - ax) * aa(y - uY.y + .045);
      float colF = front * aa(y - uY.y + .03) * aa(.008 - abs(ax - (uY.y - y) * .9 - .006));
      float stripe = back * aa(.003 - abs(ax - .032)) * aa(y - uY.y + .04) + back * aa(.003 - abs(y - uY.y + .04)) * aa(.032 - ax);
      torso = mix(torso, uAcc2, max(colB, colF)); torso = mix(torso, vec3(1.), clamp(stripe, 0., 1.) * .9);
    } else if (ty == 5) { // cardigan over dress: open front shows dress
      float open = front * aa(.012 + (uY.y - y) * .15 - ax);
      torso = mix(uAcc, torso, open * aa(y - uY.x + .03) + waist);
      float btn = front * aa(.0035 - length(vec2(ax - .016, mod(y, .022) - .011)));
      torso = mix(torso, uAcc2, btn * (1. - waist) * (1. - uZ.y)); // uZ.y=1 when outfit.buttons === false
    } else if (ty == 6) { // fisherman jacket: placket + pockets, hem below waist
      float pl = front * aa(.0035 - abs(x - .004));
      float pk = front * aa(.016 - abs(ax - .026)) * aa(.011 - abs(y - uY.x - .022));
      torso = mix(torso, uTop*.78, max(pl, pk * .8));
    } else if (ty == 7) { // shirt: small V neckline
      float v = front * aa((y - uY.y + .022) - ax * 1.3);
      torso = mix(torso, uSkin, v * (1. - neck));
    } else if (ty == 8) { // open jacket: lapelled open front shows vest/shirt (uTop), hem at uY.x, pockets
      float open = front * aa(.014 + (uY.y - y) * .18 - ax);
      torso = mix(uAcc, torso, open * aa(y - uY.x + .02) + waist);
      float edge = .014 + (uY.y - y) * .18;
      float lap = front * aa(.007 - abs(ax - edge)) * aa(y - uY.x + .02) * (1. - waist) * aa(uY.y - .008 - y);
      torso = mix(torso, uAcc * .80, lap);
      float pk = front * aa(.014 - abs(ax - .026)) * aa(.009 - abs(y - uY.x - .018)) * (1. - open);
      torso = mix(torso, uAcc * .76, pk * .85);
    }
    // arms
    vec3 sleeve = ty == 5 || ty == 8 ? uAcc : uTop;
    vec3 armC = mix(sleeve, uSkin, fore * (1. - uO.y));
    // legs
    vec3 legC = mix(uBottom, uSkin, uO.z * aa(uY.w - y));
    vec3 c = mix(torso, legC, leg);
    c = mix(c, armC, arm);
    vec3 hq = (vO - uJC.xyz)/max(uJR.xyz, vec3(1e-4)); float headSk = uJR.w > .5 ? aa(1. - length(hq)) : 0.; // outfit.skinEll: the jaw stays skin where it dips below the neck line
    c = mix(c, uSkin, max(hand, max(neck, headSk) * (1. - arm)));
    c = mix(c, uShoe, aa(uY.z - y) * (1. - arm));
    if (uZ.w > .5) { // detail pass (outfit.seams): a darker sole band with a thin welt line on the boots
      float boot = aa(uY.z - y) * (1. - arm);
      c = mix(c, uShoe*.42, boot * aa(.0098 - y));
      c = mix(c, uShoe*.62, boot * aa(.0008 - abs(y - .0109)));
    }
    return c;
  }`
// cel shading, round 8 ("less plastic"): a crisper painted terminator; shadows lean cool on cloth and rosy on skin;
// a warm band where light turns to shadow on skin; sky fill from above and grass bounce from below (local up, so it
// works anywhere on the planet); fine cloth / fur grain; and a strand texture + sheen ring on hair (aKind = 1).
const FS = `uniform vec3 uSun, uLight, uAmb, uRim, uShadeTint, uColor;
  uniform vec3 uSkin, uTop, uBottom, uShoe, uAcc, uAcc2; uniform vec4 uY, uO, uZ, uJC, uJR;
  varying vec3 vN; varying vec3 vV; varying vec3 vO; varying float vAO; varying vec4 vReg; varying vec3 vCol; varying vec3 vUp; varying float vKind;
  ${PAINT}
  float h3(vec3 p){ return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453); }
  float n3(vec3 p){ vec3 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(mix(h3(i),h3(i+vec3(1,0,0)),f.x),mix(h3(i+vec3(0,1,0)),h3(i+vec3(1,1,0)),f.x),f.y),mix(mix(h3(i+vec3(0,0,1)),h3(i+vec3(1,0,1)),f.x),mix(h3(i+vec3(0,1,1)),h3(i+vec3(1,1,1)),f.x),f.y),f.z); }
  void main(){ vec3 N = normalize(vN), V = normalize(vV), L = normalize((viewMatrix*vec4(uSun,0.)).xyz);
    vec3 base = uColor*vCol; float sk = 0.;
    #ifdef BODY
      base = outfit();
      sk = 1. - smoothstep(.03, .1, length(base - uSkin));
      base *= mix(.965 + .07*n3(vO*vec3(900.,520.,900.)), 1., sk); // cloth weave, skin stays smooth
    #endif
    #ifdef FUR
      float fu = n3(vO*vec3(9.,26.,9.))*.6 + n3(vO*vec3(30.,70.,30.))*.4;
      base *= .9 + .2*fu;
      base *= mix(.9, 1.06, dot(N, normalize(vUp))*.5 + .5); // darker back, lighter belly
    #endif
    float ndl = dot(N,L);
    float hair = step(.5, vKind), strand = 0.;
    #ifdef HAIRM
      hair = 1.;
    #endif
    if (hair > .5) { strand = n3(vec3(vO.x*700., vO.y*90., vO.z*700.)); base *= .86 + .22*strand; }
    vec3 tint = mix(uShadeTint*vec3(.92,1.,1.1), uShadeTint*vec3(1.06,.98,.92), sk);
    vec3 shade = base*tint + vec3(.015,0.,.035);
    float lit = smoothstep(-0.06, 0.14, ndl);
    float occ = smoothstep(.82, .38, vAO); lit *= 1. - occ*.85;
    vec3 c = mix(shade, base, lit)*uLight + base*uAmb;
    c = mix(c, shade*uLight*.82, occ*.35);
    float up = dot(N, normalize(vUp));
    c += base*uLight*mix(vec3(.13,.12,.05), vec3(.05,.07,.11), up*.5 + .5); // grass bounce below, sky fill above
    float term = smoothstep(-.12, -.02, ndl)*(1. - smoothstep(-.02, .08, ndl));
    c += sk*term*vec3(.4,.1,.05)*uLight*.32; // light scattering through skin at the shadow edge
    if (hair > .5) { float ring = 1. - smoothstep(.0, .0055, abs(vO.y - .036 - (strand - .5)*.008));
      c += ring*max(dot(N,V),0.)*lit*uLight*base*.75; }
    float fr = 1. - max(dot(N,V),0.); float rim = smoothstep(.62,.92,fr)*(.25+.55*lit);
    c += uRim*rim*.26;
    gl_FragColor = vec4(c,1.);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`
const OUT0 = { uSkin: '#f7d3b8', uTop: '#f4ecd8', uBottom: '#5b86c0', uShoe: '#7a4630', uAcc: '#e0614f', uAcc2: '#ffffff' }
const mkU = () => Object.fromEntries(Object.entries(OUT0).map(([k, v]) => [k, { value: C(v).clone() }]))
const celCache = new Map()
export function cel(hex) {
  if (celCache.has(hex)) return celCache.get(hex)
  const m = new THREE.ShaderMaterial({ uniforms: { ...CEL_U, uColor: { value: C(hex) }, ...mkU(), uY: { value: new THREE.Vector4() }, uO: { value: new THREE.Vector4() }, uZ: { value: new THREE.Vector4() } }, vertexShader: VS, fragmentShader: FS })
  celCache.set(hex, m); return m
}
const furCache = new Map()
export function fur(hex) { // pets' coats: the cel shader + fur grain and a back-to-belly value shift
  if (furCache.has(hex)) return furCache.get(hex)
  const m = cel(hex).clone(); m.defines = { FUR: 1 }; m.uniforms = { ...m.uniforms, ...CEL_U, uColor: { value: C(hex).clone() } }
  furCache.set(hex, m); return m
}
const hairCache = new Map()
export function hairMat(hex) { // unmerged hair pieces (the swinging bob / ponytail / braids): strand texture without the ring
  if (hairCache.has(hex)) return hairCache.get(hex)
  const m = cel(hex).clone(); m.defines = { HAIRM: 1 }; m.uniforms = { ...m.uniforms, ...CEL_U, uColor: { value: C(hex).clone() } }
  hairCache.set(hex, m); return m
}
const bodyMatCache = new Map()
function bodyMat(cfg, S) {
  const o = cfg.outfit, key = JSON.stringify(o) + S.key; if (bodyMatCache.has(key)) return bodyMatCache.get(key)
  const u = mkU(); for (const [k, f] of [['uSkin', 'skin'], ['uTop', 'top'], ['uBottom', 'bottom'], ['uShoe', 'shoe'], ['uAcc', 'acc'], ['uAcc2', 'acc2']]) if (o[f]) u[k].value.set(o[f])
  const TY = { overalls: 0, dress: 1, apron: 2, yukata: 3, sailor: 4, cardigan: 5, jacket: 6, shirt: 7, openJacket: 8 }
  const dressy = o.skirt
  const waist = dressy ? S.hemY - 0.01 : o.type === 'jacket' || o.type === 'openJacket' ? S.hipY + 0.012 : o.type === 'overalls' ? S.bellyY + 0.022 + (o.waistUp ?? 0) : S.bellyY + 0.008
  // hemY is opt-in: unset keeps the historical default for every existing type (pixel-identical).
  const hemY = o.hemY == null ? (o.type === 'yukata' || o.type === 'apron' || o.type === 'cardigan' ? S.bellyY + 0.012 : waist)
    : o.hemY === 'hip' ? S.hipY + 0.008
    : o.hemY === 'thigh' ? (S.hipY + S.knY) * 0.5
    : o.hemY
  const m = new THREE.ShaderMaterial({ defines: { BODY: 1 }, uniforms: { ...CEL_U, uColor: { value: new THREE.Color(1, 1, 1) }, ...u,
    uY: { value: new THREE.Vector4(hemY, S.neckY, o.shoeY ?? 0.03, o.bare ? (o.legHem ?? S.knY + 0.01) : -1) },
    uO: { value: new THREE.Vector4(TY[o.type] ?? 7, o.long ? 1 : 0, o.bare ? 1 : 0, o.type === 'overalls' ? o.bibW ?? 0.031 : o.apronW ?? 0.04) }, uZ: { value: new THREE.Vector4(S.chestY + 0.01, o.buttons === false ? 1 : 0, S.hipY, o.seams ? 1 : 0) },
    uJC: { value: new THREE.Vector4(...(o.skinEll ? o.skinEll.slice(0, 3) : [0, 0, 0]), 0) }, uJR: { value: new THREE.Vector4(...(o.skinEll ? o.skinEll.slice(3, 6) : [1, 1, 1]), o.skinEll ? 1 : 0) } }, vertexShader: VS, fragmentShader: FS }) // skinEll [cx, cy, cz, rx, ry, rz] (opt-in)
  if (dressy) m.uniforms.uBottom.value.copy(m.uniforms.uTop.value) // skirt in dress colour
  if (dressy && o.legs) m.uniforms.uBottom.value.set(o.legs)
  bodyMatCache.set(key, m); return m
}
const OUTLINE_VS = (body) => `#include <common>
  #include <skinning_pars_vertex>
  uniform float uT; ${body ? 'attribute float aAO;' : ''} void main(){
  #include <beginnormal_vertex>
  #include <skinbase_vertex>
  #include <skinnormal_vertex>
  #include <begin_vertex>
  #include <skinning_vertex>
  vec4 mv = modelViewMatrix*vec4(transformed,1.); vec3 n = normalize(normalMatrix*objectNormal);
  float sil = .5 + .85*length(n.xy), under = 1. + .7*max(0., -n.y);
  float crease = ${body ? 'smoothstep(.3, .75, aAO)' : '1.'}; // thin the hull in creases so it can't poke through
  mv.xyz += n*uT*sil*under*crease*(0.6 + 0.4*clamp(-mv.z*.35,0.,2.)); gl_Position = projectionMatrix*mv; }`
export const mkOutline = (body) => new THREE.ShaderMaterial({ side: THREE.BackSide, polygonOffset: true, polygonOffsetFactor: 2, polygonOffsetUnits: 4, uniforms: { uT: { value: 0.0042 }, uCol: { value: C('#3b2621') } },
  vertexShader: OUTLINE_VS(body), fragmentShader: `uniform vec3 uCol; void main(){ gl_FragColor = vec4(uCol,1.);
    #include <colorspace_fragment>
  }` })
const outlineMat = mkOutline(false), outlineBody = mkOutline(true)
export function M({ geo, mat, outline = true, ...p }) { return <group {...p}><mesh geometry={geo} material={mat} />{outline && <mesh geometry={geo} material={outlineMat} />}</group> }

// ---------- SDF ----------
const V3 = (x, y, z) => new THREE.Vector3(x, y, z)
const smin = (a, b, k) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25 }
const _t = new THREE.Vector3(), _u = new THREE.Vector3()
function cap(p, a, b, ra, rb) { _t.subVectors(p, a); _u.subVectors(b, a); const h = Math.min(1, Math.max(0, _t.dot(_u) / _u.lengthSq())); return _t.addScaledVector(_u, -h).length() - (ra + (rb - ra) * h) }
function ell(p, c, r) { const x = (p.x - c.x) / r.x, y = (p.y - c.y) / r.y, z = (p.z - c.z) / r.z; return (Math.sqrt(x * x + y * y + z * z) - 1) * Math.min(r.x, r.y, r.z) }
function ocol(p, c, h, r) { const a = (p.x - c.x) / h.x, b = (p.z - c.z) / h.z, qx = (Math.sqrt(a * a + b * b) - 1) * Math.min(h.x, h.z), qy = Math.abs(p.y - c.y) - h.y; return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r } // vertical oval column (radii h.x, h.z; half height h.y), rounded edges r
function torus(p, c, R, r) { const dx = p.x - c.x, dz = p.z - c.z, q = Math.sqrt(dx * dx + dz * dz) - R; return Math.sqrt(q * q + (p.y - c.y) ** 2) - r }

// body spec from parameters (unit space; the whole character is then scaled by H)
const specCache = new Map()
export function spec(b = {}) {
  const key = JSON.stringify(b); if (specCache.has(key)) return specCache.get(key)
  const hd = b.head ?? 1, gw = b.girth ?? 1, ll = b.leg ?? 1, tl = b.torso ?? 1, al = b.arm ?? 1, hc = b.hunch ?? 0, shw = b.shoulder ?? 1, fs = b.foot ?? 1
  const S = { key, b, H: b.H ?? 1, hc, hn: b.hand ?? 1 }
  S.anY = b.anY ?? 0.034; S.knY = S.anY + 0.048 * ll; S.hipY = S.knY + 0.053 * ll; S.bellyY = S.hipY + 0.035 * tl; S.chestY = S.bellyY + 0.065 * tl; S.shY = S.chestY + 0.02 * tl
  S.neckY = S.shY + 0.012 * tl + (b.neckY ?? 0.005)
  S.belly = [V3(0, S.bellyY, 0.006 + 0.01 * (gw - 1)), V3(0.064 * gw, 0.06 * Math.min(tl, 1.25), 0.054 * (0.6 + 0.4 * gw * 1.08) * (b.bellyZ ?? 1))]
  const cg = 0.5 + 0.5 * gw
  S.chest = [V3(0, S.chestY, -0.004 + 0.022 * hc), V3(0.054 * shw * cg * (b.chestW ?? 1), 0.05 * Math.min(tl, 1.25), 0.046 * cg)]
  S.neck = [V3(0, S.shY + 0.005, -0.002 + 0.03 * hc), V3(0, S.shY + 0.055, 0.004 + 0.045 * hc), 0.021 * (0.9 + 0.1 * gw), 0.019]
  const hS = b.headS ?? [1, 1, 1]; S.headR = V3(0.068 * hd * hS[0], 0.0584 * hd * hS[1], 0.0648 * hd * hS[2]) // headS: optional skull radii scale (default = old)
  S.headC = V3(0, S.shY + 0.042 + S.headR.y - 0.014 * hc + (b.headUp ?? 0), 0.008 + 0.055 * hc) // headUp: optional lift of the head off the shoulders (default 0)
  if (b.cheek) { const [x, y, z, rx, ry, rz, k] = b.cheek, s = 1.17 * hd; S.ck = [-1, 1].map(d => S.headC.clone().add(V3(d * x * s, y * s, z * s))).concat([V3(rx * s, ry * s, rz * s), k * s]) } // round mochi cheeks (head-frame units)
  S.cr = [b.cranium, b.chin].filter(Boolean).map(([y, z, rx, ry, rz, k]) => { const s = 1.17 * hd; return [S.headC.clone().add(V3(0, y * s, z * s)), V3(rx * s, ry * s, rz * s), k * s] }) // optional head lumps blended into the skull (head-frame units, shaded with it): cranium (a broader, taller crown), chin (a fuller lower face)
  if (b.midface) { const s = 1.17 * hd; S.mf = b.midface.map(([y, z, rx, ry, rz, k, r]) => [S.headC.clone().add(V3(0, y * s, z * s)), V3(rx * s, ry * s, rz * s), k * s, r == null ? null : r * s]); S.mfFade = (b.midfaceFade ?? 0) / s } // optional mid-face shapes (head-frame units): ellipsoids, or oval columns when an edge radius r is given; the nose in profile
  S.armA = b.armA ?? 0.6 + 0.3 * Math.max(0, gw - 1)
  const ar = 0.85 + 0.15 * gw
  const aR = b.armR ?? [1, 1, 1]; S.ar = [0.017 * ar * aR[0], 0.0145 * ar * aR[1], 0.0115 * ar * aR[2]] // armR: optional per-joint radius scale (default = old)
  for (const sd of [-1, 1]) {
    const k = sd < 0 ? 'L' : 'R', dir = V3(sd * Math.sin(S.armA), -Math.cos(S.armA), 0)
    S['sh' + k] = V3(sd * 0.05 * shw * (0.85 + 0.15 * gw) * (b.shX ?? 1), S.shY, -0.002 + 0.025 * hc); S['el' + k] = S['sh' + k].clone().addScaledVector(dir, 0.046 * al)
    S['wr' + k] = S['el' + k].clone().addScaledVector(dir, 0.04 * al).add(V3(0, 0, 0.004)); S['hd' + k] = S['wr' + k].clone().addScaledVector(dir, 0.013 * fs)
    const hx = 0.034 * (0.8 + 0.2 * gw) * (b.legX ?? 1)
    S['hp' + k] = V3(sd * hx, S.hipY, 0.004); S['kn' + k] = V3(sd * (hx + 0.001), S.knY, 0.007); S['an' + k] = V3(sd * (hx + 0.002), S.anY, 0.004)
    S['ft' + k] = V3(sd * (hx + 0.002), b.footY ?? 0.014, 0.012); S['dir' + k] = dir
  }
  S.lr = [0.026 * (0.85 + 0.15 * gw), 0.022 * (0.9 + 0.1 * gw), 0.016].map(r => r * (b.legR ?? 1))
  S.fr = V3(0.017 * fs * (b.bootW ?? 1), 0.012 * (b.bootH ?? 1), 0.026 * fs * (b.bootL ?? 1)); S.hr = V3(0.013 * fs * S.hn, 0.0155 * fs * S.hn, 0.012 * fs * S.hn)
  if (b.skirt) { S.skirt = [S.bellyY + 0.005, S.belly[1].x * 0.96, b.skirt === 'long' ? S.anY + 0.012 : S.knY - 0.006, S.belly[1].x * (b.skirt === 'long' ? 1.12 : 1.3)] }
  S.hemY = S.skirt ? S.skirt[2] : S.knY
  S.top = S.headC.y + S.headR.y
  specCache.set(key, S); return S
}
function core(S, p) {
  let d = smin(ell(p, ...S.belly), ell(p, ...S.chest), 0.03)
  d = smin(d, cap(p, S.neck[0], S.neck[1], S.neck[2], S.neck[3]), 0.02)
  if (S.skirt) { const [y0, r0, y1, r1] = S.skirt, q = Math.hypot(p.x, p.z / 0.86), h = Math.min(1, Math.max(0, (p.y - y0) / (y1 - y0))), r = r0 + (r1 - r0) * h
    const sk = Math.max(q - r, y1 - p.y, p.y - y0 - 0.02) ; d = smin(d, sk, 0.025) }
  let h = ell(p, S.headC, S.headR); for (const [c, r, k] of S.cr) h = smin(h, ell(p, c, r), k); if (S.ck) h = smin(h, Math.min(ell(p, S.ck[0], S.ck[2]), ell(p, S.ck[1], S.ck[2])), S.ck[3])
  if (S.mf) { const fade = S.mfFade * (p.x - S.headC.x) ** 2; for (const [c, r, k, rr] of S.mf) h = smin(h, (rr == null ? ell(p, c, r) : ocol(p, c, r, rr)) + fade, k) } // midfaceFade: recede away from the centre line (profile unchanged)
  return smin(d, h, 0.012)
}
function armD(S, p, k) {
  const sd = k === 'L' ? -1 : 1
  const a = smin(cap(p, S['sh' + k], S['el' + k], S.ar[0], S.ar[1]), cap(p, S['el' + k], S['wr' + k], S.ar[1], S.ar[2]), 0.008)
  const n = S.hn, h = smin(ell(p, S['hd' + k], S.hr), ell(p, S['hd' + k].clone().add(V3(-sd * 0.002 * n, 0.004 * n, 0.011 * n)), V3(0.0055 * n, 0.0075 * n, 0.0055 * n)), 0.004)
  return smin(a, h, 0.007)
}
const _bs = new THREE.Vector3(), _br = new THREE.Vector3()
function legD(S, p, k) {
  const l = smin(cap(p, S['hp' + k], S['kn' + k], S.lr[0], S.lr[1]), cap(p, S['kn' + k], S['an' + k], S.lr[1], S.lr[2]), 0.01), b = S.b
  let f = ell(p, S['ft' + k], S.fr)
  // optional boot knobs (default = the old soft foot): bootShaft [rx, ry, rz, dy] a chunky ankle above the foot;
  // soleY a flat sole cut (smooth max), so the boot stands flat on the ground
  if (b.bootShaft) { const [rx, ry, rz, dy] = b.bootShaft, a = S['an' + k]; f = smin(f, ell(p, _bs.set(a.x, a.y + dy, a.z + 0.001), _br.set(rx, ry, rz)), 0.008) }
  if (b.soleY != null) f = -smin(-f, -(b.soleY - p.y), 0.002)
  return smin(l, f, 0.012)
}
export function sdf(S, p) { const c = core(S, p); return Math.min(smin(c, armD(S, p, 'L'), 0.014), smin(c, armD(S, p, 'R'), 0.014), smin(c, legD(S, p, 'L'), 0.02), smin(c, legD(S, p, 'R'), 0.02)) }
function sdfOcc(S, p) {
  let d = sdf(S, p)
  if (!S.b.bald) d = Math.min(d, ell(p, S.headC.clone().add(V3(0, 0.015, -0.02)), S.headR.clone().multiplyScalar(1.09))) // the hair helmet shades the scalp; bald: true (opt-in) leaves the scalp lit
  d = Math.min(d, torus(p, V3(0, S.neckY + 0.01, 0.004), 0.03, 0.009))
  for (const k of ['L', 'R']) { d = Math.min(d, ell(p, S['sh' + k].clone().lerp(S['el' + k], 0.45), V3(0.028, 0.03, 0.028))); d = Math.min(d, torus(p, V3(S['an' + k].x, S.anY + 0.012, S['an' + k].z), 0.021, 0.007)) }
  return d
}
function bonesOf(S) {
  const B = [['root', null, V3(0, 0, 0)], ['hips', 'root', V3(0, (S.hipY + S.bellyY) / 2, 0), [V3(0, S.hipY - 0.025, 0.004), V3(0, S.bellyY + 0.02, 0.004)], S.belly[1].x * 0.97],
    ['chest', 'hips', V3(0, (S.bellyY + S.chestY) / 2, 0), [V3(0, S.bellyY + 0.02, 0), V3(0, S.shY + 0.025, S.chest[0].z)], S.chest[1].x * 0.96],
    ['head', 'chest', V3(0, S.shY + 0.045, S.neck[1].z * 0.7), [V3(0, S.shY + 0.05, S.headC.z), V3(0, S.top, S.headC.z)], S.headR.x * 0.95]]
  for (const k of ['L', 'R']) B.push(['up' + k, 'chest', S['sh' + k], [S['sh' + k], S['el' + k]], S.ar[0]], ['fo' + k, 'up' + k, S['el' + k], [S['el' + k], S['hd' + k]], S.ar[1]],
    ['th' + k, 'hips', S['hp' + k], [S['hp' + k].clone().setY(S.hipY + 0.015), S['kn' + k]], S.lr[0]], ['sh' + k + 'n', 'th' + k, S['kn' + k], [S['kn' + k], S['an' + k]], S.lr[1]],
    ['ft' + k, 'sh' + k + 'n', S['an' + k], [S['an' + k], S['ft' + k].clone().add(V3(0, -0.002, 0.024))], 0.02])
  return B
}
const segD = (p, a, b) => { _t.subVectors(p, a); _u.subVectors(b, a); const h = Math.min(1, Math.max(0, _t.dot(_u) / _u.lengthSq())); return _t.addScaledVector(_u, -h).length() }
export const BAKE = { ms: 0, count: 0 }
const geoCache = new Map()
function bake(S, RES = 72) {
  const key = S.key + RES; if (geoCache.has(key)) return geoCache.get(key)
  const t0 = performance.now()
  const half = Math.max(S.top + 0.02, 0.2) / 2 + 0.012, CY = half - 0.01, size = half
  const mc = new MarchingCubes(RES, new THREE.MeshBasicMaterial(), false, false, 90000); mc.isolation = 0
  const p = new THREE.Vector3(), st = 4, cell = 2 * size / RES, band = st * cell * 1.9
  const toW = (i) => (i - RES / 2) / (RES / 2) * size
  // narrow band: coarse samples every 4 cells, exact SDF only near the surface
  const cr = Math.ceil(RES / st) + 1, coarse = new Float32Array(cr * cr * cr)
  for (let z = 0; z < cr; z++) for (let y = 0; y < cr; y++) for (let x = 0; x < cr; x++) { p.set(toW(x * st), toW(y * st) + CY, toW(z * st)); coarse[x + y * cr + z * cr * cr] = sdf(S, p) }
  for (let z = 0; z < RES; z++) for (let y = 0; y < RES; y++) for (let x = 0; x < RES; x++) {
    const c = coarse[Math.round(x / st) + Math.round(y / st) * cr + Math.round(z / st) * cr * cr]
    let d = c; if (Math.abs(c) < band) { p.set(toW(x), toW(y) + CY, toW(z)); d = sdf(S, p) }
    mc.field[x + y * RES + z * RES * RES] = -d
  }
  mc.update()
  let g = new THREE.BufferGeometry(); const n = mc.count, pos = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) { pos[i * 3] = mc.positionArray[i * 3] * size; pos[i * 3 + 1] = mc.positionArray[i * 3 + 1] * size + CY; pos[i * 3 + 2] = mc.positionArray[i * 3 + 2] * size }
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g = mergeVertices(g, 1e-6)
  const P = g.attributes.position, cnt = P.count, nor = new Float32Array(cnt * 3), ao = new Float32Array(cnt), reg = new Float32Array(cnt * 4)
  const si = new Uint16Array(cnt * 4), sw = new Float32Array(cnt * 4), e = 0.0008, q = new THREE.Vector3(), nn = new THREE.Vector3()
  const BONES = bonesOf(S), wb = BONES.map((b, i) => [i, b]).filter(([, b]) => b[3])
  for (let i = 0; i < cnt; i++) {
    p.fromBufferAttribute(P, i)
    // a mid-face swell (S.mf) shapes the silhouette only: normals and AO come from the head without it, so the face
    // still shades like a smooth round face from the front (no muzzle shadow) while the profile shows the nose
    const mf = S.mf; S.mf = null
    nn.set(sdf(S, q.copy(p).setX(p.x + e)) - sdf(S, q.copy(p).setX(p.x - e)), sdf(S, q.copy(p).setY(p.y + e)) - sdf(S, q.copy(p).setY(p.y - e)), sdf(S, q.copy(p).setZ(p.z + e)) - sdf(S, q.copy(p).setZ(p.z - e))).normalize()
    nor.set([nn.x, nn.y, nn.z], i * 3)
    let o = 0; for (let k = 1; k <= 4; k++) { const h = 0.0055 * k; o += (h - sdfOcc(S, q.copy(p).addScaledVector(nn, h))) / h * (0.5 ** k) } // (no crease shadow round the swell either)
    S.mf = mf
    ao[i] = Math.max(0, Math.min(1, 1 - o * 1.4))
    const hipsF = THREE.MathUtils.smoothstep(p.y, S.hipY - 0.023, S.hipY + 0.025)
    let ws = wb.map(([bi, b]) => [bi, (b[0] === 'hips' ? hipsF : 1) / (Math.pow(segD(p, b[3][0], b[3][1]) / b[4], 6) + 1e-4), b[0]])
    // skirt surface follows the hips more than the legs
    if (S.skirt && p.y > S.skirt[2] - 0.004 && Math.min(legD(S, p, 'L'), legD(S, p, 'R')) > 0.004) ws = ws.map(w => [w[0], w[2] === 'hips' ? w[1] + 3 * Math.max(...ws.map(x => x[1])) : w[1] * (w[2].startsWith('th') ? 0.5 : 1), w[2]])
    ws.sort((a, b) => b[1] - a[1]); ws = ws.slice(0, 4)
    const tot = ws.reduce((s, w) => s + w[1], 0); let rA = 0, rF = 0, rL = 0
    ws.forEach(([bi, w, nm], k) => { si[i * 4 + k] = bi; sw[i * 4 + k] = w / tot; if (nm.startsWith('up') || nm.startsWith('fo')) rA += w / tot; if (nm.startsWith('fo')) rF += w / tot; if (nm.startsWith('th') || nm.endsWith('n') || nm.startsWith('ft')) rL += w / tot })
    const dh = Math.min(p.distanceTo(S.hdL), p.distanceTo(S.hdR))
    reg.set([rA, rF, rL, 1 - THREE.MathUtils.smoothstep(dh, 0.016 * (S.b.foot ?? 1), 0.024 * (S.b.foot ?? 1))], i * 4)
  }
  g.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); g.setAttribute('aAO', new THREE.BufferAttribute(ao, 1)); g.setAttribute('aReg', new THREE.BufferAttribute(reg, 4))
  g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4)); g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4))
  g.boundingSphere = new THREE.Sphere(V3(0, CY, 0), size * 1.8)
  mc.geometry.dispose()
  BAKE.ms += performance.now() - t0; BAKE.count++; if (typeof window !== 'undefined') window.__bake = BAKE
  const out = { geo: g, BONES }; geoCache.set(key, out); return out
}
function rig(S, mat, res) {
  const { geo, BONES } = bake(S, res), bones = {}, list = []
  for (const [name, parent, head] of BONES) { const b = new THREE.Bone(); b.name = name; const ph = parent ? BONES.find(x => x[0] === parent)[2] : V3(0, 0, 0); b.position.copy(head).sub(ph); b.userData.rest = head; if (parent) bones[parent].add(b); bones[name] = b; list.push(b) }
  const mesh = new THREE.SkinnedMesh(geo, mat); mesh.add(bones.root); bones.root.updateMatrixWorld(true)
  const skel = new THREE.Skeleton(list); mesh.bind(skel)
  const line = new THREE.SkinnedMesh(geo, outlineBody); line.bind(skel, mesh.bindMatrix)
  mesh.frustumCulled = line.frustumCulled = false
  return { mesh, line, bones }
}

// ---------- rigid pieces (shared geometry) ----------
const curveLathe = (pts, n = 40, seg = 40) => { const c = new THREE.SplineCurve(pts.map(([x, y]) => new THREE.Vector2(x, y))); return new THREE.LatheGeometry(c.getPoints(n), seg) }
const sph = (r, a, b, ...rest) => new THREE.SphereGeometry(r, a, b, ...rest)
const G = (() => {
  const g = {}
  g.hairTop = sph(0.0635, 40, 20, 0, Math.PI * 2, 0, Math.PI * 0.4); g.hairTop.scale(1.02, 0.92, 1.0)
  g.hairBack = sph(0.064, 40, 26, Math.PI / 2 + 1.0, Math.PI * 2 - 2.0, 0, Math.PI * 0.8); g.hairBack.scale(1.04, 0.92, 1.0)
  g.hairBackS = sph(0.064, 40, 22, Math.PI / 2 + 1.1, Math.PI * 2 - 2.2, 0, Math.PI * 0.6); g.hairBackS.scale(1.04, 0.95, 1.0)
  g.lump = sph(0.024, 18, 12); g.ball = sph(0.01, 12, 10)
  g.sleeve = curveLathe([[0.0, -0.053], [0.019, -0.054], [0.026, -0.05], [0.025, -0.043], [0.029, -0.028], [0.03, -0.01], [0.026, 0.006], [0.016, 0.014], [0.0, 0.016]], 30, 28)
  g.sleeveS = curveLathe([[0.0, -0.034], [0.019, -0.035], [0.026, -0.031], [0.028, -0.018], [0.027, -0.004], [0.022, 0.01], [0.0, 0.014]], 24, 24) // short cap sleeve
  g.kimono = new THREE.BoxGeometry(0.028, 0.07, 0.05, 3, 4, 3); { const p = g.kimono.attributes.position; for (let i = 0; i < p.count; i++) { const v = new THREE.Vector3().fromBufferAttribute(p, i), l = v.clone().normalize().multiplyScalar(Math.min(v.length(), 0.03)); p.setXYZ(i, ...v.lerp(l, 0.35).toArray()) } g.kimono.translate(0, -0.03, 0); g.kimono.computeVertexNormals() }
  g.cuff = curveLathe([[0.0, -0.012], [0.021, -0.012], [0.028, -0.008], [0.029, 0.0], [0.026, 0.008], [0.022, 0.011], [0.0, 0.011]], 16, 24)
  g.eye = sph(0.0105, 20, 14); g.iris = sph(0.0105, 12, 8); g.hi = sph(0.0034, 10, 8); g.tiny = sph(0.0045, 10, 8)
  g.blush = new THREE.CircleGeometry(0.0095, 20); g.mouth = new THREE.TorusGeometry(0.0062, 0.0014, 6, 16, Math.PI)
  g.lid = new THREE.TorusGeometry(0.008, 0.0017, 6, 14, Math.PI) // closed happy eye
  g.lash = new THREE.TorusGeometry(0.0102, 0.0016, 5, 14, 2.0); g.lash.rotateZ((Math.PI - 2.0) / 2) // upper lash line: the drawn top of the eye
  g.cowlick = new THREE.TorusGeometry(0.013, 0.0055, 8, 18, Math.PI * 1.4)
  g.scarfKnot = sph(0.014, 14, 10)
  g.scarfTail = new THREE.ConeGeometry(0.018, 0.05, 4); g.scarfTail.translate(0, -0.025, 0); g.scarfTail.scale(1, 1, 0.35)
  g.scarfRing = new THREE.TorusGeometry(0.031, 0.0115, 12, 30); g.scarfRing.rotateX(Math.PI / 2)
  g.bag = new THREE.BoxGeometry(0.042, 0.038, 0.02, 2, 2, 2); { const p = g.bag.attributes.position; for (let i = 0; i < p.count; i++) p.setY(i, p.getY(i) * (1 - 0.15 * Math.sign(p.getY(i)))) } g.bag.computeVertexNormals()
  g.brim = new THREE.CylinderGeometry(0.105, 0.11, 0.006, 36); g.crown = new THREE.CylinderGeometry(0.05, 0.058, 0.04, 28); g.band = new THREE.TorusGeometry(0.056, 0.004, 6, 28); g.band.rotateX(Math.PI / 2)
  g.capDome = sph(0.068, 28, 14, 0, Math.PI * 2, 0, Math.PI * 0.5); g.visor = new THREE.CylinderGeometry(0.05, 0.05, 0.005, 24, 1, false, -Math.PI / 2, Math.PI); g.visor.scale(1, 1, 0.8)
  g.scarfHead = sph(0.07, 32, 18, 0, Math.PI * 2, 0, Math.PI * 0.5); g.rim = new THREE.TorusGeometry(0.066, 0.0075, 8, 32); g.rim.rotateX(Math.PI / 2)
  g.ring = new THREE.TorusGeometry(0.0125, 0.0019, 6, 20); g.stick = new THREE.CylinderGeometry(0.0028, 0.0028, 1, 6); g.stick.translate(0, 0.5, 0)
  g.basket = curveLathe([[0.0, -0.02], [0.022, -0.02], [0.028, -0.005], [0.03, 0.012], [0.026, 0.013], [0.0, 0.004]], 12, 20); g.handle = new THREE.TorusGeometry(0.026, 0.0028, 6, 20, Math.PI)
  g.canopy = new THREE.ConeGeometry(0.15, 0.06, 10, 1, true); g.hook = new THREE.TorusGeometry(0.012, 0.0028, 6, 12, Math.PI)
  g.beard = sph(0.05, 24, 16, 0, Math.PI * 2, Math.PI * 0.6, Math.PI * 0.4); g.beard.scale(1, 1.1, 0.9)
  g.fringeRing = new THREE.TorusGeometry(0.058, 0.012, 10, 28, Math.PI * 1.25); g.fringeRing.rotateX(Math.PI / 2); g.fringeRing.rotateY(-Math.PI * 0.125 + Math.PI / 2 + Math.PI)
  return g
})()
const blushMat = new THREE.MeshBasicMaterial({ color: '#f5b0a6' })
const irisMat = new THREE.MeshBasicMaterial({ color: '#7a4a33' }) // warm brown lower crescent: eyes read as eyes, not black beads
const irisCache = new Map(), irisFor = (c) => irisCache.get(c) || irisCache.set(c, new THREE.MeshBasicMaterial({ color: c })).get(c)
const eyeMat = new THREE.MeshBasicMaterial({ color: '#2b1d18' }), hiMat = new THREE.MeshBasicMaterial({ color: '#ffffff' }), mouthMat = new THREE.MeshBasicMaterial({ color: '#8a3b34' })
// soft contact shadow: one small blurred disc under the feet grounds a character (people and pets share it)
export const SHADOW = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32)
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.55, 'rgba(255,255,255,.6)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64)
  const t = new THREE.CanvasTexture(c); return { geo: new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), mat: new THREE.MeshBasicMaterial({ color: '#3a2c3a', alphaMap: t, transparent: true, opacity: 0.34, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }) } })()
const SEATED = new Set(['sit', 'eat', 'nap'])
const spring = (s, target, k, d, dt) => { s.v += ((target - s.x) * k - s.v * d) * dt; s.x += s.v * dt; return s.x }
const SP = () => ({ x: 0, v: 0 })
const _wp = new THREE.Vector3()

// ---------- static-piece merging ----------
// Collapses every static cel/basic mesh under it (skipping animated subtrees: anything given a ref via set()) into
// one cel mesh (vertex colours), one basic mesh and one outline mesh. Transforms are baked relative to the Merge root.
const celVC = (() => { const m = cel('#ffffff').clone(); m.uniforms = { ...m.uniforms, ...CEL_U, uColor: { value: new THREE.Color(1, 1, 1) } }; m.vertexColors = true; m.defines = { KIND: 1 }; return m })()
const basicVC = new THREE.MeshBasicMaterial({ vertexColors: true })
const _m4 = new THREE.Matrix4()
export function Merge({ children }) {
  const root = useRef()
  useLayoutEffect(() => {
    const g = root.current, buckets = { cel: [], basic: [], line: [] }, hidden = []
    const rel = (o) => { _m4.identity(); const m = new THREE.Matrix4(); for (let x = o; x && x !== g; x = x.parent) { x.updateMatrix(); m.premultiply(x.matrix) } return m }
    const walk = (o, hk = 0) => { if (o !== g && o.userData.live) return; if (o.userData.hair) hk = 1
      if (o.isMesh && o.visible) { const mat = o.material; let kind = mat === outlineMat ? 'line' : mat.isMeshBasicMaterial ? 'basic' : mat.uniforms?.uColor && !mat.defines?.BODY ? 'cel' : null
        if (kind) { let geo = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone(); const keep = new THREE.BufferGeometry(); keep.setAttribute('position', geo.attributes.position); keep.setAttribute('normal', geo.attributes.normal)
          if (kind !== 'line') { const c = kind === 'cel' ? mat.uniforms.uColor.value : mat.color, n = keep.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) a.set([c.r, c.g, c.b], i * 3); keep.setAttribute('color', new THREE.BufferAttribute(a, 3)) }
          if (kind === 'cel') keep.setAttribute('aKind', new THREE.BufferAttribute(new Float32Array(keep.attributes.position.count).fill(hk), 1)) // 1 = hair (strands + sheen)
          keep.applyMatrix4(rel(o)); buckets[kind].push(keep); hidden.push(o); o.visible = false } }
      o.children.forEach(c => walk(c, hk)) }
    walk(g)
    const made = []
    for (const [k, mat] of [['cel', celVC], ['basic', basicVC], ['line', outlineMat]]) if (buckets[k].length) { const mm = new THREE.Mesh(mergeGeometries(buckets[k]), mat); g.add(mm); made.push(mm) }
    return () => { made.forEach(m => { g.remove(m); m.geometry.dispose() }); hidden.forEach(o => { o.visible = true }) }
  }, [])
  return <group ref={root}>{children}</group>
}

// ---------- traveller preset ----------
export const TRAVELLER = { name: 'traveller', body: {}, hair: { style: 'bob', c: '#3b2a22', cowlick: true }, scarf: '#e0614f', satchel: true,
  outfit: { type: 'overalls', skin: '#f7d3b8', top: '#f4ecd8', bottom: '#5b86c0', shoe: '#7a4630', cuffs: '#7aa2d4', sleeve: 'puff' }, face: {}, walk: {} }

function Hair({ h, set, hd }) {
  const m = hairMat(h.c), st = h.style
  const back = st === 'bob' || st === 'long' ? G.hairBack : G.hairBackS
  return <group ref={set('hair')}><Merge><group userData={{ hair: 1 }}>
    {st !== 'bald' && <M geo={G.hairTop} mat={m} position={[0, 0.003, -0.002]} rotation={[-0.32, 0, 0]} />}
    {st !== 'bald' && <M geo={back} mat={m} position={[0, 0.002, -0.004]} />}
    {(st === 'bob' || st === 'long' || st === 'braids') && [[-0.028, 0.026, 0.04, 0.4], [0.0, 0.031, 0.046, 0.05], [0.027, 0.025, 0.041, -0.45]].map(([x, y, z, rz], k) => <M key={k} geo={G.lump} mat={m} position={[x, y, z]} rotation={[0.5, 0, rz]} scale={[1.25, 0.6, 0.72]} />)}
    {(st === 'short' || st === 'bun' || st === 'ponytail') && [[-0.03, 0.03, 0.036, 0.5], [0.004, 0.038, 0.04, 0], [0.033, 0.03, 0.034, -0.5]].map(([x, y, z, rz], k) => <M key={k} geo={G.lump} mat={m} position={[x, y, z]} rotation={[0.6, 0, rz]} scale={[1.0, 0.45, 0.6]} />)}
    {st === 'bob' && [-1, 1].map(x => <group key={x} ref={set(x < 0 ? 'bobL' : 'bobR')} position={[x * 0.052, 0.0, -0.01]}><M geo={G.lump} mat={m} position={[x * 0.005, -0.03, 0.004]} scale={[0.78, 1.0, 1.1]} /></group>)}
    {st === 'long' && <group ref={set('bobL')} position={[0, 0.02, -0.045]}><M geo={G.lump} mat={m} position={[0, -0.062, -0.006]} scale={[2.3, 2.3, 0.9]} /></group>}
    {st === 'bun' && <M geo={G.lump} mat={m} position={[0, 0.055, -0.04]} scale={[1.05, 1.0, 1.05]} />}
    {st === 'ponytail' && <group ref={set('bobL')} position={[0, 0.035, -0.062]}><M geo={G.lump} mat={m} position={[0, -0.04, -0.012]} scale={[0.7, 1.75, 0.7]} /><M geo={G.ball} mat={cel(h.tie ?? '#e0614f')} scale={1.1} /></group>}
    {st === 'braids' && [-1, 1].map(x => <group key={x} ref={set(x < 0 ? 'bobL' : 'bobR')} position={[x * 0.05, -0.012, -0.022]}>{[0, 1, 2].map(j => <M key={j} geo={G.ball} mat={m} position={[x * 0.004, -0.014 - j * 0.017, 0]} scale={1.45 - j * 0.12} />)}<M geo={G.ball} mat={cel(h.tie ?? '#e0614f')} position={[x * 0.004, -0.065, 0]} scale={0.9} /></group>)}
    {st === 'bald' && <M geo={G.fringeRing} mat={m} position={[0, -0.006, -0.004]} />}
    {h.cowlick && <group ref={set('cowlick')} position={[0.006, 0.055, -0.008]}><M geo={G.cowlick} mat={m} rotation={[0, Math.PI / 2, 0]} /></group>}
    </group>
    {h.beard && <><M geo={G.beard} mat={cel(h.beardC ?? h.c)} position={[0, -0.012, 0.012]} /><M geo={G.lump} mat={cel(h.beardC ?? h.c)} position={[0, -0.024, 0.052]} scale={[0.75, 0.22, 0.3]} /></>}
  </Merge></group>
}
function Hat({ hat }) {
  if (!hat) return null
  const m = cel(hat.c)
  if (hat.type === 'straw') return <group position={[0, 0.03, -0.004]} rotation={[-0.12, 0, 0.05]}><M geo={G.brim} mat={m} /><M geo={G.crown} mat={m} position={[0, 0.022, 0]} /><mesh geometry={G.band} material={cel(hat.band ?? '#d9655b')} position={[0, 0.012, 0]} /></group>
  // open domes get no hull outline (its inside would show as a dark band); a closed rim torus carries the edge line
  if (hat.type === 'cap') return <group position={[0, 0.03, -0.008]} rotation={[-0.38, 0, 0]}><M geo={G.capDome} mat={m} outline={false} /><M geo={G.rim} mat={m} scale={[1.0, 0.6, 1.0]} /><M geo={G.visor} mat={m} position={[0, 0.002, 0.056]} /></group>
  if (hat.type === 'knit') return <group position={[0, 0.024, -0.006]} rotation={[-0.3, 0, 0]}><M geo={G.capDome} mat={m} scale={[1.02, 1.05, 1.02]} outline={false} /><M geo={G.rim} mat={cel(hat.band ?? '#f4ecd8')} scale={[1.05, 1.1, 1.05]} /><M geo={G.lump} mat={cel(hat.band ?? '#f4ecd8')} position={[0, 0.07, 0]} scale={0.6} /></group>
  if (hat.type === 'scarf') return <group position={[0, 0.02, -0.012]} rotation={[-0.55, 0, 0]}><M geo={G.scarfHead} mat={m} outline={false} /><M geo={G.rim} mat={m} scale={[1.04, 0.8, 1.04]} /><M geo={G.lump} mat={m} position={[0, -0.03, -0.06]} scale={[0.55, 0.45, 0.5]} /></group>
  return null
}
function Prop({ prop, sd }) {
  if (!prop) return null
  const wood = cel('#8a5a3c')
  if (prop === 'basket') return <group position={[0, -0.025, 0.004]}><M geo={G.basket} mat={cel('#c99a5a')} position={[0, -0.02, 0]} /><M geo={G.handle} mat={cel('#a87a44')} position={[0, -0.006, 0]} /><M geo={G.lump} mat={cel('#e86f5a')} position={[0.006, -0.002, 0.004]} scale={0.38} /><M geo={G.lump} mat={cel('#9cc46a')} position={[-0.008, -0.002, -0.004]} scale={0.34} /></group>
  if (prop === 'cane') return <group position={[0, 0.0, 0.008]}><mesh geometry={G.stick} material={wood} position={[0, 0.006, 0]} scale={[1.3, -0.3, 1.3]} /><M geo={G.hook} mat={wood} position={[0, 0.012, 0.01]} rotation={[0, Math.PI / 2, 0]} outline={false} /></group>
  if (prop === 'rod') return <group rotation={[1.0, 0, 0]}><mesh geometry={G.stick} material={wood} scale={[0.9, 0.42, 0.9]} /><mesh geometry={G.stick} material={cel('#e8e1d4')} position={[0, 0.42, 0]} rotation={[2.6, 0, 0]} scale={[0.25, 0.3, 0.25]} /></group>
  if (prop === 'hoe') return <group rotation={[2.5, 0, 0]} position={[0, 0, 0.004]}><mesh geometry={G.stick} material={wood} position={[0, -0.12, 0]} scale={[1.1, 0.46, 1.1]} /><mesh material={cel('#8f8a84')} position={[0, 0.33, 0.012]} rotation={[0.3, 0, 0]}><boxGeometry args={[0.034, 0.008, 0.03]} /></mesh></group>
  if (prop === 'broom') return <group rotation={[2.75, 0, 0]} position={[0, 0, 0.004]}><mesh geometry={G.stick} material={wood} position={[0, -0.1, 0]} scale={[1.1, 0.42, 1.1]} /><M geo={G.lump} mat={cel('#d8b56a')} position={[0, 0.33, 0]} scale={[0.75, 1.5, 0.5]} /></group>
  if (prop === 'umbrella') return <group rotation={[-0.1, 0, sd * 0.15]}><mesh geometry={G.stick} material={wood} scale={[1, 0.26, 1]} /><M geo={G.canopy} mat={cel('#e9a0b4')} position={[0, 0.26, 0]} /></group>
  return null
}

// walk/idle personality defaults by age
const AGE = {
  toddler: { rate: 12, stride: 0.5, knee: 0.7, bounce: 0.026, arm: 0.5, lean: 0.04, twist: 0.1, sway: 0.08, idle: 'sway' },
  kid: { rate: 10.5, stride: 0.62, knee: 0.95, bounce: 0.02, arm: 0.75, lean: 0.1, twist: 0.14, sway: 0.05, idle: 'contra' },
  teen: { rate: 9, stride: 0.55, knee: 0.8, bounce: 0.012, arm: 0.55, lean: 0.06, twist: 0.12, sway: 0.04, idle: 'look' },
  adult: { rate: 8, stride: 0.5, knee: 0.75, bounce: 0.01, arm: 0.5, lean: 0.06, twist: 0.1, sway: 0.03, idle: 'contra' },
  elder: { rate: 6, stride: 0.3, knee: 0.45, bounce: 0.004, arm: 0.22, lean: 0.2, twist: 0.06, sway: 0.05, idle: 'sway' },
}
export function Character({ cfg = TRAVELLER, st, res = 72, scale = 1 }) {
  const S = useMemo(() => spec(cfg.body), [cfg]), W = useMemo(() => ({ ...AGE[cfg.age ?? 'kid'], ...cfg.walk }), [cfg])
  const R = useMemo(() => rig(S, bodyMat(cfg, S), res), [S, cfg, res])
  const r = useRef({}), set = (k) => (el) => { if (el) el.userData.live = true; r.current[k] = el }
  const lods = useRef([]), lod = (lv) => (el) => { if (el && !lods.current.some(x => x[0] === el)) lods.current.push([el, lv]) }
  const sp = useMemo(() => ({ headX: SP(), headY: SP(), chestY: SP(), hairX: SP(), hairZ: SP(), bobL: SP(), bobR: SP(), scarf: SP(), scarfZ: SP(), bag: SP(), bagZ: SP(), foL: SP(), foR: SP() }), [])
  const prev = useRef({ bob: 0, blinkT: 2 + Math.random() * 2, seed: st.seed ?? Math.random() * 10 })
  const hold = cfg.hold || {}
  useFrame((state, dt) => {
    dt = Math.min(dt, 0.05); const R_ = r.current, B = R.bones; updateLight(state.clock.elapsedTime)
    R.mesh.getWorldPosition(_wp); const dist = state.camera.position.distanceTo(_wp) / Math.max(S.H * scale, 0.5)
    const level = dist > 16 ? 2 : dist > 7 ? 1 : 0
    if (level !== prev.current.level) { prev.current.level = level; for (const [o, lv] of lods.current) o.visible = level < lv }
    if (R_.shadow) { const air = Math.max(0, st.air || 0) / (S.H * scale), k = 1 / (1 + air * 7); R_.shadow.visible = level < 2 && !(SEATED.has(st.act) && (st.actW ?? 1) > 0.3); /* seated on a bench / chair: no shadow on the grass below */ R_.shadow.position.y = 0.002 - air; R_.shadow.scale.setScalar(k) }
    if (level === 2 && !st.force) return // far: skip the per-frame posing work too
    const m = st.move, i = 1 - m, p = st.phase, s = Math.sin(p), c = Math.cos(p), t = (st.t ?? 0) + prev.current.seed, hc = S.hc
    const bob = (W.smooth ? 1 - s * s : 1 - Math.abs(s)) * W.bounce * m, land = Math.pow(Math.abs(s), 4) * m * (W.bounce / 0.02) * (W.land ?? 1) // walk.smooth: a rounded bob (no hop corner); walk.land: footfall squash scale
    const bobVel = (bob - prev.current.bob) / Math.max(dt, 1e-3); prev.current.bob = bob
    const br = Math.sin(t * 2.1)
    B.root.position.y = bob; B.root.rotation.x = W.lean * m + hc * 0.12
    const idle = W.idle, look = idle === 'look' ? Math.sin(t * 0.45) * 0.6 : Math.sin(t * 0.5) * 0.3, swayI = idle === 'sway' ? Math.sin(t * 1.3) * 0.05 : 0
    B.hips.position.x = (idle === 'contra' ? 0.005 : 0) * i; B.hips.rotation.set(-0.04 * m, s * W.twist * m, (idle === 'contra' ? 0.07 : swayI) * i + s * W.sway * m)
    B.hips.scale.set(1 + 0.03 * land, 1 - 0.045 * land, 1 + 0.03 * land)
    const cy = spring(sp.chestY, -s * W.twist * 1.4 * m, 60, 10, dt)
    B.chest.rotation.set(0.1 * m - 0.03 * i + br * 0.012 * i + hc * 0.25, cy, (idle === 'contra' ? -0.11 : -swayI * 1.2) * i - s * 0.04 * m)
    B.chest.scale.set(1, 1 + br * 0.008 * i, 1)
    const hx = spring(sp.headX, -0.16 * m - bobVel * 0.9 + 0.05 * i - hc * 0.3, 70, 9, dt), hy = spring(sp.headY, -(st.turn || 0) * 0.22 - cy * 0.6 + (st.look || 0) + look * i, 50, 8, dt)
    B.head.rotation.set(hx, hy, (idle === 'contra' ? 0.08 : swayI) * i + Math.sin(t * 0.8) * 0.03 * i)
    const tap = idle === 'tap' ? Math.max(0, Math.sin(t * 7)) * 0.25 * i : 0
    for (const [k, sg] of [['L', -1], ['R', 1]]) {
      const sw = sg * s, th = B['th' + k], sn = B['sh' + k + 'n'], ft = B['ft' + k], relaxed = k === 'R' && idle === 'contra' ? 1 : 0
      th.rotation.set(sw * W.stride * m - relaxed * 0.16 * i + hc * 0.15, 0, (idle === 'contra' ? -0.07 : 0) * i)
      const knee = Math.max(0, sg * c) * W.knee * m + 0.08 * m + relaxed * 0.3 * i + hc * 0.12
      sn.rotation.set(knee, 0, 0)
      ft.rotation.set(-(th.rotation.x + knee) * 0.75 + Math.max(0, -sg * c) * 0.25 * m - (k === 'R' ? tap : 0), 0, (idle === 'contra' ? 0.07 : 0) * i)
    }
    for (const [k, sg] of [['L', 1], ['R', -1]]) {
      const lag = Math.sin(p - 0.5) * sg, up = B['up' + k], fo = B['fo' + k], side = k === 'L' ? -1 : 1, h = hold[k]
      const swingAmt = h === 'umbrella' || h === 'rod' ? 0.08 : h === 'cane' ? 0.25 : h === 'basket' ? 0.3 : W.arm
      let ux = lag * swingAmt * m + 0.05 * i, uz = side * (-0.05 * i + Math.sin(t * 1.6 + side) * 0.03 * i - 0.08 * m), fx = -0.28 - Math.max(0, -lag) * 0.55 * m * (swingAmt / 0.75) - 0.1 * i
      if (h === 'umbrella') { ux = -0.35; fx = -1.15 } else if (h === 'rod') { ux = -0.4; fx = -0.8 } else if (h === 'basket') { fx = -1.1; uz -= side * 0.12 } else if (h === 'cane') { ux = -0.2 + Math.sin(p) * 0.1 * m; fx = -0.35 }
      if (idle === 'wave' && k === 'R') { uz = side * -2.3 * i + uz * m; fx = -0.5 - Math.sin(t * 8) * 0.35 * i; ux *= m }
      up.rotation.set(ux, 0, uz)
      fo.rotation.set(spring(sp['fo' + k], fx, 40, 7, dt), 0, 0)
    }
    // ---- activities (st.act, eased by st.actW 0..1): sit / stretch / hoe / sweep / fish / chat / look / carry ----
    const aw = st.actW || 0
    if (aw > 0.001 && st.act) {
      const a = st.act, w = aw, cyc = t * (a === 'hoe' ? 2.2 : a === 'sweep' ? 3.2 : 1)
      const mix = (o, k, v) => { o.rotation[k] += (v - o.rotation[k]) * w }
      if (cfg.ext?.act && cfg.ext.act(a, B, mix, st, t, w)) { /* her own action poses (lazy chunk) */ }
      else if (a === 'sit') { B.root.position.y -= (st.seatDrop ?? 0.06) * w; for (const k of ['L', 'R']) { mix(B['th' + k], 'x', -1.5); mix(B['th' + k], 'z', 0); mix(B['sh' + k + 'n'], 'x', 1.45); mix(B['ft' + k], 'x', 0.05) }
        mix(B.chest, 'x', 0.06); mix(B.root, 'x', -0.04); for (const k of ['L', 'R']) { mix(B['up' + k], 'x', -0.45); mix(B['fo' + k], 'x', -0.6) }
        if (st.sitTalk) { mix(B.head, 'y', st.look || 0) } }
      else if (a === 'stretch') { const e = 0.5 - 0.5 * Math.cos(Math.min(1, ((t * 0.35) % 1) * 1.6) * Math.PI * 2); for (const [k, sd] of [['L', -1], ['R', 1]]) { mix(B['up' + k], 'z', sd * (-0.15 - 2.65 * e)); mix(B['up' + k], 'x', -0.2 * e); mix(B['fo' + k], 'x', -0.25 - 0.3 * e) } mix(B.chest, 'x', -0.18 * e); mix(B.head, 'x', -0.35 * e); B.root.position.y += 0.006 * e * w }
      else if (a === 'hoe' || a === 'sweep') { const sw = Math.sin(cyc), hoe = a === 'hoe'; mix(B.root, 'x', (hoe ? 0.2 : 0.1) + (hoe ? 0.08 : 0.03) * sw); mix(B.chest, 'x', (hoe ? 0.32 : 0.18) + (hoe ? 0.12 : 0.04) * sw); mix(B.chest, 'y', hoe ? 0 : 0.35 * sw); mix(B.head, 'x', 0.2)
        for (const [k, sd] of [['L', -1], ['R', 1]]) { mix(B['up' + k], 'x', -1.05 - (hoe ? 0.45 : 0.15) * sw + (k === 'L' ? 0.15 : 0)); mix(B['up' + k], 'z', sd * 0.22); mix(B['fo' + k], 'x', -0.55 - (hoe ? 0.2 : 0.05) * sw) }
        for (const k of ['L', 'R']) { mix(B['th' + k], 'x', k === 'L' ? -0.25 : 0.12); mix(B['sh' + k + 'n'], 'x', 0.22) } }
      else if (a === 'fish') { const bob = Math.sin(t * 0.9) * 0.04 + (Math.sin(t * 0.23) > 0.93 ? Math.sin(t * 9) * 0.12 : 0); mix(B.upR, 'x', -0.85 + bob); mix(B.foR, 'x', -0.5); mix(B.upL, 'x', -0.6); mix(B.upL, 'z', 0.25); mix(B.foL, 'x', -0.9); mix(B.head, 'x', 0.12); mix(B.chest, 'x', 0.05) }
      else if (a === 'chat') { const g = Math.max(0, Math.sin(t * 1.3 + (st.talkSeed || 0))), nod = Math.sin(t * 2.6) * 0.06; mix(B.upR, 'x', -0.35 - 0.5 * g); mix(B.foR, 'x', -0.9 - 0.5 * g); mix(B.upR, 'z', 0.1 * g); mix(B.head, 'x', 0.05 + nod); mix(B.head, 'z', 0.08 * Math.sin(t * 0.7)); mix(B.chest, 'y', 0.06 * Math.sin(t * 1.1)) }
      else if (a === 'look') { const l = Math.sin(t * 0.55) * 0.9; mix(B.head, 'y', l); mix(B.chest, 'y', l * 0.25); mix(B.head, 'x', -0.08 + 0.06 * Math.sin(t * 0.3)); mix(B.upL, 'z', -0.1); mix(B.upR, 'z', 0.1) }
      // ---- villager routine poses (polish): knead / sell / eat / nap / play / wave ----
      else if (a === 'knead') { const kn = Math.max(0, Math.sin(t * 3.4)); mix(B.root, 'x', 0.12); mix(B.chest, 'x', 0.3 + 0.12 * kn); mix(B.head, 'x', 0.3); for (const [k, sd] of [['L', -1], ['R', 1]]) { mix(B['up' + k], 'x', -0.95 + 0.25 * kn); mix(B['up' + k], 'z', sd * 0.3); mix(B['fo' + k], 'x', -0.7 + 0.25 * kn) } }
      else if (a === 'sell') { const off = 0.5 + 0.5 * Math.sin(t * 0.8); mix(B.upR, 'x', -0.9 - 0.25 * off); mix(B.foR, 'x', -0.5); mix(B.upR, 'z', 0.1); mix(B.upL, 'x', -0.3); mix(B.foL, 'x', -1.2); mix(B.head, 'x', 0.02); mix(B.head, 'y', 0.25 * Math.sin(t * 0.45)); mix(B.chest, 'x', 0.06) }
      else if (a === 'eat' || a === 'nap') { B.root.position.y -= (st.seatDrop ?? 0.06) * w; for (const k of ['L', 'R']) { mix(B['th' + k], 'x', -1.5); mix(B['th' + k], 'z', 0); mix(B['sh' + k + 'n'], 'x', 1.45); mix(B['ft' + k], 'x', 0.05) }
        if (a === 'eat') { const bite = Math.max(0, Math.sin(t * 1.4)); mix(B.upR, 'x', -1.1 - 0.6 * bite); mix(B.foR, 'x', -1.5 - 0.5 * bite); mix(B.upR, 'z', 0.25); mix(B.upL, 'x', -0.5); mix(B.foL, 'x', -1.0); mix(B.head, 'x', 0.15 - 0.1 * bite) }
        else { mix(B.chest, 'x', 0.3); mix(B.head, 'x', 0.55 + 0.03 * Math.sin(t * 1.2)); mix(B.head, 'z', 0.25); for (const k of ['L', 'R']) { mix(B['up' + k], 'x', -0.5); mix(B['fo' + k], 'x', -0.9) } } }
      else if (a === 'play') { const hop = Math.abs(Math.sin(t * 5)); B.root.position.y += 0.02 * hop * w; for (const [k, sd] of [['L', -1], ['R', 1]]) { mix(B['up' + k], 'z', sd * (-0.5 - 1.6 * hop)); mix(B['fo' + k], 'x', -0.3) } mix(B.head, 'x', -0.15 * hop); for (const k of ['L', 'R']) mix(B['sh' + k + 'n'], 'x', 0.4 * (1 - hop)) }
      else if (a === 'wave') { mix(B.upR, 'z', 2.3); mix(B.upR, 'x', -0.2); mix(B.foR, 'x', -0.5 - Math.sin(t * 9) * 0.4); mix(B.head, 'x', -0.05); mix(B.head, 'z', 0.1) }
      // ---- her action poses (polish): pick / cast / reel / craft / water / pet / door / place ----
      else if (a === 'pick' || a === 'place' || a === 'pet') { const at = st.actT || 0, reach = Math.min(1, at / 0.35), crouch = a === 'pet' ? 0.95 : 1
        B.root.position.y -= 0.075 * w * crouch; mix(B.root, 'x', 0.32 * crouch); mix(B.chest, 'x', 0.38 + (a === 'place' ? 0.1 : 0))
        for (const k of ['L', 'R']) { mix(B['th' + k], 'x', k === 'L' ? -1.25 : -0.55); mix(B['sh' + k + 'n'], 'x', k === 'L' ? 1.55 : 1.05); mix(B['ft' + k], 'x', -0.25) }
        const stroke = a === 'pet' ? Math.sin(at * 7) * 0.22 : 0
        mix(B.upR, 'x', -1.0 - 0.35 * reach + stroke); mix(B.upR, 'z', 0.1); mix(B.foR, 'x', -0.35 + stroke * 0.5)
        mix(B.upL, 'x', a === 'place' ? -1.0 - 0.3 * reach : -0.25); mix(B.upL, 'z', a === 'place' ? -0.1 : -0.2); mix(B.foL, 'x', a === 'place' ? -0.35 : -0.6); mix(B.head, 'x', 0.38) }
      else if (a === 'cast') { const at = st.actT || 0, k = Math.min(1, at / 0.55), back = k < 0.45 ? k / 0.45 : 1 - (k - 0.45) / 0.55
        mix(B.upR, 'x', -2.4 * back - 0.9 * (1 - back)); mix(B.foR, 'x', -0.8 * back - 0.3); mix(B.upL, 'x', -0.6); mix(B.foL, 'x', -0.9); mix(B.chest, 'y', -0.25 * back + 0.15 * (1 - back)); mix(B.chest, 'x', -0.08 * back + 0.12 * (1 - back)); mix(B.head, 'x', -0.1 * back + 0.1) }
      else if (a === 'reel') { const at = st.actT || 0, cr = Math.sin(at * 14) * 0.25
        mix(B.upR, 'x', -0.9); mix(B.foR, 'x', -0.9 + cr); mix(B.upL, 'x', -0.7 + cr * 0.6); mix(B.foL, 'x', -1.1); mix(B.chest, 'x', -0.12); mix(B.head, 'x', 0.05); mix(B.root, 'x', -0.08) }
      else if (a === 'craft') { const at = st.actT || 0, ham = Math.sin(at * 11), alt = Math.sin(at * 11 + Math.PI)
        mix(B.chest, 'x', 0.28); mix(B.root, 'x', 0.1); mix(B.head, 'x', 0.32)
        mix(B.upR, 'x', -1.05 + ham * 0.28); mix(B.foR, 'x', -0.85 + ham * 0.2); mix(B.upR, 'z', 0.15)
        mix(B.upL, 'x', -1.0 + alt * 0.18); mix(B.foL, 'x', -0.95 + alt * 0.15); mix(B.upL, 'z', -0.15) }
      else if (a === 'water') { const at = st.actT || 0, tilt = Math.min(1, at / 0.3), sway = Math.sin(at * 4) * 0.1
        mix(B.upR, 'x', -1.1 - 0.15 * tilt + sway); mix(B.foR, 'x', -0.45); mix(B.upR, 'z', 0.25 * tilt); mix(B.upL, 'x', -0.3); mix(B.chest, 'x', 0.22); mix(B.chest, 'y', 0.12 * tilt); mix(B.head, 'x', 0.3); mix(B.root, 'x', 0.08) }
      else if (a === 'door') { const at = st.actT || 0, push = Math.min(1, at / 0.3)
        mix(B.upR, 'x', -1.35 * push); mix(B.foR, 'x', -0.25); mix(B.upR, 'z', 0.08); mix(B.chest, 'x', 0.12 * push); mix(B.head, 'x', 0.05) }
      else if (POSES[a]) POSES[a](B, mix, st, t, w) // round7: home-activity poses (lazy chunk)
      else if (a === 'carry') { for (const [k, sd] of [['L', -1], ['R', 1]]) { mix(B['up' + k], 'x', -0.55); mix(B['up' + k], 'z', sd * -0.12); mix(B['fo' + k], 'x', -1.2) } mix(B.chest, 'x', -0.06) }
    }
    if (cfg.ext?.life) cfg.ext.life(B, st, dt, t, R_, prev.current, state) // chibi her: procedural life layer (lazy chunk)
    const hairX = spring(sp.hairX, -0.12 * m - bobVel * 2.2 - sp.headX.v * 0.06, 28, 4.5, dt), hairZ = spring(sp.hairZ, -sp.headY.v * 0.05 + (st.turn || 0) * 0.1, 26, 4, dt)
    if (R_.hair) { R_.hair.rotation.x = hairX * 0.35; R_.hair.rotation.z = hairZ * 0.3 }
    if (R_.bobL) R_.bobL.rotation.x = spring(sp.bobL, 0.3 * m + bobVel * 3, 20, 3.5, dt) * (cfg.hair.style === 'long' ? 0.5 : 1)
    if (R_.bobR) R_.bobR.rotation.x = spring(sp.bobR, 0.3 * m + bobVel * 3.2, 19, 3.2, dt)
    if (R_.cowlick) R_.cowlick.rotation.z = 0.3 + hairX * 1.4
    if (R_.scarf) { R_.scarf.rotation.x = spring(sp.scarf, -0.7 * m - bobVel * 6 + Math.sin(t * 6) * 0.08 * m, 16, 3, dt); R_.scarf.rotation.z = spring(sp.scarfZ, (st.turn || 0) * 0.5 + s * 0.2 * m, 14, 3, dt) }
    if (R_.bag) { R_.bag.rotation.x = spring(sp.bag, 0.2 * m - bobVel * 5, 18, 3, dt); R_.bag.rotation.z = spring(sp.bagZ, -s * 0.35 * m, 15, 2.5, dt) }
    if (cfg.ext?.post) cfg.ext.post(R_, st, dt, t)
    prev.current.blinkT -= dt; const bl = prev.current.blinkT < 0.12 ? 0.12 : 1; if (prev.current.blinkT < 0) prev.current.blinkT = 2.5 + Math.random() * 2.5
    if (R_.eyeL) R_.eyeL.scale.y = R_.eyeR.scale.y = bl
  })
  const B = R.bones, o = cfg.outfit, f = cfg.face || {}, hd = cfg.body.head ?? 1
  const headLocal = [0, S.headC.y - B.head.userData.rest.y, S.headC.z - B.head.userData.rest.z]
  const chestY = B.chest.userData.rest.y, hipsY = B.hips.userData.rest.y
  const sleeveGeo = o.sleeve === 'kimono' ? null : (cfg.ext?.sleeveGeo ?? (o.sleeve === 'short' ? G.sleeveS : G.sleeve))
  const sleeveC = o.type === 'cardigan' || o.type === 'openJacket' ? o.acc : o.top
  const es = f.eye ?? 1, X = cfg.ext || {}
  return <group scale={S.H * scale}>
    <primitive object={R.mesh} /><primitive object={R.line} />
    <group ref={set('shadow')}><mesh geometry={SHADOW.geo} material={SHADOW.mat} scale={[0.15 * (cfg.body.girth ?? 1), 1, 0.12]} position={[0, 0, 0.006]} renderOrder={1} /></group>
    {['L', 'R'].map(k => { const sd = k === 'L' ? -1 : 1; return <React.Fragment key={k}>
      {o.sleeve !== 'none' && createPortal(<group ref={lod(2)} rotation={[0, 0, sd * S.armA]}>
        {sleeveGeo ? <M geo={sleeveGeo} mat={cel(sleeveC)} position={[0, -0.006, 0]} scale={(cfg.body.girth ?? 1) * 0.15 + 0.85} />
          : <M geo={G.kimono} mat={cel(o.top)} position={[sd * 0.004, -0.01, 0]} rotation={[0, 0, -sd * S.armA * 0.85]} />}</group>, B['up' + k])}
      {o.cuffs && createPortal(<group ref={lod(1)}><M geo={cfg.ext?.cuffGeo ?? G.cuff} mat={cel(o.cuffs)} position={[S['an' + k].x - S['kn' + k].x, S.anY + 0.012 - S.knY, S['an' + k].z - S['kn' + k].z + 0.001]} scale={[(S.lr[1] / 0.022), 1, S.lr[1] / 0.022]} /></group>, B['sh' + k + 'n'])}
      {k === 'R' && X.HandR && createPortal(<group position={S.hdR.clone().sub(S.elR).toArray()}><X.HandR st={st} /></group>, B.foR)}
      {hold[k] && createPortal(<group ref={lod(2)} position={S['hd' + k].clone().sub(S['el' + k]).toArray()}><Merge><Prop prop={hold[k]} sd={sd} /></Merge></group>, B['fo' + k])}
    </React.Fragment> })}
    {createPortal(<Merge>
      {cfg.scarf && <><M geo={G.scarfRing} mat={cel(cfg.scarf)} position={[0, S.neckY + 0.01 - chestY, 0.004 + 0.02 * S.hc]} rotation={[0.12, 0, 0]} scale={X.ring ?? 1} />
        <group position={[X.knot?.[0] ?? 0.012, S.neckY + 0.008 - chestY + (X.knot?.[1] ?? 0), 0.036 + 0.02 * S.hc + (X.knot?.[2] ?? 0)]} scale={X.knot?.[3] ?? 1}><M geo={G.scarfKnot} mat={cel(cfg.scarf)} />
          <group ref={set('scarf')}>{(X.tails ?? [-0.4, 0.35]).map(a => <M key={a} geo={X.tailGeo ?? G.scarfTail} mat={cel(cfg.scarf)} rotation={[X.tailX ?? 0.2, 0, a]} position={[0, -0.004, 0.004]} />)}</group></group></>}
      {o.type === 'sailor' && <group position={[0, S.neckY - 0.03 - chestY, S.chest[1].z * 0.95]}><M geo={G.scarfKnot} mat={cel(o.acc ?? '#d9455b')} scale={0.6} /><group ref={set('scarf')}>{[-0.3, 0.3].map(a => <M key={a} geo={G.scarfTail} mat={cel(o.acc ?? '#d9455b')} rotation={[0.15, 0, a]} scale={0.7} />)}</group></group>}
      {o.type === 'overalls' && [-1, 1].map(x => <M key={x} geo={G.tiny} mat={cel('#f2d27a')} position={[x * (o.bibW ?? 0.031), S.chestY + 0.012 - chestY, S.chest[1].z * 0.93 + S.chest[0].z]} outline={false} />)}
      {cfg.satchel && !X.strap && <mesh position={[0, S.chestY - 0.01 - chestY, -0.002]} rotation={[0.05, 0, -0.72]} material={cel('#8a5a3c')}><torusGeometry args={[S.chest[1].x * 1.26, 0.0035, 6, 40]} /></mesh>}
      {cfg.satchel && X.strap && <group position={[X.strap[5] ?? 0, S.chestY - 0.01 - chestY + X.strap[2], X.strap[4] ?? 0]} rotation={[0, 0, X.strap[0]]}>{/* ext.strap [tilt, radius, y, depth, z, x]: a cross-body loop over the shoulder down to the bag */}
        <mesh rotation={[0, Math.PI / 2, 0]} scale={[X.strap[3], 1, X.strap[6] ?? 1]} material={cel(X.strapC ?? '#8a5a3c')}><torusGeometry args={[X.strap[1], 0.0045, 6, 40]} /></mesh></group>}
    </Merge>, B.chest)}
    {cfg.satchel && createPortal(<group ref={lod(1)}><group ref={set('bag')} position={[S.belly[1].x + (X.bag?.[0] ?? 0), S.bellyY + 0.03 - hipsY + (X.bag?.[1] ?? 0), -0.006 + (X.bag?.[2] ?? 0)]}>{X.Bag ? <X.Bag /> : <M geo={X.bagGeo ?? G.bag} mat={cel(X.bagC ?? '#c08d58')} position={[0.006, -0.03, 0]} scale={X.bag?.[3] ?? 1} />}</group></group>, B.hips)}
    {createPortal(<group position={headLocal} scale={1.17 * hd}>{X.Face ? <X.Face st={st} lod={lod} /> : <group ref={lod(2)}><Merge>
      {[-1, 1].map(x => <group key={x} position={[x * 0.021 * (f.wide ?? 1), -0.012 + (f.eyeY ?? 0), 0.047]} rotation={[0, x * 0.33, 0]}>
        {f.closed ? <mesh geometry={G.lid} material={eyeMat} rotation={[0, 0, 0]} position={[0, -0.002, 0.003]} ref={set(x < 0 ? 'eyeL' : 'eyeR')} />
          : <><mesh ref={set(x < 0 ? 'eyeL' : 'eyeR')} geometry={G.eye} scale={[0.82 * es, 1.12 * es, 0.36]} material={eyeMat}>
              <mesh geometry={G.iris} position={[0, -0.0034, 0.0016]} scale={[0.66, 0.5, 1]} material={f.iris ? irisFor(f.iris) : irisMat} /></mesh>
            <mesh geometry={G.lash} position={[0, 0.0004 * es, 0.0046]} scale={[0.88 * es, 1.1 * es, 0.35]} material={eyeMat} />
            <mesh geometry={G.hi} position={[0.003 * es, 0.004 * es, 0.0035]} scale={es} material={hiMat} /></>}
        <mesh position={[0, 0.019 + (f.brow ?? 0), 0.0]} rotation={[0, 0, -x * (0.15 + (f.browTilt ?? 0))]} material={cel(cfg.hair.c)}><boxGeometry args={[0.013, 0.0028 * (f.browW ?? 1), 0.003]} /></mesh>
        {f.glasses && <mesh geometry={G.ring} material={cel(f.glasses)} position={[0, 0, 0.006]} rotation={[0, 0, 0]} />}
      </group>)}
      {f.glasses && <mesh position={[0, -0.012, 0.055]} material={cel(f.glasses)}><boxGeometry args={[0.016, 0.0022, 0.002]} /></mesh>}
      {[-1, 1].map(x => <mesh key={'b' + x} geometry={G.blush} position={[x * 0.033, -0.022, 0.046]} rotation={[0, x * 0.6, 0]} scale={[1.3, 0.7, 1]} material={blushMat} />)}
      <M geo={G.tiny} mat={cel(f.nose ?? '#efb99c')} position={[0, -0.02, 0.0525]} scale={[0.9 * (f.noseS ?? 1), 0.7 * (f.noseS ?? 1), 0.7 * (f.noseS ?? 1)]} outline={false} />
      <mesh geometry={G.mouth} position={[0, -0.031, 0.048]} rotation={[0.2, 0, Math.PI]} scale={f.mouth ?? 1} material={mouthMat} />
      </Merge></group>}
      <Merge><Hat hat={cfg.hat} /></Merge>
      {X.Hair ? <X.Hair h={cfg.hair} set={set} /> : <Hair h={cfg.hair} set={set} hd={hd} />}
    </group>, B.head)}
  </group>
}
export function GhibliPerson({ st }) { return <Character cfg={TRAVELLER} st={st} res={84} /> }
