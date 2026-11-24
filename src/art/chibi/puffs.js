// Little dust puffs (skid heels, later footfalls / landings): one InstancedMesh in world space, 1 draw while any live.
// emit(pos, n, size) at a world point; step(dt, up) each frame (they drift up, grow, then shrink away).
import * as THREE from 'three'
const N = 24, _m = new THREE.Matrix4(), _v = new THREE.Vector3()
export function makePuffs(color = '#e8dcc4') {
  const mesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshBasicMaterial({ color }), N)
  mesh.frustumCulled = false; mesh.visible = false; mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
  const P = Array.from({ length: N }, () => ({ p: new THREE.Vector3(), v: new THREE.Vector3(), t: 1, life: 0, s: 0 }))
  let head = 0
  return { mesh,
    emit(pos, n, size, spread = 1) { for (let i = 0; i < n; i++) { const o = P[head]; head = (head + 1) % N
      o.p.copy(pos).add(_v.set(Math.random() - 0.5, 0, Math.random() - 0.5).multiplyScalar(size * 2 * spread)); o.v.set(Math.random() - 0.5, 0.6 + Math.random() * 0.4, Math.random() - 0.5).multiplyScalar(size * 2.2)
      o.t = 0; o.life = 0.45 + Math.random() * 0.25; o.s = size * (0.7 + Math.random() * 0.6) } },
    step(dt, up) { let alive = 0
      for (let i = 0; i < N; i++) { const o = P[i]; let r = 0
        if (o.t < o.life) { o.t += dt; const k = o.t / o.life; _v.copy(o.v); if (up) _v.applyQuaternion(up); o.p.addScaledVector(_v, dt); r = o.s * Math.sin(Math.min(1, k) * Math.PI) * (0.6 + 0.6 * k); if (r > 0) alive++ }
        _m.makeScale(r, r, r).setPosition(o.p); mesh.setMatrixAt(i, _m) }
      mesh.instanceMatrix.needsUpdate = true; mesh.visible = alive > 0 } }
}
