// Prototype Ghibli-style kid (player traveller only), enabled with ?newchar=1.
// One smooth lathe body (smock + baggy overalls via vertex colours), puffy sleeves, short tapered limbs,
// squashed head with a chunky bob + cowlick, low big eyes, blush. Two-tone warm cel shader + rim + inverted-hull outline.
import * as THREE from 'three'
import React, { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { T, C, CC, q as q0 } from './common.jsx'

// ---------- shading ----------
const CEL_U = { uSun: { value: new THREE.Vector3(0.4, 0.8, 0.5).normalize() }, uLight: { value: new THREE.Color(1, 0.97, 0.92) }, uAmb: { value: new THREE.Color(0.1, 0.1, 0.14) }, uRim: { value: new THREE.Color(1, 0.93, 0.8) }, uShadeTint: { value: new THREE.Color(0.78, 0.6, 0.66) } }
const celCache = new Map()
function cel(hex, vc = false, body = false) {
  const key = hex + vc + body; if (celCache.has(key)) return celCache.get(key)
  const m = new THREE.ShaderMaterial({ vertexColors: vc, defines: body ? { BODY: 1 } : {}, uniforms: { ...CEL_U, uColor: { value: C(hex) }, uC2: { value: C('#5b86c0') } },
    vertexShader: `varying vec3 vN; varying vec3 vV; varying vec3 vC; varying vec3 vO;
      void main(){ vO = position; vec4 mv = modelViewMatrix*vec4(position,1.); vN = normalize(normalMatrix*normal); vV = -mv.xyz;
      #ifdef USE_COLOR
        vC = color;
      #else
        vC = vec3(1.);
      #endif
      gl_Position = projectionMatrix*mv; }`,
    fragmentShader: `uniform vec3 uSun, uLight, uAmb, uRim, uShadeTint, uColor, uC2; varying vec3 vN; varying vec3 vV; varying vec3 vC; varying vec3 vO;
      void main(){ vec3 N = normalize(vN), V = normalize(vV), L = normalize((viewMatrix*vec4(uSun,0.)).xyz);
        vec3 base = uColor*vC;
        #ifdef BODY
          float ax = abs(vO.x);
          float low = 1. - smoothstep(.193, .197, vO.y + .004*sin(vO.x*160.));
          float bib = smoothstep(.012,.018,vO.z) * (1. - smoothstep(.031,.034,ax)) * (1. - smoothstep(.258,.261,vO.y));
          float strap = smoothstep(.236,.24,vO.y) * (1. - smoothstep(.0075,.0095,abs(ax-.032)));
          float ov = max(low, max(bib, strap));
          float pocket = smoothstep(.02,.025,vO.z) * (1. - smoothstep(.016,.018,ax)) * smoothstep(.212,.215,vO.y) * (1. - smoothstep(.238,.241,vO.y));
          float seam = (1. - smoothstep(.0,.0016,abs(ax-.033))) * step(vO.y,.197) * step(.13,vO.y) * step(.0,vO.z);
          base = mix(uColor, uC2, ov); base = mix(base, uC2*.82, pocket*.9); base = mix(base, uC2*.75, seam*.6);
        #endif
        vec3 shade = base*uShadeTint + vec3(.02,0.,.03);
        float ndl = dot(N,L); float lit = smoothstep(-0.03, 0.05, ndl);
        vec3 c = mix(shade, base, lit)*uLight + base*uAmb;
        float fr = 1. - max(dot(N,V),0.); float rim = smoothstep(.62,.92,fr)*(.25+.55*lit);
        c += uRim*rim*.32;
        gl_FragColor = vec4(c,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }` })
  celCache.set(key, m); return m
}
const outlineMat = new THREE.ShaderMaterial({ side: THREE.BackSide, polygonOffset: true, polygonOffsetFactor: 2, polygonOffsetUnits: 4, uniforms: { uT: { value: 0.0045 }, uCol: { value: C('#3b2621') } },
  vertexShader: `uniform float uT; void main(){ vec4 mv = modelViewMatrix*vec4(position,1.); vec3 n = normalize(normalMatrix*normal); mv.xyz += n*uT*(0.6 + 0.4*clamp(-mv.z*.35,0.,2.)); gl_Position = projectionMatrix*mv; }`,
  fragmentShader: `uniform vec3 uCol; void main(){ gl_FragColor = vec4(uCol,1.);
    #include <colorspace_fragment>
  }` })
function M({ geo, mat, outline = true, ...p }) { return <group {...p}><mesh geometry={geo} material={mat} />{outline && <mesh geometry={geo} material={outlineMat} />}</group> }

// ---------- geometry ----------
const curveLathe = (pts, n = 40, seg = 40) => { const c = new THREE.SplineCurve(pts.map(([x, y]) => new THREE.Vector2(x, y))); return new THREE.LatheGeometry(c.getPoints(n), seg) }
const PAL = { skin: '#f7d3b8', hair: '#3b2a22', smock: '#f4ecd8', overall: '#5b86c0', cuff: '#7aa2d4', shoe: '#7a4630', sock: '#fffaf0', scarf: '#e0614f', bag: '#c08d58', strap: '#8a5a3c', blush: '#f29a9a' }
function bodyGeo() {
  const g = curveLathe([[0.0, 0.112], [0.04, 0.116], [0.059, 0.133], [0.066, 0.16], [0.065, 0.195], [0.06, 0.23], [0.055, 0.258], [0.046, 0.283], [0.03, 0.301], [0.0, 0.309]], 48, 48)
  g.scale(1, 1, 0.84); g.computeVertexNormals()
  const p = g.attributes.position, col = [], ov = C(PAL.overall), sm = C(PAL.smock)
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i)
    const bib = z > 0.015 && Math.abs(x) < 0.036 && y < 0.262, strap = y > 0.24 && Math.abs(Math.abs(x) - 0.034) < 0.0085
    const c = (y < 0.198 || bib || strap) ? ov : sm; col.push(c.r, c.g, c.b) }
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); return g
}
const G = (() => {
  const head = new THREE.SphereGeometry(0.063, 40, 30); head.scale(1, 0.86, 0.95)
  const hairTop = new THREE.SphereGeometry(0.0635, 40, 20, 0, Math.PI * 2, 0, Math.PI * 0.4); hairTop.scale(1.02, 0.92, 1.0)
  const hairBack = new THREE.SphereGeometry(0.064, 40, 26, Math.PI / 2 + 1.0, Math.PI * 2 - 2.0, 0, Math.PI * 0.72); hairBack.scale(1.04, 0.9, 1.0)
  const lump = new THREE.SphereGeometry(0.024, 18, 12)
  const trouser = curveLathe([[0.0, -0.084], [0.027, -0.082], [0.028, -0.072], [0.03, -0.04], [0.031, -0.003], [0.0, 0.0]], 16, 22)
  const cuff = new THREE.TorusGeometry(0.027, 0.0065, 8, 22); cuff.rotateX(Math.PI / 2)
  const sock = new THREE.CylinderGeometry(0.014, 0.015, 0.03, 12)
  const shoe = new THREE.SphereGeometry(0.026, 20, 14); shoe.scale(0.82, 0.56, 1.3)
  const sleeve = new THREE.SphereGeometry(0.031, 22, 16); sleeve.scale(1, 1.05, 1)
  const arm = curveLathe([[0.0, -0.068], [0.0155, -0.064], [0.0175, -0.035], [0.019, -0.006], [0.0, 0.0]], 14, 18)
  const hand = new THREE.SphereGeometry(0.023, 20, 16); hand.scale(0.85, 1.05, 1.0)
  const thumb = new THREE.SphereGeometry(0.0095, 14, 10); thumb.scale(1, 1.4, 1)
  const eye = new THREE.SphereGeometry(0.0105, 20, 14), hi = new THREE.SphereGeometry(0.0034, 10, 8), tiny = new THREE.SphereGeometry(0.0045, 10, 8)
  const blush = new THREE.CircleGeometry(0.0095, 20)
  const mouth = new THREE.TorusGeometry(0.0062, 0.0014, 6, 16, Math.PI)
  const cowlick = new THREE.TorusGeometry(0.013, 0.0055, 8, 18, Math.PI * 1.4)
  const scarfKnot = new THREE.SphereGeometry(0.014, 14, 10)
  const scarfTail = new THREE.ConeGeometry(0.018, 0.05, 4); scarfTail.translate(0, -0.025, 0); scarfTail.scale(1, 1, 0.35)
  const scarfRing = new THREE.TorusGeometry(0.036, 0.009, 10, 28); scarfRing.rotateX(Math.PI / 2)
  const bag = new THREE.BoxGeometry(0.045, 0.04, 0.022); { const p = bag.attributes.position; for (let i = 0; i < p.count; i++) p.setY(i, p.getY(i) * (1 - 0.15 * Math.sign(p.getY(i)))) } bag.computeVertexNormals()
  return { body: bodyGeo(), head, hairTop, hairBack, lump, trouser, cuff, sock, shoe, sleeve, arm, hand, thumb, eye, hi, tiny, blush, mouth, cowlick, scarfKnot, scarfTail, scarfRing, bag }
})()
const blushMat = new THREE.MeshBasicMaterial({ color: PAL.blush, transparent: true, opacity: 0.55, depthWrite: false })
const eyeMat = new THREE.MeshBasicMaterial({ color: '#2b1d18' }), hiMat = new THREE.MeshBasicMaterial({ color: '#ffffff' }), mouthMat = new THREE.MeshBasicMaterial({ color: '#8a3b34' })

