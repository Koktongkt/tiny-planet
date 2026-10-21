// patchSeason / patchWet / seasonizeScene (art-c). Lazy chunk: nothing here is imported by the startup chunk.
// A patch chains onto a material's existing onBeforeCompile (paint / inkRim / windify / foliage), adds a few lines after
// <color_fragment> (+ <dithering_fragment> for the wet sheen) and appends to customProgramCacheKey. All patched
// materials share one uniform set (hooks.js SU), so a season change is uniform writes only — never a recompile.
import * as THREE from 'three'
import { R } from '../../world.js'
import { SU, isTouchTier } from './hooks.js'
import { S_VERT_HEAD, S_VERT_POS, S_SCALE, S_FRAG_HEAD, S_FRAG_COLOR, S_WET_COLOR, S_WET_SHEEN } from './glsl.js'
export const SEASON_KINDS = Object.keys(S_FRAG_COLOR) // ground, grass, leaf, ever, flower, stem, roof, cap
const ORIG = new WeakMap(), OPTS = new WeakMap()
const protoKey = THREE.Material.prototype.customProgramCacheKey

function inject(sh, o) {
  for (const k of ['uSeason', 'uSnow', 'uWet', 'uSky', 'uSunV', 'uSDay', 'uPC']) sh.uniforms[k] = SU[k]
  let v = S_VERT_HEAD + sh.vertexShader
  if (S_SCALE[o.kind]) v = v.replace('#include <begin_vertex>', '#include <begin_vertex>\n' + S_SCALE[o.kind])
  sh.vertexShader = v.replace('#include <project_vertex>', '#include <project_vertex>\n' + S_VERT_POS)
  // the head goes right before main(): it uses vNormal, which the toon shader declares further down
  let f = (o.cap ? '#define S_CAP\n' : '') + sh.fragmentShader
  f = f.replace('void main() {', S_FRAG_HEAD + `void main() {\n  float sSnowF = 0., sWetF = ${o.wet ? 'uWet' : '0.'};`)
  f = f.replace('#include <color_fragment>', '#include <color_fragment>\n' + (S_FRAG_COLOR[o.kind] || '') + (o.wet ? S_WET_COLOR : ''))
  if (o.wet) f = f.replace('#include <dithering_fragment>', '#include <dithering_fragment>\n' + S_WET_SHEEN)
  sh.fragmentShader = f
}
/**
 * patchSurface(material, { kind?, cap?, wet? }) — kind ∈ SEASON_KINDS (or null for wet-only), cap = snow caps in winter
 * (default: on for desktop, off on the touch tier → winter is a tint there), wet = darker/glossier when __T.wet > 0.
 * Re-patching merges options and rebuilds from the material's original shader hooks. Returns the material.
 */
export function patchSurface(mat, o = {}) {
  if (!ORIG.has(mat)) ORIG.set(mat, { obc: mat.onBeforeCompile, key: mat.customProgramCacheKey })
  const opts = { cap: !isTouchTier(), ...(OPTS.get(mat) || {}), ...o }; OPTS.set(mat, opts)
  const { obc, key } = ORIG.get(mat)
  mat.onBeforeCompile = function (sh, r) { if (obc) obc.call(this, sh, r); inject(sh, opts) }
  const tag = `|s:${opts.kind || '-'}${opts.cap ? 'c' : ''}${opts.wet ? 'w' : ''}`
  mat.customProgramCacheKey = key && key !== protoKey ? function () { return key.call(this) + tag } : () => 'toon' + tag
  mat.needsUpdate = true
  return mat
}
export const patchSeason = (mat, kind, o = {}) => patchSurface(mat, { ...o, kind })
export const patchWet = (mat, o = {}) => patchSurface(mat, { ...o, wet: true })
/** undo a patch (back to the original shader hooks) */
export function unpatch(mat) { const g = ORIG.get(mat); if (!g) return mat; mat.onBeforeCompile = g.obc; mat.customProgramCacheKey = g.key; ORIG.delete(mat); OPTS.delete(mat); mat.needsUpdate = true; return mat }
export const patchOptions = (mat) => OPTS.get(mat) || null

