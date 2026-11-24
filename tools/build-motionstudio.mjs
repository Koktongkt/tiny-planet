// Build the Motion Studio (motionstudio.html, dev-only) into ONE self-contained HTML file for review:
//   node tools/build-motionstudio.mjs  ->  dist-studio/motionstudio.single.html
// Separate from the game build (vite.config.js only bundles index.html). Everything is inlined: no chunks, no assets.
import { build } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import path from 'node:path'

const OUT = 'dist-studio'
await build({
  configFile: false, base: './', logLevel: 'warn', plugins: [react()],
  build: { outDir: OUT, emptyOutDir: true, target: 'es2020', assetsInlineLimit: 1e9, cssCodeSplit: false, chunkSizeWarningLimit: 1e9, modulePreload: false,
    rollupOptions: { input: 'motionstudio.html', output: { inlineDynamicImports: true } } },
})
const html = fs.readFileSync(path.join(OUT, 'motionstudio.html'), 'utf8')
const jsFile = fs.readdirSync(path.join(OUT, 'assets')).find(f => f.endsWith('.js'))
const js = fs.readFileSync(path.join(OUT, 'assets', jsFile), 'utf8').replace(/<\/script/gi, '<\\/script')
// the artifact host wraps the page in its own skeleton: keep title, metas, fonts and styles, then the body, then the
// bundle as one inline module script (built from the template here: the bundle's text must never be searched)
const head = html.slice(html.indexOf('<head>') + 6, html.indexOf('</head>')).replace(/<meta charset[^>]*>/, '').replace(/<meta name="viewport"[^>]*>/, '').replace(/<script[^>]*><\/script>/g, '')
const body = html.slice(html.indexOf('<body>') + 6, html.lastIndexOf('</body>')).replace(/<script[^>]*><\/script>/g, '')
const single = path.join(OUT, 'motionstudio.single.html')
fs.writeFileSync(single, head.trim() + '\n' + body.trim() + '\n<script type="module">' + js + '</script>\n')
console.log(single, (fs.statSync(single).size / 1e6).toFixed(2) + ' MB')
