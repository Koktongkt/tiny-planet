// DRAFT chibi villagers (Grandma Fuku, Professor Hoshino). The game never selects these.
// They render only in dev views when ?dev=chibi-drafts is set (off by default):
//   ?view=charstudio&dev=chibi-drafts&char=fuku
//   ?view=charstudio&dev=chibi-drafts&char=hoshino
//   ?view=charstudio&dev=chibi-drafts&cast
//   ?view=lineup&dev=chibi-drafts

export const CHIBI_DRAFT_DEV = 'chibi-drafts'

const DRAFT_OF = { grandma: 'fuku', fuku: 'fuku', scholar: 'hoshino', hoshino: 'hoshino' }

export function draftsEnabled(search = '') {
  return new URLSearchParams(search).get('dev') === CHIBI_DRAFT_DEV
}

// Draft id ('fuku' | 'hoshino') when the flag is on and this name is one of the drafts. Otherwise null,
// so the caller keeps the shipped villager.
export function chibiDraftName(name, search = '') {
  if (!draftsEnabled(search)) return null
  return DRAFT_OF[name] ?? null
}
