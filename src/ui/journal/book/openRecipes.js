// Bag / bench -> the journal book's Recipes, or the old Recipe Book when the book does not fit (phones) or the
// Stage C chunk that draws it has not loaded yet.
import { G, emit, openJournal } from '../../../game/store.js'
import { bookFits } from './fit.js'
export function openRecipes(at = {}) {
  if (bookFits() && openJournal('recipes', at)) return 'journal'
  G.ui.panel = 'recipes'; emit(); return 'recipes'
}
