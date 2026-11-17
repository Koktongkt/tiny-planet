import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { loaderManifest } from './tools/loader-manifest.mjs'
// @react-three/postprocessing probes WebGL2 by creating a throwaway WebGL context on mount (~1.4 s in software GL).
// three r169 already requires WebGL2, so the probe is always true: inline it.
const noWebGL2Probe = () => ({ name: 'no-webgl2-probe', transform(code, id) { if (/@react-three[\\/]postprocessing[\\/]dist[\\/]EffectComposer\.js$/.test(id)) return code.replace('isWebGL2Available()', 'true') } })
// vendor split: three / R3F (+drei) / postprocessing / react each get a long-cacheable chunk.
// three's loaders (GLTFLoader for the bike) get their own lazy chunk so they never ride along with vendor-three at startup
// react + react-dom + scheduler live with R3F: splitting them apart creates an init-order cycle
const VENDORS = [['three', /node_modules\/three\//], ['post', /node_modules\/(postprocessing|@react-three\/postprocessing|maath|n8ao)\//], ['r3f', /node_modules\/(@react-three\/(fiber|drei)|its-fine|zustand|suspend-react|react-reconciler|scheduler|react|react-dom|use-sync-external-store)\//]]
// GLTFLoader pulls toTrianglesDrawMode from BufferGeometryUtils, which lives in the startup vendor-three chunk. Give the
// loader its own copy of that module (tree-shaken to the one function) so the lazy vendor-gltf chunk carries it instead.
const gltfOwnUtils = () => ({ name: 'gltf-own-utils', enforce: 'pre', async resolveId(src, importer, o) {
  if (importer && /three[\\/]examples[\\/]jsm[\\/]loaders[\\/]/.test(importer) && /BufferGeometryUtils\.js$/.test(src)) { const r = await this.resolve(src, importer, { ...o, skipSelf: true }); return r && { ...r, id: r.id + '?gltf' } } } })
export default defineConfig({
  base: './', plugins: [react(), loaderManifest(), noWebGL2Probe(), gltfOwnUtils()],
  server: { fs: { allow: ['..'] }, headers: { 'Cache-Control': 'no-store' } },
  build: { target: 'es2020', chunkSizeWarningLimit: 700, rollupOptions: { output: { manualChunks(id) { if (id.includes('/src/game/cook/')) return 'cook'; if (/node_modules\/three\/examples\/jsm\/loaders\//.test(id) || id.endsWith('?gltf')) return 'vendor-gltf'; for (const [n, re] of VENDORS) if (re.test(id)) return 'vendor-' + n; if (/node_modules/.test(id)) return 'vendor-r3f' } } } },
})
