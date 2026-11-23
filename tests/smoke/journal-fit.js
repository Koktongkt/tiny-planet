// Journal fit check (in-page): bookmarks on the flat page edge, sub-tabs and page content inside their page, right pages without scrolling. Loaded by journal.spec.js.
// in-page: report anything in the journal book that leaves its page (art pixel coordinates)
window.__jbFit = () => {
  const book = document.querySelector('.jb-book'), b = book.getBoundingClientRect(), s = b.width / 1448
  const X = (r) => ({ l: (r.left - b.left) / s, r: (r.right - b.left) / s, t: (r.top - b.top) / s, b: (r.bottom - b.top) / s })
  const bad = [], name = (e) => (e.className && e.className.baseVal === undefined ? e.className : e.tagName) + ' "' + (e.textContent || '').trim().slice(0, 24) + '"'
  for (const [sel, lo, hi] of [['.jb-grp.l .jb-bk', 160, 652], ['.jb-grp.r .jb-bk', 796, 1262], ['.jb-st', 204, 690]])
    for (const e of document.querySelectorAll(sel)) { const r = X(e.getBoundingClientRect()); if (r.l < lo - 0.5 || r.r > hi + 0.5) bad.push(`${name(e)} spans ${r.l.toFixed(0)}..${r.r.toFixed(0)} (page ${lo}..${hi})`) }
  for (const pg of document.querySelectorAll('.jb-L, .jb-R')) { const P = X(pg.getBoundingClientRect())
    for (const e of pg.querySelectorAll('*')) { const r = X(e.getBoundingClientRect()); if (!r.r || r.r - r.l < 1) continue
      if (e.closest('.jb-mgrid')) continue // pasted photos are nudged on purpose
      if (r.l < P.l - 3 || r.r > P.r + 3) bad.push(`${name(e)} sticks out sideways ${r.l.toFixed(0)}..${r.r.toFixed(0)} (page ${P.l.toFixed(0)}..${P.r.toFixed(0)})`)
      if (e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).overflow !== 'visible' && !e.classList.contains('jb-scroll')) bad.push(`${name(e)} text cut off`) }
    if (pg.classList.contains('jb-R') && pg.scrollHeight > pg.clientHeight + 2 && !window.__jbAllowScroll) bad.push(`right page content runs off the bottom (${pg.scrollHeight} > ${pg.clientHeight})`) }
  return bad
}

// visit every bookmark, sub-tab and the first picks in-page (clicks are instant here; Playwright clicks wait on frames)
window.__jbFitAll = async (maxPicks = 8) => {
  const tick = () => new Promise(r => setTimeout(r, 30)), out = {}, scrolls = []
  for (const tab of ['quests', 'people', 'recipes', 'discoveries', 'memories']) {
    document.querySelector(`.jb-bk[data-id="${tab}"]`).click(); await tick()
    const subs = [...document.querySelectorAll('.jb-st')].map(e => e.dataset.sub)
    for (const sub of subs.length ? subs : [null]) { if (sub) { document.querySelector(`.jb-st[data-sub="${sub}"]`).click(); await tick() }
      const picks = [...document.querySelectorAll('.jb-L [data-pick]')].map(e => e.dataset.pick).slice(0, maxPicks)
      for (const id of [null, ...picks]) { if (id) { document.querySelector(`.jb-L [data-pick="${CSS.escape(id)}"]`).click(); await tick() }
        const label = `${tab}/${sub || '-'}/${id || '-'}`, R = document.querySelector('.jb-R')
        if (R && R.scrollHeight > R.clientHeight + 2) scrolls.push(label)
        window.__jbAllowScroll = true; const bad = window.__jbFit(); window.__jbAllowScroll = false
        if (bad.length) out[label] = bad } } }
  return { bad: out, rightPageScrolls: scrolls }
}
