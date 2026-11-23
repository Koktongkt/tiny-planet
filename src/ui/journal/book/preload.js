// Journal opens instantly (like the Bag, ui/bag/BagSatchel.jsx preloadBag): a few seconds after the game is up, fetch the
// book's code + styles, decode the one leather art file that matches the screen, and load the handwriting font, so the
// first press of J has nothing left to wait for.
import frame1x from '../../../assets/ui/journal-frame.webp'
import frame2x from '../../../assets/ui/journal-frame@2x.webp'
import { artFor, bookFits } from './fit.js'
export const FRAME = artFor(typeof devicePixelRatio !== 'undefined' ? devicePixelRatio : 1, frame1x, frame2x)
export const ART = { ready: false, img: null, started: false }
if (typeof window !== 'undefined') window.__jbArt = ART
export function preloadJournal() {
  if (ART.started || !bookFits()) return // phones use the plain notebook: nothing to fetch
  ART.started = true
  const img = new Image(); img.decoding = 'async'; img.src = FRAME; ART.img = img // the reference keeps it cached
  ;(img.decode ? img.decode() : new Promise(r => { img.onload = r })).then(() => { ART.ready = true }, () => { ART.ready = true })
  // the book's chunk brings book.css, whose @font-face makes the handwriting font loadable
  import('./JournalBook.jsx').then((m) => {
    ART.Book = m.JournalBook; ART.code = true // PanelsC draws this directly: no Suspense wait on the first J
    if (document.fonts && document.fonts.load) Promise.all(['400 24px JBHand', '700 24px JBHand'].map(f => document.fonts.load(f))).then(() => { ART.font = true }, () => {})
  }, () => {})
}