// ---------- springs ----------
const spring = (s, target, k, d, dt) => { s.v += ((target - s.x) * k - s.v * d) * dt; s.x += s.v * dt; return s.x }
const SP = () => ({ x: 0, v: 0 })

export function GhibliPersonV1({ st }) {
  const r = useRef({}), set = (k) => (el) => { r.current[k] = el }
  const sp = useMemo(() => ({ headX: SP(), headY: SP(), hairX: SP(), hairZ: SP(), bobL: SP(), bobR: SP(), scarf: SP(), scarfZ: SP(), bag: SP(), bagZ: SP() }), [])
  const prev = useRef({ bob: 0, blinkT: 2 })
  useFrame((_, dt) => {
    dt = Math.min(dt, 0.05); const R_ = r.current; if (!R_.root) return
    // shading follows the world sun / time of day
    CEL_U.uSun.value.copy(T.sun); CEL_U.uLight.value.setRGB(1, 0.97, 0.92).lerp(CC('#ffb48a'), T.dusk * 0.5).lerp(CC('#6f7fb8'), T.night * 0.75)
    CEL_U.uAmb.value.setRGB(0.12, 0.11, 0.15).lerp(CC('#1c2240'), T.night)
    const m = st.move, p = st.phase, s = Math.sin(p), t = st.t ?? 0
    const bob = (1 - Math.abs(s)) * 0.022 * m, land = Math.pow(Math.abs(s), 4) * m
    const bobVel = (bob - prev.current.bob) / Math.max(dt, 1e-3); prev.current.bob = bob
    R_.root.position.y = bob; R_.root.rotation.x = 0.17 * m
    R_.body.scale.set(1 + 0.035 * land, 1 - 0.05 * land + Math.sin(t * 2.2) * 0.008 * (1 - m), 1 + 0.035 * land)
    R_.body.rotation.y = s * 0.13 * m; R_.body.rotation.z = Math.sin(p) * 0.035 * m
    R_.hipL.rotation.x = -s * 0.75 * m; R_.hipR.rotation.x = s * 0.75 * m
    R_.footL.rotation.x = Math.max(0, -Math.cos(p)) * -0.5 * m; R_.footR.rotation.x = Math.max(0, Math.cos(p)) * -0.5 * m
    R_.shL.rotation.x = s * 1.0 * m; R_.shR.rotation.x = -s * 1.0 * m
    R_.shL.rotation.z = -(0.5 + 0.12 * m + Math.sin(t * 1.6) * 0.04 * (1 - m)); R_.shR.rotation.z = 0.5 + 0.12 * m + Math.sin(t * 1.6 + 1) * 0.04 * (1 - m)
    // head lags behind the body: springs on pitch/yaw driven by lean, bounce and turning
    const hx = spring(sp.headX, -0.13 * m - bobVel * 0.9, 70, 9, dt), hy = spring(sp.headY, -(st.turn || 0) * 0.22 - s * 0.1 * m + Math.sin(t * 0.5) * 0.35 * (1 - m), 50, 8, dt)
    R_.head.rotation.x = hx; R_.head.rotation.y = hy; R_.head.rotation.z = Math.sin(t * 0.8) * 0.04 * (1 - m)
    // hair + clothes sway with more delay
    const hairX = spring(sp.hairX, -0.12 * m - bobVel * 2.2 - sp.headX.v * 0.06, 28, 4.5, dt), hairZ = spring(sp.hairZ, -sp.headY.v * 0.05 + (st.turn || 0) * 0.1, 26, 4, dt)
    R_.hair.rotation.x = hairX * 0.35; R_.hair.rotation.z = hairZ * 0.3
    R_.bobL.rotation.x = spring(sp.bobL, -0.35 * m - bobVel * 4, 20, 3.5, dt); R_.bobR.rotation.x = spring(sp.bobR, -0.35 * m - bobVel * 4.2, 19, 3.2, dt)
    R_.cowlick.rotation.z = 0.3 + hairX * 1.4
    R_.scarf.rotation.x = spring(sp.scarf, -0.7 * m - bobVel * 6 + Math.sin(t * 6) * 0.08 * m, 16, 3, dt); R_.scarf.rotation.z = spring(sp.scarfZ, (st.turn || 0) * 0.5 + s * 0.2 * m, 14, 3, dt)
    R_.bag.rotation.x = spring(sp.bag, 0.5 * m * 0.4 - bobVel * 5, 18, 3, dt); R_.bag.rotation.z = spring(sp.bagZ, -s * 0.35 * m, 15, 2.5, dt)
    // blink
    prev.current.blinkT -= dt; const bl = prev.current.blinkT < 0.12 ? 0.12 : 1; if (prev.current.blinkT < 0) prev.current.blinkT = 2.5 + Math.random() * 2.5
    R_.eyeL.scale.y = R_.eyeR.scale.y = bl
  })
  const sk = cel(PAL.skin), hr = cel(PAL.hair), ov = cel(PAL.overall)
  const leg = (sd, hip, foot) => <group ref={set(hip)} position={[sd * 0.03, 0.135, 0.002]}>
    <M geo={G.trouser} mat={ov} />
    <M geo={G.cuff} mat={cel(PAL.cuff)} position={[0, -0.079, 0]} />
    <M geo={G.sock} mat={cel(PAL.sock)} position={[0, -0.097, 0]} outline={false} />
    <group ref={set(foot)} position={[0, -0.112, 0]}><M geo={G.shoe} mat={cel(PAL.shoe)} position={[0, -0.003, 0.011]} /></group>
  </group>
  const arm = (sd, sh) => <group ref={set(sh)} position={[sd * 0.06, 0.262, 0.004]} rotation={[0, 0, sd * 0.5]}>
    <M geo={G.sleeve} mat={cel(PAL.smock)} position={[sd * 0.006, -0.012, 0]} />
    <M geo={G.arm} mat={sk} position={[0, -0.022, 0]} />
    <M geo={G.hand} mat={sk} position={[0, -0.104, 0.002]} />
    <M geo={G.thumb} mat={sk} position={[-sd * 0.004, -0.094, 0.019]} rotation={[0.5, 0, sd * 0.3]} />
  </group>
  return <group ref={set('root')}>
    {leg(-1, 'hipL', 'footL')}{leg(1, 'hipR', 'footR')}
    <group ref={set('body')}>
      <M geo={G.body} mat={cel(PAL.smock, false, true)} />
      {[-1, 1].map(x => <M key={x} geo={G.tiny} mat={cel('#f2d27a')} position={[x * 0.031, 0.252, 0.047]} outline={false} />)}
      <group ref={set('bag')} position={[0.06, 0.2, -0.008]}><M geo={G.bag} mat={cel(PAL.bag)} position={[0.012, -0.035, 0]} /></group>
      <mesh position={[0, 0.235, 0]} rotation={[0.05, 0, -0.72]} material={cel(PAL.strap)}><torusGeometry args={[0.072, 0.0035, 6, 40]} /></mesh>
      {arm(-1, 'shL')}{arm(1, 'shR')}
      <M geo={G.scarfRing} mat={cel(PAL.scarf)} position={[0, 0.3, 0]} />
      <group position={[0.012, 0.296, 0.034]}><M geo={G.scarfKnot} mat={cel(PAL.scarf)} />
        <group ref={set('scarf')}>{[-0.4, 0.35].map(a => <M key={a} geo={G.scarfTail} mat={cel(PAL.scarf)} rotation={[0.2, 0, a]} position={[0, -0.004, 0.004]} />)}</group></group>
      <group ref={set('head')} position={[0, 0.305, 0]}>
        <group position={[0, 0.047, 0]} scale={1.0}>
          <M geo={G.head} mat={sk} />
          <group scale={1.086}>
          {[-1, 1].map(x => <M key={'ear' + x} geo={G.lump} mat={sk} position={[x * 0.056, -0.006, 0]} scale={[0.36, 0.5, 0.42]} />)}
          {[-1, 1].map(x => <group key={x} position={[x * 0.021, -0.012, 0.047]} rotation={[0, x * 0.33, 0]}>
            <mesh ref={set(x < 0 ? 'eyeL' : 'eyeR')} geometry={G.eye} scale={[0.82, 1.12, 0.36]} material={eyeMat} />
            <mesh geometry={G.hi} position={[0.003, 0.004, 0.0035]} material={hiMat} />
            <mesh position={[0, 0.021, 0.0]} rotation={[0, 0, -x * 0.15]} material={cel(PAL.hair)}><boxGeometry args={[0.013, 0.0028, 0.003]} /></mesh>
          </group>)}
          {[-1, 1].map(x => <mesh key={'b' + x} geometry={G.blush} position={[x * 0.033, -0.022, 0.0455]} rotation={[0, x * 0.6, 0]} scale={[1.3, 0.7, 1]} material={blushMat} />)}
          <M geo={G.tiny} mat={cel('#efb99c')} position={[0, -0.02, 0.0525]} scale={[0.9, 0.7, 0.7]} outline={false} />
          <mesh geometry={G.mouth} position={[0, -0.031, 0.0475]} rotation={[0.2, 0, Math.PI]} material={mouthMat} />
          <group ref={set('hair')}>
            <M geo={G.hairTop} mat={hr} position={[0, 0.003, -0.002]} rotation={[-0.32, 0, 0]} />
            <M geo={G.hairBack} mat={hr} position={[0, 0.002, -0.003]} />
            {[[-0.028, 0.026, 0.04, 0.4], [0.0, 0.031, 0.046, 0.05], [0.027, 0.025, 0.041, -0.45]].map(([x, y, z, rz], k) => <M key={k} geo={G.lump} mat={hr} position={[x, y, z]} rotation={[0.5, 0, rz]} scale={[1.25, 0.6, 0.72]} />)}
            {[-1, 1].map(x => <group key={x} ref={set(x < 0 ? 'bobL' : 'bobR')} position={[x * 0.052, 0.0, -0.01]}><M geo={G.lump} mat={hr} position={[x * 0.005, -0.03, 0.004]} scale={[0.75, 0.95, 1.05]} /></group>)}
            <group ref={set('cowlick')} position={[0.006, 0.055, -0.008]}><M geo={G.cowlick} mat={hr} rotation={[0, Math.PI / 2, 0]} /></group>
          </group>
          </group>
        </group>
      </group>
    </group>
  </group>
}
