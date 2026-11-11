// Which perfect dishes she has cooked. Eating a dish does not remove the stitch.
// The field lives on journal.perfect, which the save normalizer already keeps.
import { COOKED_IDS } from '../game/itemsF.js'
export const COOK_COUNT = COOKED_IDS.length
export function notePerfect(s, itemId, day) {
  if (typeof itemId !== 'string' || !itemId.endsWith('_perfect')) return false
  const j = s.journal || (s.journal = { forage: {}, relics: {} })
  const log = j.perfect || (j.perfect = {})
  if (log[itemId] != null) return false
  log[itemId] = day
  return true
}
export function stitchRow(s) {
  const log = (s.journal && s.journal.perfect) || {}
  return COOKED_IDS.map(id => log[id + '_perfect'] != null)
}
