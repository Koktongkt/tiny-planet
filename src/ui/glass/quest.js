// Quest tracker (pure; unit-tested). Picks what the HUD tracker shows from the save:
//   1. Grandma's first-day steps while any are left (the step before, the current one, the next one)
//   2. otherwise the errand she has taken from the board (what to bring, then who to bring it to)
//   3. otherwise a nudge when today's board has notes she hasn't taken
// Returns null when there is nothing to track. Lines: { text, state: 'done' | 'now' | 'todo', count?: 'have/need' }
export function questFor(s, { steps, itemName, npcName, touch = false }) {
  const tut = s.tutorial
  if (tut && steps.some(st => !tut.done?.[st.id])) {
    const i = steps.findIndex(st => !tut.done?.[st.id]), n = steps.filter(st => tut.done?.[st.id]).length
    const pick = steps.map((st, k) => ({ st, k })).filter(({ k }) => k >= i - 1 && k <= i + 1 && (k >= i || tut.done?.[steps[k].id]))
    return { kind: 'tutorial', title: 'Settle In', progress: `${n}/${steps.length}`,
      lines: pick.map(({ st, k }) => ({ text: (touch && st.textTouch) || st.text, state: tut.done?.[st.id] ? 'done' : k === i ? 'now' : 'todo' })) }
  }
  const list = s.errands?.list || []
  const e = list.find(x => x.accepted && !x.done)
  if (e) {
    const who = npcName(e.npcId), inv = s.inv || {}
    const lines = e.wants.map(w => { const have = Math.min(inv[w.itemId] || 0, w.count); return { text: `Bring ${w.count > 1 ? w.count + ' × ' : ''}${itemName(w.itemId)}`, count: `${have}/${w.count}`, state: have >= w.count ? 'done' : 'now' } })
    const ready = lines.every(l => l.state === 'done')
    lines.push({ text: `Take it to ${who}`, state: ready ? 'now' : 'todo' })
    return { kind: 'errand', title: `A favour for ${who}`, lines }
  }
  if (list.some(x => !x.accepted && !x.done && x.wants?.length)) return { kind: 'board', title: 'Notice board', lines: [{ text: 'New requests are pinned up in the village', state: 'now' }] }
  return null
}
