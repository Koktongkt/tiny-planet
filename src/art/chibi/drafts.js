// Chibi villager previews in the dev views (Grandma Fuku, Professor Hoshino, Grandpa Ishi), only with ?dev=chibi-drafts.
// Fuku and Ishi also ship in the game (App.jsx renders them for the grandma / grandpa walkers); Hoshino is still a draft:
//   ?view=charstudio&dev=chibi-drafts&char=fuku
//   ?view=charstudio&dev=chibi-drafts&char=hoshino
//   ?view=charstudio&dev=chibi-drafts&char=ishi
//   ?view=charstudio&dev=chibi-drafts&cast
//   ?view=lineup&dev=chibi-drafts

export const CHIBI_DRAFT_DEV = 'chibi-drafts'

const DRAFT_OF = { grandma: 'fuku', fuku: 'fuku', scholar: 'hoshino', hoshino: 'hoshino', grandpa: 'ishi', ishi: 'ishi' }

export function draftsEnabled(search = '') {
  return new URLSearchParams(search).get('dev') === CHIBI_DRAFT_DEV
}

// Draft id ('fuku' | 'hoshino' | 'ishi') when the flag is on and this name is one of the drafts. Otherwise null,
// so the caller keeps the shipped villager.
export function chibiDraftName(name, search = '') {
  if (!draftsEnabled(search)) return null
  return DRAFT_OF[name] ?? null
}
