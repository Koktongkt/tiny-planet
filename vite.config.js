import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { loaderManifest } from './tools/loader-manifest.mjs'
// @react-three/postprocessing probes WebGL2 by creating a throwaway WebGL context on mount (~1.4 s in software GL).
// three r169 already requires WebGL2, so the probe is always true: inline it.
const noWebGL2Probe = () => ({ name: 'no-webgl2-probe', transform(code, id) { if (/@react-three[\\/]postprocessing[\\/]dist[\\/]EffectComposer\.js$/.test(id)) return code.replace('isWebGL2Available()', 'true') } })
// vendor split: three / R3F (+drei) / postprocessing / react each get a long-cacheable chunk
// react + react-dom + scheduler live with R3F: splitting them apart creates an init-order cycle
const VENDORS = [['three', /node_modules\/three\//], ['post', /node_modules\/(postprocessing|@react-three\/postprocessing|maath|n8ao)\//], ['r3f', /node_modules\/(@react-three\/(fiber|drei)|its-fine|zustand|suspend-react|react-reconciler|scheduler|react|react-dom|use-sync-external-store)\//]]
export default defineConfig({
  base: './', plugins: [react(), loaderManifest(), noWebGL2Probe()],
  server: { fs: { allow: ['..'] }, headers: { 'Cache-Control': 'no-store' } },
  build: { target: 'es2020', chunkSizeWarningLimit: 700, rollupOptions: { output: { manualChunks(id) { if (id.includes('/src/game/cook/')) return 'cook'; for (const [n, re] of VENDORS) if (re.test(id)) return 'vendor-' + n; if (/node_modules/.test(id)) return 'vendor-r3f' } } } },
})
