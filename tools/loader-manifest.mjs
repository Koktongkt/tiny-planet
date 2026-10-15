// Writes the byte size of every JS chunk the entry needs at startup into index.html (window.__chunks),
// so the inline loader can report real download progress from Resource Timing.
export function loaderManifest() {
  return { name: 'loader-manifest', apply: 'build', enforce: 'post',
    transformIndexHtml: { order: 'post', handler(html, ctx) {
      const b = ctx.bundle; if (!b) return html
      const entry = Object.values(b).find(c => c.type === 'chunk' && c.isEntry); if (!entry) return html
      const need = new Set(), walk = (f) => { if (need.has(f)) return; need.add(f); (b[f]?.imports || []).forEach(walk) }; walk(entry.fileName)
      const m = {}; for (const f of need) m[f.split('/').pop()] = b[f].code.length
      const font = Object.keys(b).find(f => /fredoka-latin-500-normal.*\.woff2$/.test(f))
      if (font) html = html.replace('</title>', `</title><link rel="preload" href="./${font}" as="font" type="font/woff2" crossorigin>`)
      return html.replace('/*__CHUNKS__*/null', JSON.stringify(m))
    } } }
}