// ---- auto-classify the live scene (no tags needed in the startup chunk) ----
const KEY_KIND = [
  [/^wind6_0/, 'grass'], [/^wind4_0/, 'grass'], [/^wind3_0/, 'grass'], [/^wind5_0/, 'grass'], [/^wind2_0/, 'grass'], [/^wind9_0/, 'stem'],
  [/^foliage0\.08_0\.4/, 'leaf'], [/^foliage1\.5_0\.02/, 'leaf'], [/^foliage0\.06_0\.3/, 'ever'], [/^wind0\.0[24]_-0\.3/, 'ever'],
  [/^paint0\.1true6$/, 'roof'], [/^paint0\.14true5$/, 'roof'], [/^paint0\.14true14$/, 'cap'], [/^paint0\.12true14$/, 'cap'], [/^paint0\.16true8$/, 'cap'],
]
const keyOf = (m) => { try { return m.customProgramCacheKey && m.customProgramCacheKey !== protoKey ? String(m.customProgramCacheKey()) : '' } catch (e) { return '' } }
/** which patch a mesh's material should get, or null. Exported for tests / Codor's own wiring */
export function classify(o) {
  const m = o.material; if (!m || Array.isArray(m) || !m.isMeshToonMaterial || ORIG.has(m)) return null
  const k = keyOf(m), g = o.geometry, p = g && g.parameters
  if (!o.isInstancedMesh && g && g.type === 'IcosahedronGeometry' && p && Math.abs(p.radius - R) < 0.01 && k.startsWith('paint')) return { kind: 'ground', wet: true }
  for (const [re, kind] of KEY_KIND) if (re.test(k)) return { kind }
  if (o.isInstancedMesh && !k && !m.vertexColors && g && g.type === 'IcosahedronGeometry' && p && p.radius <= 0.04 && !(p.detail === 0 && Math.abs(p.radius - 0.035) < 1e-4)) return { kind: 'flower' }
  return null
}
/**
 * seasonizeScene(root, { gl, camera, cap, wet, only }) -> Promise<{ patched: [{kind, meshes}], rescan(), restore() }>
 * Finds the ground / grass / foliage / flowers / roofs / rocks in `root` (by their existing shader keys) and patches
 * their materials IN PLACE (so React / Instanced LOD twins keep their references). With gl.compileAsync the new
 * programs are first warmed on throw-away clones off the main thread (KHR_parallel_shader_compile), so the swap never
 * stalls a frame. rescan() patches materials that mounted since (Cull'd zones remount with fresh materials) — their
 * programs are already cached, so it costs a traversal, not a compile.
 */
export async function seasonizeScene(root, { gl, camera, cap, wet = true, only } = {}) {
  const done = new Map() // material -> kind
  const collect = () => { const groups = new Map()
    root.traverse(o => { if (!o.isMesh) return; const c = classify(o); if (!c || (only && !only.includes(c.kind))) return
      let e = groups.get(o.material); if (!e) groups.set(o.material, e = { opts: { ...c, wet: c.wet && wet, ...(cap === undefined ? {} : { cap }) }, meshes: [] }); e.meshes.push(o) })
    return groups }
  const apply = (groups) => { for (const [mat, e] of groups) { mat.dispose(); patchSurface(mat, e.opts); done.set(mat, e) } } // dispose: drop the old program
  const groups = collect()
  if (gl && gl.compileAsync && camera && groups.size) {
    const tmp = new THREE.Scene(), clones = []
    for (const [mat, e] of groups) {
      const m2 = mat.clone(); m2.onBeforeCompile = mat.onBeforeCompile; m2.customProgramCacheKey = mat.customProgramCacheKey; patchSurface(m2, e.opts); clones.push(m2)
      const src = e.meshes[0], px = src.isInstancedMesh ? new THREE.InstancedMesh(src.geometry, m2, 1) : new THREE.Mesh(src.geometry, m2)
      if (src.isInstancedMesh && src.instanceColor) px.instanceColor = src.instanceColor
      px.frustumCulled = false; tmp.add(px)
    }
    // compile the variant the game actually draws: through a composer (linear render target) the programs must be built
    // with a render target bound, or they'd be the sRGB-canvas variants and recompile on first use anyway
    const first = groups.keys().next().value, cur = first && gl.properties.get(first).currentProgram
    const linear = cur && /,srgb-linear,/.test(cur.cacheKey), prevRT = gl.getRenderTarget(), rt = linear ? new THREE.WebGLRenderTarget(1, 1) : null
    let job = null
    try { if (rt) gl.setRenderTarget(rt); job = gl.compileAsync(tmp, camera, root.isScene ? root : null) } catch (err) { /* compile-on-render fallback */ } finally { if (rt) gl.setRenderTarget(prevRT) }
    try { await job } catch (err) { /* compile-on-render fallback */ }
    if (rt) rt.dispose()
    apply(groups)
    setTimeout(() => clones.forEach(m => m.dispose()), 1500) // after the real materials have picked the cached programs up
  } else apply(groups)
  return {
    get patched() { const k = {}; for (const e of done.values()) k[e.opts.kind] = (k[e.opts.kind] || 0) + 1; return k },
    rescan() { const g = collect(); apply(g); return g.size },
    restore() { for (const mat of done.keys()) { mat.dispose(); unpatch(mat) } done.clear() },
  }
}
